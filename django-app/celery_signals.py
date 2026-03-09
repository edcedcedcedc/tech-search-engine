from celery.signals import task_failure
from django.core.mail import mail_admins
import traceback


@task_failure.connect
def celery_task_failure_handler(
    sender=None,
    task_id=None,
    exception=None,
    args=None,
    kwargs=None,
    traceback_info=None,
    einfo=None,
    **kw,
):
    """
    Global Celery failure handler.
    Sends email when any task crashes.
    """

    task_name = sender.name if sender else "unknown"

    subject = f"🚨 Celery Task Failed: {task_name}"

    body = f"""
Task: {task_name}
Task ID: {task_id}

Args:
{args}

Kwargs:
{kwargs}

Exception:
{exception}

Traceback:
{einfo.traceback if einfo else traceback.format_exc()}
"""

    mail_admins(subject, body)
