import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COUNTS,
  DEFAULT_CONFIG,
  evaluateRecommendation,
  generateGuideHtml,
  generateGuideMarkdown,
} from "../app/model.mjs";

const SCORE_COLUMNS = [
  "bat_wins_minus_5",
  "bat_wins_minus_4",
  "bat_wins_minus_3",
  "bat_wins_minus_2",
  "bat_wins_minus_1",
  "bat_wins_0",
  "bat_wins_1",
  "bat_wins_2",
  "bat_wins_3",
  "bat_wins_4",
  "bat_wins_5",
];

class FakeWinExpectancyClient {
  constructor() {
    this.cache = new Map();
  }

  async fetchTable(state) {
    const key = [state.inning, state.half, state.outs, state.bases].join("|");
    if (!this.cache.has(key)) {
      this.cache.set(key, makeTable(state));
    }
    return this.cache.get(key);
  }
}

function makeTable(state) {
  return new Map(
    COUNTS.map(([balls, strikes]) => {
      const row = {
        ball_count: balls,
        strike_count: strikes,
      };

      for (let diff = -5; diff <= 5; diff += 1) {
        row[scoreColumn(diff)] = fakeValue(state, { balls, strikes }, diff);
      }

      return [`${balls}-${strikes}`, row];
    }),
  );
}

function scoreColumn(runDiff) {
  if (runDiff === 0) return "bat_wins_0";
  if (runDiff > 0) return `bat_wins_${runDiff}`;
  return `bat_wins_minus_${Math.abs(runDiff)}`;
}

function fakeValue(state, count, runDiff) {
  const baseValue =
    ((state.bases & 1) ? 0.025 : 0) +
    ((state.bases & 2) ? 0.050 : 0) +
    ((state.bases & 4) ? 0.075 : 0);
  const countValue = count.balls * 0.015 - count.strikes * 0.020;
  const outValue = state.outs * -0.060;
  const scoreValue = runDiff * 0.040;
  return clamp(0.5 + baseValue + countValue + outValue + scoreValue);
}

function clamp(value) {
  return Math.max(0.01, Math.min(0.99, value));
}

test("live tab has no success override input", async () => {
  const html = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");
  const appJs = await readFile(new URL("../app/public/app.js", import.meta.url), "utf8");

  assert.equal(html.includes("Expected Success Override"), false);
  assert.equal(html.includes("p-override"), false);
  assert.equal(html.includes("Use role default"), false);
  assert.equal(appJs.includes("pOverride"), false);
  assert.equal(appJs.includes("p-override"), false);
});

test("backend ignores stale live pOverride payloads", async () => {
  const result = await evaluateRecommendation(new FakeWinExpectancyClient(), {
    role: "catcher",
    inventory: 2,
    pOverride: 0,
    state: {
      inning: 5,
      half: "Top",
      outs: 0,
      bases: 0,
      runDiff: 0,
    },
    config: {
      successRates: {
        catcher: 0.59,
      },
    },
  });

  assert.equal(result.p, 0.59);
  assert.equal(result.rows.every((row) => row.p === 0.59), true);
});

test("model settings success rate remains the only override path", async () => {
  const result = await evaluateRecommendation(new FakeWinExpectancyClient(), {
    role: "catcher",
    inventory: 2,
    pOverride: 0,
    state: {
      inning: 5,
      half: "Top",
      outs: 0,
      bases: 0,
      runDiff: 0,
    },
    config: {
      successRates: {
        catcher: 0.72,
      },
    },
  });

  assert.equal(result.p, 0.72);
  assert.equal(result.rows.every((row) => row.p === 0.72), true);
});

test("inventory defaults keep first-game challenge preservation calibrated", () => {
  assert.equal(DEFAULT_CONFIG.challengeCost.inventoryFactor[2], 1.35);
  assert.equal(DEFAULT_CONFIG.challengeCost.inventoryFactor[1], 3.0);
});

test("generated guide preserves dugout lookup-book structure", () => {
  const guide = generateGuideMarkdown();

  assert.match(guide, /## Dugout Lookup Book/);
  assert.match(guide, /D4\+ = my team down 4 or more/);
  assert.match(guide, /### Catcher, 2 challenges left/);
  assert.match(guide, /#### Innings 1-3 - Top Half/);
  assert.match(guide, /\| 0 \| Empty \| Closed \| Closed \| Closed \| Closed \| Closed \| Closed \| Closed \|/);
  assert.match(guide, /#### Inning 9\+ - Bottom Half/);
  assert.match(guide, /\| 0 \| Loaded \| Open \| Open \| Open \| Open \| Open \| Open \| Open \|/);
  assert.match(guide, /\| 0 \| Empty \| Open \| Open \| Open \| Open \| No PA \| No PA \| No PA \|/);

  const html = generateGuideHtml();
  assert.equal((html.match(/class="lookup-table"/g) || []).length, 40);
  assert.equal((html.match(/class="lookup-page(?:\s|")/g) || []).length, 40);
  assert.equal((html.match(/data-lookup-target="lookup-/g) || []).length, 40);
  assert.equal((html.match(/class="lookup-page active"/g) || []).length, 1);
  assert.equal((html.match(/class="lookup-role-section active"/g) || []).length, 1);
  assert.match(html, /Binder Index/);
  assert.match(html, /Page 40/);
});

test("generated guide lookup cells respond to model settings", () => {
  const aggressiveGuide = generateGuideMarkdown({
    successRates: { batter: 0.8 },
    challengeCost: { baseWpPoints: 2 },
  });
  const perfectBatterGuide = generateGuideMarkdown({
    successRates: { batter: 1 },
  });
  const conservativeGuide = generateGuideMarkdown({
    successRates: { catcher: 0.3 },
    challengeCost: { baseWpPoints: 12 },
  });

  assert.match(
    aggressiveGuide,
    /### Batter, 1 challenge left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Empty \| Deep Count \| Deep Count \| Deep Count \| Deep Count \| Deep Count \| Deep Count \| Deep Count \|/,
  );
  assert.match(
    conservativeGuide,
    /### Catcher, 2 challenges left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Loaded \| Closed \| Closed \| Closed \| Closed \| Closed \| Closed \| Closed \|/,
  );
  assert.match(
    perfectBatterGuide,
    /### Batter, 1 challenge left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Empty \| Open \| Open \| Open \| Open \| Open \| Open \| Open \|/,
  );
  assert.match(
    perfectBatterGuide,
    /### Batter, 2 challenges left[\s\S]*?#### Inning 9\+ - Bottom Half[\s\S]*?\| 0 \| Empty \| Open \| Open \| Open \| Open \| No PA \| No PA \| No PA \|/,
  );
});

test("fake client exposes all score columns used by the model", async () => {
  const table = await new FakeWinExpectancyClient().fetchTable({
    inning: 1,
    half: "Top",
    outs: 0,
    bases: 0,
  });
  const row = table.get("0-0");

  for (const column of SCORE_COLUMNS) {
    assert.equal(typeof row[column], "number");
  }
});
