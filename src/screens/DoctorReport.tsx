import { useState, type ReactNode } from 'react'
import { Logo } from '../components/Logo'
import { StatusPill } from '../components/Panel'
import { RichText } from '../components/RichText'
import { TrendChart } from '../components/TrendChart'
import { btn } from '../components/buttons'
import { PageHeader } from '../layout/PageHeader'
import { formatDate, toIso, today } from '../lib/dates'
import { categorize, formatValue, toDisplay } from '../lib/glucose'
import { bmi, type Insight } from '../lib/intelligence'
import type { RiskResult } from '../lib/risk'
import type { Profile, TestResult } from '../lib/types'
import { buildContext, streamCoach } from '../services/ai'

interface Props {
  profile: Profile
  results: TestResult[]
  insight: Insight | null
  risk: RiskResult
  aiEnabled: boolean
  onBack: () => void
}

export function DoctorReport({ profile, results, insight, risk, aiEnabled, onBack }: Props) {
  const [note, setNote] = useState<string | null>(null)
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const latest = results.at(-1)
  const b = bmi(profile)
  const todayIso = toIso(today())

  const questions = [
    latest && categorize(latest.valueMgDl) !== 'normal' ? 'Should I have an HbA1c test to confirm these results?' : 'How often should I repeat my fasting blood sugar test?',
    'Are there changes to my diet or activity you would prioritise for me?',
    risk.score >= 12 ? 'Given my risk score, should I be screened for blood pressure and cholesterol too?' : 'Is there anything else I should be screened for at my age?',
  ]

  async function generateNote() {
    setNoteBusy(true)
    setNoteError(null)
    setNote('')
    try {
      await streamCoach(
        { mode: 'doctor', context: buildContext(profile, results, insight, risk), messages: [{ role: 'user', content: 'Write the clinical handover note.' }] },
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
      `Fasting blood sugar history:`,
      ...results.map((r) => `• ${formatDate(r.date)}: ${Math.round(r.valueMgDl)} mg/dL (${toDisplay(r.valueMgDl, 'mmol').toFixed(1)} mmol/L)${r.lab ? `, ${r.lab}` : ''}`),
      insight ? `Trend: ${insight.headline}.` : '',
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
              <Logo markClassName="size-6" className="text-primary" />
              <h2 className="mt-1 text-lg font-semibold">Fasting blood sugar summary</h2>
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

          <Section title="Trend">
            {results.length >= 2 ? <TrendChart results={results} unit={profile.unit} className="h-52" /> : <p className="text-muted-foreground">Not enough results for a trend yet.</p>}
          </Section>

          <Section title="Results">
            <table className="w-full text-left text-sm print:text-xs">
              <thead>
                <tr className="border-b border-foreground [&_th]:py-1 [&_th]:pr-3">
                  <th>Date</th>
                  <th className="max-sm:hidden print:table-cell">Lab</th>
                  <th className="text-right">mg/dL</th>
                  <th className="text-right">mmol/L</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_td]:pr-3 print:[&_td]:py-[2px]">
                {[...results].reverse().map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="max-sm:hidden print:table-cell">{r.lab ?? '—'}</td>
                    <td className="text-right">{Math.round(r.valueMgDl)}</td>
                    <td className="text-right">{toDisplay(r.valueMgDl, 'mmol').toFixed(1)}</td>
                    <td>
                      <StatusPill category={categorize(r.valueMgDl)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Summary">
            <ul className="list-disc space-y-1 pl-5 text-sm print:text-xs">
              <li>
                Latest result: <b>{latest ? formatValue(latest.valueMgDl, profile.unit) : 'none'}</b>
                {latest && ` on ${formatDate(latest.date)}`}.
              </li>
              {insight && <li>Trend: {insight.headline}.</li>}
              <li>
                FINDRISC diabetes risk score: <b>{risk.score}/26</b> ({risk.band}), a 10-year risk of {risk.tenYearRisk.replace('≈', 'about ')}.
              </li>
            </ul>
          </Section>

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
                  {insight ? `${insight.headline}. ${insight.explanation}` : 'No trend analysis yet.'}
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
