# Firebase Setup

GitHub Pages — статика. Аккаунты и логи хранятся в **Firebase** (бесплатный тариф).

## 1. Создай проект

1. https://console.firebase.google.com → Create project
2. Authentication → Sign-in method → **Email/Password** → Enable
3. Firestore Database → Create database → Production mode

## 2. Web-приложение

Project settings → Add app → Web → скопируй config в `js/config.js`:

```js
firebase: {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
}
```

## 3. Правила Firestore

Firestore → Rules → вставь содержимое `firestore.rules` → Publish.

Логи: **только создание**, удаление и изменение запрещены.  
Читать логи могут только админы.

## 4. Первый админ

1. Зарегистрируйся на сайте (`register.html`)
2. Firebase → Authentication → Users → скопируй **User UID**
3. Firestore → Create collection:
   - Collection: `admins`
   - Document ID: **UID пользователя** (не email!)
   - Field: `role` = `admin`
4. Вход в админку: `admin.html` с email/паролем этого аккаунта

## 5. Authorized domains

Firebase → Authentication → Settings → Authorized domains:

- `localhost`
- `yasolan.github.io`

## Что логируется

| action | Когда |
|--------|-------|
| user.register | Регистрация |
| user.login | Вход |
| user.logout | Выход |
| bug.report | Отправка баг-репорта |
| admin.login | Вход в админку |
| admin.bug_create | Создание бага |
| admin.bug_update | Изменение бага |
| admin.bug_delete | Удаление бага |

Логи видны только во вкладке **Логи** в админке.
