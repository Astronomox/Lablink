import { categorize, toDisplay, unitLabel } from '../lib/glucose'
import type { Insight } from '../lib/intelligence'
import type { RiskResult } from '../lib/risk'
import type { Profile, TestResult } from '../lib/types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ScannedResult {
  date: string
  value: number
  unit: 'mg/dL' | 'mmol/L'
  lab: string
  testName: string
}

export async function aiStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(3000) })
    return res.ok && (await res.json()).enabled === true
  } catch {
    return false
  }
}

/** Compact, model-friendly snapshot of everything LabLink knows about the user. */
export function buildContext(profile: Profile, results: TestResult[], insight: Insight | null, risk: RiskResult | null) {
  return {
    today: new Date().toISOString().slice(0, 10),
    profile: {
      firstName: profile.name,
      age: profile.age,
      sex: profile.sex,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      familyHistoryOfDiabetes: profile.familyHistory,
      preferredUnit: unitLabel(profile.unit),
    },
    fastingBloodSugarHistory: results.map((r) => ({
      date: r.date,
      mgdl: Math.round(r.valueMgDl),
      mmolL: toDisplay(r.valueMgDl, 'mmol'),
      category: categorize(r.valueMgDl),
      lab: r.lab,
    })),
    trendAnalysis: insight && {
      level: insight.level,
      headline: insight.headline,
      changeVsLastTestMgdl: insight.deltaMgDl,
      trendMgdlPerMonth: insight.slopePerMonth && Math.round(insight.slopePerMonth * 100) / 100,
      risingStreak: insight.risingStreak,
      monthsToPrediabetesAtCurrentPace: insight.monthsToThreshold,
      riskFactors: insight.riskFactors,
    },
    findriscRiskScore: risk && { score: risk.score, outOf: 26, band: risk.band, tenYearRisk: risk.tenYearRisk },
  }
}

/** Streams the coach's reply; calls onText with the accumulated text so far. */
export async function streamCoach(
  body: { mode?: 'chat' | 'doctor'; context: unknown; messages: ChatMessage[] },
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/ai/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    full += decoder.decode(value, { stream: true })
    onText(full)
  }
  return full
}

export async function scanReport(file: File): Promise<{ found: boolean; results: ScannedResult[]; notes: string }> {
  const { mediaType, data } = file.type === 'application/pdf' ? { mediaType: file.type, data: await fileToBase64(file) } : await downscaleImage(file)
  const res = await fetch('/api/ai/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType, data }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
  return json
}

const MAX_IMAGE_EDGE = 2000

/** Phone photos are often 5–12 MB; re-encode as JPEG with the long edge capped. */
async function downscaleImage(file: File): Promise<{ mediaType: string; data: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
  return { mediaType: 'image/jpeg', data: dataUrl.split(',')[1] ?? '' }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
