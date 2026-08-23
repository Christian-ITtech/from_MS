(function () {
  const MAX_SIZE_MB = 200;

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

  const progressTrack = document.getElementById('progressTrack');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');

  const specimenTitle = document.getElementById('specimenTitle');
  const specimenSujet = document.getElementById('specimenSujet');
  const specimenAuthor = document.getElementById('specimenAuthor');
  const specimenFile = document.getElementById('specimenFile');
  const specimenStamp = document.getElementById('specimenStamp');

  let selectedFile = null;

  function refreshSpecimen() {
    specimenTitle.textContent = sujet.value.trim() || 'Votre vidéo';
    specimenSujet.textContent = 'Sujet ' + (sujet.value.trim() ? '— ' + sujet.value.trim() : '—');
    specimenAuthor.textContent = nom.value.trim() ? 'Par ' + nom.value.trim() : 'Auteur —';
    specimenFile.textContent = selectedFile ? selectedFile.name : 'Aucun fichier';
  }
  [nom, sujet].forEach(el => el.addEventListener('input', refreshSpecimen));

  function setFieldError(el, isError) {
    el.classList.toggle('err', !!isError);
  }

  function showMessage(text, kind) {
    msgBox.textContent = text;
    msgBox.className = 'msg-box show ' + kind;
  }
  function hideMessage() {
    msgBox.className = 'msg-box';
  }

  function formatSize(bytes) {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(1) + ' Mo' : Math.round(bytes / 1024) + ' Ko';
  }

  function setFile(file) {
    if (!file) {
      selectedFile = null;
      dropzoneEmpty.style.display = '';
      dropzoneFile.style.display = 'none';
      fileHint.textContent = '';
      fileHint.className = 'hint';
      refreshSpecimen();
      return;
    }
    if (!file.type.startsWith('video/')) {
      fileHint.textContent = 'Ce fichier n\'est pas une vidéo.';
      fileHint.className = 'hint err';
      dropzone.classList.add('err');
      videoInput.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      fileHint.textContent = `Le fichier dépasse ${MAX_SIZE_MB} Mo (taille actuelle : ${formatSize(file.size)}).`;
      fileHint.className = 'hint err';
      dropzone.classList.add('err');
      videoInput.value = '';
      return;
    }
    dropzone.classList.remove('err');
    fileHint.textContent = '';
    fileHint.className = 'hint';
    selectedFile = file;
    dropzoneEmpty.style.display = 'none';
    dropzoneFile.style.display = 'flex';
    dropzoneFileName.textContent = `${file.name} (${formatSize(file.size)})`;
    refreshSpecimen();
  }

  dropzone.addEventListener('click', (e) => {
    if (e.target === dropzoneRemove) return;
    videoInput.click();
  });
  videoInput.addEventListener('change', () => setFile(videoInput.files[0] || null));

  ['dragover', 'dragenter'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); })
  );
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });
  dropzoneRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    videoInput.value = '';
    setFile(null);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideMessage();

    if (!window.APPWRITE_READY) {
      showMessage(
        "Configuration Appwrite incomplète : remplis js/config.js avec les identifiants de ton projet (voir README.md).",
        'err'
      );
      return;
    }

    let valid = true;
    [nom, sujet, description].forEach(el => {
      const empty = !el.value.trim();
      setFieldError(el, empty);
      if (empty) valid = false;
    });
    if (!selectedFile) {
      fileHint.textContent = 'Merci de sélectionner un fichier vidéo.';
      fileHint.className = 'hint err';
      dropzone.classList.add('err');
      valid = false;
    }
    const cgu = document.getElementById('cgu');
    if (!cgu.checked) valid = false;

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';
    progressTrack.classList.add('show');
    progressBar.style.width = '0%';
    progressLabel.textContent = 'Téléversement de la vidéo...';
    specimenStamp.textContent = 'Envoi...';
    specimenStamp.classList.remove('saved');

    try {
      const { storage, databases, ID } = window.appwrite;
      const cfg = window.APPWRITE_CONFIG;

      // 1. Upload the video file to Appwrite Storage
      const uploadedFile = await storage.createFile({
        bucketId: cfg.bucketId,
        fileId: ID.unique(),
        file: selectedFile,
        onProgress: (progress) => {
          const pct = Math.round(progress.progress || 0);
          progressBar.style.width = pct + '%';
          progressLabel.textContent = `Téléversement de la vidéo... ${pct}%`;
        },
      });

      // 2. Create the metadata document in the database
      await databases.createDocument({
        databaseId: cfg.databaseId,
        collectionId: cfg.collectionId,
        documentId: ID.unique(),
        data: {
          nom: nom.value.trim(),
          sujet: sujet.value.trim(),
          description: description.value.trim(),
          videoFileId: uploadedFile.$id,
          videoFileName: selectedFile.name,
        },
      });

      progressBar.style.width = '100%';
      progressLabel.textContent = 'Terminé.';
      specimenStamp.textContent = 'Enregistré';
      specimenStamp.classList.add('saved');

      showMessage('Votre vidéo a bien été envoyée. Redirection vers la galerie...', 'ok');
      setTimeout(() => { window.location.href = 'gallery.html'; }, 1200);

    } catch (err) {
      console.error(err);
      specimenStamp.textContent = 'Échec';
      showMessage(
        "L'envoi a échoué : " + (err && err.message ? err.message : 'erreur inconnue') +
        ". Vérifie ta configuration Appwrite (permissions du bucket et de la collection).",
        'err'
      );
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer la vidéo';
    }
  });

  refreshSpecimen();
})();
