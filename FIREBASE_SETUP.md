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



## 6. Firebase Storage (скриншоты)

1. Firebase Console → **Storage** → Get started → Production mode
2. **Rules** → вставь содержимое `storage.rules` → **Publish**
3. Скриншоты загружаются с сайта в `screenshots/{uid}/...`
4. Картинки доступны по прямой ссылке — нормально отображаются в багах

Можно также вставить внешнюю ссылку на изображение вручную.

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

