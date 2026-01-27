# scripts/run_pipeline_test.py
#!/usr/bin/env python
import os
import sys
import django

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")
django.setup()

# Now import the task from products.tasks
from products.tasks import run_full_pipeline

if __name__ == "__main__":
    print("Starting full pipeline test...")

    # Run the task synchronously for testing
    result = run_full_pipeline.apply()
    print(f"Task started with ID: {result.id}")
    print("Full pipeline test finished.")
