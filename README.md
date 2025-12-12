# InstaScraper Cloud ☁️

> **Moderní, škálovatelná platforma pro Instagram scraping, postavená na serverless architektuře.**
> Kombinuje sílu Cloudflare Workers, D1 databáze a Apify pro maximální výkon a minimální náklady.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-development-orange.svg)
![Stack](https://img.shields.io/badge/stack-Cloudflare%20Workers%20%7C%20Hono%20%7C%20React%20%7C%20Apify-blueviolet.svg)

---

## 🏗 Architektura

Projekt je organizován jako **Monorepo** (pomocí `pnpm workspaces`) pro efektivní správu kódu a závislostí.

### 📦 Struktura
- **apps/**
  - `backend` (Cloudflare Workers + Hono) - API Gateway, Auth, Business logika.
  - `frontend` (React + Vite + Tailwind) - Dashboard pro správu a vizualizaci dat.
- **packages/**
  - `database` (Prisma + D1 Adapter) - Sdílené schéma a migrace.
  - `apify_ts` (Custom Library) - Interní TypeScript klient pro komunikaci s Apify API.
  - `shared` - Sdílené typy a utility.

---

## 🚀 Klíčové Funkce

### 🔐 Autentizace & Uživatelé
- **Secure Auth:** JWT based autentizace s `bcrypt` hashováním hesel.
- **User Management:** Registrace, login, profil uživatele (`/me`).

### 🕷️ Scraping Engine (Hybridní)
- **Apify Integration:**
  - Plná integrace s Apify Actors (např. Instagram Scraper).
  - **Asynchronní Joby:** Start -> Polling/Webhook -> Result.
  - **Custom Client:** Vlastní `apify-client-ts` optimalizovaný pro Edge runtime.
- **Unified History:** Všechny joby (Apify i jiné) jsou ukládány do jednotné historie.

### 💾 Data & Storage
- **Cloudflare D1:** Distribuovaná SQL databáze na Edge.
- **Cloudflare R2:** Object storage pro ukládání stažených médií (obrázky, videa).
- **Prisma ORM:** Typově bezpečná práce s daty.

---

## 🛠️ Tech Stack

| Komponenta | Technologie |
|------------|-------------|
| **Backend** | [Cloudflare Workers](https://workers.cloudflare.com/), [Hono](https://hono.dev/) |
| **Frontend** | [React](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/) |
| **Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/), [Prisma](https://www.prisma.io/) |
| **Scraping** | [Apify](https://apify.com/) |
| **Package Mgr** | [pnpm](https://pnpm.io/) |

---

## ⚡️ Rychlý Start

### 1. Prerekvizity
- Node.js (v18+)
- pnpm
- Wrangler CLI (`npm i -g wrangler`)

### 2. Instalace
```bash
# Klonování repozitáře
git clone https://github.com/your-username/instaScraper-cloud.git
cd instaScraper-cloud

# Instalace závislostí
pnpm install
```

### 3. Konfigurace
Vytvořte `.dev.vars` v `apps/backend/` a přidejte potřebné proměnné:
```env
JWT_SECRET="super-secret-key"
APIFY_TOKEN="your_apify_token"
```

### 4. Databáze (Lokální vývoj)
```bash
# Aplikace migrací na lokální D1
cd apps/backend
wrangler d1 execute DB --local --file=../../packages/database/migrations/migration_v4.sql
```

### 5. Spuštění
```bash
# Spuštění celého monorepa (pokud je nastaveno) nebo jednotlivě:

# Backend (http://localhost:8787)
cd apps/backend
pnpm dev

# Frontend (http://localhost:5173)
cd apps/frontend
pnpm dev
```

---

## 🧪 Debug Dashboard
Frontend obsahuje vestavěný **Debug Dashboard** (`/debug`) pro vývojáře:
- **API Tester:** Testování endpointů (Local D1, Remote D1, Apify).
- **Auth Simulator:** Rychlé přihlášení a získání tokenu.
- **Apify Runner:** Ruční spouštění actorů a zobrazení JSON výstupu.

---

## 📝 Licence
MIT © 2024 InstaScraper Dev Team
