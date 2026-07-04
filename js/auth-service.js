const AuthService = {
  _adminCache: {},
  _lastUser: undefined,
  _lastAdmin: false,
  _listeners: [],
  _authBound: false,

  async register(email, password, nickname) {
    if (!FirebaseApp.ready) throw new Error("Firebase не настроен");
    const cred = await FirebaseApp.auth.createUserWithEmailAndPassword(email.trim(), password);
    await FirebaseApp.db.collection("users").doc(cred.user.uid).set({
      email: cred.user.email,
      nickname: nickname.trim() || email.split("@")[0],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await Logger.write("user.register", "Регистрация аккаунта", { nickname: nickname.trim() });
    return cred.user;
  },

  async login(email, password) {
    if (!FirebaseApp.ready) throw new Error("Firebase не настроен");
    const cred = await FirebaseApp.auth.signInWithEmailAndPassword(email.trim(), password);
    await Logger.write("user.login", "Вход в аккаунт");
    return cred.user;
  },

  async logout() {
    if (!FirebaseApp.auth?.currentUser) return;
    await Logger.write("user.logout", "Выход из аккаунта");
    await FirebaseApp.auth.signOut();
  },

  currentUser() {
    return FirebaseApp.auth?.currentUser || null;
  },

  async getProfile(uid) {
    const doc = await FirebaseApp.db.collection("users").doc(uid).get();
    return doc.exists ? doc.data() : null;
  },

  async isAdmin(user) {
    if (!user?.uid || !FirebaseApp.ready) return false;
    if (this._adminCache[user.uid] !== undefined) return this._adminCache[user.uid];
    const doc = await FirebaseApp.db.collection("admins").doc(user.uid).get();
    this._adminCache[user.uid] = doc.exists;
    return doc.exists;
  },

  _notify() {
    for (const cb of this._listeners) {
      try {
        cb(this._lastUser || null, this._lastAdmin);
      } catch (e) {
        console.error("Auth listener error:", e);
      }
    }
  },

  _bindAuthListener() {
    if (this._authBound || !FirebaseApp.ready) return;
    this._authBound = true;

    FirebaseApp.auth.onAuthStateChanged(async (user) => {
      this._lastUser = user;
      try {
        this._lastAdmin = user ? await this.isAdmin(user) : false;
      } catch (e) {
        console.error("Admin check failed:", e);
        this._lastAdmin = false;
      }
      this._notify();
    });
  },

  onAuthChange(callback) {
    if (!FirebaseApp.ready) {
      callback(null, false);
      return () => {};
    }

    this._bindAuthListener();
    this._listeners.push(callback);

    if (this._lastUser !== undefined) {
      callback(this._lastUser || null, this._lastAdmin);
    }

    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }
};
