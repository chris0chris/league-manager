#!/bin/bash
# Screenshot capture script using headless Chrome
# Usage: ./capture_screenshot.sh <URL> <output_path>

URL="$1"
OUTPUT="$2"

if [ -z "$URL" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <URL> <output_path>"
    echo "Example: $0 http://localhost:8000/gamedays/ screenshots/gamedays_overview.png"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT")"

# Capture screenshot using headless Chrome
google-chrome \
    --headless \
    --disable-gpu \
    --window-size=1440,900 \
    --screenshot="$OUTPUT" \
    --hide-scrollbars \
    "$URL"

# Check if screenshot was created
if [ -f "$OUTPUT" ]; then
    echo "Screenshot captured: $OUTPUT"
    ls -lh "$OUTPUT"
else
    echo "ERROR: Failed to capture screenshot"
    exit 1
fi
