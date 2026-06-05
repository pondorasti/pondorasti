#!/usr/bin/env python3
"""Compute the code-contributed-per-quarter chart from commit-level data.

Methodology mirroring Anthropic's chart:
- Bar = total lines added in quarter / days in quarter
- Per-commit additions capped at the 99th percentile (analog of per-PR cap)
- Baseline = mean of pre-2025 quarterly daily rates (Q2 2021–Q4 2024)
- Final bar (Q2 2026) is partial: divided by days observed so far
"""

import json
from datetime import date, timedelta
from pathlib import Path

COMMITS = json.loads(Path("commits.json").read_text())
TODAY = date(2026, 6, 5)


def to_date(iso: str):
    if not iso:
        return None
    try:
        return date.fromisoformat(iso.split("T")[0])
    except ValueError:
        return None


def quarter_of(d: date) -> str:
    return f"{d.year}Q{(d.month - 1) // 3 + 1}"


def quarter_window(label: str) -> tuple[date, date]:
    y, q = int(label[:4]), int(label[-1])
    m = (q - 1) * 3 + 1
    start = date(y, m, 1)
    end = (date(y, m + 3, 1) - timedelta(days=1)) if m + 3 <= 12 else date(y, 12, 31)
    return start, end


# Chart range: Q2 2021 to Q2 2026 (matches Anthropic's x-axis)
QUARTERS = []
for y in range(2021, 2027):
    for q in range(1, 5):
        if (y, q) < (2021, 2): continue
        if (y, q) > (2026, 2): continue
        QUARTERS.append(f"{y}Q{q}")
QSET = set(QUARTERS)


# Parse dates and drop unparseable
parsed = []
dropped = 0
for c in COMMITS:
    d = to_date(c.get("date", ""))
    if d is None:
        dropped += 1
        continue
    c["_date"] = d
    parsed.append(c)
print(f"Parsed dates: {len(parsed)} (dropped {dropped} with missing/bad dates)")

# Per-commit 99th-percentile cap across ALL commits in the chart range
in_range = [c for c in parsed if quarter_of(c["_date"]) in QSET]
print(f"Commits in chart range (2021Q2–2026Q2): {len(in_range)}  (of {len(COMMITS)} total)")
adds_sorted = sorted(c["add"] for c in in_range)
P99_CAP = adds_sorted[int(len(adds_sorted) * 0.99)] if adds_sorted else 0
capped_count = sum(1 for c in in_range if c["add"] > P99_CAP)
print(f"99th-percentile cap: {P99_CAP} additions/commit  (capped {capped_count} commits)")


# Bucket capped additions by quarter
by_q: dict[str, int] = {q: 0 for q in QUARTERS}
ncommits: dict[str, int] = {q: 0 for q in QUARTERS}
for c in in_range:
    q = quarter_of(c["_date"])
    by_q[q] += min(c["add"], P99_CAP)
    ncommits[q] += 1


# Daily rates (partial final quarter)
rates: dict[str, float] = {}
days_by_q: dict[str, int] = {}
for q in QUARTERS:
    first, last = quarter_window(q)
    if TODAY < last:
        last = TODAY
    d = (last - first).days + 1
    days_by_q[q] = d
    rates[q] = by_q[q] / d


PRE_2025 = [q for q in QUARTERS if int(q[:4]) < 2025]
baseline = sum(rates[q] for q in PRE_2025) / len(PRE_2025)
print(f"Pre-2025 baseline (avg of {len(PRE_2025)} quarterly rates): {baseline:.1f} LOC/day")

mult = {q: rates[q] / baseline for q in QUARTERS}


# Print the table
print(f"\n{'Quarter':<8} {'Commits':>7}  {'CapAdds':>9}  {'Days':>4}  {'LOC/day':>9}  {'×base':>6}")
for q in QUARTERS:
    partial = " *" if q == "2026Q2" else ""
    print(f"{q:<8} {ncommits[q]:>7}  {by_q[q]:>9}  {days_by_q[q]:>4}  {rates[q]:>9.1f}  {mult[q]:>5.2f}x{partial}")
print("* = partial quarter")


# Dump
out = {
    "user": "pondorasti",
    "as_of": TODAY.isoformat(),
    "method": "commit-level, all authored commits (incl. private repos), per-commit additions capped at p99",
    "p99_cap_additions": P99_CAP,
    "baseline_loc_per_day": baseline,
    "total_commits_analyzed": len(in_range),
    "total_commits_authored_all_time": len(COMMITS),
    "quarters": [
        {
            "quarter": q,
            "commits": ncommits[q],
            "capped_additions": by_q[q],
            "days": days_by_q[q],
            "loc_per_day": rates[q],
            "multiplier": mult[q],
            "partial": q == "2026Q2",
        }
        for q in QUARTERS
    ],
}
Path("chart_data_commits.json").write_text(json.dumps(out, indent=2))
print(f"\nWrote chart_data_commits.json")
