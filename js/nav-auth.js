function initNavAuth() {
  const slot = document.getElementById("authNav");
  if (!slot) return;

  if (!FirebaseApp.isConfigured()) {
    slot.innerHTML = '<span class="auth-muted">Auth off</span>';
    return;
  }

  FirebaseApp.init();

  AuthService.onAuthChange(async (user, isAdmin) => {
    if (!user) {
      slot.innerHTML = `
        <a href="login.html">Вход</a>
        <a href="register.html">Регистрация</a>
      `;
      return;
    }

    const profile = await AuthService.getProfile(user.uid);
    const name = profile?.nickname || user.email.split("@")[0];
    slot.innerHTML = `
      ${typeof userLink === "function" ? userLink(user.uid, name, "auth-user") : `<span class="auth-user">${escapeHtml(name)}</span>`}
      ${isAdmin ? '<a href="admin.html">Админка</a>' : ""}
      <a href="#" id="navLogout">Выйти</a>
    `;
    document.getElementById("navLogout")?.addEventListener("click", async (e) => {
      e.preventDefault();
      await AuthService.logout();
      window.location.href = "index.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof AuthGuard !== "undefined") AuthGuard.whenReady(initNavAuth);
  else initNavAuth();
});
