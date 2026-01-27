#!/usr/bin/env python
# tests/redis_test.py
import sys
import os

# Get the project root (one level up from tests/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

print(f"Project root: {project_root}")
print(f"Python path: {sys.path}")

import redis

# Test Redis connection
try:
    r = redis.Redis(host="localhost", port=6379, db=0)
    print(f"Redis ping: {r.ping()}")
    print("✅ Redis connection successful!")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")

# Test Django/Celery
try:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

    import django

    django.setup()
    print("✅ Django setup successful!")

    from django.conf import settings

    print(f"Django settings loaded from: {settings.SETTINGS_MODULE}")

    from celery import current_app

    app = current_app
    print(f"✅ Celery app: {app.main}")

except Exception as e:
    print(f"❌ Django/Celery setup failed: {e}")
    import traceback

    traceback.print_exc()
