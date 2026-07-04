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

function renderComments(comments, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!comments.length) {
    el.innerHTML = '<p class="muted">Пока нет сообщений. Начните обсуждение.</p>';
    return;
  }
  el.innerHTML = comments.map(c => `
    <article class="forum-post ${c.isDev ? "forum-post--dev" : ""}">
      <div class="forum-post-head">
        <strong>${escapeHtml(c.author)}</strong>
        ${c.isDev ? '<span class="dev-badge">Команда</span>' : ""}
        <time>${formatDate(c.createdAt)}</time>
      </div>
      <div class="forum-post-body">${escapeHtml(c.text).replace(/\n/g, "<br>")}</div>
    </article>
  `).join("");
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
