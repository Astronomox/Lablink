import { useEffect, useState } from 'react'
import { InsightCard } from '../components/InsightCard'
import { Panel, PanelLink, StatusPill } from '../components/Panel'
import { TrendChart } from '../components/TrendChart'
import { btn } from '../components/buttons'
import type { Screen } from '../layout/nav'
import { PageHeader } from '../layout/PageHeader'
import { formatDate, toIso } from '../lib/dates'
import { categorize, formatValue, toDisplay, unitLabel } from '../lib/glucose'
import type { Insight } from '../lib/intelligence'
import type { Reminder } from '../lib/reminders'
import { MAX_FINDRISC, type RiskResult } from '../lib/risk'
import type { Profile, TestResult, Unit } from '../lib/types'
import { fetchRecommendations, type Recommendation } from '../services/healthfinder'
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
}

function signed(deltaMgDl: number, unit: Unit): string {
  const v = toDisplay(deltaMgDl, unit)
  const s = unit === 'mmol' ? Math.abs(v).toFixed(1) : String(Math.abs(Math.round(v)))
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s} ${unitLabel(unit)}`
}

export function Dashboard({ profile, results, insight, reminder, booking, risk, onFindLab, onAddResult, onOpenRisk, onOpenReport, onAskCoach, onNavigate }: Props) {
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
    <div className="space-y-4 max-lg:space-y-3 max-lg:px-4 max-lg:pt-4">
      <PageHeader screen="home" actions={actions} mobile={false} />

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-[15px]">
          Welcome, <b>{profile.name}</b>
        </p>
        <div className="flex gap-2">{actions}</div>
      </div>

      <CheckupNotice reminder={reminder} booking={booking} onFindLab={onFindLab} />

      {!latest ? (
        <Panel title="Results">
          <p>No results on record yet.</p>
          <button type="button" onClick={onAddResult} className={`${btn('primary')} mt-3`}>
            Add your first result
          </button>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 max-lg:gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Panel title="Latest result" bodyClassName="">
              <div className="px-4 py-3 lg:hidden">
                <p className="text-[30px] leading-none font-bold">
                  {formatValue(latest.valueMgDl, unit).replace(` ${unitLabel(unit)}`, '')} <span className="text-[15px] font-normal text-muted">{unitLabel(unit)}</span>
                </p>
                <p className="mt-2 text-[14px]">
                  <StatusPill category={categorize(latest.valueMgDl)} /> · {formatDate(latest.date)}
                  {latest.lab ? ` · ${latest.lab}` : ''}
                </p>
                {previous && <p className="text-[13px] text-muted">{signed(latest.valueMgDl - previous.valueMgDl, unit)} since last test</p>}
              </div>
              <table className="w-full text-[13px] max-lg:hidden">
                <tbody className="[&_td]:border-b [&_td]:border-rule-soft [&_td]:px-3 [&_td]:py-2 [&_tr:last-child_td]:border-b-0">
                  <tr>
                    <td className="text-muted">Fasting blood sugar</td>
                    <td className="text-right text-[16px] font-bold">{formatValue(latest.valueMgDl, unit)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Status</td>
                    <td className="text-right">
                      <StatusPill category={categorize(latest.valueMgDl)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Date</td>
                    <td className="text-right">{formatDate(latest.date)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Lab</td>
                    <td className="text-right">{latest.lab ?? '—'}</td>
                  </tr>
                  {previous && (
                    <tr>
                      <td className="text-muted">Change from last test</td>
                      <td className="text-right">{signed(latest.valueMgDl - previous.valueMgDl, unit)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>

            <Panel title={`Trend (${results.length} results)`}>
              {results.length >= 2 ? <TrendChart results={results} unit={unit} className="h-52" /> : <p className="text-muted">Add another result to see a trend.</p>}
            </Panel>
          </div>

          {insight && (
            <Panel title="Analysis">
              <InsightCard insight={insight} />
              <button type="button" onClick={() => onAskCoach(`${insight.headline}. What should I do next?`)} className={`${btn('secondary')} mt-3`}>
                Ask the Coach about this
              </button>
            </Panel>
          )}

          <div className="grid gap-4 max-lg:gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Panel title="Recent results" action={<PanelLink onClick={() => onNavigate('results')}>View all</PanelLink>} bodyClassName="">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-rule text-left text-muted [&_th]:px-3 [&_th]:py-1.5 [&_th]:font-normal max-lg:[&_th]:px-4">
                    <th>Date</th>
                    <th className="max-sm:hidden">Lab</th>
                    <th className="text-right">Result</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-3 [&_td]:py-1.5 [&_tr:nth-child(even)]:bg-vellum max-lg:[&_td]:px-4 max-lg:[&_td]:py-2">
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="max-sm:hidden">{r.lab ?? '—'}</td>
                      <td className="text-right whitespace-nowrap">{formatValue(r.valueMgDl, unit)}</td>
                      <td>
                        <StatusPill category={categorize(r.valueMgDl)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <div className="space-y-4 max-lg:space-y-3">
              <Panel title="Diabetes risk score" action={<PanelLink onClick={onOpenRisk}>Details</PanelLink>}>
                <p>
                  <b className="text-[18px]">{risk.score}</b> / {MAX_FINDRISC} <span className="capitalize">({risk.band})</span>
                </p>
                <p className="mt-1 text-[13px] text-muted">10-year risk of type 2 diabetes: {risk.tenYearRisk}.</p>
              </Panel>
              <Panel title="Doctor’s summary">
                <p className="text-[13px]">A one-page summary of your results to show your doctor.</p>
                <button type="button" onClick={onOpenReport} className={`${btn('secondary', 'sm')} mt-2`}>
                  Open summary
                </button>
              </Panel>
            </div>
          </div>
        </>
      )}

      <Panel title="Health information" action={recs && <span className="text-[11px] text-muted">{recs.live ? 'MyHealthfinder (ODPHP)' : 'MyHealthfinder (saved copy)'}</span>}>
        {!recs ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {recs.items.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function CheckupNotice({ reminder, booking, onFindLab }: { reminder: Reminder; booking: Booking | null; onFindLab: () => void }) {
  if (booking) {
    return (
      <div className="border border-brand-200 border-l-4 border-l-brand-600 bg-brand-50 px-3 py-2.5 max-lg:rounded-lg max-lg:px-4 max-lg:py-3">
        <b>Test booked:</b> {booking.labName}, {formatDate(booking.date, { weekday: 'short', day: 'numeric', month: 'short' })} at {booking.slot}
        {booking.homeSampling ? ' (home sample collection)' : ''}. Do not eat for 8 to 12 hours before the test.
      </div>
    )
  }
  if (reminder.status === 'upcoming') {
    return (
      <div className="border border-rule bg-white px-3 py-2.5 max-lg:rounded-lg max-lg:border-rule-soft max-lg:px-4 max-lg:py-3">
        <b>Next checkup:</b> {formatDate(toIso(reminder.dueDate))} (in {reminder.daysUntil} days). {reminder.reason}.
      </div>
    )
  }
  const overdue = reminder.status === 'overdue'
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border border-l-4 px-3 py-2.5 max-lg:rounded-lg max-lg:px-4 max-lg:py-3 ${overdue ? 'border-oxblood-600/30 border-l-oxblood-600 bg-oxblood-50' : 'border-ochre-500/40 border-l-ochre-500 bg-ochre-50'}`}>
      <div>
        <b>You are due for your {reminder.intervalMonths}-month routine blood sugar checkup.</b>{' '}
        {overdue ? `Overdue by ${Math.abs(reminder.daysUntil)} days.` : reminder.reason + '.'}
      </div>
      <button type="button" onClick={onFindLab} className={btn('primary', 'sm')}>
        Find a lab
      </button>
    </div>
  )
}
