#!/usr/bin/env python
# debug_celery.py
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

import django

django.setup()

from celery import current_app
import redis

print("=== Debugging Celery/Redis ===")

# 1. Check Redis URL in settings
from django.conf import settings

print(f"1. CELERY_BROKER_URL: {getattr(settings, 'CELERY_BROKER_URL', 'NOT SET')}")
print(
    f"2. CELERY_RESULT_BACKEND: {getattr(settings, 'CELERY_RESULT_BACKEND', 'NOT SET')}"
)

# 2. Test Redis connection directly
print("\n3. Testing Redis connection...")
try:
    r = redis.Redis(host="localhost", port=6379, db=0)
    print(f"   Redis ping: {r.ping()}")
    print("   ✅ Redis direct connection OK")
except Exception as e:
    print(f"   ❌ Redis direct connection failed: {e}")

# 3. Check Celery app configuration
print("\n4. Checking Celery app...")
try:
    app = current_app
    print(f"   Celery app name: {app.main}")

    # Try to get the broker connection
    with app.connection() as conn:
        print(f"   Celery broker: {conn.as_uri()}")
        print("   ✅ Celery broker connection OK")
except Exception as e:
    print(f"   ❌ Celery broker connection failed: {e}")
    import traceback

    traceback.print_exc()

# 4. Show if Redis Docker is running
print("\n5. Checking Docker Redis...")
import subprocess

result = subprocess.run(
    ["docker", "ps", "--filter", "name=redis", "--format", "{{.Names}}"],
    capture_output=True,
    text=True,
)
if "redis" in result.stdout:
    print("   ✅ Redis Docker container is running")
else:
    print("   ❌ Redis Docker container NOT found")
    print("   Run: docker run -d -p 6379:6379 redis:alpine")
