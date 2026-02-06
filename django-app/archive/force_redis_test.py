# force_redis_test.py
import os
import sys

# Set Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

# MANUALLY set Redis as broker BEFORE any imports
os.environ["CELERY_BROKER_URL"] = "redis://localhost:6379/0"
os.environ["CELERY_RESULT_BACKEND"] = "redis://localhost:6379/0"

# Now import
import django

django.setup()

print("=== FORCING REDIS CONNECTION ===")

# Create a NEW Celery app with explicit Redis config
from celery import Celery

# Create fresh app with Redis
forced_app = Celery("forced_redis_app")
forced_app.conf.update(
    broker_url="redis://localhost:6379/0",
    result_backend="redis://localhost:6379/0",
    task_serializer="json",
    result_serializer="json",
)

# Test the forced app
print(f"1. Forced app broker: {forced_app.conf.broker_url}")


# Create a test task with forced app
@forced_app.task
def forced_test():
    return "This MUST use Redis!"


# Send task
try:
    result = forced_test.delay()
    print(f"2. Task sent with ID: {result.id}")

    # Check Redis directly
    import redis

    r = redis.Redis(host="localhost", port=6379, db=0)

    # Check queue
    queue_len = r.llen("celery")
    print(f"3. Redis queue length: {queue_len}")

    if queue_len > 0:
        print("   ✅ Task is in Redis!")
        # Show first task in queue
        task_data = r.lrange("celery", 0, 0)
        if task_data:
            print(f"   Task data preview: {task_data[0][:100]}...")
    else:
        print("   ❌ No tasks in Redis queue")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()

# Now test YOUR actual task
print("\n=== Testing YOUR Pipeline Task ===")
try:
    # Import fresh
    import importlib
    import products.utils.tasks.pipeline

    # Reload module to clear cached imports
    importlib.reload(products.utils.tasks.pipeline)

    from products.utils.tasks.pipeline import run_full_pipeline

    print(f"4. Your task: {run_full_pipeline}")
    print(f"5. Task app: {run_full_pipeline.app}")
    print(
        f"6. Task broker: {getattr(run_full_pipeline.app, 'conf', {}).get('broker_url', 'NO CONF')}"
    )

    # Check if it's using Redis
    if hasattr(run_full_pipeline.app, "conf"):
        broker = run_full_pipeline.app.conf.get("broker_url", "")
        if "redis" in broker:
            print("   ✅ YOUR task is configured for Redis!")
        else:
            print(f"   ❌ YOUR task is using: {broker}")

    # Try to send it
    print("\n7. Sending your pipeline task...")
    result = run_full_pipeline.apply_async(queue="celery", routing_key="celery")
    print(f"   Task ID: {result.id}")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
