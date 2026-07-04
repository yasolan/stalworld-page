let allBugs = [];
let bugsUnsub = null;

function renderStats(bugs) {
  const open = bugs.filter(b => b.status === "open" || b.status === "in_progress").length;
  const fixed = bugs.filter(b => b.status === "fixed").length;
  const critical = bugs.filter(b => b.priority === "critical" && b.status !== "fixed" && b.status !== "closed").length;
  document.getElementById("statTotal").textContent = bugs.length;
  document.getElementById("statOpen").textContent = open;
  document.getElementById("statFixed").textContent = fixed;
  if (document.getElementById("statCritical")) {
    document.getElementById("statCritical").textContent = critical;
  }
}

function renderBugList(bugs) {
  const list = document.getElementById("bugList");
  const empty = document.getElementById("emptyState");
  const cats = CATEGORY_MAP();

  if (!bugs.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = bugs.map(bug => `
    <a href="bug.html?id=${encodeURIComponent(bug.id)}" class="bug-card bug-card--${bug.status} bug-card--priority-${bug.priority}">
      ${priorityBanner(bug.priority)}
      <div class="bug-card-top">
        <div class="bug-card-main">
          <div class="bug-card-head-row">
            <span class="bug-id">${bug.id}</span>
            ${priorityBadge(bug.priority, true)}
          </div>
          <div class="bug-title">${escapeHtml(bug.title)}</div>
          <p class="bug-excerpt">${escapeHtml(truncate(bug.description, 140))}</p>
        </div>
        ${bug.screenshot ? `<div class="bug-card-thumb"><img src="${escapeHtml(bug.screenshot)}" alt=""></div>` : ""}
      </div>
      <div class="bug-card-bottom">
        <div class="bug-meta">${statusBadge(bug.status)}</div>
        <div class="bug-footer">
          <span>${cats[bug.category] || bug.category}</span>
          <span>${escapeHtml(bug.reporter || "—")}</span>
          <span>${bug.commentCount || 0} сообщ.</span>
          <span>${formatDateShort(bug.updatedAt || bug.createdAt)}</span>
        </div>
      </div>
    </a>
  `).join("");
}

function filterBugs(bugs) {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const priority = document.getElementById("priorityFilter")?.value || "";

  return bugs.filter(b => {
    if (status && b.status !== status) return false;
    if (category && b.category !== category) return false;
    if (priority && b.priority !== priority) return false;
    if (search) {
      const hay = `${b.id} ${b.title} ${b.description}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function fillFilters() {
  const statusFilter = document.getElementById("statusFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const priorityFilter = document.getElementById("priorityFilter");

  Object.entries(CONFIG.labels).forEach(([id, name]) => {
    statusFilter.innerHTML += `<option value="${id}">${name}</option>`;
  });
  CONFIG.categories.forEach(c => {
    categoryFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
  if (priorityFilter) {
    priorityFilter.innerHTML = '<option value="">Все приоритеты</option>';
    CONFIG.priorities.forEach(p => {
      priorityFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  }
}

async function init() {
  if (!document.getElementById("bugList")) return;

  document.getElementById("footerText").textContent = CONFIG.siteName;
  fillFilters();

  if (!FirebaseApp.isConfigured() || !FirebaseApp.init()) {
    document.getElementById("bugList").innerHTML = '<div class="notice">Firebase не настроен</div>';
    return;
  }

  bugsUnsub = BugsService.subscribeBugs(bugs => {
    allBugs = bugs;
    renderStats(allBugs);
    renderBugList(filterBugs(allBugs));
  });

  ["searchInput", "statusFilter", "categoryFilter", "priorityFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => renderBugList(filterBugs(allBugs)));
  });
}

document.addEventListener("DOMContentLoaded", init);
