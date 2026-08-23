(function () {
  const content = document.getElementById('galleryContent');

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function render(docs) {
    if (!docs.length) {
      content.innerHTML = '<div class="state-box">Aucune vidéo pour le moment. Soyez le premier à en partager une.</div>';
      return;
    }

    const cfg = window.APPWRITE_CONFIG;
    const { storage } = window.appwrite;

    const cards = docs.map(doc => {
      const videoUrl = storage.getFileView({
        bucketId: cfg.bucketId,
        fileId: doc.videoFileId,
      });
      return `
        <div class="vcard">
          <video controls preload="metadata" src="${videoUrl}"></video>
          <div class="vcard-body">
            <div class="vcard-sujet">${escapeHtml(doc.sujet)}</div>
            <div class="vcard-title">${escapeHtml(doc.nom)}</div>
            <div class="vcard-desc">${escapeHtml(doc.description)}</div>
            <div class="vcard-meta">${fmtDate(doc.$createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `<div class="grid">${cards}</div>`;
  }

  async function load() {
    if (!window.APPWRITE_READY) {
      content.innerHTML =
        '<div class="state-box err">Configuration Appwrite incomplète : remplis js/config.js avec les identifiants de ton projet (voir README.md).</div>';
      return;
    }

    try {
      const { databases, Query } = window.appwrite;
      const cfg = window.APPWRITE_CONFIG;

      const result = await databases.listDocuments({
        databaseId: cfg.databaseId,
        collectionId: cfg.collectionId,
        queries: [Query.orderDesc('$createdAt'), Query.limit(100)],
      });

      render(result.documents);
    } catch (err) {
      console.error(err);
      content.innerHTML =
        '<div class="state-box err">Impossible de charger les vidéos : ' +
        escapeHtml(err && err.message ? err.message : 'erreur inconnue') +
        '. Vérifie les permissions de lecture de ta collection.</div>';
    }
  }

  load();
})();
