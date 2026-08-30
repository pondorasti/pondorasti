#!/bin/sh
# Re-pull usage data from ccusage and rebuild data.js for index.html.
set -e
cd "$(dirname "$0")"
bunx ccusage daily --json > /tmp/ccusage-daily.json
bunx ccusage monthly --json > /tmp/ccusage-monthly.json
bun build-data.mjs
echo "done — reopen index.html"
