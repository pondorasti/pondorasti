// Rebuilds data.js from ccusage output. Run via ./refresh.sh or:
//   bunx ccusage daily --json > /tmp/ccusage-daily.json
//   bunx ccusage monthly --json > /tmp/ccusage-monthly.json
//   bun build-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const daily = JSON.parse(readFileSync("/tmp/ccusage-daily.json", "utf8")).daily;
const monthly = JSON.parse(readFileSync("/tmp/ccusage-monthly.json", "utf8")).monthly;

const fam = (m) => {
  if (m.startsWith("gpt-5.5")) return "gpt-5.5";
  if (m.startsWith("gpt-5.4")) return "gpt-5.4";
  if (m.includes("codex")) return "gpt-codex";
  if (m.includes("fable")) return "claude-fable";
  if (m.includes("opus")) return "claude-opus";
  return "other";
};

const compact = (x) => {
  const fams = {};
  const models = {};
  for (const b of x.modelBreakdowns) {
    const f = fam(b.modelName);
    fams[f] = (fams[f] || 0) + b.cost;
    const t = b.inputTokens + b.outputTokens + b.cacheCreationTokens + b.cacheReadTokens;
    if (!models[b.modelName]) models[b.modelName] = { c: 0, t: 0 };
    models[b.modelName].c += b.cost;
    models[b.modelName].t += t;
  }
  return {
    d: x.period, c: +x.totalCost.toFixed(4), t: x.totalTokens,
    in: x.inputTokens, out: x.outputTokens, cc: x.cacheCreationTokens, cr: x.cacheReadTokens,
    f: Object.fromEntries(Object.entries(fams).map(([k, v]) => [k, +v.toFixed(4)])),
    m: Object.fromEntries(Object.entries(models).map(([k, v]) => [k, [+v.c.toFixed(4), v.t]])),
    a: x.metadata?.agents ?? [],
  };
};

const out = {
  generated: new Date().toISOString().slice(0, 10),
  days: daily.map(compact),
  months: monthly.map(compact),
};
writeFileSync(join(here, "data.js"), "window.USAGE = " + JSON.stringify(out) + ";\n");
console.log(`wrote data.js — ${out.days.length} days through ${out.days.at(-1).d}`);
