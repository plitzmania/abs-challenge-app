#!/usr/bin/env node

import {
  COUNTS,
  DEFAULT_CONFIG,
  SavantClient,
  evaluateRecommendation,
} from "../app/model.mjs";

const DEFAULT_GRID = {
  innings: [1, 3, 5, 7, 8, 9],
  halves: ["Top", "Bottom"],
  outs: [0, 1, 2],
  bases: [0, 1, 2, 3, 4, 7],
  runDiffs: [-4, -2, -1, 0, 1, 2, 4],
};

const DEFAULT_OPTS = {
  roles: ["batter", "catcher"],
  inventories: [1, 2],
  candidateRatePerTeamOut: {
    batter: 0.424,
    catcher: 0.455,
  },
  futureOutShare: 0.5,
  futureSuccessRate: {
    batter: null,
    catcher: null,
  },
  inventoryPremium: {
    2: 1,
    1: 2,
  },
  averageFutureWp: [
    { max: 0.10, label: "0-10%", value: null },
    { max: 0.30, label: "10-30%", value: null },
    { max: 0.70, label: "30-70%", value: null },
    { max: 0.90, label: "70-90%", value: null },
    { max: 1.00, label: "90-100%", value: null },
  ],
  grid: DEFAULT_GRID,
  wpMin: null,
  wpMax: null,
  json: false,
};

const LEVEL_ORDER = ["No-Brainers", "Full Count", "Deep Count", "Aggressive"];

function parseArgs(argv) {
  const opts = structuredClone(DEFAULT_OPTS);
  for (const arg of argv) {
    if (arg === "--json") {
      opts.json = true;
    } else if (arg.startsWith("--roles=")) {
      opts.roles = parseStringList(arg);
    } else if (arg.startsWith("--inventories=")) {
      opts.inventories = parseList(arg);
    } else if (arg.startsWith("--innings=")) {
      opts.grid.innings = parseList(arg);
    } else if (arg.startsWith("--halves=")) {
      opts.grid.halves = parseStringList(arg);
    } else if (arg.startsWith("--outs=")) {
      opts.grid.outs = parseList(arg);
    } else if (arg.startsWith("--bases=")) {
      opts.grid.bases = parseList(arg);
    } else if (arg.startsWith("--diffs=")) {
      opts.grid.runDiffs = parseList(arg);
    } else if (arg.startsWith("--candidate-rate-batter=")) {
      opts.candidateRatePerTeamOut.batter = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--candidate-rate-catcher=")) {
      opts.candidateRatePerTeamOut.catcher = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--future-out-share=")) {
      opts.futureOutShare = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--future-success-batter=")) {
      opts.futureSuccessRate.batter = parseProbability(arg.split("=")[1]);
    } else if (arg.startsWith("--future-success-catcher=")) {
      opts.futureSuccessRate.catcher = parseProbability(arg.split("=")[1]);
    } else if (arg.startsWith("--inventory-premium-2=")) {
      opts.inventoryPremium[2] = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--inventory-premium-1=")) {
      opts.inventoryPremium[1] = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--future-wp-values=")) {
      const values = parseList(arg).map((value) => (value > 1 ? value / 100 : value));
      opts.averageFutureWp = opts.averageFutureWp.map((row, index) => ({
        ...row,
        value: values[index] ?? row.value,
      }));
    } else if (arg.startsWith("--wp-min=")) {
      opts.wpMin = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--wp-max=")) {
      opts.wpMax = Number(arg.split("=")[1]);
    }
  }
  return opts;
}

function parseList(arg) {
  return arg
    .split("=")[1]
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
}

function parseStringList(arg) {
  return arg
    .split("=")[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseProbability(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return numeric;
  return numeric > 1 ? numeric / 100 : numeric;
}

function countKey(count) {
  return `${count.balls}-${count.strikes}`;
}

function isPlayableState(state) {
  if (Math.abs(state.runDiff) > 5) return false;
  if (state.half === "Bottom" && state.inning >= 9 && state.runDiff > 0) return false;
  if (state.half === "Top" && state.inning >= 10 && state.runDiff < 0) return false;
  return true;
}

function nextInningValue(inning) {
  return Math.min(inning + 1, 10);
}

function applyBall(state, count) {
  if (count.balls < 3) {
    return {
      sameBattingTeam: true,
      state,
      count: { balls: count.balls + 1, strikes: count.strikes },
    };
  }

  const walk = applyWalk(state);
  if (walk.gameOverValue != null) return walk;

  return {
    sameBattingTeam: true,
    state: walk.state,
    count: { balls: 0, strikes: 0 },
  };
}

function applyStrike(state, count) {
  if (count.strikes < 2) {
    return {
      sameBattingTeam: true,
      state,
      count: { balls: count.balls, strikes: count.strikes + 1 },
    };
  }

  if (state.outs < 2) {
    return {
      sameBattingTeam: true,
      state: { ...state, outs: state.outs + 1 },
      count: { balls: 0, strikes: 0 },
    };
  }

  return applyThirdOut(state);
}

function applyWalk(state) {
  const first = (state.bases & 1) !== 0;
  const second = (state.bases & 2) !== 0;
  const third = (state.bases & 4) !== 0;
  let runsScored = 0;

  let nextFirst = true;
  let nextSecond = second;
  let nextThird = third;

  if (first) {
    nextSecond = true;
    if (second) {
      nextThird = true;
      if (third) runsScored = 1;
    }
  }

  const nextRunDiff = state.runDiff + runsScored;
  const nextBases = (nextFirst ? 1 : 0) + (nextSecond ? 2 : 0) + (nextThird ? 4 : 0);

  if (state.half === "Bottom" && state.inning >= 9 && nextRunDiff > 0) {
    return { gameOverValue: 1 };
  }

  return {
    state: {
      ...state,
      bases: nextBases,
      runDiff: nextRunDiff,
    },
  };
}

function applyThirdOut(state) {
  if (state.half === "Top") {
    if (state.inning >= 9 && state.runDiff < 0) return { gameOverValue: 0 };
    return {
      sameBattingTeam: false,
      state: {
        inning: state.inning,
        half: "Bottom",
        outs: 0,
        bases: 0,
        runDiff: -state.runDiff,
      },
      count: { balls: 0, strikes: 0 },
    };
  }

  if (state.inning >= 9 && state.runDiff < 0) return { gameOverValue: 0 };

  return {
    sameBattingTeam: false,
    state: {
      inning: nextInningValue(state.inning),
      half: "Top",
      outs: 0,
      bases: 0,
      runDiff: -state.runDiff,
    },
    count: { balls: 0, strikes: 0 },
  };
}

function* generateStates(grid) {
  for (const inning of grid.innings) {
    for (const half of grid.halves) {
      for (const outs of grid.outs) {
        for (const bases of grid.bases) {
          for (const runDiff of grid.runDiffs) {
            const state = { inning, half, outs, bases, runDiff };
            if (isPlayableState(state)) yield state;
          }
        }
      }
    }
  }
}

function totalOutsElapsed(state) {
  const completedInnings = Math.max(0, state.inning - 1);
  const halfOffset = state.half === "Bottom" ? 3 : 0;
  return Math.min(54, (completedInnings * 6) + halfOffset + state.outs);
}

function regulationOutsRemaining(state) {
  return Math.max(0, 54 - totalOutsElapsed(state));
}

function teamRunDiffAfterOutcome(role, originalState, outcome) {
  if (!outcome.state) return originalState.runDiff;

  const battingTeamIsOriginal = outcome.sameBattingTeam !== false;
  const originalBattingRunDiff = battingTeamIsOriginal
    ? outcome.state.runDiff
    : -outcome.state.runDiff;

  return role === "batter" ? originalBattingRunDiff : -originalBattingRunDiff;
}

function futureSuccessRate(opts, role) {
  return opts.futureSuccessRate[role] ?? DEFAULT_CONFIG.successRates[role];
}

function avgFutureOverturnWpa(opts, teamWp) {
  const bucket = opts.averageFutureWp.find((row) => teamWp <= row.max)
    ?? opts.averageFutureWp.at(-1);
  return bucket?.value ?? 0;
}

function poissonPmf(lambda, max = 60) {
  const probabilities = [];
  let p = Math.exp(-lambda);
  probabilities[0] = p;

  for (let n = 1; n <= max; n += 1) {
    p *= lambda / n;
    probabilities[n] = p;
  }

  return probabilities;
}

function expectedMissedForFixedOpportunities(opportunities, inventory, futureSuccessRate) {
  if (inventory <= 0) return opportunities;

  let dp = Array.from({ length: inventory + 1 }, () => 0);
  dp[inventory] = 1;
  let missed = 0;

  for (let i = 0; i < opportunities; i += 1) {
    const next = Array.from({ length: inventory + 1 }, () => 0);
    for (let inv = 0; inv <= inventory; inv += 1) {
      const probability = dp[inv];
      if (!probability) continue;

      if (inv === 0) {
        missed += probability;
        next[0] += probability;
      } else {
        next[inv] += probability * futureSuccessRate;
        next[inv - 1] += probability * (1 - futureSuccessRate);
      }
    }
    dp = next;
  }

  return missed;
}

function expectedMissedFutureOpportunities(lambda, inventory, futureSuccessRate) {
  return poissonPmf(lambda).reduce(
    (sum, probability, opportunities) => (
      sum + (probability * expectedMissedForFixedOpportunities(
        opportunities,
        inventory,
        futureSuccessRate,
      ))
    ),
    0,
  );
}

function depletionChallengeCost(opts, role, inventory, state, count, startTeamWp) {
  const ballOutcome = applyBall(state, count);
  const strikeOutcome = applyStrike(state, count);
  const failedOutcome = role === "batter" ? strikeOutcome : ballOutcome;

  if (failedOutcome.gameOverValue != null) return 0;
  if (!failedOutcome.state) return null;

  const futureTeamOuts = regulationOutsRemaining(failedOutcome.state) * opts.futureOutShare;
  const lambda = futureTeamOuts * opts.candidateRatePerTeamOut[role];
  const p = futureSuccessRate(opts, role);
  const missAfterFailure = expectedMissedFutureOpportunities(
    lambda,
    Math.max(0, inventory - 1),
    p,
  );
  const missWithoutFailure = expectedMissedFutureOpportunities(
    lambda,
    inventory,
    p,
  );
  const extraMissedOpportunities = Math.max(0, missAfterFailure - missWithoutFailure);
  const futureOverturnWpa = avgFutureOverturnWpa(opts, startTeamWp);

  return extraMissedOpportunities * p * futureOverturnWpa * (opts.inventoryPremium[inventory] ?? 1);
}

function summarize(values) {
  const sorted = values
    .filter((value) => value != null && Number.isFinite(value))
    .sort((a, b) => a - b);

  const q = (p) => {
    if (!sorted.length) return null;
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower));
  };

  return {
    n: sorted.length,
    median: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
    mean: sorted.length
      ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length
      : null,
  };
}

function levelRows(rows, level) {
  if (level === "full_count") return rows.filter((row) => row.category === "full_count");
  if (level === "deep_count") {
    return rows.filter((row) => row.category === "full_count" || row.category === "deep_count");
  }
  if (level === "open") return rows;
  return [];
}

function bucketStats(rows) {
  if (!rows.length) {
    return { n: 0, positiveRate: null, medianEv: null };
  }

  return {
    n: rows.length,
    positiveRate: rows.filter((row) => row.positive).length / rows.length,
    medianEv: summarize(rows.map((row) => row.ev)).median,
  };
}

function recommendLevel(rows, config = DEFAULT_CONFIG) {
  const full = bucketStats(levelRows(rows, "full_count"));
  const deep = bucketStats(levelRows(rows, "deep_count"));
  const open = bucketStats(levelRows(rows, "open"));

  let level = "No-Brainers";
  if (full.n && full.medianEv >= config.thresholds.fullCount.medianExpectedValueMin) {
    level = "Full Count";
  }
  if (
    deep.n
    && deep.medianEv >= config.thresholds.deepCount.medianExpectedValueMin
    && deep.positiveRate >= config.thresholds.deepCount.positiveRateMin
  ) {
    level = "Deep Count";
  }
  if (
    open.n
    && open.medianEv >= config.thresholds.open.medianExpectedValueMin
    && open.positiveRate >= config.thresholds.open.positiveRateMin
  ) {
    level = "Aggressive";
  }

  return { level, buckets: { full, deep, open } };
}

function countToObject(key) {
  const [balls, strikes] = key.split("-").map(Number);
  return { balls, strikes };
}

function pp(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(2)} pp`;
}

function pct(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function levelDelta(oldLevel, newLevel) {
  return LEVEL_ORDER.indexOf(newLevel) - LEVEL_ORDER.indexOf(oldLevel);
}

function basesLabel(bases) {
  if (bases === 0) return "empty";
  if (bases === 7) return "loaded";
  const labels = [];
  if (bases & 1) labels.push("1B");
  if (bases & 2) labels.push("2B");
  if (bases & 4) labels.push("3B");
  return labels.join("+");
}

function stateLabel(state) {
  return `${state.half}${state.inning} ${state.runDiff >= 0 ? "+" : ""}${state.runDiff} ${state.outs} out ${basesLabel(state.bases)}`;
}

function withinWpFilter(value, opts) {
  if (opts.wpMin != null && value < opts.wpMin) return false;
  if (opts.wpMax != null && value > opts.wpMax) return false;
  return true;
}

async function deriveAverageFutureWp(client, opts) {
  const valuesByBucket = opts.averageFutureWp.map((bucket) => ({ ...bucket, values: [] }));

  for (const state of generateStates(opts.grid)) {
    for (const role of opts.roles) {
      try {
        const result = await evaluateRecommendation(client, {
          role,
          inventory: 2,
          state,
          config: DEFAULT_CONFIG,
        });
        const bucket = valuesByBucket.find((row) => result.startTeamWp <= row.max)
          ?? valuesByBucket.at(-1);
        for (const row of result.rows) {
          bucket.values.push(row.v);
        }
      } catch (error) {
        if (!String(error?.message ?? "").includes("No win expectancy data")) {
          throw error;
        }
      }
    }
  }

  return valuesByBucket.map((bucket) => {
    const derived = summarize(bucket.values).median;
    return {
      max: bucket.max,
      label: bucket.label,
      value: bucket.value ?? derived ?? 0,
      n: bucket.values.length,
      source: bucket.value == null ? "derived median V from sampled Savant states" : "override",
    };
  });
}

async function compareScenario(client, opts, state, role, inventory) {
  const oldResult = await evaluateRecommendation(client, {
    role,
    inventory,
    state,
    config: DEFAULT_CONFIG,
  });

  const depletionRows = oldResult.rows.map((row) => {
    const count = countToObject(row.count);
    const c = depletionChallengeCost(opts, role, inventory, state, count, oldResult.startTeamWp);
    const ev = row.p * row.v - ((1 - row.p) * c);
    return {
      ...row,
      c,
      ev,
      requiredP: row.v + c === 0 ? 0 : c / (row.v + c),
      positive: ev > 0,
    };
  });

  const depletionRecommendation = recommendLevel(depletionRows);

  return {
    role,
    inventory,
    state,
    startTeamWp: oldResult.startTeamWp,
    oldLevel: oldResult.recommendation.level,
    depletionLevel: depletionRecommendation.level,
    delta: levelDelta(oldResult.recommendation.level, depletionRecommendation.level),
    rows: oldResult.rows.map((row, index) => ({
      count: row.count,
      category: row.category,
      v: row.v,
      oldC: row.c,
      depletionC: depletionRows[index].c,
      oldEv: row.ev,
      depletionEv: depletionRows[index].ev,
      oldPositive: row.positive,
      depletionPositive: depletionRows[index].positive,
    })),
    oldBuckets: oldResult.recommendation.buckets,
    depletionBuckets: depletionRecommendation.buckets,
  };
}

async function collectComparisons(opts) {
  const client = new SavantClient();
  const comparisons = [];
  opts.averageFutureWp = await deriveAverageFutureWp(client, opts);

  for (const state of generateStates(opts.grid)) {
    for (const role of opts.roles) {
      for (const inventory of opts.inventories) {
        try {
          const comparison = await compareScenario(client, opts, state, role, inventory);
          if (withinWpFilter(comparison.startTeamWp, opts)) {
            comparisons.push(comparison);
          }
        } catch (error) {
          if (!String(error?.message ?? "").includes("No win expectancy data")) {
            throw error;
          }
        }
      }
    }
  }

  return { client, comparisons };
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

function flattenRows(comparisons) {
  return comparisons.flatMap((comparison) => comparison.rows.map((row) => ({
    ...row,
    role: comparison.role,
    inventory: comparison.inventory,
    state: comparison.state,
    startTeamWp: comparison.startTeamWp,
  })));
}

function printSummary({ client, comparisons }, opts) {
  const rows = flattenRows(comparisons);
  const moved = comparisons.filter((comparison) => comparison.delta !== 0);
  const moreAggressive = comparisons.filter((comparison) => comparison.delta > 0);
  const lessAggressive = comparisons.filter((comparison) => comparison.delta < 0);
  const oldCosts = summarize(rows.map((row) => row.oldC));
  const depletionCosts = summarize(rows.map((row) => row.depletionC));
  const costRatios = summarize(rows.map((row) => (
    row.oldC > 0 ? row.depletionC / row.oldC : null
  )));

  console.log("ABS challenge C model comparison");
  console.log(`Savant requests: ${client.requests}`);
  console.log(`Scenarios: ${comparisons.length}`);
  console.log(`Pitch rows: ${rows.length}`);
  if (opts.wpMin != null || opts.wpMax != null) {
    console.log(`Start team WP filter: ${opts.wpMin ?? "-inf"} to ${opts.wpMax ?? "+inf"}`);
  }
  console.log("");
  console.log("V1.5 depletion defaults");
  console.log(`shadow-zone candidate rate per team out: batter ${opts.candidateRatePerTeamOut.batter}, catcher ${opts.candidateRatePerTeamOut.catcher}`);
  console.log(`future out share: ${opts.futureOutShare}`);
  console.log(`future success rate: batter ${pct(futureSuccessRate(opts, "batter"))}, catcher ${pct(futureSuccessRate(opts, "catcher"))}`);
  console.log(`inventory premium: 2 left ${opts.inventoryPremium[2]}, 1 left ${opts.inventoryPremium[1]}`);
  console.log("average future WP value by current team WP bucket:");
  for (const bucket of opts.averageFutureWp) {
    console.log(`  ${bucket.label}: ${pp(bucket.value)} (${bucket.n} sampled count rows, ${bucket.source})`);
  }
  console.log("");
  console.log("Cost comparison");
  console.log(`old C median / p75 / p90: ${pp(oldCosts.median)} / ${pp(oldCosts.p75)} / ${pp(oldCosts.p90)}`);
  console.log(`v1.5 C median / p75 / p90: ${pp(depletionCosts.median)} / ${pp(depletionCosts.p75)} / ${pp(depletionCosts.p90)}`);
  console.log(`v1.5-to-v1 C ratio median / p75 / p90: ${costRatios.median?.toFixed(2) ?? "n/a"} / ${costRatios.p75?.toFixed(2) ?? "n/a"} / ${costRatios.p90?.toFixed(2) ?? "n/a"}`);
  console.log("");
  console.log("Recommendation movement");
  console.log(`changed: ${moved.length}/${comparisons.length} (${pct(moved.length / comparisons.length)})`);
  console.log(`more aggressive: ${moreAggressive.length}/${comparisons.length} (${pct(moreAggressive.length / comparisons.length)})`);
  console.log(`less aggressive: ${lessAggressive.length}/${comparisons.length} (${pct(lessAggressive.length / comparisons.length)})`);

  console.log("");
  console.log("Movement by role / inventory");
  console.log("role,inventory,scenarios,changed,more aggressive,less aggressive,old C median,depletion C median");
  const byRoleInventory = groupBy(comparisons, (row) => `${row.role}|${row.inventory}`);
  for (const [key, group] of [...byRoleInventory.entries()].sort()) {
    const [role, inventory] = key.split("|");
    const groupRows = flattenRows(group);
    console.log([
      role,
      inventory,
      group.length,
      group.filter((row) => row.delta !== 0).length,
      group.filter((row) => row.delta > 0).length,
      group.filter((row) => row.delta < 0).length,
      pp(summarize(groupRows.map((row) => row.oldC)).median),
      pp(summarize(groupRows.map((row) => row.depletionC)).median),
    ].join(","));
  }

  console.log("");
  console.log("Largest recommendation changes");
  console.log("role,inventory,state,start WP,old,new,old median C,new median C,old aggressive +EV%,new aggressive +EV%");
  const examples = [...moved]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.startTeamWp - a.startTeamWp)
    .slice(0, 18);
  for (const comparison of examples) {
    console.log([
      comparison.role,
      comparison.inventory,
      stateLabel(comparison.state),
      pct(comparison.startTeamWp),
      comparison.oldLevel,
      comparison.depletionLevel,
      pp(summarize(comparison.rows.map((row) => row.oldC)).median),
      pp(summarize(comparison.rows.map((row) => row.depletionC)).median),
      pct(comparison.oldBuckets.open.positiveRate),
      pct(comparison.depletionBuckets.open.positiveRate),
    ].join(","));
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = await collectComparisons(opts);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printSummary(result, opts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
