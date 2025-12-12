import { Hono } from 'hono'
import Cloudflare from 'cloudflare'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  APIFY_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_R2_TOKEN: string
  CLOUDFLARE_D1_DATABASE_ID: string
  CLOUDFLARE_R2_BUCKET_NAME: string
}

const app = new Hono<{ Bindings: Bindings }>()

const getClient = (c: any) => new Cloudflare({
  apiToken: c.env.CLOUDFLARE_API_TOKEN
})

// === D1 ROUTES ===

// List tables
app.get('/d1/tables', async (c) => {
  try {
    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    if (!databaseId) return c.json({ error: 'CLOUDFLARE_D1_DATABASE_ID not configured' }, 400)

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    })

    const tables = query.result && query.result.length > 0 ? query.result[0].results : []
    return c.json({ tables })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get rows from table
app.get('/d1/:table', async (c) => {
  try {
    const table = c.req.param('table')
    const limit = c.req.query('limit') || '50'
    const offset = c.req.query('offset') || '0'
    
    // Basic sanitization
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: `SELECT * FROM ${table} LIMIT ${limit} OFFSET ${offset}`
    })

    const rows = query.result && query.result.length > 0 ? query.result[0].results : []
    return c.json({ table, rows })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get single row
app.get('/d1/:table/:id', async (c) => {
  try {
    const table = c.req.param('table')
    const id = c.req.param('id')
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: `SELECT * FROM ${table} WHERE id = ?`,
      params: [id]
    })

    const rows = query.result && query.result.length > 0 ? query.result[0].results : []
    return c.json({ row: rows && rows.length > 0 ? rows[0] : null })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Add row
app.post('/d1/:table', async (c) => {
  try {
    const table = c.req.param('table')
    const body = await c.req.json()
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const columns = Object.keys(body)
    const values = Object.values(body)
    const placeholders = values.map(() => '?').join(', ')
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`

    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: sql,
      params: values as any[]
    })

    return c.json({ success: true, result: query.result })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Update row
app.patch('/d1/:table/:id', async (c) => {
  try {
    const table = c.req.param('table')
    const id = c.req.param('id')
    const body = await c.req.json()
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const updates = Object.keys(body).map(key => `${key} = ?`).join(', ')
    const values = Object.values(body)
    const sql = `UPDATE ${table} SET ${updates} WHERE id = ?`

    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: sql,
      params: [...values, id] as any[]
    })

    return c.json({ success: true, result: query.result })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Delete row
app.delete('/d1/:table/:id', async (c) => {
  try {
    const table = c.req.param('table')
    const id = c.req.param('id')
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: `DELETE FROM ${table} WHERE id = ?`,
      params: [id]
    })

    return c.json({ success: true, result: query.result })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Raw Query
app.post('/d1/query', async (c) => {
  try {
    const { sql, params } = await c.req.json()
    
    const client = getClient(c)
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    const query = await client.d1.database.query(databaseId, {
      account_id: accountId,
      sql: sql,
      params: params || []
    })

    return c.json({ result: query.result })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Info endpoint (original /d1)
app.get('/d1/info', async (c) => {
  try {
    const client = getClient(c)

    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = c.env.CLOUDFLARE_D1_DATABASE_ID

    // Use Cloudflare API to query D1
    // First, let's just list databases to prove API access
    const databases = await client.d1.database.list({ account_id: accountId })
    
    // If we have a specific DB ID, let's try to query the User table
    let tableData: any[] = []
    if (databaseId) {
       try {
         const query = await client.d1.database.query(databaseId, {
           account_id: accountId,
           sql: "SELECT * FROM User LIMIT 5"
         })
         // query result structure: { result: [ { results: [], meta: ... } ], ... }
         if (query.result && query.result.length > 0) {
            tableData = query.result[0].results || []
         }
       } catch (qError) {
         console.error("Query failed:", qError)
         // Fallback to just returning DB info if query fails (e.g. table doesn't exist yet)
       }
    }

    return c.json(tableData.length > 0 ? tableData : databases.result)
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message, details: e }, 500)
  }
})

app.get('/r2', async (c) => {
  try {
    // Use separate token for R2 if available, otherwise fallback to main token
    const client = new Cloudflare({
      apiToken: c.env.CLOUDFLARE_R2_TOKEN || c.env.CLOUDFLARE_API_TOKEN
    })

    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
    const bucketName = c.env.CLOUDFLARE_R2_BUCKET_NAME

    // List buckets to prove API access
    const bucketsResponse = await client.r2.buckets.list({ account_id: accountId })
    // The response is { buckets: [...] }, so we need to extract the array or pass the inner list
    const buckets = bucketsResponse.buckets || []
    
    let objects: any[] = []
    
    // If we have a specific bucket, try to list objects inside it
    if (bucketName) {
        try {
            // Note: Cloudflare API for R2 objects listing might differ or require different params
            // But since we successfully listed buckets, let's return that structure for now as requested.
            
            return c.json({ 
                 source: "Cloudflare API", 
                 buckets: buckets,
                 objects: [] 
             })
        } catch (bError) {
            console.error(bError)
        }
    }

    return c.json({ source: "Cloudflare API", buckets: buckets })
   } catch (e: any) {
     console.error(e)
     return c.json({ error: e.message }, 500)
   }
 })

export default app
