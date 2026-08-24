/* ==========================================================================
   UPLOAD.JS — logique de la page index.html
   Rôle : valider le formulaire de soumission, gérer la zone de dépôt vidéo,
   puis envoyer le fichier + les métadonnées vers Appwrite.
   ========================================================================== */
(function () {

  // Taille maximale acceptée côté formulaire, en méga-octets.
  // À garder cohérente avec la limite configurée sur le bucket Appwrite
  // (sinon le formulaire accepte un fichier qu'Appwrite refusera ensuite).
  const MAX_SIZE_MB = 200;

  // ---------- récupération des éléments du DOM ----------
  // On va chercher une fois pour toutes, au chargement du script, toutes
  // les balises HTML dont on aura besoin. Ça évite de refaire
  // document.getElementById(...) à chaque fois qu'on en a besoin plus bas.

  const form = document.getElementById('uploadForm');
  const nom = document.getElementById('nom');
  const sujet = document.getElementById('sujet');
  const description = document.getElementById('description');
  const submitBtn = document.getElementById('submitBtn');
  const msgBox = document.getElementById('msgBox');

  const dropzone = document.getElementById('dropzone');
  const videoInput = document.getElementById('videoInput');
  const dropzoneEmpty = document.getElementById('dropzoneEmpty');
  const dropzoneFile = document.getElementById('dropzoneFile');
  const dropzoneFileName = document.getElementById('dropzoneFileName');
  const dropzoneRemove = document.getElementById('dropzoneRemove');
  const fileHint = document.getElementById('fileHint');
  const cgu = document.getElementById('cgu');

  const progressTrack = document.getElementById('progressTrack');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');

  // Le fichier vidéo actuellement sélectionné par l'utilisateur.
  // null tant qu'aucun fichier valide n'a été choisi.
  let selectedFile = null;

  // ==========================================================================
  // PETITS UTILITAIRES DOM
  // Toutes ces fonctions commencent par "if (!el) return;" : une clause de
  // garde qui évite un crash ("Cannot set properties of null") si jamais
  // l'élément recherché n'existe pas dans le HTML. C'est ce qui a corrigé
  // le bug qu'on a eu plus tôt avec la fiche spécimen supprimée.
  // ==========================================================================

  // Change le texte affiché dans un élément, sans planter s'il est absent.
  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  // Change la largeur CSS d'un élément (utilisé pour la barre de progression).
  function setWidth(el, cssWidth) {
    if (!el) return;
    el.style.width = cssWidth;
  }

  // Ajoute ou retire une classe CSS selon la valeur de isOn (true/false).
  function toggleClass(el, className, isOn) {
    if (!el) return;
    el.classList.toggle(className, isOn);
  }

  // Rend un élément visible (annule tout display:none appliqué avant).
  function show(el) {
    if (!el) return;
    el.style.display = '';
  }

  // Cache un élément.
  function hide(el) {
    if (!el) return;
    el.style.display = 'none';
  }

  // Transforme une taille en octets en texte lisible ("3.5 Mo", "480 Ko"...).
  function formatSize(bytes) {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + ' Ko';
    return mb.toFixed(1) + ' Mo';
  }

  // ==========================================================================
  // MESSAGES GÉNÉRAUX ET ERREURS DE CHAMP
  // ==========================================================================

  // Affiche un bandeau de message en haut du formulaire.
  // kind vaut 'ok' (vert, succès) ou 'err' (rouge, erreur).
  function showMessage(text, kind) {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = 'msg-box show ' + kind;
  }

  // Cache le bandeau de message (utilisé au début de chaque tentative d'envoi).
  function hideMessage() {
    if (!msgBox) return;
    msgBox.className = 'msg-box';
  }

  // Ajoute/retire le contour rouge "err" sur un champ de saisie invalide.
  function setFieldError(el, isError) {
    toggleClass(el, 'err', isError);
  }

  // Affiche le petit texte d'aide/erreur sous la zone de dépôt vidéo.
  function setFileHint(text, isError) {
    setText(fileHint, text);
    if (fileHint) fileHint.className = isError ? 'hint err' : 'hint';
  }

  // ==========================================================================
  // ZONE DE DÉPÔT VIDÉO (dropzone)
  // ==========================================================================

  // Réinitialise la zone de dépôt : aucun fichier sélectionné.
  function clearFile() {
    selectedFile = null;
    show(dropzoneEmpty);   // on réaffiche "Cliquez ou déposez votre vidéo ici"
    hide(dropzoneFile);    // on cache le nom du fichier précédemment choisi
    setFileHint('', false);
  }

  // Refuse le fichier proposé et affiche pourquoi (message donné en paramètre).
  function rejectFile(message) {
    setFileHint(message, true);
    toggleClass(dropzone, 'err', true);
    videoInput.value = ''; // on vide l'input pour permettre de réessayer le même fichier
  }

  // Vrai si le fichier est bien une vidéo (son type MIME commence par "video/").
  function isVideoFile(file) {
    return file.type.startsWith('video/');
  }

  // Vrai si le fichier dépasse la taille maximale autorisée.
  function isFileTooLarge(file) {
    return file.size > MAX_SIZE_MB * 1024 * 1024;
  }

  // Valide définitivement le fichier : on le mémorise et on met à jour l'affichage.
  function acceptFile(file) {
    toggleClass(dropzone, 'err', false);
    setFileHint('', false);
    selectedFile = file;
    hide(dropzoneEmpty);
    show(dropzoneFile);
    setText(dropzoneFileName, `${file.name} (${formatSize(file.size)})`);
  }

  // Point d'entrée appelé à chaque fois qu'un fichier est proposé
  // (clic + sélection, ou glisser-déposer).
  // Écrit avec des clauses de garde : chaque cas anormal sort immédiatement
  // avec un "return", au lieu d'empiler des if/else imbriqués.
  function setFile(file) {
    if (!file) return clearFile();
    if (!isVideoFile(file)) return rejectFile("Ce fichier n'est pas une vidéo.");
    if (isFileTooLarge(file)) {
      return rejectFile(`Le fichier dépasse ${MAX_SIZE_MB} Mo (taille actuelle : ${formatSize(file.size)}).`);
    }
    acceptFile(file);
  }

  // Branche tous les événements de la dropzone (clic, sélection, glisser-déposer,
  // bouton "Retirer"). Regroupé dans une seule fonction pour garder
  // l'initialisation en bas du fichier bien lisible.
  function wireDropzoneEvents() {
    // Cliquer n'importe où dans la zone ouvre le sélecteur de fichier,
    // sauf si on a cliqué précisément sur le bouton "Retirer".
    dropzone.addEventListener('click', (e) => {
      if (e.target === dropzoneRemove) return;
      videoInput.click();
    });

    // Quand l'utilisateur choisit un fichier via la boîte de dialogue système.
    videoInput.addEventListener('change', () => setFile(videoInput.files[0] || null));

    // Effet visuel quand un fichier est glissé au-dessus de la zone.
    ['dragover', 'dragenter'].forEach(evt =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); toggleClass(dropzone, 'drag', true); })
    );
    // On retire l'effet visuel quand le glisser sort de la zone ou qu'on dépose.
    ['dragleave', 'drop'].forEach(evt =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); toggleClass(dropzone, 'drag', false); })
    );
    // Le dépôt effectif du fichier (glisser-déposer).
    dropzone.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0] || null));

    // Bouton "Retirer" : on vide l'input natif ET notre état interne.
    dropzoneRemove.addEventListener('click', (e) => {
      e.stopPropagation(); // empêche le clic de aussi déclencher l'ouverture du sélecteur
      videoInput.value = '';
      clearFile();
    });
  }

  // ==========================================================================
  // VALIDATION DU FORMULAIRE
  // Chaque fonction vérifie UNE seule règle et renvoie true/false.
  // ==========================================================================

  // Vérifie que nom, sujet et description sont bien remplis.
  // Marque chaque champ vide en rouge au passage.
  function validateRequiredTextFields() {
    let allValid = true;
    [nom, sujet, description].forEach(el => {
      const isEmpty = !el.value.trim();
      setFieldError(el, isEmpty);
      if (isEmpty) allValid = false;
    });
    return allValid;
  }

  // Vérifie qu'un fichier vidéo a bien été sélectionné.
  function validateFileSelected() {
    if (selectedFile) return true;
    setFileHint('Merci de sélectionner un fichier vidéo.', true);
    toggleClass(dropzone, 'err', true);
    return false;
  }

  // Vérifie que la case "j'autorise la publication" est cochée.
  function validateConsent() {
    return !!(cgu && cgu.checked);
  }

  // Rassemble les 3 validations précédentes. Volontairement, on appelle
  // TOUJOURS les trois fonctions (pas de court-circuit avec &&), pour que
  // les 3 erreurs s'affichent en même temps plutôt qu'une par une.
  function isFormValid() {
    const textFieldsValid = validateRequiredTextFields();
    const fileValid = validateFileSelected();
    const consentValid = validateConsent();
    return textFieldsValid && fileValid && consentValid;
  }

  // ==========================================================================
  // APPELS APPWRITE
  // Isolés dans leurs propres fonctions : si un jour l'API Appwrite change,
  // c'est seulement ici qu'il faudra modifier le code.
  // ==========================================================================

  // Envoie le fichier vidéo vers le bucket de stockage Appwrite.
  // onProgress est rappelée régulièrement pendant l'envoi pour mettre à jour
  // la barre de progression (utile car les vidéos sont volumineuses).
  function uploadVideoFile(file, onProgress) {
    const { storage, ID } = window.appwrite;
    const cfg = window.APPWRITE_CONFIG;
    // ID.unique() génère un identifiant aléatoire pour ce fichier.
    return storage.createFile(cfg.bucketId, ID.unique(), file, undefined, onProgress);
  }

  // Crée le document "métadonnées" dans la base de données (nom, sujet,
  // description...), en le liant au fichier vidéo via son videoFileId.
  function saveVideoMetadata(fields, uploadedFile) {
    const { databases, ID } = window.appwrite;
    const cfg = window.APPWRITE_CONFIG;
    const data = {
      nom: fields.nom,
      sujet: fields.sujet,
      description: fields.description,
      videoFileId: uploadedFile.$id,       // l'ID renvoyé par uploadVideoFile()
      videoFileName: fields.fileName,
    };
    return databases.createDocument(cfg.databaseId, cfg.collectionId, ID.unique(), data);
  }

  // Relit les valeurs actuelles des champs du formulaire, prêtes à être
  // envoyées à saveVideoMetadata().
  function readFormFields() {
    return {
      nom: nom.value.trim(),
      sujet: sujet.value.trim(),
      description: description.value.trim(),
      fileName: selectedFile.name,
    };
  }

  // ==========================================================================
  // SOUMISSION DU FORMULAIRE
  // ==========================================================================

  // Appelée automatiquement par Appwrite pendant l'upload, plusieurs fois,
  // avec la progression actuelle (progress.progress, de 0 à 100).
  function onUploadProgress(progress) {
    const pct = Math.round(progress.progress || 0);
    setWidth(progressBar, pct + '%');
    setText(progressLabel, `Téléversement de la vidéo... ${pct}%`);
  }

  // Met l'interface en état "envoi en cours" : bouton désactivé,
  // barre de progression visible et remise à zéro.
  function startSubmitUi() {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';
    toggleClass(progressTrack, 'show', true);
    setWidth(progressBar, '0%');
    setText(progressLabel, 'Téléversement de la vidéo...');
  }

  // Met l'interface en état "succès" et redirige vers la galerie après
  // un court délai (pour laisser le temps de lire le message).
  function finishSubmitUiSuccess() {
    setWidth(progressBar, '100%');
    setText(progressLabel, 'Terminé.');
    showMessage('Votre vidéo a bien été envoyée. Redirection vers la galerie...', 'ok');
    setTimeout(() => { window.location.href = 'gallery.html'; }, 1200);
  }

  // Met l'interface en état "échec" : affiche l'erreur et réactive le
  // bouton pour permettre de réessayer.
  function finishSubmitUiError(err) {
    console.error(err);
    const reason = (err && err.message) ? err.message : 'erreur inconnue';
    showMessage(
      `L'envoi a échoué : ${reason}. Vérifie ta configuration Appwrite (permissions du bucket et de la collection).`,
      'err'
    );
    submitBtn.disabled = false;
    submitBtn.textContent = 'Envoyer la vidéo';
  }

  // Enchaîne les deux étapes réseau : upload du fichier, PUIS création du
  // document de métadonnées (dans cet ordre, car il faut l'ID du fichier
  // pour pouvoir le référencer dans le document).
  async function submitVideo() {
    const fields = readFormFields();
    const uploadedFile = await uploadVideoFile(selectedFile, onUploadProgress);
    await saveVideoMetadata(fields, uploadedFile);
  }

  // Gestionnaire principal, appelé quand l'utilisateur clique sur
  // "Envoyer la vidéo". Volontairement court : il délègue tout le détail
  // aux fonctions définies plus haut, et se contente d'enchaîner les étapes
  // avec des clauses de garde.
  async function handleSubmit(event) {
    event.preventDefault(); // empêche le rechargement de page par défaut du <form>
    hideMessage();

    // Clause de garde : config.js pas rempli → on prévient et on s'arrête,
    // inutile de tenter un appel réseau voué à échouer.
    if (!window.APPWRITE_READY) {
      showMessage("Configuration Appwrite incomplète : remplis js/config.js avec les identifiants de ton projet (voir README.md).", 'err');
      return;
    }
    // Clause de garde : formulaire invalide → les erreurs sont déjà
    // affichées par isFormValid(), on s'arrête simplement là.
    if (!isFormValid()) return;

    startSubmitUi();
    try {
      await submitVideo();
      finishSubmitUiSuccess();
    } catch (err) {
      finishSubmitUiError(err);
    }
  }

  // ==========================================================================
  // INITIALISATION
  // Ces deux lignes ne s'exécutent qu'une fois, au chargement du script :
  // elles "branchent" tous les événements définis plus haut.
  // ==========================================================================

  wireDropzoneEvents();
  form.addEventListener('submit', handleSubmit);

})();