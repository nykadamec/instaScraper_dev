## Project - instaScraper

### Project Description 

TODO: Implement scraped instagram post -> saved in database -> exposed via REST API -> rendered in frontend as User Scraped History (premium function - basic user can only scrape 10 instagram post per day )

instaScraper is a **no-code SaaS platform** (with a developer-friendly API under the hood) that allows users to submit a public Instagram post URL and get back all image assets associated with that post.  

The app is designed as a simple “URL → images” pipeline that:
- Validates and normalizes an Instagram post URL.
- Triggers an Apify Actor run (**`apify/instagram-scraper`**) to scrape metadata and image URLs.
- Processes the result via a **Proxy Stream** pipeline (Download -> Upload to R2).
- Processes and stores the result in a database.
- Exposes the images back to the user via a clean React Dashboard and a typed REST API.

The product is intended as a foundation for additional features such as:
- Downloading all images from a post as a ZIP.
- Keeping a history of user scrapes.
- Enforcing subscriptions / credits per user.
- Building higher-level tools on top of scraped images (e.g. basic analytics, transformations, or automation flows).

The focus of the project is:
- **User-friendly Dashboard** – Simple interface for non-technical users.
- **Developer-friendly API** – clear, typed endpoints for automation.
- **Simple but scalable architecture** – modern stack, easy to host on Cloudflare.
- **Decoupled scraping layer** – scraping logic is handled by Apify Actors, the backend only orchestrates jobs.

### Image Processing Pipeline (Proxy Stream)

To ensure link permanence and avoid hotlinking Instagram's CDN (which expires):
1. **Trigger:** Backend starts Apify job (`apify/instagram-scraper`).
2. **Fetch:** Backend receives image URLs from Apify.
3. **Stream:** Backend downloads the image stream from Instagram and simultaneously uploads it to **Cloudflare R2**.
4. **Store:** The public R2 URL is saved to the D1 Database.

### Project Tech Stack

   - **Shared Validation – Zod**
  - Used for runtime request validation and generating static TypeScript types.
  - Ensures type safety across the full stack (Frontend ↔ Backend).

- **Tooling – Prettier & ESLint**
  - Unified configuration for the entire monorepo.
  - Includes Tailwind CSS v4 class sorting and strict linting rules.

- **TypeScript** (target **ESNext**)  
  Strong typing across frontend and backend.

- **Frontend – ReactJS (Vite 7)**
  - Modern React SPA powered by Vite 7 for fast dev server and optimized builds.
  - Handles authentication, submitting Instagram URLs, displaying job status, and rendering scraped images.
  - **State Management:** TanStack Query (React Query) for efficient async data fetching and caching.
  - UI Library: Tailwind CSS v4 (Oxide engine) + Radix UI (or similar headless components).

- **Backend – Cloudflare Workers (Hono)**
  - **Hono** framework (standard for Edge). Lightweight, ultrafast, and strictly typed.
  - Implements REST API, Auth, Apify integration, and business logic.
  - **Rate Limiting:** Implemented via Hono middleware + Redis (Upstash) or Cloudflare KV.

- **Database – Prisma + Cloudflare D1**
  - Prisma as ORM (using **Prisma Adapter for D1**).
  - **Cloudflare D1** (SQLite at Edge) as the relational database.
  - Stores: Users, Scrape Jobs, Billing Metadata.

- **Storage - Cloudflare R2**
  - Object storage for scraped images.

- **Testing**
  - **Vitest:** For Unit and Integration testing of backend logic/utils.
  - **Playwright:** For End-to-End (E2E) testing of critical user flows.

### Rate Limiting

The API implements tiered rate limiting based on user subscription level (identified by IP for anon, User ID for auth):

| Tier | Scrapes/Day | Requests/Minute | Concurrent Jobs |
|------|-------------|-----------------|-----------------|
| **Free (registered)** | 10 | 30 | 2 |
| **Pro** | 100 | 100 | 5 |
| 

**Implementation:**
- Handled via `hono-rate-limiter` (backed by Redis/KV).

---

### Error Response Schema

All API errors follow a unified JSON format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SCRAPE_FAILED` | 500 | Apify scrape job failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

### Project API

All API routes are prefixed with `/api/is`.

#### Health Check

- `GET /api/is/health`
  Returns the health status (Database, Redis, Apify connection).

#### Auth

- `POST /api/is/auth/register`
- `POST /api/is/auth/login`
- `POST /api/is/auth/refresh`
- `POST /api/is/auth/logout`
- `POST /api/is/auth/verify-email`
- `POST /api/is/auth/resend-verification`
- `POST /api/is/auth/forgot-password`
- `POST /api/is/auth/reset-password`
- `POST /api/is/auth/subscription`


#### User

All `/me` endpoints require authentication.

- `GET /api/is/me`
- `GET /api/is/me/scrapes` (Paginated history)
- `DELETE /api/is/me/scrapes/:jobId`
- `DELETE /api/is/me/scrapes` (Bulk delete)
- `GET /api/is/me/scrapes/export` (JSON/CSV export)
- `PUT /api/is/me/apify-key`
- `GET /api/is/me/subscription`
- `GET /api/is/me/credits`

#### Scrape

- `POST /api/is/scrapes`  
   Creates a new scrape job.  
   **Body:** `{ "postUrl": "https://www.instagram.com/p/..." }`

- `GET /api/is/scrapes/:jobId`  
   Returns status and result.

- `POST /api/is/scrapes/:jobId/retry`  
   Retries a failed scrape job (if within limits).

- `GET /api/is/scrapes/:jobId/download`  
   Stream a ZIP file containing all images from the post.

#### Apify Webhooks

- `POST /api/is/webhooks/apify`
  Receives updates from Apify Actors. Secured by signature.

#### Functions/Features

1. **Instant Extraction** - Paste URL, get images. No login for basic use.
2. **History System** - Auto-save scraped posts to library. [Supporter]
3. **Custom Apify API Key** - Bring your own key for higher limits. [Supporter]
4. **Coming soon** - Bulk scraping, Analytics, Public Share Links.

#### My Ideas / Implementation Drafts
Example of Apify client usage: 
```typescript
// Scrape any Instagram Post (Image, Sidecar)
const post = await client.scrapePost({
  url: 'https://instagr.am/p/DLNsnp...'
});

// Handle Sidecar (Carousel) or Single Image
const images = post.type === 'Sidecar'
  ? post.childPosts.map(p => p.displayUrl)
  : [post.displayUrl];
```


#### Database Schema

```prisma
// Enums pro stavy a role
enum JobStatus {
  PENDING
  RUNNING
  SUCCESS
  ERROR
}

enum Role {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // Hashed
  name          String?
  role          Role      @default(USER)

  // Apify Integration
  apifyKey      String?   // Custom key (encrypted ideally)

  // Billing & Credits
  credits       Int       @default(10) // Current balance

  // Subscription Info
  planId        String    @default("FREE") // Refers to hardcoded PLANS constant (FREE, SUPPORTER)
  subStartDate  DateTime?
  subEndDate    DateTime?

  // Relations
  jobs          ScrapeJob[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// Hlavní model pro Scraping - slouží i jako Historie
model ScrapeJob {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  postUrl     String
  status      JobStatus @default(PENDING)
  errorMessage String?

  // Scraped Data
  metadata    String?   // JSON string with caption, likes, author etc.

  // Relations
  images      Image[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
}

// Samostatná tabulka pro obrázky (kvůli SQLite limitaci String[])
model Image {
  id          String    @id @default(cuid())
  jobId       String
  job         ScrapeJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  url         String    // Original Instagram URL
  storageUrl  String?   // Your Cloud Storage URL (pro Cloud Gallery)
  width       Int?
  height      Int?

  createdAt   DateTime  @default(now())
}
```

#### .env.example

```env
// BASE
DATABASE_URL="postgresql://user:password@localhost:5432/instascraper"
APIFY_API_KEY=your_apify_api_key
APIFY_ACTOR_ID=your_apify_actor_id
APIFY_TOKEN=your_apify_token
JWT_SECRET=your_jwt_secret

//CLOUDFLARE
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_R2_ACCESS_KEY=your_cloudflare_r2_access_key
CLOUDFLARE_R2_SECRET_KEY=your_cloudflare_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_cloudflare_r2_bucket_name
CLOUDFLARE_R2_PUBLIC_ENDPOINT=your_cloudflare_r2_public_endpoint
CLOUDFLARE_D1_DATABASE_ID=your_cloudflare_d1_database_id

// APP
MAINTENANCE_MODE=false
DEBUG=true

// REDIS (Upstash/Cloudflare)
REDIS_URL=redis://...
```