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
import type { Insight } from '../lib/intelligence'
import type { Reminder } from '../lib/reminders'
import { MAX_FINDRISC, type RiskResult } from '../lib/risk'
import { bandOf, formatNumber, formatResult, resultsOf, TEST_KINDS, TESTS } from '../lib/tests'
import type { Profile, TestKind, TestResult, Unit } from '../lib/types'
import { fetchRecommendations, type Recommendation } from '../services/healthfinder'
import type { ReminderAlerts } from '../services/notifications'
import type { Booking } from './BookTest'

interface Props {
  profile: Profile
  results: TestResult[]
  insights: Record<TestKind, Insight | null>
  /** The most urgent checkup across all tests. */
  reminder: Reminder
  booking: Booking | null
  risk: RiskResult
  /** The test shown in the trend, latest result, analysis and recent results. */
  focus: TestKind
  onFocus: (kind: TestKind) => void
  onFindLab: () => void
  onAddResult: () => void
  onOpenRisk: () => void
  onOpenReport: () => void
  onAskCoach: (question: string) => void
  onNavigate: (screen: Screen) => void
  alerts: ReminderAlerts
}

/** "+0.2 mmol/L" between two results of the same test (main value). */
function change(latest: TestResult, previous: TestResult, kind: TestKind, unit: Unit): string {
  const def = TESTS[kind]
  const d = def.toDisplay(latest.value, unit) - def.toDisplay(previous.value, unit)
  const s = Math.abs(d).toFixed(def.decimals(unit))
  const u = def.unit(unit)
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${s}${u === '%' ? ' points' : ` ${u}`}`
}

const minPrice = Math.min(...PARTNER_LABS.map((l) => Math.min(...Object.values(l.prices))))

export function Dashboard(props: Props) {
  const { profile, results, insights, reminder, booking, risk, focus, onFocus, onFindLab, onAddResult, onOpenRisk, onOpenReport, onAskCoach, onNavigate, alerts } = props
  const [recs, setRecs] = useState<{ items: Recommendation[]; live: boolean } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchRecommendations(profile).then((r) => !cancelled && setRecs(r))
    return () => {
      cancelled = true
    }
  }, [profile.age, profile.sex]) // eslint-disable-line react-hooks/exhaustive-deps

  const unit = profile.unit
  const def = TESTS[focus]
  const own = resultsOf(results, focus)
  const latest = own.at(-1)
  const previous = own.at(-2)
  const recent = own.slice(-5).reverse()
  const insight = insights[focus]

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
    // Mobile follows the PRD wireframe: trend graph near the top, reminder in the middle, nearby labs below.
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

      <section aria-label="Your tests" className="max-lg:order-1">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Your tests</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {TEST_KINDS.map((k) => (
            <TestCard key={k} kind={k} results={resultsOf(results, k)} unit={unit} selected={k === focus} onSelect={() => onFocus(k)} />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onFindLab}
        className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left ring-1 ring-foreground/10 max-lg:order-4 lg:hidden"
      >
        <span className="grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <MapPin className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Nearby labs</span>
          <span className="block text-sm text-muted-foreground">
            {PARTNER_LABS.length} partner labs, tests from ₦{minPrice.toLocaleString('en-NG')}
          </span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>

      <div className="grid grid-cols-2 gap-2 max-lg:order-5 lg:hidden">{actions}</div>

      {!latest ? (
        <Panel title={def.name} className="max-lg:order-2">
          <p className="text-muted-foreground">No {def.measure} result on record yet.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onAddResult} className={btn('primary')}>
              Add a result
            </button>
            <button type="button" onClick={onFindLab} className={btn('secondary')}>
              Book a test
            </button>
          </div>
        </Panel>
      ) : (
        <>
          <div className="max-lg:contents lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5">
            <Panel title={`Latest ${def.measure}`} className="max-lg:order-6">
              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight">{formatNumber(latest, unit)}</span>
                <span className="text-muted-foreground">{def.unit(unit)}</span>
              </p>
              <div className="mt-3">
                <StatusPill band={bandOf(latest)} />
              </div>
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Date">{formatDate(latest.date)}</Row>
                <Row label="Lab">{latest.lab ?? '—'}</Row>
                {previous && <Row label="Since last test">{change(latest, previous, focus, unit)}</Row>}
              </dl>
            </Panel>

            <Panel
              title={`${def.name} trend`}
              className="max-lg:order-2"
              action={
                <span className="text-sm text-muted-foreground">
                  <span className="lg:hidden">Latest {formatResult(latest, unit)}</span>
                  <span className="max-lg:hidden">{own.length} results</span>
                </span>
              }
            >
              {own.length >= 2 ? <TrendChart results={own} kind={focus} unit={unit} className="h-64" /> : <p className="text-muted-foreground">Add another result to see a trend.</p>}
            </Panel>
          </div>

          {insight && (
            <Panel title={`${def.name}: analysis`} className="max-lg:order-7">
              <InsightCard insight={insight} />
              <button type="button" onClick={() => onAskCoach(`About my ${def.measure}: ${insight.headline}. What should I do next?`)} className={cn(btn('secondary'), 'mt-5')}>
                Ask the Coach about this
              </button>
            </Panel>
          )}

          <div className="grid gap-4 max-lg:order-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5">
            <Panel title={`Recent ${def.measure} results`} action={<PanelLink onClick={() => onNavigate('results')}>View all</PanelLink>} bodyClassName="">
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
                      <td className="text-right font-medium whitespace-nowrap">{formatResult(r, unit)}</td>
                      <td>
                        <StatusPill band={bandOf(r)} />
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
                <p className="text-sm text-muted-foreground">A summary of all your test results to show your doctor.</p>
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

function TestCard({ kind, results, unit, selected, onSelect }: { kind: TestKind; results: TestResult[]; unit: Unit; selected: boolean; onSelect: () => void }) {
  const def = TESTS[kind]
  const latest = results.at(-1)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex min-w-0 flex-col items-start gap-1 rounded-2xl bg-card px-4 py-3 text-left ring-1 transition',
        selected ? 'ring-2 ring-primary' : 'ring-foreground/10 hover:ring-foreground/25',
      )}
    >
      <span className="text-sm font-medium text-muted-foreground">{def.name}</span>
      {latest ? (
        <>
          <span className="text-xl font-semibold tracking-tight">
            {formatNumber(latest, unit)} <span className="text-sm font-normal text-muted-foreground">{def.unit(unit)}</span>
          </span>
          <StatusPill band={bandOf(latest)} />
        </>
      ) : (
        <span className="text-sm text-muted-foreground">No result yet</span>
      )}
    </button>
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
  const bookedTest = booking ? TESTS[booking.test ?? 'fbs'] : null
  const bookedCard = booking && bookedTest && (
    <div className={cn(box, 'bg-accent text-accent-foreground')}>
      <CalendarCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">{bookedTest.name} test booked:</span> {booking.labName}, {formatDate(booking.date, { weekday: 'short', day: 'numeric', month: 'short' })} at {booking.slot}
        {booking.homeSampling ? ' (home sample collection)' : ''}.{bookedTest.fasting ? ' Do not eat for 8 to 12 hours before the test.' : ''}
      </p>
    </div>
  )
  // The most urgent reminder is covered by the booking when it is for the same test.
  if (booking && (booking.test ?? 'fbs') === reminder.kind) return bookedCard

  const noun = TESTS[reminder.kind].noun
  if (reminder.status === 'upcoming') {
    return (
      <div className="space-y-3">
        {bookedCard}
        <div className={cn(box, 'bg-card ring-1 ring-foreground/10')}>
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-accent-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p>
              <span className="font-semibold">Next checkup ({noun}):</span> {formatDate(toIso(reminder.dueDate))} (in {reminder.daysUntil} days). {reminder.reason}.
            </p>
            <div className="-ml-2">
              <RemindMe alerts={alerts} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const overdue = reminder.status === 'overdue'
  return (
    <div className="space-y-3">
      {bookedCard}
      <div className={cn(box, 'flex-wrap items-center', overdue ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900')}>
        <BellRing className="size-5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">
            You are due for your {reminder.intervalMonths}-month routine {noun} checkup.
          </span>{' '}
          {overdue ? `Overdue by ${Math.abs(reminder.daysUntil)} days.` : reminder.reason + '.'}
        </p>
        <div className="flex items-center gap-1 max-sm:w-full max-sm:flex-col-reverse max-sm:items-stretch">
          <RemindMe alerts={alerts} />
          <button type="button" onClick={onFindLab} className={btn('primary')}>
            Find a lab
          </button>
        </div>
      </div>
    </div>
  )
}
