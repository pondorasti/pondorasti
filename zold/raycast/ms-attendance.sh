#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Attend
# @raycast.mode silent

# Optional parameters:
# @raycast.icon images/makeschool-logo.png
# @raycast.argument1 { "type": "text", "placeholder": "1234" }

# @Documentation:
# @raycast.packageName Make School
# @raycast.description A simple script to mark attendance for Make School.
# @raycast.author Alexandru Turcanu
# @raycast.authorURL https://github.com/Pondorasti

open "https://www.makeschool.com/attend/$1"
