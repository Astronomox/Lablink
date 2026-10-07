import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
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
            <button type="button" onClick={clear} className={btn('ghost', 'sm')}>
              Clear
            </button>
          )
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-5">
        <section
          className="lg:flex lg:h-[clamp(460px,calc(100dvh-300px),720px)] lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-foreground/10"
          aria-label="Conversation"
        >
          <div ref={listRef} role="log" aria-live="polite" className="flex flex-col gap-3 px-4 pt-2 pb-24 lg:flex-1 lg:overflow-y-auto lg:p-5">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 lg:p-0 lg:ring-0">
                <p className="font-semibold">Ask a question about your results</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The Coach can see your {results.length} results{risk ? ` and your risk score (${risk.score}/26)` : ''}. It does not replace a doctor.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className={`${btn('secondary')} h-auto py-2 whitespace-normal text-left`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {streaming ? <Bubble role="assistant" text={streaming} /> : busy && <p className="text-sm text-muted-foreground">The Coach is typing…</p>}
            <div ref={endRef} className="scroll-mb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+5rem)]" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
            className="bottom-tabbar fixed inset-x-0 z-30 flex gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:static lg:z-auto"
          >
            <label htmlFor="coach-input" className="sr-only">
              Your question
            </label>
            <Input id="coach-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question" autoComplete="off" className="h-10 flex-1" />
            {busy && aiEnabled ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className={btn('secondary', 'lg')}>
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!draft.trim() || busy} className={btn('primary', 'lg')}>
                Send
              </button>
            )}
          </form>
        </section>

        <aside className="space-y-4 max-lg:hidden" aria-label="What the Coach can see">
          <Panel title="What the Coach can see" bodyClassName="">
            <table className="w-full text-sm">
              <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-5 [&_td]:py-2.5 [&_td]:align-top [&_td:first-child]:pr-0">
                <tr>
                  <td className="text-muted-foreground">Latest</td>
                  <td>{latest ? `${formatValue(latest.valueMgDl, profile.unit)}, ${formatDate(latest.date)}` : 'None'}</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Trend</td>
                  <td>{insight ? insight.headline : 'Not enough results'}</td>
                </tr>
                {risk && (
                  <tr>
                    <td className="text-muted-foreground">Risk</td>
                    <td>
                      {risk.score}/26 ({risk.band})
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="text-muted-foreground">Profile</td>
                  <td>
                    {profile.age}, {profile.sex}
                    {b ? `, BMI ${b}` : ''}
                    {profile.familyHistory ? ', family history' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
          <p className="px-1 text-xs text-muted-foreground">
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
        <div className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">{text}</div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-muted px-4 py-3 lg:max-w-[80%]">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Coach</p>
        <RichText text={text} />
      </div>
    </div>
  )
}
