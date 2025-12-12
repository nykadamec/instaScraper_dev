
import { Hono } from 'hono'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ApifyClient } from 'apify-client-ts'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  APIFY_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

const getPrisma = (db: D1Database) => {
  const adapter = new PrismaD1(db)
  return new PrismaClient({ adapter })
}

// 1. Run Actor
app.post('/run', async (c) => {
    try {
        const user = c.get('user') as any
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { actorId, input, token } = await c.req.json()
        
        if (!actorId) {
            return c.json({ error: 'actorId is required' }, 400)
        }

        // Use custom token if provided, otherwise fallback to env
        const apifyToken = token || c.env.APIFY_TOKEN
        if (!apifyToken) {
            return c.json({ error: 'No Apify Token available' }, 500)
        }

        const client = new ApifyClient({ token: apifyToken })
        
        // Start the run
        const run = await client.actor(actorId).call(input)

        // Save to DB
        const prisma = getPrisma(c.env.DB)
        // Try to extract postUrl from input
        let postUrl: string | undefined = undefined
        if (input && typeof input === 'object') {
             // Check startUrls array
             if (Array.isArray(input.startUrls) && input.startUrls.length > 0) {
                 const firstUrl = input.startUrls[0]
                 if (typeof firstUrl === 'string') postUrl = firstUrl
                 else if (firstUrl.url) postUrl = firstUrl.url
             }
             // Check directUrls array
             else if (Array.isArray(input.directUrls) && input.directUrls.length > 0) {
                 postUrl = input.directUrls[0]
             }
             // Check url field
             else if (input.url) {
                 postUrl = input.url
             }
        }

        const job = await prisma.scrapeJob.create({
            data: {
                userId: user.id,
                actorId: actorId,
                apifyRunId: run.id,
                status: run.status,
                input: JSON.stringify(input || {}),
                postUrl: postUrl // Pass explicitly even if undefined (Prisma handles optional)
            }
        })

        return c.json({ job, run })
    } catch (e: any) {
        console.error(e)
        return c.json({ error: e.message || 'Failed to start actor' }, 500)
    }
})

// 2. Get Job Status
app.get('/job/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const prisma = getPrisma(c.env.DB)
        
        const job = await prisma.scrapeJob.findUnique({ where: { id } })
        if (!job) return c.json({ error: 'Job not found' }, 404)

        // If job is already finished, return it
        if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(job.status)) {
            return c.json({ job })
        }

        // If running, check status on Apify
        if (job.apifyRunId) {
            // Use provided token or env fallback
            // Note: We don't store the custom token, so we fallback to env here. 
            // If the job was started with a custom token that is NOT in env, this check might fail 401.
            // Improvement: Store encrypted token or require token in this GET request too.
            const client = new ApifyClient({ token: c.env.APIFY_TOKEN }) 
            
            try {
                const run = await client.run(job.apifyRunId).get()
                
                if (run && run.status !== job.status) {
                    // Update DB
                    const updatedJob = await prisma.scrapeJob.update({
                        where: { id },
                        data: { status: run.status }
                    })
                    return c.json({ job: updatedJob, run })
                }
                return c.json({ job, run })
            } catch (apifyError) {
                console.warn('Failed to fetch Apify status:', apifyError)
                // Return job from DB if Apify check fails (e.g. wrong token)
                return c.json({ job, warning: 'Could not sync with Apify (Check token)' })
            }
        }

        return c.json({ job })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 3. Get Dataset (Results)
app.get('/job/:id/dataset', async (c) => {
    try {
        const id = c.req.param('id')
        const prisma = getPrisma(c.env.DB)
        
        const job = await prisma.scrapeJob.findUnique({ where: { id } })
        if (!job || !job.apifyRunId) return c.json({ error: 'Job or Run ID not found' }, 404)

        const client = new ApifyClient({ token: c.env.APIFY_TOKEN })
        
        // 1. Get Run to find defaultDatasetId
        const run = await client.run(job.apifyRunId).get()
        if (!run) return c.json({ error: 'Apify Run not found' }, 404)

        // 2. Get Items
        const dataset = await client.dataset(run.defaultDatasetId).listItems()
        
        return c.json({ items: dataset.items, total: dataset.total })

    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

// 4. Webhook (Public but should verify secret in real app)
app.post('/webhook', async (c) => {
    try {
        const body = await c.req.json()
        const { eventType, resource } = body

        if (eventType === 'ACTOR.RUN.SUCCEEDED' || eventType === 'ACTOR.RUN.FAILED') {
             const runId = resource.id
             const status = eventType === 'ACTOR.RUN.SUCCEEDED' ? 'SUCCEEDED' : 'FAILED'
             
             const prisma = getPrisma(c.env.DB)
             
             // Update all jobs with this runId
             // Note: In a real app, you might want to query by apifyRunId.
             // But prisma.apifyScrapeJob.updateMany is safer if multiple records exist (unlikely here)
             
             // We need to find the job first because we used uuid for id, not runId
             const jobs = await prisma.scrapeJob.findMany({ where: { apifyRunId: runId } })
             
             for (const job of jobs) {
                 await prisma.scrapeJob.update({
                     where: { id: job.id },
                     data: { status }
                 })
             }
             
             return c.json({ message: 'Updated', count: jobs.length })
        }

        return c.json({ message: 'Ignored' })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    }
})

export default app
