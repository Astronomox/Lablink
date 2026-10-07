import { daysBetween, parseDate } from './dates'
import { riskFactors } from './profile'
import { resultsOf, TESTS, type Band } from './tests'
import type { Profile, TestKind, TestResult } from './types'

export type InsightLevel = 'improving' | 'stable' | 'watch' | 'alert' | 'urgent'

export interface Insight {
  kind: TestKind
  level: InsightLevel
  headline: string
  explanation: string
  band: Band
  previousBand?: Band
  /** Change in the main value since the previous result, in storage units. */
  delta?: number
  deltaPct?: number
  /** Linear trend of the main value over recent results, storage units per month. */
  slopePerMonth?: number
  risingStreak: number
  /** Months until the trend leaves the healthy range, if heading there. */
  monthsToThreshold?: number
  riskFactors: string[]
  actions: string[]
}

const DAYS_PER_MONTH = 30.44
const TREND_WINDOW = 4

export function sortByDate(results: TestResult[]): TestResult[] {
  return [...results].sort((a, b) => a.date.localeCompare(b.date))
}

/** Least-squares slope of the main value against time, per month. */
function trendSlope(points: TestResult[]): number {
  if (points.length < 2) return 0
  const t0 = parseDate(points[0].date)
  const xs = points.map((p) => daysBetween(t0, parseDate(p.date)) / DAYS_PER_MONTH)
  const ys = points.map((p) => p.value)
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
    if (sorted[i].value > sorted[i - 1].value) streak++
    else break
  }
  return streak
}

/** Compares a test's latest result with its history and explains what changed and what to do. */
export function analyze(allResults: TestResult[], profile: Profile, kind: TestKind): Insight | null {
  const def = TESTS[kind]
  const sorted = sortByDate(resultsOf(allResults, kind))
  if (sorted.length === 0) return null

  const latest = sorted[sorted.length - 1]
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : undefined
  const level = def.classify(latest.value, latest.value2)
  const prevLevel = prev ? def.classify(prev.value, prev.value2) : undefined
  const band = def.bands[level]
  const healthy = def.bands[0]
  const delta = prev ? latest.value - prev.value : undefined
  const deltaPct = prev && delta !== undefined ? (delta / prev.value) * 100 : undefined
  const slope = trendSlope(sorted.slice(-TREND_WINDOW))
  const streak = risingStreak(sorted)
  const lifestyle = def.lifestyle(profile)
  const months = def.retestMonths

  const monthsToThreshold = level === 0 && slope > def.minSlope ? Math.max(1, Math.round((def.watchAt - latest.value) / slope)) : undefined

  const base = {
    kind,
    band,
    previousBand: prevLevel === undefined ? undefined : def.bands[prevLevel],
    delta,
    deltaPct,
    slopePerMonth: slope,
    risingStreak: streak,
    monthsToThreshold,
    riskFactors: riskFactors(profile),
  }

  if (level === def.bands.length - 1) {
    return { ...base, level: 'urgent', ...def.top, actions: [...def.top.actions, ...lifestyle.slice(0, 2)] }
  }

  if (prevLevel !== undefined && level > prevLevel) {
    const rose = deltaPct !== undefined && deltaPct > 0 ? ` rose ${fmtPct(deltaPct)} since your last test and` : ''
    return {
      ...base,
      level: 'alert',
      headline: `You’ve crossed into the ${band.range}`,
      explanation: `Your ${def.measure}${rose} is now above the ${def.cutoffText[level]} line. ${def.crossNote}`,
      actions: [...lifestyle, `Retest in ${months.alert} months to see if changes are working`, ...def.crossExtra],
    }
  }

  if (level > 0) {
    const falling = (delta ?? 0) < 0
    return {
      ...base,
      level: falling ? 'watch' : 'alert',
      headline: falling ? 'Moving in the right direction' : `Still in the ${band.range}`,
      explanation: falling
        ? `Your result dropped ${fmtPct(deltaPct ? -deltaPct : undefined)} since your last test, but is still above the normal cut-off.`
        : `Your ${def.measure} is still above the ${healthy.range}.`,
      actions: [...lifestyle, `Retest in ${falling ? months.watch : months.alert} months`],
    }
  }

  const drifting = streak >= 2 || (deltaPct ?? 0) >= 5 || slope >= def.driftSlope
  if (drifting) {
    return {
      ...base,
      level: 'watch',
      headline: `Your ${def.noun} is drifting upward`,
      explanation:
        `Still in the ${healthy.range}, but ${streak >= 2 ? `it has risen ${streak} tests in a row` : 'it is trending up'}` +
        (monthsToThreshold ? `. At this rate it could reach the ${def.bands[1].range} in about ${monthsToThreshold} months.` : '.'),
      actions: [...lifestyle, `Retest in ${months.watch} months to confirm the trend`],
    }
  }

  if ((deltaPct ?? 0) <= -3) {
    return {
      ...base,
      level: 'improving',
      headline: `Your ${def.noun} is improving`,
      explanation: `Down ${fmtPct(deltaPct ? -deltaPct : undefined)} since your last test and in the ${healthy.range}.`,
      actions: ['Keep up your current habits', `Routine retest in ${months.improving} months`],
    }
  }

  return {
    ...base,
    level: 'stable',
    headline: `Stable and in the ${healthy.range}`,
    explanation: 'No significant change in your recent results.',
    actions: [`Routine retest in ${months.stable} months`],
  }
}

function fmtPct(pct: number | undefined): string {
  return pct === undefined ? '' : `${Math.abs(pct).toFixed(1)}%`
}
