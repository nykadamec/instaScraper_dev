# System Config & Bulk Actions Implementation

## 1. Database Schema Update
- Add `SystemConfig` model to `packages/database/prisma/schema.prisma` to store global settings.
- Create a migration to apply changes.

## 2. Backend Implementation (`apps/backend/src/routes/admin.ts`)
- **Config Endpoints**:
    - `GET /config`: Fetch settings.
    - `PUT /config`: Upsert settings (Key-Value).
- **Bulk Credits Endpoint**:
    - `POST /credits/bulk`: Add credits to users (Target: ALL / FREE).

## 3. Frontend Implementation (`apps/frontend/src/Debug.tsx`)
- Add **"System Config"** section.
- **Configuration Fields**:
    - **Maintenance Mode**: Toggle switch.
    - **Language**: Dropdown (en/cz).
    - **APIFY_TOKEN**: Input field for the global Apify API Key (stored as `APIFY_TOKEN` or `global_apify_key`).
- **Bulk Actions**:
    - **Add Credits**: Input for amount + Buttons to apply to "All Users" or "Free Plan Users".

## 4. Verification
- Verify settings persistence (reload page).
- Verify bulk credit addition via User Editor list.