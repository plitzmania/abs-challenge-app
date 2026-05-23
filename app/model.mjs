const ENDPOINT = "https://baseballsavant.mlb.com/game-strategy-explorer";

export const COUNTS = [
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

export const DEFAULT_CONFIG = {
  successRates: {
    batter: 0.47,
    catcher: 0.59,
  },
  challengeCost: {
    baseWpPoints: 5.5,
    inventoryFactor: {
      2: 1.35,
      1: 3.0,
    },
    remainingGameFactor: {
      early: 1.25,
      middle: 1.0,
      seventh: 0.85,
      eighth: 0.7,
      late: 0.5,
    },
    currentWpFactor: [
      { max: 0.05, factor: 0.03, label: "0-5%" },
      { max: 0.10, factor: 0.08, label: "5-10%" },
      { max: 0.20, factor: 0.20, label: "10-20%" },
      { max: 0.30, factor: 0.45, label: "20-30%" },
      { max: 0.40, factor: 0.75, label: "30-40%" },
      { max: 0.50, factor: 0.95, label: "40-50%" },
      { exact: 0.50, factor: 1.00, label: "Exactly 50%" },
      { max: 0.60, factor: 0.95, label: "50-60%" },
      { max: 0.70, factor: 0.90, label: "60-70%" },
      { max: 0.80, factor: 0.75, label: "70-80%" },
      { max: 0.90, factor: 0.40, label: "80-90%" },
      { max: 0.95, factor: 0.15, label: "90-95%" },
      { max: 1.00, factor: 0.05, label: "95-100%" },
    ],
  },
  thresholds: {
    fullCount: {
      medianExpectedValueMin: 0,
    },
    deepCount: {
      medianExpectedValueMin: 0,
      positiveRateMin: 0.55,
    },
    open: {
      medianExpectedValueMin: 0,
      positiveRateMin: 0.65,
    },
  },
};

const LEVELS = ["Closed", "Full Count", "Deep Count", "Open"];
const NO_PA = "No PA";

const INNING_BANDS = [
  { key: "early", label: "Innings 1-3", shortLabel: "1-3" },
  { key: "middle", label: "Innings 4-6", shortLabel: "4-6" },
  { key: "seventh", label: "Inning 7", shortLabel: "7" },
  { key: "eighth", label: "Inning 8", shortLabel: "8" },
  { key: "late", label: "Inning 9+", shortLabel: "9+" },
];

const HALF_CONTEXTS = [
  { key: "top", label: "Top Half" },
  { key: "bottom", label: "Bottom Half" },
];

const SCORE_BANDS = [
  {
    key: "down4",
    label: "Down 4+",
    shortLabel: "D4+",
    modifier: { early: 0, middle: 1, seventh: 2, eighth: 2, late: 3 },
  },
  {
    key: "down23",
    label: "Down 2-3",
    shortLabel: "D2-3",
    modifier: { early: 0, middle: 0, seventh: 1, eighth: 1, late: 2 },
  },
  {
    key: "down1",
    label: "Down 1",
    shortLabel: "D1",
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 1, late: 1 },
  },
  {
    key: "tie",
    label: "Tie",
    shortLabel: "Tie",
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 0, late: 1 },
  },
  {
    key: "up1",
    label: "Up 1",
    shortLabel: "U1",
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 0, late: 1 },
  },
  {
    key: "up23",
    label: "Up 2-3",
    shortLabel: "U2-3",
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 1, late: 2 },
  },
  {
    key: "up4",
    label: "Up 4+",
    shortLabel: "U4+",
    modifier: { early: 0, middle: 1, seventh: 1, eighth: 2, late: 3 },
  },
];

const SCORE_BAND_WP_ANCHORS = {
  down4: 0.08,
  down23: 0.22,
  down1: 0.38,
  tie: 0.5,
  up1: 0.62,
  up23: 0.78,
  up4: 0.92,
};

const INNING_WP_PULL = {
  early: 0.45,
  middle: 0.65,
  seventh: 0.8,
  eighth: 0.9,
  late: 1,
};

const BASE_WP_PRESSURE = {
  0: 0,
  1: 0.015,
  2: 0.03,
  3: 0.045,
  4: 0.04,
  5: 0.06,
  6: 0.075,
  7: 0.09,
};

const BASE_STATES = [
  { bases: 0, label: "Empty", modifier: 0 },
  { bases: 1, label: "1B", modifier: 0 },
  { bases: 2, label: "2B", modifier: 1 },
  { bases: 3, label: "1B+2B", modifier: 1 },
  { bases: 4, label: "3B", modifier: 1 },
  { bases: 5, label: "1B+3B", modifier: 1 },
  { bases: 6, label: "2B+3B", modifier: 2 },
  { bases: 7, label: "Loaded", modifier: 2 },
];

const ROLE_INVENTORY_SECTIONS = [
  { role: "batter", inventory: 1, title: "Batter, 1 challenge left" },
  { role: "batter", inventory: 2, title: "Batter, 2 challenges left" },
  { role: "catcher", inventory: 1, title: "Catcher, 1 challenge left" },
  { role: "catcher", inventory: 2, title: "Catcher, 2 challenges left" },
];

const BASE_LEVEL_BY_ROLE_INVENTORY = {
  batter: {
    1: { early: 0, middle: 0, seventh: 1, eighth: 1, late: 2 },
    2: { early: 0, middle: 1, seventh: 1, eighth: 2, late: 3 },
  },
  catcher: {
    1: { early: 0, middle: 1, seventh: 2, eighth: 2, late: 3 },
    2: { early: 0, middle: 1, seventh: 2, eighth: 2, late: 3 },
  },
};

const LEVEL_CLASS = {
  Closed: "closed",
  "Full Count": "full-count",
  "Deep Count": "deep-count",
  Open: "open",
  [NO_PA]: "no-pa",
};

export function mergeConfig(input = {}) {
  const config = structuredClone(DEFAULT_CONFIG);
  mergeInto(config, input);
  return config;
}

function mergeInto(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      mergeInto(target[key], value);
    } else if (value !== undefined) {
      target[key] = value;
    }
  }
  return target;
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
  return [state.inning, state.half, state.outs, state.bases].join("|");
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
  if (!state) return false;
  if (Math.abs(state.runDiff) > 5) return false;
  if (state.half === "Bottom" && state.inning >= 9 && state.runDiff > 0) return false;
  if (state.half === "Top" && state.inning >= 10 && state.runDiff < 0) return false;
  return true;
}

function nextInningValue(inning) {
  return Math.min(inning + 1, 10);
}

export function applyBall(state, count) {
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

export function applyStrike(state, count) {
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

export class SavantClient {
  constructor() {
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
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Savant request failed: ${response.status}`);
    }

    const rows = await response.json();
    const byCount = new Map(
      rows.map((row) => [`${row.ball_count}-${row.strike_count}`, row]),
    );
    this.cache.set(key, byCount);
    this.requests += 1;
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
  return valueForOutcome(client, { sameBattingTeam: true, state, count });
}

function inventoryFactor(config, challengesLeft) {
  return config.challengeCost.inventoryFactor[String(challengesLeft)] ?? null;
}

function remainingGameFactor(config, inning) {
  const factors = config.challengeCost.remainingGameFactor;
  if (inning <= 3) return factors.early;
  if (inning <= 6) return factors.middle;
  if (inning === 7) return factors.seventh;
  if (inning === 8) return factors.eighth;
  return factors.late;
}

function currentWpFactor(config, teamWp) {
  const rows = config.challengeCost.currentWpFactor;
  const exact = rows.find((row) => row.exact != null && Math.abs(teamWp - row.exact) < 1e-12);
  if (exact) return exact.factor;
  const match = rows.find((row) => row.max != null && teamWp <= row.max);
  return match?.factor ?? rows.at(-1)?.factor ?? 1;
}

function failedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp) {
  if (failedOutcome.gameOverValue != null) return 0;
  const inv = inventoryFactor(config, inventory);
  if (inv == null || !failedOutcome.state) return null;

  const teamWp = role === "batter" ? failedBattingWp : 1 - failedBattingWp;
  return (config.challengeCost.baseWpPoints / 100)
    * inv
    * remainingGameFactor(config, failedOutcome.state.inning)
    * currentWpFactor(config, teamWp);
}

function countCategory(count) {
  if (count.balls === 3 && count.strikes === 2) return "full_count";
  if (count.balls === 3 || count.strikes === 2) return "deep_count";
  return "open_only";
}

function summarize(values) {
  const sorted = values.filter((value) => value != null).sort((a, b) => a - b);
  if (!sorted.length) {
    return { n: 0, mean: null, median: null, positiveRate: null };
  }
  const q = (p) => {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  return {
    n: sorted.length,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: q(0.5),
    positiveRate: sorted.filter((value) => value > 0).length / sorted.length,
  };
}

function bucketStats(rows) {
  if (!rows.length) {
    return { n: 0, positiveRate: null, medianEv: null, medianV: null, medianC: null, medianRequiredP: null };
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

function levelRows(rows, level) {
  if (level === "full_count") return rows.filter((row) => row.category === "full_count");
  if (level === "deep_count") return rows.filter((row) => row.category === "full_count" || row.category === "deep_count");
  if (level === "open") return rows;
  return [];
}

function recommendLevel(config, rows) {
  const full = bucketStats(levelRows(rows, "full_count"));
  const deep = bucketStats(levelRows(rows, "deep_count"));
  const open = bucketStats(levelRows(rows, "open"));
  const thresholds = config.thresholds;

  let level = "Closed";
  if (full.n && full.medianEv >= thresholds.fullCount.medianExpectedValueMin) {
    level = "Full Count";
  }
  if (
    deep.n &&
    deep.medianEv >= thresholds.deepCount.medianExpectedValueMin &&
    deep.positiveRate >= thresholds.deepCount.positiveRateMin
  ) {
    level = "Deep Count";
  }
  if (
    open.n &&
    open.medianEv >= thresholds.open.medianExpectedValueMin &&
    open.positiveRate >= thresholds.open.positiveRateMin
  ) {
    level = "Open";
  }

  return { level, buckets: { full, deep, open } };
}

export async function evaluateRecommendation(client, input) {
  const config = mergeConfig(input.config);
  const role = input.role === "catcher" ? "catcher" : "batter";
  const inventory = Number(input.inventory);
  const p = config.successRates[role];
  const state = {
    inning: Number(input.state.inning),
    half: input.state.half === "Bottom" ? "Bottom" : "Top",
    outs: Number(input.state.outs),
    bases: Number(input.state.bases),
    runDiff: Number(input.state.runDiff),
  };

  const startBattingWp = await currentValue(client, state, { balls: 0, strikes: 0 });
  if (startBattingWp == null) {
    throw new Error("No win expectancy data is available for this state.");
  }

  const rows = [];
  for (const [balls, strikes] of COUNTS) {
    const count = { balls, strikes };
    const ballOutcome = applyBall(state, count);
    const strikeOutcome = applyStrike(state, count);
    const ballValue = await valueForOutcome(client, ballOutcome);
    const strikeValue = await valueForOutcome(client, strikeOutcome);
    if (ballValue == null || strikeValue == null) continue;

    const v = ballValue - strikeValue;
    if (v <= 0) continue;

    const failedOutcome = role === "batter" ? strikeOutcome : ballOutcome;
    const failedBattingWp = role === "batter" ? strikeValue : ballValue;
    const c = failedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp);
    if (c == null) continue;

    const ev = p * v - (1 - p) * c;
    rows.push({
      count: countKey(count),
      category: countCategory(count),
      v,
      c,
      p,
      requiredP: v + c === 0 ? 0 : c / (v + c),
      ev,
      positive: ev > 0,
    });
  }

  const recommendation = recommendLevel(config, rows);
  return {
    role,
    inventory,
    state,
    p,
    startBattingWp,
    startTeamWp: role === "batter" ? startBattingWp : 1 - startBattingWp,
    rows,
    recommendation,
    source: "Baseball Savant Game Strategy Explorer endpoint",
  };
}

function clampLevel(value) {
  return Math.max(0, Math.min(LEVELS.length - 1, value));
}

function baseOutModifier(bases, outs) {
  const baseState = BASE_STATES.find((row) => row.bases === bases);
  const baseModifier = baseState?.modifier ?? 0;
  const twoOutModifier = outs === 2 && bases !== 0 ? 1 : 0;
  return Math.min(2, baseModifier + twoOutModifier);
}

function isUnavailableBottomLate(role, inningKey, halfKey, scoreBand) {
  if (inningKey !== "late" || halfKey !== "bottom") return false;
  if (role === "batter") return scoreBand.key.startsWith("up");
  return scoreBand.key.startsWith("down");
}

function halfModifier(role, inningKey, halfKey, scoreBand) {
  if (isUnavailableBottomLate(role, inningKey, halfKey, scoreBand)) return 0;
  if (inningKey === "late" && halfKey === "bottom") return 1;
  return 0;
}

function safeNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function odds(value) {
  const p = clamp(value, 0.01, 0.99);
  return p / (1 - p);
}

function ratio(value, baseline, fallback = 1) {
  const cleanValue = safeNumber(value, fallback);
  const cleanBaseline = safeNumber(baseline, fallback);
  if (cleanValue <= 0 || cleanBaseline <= 0) return fallback;
  return cleanValue / cleanBaseline;
}

function estimatedGuideTeamWp(role, inningKey, scoreBand, bases, outs) {
  const scoreAnchor = SCORE_BAND_WP_ANCHORS[scoreBand.key] ?? 0.5;
  const pull = INNING_WP_PULL[inningKey] ?? 1;
  const scoreWp = 0.5 + ((scoreAnchor - 0.5) * pull);
  const runnerPressure = (BASE_WP_PRESSURE[bases] ?? 0) * (outs === 0 ? 1 : outs === 1 ? 0.65 : 0.3);
  const runnerDirection = role === "batter" ? 1 : -1;
  return clamp(scoreWp + (runnerPressure * runnerDirection), 0.01, 0.99);
}

function thresholdCostRatio(config) {
  const current = config.thresholds;
  const baseline = DEFAULT_CONFIG.thresholds;
  const medianDelta = (
    safeNumber(current.fullCount.medianExpectedValueMin, 0) - baseline.fullCount.medianExpectedValueMin
    + safeNumber(current.deepCount.medianExpectedValueMin, 0) - baseline.deepCount.medianExpectedValueMin
    + safeNumber(current.open.medianExpectedValueMin, 0) - baseline.open.medianExpectedValueMin
  );
  const rateDelta = (
    safeNumber(current.deepCount.positiveRateMin, baseline.deepCount.positiveRateMin) - baseline.deepCount.positiveRateMin
    + safeNumber(current.open.positiveRateMin, baseline.open.positiveRateMin) - baseline.open.positiveRateMin
  );
  return Math.exp((medianDelta * 8) + (rateDelta * 1.2));
}

function guideSettingLevelShift(config, role, inventory, inningKey, scoreBand, bases, outs) {
  const baseline = DEFAULT_CONFIG;
  const teamWp = estimatedGuideTeamWp(role, inningKey, scoreBand, bases, outs);
  const pRatio = odds(config.successRates[role]) / odds(baseline.successRates[role]);
  const costRatio =
    ratio(config.challengeCost.baseWpPoints, baseline.challengeCost.baseWpPoints)
    * ratio(config.challengeCost.inventoryFactor[inventory], baseline.challengeCost.inventoryFactor[inventory])
    * ratio(config.challengeCost.remainingGameFactor[inningKey], baseline.challengeCost.remainingGameFactor[inningKey])
    * ratio(currentWpFactor(config, teamWp), currentWpFactor(baseline, teamWp))
    * thresholdCostRatio(config);

  const pressureRatio = pRatio / costRatio;
  const rawShift = Math.log(pressureRatio) / Math.log(1.55);
  return clamp(Math.round(rawShift), -2, 2);
}

function dugoutLevel(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs) {
  if (isUnavailableBottomLate(role, inningKey, halfKey, scoreBand)) return NO_PA;
  if (safeNumber(config.successRates[role], 0) >= 0.999) return "Open";

  const baseLevel = BASE_LEVEL_BY_ROLE_INVENTORY[role]?.[inventory]?.[inningKey] ?? 0;
  const scoreModifier = scoreBand.modifier[inningKey] ?? 0;
  const levelIndex = clampLevel(
    baseLevel
    + scoreModifier
    + baseOutModifier(bases, outs)
    + halfModifier(role, inningKey, halfKey, scoreBand)
    + guideSettingLevelShift(config, role, inventory, inningKey, scoreBand, bases, outs),
  );
  return LEVELS[levelIndex];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatFactor(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2);
}

function guideAssumptions(config) {
  const cc = config.challengeCost;
  return [
    ["Batter success", formatPercent(config.successRates.batter)],
    ["Catcher success", formatPercent(config.successRates.catcher)],
    ["Base challenge cost", `${cc.baseWpPoints.toFixed(2)} WP pts`],
    ["2 challenges left factor", formatFactor(cc.inventoryFactor[2])],
    ["1 challenge left factor", formatFactor(cc.inventoryFactor[1])],
    ["Deep Count positive-rate threshold", formatPercent(config.thresholds.deepCount.positiveRateMin)],
    ["Open positive-rate threshold", formatPercent(config.thresholds.open.positiveRateMin)],
  ];
}

function scoreHeaderMarkdown() {
  return SCORE_BANDS.map((band) => band.shortLabel).join(" | ");
}

function pageId(section, inningBand, halfContext) {
  return `lookup-${section.role}-${section.inventory}-${inningBand.key}-${halfContext.key}`;
}

function pageNumber(sectionIndex, inningIndex, halfIndex) {
  return (sectionIndex * INNING_BANDS.length * HALF_CONTEXTS.length) + (inningIndex * HALF_CONTEXTS.length) + halfIndex + 1;
}

function guideLookupMarkdown(config, role, inventory, inningBand, halfContext) {
  const lines = [
    `#### ${inningBand.label} - ${halfContext.label}`,
    "",
    `| Outs | Runners | ${scoreHeaderMarkdown()} |`,
    `|---:|---|${SCORE_BANDS.map(() => "---").join("|")}|`,
  ];

  for (const outs of [0, 1, 2]) {
    for (const baseState of BASE_STATES) {
      const levels = SCORE_BANDS.map((scoreBand) =>
        dugoutLevel(config, role, inventory, inningBand.key, halfContext.key, scoreBand, baseState.bases, outs),
      );
      lines.push(`| ${outs} | ${baseState.label} | ${levels.join(" | ")} |`);
    }
  }

  return lines.join("\n");
}

function guideLookupHtml(config, section, sectionIndex, inningBand, inningIndex, halfContext, halfIndex) {
  const rows = [];
  for (const outs of [0, 1, 2]) {
    for (const baseState of BASE_STATES) {
      const cells = SCORE_BANDS.map((scoreBand) => {
        const level = dugoutLevel(config, section.role, section.inventory, inningBand.key, halfContext.key, scoreBand, baseState.bases, outs);
        return `<td><span class="lookup-level ${LEVEL_CLASS[level]}">${escapeHtml(level)}</span></td>`;
      }).join("");
      rows.push(`
        <tr>
          <td>${outs}</td>
          <td>${escapeHtml(baseState.label)}</td>
          ${cells}
        </tr>
      `);
    }
  }

  const currentPageNumber = pageNumber(sectionIndex, inningIndex, halfIndex);
  const currentPageId = pageId(section, inningBand, halfContext);
  const isActivePage = currentPageNumber === 1;

  return `
    <section class="lookup-page${isActivePage ? " active" : ""}" id="${escapeHtml(currentPageId)}" data-lookup-page="${escapeHtml(currentPageId)}">
      <div class="lookup-page-header">
        <div>
          <span class="binder-page-number">Page ${currentPageNumber}</span>
          <h4>${escapeHtml(inningBand.label)} <span>${escapeHtml(halfContext.label)}</span></h4>
        </div>
        <div class="lookup-path-chips" aria-label="Lookup path">
          <span>${escapeHtml(section.role === "batter" ? "Batter" : "Catcher")}</span>
          <span>${section.inventory} left</span>
          <span>${escapeHtml(inningBand.shortLabel)}</span>
          <span>${escapeHtml(halfContext.label.replace(" Half", ""))}</span>
        </div>
      </div>
      <div class="table-wrap lookup-table-wrap">
        <table class="lookup-table">
          <thead>
            <tr>
              <th>Outs</th>
              <th>Runners</th>
              ${SCORE_BANDS.map((band) => `<th title="${escapeHtml(band.label)}">${escapeHtml(band.shortLabel)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function binderIndexHtml() {
  return ROLE_INVENTORY_SECTIONS.map((section, sectionIndex) => `
    <div class="binder-index-group">
      <h4>${escapeHtml(section.title)}</h4>
      <div class="binder-index-links">
        ${INNING_BANDS.flatMap((inningBand, inningIndex) =>
          HALF_CONTEXTS.map((halfContext, halfIndex) => {
            const currentPageNumber = pageNumber(sectionIndex, inningIndex, halfIndex);
            const currentPageId = pageId(section, inningBand, halfContext);
            const isActivePage = currentPageNumber === 1;
            return `
            <button class="${isActivePage ? "active" : ""}" type="button" data-lookup-target="${escapeHtml(currentPageId)}" aria-pressed="${isActivePage ? "true" : "false"}">
              <span>${pageNumber(sectionIndex, inningIndex, halfIndex)}</span>
              ${escapeHtml(inningBand.shortLabel)} ${escapeHtml(halfContext.key === "top" ? "Top" : "Bot")}
            </button>
          `;
          }),
        ).join("")}
      </div>
    </div>
  `).join("");
}

function guideLookupBookMarkdown(config) {
  const lines = [
    "## Dugout Lookup Book",
    "",
    "Use this when the coach does not have live win probability. Pick the role, challenges left, inning half, score column, outs, and runner row.",
    "",
    "Score columns are from the team receiving the recommendation:",
    "",
    "```text",
    "D4+ = my team down 4 or more",
    "D2-3 = my team down 2-3",
    "D1 = my team down 1",
    "Tie = tied game",
    "U1 = my team up 1",
    "U2-3 = my team up 2-3",
    "U4+ = my team up 4 or more",
    "```",
    "",
    "`No PA` appears only in bottom-of-ninth-or-later states where that side would not receive another plate appearance because the game would already be over.",
    "",
    "The lookup book is regenerated from the active model settings. Exact-state live recommendations supersede the book when available.",
    "",
  ];

  for (const section of ROLE_INVENTORY_SECTIONS) {
    lines.push(`### ${section.title}`, "");
    for (const inningBand of INNING_BANDS) {
      for (const halfContext of HALF_CONTEXTS) {
        lines.push(guideLookupMarkdown(config, section.role, section.inventory, inningBand, halfContext), "");
      }
    }
  }

  return lines.join("\n");
}

function guideLookupBookHtml(config) {
  const sections = ROLE_INVENTORY_SECTIONS.map((section, sectionIndex) => `
    <section class="lookup-role-section${sectionIndex === 0 ? " active" : ""}">
      <div class="lookup-role-heading">
        <div>
          <span>Chapter ${sectionIndex + 1}</span>
          <h3>${escapeHtml(section.title)}</h3>
        </div>
        <p>Use the score column from the team receiving this recommendation.</p>
      </div>
      <div class="lookup-page-grid">
        ${INNING_BANDS.flatMap((inningBand, inningIndex) =>
          HALF_CONTEXTS.map((halfContext, halfIndex) =>
            guideLookupHtml(config, section, sectionIndex, inningBand, inningIndex, halfContext, halfIndex),
          ),
        ).join("")}
      </div>
    </section>
  `).join("");

  return `
    <section class="guide-section lookup-book">
      <div class="lookup-book-heading">
        <div>
          <h3>Dugout Lookup Book</h3>
          <p>Pick role, inventory, inning half, score, outs, and runners. The chart regenerates from the active settings.</p>
        </div>
        <dl class="score-key">
          ${SCORE_BANDS.map((band) => `<div><dt>${escapeHtml(band.shortLabel)}</dt><dd>${escapeHtml(band.label)}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="lookup-read-path">
        <strong>Lookup path</strong>
        <span>Role -> challenges left -> inning half -> score column -> outs -> runners</span>
      </div>
      <div class="binder-shell">
        <aside class="binder-index" aria-label="Dugout lookup binder index">
          <div class="binder-index-title">
            <span>Binder Index</span>
            <strong>Pick the page first</strong>
          </div>
          ${binderIndexHtml()}
        </aside>
        <div class="binder-pages">
          ${sections}
        </div>
      </div>
    </section>
  `;
}

export function generateGuideHtml(configInput = {}) {
  const config = mergeConfig(configInput);
  const cc = config.challengeCost;
  const assumptions = guideAssumptions(config);

  return `
    <article class="guide-sheet">
      <header class="guide-sheet-header">
        <div>
          <span class="guide-label">Staff Sheet</span>
          <h2>ABS Challenge Guide</h2>
          <p>Set the level before the plate appearance. Players only decide whether they strongly believe the call was missed.</p>
        </div>
        <div class="guide-assumption-stack" aria-label="Model assumptions">
          <span>Batter ${escapeHtml(formatPercent(config.successRates.batter))}</span>
          <span>Catcher ${escapeHtml(formatPercent(config.successRates.catcher))}</span>
          <span>Base cost ${escapeHtml(cc.baseWpPoints.toFixed(2))} WP pts</span>
        </div>
      </header>

      <section class="guide-section">
        <h3>Player Call</h3>
        <div class="guide-level-grid">
          <div class="guide-level-card closed">
            <span>Closed</span>
            <strong>Only unmistakable misses.</strong>
            <p>Default preserve mode.</p>
          </div>
          <div class="guide-level-card full-count">
            <span>Full Count</span>
            <strong>Only 3-2.</strong>
            <p>Cleanest hitter instruction.</p>
          </div>
          <div class="guide-level-card deep-count">
            <span>Deep Count</span>
            <strong>Two strikes or three balls.</strong>
            <p>Catchers can use count detail.</p>
          </div>
          <div class="guide-level-card open">
            <span>Open</span>
            <strong>Any strong read.</strong>
            <p>Not speculative.</p>
          </div>
        </div>
      </section>

      ${guideLookupBookHtml(config)}

      <section class="guide-section guide-two-col">
        <div>
          <h3>How To Use</h3>
          <ul class="guide-list">
            <li><strong>Step 1</strong><span>Choose batter or catcher and challenges left.</span></li>
            <li><strong>Step 2</strong><span>Go to the inning-half page.</span></li>
            <li><strong>Step 3</strong><span>Use my-team score column, outs, and runners.</span></li>
            <li><strong>Step 4</strong><span>Give the player only the level, not the math.</span></li>
          </ul>
        </div>
        <div>
          <h3>Model Snapshot</h3>
          <dl class="guide-settings">
            ${assumptions.map(([key, value]) => `
              <div>
                <dt>${escapeHtml(key)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `).join("")}
          </dl>
        </div>
      </section>

      <section class="guide-section compact-notes">
        <h3>Staff Notes</h3>
        <p>Open means the count gate is open only if the player has a strong read. The book regenerates from the active model settings. Exact-state app recommendations supersede the book.</p>
      </section>
    </article>
  `;
}

export function generateGuideMarkdown(configInput = {}) {
  const config = mergeConfig(configInput);
  const assumptions = guideAssumptions(config);
  return `# ABS Challenge Coaching Guide

## Staff Quick Card

Set the level before the plate appearance. Players only decide whether they strongly believe the call was missed.

| Level | Player Rule | Staff Reminder |
|---|---|---|
| Closed | Only unmistakable misses. | Preserve unless the miss is obvious. |
| Full Count | Only 3-2. | Cleanest hitter instruction. |
| Deep Count | Any two-strike or three-ball count. | Catchers can use count detail. |
| Open | Any strong read. | Not speculative. |

${guideLookupBookMarkdown(config)}

## Model Snapshot

\`\`\`text
${assumptions.map(([key, value]) => `${key}: ${value}`).join("\n")}
\`\`\`

## Caveats

Open does not mean speculative. It means the count gate is open only if the player has a strong read.

The book regenerates from the active model settings. Exact-state app recommendations supersede the book.

Raw challenge success rates are behavioral rates, not pure skill estimates. Teams should override them when they have a better player-specific read.

## Adjustable Inputs

\`\`\`text
Win expectancy source
Batter/catcher/player success probabilities
C_base_WP
Inventory factors
Remaining game factors
Current win probability factors
Level assignment thresholds
\`\`\`
`;
}
