#!/bin/bash

# -----------------------------
# Translation Runner for Django
# -----------------------------
# Runs the `translate` management command on all products
# Can be scheduled independently from aggregation
# -----------------------------

# Paths
PYTHON_PATH="./venv/Scripts/python"   # path to python in venv
PROJECT_PATH="./"                     # your Django project root
LOGFILE="./logs/translation.log"      # log file

# Sleep interval between products (optional)
SLEEP_INTERVAL=0.5

# Flags
FORCE_TRANSLATE=false                 # set true to re-translate existing entries

# Ensure logs directory exists
mkdir -p ./logs

# Function to handle interrupts gracefully
function handle_interrupt() {
    echo "Received interrupt, stopping translation..." >> "$LOGFILE"
    exit 1
}

trap handle_interrupt SIGINT SIGTERM

# Start translation
echo "=== Translation run started at $(date) ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"

cd "$PROJECT_PATH" || { echo "Cannot cd to project path"; exit 1; }

CMD="$PYTHON_PATH manage.py translate_googletrans --sleep $SLEEP_INTERVAL"
if [ "$FORCE_TRANSLATE" = true ]; then
    CMD="$CMD --force"
fi

# Run the command and log stdout/stderr
$CMD >> "$LOGFILE" 2>&1

echo "" >> "$LOGFILE"
echo "=== Translation run finished at $(date) ===" >> "$LOGFILE"
