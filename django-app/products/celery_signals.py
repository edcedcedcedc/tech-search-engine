import time
import traceback
from celery.signals import worker_ready, task_prerun, task_postrun, task_failure
from django.core.mail import mail_admins
from products.utils.log.versioning_log import versioning_log

# store start times
TASK_START_TIMES = {}


@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    versioning_log("Celery worker is ready.")


@task_prerun.connect
def task_start_handler(task_id=None, task=None, **kwargs):
    TASK_START_TIMES[task_id] = time.time()
    versioning_log(f"[TASK START] {task.name} | id={task_id}")


@task_postrun.connect
def task_finish_handler(task_id=None, task=None, **kwargs):
    start = TASK_START_TIMES.pop(task_id, None)
    duration = None
    if start:
        duration = round(time.time() - start, 2)
    versioning_log(f"[TASK DONE] {task.name} | id={task_id} | duration={duration}s")


@task_failure.connect
def task_failure_handler(task_id=None, exception=None, task=None, **kwargs):
    # Log to file
    versioning_log(f"[TASK FAILED] {task.name} | id={task_id} | exception={exception}")

    # Build email content
    exc_info = traceback.format_exc()
    subject = f"Celery Task Failed: {task.name}"
    message = f"""
Task Name: {task.name}
Task ID: {task_id}
Exception: {exception}
Traceback:
{exc_info}
"""
    # Send email to all ADMINS
    try:
        mail_admins(subject, message)
        versioning_log(f"Failure email sent for task {task.name} | id={task_id}")
    except Exception as e:
        versioning_log(f"Failed to send failure email: {e}")
