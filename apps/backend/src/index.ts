import { Hono } from 'hono'
import { cors } from 'hono/cors'
import cloudflareRouter from './routes/cloudflare'
import localD1Router from './routes/local-d1'
import authRouter from './routes/auth'
import meRouter from './routes/me'
import apifyRouter from './routes/apify'
import { authMiddleware } from './middleware/auth'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  USE_LOCAL_DATA: string
  APIFY_TOKEN: string
}

const app = new Hono<{ 
  Bindings: Bindings,
  Variables: {
    useLocal: boolean
    user: any
  }
}>()

// Middleware to inject config
app.use('*', async (c, next) => {
    // Check if USE_LOCAL_DATA is set
    const useLocal = c.env.USE_LOCAL_DATA === 'true'
    c.set('useLocal', useLocal)
    await next()
})

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PATCH', 'PUT'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Public Routes
app.route('/api/is/debug/cloudflare', cloudflareRouter) // Keep legacy path for now or redirect
app.route('/api/is/cloudflare', cloudflareRouter)
app.route('/api/is/local-d1', localD1Router)
app.route('/api/is/auth', authRouter)

// Webhook (Public but specialized)
app.route('/api/is/apify', apifyRouter) // Note: /webhook is public, others need auth. 
// However, apifyRouter implementation currently doesn't check auth inside webhook, 
// but DOES check auth inside /run, /job etc. 
// So we can mount it here, but we should apply authMiddleware to specific sub-routes if not handled inside.
// In apify.ts we manually check c.get('user') which requires authMiddleware to run BEFORE.

// Protected Routes
app.use('/api/is/me/*', authMiddleware)
app.route('/api/is/me', meRouter)

// Apply Auth Middleware to Apify Routes EXCEPT webhook
app.use('/api/is/apify/run', authMiddleware)
app.use('/api/is/apify/job/*', authMiddleware) 
// Webhook remains public

app.get('/api/is/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
