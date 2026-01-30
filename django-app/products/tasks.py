import random
import threading
import time
from celery import shared_task


@shared_task(name="reset_logs")
def reset_logs():
    """
    Reset logs directory before pipeline starts.
    Must run BEFORE any crawler / ETL steps.
    """
    from products.tl.log import reset_logs_dir

    reset_logs_dir()
    return "Logs directory reset"


@shared_task(name="run_crawler")
def run_crawler():
    """
    Run crawler engine directly (no Django command).
    """

    from products.utils.log.shop_crawler_engine_log import shop_crawler_log
    from django.core.management import call_command
    from products.crawler.config import (
        DRY_RUN,
        PAGES_TO_CRAWL,
    )
    from products.crawler.main import ShopCrawlerEngine

    try:
        if DRY_RUN:
            call_command("reset")
        engine = ShopCrawlerEngine()
        engine.run(pages=PAGES_TO_CRAWL)
        shop_crawler_log("[TASK] Crawler finished successfully")

        call_command("count", in_stock=True)
        call_command("count")

    except Exception as e:
        shop_crawler_log(f"[TASK] Crawler failed: {e}")
        raise


@shared_task(name="run_normalize")
def run_normalize():
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import environ
    from openai import OpenAI
    from products.utils.log.category_log import category_log
    from django.core.management import call_command
    from products.tl.normalize.normalize import normalize_category_for_product
    from products.crawler.config import CRAWLER_DBS, MAX_DB_WORKERS_AT_NORMALIZE

    env = environ.Env()
    environ.Env.read_env()
    client = OpenAI(api_key=env("OPENAI_API_KEY"))

    def normalize_db(db):
        from products.models import Product

        products_qs = Product.objects.using(db).filter(dirty=True)
        for p in products_qs:
            try:
                result = normalize_category_for_product(p.id, db=db, client=client)
                category_log(f"[{db}] {p.id} normalized: {result}")
            except Exception as e:
                category_log(f"[{db}] Error normalizing {p.id}: {e}")

    with ThreadPoolExecutor(max_workers=MAX_DB_WORKERS_AT_NORMALIZE) as executor:
        futures = [executor.submit(normalize_db, db) for db in CRAWLER_DBS]
        for f in as_completed(futures):
            f.result()

    category_log("[TASK] Finished normalization for all DBs")
    call_command("normalize_test")
    category_log("[TESTING] Finished normalization for all DBs")


@shared_task(name="run_translation")
def run_translation():
    """
    Run translation for all databases with batch-level parallelism.
    Each DB runs in parallel, and each batch within DB runs in parallel.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from products.utils.log.translation_log import translation_log
    from django.core.management import call_command
    from products.crawler.config import (
        CRAWLER_DBS,
    )

    BATCH_SIZE = 500
    MAX_BATCH_WORKERS = 16

    def run_db_translation(db):
        from products.models import Product

        translation_log(f"Starting translation for DB: {db}")

        # Optional random delay per DB to avoid overloading
        time.sleep(random.uniform(1, 3))

        # Fetch all dirty product IDs once
        product_ids = list(
            Product.objects.using(db).filter(dirty=True).values_list("id", flat=True)
        )
        if not product_ids:
            translation_log(f"[{db}] No products to translate")
            return

        # Split into batches
        batches = [
            product_ids[i : i + BATCH_SIZE]
            for i in range(0, len(product_ids), BATCH_SIZE)
        ]

        def run_batch(batch, idx):
            thread_name = f"{db}-batch-{idx}"
            threading.current_thread().name = thread_name
            translation_log(
                f"[{thread_name}] Translating batch {idx}/{len(batches)} IDs {batch[0]}-{batch[-1]}"
            )
            # Random sleep per batch
            time.sleep(random.uniform(2, 5))

            # Call your subprocess translation function
            run_translation_in_venv_translate(
                db=db, product_ids=",".join(map(str, batch))
            )

            translation_log(f"[{thread_name}] Finished batch {idx}")

        # Run batches in parallel per DB
        with ThreadPoolExecutor(max_workers=MAX_BATCH_WORKERS) as batch_executor:
            futures = [
                batch_executor.submit(run_batch, batch, i + 1)
                for i, batch in enumerate(batches)
            ]
            for f in as_completed(futures):
                try:
                    f.result()
                except Exception as e:
                    translation_log(f"[{db}] Batch failed: {e}")
        translation_log(f"Finished translation for DB: {db}")

    # Run all DBs in parallel
    with ThreadPoolExecutor(max_workers=len(CRAWLER_DBS)) as db_executor:
        futures = [db_executor.submit(run_db_translation, db) for db in CRAWLER_DBS]
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                translation_log(f"DB-level translation failed: {e}")
    call_command("count", check_translations=True)


@shared_task(
    name="run_embeddings",
)
def run_embeddings():
    """
    Run embeddings generation command for all databases.
    The command itself decides what needs embedding.
    """
    from django.core.management import call_command
    from products.crawler.config import (
        CRAWLER_DBS,
    )
    from products.tl.embeddings import ProductEmbedding
    from products.utils.log.generate_embeddings_from_object_log import (
        generate_embeddings_from_object_log,
    )

    for db in CRAWLER_DBS:
        try:
            generate_embeddings_from_object_log(
                f"[TASK][{db}] Starting embeddings generation"
            )
            embedding = ProductEmbedding(
                source=db,
                dirty=True,  # only dirty products
                force=False,  # don't force by default
                batch_size=500,  # keep same as command defaults
            )
            embedding.run()
            call_command("embeddings_test", source=db)
        except Exception as e:
            generate_embeddings_from_object_log(
                f"[TASK][{db}] Embeddings generation failed: {e}"
            )
            raise

        call_command("count", check_embeddings=True)


@shared_task(name="run_merge_pipeline_to_stage")
def run_merge_pipeline_to_stage():
    """
    Full merge pipeline to prepare Stage DB for similar_id and identical_id generation:
    1. Overwrite Stage with Prod
    2. Merge all crawler DBs into Stage with dirty logic
    3. Merge Update DB -> Stage
    4. Snapshot Stage DB
    """

    from products.utils.log.shop_crawler_engine_log import shop_crawler_log
    from products.utils.log.db_merge_pipeline_to_stage import db_merge_to_stage_log
    from products.crawler.config import (
        CRAWLER_DBS,
        STAGE_DB,
        PROD_DB,
        UPDATE_DB,
    )
    from products.models import CrawlSnapshot
    from products.models import Product
    from products.tl.merge import ProductDBMerger

    try:
        # ------------------------
        # Step 1: Prod -> Stage (force overwrite)
        # ------------------------
        db_merge_to_stage_log("[TASK] Step 1: Prod -> Stage")
        for shop_db in CRAWLER_DBS:
            merger = ProductDBMerger(
                source=PROD_DB, dest=STAGE_DB, shop=shop_db, force=True
            )
            merger.run()
        db_merge_to_stage_log("[TASK] Step 1 finished: Stage now matches Prod")

        # ------------------------
        # Step 2: Merge crawler DBs -> Stage (dirty-only)
        # ------------------------
        for shop_db in CRAWLER_DBS:
            db_merge_to_stage_log(f"[TASK] Step 2: {shop_db} -> Stage")
            merger = ProductDBMerger(
                source=shop_db, dest=STAGE_DB, shop=shop_db, force=False
            )
            merger.run()
            db_merge_to_stage_log(f"[TASK] Step 2 finished for {shop_db}")

        # ------------------------
        # Step 3: Merge Update DB -> Stage
        # ------------------------
        for shop_db in CRAWLER_DBS:
            db_merge_to_stage_log(f"[TASK] Step 3: Update -> Stage ({shop_db})")
            merger = ProductDBMerger(
                source=UPDATE_DB, dest=STAGE_DB, shop=shop_db, force=False
            )
            merger.run()
            db_merge_to_stage_log(f"[TASK] Step 3 finished for {shop_db}")

        # ------------------------
        # Step 4: Snapshot Stage DB
        # ------------------------
        def snapshot_crawl_stage(batch_size=5000):
            """
            Take a snapshot of all product external_ids in Stage DB.
            Works in batches to avoid memory issues.
            """
            all_ids = []
            offset = 0
            db_count = Product.objects.using(STAGE_DB).count()
            shop_crawler_log(
                f"[SNAPSHOT] Stage has {db_count} products, starting batched snapshot..."
            )

            while True:
                batch_ids = list(
                    Product.objects.using(STAGE_DB).values_list(
                        "external_id", flat=True
                    )[offset : offset + batch_size]
                )
                if not batch_ids:
                    break
                all_ids.extend(batch_ids)
                offset += batch_size
                shop_crawler_log(
                    f"[SNAPSHOT] Collected {len(all_ids)}/{db_count} Stage products"
                )

            snapshot = CrawlSnapshot.objects.create(shop="stage", external_ids=all_ids)
            shop_crawler_log(
                f"[SNAPSHOT] Stage snapshot created with {len(all_ids)} products"
            )
            return snapshot

        snapshot_crawl_stage()
        db_merge_to_stage_log("[TASK] Merge to Stage + snapshots completed")

    except Exception as e:
        db_merge_to_stage_log(f"[TASK] Merge to Stage failed: {e}")
        raise


@shared_task(name="run_similar_ids_stage")
def run_similar_ids_stage():
    """
    Generate similar_ids for all products in Stage DB after merges.
    Uses the class-based BackfillSimilarEmbeddings instead of management command.
    """
    from products.utils.log.backfill_similar_id_log import backfill_similar_id_log
    from products.crawler.config import (
        STAGE_DB,
    )
    from products.tl.canonical import BackfillSimilarEmbeddings

    try:
        backfill_similar_id_log(
            f"[TASK] Starting similar ID generation on stage | batch_size=1000"
        )

        # Initialize the class and run
        backfiller = BackfillSimilarEmbeddings(
            batch_size=1000,
            db=STAGE_DB,
            force=True,  # mirror the original force=True behavior
        )
        backfiller.run()

        backfill_similar_id_log("[TASK] Similar ID generation finished successfully")

    except Exception as e:
        backfill_similar_id_log(f"[TASK] Similar ID generation failed: {e}")
        raise


@shared_task(
    name="run_merge_pipeline_to_default",
)
def run_merge_pipeline_to_default():
    """
    Final pipeline step with blazing fast Prod cleanup + Stage merge.
    Fully uses ProductDBMerger class instead of management command.
    """
    from products.utils.log.db_merge_pipeline_to_default import db_merge_to_default_log
    from products.crawler.config import (
        CRAWLER_DBS,
        STAGE_DB,
        PROD_DB,
        UPDATE_DB,
        DRY_RUN,
    )
    from products.tl.merge import ProductDBMerger
    from products.tl.missing import archive_missing_products
    from products.models import Product

    try:
        if not DRY_RUN:

            # Step 0: Preload Stage external_ids per shop
            stage_ids_map = {}
            for shop_name in CRAWLER_DBS:
                stage_ids_map[shop_name] = set(
                    Product.objects.using(STAGE_DB)
                    .filter(shop=shop_name)
                    .values_list("external_id", flat=True)
                )
                db_merge_to_default_log(
                    f"[COMPARE] Stage snapshot for shop '{shop_name}' has {len(stage_ids_map[shop_name])} products"
                )

            # Step 1: Archive missing products
            archive_missing_products(stage_ids_map, 5000)

            # Step 2: Merge Stage -> Prod using ProductDBMerger
            db_merge_to_default_log(f"[TASK] Starting Stage -> Prod merge")
            for shop in CRAWLER_DBS:
                merger = ProductDBMerger(
                    source=STAGE_DB, dest=PROD_DB, shop=shop, force=True
                )
                merger.run()
            db_merge_to_default_log("[TASK] Stage -> Prod merge finished successfully")

            # Step 3: Mark Prod products clean
            Product.objects.using(PROD_DB).all().update(dirty=False)
            db_merge_to_default_log("[TASK] All products in Prod marked as clean")

        else:
            db_merge_to_default_log(
                "[TASK] DRY RUN: Stage -> Prod merge and cleanup SKIPPED"
            )

        # Step 4: Cleanup Stage + Crawler DBs
        if not DRY_RUN:
            Product.objects.using(STAGE_DB).all().delete()
            db_merge_to_default_log("[TASK] Stage DB cleared")

            for db in CRAWLER_DBS:
                Product.objects.using(db).all().delete()
                db_merge_to_default_log(f"[TASK] Crawler DB '{db}' cleared")

            Product.objects.using(UPDATE_DB).all().delete()
            db_merge_to_default_log(f"[TASK] Update DB cleared")

        db_merge_to_default_log("[TASK] Merge to Prod completed successfully")

    except Exception as e:
        db_merge_to_default_log(f"[TASK] pipeline merge failed: {e}")
        raise


@shared_task(
    name="run_price_history_default",
)
def run_price_history_default():
    from django.core.management import call_command
    from products.crawler.config import (
        PROD_DB,
    )
    from products.analytics.price_history import PriceHistoryBuilder

    history = PriceHistoryBuilder(
        db=PROD_DB, include_archived=True, include_broken=True
    )
    history.run()
    call_command("price_history_test")
    call_command("count")


@shared_task(
    name="run_load_embeddings_cache",
)
def run_load_embeddings_cache():

    from products.tl import embeddings_cache
    from products.utils.log.load_embeddings_cache_log import load_embeddings_cache_log

    load_embeddings_cache_log("[TASK] Reloading embeddings cache after Prod merge...")
    embeddings_cache.load_embeddings_cache()
    load_embeddings_cache_log("[TASK] Embeddings cache reloaded.")


@shared_task(name="run_build_autocomplete_index")
def run_build_autocomplete_index():
    from products.utils.log.autocomplete_log import autocomplete_log
    from products.tl.es_autocomplete import AutocompleteIndexer

    autocomplete_log("[TASK] Starting autocomplete index rebuild...")
    indexer = AutocompleteIndexer()
    indexer.build_index()
    autocomplete_log("[TASK] Autocomplete index rebuild finished.")


@shared_task(name="debug_test_task")
def debug_test_task(message="Hello from debug task!"):
    """
    Simple debug task to test Celery setup.
    Returns the message with a timestamp.
    """
    from django.utils import timezone
    import time

    current_time = timezone.now()
    print(f"[DEBUG TASK] Received message: {message}")
    print(f"[DEBUG TASK] Current time: {current_time}")

    # Simulate some work
    time.sleep(2)

    result = f"Debug task completed at {current_time}. Message: {message}"
    print(f"[DEBUG TASK] Result: {result}")

    return result


@shared_task(name="run_normalize1")
def run_normalize1():
    """
    Run category normalization for all DBs.
    DBs run in parallel, batches inside each DB run in parallel.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import random
    import threading
    import time
    from products.utils.log.category_log import category_log
    from django.core.management import call_command
    from products.crawler.config import (
        CRAWLER_DBS,
    )

    BATCH_SIZE = 500
    MAX_BATCH_WORKERS = 16

    def run_db_normalize(db):
        from products.models import Product

        category_log(f"Starting normalization for DB: {db}")

        time.sleep(random.uniform(1, 3))

        product_ids = list(
            Product.objects.using(db).filter(dirty=True).values_list("id", flat=True)
        )

        if not product_ids:
            category_log(f"[{db}] No products to normalize")
            return

        batches = [
            product_ids[i : i + BATCH_SIZE]
            for i in range(0, len(product_ids), BATCH_SIZE)
        ]

        def run_batch(batch, idx):
            thread_name = f"{db}-batch-{idx}"
            threading.current_thread().name = thread_name

            category_log(
                f"[{thread_name}] Normalizing batch {idx}/{len(batches)} "
                f"IDs {batch[0]}-{batch[-1]}"
            )

            time.sleep(random.uniform(2, 5))

            run_normalize_in_venv1(
                db=db,
                product_ids=",".join(map(str, batch)),
            )

            category_log(f"[{thread_name}] Finished batch {idx}")

        with ThreadPoolExecutor(max_workers=MAX_BATCH_WORKERS) as batch_executor:
            futures = [
                batch_executor.submit(run_batch, batch, i + 1)
                for i, batch in enumerate(batches)
            ]
            for f in as_completed(futures):
                try:
                    f.result()
                except Exception as e:
                    category_log(f"[{db}] Batch failed: {e}")

        category_log(f"Finished normalization for DB: {db}")
        call_command("normalize_test")

    with ThreadPoolExecutor(max_workers=len(CRAWLER_DBS)) as db_executor:
        futures = [db_executor.submit(run_db_normalize, db) for db in CRAWLER_DBS]
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                category_log(f"DB-level normalize failed: {e}")


def run_translation_in_venv_translate(*args, **kwargs):
    import os
    from pathlib import Path
    import subprocess

    # 1. venv python
    venv_path = Path("venv_translate/Scripts/python.exe")  # root-level venv

    # 2. translate.py script path
    script_path = (
        Path(__file__).resolve().parent
        / "tl"
        / "translate"
        / "translate_googletrans.py"
    )

    # 3. project root for PYTHONPATH
    project_root = Path(__file__).resolve().parent.parent  # server/
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root) + os.pathsep + env.get("PYTHONPATH", "")

    # 4. build command with kwargs as CLI args
    cmd = [str(venv_path), str(script_path)]
    for k, v in kwargs.items():
        cmd.append(f"--{k.replace('_','-')}")
        if isinstance(v, bool):
            if v:
                continue  # boolean flags handled in script
        else:
            cmd.append(str(v))

    print("Running command:", " ".join(cmd))
    subprocess.run(cmd, check=True, env=env)


@shared_task(name="run_translation_libre")
def run_translation_libre():
    from products.models import Product
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import random
    import threading
    import time
    from products.utils.log.translation_log import translation_log
    from products.crawler.config import (
        CRAWLER_DBS,
    )
    from products.models import Product

    BATCH_SIZE = 500
    MAX_SHOP_WORKERS = 3  # parallel shops
    MAX_BATCH_WORKERS = 16  # parallel batches per shop
    """ if BROKEN:
        CRAWLER_DBS = ["broken"] """

    def run_shop(db):
        translation_log(f"Starting LibreTranslate for DB={db}")

        # Fetch IDs once
        product_ids = list(
            Product.objects.using(db)
            .filter(dirty=True)  # shop__iexact=db you don't need shop db == shop
            .values_list("id", flat=True)
        )

        batches = [
            product_ids[i : i + BATCH_SIZE]
            for i in range(0, len(product_ids), BATCH_SIZE)
        ]

        def run_batch(batch, idx):

            thread_name = f"{db}-batch-{idx}"
            threading.current_thread().name = thread_name
            translation_log(
                f"[{thread_name}] DB={db} batch {idx}/{len(batches)} "
                f"IDs {batch[0]}-{batch[-1]}"
            )
            time.sleep(random.uniform(0.5, 1.5))
            run_translation_libre_subprocess(
                db=db,
                product_ids=",".join(map(str, batch)),
            )

        # Run batches in parallel per shop
        with ThreadPoolExecutor(max_workers=MAX_BATCH_WORKERS) as batch_executor:
            futures = [
                batch_executor.submit(run_batch, batch, i + 1)
                for i, batch in enumerate(batches)
            ]
            for f in as_completed(futures):
                f.result()

        translation_log(f"Finished LibreTranslate for DB={db}")

    # Run shops in parallel
    with ThreadPoolExecutor(max_workers=MAX_SHOP_WORKERS) as shop_executor:
        futures = [shop_executor.submit(run_shop, db) for db in CRAWLER_DBS]
        for f in as_completed(futures):
            f.result()


def run_translation_libre_subprocess(**kwargs):
    """
    Run translate_libre.py as a subprocess using the dedicated venv.
    Safe for Celery, avoids DB locks, isolates crashes.
    """
    import os
    from pathlib import Path
    import subprocess
    from products.utils.log.translation_log import translation_log

    # 1. Explicit venv python (Windows-safe)
    venv_path = Path("venv/Scripts/python.exe")

    if not venv_path.exists():
        raise RuntimeError(f"Venv python not found at {venv_path}")

    python_path = str(venv_path)

    # 2. Script path
    script_path = (
        Path(__file__).resolve().parent / "tl" / "translate" / "translate_libre.py"
    )

    # 3. Project root for PYTHONPATH
    project_root = Path(__file__).resolve().parent.parent  # server/
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root) + os.pathsep + env.get("PYTHONPATH", "")

    # (optional but nice)
    env["VIRTUAL_ENV"] = str(venv_path.parent.parent)

    # 4. Build command
    cmd = [python_path, str(script_path)]

    for k, v in kwargs.items():
        if v is None:
            continue

        flag = f"--{k.replace('_', '-')}"
        if isinstance(v, bool):
            if v:
                cmd.append(flag)
        else:
            cmd.extend([flag, str(v)])

    translation_log("Running command: " + " ".join(cmd))
    subprocess.run(cmd, check=True, env=env)


def run_normalize_in_venv1(*args, **kwargs):
    import os
    from pathlib import Path
    import subprocess

    # 1. venv python
    venv_path = Path("venv_normalize/Scripts/python.exe")

    # 2. normalize.py script
    script_path = Path(__file__).resolve().parent / "services" / "normalize.py"

    # 3. project root for PYTHONPATH
    project_root = Path(__file__).resolve().parent.parent
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root) + os.pathsep + env.get("PYTHONPATH", "")

    # 4. build command
    cmd = [str(venv_path), str(script_path)]
    for k, v in kwargs.items():
        cmd.append(f"--{k.replace('_', '-')}")
        if isinstance(v, bool):
            if v:
                continue
        else:
            cmd.append(str(v))

    print("Running command:", " ".join(cmd))
    subprocess.run(cmd, check=True, env=env)
