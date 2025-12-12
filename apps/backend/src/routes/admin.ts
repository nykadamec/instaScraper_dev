import { Hono } from 'hono'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/auth'
import * as bcrypt from 'bcryptjs'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

type Variables = {
  user: any
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Middleware: Auth + Admin Check
app.use('/*', authMiddleware, async (c, next) => {
    const user = c.get('user')
    if (user.role !== 'ADMIN') {
        return c.json({ error: 'Admin access required' }, 403)
    }
    await next()
})

const getPrisma = (db: D1Database) => {
  const adapter = new PrismaD1(db)
  return new PrismaClient({ adapter })
}

// 1. LIST Users (Search)
app.get('/users', async (c) => {
    const query = c.req.query('q') || ''
    const prisma = getPrisma(c.env.DB)

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: query } },
                    { username: { contains: query } },
                    { id: { equals: query } }
                ]
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                credits: true,
                planId: true,
                createdAt: true
            }
        })
        return c.json({ users })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 2. GET Single User (Full Details)
app.get('/users/:id', async (c) => {
    const id = c.req.param('id')
    const prisma = getPrisma(c.env.DB)

    try {
        const user = await prisma.user.findUnique({
            where: { id }
        })
        if (!user) return c.json({ error: 'User not found' }, 404)
        
        // Remove password hash from response for security (though admin technically can overwrite it)
        const { password, ...safeUser } = user
        return c.json({ user: safeUser })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 3. UPDATE User
app.patch('/users/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const prisma = getPrisma(c.env.DB)

    try {
        const updateData: any = { ...body }

        // Handle Password Hashing
        if (updateData.password) {
            if (updateData.password.length < 6) {
                return c.json({ error: 'Password must be at least 6 characters' }, 400)
            }
            updateData.password = await bcrypt.hash(updateData.password, 10)
        } else {
            delete updateData.password // Don't update if empty/null
        }

        // Validate Role/Plan if needed, but for Admin tool we trust the input mostly
        
        // Date handling
        if (updateData.subStartDate) updateData.subStartDate = new Date(updateData.subStartDate)
        if (updateData.subEndDate) updateData.subEndDate = new Date(updateData.subEndDate)
        if (updateData.credits) updateData.credits = Number(updateData.credits)

        // Prevent ID update
        delete updateData.id
        delete updateData.createdAt

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        })

        const { password, ...safeUser } = user
        return c.json({ user: safeUser, message: 'User updated successfully' })

    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 4. GET System Config
app.get('/config', async (c) => {
    const prisma = getPrisma(c.env.DB)
    try {
        const configs = await prisma.systemConfig.findMany()
        // Convert array to object for easier frontend consumption
        const configObj = configs.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value
            return acc
        }, {})
        return c.json({ config: configObj })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 5. UPDATE System Config
app.put('/config', async (c) => {
    const body = await c.req.json()
    const prisma = getPrisma(c.env.DB)
    
    try {
        // Body is expected to be { key: value, key2: value2 }
        const promises = Object.entries(body).map(([key, value]) => {
            return prisma.systemConfig.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            })
        })
        
        await Promise.all(promises)
        return c.json({ message: 'Configuration updated' })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 6. BULK Add Credits
app.post('/credits/bulk', async (c) => {
    const { amount, target } = await c.req.json()
    const prisma = getPrisma(c.env.DB)
    
    if (!amount || isNaN(Number(amount))) {
        return c.json({ error: 'Valid amount is required' }, 400)
    }

    try {
        let whereClause = {}
        if (target === 'FREE') {
            whereClause = { planId: 'FREE' }
        } else if (target === 'ALL') {
            whereClause = {} // No filter
        } else {
            return c.json({ error: 'Invalid target. Use ALL or FREE' }, 400)
        }

        const result = await prisma.user.updateMany({
            where: whereClause,
            data: {
                credits: { increment: Number(amount) }
            }
        })

        return c.json({ 
            success: true, 
            message: `Added ${amount} credits to ${result.count} users (${target})`,
            count: result.count
        })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

export default app
