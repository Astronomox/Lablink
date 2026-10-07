import { BellPlus, BellRing, CalendarCheck, CalendarClock, ChevronRight, ExternalLink, MapPin } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { InsightCard } from '../components/InsightCard'
import { Panel, PanelLink, StatusPill } from '../components/Panel'
import { TrendChart } from '../components/TrendChart'
import { btn } from '../components/buttons'
import { PARTNER_LABS } from '../data/labs'
import type { Screen } from '../layout/nav'
import { PageHeader } from '../layout/PageHeader'
import { formatDate, toIso } from '../lib/dates'
import { categorize, formatValue, toDisplay, unitLabel } from '../lib/glucose'
import type { Insight } from '../lib/intelligence'
import type { Reminder } from '../lib/reminders'
import { MAX_FINDRISC, type RiskResult } from '../lib/risk'
import type { Profile, TestResult, Unit } from '../lib/types'
import { fetchRecommendations, type Recommendation } from '../services/healthfinder'
import type { ReminderAlerts } from '../services/notifications'
import type { Booking } from './BookTest'

interface Props {
  profile: Profile
  results: TestResult[]
  insight: Insight | null
  reminder: Reminder
  booking: Booking | null
  risk: RiskResult
  onFindLab: () => void
  onAddResult: () => void
  onOpenRisk: () => void
  onOpenReport: () => void
  onAskCoach: (question: string) => void
  onNavigate: (screen: Screen) => void
  alerts: ReminderAlerts
}

function signed(deltaMgDl: number, unit: Unit): string {
  const v = toDisplay(deltaMgDl, unit)
  const s = unit === 'mmol' ? Math.abs(v).toFixed(1) : String(Math.abs(Math.round(v)))
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s} ${unitLabel(unit)}`
}

const number = (mgdl: number, unit: Unit) => formatValue(mgdl, unit).replace(` ${unitLabel(unit)}`, '')

export function Dashboard({ profile, results, insight, reminder, booking, risk, onFindLab, onAddResult, onOpenRisk, onOpenReport, onAskCoach, onNavigate, alerts }: Props) {
  const [recs, setRecs] = useState<{ items: Recommendation[]; live: boolean } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchRecommendations(profile).then((r) => !cancelled && setRecs(r))
    return () => {
      cancelled = true
    }
  }, [profile.age, profile.sex]) // eslint-disable-line react-hooks/exhaustive-deps

  const latest = results.at(-1)
  const previous = results.at(-2)
  const recent = results.slice(-5).reverse()
  const unit = profile.unit

  const actions = (
    <>
      <button type="button" onClick={onFindLab} className={btn('secondary')}>
        Book a test
      </button>
      <button type="button" onClick={onAddResult} className={btn('primary')}>
        Add result
      </button>
    </>
  )

  return (
    // Mobile follows the PRD wireframe: trend graph on top, reminder in the middle, nearby labs below.
    // `order-*` only applies under lg; desktop keeps document order.
    <div className="flex flex-col gap-4 max-lg:px-4 max-lg:pt-5 lg:gap-5">
      <PageHeader screen="home" title={`Welcome back, ${profile.name}`} actions={actions} mobile={false} />

      <div className="lg:hidden">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <p className="text-2xl font-semibold tracking-tight">{profile.name}</p>
      </div>

      <div className="max-lg:order-3">
        <CheckupNotice reminder={reminder} booking={booking} onFindLab={onFindLab} alerts={alerts} />
      </div>

      <button
        type="button"
        onClick={onFindLab}
        className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left ring-1 ring-foreground/10 max-lg:order-4 lg:hidden"
      >
        <span className="grid size-10 place-items-center rounded-2xl bg-accent text-primary">
          <MapPin className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Nearby labs</span>
          <span className="block text-sm text-muted-foreground">{PARTNER_LABS.length} partner labs, from ₦{Math.min(...PARTNER_LABS.map((l) => l.fbsPrice)).toLocaleString('en-NG')}</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>

      <div className="grid grid-cols-2 gap-2 max-lg:order-5 lg:hidden">{actions}</div>

      {!latest ? (
        <Panel title="Results" className="max-lg:order-2">
          <p className="text-muted-foreground">No results on record yet.</p>
          <button type="button" onClick={onAddResult} className={cn(btn('primary'), 'mt-4')}>
            Add your first result
          </button>
        </Panel>
      ) : (
        <>
          <div className="max-lg:contents lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5">
            <Panel title="Latest result" className="max-lg:order-6">
              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight">{number(latest.valueMgDl, unit)}</span>
                <span className="text-muted-foreground">{unitLabel(unit)}</span>
              </p>
              <div className="mt-3">
                <StatusPill category={categorize(latest.valueMgDl)} />
              </div>
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Date">{formatDate(latest.date)}</Row>
                <Row label="Lab">{latest.lab ?? '—'}</Row>
                {previous && <Row label="Since last test">{signed(latest.valueMgDl - previous.valueMgDl, unit)}</Row>}
              </dl>
            </Panel>

            <Panel
              title="Fasting blood sugar trend"
              className="max-lg:order-2"
              action={
                <span className="text-sm text-muted-foreground">
                  <span className="lg:hidden">Latest {formatValue(latest.valueMgDl, unit)}</span>
                  <span className="max-lg:hidden">{results.length} results</span>
                </span>
              }
            >
              {results.length >= 2 ? <TrendChart results={results} unit={unit} className="h-64" /> : <p className="text-muted-foreground">Add another result to see a trend.</p>}
            </Panel>
          </div>

          {insight && (
            <Panel title="Analysis" className="max-lg:order-7">
              <InsightCard insight={insight} />
              <button type="button" onClick={() => onAskCoach(`${insight.headline}. What should I do next?`)} className={cn(btn('secondary'), 'mt-5')}>
                Ask the Coach about this
              </button>
            </Panel>
          )}

          <div className="grid gap-4 max-lg:order-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5">
            <Panel title="Recent results" action={<PanelLink onClick={() => onNavigate('results')}>View all</PanelLink>} bodyClassName="">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground [&_th]:px-5 [&_th]:pb-2 [&_th]:font-normal">
                    <th>Date</th>
                    <th className="max-sm:hidden">Lab</th>
                    <th className="text-right">Result</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-3 [&_tr]:border-t [&_tr]:border-border">
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="max-sm:hidden">{r.lab ?? '—'}</td>
                      <td className="text-right font-medium whitespace-nowrap">{formatValue(r.valueMgDl, unit)}</td>
                      <td>
                        <StatusPill category={categorize(r.valueMgDl)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <div className="space-y-4 lg:space-y-5">
              <Panel title="Diabetes risk score" action={<PanelLink onClick={onOpenRisk}>Details</PanelLink>}>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">{risk.score}</span>
                  <span className="text-muted-foreground">/ {MAX_FINDRISC}</span>
                  <span className="ml-auto text-sm font-medium capitalize">{risk.band}</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">10-year risk of type 2 diabetes: {risk.tenYearRisk.replace('≈', 'about ')}.</p>
              </Panel>
              <Panel title="Doctor’s summary">
                <p className="text-sm text-muted-foreground">A one-page summary of your results to show your doctor.</p>
                <button type="button" onClick={onOpenReport} className={cn(btn('secondary'), 'mt-4 w-full')}>
                  Open summary
                </button>
              </Panel>
            </div>
          </div>
        </>
      )}

      <Panel title="Health information" className="max-lg:order-9" action={recs && <span className="text-xs text-muted-foreground">{recs.live ? 'MyHealthfinder (ODPHP)' : 'MyHealthfinder (saved copy)'}</span>}>
        {!recs ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-3">
            {recs.items.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="flex h-full items-start justify-between gap-3 rounded-2xl bg-muted px-4 py-3 text-sm font-medium hover:bg-accent">
                  {r.title}
                  <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

/** Offer phone/browser notifications while they're available and not yet switched on. */
function RemindMe({ alerts }: { alerts: ReminderAlerts }) {
  if (alerts.enabled || alerts.permission === 'unsupported' || alerts.permission === 'denied') return null
  return (
    <button type="button" onClick={alerts.onEnable} className={cn(btn('ghost', 'sm'), 'gap-1.5 px-2')}>
      <BellPlus className="size-4" aria-hidden /> Turn on reminders
    </button>
  )
}

function CheckupNotice({ reminder, booking, onFindLab, alerts }: { reminder: Reminder; booking: Booking | null; onFindLab: () => void; alerts: ReminderAlerts }) {
  const box = 'flex items-start gap-3 rounded-2xl px-5 py-4'
  if (booking) {
    return (
      <div className={cn(box, 'bg-accent text-accent-foreground')}>
        <CalendarCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Test booked:</span> {booking.labName}, {formatDate(booking.date, { weekday: 'short', day: 'numeric', month: 'short' })} at {booking.slot}
          {booking.homeSampling ? ' (home sample collection)' : ''}. Do not eat for 8 to 12 hours before the test.
        </p>
      </div>
    )
  }
  if (reminder.status === 'upcoming') {
    return (
      <div className={cn(box, 'bg-card ring-1 ring-foreground/10')}>
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p>
            <span className="font-semibold">Next checkup:</span> {formatDate(toIso(reminder.dueDate))} (in {reminder.daysUntil} days). {reminder.reason}.
          </p>
          <div className="-ml-2">
            <RemindMe alerts={alerts} />
          </div>
        </div>
      </div>
    )
  }
  const overdue = reminder.status === 'overdue'
  return (
    <div className={cn(box, 'flex-wrap items-center', overdue ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900')}>
      <BellRing className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">You are due for your {reminder.intervalMonths}-month routine blood sugar checkup.</span>{' '}
        {overdue ? `Overdue by ${Math.abs(reminder.daysUntil)} days.` : reminder.reason + '.'}
      </p>
      <div className="flex items-center gap-1 max-sm:w-full max-sm:flex-col-reverse max-sm:items-stretch">
        <RemindMe alerts={alerts} />
        <button type="button" onClick={onFindLab} className={btn('primary')}>
          Find a lab
        </button>
      </div>
    </div>
  )
}
