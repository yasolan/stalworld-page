let bugs = [];
let logsUnsubscribe = null;
let selectedIndex = -1;

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
  if (logsUnsubscribe) logsUnsubscribe();
  await AuthService.logout();
  showLogin();
}

async function loadAdminData() {
  bugs = (await loadBugs()).slice();
  selectedIndex = -1;
  renderAdminList();
  fillAdminFormSelects();
  clearForm();
  exportJson();
  startLogsStream();
  bindScreenshotPreview("editScreenshotFile", "editScreenshotPreview", "editScreenshotUrl");
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
  const filtered = bugs.map((b, i) => ({ b, i })).filter(({ b }) => {
    if (!filter) return true;
    return `${b.id} ${b.title} ${b.description}`.toLowerCase().includes(filter);
  });

  if (!filtered.length) {
    list.innerHTML = '<p class="muted" style="padding:12px">Багов нет</p>';
    return;
  }

  list.innerHTML = filtered.map(({ b, i }) => `
    <button type="button" class="admin-bug-item ${i === selectedIndex ? "active" : ""}" onclick="selectBug(${i})">
      <div class="admin-bug-item-top">
        <span class="bug-id">${b.id}</span>
        ${badge(b.status)}
      </div>
      <div class="admin-bug-item-title">${escapeHtml(b.title)}</div>
      <div class="admin-bug-item-meta">${CATEGORY_MAP[b.category] || b.category} · ${b.updatedAt || b.createdAt}</div>
    </button>
  `).join("");
}

function selectBug(index) {
  selectedIndex = index;
  editBug(index);
  renderAdminList();
}

function fillAdminFormSelects() {
  ["editCategory", "editPriority", "editStatus"].forEach(id => {
    document.getElementById(id).innerHTML = "";
  });
  CONFIG.categories.forEach(c => {
    document.getElementById("editCategory").innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
  CONFIG.priorities.forEach(p => {
    document.getElementById("editPriority").innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
  Object.entries(CONFIG.labels).forEach(([id, name]) => {
    document.getElementById("editStatus").innerHTML += `<option value="${id}">${name}</option>`;
  });
}

function clearForm() {
  selectedIndex = -1;
  document.getElementById("editIndex").value = "";
  const newId = nextBugId(bugs);
  document.getElementById("editId").value = newId;
  document.getElementById("editIdDisplay").textContent = newId;
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

function editBug(index) {
  const b = bugs[index];
  document.getElementById("editIndex").value = index;
  document.getElementById("editId").value = b.id;
  document.getElementById("editIdDisplay").textContent = b.id;
  document.getElementById("editTitle").value = b.title;
  document.getElementById("editDescription").value = b.description || "";
  document.getElementById("editSteps").value = b.steps || "";
  document.getElementById("editScreenshotUrl").value = b.screenshot || "";
  document.getElementById("editScreenshotFile").value = "";
  document.getElementById("editCategory").value = b.category || "other";
  document.getElementById("editPriority").value = b.priority || "medium";
  document.getElementById("editStatus").value = b.status || "open";
  document.getElementById("editReporter").value = b.reporter || "";
  const preview = document.getElementById("editScreenshotPreview");
  preview.innerHTML = b.screenshot ? screenshotBlock(b.screenshot, b.title) : "";
}

async function deleteBug(index) {
  if (!confirm("Удалить баг " + bugs[index].id + "?")) return;
  const id = bugs[index].id;
  bugs.splice(index, 1);
  clearForm();
  renderAdminList();
  exportJson();
  await Logger.write("admin.bug_delete", "Удалён баг", { bugId: id });
}

async function saveBug(e) {
  e.preventDefault();
  const index = document.getElementById("editIndex").value;
  const isNew = index === "";
  const today = new Date().toISOString().slice(0, 10);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    let screenshot = document.getElementById("editScreenshotUrl").value.trim();
    const file = document.getElementById("editScreenshotFile").files?.[0];
    if (file) {
      screenshot = await uploadScreenshot(file);
      document.getElementById("editScreenshotUrl").value = screenshot;
    }

    const bug = {
      id: document.getElementById("editId").value.trim(),
      title: document.getElementById("editTitle").value.trim(),
      description: document.getElementById("editDescription").value.trim(),
      steps: document.getElementById("editSteps").value.trim(),
      screenshot,
      category: document.getElementById("editCategory").value,
      priority: document.getElementById("editPriority").value,
      status: document.getElementById("editStatus").value,
      reporter: document.getElementById("editReporter").value.trim(),
      comments: !isNew ? (bugs[index].comments || []) : [],
      createdAt: !isNew ? bugs[index].createdAt : today,
      updatedAt: today
    };

    if (!bug.title) {
      alert("Заголовок обязателен");
      return;
    }

    if (isNew) {
      bug.id = nextBugId(bugs);
      bugs.push(bug);
      selectedIndex = bugs.length - 1;
    } else {
      bugs[index] = bug;
      selectedIndex = parseInt(index, 10);
    }

    document.getElementById("editId").value = bug.id;
    document.getElementById("editIdDisplay").textContent = bug.id;
    renderAdminList();
    exportJson();
    await Logger.write(isNew ? "admin.bug_create" : "admin.bug_update", isNew ? "Создан баг" : "Обновлён баг", { bugId: bug.id, title: bug.title });
  } catch (ex) {
    alert(ex.message || "Ошибка сохранения");
  } finally {
    submitBtn.disabled = false;
  }
}

function exportJson() {
  document.getElementById("jsonOutput").value = JSON.stringify({ bugs }, null, 2);
}

function copyJson() {
  document.getElementById("jsonOutput").select();
  document.execCommand("copy");
  alert("JSON скопирован");
}

function downloadJson() {
  const blob = new Blob([document.getElementById("jsonOutput").value], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bugs.json";
  a.click();
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
  document.getElementById("btnCopy").addEventListener("click", copyJson);
  document.getElementById("btnDownload").addEventListener("click", downloadJson);
  document.getElementById("btnLogout").addEventListener("click", logout);
  document.getElementById("btnNew").addEventListener("click", clearForm);
  document.getElementById("btnDelete").addEventListener("click", () => {
    if (selectedIndex >= 0) deleteBug(selectedIndex);
    else alert("Выберите баг из списка");
  });
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
      await loadAdminData();
    } else if (user && !isAdmin) {
      showLogin("Этот аккаунт не является администратором");
    }
  });
}

document.addEventListener("DOMContentLoaded", initAdmin);
