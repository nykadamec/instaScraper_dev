I will expand the `apps/backend/src/routes/cloudflare.ts` file to include a full CRUD (Create, Read, Update, Delete) API for the D1 database, enabling you to manage tables and data directly via these endpoints.

### **Planned API Structure**

All routes will be prefixed with `/api/is/cloudflare/d1` (inherited from `index.ts` + `cloudflare.ts`).

1.  **List Tables**
    *   `GET /d1/tables`
    *   Returns a list of all tables in the database.
    *   SQL: `SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'`

2.  **Get Rows (List)**
    *   `GET /d1/:table`
    *   Returns rows from the specified table (default limit 50).
    *   Supports query params: `?limit=100&offset=0`

3.  **Get Single Row**
    *   `GET /d1/:table/:id`
    *   Returns a single row by its `id`.

4.  **Add Row (Create)**
    *   `POST /d1/:table`
    *   Body: JSON object `{ "col1": "val1", "col2": 123 }`
    *   Inserts a new record into the table.

5.  **Update Row**
    *   `PATCH /d1/:table/:id`
    *   Body: JSON object `{ "col1": "newVal" }`
    *   Updates the specified record.

6.  **Delete Row**
    *   `DELETE /d1/:table/:id`
    *   Deletes the specified record.

7.  **Raw Query (Bonus)**
    *   `POST /d1/query`
    *   Body: `{ "sql": "SELECT ...", "params": [...] }`
    *   Executes a raw SQL query for advanced usage.

### **Implementation Details**
- I will modify `apps/backend/src/routes/cloudflare.ts`.
- I will use the `cloudflare` npm package to execute SQL queries.
- I will implement basic SQL string construction for the dynamic table/column names (with sanitization for table names to prevent basic injection, though binding values will be used for data).
