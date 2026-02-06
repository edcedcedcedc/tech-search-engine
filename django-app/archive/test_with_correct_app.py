# test_with_correct_app.py
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

import django

django.setup()

print("=== Testing with CORRECT Celery app ===")

# Import YOUR app, not the default one
from aggregator.celery import app

print(f"1. Using app: {app}")
print(f"2. Broker URL: {app.conf.broker_url}")
print(f"3. Result backend: {app.conf.result_backend}")


# Create a test task using YOUR app
@app.task
def test_correct_app():
    print("🎉 Using the correct Celery app with Redis!")
    return "Success from correct app"


# Test it
try:
    print("\n4. Sending test task...")
    result = test_correct_app.delay()
    print(f"   Task ID: {result.id}")
    print(f"   Task ready: {result.ready()}")

    # Check Redis queue
    import redis

    r = redis.Redis(host="localhost", port=6379, db=0)
    queue_len = r.llen("celery")
    print(f"   Tasks in Redis queue: {queue_len}")

except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback

    traceback.print_exc()

# Now test your actual pipeline
print("\n5. Testing your pipeline task...")
try:
    # Import using the correct path
    from products.utils.tasks.pipeline import run_full_pipeline

    print(f"   Found function: {run_full_pipeline}")

    # Check which app it's registered with
    task_name = run_full_pipeline.__name__
    if task_name in app.tasks:
        print(f"   ✅ Task is registered with OUR app")
    else:
        print(f"   ❌ Task is NOT registered with OUR app")
        print(f"   It might be registered with default app")

    # Try to send it anyway
    print("   Sending task...")
    result = run_full_pipeline.delay()
    print(f"   Task sent! ID: {result.id}")

except Exception as e:
    print(f"   ❌ Error: {e}")
