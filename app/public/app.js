const CONFIG_STORAGE_KEY = "abs-challenge-config-v2";

let defaultConfig = null;
let config = null;
let generatedCsv = "";
let guideCsvIsCurrent = false;
let liveRunTimer = null;
let liveRunId = 0;
let guideRunTimer = null;
let guideRunId = 0;
let guideIsDirty = true;
let guideIsLoading = false;
let settingsApplyTimer = null;

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function mergeDefaults(savedConfig) {
  return mergeInto(clone(defaultConfig), savedConfig);
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

function guideWorkloadMessage() {
  const scoreColumns = qs("#guide-score-mode").value === "detailed" ? 11 : 7;
  const guideCells = 2 * 5 * 2 * 3 * 8 * scoreColumns;
  return `Calculating ${guideCells.toLocaleString()} guide cells across 288 representative game-state tables. Please hold.`;
}

function updateGuideRefreshButton() {
  const refreshButton = qs("#refresh-guide");
  if (!refreshButton) return;
  refreshButton.disabled = guideIsLoading || !guideIsDirty;
}

function setGuideDirty(isDirty) {
  guideIsDirty = isDirty;
  if (isDirty) {
    generatedCsv = "";
    guideCsvIsCurrent = false;
  }
  updateGuideRefreshButton();
}

function setGuideLoading(isLoading) {
  const loader = qs("#guide-loader");
  const refreshButton = qs("#refresh-guide");
  guideIsLoading = isLoading;
  loader.hidden = !isLoading;
  refreshButton.setAttribute("aria-busy", isLoading ? "true" : "false");
  if (isLoading) {
    qs("#guide-loader-text").textContent = guideWorkloadMessage();
  }
  updateGuideRefreshButton();
}

async function requestJson(url, options = {}) {
  const { timeoutMs = 20000, timeoutMessage = "Request took too long. Try again.", ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestText(url, options = {}) {
  const { timeoutMs = 20000, timeoutMessage = "Request took too long. Try again.", ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Request failed with ${response.status}`);
    }
    return text;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
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
    config: configFromLiveForm(),
  };
}

function categoryLabel(category) {
  if (category === "full_count") return "Full Count";
  if (category === "deep_count") return "Deep Count";
  return "Aggressive";
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
    ["Aggressive", result.recommendation.buckets.open],
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
  qs("#setting-c-model").value = config.challengeCost.model || "v1";
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
  updateCostModelControls();
}

function fillLiveForm() {
  qs("#live-p-batter").value = (config.successRates.batter * 100).toFixed(1);
  qs("#live-p-catcher").value = (config.successRates.catcher * 100).toFixed(1);
}

function fillGuideForm() {
  qs("#guide-p-batter").value = (config.successRates.batter * 100).toFixed(1);
  qs("#guide-p-catcher").value = (config.successRates.catcher * 100).toFixed(1);
  updateGuideSuccessControls();
}

function configFromSettingsForm() {
  const next = clone(config);
  next.successRates.batter = parsePercentInput(qs("#setting-p-batter").value);
  next.successRates.catcher = parsePercentInput(qs("#setting-p-catcher").value);
  next.challengeCost.model = qs("#setting-c-model").value;
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

function updateCostModelControls() {
  const usesV1 = qs("#setting-c-model").value !== "depletionV15";
  qsa(".v1-cost-control").forEach((section) => {
    section.classList.toggle("is-muted", !usesV1);
    qsa("input", section).forEach((input) => {
      input.disabled = !usesV1;
    });
  });
  qsa("[data-wp-index]").forEach((input) => {
    input.disabled = !usesV1;
  });
  qs(".wp-section").classList.toggle("is-muted", !usesV1);
}

function configFromLiveForm() {
  const next = clone(config);
  const batterRate = parsePercentInput(qs("#live-p-batter").value);
  const catcherRate = parsePercentInput(qs("#live-p-catcher").value);
  if (batterRate != null) next.successRates.batter = batterRate;
  if (catcherRate != null) next.successRates.catcher = catcherRate;
  return next;
}

function configFromGuideForm() {
  const next = clone(config);
  const batterRate = parsePercentInput(qs("#guide-p-batter").value);
  const catcherRate = parsePercentInput(qs("#guide-p-catcher").value);
  if (batterRate != null) next.successRates.batter = batterRate;
  if (catcherRate != null) next.successRates.catcher = catcherRate;
  return next;
}

function guideOptions() {
  return {
    label: qs("#guide-label").value.trim(),
    role: qs("#guide-role").value,
    scoreMode: qs("#guide-score-mode").value,
  };
}

function guidePayload() {
  return {
    config: configFromGuideForm(),
    options: guideOptions(),
  };
}

function guidePayloadKey(payload) {
  return JSON.stringify(payload);
}

function updateGuideSuccessControls() {
  const role = qs("#guide-role").value;
  qsa("[data-guide-success-role]").forEach((control) => {
    control.classList.toggle("is-hidden", control.dataset.guideSuccessRole !== role);
  });
}

function applySettings(statusMessage = "Settings applied") {
  config = configFromSettingsForm();
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  fillLiveForm();
  fillGuideForm();
  setGuideDirty(true);
  setStatus(statusMessage);
}

function scheduleSettingsApply() {
  clearTimeout(settingsApplyTimer);
  setStatus("Settings changed. Updating...");
  settingsApplyTimer = setTimeout(() => {
    applySettings();
  }, 350);
}

function saveSettings(event) {
  event.preventDefault();
  clearTimeout(settingsApplyTimer);
  applySettings("Settings saved");
}

function resetSettings() {
  clearTimeout(settingsApplyTimer);
  config = clone(defaultConfig);
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  fillSettingsForm();
  fillLiveForm();
  fillGuideForm();
  setGuideDirty(true);
  setStatus("Defaults restored");
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

async function ensureGuidePage(button) {
  const pageId = button.dataset.lookupTarget;
  const guide = qs("#guide-preview");
  if (guide.querySelector(`[data-lookup-page="${pageId}"]`)) return true;
  if (guideIsDirty) {
    setStatus("Refresh preview to update the guide before changing pages.");
    return false;
  }

  setStatus("Loading guide page...");
  const html = await requestText("/api/guide-page-html", {
    method: "POST",
    timeoutMs: 12000,
    timeoutMessage: "Guide page took too long to load. Try the page again.",
    body: JSON.stringify({
      config: configFromGuideForm(),
      options: guideOptions(),
      page: {
        role: button.dataset.lookupRole,
        inventory: Number(button.dataset.lookupInventory),
        inningKey: button.dataset.lookupInning,
        halfKey: button.dataset.lookupHalf,
      },
    }),
  });
  const section = guide.querySelector(`[data-lookup-section="${button.dataset.lookupRole}-${button.dataset.lookupInventory}"]`);
  const grid = section?.querySelector("[data-lookup-page-grid]");
  if (!grid) return false;
  grid.insertAdjacentHTML("beforeend", html);
  setStatus("Guide page loaded");
  return true;
}

async function handleGuideBinderClick(event) {
  const button = event.target.closest("[data-lookup-target]");
  if (!button) return;
  event.preventDefault();
  if (!await ensureGuidePage(button)) return;
  setActiveGuidePage(button.dataset.lookupTarget);
}

function markGuideDirty() {
  updateGuideSuccessControls();
  clearTimeout(guideRunTimer);
  guideRunId += 1;
  setGuideLoading(false);
  setGuideDirty(true);
  setStatus("Guide inputs changed. Refresh preview to update.");
}

async function refreshGuide(runId = null) {
  const thisRunId = runId ?? (guideRunId += 1);
  const payload = guidePayload();
  const payloadKey = guidePayloadKey(payload);
  clearTimeout(guideRunTimer);
  setStatus("Generating guide...");
  setGuideLoading(true);
  try {
    const html = await requestText("/api/guide-html", {
      method: "POST",
      timeoutMs: 12000,
      timeoutMessage: "Guide generation took too long. Refresh preview to try again.",
      body: JSON.stringify(payload),
    });
    if (thisRunId !== guideRunId && payloadKey !== guidePayloadKey(guidePayload())) return false;
    setStatus("Rendering guide...");
    qs("#guide-preview").innerHTML = html || "";
    initializeGuideBinder();
    setGuideDirty(false);
    setStatus("Guide generated");
    return true;
  } catch (error) {
    if (thisRunId !== guideRunId) return false;
    setGuideDirty(true);
    setStatus(error.message);
    return false;
  } finally {
    setGuideLoading(false);
  }
}

async function refreshGuideCsv() {
  setStatus("Preparing CSV...");
  const payload = guidePayload();
  const csv = await requestText("/api/guide-csv", {
    method: "POST",
    timeoutMs: 12000,
    timeoutMessage: "CSV generation took too long. Try Download CSV again.",
    body: JSON.stringify(payload),
  });
  generatedCsv = csv || "";
  guideCsvIsCurrent = true;
  return Boolean(generatedCsv);
}

function exportBaseName(extension) {
  const options = guideOptions();
  const label = options.label || `abs-${options.role}-guide`;
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || `abs-${options.role}-guide`;
  return `${slug}.${extension}`;
}

function downloadBlob(contents, type, filename) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadCsv() {
  clearTimeout(guideRunTimer);
  if (guideIsDirty || !generatedCsv) {
    const refreshed = await refreshGuide();
    if (!refreshed) return;
  }
  if (!guideCsvIsCurrent) {
    const csvReady = await refreshGuideCsv();
    if (!csvReady) return;
  }
  if (!generatedCsv) {
    setStatus("Regenerate the guide before downloading CSV.");
    return;
  }
  downloadBlob(generatedCsv, "text/csv", exportBaseName("csv"));
}

async function printGuide() {
  clearTimeout(guideRunTimer);
  setStatus("Preparing print guide...");
  setGuideLoading(true);
  const payload = guidePayload();
  try {
    const html = await requestText("/api/guide-print-html", {
      method: "POST",
      timeoutMs: 20000,
      timeoutMessage: "Print guide took too long to prepare. Try Print again.",
      body: JSON.stringify(payload),
    });
    qs("#guide-preview").innerHTML = html || "";
    initializeGuideBinder();
    setGuideDirty(false);
    setStatus("Print guide ready");
  } catch (error) {
    setGuideDirty(true);
    setStatus(error.message);
    return;
  } finally {
    setGuideLoading(false);
  }
  document.body.classList.add("is-printing-guide");
  window.print();
}

function loadSavedConfig() {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!saved) return clone(defaultConfig);
  try {
    return mergeDefaults(JSON.parse(saved));
  } catch {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    return clone(defaultConfig);
  }
}

async function init() {
  defaultConfig = await requestJson("/api/config");
  config = loadSavedConfig();
  fillSettingsForm();
  fillLiveForm();
  fillGuideForm();
  setGuideDirty(true);

  qsa(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  qs("#live-form").addEventListener("submit", runRecommendation);
  qsa("input, select", qs("#live-form")).forEach((input) => {
    input.addEventListener("input", scheduleRecommendation);
    input.addEventListener("change", scheduleRecommendation);
  });
  qs("#settings-form").addEventListener("submit", saveSettings);
  qsa("input, select", qs("#settings-form")).forEach((input) => {
    input.addEventListener("input", scheduleSettingsApply);
    input.addEventListener("change", scheduleSettingsApply);
  });
  qs("#setting-c-model").addEventListener("change", updateCostModelControls);
  qs("#reset-settings").addEventListener("click", resetSettings);
  qs("#guide-form").addEventListener("submit", (event) => event.preventDefault());
  qsa("input, select", qs("#guide-form")).forEach((input) => {
    input.addEventListener("input", markGuideDirty);
    input.addEventListener("change", markGuideDirty);
  });
  qs("#refresh-guide").addEventListener("click", refreshGuide);
  qs("#download-csv").addEventListener("click", downloadCsv);
  qs("#print-guide").addEventListener("click", printGuide);
  qs("#guide-preview").addEventListener("click", handleGuideBinderClick);
  window.addEventListener("afterprint", () => document.body.classList.remove("is-printing-guide"));
}

init().catch((error) => {
  setStatus(error.message);
});
