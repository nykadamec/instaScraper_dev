import { Hono } from 'hono'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

type Variables = {
  user: any
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Apply middleware to all routes
app.use('/*', authMiddleware)

const getPrisma = (db: D1Database) => {
  const adapter = new PrismaD1(db)
  return new PrismaClient({ adapter })
}

// 1. GET User Profile
app.get('/', (c) => {
  const user = c.get('user')
  // Return sanitized user object
  return c.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    credits: user.credits,
    planId: user.planId,
    apifyKey: user.apifyKey ? '***' : null // Don't expose full key
  })
})

// 2. GET Scrapes (Paginated, Supporter only)
app.get('/scrapes', async (c) => {
  const user = c.get('user')
  
  if (user.planId !== 'SUPPORTER') {
      return c.json({ error: 'Subscription required (SUPPORTER)' }, 403)
  }

  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 10
  const offset = (page - 1) * limit

  const prisma = getPrisma(c.env.DB)
  
  try {
      const [total, jobs] = await Promise.all([
          prisma.scrapeJob.count({ where: { userId: user.id } }),
          prisma.scrapeJob.findMany({
              where: { userId: user.id },
              skip: offset,
              take: limit,
              orderBy: { createdAt: 'desc' },
              include: { images: true } // Include images if needed
          })
      ])

      return c.json({
          data: jobs,
          meta: {
              total,
              page,
              limit,
              pages: Math.ceil(total / limit)
          }
      })
  } catch (e: any) {
      return c.json({ error: e.message }, 500)
  }
})

// 3. DELETE Scrape Job
app.delete('/scrapes/:jobId', async (c) => {
    const user = c.get('user')
    const jobId = c.req.param('jobId')
    const prisma = getPrisma(c.env.DB)

    try {
        const result = await prisma.scrapeJob.deleteMany({
            where: {
                id: jobId,
                userId: user.id
            }
        })

        if (result.count === 0) {
            return c.json({ error: 'Job not found or access denied' }, 404)
        }

        return c.json({ success: true, message: 'Job deleted' })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 4. DELETE Scrapes (Bulk)
app.delete('/scrapes', async (c) => {
    const user = c.get('user')
    const prisma = getPrisma(c.env.DB)
    
    try {
        const body = await c.req.json()
        const ids = body.ids
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return c.json({ error: 'Invalid or empty IDs array' }, 400)
        }

        const result = await prisma.scrapeJob.deleteMany({
            where: {
                userId: user.id,
                id: { in: ids }
            }
        })

        return c.json({ success: true, count: result.count })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 5. EXPORT Scrapes (Supporter only)
app.get('/scrapes/export', async (c) => {
    const user = c.get('user')
    
    if (user.planId !== 'SUPPORTER') {
        return c.json({ error: 'Subscription required (SUPPORTER)' }, 403)
    }

    const format = c.req.query('format') || 'json'
    const prisma = getPrisma(c.env.DB)

    try {
        const jobs = await prisma.scrapeJob.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { images: true }
        })

        if (format === 'csv') {
            // Simple CSV generation
            const header = 'id,postUrl,status,createdAt,imagesCount\n'
            const rows = jobs.map(j => 
                `"${j.id}","${j.postUrl}","${j.status}","${j.createdAt.toISOString()}","${j.images.length}"`
            ).join('\n')
            return c.text(header + rows)
        }

        return c.json({ data: jobs })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 6. UPDATE Apify Key (Supporter only)
app.put('/apify-key', async (c) => {
    const user = c.get('user')
    
    if (user.planId !== 'SUPPORTER') {
        return c.json({ error: 'Subscription required (SUPPORTER)' }, 403)
    }

    try {
        const { apifyKey } = await c.req.json()
        
        if (!apifyKey) {
            return c.json({ error: 'Apify Key is required' }, 400)
        }

        const prisma = getPrisma(c.env.DB)
        await prisma.user.update({
            where: { id: user.id },
            data: { apifyKey }
        })

        return c.json({ success: true, message: 'Apify Key updated' })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 7. GET Subscription
app.get('/subscription', (c) => {
    const user = c.get('user')
    return c.json({
        planId: user.planId,
        subStartDate: user.subStartDate,
        subEndDate: user.subEndDate,
        isActive: user.subEndDate ? new Date(user.subEndDate) > new Date() : true // Free is always active?
    })
})

// 8. GET Credits
app.get('/credits', (c) => {
    const user = c.get('user')
    return c.json({ credits: user.credits })
})

export default app
