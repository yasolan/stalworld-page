function nextBugId(bugs) {
  let max = 0;
  (bugs || []).forEach(b => {
    const m = /^BUG-(\d+)$/i.exec(b.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "BUG-" + String(max + 1).padStart(3, "0");
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
  if (!data.success) {
    throw new Error(data.data?.error || "Не удалось загрузить скриншот");
  }
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
    const objUrl = URL.createObjectURL(file);
    preview.innerHTML = `<div class="screenshot-wrap"><img src="${objUrl}" class="screenshot-img" alt="Превью"></div>`;
  };

  fileInput.addEventListener("change", update);
  urlInput?.addEventListener("input", update);
}
