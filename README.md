# STALWORLD Bug Tracker (GitHub Pages)

Статический баг-трекер для хостинга на GitHub Pages.

## Страницы

| Файл | Назначение |
|------|------------|
| `index.html` | Список багов, поиск, фильтры |
| `report.html` | Форма репорта → GitHub Issue |
| `admin.html` | Редактор багов + экспорт JSON |

## Быстрый старт

### 1. Настрой config

Отредактируй `js/config.js`:

```js
githubRepo: "yasolan/stalworld-tests",
githubIssuesUrl: "https://github.com/yasolan/stalworld-tests/issues/new",
```

### 2. Включи GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/docs`**
4. Save

Сайт будет доступен по адресу:
`https://yasolan.github.io/stalworld-tests/`

### 3. Админка

- URL: `/admin.html`
- Пароль по умолчанию: `stalworld-admin`
- Смени в `js/admin.js` → `ADMIN_PASSWORD`

**Workflow админа:**
1. Редактируешь баги в админке
2. Скачиваешь / копируешь JSON
3. Вставляешь в `docs/data/bugs.json`
4. `git commit` + `git push`

## Как работает репорт

Игрок заполняет форму → открывается GitHub Issue с готовым текстом.
Issues можно потом переносить в публичный список через админку.

## Структура bugs.json

```json
{
  "bugs": [
    {
      "id": "BUG-001",
      "title": "Заголовок",
      "description": "Описание",
      "steps": "Шаги",
      "category": "gameplay",
      "priority": "medium",
      "status": "open",
      "version": "STALKER V4",
      "platform": "Windows",
      "reporter": "Nick",
      "createdAt": "2026-07-01",
      "updatedAt": "2026-07-01",
      "votes": 0,
      "comments": []
    }
  ]
}
```

## Ограничения GitHub Pages

- Нет серверной БД — данные в JSON-файле
- Админка клиентская (пароль в JS, не для секретных данных)
- Для полноценного форума с регистрацией нужен Firebase/Supabase

## Локальный просмотр

```powershell
cd docs
python -m http.server 8080
```

Открыть: http://localhost:8080
