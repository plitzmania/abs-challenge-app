import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COUNTS,
  DEFAULT_CONFIG,
  PrecomputedGuideClient,
  evaluateRecommendation,
  generateGuideArtifacts,
  generateGuideCsv,
  generateGuideHtml,
  generateGuideMarkdown,
  generateGuidePageHtml,
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

const LEVEL_RANK = {
  "No PA": -1,
  "No-Brainers": 0,
  "Full Count": 1,
  "Deep Count": 2,
  Aggressive: 3,
};

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

test("guide export exposes dugout formats without markdown UI", async () => {
  const html = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");

  assert.equal(html.includes("Download Markdown"), false);
  assert.match(html, /Download CSV/);
  assert.match(html, /Print \/ Save PDF/);
  assert.match(html, /Score Columns/);
  assert.match(html, /data-guide-success-role="batter"/);
  assert.match(html, /data-guide-success-role="catcher"/);
});

test("defaults tab explains model derivations", async () => {
  const html = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");

  assert.match(html, /data-tab="defaults">Defaults/);
  assert.match(html, /Default Derivations/);
  assert.match(html, /Pitch-Quality Candidate Filter/);
  assert.match(html, /Statcast Shadow Zone/);
  assert.match(html, /C = 5\.5 WP points x inventory factor x remaining game factor x current WP factor/);
  assert.match(html, /The curve is intentionally asymmetric/);
  assert.match(html, /Mode Thresholds/);
});

test("model settings exposes challenge cost model selector", async () => {
  const html = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");
  const appJs = await readFile(new URL("../app/public/app.js", import.meta.url), "utf8");

  assert.match(html, /id="setting-c-model"/);
  assert.match(html, /Conservative v1/);
  assert.match(html, /Shadow Zone v1\.5/);
  assert.match(appJs, /setting-c-model/);
  assert.match(appJs, /updateCostModelControls/);
  assert.match(appJs, /guideRunId/);
});

test("guide page input changes mark the guide stale without auto-refreshing", async () => {
  const html = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");
  const appJs = await readFile(new URL("../app/public/app.js", import.meta.url), "utf8");
  const serverJs = await readFile(new URL("../app/server.mjs", import.meta.url), "utf8");
  const modelJs = await readFile(new URL("../app/model.mjs", import.meta.url), "utf8");

  assert.match(html, /id="refresh-guide" type="button" disabled/);
  assert.match(appJs, /function markGuideDirty/);
  assert.match(appJs, /Guide inputs changed\. Refresh preview to update\./);
  assert.match(appJs, /if \(guideIsDirty \|\| !generatedCsv\)/);
  assert.match(appJs, /fillGuideForm\(\);\n  setGuideDirty\(true\);/);
  assert.match(appJs, /\/api\/guide-html/);
  assert.match(appJs, /\/api\/guide-csv/);
  assert.doesNotMatch(appJs, /Guide inputs changed\. Regenerating\./);
  assert.doesNotMatch(appJs, /scheduleGuideRefresh/);
  assert.match(serverJs, /guideArtifactCache/);
  assert.match(serverJs, /cachedGuideArtifacts/);
  assert.match(modelJs, /guideLevelMapCacheKey/);
  assert.doesNotMatch(modelJs.match(/function guideLevelMapCacheKey[\s\S]*?\n}/)?.[0] || "", /label/);
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

test("v1.5 depletion cost model can run side by side with v1", async () => {
  const state = {
    inning: 1,
    half: "Top",
    outs: 0,
    bases: 0,
    runDiff: 0,
  };
  const v1 = await evaluateRecommendation(new FakeWinExpectancyClient(), {
    role: "catcher",
    inventory: 2,
    state,
    config: DEFAULT_CONFIG,
  });
  const v15 = await evaluateRecommendation(new FakeWinExpectancyClient(), {
    role: "catcher",
    inventory: 2,
    state,
    config: {
      challengeCost: {
        model: "depletionV15",
      },
    },
  });

  assert.equal(v15.rows.length, v1.rows.length);
  assert.notEqual(v15.rows[0].c, v1.rows[0].c);
  assert.equal(v15.rows.every((row) => row.c >= 0), true);
});

test("guide export labels the selected challenge cost model", () => {
  const v1 = generateGuideMarkdown({}, { role: "catcher" });
  const v15 = generateGuideHtml({ challengeCost: { model: "depletionV15" } }, { role: "catcher" });

  assert.match(v1, /Challenge cost model: Conservative v1/);
  assert.match(v15, /Cost model: Shadow Zone v1\.5/);
  assert.match(v15, /Last challenge premium: 2\.00x/);
});

test("v1.5 guide keeps first-batter cells aligned with exact live model direction", () => {
  const guide = generateGuideMarkdown({ challengeCost: { model: "depletionV15" } }, { role: "batter" });

  assert.match(
    guide,
    /### Batter, 2 challenges left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Empty \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \|/,
  );
});

test("v1.5 guide treats low catcher success as current challenge drag, not a free C discount", () => {
  const guide = generateGuideMarkdown({
    successRates: { catcher: 0.3 },
    challengeCost: { model: "depletionV15" },
  }, { role: "catcher" });

  assert.match(
    guide,
    /### Catcher, 1 challenge left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Empty \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \|/,
  );
  assert.match(
    guide,
    /### Catcher, 2 challenges left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Empty \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \|/,
  );
});

test("v1.5 guide inventory cost does not invert the same catcher situation", () => {
  const csv = generateGuideCsv({
    successRates: { catcher: 0.3 },
    challengeCost: { model: "depletionV15" },
  }, { role: "catcher" });
  const rows = csv.split("\n").slice(1).map((line) => {
    const [
      label,
      role,
      challengesLeft,
      inningBand,
      half,
      scoreColumn,
      scoreDescription,
      outs,
      runners,
      recommendation,
    ] = line.split(",");
    return {
      label,
      role,
      challengesLeft,
      inningBand,
      half,
      scoreColumn,
      scoreDescription,
      outs,
      runners,
      recommendation,
    };
  });

  const byScore = new Map();
  for (const row of rows) {
    if (
      row.role !== "Catcher"
      || row.inningBand !== "Inning 7"
      || row.half !== "Bottom Half"
      || row.outs !== "0"
      || row.runners !== "Empty"
    ) continue;
    const entry = byScore.get(row.scoreColumn) ?? {};
    entry[row.challengesLeft] = row.recommendation;
    byScore.set(row.scoreColumn, entry);
  }

  for (const [scoreColumn, entry] of byScore) {
    assert.ok(
      LEVEL_RANK[entry["1"]] <= LEVEL_RANK[entry["2"]],
      `${scoreColumn} inverted: 1 left ${entry["1"]}, 2 left ${entry["2"]}`,
    );
  }
});

test("exact guide artifacts use representative Savant rows instead of the offline shortcut", async () => {
  const data = JSON.parse(await readFile(new URL("../app/data/guide-winexp.json", import.meta.url), "utf8"));
  const config = structuredClone(DEFAULT_CONFIG);
  config.challengeCost.model = "depletionV15";

  const artifacts = await generateGuideArtifacts(new PrecomputedGuideClient(data), config, { role: "batter" });

  assert.match(
    artifacts.markdown,
    /### Batter, 1 challenge left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Loaded \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \| Full Count \|/,
  );
  assert.match(artifacts.html, /data-lookup-page="lookup-batter-1-early-top"/);
  assert.match(artifacts.csv, /Batter,1,Innings 1-3,Top Half,U2-3,Up 2-3,0,Loaded,Full Count/);
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
  assert.match(guide, /\| 0 \| Empty \| No-Brainers \| Full Count \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \|/);
  assert.match(guide, /#### Inning 9\+ - Bottom Half/);
  assert.match(guide, /\| 0 \| Loaded \| No PA \| No PA \| No PA \| Aggressive \| Aggressive \| Aggressive \| Aggressive \|/);
  assert.match(guide, /\| 0 \| Empty \| Aggressive \| Deep Count \| Deep Count \| Deep Count \| No PA \| No PA \| No PA \|/);

  const html = generateGuideHtml();
  assert.equal((html.match(/class="lookup-table"/g) || []).length, 40);
  assert.equal((html.match(/class="lookup-page(?:\s|")/g) || []).length, 40);
  assert.equal((html.match(/data-lookup-target="lookup-/g) || []).length, 40);
  assert.equal((html.match(/class="lookup-page active"/g) || []).length, 1);
  assert.equal((html.match(/class="lookup-role-section active"/g) || []).length, 1);
  assert.match(html, /Binder Index/);
  assert.match(html, /Page 40/);
});

test("guide preview can lazy-load lookup pages", async () => {
  const html = generateGuideHtml({}, { role: "batter" }, null, { lazy: true });

  assert.equal((html.match(/class="lookup-table"/g) || []).length, 1);
  assert.equal((html.match(/data-lookup-target="lookup-/g) || []).length, 20);
  assert.match(html, /data-lookup-page="lookup-batter-1-early-top"/);
  assert.doesNotMatch(html, /data-lookup-page="lookup-batter-1-early-bottom"/);

  const pageHtml = await generateGuidePageHtml(new FakeWinExpectancyClient(), {}, { role: "batter" }, {
    role: "batter",
    inventory: 1,
    inningKey: "early",
    halfKey: "bottom",
  });

  assert.match(pageHtml, /data-lookup-page="lookup-batter-1-early-bottom"/);
  assert.match(pageHtml, /Page 2/);
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
    /### Catcher, 2 challenges left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Loaded \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \| No-Brainers \|/,
  );
  assert.match(
    perfectBatterGuide,
    /### Batter, 1 challenge left[\s\S]*?#### Innings 1-3 - Top Half[\s\S]*?\| 0 \| Empty \| Aggressive \| Aggressive \| Aggressive \| Aggressive \| Aggressive \| Aggressive \| Aggressive \|/,
  );
  assert.match(
    perfectBatterGuide,
    /### Batter, 2 challenges left[\s\S]*?#### Inning 9\+ - Bottom Half[\s\S]*?\| 0 \| Empty \| Aggressive \| Aggressive \| Aggressive \| Aggressive \| No PA \| No PA \| No PA \|/,
  );
});

test("guide export can be scoped to one labeled role", () => {
  const options = { role: "catcher", label: "Test Catcher" };
  const html = generateGuideHtml({ successRates: { catcher: 0.75 } }, options);
  const markdown = generateGuideMarkdown({ successRates: { catcher: 0.75 } }, options);
  const csv = generateGuideCsv({ successRates: { catcher: 0.75 } }, options);

  assert.equal((html.match(/class="lookup-table"/g) || []).length, 20);
  assert.equal((html.match(/data-lookup-target="lookup-/g) || []).length, 20);
  assert.match(html, /Test Catcher/);
  assert.match(markdown, /Role: Catcher/);
  assert.doesNotMatch(markdown, /### Batter/);
  assert.equal(csv.split("\n")[0], "label,role,challenges_left,inning_band,half,score_column,score_description,outs,runners,recommendation");
  assert.equal(csv.split("\n").length, 3361);
});

test("guide export supports detailed score columns", () => {
  const options = { role: "batter", scoreMode: "detailed" };
  const markdown = generateGuideMarkdown({}, options);
  const html = generateGuideHtml({}, options);
  const csv = generateGuideCsv({}, options);

  assert.match(markdown, /\| Outs \| Runners \| D5 \| D4 \| D3 \| D2 \| D1 \| Tie \| U1 \| U2 \| U3 \| U4 \| U5 \|/);
  assert.equal((html.match(/class="lookup-table"/g) || []).length, 20);
  assert.match(html, />U2</);
  assert.match(html, />U3</);
  assert.equal(csv.split("\n").length, 5281);
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
