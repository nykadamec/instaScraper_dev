# InstaScraper Cloud ☁️

> **A cutting-edge, scalable serverless platform for Instagram data extraction and management.**
> Built to leverage the power of Cloudflare's Edge network, distributed databases, and the Apify ecosystem for maximum performance and minimal latency.

![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)
![Status](https://img.shields.io/badge/status-active_development-orange.svg?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Cloudflare_Workers_|_Hono_|_React_|_Apify-blueviolet.svg?style=flat-square)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6.svg?style=flat-square)

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Architecture & Design](#-architecture--design)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Development Tools](#-development-tools)

---

## 🌟 Overview

**InstaScraper Cloud** is a robust monorepo solution designed to handle complex scraping workflows asynchronously. Unlike traditional scraping backends that require heavy, always-on servers, this project utilizes **Cloudflare Workers** to run business logic on the Edge, scaling automatically to zero when not in use.

It seamlessly integrates with **Apify** to offload the heavy lifting of browser automation, while maintaining a unified database of jobs, users, and results within your own infrastructure.

---

## 🏗 Architecture & Design

The system is built on a **Serverless First** philosophy.

1.  **Edge Compute:** The backend runs on Cloudflare Workers using the Hono framework. This ensures extremely low latency (<50ms) for API requests worldwide.
2.  **Distributed Data:**
    *   **D1 (SQLite):** Relational data (Users, Jobs, Metadata) is stored in Cloudflare D1, a distributed SQLite database replicated across the globe.
    *   **R2 (Object Storage):** Heavy media files (Images, Videos) are stored in Cloudflare R2 (S3-compatible), avoiding expensive database bloat.
3.  **Asynchronous Processing:**
    *   Scraping jobs are initiated via API.
    *   Execution is delegated to Apify Actors.
    *   Status updates are handled via Webhooks or Polling, ensuring the Edge worker doesn't time out waiting for long-running processes.

---

## 🚀 Key Features

### 🔐 Advanced Authentication
- **Secure JWT Implementation:** Stateless authentication tailored for serverless environments.
- **Password Hashing:** Industry-standard `bcrypt` hashing for user security.
- **Middleware Protection:** Granular route protection using custom Hono middleware.

### 🕷️ Hybrid Scraping Engine
- **Universal Job System:** A unified `ScrapeJob` model capable of tracking various scraping types (Simple URL, Apify Actors, etc.).
- **Apify Integration:**
    - Native support for starting Actors (e.g., Instagram Scraper).
    - Automatic input JSON generation.
    - Result retrieval and dataset parsing.
- **Custom TypeScript Client:** Includes a dedicated `apify-client-ts` package optimized for non-Node.js environments (Edge Runtime).

### 🛠 Developer Experience
- **Monorepo Architecture:** Managed via `pnpm workspaces` for shared types and utilities.
- **Type Safety:** End-to-end TypeScript coverage from Database (Prisma) to Backend to Frontend.
- **Debug Dashboard:** A built-in GUI for testing API endpoints, database queries, and scraping jobs without external tools like Postman.

---

## 🛠 Tech Stack

### Backend & Infrastructure
*   **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/)
*   **Framework:** [Hono](https://hono.dev/) (Ultrafast web framework for the Edges)
*   **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQLite)
*   **ORM:** [Prisma](https://www.prisma.io/) (with D1 Adapter)
*   **Storage:** [Cloudflare R2](https://developers.cloudflare.com/r2/)

### Frontend
*   **Framework:** [React](https://react.dev/) (v18)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Styling:** [TailwindCSS](https://tailwindcss.com/) (v4)
*   **Routing:** [React Router](https://reactrouter.com/)

### Tooling
*   **Package Manager:** [pnpm](https://pnpm.io/)
*   **External API:** [Apify Client](https://apify.com/)

---

## 📂 Project Structure

```bash
.
├── apps/
│   ├── backend/          # Cloudflare Worker API
│   │   ├── src/routes/   # API Endpoints (Auth, Apify, Me)
│   │   └── wrangler.json # Cloudflare Configuration
│   │
│   └── frontend/         # React Dashboard
│       ├── src/Debug.tsx # Developer Dashboard
│       └── vite.config.ts
│
└── packages/
    ├── database/         # Shared Prisma Schema & Migrations
    ├── apify_ts/         # Custom Apify Client for Edge
    └── shared/           # Shared Types & Utils
```

---

## ⚡ Getting Started

### Prerequisites
*   Node.js (v18 or later)
*   pnpm (`npm i -g pnpm`)
*   Wrangler CLI (`npm i -g wrangler`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/instaScraper-cloud.git
    cd instaScraper-cloud
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Environment Setup:**
    Create a `.dev.vars` file in `apps/backend/`:
    ```env
    JWT_SECRET="your-super-secret-key-min-32-chars"
    APIFY_TOKEN="your_apify_api_token"
    ```

4.  **Database Setup (Local):**
    Apply migrations to your local D1 instance:
    ```bash
    cd apps/backend
    wrangler d1 execute DB --local --file=../../packages/database/migrations/migration_v4.sql
    ```

### Running the Project

You can run the entire stack or individual parts.

**Start Backend (Port 8787):**
```bash
cd apps/backend
pnpm dev
```

**Start Frontend (Port 5173):**
```bash
cd apps/frontend
pnpm dev
```

---

## 📡 API Documentation

### Apify Routes (`/api/is/apify`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/run` | Starts a new Apify Actor run. Requires `actorId` and `input`. |
| `GET` | `/job/:id` | Checks the status of a job. Syncs with Apify if running. |
| `GET` | `/job/:id/dataset` | Retrieves the results (items) of a completed job. |
| `POST` | `/webhook` | Callback endpoint for Apify to notify completion. |

### Auth Routes (`/api/is/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Creates a new user account. |
| `POST` | `/login` | Authenticates user and returns JWT. |
| `GET` | `/verify` | Verifies the validity of a token. |

---

## 🧪 Development Tools

### The Debug Dashboard
Located at `/debug` (in the frontend app), this tool allows you to:
1.  **Inspect Database:** View raw tables from your local D1 database.
2.  **Test Auth:** Generate tokens and test protected routes.
3.  **Run Scrapers:** Manually trigger Apify actors with custom JSON inputs and view real-time responses.

---

## 📄 License

This project is licensed under the **MIT License**.

---
*Built with ❤️ by the InstaScraper Dev Team.*
