# Les Merveilles de la Science — Portail vidéo

Application statique (HTML/CSS/JS) branchée sur **Appwrite**, qui permet à des
étudiants chercheurs de soumettre une vidéo (nom, sujet, description, fichier)
et de la retrouver ensuite dans une galerie publique.

## Structure du projet

```
Les merveilles sites/
├── index.html          → formulaire de soumission
├── gallery.html         → galerie publique des vidéos envoyées
├── assets/
│   └── images/
│       ├── logo.png          → logo affiché en haut à gauche
│       └── background.avif   → photo de fond du panneau de gauche
├── css/
│   └── style.css        → tous les styles (formulaire + galerie)
├── js/
│   ├── config.js         → identifiants Appwrite (LE fichier à remplir)
│   ├── upload.js          → logique du formulaire de soumission
│   └── gallery.js          → logique de la galerie
└── README.md
```

Aucune installation ni build nécessaire : ce sont des fichiers statiques.
Tu peux les ouvrir directement dans un navigateur, ou servir le dossier
localement le temps des tests :

```bash
npx serve .
# ou
python3 -m http.server
```

---

## 1. Créer le projet Appwrite

1. Va sur [cloud.appwrite.io](https://cloud.appwrite.io), connecte-toi, puis
   **Create project**. Choisis la région **Frankfurt** (c'est celle que ce
   projet utilise).
2. Dans **Settings → General**, note les deux valeurs affichées en haut :
   - **Endpoint API** → doit être `https://fra.cloud.appwrite.io/v1`
     (le préfixe `fra` correspond à Frankfurt — si tu vois autre chose comme
     `nyc` ou `syd`, c'est que le projet n'est pas dans la bonne région)
   - **Project ID**
3. Dans **Settings → Platforms**, clique **Add platform → Web app**, et mets
   comme hostname `localhost` si tu testes en local, ou ton nom de domaine si
   le site est déjà en ligne. **Cette étape est obligatoire** : sans elle,
   Appwrite bloque toutes les requêtes venant du navigateur (erreur CORS).

## 2. Créer la base de données et la collection

1. **Databases → Create database** → note le **Database ID**.
2. Dans cette base, **Create collection**. Tu peux soit laisser Appwrite
   générer un ID automatiquement, soit lui donner un ID personnalisé (ex :
   `videos`) — dans les deux cas, note précisément l'**ID affiché en haut de
   la page de la collection** (pas juste son nom d'affichage, qui peut être
   différent de son ID).
3. Onglet **Attributes** de la collection → ajoute exactement ces 5
   attributs, avec la casse respectée :

| Attribut          | Type    | Taille   | Requis |
|--------------------|---------|----------|--------|
| `nom`               | String  | 128       | oui    |
| `sujet`             | String  | 200       | oui    |
| `description`       | String  | 2000      | oui    |
| `videoFileId`        | String  | 64        | oui    |
| `videoFileName`       | String  | 256       | non    |

   Attends que chaque attribut passe au statut **Available** (vert) avant de
   tester le formulaire — sinon tu obtiendras une erreur `Unknown attribute`.

4. Onglet **Settings** de la collection → **Permissions** → **Add role** :
   - rôle **Any**, droits **Create** et **Read**.
   Cela permet à n'importe quel visiteur de soumettre une vidéo et de
   consulter la galerie, sans compte utilisateur.

## 3. Créer le bucket de stockage vidéo

1. **Storage → Create bucket** → note le **Bucket ID**.
2. Dans ses réglages :
   - **Maximum file size** : au moins 200 Mo (à garder cohérent avec
     `MAX_SIZE_MB` dans `js/upload.js`).
   - **Allowed file extensions** : `mp4, mov, webm, avi` (ou laisse vide pour
     tout autoriser).
   - **Permissions** : ajoute aussi le rôle **Any** avec **Create** et
     **Read**.

## 4. Configurer l'application

Ouvre `js/config.js` et remplis les 5 valeurs avec celles notées plus haut :

```js
window.APPWRITE_CONFIG = {
  endpoint:     "https://fra.cloud.appwrite.io/v1",
  projectId:    "…",
  databaseId:   "…",
  collectionId: "…",
  bucketId:     "…",
};
```

## 5. Tester

Ouvre `index.html`, remplis le formulaire, envoie une vidéo, puis va sur
`gallery.html` : elle doit apparaître dans la grille.

---

## Dépannage — erreurs déjà rencontrées

| Message d'erreur | Cause | Solution |
|---|---|---|
| `Missing required parameter: "fileId"` | Le SDK Appwrite chargé via le CDN était trop ancien pour la syntaxe utilisée. | Déjà corrigé dans ce projet : `upload.js`/`gallery.js` utilisent la syntaxe positionnelle, compatible avec toutes les versions. Si l'erreur revient, vide le cache du navigateur (Ctrl+Maj+R). |
| `Project with the requested ID could not be found` | L'`endpoint` et le `projectId` dans `config.js` ne correspondent pas au même projet/région. | Recopie les deux valeurs **en même temps**, depuis Settings → General de ton projet. |
| `Unknown attribute: "videoFileName"` | Un attribut de la collection manque ou est mal orthographié. | Vérifie l'onglet Attributes de ta collection contre le tableau ci-dessus (casse exacte). |
| `Cannot set properties of null (setting 'textContent')` | Le code JS cible un `id` HTML qui n'existe pas (ou plus) dans la page. | `upload.js`/`gallery.js` de ce projet sont "null-safe" (clauses de garde) : ce genre d'erreur ne devrait plus jamais faire planter la page, juste ignorer silencieusement l'élément manquant. |
| Page blanche / sans style | `<link rel="stylesheet">` pointe vers un fichier CSS qui n'existe pas à ce chemin. | Vérifie que `index.html` et `gallery.html` pointent bien vers `css/style.css` (chemin actuel de ce projet). |
| Erreur de permissions (`401` / `403`) | Le rôle **Any** n'a pas les droits Create/Read sur la collection ou le bucket. | Revois l'étape 2.4 et l'étape 3.2 ci-dessus. |

---

## Personnalisation

- **Logo** : remplace `assets/images/logo.png` par ta propre image (même nom
  de fichier, ou change le chemin dans `index.html`/`gallery.html`).

- **Fond du panneau de gauche** : la photo `assets/images/background.avif`
  est déjà en place. Pour la changer, remplace ce fichier (même nom), ou
  modifie la référence dans `css/style.css` :
  ```css
  .brand {
    background-image:
      linear-gradient(165deg, rgba(11,23,18,0.93) 0%, rgba(16,36,31,0.80) 48%, rgba(13,31,26,0.95) 100%),
      url('../assets/images/background.avif');
    background-size: cover;
    background-position: center;
  }
  ```
  Le dégradé sombre devant la photo est important : sans lui, le texte du
  panneau de gauche devient illisible selon la luminosité de l'image.

- **Couleurs** : toutes les couleurs sont centralisées dans les variables CSS
  en haut de `css/style.css` (`:root { --teal: …; --leaf: …; }`).

- **Taille max de fichier côté formulaire** : variable `MAX_SIZE_MB` en haut
  de `js/upload.js` — garde-la cohérente avec la limite définie sur le bucket
  Appwrite (étape 3 ci-dessus).

## Limites de cette v1

- Pas d'authentification utilisateur : tout le monde peut soumettre et voir les vidéos.
- Pas de modération : les vidéos sont visibles immédiatement après envoi.
- Pas de pagination sur la galerie (limitée à 100 vidéos les plus récentes).

Ce sont des choix volontaires pour garder la v1 simple — dis-moi si tu veux qu'on
ajoute l'un de ces points.