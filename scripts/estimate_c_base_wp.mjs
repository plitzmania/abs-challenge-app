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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const opts = {
    delayMs: 25,
    json: false,
    grid: DEFAULT_GRID,
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
    } else if (arg.startsWith("--bases=")) {
      opts.grid = { ...opts.grid, bases: parseList(arg) };
    } else if (arg.startsWith("--diffs=")) {
      opts.grid = { ...opts.grid, runDiffs: parseList(arg) };
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

function withinWpFilter(value, opts) {
  if (value == null) return false;
  if (opts.wpMin != null && value < opts.wpMin) return false;
  if (opts.wpMax != null && value > opts.wpMax) return false;
  return true;
}

async function collectSamples(client, grid, opts) {
  const records = [];

  for (const state of generateStates(grid)) {
    for (const [balls, strikes] of COUNTS) {
      const count = { balls, strikes };
      const prePitchWp = await currentValue(client, state, count);
      if (!withinWpFilter(prePitchWp, opts)) continue;

      const ballValue = await valueForOutcome(client, applyBall(state, count));
      const strikeValue = await valueForOutcome(client, applyStrike(state, count));
      if (ballValue == null || strikeValue == null) continue;

      records.push({
        inning: state.inning,
        half: state.half,
        outs: state.outs,
        bases: state.bases,
        runDiff: state.runDiff,
        count: countKey(count),
        isTerminalFamily: balls === 3 || strikes === 2,
        prePitchWp,
        vWp: Math.abs(ballValue - strikeValue),
      });
    }
  }

  return records;
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
    p25: q(0.25),
    median: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
    p95: q(0.95),
  };
}

function byCount(records) {
  return COUNTS.map(([balls, strikes]) => {
    const key = `${balls}-${strikes}`;
    return {
      count: key,
      ...summarize(records.filter((record) => record.count === key).map((record) => record.vWp)),
    };
  });
}

function pp(value) {
  if (value == null) return "n/a";
  return `${(value * 100).toFixed(2)} pp`;
}

function printSummary(records, client, opts) {
  const all = summarize(records.map((record) => record.vWp));
  const terminal = summarize(
    records
      .filter((record) => record.isTerminalFamily)
      .map((record) => record.vWp),
  );
  const nonTerminal = summarize(
    records
      .filter((record) => !record.isTerminalFamily)
      .map((record) => record.vWp),
  );

  console.log("Savant count-aware WE sample");
  console.log(`Requests: ${client.requests}`);
  console.log(`Pitch-state samples: ${records.length}`);
  if (opts.wpMin != null || opts.wpMax != null) {
    console.log(`Pre-pitch WP filter: ${opts.wpMin ?? "-inf"} to ${opts.wpMax ?? "+inf"}`);
  }
  console.log("");
  console.log("C_base_WP candidates");
  console.log(`All pitch states median: ${pp(all.median)}`);
  console.log(`Terminal-family median: ${pp(terminal.median)}`);
  console.log(`Non-terminal median: ${pp(nonTerminal.median)}`);
  console.log(`All pitch states p75: ${pp(all.p75)}`);
  console.log(`All pitch states p90: ${pp(all.p90)}`);
  console.log("");
  console.log("By pre-pitch count");
  console.log("count,n,median,p75,p90");
  for (const row of byCount(records)) {
    console.log([
      row.count,
      row.n,
      pp(row.median),
      pp(row.p75),
      pp(row.p90),
    ].join(","));
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const client = new SavantClient(opts.delayMs);
  const records = await collectSamples(client, opts.grid, opts);

  if (opts.json) {
    console.log(JSON.stringify({
      requests: client.requests,
      samples: records.length,
      wpFilter: { min: opts.wpMin, max: opts.wpMax },
      all: summarize(records.map((record) => record.vWp)),
      terminalFamily: summarize(records.filter((record) => record.isTerminalFamily).map((record) => record.vWp)),
      nonTerminal: summarize(records.filter((record) => !record.isTerminalFamily).map((record) => record.vWp)),
      byCount: byCount(records),
    }, null, 2));
    return;
  }

  printSummary(records, client, opts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
