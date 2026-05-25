#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  DEFAULT_CONFIG,
  SavantClient,
  evaluateRecommendation,
} from "../app/model.mjs";

const OYSTER_URL = "https://oysteranalytics.com/api/challenge-data";
const DEFAULT_OYSTER_CSV = "/private/tmp/oyster_challenge.csv";
const DEFAULT_OUTPUT_CSV = "/private/tmp/oyster_vs_abs_challenge_desk.csv";

const COUNT_CATEGORY = {
  "3-2": "Full Count",
};

const SCORE_BUCKETS = new Map([
  ["Down 5+", -5],
  ["Down 4", -4],
  ["Down 3", -3],
  ["Down 2", -2],
  ["Down 1", -1],
  ["Tied", 0],
  ["Up 1", 1],
  ["Up 2", 2],
  ["Up 3", 3],
  ["Up 4", 4],
  ["Up 5+", 5],
]);

const DEFAULT_OPTS = {
  oysterCsv: DEFAULT_OYSTER_CSV,
  outputCsv: DEFAULT_OUTPUT_CSV,
  refreshOyster: false,
  roles: ["batter", "catcher"],
  maxRows: null,
};

function parseArgs(argv) {
  const opts = { ...DEFAULT_OPTS, roles: [...DEFAULT_OPTS.roles] };
  for (const arg of argv) {
    if (arg === "--refresh-oyster") {
      opts.refreshOyster = true;
    } else if (arg.startsWith("--oyster-csv=")) {
      opts.oysterCsv = arg.split("=")[1];
    } else if (arg.startsWith("--output-csv=")) {
      opts.outputCsv = arg.split("=")[1];
    } else if (arg.startsWith("--roles=")) {
      opts.roles = arg
        .split("=")[1]
        .split(",")
        .map((part) => part.trim())
        .filter((role) => role === "batter" || role === "catcher");
    } else if (arg.startsWith("--max-rows=")) {
      const value = Number(arg.split("=")[1]);
      opts.maxRows = Number.isFinite(value) ? value : null;
    }
  }
  return opts;
}

function parseCsv(str) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < str.length; i += 1) {
    const char = str[i];
    if (quoted) {
      if (char === "\"" && str[i + 1] === "\"") {
        field += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.length > 1 || entry[0] !== "");
}

function rowsFromCsv(str) {
  const rows = parseCsv(str);
  const header = rows[0].map((name) => name.replace(/^\uFEFF/, ""));
  return rows.slice(1).map((row) => Object.fromEntries(
    header.map((name, index) => [name, row[index] ?? ""]),
  ));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

async function loadOysterCsv(opts) {
  if (!opts.refreshOyster && existsSync(opts.oysterCsv)) {
    return readFileSync(opts.oysterCsv, "utf8");
  }

  const response = await fetch(OYSTER_URL);
  if (!response.ok) {
    throw new Error(`Oyster challenge data failed with ${response.status}`);
  }
  const text = await response.text();
  writeFileSync(opts.oysterCsv, text);
  return text;
}

function basesFromOyster(baseState) {
  const runners = baseState.slice(0, 3);
  return (runners[2] === "1" ? 1 : 0)
    + (runners[1] === "1" ? 2 : 0)
    + (runners[0] === "1" ? 4 : 0);
}

function outsFromOyster(baseState) {
  return Number(baseState.slice(3));
}

function countCategory(count) {
  if (COUNT_CATEGORY[count]) return COUNT_CATEGORY[count];
  const [balls, strikes] = count.split("-").map(Number);
  if (balls === 3 || strikes === 2) return "Deep Count";
  return "Aggressive";
}

function teamRunDiffFromOyster(row, role) {
  const teamDiff = SCORE_BUCKETS.get(row.score_diff_bucket);
  if (teamDiff == null) return null;
  return role === "batter" ? teamDiff : -teamDiff;
}

function isPlayableState(state) {
  if (!state) return false;
  if (Math.abs(state.runDiff) > 5) return false;
  if (state.half === "Bottom" && state.inning >= 9 && state.runDiff > 0) return false;
  if (state.half === "Top" && state.inning >= 10 && state.runDiff < 0) return false;
  return true;
}

function stateKey(role, inventory, state) {
  return [
    role,
    inventory,
    state.inning,
    state.half,
    state.outs,
    state.bases,
    state.runDiff,
  ].join("|");
}

function configForModel(model) {
  const config = structuredClone(DEFAULT_CONFIG);
  config.challengeCost.model = model;
  return config;
}

async function recommendationFor(cache, client, role, inventory, state, model) {
  const key = `${model}|${stateKey(role, inventory, state)}`;
  if (!cache.has(key)) {
    cache.set(key, evaluateRecommendation(client, {
      role,
      inventory,
      state,
      config: configForModel(model),
    }).catch((error) => ({ error })));
  }
  return cache.get(key);
}

function summarize(values) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const q = (p) => {
    if (!sorted.length) return null;
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower));
  };
  const mean = sorted.length
    ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length
    : null;
  return {
    n: sorted.length,
    mean,
    median: q(0.5),
    p25: q(0.25),
    p75: q(0.75),
    p90: q(0.9),
  };
}

function formatPct(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatPp(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(digits)} pp`;
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function comparisonSummary(rows, modelKey) {
  const diffKey = `${modelKey}MinusOyster`;
  const absKey = `${modelKey}AbsDiff`;
  const oysterDefault = rows.filter((row) => row.oysterDefaultPositive).length;
  const modelDefault = rows.filter((row) => row[`${modelKey}DefaultPositive`]).length;
  const agreement = rows.filter((row) => row.oysterDefaultPositive === row[`${modelKey}DefaultPositive`]).length;
  return {
    rows: rows.length,
    oysterDefault,
    modelDefault,
    agreement,
    bias: summarize(rows.map((row) => row[diffKey])).mean,
    medianDiff: summarize(rows.map((row) => row[diffKey])).median,
    meanAbsDiff: summarize(rows.map((row) => row[absKey])).mean,
    medianAbsDiff: summarize(rows.map((row) => row[absKey])).median,
    p75AbsDiff: summarize(rows.map((row) => row[absKey])).p75,
  };
}

function printComparisonSummary(label, rows, modelKey) {
  const summary = comparisonSummary(rows, modelKey);
  console.log([
    label,
    summary.rows,
    `${summary.oysterDefault}/${summary.rows} (${formatPct(summary.oysterDefault / summary.rows)})`,
    `${summary.modelDefault}/${summary.rows} (${formatPct(summary.modelDefault / summary.rows)})`,
    `${summary.agreement}/${summary.rows} (${formatPct(summary.agreement / summary.rows)})`,
    formatPp(summary.bias),
    formatPp(summary.medianDiff),
    formatPp(summary.meanAbsDiff),
    formatPp(summary.medianAbsDiff),
    formatPp(summary.p75AbsDiff),
  ].join(","));
}

function printSection(title, rows, modelKey, keyFn) {
  console.log("");
  console.log(title);
  console.log("group,rows,oyster clears default,model clears default,agreement,bias,median diff,mean abs diff,median abs diff,p75 abs diff");
  for (const [key, group] of [...groupBy(rows, keyFn).entries()].sort()) {
    printComparisonSummary(key, group, modelKey);
  }
}

function writeComparisonCsv(rows, outputCsv) {
  const header = [
    "role",
    "inning",
    "half",
    "score_diff_bucket",
    "team_run_diff",
    "outs",
    "bases",
    "count",
    "count_category",
    "challenges",
    "oyster_break_even",
    "v1_break_even",
    "v15_break_even",
    "v1_minus_oyster",
    "v15_minus_oyster",
    "role_default_p",
    "oyster_default_positive",
    "v1_default_positive",
    "v15_default_positive",
    "n_pitches",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(",")),
  ];
  writeFileSync(outputCsv, `${lines.join("\n")}\n`);
}

async function buildComparisons(opts) {
  const oysterText = await loadOysterCsv(opts);
  const oysterRows = rowsFromCsv(oysterText)
    .filter((row) => SCORE_BUCKETS.has(row.score_diff_bucket))
    .slice(0, opts.maxRows ?? undefined);
  const client = new SavantClient();
  const cache = new Map();
  const comparisons = [];
  const skipped = {
    invalidState: 0,
    noModelRow: 0,
    modelError: 0,
  };

  for (const oysterRow of oysterRows) {
    const inventory = Number(oysterRow.challenges);
    const inning = Number(oysterRow.inning_bucket);
    const half = oysterRow.inning_topbot === "Bot" ? "Bottom" : "Top";
    const bases = basesFromOyster(oysterRow.base_state_before);
    const outs = outsFromOyster(oysterRow.base_state_before);
    const oysterBreakEven = Number(oysterRow.break_even);

    for (const role of opts.roles) {
      const teamRunDiff = SCORE_BUCKETS.get(oysterRow.score_diff_bucket);
      const runDiff = teamRunDiffFromOyster(oysterRow, role);
      const state = { inning, half, outs, bases, runDiff };
      if (!isPlayableState(state)) {
        skipped.invalidState += 1;
        continue;
      }

      const [v1Result, v15Result] = await Promise.all([
        recommendationFor(cache, client, role, inventory, state, "v1"),
        recommendationFor(cache, client, role, inventory, state, "depletionV15"),
      ]);
      if (v1Result.error || v15Result.error) {
        skipped.modelError += 1;
        continue;
      }

      const v1Row = v1Result.rows.find((row) => row.count === oysterRow.count_state);
      const v15Row = v15Result.rows.find((row) => row.count === oysterRow.count_state);
      if (!v1Row || !v15Row) {
        skipped.noModelRow += 1;
        continue;
      }

      const roleDefaultP = DEFAULT_CONFIG.successRates[role];
      const v1BreakEven = v1Row.requiredP;
      const v15BreakEven = v15Row.requiredP;
      const v1MinusOyster = v1BreakEven - oysterBreakEven;
      const v15MinusOyster = v15BreakEven - oysterBreakEven;
      comparisons.push({
        role,
        inning,
        half,
        score_diff_bucket: oysterRow.score_diff_bucket,
        team_run_diff: teamRunDiff,
        outs,
        bases,
        count: oysterRow.count_state,
        count_category: countCategory(oysterRow.count_state),
        challenges: inventory,
        oyster_break_even: oysterBreakEven,
        v1_break_even: v1BreakEven,
        v15_break_even: v15BreakEven,
        v1_minus_oyster: v1MinusOyster,
        v15_minus_oyster: v15MinusOyster,
        v1MinusOyster,
        v15MinusOyster,
        v1AbsDiff: Math.abs(v1MinusOyster),
        v15AbsDiff: Math.abs(v15MinusOyster),
        role_default_p: roleDefaultP,
        oyster_default_positive: roleDefaultP >= oysterBreakEven,
        v1_default_positive: roleDefaultP >= v1BreakEven,
        v15_default_positive: roleDefaultP >= v15BreakEven,
        oysterDefaultPositive: roleDefaultP >= oysterBreakEven,
        v1DefaultPositive: roleDefaultP >= v1BreakEven,
        v15DefaultPositive: roleDefaultP >= v15BreakEven,
        n_pitches: Number(oysterRow.n_pitches),
      });
    }
  }

  return { client, comparisons, skipped, oysterRows: oysterRows.length };
}

function printFirstBatter(comparisons) {
  const rows = comparisons
    .filter((row) => (
      row.inning === 1
      && row.half === "Top"
      && row.score_diff_bucket === "Tied"
      && row.outs === 0
      && row.bases === 0
      && row.count === "3-2"
    ))
    .sort((a, b) => a.role.localeCompare(b.role) || b.challenges - a.challenges);
  console.log("");
  console.log("First-batter full-count sanity check");
  console.log("role,challenges,oyster BE,v1 BE,v1.5 BE,role default p,oyster clears,v1 clears,v1.5 clears");
  for (const row of rows) {
    console.log([
      row.role,
      row.challenges,
      formatPct(row.oyster_break_even),
      formatPct(row.v1_break_even),
      formatPct(row.v15_break_even),
      formatPct(row.role_default_p),
      row.oyster_default_positive,
      row.v1_default_positive,
      row.v15_default_positive,
    ].join(","));
  }
}

function printSummary(result, opts) {
  const { client, comparisons, skipped, oysterRows } = result;
  console.log("Oyster vs ABS Challenge Desk break-even comparison");
  console.log(`Oyster rows loaded: ${oysterRows}`);
  console.log(`Matched model rows: ${comparisons.length}`);
  console.log(`Savant requests: ${client.requests}`);
  console.log(`Skipped invalid states: ${skipped.invalidState}`);
  console.log(`Skipped no model row: ${skipped.noModelRow}`);
  console.log(`Skipped model errors: ${skipped.modelError}`);
  console.log(`Output CSV: ${opts.outputCsv}`);
  console.log("");
  console.log("Overall");
  console.log("model,rows,oyster clears default,model clears default,agreement,bias,median diff,mean abs diff,median abs diff,p75 abs diff");
  printComparisonSummary("v1", comparisons, "v1");
  printComparisonSummary("v1.5", comparisons, "v15");

  printSection("By Role, v1.5", comparisons, "v15", (row) => row.role);
  printSection("By Challenges Left, v1.5", comparisons, "v15", (row) => `${row.challenges} left`);
  printSection("By Count Category, v1.5", comparisons, "v15", (row) => row.count_category);
  printSection("By Role / Challenges, v1.5", comparisons, "v15", (row) => `${row.role}, ${row.challenges} left`);
  printFirstBatter(comparisons);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = await buildComparisons(opts);
  writeComparisonCsv(result.comparisons, opts.outputCsv);
  printSummary(result, opts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
