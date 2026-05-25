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
    model: "v1",
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
    depletionV15: {
      candidateRatePerTeamOut: {
        batter: 0.424,
        catcher: 0.455,
      },
      futureSuccessRate: {
        batter: 0.47,
      },
      futureOutShare: 0.5,
      inventoryPremium: {
        2: 1.0,
        1: 2.0,
      },
      averageFutureWp: [
        { max: 0.10, value: 0.0080, label: "0-10%" },
        { max: 0.30, value: 0.0200, label: "10-30%" },
        { max: 0.70, value: 0.0280, label: "30-70%" },
        { max: 0.90, value: 0.0200, label: "70-90%" },
        { max: 1.00, value: 0.0080, label: "90-100%" },
      ],
    },
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

const LEVELS = ["No-Brainers", "Full Count", "Deep Count", "Aggressive"];
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

const STANDARD_SCORE_BANDS = [
  {
    key: "down4",
    label: "Down 4+",
    shortLabel: "D4+",
    anchor: 0.08,
    modifier: { early: 0, middle: 1, seventh: 2, eighth: 2, late: 3 },
  },
  {
    key: "down23",
    label: "Down 2-3",
    shortLabel: "D2-3",
    anchor: 0.22,
    modifier: { early: 0, middle: 0, seventh: 1, eighth: 1, late: 2 },
  },
  {
    key: "down1",
    label: "Down 1",
    shortLabel: "D1",
    anchor: 0.38,
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 1, late: 1 },
  },
  {
    key: "tie",
    label: "Tie",
    shortLabel: "Tie",
    anchor: 0.5,
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 0, late: 1 },
  },
  {
    key: "up1",
    label: "Up 1",
    shortLabel: "U1",
    anchor: 0.62,
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 0, late: 1 },
  },
  {
    key: "up23",
    label: "Up 2-3",
    shortLabel: "U2-3",
    anchor: 0.78,
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 1, late: 2 },
  },
  {
    key: "up4",
    label: "Up 4+",
    shortLabel: "U4+",
    anchor: 0.92,
    modifier: { early: 0, middle: 1, seventh: 1, eighth: 2, late: 3 },
  },
];

const DETAILED_SCORE_BANDS = [
  {
    key: "down5",
    label: "Down 5",
    shortLabel: "D5",
    anchor: 0.05,
    modifier: { early: 0, middle: 1, seventh: 2, eighth: 2, late: 3 },
  },
  {
    key: "down4",
    label: "Down 4",
    shortLabel: "D4",
    anchor: 0.10,
    modifier: { early: 0, middle: 1, seventh: 2, eighth: 2, late: 3 },
  },
  {
    key: "down3",
    label: "Down 3",
    shortLabel: "D3",
    anchor: 0.16,
    modifier: { early: 0, middle: 1, seventh: 1, eighth: 2, late: 2 },
  },
  {
    key: "down2",
    label: "Down 2",
    shortLabel: "D2",
    anchor: 0.25,
    modifier: { early: 0, middle: 0, seventh: 1, eighth: 1, late: 2 },
  },
  STANDARD_SCORE_BANDS[2],
  STANDARD_SCORE_BANDS[3],
  STANDARD_SCORE_BANDS[4],
  {
    key: "up2",
    label: "Up 2",
    shortLabel: "U2",
    anchor: 0.75,
    modifier: { early: 0, middle: 0, seventh: 0, eighth: 1, late: 2 },
  },
  {
    key: "up3",
    label: "Up 3",
    shortLabel: "U3",
    anchor: 0.84,
    modifier: { early: 0, middle: 1, seventh: 1, eighth: 1, late: 2 },
  },
  {
    key: "up4",
    label: "Up 4",
    shortLabel: "U4",
    anchor: 0.90,
    modifier: { early: 0, middle: 1, seventh: 1, eighth: 2, late: 3 },
  },
  {
    key: "up5",
    label: "Up 5",
    shortLabel: "U5",
    anchor: 0.95,
    modifier: { early: 0, middle: 1, seventh: 1, eighth: 2, late: 3 },
  },
];

const SCORE_BANDS = STANDARD_SCORE_BANDS;

const GUIDE_COUNT_BASE_VALUE = {
  "0-0": 0.008,
  "0-1": 0.010,
  "0-2": 0.013,
  "1-0": 0.010,
  "1-1": 0.013,
  "1-2": 0.018,
  "2-0": 0.014,
  "2-1": 0.019,
  "2-2": 0.027,
  "3-0": 0.020,
  "3-1": 0.037,
  "3-2": 0.058,
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

const LEVEL_CLASS = {
  "No-Brainers": "no-brainers",
  "Full Count": "full-count",
  "Deep Count": "deep-count",
  Aggressive: "aggressive",
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
    const pending = fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Savant request failed: ${response.status}`);
      }

      const rows = await response.json();
      return new Map(
        rows.map((row) => [`${row.ball_count}-${row.strike_count}`, row]),
      );
    });

    this.cache.set(key, pending);
    this.requests += 1;

    try {
      const byCount = await pending;
      this.cache.set(key, byCount);
      return byCount;
    } catch (error) {
      this.cache.delete(key);
      throw error;
    }
  }
}

export class PrecomputedGuideClient {
  constructor(data, fallbackClient = null) {
    this.tables = data?.tables ?? {};
    this.cache = new Map();
    this.fallbackClient = fallbackClient;
    this.requests = 0;
  }

  async fetchTable(state) {
    const key = tableKey(state);
    if (this.cache.has(key)) return this.cache.get(key);

    const rows = this.tables[key];
    if (rows) {
      const table = new Map(
        rows.map((row) => [`${row.ball_count}-${row.strike_count}`, row]),
      );
      this.cache.set(key, table);
      return table;
    }

    if (!this.fallbackClient) return null;
    return this.fallbackClient.fetchTable(state);
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

function totalOutsElapsed(state) {
  const completedInnings = Math.max(0, state.inning - 1);
  const halfOffset = state.half === "Bottom" ? 3 : 0;
  return Math.min(54, (completedInnings * 6) + halfOffset + state.outs);
}

function regulationOutsRemaining(state) {
  return Math.max(0, 54 - totalOutsElapsed(state));
}

function cleanPositiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function cleanProbability(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, 1);
}

function poissonPmf(lambda, max = 80) {
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

function averageFutureWpValue(config, teamWp) {
  const rows = config.challengeCost.depletionV15?.averageFutureWp ?? [];
  const exact = rows.find((row) => row.exact != null && Math.abs(teamWp - row.exact) < 1e-12);
  if (exact) return cleanPositiveNumber(exact.value, 0);
  const match = rows.find((row) => row.max != null && teamWp <= row.max);
  return cleanPositiveNumber(match?.value ?? rows.at(-1)?.value, 0);
}

function currentWpFactorBucketKey(config, teamWp) {
  const rows = config.challengeCost.currentWpFactor;
  const exactIndex = rows.findIndex((row) => row.exact != null && Math.abs(teamWp - row.exact) < 1e-12);
  if (exactIndex >= 0) return `exact:${exactIndex}`;
  const index = rows.findIndex((row) => row.max != null && teamWp <= row.max);
  return `bucket:${index >= 0 ? index : rows.length - 1}`;
}

function averageFutureWpBucketKey(config, teamWp) {
  const rows = config.challengeCost.depletionV15?.averageFutureWp ?? [];
  const exactIndex = rows.findIndex((row) => row.exact != null && Math.abs(teamWp - row.exact) < 1e-12);
  if (exactIndex >= 0) return `exact:${exactIndex}`;
  const index = rows.findIndex((row) => row.max != null && teamWp <= row.max);
  return `bucket:${index >= 0 ? index : rows.length - 1}`;
}

function futureRoleSuccessRate(config, role) {
  const settings = config.challengeCost.depletionV15 ?? {};
  const explicit = settings.futureSuccessRate?.[role];
  if (explicit != null) return cleanProbability(explicit, DEFAULT_CONFIG.successRates[role]);
  if (role === "batter") return DEFAULT_CONFIG.successRates.batter;
  return cleanProbability(config.successRates.catcher, DEFAULT_CONFIG.successRates.catcher);
}

function futureChallengeMix(config) {
  const settings = config.challengeCost.depletionV15 ?? {};
  const batterRate = cleanPositiveNumber(settings.candidateRatePerTeamOut?.batter, 0);
  const catcherRate = cleanPositiveNumber(settings.candidateRatePerTeamOut?.catcher, 0);
  const totalRate = batterRate + catcherRate;
  if (totalRate <= 0) {
    return {
      candidateRate: 0,
      successRate: DEFAULT_CONFIG.successRates.batter,
    };
  }

  const successRate = (
    (batterRate * futureRoleSuccessRate(config, "batter"))
    + (catcherRate * futureRoleSuccessRate(config, "catcher"))
  ) / totalRate;

  return { candidateRate: totalRate, successRate };
}

const depletionOpportunityCache = new Map();

function depletionOpportunityKey(config, inventory, state) {
  const settings = config.challengeCost.depletionV15 ?? {};
  const futureOutShare = cleanPositiveNumber(settings.futureOutShare, 0.5);
  const futureMix = futureChallengeMix(config);
  const futureTeamOuts = regulationOutsRemaining(state) * futureOutShare;

  return {
    key: [
      inventory,
      futureTeamOuts.toFixed(3),
      futureMix.candidateRate.toFixed(6),
      futureMix.successRate.toFixed(6),
    ].join("|"),
    lambda: futureTeamOuts * futureMix.candidateRate,
    successRate: futureMix.successRate,
  };
}

function depletionOpportunityLoss(config, inventory, state) {
  const entry = depletionOpportunityKey(config, inventory, state);
  if (depletionOpportunityCache.has(entry.key)) return depletionOpportunityCache.get(entry.key);

  const missAfterFailure = expectedMissedFutureOpportunities(
    entry.lambda,
    Math.max(0, inventory - 1),
    entry.successRate,
  );
  const missWithoutFailure = expectedMissedFutureOpportunities(
    entry.lambda,
    inventory,
    entry.successRate,
  );
  const loss = {
    extraMissedCandidates: Math.max(0, missAfterFailure - missWithoutFailure),
    successRate: entry.successRate,
  };

  depletionOpportunityCache.set(entry.key, loss);
  return loss;
}

function depletionV15ChallengeCost(config, role, inventory, failedOutcome, failedBattingWp) {
  if (failedOutcome.gameOverValue != null) return 0;
  if (!failedOutcome.state) return null;

  const teamWp = role === "batter" ? failedBattingWp : 1 - failedBattingWp;
  const settings = config.challengeCost.depletionV15 ?? {};
  const loss = depletionOpportunityLoss(config, inventory, failedOutcome.state);

  return loss.extraMissedCandidates
    * loss.successRate
    * averageFutureWpValue(config, teamWp)
    * cleanPositiveNumber(settings.inventoryPremium?.[inventory], 1);
}

function failedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp) {
  if (config.challengeCost.model === "depletionV15") {
    return depletionV15ChallengeCost(config, role, inventory, failedOutcome, failedBattingWp);
  }

  if (failedOutcome.gameOverValue != null) return 0;
  const inv = inventoryFactor(config, inventory);
  if (inv == null || !failedOutcome.state) return null;

  const teamWp = role === "batter" ? failedBattingWp : 1 - failedBattingWp;
  return (config.challengeCost.baseWpPoints / 100)
    * inv
    * remainingGameFactor(config, failedOutcome.state.inning)
    * currentWpFactor(config, teamWp);
}

function cachedFailedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp, costCache) {
  if (!costCache || failedOutcome.gameOverValue != null || !failedOutcome.state) {
    return failedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp);
  }

  const teamWp = role === "batter" ? failedBattingWp : 1 - failedBattingWp;
  const wpBucket = config.challengeCost.model === "depletionV15"
    ? averageFutureWpBucketKey(config, teamWp)
    : currentWpFactorBucketKey(config, teamWp);
  const key = [
    config.challengeCost.model,
    role,
    inventory,
    failedOutcome.state.inning,
    failedOutcome.state.half,
    failedOutcome.state.outs,
    failedOutcome.state.bases,
    wpBucket,
  ].join("|");

  if (costCache.has(key)) return costCache.get(key);
  const cost = failedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp);
  costCache.set(key, cost);
  return cost;
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

  let level = "No-Brainers";
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
    level = "Aggressive";
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

function isUnavailableBottomLate(role, inningKey, halfKey, scoreBand) {
  if (inningKey !== "late" || halfKey !== "bottom") return false;
  if (role === "batter") return scoreBand.key.startsWith("up");
  return scoreBand.key.startsWith("down");
}

function safeNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function estimatedGuideTeamWp(role, inningKey, scoreBand, bases, outs) {
  const scoreAnchor = scoreBand.anchor ?? 0.5;
  const pull = INNING_WP_PULL[inningKey] ?? 1;
  const scoreWp = 0.5 + ((scoreAnchor - 0.5) * pull);
  const runnerPressure = (BASE_WP_PRESSURE[bases] ?? 0) * (outs === 0 ? 1 : outs === 1 ? 0.65 : 0.3);
  const runnerDirection = role === "batter" ? 1 : -1;
  return clamp(scoreWp + (runnerPressure * runnerDirection), 0.01, 0.99);
}

function representativeGuideInning(inningKey) {
  if (inningKey === "early") return 2;
  if (inningKey === "middle") return 5;
  if (inningKey === "seventh") return 7;
  if (inningKey === "eighth") return 8;
  return 9;
}

function representativeGuideState(inningKey, halfKey, outs) {
  return {
    inning: representativeGuideInning(inningKey),
    half: halfKey === "bottom" ? "Bottom" : "Top",
    outs,
  };
}

function v1GuideChallengeCost(config, inventory, inningKey, teamWp) {
  const inv = inventoryFactor(config, inventory);
  if (inv == null) return 0;

  return (config.challengeCost.baseWpPoints / 100)
    * inv
    * remainingGameFactor(config, representativeGuideInning(inningKey))
    * currentWpFactor(config, teamWp);
}

function v15GuideChallengeCost(config, role, inventory, inningKey, halfKey, outs, teamWp) {
  const settings = config.challengeCost.depletionV15 ?? {};
  const state = representativeGuideState(inningKey, halfKey, outs);
  const loss = depletionOpportunityLoss(config, inventory, state);

  return loss.extraMissedCandidates
    * loss.successRate
    * averageFutureWpValue(config, teamWp)
    * cleanPositiveNumber(settings.inventoryPremium?.[inventory], 1);
}

function guideChallengeCost(config, role, inventory, inningKey, halfKey, outs, teamWp) {
  if (config.challengeCost.model === "depletionV15") {
    return v15GuideChallengeCost(config, role, inventory, inningKey, halfKey, outs, teamWp);
  }

  return v1GuideChallengeCost(config, inventory, inningKey, teamWp);
}

function guideInningLeverage(inningKey) {
  if (inningKey === "early") return 0.95;
  if (inningKey === "middle") return 1.12;
  if (inningKey === "seventh") return 1.58;
  if (inningKey === "eighth") return 1.82;
  return 2.05;
}

function guideScoreLeverage(teamWp) {
  const pressure = Math.sin(Math.PI * clamp(teamWp, 0.01, 0.99));
  const closeness = Math.pow(Math.max(0.01, pressure), 1.1);
  const protectingValue = teamWp > 0.5 ? 1 + ((teamWp - 0.5) * 0.65) : 1;
  return clamp(closeness * protectingValue, 0.06, 1.28);
}

function guideBaseLeverage(bases, outs) {
  const basePressure = BASE_WP_PRESSURE[bases] ?? 0;
  const outFactor = outs === 0 ? 2.3 : outs === 1 ? 1.55 : 1.0;
  return clamp(1 + (basePressure * outFactor), 0.85, 1.32);
}

function guideHalfLeverage(inningKey, halfKey) {
  if (halfKey === "bottom" && ["seventh", "eighth", "late"].includes(inningKey)) return 1.08;
  return 1;
}

function guideOverturnValue(count, role, inningKey, halfKey, scoreBand, bases, outs) {
  const baseValue = GUIDE_COUNT_BASE_VALUE[countKey(count)] ?? GUIDE_COUNT_BASE_VALUE["0-0"];
  const teamWp = estimatedGuideTeamWp(role, inningKey, scoreBand, bases, outs);
  return baseValue
    * guideInningLeverage(inningKey)
    * guideScoreLeverage(teamWp)
    * guideBaseLeverage(bases, outs)
    * guideHalfLeverage(inningKey, halfKey);
}

function guideEvRows(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs) {
  const p = safeNumber(config.successRates[role], DEFAULT_CONFIG.successRates[role]);
  const teamWp = estimatedGuideTeamWp(role, inningKey, scoreBand, bases, outs);
  const c = guideChallengeCost(config, role, inventory, inningKey, halfKey, outs, teamWp);

  return COUNTS.map(([balls, strikes]) => {
    const count = { balls, strikes };
    const v = guideOverturnValue(count, role, inningKey, halfKey, scoreBand, bases, outs);
    const ev = p * v - (1 - p) * c;
    return {
      count: countKey(count),
      category: countCategory(count),
      v,
      c,
      p,
      requiredP: v + c === 0 ? 0 : c / (v + c),
      ev,
      positive: ev > 0,
    };
  });
}

function guideCellKey(role, inventory, inningKey, halfKey, scoreBand, bases, outs) {
  return [role, inventory, inningKey, halfKey, scoreBand.key, bases, outs].join("|");
}

function dugoutLevel(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs) {
  if (isUnavailableBottomLate(role, inningKey, halfKey, scoreBand)) return NO_PA;
  return recommendLevel(
    config,
    guideEvRows(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs),
  ).level;
}

function resolvedDugoutLevel(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs, levelMap) {
  const mappedLevel = levelMap?.get(guideCellKey(role, inventory, inningKey, halfKey, scoreBand, bases, outs));
  if (mappedLevel) return mappedLevel;
  return dugoutLevel(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs);
}

function scoreBandRunDiffs(scoreBand) {
  if (scoreBand.key === "down5") return [-5];
  if (scoreBand.key === "down4") return scoreBand.label.includes("+") ? [-4, -5] : [-4];
  if (scoreBand.key === "down3") return [-3];
  if (scoreBand.key === "down2") return [-2];
  if (scoreBand.key === "down23") return [-2, -3];
  if (scoreBand.key === "down1") return [-1];
  if (scoreBand.key === "tie") return [0];
  if (scoreBand.key === "up1") return [1];
  if (scoreBand.key === "up2") return [2];
  if (scoreBand.key === "up23") return [2, 3];
  if (scoreBand.key === "up3") return [3];
  if (scoreBand.key === "up4") return scoreBand.label.includes("+") ? [4, 5] : [4];
  if (scoreBand.key === "up5") return [5];
  return [0];
}

async function exactGuideRowsForState(client, config, role, inventory, state, costCache) {
  const p = config.successRates[role];
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
    const c = cachedFailedChallengeCost(config, role, inventory, failedOutcome, failedBattingWp, costCache);
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

  return rows;
}

async function exactDugoutLevel(client, config, role, inventory, inningKey, halfKey, scoreBand, bases, outs, costCache) {
  if (isUnavailableBottomLate(role, inningKey, halfKey, scoreBand)) return NO_PA;

  const inning = representativeGuideInning(inningKey);
  const half = halfKey === "bottom" ? "Bottom" : "Top";
  const rows = [];

  for (const teamRunDiff of scoreBandRunDiffs(scoreBand)) {
    const battingRunDiff = role === "catcher" ? -teamRunDiff : teamRunDiff;
    rows.push(...await exactGuideRowsForState(client, config, role, inventory, {
      inning,
      half,
      outs,
      bases,
      runDiff: battingRunDiff,
    }, costCache));
  }

  if (!rows.length) return dugoutLevel(config, role, inventory, inningKey, halfKey, scoreBand, bases, outs);
  return recommendLevel(config, rows).level;
}

async function mapWithConcurrency(items, limit, worker) {
  const workers = Array.from({ length: Math.min(limit, items.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += limit) {
      await worker(items[index]);
    }
  });
  await Promise.all(workers);
}

const GUIDE_LEVEL_MAP_CACHE_LIMIT = 24;
const guideLevelMapCacheByClient = new WeakMap();

function stableStringify(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(",")}}`;
}

function guideLevelMapCache(client) {
  if (!guideLevelMapCacheByClient.has(client)) {
    guideLevelMapCacheByClient.set(client, new Map());
  }
  return guideLevelMapCacheByClient.get(client);
}

function guideLevelMapCacheKey(config, options) {
  return stableStringify({
    config,
    options: {
      role: options.role,
      scoreMode: options.scoreMode,
    },
  });
}

async function buildExactGuideLevelMap(client, config, options) {
  const sections = guideSections(options);
  const scoreBands = guideScoreBands(options);
  const items = [];
  const costCache = new Map();

  for (const section of sections) {
    for (const inningBand of INNING_BANDS) {
      for (const halfContext of HALF_CONTEXTS) {
        for (const outs of [0, 1, 2]) {
          for (const baseState of BASE_STATES) {
            for (const scoreBand of scoreBands) {
              items.push({
                role: section.role,
                inventory: section.inventory,
                inningKey: inningBand.key,
                halfKey: halfContext.key,
                scoreBand,
                bases: baseState.bases,
                outs,
              });
            }
          }
        }
      }
    }
  }

  const levelMap = new Map();
  await mapWithConcurrency(items, 16, async (item) => {
    const level = await exactDugoutLevel(
      client,
      config,
      item.role,
      item.inventory,
      item.inningKey,
      item.halfKey,
      item.scoreBand,
      item.bases,
      item.outs,
      costCache,
    );
    levelMap.set(
      guideCellKey(item.role, item.inventory, item.inningKey, item.halfKey, item.scoreBand, item.bases, item.outs),
      level,
    );
  });

  return levelMap;
}

async function cachedExactGuideLevelMap(client, config, options) {
  const cache = guideLevelMapCache(client);
  const key = guideLevelMapCacheKey(config, options);
  if (cache.has(key)) {
    const cached = cache.get(key);
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const pending = buildExactGuideLevelMap(client, config, options);
  cache.set(key, pending);
  if (cache.size > GUIDE_LEVEL_MAP_CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }

  try {
    const levelMap = await pending;
    cache.set(key, levelMap);
    return levelMap;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
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

function challengeCostModelLabel(config) {
  return config.challengeCost.model === "depletionV15"
    ? "Shadow Zone v1.5"
    : "Conservative v1";
}

function guideAssumptions(config) {
  const cc = config.challengeCost;
  const common = [
    ["Challenge cost model", challengeCostModelLabel(config)],
    ["Batter success", formatPercent(config.successRates.batter)],
    ["Catcher success", formatPercent(config.successRates.catcher)],
    ["Deep Count positive-rate threshold", formatPercent(config.thresholds.deepCount.positiveRateMin)],
    ["Aggressive positive-rate threshold", formatPercent(config.thresholds.open.positiveRateMin)],
  ];

  if (cc.model === "depletionV15") {
    return [
      ...common,
      ["Batter Shadow Zone rate", formatFactor(cc.depletionV15.candidateRatePerTeamOut.batter)],
      ["Catcher Shadow Zone rate", formatFactor(cc.depletionV15.candidateRatePerTeamOut.catcher)],
      ["2 challenges left premium", formatFactor(cc.depletionV15.inventoryPremium[2])],
      ["1 challenge left premium", formatFactor(cc.depletionV15.inventoryPremium[1])],
    ];
  }

  return [
    ...common,
    ["Lost challenge baseline", cc.baseWpPoints.toFixed(1)],
    ["2 challenges left factor", formatFactor(cc.inventoryFactor[2])],
    ["1 challenge left factor", formatFactor(cc.inventoryFactor[1])],
  ];
}

function normalizeGuideOptions(input = {}) {
  const role = input.role === "batter" || input.role === "catcher" ? input.role : null;
  const label = typeof input.label === "string" ? input.label.trim() : "";
  const scoreMode = input.scoreMode === "detailed" ? "detailed" : "standard";
  return { role, label, scoreMode };
}

function guideRoleLabel(role) {
  if (role === "batter") return "Batter";
  if (role === "catcher") return "Catcher";
  return "Batter/Catcher";
}

function guideSections(options) {
  if (!options.role) return ROLE_INVENTORY_SECTIONS;
  return ROLE_INVENTORY_SECTIONS.filter((section) => section.role === options.role);
}

function guideScoreBands(options) {
  return options.scoreMode === "detailed" ? DETAILED_SCORE_BANDS : STANDARD_SCORE_BANDS;
}

function guideTitle(options) {
  if (options.label) return options.label;
  if (options.role) return `${guideRoleLabel(options.role)} ABS Challenge Guide`;
  return "ABS Challenge Guide";
}

function guideHeaderLabel(options) {
  const roleLabel = guideRoleLabel(options.role);
  return options.label ? `${roleLabel} / ${options.label}` : roleLabel;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function scoreHeaderMarkdown(scoreBands) {
  return scoreBands.map((band) => band.shortLabel).join(" | ");
}

function pageId(section, inningBand, halfContext) {
  return `lookup-${section.role}-${section.inventory}-${inningBand.key}-${halfContext.key}`;
}

function pageNumber(sectionIndex, inningIndex, halfIndex) {
  return (sectionIndex * INNING_BANDS.length * HALF_CONTEXTS.length) + (inningIndex * HALF_CONTEXTS.length) + halfIndex + 1;
}

function guideLookupMarkdown(config, role, inventory, inningBand, halfContext, scoreBands, levelMap) {
  const lines = [
    `#### ${inningBand.label} - ${halfContext.label}`,
    "",
    `| Outs | Runners | ${scoreHeaderMarkdown(scoreBands)} |`,
    `|---:|---|${scoreBands.map(() => "---").join("|")}|`,
  ];

  for (const outs of [0, 1, 2]) {
    for (const baseState of BASE_STATES) {
      const levels = scoreBands.map((scoreBand) =>
        resolvedDugoutLevel(config, role, inventory, inningBand.key, halfContext.key, scoreBand, baseState.bases, outs, levelMap),
      );
      lines.push(`| ${outs} | ${baseState.label} | ${levels.join(" | ")} |`);
    }
  }

  return lines.join("\n");
}

function guideLookupHtml(
  config,
  section,
  sectionIndex,
  inningBand,
  inningIndex,
  halfContext,
  halfIndex,
  scoreBands,
  levelMap,
  activePageId = null,
) {
  const rows = [];
  for (const outs of [0, 1, 2]) {
    for (const baseState of BASE_STATES) {
      const cells = scoreBands.map((scoreBand) => {
        const level = resolvedDugoutLevel(config, section.role, section.inventory, inningBand.key, halfContext.key, scoreBand, baseState.bases, outs, levelMap);
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
  const isActivePage = activePageId ? currentPageId === activePageId : currentPageNumber === 1;

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
              ${scoreBands.map((band) => `<th title="${escapeHtml(band.label)}">${escapeHtml(band.shortLabel)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function binderIndexHtml(sections) {
  return sections.map((section, sectionIndex) => `
    <div class="binder-index-group">
      <h4>${escapeHtml(section.title)}</h4>
      <div class="binder-index-links">
        ${INNING_BANDS.flatMap((inningBand, inningIndex) =>
          HALF_CONTEXTS.map((halfContext, halfIndex) => {
            const currentPageNumber = pageNumber(sectionIndex, inningIndex, halfIndex);
            const currentPageId = pageId(section, inningBand, halfContext);
            const isActivePage = currentPageNumber === 1;
            return `
            <button class="${isActivePage ? "active" : ""}" type="button" data-lookup-target="${escapeHtml(currentPageId)}" data-lookup-role="${escapeHtml(section.role)}" data-lookup-inventory="${section.inventory}" data-lookup-inning="${escapeHtml(inningBand.key)}" data-lookup-half="${escapeHtml(halfContext.key)}" aria-pressed="${isActivePage ? "true" : "false"}">
              ${escapeHtml(inningBand.shortLabel)} ${escapeHtml(halfContext.key === "top" ? "Top" : "Bot")}
            </button>
          `;
          }),
        ).join("")}
      </div>
    </div>
  `).join("");
}

function guideLookupBookMarkdown(config, options, levelMap) {
  const sections = guideSections(options);
  const scoreBands = guideScoreBands(options);
  const roleCopy = options.role ? "Pick challenges left, inning half, score column, outs, and runner row." : "Pick the role, challenges left, inning half, score column, outs, and runner row.";
  const scoreLines = scoreBands.map((band) => {
    const label = band.label.toLowerCase().replace("+", " or more");
    const side = band.label === "Tie" ? "tied game" : `my team ${label}`;
    return `${band.shortLabel} = ${side}`;
  });
  const lines = [
    "## Dugout Lookup Book",
    "",
    `Use this when the coach does not have live win probability. ${roleCopy}`,
    "",
    "Score columns are from the team receiving the recommendation:",
    "",
    "```text",
    ...scoreLines,
    "```",
    "",
    "`No PA` appears only in bottom-of-ninth-or-later states where that side would not receive another plate appearance because the game would already be over.",
    "",
    "The lookup book is regenerated from the active model settings. Exact-state live recommendations supersede the book when available.",
    "",
  ];

  for (const section of sections) {
    lines.push(`### ${section.title}`, "");
    for (const inningBand of INNING_BANDS) {
      for (const halfContext of HALF_CONTEXTS) {
        lines.push(guideLookupMarkdown(config, section.role, section.inventory, inningBand, halfContext, scoreBands, levelMap), "");
      }
    }
  }

  return lines.join("\n");
}

function guideLookupBookHtml(config, options, levelMap, renderOptions = {}) {
  const selectedSections = guideSections(options);
  const scoreBands = guideScoreBands(options);
  const initialPageId = pageId(selectedSections[0], INNING_BANDS[0], HALF_CONTEXTS[0]);
  const roleCopy = options.role ? "Pick inventory, inning half, score, outs, and runners." : "Pick role, inventory, inning half, score, outs, and runners.";
  const pathCopy = options.role ? "challenges left -> inning half -> score column -> outs -> runners" : "role -> challenges left -> inning half -> score column -> outs -> runners";
  const sections = selectedSections.map((section, sectionIndex) => `
    <section class="lookup-role-section${sectionIndex === 0 ? " active" : ""}" data-lookup-section="${escapeHtml(`${section.role}-${section.inventory}`)}">
      <div class="lookup-role-heading">
        <div>
          <span>Chapter ${sectionIndex + 1}</span>
          <h3>${escapeHtml(section.title)}</h3>
        </div>
        <p>Use the score column from the team receiving this recommendation.</p>
      </div>
      <div class="lookup-page-grid" data-lookup-page-grid>
        ${INNING_BANDS.flatMap((inningBand, inningIndex) =>
          HALF_CONTEXTS.map((halfContext, halfIndex) => {
            const currentPageId = pageId(section, inningBand, halfContext);
            if (renderOptions.lazy && currentPageId !== initialPageId) return "";
            return guideLookupHtml(
              config,
              section,
              sectionIndex,
              inningBand,
              inningIndex,
              halfContext,
              halfIndex,
              scoreBands,
              levelMap,
              initialPageId,
            );
          }),
        ).join("")}
      </div>
    </section>
  `).join("");

  return `
    <section class="guide-section lookup-book">
      <div class="lookup-book-heading">
        <div>
          <h3>Dugout Lookup Book</h3>
          <p>${escapeHtml(roleCopy)} The chart regenerates from the active settings.</p>
        </div>
        <dl class="score-key">
          ${scoreBands.map((band) => `<div><dt>${escapeHtml(band.shortLabel)}</dt><dd>${escapeHtml(band.label)}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="lookup-read-path">
        <strong>Lookup path</strong>
        <span>${escapeHtml(pathCopy)}</span>
      </div>
      <div class="binder-shell">
        <aside class="binder-index" aria-label="Dugout lookup binder index">
          <div class="binder-index-title">
            <span>Binder Index</span>
            <strong>Pick the page first</strong>
          </div>
          ${binderIndexHtml(selectedSections)}
        </aside>
        <div class="binder-pages">
          ${sections}
        </div>
      </div>
    </section>
  `;
}

export function generateGuideHtml(configInput = {}, optionsInput = {}, levelMap = null, renderOptions = {}) {
  const config = mergeConfig(configInput);
  const options = normalizeGuideOptions(optionsInput);
  const cc = config.challengeCost;
  const assumptions = guideAssumptions(config);
  const costModel = challengeCostModelLabel(config);
  const headerAssumptions = options.role
    ? [
      [`${guideRoleLabel(options.role)} ${formatPercent(config.successRates[options.role])}`],
      [`Cost model: ${costModel}`],
      [cc.model === "depletionV15"
        ? `Last challenge premium: ${formatFactor(cc.depletionV15.inventoryPremium[1])}x`
        : `Lost Challenge baseline: ${cc.baseWpPoints.toFixed(1)}`],
    ]
    : [
      [`Batter ${formatPercent(config.successRates.batter)}`],
      [`Catcher ${formatPercent(config.successRates.catcher)}`],
      [`Cost model: ${costModel}`],
    ];

  return `
    <article class="guide-sheet">
      <header class="guide-sheet-header">
        <div>
          <span class="guide-label">${escapeHtml(guideHeaderLabel(options))}</span>
          <h2>${escapeHtml(guideTitle(options))}</h2>
          <p>Set the mode before the plate appearance. Players do not calculate expected value in real time; they follow the mode.</p>
        </div>
        <div class="guide-assumption-stack" aria-label="Model assumptions">
          ${headerAssumptions.map(([value]) => `<span>${escapeHtml(value)}</span>`).join("")}
        </div>
      </header>

      <section class="guide-section">
        <h3>Player Call</h3>
        <div class="guide-level-grid">
          <div class="guide-level-card no-brainers">
            <span>No-Brainers</span>
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
            <p>Broader count gate.</p>
          </div>
          <div class="guide-level-card aggressive">
            <span>Aggressive</span>
            <strong>Any close pitch.</strong>
            <p>Situation supports the risk.</p>
          </div>
        </div>
      </section>

      ${guideLookupBookHtml(config, options, levelMap, renderOptions)}

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
        <p>The book regenerates from the active model settings. Exact-state app recommendations supersede the book.</p>
      </section>
    </article>
  `;
}

export function generateGuideMarkdown(configInput = {}, optionsInput = {}, levelMap = null) {
  return generateGuideMarkdownWithOptions(configInput, optionsInput, levelMap);
}

export function generateGuideMarkdownWithOptions(configInput = {}, optionsInput = {}, levelMap = null) {
  const config = mergeConfig(configInput);
  const options = normalizeGuideOptions(optionsInput);
  const assumptions = guideAssumptions(config);
  const roleLine = options.role ? `Role: ${guideRoleLabel(options.role)}\n` : "";
  const labelLine = options.label ? `Label: ${options.label}\n` : "";

  return `# ${guideTitle(options)}

${labelLine}${roleLine}

## Staff Quick Card

Set the mode before the plate appearance. Players do not calculate expected value in real time; they follow the mode.

| Level | Player Rule | Staff Reminder |
|---|---|---|
| No-Brainers | Only unmistakable misses. | Preserve unless the miss is obvious. |
| Full Count | Only 3-2. | Cleanest hitter instruction. |
| Deep Count | Any two-strike or three-ball count. | Broader count gate. |
| Aggressive | Any close pitch. | Situation supports the risk. |

${guideLookupBookMarkdown(config, options, levelMap)}

## Model Snapshot

\`\`\`text
${assumptions.map(([key, value]) => `${key}: ${value}`).join("\n")}
\`\`\`

## Caveats

The book regenerates from the active model settings. Exact-state app recommendations supersede the book.

Raw challenge success rates are behavioral rates, not pure skill estimates. Teams should override them when they have a better player-specific read.

## Adjustable Inputs

\`\`\`text
Win expectancy source
Batter/catcher/player success probabilities
Challenge cost model
C_base_WP
Inventory factors
Remaining game factors
Current win probability factors
Level assignment thresholds
\`\`\`
`;
}

export function generateGuideCsv(configInput = {}, optionsInput = {}, levelMap = null) {
  const config = mergeConfig(configInput);
  const options = normalizeGuideOptions(optionsInput);
  const scoreBands = guideScoreBands(options);
  const rows = [
    [
      "label",
      "role",
      "challenges_left",
      "inning_band",
      "half",
      "score_column",
      "score_description",
      "outs",
      "runners",
      "recommendation",
    ],
  ];

  for (const section of guideSections(options)) {
    for (const inningBand of INNING_BANDS) {
      for (const halfContext of HALF_CONTEXTS) {
        for (const outs of [0, 1, 2]) {
          for (const baseState of BASE_STATES) {
            for (const scoreBand of scoreBands) {
              rows.push([
                options.label,
                guideRoleLabel(section.role),
                section.inventory,
                inningBand.label,
                halfContext.label,
                scoreBand.shortLabel,
                scoreBand.label,
                outs,
                baseState.label,
                resolvedDugoutLevel(config, section.role, section.inventory, inningBand.key, halfContext.key, scoreBand, baseState.bases, outs, levelMap),
              ]);
            }
          }
        }
      }
    }
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export async function generateGuideArtifacts(
  client,
  configInput = {},
  optionsInput = {},
  formats = ["markdown", "html", "csv"],
  renderOptions = {},
) {
  const config = mergeConfig(configInput);
  const options = normalizeGuideOptions(optionsInput);
  const levelMap = await cachedExactGuideLevelMap(client, config, options);
  const requested = new Set(formats);
  const artifacts = {};

  if (requested.has("markdown")) artifacts.markdown = generateGuideMarkdown(config, options, levelMap);
  if (requested.has("html")) artifacts.html = generateGuideHtml(config, options, levelMap, renderOptions);
  if (requested.has("csv")) artifacts.csv = generateGuideCsv(config, options, levelMap);

  return artifacts;
}

export async function generateGuidePageHtml(client, configInput = {}, optionsInput = {}, pageInput = {}) {
  const config = mergeConfig(configInput);
  const options = normalizeGuideOptions(optionsInput);
  const levelMap = await cachedExactGuideLevelMap(client, config, options);
  const scoreBands = guideScoreBands(options);
  const sections = guideSections(options);
  const sectionIndex = sections.findIndex((section) =>
    section.role === pageInput.role && Number(section.inventory) === Number(pageInput.inventory),
  );
  const inningIndex = INNING_BANDS.findIndex((inningBand) => inningBand.key === pageInput.inningKey);
  const halfIndex = HALF_CONTEXTS.findIndex((halfContext) => halfContext.key === pageInput.halfKey);

  if (sectionIndex < 0 || inningIndex < 0 || halfIndex < 0) {
    throw new Error("Unknown guide page.");
  }

  const section = sections[sectionIndex];
  const inningBand = INNING_BANDS[inningIndex];
  const halfContext = HALF_CONTEXTS[halfIndex];
  return guideLookupHtml(
    config,
    section,
    sectionIndex,
    inningBand,
    inningIndex,
    halfContext,
    halfIndex,
    scoreBands,
    levelMap,
    pageId(section, inningBand, halfContext),
  );
}
