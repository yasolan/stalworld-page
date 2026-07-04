const CATEGORY_MAP = () => Object.fromEntries(CONFIG.categories.map(c => [c.id, c.name]));
const PRIORITY_MAP = () => Object.fromEntries(CONFIG.priorities.map(p => [p.id, p.name]));

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

function truncate(str, len) {
  if (!str || str.length <= len) return str || "";
  return str.slice(0, len) + "…";
}

function formatDate(ts) {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(ts) {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("ru-RU");
}

function statusBadge(status) {
  const label = CONFIG.labels[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

function priorityBadge(priority, large) {
  const label = PRIORITY_MAP()[priority] || priority;
  const cls = large ? `priority-badge priority-badge--${priority} priority-badge--lg` : `priority-badge priority-badge--${priority}`;
  return `<span class="${cls}">${escapeHtml(label)}</span>`;
}

function priorityBanner(priority) {
  const labels = { critical: "КРИТИЧЕСКИЙ ПРИОРИТЕТ", high: "ВЫСОКИЙ ПРИОРИТЕТ", medium: "СРЕДНИЙ ПРИОРИТЕТ", low: "НИЗКИЙ ПРИОРИТЕТ" };
  if (priority === "medium" || priority === "low") return "";
  return `<div class="priority-banner priority-banner--${priority}">${labels[priority] || priority}</div>`;
}

function screenshotBlock(url, alt) {
  if (!url) return "";
  return `
    <div class="screenshot-wrap">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(alt || "Скриншот")}" class="screenshot-img" loading="lazy">
      </a>
    </div>`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadScreenshot(file) {
  if (!file) throw new Error("Файл не выбран");
  if (!CONFIG.imgurClientId) {
    throw new Error("Загрузка недоступна: добавьте imgurClientId в config.js или вставьте ссылку вручную");
  }
  const base64 = await fileToBase64(file);
  const res = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: "Client-ID " + CONFIG.imgurClientId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ image: base64.split(",")[1], type: "base64" })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.data?.error || "Не удалось загрузить скриншот");
  return data.data.link;
}

function bindScreenshotPreview(fileInputId, previewId, urlInputId) {
  const fileInput = document.getElementById(fileInputId);
  const preview = document.getElementById(previewId);
  const urlInput = urlInputId ? document.getElementById(urlInputId) : null;
  if (!fileInput || !preview) return;

  const update = () => {
    const url = urlInput?.value.trim();
    if (url) {
      preview.innerHTML = screenshotBlock(url, "Превью");
      return;
    }
    const file = fileInput.files?.[0];
    if (!file) {
      preview.innerHTML = "";
      return;
    }
    preview.innerHTML = `<div class="screenshot-wrap"><img src="${URL.createObjectURL(file)}" class="screenshot-img" alt="Превью"></div>`;
  };

  fileInput.addEventListener("change", update);
  urlInput?.addEventListener("input", update);
}

function avatarInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
}

function avatarHue(name) {
  let hash = 0;
  const str = String(name || "");
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function avatarStyle(name) {
  const hue = avatarHue(name);
  return `background: hsl(${hue}, 45%, 28%); color: hsl(${hue}, 70%, 82%);`;
}

function pluralReplies(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ответов`;
  if (mod10 === 1) return `${n} ответ`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ответа`;
  return `${n} ответов`;
}

function renderForumReply(comment, postNumber) {
  const author = comment.author || "Аноним";
  const devClass = comment.isDev ? " thread-post--dev" : "";
  return `
    <article class="thread-post${devClass}" id="post-${postNumber}">
      <aside class="post-aside">
        <div class="post-avatar" style="${avatarStyle(author)}">${avatarInitials(author)}</div>
        <div class="post-author-name">${escapeHtml(author)}</div>
        ${comment.isDev ? '<div class="post-role post-role--team">Команда</div>' : '<div class="post-role">Участник</div>'}
        <div class="post-num">#${postNumber}</div>
      </aside>
      <div class="post-main">
        <header class="post-header">
          <div class="post-header-left">
            <strong>${escapeHtml(author)}</strong>
            ${comment.isDev ? '<span class="dev-badge">Команда</span>' : ""}
          </div>
          <time>${formatDate(comment.createdAt)}</time>
        </header>
        <div class="post-body post-body--reply">${escapeHtml(comment.text).replace(/\n/g, "<br>")}</div>
      </div>
    </article>
  `;
}

function renderForumReplies(comments, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return 0;
  if (!comments.length) {
    el.innerHTML = `
      <div class="thread-empty">
        <p>Пока нет ответов.</p>
        <p class="muted">Будьте первым — опишите воспроизведение или задайте уточняющий вопрос.</p>
      </div>`;
    return 0;
  }
  el.innerHTML = comments.map((c, i) => renderForumReply(c, i + 2)).join("");
  return comments.length;
}

function renderComments(comments, containerId) {
  return renderForumReplies(comments, containerId);
}

function fillPrioritySelect(selectId, defaultValue) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = CONFIG.priorities.map(p =>
    `<option value="${p.id}">${p.name}${p.id === "critical" ? " ⚠" : ""}</option>`
  ).join("");
  if (defaultValue) el.value = defaultValue;
}

function fillCategorySelect(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = CONFIG.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

function fillStatusSelect(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = Object.entries(CONFIG.labels).map(([id, name]) => `<option value="${id}">${name}</option>`).join("");
}
