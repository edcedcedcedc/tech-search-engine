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
        call_command(
            "crawl", track_fields="price", category="laptop"
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

        db_merge_log(
            "[TASK] Merge to stage completed: ready for canonical ID generation"
        )

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
    autoretry_for=(Exception,),
    retry_backoff=60,
    retry_kwargs={"max_retries": 3},
    name="run_merge_pipeline_to_default",
)
def run_merge_pipeline_to_default(throttle_seconds=5, dry_run=True):
    """
    Final pipeline step with optional dry run:
    1. Merge Stage -> Prod (force) [skipped if dry_run=True]
    2. Run embeddings/translation analyzer
    3. Mark Prod products as clean (dirty=False, change_type=None) [skipped if dry_run=True]
    4. Delete Stage products [skipped if dry_run=True]
    5. Delete all products from crawler DBs [skipped if dry_run=True]
    """
    from products.utils import embeddings_cache
    from products.models import Product

    try:
        if not dry_run:
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

            Product.objects.using(PROD_DB).all().update(dirty=False, change_type=None)
            db_merge_log(
                "[TASK] All products in Prod marked as clean (dirty=False, change_type=None)"
            )
        else:
            db_merge_log("[TASK] DRY RUN: Stage -> Prod merge and cleanup SKIPPED")

        # Analyzer runs regardless of dry_run
        db_merge_log("[TASK] Running Stage -> Prod analyzer")
        call_command(
            "embeddings_test", source=STAGE_DB, samples=100, check_translations=True
        )
        db_merge_log("[TASK] Embeddings/semantic analysis finished")
        # call_command("translate", db=STAGE_DB, analyze=True)
        db_merge_log("[TASK] Translation analysis finished")

        # Cleanup only if not dry_run
        if not dry_run:
            Product.objects.using(STAGE_DB).all().delete()
            db_merge_log("[TASK] Stage DB cleared")
            for db in CRAWLER_DBS:
                Product.objects.using(db).all().delete()
                db_merge_log(f"[TASK] Crawler DB '{db}' cleared")

        db_merge_log("[TASK] Pipeline finalization completed successfully")

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
        run_merge_pipeline_to_default.si(dry_run=True),
    )

    result = workflow.apply_async()
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
