let bugs = [];
let bugsUnsub = null;
let logsUnsubscribe = null;
let selectedBugId = null;

function showAdmin() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("adminScreen").classList.remove("hidden");
}

function showLogin(msg) {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("adminScreen").classList.add("hidden");
  if (msg) document.getElementById("loginError").textContent = msg;
}

async function adminLogin(e) {
  e.preventDefault();
  const err = document.getElementById("loginError");
  err.textContent = "";

  if (!FirebaseApp.init()) {
    err.textContent = "Firebase не настроен. См. FIREBASE_SETUP.md";
    return;
  }

  try {
    const user = await AuthService.login(
      document.getElementById("adminEmail").value,
      document.getElementById("adminPassword").value
    );
    const isAdmin = await AuthService.isAdmin(user);
    if (!isAdmin) {
      await AuthService.logout();
      err.textContent = "Нет прав администратора";
      return;
    }
    await Logger.write("admin.login", "Вход в админку");
    showAdmin();
    await loadAdminData();
  } catch (ex) {
    err.textContent = ex.message || "Ошибка входа";
  }
}

async function logout() {
  if (bugsUnsub) bugsUnsub();
  if (logsUnsubscribe) logsUnsubscribe();
  await AuthService.logout();
  showLogin();
}

function loadAdminData() {
  fillAdminFormSelects();
  clearForm();
  bindScreenshotPreview("editScreenshotFile", "editScreenshotPreview", "editScreenshotUrl");
  startLogsStream();

  if (bugsUnsub) bugsUnsub();
  bugsUnsub = BugsService.subscribeBugs(list => {
    bugs = list;
    renderAdminList();
    if (selectedBugId) {
      const bug = bugs.find(b => b.id === selectedBugId);
      if (bug) populateForm(bug);
    }
  });
}

function startLogsStream() {
  if (logsUnsubscribe) logsUnsubscribe();
  logsUnsubscribe = Logger.subscribeAdmin(logs => {
    Logger.renderTable(logs, "logsTable");
  });
}

function renderAdminList() {
  const list = document.getElementById("adminBugList");
  const filter = (document.getElementById("adminSearch")?.value || "").toLowerCase();
  const cats = CATEGORY_MAP();
  const filtered = bugs.filter(b => {
    if (!filter) return true;
    return `${b.id} ${b.title} ${b.description}`.toLowerCase().includes(filter);
  });

  if (!filtered.length) {
    list.innerHTML = '<p class="muted" style="padding:12px">Багов нет</p>';
    return;
  }

  list.innerHTML = filtered.map(b => `
    <button type="button" class="admin-bug-item admin-bug-item--${b.priority} ${b.id === selectedBugId ? "active" : ""}" onclick="selectBug('${b.id}')">
      <div class="admin-bug-item-top">
        <span class="bug-id">${b.id}</span>
        ${priorityBadge(b.priority)} ${statusBadge(b.status)}
      </div>
      <div class="admin-bug-item-title">${escapeHtml(b.title)}</div>
      <div class="admin-bug-item-meta">${cats[b.category] || b.category} · ${formatDateShort(b.updatedAt || b.createdAt)}</div>
    </button>
  `).join("");
}

function selectBug(bugId) {
  selectedBugId = bugId;
  const bug = bugs.find(b => b.id === bugId);
  if (bug) populateForm(bug);
  renderAdminList();
}

function fillAdminFormSelects() {
  fillCategorySelect("editCategory");
  fillPrioritySelect("editPriority", "medium");
  fillStatusSelect("editStatus");
}

function clearForm() {
  selectedBugId = null;
  document.getElementById("editIdDisplay").textContent = "новый";
  document.getElementById("editOpenLink").classList.add("hidden");
  document.getElementById("editTitle").value = "";
  document.getElementById("editDescription").value = "";
  document.getElementById("editSteps").value = "";
  document.getElementById("editScreenshotUrl").value = "";
  document.getElementById("editScreenshotFile").value = "";
  document.getElementById("editScreenshotPreview").innerHTML = "";
  document.getElementById("editCategory").value = "other";
  document.getElementById("editPriority").value = "medium";
  document.getElementById("editStatus").value = "open";
  document.getElementById("editReporter").value = "";
  renderAdminList();
}

function populateForm(b) {
  document.getElementById("editIdDisplay").textContent = b.id;
  const link = document.getElementById("editOpenLink");
  link.href = "bug.html?id=" + encodeURIComponent(b.id);
  link.classList.remove("hidden");
  document.getElementById("editTitle").value = b.title;
  document.getElementById("editDescription").value = b.description || "";
  document.getElementById("editSteps").value = b.steps || "";
  document.getElementById("editScreenshotUrl").value = b.screenshot || "";
  document.getElementById("editScreenshotFile").value = "";
  document.getElementById("editCategory").value = b.category || "other";
  document.getElementById("editPriority").value = b.priority || "medium";
  document.getElementById("editStatus").value = b.status || "open";
  document.getElementById("editReporter").value = b.reporter || "";
  document.getElementById("editScreenshotPreview").innerHTML = b.screenshot ? screenshotBlock(b.screenshot, b.title) : "";
}

async function deleteSelectedBug() {
  if (!selectedBugId) {
    alert("Выберите баг из списка");
    return;
  }
  if (!confirm("Удалить баг " + selectedBugId + "? Комментарии тоже удалятся.")) return;
  const id = selectedBugId;
  await BugsService.deleteBug(id);
  await Logger.write("admin.bug_delete", "Удалён баг", { bugId: id });
  clearForm();
}

async function saveBug(e) {
  e.preventDefault();
  const isNew = !selectedBugId;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    let screenshot = document.getElementById("editScreenshotUrl").value.trim();
    const file = document.getElementById("editScreenshotFile").files?.[0];
    if (file) {
      screenshot = await uploadScreenshot(file);
      document.getElementById("editScreenshotUrl").value = screenshot;
    }

    const data = {
      title: document.getElementById("editTitle").value.trim(),
      description: document.getElementById("editDescription").value.trim(),
      steps: document.getElementById("editSteps").value.trim(),
      screenshot,
      category: document.getElementById("editCategory").value,
      priority: document.getElementById("editPriority").value,
      status: document.getElementById("editStatus").value,
      reporter: document.getElementById("editReporter").value.trim()
    };

    if (!data.title) {
      alert("Заголовок обязателен");
      return;
    }

    const user = AuthService.currentUser();
    const profile = await AuthService.getProfile(user.uid);

    if (isNew) {
      selectedBugId = await BugsService.createBug(data, user, profile);
      await Logger.write("admin.bug_create", "Создан баг", { bugId: selectedBugId, title: data.title });
    } else {
      await BugsService.updateBug(selectedBugId, data);
      await Logger.write("admin.bug_update", "Обновлён баг", { bugId: selectedBugId, title: data.title });
    }
  } catch (ex) {
    alert(ex.message || "Ошибка сохранения");
  } finally {
    submitBtn.disabled = false;
  }
}

async function seedFromJson() {
  if (!confirm("Импортировать баги из data/bugs.json в Firestore? Существующие с тем же ID будут обновлены.")) return;
  try {
    const res = await fetch("data/bugs.json");
    const json = await res.json();
    await BugsService.seedFromJson(json.bugs || []);
    alert("Импорт завершён");
    await Logger.write("admin.seed", "Импорт bugs.json", { count: (json.bugs || []).length });
  } catch (ex) {
    alert(ex.message || "Ошибка импорта");
  }
}

function switchTab(tab) {
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.getElementById("tabBugs").classList.toggle("hidden", tab !== "bugs");
  document.getElementById("tabLogs").classList.toggle("hidden", tab !== "logs");
}

async function initAdmin() {
  document.getElementById("footerText").textContent = CONFIG.siteName;

  document.getElementById("loginForm").addEventListener("submit", adminLogin);
  document.getElementById("bugEditForm").addEventListener("submit", saveBug);
  document.getElementById("btnLogout").addEventListener("click", logout);
  document.getElementById("btnNew").addEventListener("click", clearForm);
  document.getElementById("btnDelete").addEventListener("click", deleteSelectedBug);
  document.getElementById("btnSeed")?.addEventListener("click", seedFromJson);
  document.getElementById("adminSearch")?.addEventListener("input", renderAdminList);

  document.querySelectorAll(".admin-tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  if (!FirebaseApp.isConfigured()) {
    showLogin("Firebase не настроен — см. FIREBASE_SETUP.md");
    return;
  }

  FirebaseApp.init();
  AuthService.onAuthChange(async (user, isAdmin) => {
    if (user && isAdmin) {
      showAdmin();
      loadAdminData();
    } else if (user && !isAdmin) {
      showLogin("Этот аккаунт не является администратором");
    }
  });
}

document.addEventListener("DOMContentLoaded", initAdmin);
