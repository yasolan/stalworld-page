const FirebaseApp = {
  auth: null,
  db: null,
  ready: false,

  init() {
    const cfg = CONFIG.firebase;
    if (!cfg?.apiKey || cfg.apiKey === "YOUR_API_KEY") {
      console.warn("Firebase not configured. See FIREBASE_SETUP.md");
      return false;
    }
    if (typeof firebase === "undefined") {
      console.error("Firebase SDK not loaded");
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.ready = true;
    return true;
  },

  isConfigured() {
    return CONFIG.firebase?.apiKey && CONFIG.firebase.apiKey !== "YOUR_API_KEY";
  }
};

function adminDocId(email) {
  return (email || "").trim().toLowerCase();
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

function formatLogTime(ts) {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("ru-RU");
}
