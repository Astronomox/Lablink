// Vercel function for /api/ai/coach. Locally the same handler is served by the Vite plugin (server/ai.ts).
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createAiHandler } from '../../server/ai.js'

const handle = createAiHandler(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || undefined)

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handle('coach', req, res)
}
