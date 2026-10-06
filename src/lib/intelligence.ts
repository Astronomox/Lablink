import { categorize, PREDIABETES_MGDL, type Category } from './glucose'
import { daysBetween, parseDate } from './dates'
import type { Profile, TestResult } from './types'

export type InsightLevel = 'improving' | 'stable' | 'watch' | 'alert' | 'urgent'

export interface Insight {
  level: InsightLevel
  headline: string
  explanation: string
  category: Category
  previousCategory?: Category
  deltaMgDl?: number
  deltaPct?: number
  /** Linear trend over recent results, mg/dL per month */
  slopePerMonth?: number
  risingStreak: number
  /** Months until the trend reaches the prediabetes cut-off, if heading there */
  monthsToThreshold?: number
  riskFactors: string[]
  actions: string[]
}

const CATEGORY_RANK: Record<Category, number> = { normal: 0, prediabetes: 1, diabetes: 2 }
const DAYS_PER_MONTH = 30.44
const TREND_WINDOW = 4

export function sortByDate(results: TestResult[]): TestResult[] {
  return [...results].sort((a, b) => a.date.localeCompare(b.date))
}

/** Least-squares slope of value against time, in mg/dL per month. */
function trendSlope(points: TestResult[]): number {
  if (points.length < 2) return 0
  const t0 = parseDate(points[0].date)
  const xs = points.map((p) => daysBetween(t0, parseDate(p.date)) / DAYS_PER_MONTH)
  const ys = points.map((p) => p.valueMgDl)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my)
    den += (x - mx) ** 2
  })
  return den === 0 ? 0 : num / den
}

function risingStreak(sorted: TestResult[]): number {
  let streak = 0
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i].valueMgDl > sorted[i - 1].valueMgDl) streak++
    else break
  }
  return streak
}

export function bmi(profile: Profile): number | undefined {
  if (!profile.weightKg || !profile.heightCm) return undefined
  const m = profile.heightCm / 100
  return Math.round((profile.weightKg / (m * m)) * 10) / 10
}

export function riskFactors(profile: Profile): string[] {
  const factors: string[] = []
  if (profile.age >= 35) factors.push(`Age ${profile.age} (screening advised from 35)`)
  const b = bmi(profile)
  if (b !== undefined && b >= 25) factors.push(`BMI ${b} (${b >= 30 ? 'obesity' : 'overweight'} range)`)
  if (profile.familyHistory) factors.push('Family history of diabetes')
  return factors
}

export function analyze(results: TestResult[], profile: Profile): Insight | null {
  const sorted = sortByDate(results)
  if (sorted.length === 0) return null

  const latest = sorted[sorted.length - 1]
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : undefined
  const category = categorize(latest.valueMgDl)
  const previousCategory = prev ? categorize(prev.valueMgDl) : undefined
  const deltaMgDl = prev ? latest.valueMgDl - prev.valueMgDl : undefined
  const deltaPct = prev && deltaMgDl !== undefined ? (deltaMgDl / prev.valueMgDl) * 100 : undefined
  const slope = trendSlope(sorted.slice(-TREND_WINDOW))
  const streak = risingStreak(sorted)
  const risks = riskFactors(profile)
  const overweight = (bmi(profile) ?? 0) >= 25

  const monthsToThreshold =
    category === 'normal' && slope > 0.1 ? Math.max(1, Math.round((PREDIABETES_MGDL - latest.valueMgDl) / slope)) : undefined

  const base = {
    category,
    previousCategory,
    deltaMgDl,
    deltaPct,
    slopePerMonth: slope,
    risingStreak: streak,
    monthsToThreshold,
    riskFactors: risks,
  }

  const lifestyle = [
    'Swap soft drinks, sweetened malt drinks and juice for water',
    'Halve portions of white rice, bread and swallow; add vegetables and beans',
    'Walk briskly for 30 minutes, at least 5 days a week',
  ]
  const weightAction = overweight ? ['Losing 5–7% of your body weight can cut diabetes risk by more than half'] : []

  if (category === 'diabetes') {
    return {
      ...base,
      level: 'urgent',
      headline: 'This result is in the diabetes range',
      explanation:
        'A fasting blood sugar of 126 mg/dL (7.0 mmol/L) or higher needs a doctor’s review. One test is not a diagnosis. A repeat fasting test or an HbA1c test is used to confirm.',
      actions: [
        'See a doctor within the next 2 weeks and bring your LabLink history',
        'Ask about a confirmatory HbA1c test',
        'Do not start or stop any medication without medical advice',
        ...lifestyle.slice(0, 2),
      ],
    }
  }

  if (previousCategory && CATEGORY_RANK[category] > CATEGORY_RANK[previousCategory]) {
    return {
      ...base,
      level: 'alert',
      headline: 'You’ve crossed into the prediabetes range',
      explanation: `Your fasting blood sugar rose ${fmtPct(deltaPct)} since your last test and is now above the 100 mg/dL (5.6 mmol/L) line. Prediabetes can often be reversed with diet and exercise.`,
      actions: [...lifestyle, ...weightAction, 'Retest in 3 months to see if changes are working', 'Ask a doctor whether an HbA1c test makes sense'],
    }
  }

  if (category === 'prediabetes') {
    const falling = (deltaMgDl ?? 0) < 0
    return {
      ...base,
      level: falling ? 'watch' : 'alert',
      headline: falling ? 'Moving in the right direction' : 'Still in the prediabetes range',
      explanation: falling
        ? `Your result dropped ${fmtPct(deltaPct ? -deltaPct : undefined)} since your last test, but is still above the normal cut-off.`
        : 'Your fasting blood sugar is still above the normal range.',
      actions: [...lifestyle, ...weightAction, 'Retest in 3 months'],
    }
  }

  const drifting = streak >= 2 || (deltaPct ?? 0) >= 5 || slope >= 0.75
  if (drifting) {
    return {
      ...base,
      level: 'watch',
      headline: 'Your blood sugar is drifting upward',
      explanation:
        `Still in the normal range, but ${streak >= 2 ? `it has risen ${streak} tests in a row` : 'it is trending up'}` +
        (monthsToThreshold ? `. At this rate it could reach the prediabetes range in about ${monthsToThreshold} months.` : '.'),
      actions: [...lifestyle, ...weightAction, 'Retest in 3 months to confirm the trend'],
    }
  }

  if ((deltaPct ?? 0) <= -3) {
    return {
      ...base,
      level: 'improving',
      headline: 'Your blood sugar is improving',
      explanation: `Down ${fmtPct(deltaPct ? -deltaPct : undefined)} since your last test and in the normal range.`,
      actions: ['Keep up your current habits', 'Routine retest in 6 months'],
    }
  }

  return {
    ...base,
    level: 'stable',
    headline: 'Stable and in the normal range',
    explanation: 'No significant change in your recent results.',
    actions: ['Routine retest in 6 months'],
  }
}

function fmtPct(pct: number | undefined): string {
  return pct === undefined ? '' : `${Math.abs(pct).toFixed(1)}%`
}
