let currentBugId = null;
let commentsUnsub = null;
let currentUser = null;
let isAdmin = false;

function getBugIdFromUrl() {
  return new URLSearchParams(location.search).get("id");
}

function renderBug(bug) {
  const cats = CATEGORY_MAP();
  document.getElementById("bugBanner").innerHTML = priorityBanner(bug.priority);
  document.getElementById("bugId").textContent = bug.id;
  document.getElementById("bugBadges").innerHTML = priorityBadge(bug.priority, true) + " " + statusBadge(bug.status);
  document.getElementById("bugTitle").textContent = bug.title;
  document.getElementById("bugMeta").innerHTML = `
    <span>${cats[bug.category] || bug.category}</span>
    <span>Автор: ${escapeHtml(bug.reporter || "—")}</span>
    <span>Создан: ${formatDate(bug.createdAt)}</span>
    <span>Обновлён: ${formatDate(bug.updatedAt || bug.createdAt)}</span>
  `;
  document.getElementById("bugDescription").textContent = bug.description || "—";
  document.getElementById("bugSteps").textContent = bug.steps || "—";
  document.title = `${bug.id} — ${bug.title}`;

  const shotSection = document.getElementById("bugScreenshotSection");
  if (bug.screenshot) {
    document.getElementById("bugScreenshot").innerHTML = screenshotBlock(bug.screenshot, bug.title);
    shotSection.classList.remove("hidden");
  } else {
    shotSection.classList.add("hidden");
  }

  document.getElementById("commentCount").textContent = bug.commentCount ? `(${bug.commentCount})` : "";
}

function updateCommentForm() {
  const loggedIn = !!currentUser;
  document.getElementById("commentForm").classList.toggle("hidden", !loggedIn);
  document.getElementById("commentLogin").classList.toggle("hidden", loggedIn);
}

async function submitComment(e) {
  e.preventDefault();
  const text = document.getElementById("commentText").value.trim();
  if (!text || !currentUser || !currentBugId) return;

  const profile = await AuthService.getProfile(currentUser.uid);
  await BugsService.addComment(currentBugId, text, currentUser, profile, isAdmin);
  await Logger.write("bug.comment", "Комментарий к багу", { bugId: currentBugId });
  document.getElementById("commentText").value = "";
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
    renderComments(comments, "commentsList");
    document.getElementById("commentCount").textContent = comments.length ? `(${comments.length})` : "";
  });

  document.getElementById("commentForm").addEventListener("submit", submitComment);

  AuthService.onAuthChange((user, admin) => {
    currentUser = user;
    isAdmin = admin;
    updateCommentForm();
  });
}

document.addEventListener("DOMContentLoaded", initBugPage);
