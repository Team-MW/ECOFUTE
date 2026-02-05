# EcoFute App

Structure complète Front (Vue 3 + Shadcn) et Back (Express + Prisma) pour le dashboard administrateur.

## Structure

- `frontend/`: Application Vue.js 3 avec Typescript, TailwindCSS et Shadcn-vue.
- `backend/`: API Express.js avec Prisma ORM (MySQL) et Intégration Cloudinary/Clerk.

## Pré-requis

- Node.js
- Base de données MySQL
- Compte Cloudinary (pour les documents)
- Compte Clerk (pour les utilisateurs, optionnel si vous n'utilisez pas la synchro auto)

## Installation

### Backend

1. Aller dans le dossier backend : `cd backend`
2. Installer les dépendances : `npm install`
3. Configurer `.env` (voir `.env.example`)
4. Initialiser la DB : `npx prisma db push`
5. Lancer le serveur : `npm run dev`

### Frontend

1. Aller dans le dossier frontend : `cd frontend`
2. Installer les dépendances : `npm install`
3. Lancer le serveur de dév : `npm run dev`

## Fonctionnalités Admin

- Login par code PIN (Défaut: "00000")
- Gestion des Clients (Liste, Création, Suppression)
- Vue Détaillée Client
- Gestion des Documents (Upload via API, Suppression, Listage par dossiers)
- Statistiques (Graphiques simplifiés)
# ECOFUTE
