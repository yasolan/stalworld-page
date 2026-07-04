const STATUS_LABELS = CONFIG.labels;
const CATEGORY_MAP = Object.fromEntries(CONFIG.categories.map(c => [c.id, c.name]));
const PRIORITY_MAP = Object.fromEntries(CONFIG.priorities.map(p => [p.id, p.name]));

async function loadBugs() {
  const res = await fetch("data/bugs.json");
  if (!res.ok) throw new Error("Не удалось загрузить data/bugs.json");
  const data = await res.json();
  return data.bugs || [];
}

function badge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

function priorityBadge(priority) {
  const label = PRIORITY_MAP[priority] || priority;
  return `<span class="badge badge-priority-${priority}">${label}</span>`;
}

function renderStats(bugs) {
  const open = bugs.filter(b => b.status === "open" || b.status === "in_progress").length;
  const fixed = bugs.filter(b => b.status === "fixed").length;
  document.getElementById("statTotal").textContent = bugs.length;
  document.getElementById("statOpen").textContent = open;
  document.getElementById("statFixed").textContent = fixed;
}

function renderBugList(bugs) {
  const list = document.getElementById("bugList");
  const empty = document.getElementById("emptyState");

  if (!bugs.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = bugs.map(bug => `
    <article class="bug-card bug-card--${bug.status}" data-id="${bug.id}">
      <div class="bug-card-top">
        <div class="bug-card-main">
          <div class="bug-id">${bug.id}</div>
          <div class="bug-title">${escapeHtml(bug.title)}</div>
          <p class="bug-excerpt">${escapeHtml(truncate(bug.description, 140))}</p>
        </div>
        ${bug.screenshot ? `<div class="bug-card-thumb"><img src="${escapeHtml(bug.screenshot)}" alt=""></div>` : ""}
      </div>
      <div class="bug-card-bottom">
        <div class="bug-meta">${badge(bug.status)} ${priorityBadge(bug.priority)}</div>
        <div class="bug-footer">
          <span>${CATEGORY_MAP[bug.category] || bug.category}</span>
          <span>${bug.reporter || "—"}</span>
          <span>${bug.updatedAt || bug.createdAt}</span>
        </div>
      </div>
    </article>
  `).join("");

  list.querySelectorAll(".bug-card").forEach(card => {
    card.addEventListener("click", () => {
      const bug = bugs.find(b => b.id === card.dataset.id);
      if (bug) openModal(bug);
    });
  });
}

function openModal(bug) {
  const overlay = document.getElementById("modal");
  document.getElementById("modalTitle").textContent = bug.title;
  document.getElementById("modalId").textContent = bug.id;
  document.getElementById("modalStatus").innerHTML = badge(bug.status) + " " + priorityBadge(bug.priority);
  document.getElementById("modalDescription").textContent = bug.description || "—";
  document.getElementById("modalSteps").textContent = bug.steps || "—";
  document.getElementById("modalMeta").innerHTML = `
    <div class="meta-grid">
      <div><span>Категория</span><strong>${CATEGORY_MAP[bug.category] || bug.category}</strong></div>
      <div><span>Автор</span><strong>${escapeHtml(bug.reporter || "—")}</strong></div>
      <div><span>Создан</span><strong>${bug.createdAt || "—"}</strong></div>
      <div><span>Обновлён</span><strong>${bug.updatedAt || "—"}</strong></div>
    </div>
  `;

  const shotEl = document.getElementById("modalScreenshot");
  if (bug.screenshot) {
    shotEl.innerHTML = screenshotBlock(bug.screenshot, bug.title);
    shotEl.parentElement.classList.remove("hidden");
  } else {
    shotEl.innerHTML = "";
    shotEl.parentElement.classList.add("hidden");
  }

  const commentsEl = document.getElementById("modalComments");
  if (bug.comments && bug.comments.length) {
    commentsEl.innerHTML = bug.comments.map(c => `
      <div class="comment">
        <div class="comment-author">${escapeHtml(c.author)} <span class="comment-date">${c.date || ""}</span></div>
        <div>${escapeHtml(c.text)}</div>
      </div>
    `).join("");
  } else {
    commentsEl.innerHTML = '<p class="muted">Комментариев пока нет.</p>';
  }

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  document.body.style.overflow = "";
}

function filterBugs(bugs) {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const category = document.getElementById("categoryFilter").value;

  return bugs.filter(b => {
    if (status && b.status !== status) return false;
    if (category && b.category !== category) return false;
    if (search) {
      const hay = `${b.id} ${b.title} ${b.description}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function truncate(str, len) {
  if (!str || str.length <= len) return str || "";
  return str.slice(0, len) + "…";
}

function fillSelects() {
  const statusFilter = document.getElementById("statusFilter");
  const categoryFilter = document.getElementById("categoryFilter");

  Object.entries(STATUS_LABELS).forEach(([id, name]) => {
    statusFilter.innerHTML += `<option value="${id}">${name}</option>`;
  });

  CONFIG.categories.forEach(c => {
    categoryFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

let allBugs = [];

async function init() {
  if (!document.getElementById("bugList")) return;

  const siteNameEl = document.getElementById("siteName");
  if (siteNameEl) siteNameEl.textContent = CONFIG.siteName;
  document.getElementById("footerText").textContent = CONFIG.siteName;

  fillSelects();

  try {
    allBugs = await loadBugs();
    allBugs.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    renderStats(allBugs);
    renderBugList(allBugs);
  } catch (e) {
    document.getElementById("bugList").innerHTML = `<div class="notice">Ошибка загрузки: ${e.message}</div>`;
  }

  ["searchInput", "statusFilter", "categoryFilter"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      renderBugList(filterBugs(allBugs));
    });
  });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", e => {
    if (e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
