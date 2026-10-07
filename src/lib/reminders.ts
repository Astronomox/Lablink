import { addMonths, daysBetween, parseDate, today } from './dates'
import type { Insight } from './intelligence'
import { sortByDate } from './intelligence'
import { resultsOf, TEST_KINDS, TESTS, type TestDef } from './tests'
import type { TestKind, TestResult } from './types'

export type ReminderStatus = 'overdue' | 'due' | 'upcoming'

export interface Reminder {
  kind: TestKind
  status: ReminderStatus
  dueDate: Date
  daysUntil: number
  intervalMonths: number
  reason: string
}

const DUE_SOON_DAYS = 14

/** Retest interval depends on the test and on how concerning its latest result or trend is. */
function intervalFor(def: TestDef, insight: Insight | null): { months: number; reason: string } {
  const level = insight?.level ?? 'stable'
  const months = def.retestMonths[level]
  switch (level) {
    case 'urgent':
      return { months, reason: 'Your last result needs confirming with a repeat test' }
    case 'alert':
    case 'watch':
      return {
        months,
        reason: insight && insight.band.level > 0 ? `Your last result is above the ${def.bands[0].range}, so we check every ${months} months` : `Your results are trending up, so we check every ${months} months`,
      }
    default:
      return { months, reason: `Your results are stable, so a ${months}-month routine check is enough` }
  }
}

/** When the next test of one kind is due, based on its last result. Null if it has never been tested. */
export function nextCheckup(results: TestResult[], insight: Insight | null, kind: TestKind): Reminder | null {
  const sorted = sortByDate(resultsOf(results, kind))
  if (sorted.length === 0) return null
  const { months, reason } = intervalFor(TESTS[kind], insight)
  const dueDate = addMonths(parseDate(sorted[sorted.length - 1].date), months)
  const daysUntil = daysBetween(today(), dueDate)
  const status: ReminderStatus = daysUntil < 0 ? 'overdue' : daysUntil <= DUE_SOON_DAYS ? 'due' : 'upcoming'
  return { kind, status, dueDate, daysUntil, intervalMonths: months, reason }
}

/** Reminders for every test on record, most urgent first. With no results at all, a baseline fasting blood sugar test is due. */
export function allCheckups(results: TestResult[], insights: Record<TestKind, Insight | null>): Reminder[] {
  const reminders = TEST_KINDS.map((k) => nextCheckup(results, insights[k], k)).filter((r): r is Reminder => r !== null)
  if (reminders.length === 0) {
    return [{ kind: 'fbs', status: 'due', dueDate: today(), daysUntil: 0, intervalMonths: TESTS.fbs.retestMonths.stable, reason: 'Get a baseline fasting blood sugar test' }]
  }
  return reminders.sort((a, b) => a.daysUntil - b.daysUntil)
}
