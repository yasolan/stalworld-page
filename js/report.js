function fillFormSelects() {
  const category = document.getElementById("category");
  const priority = document.getElementById("priority");
  CONFIG.categories.forEach(c => {
    category.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
  CONFIG.priorities.forEach(p => {
    priority.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

function buildReportBody(data) {
  return [
    "## Описание",
    data.description,
    "",
    "## Шаги воспроизведения",
    data.steps,
    "",
    "## Детали",
    `- **Категория:** ${data.categoryLabel}`,
    `- **Приоритет:** ${data.priorityLabel}`,
    `- **Версия:** ${data.version}`,
    `- **Платформа:** ${data.platform}`,
    `- **Аккаунт:** ${data.reporter}`,
    "",
    "---",
    "_Отправлено через Bug Tracker_"
  ].join("\n");
}

async function submitReport(e) {
  e.preventDefault();

  const categoryEl = document.getElementById("category");
  const priorityEl = document.getElementById("priority");
  const user = AuthService.currentUser();
  const profile = user ? await AuthService.getProfile(user.uid) : null;

  const data = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    steps: document.getElementById("steps").value.trim(),
    category: categoryEl.value,
    categoryLabel: categoryEl.options[categoryEl.selectedIndex].text,
    priority: priorityEl.value,
    priorityLabel: priorityEl.options[priorityEl.selectedIndex].text,
    version: document.getElementById("version").value.trim() || "не указана",
    platform: document.getElementById("platform").value.trim() || "не указана",
    reporter: profile?.nickname ? `${profile.nickname} (${user.email})` : user.email
  };

  if (!data.title || !data.description) {
    alert("Заполните заголовок и описание.");
    return;
  }

  const body = buildReportBody(data);
  const issueUrl = CONFIG.githubIssuesUrl
    + "?title=" + encodeURIComponent("[BUG] " + data.title)
    + "&body=" + encodeURIComponent(body)
    + "&labels=bug";

  window.open(issueUrl, "_blank");

  await Logger.write("bug.report", "Отправлен баг-репорт", {
    title: data.title,
    category: data.category
  });

  document.getElementById("successNotice").classList.remove("hidden");
  document.getElementById("reportForm").reset();
}

function showReportForm(show) {
  document.getElementById("authRequired").classList.toggle("hidden", show);
  document.getElementById("reportBlock").classList.toggle("hidden", !show);
  document.getElementById("reportIntro").textContent = show
    ? "Заполните форму — откроется GitHub Issue с вашим отчётом."
    : "Войдите в аккаунт, чтобы отправить репорт.";
}

function initReport() {
  document.getElementById("footerText").textContent = CONFIG.siteName;
  document.getElementById("repoName").textContent = CONFIG.githubRepo;
  fillFormSelects();
  document.getElementById("reportForm").addEventListener("submit", submitReport);

  if (!FirebaseApp.isConfigured()) {
    showReportForm(true);
    return;
  }

  FirebaseApp.init();
  AuthService.onAuthChange(user => {
    showReportForm(!!user);
  });
}

document.addEventListener("DOMContentLoaded", initReport);
