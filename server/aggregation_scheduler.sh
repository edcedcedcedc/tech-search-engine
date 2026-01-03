#!/bin/bash

PYTHON_PATH="./venv/Scripts/python"
PROJECT_PATH="./"
MAX_PAGES=1
SLEEP_INTERVAL=30
LOGFILE="./logs/fetch.log"
STOP_SCHEDULER=false
declare -A SHOPS_CATEGORIES

SHOPS_CATEGORIES=( 
    ["enter"]="monitor laptop pc"
    ["darwin"]="monitor laptop pc"
)

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

function handle_interrupt() {
    echo "Received interrupt signal, stopping scheduler...">> "$LOGFILE"
    echo "=== Aggregation run gracefully stoped at $(date) ===" >> "$LOGFILE"
    STOP_SCHEDULER=true
}

trap handle_interrupt SIGINT SIGTERM

mkdir -p ./logs

while [ "$STOP_SCHEDULER" = false ]; do
    {
        echo "=== Aggregation run started at $(date) ==="
        echo ""
        
        for SHOP in "${!SHOPS_CATEGORIES[@]}"; do
            for CATEGORY in ${SHOPS_CATEGORIES[$SHOP]}; do
                if [ "$STOP_SCHEDULER" = true ]; then
                    break 2
                fi

                echo "Fetching $SHOP / $CATEGORY (up to $MAX_PAGES pages)"
                echo ""
                cd "$PROJECT_PATH" || exit 1

                $PYTHON_PATH manage.py aggregation_engine --shop $SHOP --category $CATEGORY --pages $MAX_PAGES --auto_stdout
                
                echo ""
                echo "---"
                echo ""
            done
        done

        if [ "$STOP_SCHEDULER" = true ]; then
            break 2
        fi
        echo "=== Aggregation run complete at $(date) ==="
        echo "Sleeping $SLEEP_INTERVAL seconds..."
        echo ""
        echo "=========================================="
        echo ""
    } >> "$LOGFILE" 2>&1

    sleep $SLEEP_INTERVAL & 
    wait $! 
done
