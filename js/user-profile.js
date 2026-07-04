const UserProfile = {
  _ready: false,

  init() {
    if (this._ready) return;
    this._ready = true;
    this.ensureModal();
    document.addEventListener("click", e => {
      const btn = e.target.closest(".user-link");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      this.open(btn.dataset.userId || "", btn.dataset.userName || "");
    });
  },

  ensureModal() {
    if (document.getElementById("userProfileModal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div id="userProfileModal" class="modal-overlay" aria-hidden="true">
        <div class="modal modal--profile" role="dialog">
          <button type="button" class="modal-close" id="userProfileClose" aria-label="Закрыть">&times;</button>
          <div id="userProfileContent">
            <div class="user-profile-head">
              <div class="post-avatar user-profile-avatar" id="userProfileAvatar"></div>
              <div>
                <h2 id="userProfileName"></h2>
                <p class="muted" id="userProfileSince"></p>
              </div>
            </div>
            <div class="user-profile-stats" id="userProfileStats"></div>
            <h3 class="user-profile-section-title">Баг-репорты</h3>
            <div id="userProfileBugs" class="user-profile-bugs"></div>
          </div>
          <div id="userProfileLoading" class="muted hidden">Загрузка...</div>
        </div>
      </div>
    `);
    document.getElementById("userProfileClose").addEventListener("click", () => this.close());
    document.getElementById("userProfileModal").addEventListener("click", e => {
      if (e.target.id === "userProfileModal") this.close();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") this.close();
    });
  },

  open(uid, name) {
    if (!FirebaseApp.ready) return;
    this.ensureModal();
    const modal = document.getElementById("userProfileModal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("userProfileContent").classList.add("hidden");
    document.getElementById("userProfileLoading").classList.remove("hidden");
    this.load(uid, name);
  },

  close() {
    const modal = document.getElementById("userProfileModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  },

  async load(uid, name) {
    const displayName = name || "Пользователь";
    document.getElementById("userProfileName").textContent = displayName;
    const avatar = document.getElementById("userProfileAvatar");
    avatar.textContent = avatarInitials(displayName);
    avatar.style.cssText = avatarStyle(displayName);

    let profile = null;
    if (uid) {
      try {
        profile = await AuthService.getProfile(uid);
      } catch (e) {
        console.warn("profile load:", e);
      }
    }

    if (profile?.nickname) {
      document.getElementById("userProfileName").textContent = profile.nickname;
    }

    const sinceEl = document.getElementById("userProfileSince");
    if (profile?.createdAt) {
      sinceEl.textContent = "На сайте с " + formatDateShort(profile.createdAt);
    } else {
      sinceEl.textContent = uid ? "Участник баг-трекера" : "Старый аккаунт (без привязки UID)";
    }

    const bugs = await BugsService.getBugsByReporter(uid, displayName);
    const open = bugs.filter(b => b.status === "open" || b.status === "in_progress").length;
    const fixed = bugs.filter(b => b.status === "fixed").length;
    const closed = bugs.filter(b => b.status === "closed").length;
    const comments = bugs.reduce((sum, b) => sum + (b.commentCount || 0), 0);

    document.getElementById("userProfileStats").innerHTML = `
      <div class="user-stat"><span class="num">${bugs.length}</span><span class="label">репортов</span></div>
      <div class="user-stat"><span class="num">${open}</span><span class="label">активных</span></div>
      <div class="user-stat"><span class="num">${fixed}</span><span class="label">исправлено</span></div>
      <div class="user-stat"><span class="num">${closed}</span><span class="label">закрыто</span></div>
      <div class="user-stat"><span class="num">${comments}</span><span class="label">сообщений</span></div>
    `;

    const bugsEl = document.getElementById("userProfileBugs");
    if (!bugs.length) {
      bugsEl.innerHTML = '<p class="muted">Репортов пока нет.</p>';
    } else {
      bugsEl.innerHTML = bugs.map(b => `
        <a href="bug.html?id=${encodeURIComponent(b.id)}" class="user-bug-item user-bug-item--${b.status}">
          <div class="user-bug-item-top">
            <span class="bug-id">${b.id}</span>
            ${statusBadge(b.status)} ${priorityBadge(b.priority)}
          </div>
          <div class="user-bug-item-title">${escapeHtml(b.title)}</div>
          <div class="user-bug-item-meta">${formatDateShort(b.createdAt)} · ${b.commentCount || 0} сообщ.</div>
        </a>
      `).join("");
    }

    document.getElementById("userProfileLoading").classList.add("hidden");
    document.getElementById("userProfileContent").classList.remove("hidden");
  }
};

document.addEventListener("DOMContentLoaded", () => UserProfile.init());
