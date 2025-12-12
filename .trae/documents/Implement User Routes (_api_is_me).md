# Implement User Routes (`/api/is/me`) with Auth Check

I will implement the requested endpoints for logged-in users, enforcing authentication for **all** routes in this group.

## 1. Authentication Middleware (The "Logged In" Check)
**File:** `apps/backend/src/middleware/auth.ts`
- I will create a robust `authMiddleware` that serves as the security gate.
- **Logic:**
  1.  **Token Check:** It will look for `Authorization: Bearer <token>`. If missing -> **401 Unauthorized**.
  2.  **Verification:** It will verify the JWT signature. If invalid/expired -> **401 Unauthorized**.
  3.  **User Check:** It will query the database to ensure the user actually exists. If deleted -> **401 Unauthorized**.
  4.  **Context:** If valid, it attaches the `user` object to the request context so subsequent routes can access `c.var.user`.

## 2. User Routes Implementation
**File:** `apps/backend/src/routes/me.ts`
- **Apply Middleware:** `app.use('/*', authMiddleware)` ensures **every** endpoint below requires a logged-in user.

### Endpoints:
- **`GET /`**: Return user profile (id, email, username, role).
- **`GET /scrapes`**:
  - **Requirement:** User must have `planId === 'SUPPORTER'`.
  - **Logic:** Return paginated list of user's scrape jobs.
- **`DELETE /scrapes/:jobId`**:
  - **Logic:** Delete job only if `userId` matches logged-in user.
- **`DELETE /scrapes`** (Bulk):
  - **Logic:** Delete multiple jobs (ids provided in body) belonging to the logged-in user.
- **`GET /scrapes/export`**:
  - **Requirement:** User must have `planId === 'SUPPORTER'`.
  - **Logic:** Export history to JSON or CSV.
- **`PUT /apify-key`**:
  - **Requirement:** User must have `planId === 'SUPPORTER'`.
  - **Logic:** Update custom Apify key.
- **`GET /subscription`**:
  - **Logic:** Return subscription details (plan, dates).
- **`GET /credits`**:
  - **Logic:** Return current credit balance.

## 3. Register Routes
**File:** `apps/backend/src/index.ts`
- Mount the new router: `app.route('/api/is/me', me)`.

## 4. Update Debug Dashboard
**File:** `apps/frontend/src/Debug.tsx`
- Add these new endpoints to the UI for immediate testing.
