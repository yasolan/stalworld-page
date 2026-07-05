const AuthGuard = {
  PUBLIC_PAGES: ["login.html", "register.html"],

  pageName() {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "index.html";
  },

  isPublicPage() {
    return this.PUBLIC_PAGES.includes(this.pageName())
      || document.body?.dataset?.publicAuth === "true";
  },

  redirectToLogin() {
    const target = this.pageName() + location.search + location.hash;
    location.replace("login.html?next=" + encodeURIComponent(target));
  },

  unlock() {
    window.__authAllowed = true;
    document.body?.classList.remove("auth-pending");
    document.dispatchEvent(new Event("auth-ready"));
  },

  whenReady(fn) {
    if (window.__authAllowed) {
      fn();
      return;
    }
    document.addEventListener("auth-ready", fn, { once: true });
  },

  init() {
    if (this.isPublicPage()) {
      window.__authAllowed = true;
      document.body?.classList.remove("auth-pending");
      return;
    }

    window.__authAllowed = false;
    document.body?.classList.add("auth-pending");

    if (!FirebaseApp.isConfigured() || !FirebaseApp.init()) {
      this.redirectToLogin();
      return;
    }

    AuthService.onAuthChange((user) => {
      if (!user) {
        this.redirectToLogin();
        return;
      }
      this.unlock();
    });
  }
};

AuthGuard.init();
