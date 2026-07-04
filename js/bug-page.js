let currentBugId = null;
let currentBug = null;
let bugUnsub = null;
let commentsUnsub = null;
let currentUser = null;
let isAdmin = false;
let currentProfile = null;

function getBugIdFromUrl() {
  return new URLSearchParams(location.search).get("id");
}

function updateThreadStats(bug, replyCount) {
  document.getElementById("threadStatReplies").textContent = pluralReplies(replyCount);
  document.getElementById("threadStatCategory").textContent = CATEGORY_MAP()[bug.category] || bug.category;
  const coordsEl = document.getElementById("threadStatCoords");
  if (coordsEl) {
    if (bug.coordinates?.trim()) {
      coordsEl.textContent = "📍 " + formatCoordinates(bug.coordinates);
      coordsEl.classList.remove("hidden");
    } else {
      coordsEl.classList.add("hidden");
    }
  }
  document.getElementById("threadStatStatus").innerHTML = statusBadge(bug.status);
  document.getElementById("threadStatUpdated").textContent = "Обновлено: " + formatDate(bug.updatedAt || bug.createdAt);
  document.getElementById("commentCount").textContent = replyCount ? pluralReplies(replyCount) : "нет ответов";
}

function renderBug(bug) {
  if (!bug?.title) {
    document.getElementById("bugLoading").classList.add("hidden");
    document.getElementById("bugContent").classList.add("hidden");
    document.getElementById("bugNotFound").textContent = "Баг повреждён или не найден (ID: " + (bug?.id || currentBugId) + ")";
    document.getElementById("bugNotFound").classList.remove("hidden");
    return;
  }

  currentBug = bug;
  currentBugId = BugsService.docId(bug);
  const author = bug.reporter || "—";

  document.getElementById("bugBanner").innerHTML = priorityBanner(bug.priority);
  document.getElementById("bugId").textContent = bug.id;
  document.getElementById("bugBadges").innerHTML = priorityBadge(bug.priority, true) + " " + statusBadge(bug.status);
  document.getElementById("bugTitle").textContent = bug.title;
  document.title = `${bug.id} — ${bug.title}`;

  document.getElementById("opAvatar").textContent = avatarInitials(author);
  document.getElementById("opAvatar").style.cssText = avatarStyle(author);
  document.getElementById("opAuthorName").innerHTML = userLink(bug.reporterId, author);
  document.getElementById("opAuthorHeader").innerHTML = userLink(bug.reporterId, author, "user-link--strong");
  document.getElementById("opDate").textContent = formatDate(bug.createdAt);

  document.getElementById("bugDescription").textContent = bug.description || "—";
  document.getElementById("bugSteps").textContent = bug.steps || "—";

  const stepsSection = document.getElementById("bugStepsSection");
  if (!bug.steps?.trim()) stepsSection.classList.add("hidden");
  else stepsSection.classList.remove("hidden");

  const coordsSection = document.getElementById("bugCoordsSection");
  if (bug.coordinates?.trim()) {
    document.getElementById("bugCoordinates").innerHTML = coordinatesBlock(bug.coordinates);
    coordsSection.classList.remove("hidden");
  } else {
    coordsSection.classList.add("hidden");
  }

  const shotSection = document.getElementById("bugScreenshotSection");
  if (bug.screenshot) {
    document.getElementById("bugScreenshot").innerHTML = screenshotBlock(bug.screenshot, bug.title);
    shotSection.classList.remove("hidden");
  } else {
    shotSection.classList.add("hidden");
  }

  const closedNotice = document.getElementById("closedNotice");
  if (closedNotice) {
    closedNotice.classList.toggle("hidden", bug.status !== "closed");
  }

  updateThreadStats(bug, bug.commentCount || 0);
  updateAdminActions(bug);
}

function updateAdminActions(bug) {
  const bar = document.getElementById("adminActions");
  if (!bar) return;
  bar.classList.toggle("hidden", !isAdmin);

  if (!isAdmin) return;

  document.getElementById("btnCloseTicket").classList.toggle("hidden", bug.status === "closed");
  document.getElementById("btnReopenTicket").classList.toggle("hidden", bug.status !== "closed");
  document.getElementById("btnMarkFixed").classList.toggle("hidden", bug.status === "fixed" || bug.status === "closed");
  document.getElementById("btnMarkProgress").classList.toggle("hidden", bug.status === "in_progress" || bug.status === "closed");
}

function updateReplyBox() {
  const loggedIn = !!currentUser;
  document.getElementById("replyBox").classList.toggle("hidden", !loggedIn);
  document.getElementById("commentLogin").classList.toggle("hidden", loggedIn);
  document.getElementById("btnScrollReply").classList.toggle("hidden", !loggedIn);

  if (loggedIn && currentProfile) {
    const name = currentProfile.nickname || currentUser.email.split("@")[0];
    const avatar = document.getElementById("replyAvatar");
    avatar.textContent = avatarInitials(name);
    avatar.style.cssText = avatarStyle(name);
  }

  if (currentBug) updateAdminActions(currentBug);
}

async function setBugStatus(status, label) {
  if (!isAdmin || !currentBugId) return;
  if (!confirm(`${label}?`)) return;

  const btn = document.activeElement;
  if (btn?.tagName === "BUTTON") btn.disabled = true;

  try {
    await BugsService.updateBugStatus(BugsService.docId(currentBug) || currentBugId, status);
    await Logger.write("admin.bug_status", label, { bugId: currentBugId, status });
    if (status === "closed") {
      setTimeout(() => {
        if (confirm("Тикет закрыт. Вернуться к списку багов?")) {
          window.location.href = "index.html";
        }
      }, 300);
    }
  } catch (ex) {
    alert(ex.message || "Не удалось обновить статус");
  } finally {
    if (btn?.tagName === "BUTTON") btn.disabled = false;
  }
}

async function submitComment(e) {
  e.preventDefault();
  const text = document.getElementById("commentText").value.trim();
  if (!text || !currentUser || !currentBugId) return;

  const btn = document.getElementById("commentSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Публикация...";

  try {
    const profile = currentProfile || await AuthService.getProfile(currentUser.uid);
    await BugsService.addComment(currentBugId, text, currentUser, profile, isAdmin);
    await Logger.write("bug.comment", "Комментарий к багу", { bugId: currentBugId });
    document.getElementById("commentText").value = "";
  } catch (ex) {
    alert(ex.message || "Не удалось отправить ответ");
  } finally {
    btn.disabled = false;
    btn.textContent = "Опубликовать ответ";
  }
}

function scrollToReply() {
  const box = document.getElementById("replyBox");
  if (box.classList.contains("hidden")) {
    document.getElementById("commentLogin").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  box.scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("commentText").focus();
}

async function initBugPage() {
  document.getElementById("footerText").textContent = CONFIG.siteName;
  currentBugId = getBugIdFromUrl();

  if (!currentBugId) {
    document.getElementById("bugLoading").classList.add("hidden");
    document.getElementById("bugNotFound").classList.remove("hidden");
    return;
  }

  if (!FirebaseApp.isConfigured() || !FirebaseApp.init()) {
    document.getElementById("bugLoading").textContent = "Firebase не настроен";
    return;
  }

  bugUnsub = BugsService.subscribeBug(currentBugId, bug => {
    document.getElementById("bugLoading").classList.add("hidden");

    if (!bug) {
      document.getElementById("bugContent").classList.add("hidden");
      document.getElementById("bugNotFound").classList.remove("hidden");
      return;
    }

    document.getElementById("bugNotFound").classList.add("hidden");
    document.getElementById("bugContent").classList.remove("hidden");
    try {
      renderBug(bug);
    } catch (ex) {
      console.error(ex);
      document.getElementById("bugContent").classList.add("hidden");
      document.getElementById("bugNotFound").textContent = "Ошибка отображения бага";
      document.getElementById("bugNotFound").classList.remove("hidden");
    }
  }, () => {
    document.getElementById("bugLoading").classList.add("hidden");
    document.getElementById("bugContent").classList.add("hidden");
    document.getElementById("bugNotFound").textContent = "Не удалось загрузить баг";
    document.getElementById("bugNotFound").classList.remove("hidden");
  });

  commentsUnsub = BugsService.subscribeComments(currentBugId, comments => {
    const count = renderForumReplies(comments, "commentsList");
    if (currentBug) updateThreadStats(currentBug, count);
  });

  document.getElementById("commentForm").addEventListener("submit", submitComment);
  document.getElementById("btnScrollReply").addEventListener("click", scrollToReply);

  document.getElementById("btnCloseTicket")?.addEventListener("click", () => setBugStatus("closed", "Закрыть тикет"));
  document.getElementById("btnReopenTicket")?.addEventListener("click", () => setBugStatus("open", "Открыть тикет снова"));
  document.getElementById("btnMarkFixed")?.addEventListener("click", () => setBugStatus("fixed", "Отметить как исправленный"));
  document.getElementById("btnMarkProgress")?.addEventListener("click", () => setBugStatus("in_progress", "Взять в работу"));

  AuthService.onAuthChange(async (user, admin) => {
    currentUser = user;
    isAdmin = admin;
    currentProfile = user ? await AuthService.getProfile(user.uid) : null;
    updateReplyBox();
  });
}

document.addEventListener("DOMContentLoaded", initBugPage);
