const ADMIN_PASSWORD = 'stalworld-admin';
const STORAGE_KEY = 'bugtracker_admin_session';

let bugs = [];

function isLoggedIn() {
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

function showAdmin() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminScreen').classList.remove('hidden');
}

function login(e) {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASSWORD) {
    sessionStorage.setItem(STORAGE_KEY, '1');
    showAdmin();
    loadAdminData();
  } else {
    document.getElementById('loginError').textContent = 'Неверный пароль';
  }
}

function logout() {
  sessionStorage.removeItem(STORAGE_KEY);
  location.reload();
}

async function loadAdminData() {
  bugs = (await loadBugs()).slice();
  renderAdminList();
  fillAdminFormSelects();
  exportJson();
}

function renderAdminList() {
  const list = document.getElementById('adminBugList');
  list.innerHTML = bugs.map((b, i) => `
    <div class="admin-item">
      <span>${b.id} — ${escapeHtml(b.title.slice(0, 40))}</span>
      <span>
        <button type="button" onclick="editBug(${i})">Edit</button>
        <button type="button" onclick="deleteBug(${i})">Del</button>
      </span>
    </div>
  `).join('');
}

function fillAdminFormSelects() {
  ['editCategory', 'editPriority', 'editStatus'].forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = '';
  });

  CONFIG.categories.forEach(c => {
    document.getElementById('editCategory').innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
  CONFIG.priorities.forEach(p => {
    document.getElementById('editPriority').innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
  Object.entries(CONFIG.labels).forEach(([id, name]) => {
    document.getElementById('editStatus').innerHTML += `<option value="${id}">${name}</option>`;
  });
}

function clearForm() {
  document.getElementById('editIndex').value = '';
  document.getElementById('editId').value = 'BUG-' + String(bugs.length + 1).padStart(3, '0');
  document.getElementById('editTitle').value = '';
  document.getElementById('editDescription').value = '';
  document.getElementById('editSteps').value = '';
  document.getElementById('editCategory').value = 'other';
  document.getElementById('editPriority').value = 'medium';
  document.getElementById('editStatus').value = 'open';
  document.getElementById('editVersion').value = '';
  document.getElementById('editPlatform').value = '';
  document.getElementById('editReporter').value = '';
  document.getElementById('editVotes').value = '0';
}

function editBug(index) {
  const b = bugs[index];
  document.getElementById('editIndex').value = index;
  document.getElementById('editId').value = b.id;
  document.getElementById('editTitle').value = b.title;
  document.getElementById('editDescription').value = b.description || '';
  document.getElementById('editSteps').value = b.steps || '';
  document.getElementById('editCategory').value = b.category || 'other';
  document.getElementById('editPriority').value = b.priority || 'medium';
  document.getElementById('editStatus').value = b.status || 'open';
  document.getElementById('editVersion').value = b.version || '';
  document.getElementById('editPlatform').value = b.platform || '';
  document.getElementById('editReporter').value = b.reporter || '';
  document.getElementById('editVotes').value = b.votes || 0;
}

function deleteBug(index) {
  if (!confirm('Удалить баг ' + bugs[index].id + '?')) return;
  bugs.splice(index, 1);
  renderAdminList();
  exportJson();
  clearForm();
}

function saveBug(e) {
  e.preventDefault();
  const index = document.getElementById('editIndex').value;
  const today = new Date().toISOString().slice(0, 10);

  const bug = {
    id: document.getElementById('editId').value.trim(),
    title: document.getElementById('editTitle').value.trim(),
    description: document.getElementById('editDescription').value.trim(),
    steps: document.getElementById('editSteps').value.trim(),
    category: document.getElementById('editCategory').value,
    priority: document.getElementById('editPriority').value,
    status: document.getElementById('editStatus').value,
    version: document.getElementById('editVersion').value.trim(),
    platform: document.getElementById('editPlatform').value.trim(),
    reporter: document.getElementById('editReporter').value.trim(),
    votes: parseInt(document.getElementById('editVotes').value, 10) || 0,
    comments: index !== '' ? (bugs[index].comments || []) : [],
    createdAt: index !== '' ? bugs[index].createdAt : today,
    updatedAt: today
  };

  if (!bug.id || !bug.title) {
    alert('ID и заголовок обязательны');
    return;
  }

  if (index !== '') {
    bugs[index] = bug;
  } else {
    bugs.push(bug);
  }

  renderAdminList();
  exportJson();
  clearForm();
  alert('Сохранено локально. Скопируй JSON ниже в data/bugs.json и запушь на GitHub.');
}

function exportJson() {
  const output = JSON.stringify({ bugs }, null, 2);
  document.getElementById('jsonOutput').value = output;
}

function copyJson() {
  const el = document.getElementById('jsonOutput');
  el.select();
  document.execCommand('copy');
  alert('JSON скопирован в буфер обмена');
}

function downloadJson() {
  const blob = new Blob([document.getElementById('jsonOutput').value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bugs.json';
  a.click();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function initAdmin() {
  const siteNameEl = document.getElementById('siteName');
  if (siteNameEl) siteNameEl.textContent = CONFIG.siteName;
  document.getElementById('footerText').textContent = CONFIG.siteName;

  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('bugEditForm').addEventListener('submit', saveBug);
  document.getElementById('btnCopy').addEventListener('click', copyJson);
  document.getElementById('btnDownload').addEventListener('click', downloadJson);
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnNew').addEventListener('click', clearForm);

  if (isLoggedIn()) {
    showAdmin();
    loadAdminData();
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
