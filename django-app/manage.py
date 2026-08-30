#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

    # Clear and recreate cache table on startup
    try:
        import django

        django.setup()

        from django.core.cache import cache
        from django.db import connection
        from django.core.management import call_command
        from django.conf import settings

        print("Checking cache table...")

        # Get cache table name from settings
        cache_config = settings.CACHES["default"]
        cache_table = cache_config["LOCATION"]  # 'django_cache_table'

        print(f"Cache table name: {cache_table}")

        # Use the default database connection
        with connection.cursor() as cursor:
            # SQLite specific: check if table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=%s",
                [cache_table],
            )
            table_exists = cursor.fetchone()

            if table_exists:
                print(f"Cache table '{cache_table}' exists, clearing...")
                # Clear all cache entries
                cache.clear()
                print("Cache cleared")

                # Optional: Also truncate the table for a complete reset
                cursor.execute(f"DELETE FROM {cache_table}")
                print(f"Table '{cache_table}' truncated")
            else:
                print(f"Cache table '{cache_table}' doesn't exist, creating...")
                call_command("createcachetable", cache_table)
                print(f"Cache table '{cache_table}' created")

    except Exception as e:
        print(f"Cache setup warning: {e}")
        # Continue anyway - non-critical

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
