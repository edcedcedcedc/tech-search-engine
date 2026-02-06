#!/usr/bin/env python3
"""
Download and install only RO↔EN and RO↔RU models for Argos Translate.
Places them in ./translate_models.
"""

import os
import sys
import requests
from argostranslate import package

# Directory where models will live
MODEL_DIR = os.path.join(os.getcwd(), "translate")
os.makedirs(MODEL_DIR, exist_ok=True)

# Actual model filenames on the Argos index
file_info = [
    # Romanian -> English
    (
        "https://data.argosopentech.com/argospm/v1/translate-ro_en-1_9.argosmodel",
        "translate-ro_en-1_9.argosmodel",
    ),
    # Romanian -> Russian via pivot (RO -> EN + EN -> RU)
    (
        "https://data.argosopentech.com/argospm/v1/translate-en_ru-1_9.argosmodel",
        "translate-en_ru-1_9.argosmodel",
    ),
    # (Optional) English -> Romanian if you ever want back-translation
    (
        "https://data.argosopentech.com/argospm/v1/translate-en_ro-1_9.argosmodel",
        "translate-en_ro-1_9.argosmodel",
    ),
]

# Download and install
for url, filename in file_info:
    local_path = os.path.join(MODEL_DIR, filename)
    print(f"Downloading {filename} ...")
    try:
        # Download
        resp = requests.get(url, stream=True)
        resp.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)

        # Install
        print(f"Installing {filename} ...")
        package.install_from_path(local_path)
        print(f"Installed {filename}")

    except Exception as e:
        print(f"Error with {filename}: {e}")
        sys.exit(1)

print("\nAll models downloaded & installed!")
print(f"Models are in: {MODEL_DIR}")
print("Start LibreTranslate like:")
print(f"libretranslate --no-update --models-dir {MODEL_DIR}")
