/**
 * Claude-powered endpoints, served from the Vite dev/preview server so the
 * API key stays server-side. Mounted at /api/ai/*.
 *
 *   GET  /api/ai/status   -> { enabled }
 *   POST /api/ai/coach    -> streamed plain text (chat or doctor summary)
 *   POST /api/ai/scan     -> { found, results[], notes } extracted from a lab report
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { z } from 'zod'

const MODEL = 'claude-opus-5-5'
// Re-run a declined request on Anthropic's recommended fallback model instead of failing.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
const MAX_BODY_BYTES = 20 * 1024 * 1024

const COACH_SYSTEM = `You are LabLink Coach, a warm, practical preventive-health assistant inside the LabLink app, used mainly by adults in Nigeria to track fasting blood sugar (FBS).

How to respond:
- Ground every answer in the user's own data supplied in the patient context (values, dates, trend, risk score). Quote their numbers.
- Use the user's preferred unit, and give the other unit in brackets when it helps.
- Give concrete, culturally relevant advice: Nigerian foods (rice, swallow, bread, beans, plantain, moi moi, zobo, malt drinks, soft drinks), affordable options, walking in a Lagos context.
- Keep answers short for a phone screen: 2–5 short paragraphs or a brief list. No headings. Plain language; explain any medical term you use.
- You support but never replace a clinician. Do not diagnose or prescribe or adjust medication. If a value is in the diabetes range (≥7.0 mmol/L / 126 mg/dL) or the user describes symptoms such as extreme thirst, frequent urination, blurred vision, unexplained weight loss, confusion or fainting, clearly advise seeing a doctor promptly (urgent care for severe symptoms).
- If asked something outside health, briefly steer back to how LabLink can help.`

const DOCTOR_SYSTEM = `You write concise clinical handover notes for a patient to show their doctor. Write in an SBAR structure (Situation, Background, Assessment, Recommendation) using only the data in the patient context. Use both mg/dL and mmol/L. Be factual and neutral; do not diagnose — state findings against ADA cut-offs (prediabetes 100–125 mg/dL, diabetes ≥126 mg/dL fasting) and list 2–3 questions the patient may want to ask. Keep it under 180 words. Plain text only: label each section on its own line like "Situation:", no markdown symbols.`

const ScanSchema = z.object({
  found: z.boolean().describe('True if at least one fasting blood glucose / fasting blood sugar result was found'),
  results: z.array(
    z.object({
      date: z.string().describe('Sample/collection date as YYYY-MM-DD, or empty string if not shown'),
      value: z.number().describe('Numeric result exactly as printed'),
      unit: z.enum(['mg/dL', 'mmol/L']),
      lab: z.string().describe('Laboratory or facility name, or empty string'),
      testName: z.string().describe('Test name as printed on the report'),
    }),
  ),
  notes: z.string().describe('One short sentence about anything uncertain, e.g. unreadable date or non-fasting sample'),
})

const SCAN_PROMPT = `Extract every FASTING blood glucose result (also called FBS, FBG, fasting plasma glucose, fasting blood sugar) from this lab report.
Ignore random/postprandial glucose, HbA1c and other tests. Copy values and units exactly as printed — do not convert. If the unit is missing, infer it from magnitude (values under 30 are mmol/L).`

type Role = 'user' | 'assistant'
interface CoachBody {
  mode?: 'chat' | 'doctor'
  context: unknown
  messages: { role: Role; content: string }[]
}
interface ScanBody {
  mediaType: string
  data: string
}

export function aiPlugin(apiKey: string | undefined): Plugin {
  const enabled = Boolean(apiKey)
  const client = enabled ? new Anthropic({ apiKey }) : null

  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? ''
    if (!url.startsWith('/api/ai/')) return next()
    try {
      if (url === '/api/ai/status') return json(res, 200, { enabled })
      if (!client) return json(res, 503, { error: 'AI is not configured. Add ANTHROPIC_API_KEY to app/.env.local and restart.' })
      if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })

      if (url === '/api/ai/coach') return await coach(client, (await readJson(req)) as CoachBody, res)
      if (url === '/api/ai/scan') return await scan(client, (await readJson(req)) as ScanBody, res)
      return json(res, 404, { error: 'Not found' })
    } catch (err) {
      console.error('[ai]', err)
      if (res.headersSent) return res.end()
      json(res, statusFor(err), { error: messageFor(err) })
    }
  }

  return {
    name: 'lablink-ai',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

async function coach(client: Anthropic, body: CoachBody, res: ServerResponse) {
  const history = (body.messages ?? []).filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
  if (history.length === 0 || history[0].role !== 'user') return json(res, 400, { error: 'messages must start with a user turn' })

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: body.mode === 'doctor' ? DOCTOR_SYSTEM : COACH_SYSTEM, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Patient context (JSON, from the LabLink app):\n${JSON.stringify(body.context)}` },
    ],
    messages: history.slice(-20),
  })

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
  stream.on('text', (text) => res.write(text))
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    res.write('\n\nI can’t help with that one. For anything urgent or specific to your treatment, please speak with a doctor.')
  }
  res.end()
}

async function scan(client: Anthropic, body: ScanBody, res: ServerResponse) {
  const { mediaType, data } = body
  const isPdf = mediaType === 'application/pdf'
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type ImageType = (typeof imageTypes)[number]
  if (!data || (!isPdf && !imageTypes.includes(mediaType as ImageType))) {
    return json(res, 400, { error: 'Upload a JPG, PNG, WEBP or PDF lab report.' })
  }

  const source = isPdf
    ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } as const)
    : ({ type: 'image', source: { type: 'base64', media_type: mediaType as ImageType, data } } as const)

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: 'medium', format: betaZodOutputFormat(ScanSchema) },
    messages: [{ role: 'user', content: [source, { type: 'text', text: SCAN_PROMPT }] }],
  })

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    return json(res, 422, { error: 'Could not read this report. Try a clearer photo, or enter the value manually.' })
  }
  json(res, 200, response.parsed_output)
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'File too large (max 20 MB).'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new HttpError(400, 'Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function statusFor(err: unknown): number {
  if (err instanceof HttpError) return err.status
  if (err instanceof Anthropic.RateLimitError) return 429
  if (err instanceof Anthropic.AuthenticationError) return 502
  if (err instanceof Anthropic.APIError) return 502
  return 500
}

function messageFor(err: unknown): string {
  if (err instanceof HttpError) return err.message
  if (err instanceof Anthropic.RateLimitError) return 'The AI is busy right now — try again in a moment.'
  if (err instanceof Anthropic.AuthenticationError) return 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.'
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service. Check your internet connection.'
  if (err instanceof Anthropic.APIError) return `AI service error (${err.status}).`
  return 'Something went wrong.'
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}
