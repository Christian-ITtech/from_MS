/* ==========================================================================
   GALLERY.JS — logique de la page gallery.html
   Rôle : aller chercher toutes les vidéos enregistrées dans Appwrite
   (métadonnées + fichier), puis les afficher sous forme de grille de cartes.
   ========================================================================== */
(function () {

  // Le conteneur dans gallery.html où on va injecter les cartes vidéo
  // (ou les messages "chargement" / "vide" / "erreur").
  const content = document.getElementById('galleryContent');

  // ---------- utilitaires ----------

  // Échappe le texte fourni par l'utilisateur (nom, sujet, description)
  // avant de l'insérer dans le HTML, pour éviter qu'un texte du type
  // "<script>...</script>" ne soit exécuté dans la page (faille XSS).
  // Astuce : on passe le texte dans un <div> puis on relit son innerHTML,
  // le navigateur se charge lui-même de le neutraliser proprement.
  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // Transforme une date technique Appwrite (ex: "2026-08-24T10:00:00.000Z")
  // en date lisible en français (ex: "24 août 2026").
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---------- affichage ----------

  // Construit et affiche la grille de cartes vidéo à partir de la liste
  // de documents renvoyée par Appwrite (un "doc" = une soumission :
  // nom, sujet, description, videoFileId...).
  function render(docs) {
    // Clause de garde : s'il n'y a aucune vidéo, on affiche un message
    // à la place de la grille et on s'arrête là.
    if (!docs.length) {
      content.innerHTML = '<div class="state-box">Aucune vidéo pour le moment. Soyez le premier à en partager une.</div>';
      return;
    }

    const cfg = window.APPWRITE_CONFIG;
    const { storage } = window.appwrite;

    // Pour chaque document, on construit le bloc HTML de sa carte.
    const cards = docs.map(doc => {

      // getFileView() ne télécharge pas le fichier : elle construit juste
      // l'URL publique à partir de laquelle le <video> pourra le lire,
      // un peu comme on construirait un lien vers une image.
      const videoUrl = storage.getFileView(cfg.bucketId, doc.videoFileId);

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
    }).join(''); // on assemble toutes les cartes en un seul bloc de texte HTML

    // On injecte toutes les cartes d'un coup dans la grille.
    content.innerHTML = `<div class="grid">${cards}</div>`;
  }

  // ---------- chargement des données ----------

  // Fonction principale : va chercher les vidéos auprès d'Appwrite,
  // puis les affiche (ou affiche un message d'erreur/attente).
  async function load() {

    // Clause de garde : si config.js n'a pas été rempli correctement
    // (voir window.APPWRITE_READY dans config.js), inutile d'essayer
    // de contacter Appwrite — on prévient directement l'utilisateur et on s'arrête.
    if (!window.APPWRITE_READY) {
      content.innerHTML =
        '<div class="state-box err">Configuration Appwrite incomplète : remplis js/config.js avec les identifiants de ton projet (voir README.md).</div>';
      return;
    }

    try {
      const { databases, Query } = window.appwrite;
      const cfg = window.APPWRITE_CONFIG;

      // On demande à Appwrite la liste des documents de la collection,
      // triés du plus récent au plus ancien (Query.orderDesc), et on
      // limite à 100 résultats maximum (Query.limit) pour éviter de
      // surcharger la page si un jour il y a beaucoup de vidéos.
      const result = await databases.listDocuments(
        cfg.databaseId,
        cfg.collectionId,
        [Query.orderDesc('$createdAt'), Query.limit(100)]
      );

      // result.documents est le tableau des vidéos trouvées : on les affiche.
      render(result.documents);

    } catch (err) {
      // Si Appwrite renvoie une erreur (mauvais ID, permissions manquantes,
      // pas de connexion...), on l'affiche de façon lisible plutôt que de
      // laisser la page vide sans explication.
      console.error(err);
      content.innerHTML =
        '<div class="state-box err">Impossible de charger les vidéos : ' +
        escapeHtml(err && err.message ? err.message : 'erreur inconnue') +
        '. Vérifie les permissions de lecture de ta collection.</div>';
    }
  }

  // On lance le chargement dès que ce script s'exécute (donc dès que
  // la page gallery.html est ouverte).
  load();

})();