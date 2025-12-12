import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// List tables
app.get('/tables', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    ).all()
    return c.json({ tables: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get rows from table
app.get('/:table', async (c) => {
  try {
    const table = c.req.param('table')
    const limit = c.req.query('limit') || '50'
    const offset = c.req.query('offset') || '0'
    
    // Basic sanitization
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM ${table} LIMIT ? OFFSET ?`
    ).bind(Number(limit), Number(offset)).all()

    return c.json({ table, rows: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get single row
app.get('/:table/:id', async (c) => {
  try {
    const table = c.req.param('table')
    const id = c.req.param('id')
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM ${table} WHERE id = ?`
    ).bind(id).all()

    return c.json({ row: results && results.length > 0 ? results[0] : null })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Update row
app.patch('/:table/:id', async (c) => {
  try {
    const table = c.req.param('table')
    const id = c.req.param('id')
    const body = await c.req.json()
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const updates = Object.keys(body).map(key => `${key} = ?`).join(', ')
    const values = Object.values(body)

    if (values.length === 0) {
        return c.json({ error: 'No fields to update' }, 400)
    }

    const { success, error } = await c.env.DB.prepare(
      `UPDATE ${table} SET ${updates} WHERE id = ?`
    ).bind(...values, id).run()

    if (!success) {
         return c.json({ error: error || 'Update failed' }, 500)
    }

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Delete row
app.delete('/:table/:id', async (c) => {
  try {
    const table = c.req.param('table')
    const id = c.req.param('id')
    
    if (!/^[a-zA-Z0-9_]+$/.test(table)) return c.json({ error: 'Invalid table name' }, 400)

    const { success, error } = await c.env.DB.prepare(
      `DELETE FROM ${table} WHERE id = ?`
    ).bind(id).run()

    if (!success) {
         return c.json({ error: error || 'Delete failed' }, 500)
    }

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default app
