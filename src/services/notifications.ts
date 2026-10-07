/**
 * Browser notifications for checkup reminders.
 *
 * There is no push server, so reminders are shown when LabLink is opened (and
 * re-checked hourly while it stays open), at most once a day. Notifications
 * need a secure context: localhost or HTTPS.
 */
import { formatDate, toIso } from '../lib/dates'
import type { Reminder } from '../lib/reminders'
import { TESTS } from '../lib/tests'

export type NotifyPermission = NotificationPermission | 'unsupported'

/** Checkup reminder controls passed to the screens: opt-in, shown at most once a day. */
export interface ReminderAlerts {
  permission: NotifyPermission
  enabled: boolean
  onEnable: () => void
  onDisable: () => void
  onTest: () => void
}

export function notifyPermission(): NotifyPermission {
  return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext ? Notification.permission : 'unsupported'
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === 'unsupported') return 'unsupported'
  return Notification.requestPermission()
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

/** Show a notification, through the service worker where available (required on Android). */
export async function showNotification(title: string, body: string, screen = 'labs') {
  if (notifyPermission() !== 'granted') return
  const options: NotificationOptions = { body, icon: '/icon-192.png', badge: '/favicon.png', tag: 'lablink-checkup', data: { screen, url: '/' } }
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (reg) await reg.showNotification(title, options)
  else new Notification(title, options)
}

export function reminderMessage(reminder: Reminder): { title: string; body: string } | null {
  if (reminder.status === 'upcoming') return null
  const months = reminder.intervalMonths
  const when =
    reminder.status === 'overdue'
      ? `Overdue by ${Math.abs(reminder.daysUntil)} day${Math.abs(reminder.daysUntil) === 1 ? '' : 's'}.`
      : reminder.daysUntil === 0
        ? 'Due today.'
        : `Due on ${formatDate(toIso(reminder.dueDate))}.`
  return { title: 'LabLink: checkup due', body: `You are due for your ${months}-month routine ${TESTS[reminder.kind].noun} checkup. ${when} Tap to find a nearby lab.` }
}
