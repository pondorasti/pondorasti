#!/usr/bin/env python3
"""Render the personal code-contributed chart in Anthropic's visual style."""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager

# Register Charter (Anthropic's body font is a transitional serif similar to it)
for ttc in ["/System/Library/Fonts/Supplemental/Charter.ttc"]:
    if Path(ttc).exists():
        font_manager.fontManager.addfont(ttc)

import sys
src = sys.argv[1] if len(sys.argv) > 1 else "chart_data_commits.json"
DATA = json.loads(Path(src).read_text())
quarters = DATA["quarters"]

# Anthropic palette (sampled from the screenshot)
BG = "#F4EFE6"        # cream card background
PAGE_BG = "#F4EFE6"   # page also cream
BAR = "#D2754E"       # orange-brown bars
BAR_DARK = "#B8633F"  # slightly darker for label text
GRID = "#E2D9C8"      # very faint horizontal grid
AXIS_TEXT = "#4A4338" # dark warm gray
ANNOT = "#8B7E6B"     # muted warm gray for dashed lines/annotations

fig, ax = plt.subplots(figsize=(15.5, 8.5), dpi=180)
fig.patch.set_facecolor(PAGE_BG)
ax.set_facecolor(BG)

# X positions
n = len(quarters)
x = list(range(n))
mults = [q["multiplier"] for q in quarters]

# Bars — last one (partial Q2 2026) gets diagonal hatch
for i, q in enumerate(quarters):
    is_partial = q["partial"]
    if is_partial:
        ax.bar(i, q["multiplier"], width=0.72,
               facecolor="none", edgecolor=BAR, linewidth=1.4,
               hatch="////", zorder=3)
        # hatch color
    else:
        ax.bar(i, q["multiplier"], width=0.72,
               facecolor=BAR, edgecolor="none", zorder=3)

# Match Anthropic: set hatch color via rcParams (workaround — hatch uses edge color)
# Already done above with edgecolor=BAR for the partial bar

# Value labels above bars
for i, q in enumerate(quarters):
    m = q["multiplier"]
    label = f"{m:.1f}×"
    ax.text(i, m + 0.18, label, ha="center", va="bottom",
            color=BAR_DARK, fontsize=11, fontweight="bold",
            family="Charter", zorder=5)

# Y axis
y_max = max(mults) * 1.15
y_max = max(y_max, 11)  # at least match original scale
ax.set_ylim(0, y_max)
ax.set_yticks(range(0, int(y_max) + 1))
ax.set_yticklabels([f"{i}×" for i in range(0, int(y_max) + 1)],
                   fontsize=10, color=AXIS_TEXT, family="Charter")
ax.tick_params(axis="y", length=0, pad=8)

# Grid (horizontal only)
ax.yaxis.grid(True, color=GRID, linewidth=0.8, zorder=1)
ax.xaxis.grid(False)
ax.set_axisbelow(True)

# Remove spines
for s in ["top", "right", "left", "bottom"]:
    ax.spines[s].set_visible(False)

# X axis labels — quarters, with year grouping below
ax.set_xticks(x)
xlabels = []
for q in quarters:
    qnum = q["quarter"][-2:]  # "Q1" etc.
    xlabels.append(qnum)
ax.set_xticklabels(xlabels, fontsize=9.5, color=AXIS_TEXT, family="Charter")
ax.tick_params(axis="x", length=0, pad=4)

# Year labels under Q1 (or first quarter shown for 2021)
year_positions: dict[int, int] = {}
for i, q in enumerate(quarters):
    y_int = int(q["quarter"][:4])
    if y_int not in year_positions:
        year_positions[y_int] = i
    # else: skip; we want first occurrence (Q1 typically, or Q2 for 2021)
# Anthropic places years aligned with Q1 — but for 2021 they align under Q2 since chart starts there
for yr, pos in year_positions.items():
    ax.text(pos, -y_max * 0.07, str(yr), ha="left" if yr == 2021 else "left",
            va="top", fontsize=10.5, color=AXIS_TEXT, family="Charter")

ax.set_xlim(-0.7, n - 0.3)

# Title — suppressed; rendered as <h1> in the embedding HTML
# ax.set_title("Code contributed by pondorasti, by quarter", ...)

# "average before 2025" annotation pointing at 1.0× line
# Find a quiet spot — somewhere over 2024Q1
pre25_idx = [i for i, q in enumerate(quarters) if int(q["quarter"][:4]) < 2025]
annot_x = pre25_idx[-1] - 1.5
ax.annotate(
    "average before 2025",
    xy=(annot_x + 1.2, 1.0), xycoords="data",
    xytext=(annot_x - 1.8, 1.65), textcoords="data",
    fontsize=9.5, color=AXIS_TEXT, family="Charter",
    arrowprops=dict(arrowstyle="-", color=ANNOT, lw=0.8),
    ha="left",
)
# Horizontal line at 1.0 over the pre-2025 range (subtle)
ax.plot([pre25_idx[0] - 0.4, pre25_idx[-1] + 0.4], [1.0, 1.0],
        color=ANNOT, linestyle=(0, (4, 3)), linewidth=0.9, zorder=2)

# Claude release markers — vertical dashed lines with labels at top
# Positions chosen to match the announcement dates inside the corresponding quarter
RELEASES = [
    # (quarter_label, x_offset_within_bar [-0.5..0.5], top_label, sub_label)
    ("2023Q1", 0.40, "Claude 1\nrelease", None),
    ("2023Q3", -0.20, "Claude 2", None),
    ("2024Q1", 0.20, "Claude 3", None),
    ("2025Q1", -0.20, "Claude\nCode", None),  # Feb 2025 research preview
    ("2025Q2", 0.20, "Claude 4", None),       # May 2025 (Q2)
    ("2025Q3", 0.30, "Claude\nSonnet\n4.5", None),
    ("2026Q1", -0.30, "Claude\nOpus\n4.5", None),
    ("2026Q1", 0.30, "Mythos\nPreview\n(internal\naccess)", None),
    ("2026Q2", 0.20, "Claude\nMythos\nPreview", None),
]
q_to_idx = {q["quarter"]: i for i, q in enumerate(quarters)}
top_y = y_max * 0.97
for q_label, offset, top, _ in RELEASES:
    if q_label not in q_to_idx:
        continue
    xp = q_to_idx[q_label] + offset
    ax.axvline(xp, ymin=0.02, ymax=0.95,
               color=ANNOT, linestyle=(0, (2.5, 2.5)),
               linewidth=0.7, zorder=2)
    ax.text(xp, top_y, top, ha="center", va="top",
            fontsize=8.5, color=AXIS_TEXT, family="Charter",
            linespacing=1.1)

# Footer caption
# Footer caption — suppressed; rendered as <figcaption> in the embedding HTML

plt.tight_layout(rect=[0.01, 0.02, 0.99, 0.99])

out_stem = Path(src).stem.replace("chart_data", "personal_code_contributed")
out_png = Path(f"{out_stem}.png")
out_svg = Path(f"{out_stem}.svg")
plt.savefig(out_png, facecolor=PAGE_BG, dpi=180, bbox_inches="tight")
plt.savefig(out_svg, facecolor=PAGE_BG, bbox_inches="tight")
print(f"Wrote {out_png} and {out_svg}")
