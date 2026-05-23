const CONFIG_STORAGE_KEY = "abs-challenge-config-v2";

let defaultConfig = null;
let config = null;
let generatedGuide = "";
let liveRunTimer = null;
let liveRunId = 0;

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatPoints(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)} pp`;
}

function formatSettingPercent(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatFactor(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parsePercentInput(value) {
  if (value === "" || value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1 ? numeric / 100 : numeric;
}

function parseNumberInput(id) {
  const value = Number(qs(`#${id}`).value);
  return Number.isFinite(value) ? value : 0;
}

function setStatus(message) {
  qs("#settings-status").textContent = message;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }
  return data;
}

function activateTab(tabName) {
  qsa(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  qsa(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function basesFromForm() {
  return qsa('input[name="base"]:checked').reduce((sum, input) => sum + Number(input.value), 0);
}

function battingTeamRunDiff() {
  const myScore = Number(qs("#my-score").value);
  const otherScore = Number(qs("#other-score").value);
  if (!Number.isFinite(myScore) || !Number.isFinite(otherScore)) return null;

  const myRunDiff = myScore - otherScore;
  return qs("#role").value === "catcher" ? -myRunDiff : myRunDiff;
}

function recommendationPayload() {
  const runDiff = battingTeamRunDiff();
  return {
    role: qs("#role").value,
    inventory: Number(qs("#inventory").value),
    state: {
      inning: Number(qs("#inning").value),
      half: qs("#half").value,
      outs: Number(qs("#outs").value),
      bases: basesFromForm(),
      runDiff,
    },
    config,
  };
}

function categoryLabel(category) {
  if (category === "full_count") return "Full Count";
  if (category === "deep_count") return "Deep Count";
  return "Open";
}

function levelClass(level) {
  return level.toLowerCase().replace(/\s+/g, "-");
}

function renderMetrics(result) {
  const grid = qs("#metric-grid");
  grid.innerHTML = `
    <div class="metric-tile">
      <span>Team Win Probability</span>
      <strong>${formatPercent(result.startTeamWp)}</strong>
    </div>
    <div class="metric-tile">
      <span>Success Probability</span>
      <strong>${formatPercent(result.p)}</strong>
    </div>
    <div class="metric-tile">
      <span>Challenge Rows</span>
      <strong>${result.rows.length}</strong>
    </div>
  `;
}

function renderBuckets(result) {
  const labels = [
    ["Full Count", result.recommendation.buckets.full],
    ["Deep Count", result.recommendation.buckets.deep],
    ["Open", result.recommendation.buckets.open],
  ];
  qs("#bucket-table").innerHTML = labels.map(([label, stats]) => `
    <tr>
      <td>${label}</td>
      <td>${stats.n}</td>
      <td>${formatPoints(stats.medianEv)}</td>
      <td>${formatPercent(stats.positiveRate)}</td>
      <td>${formatPoints(stats.medianV)}</td>
      <td>${formatPoints(stats.medianC)}</td>
    </tr>
  `).join("");
}

function renderCounts(result) {
  const rows = [...result.rows].sort((a, b) => {
    const [ab, as] = a.count.split("-").map(Number);
    const [bb, bs] = b.count.split("-").map(Number);
    return ab - bb || as - bs;
  });

  qs("#count-table").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.count}</td>
      <td>${categoryLabel(row.category)}</td>
      <td>${formatPoints(row.v)}</td>
      <td>${formatPoints(row.c)}</td>
      <td>${formatPercent(row.requiredP)}</td>
      <td>${formatPoints(row.ev)}</td>
      <td><span class="tag ${row.positive ? "positive" : "negative"}">${row.positive ? "Positive" : "Hold"}</span></td>
    </tr>
  `).join("");
}

function renderRecommendation(result) {
  const level = result.recommendation.level;
  const banner = qs("#level-banner");
  banner.className = `level-banner ${levelClass(level)}`;
  banner.innerHTML = `
    <span class="level-kicker">Level</span>
    <strong>${level}</strong>
  `;

  const roleText = result.role === "batter" ? "Batter" : "Catcher";
  qs("#recommendation-context").textContent =
    `${roleText}, ${result.inventory} challenge${result.inventory === 1 ? "" : "s"} left, ${formatPercent(result.startTeamWp)} team win probability.`;

  renderMetrics(result);
  renderBuckets(result);
  renderCounts(result);
}

function renderPending(message) {
  qs("#recommendation-context").textContent = message;
  const banner = qs("#level-banner");
  banner.className = "level-banner";
  banner.innerHTML = `
    <span class="level-kicker">Level</span>
    <strong>Updating</strong>
  `;
}

function validateLiveInputs() {
  const runDiff = battingTeamRunDiff();
  if (runDiff == null) return "Enter both scores.";
  if (Math.abs(runDiff) > 5) return "Savant lookup supports score margins from -5 to +5 in this prototype.";
  return null;
}

async function runRecommendation(event) {
  if (event) event.preventDefault();
  const validationMessage = validateLiveInputs();
  if (validationMessage) {
    setStatus(validationMessage);
    return;
  }

  const thisRunId = ++liveRunId;
  const form = qs("#live-form");
  form.classList.add("is-loading");
  renderPending("Pricing the updated state...");
  setStatus("Running recommendation...");

  try {
    const result = await requestJson("/api/recommend", {
      method: "POST",
      body: JSON.stringify(recommendationPayload()),
    });
    if (thisRunId !== liveRunId) return;
    renderRecommendation(result);
    setStatus("Recommendation updated");
  } catch (error) {
    if (thisRunId !== liveRunId) return;
    setStatus(error.message);
  } finally {
    if (thisRunId === liveRunId) form.classList.remove("is-loading");
  }
}

function scheduleRecommendation() {
  clearTimeout(liveRunTimer);
  liveRunId += 1;
  qs("#live-form").classList.remove("is-loading");
  renderPending("Inputs changed. Updating...");
  liveRunTimer = setTimeout(() => {
    runRecommendation();
  }, 450);
}

function fillSettingsForm() {
  qs("#setting-p-batter").value = (config.successRates.batter * 100).toFixed(1);
  qs("#setting-p-catcher").value = (config.successRates.catcher * 100).toFixed(1);
  qs("#setting-c-base").value = config.challengeCost.baseWpPoints.toFixed(1);
  qs("#setting-inv-2").value = config.challengeCost.inventoryFactor[2];
  qs("#setting-inv-1").value = config.challengeCost.inventoryFactor[1];
  qs("#setting-phase-early").value = config.challengeCost.remainingGameFactor.early;
  qs("#setting-phase-middle").value = config.challengeCost.remainingGameFactor.middle;
  qs("#setting-phase-seventh").value = config.challengeCost.remainingGameFactor.seventh;
  qs("#setting-phase-eighth").value = config.challengeCost.remainingGameFactor.eighth;
  qs("#setting-phase-late").value = config.challengeCost.remainingGameFactor.late;
  qs("#setting-full-median").value = (config.thresholds.fullCount.medianExpectedValueMin * 100).toFixed(1);
  qs("#setting-deep-median").value = (config.thresholds.deepCount.medianExpectedValueMin * 100).toFixed(1);
  qs("#setting-deep-rate").value = (config.thresholds.deepCount.positiveRateMin * 100).toFixed(0);
  qs("#setting-open-median").value = (config.thresholds.open.medianExpectedValueMin * 100).toFixed(1);
  qs("#setting-open-rate").value = (config.thresholds.open.positiveRateMin * 100).toFixed(0);

  qs("#wp-factor-settings").innerHTML = config.challengeCost.currentWpFactor.map((row, index) => `
    <tr class="wp-setting-row">
      <td>${row.label}</td>
      <td>
        <input data-wp-index="${index}" type="number" min="0" max="5" step="0.01" value="${row.factor}">
      </td>
    </tr>
  `).join("");
}

function configFromSettingsForm() {
  const next = clone(config);
  next.successRates.batter = parsePercentInput(qs("#setting-p-batter").value);
  next.successRates.catcher = parsePercentInput(qs("#setting-p-catcher").value);
  next.challengeCost.baseWpPoints = parseNumberInput("setting-c-base");
  next.challengeCost.inventoryFactor[2] = parseNumberInput("setting-inv-2");
  next.challengeCost.inventoryFactor[1] = parseNumberInput("setting-inv-1");
  next.challengeCost.remainingGameFactor.early = parseNumberInput("setting-phase-early");
  next.challengeCost.remainingGameFactor.middle = parseNumberInput("setting-phase-middle");
  next.challengeCost.remainingGameFactor.seventh = parseNumberInput("setting-phase-seventh");
  next.challengeCost.remainingGameFactor.eighth = parseNumberInput("setting-phase-eighth");
  next.challengeCost.remainingGameFactor.late = parseNumberInput("setting-phase-late");
  next.thresholds.fullCount.medianExpectedValueMin = parseNumberInput("setting-full-median") / 100;
  next.thresholds.deepCount.medianExpectedValueMin = parseNumberInput("setting-deep-median") / 100;
  next.thresholds.deepCount.positiveRateMin = parsePercentInput(qs("#setting-deep-rate").value);
  next.thresholds.open.medianExpectedValueMin = parseNumberInput("setting-open-median") / 100;
  next.thresholds.open.positiveRateMin = parsePercentInput(qs("#setting-open-rate").value);

  qsa("[data-wp-index]").forEach((input) => {
    const index = Number(input.dataset.wpIndex);
    next.challengeCost.currentWpFactor[index].factor = Number(input.value);
  });

  return next;
}

function saveSettings(event) {
  event.preventDefault();
  config = configFromSettingsForm();
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  setStatus("Settings saved");
  refreshGuide();
}

function resetSettings() {
  config = clone(defaultConfig);
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  fillSettingsForm();
  setStatus("Defaults restored");
  refreshGuide();
}

function setActiveGuidePage(pageId) {
  const guide = qs("#guide-preview");
  const page = guide.querySelector(`[data-lookup-page="${pageId}"]`);
  if (!page) return;

  guide.querySelectorAll("[data-lookup-target]").forEach((button) => {
    const active = button.dataset.lookupTarget === pageId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  guide.querySelectorAll(".lookup-page").forEach((lookupPage) => {
    lookupPage.classList.toggle("active", lookupPage === page);
  });
  guide.querySelectorAll(".lookup-role-section").forEach((section) => {
    section.classList.toggle("active", section.contains(page));
  });
}

function initializeGuideBinder() {
  const firstButton = qs("#guide-preview [data-lookup-target]");
  if (firstButton) {
    setActiveGuidePage(firstButton.dataset.lookupTarget);
  }
}

function handleGuideBinderClick(event) {
  const button = event.target.closest("[data-lookup-target]");
  if (!button) return;
  event.preventDefault();
  setActiveGuidePage(button.dataset.lookupTarget);
}

async function refreshGuide() {
  setStatus("Generating guide...");
  try {
    const result = await requestJson("/api/guide", {
      method: "POST",
      body: JSON.stringify({ config }),
    });
    generatedGuide = result.markdown;
    qs("#guide-output").value = generatedGuide;
    qs("#guide-preview").innerHTML = result.html || "";
    initializeGuideBinder();
    setStatus("Guide generated");
  } catch (error) {
    setStatus(error.message);
  }
}

function downloadGuide() {
  if (!generatedGuide) {
    generatedGuide = qs("#guide-output").value;
  }
  const blob = new Blob([generatedGuide], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "abs-challenge-coaching-guide.md";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function loadSavedConfig() {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!saved) return clone(defaultConfig);
  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    return clone(defaultConfig);
  }
}

async function init() {
  defaultConfig = await requestJson("/api/config");
  config = loadSavedConfig();
  fillSettingsForm();
  refreshGuide();

  qsa(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  qs("#live-form").addEventListener("submit", runRecommendation);
  qsa("input, select", qs("#live-form")).forEach((input) => {
    input.addEventListener("input", scheduleRecommendation);
    input.addEventListener("change", scheduleRecommendation);
  });
  qs("#settings-form").addEventListener("submit", saveSettings);
  qs("#reset-settings").addEventListener("click", resetSettings);
  qs("#refresh-guide").addEventListener("click", refreshGuide);
  qs("#download-guide").addEventListener("click", downloadGuide);
  qs("#guide-preview").addEventListener("click", handleGuideBinderClick);
}

init().catch((error) => {
  setStatus(error.message);
});
