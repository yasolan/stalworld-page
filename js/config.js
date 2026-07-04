const CONFIG = {
  siteName: "STALWORLD Bug Tracker",
  siteUrl: "https://yasolan.github.io/stalworld-page/",
  githubRepo: "yasolan/stalworld-page",

  // Макс. размер загружаемого скриншота (МБ)
  maxUploadMb: 10,

  // Cloudinary — бесплатно, загрузка прямо с сайта (без бэкенда)
  // 1) https://cloudinary.com → регистрация
  // 2) Settings → Upload → Add upload preset → Signing: Unsigned
  // 3) cloud name — на главной дашборда
  cloudinary: {
    cloudName: "",
    uploadPreset: ""
  },
  firebase: {
    apiKey: "AIzaSyAzCRvcQzuh3zfHWBP4EAqqsln10EvYLqU",
    authDomain: "stalworld-page.firebaseapp.com",
    projectId: "stalworld-page",
    storageBucket: "stalworld-page.firebasestorage.app",
    messagingSenderId: "787077367735",
    appId: "1:787077367735:web:d95117e4f154ce6b8b0a32",
    measurementId: "G-CK98819SFG"
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
