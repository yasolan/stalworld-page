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

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle("hidden", !visible);
}

function $(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setHtml(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function updateThreadStats(bug, replyCount) {
  const replies = document.getElementById("threadStatReplies");
  if (replies) replies.textContent = pluralReplies(Number(replyCount) || 0);

  const category = document.getElementById("threadStatCategory");
  if (category) category.textContent = CATEGORY_MAP()[bug.category] || bug.category;

  const coordsEl = document.getElementById("threadStatCoords");
  const coords = formatCoordinates(bug.coordinates);
  if (coordsEl) {
    if (coords) {
      coordsEl.textContent = "📍 " + coords;
      setVisible(coordsEl, true);
    } else {
      setVisible(coordsEl, false);
    }
  }

  const status = document.getElementById("threadStatStatus");
  if (status) status.innerHTML = statusBadge(bug.status);

  const updated = document.getElementById("threadStatUpdated");
  if (updated) updated.textContent = "Обновлено: " + formatDate(bug.updatedAt || bug.createdAt);

  const count = document.getElementById("commentCount");
  if (count) count.textContent = replyCount ? pluralReplies(Number(replyCount) || 0) : "нет ответов";
}

function renderBug(bug) {
  if (!bug?.title) {
    setVisible($("bugLoading"), false);
    setVisible($("bugContent"), false);
    setText("bugNotFound", "Баг повреждён или не найден (ID: " + (bug?.id || currentBugId) + ")");
    setVisible($("bugNotFound"), true);
    return;
  }

  currentBug = bug;
  currentBugId = BugsService.docId(bug);
  const author = bug.reporter || "—";

  setHtml("bugBanner", priorityBanner(bug.priority));
  setText("bugId", bug.id);
  setHtml("bugBadges", priorityBadge(bug.priority, true) + " " + statusBadge(bug.status));
  setText("bugTitle", bug.title);
  document.title = `${bug.id} — ${bug.title}`;

  setText("opAvatar", avatarInitials(author));
  const opAvatar = $("opAvatar");
  if (opAvatar) opAvatar.style.cssText = avatarStyle(author);
  setHtml("opAuthorName", userLink(bug.reporterId, author));
  setHtml("opAuthorHeader", userLink(bug.reporterId, author, "user-link--strong"));
  setText("opDate", formatDate(bug.createdAt));

  setText("bugDescription", bug.description || "—");
  setText("bugSteps", bug.steps || "—");

  const steps = textField(bug.steps);
  setVisible($("bugStepsSection"), !!steps);

  const coords = formatCoordinates(bug.coordinates);
  const coordsEl = $("bugCoordinates");
  if (coords && coordsEl) coordsEl.innerHTML = coordinatesBlock(coords);
  setVisible($("bugCoordsSection"), !!(coords && coordsEl));

  const screenshot = textField(bug.screenshot);
  const shotEl = $("bugScreenshot");
  if (screenshot && shotEl) shotEl.innerHTML = screenshotBlock(screenshot, bug.title);
  setVisible($("bugScreenshotSection"), !!(screenshot && shotEl));

  const closedNotice = $("closedNotice");
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

  const toggle = (id, hidden) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", hidden);
  };

  toggle("btnCloseTicket", bug.status === "closed");
  toggle("btnReopenTicket", bug.status !== "closed");
  toggle("btnMarkFixed", bug.status === "fixed" || bug.status === "closed");
  toggle("btnMarkProgress", bug.status === "in_progress" || bug.status === "closed");
}

function updateReplyBox() {
  const loggedIn = !!currentUser;
  setVisible($("replyBox"), loggedIn);
  setVisible($("commentLogin"), !loggedIn);
  setVisible($("btnScrollReply"), loggedIn);

  if (loggedIn && currentProfile) {
    const name = currentProfile.nickname || currentUser.email.split("@")[0];
    const avatar = $("replyAvatar");
    if (avatar) {
      avatar.textContent = avatarInitials(name);
      avatar.style.cssText = avatarStyle(name);
    }
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

document.addEventListener("DOMContentLoaded", () => AuthGuard.whenReady(initBugPage));
