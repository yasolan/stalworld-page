# Firebase Setup



GitHub Pages — статика. Аккаунты, баги, комментарии и логи хранятся в **Firebase** (бесплатный тариф).



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



Firestore → Rules → вставь содержимое `firestore.rules` → **Publish**.



Коллекции:



| Коллекция | Назначение |

|-----------|------------|

| `bugs/{bugId}` | Баги (читать все, создавать — авторизованные) |

| `bugs/{bugId}/comments/{id}` | Обсуждение под багом |

| `meta/counters` | Счётчик ID (BUG-001, …) |

| `users/{uid}` | Профили |

| `admins/{uid}` | Админы |

| `logs/{id}` | Журнал (только добавление) |



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



## 6. Скриншоты (Cloudinary, бесплатно)

ImgBB и похожие сервисы часто **не работают из браузера** (CORS). Cloudinary — нормальный вариант для GitHub Pages.

1. Регистрация: https://cloudinary.com (бесплатный тариф, карта не нужна)
2. На дашборде скопируй **Cloud name**
3. **Settings → Upload → Add upload preset**
   - **Signing Mode: Unsigned**
   - Save → скопируй **Preset name**
4. В `js/config.js`:

```js
cloudinary: {
  cloudName: "твой_cloud_name",
  uploadPreset: "твой_unsigned_preset"
},
```

5. Push — загрузка файлов заработает

Можно также вставить **прямую ссылку** на картинку вручную (Discord, VK, любой хостинг).

## 7. Импорт старых багов



Если были баги в `data/bugs.json`:



1. Войди в админку

2. Нажми **«Импорт из bugs.json»**



## Что логируется



| action | Когда |

|--------|-------|

| user.register | Регистрация |

| user.login | Вход |

| user.logout | Выход |

| bug.create | Новый баг на сайте |

| bug.comment | Комментарий в обсуждении |

| admin.login | Вход в админку |

| admin.bug_create | Создание бага админом |

| admin.bug_update | Изменение бага |

| admin.bug_delete | Удаление бага |

| admin.seed | Импорт из JSON |



Логи видны только во вкладке **Логи** в админке.

