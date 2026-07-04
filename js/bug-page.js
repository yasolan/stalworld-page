let currentBugId = null;
let currentBug = null;
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
  document.getElementById("threadStatStatus").innerHTML = statusBadge(bug.status);
  document.getElementById("threadStatUpdated").textContent = "Обновлено: " + formatDate(bug.updatedAt || bug.createdAt);
  document.getElementById("commentCount").textContent = replyCount ? pluralReplies(replyCount) : "нет ответов";
}

function renderBug(bug) {
  currentBug = bug;
  const author = bug.reporter || "—";
  const cats = CATEGORY_MAP();

  document.getElementById("bugBanner").innerHTML = priorityBanner(bug.priority);
  document.getElementById("bugId").textContent = bug.id;
  document.getElementById("bugBadges").innerHTML = priorityBadge(bug.priority, true) + " " + statusBadge(bug.status);
  document.getElementById("bugTitle").textContent = bug.title;
  document.title = `${bug.id} — ${bug.title}`;

  document.getElementById("opAvatar").textContent = avatarInitials(author);
  document.getElementById("opAvatar").style.cssText = avatarStyle(author);
  document.getElementById("opAuthorName").textContent = author;
  document.getElementById("opAuthorHeader").textContent = author;
  document.getElementById("opDate").textContent = formatDate(bug.createdAt);

  document.getElementById("bugDescription").textContent = bug.description || "—";
  document.getElementById("bugSteps").textContent = bug.steps || "—";

  const stepsSection = document.getElementById("bugStepsSection");
  if (!bug.steps?.trim()) stepsSection.classList.add("hidden");
  else stepsSection.classList.remove("hidden");

  const shotSection = document.getElementById("bugScreenshotSection");
  if (bug.screenshot) {
    document.getElementById("bugScreenshot").innerHTML = screenshotBlock(bug.screenshot, bug.title);
    shotSection.classList.remove("hidden");
  } else {
    shotSection.classList.add("hidden");
  }

  updateThreadStats(bug, bug.commentCount || 0);
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

  const bug = await BugsService.getBug(currentBugId);
  document.getElementById("bugLoading").classList.add("hidden");

  if (!bug) {
    document.getElementById("bugNotFound").classList.remove("hidden");
    return;
  }

  document.getElementById("bugContent").classList.remove("hidden");
  renderBug(bug);

  commentsUnsub = BugsService.subscribeComments(currentBugId, comments => {
    const count = renderForumReplies(comments, "commentsList");
    if (currentBug) updateThreadStats(currentBug, count);
  });

  document.getElementById("commentForm").addEventListener("submit", submitComment);
  document.getElementById("btnScrollReply").addEventListener("click", scrollToReply);

  AuthService.onAuthChange(async (user, admin) => {
    currentUser = user;
    isAdmin = admin;
    currentProfile = user ? await AuthService.getProfile(user.uid) : null;
    updateReplyBox();
  });
}

document.addEventListener("DOMContentLoaded", initBugPage);
