import { z } from 'zod';

export const ScrapeRequestSchema = z.object({
  postUrl: z.string().url().regex(/instagram\.com\/p\/[\w-]+\/?/, "Invalid Instagram Post URL"),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

export const ScrapeResultSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'ERROR']),
  images: z.array(z.string().url()),
});

export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;
