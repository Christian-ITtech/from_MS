/* ==========================================================================
   CONFIGURATION APPWRITE
   Remplis les 5 valeurs ci-dessous avec celles de TON projet Appwrite.
   Où les trouver : voir le README.md fourni avec ce projet.
   ========================================================================== */
window.APPWRITE_CONFIG = {
  endpoint:     "https://fra.cloud.appwrite.io/v1",
  projectId:    "6a8b67fb0009d064fd50",
  databaseId:   "database-6a8b6852003aed592831", // On garde strictement "databaseId" à gauche
  collectionId: "table-videos",                  // On garde strictement "collectionId" à gauche
  bucketId:     "6a8b6e1600128723e652",
};

/* ---- initialisation du client (ne pas modifier) ---- */
(function () {
  const cfg = window.APPWRITE_CONFIG;
  const { Client, Databases, Storage, ID, Query } = window.Appwrite;

  const client = new Client()
    .setEndpoint(cfg.endpoint)
    .setProject(cfg.projectId);

  window.appwrite = {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
    ID,
    Query,
  };

  window.APPWRITE_READY =
    !cfg.endpoint.includes("YOUR_") &&
    !cfg.projectId.includes("YOUR_") &&
    !cfg.databaseId.includes("YOUR_") &&
    !cfg.collectionId.includes("YOUR_") &&
    !cfg.bucketId.includes("YOUR_");
})();
