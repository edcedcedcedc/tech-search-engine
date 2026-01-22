from concurrent.futures import ThreadPoolExecutor, as_completed
import os
from pathlib import Path
import random
import subprocess
import threading
import time
from celery import shared_task
import environ


from openai import OpenAI
from products.utils.log.category_log import category_log
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.utils.log.translation_log import translation_log
from products.utils.log.generate_embeddings_from_object_log import (
    generate_embeddings_from_object_log,
)
from products.utils.log.backfill_canonical_id_log import backfill_canonical_id_log
from django.core.management import call_command
from products.utils.log.db_merge_log import db_merge_log
from products.utils.log.db_merge_pipeline_to_stage import db_merge_to_stage_log
from products.utils.log.db_merge_pipeline_to_default import db_merge_to_default_log
from products.services.normalize import normalize_category_for_product
from products.utils.log.load_embeddings_cache_log import load_embeddings_cache_log
from products.management.commands.shop_crawler_engine.config import (
    DRY_RUN,
    PAGES_TO_CRAWL,
    CRAWLER_DBS,
    STAGE_DB,
    PROD_DB,
)


# Load environment variables
env = environ.Env()
environ.Env.read_env()  # reads .env
client = OpenAI(api_key=env("OPENAI_API_KEY"))


@shared_task(name="run_crawler")
def run_crawler():
    """
    Run the Django crawler command via Celery.
    """
    try:
        if DRY_RUN:
            call_command("reset")
        call_command("crawl", pages=PAGES_TO_CRAWL)
        shop_crawler_log("[TASK]Crawler finished successfully")
        shop_crawler_log("[TASK]Testing Categories")
        for db in CRAWLER_DBS:
            call_command("broken", source=db, by_category=True, dry_run=DRY_RUN)
    except Exception as e:
        shop_crawler_log(f"[TASK]Crawler failed: {e}")
        raise


@shared_task(name="run_normalize")
def run_normalize(interval_minutes=None, max_db_workers=3):
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

    with ThreadPoolExecutor(max_workers=max_db_workers) as executor:
        futures = [executor.submit(normalize_db, db) for db in CRAWLER_DBS]
        for f in as_completed(futures):
            f.result()

    category_log("[TASK] Finished normalization for all DBs")
    call_command("normalize_test")
    category_log("[TESTING] Finished normalization for all DBs")


def run_translation_in_venv_translate(*args, **kwargs):
    # 1. venv python
    venv_path = Path("venv_translate/Scripts/python.exe")  # root-level venv

    # 2. translate.py script path
    script_path = Path(__file__).resolve().parent / "services" / "translate.py"

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


@shared_task(name="run_translation")
def run_translation():
    """
    Run translation for all databases with batch-level parallelism.
    Each DB runs in parallel, and each batch within DB runs in parallel.
    """
    BATCH_SIZE = 500
    MAX_BATCH_WORKERS = 8

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
        for db in CRAWLER_DBS:
            call_command("map", db=db)
        translation_log(f"Finished translation for DB: {db}")

    # Run all DBs in parallel
    with ThreadPoolExecutor(max_workers=len(CRAWLER_DBS)) as db_executor:
        futures = [db_executor.submit(run_db_translation, db) for db in CRAWLER_DBS]
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                translation_log(f"DB-level translation failed: {e}")


def run_translation_libre_subprocess(**kwargs):
    """
    Run translate_libre.py as a subprocess using the dedicated venv.
    Safe for Celery, avoids DB locks, isolates crashes.
    """

    # 1. Explicit venv python (Windows-safe)
    venv_path = Path("venv/Scripts/python.exe")

    if not venv_path.exists():
        raise RuntimeError(f"Venv python not found at {venv_path}")

    python_path = str(venv_path)

    # 2. Script path
    script_path = Path(__file__).resolve().parent / "services" / "translate_libre.py"

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


@shared_task(name="run_translation_libre")
def run_translation_libre():
    from products.models import Product

    BATCH_SIZE = 500
    MAX_SHOP_WORKERS = 3  # parallel shops
    MAX_BATCH_WORKERS = 12  # parallel batches per shop
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


@shared_task(
    name="run_embeddings",
)
def run_embeddings():
    """
    Run embeddings generation command for all databases.
    The command itself decides what needs embedding.
    """

    for db in CRAWLER_DBS:
        try:
            generate_embeddings_from_object_log(
                f"[TASK][{db}] Starting embeddings generation"
            )

            call_command("embeddings_generate_from_object", source=db, dirty=True)

            generate_embeddings_from_object_log(
                f"[TASK][{db}] Starting embeddings generation"
            )
            (f"[TASK][{db}] Embeddings generation finished")

        except Exception as e:
            generate_embeddings_from_object_log(
                f"[TASK][{db}] Starting embeddings generation"
            )
            raise


@shared_task(name="run_merge_pipeline_to_stage")
def run_merge_pipeline_to_stage():
    """
    Full merge pipeline to prepare stage for canonical_id generation:
    1. Overwrite stage with prod
    2. Merge all crawler DBs into stage with dirty logic
    """
    try:
        # Step 1: Prod -> Stage (force overwrite)
        db_merge_to_stage_log("[TASK] Step 1: Prod -> Stage (force overwrite)")
        call_command(
            "merge",
            source=PROD_DB,
            dest=STAGE_DB,
            force=True,
        )
        db_merge_to_stage_log("[TASK] Step 1 finished: Stage now matches Prod")

        # Step 2: Merge crawler DBs -> Stage (dirty logic)
        for db in CRAWLER_DBS:
            db_merge_to_stage_log(f"[TASK] Step 2: {db} -> Stage (dirty merge)")
            call_command(
                "merge",
                source=db,
                dest=STAGE_DB,
                shop=db,  # shop name = DB name
            )
            db_merge_to_stage_log(f"[TASK] Step 2 finished for {db}")

        def snapshot_crawl_stage(batch_size=5000):
            """
            Take a snapshot of all product external_ids in Stage DB.
            Works in batches to avoid memory issues and counts items internally.
            """
            from products.models import Product, CrawlSnapshot

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

            # Bulk insert snapshot (single row, so not really "bulk_create" but memory-efficient)
            snapshot = CrawlSnapshot.objects.create(shop="stage", external_ids=all_ids)

            shop_crawler_log(
                f"[SNAPSHOT] Stage snapshot created with {len(all_ids)} products"
            )

            return snapshot

        # Call it once after Stage merge
        snapshot_crawl_stage()

        db_merge_to_stage_log("[TASK] Merge to stage + snapshots completed")

    except Exception as e:
        db_merge_to_stage_log(f"[TASK] Merge to stage failed: {e}")
        raise


@shared_task(
    name="run_canonical_ids_stage",
)
def run_canonical_ids_stage(batch_size=1000, force=True):
    """
    Generate canonical_ids for all products in stage after merges.
    Mirrors backfill_canonical_embeddings.py logic.
    """
    try:
        backfill_canonical_id_log(
            f"[TASK] Starting canonical ID generation on stage | batch_size={batch_size} | force={force}"
        )

        call_command(
            "backfill_canonical_id",
            db=STAGE_DB,
            batch_size=batch_size,
            force=force,
        )

        backfill_canonical_id_log(
            "[TASK] Canonical ID generation finished successfully"
        )

    except Exception as e:
        backfill_canonical_id_log(f"[TASK] Canonical ID generation failed: {e}")
        raise


@shared_task(
    bind=True,
    name="run_merge_pipeline_to_default",
)
def run_merge_pipeline_to_default(throttle_seconds=5, dry_run=DRY_RUN, batch_size=5000):
    """
    Final pipeline step with blazing fast Prod cleanup + Stage merge.
    """
    from products.utils import embeddings_cache
    from products.models import Product, ArchivedProduct
    from django.utils import timezone
    from django.db import transaction

    try:
        if not dry_run:

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

            # Step 1: Compare Prod → Stage and archive missing products in batches
            for shop_name, stage_ids in stage_ids_map.items():
                prod_qs = (
                    Product.objects.using(PROD_DB)
                    .filter(shop=shop_name)
                    .exclude(external_id__in=stage_ids)
                )
                total_to_archive = prod_qs.count()
                db_merge_to_default_log(
                    f"[COMPARE/ARCHIVE] Shop '{shop_name}' - {total_to_archive} products to archive"
                )

                # Batch processing
                offset = 0
                archived_count = 0
                while True:
                    batch_qs = prod_qs[offset : offset + batch_size]
                    if not batch_qs:
                        break

                    archived_objs = [
                        ArchivedProduct(
                            original_id=p.id,
                            external_id=p.external_id,
                            canonical_id=p.canonical_id,
                            name=p.name,
                            variant=p.variant,
                            price=p.price,
                            in_stock=p.in_stock,
                            shop=p.shop,
                            archived_at=timezone.now(),
                        )
                        for p in batch_qs
                    ]

                    if archived_objs:
                        with transaction.atomic(using=PROD_DB):
                            ArchivedProduct.objects.using(PROD_DB).bulk_create(
                                archived_objs, batch_size=batch_size
                            )
                            batch_qs.delete()

                        archived_count += len(archived_objs)

                    offset += batch_size

                db_merge_to_default_log(
                    f"[COMPARE/ARCHIVE] Shop '{shop_name}' - archived/deleted {archived_count} products"
                )

            # Step 2: Merge Stage -> Prod
            db_merge_to_default_log(f"[TASK] Starting Stage -> Prod merge | force=True")
            call_command("merge", source=STAGE_DB, dest=PROD_DB, force=True)
            db_merge_to_default_log("[TASK] Stage -> Prod merge finished successfully")

            # Step 2.5: Price History Prod
            call_command("price_history", db=PROD_DB, include_archived=True)
            db_merge_to_default_log(
                "[TASK] Complete price history created for all products"
            )
            # Step 2.9: Price History Test
            call_command("price_history_test")
            # Step 3: Mark Prod products clean
            Product.objects.using(PROD_DB).all().update(dirty=False, change_type=None)
            db_merge_to_default_log("[TASK] All products in Prod marked as clean")

        else:
            db_merge_to_default_log(
                "[TASK] DRY RUN: Stage -> Prod merge and cleanup SKIPPED"
            )

        # Analyzer runs regardless of dry_run
        db_merge_to_default_log(db_merge_log("[TASK] Running Stage -> Prod analyzer"))
        call_command(
            "embeddings_test", source=STAGE_DB, samples=100, check_translations=True
        )
        db_merge_to_default_log("[TASK] Embeddings/semantic analysis finished")
        db_merge_to_default_log("[TASK] Translation analysis finished")

        # Cleanup Stage + Crawler DBs
        if not dry_run:
            Product.objects.using(STAGE_DB).all().delete()
            db_merge_to_default_log(db_merge_log("[TASK] Stage DB cleared"))
            for db in CRAWLER_DBS:
                Product.objects.using(db).all().delete()
                db_merge_to_default_log(f"[TASK] Crawler DB '{db}' cleared")

        db_merge_to_default_log("[TASK] Pipeline finalization completed successfully")

        # Reload embeddings cache
        load_embeddings_cache_log(
            "[TASK] Reloading embeddings cache after Prod merge..."
        )
        embeddings_cache.load_embeddings_cache()
        load_embeddings_cache_log("[TASK] Embeddings cache reloaded.")

    except Exception as e:
        db_merge_to_default_log(f"[TASK] Finalize pipeline merge failed: {e}")
        raise


@shared_task(name="run_full_pipeline")
def run_full_pipeline():
    """
    Full shop crawler + processing pipeline.

    Steps:
        1 Run crawler
        2 Normalize recent products
        3 Run translation
        4 Generate embeddings
        5 Merge all crawler DBs into Stage
        6 Generate canonical IDs in Stage
        7 Merge Stage into Prod (finalize)
    """
    from celery import chain

    workflow = chain(
        run_crawler.s(),
        run_normalize.si(interval_minutes=999),
        run_translation.si(),
        run_embeddings.si(),
        run_merge_pipeline_to_stage.si(),
        run_canonical_ids_stage.si(batch_size=1000),
        run_merge_pipeline_to_default.si(dry_run=DRY_RUN),
    )

    result = workflow.apply()
    return f"Full pipeline queued with ID: {result.id}"


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
