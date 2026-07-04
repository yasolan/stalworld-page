async function submitReport(e) {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Отправка...";

  try {
    const user = AuthService.currentUser();
    if (!user) {
      alert("Нужно войти в аккаунт");
      return;
    }

    const profile = await AuthService.getProfile(user.uid);
    let screenshot = document.getElementById("screenshotUrl").value.trim();

    const data = {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      steps: document.getElementById("steps").value.trim(),
      screenshot,
      category: document.getElementById("category").value,
      priority: document.getElementById("priority").value
    };

    if (!data.title || !data.description) {
      alert("Заполните заголовок и описание.");
      return;
    }

    const bugId = await BugsService.createBug(data, user, profile);

    await Logger.write("bug.create", "Создан баг на сайте", {
      bugId,
      title: data.title,
      priority: data.priority
    });

    window.location.href = "bug.html?id=" + encodeURIComponent(bugId);
  } catch (ex) {
    alert(ex.message || "Ошибка отправки");
    btn.disabled = false;
    btn.textContent = "Опубликовать баг";
  }
}

function showReportForm(show) {
  document.getElementById("authRequired").classList.toggle("hidden", show);
  document.getElementById("reportBlock").classList.toggle("hidden", !show);
  document.getElementById("reportIntro").textContent = show
    ? "Баг появится на сайте — можно обсуждать в комментариях."
    : "Войдите в аккаунт, чтобы отправить репорт.";
}

function syncReportAuth(user) {
  showReportForm(!!user);
}

function initReport() {
  document.getElementById("footerText").textContent = CONFIG.siteName;
  fillCategorySelect("category");
  fillPrioritySelect("priority", "medium");
  bindScreenshotPreview("screenshotUrl", "screenshotPreview");
  document.getElementById("reportForm").addEventListener("submit", submitReport);

  if (!FirebaseApp.isConfigured()) {
    document.getElementById("reportIntro").textContent = "Firebase не настроен";
    return;
  }

  FirebaseApp.init();
  document.getElementById("reportIntro").textContent = "Проверка входа...";
  AuthService.onAuthChange(syncReportAuth);

  // На случай, если auth уже восстановлен до подписки
  if (AuthService.currentUser()) {
    syncReportAuth(AuthService.currentUser());
  }
}

document.addEventListener("DOMContentLoaded", initReport);
