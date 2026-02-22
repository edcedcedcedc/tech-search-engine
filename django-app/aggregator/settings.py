"""
set DJANGO_ENV=development   # Windows
export DJANGO_ENV=development  # Linux/Mac
"""

from pathlib import Path
import environ
import os
from products.search.config import CACHE_TTL_LAYER1

BASE_DIR = Path(__file__).resolve().parent.parent

# Read environment
DJANGO_ENV = os.environ.get("DJANGO_ENV", "development")

env_file = ".env" if DJANGO_ENV == "development" else ".env.prod"
env = environ.Env(DEBUG=(bool, DJANGO_ENV == "development"))
environ.Env.read_env(os.path.join(BASE_DIR, env_file))

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")


# ------------------------
# Session / Cookies
# ------------------------
SESSION_ENGINE = "django.contrib.sessions.backends.db"  # store sessions in DB
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # keep sessions after browser closes

SESSION_COOKIE_AGE = 2147483647  # huge age (max int), basically persistent
SESSION_COOKIE_SAMESITE = "Lax"  # prevents CSRF in cross-site requests
SESSION_COOKIE_SECURE = False  # True if using HTTPS in production
SESSION_COOKIE_HTTPONLY = True  # JS cannot read the cookie

if not SECRET_KEY:
    raise RuntimeError(
        f"SECRET_KEY not set in environment, generate and set it to '.env'"
    )

DATABASES = {
    "default": env.db(),
    "stage": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "stage.sqlite3",
    },
    "darwin": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "shop_darwin.sqlite3",
    },
    "enter": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "shop_enter.sqlite3",
    },
    "xstore": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "shop_xstore.sqlite3",
    },
    "celery_beat": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "celery_beat.sqlite3",
    },
    "broken": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "broken.sqlite3",
    },
    "update": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "update.sqlite3",
    },
}

# Tell Celery Beat to use this database
CELERY_BEAT_DB_ALIAS = "celery_beat"
DATABASE_ROUTERS = ["products.db_router.CeleryBeatRouter"]

# Allowed hosts
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=([] if DJANGO_ENV == "development" else ["your-production-domain.com"]),
)

# Applications
INSTALLED_APPS = [
    "corsheaders",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "products.apps.ProductsConfig",
    "django_celery_beat",
    "rest_framework",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must be first for CORS
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "products.middleware.IPBlockMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "products.throttles.Layer1Throttle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "layer1": "20/min",  # Layer1 clusters
        "layer2_preview": "20/min",  # Layer2 full=false
        "layer2_full": "500/min",  # Layer2 full=true
        "autocomplete": "120/min",
        "anon": "60/min",
        "user": "600/min",
    },
}

ROOT_URLCONF = "aggregator.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "aggregator.wsgi.application"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://strugure.app",
    "http://192.168.1.x:5173",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_EXPOSE_HEADERS = [
    "content-type",
    "x-csrftoken",
]

ELASTICSEARCH_HOSTS = ["http://localhost:9200"]
CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/0"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "visibility_timeout": 3600,
    "fanout_prefix": True,
    "fanout_patterns": True,
    "queue_order_strategy": "priority",
}


CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache_table",
        "TIMEOUT": CACHE_TTL_LAYER1,  # Uses your 24h setting
        "OPTIONS": {
            "MAX_ENTRIES": 10000,  # Prevent unlimited growth
            "CULL_FREQUENCY": 3,  # Remove 1/3 entries when max reached
        },
    }
}
