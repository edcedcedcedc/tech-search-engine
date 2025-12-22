from pathlib import Path
import environ
import os


""" 
set DJANGO_ENV=development   # Windows
# or
export DJANGO_ENV=development  # Linux/Mac
python manage.py runserver

 """

BASE_DIR = Path(__file__).resolve().parent.parent

# Read environment
DJANGO_ENV = os.environ.get("DJANGO_ENV", "development")

env_file = ".env" if DJANGO_ENV == "development" else ".env.prod"
env = environ.Env(DEBUG=(bool, DJANGO_ENV == "development"))
environ.Env.read_env(os.path.join(BASE_DIR, env_file))

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        f"SECRET_KEY not set in environment, generate and set it to '.env'"
    )

# Database from env
DATABASES = {"default": env.db()}

# Allowed hosts
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=[] if DJANGO_ENV == "development" else ["your-production-domain.com"],
)

# Applications
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "products",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

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
