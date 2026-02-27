# EcoFute App

Application de gestion interne (CRM) pour PME — gestion clients, documents, ventes, planning et équipe.

---

## 🏗️ Architecture

```
EcoFuteApp/
├── backend/      → API REST Express.js (Node.js)
└── frontend/     → Interface Vue 3 + Vite + TypeScript
```

Le projet est un **monorepo** avec deux applications indépendantes :
- Le **frontend** communique avec le **backend** via des appels HTTP `/api/...`
- En développement, Vite proxifie automatiquement `/api/*` vers `localhost:3000`
- En production, Vercel redirige `/api/*` vers le backend déployé (via `frontend/vercel.json`)

---

## 🛠️ Stack Technique

### Frontend (`/frontend`)
| Technologie | Rôle |
|---|---|
| Vue 3 + TypeScript | Framework UI |
| Vite | Bundler / Dev server |
| TailwindCSS | Styles |
| Clerk (`@clerk/vue`) | Authentification |
| Axios | Appels API |
| Vue Router | Navigation |
| Chart.js | Graphiques dashboard |
| jsPDF + html2canvas | Génération de PDF |
| xlsx | Export Excel |

### Backend (`/backend`)
| Technologie | Rôle |
|---|---|
| Express.js | Serveur HTTP / API REST |
| Prisma | ORM base de données |
| MySQL (PlanetScale) | Base de données |
| Clerk SDK | Vérification des tokens auth |
| Cloudinary | Upload et stockage d'images/fichiers |
| Nodemailer | Envoi d'emails |
| Multer + Streamifier | Gestion des uploads |

---

## 🚀 Développement Local

### Prérequis
- Node.js v18+
- Accès à une base MySQL (PlanetScale ou locale)
- Comptes : Clerk, Cloudinary

### 1. Lancer le Backend

```bash
cd backend
cp .env.example .env   # Remplir les variables
npm install
npm run dev            # Démarre sur http://localhost:3000
```

### 2. Lancer le Frontend

```bash
cd frontend
cp .env.example .env   # Remplir les variables
npm install
npm run dev            # Démarre sur http://localhost:5173
```

> Le proxy Vite redirige automatiquement `/api/*` → `http://localhost:3000`. Pas besoin de configurer l'URL API manuellement en dev.

### Vérifier que tout fonctionne

```
http://localhost:3000/api/ping   → {"status":"ok","message":"EcoFute Backend is running"}
http://localhost:5173            → Interface Vue 3
```

---

## 🔐 Variables d'Environnement

### Backend (`backend/.env`)

```env
# Base de données MySQL (PlanetScale)
DATABASE_URL="mysql://USER:PASSWORD@aws.connect.psdb.cloud/DATABASE?sslaccept=strict"

# Clerk Auth (backend)
CLERK_SECRET_KEY="sk_live_..."
CLERK_PUBLISHABLE_KEY="pk_live_..."

# Cloudinary (upload fichiers)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password-gmail
SMTP_FROM=email@gmail.com

# CORS — URL du frontend en production
FRONTEND_URL="https://ecofute-frontend.vercel.app"
```

### Frontend (`frontend/.env`)

```env
# Clerk Auth (frontend)
VITE_CLERK_PUBLISHABLE_KEY="pk_live_..."
```

---

## ☁️ Déploiement sur Vercel

Le projet utilise **2 projets Vercel distincts** issus du même repo GitHub (monorepo).

### Structure des fichiers de déploiement

```
backend/vercel.json   → Configure Express comme serverless function Vercel
frontend/vercel.json  → Redirige /api/* vers le backend + routing SPA Vue
```

### ÉTAPE 1 — Déployer le Backend

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Importer le repo GitHub `ECOFUTE`
3. **Root Directory** → sélectionner `backend`
4. **Framework** → `Other`
5. **Build Command** → laisser vide
6. **Install Command** → `npm install`
7. Ajouter les variables d'environnement (voir section ci-dessus)
8. Déployer → noter l'URL obtenue (ex: `ecofute-backend.vercel.app`)

### ÉTAPE 2 — Mettre à jour le frontend/vercel.json

Ouvrir `frontend/vercel.json` et remplacer l'URL par la vraie URL backend :

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://VOTRE-BACKEND.vercel.app/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Puis pousser sur GitHub :
```bash
git add frontend/vercel.json
git commit -m "fix: update backend URL in frontend vercel.json"
git push origin main
```

### ÉTAPE 3 — Déployer le Frontend

1. Retourner sur [vercel.com/new](https://vercel.com/new)
2. Importer le **même repo** `ECOFUTE`
3. **Root Directory** → sélectionner `frontend`
4. **Framework** → `Vite` (auto-détecté)
5. **Build Command** → `npm run build`
6. **Output Directory** → `dist`
7. Ajouter la variable : `VITE_CLERK_PUBLISHABLE_KEY`
8. Déployer → noter l'URL frontend (ex: `ecofute-frontend.vercel.app`)

### ÉTAPE 4 — Mettre à jour le CORS du backend

Dans le dashboard Vercel du projet **backend** :
- Settings → Environment Variables
- Ajouter/modifier : `FRONTEND_URL` = `https://ecofute-frontend.vercel.app`
- Redéployer le backend

### ✅ Vérification finale

```
https://BACKEND.vercel.app/api/ping     → {"status":"ok",...}
https://FRONTEND.vercel.app             → Interface Vue avec auth Clerk
https://FRONTEND.vercel.app/api/clients → Proxifié vers le backend ✅
```

---

## 📁 Structure du Code

### Backend (`/backend/src`)
```
src/
├── index.js          → Point d'entrée Express (CORS, routes, middleware)
├── db.js             → Instance Prisma Client
├── config/
│   └── cloudinary.js → Config Cloudinary
└── routes/
    ├── clients.js    → CRUD clients + dossiers
    ├── documents.js  → Upload/gestion documents
    ├── events.js     → Planning / calendrier
    ├── sales.js      → Suivi des ventes
    └── users.js      → Gestion équipe (via Clerk)
```

### Frontend (`/frontend/src`)
```
src/
├── main.ts               → Bootstrap Vue + Clerk + Router
├── App.vue               → Composant racine
├── router/index.ts       → Routes (Login, AdminDashboard)
├── pages/
│   ├── Login.vue         → Page de connexion Clerk
│   └── admin/
│       └── AdminDashboard.vue → Dashboard principal (onglets)
└── components/
    ├── Calendar.vue      → Calendrier événements
    └── admin/
        ├── DashboardStats.vue    → Statistiques & graphiques
        ├── DocumentManager.vue   → Gestion documents clients
        ├── InternalDrive.vue     → Drive interne
        ├── InvoiceCreator.vue    → Création de factures PDF
        ├── Planning.vue          → Planning équipe
        ├── SalesTracking.vue     → Suivi des ventes
        └── TeamManager.vue       → Gestion de l'équipe
```

---

## ⚠️ Points importants

- **Vercel = Serverless** : Pas de WebSockets, pas de fichiers locaux persistants. Les uploads passent par Cloudinary ✅
- **PlanetScale** : La DB MySQL est externe. Pas de `prisma migrate` en prod (relationMode = "prisma")
- **Clerk** : L'auth est gérée côté frontend ET vérifiée côté backend. Les deux clés (publishable + secret) sont nécessaires
- **CORS** : Le backend accepte localhost:5173 (dev) + l'URL frontend Vercel (prod) via `FRONTEND_URL`

---

*Développé par MW Creative — [microdidact.com](https://microdidact.com)*
