"""
Entry point for shop_crawler_engine folder command.
This makes Django discover the folder-based command.
"""

"""
python manage.py crawl --shop(optional) --category(optional) --pages(default=1)
"""

import os
import sys

# Add the engine folder to Python path
engine_folder = os.path.join(os.path.dirname(__file__), "shop_crawler_engine")
if engine_folder not in sys.path:
    sys.path.insert(0, engine_folder)

# Import the Command class from the folder
from main import Command

# Django will find this Command class
