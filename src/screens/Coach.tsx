import { useEffect, useRef, useState } from 'react'
import { Panel } from '../components/Panel'
import { RichText } from '../components/RichText'
import { btn } from '../components/buttons'
import { PageHeader } from '../layout/PageHeader'
import { isDesktopNow } from '../layout/useMedia'
import { formatDate } from '../lib/dates'
import { formatValue } from '../lib/glucose'
import { bmi, type Insight } from '../lib/intelligence'
import { offlineReply } from '../lib/offlineCoach'
import type { RiskResult } from '../lib/risk'
import { usePersistentState } from '../lib/store'
import type { Profile, TestResult } from '../lib/types'
import { buildContext, streamCoach, type ChatMessage } from '../services/ai'

interface Props {
  profile: Profile
  results: TestResult[]
  insight: Insight | null
  risk: RiskResult | null
  aiEnabled: boolean
  /** Question handed over from another screen; sent once on arrival. */
  pendingQuestion: string | null
  onPendingConsumed: () => void
}

const SUGGESTIONS = [
  'Why is my blood sugar going up?',
  'What Nigerian foods should I swap?',
  'How worried should I be about my results?',
  'Make me a 7-day plan to bring it down',
]

export function Coach({ profile, results, insight, risk, aiEnabled, pendingQuestion, onPendingConsumed }: Props) {
  const [messages, setMessages] = usePersistentState<ChatMessage[]>('lablink.chat', [])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Desktop: the conversation scrolls inside its box; mobile: the page scrolls.
    if (isDesktopNow()) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    else endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  // Ref guard: StrictMode re-runs effects in dev, which would send the question twice.
  const consumedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!pendingQuestion || consumedRef.current === pendingQuestion) return
    consumedRef.current = pendingQuestion
    onPendingConsumed()
    send(pendingQuestion)
  }, [pendingQuestion]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setDraft('')
    setBusy(true)

    let reply: string
    if (aiEnabled) {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStreaming('')
      let partial = ''
      const onText = (t: string) => {
        partial = t
        setStreaming(t)
      }
      try {
        reply = await streamCoach({ context: buildContext(profile, results, insight, risk), messages: next }, onText, ctrl.signal)
      } catch (err) {
        reply = ctrl.signal.aborted
          ? `${partial} …`
          : `${offlineReply(question, profile, results, insight, risk)}\n\n(AI unavailable: ${(err as Error).message} Showing a built-in answer.)`
      }
      setStreaming(null)
    } else {
      await new Promise((r) => setTimeout(r, 450))
      reply = offlineReply(question, profile, results, insight, risk)
    }
    setMessages([...next, { role: 'assistant', content: reply.trim() || '…' }])
    setBusy(false)
  }

  const status = aiEnabled ? 'Answers use your results and risk score.' : 'Offline: answers come from built-in guidance.'
  const clear = () => setMessages([])
  const latest = results.at(-1)
  const b = bmi(profile)

  return (
    <>
      <PageHeader
        screen="coach"
        description={status}
        stickyMobile
        actions={
          messages.length > 0 && (
            <button type="button" onClick={clear} className={btn('secondary')}>
              Clear chat
            </button>
          )
        }
        mobileActions={
          messages.length > 0 && (
            <button type="button" onClick={clear} className="text-[14px] text-brand-600">
              Clear
            </button>
          )
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-5">
        <section className="lg:panel lg:flex lg:h-[clamp(460px,calc(100dvh-300px),720px)] lg:flex-col" aria-label="Conversation">
          <div ref={listRef} role="log" aria-live="polite" className="flex flex-col gap-3 px-4 pt-4 pb-20 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:pt-3 lg:pb-3">
            {messages.length === 0 && (
              <div className="rounded-lg border border-rule-soft bg-white p-4 lg:rounded-none lg:border-0 lg:p-1">
                <p className="font-bold">Ask a question about your results</p>
                <p className="mt-1 text-[13px] text-muted">
                  The Coach can see your {results.length} results{risk ? ` and your risk score (${risk.score}/26)` : ''}. It does not replace a doctor.
                </p>
                <ul className="mt-3 divide-y divide-rule-soft border-y border-rule-soft">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => send(s)} className="w-full py-2.5 text-left text-brand-600 hover:underline">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {streaming ? <Bubble role="assistant" text={streaming} /> : busy && <p className="text-[13px] text-muted">The Coach is typing…</p>}
            <div ref={endRef} className="scroll-mb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+4.5rem)]" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
            className="bottom-tabbar fixed inset-x-0 z-30 flex gap-2 border-t border-rule bg-white px-3 py-2 lg:static lg:z-auto lg:bg-vellum"
          >
            <label htmlFor="coach-input" className="sr-only">
              Your question
            </label>
            <input
              id="coach-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your question"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-[3px] border border-rule bg-white px-3 py-2 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 max-lg:rounded-full max-lg:px-4 max-lg:text-[16px]"
            />
            {busy && aiEnabled ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className={`${btn('secondary')} max-lg:rounded-full`}>
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!draft.trim() || busy} className={`${btn('primary')} max-lg:rounded-full max-lg:px-4`}>
                Send
              </button>
            )}
          </form>
        </section>

        <aside className="space-y-4 max-lg:hidden" aria-label="What the Coach can see">
          <Panel title="What the Coach can see" bodyClassName="">
            <table className="w-full text-[13px]">
              <tbody className="[&_td]:border-b [&_td]:border-rule-soft [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_tr:last-child_td]:border-b-0">
                <tr>
                  <td className="text-muted">Latest</td>
                  <td>{latest ? `${formatValue(latest.valueMgDl, profile.unit)}, ${formatDate(latest.date)}` : 'None'}</td>
                </tr>
                <tr>
                  <td className="text-muted">Trend</td>
                  <td>{insight ? insight.headline : 'Not enough results'}</td>
                </tr>
                {risk && (
                  <tr>
                    <td className="text-muted">Risk</td>
                    <td>
                      {risk.score}/26 ({risk.band})
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="text-muted">Profile</td>
                  <td>
                    {profile.age}, {profile.sex}
                    {b ? `, BMI ${b}` : ''}
                    {profile.familyHistory ? ', family history' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
          <p className="text-[12px] text-muted">
            {aiEnabled ? 'Your data is sent to the AI service only when you ask a question.' : 'Offline mode: nothing leaves this device.'} The Coach does not diagnose or prescribe. See a doctor
            promptly for extreme thirst, blurred vision or unexplained weight loss.
          </p>
        </aside>
      </div>
    </>
  )
}

function Bubble({ role, text }: { role: ChatMessage['role']; text: string }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[3px] bg-brand-600 px-3 py-2 text-white max-lg:rounded-2xl max-lg:rounded-br-md max-lg:px-4">{text}</div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-[3px] border border-rule bg-white px-3 py-2 max-lg:rounded-2xl max-lg:rounded-bl-md max-lg:border-rule-soft max-lg:px-4">
        <p className="mb-1 text-[12px] font-bold text-muted">Coach</p>
        <RichText text={text} />
      </div>
    </div>
  )
}
