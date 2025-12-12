# Plán implementace Apify API s využitím lokálního balíčku

Tento plán zavádí systém pro správu scrapování s využitím balíčku `apify-client-ts`.

## 1. Úprava Databáze (Prisma Schema)
- **Úprava souboru:** `packages/database/prisma/schema.prisma`
- **Nový Model `ScrapeJob`**:
    ```prisma
    model ScrapeJob {
      id          String   @id @default(uuid())
      userId      String
      user        User     @relation(fields: [userId], references: [id])
      apifyRunId  String?  // ID běhu z Apify (vráceno po startu)
      actorId     String   // Konkrétní ID Actora (např. "shu8hvrXbJbY3Eb9W")
      status      String   // PENDING, RUNNING, SUCCEEDED, FAILED
      input       String   // JSON string s parametry
      createdAt   DateTime @default(now())
      updatedAt   DateTime @updatedAt
    }
    ```

## 2. Vytvoření API Routes (`apps/backend/src/routes/apify.ts`)

Vytvoříme router využívající `import { ApifyClient } from 'apify-client-ts'`.

### Endpointy:

1.  **`POST /api/is/apify/run`**
    - **Vstup:** `{ actorId: "shu8hvrXbJbY3Eb9W", input: { ... } }`
    - **Logika:**
        - Inicializace `new ApifyClient({ token: c.env.APIFY_TOKEN })`.
        - Zavolání `client.actor(actorId).call(input)`.
        - Uložení do DB: `status: RUNNING`, `apifyRunId: run.id`.
        - Návrat ID jobu.

2.  **`GET /api/is/apify/job/:id`**
    - **Logika:** Získá status. Pokud je běžící, ověří ho přes `client.run(runId).get()`.

3.  **`GET /api/is/apify/job/:id/dataset`**
    - **Logika:**
        - Přes `client.dataset(defaultDatasetId).listItems()` stáhne výsledky.

4.  **`POST /api/is/apify/webhook`**
    - **Logika:** Endpoint pro callback z Apify (aktualizace stavu na SUCCEEDED).

## 3. Integrace
1.  Přidání do `index.ts`.
2.  Migrace DB (`wrangler d1 execute` local i remote).
3.  Aktualizace `Debug.tsx` (nová sekce "Apify Scraper Test").
