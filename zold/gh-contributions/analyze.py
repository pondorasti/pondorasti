#!/usr/bin/env python3
"""Compute code-contributed-per-quarter chart, mirroring Anthropic's methodology.

Per the original chart caption:
- Bar = average over days in quarter of lines of code merged per active contributor
- Per-PR line counts capped at the 99th percentile
- Baseline = average of pre-2025 quarterly daily rates
- Multiplier = quarter_rate / baseline_rate
"""

import json
from datetime import date, timedelta
from pathlib import Path

PRS = json.loads(Path("prs.json").read_text())
TODAY = date(2026, 6, 5)  # context-provided "today"


def quarter_of(iso: str) -> str:
    y, m, _ = iso.split("T")[0].split("-")
    return f"{y}Q{(int(m) - 1) // 3 + 1}"


def quarter_window(label: str) -> tuple[date, date]:
    """Return (first_day, last_day_inclusive) for a quarter label like '2025Q3'."""
    y, q = int(label[:4]), int(label[-1])
    m_start = (q - 1) * 3 + 1
    start = date(y, m_start, 1)
    if m_start + 3 > 12:
        end = date(y, 12, 31)
    else:
        end = date(y, m_start + 3, 1) - timedelta(days=1)
    return start, end


# All quarters from 2021Q2 to 2026Q2 (matching the Anthropic chart's x-axis)
QUARTERS = []
for y in range(2021, 2027):
    for q in range(1, 5):
        if (y, q) < (2021, 2): continue
        if (y, q) > (2026, 2): continue
        QUARTERS.append(f"{y}Q{q}")


# Compute 99th-percentile cap across ALL PRs (matching the chart's per-PR cap)
adds_sorted = sorted(p["additions"] for p in PRS)
p99_idx = int(len(adds_sorted) * 0.99)
P99_CAP = adds_sorted[p99_idx]
print(f"99th-percentile cap: {P99_CAP} additions/PR")
print(f"PRs capped (additions exceed P99): {sum(1 for p in PRS if p['additions'] > P99_CAP)}")


def capped(pr: dict) -> int:
    return min(pr["additions"], P99_CAP)


# Group capped additions by quarter
by_q: dict[str, int] = {q: 0 for q in QUARTERS}
counts_by_q: dict[str, int] = {q: 0 for q in QUARTERS}
for pr in PRS:
    q = quarter_of(pr["mergedAt"])
    if q in by_q:
        by_q[q] += capped(pr)
        counts_by_q[q] += 1


# Daily rate per quarter (sum/days). Partial final quarter uses days observed so far.
rates: dict[str, float] = {}
days_by_q: dict[str, int] = {}
for q in QUARTERS:
    first, last = quarter_window(q)
    if TODAY < last:
        last = TODAY  # partial quarter
    days = (last - first).days + 1
    days_by_q[q] = days
    rates[q] = by_q[q] / days


# Pre-2025 baseline = mean of pre-2025 quarterly rates
PRE_2025 = [q for q in QUARTERS if int(q[:4]) < 2025]
baseline = sum(rates[q] for q in PRE_2025) / len(PRE_2025)
print(f"\nPre-2025 baseline (avg of {len(PRE_2025)} quarterly rates): {baseline:.2f} LOC/day")

# Multiplier per quarter
mult: dict[str, float] = {q: rates[q] / baseline for q in QUARTERS}


# Output
print(f"\n{'Quarter':<8} {'PRs':>4}  {'CapAdds':>9}  {'Days':>4}  {'LOC/day':>8}  {'×base':>6}")
for q in QUARTERS:
    partial = " *" if q == "2026Q2" else ""
    print(f"{q:<8} {counts_by_q[q]:>4}  {by_q[q]:>9}  {days_by_q[q]:>4}  {rates[q]:>8.1f}  {mult[q]:>5.2f}x{partial}")

print("\n* = partial quarter (days observed so far)")

# Dump for the chart
out = {
    "user": "pondorasti",
    "as_of": TODAY.isoformat(),
    "p99_cap": P99_CAP,
    "baseline_loc_per_day": baseline,
    "quarters": [
        {
            "quarter": q,
            "pr_count": counts_by_q[q],
            "capped_additions": by_q[q],
            "days": days_by_q[q],
            "loc_per_day": rates[q],
            "multiplier": mult[q],
            "partial": q == "2026Q2",
        }
        for q in QUARTERS
    ],
}
Path("chart_data.json").write_text(json.dumps(out, indent=2))
print(f"\nWrote chart_data.json")
