# Les Merveilles de la Science — Portail vidéo

Application statique (HTML/CSS/JS) branchée sur **Appwrite** :
- `index.html` — formulaire de soumission (nom, sujet, description, vidéo)
- `gallery.html` — galerie publique des vidéos envoyées
- `js/config.js` — **le seul fichier à modifier** pour connecter ton projet Appwrite

Aucune installation nécessaire : ce sont des fichiers statiques. Tu peux les ouvrir
directement dans un navigateur, ou les héberger n'importe où (Netlify, Vercel, Appwrite
Sites, un simple `python3 -m http.server`, etc.).

---

## 1. Créer le projet Appwrite

1. Va sur [cloud.appwrite.io](https://cloud.appwrite.io) (ou ton instance auto-hébergée) et crée un projet.
2. Dans **Settings → General**, note :
   - l'**Endpoint API** (ex : `https://fra.cloud.appwrite.io/v1`)
   - le **Project ID**
3. Dans **Settings → Platforms**, ajoute une plateforme **Web** avec le nom d'hôte
   d'où tu vas servir le site (ex : `localhost`, ou ton domaine de prod). Sans ça,
   Appwrite bloque les requêtes pour raison de sécurité (CORS).

## 2. Créer la base de données et la collection

1. **Databases → Create database** → note le **Database ID**.
2. Dans cette base, **Create collection**, nomme-la `videos` → note le **Collection ID**.
3. Ajoute ces attributs dans la collection :

| Attribut        | Type    | Taille / options       | Requis |
|------------------|---------|-------------------------|--------|
| `nom`            | String  | 128                      | oui    |
| `sujet`          | String  | 200                      | oui    |
| `description`    | String  | 2000                     | oui    |
| `videoFileId`    | String  | 64                       | oui    |
| `videoFileName`  | String  | 256                      | non    |

   (`$createdAt`, la date de création, est fournie automatiquement par Appwrite —
   pas besoin de l'ajouter toi-même.)

4. Onglet **Settings** de la collection → **Permissions** :
   - Ajoute une permission **Create** pour le rôle **Any** (pour que n'importe quel
     visiteur puisse soumettre une vidéo sans compte).
   - Ajoute une permission **Read** pour le rôle **Any** (pour que la galerie soit
     visible par tous).
   - Si tu veux exiger un compte utilisateur pour soumettre, remplace **Any** par
     **Users** sur la permission Create — il faudra alors ajouter un système de
     connexion (non inclus dans cette v1).

## 3. Créer le bucket de stockage vidéo

1. **Storage → Create bucket** → note le **Bucket ID**.
2. Dans les paramètres du bucket :
   - **Maximum file size** : augmente-le si besoin (ex : 200 Mo pour matcher le
     formulaire, ou plus).
   - **Allowed file extensions** : `mp4, mov, webm, avi` (ou laisse vide pour tout
     autoriser).
   - **Permissions** : ajoute **Create** pour **Any**, et **Read** pour **Any**
     (mêmes raisons que pour la collection ci-dessus).

## 4. Configurer l'application

Ouvre `js/config.js` et remplace les 5 valeurs par celles notées plus haut :

```js
window.APPWRITE_CONFIG = {
  endpoint:     "https://fra.cloud.appwrite.io/v1",
  projectId:    "68a1234567890abcdef",
  databaseId:   "68a1234567890abcde1",
  collectionId: "68a1234567890abcde2",
  bucketId:     "68a1234567890abcde3",
};
```

## 5. Tester

Ouvre `index.html` dans un navigateur (ou sers le dossier avec un petit serveur local,
ex : `npx serve .` ou `python3 -m http.server`), remplis le formulaire, envoie une
vidéo, puis va sur `gallery.html` : elle doit apparaître.

---

## Personnalisation

- **Logo** : remplace `assets/logo.png` par ta propre image (même nom de fichier).
- **Fond du panneau de gauche** : le motif "double hélice" en fond (`.helix-bg`
  dans `index.html`) est généré en SVG. Pour utiliser une vraie photo à la place,
  ajoute dans `css/style.css` :
  ```css
  .brand { background-image: url('assets/ta-photo.jpg'); background-size: cover; }
  ```
- **Couleurs** : toutes les couleurs sont centralisées dans les variables CSS en
  haut de `css/style.css` (`:root { --teal: ...; --leaf: ...; }`).
- **Taille max de fichier côté formulaire** : variable `MAX_SIZE_MB` en haut de
  `js/upload.js` — garde-la cohérente avec la limite définie sur le bucket Appwrite.

## Limites de cette v1

- Pas d'authentification utilisateur : tout le monde peut soumettre et voir les vidéos.
- Pas de modération : les vidéos sont visibles immédiatement après envoi.
- Pas de pagination sur la galerie (limitée à 100 vidéos les plus récentes).

Ce sont des choix volontaires pour garder la v1 simple — dis-moi si tu veux qu'on
ajoute l'un de ces points.
