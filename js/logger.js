const Logger = {
  async write(action, message, meta) {
    if (!FirebaseApp.ready) return;
    const user = FirebaseApp.auth.currentUser;
    try {
      await FirebaseApp.db.collection("logs").add({
        action,
        message: message || "",
        meta: meta || {},
        userId: user?.uid || null,
        email: user?.email || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error("Log write failed:", e);
    }
  },

  async fetchForAdmin(limitCount) {
    if (!FirebaseApp.ready) return [];
    const snap = await FirebaseApp.db.collection("logs")
      .orderBy("createdAt", "desc")
      .limit(limitCount || 200)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeAdmin(callback, limitCount) {
    if (!FirebaseApp.ready) return () => {};
    return FirebaseApp.db.collection("logs")
      .orderBy("createdAt", "desc")
      .limit(limitCount || 200)
      .onSnapshot(snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, err => console.error("Logs subscribe error:", err));
  },

  renderTable(logs, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!logs.length) {
      el.innerHTML = '<p style="color:var(--text-muted)">Логов пока нет.</p>';
      return;
    }
    el.innerHTML = `
      <table class="logs-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>Действие</th>
            <th>Пользователь</th>
            <th>Сообщение</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td class="log-time">${formatLogTime(log.createdAt)}</td>
              <td><code>${escapeHtml(log.action)}</code></td>
              <td>${escapeHtml(log.email || "—")}</td>
              <td>${escapeHtml(log.message)}${log.meta && Object.keys(log.meta).length ? `<br><small style="color:var(--text-muted)">${escapeHtml(JSON.stringify(log.meta))}</small>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
};
