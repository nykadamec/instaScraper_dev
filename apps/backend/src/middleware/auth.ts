import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')
  
  console.log(`[AuthMiddleware] Request to ${c.req.path}`)
  console.log(`[AuthMiddleware] Auth Header: ${authHeader ? 'Present' : 'Missing'}`)
  if (authHeader) console.log(`[AuthMiddleware] Auth Header Value: ${authHeader.substring(0, 20)}...`)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[AuthMiddleware] Failed: Missing or invalid token format')
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401)
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const secret = c.env.JWT_SECRET || 'secret'
    console.log(`[AuthMiddleware] Verifying token with secret: ${c.env.JWT_SECRET ? 'Provided' : 'Default'}`)
    
    const payload = await verify(token, secret)
    console.log(`[AuthMiddleware] Token Payload:`, JSON.stringify(payload))
    
    // Validate payload structure
    if (!payload.id) {
        console.error('[AuthMiddleware] Failed: Invalid token payload (missing id)')
        return c.json({ error: 'Unauthorized: Invalid token payload' }, 401)
    }

    // Fetch user from DB to ensure they still exist and get fresh data
    const adapter = new PrismaD1(c.env.DB)
    const prisma = new PrismaClient({ adapter })
    
    const user = await prisma.user.findUnique({
        where: { id: payload.id as string }
    })

    if (!user) {
        return c.json({ error: 'Unauthorized: User not found' }, 401)
    }

    // Attach user to context
    c.set('user', user)
    
    await next()
  } catch (e) {
    console.error('Auth error:', e)
    return c.json({ error: 'Unauthorized: Invalid token' }, 401)
  }
}
