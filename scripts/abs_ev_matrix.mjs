#!/usr/bin/env node

const ENDPOINT = "https://baseballsavant.mlb.com/game-strategy-explorer";

const COUNTS = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
  [3, 0],
  [3, 1],
  [3, 2],
];

const DEFAULT_GRID = {
  innings: [1, 5, 8, 9],
  halves: ["Top", "Bottom"],
  outs: [0, 1, 2],
  bases: [0, 1, 2, 3, 4, 7],
  runDiffs: [-2, -1, 0, 1, 2],
};

const DEFAULTS = {
  cBase: 0.055,
  batterP: 0.47,
  catcherP: 0.59,
  inventories: [1, 2],
  roles: ["batter", "catcher"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const opts = {
    delayMs: 25,
    json: false,
    grid: DEFAULT_GRID,
    roles: DEFAULTS.roles,
    inventories: DEFAULTS.inventories,
    cBase: DEFAULTS.cBase,
    batterP: DEFAULTS.batterP,
    catcherP: DEFAULTS.catcherP,
    wpMin: null,
    wpMax: null,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      opts.json = true;
    } else if (arg.startsWith("--delay-ms=")) {
      opts.delayMs = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--innings=")) {
      opts.grid = { ...opts.grid, innings: parseList(arg) };
    } else if (arg.startsWith("--halves=")) {
      opts.grid = { ...opts.grid, halves: parseStringList(arg) };
    } else if (arg.startsWith("--outs=")) {
      opts.grid = { ...opts.grid, outs: parseList(arg) };
    } else if (arg.startsWith("--bases=")) {
      opts.grid = { ...opts.grid, bases: parseList(arg) };
    } else if (arg.startsWith("--diffs=")) {
      opts.grid = { ...opts.grid, runDiffs: parseList(arg) };
    } else if (arg.startsWith("--roles=")) {
      opts.roles = arg.split("=")[1].split(",").map((role) => role.trim()).filter(Boolean);
    } else if (arg.startsWith("--inventories=")) {
      opts.inventories = parseList(arg);
    } else if (arg.startsWith("--c-base-pp=")) {
      opts.cBase = Number(arg.split("=")[1]) / 100;
    } else if (arg.startsWith("--p-batter=")) {
      opts.batterP = parseProbability(arg.split("=")[1]);
    } else if (arg.startsWith("--p-catcher=")) {
      opts.catcherP = parseProbability(arg.split("=")[1]);
    } else if (arg.startsWith("--wp-min=")) {
      opts.wpMin = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--wp-max=")) {
      opts.wpMax = Number(arg.split("=")[1]);
    }
  }

  return opts;
}

function parseProbability(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return numeric;
  return numeric > 1 ? numeric / 100 : numeric;
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

function countKey(count) {
  return `${count.balls}-${count.strikes}`;
}

function basesToRunners(bases) {
  return {
    "1b": (bases & 1) !== 0,
    "2b": (bases & 2) !== 0,
    "3b": (bases & 4) !== 0,
  };
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

function scoreColumn(runDiff) {
  if (runDiff === 0) return "bat_wins_0";
  if (runDiff > 0) return `bat_wins_${runDiff}`;
  return `bat_wins_minus_${Math.abs(runDiff)}`;
}

function tableKey(state) {
  return [
    state.inning,
    state.half,
    state.outs,
    state.bases,
  ].join("|");
}

function requestParams(state) {
  return {
    inning: state.inning,
    half: state.half,
    outs: state.outs,
    balls: 0,
    strikes: 0,
    situation: null,
    run_diff: 0,
    runners: basesToRunners(state.bases),
    perspective: "bat",
    is_by_count: true,
  };
}

function isPlayableState(state) {
  if (Math.abs(state.runDiff) > 5) return false;
  if (state.half === "Bottom" && state.inning >= 9 && state.runDiff > 0) {
    return false;
  }
  if (state.half === "Top" && state.inning >= 10 && state.runDiff < 0) {
    return false;
  }
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
      state: { ...state, outs: state.outs + 1, bases: state.bases },
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
    if (state.inning >= 9 && state.runDiff < 0) {
      return { gameOverValue: 0 };
    }

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

  if (state.inning >= 9 && state.runDiff < 0) {
    return { gameOverValue: 0 };
  }

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

class SavantClient {
  constructor(delayMs) {
    this.delayMs = delayMs;
    this.cache = new Map();
    this.requests = 0;
  }

  async fetchTable(state) {
    const key = tableKey(state);
    if (this.cache.has(key)) return this.cache.get(key);
    if (!isPlayableState(state)) return null;

    const params = new URLSearchParams({
      type: "winexp",
      params: JSON.stringify(requestParams(state)),
    });
    const url = `${ENDPOINT}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Savant request failed ${response.status}: ${url}`);
    }

    const rows = await response.json();
    const byCount = new Map(
      rows.map((row) => [
        `${row.ball_count}-${row.strike_count}`,
        row,
      ]),
    );

    this.cache.set(key, byCount);
    this.requests += 1;
    if (this.delayMs > 0) await sleep(this.delayMs);
    return byCount;
  }
}

async function valueForOutcome(client, outcome) {
  if (outcome.gameOverValue != null) return outcome.gameOverValue;
  if (!outcome.state || !outcome.count || !isPlayableState(outcome.state)) return null;
  if (Math.abs(outcome.state.runDiff) > 5) return null;

  const table = await client.fetchTable(outcome.state);
  if (!table) return null;

  const row = table.get(countKey(outcome.count));
  if (!row) return null;

  const battingTeamValue = row[scoreColumn(outcome.state.runDiff)];
  if (battingTeamValue == null) return null;

  return outcome.sameBattingTeam ? battingTeamValue : 1 - battingTeamValue;
}

async function currentValue(client, state, count) {
  return valueForOutcome(client, {
    sameBattingTeam: true,
    state,
    count,
  });
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

function inventoryFactor(challengesLeft) {
  if (challengesLeft === 2) return 0.6;
  if (challengesLeft === 1) return 1.5;
  return null;
}

function remainingGameFactor(inning) {
  if (inning <= 3) return 1.25;
  if (inning <= 6) return 1.0;
  if (inning === 7) return 0.85;
  if (inning === 8) return 0.7;
  return 0.5;
}

function currentWpFactor(teamWp) {
  if (teamWp <= 0.05) return 0.03;
  if (teamWp <= 0.10) return 0.08;
  if (teamWp <= 0.20) return 0.20;
  if (teamWp <= 0.30) return 0.45;
  if (teamWp <= 0.40) return 0.75;
  if (teamWp < 0.50) return 0.95;
  if (teamWp === 0.50) return 1.00;
  if (teamWp <= 0.60) return 0.95;
  if (teamWp <= 0.70) return 0.90;
  if (teamWp <= 0.80) return 0.75;
  if (teamWp <= 0.90) return 0.40;
  if (teamWp <= 0.95) return 0.15;
  return 0.05;
}

function failedChallengeCost(opts, role, inventory, failedOutcome, failedBattingWp) {
  if (failedOutcome.gameOverValue != null) return 0;
  const inv = inventoryFactor(inventory);
  if (inv == null || !failedOutcome.state) return null;

  const teamWp = role === "batter" ? failedBattingWp : 1 - failedBattingWp;
  return opts.cBase
    * inv
    * remainingGameFactor(failedOutcome.state.inning)
    * currentWpFactor(teamWp);
}

function roleP(opts, role) {
  return role === "batter" ? opts.batterP : opts.catcherP;
}

function countCategory(role, count) {
  if (count.balls === 3 && count.strikes === 2) return "full_count";
  if (count.balls === 3 || count.strikes === 2) return "deep_count";
  return "open_only";
}

function withinWpFilter(value, opts) {
  if (value == null) return false;
  if (opts.wpMin != null && value < opts.wpMin) return false;
  if (opts.wpMax != null && value > opts.wpMax) return false;
  return true;
}

async function collectRows(client, opts) {
  const rows = [];

  for (const state of generateStates(opts.grid)) {
    const stateStartBattingWp = await currentValue(client, state, { balls: 0, strikes: 0 });
    if (stateStartBattingWp == null) continue;

    for (const [balls, strikes] of COUNTS) {
      const count = { balls, strikes };
      const prePitchWp = await currentValue(client, state, count);
      if (!withinWpFilter(prePitchWp, opts)) continue;

      const ballOutcome = applyBall(state, count);
      const strikeOutcome = applyStrike(state, count);
      const ballValue = await valueForOutcome(client, ballOutcome);
      const strikeValue = await valueForOutcome(client, strikeOutcome);
      if (ballValue == null || strikeValue == null) continue;

      const v = ballValue - strikeValue;
      if (v <= 0) continue;

      for (const role of opts.roles) {
        for (const inventory of opts.inventories) {
          const failedOutcome = role === "batter" ? strikeOutcome : ballOutcome;
          const failedBattingWp = role === "batter" ? strikeValue : ballValue;
          const c = failedChallengeCost(opts, role, inventory, failedOutcome, failedBattingWp);
          if (c == null) continue;

          const p = roleP(opts, role);
          const ev = p * v - (1 - p) * c;
          const requiredP = v + c === 0 ? 0 : c / (v + c);

          rows.push({
            role,
            inventory,
            inning: state.inning,
            half: state.half,
            outs: state.outs,
            bases: state.bases,
            runDiff: state.runDiff,
            count: countKey(count),
            category: countCategory(role, count),
            startTeamWp: role === "batter" ? stateStartBattingWp : 1 - stateStartBattingWp,
            prePitchBattingWp: prePitchWp,
            prePitchTeamWp: role === "batter" ? prePitchWp : 1 - prePitchWp,
            v,
            c,
            p,
            requiredP,
            ev,
            positive: ev > 0,
          });
        }
      }
    }
  }

  return rows;
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => {
    if (!sorted.length) return null;
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    n: sorted.length,
    mean: sorted.length ? sum / sorted.length : null,
    median: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
  };
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

function pct(value) {
  if (value == null) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function pp(value) {
  if (value == null) return "n/a";
  return `${(value * 100).toFixed(2)} pp`;
}

function gamePhase(inning) {
  if (inning <= 3) return "1-3";
  if (inning <= 6) return "4-6";
  if (inning === 7) return "7";
  if (inning === 8) return "8";
  return "9+";
}

function wpBand(teamWp) {
  if (teamWp <= 0.05) return "00-05";
  if (teamWp <= 0.10) return "05-10";
  if (teamWp <= 0.20) return "10-20";
  if (teamWp <= 0.30) return "20-30";
  if (teamWp <= 0.40) return "30-40";
  if (teamWp < 0.50) return "40-50";
  if (teamWp === 0.50) return "50";
  if (teamWp <= 0.60) return "50-60";
  if (teamWp <= 0.70) return "60-70";
  if (teamWp <= 0.80) return "70-80";
  if (teamWp <= 0.90) return "80-90";
  if (teamWp <= 0.95) return "90-95";
  return "95-100";
}

function levelBucketRows(group, level) {
  if (level === "full_count") {
    return group.filter((row) => row.category === "full_count");
  }
  if (level === "deep_count") {
    return group.filter((row) => row.category === "full_count" || row.category === "deep_count");
  }
  if (level === "open") {
    return group;
  }
  return [];
}

function bucketStats(rows) {
  if (!rows.length) {
    return {
      n: 0,
      positiveRate: null,
      medianEv: null,
      medianV: null,
      medianC: null,
      medianRequiredP: null,
    };
  }

  return {
    n: rows.length,
    positiveRate: rows.filter((row) => row.positive).length / rows.length,
    medianEv: summarize(rows.map((row) => row.ev)).median,
    medianV: summarize(rows.map((row) => row.v)).median,
    medianC: summarize(rows.map((row) => row.c)).median,
    medianRequiredP: summarize(rows.map((row) => row.requiredP)).median,
  };
}

function clearsFullCount(stats) {
  return stats.n > 0 && stats.medianEv >= 0;
}

function clearsDeepCount(stats) {
  return stats.n > 0 && stats.medianEv >= 0 && stats.positiveRate >= 0.55;
}

function clearsOpen(stats) {
  return stats.n > 0 && stats.medianEv >= 0 && stats.positiveRate >= 0.65;
}

function recommendationForGroup(group) {
  const full = bucketStats(levelBucketRows(group, "full_count"));
  const deep = bucketStats(levelBucketRows(group, "deep_count"));
  const open = bucketStats(levelBucketRows(group, "open"));

  let recommendedLevel = "Closed";
  if (clearsFullCount(full)) recommendedLevel = "Full Count";
  if (clearsDeepCount(deep)) recommendedLevel = "Deep Count";
  if (clearsOpen(open)) recommendedLevel = "Open";

  return { recommendedLevel, full, deep, open };
}

function printRecommendationSummary(rows) {
  console.log("");
  console.log("Recommended level by role / inventory / game phase / current team win probability");
  console.log("role,inv,phase,start_team_wp_band,n,median start WP,recommendation,full median EV,deep +EV%,deep median EV,open +EV%,open median EV");

  const groups = groupBy(
    rows,
    (row) => [
      row.role,
      row.inventory,
      gamePhase(row.inning),
      wpBand(row.startTeamWp),
    ].join("|"),
  );

  const phaseOrder = ["1-3", "4-6", "7", "8", "9+"];
  const wpOrder = ["00-05", "05-10", "10-20", "20-30", "30-40", "40-50", "50", "50-60", "60-70", "70-80", "80-90", "90-95", "95-100"];
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [roleA, invA, phaseA, wpA] = a.split("|");
    const [roleB, invB, phaseB, wpB] = b.split("|");
    return roleA.localeCompare(roleB)
      || Number(invA) - Number(invB)
      || phaseOrder.indexOf(phaseA) - phaseOrder.indexOf(phaseB)
      || wpOrder.indexOf(wpA) - wpOrder.indexOf(wpB);
  });

  for (const key of sortedKeys) {
    const group = groups.get(key);
    const [role, inventory, phase, teamWpBand] = key.split("|");
    const rec = recommendationForGroup(group);
    const startWp = summarize(group.map((row) => row.startTeamWp)).median;
    console.log([
      role,
      inventory,
      phase,
      teamWpBand,
      group.length,
      pct(startWp),
      rec.recommendedLevel,
      pp(rec.full.medianEv),
      pct(rec.deep.positiveRate),
      pp(rec.deep.medianEv),
      pct(rec.open.positiveRate),
      pp(rec.open.medianEv),
    ].join(","));
  }
}

function printCountSummary(rows) {
  console.log("By role / inventory / count");
  console.log("role,inv,count,cat,n,+EV%,median V,median C,median required p,median EV");

  const groups = groupBy(rows, (row) => `${row.role}|${row.inventory}|${row.count}`);
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [roleA, invA, countA] = a.split("|");
    const [roleB, invB, countB] = b.split("|");
    return roleA.localeCompare(roleB)
      || Number(invA) - Number(invB)
      || COUNTS.findIndex(([balls, strikes]) => `${balls}-${strikes}` === countA)
      - COUNTS.findIndex(([balls, strikes]) => `${balls}-${strikes}` === countB);
  });

  for (const key of sortedKeys) {
    const group = groups.get(key);
    const [role, inventory, count] = key.split("|");
    const v = summarize(group.map((row) => row.v));
    const c = summarize(group.map((row) => row.c));
    const required = summarize(group.map((row) => row.requiredP));
    const ev = summarize(group.map((row) => row.ev));
    const positiveRate = group.filter((row) => row.positive).length / group.length;
    console.log([
      role,
      inventory,
      count,
      group[0].category,
      group.length,
      pct(positiveRate),
      pp(v.median),
      pp(c.median),
      pct(required.median),
      pp(ev.median),
    ].join(","));
  }
}

function printScenarioExamples(rows) {
  const topPositive = [...rows]
    .filter((row) => row.positive)
    .sort((a, b) => b.ev - a.ev)
    .slice(0, 12);

  console.log("");
  console.log("Top +EV examples");
  console.log("role,inv,state,count,V,C,req p,EV");
  for (const row of topPositive) {
    console.log([
      row.role,
      row.inventory,
      `${row.half}${row.inning} ${row.runDiff >= 0 ? "+" : ""}${row.runDiff} ${row.outs}out ${basesLabel(row.bases)}`,
      row.count,
      pp(row.v),
      pp(row.c),
      pct(row.requiredP),
      pp(row.ev),
    ].join(","));
  }
}

function printSummary(rows, client, opts) {
  console.log("ABS challenge EV matrix");
  console.log(`Requests: ${client.requests}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`C_base: ${pp(opts.cBase)}`);
  console.log(`p_batter: ${pct(opts.batterP)}`);
  console.log(`p_catcher: ${pct(opts.catcherP)}`);
  if (opts.wpMin != null || opts.wpMax != null) {
    console.log(`Pre-pitch WP filter: ${opts.wpMin ?? "-inf"} to ${opts.wpMax ?? "+inf"}`);
  }
  console.log("");
  printCountSummary(rows);
  printRecommendationSummary(rows);
  printScenarioExamples(rows);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const client = new SavantClient(opts.delayMs);
  const rows = await collectRows(client, opts);

  if (opts.json) {
    console.log(JSON.stringify({
      requests: client.requests,
      rows,
    }, null, 2));
    return;
  }

  printSummary(rows, client, opts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
