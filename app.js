const STORAGE_KEYS = {
  groups: "wa_groups_data_v2",
  currentIndex: "wa_groups_current_index_v2",
  doneMap: "wa_groups_done_map_v2",
  skippedMap: "wa_groups_skipped_map_v2",
  theme: "wa_groups_theme_v2",
};

let groups = [];
let currentIndex = 0;
let doneMap = {};
let skippedMap = {};
let hasOpenedCurrent = false;

const fileStatus = document.getElementById("fileStatus");
const mainSection = document.getElementById("mainSection");
const completedSection = document.getElementById("completedSection");

const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");
const remainingNumber = document.getElementById("remainingNumber");
const doneNumber = document.getElementById("doneNumber");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

const groupAvatar = document.getElementById("groupAvatar");
const groupStep = document.getElementById("groupStep");
const groupName = document.getElementById("groupName");
const groupLink = document.getElementById("groupLink");

const openBtn = document.getElementById("openBtn");
const doneBtn = document.getElementById("doneBtn");
const retryBtn = document.getElementById("retryBtn");
const skipBtn = document.getElementById("skipBtn");
const backBtn = document.getElementById("backBtn");
const restartBtn = document.getElementById("restartBtn");
const restartAfterDoneBtn = document.getElementById("restartAfterDoneBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const reloadFileBtn = document.getElementById("reloadFileBtn");
const themeToggle = document.getElementById("themeToggle");
const messageBox = document.getElementById("messageBox");

function saveState() {
  localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  localStorage.setItem(STORAGE_KEYS.currentIndex, String(currentIndex));
  localStorage.setItem(STORAGE_KEYS.doneMap, JSON.stringify(doneMap));
  localStorage.setItem(STORAGE_KEYS.skippedMap, JSON.stringify(skippedMap));
}

function loadState() {
  const savedGroups = localStorage.getItem(STORAGE_KEYS.groups);
  const savedIndex = localStorage.getItem(STORAGE_KEYS.currentIndex);
  const savedDoneMap = localStorage.getItem(STORAGE_KEYS.doneMap);
  const savedSkippedMap = localStorage.getItem(STORAGE_KEYS.skippedMap);

  if (savedGroups) {
    try {
      groups = JSON.parse(savedGroups) || [];
    } catch {
      groups = [];
    }
  }

  if (savedDoneMap) {
    try {
      doneMap = JSON.parse(savedDoneMap) || {};
    } catch {
      doneMap = {};
    }
  }

  if (savedSkippedMap) {
    try {
      skippedMap = JSON.parse(savedSkippedMap) || {};
    } catch {
      skippedMap = {};
    }
  }

  currentIndex = Number(savedIndex || 0);

  if (!Array.isArray(groups)) groups = [];
  if (typeof doneMap !== "object" || doneMap === null) doneMap = {};
  if (typeof skippedMap !== "object" || skippedMap === null) skippedMap = {};
  if (!Number.isFinite(currentIndex) || currentIndex < 0) currentIndex = 0;
}

function clearStateOnly() {
  localStorage.removeItem(STORAGE_KEYS.currentIndex);
  localStorage.removeItem(STORAGE_KEYS.doneMap);
  localStorage.removeItem(STORAGE_KEYS.skippedMap);
  doneMap = {};
  skippedMap = {};
  currentIndex = 0;
  hasOpenedCurrent = false;
}

function clearAllState() {
  localStorage.removeItem(STORAGE_KEYS.groups);
  localStorage.removeItem(STORAGE_KEYS.currentIndex);
  localStorage.removeItem(STORAGE_KEYS.doneMap);
  localStorage.removeItem(STORAGE_KEYS.skippedMap);
  groups = [];
  doneMap = {};
  skippedMap = {};
  currentIndex = 0;
  hasOpenedCurrent = false;
}

function saveTheme(mode) {
  localStorage.setItem(STORAGE_KEYS.theme, mode);
}

function loadTheme() {
  const mode = localStorage.getItem(STORAGE_KEYS.theme);
  if (mode === "light") {
    document.body.classList.add("light");
  }
}

function toggleTheme() {
  document.body.classList.toggle("light");
  saveTheme(document.body.classList.contains("light") ? "light" : "dark");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRows(rows) {
  const normalized = [];

  for (const row of rows) {
    const rawName = row.name ?? row.Name ?? row.NAME ?? row.group ?? row.Group ?? row.title ?? "";
    const rawLink = row.link ?? row.Link ?? row.LINK ?? row.url ?? row.URL ?? "";

    const name = String(rawName).trim();
    const link = String(rawLink).trim();

    if (!name || !link) continue;
    normalized.push({ name, link });
  }

  return normalized;
}

function getDoneCount() {
  return Object.values(doneMap).filter(Boolean).length;
}

function getRemainingCount() {
  return Math.max(groups.length - getDoneCount(), 0);
}

function getProgressPercent() {
  if (!groups.length) return 0;
  return Math.round((getDoneCount() / groups.length) * 100);
}

function getUnfinishedNormalIndexes() {
  const arr = [];
  for (let i = 0; i < groups.length; i++) {
    if (!doneMap[i] && !skippedMap[i]) arr.push(i);
  }
  return arr;
}

function getUnfinishedSkippedIndexes() {
  const arr = [];
  for (let i = 0; i < groups.length; i++) {
    if (!doneMap[i] && skippedMap[i]) arr.push(i);
  }
  return arr;
}

function isFinalDeferredStage() {
  return getUnfinishedNormalIndexes().length === 0 && getUnfinishedSkippedIndexes().length > 0;
}

function getNextAvailableIndex(preferredStart = 0) {
  const normal = getUnfinishedNormalIndexes();
  const skipped = getUnfinishedSkippedIndexes();

  const normalFromStart = normal.find((i) => i >= preferredStart);
  if (normalFromStart !== undefined) return normalFromStart;
  if (normal.length) return normal[0];

  const skippedFromStart = skipped.find((i) => i >= preferredStart);
  if (skippedFromStart !== undefined) return skippedFromStart;
  if (skipped.length) return skipped[0];

  return -1;
}

function syncCurrentIndex() {
  if (!groups.length) {
    currentIndex = 0;
    return;
  }

  const done = getDoneCount();
  if (done >= groups.length) {
    currentIndex = groups.length;
    return;
  }

  if (doneMap[currentIndex]) {
    currentIndex = getNextAvailableIndex(0);
    return;
  }

  if (!doneMap[currentIndex]) {
    const available = [...getUnfinishedNormalIndexes(), ...getUnfinishedSkippedIndexes()];
    if (!available.includes(currentIndex)) {
      currentIndex = getNextAvailableIndex(0);
    }
  }
}

function renderStats() {
  const done = getDoneCount();
  const total = groups.length;
  const remaining = getRemainingCount();
  const currentDisplay = total === 0
    ? 0
    : Math.min((currentIndex >= groups.length ? groups.length : currentIndex + 1), total);

  currentNumber.textContent = String(currentDisplay);
  totalNumber.textContent = String(total);
  remainingNumber.textContent = String(remaining);
  doneNumber.textContent = String(done);

  const percent = getProgressPercent();
  progressText.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

function updateActionButtons() {
  const finished = getDoneCount() >= groups.length || !groups.length;

  openBtn.disabled = finished;
  backBtn.disabled = !groups.length;
  restartBtn.disabled = !groups.length;

  if (finished) {
    doneBtn.classList.add("hidden");
    retryBtn.classList.add("hidden");
    skipBtn.classList.add("hidden");
    return;
  }

  if (!hasOpenedCurrent) {
    doneBtn.classList.add("hidden");
    retryBtn.classList.add("hidden");
    skipBtn.classList.add("hidden");
    return;
  }

  doneBtn.classList.remove("hidden");
  retryBtn.classList.remove("hidden");

  if (isFinalDeferredStage() || skippedMap[currentIndex]) {
    skipBtn.classList.add("hidden");
  } else {
    skipBtn.classList.remove("hidden");
  }
}

function renderGroup() {
  if (!groups.length) {
    mainSection.classList.add("hidden");
    completedSection.classList.add("hidden");
    updateActionButtons();
    return;
  }

  mainSection.classList.remove("hidden");
  syncCurrentIndex();

  if (getDoneCount() >= groups.length) {
    completedSection.classList.remove("hidden");

    groupStep.textContent = `تم إنهاء ${groups.length} من ${groups.length}`;
    groupName.textContent = "انتهيت من كل الجروبات";
    groupLink.textContent = "يمكنك إعادة البدء أو إعادة تحميل الملف.";
    groupAvatar.textContent = "✓";

    updateActionButtons();
    return;
  }

  completedSection.classList.add("hidden");

  const item = groups[currentIndex];
  const deferred = skippedMap[currentIndex] === true;
  const finalStage = isFinalDeferredStage();

  if (finalStage && deferred) {
    groupStep.textContent = `جروب مؤجل ${currentIndex + 1} من ${groups.length}`;
  } else {
    groupStep.textContent = `جروب ${currentIndex + 1} من ${groups.length}`;
  }

  groupName.textContent = item.name;
  groupLink.textContent = item.link;
  groupAvatar.textContent = (item.name || "W").trim().charAt(0).toUpperCase();

  updateActionButtons();
}

function render() {
  renderStats();
  renderGroup();

  if (groups.length) {
    fileStatus.className = "status-box";
    fileStatus.innerHTML = `تم تحميل <b>${groups.length}</b> جروب من الملف <b>whatsapp.xlsx</b>. يتم حفظ التقدم تلقائيًا على هذا الجهاز.`;
  } else {
    fileStatus.className = "status-box muted";
    fileStatus.textContent = "لم يتم تحميل الملف بعد.";
  }
}

function openCurrentGroup() {
  if (!groups.length || currentIndex >= groups.length) return;

  const item = groups[currentIndex];
  window.open(item.link, "_blank", "noopener,noreferrer");
  hasOpenedCurrent = true;
  updateActionButtons();

  const deferred = skippedMap[currentIndex] === true;
  messageBox.innerHTML = deferred
    ? `أنت الآن في جروب مؤجل: <b>${escapeHtml(item.name)}</b><br>بعد الرجوع اختر <b>تم الدخول</b> أو <b>لم أدخل</b>.`
    : `تم فتح الجروب الحالي: <b>${escapeHtml(item.name)}</b><br>بعد الرجوع اختر <b>تم الدخول</b> أو <b>لم أدخل</b> أو <b>تخطي مؤقت</b>.`;
}

function moveToNext() {
  const next = getNextAvailableIndex(currentIndex + 1);
  currentIndex = next === -1 ? groups.length : next;
  hasOpenedCurrent = false;
  saveState();
  render();
}

function markCurrentDone() {
  if (!groups.length || currentIndex >= groups.length) return;

  doneMap[currentIndex] = true;
  delete skippedMap[currentIndex];
  moveToNext();
}

function retryCurrent() {
  if (!groups.length || currentIndex >= groups.length) return;
  openCurrentGroup();
}

function skipCurrentTemporarily() {
  if (!groups.length || currentIndex >= groups.length) return;

  if (isFinalDeferredStage() || skippedMap[currentIndex]) {
    messageBox.innerHTML = `هذا الجروب مؤجل بالفعل ووصلت له في النهاية، لذلك لا يمكن تخطيه مرة أخرى.`;
    return;
  }

  skippedMap[currentIndex] = true;
  moveToNext();
  messageBox.innerHTML = `تم تأجيل هذا الجروب مؤقتًا إلى نهاية الدور.`;
}

function goBack() {
  if (!groups.length) return;

  for (let i = Math.min(currentIndex - 1, groups.length - 1); i >= 0; i--) {
    if (doneMap[i]) {
      doneMap[i] = false;
      currentIndex = i;
      hasOpenedCurrent = false;
      saveState();
      render();
      messageBox.innerHTML = `تم الرجوع خطوة للخلف وإلغاء تعليم هذا الجروب كمكتمل.`;
      return;
    }
  }

  currentIndex = 0;
  hasOpenedCurrent = false;
  saveState();
  render();
  messageBox.innerHTML = `أنت الآن عند أول جروب.`;
}

function restartAll() {
  if (!groups.length) return;

  const confirmed = window.confirm("هل تريد إعادة البدء من أول جروب ومسح التقدم الحالي؟");
  if (!confirmed) return;

  doneMap = {};
  skippedMap = {};
  currentIndex = 0;
  hasOpenedCurrent = false;
  saveState();
  render();
  messageBox.innerHTML = `تمت إعادة البدء من أول جروب.`;
}

async function loadExcelFromRoot({ resetProgress = false } = {}) {
  try {
    fileStatus.className = "status-box muted";
    fileStatus.textContent = "جاري تحميل ملف whatsapp.xlsx ...";

    const response = await fetch("./whatsapp.xlsx", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const parsed = normalizeRows(rows);

    if (!parsed.length) {
      throw new Error("EMPTY_OR_INVALID_DATA");
    }

    const oldSerialized = JSON.stringify(groups);
    const newSerialized = JSON.stringify(parsed);

    groups = parsed;

    if (resetProgress || oldSerialized !== newSerialized) {
      doneMap = {};
      skippedMap = {};
      currentIndex = 0;
      hasOpenedCurrent = false;
    } else {
      syncCurrentIndex();
      hasOpenedCurrent = false;
    }

    saveState();
    render();
  } catch (error) {
    console.error(error);
    mainSection.classList.add("hidden");
    completedSection.classList.add("hidden");
    fileStatus.className = "status-box muted";
    fileStatus.innerHTML = `
      تعذر تحميل الملف <b>whatsapp.xlsx</b>.<br>
      تأكد أنه موجود في جذر المشروع وأنك تشغل الموقع عبر <b>Local Server</b>.
    `;
  }
}

openBtn.addEventListener("click", openCurrentGroup);
doneBtn.addEventListener("click", markCurrentDone);
retryBtn.addEventListener("click", retryCurrent);
skipBtn.addEventListener("click", skipCurrentTemporarily);
backBtn.addEventListener("click", goBack);
restartBtn.addEventListener("click", restartAll);
restartAfterDoneBtn.addEventListener("click", restartAll);

reloadFileBtn.addEventListener("click", async () => {
  await loadExcelFromRoot({ resetProgress: false });
  messageBox.innerHTML = `تمت إعادة تحميل الملف من الجذر.`;
});

clearAllBtn.addEventListener("click", () => {
  const confirmed = window.confirm("هل تريد مسح كل التقدم المحفوظ؟");
  if (!confirmed) return;

  clearStateOnly();
  saveState();
  render();
  messageBox.innerHTML = `تم مسح التقدم المحفوظ والبدء من أول جروب.`;
});

themeToggle.addEventListener("click", toggleTheme);

loadTheme();
loadState();
render();
loadExcelFromRoot({ resetProgress: false });