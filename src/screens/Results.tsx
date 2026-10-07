import { Panel, StatusPill } from '../components/Panel'
import { btn } from '../components/buttons'
import { PageHeader } from '../layout/PageHeader'
import { formatDate } from '../lib/dates'
import { categorize, toDisplay, unitLabel } from '../lib/glucose'
import type { Profile, TestResult, Unit } from '../lib/types'

interface Props {
  profile: Profile
  results: TestResult[]
  onAddResult: () => void
  onBack: () => void
}

const fmt = (mgdl: number, unit: Unit) => (unit === 'mmol' ? toDisplay(mgdl, 'mmol').toFixed(1) : String(toDisplay(mgdl, 'mgdl')))
const alt = (unit: Unit): Unit => (unit === 'mmol' ? 'mgdl' : 'mmol')

/** All results, newest first. */
export function Results({ profile, results, onAddResult, onBack }: Props) {
  const unit = profile.unit
  const rows = [...results].reverse()
  const change = (i: number) => {
    const prev = rows[i + 1]
    if (!prev) return '—'
    const d = toDisplay(rows[i].valueMgDl, unit) - toDisplay(prev.valueMgDl, unit)
    const s = unit === 'mmol' ? Math.abs(d).toFixed(1) : String(Math.abs(Math.round(d)))
    return d > 0 ? `+${s}` : d < 0 ? `−${s}` : '0'
  }

  return (
    <>
      <PageHeader
        screen="results"
        onBack={onBack}
        actions={
          <>
            <button type="button" onClick={() => window.print()} className={btn('secondary')} disabled={results.length === 0}>
              Print
            </button>
            <button type="button" onClick={onAddResult} className={btn('primary')}>
              Add result
            </button>
          </>
        }
        mobileActions={
          <button type="button" onClick={onAddResult} className={btn('primary', 'sm')}>
            Add
          </button>
        }
      />

      <div className="max-lg:px-4 max-lg:pt-4">
        {results.length === 0 ? (
          <Panel title="Results">
            <p>No results on record yet.</p>
            <button type="button" onClick={onAddResult} className={`${btn('primary')} mt-3`}>
              Add your first result
            </button>
          </Panel>
        ) : (
          <>
            {/* Desktop and print */}
            <Panel title={`${results.length} results`} bodyClassName="" className="max-lg:hidden print:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground [&_th]:px-5 [&_th]:py-2 [&_th]:font-normal">
                    <th>Date</th>
                    <th>Lab</th>
                    <th>Source</th>
                    <th className="text-right">{unitLabel(unit)}</th>
                    <th className="text-right">{unitLabel(alt(unit))}</th>
                    <th className="text-right">Change</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-2.5 [&_tr]:border-t [&_tr]:border-border">
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                      <td>{r.lab ?? '—'}</td>
                      <td className="text-muted-foreground">{r.source === 'founda' ? 'Imported' : 'Added by you'}</td>
                      <td className="text-right font-semibold">{fmt(r.valueMgDl, unit)}</td>
                      <td className="text-right text-muted-foreground">{fmt(r.valueMgDl, alt(unit))}</td>
                      <td className="text-right">{change(i)}</td>
                      <td>
                        <StatusPill category={categorize(r.valueMgDl)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* Mobile */}
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 lg:hidden print:hidden">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{formatDate(r.date)}</div>
                    <div className="truncate text-sm text-muted-foreground">{r.lab ?? 'Lab not recorded'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mb-1 text-base font-semibold">
                      {fmt(r.valueMgDl, unit)} <span className="text-xs font-normal text-muted-foreground">{unitLabel(unit)}</span>
                    </div>
                    <StatusPill category={categorize(r.valueMgDl)} />
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-muted-foreground">
              Normal: below 5.6 mmol/L (100 mg/dL). Prediabetes: 5.6 to 6.9 mmol/L (100 to 125 mg/dL). Diabetes range: 7.0 mmol/L (126 mg/dL) or higher.
            </p>
          </>
        )}
      </div>
    </>
  )
}
