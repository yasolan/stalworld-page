function buildIssueTitle(data) {
  const prefix = CONFIG.issuePriorityPrefix?.[data.priority] || "[MEDIUM]";
  return `${prefix} [BUG] ${data.title}`;
}

function buildReportBody(data) {
  const lines = [
    "## Описание",
    data.description,
    "",
    "## Шаги воспроизведения",
    data.steps || "—",
    "",
    "## Детали",
    `- **Категория:** ${data.categoryLabel}`,
    `- **Приоритет:** ${data.priorityLabel}`,
    `- **Аккаунт:** ${data.reporter}`
  ];
  if (data.screenshot) {
    lines.push("", "## Скриншот", data.screenshot);
  }
  lines.push("", "---", "_Отправлено через Bug Tracker_");
  return lines.join("\n");
}

async function submitReport(e) {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Загрузка...";

  try {
    const categoryEl = document.getElementById("category");
    const priorityEl = document.getElementById("priority");
    const user = AuthService.currentUser();
    const profile = user ? await AuthService.getProfile(user.uid) : null;

    let screenshot = document.getElementById("screenshotUrl").value.trim();
    const file = document.getElementById("screenshotFile").files?.[0];
    if (file) {
      screenshot = await uploadScreenshot(file);
    }

    const data = {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      steps: document.getElementById("steps").value.trim(),
      screenshot,
      category: categoryEl.value,
      categoryLabel: categoryEl.options[categoryEl.selectedIndex].text,
      priority: priorityEl.value,
      priorityLabel: priorityEl.options[priorityEl.selectedIndex].text,
      reporter: profile?.nickname ? `${profile.nickname} (${user.email})` : user.email
    };

    if (!data.title || !data.description) {
      alert("Заполните заголовок и описание.");
      return;
    }

    const issueUrl = CONFIG.githubIssuesUrl
      + "?title=" + encodeURIComponent(buildIssueTitle(data))
      + "&body=" + encodeURIComponent(buildReportBody(data))
      + "&labels=bug";

    window.open(issueUrl, "_blank");

    await Logger.write("bug.report", "Отправлен баг-репорт", {
      title: data.title,
      category: data.category,
      hasScreenshot: !!data.screenshot
    });

    document.getElementById("successNotice").classList.remove("hidden");
    document.getElementById("reportForm").reset();
    document.getElementById("screenshotPreview").innerHTML = "";
  } catch (ex) {
    alert(ex.message || "Ошибка отправки");
  } finally {
    btn.disabled = false;
    btn.textContent = "Отправить на GitHub";
  }
}

function fillFormSelects() {
  CONFIG.categories.forEach(c => {
    document.getElementById("category").innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
  CONFIG.priorities.forEach(p => {
    document.getElementById("priority").innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

function showReportForm(show) {
  document.getElementById("authRequired").classList.toggle("hidden", show);
  document.getElementById("reportBlock").classList.toggle("hidden", !show);
  document.getElementById("reportIntro").textContent = show
    ? "Заполните форму — откроется GitHub Issue."
    : "Войдите в аккаунт, чтобы отправить репорт.";
}

function initReport() {
  document.getElementById("footerText").textContent = CONFIG.siteName;
  document.getElementById("repoName").textContent = CONFIG.githubRepo;
  fillFormSelects();
  bindScreenshotPreview("screenshotFile", "screenshotPreview", "screenshotUrl");
  document.getElementById("reportForm").addEventListener("submit", submitReport);

  if (!FirebaseApp.isConfigured()) {
    showReportForm(true);
    return;
  }

  FirebaseApp.init();
  AuthService.onAuthChange(user => showReportForm(!!user));
}

document.addEventListener("DOMContentLoaded", initReport);
