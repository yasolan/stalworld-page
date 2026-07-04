let bugs = [];
let logsUnsubscribe = null;

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
  renderAdminList();
  fillAdminFormSelects();
  exportJson();
  startLogsStream();
}

function startLogsStream() {
  if (logsUnsubscribe) logsUnsubscribe();
  logsUnsubscribe = Logger.subscribeAdmin(logs => {
    Logger.renderTable(logs, "logsTable");
  });
}

function renderAdminList() {
  const list = document.getElementById("adminBugList");
  list.innerHTML = bugs.map((b, i) => `
    <div class="admin-item">
      <span>${b.id} — ${escapeHtml(b.title.slice(0, 40))}</span>
      <span>
        <button type="button" onclick="editBug(${i})">Edit</button>
        <button type="button" onclick="deleteBug(${i})">Del</button>
      </span>
    </div>
  `).join("");
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
  document.getElementById("editIndex").value = "";
  document.getElementById("editId").value = "BUG-" + String(bugs.length + 1).padStart(3, "0");
  document.getElementById("editTitle").value = "";
  document.getElementById("editDescription").value = "";
  document.getElementById("editSteps").value = "";
  document.getElementById("editCategory").value = "other";
  document.getElementById("editPriority").value = "medium";
  document.getElementById("editStatus").value = "open";
  document.getElementById("editVersion").value = "";
  document.getElementById("editPlatform").value = "";
  document.getElementById("editReporter").value = "";
  document.getElementById("editVotes").value = "0";
}

function editBug(index) {
  const b = bugs[index];
  document.getElementById("editIndex").value = index;
  document.getElementById("editId").value = b.id;
  document.getElementById("editTitle").value = b.title;
  document.getElementById("editDescription").value = b.description || "";
  document.getElementById("editSteps").value = b.steps || "";
  document.getElementById("editCategory").value = b.category || "other";
  document.getElementById("editPriority").value = b.priority || "medium";
  document.getElementById("editStatus").value = b.status || "open";
  document.getElementById("editVersion").value = b.version || "";
  document.getElementById("editPlatform").value = b.platform || "";
  document.getElementById("editReporter").value = b.reporter || "";
  document.getElementById("editVotes").value = b.votes || 0;
}

async function deleteBug(index) {
  if (!confirm("Удалить баг " + bugs[index].id + "?")) return;
  const id = bugs[index].id;
  bugs.splice(index, 1);
  renderAdminList();
  exportJson();
  clearForm();
  await Logger.write("admin.bug_delete", "Удалён баг", { bugId: id });
}

async function saveBug(e) {
  e.preventDefault();
  const index = document.getElementById("editIndex").value;
  const today = new Date().toISOString().slice(0, 10);
  const isNew = index === "";

  const bug = {
    id: document.getElementById("editId").value.trim(),
    title: document.getElementById("editTitle").value.trim(),
    description: document.getElementById("editDescription").value.trim(),
    steps: document.getElementById("editSteps").value.trim(),
    category: document.getElementById("editCategory").value,
    priority: document.getElementById("editPriority").value,
    status: document.getElementById("editStatus").value,
    version: document.getElementById("editVersion").value.trim(),
    platform: document.getElementById("editPlatform").value.trim(),
    reporter: document.getElementById("editReporter").value.trim(),
    votes: parseInt(document.getElementById("editVotes").value, 10) || 0,
    comments: !isNew ? (bugs[index].comments || []) : [],
    createdAt: !isNew ? bugs[index].createdAt : today,
    updatedAt: today
  };

  if (!bug.id || !bug.title) {
    alert("ID и заголовок обязательны");
    return;
  }

  if (!isNew) {
    bugs[index] = bug;
  } else {
    bugs.push(bug);
  }

  renderAdminList();
  exportJson();
  clearForm();
  await Logger.write(isNew ? "admin.bug_create" : "admin.bug_update", isNew ? "Создан баг" : "Обновлён баг", { bugId: bug.id, title: bug.title });
  alert("Сохранено. Скопируй JSON в data/bugs.json и запушь на GitHub.");
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
