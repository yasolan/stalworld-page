function fillFormSelects() {
  const category = document.getElementById('category');
  const priority = document.getElementById('priority');

  CONFIG.categories.forEach(c => {
    category.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });

  CONFIG.priorities.forEach(p => {
    priority.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

function buildReportBody(data) {
  return [
    `## Описание`,
    data.description,
    ``,
    `## Шаги воспроизведения`,
    data.steps,
    ``,
    `## Детали`,
    `- **Категория:** ${data.categoryLabel}`,
    `- **Приоритет:** ${data.priorityLabel}`,
    `- **Версия:** ${data.version}`,
    `- **Платформа:** ${data.platform}`,
    `- **Ник / email:** ${data.reporter}`,
    ``,
    `---`,
    `_Отправлено через Bug Tracker_`
  ].join('\n');
}

function submitReport(e) {
  e.preventDefault();

  const categoryEl = document.getElementById('category');
  const priorityEl = document.getElementById('priority');

  const data = {
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    steps: document.getElementById('steps').value.trim(),
    category: categoryEl.value,
    categoryLabel: categoryEl.options[categoryEl.selectedIndex].text,
    priority: priorityEl.value,
    priorityLabel: priorityEl.options[priorityEl.selectedIndex].text,
    version: document.getElementById('version').value.trim() || 'не указана',
    platform: document.getElementById('platform').value.trim() || 'не указана',
    reporter: document.getElementById('reporter').value.trim() || 'аноним'
  };

  if (!data.title || !data.description) {
    alert('Заполните заголовок и описание.');
    return;
  }

  const body = buildReportBody(data);
  const issueUrl = CONFIG.githubIssuesUrl
    + '?title=' + encodeURIComponent('[BUG] ' + data.title)
    + '&body=' + encodeURIComponent(body)
    + '&labels=bug';

  window.open(issueUrl, '_blank');

  document.getElementById('successNotice').classList.remove('hidden');
  document.getElementById('reportForm').reset();
}

function initReport() {
  const siteNameEl = document.getElementById('siteName');
  if (siteNameEl) siteNameEl.textContent = CONFIG.siteName;
  document.getElementById('footerText').textContent = CONFIG.siteName;
  fillFormSelects();
  document.getElementById('reportForm').addEventListener('submit', submitReport);
}

document.addEventListener('DOMContentLoaded', initReport);
