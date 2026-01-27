#!/bin/bash

PYTHON_PATH="./venv/Scripts/python"
PROJECT_PATH="./"
MAX_PAGES=300
SLEEP_INTERVAL=1339200
LOGFILE="./logs/aggregation_engine.log"
STOP_SCHEDULER=false

# Accept shops from CLI arguments
SHOPS=("$@")

# Default shops if none passed
if [ ${#SHOPS[@]} -eq 0 ]; then
    SHOPS=("enter" "darwin" "xstore")
fi

declare -A SHOPS_CATEGORIES=(
    ["enter"]="laptop mobilephone pc gaming"
    ["darwin"]="monitor laptop mobilephone pc gpu ssd hdd ram mb cpu keyboard mouse mousepad externhdd powersupply fan fanbase gaming router switch"
    ["xstore"]="laptop laptopaccessories software headphones accessories pc setuppc consolegaming componentspc apple allinonepc brandpc minipc phones tablete perifericp monitoare scaune televizoare accesoriitv imprimante tehnicadebirou proiectoaresiecrane aspiratoarerobot"
)

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

function handle_interrupt() {
    echo "Received interrupt signal, stopping scheduler..." >> "$LOGFILE"
    echo "=== Aggregation run gracefully stopped at $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOGFILE"
    STOP_SCHEDULER=true
}

trap handle_interrupt SIGINT SIGTERM

mkdir -p ./logs

while [ "$STOP_SCHEDULER" = false ]; do
    {
        echo "=== Aggregation run started at $(date '+%Y-%m-%d %H:%M:%S') ==="
        echo ""

        for SHOP in "${SHOPS[@]}"; do
            CATEGORIES="${SHOPS_CATEGORIES[$SHOP]}"

            if [ -z "$CATEGORIES" ]; then
                echo "Skipping unknown shop: $SHOP"
                continue
            fi

            for CATEGORY in $CATEGORIES; do
                if [ "$STOP_SCHEDULER" = true ]; then
                    break 2
                fi

                echo "Fetching $SHOP / $CATEGORY (up to $MAX_PAGES pages)"
                echo ""

                cd "$PROJECT_PATH" || exit 1

                $PYTHON_PATH manage.py aggregation_engine \
                    --shop "$SHOP" \
                    --category "$CATEGORY" \
                    --pages "$MAX_PAGES"
                
                SLEEP_PER_CATEGORY=$((RANDOM % 5 + 5))
                echo "Sleeping $SLEEP_PER_CATEGORY seconds to avoid 429..."
                sleep $SLEEP_PER_CATEGORY

                echo ""
                echo "---"
                echo ""
            done

            SLEEP_PER_SHOP=$((RANDOM % 3 + 3))
            echo "Sleeping $SLEEP_PER_SHOP seconds to avoid 429..."
            sleep $SLEEP_PER_SHOP
        done

        echo "=== Aggregation run complete at $(date '+%Y-%m-%d %H:%M:%S') ==="
        echo "Sleeping $SLEEP_INTERVAL seconds..."
        echo ""
        echo "=========================================="
        echo ""

    } >> "$LOGFILE" 2>&1

    sleep $SLEEP_INTERVAL &
    wait $!
done