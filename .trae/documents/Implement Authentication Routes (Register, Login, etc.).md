I will implement a comprehensive authentication system in the backend with the following endpoints under `/api/is/auth/`:

### **Planned Endpoints**
1.  **`POST /register`**: Creates a new user in the D1 database, hashes the password (using bcryptjs), and returns a JWT token.
2.  **`POST /login`**: Verifies credentials, generates access & refresh tokens.
3.  **`POST /refresh`**: Issues a new access token using a valid refresh token.
4.  **`POST /logout`**: Invalidates the current session (client-side usually, but we can set cookies to expire).
5.  **`POST /verify-email`**: (Stub) Handles email verification token logic.
6.  **`POST /resend-verification`**: (Stub) Triggers sending a verification email.
7.  **`POST /forgot-password`**: (Stub) Initiates password reset flow.
8.  **`POST /reset-password`**: (Stub) Completes password reset with a token.
9.  **`POST /subscription`**: (Stub) Updates or checks user subscription status.

### **Technical Implementation**
*   **File Structure**: Create `apps/backend/src/routes/auth.ts`.
*   **Database**: Use `Prisma` + `D1` (via `@prisma/adapter-d1`) to interact with the `User` table.
*   **Security**:
    *   `bcryptjs` for password hashing.
    *   `hono/jwt` for token generation and verification.
    *   `zod` (from shared package if available, or locally) for input validation.
*   **Integration**: Mount the new auth router in `apps/backend/src/index.ts`.

### **Dependencies**
I will need to install `bcryptjs` and `@types/bcryptjs` in the backend package.

*(Note: For the "Stub" endpoints, I will implement the route structure and basic logic/placeholders, as full email sending or payment integration usually requires external services like Resend or Stripe which might not be configured yet.)*
