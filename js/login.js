document.getElementById("footerText").textContent = CONFIG.siteName;

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("loginError");
  err.textContent = "";

  if (!FirebaseApp.init()) {
    err.textContent = "Firebase не настроен. См. FIREBASE_SETUP.md";
    return;
  }

  try {
    await AuthService.login(
      document.getElementById("email").value,
      document.getElementById("password").value
    );
    const redirect = new URLSearchParams(location.search).get("next") || "index.html";
    window.location.href = redirect;
  } catch (ex) {
    err.textContent = translateAuthError(ex);
  }
});

function translateAuthError(ex) {
  const code = ex.code || "";
  const map = {
    "auth/user-not-found": "Пользователь не найден",
    "auth/wrong-password": "Неверный пароль",
    "auth/invalid-email": "Некорректный email",
    "auth/invalid-credential": "Неверный email или пароль",
    "auth/too-many-requests": "Слишком много попыток, попробуйте позже"
  };
  return map[code] || ex.message || "Ошибка входа";
}
