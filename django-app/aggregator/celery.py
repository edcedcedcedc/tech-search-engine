# aggregator/celery.py
from __future__ import absolute_import, unicode_literals
import os

# Set Django settings before creating app
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

from celery import Celery

# Create Celery app
app = Celery("aggregator")

# Configure using Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load Django
import django

django.setup()

# Auto-discover tasks in installed apps (looks for tasks.py)
app.autodiscover_tasks()


@app.task(bind=True, name="aggregator.celery.debug_task")
def debug_task(self):
    print(f"Request: {self.request!r}")
    return f"Request: {self.request!r}"


if __name__ == "__main__":
    app.start()
