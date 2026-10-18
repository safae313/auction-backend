# Moteur — frontend

Interface React + Vite en JavaScript pour l’API d’enchères automobiles du dossier `backend/`.

## Prérequis

- Node.js 22 (Vite 8 nécessite Node.js 20.19+ ou 22.12+).
- Le backend Node.js démarré, avec MySQL et Redis configurés selon `backend/.env.example`.

## Lancer en local

Depuis le dossier `frontend/` :

```bash
npm ci
```

Copiez `.env.example` vers `.env` (ou `.env.local`) :

```dotenv
VITE_API_URL=http://localhost:4400
```

Configurez aussi l’origine du frontend dans `backend/.env` pour que l’API autorise les appels du navigateur :

```dotenv
CORS_ORIGINS=http://localhost:5173
```

Démarrez le backend dans un terminal :

```bash
cd ../backend
npm start
```

Puis le frontend dans un autre terminal :

```bash
cd frontend
npm run dev
```

Ouvrez l’URL affichée par Vite, normalement <http://localhost:5173>.

## API utilisée

`VITE_API_URL` est l’origine du backend (sans suffixe `/api`). Le frontend utilise uniquement les routes implémentées :

| Méthode | Route | Utilisation |
| --- | --- | --- |
| `GET` | `/api/auctions` | Liste des enchères |
| `GET` | `/api/auctions/:id` | Détails d’une enchère |
| `GET` | `/api/auctions/:id/bids` | Historique des offres |
| `POST` | `/api/auctions/:id/bid` | Placer une offre |

Le corps JSON de l’offre est `{ "userId": 12, "amount": 15000 }`. L’API actuelle ne fournit pas d’authentification : l’identifiant est demandé dans le formulaire, mais ne prouve pas l’identité de l’utilisateur. Ajoutez une vraie authentification et une autorisation côté backend avant tout usage en production.

Les cartes lisent les champs réels retournés par l’API. Les noms de véhicules, prix, photos et caractéristiques ne sont pas remplacés par des données de démonstration. Si une photo ou une caractéristique manque dans la réponse, l’interface l’indique.

## Vérifier et compiler

```bash
npm run lint
npm run build
npm run preview
```

La compilation de production est créée dans `dist/`.

## Azure Static Web Apps

Le dépôt contient `public/staticwebapp.config.json` pour que les liens directs comme `/vehicles/123` soient réécrits vers l’application React. Le workflow `.github/workflows/azure-static-web-apps.yml` compile le frontend avec Node 22 puis publie `frontend/dist`.

Dans GitHub, configurez :

1. Le secret de dépôt `AZURE_STATIC_WEB_APPS_API_TOKEN` avec le jeton de déploiement de la Static Web App.
2. La variable de dépôt `VITE_API_URL` avec l’URL HTTPS publique de votre API (par exemple `https://api.votre-domaine.example`).
3. Côté backend, `CORS_ORIGINS` avec l’origine exacte de l’application Static Web Apps, puis redéployez/redémarrez l’API.

`VITE_API_URL` est intégré au bundle au moment du build ; toute modification de cette variable nécessite un nouveau déploiement. L’API Node.js/MySQL/Redis doit être hébergée séparément : Azure Static Web Apps ne l’héberge pas automatiquement.
