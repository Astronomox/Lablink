import { addMonths, daysBetween, parseDate, today } from './dates'
import type { Insight } from './intelligence'
import { sortByDate } from './intelligence'
import type { TestResult } from './types'

export type ReminderStatus = 'overdue' | 'due' | 'upcoming'

export interface Reminder {
  status: ReminderStatus
  dueDate: Date
  daysUntil: number
  intervalMonths: number
  reason: string
}

const DUE_SOON_DAYS = 14

/** Retest interval depends on how concerning the latest trend is. */
function intervalFor(insight: Insight | null): { months: number; reason: string } {
  switch (insight?.level) {
    case 'urgent':
      return { months: 1, reason: 'Your last result needs confirming with a repeat test' }
    case 'alert':
    case 'watch':
      return { months: 3, reason: 'Your results are trending up, so we check every 3 months' }
    default:
      return { months: 6, reason: 'Your results are stable, so a 6-month routine check is enough' }
  }
}

export function nextCheckup(results: TestResult[], insight: Insight | null): Reminder {
  const sorted = sortByDate(results)
  const now = today()
  const { months, reason } = intervalFor(insight)

  if (sorted.length === 0) {
    return { status: 'due', dueDate: now, daysUntil: 0, intervalMonths: months, reason: 'Get a baseline fasting blood sugar test' }
  }

  const dueDate = addMonths(parseDate(sorted[sorted.length - 1].date), months)
  const daysUntil = daysBetween(now, dueDate)
  const status: ReminderStatus = daysUntil < 0 ? 'overdue' : daysUntil <= DUE_SOON_DAYS ? 'due' : 'upcoming'
  return { status, dueDate, daysUntil, intervalMonths: months, reason }
}
