import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Panel, StatusPill } from '../components/Panel'
import { btn } from '../components/buttons'
import { PageHeader } from '../layout/PageHeader'
import { formatDate } from '../lib/dates'
import { bandOf, formatResult, kindOf, resultsOf, TEST_KINDS, TESTS } from '../lib/tests'
import type { Profile, TestKind, TestResult } from '../lib/types'

interface Props {
  profile: Profile
  results: TestResult[]
  onAddResult: () => void
  onBack: () => void
}

type Filter = TestKind | 'all'

/** All results, newest first, filterable by test. */
export function Results({ profile, results, onAddResult, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const unit = profile.unit
  const shown = (filter === 'all' ? results : resultsOf(results, filter)).slice().reverse()
  const filters: [Filter, string, number][] = [
    ['all', 'All', results.length],
    ...TEST_KINDS.map((k): [Filter, string, number] => [k, TESTS[k].name, resultsOf(results, k).length]),
  ]

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

      <div className="space-y-4 max-lg:px-4 max-lg:pt-4">
        <div role="group" aria-label="Show results for" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] print:hidden">
          {filters.map(([f, label, count]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 rounded-4xl px-4 py-2 text-sm font-medium whitespace-nowrap ring-1 transition-colors',
                filter === f ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-foreground/10 hover:bg-muted',
              )}
            >
              {label} <span className={filter === f ? 'text-primary-foreground/70' : 'text-muted-foreground'}>{count}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <Panel title="Results">
            <p className="text-muted-foreground">No {filter === 'all' ? '' : `${TESTS[filter].measure} `}results on record yet.</p>
            <button type="button" onClick={onAddResult} className={`${btn('primary')} mt-3`}>
              Add a result
            </button>
          </Panel>
        ) : (
          <>
            {/* Desktop and print */}
            <Panel title={`${shown.length} results`} bodyClassName="" className="max-lg:hidden print:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground [&_th]:px-5 [&_th]:py-2 [&_th]:font-normal">
                    <th>Date</th>
                    <th>Test</th>
                    <th className="text-right">Result</th>
                    <th>Status</th>
                    <th>Lab</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-2.5 [&_tr]:border-t [&_tr]:border-border">
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                      <td>{TESTS[kindOf(r)].name}</td>
                      <td className="text-right font-semibold whitespace-nowrap">{formatResult(r, unit)}</td>
                      <td>
                        <StatusPill band={bandOf(r)} />
                      </td>
                      <td>{r.lab ?? '—'}</td>
                      <td className="text-muted-foreground">{r.source === 'founda' ? 'Imported' : 'Added by you'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* Mobile */}
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 lg:hidden print:hidden">
              {shown.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{TESTS[kindOf(r)].name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {formatDate(r.date)}
                      {r.lab ? `, ${r.lab}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mb-1 text-base font-semibold whitespace-nowrap">{formatResult(r, unit)}</div>
                    <StatusPill band={bandOf(r)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
