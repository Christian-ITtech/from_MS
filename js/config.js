/* ==========================================================================
   CONFIGURATION APPWRITE
   Ce fichier fait deux choses :
     1) Il stocke les 5 identifiants de TON projet Appwrite (à remplir).
     2) Il initialise le "client" Appwrite que upload.js et gallery.js
        utiliseront ensuite pour parler au serveur.
   C'est le SEUL fichier que tu dois modifier pour connecter le site
   à ton projet Appwrite.
   ========================================================================== */

window.APPWRITE_CONFIG = {

  // L'adresse du serveur Appwrite à contacter.
  // Elle dépend de la RÉGION où ton projet a été créé (visible dans
  // Appwrite → Settings → General, juste au-dessus du Project ID).
  // Frankfurt (Europe) = "fra" → c'est ce que tu utilises ici.
  endpoint: "https://fra.cloud.appwrite.io/v1",

  // L'identifiant unique de ton PROJET Appwrite (pas de la base, pas de
  // la collection). Il ressemble à une longue chaîne hexadécimale.
  // Trouvable dans Settings → General → "Project ID".
  projectId: "6a8b67fb0009d064fd50",

  // L'identifiant de la BASE DE DONNÉES (le conteneur qui regroupe
  // tes collections). Trouvable dans Databases → clique sur ta base →
  // l'ID est affiché en haut ou dans l'URL.
  databaseId: "6a8b6852003aed592831",

  // L'identifiant de la COLLECTION (la "table" qui contient tes documents
  // vidéo : nom, sujet, description...). Ici tu as donné l'ID personnalisé
  // "videos" au moment de la création — c'est valide, à condition que ce
  // soit bien l'ID exact (visible en haut de la page de la collection dans
  // la console), pas seulement son nom d'affichage.
  collectionId: "videos",

  // L'identifiant du BUCKET de stockage (l'endroit où les fichiers vidéo
  // eux-mêmes sont hébergés, séparément des métadonnées). Trouvable dans
  // Storage → clique sur ton bucket → l'ID est affiché en haut.
  bucketId: "6a8b6e1600128723e652",

};

/* ==========================================================================
   INITIALISATION DU CLIENT APPWRITE
   Tout ce qui suit est générique : tu n'as normalement rien à changer ici,
   même si tu modifies les valeurs ci-dessus.
   ========================================================================== */
(function () {

  // On récupère l'objet de configuration qu'on vient de définir juste au-dessus.
  const cfg = window.APPWRITE_CONFIG;

  // window.Appwrite est l'objet global fourni par le <script> du SDK Appwrite
  // (chargé juste avant ce fichier dans index.html / gallery.html).
  // On en extrait les 5 "classes/outils" dont on a besoin :
  //   - Client    : la connexion de base vers le serveur Appwrite
  //   - Databases : pour lire/écrire des documents (nom, sujet, description...)
  //   - Storage   : pour envoyer/récupérer des fichiers (les vidéos)
  //   - ID        : pour générer des identifiants uniques (ID.unique())
  //   - Query     : pour filtrer/trier les résultats (utilisé dans gallery.js)
  const { Client, Databases, Storage, ID, Query } = window.Appwrite;

  // On crée UNE SEULE connexion ("client") pour toute la page, en lui
  // indiquant à quel serveur (endpoint) et à quel projet (projectId) parler.
  const client = new Client()
    .setEndpoint(cfg.endpoint)
    .setProject(cfg.projectId);

  // On expose sur window.appwrite tout ce dont upload.js et gallery.js
  // auront besoin, pour ne pas avoir à ré-initialiser un client à chaque
  // fois. C'est un peu comme une "boîte à outils partagée" entre les pages.
  window.appwrite = {
    client,                     // la connexion elle-même (rarement utilisée directement)
    databases: new Databases(client), // pour databases.createDocument(), listDocuments()...
    storage: new Storage(client),     // pour storage.createFile(), getFileView()...
    ID,                          // pour générer des IDs uniques (ex: ID.unique())
    Query,                       // pour construire des filtres (ex: Query.orderDesc(...))
  };

  // Petit garde-fou : on vérifie qu'aucune des 5 valeurs n'a été oubliée
  // (c'est-à-dire qu'elle ne contient plus le texte "YOUR_" du modèle de
  // départ). window.APPWRITE_READY sert ensuite dans upload.js et
  // gallery.js à afficher un message clair plutôt qu'une erreur technique
  // si jamais la config n'a pas été remplie.
  window.APPWRITE_READY =
    !cfg.endpoint.includes("YOUR_") &&
    !cfg.projectId.includes("YOUR_") &&
    !cfg.databaseId.includes("YOUR_") &&
    !cfg.collectionId.includes("YOUR_") &&
    !cfg.bucketId.includes("YOUR_");

})();