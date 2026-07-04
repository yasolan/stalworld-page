const BugsService = {
  async getNextBugId() {
    const ref = FirebaseApp.db.collection("meta").doc("counters");
    return FirebaseApp.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists ? snap.data().bugs || 0 : 0;
      const next = last + 1;
      tx.set(ref, { bugs: next }, { merge: true });
      return "BUG-" + String(next).padStart(3, "0");
    });
  },

  async listBugs() {
    const snap = await FirebaseApp.db.collection("bugs")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  },

  subscribeBugs(callback) {
    return FirebaseApp.db.collection("bugs")
      .orderBy("createdAt", "desc")
      .onSnapshot(snap => {
        callback(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
      }, err => console.error("bugs subscribe:", err));
  },

  async getBug(bugId) {
    const snap = await FirebaseApp.db.collection("bugs").doc(bugId).get();
    if (!snap.exists) return null;
    return { docId: snap.id, ...snap.data() };
  },

  async createBug(data, user, profile) {
    const bugId = await this.getNextBugId();
    const payload = {
      id: bugId,
      title: data.title,
      description: data.description,
      steps: data.steps || "",
      screenshot: data.screenshot || "",
      category: data.category,
      priority: data.priority,
      status: "open",
      reporterId: user.uid,
      reporter: data.reporter || profile?.nickname || user.email.split("@")[0],
      reporterEmail: user.email,
      commentCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await FirebaseApp.db.collection("bugs").doc(bugId).set(payload);
    return bugId;
  },

  async updateBug(bugId, data) {
    await FirebaseApp.db.collection("bugs").doc(bugId).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async deleteBug(bugId) {
    const comments = await FirebaseApp.db.collection("bugs").doc(bugId).collection("comments").get();
    const batch = FirebaseApp.db.batch();
    comments.docs.forEach(d => batch.delete(d.ref));
    batch.delete(FirebaseApp.db.collection("bugs").doc(bugId));
    await batch.commit();
  },

  subscribeComments(bugId, callback) {
    return FirebaseApp.db.collection("bugs").doc(bugId).collection("comments")
      .orderBy("createdAt", "asc")
      .onSnapshot(snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, err => console.error("comments subscribe:", err));
  },

  async addComment(bugId, text, user, profile, isAdmin) {
    const comment = {
      text: text.trim(),
      authorId: user.uid,
      author: profile?.nickname || user.email.split("@")[0],
      authorEmail: user.email,
      isDev: !!isAdmin,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await FirebaseApp.db.collection("bugs").doc(bugId).collection("comments").add(comment);
    await FirebaseApp.db.collection("bugs").doc(bugId).update({
      commentCount: firebase.firestore.FieldValue.increment(1),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async seedFromJson(bugs) {
    for (const bug of bugs) {
      const id = bug.id;
      if (!id) continue;
      const { comments, ...rest } = bug;
      await FirebaseApp.db.collection("bugs").doc(id).set({
        ...rest,
        commentCount: (comments || []).length,
        createdAt: firebase.firestore.Timestamp.fromDate(new Date(bug.createdAt || Date.now())),
        updatedAt: firebase.firestore.Timestamp.fromDate(new Date(bug.updatedAt || Date.now()))
      }, { merge: true });
      if (comments?.length) {
        for (const c of comments) {
          await FirebaseApp.db.collection("bugs").doc(id).collection("comments").add({
            text: c.text,
            author: c.author,
            isDev: true,
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(c.date || Date.now()))
          });
        }
      }
    }
    const maxNum = bugs.reduce((m, b) => {
      const match = /^BUG-(\d+)$/i.exec(b.id);
      return match ? Math.max(m, parseInt(match[1], 10)) : m;
    }, 0);
    await FirebaseApp.db.collection("meta").doc("counters").set({ bugs: maxNum }, { merge: true });
  }
};
