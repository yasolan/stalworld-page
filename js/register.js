document.getElementById("footerText").textContent = CONFIG.siteName;

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("registerError");
  err.textContent = "";

  if (!FirebaseApp.init()) {
    err.textContent = "Firebase не настроен. См. FIREBASE_SETUP.md";
    return;
  }

  try {
    await AuthService.register(
      document.getElementById("email").value,
      document.getElementById("password").value,
      document.getElementById("nickname").value
    );
    window.location.href = "index.html";
  } catch (ex) {
    err.textContent = translateAuthError(ex);
  }
});

function translateAuthError(ex) {
  const code = ex.code || "";
  const map = {
    "auth/email-already-in-use": "Email уже зарегистрирован",
    "auth/invalid-email": "Некорректный email",
    "auth/weak-password": "Пароль слишком простой (мин. 6 символов)"
  };
  return map[code] || ex.message || "Ошибка регистрации";
}
