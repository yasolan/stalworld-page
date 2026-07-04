const CONFIG = {
  siteName: "STALWORLD Bug Tracker",
  siteUrl: "https://yasolan.github.io/stalworld-page/",
  githubRepo: "yasolan/stalworld-page",
  githubIssuesUrl: "https://github.com/yasolan/stalworld-page/issues/new",

  // Firebase: https://console.firebase.google.com → Project settings → Web app
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000"
  },

  labels: {
    open: "Открыт",
    in_progress: "В работе",
    fixed: "Исправлен",
    closed: "Закрыт",
    duplicate: "Дубликат"
  },

  categories: [
    { id: "gameplay", name: "Геймплей" },
    { id: "ui", name: "Интерфейс" },
    { id: "crash", name: "Краш / вылет" },
    { id: "network", name: "Сеть / онлайн" },
    { id: "launcher", name: "Лаунчер" },
    { id: "other", name: "Другое" }
  ],

  priorities: [
    { id: "low", name: "Низкий" },
    { id: "medium", name: "Средний" },
    { id: "high", name: "Высокий" },
    { id: "critical", name: "Критический" }
  ]
};
