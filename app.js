const STORAGE_KEYS = {
  groups: "wa_groups_data_v1",
  currentIndex: "wa_groups_current_index_v1",
  doneMap: "wa_groups_done_map_v1",
  theme: "wa_groups_theme_v1",
};

let groups = [];
let currentIndex = 0;
let doneMap = {};

const excelFile = document.getElementById("excelFile");
const fileStatus = document.getElementById("fileStatus");
const uploadSection = document.getElementById("uploadSection");
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
const loadSampleBtn = document.getElementById("loadSampleBtn");
const themeToggle = document.getElementById("themeToggle");
const messageBox = document.getElementById("messageBox");

function saveState() {
  localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  localStorage.setItem(STORAGE_KEYS.currentIndex, String(currentIndex));
  localStorage.setItem(STORAGE_KEYS.doneMap, JSON.stringify(doneMap));
}

function loadState() {
  const savedGroups = localStorage.getItem(STORAGE_KEYS.groups);
  const savedIndex = localStorage.getItem(STORAGE_KEYS.currentIndex);
  const savedDoneMap = localStorage.getItem(STORAGE_KEYS.doneMap);

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

  currentIndex = Number(savedIndex || 0);

  if (!Array.isArray(groups)) groups = [];
  if (typeof doneMap !== "object" || doneMap === null) doneMap = {};
  if (!Number.isFinite(currentIndex) || currentIndex < 0) currentIndex = 0;
}

function clearState() {
  localStorage.removeItem(STORAGE_KEYS.groups);
  localStorage.removeItem(STORAGE_KEYS.currentIndex);
  localStorage.removeItem(STORAGE_KEYS.doneMap);
  groups = [];
  doneMap = {};
  currentIndex = 0;
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

function getSafeCurrentIndex() {
  if (!groups.length) return 0;

  if (currentIndex >= groups.length) {
    const firstNotDone = groups.findIndex((_, index) => !doneMap[index]);
    return firstNotDone === -1 ? groups.length - 1 : firstNotDone;
  }

  return currentIndex;
}

function moveToNextUndone(startFrom = currentIndex + 1) {
  for (let i = startFrom; i < groups.length; i++) {
    if (!doneMap[i]) {
      currentIndex = i;
      saveState();
      render();
      return;
    }
  }

  const firstNotDone = groups.findIndex((_, index) => !doneMap[index]);

  if (firstNotDone !== -1) {
    currentIndex = firstNotDone;
  } else {
    currentIndex = groups.length;
  }

  saveState();
  render();
}

function renderStats() {
  const done = getDoneCount();
  const total = groups.length;
  const remaining = getRemainingCount();
  const currentDisplay = total === 0 ? 0 : Math.min(getSafeCurrentIndex() + 1, total);

  currentNumber.textContent = String(currentDisplay);
  totalNumber.textContent = String(total);
  remainingNumber.textContent = String(remaining);
  doneNumber.textContent = String(done);

  const percent = getProgressPercent();
  progressText.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

function renderGroup() {
  if (!groups.length) {
    mainSection.classList.add("hidden");
    completedSection.classList.add("hidden");
    return;
  }

  if (getDoneCount() >= groups.length) {
    mainSection.classList.remove("hidden");
    completedSection.classList.remove("hidden");

    groupStep.textContent = `تم إنهاء ${groups.length} من ${groups.length}`;
    groupName.textContent = "انتهيت من كل الجروبات";
    groupLink.textContent = "يمكنك إعادة البدء أو تحميل ملف جديد.";
    groupAvatar.textContent = "✓";

    openBtn.disabled = true;
    doneBtn.disabled = true;
    retryBtn.disabled = true;
    skipBtn.disabled = true;

    return;
  }

  completedSection.classList.add("hidden");

  currentIndex = getSafeCurrentIndex();
  const item = groups[currentIndex];

  groupStep.textContent = `جروب ${currentIndex + 1} من ${groups.length}`;
  groupName.textContent = item.name;
  groupLink.textContent = item.link;
  groupAvatar.textContent = (item.name || "W").trim().charAt(0).toUpperCase();

  openBtn.disabled = false;
  doneBtn.disabled = false;
  retryBtn.disabled = false;
  skipBtn.disabled = false;
}

function render() {
  const hasData = groups.length > 0;
  mainSection.classList.toggle("hidden", !hasData);

  renderStats();
  renderGroup();

  if (hasData) {
    fileStatus.className = "status-box";
    fileStatus.innerHTML = `تم تحميل <b>${groups.length}</b> جروب. يتم حفظ التقدم تلقائيًا على هذا الجهاز.`;
  } else {
    fileStatus.className = "status-box muted";
    fileStatus.textContent = "لم يتم تحميل أي ملف بعد.";
  }
}

function openCurrentGroup() {
  if (!groups.length || currentIndex >= groups.length) return;

  const item = groups[currentIndex];
  window.open(item.link, "_blank", "noopener,noreferrer");
  messageBox.innerHTML = `تم فتح الجروب الحالي: <b>${escapeHtml(item.name)}</b><br>بعد الرجوع اختر <b>تم الدخول</b> أو <b>لم أدخل</b>.`;
}

function markCurrentDone() {
  if (!groups.length || currentIndex >= groups.length) return;
  doneMap[currentIndex] = true;
  saveState();
  moveToNextUndone(currentIndex + 1);
}

function retryCurrent() {
  if (!groups.length || currentIndex >= groups.length) return;
  openCurrentGroup();
}

function skipCurrent() {
  if (!groups.length || currentIndex >= groups.length) return;
  moveToNextUndone(currentIndex + 1);
}

function goBack() {
  if (!groups.length) return;

  const target = Math.max(currentIndex - 1, 0);
  currentIndex = target;

  if (doneMap[currentIndex]) {
    doneMap[currentIndex] = false;
  }

  saveState();
  render();
  messageBox.innerHTML = `تم الرجوع خطوة للخلف. يمكنك الآن إعادة المحاولة أو التعليم كمكتمل.`;
}

function restartAll() {
  if (!groups.length) return;

  const confirmed = window.confirm("هل تريد إعادة البدء من أول جروب ومسح التقدم الحالي؟");
  if (!confirmed) return;

  doneMap = {};
  currentIndex = 0;
  saveState();
  render();
  messageBox.innerHTML = `تمت إعادة البدء من أول جروب.`;
}

function parseExcelFile(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const parsed = normalizeRows(rows);

      if (!parsed.length) {
        alert("لم أجد بيانات صالحة. تأكد أن الملف يحتوي على الأعمدة name و link.");
        return;
      }

      groups = parsed;
      doneMap = {};
      currentIndex = 0;
      saveState();
      render();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء قراءة ملف Excel.");
    }
  };

  reader.readAsArrayBuffer(file);
}

function loadSampleData() {
  groups = [
    { name: "جروب المبيعات", link: "https://chat.whatsapp.com/example-1" },
    { name: "جروب العملاء", link: "https://chat.whatsapp.com/example-2" },
    { name: "جروب الدعم", link: "https://chat.whatsapp.com/example-3" },
  ];
  doneMap = {};
  currentIndex = 0;
  saveState();
  render();
}

excelFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  parseExcelFile(file);
});

openBtn.addEventListener("click", openCurrentGroup);
doneBtn.addEventListener("click", markCurrentDone);
retryBtn.addEventListener("click", retryCurrent);
skipBtn.addEventListener("click", skipCurrent);
backBtn.addEventListener("click", goBack);
restartBtn.addEventListener("click", restartAll);
restartAfterDoneBtn.addEventListener("click", restartAll);

clearAllBtn.addEventListener("click", () => {
  const confirmed = window.confirm("هل تريد مسح كل البيانات والتقدم المحفوظ؟");
  if (!confirmed) return;

  clearState();
  excelFile.value = "";
  render();
  messageBox.innerHTML = `تم مسح كل البيانات المحفوظة.`;
});

loadSampleBtn.addEventListener("click", loadSampleData);
themeToggle.addEventListener("click", toggleTheme);

loadTheme();
loadState();
render();