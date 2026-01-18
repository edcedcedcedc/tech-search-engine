import os
from pathlib import Path
import subprocess
from celery import shared_task
import environ
from django.utils import timezone
from datetime import timedelta

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
from products.services.normalize import normalize_category_for_product
from products.utils.log.load_embeddings_cache_log import load_embeddings_cache_log

# Load environment variables
env = environ.Env()
environ.Env.read_env()  # reads .env
client = OpenAI(api_key=env("OPENAI_API_KEY"))


CRAWLER_DBS = ["enter", "darwin", "xstore"]
STAGE_DB = "stage"
PROD_DB = "default"


@shared_task(name="run_crawler")
def run_crawler():
    """
    Run the Django crawler command via Celery.
    """
    try:
        call_command("reset")
        call_command(
            "crawl", track_fields="price, in_stock", pages=1, shop="xstore"
        )  # assumes your command is named 'crawl.py'
        shop_crawler_log("[TASK]Crawler finished successfully")
    except Exception as e:
        shop_crawler_log(f"[TASK]Crawler failed: {e}")
        raise  # let Celery retry if needed


RAWLER_DBS = ["enter", "darwin", "xstore"]


@shared_task(name="run_normalize_recent_products")
def run_normalize_recent_products(interval_minutes=None):
    """
    Normalize products created in the last `interval_minutes` across all crawler DBs.
    Loops through each DB, finds 'dirty' + 'created' products, and assigns categories.
    """
    env = environ.Env()
    environ.Env.read_env()
    client = OpenAI(api_key=env("OPENAI_API_KEY"))
    from products.models import Product

    if interval_minutes is None:
        interval_minutes = 999

    since = timezone.now() - timedelta(minutes=interval_minutes)
    total_scheduled = 0

    for db in CRAWLER_DBS:
        products_qs = Product.objects.using(db).filter(
            created_at__gte=since,
            dirty=True,
            change_type="created",
        )
        count = products_qs.count()
        total_scheduled += count
        category_log(f"[TASK][{db}] Found {count} new dirty products to normalize")

        for product in products_qs:
            try:
                # Call the normalization function synchronously
                result = normalize_category_for_product(
                    product.id, db=db, client=client
                )
                category_log(f"[TASK][{db}] {product.id} normalized: {result}")

            except Exception as e:
                category_log(
                    f"[TASK][{db}] Error normalizing product {product.id}: {e}"
                )

    return category_log(
        "[TASK] Total products processed across all DBs: {total_scheduled}"
    )


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


# ===============================
# Celery task
# ===============================
@shared_task(name="run_translation")
def run_translation():
    """
    Run translation command for all databases with correct flags using venv_translate.
    """
    databases = ["enter", "darwin", "xstore"]

    for db in databases:
        # call the helper instead of running Translate class directly
        run_translation_in_venv_translate(db=db, shop_filter=db)


@shared_task(
    name="run_embeddings",
)
def run_embeddings():
    """
    Run embeddings generation command for all databases.
    The command itself decides what needs embedding.
    """
    databases = ["enter", "darwin", "xstore"]

    for db in databases:
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
    from products.models import Product
    from products.models import CrawlSnapshot

    try:
        # Step 1: Prod -> Stage (force overwrite)
        db_merge_log("[TASK] Step 1: Prod -> Stage (force overwrite)")
        call_command(
            "merge",
            source=PROD_DB,
            dest=STAGE_DB,
            force=True,
        )
        db_merge_log("[TASK] Step 1 finished: Stage now matches Prod")

        # Step 2: Merge crawler DBs -> Stage (dirty logic)
        for db in CRAWLER_DBS:
            db_merge_log(f"[TASK] Step 2: {db} -> Stage (dirty merge)")
            call_command(
                "merge",
                source=db,
                dest=STAGE_DB,
                shop=db,  # shop name = DB name
            )
            db_merge_log(f"[TASK] Step 2 finished for {db}")

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

        db_merge_log("[TASK] Merge to stage + snapshots completed")

    except Exception as e:
        db_merge_log(f"[TASK] Merge to stage failed: {e}")
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
def run_merge_pipeline_to_default(throttle_seconds=5, dry_run=True, batch_size=5000):
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
                db_merge_log(
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
                db_merge_log(
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

                db_merge_log(
                    f"[COMPARE/ARCHIVE] Shop '{shop_name}' - archived/deleted {archived_count} products"
                )

            # Step 2: Merge Stage -> Prod
            db_merge_log(
                f"[TASK] Starting Stage -> Prod merge | force=True | throttle={throttle_seconds}s"
            )
            call_command(
                "merge",
                source=STAGE_DB,
                dest=PROD_DB,
                force=True,
                throttle=throttle_seconds,
            )
            db_merge_log("[TASK] Stage -> Prod merge finished successfully")

            # Step 2.5: Price History Prod
            call_command("history")
            db_merge_log("[TASK] Price history snapshot created")
            # Step 3: Mark Prod products clean
            Product.objects.using(PROD_DB).all().update(dirty=False, change_type=None)
            db_merge_log("[TASK] All products in Prod marked as clean")

        else:
            db_merge_log("[TASK] DRY RUN: Stage -> Prod merge and cleanup SKIPPED")

        # Analyzer runs regardless of dry_run
        db_merge_log("[TASK] Running Stage -> Prod analyzer")
        call_command(
            "embeddings_test", source=STAGE_DB, samples=100, check_translations=True
        )
        db_merge_log("[TASK] Embeddings/semantic analysis finished")
        db_merge_log("[TASK] Translation analysis finished")

        # Cleanup Stage + Crawler DBs
        if not dry_run:
            Product.objects.using(STAGE_DB).all().delete()
            db_merge_log("[TASK] Stage DB cleared")
            for db in CRAWLER_DBS:
                Product.objects.using(db).all().delete()
                db_merge_log(f"[TASK] Crawler DB '{db}' cleared")

        db_merge_log("[TASK] Pipeline finalization completed successfully")

        # Reload embeddings cache
        load_embeddings_cache_log(
            "[TASK] Reloading embeddings cache after Prod merge..."
        )
        embeddings_cache.load_embeddings_cache()
        load_embeddings_cache_log("[TASK] Embeddings cache reloaded.")

    except Exception as e:
        db_merge_log(f"[TASK] Finalize pipeline merge failed: {e}")
        raise


# Add pipeline function here too
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
        run_normalize_recent_products.si(interval_minutes=999),
        run_translation.si(),
        run_embeddings.si(),
        run_merge_pipeline_to_stage.si(),
        run_canonical_ids_stage.si(batch_size=1000),
        run_merge_pipeline_to_default.si(dry_run=False),
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
