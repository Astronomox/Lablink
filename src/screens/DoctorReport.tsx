import { useState, type ReactNode } from 'react'
import { Logo } from '../components/Logo'
import { StatusPill } from '../components/Panel'
import { RichText } from '../components/RichText'
import { TrendChart } from '../components/TrendChart'
import { btn } from '../components/buttons'
import { PageHeader } from '../layout/PageHeader'
import { formatDate, toIso, today } from '../lib/dates'
import type { Insight } from '../lib/intelligence'
import { bmi } from '../lib/profile'
import { bandOf, formatResult, resultsOf, TEST_KINDS, TESTS } from '../lib/tests'
import type { RiskResult } from '../lib/risk'
import type { Profile, TestKind, TestResult } from '../lib/types'
import { buildContext, streamCoach } from '../services/ai'

interface Props {
  profile: Profile
  results: TestResult[]
  insights: Record<TestKind, Insight | null>
  risk: RiskResult
  aiEnabled: boolean
  onBack: () => void
}

export function DoctorReport({ profile, results, insights, risk, aiEnabled, onBack }: Props) {
  const [note, setNote] = useState<string | null>(null)
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const tested = TEST_KINDS.filter((k) => resultsOf(results, k).length > 0)
  const flagged = tested.filter((k) => (insights[k]?.band.level ?? 0) > 0)
  const b = bmi(profile)
  const todayIso = toIso(today())

  const questions = [
    flagged.length ? `My ${flagged.map((k) => TESTS[k].measure).join(' and ')} ${flagged.length > 1 ? 'are' : 'is'} above normal. What follow-up tests do I need?` : 'How often should I repeat these tests?',
    'Are there changes to my diet or activity you would prioritise for me?',
    risk.score >= 12 ? 'Given my risk score, should I be screened for blood pressure and cholesterol too?' : 'Is there anything else I should be screened for at my age?',
  ]

  async function generateNote() {
    setNoteBusy(true)
    setNoteError(null)
    setNote('')
    try {
      await streamCoach(
        { mode: 'doctor', context: buildContext(profile, results, insights, risk), messages: [{ role: 'user', content: 'Write the clinical handover note.' }] },
        setNote,
      )
    } catch (err) {
      setNote(null)
      setNoteError((err as Error).message)
    }
    setNoteBusy(false)
  }

  function summaryText(): string {
    return [
      `LabLink health summary: ${profile.name}, ${profile.age}, ${profile.sex}`,
      ...tested.flatMap((k) => [
        `${TESTS[k].name}:`,
        ...resultsOf(results, k).map((r) => `• ${formatDate(r.date)}: ${formatResult(r, profile.unit)} (${bandOf(r).label})${r.lab ? `, ${r.lab}` : ''}`),
        insights[k] ? `  Trend: ${insights[k]?.headline}.` : '',
      ]),
      `FINDRISC risk score: ${risk.score}/26 (${risk.band}, ${risk.tenYearRisk} 10-year risk).`,
      note ? `\n${note}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  async function share() {
    const text = summaryText()
    try {
      if (navigator.share) {
        await navigator.share({ title: 'LabLink health summary', text })
        return
      }
    } catch {
      /* user cancelled or share failed; fall back to copy */
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const buttons = (size: 'md' | 'lg') => (
    <>
      <button type="button" onClick={share} className={btn('secondary', size)}>
        {copied ? 'Copied' : 'Share'}
      </button>
      <button type="button" onClick={() => window.print()} className={btn('primary', size)}>
        Print / PDF
      </button>
    </>
  )

  return (
    <>
      <PageHeader screen="report" onBack={onBack} actions={buttons('md')} />

      <div className="max-lg:px-4 max-lg:pt-4 print:p-0">
        <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden print:hidden">{buttons('lg')}</div>

        <article aria-label="Doctor’s summary" className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 lg:p-10 print:rounded-none print:p-0 print:ring-0">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-foreground pb-3">
            <div>
              <Logo className="h-8" />
              <h2 className="mt-1 text-lg font-semibold">Lab results summary</h2>
            </div>
            <p className="text-right text-sm">
              Date: {formatDate(todayIso, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </header>

          <p className="mt-3 text-sm">
            <b>Patient:</b> {profile.name}, {profile.age} years, {profile.sex === 'male' ? 'male' : 'female'}
            {b ? `, BMI ${b}` : ''}
            {profile.familyHistory ? ', family history of diabetes' : ''}
          </p>

          <Section title="Summary">
            <ul className="list-disc space-y-1 pl-5 text-sm print:text-xs">
              {tested.map((k) => {
                const latest = resultsOf(results, k).at(-1)!
                return (
                  <li key={k}>
                    {TESTS[k].name}: <b>{formatResult(latest, profile.unit)}</b> on {formatDate(latest.date)} ({bandOf(latest).label.toLowerCase()}){insights[k] ? `. ${insights[k]?.headline}.` : '.'}
                  </li>
                )
              })}
              <li>
                FINDRISC diabetes risk score: <b>{risk.score}/26</b> ({risk.band}), a 10-year risk of {risk.tenYearRisk.replace('≈', 'about ')}.
              </li>
            </ul>
          </Section>

          {tested.map((k) => {
            const own = resultsOf(results, k)
            return (
              <Section key={k} title={TESTS[k].name}>
                {own.length >= 2 && <TrendChart results={own} kind={k} unit={profile.unit} className="mb-2 h-40" />}
                <table className="w-full text-left text-sm print:text-xs">
                  <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_td]:pr-3 print:[&_td]:py-[2px]">
                    {[...own].reverse().map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="max-sm:hidden print:table-cell">{r.lab ?? '—'}</td>
                        <td className="text-right whitespace-nowrap">{formatResult(r, profile.unit)}</td>
                        <td>
                          <StatusPill band={bandOf(r)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )
          })}

          <Section
            title="Note"
            action={
              aiEnabled && !noteBusy ? (
                <button type="button" onClick={generateNote} className={`${btn('secondary', 'sm')} print:hidden`}>
                  {note ? 'Rewrite' : 'Write with AI'}
                </button>
              ) : null
            }
          >
            {noteBusy && !note && <p className="text-muted-foreground">Writing note…</p>}
            {note ? (
              <div className="text-sm print:text-xs">
                <RichText text={note} />
                <p className="mt-2 text-xs text-muted-foreground">Drafted by AI from LabLink data. Please check it.</p>
              </div>
            ) : (
              !noteBusy && (
                <p className="text-sm print:text-xs">
                  {tested.map((k) => insights[k]?.headline).filter(Boolean).join('. ') || 'No trend analysis yet.'}
                  {!aiEnabled && <span className="mt-1 block text-xs text-muted-foreground print:hidden">An AI-written clinical note (SBAR) needs the AI service, which is not set up.</span>}
                  {noteError && <span className="mt-1 block text-xs text-red-600 print:hidden">AI note unavailable: {noteError}</span>}
                </p>
              )
            )}
          </Section>

          <Section title="Questions for my doctor">
            <ol className="list-decimal space-y-1 pl-5 text-sm print:text-xs">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </Section>

          <p className="mt-6 border-t border-border pt-2 text-xs text-muted-foreground print:mt-3">
            Prepared by the patient using LabLink. Ranges use ADA fasting cut-offs (prediabetes 100 to 125 mg/dL, diabetes 126 mg/dL or higher). This is not a diagnosis.
          </p>
        </article>
      </div>
    </>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid print:mt-3">
      <h3 className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-1 text-sm font-semibold print:mb-1">
        {title}
        {action}
      </h3>
      {children}
    </section>
  )
}
