# products/db_router.py
class CeleryBeatRouter:
    """
    Route Celery Beat models to separate database.
    """

    def db_for_read(self, model, **hints):
        if model._meta.app_label == "django_celery_beat":
            return "celery_beat"
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == "django_celery_beat":
            return "celery_beat"
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if (
            obj1._meta.app_label == "django_celery_beat"
            or obj2._meta.app_label == "django_celery_beat"
        ):
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == "django_celery_beat":
            return db == "celery_beat"
        return None
