#!/usr/bin/env bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title World Time
# @raycast.mode inline
# @raycast.refreshTime 1m
# @raycast.packageName Dashboard

# Optional parameters:
# @raycast.icon 🕐
#
# Documentation:
# @raycast.description Show the time from elsewhere in the world
# @raycast.author Jesse Claven
# @raycast.authorURL https://github.com/jesse-c

# Timezones can be found in /usr/share/zoneinfo

sf=$(TZ=America/Los_Angeles date +"%H:%M")
buc=$(TZ=Europe/Bucharest date +"%H:%M")
lon=$(TZ=Europe/London date +"%H:%M")

echo "San Francisco: $sf | Bucharest: $buc | London: $lon"
