import { Hono } from 'hono'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { sign } from 'hono/jwt'
import * as bcrypt from 'bcryptjs'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

const getPrisma = (db: D1Database) => {
  const adapter = new PrismaD1(db)
  return new PrismaClient({ adapter })
}

const getLocalPrisma = () => {
    // When using local sqlite directly (not D1 binding simulation)
    // Actually, PrismaClient with D1 adapter works fine with local D1 simulation in Wrangler.
    // But if we want to use a pure SQLite file without D1 shim, we need 'file:./dev.db'
    // However, Wrangler local dev ALREADY simulates D1 using .sqlite files in .wrangler/state
    // So c.env.DB IS the local database when running locally.
    
    // The user's request is: "if .dev.vars#L8-8 true .. local sqlite .. if false .. remote D1"
    // Wrangler handles this via `wrangler dev` (local) vs `wrangler dev --remote` (remote).
    // The `c.env.DB` binding points to the correct one automatically.
    
    // So the code doesn't strictly need to change IF we rely on Wrangler's behavior.
    // BUT if the user wants to enforce it via code using the flag:
    return new PrismaClient() // Fallback to default env vars (DATABASE_URL) ?
    // No, let's stick to passing c.env.DB which Wrangler points correctly.
}

// 1. REGISTER
app.post('/register', async (c) => {
  try {
    const { email, password, username } = await c.req.json()

    if (!email || !password || !username) {
      return c.json({ error: 'Email, password and username are required' }, 400)
    }

    const prisma = getPrisma(c.env.DB)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Plan Logic
    const planId = 'FREE'
    const subStartDate = new Date()
    let subEndDate = null
    
    // Logic for FREE plan
    if (planId === 'FREE') {
       subEndDate = new Date('2099-12-31')
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: username,
        role: 'USER',
        planId: planId,
        subStartDate: subStartDate,
        subEndDate: subEndDate
      }
    })

    // Generate Token
    const token = await sign({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, c.env.JWT_SECRET || 'secret')

    return c.json({ 
        message: 'User registered successfully', 
        token,
        user: { id: user.id, email: user.email, username: user.username, role: user.role }
    }, 201)

  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message || 'Registration failed' }, 500)
  }
})

// 2. LOGIN
app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const prisma = getPrisma(c.env.DB)
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Verify Password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Generate Tokens
    console.log(`[AuthLogin] Generating tokens for user ${user.id} (${user.email})`)
    const accessToken = await sign({ id: user.id, email: user.email, role: user.role, type: 'access', exp: Math.floor(Date.now() / 1000) + 60 * 15 }, c.env.JWT_SECRET || 'secret') // 15 mins
    const refreshToken = await sign({ id: user.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, c.env.JWT_SECRET || 'secret') // 7 days
    console.log(`[AuthLogin] Access Token generated. Length: ${accessToken.length}`)

    return c.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    })

  } catch (e: any) {
    return c.json({ error: e.message || 'Login failed' }, 500)
  }
})

// 3. REFRESH
app.post('/refresh', async (c) => {
    // Basic implementation - in production should verify signature and check if refresh token is revoked
    return c.json({ message: 'Refresh endpoint placeholder' })
})

// 4. LOGOUT
app.post('/logout', async (c) => {
    return c.json({ message: 'Logged out successfully' })
})

// 5. VERIFY EMAIL
app.post('/verify-email', async (c) => {
    return c.json({ message: 'Email verification placeholder' })
})

// 6. RESEND VERIFICATION
app.post('/resend-verification', async (c) => {
    return c.json({ message: 'Resend verification placeholder' })
})

// 7. FORGOT PASSWORD
app.post('/forgot-password', async (c) => {
    return c.json({ message: 'Forgot password placeholder' })
})

// 8. RESET PASSWORD
app.post('/reset-password', async (c) => {
    return c.json({ message: 'Reset password placeholder' })
})

// 9. SUBSCRIPTION
app.post('/subscription', async (c) => {
    return c.json({ message: 'Subscription placeholder' })
})

export default app
