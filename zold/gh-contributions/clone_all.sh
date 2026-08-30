#!/bin/bash
# Bare-clone every repo from repos.json into /tmp/gh-contribs-repos/<name>.git
# in parallel. Skips already-present clones. Failures are logged but don't stop.

set -u
ROOT=/tmp/gh-contribs-repos
mkdir -p "$ROOT"
LOG="$ROOT/clone.log"
: > "$LOG"

# Extract nameWithOwner list from repos.json
python3 -c '
import json
for r in json.load(open("repos.json")):
    print(r["nameWithOwner"])
' > "$ROOT/repolist.txt"

total=$(wc -l < "$ROOT/repolist.txt" | tr -d " ")
echo "Cloning $total repos -> $ROOT (parallelism: 8)…"

clone_one() {
    local repo="$1"
    local dir="$ROOT/$(basename "$repo").git"
    if [ -d "$dir" ]; then
        echo "[skip] $repo"
        return 0
    fi
    if gh repo clone "$repo" "$dir" -- --bare --quiet --filter=blob:limit=10m 2>>"$LOG"; then
        echo "[ok]   $repo"
    else
        echo "[fail] $repo"
    fi
}
export -f clone_one
export ROOT LOG

cat "$ROOT/repolist.txt" | xargs -P 8 -I {} bash -c 'clone_one "$@"' _ {}

echo
ok=$(grep -c "^\[ok\]" <(grep -c "^\[ok\]") 2>/dev/null || true)
echo "Done. Dirs in $ROOT:"
ls -1 "$ROOT" | grep '\.git$' | wc -l
echo "See $LOG for any failures."
