import { useEffect, useMemo, useState } from 'react'
import { InsightCard } from './components/InsightCard'
import { Sheet } from './components/Sheet'
import { btn } from './components/buttons'
import { navItem, type Screen } from './layout/nav'
import { Shell } from './layout/Shell'
import { toIso, today } from './lib/dates'
import { analyze, sortByDate, type Insight } from './lib/intelligence'
import { allCheckups } from './lib/reminders'
import { defaultRiskInputs, findrisc, type RiskInputs } from './lib/risk'
import { clearAll, usePersistentState } from './lib/store'
import { formatResult, kindOf, normalizeResults, TEST_KINDS, TESTS } from './lib/tests'
import type { Lab, Profile, TestKind, TestResult } from './lib/types'
import { AddResult } from './screens/AddResult'
import { BookTest, type Booking } from './screens/BookTest'
import { Coach } from './screens/Coach'
import { Dashboard } from './screens/Dashboard'
import { DoctorReport } from './screens/DoctorReport'
import { Landing } from './screens/Landing'
import { Labs } from './screens/Labs'
import { Onboarding } from './screens/Onboarding'
import { ProfileScreen } from './screens/ProfileScreen'
import { Results } from './screens/Results'
import { Risk } from './screens/Risk'
import { aiStatus } from './services/ai'
import { notifyPermission, reminderMessage, requestNotifyPermission, showNotification, type NotifyPermission, type ReminderAlerts } from './services/notifications'

const KEYS = {
  profile: 'lablink.profile',
  results: 'lablink.results',
  booking: 'lablink.booking',
  risk: 'lablink.risk',
  chat: 'lablink.chat',
  notify: 'lablink.notify',
}

const HOUR_MS = 60 * 60 * 1000

export default function App() {
  const [profile, setProfile] = usePersistentState<Profile | null>(KEYS.profile, null)
  const [rawResults, setResults] = usePersistentState<TestResult[]>(KEYS.results, [])
  const [booking, setBooking] = usePersistentState<Booking | null>(KEYS.booking, null)
  const [riskInputs, setRiskInputs] = usePersistentState<RiskInputs | null>(KEYS.risk, null)
  const [screen, setScreen] = useState<Screen>('home')
  const [adding, setAdding] = useState(false)
  const [bookingLab, setBookingLab] = useState<Lab | null>(null)
  const [revealed, setRevealed] = useState<TestResult[] | null>(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [coachQuestion, setCoachQuestion] = useState<string | null>(null)
  /** The test the dashboard and Coach are focused on. */
  const [focus, setFocus] = useState<TestKind>('fbs')
  // Public homepage: shown first to new visitors, and after a reset.
  const [landing, setLanding] = useState(() => profile === null)
  const [notify, setNotify] = usePersistentState<{ enabled: boolean; lastShown?: string }>(KEYS.notify, { enabled: false })
  const [permission, setPermission] = useState<NotifyPermission>(notifyPermission)

  useEffect(() => {
    aiStatus().then(setAiEnabled)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen, landing])

  useEffect(() => {
    document.title = landing ? 'LabLink' : profile ? `${navItem(screen).label} · LabLink` : 'Enrol · LabLink'
  }, [screen, profile, landing])

  // normalizeResults also upgrades results saved by older versions (fasting blood sugar only).
  const results = useMemo(() => sortByDate(normalizeResults(rawResults)), [rawResults])
  const insights = useMemo(
    () => Object.fromEntries(TEST_KINDS.map((k) => [k, profile ? analyze(results, profile, k) : null])) as Record<TestKind, Insight | null>,
    [results, profile],
  )
  const reminders = useMemo(() => allCheckups(results, insights), [results, insights])
  const reminder = reminders[0]
  const effectiveRiskInputs = riskInputs ?? (profile ? defaultRiskInputs(profile) : null)
  const risk = useMemo(() => (profile && effectiveRiskInputs ? findrisc(profile, effectiveRiskInputs, results) : null), [profile, effectiveRiskInputs, results])
  // A booking only matters until its date has passed.
  const activeBooking = booking && booking.date >= toIso(today()) ? booking : null
  const reminderBooked = activeBooking !== null && (activeBooking.test ?? 'fbs') === reminder.kind

  // Remind once a day while a checkup is due and not yet booked: on open, then hourly while open.
  const remindable = profile !== null && notify.enabled && permission === 'granted' && !reminderBooked
  const message = reminderMessage(reminder)
  useEffect(() => {
    if (!remindable || !message) return
    const check = () => {
      const day = toIso(today())
      if (notify.lastShown === day) return
      showNotification(message.title, message.body)
      setNotify((n) => ({ ...n, lastShown: day }))
    }
    check()
    const timer = setInterval(check, HOUR_MS)
    return () => clearInterval(timer)
  }, [remindable, message?.body, notify.lastShown]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tapping a notification focuses LabLink and opens the screen it points at.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'lablink:open') return
      setLanding(false)
      setScreen(e.data.screen === 'labs' ? 'labs' : 'home')
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  const alerts: ReminderAlerts = {
    permission,
    enabled: notify.enabled && permission === 'granted',
    onEnable: async () => {
      const p = await requestNotifyPermission()
      setPermission(p)
      if (p === 'granted') setNotify({ enabled: true })
    },
    onDisable: () => setNotify({ enabled: false }),
    onTest: () => showNotification('LabLink: reminders are on', message?.body ?? 'We will remind you here when your next checkup is due.'),
  }

  if (landing) {
    return <Landing member={profile !== null} memberName={profile?.name} onEnrol={() => setLanding(false)} onLogin={() => setLanding(false)} />
  }

  if (!profile || !risk || !effectiveRiskInputs) {
    return (
      <Shell profile={null} screen="home" onNavigate={() => {}}>
        <Onboarding
          onDone={(p, r) => {
            setProfile(p)
            setResults(r)
          }}
        />
      </Shell>
    )
  }

  const askCoach = (question: string) => {
    setCoachQuestion(question)
    setScreen('coach')
  }
  const goHome = () => setScreen('home')
  const revealedInsight = revealed ? insights[kindOf(revealed[0])] : null

  return (
    <Shell
      profile={profile}
      screen={screen}
      onNavigate={setScreen}
      labsBadge={reminder.status !== 'upcoming' && !reminderBooked}
      latest={results.at(-1)}
      reminder={reminder}
      booking={activeBooking}
      onAddResult={() => setAdding(true)}
      onPublicHome={() => setLanding(true)}
    >
      <div key={screen}>
        {screen === 'home' && (
          <Dashboard
            profile={profile}
            results={results}
            insights={insights}
            reminder={reminder}
            booking={activeBooking}
            risk={risk}
            focus={focus}
            onFocus={setFocus}
            onFindLab={() => setScreen('labs')}
            onAddResult={() => setAdding(true)}
            onOpenRisk={() => setScreen('risk')}
            onOpenReport={() => setScreen('report')}
            onAskCoach={askCoach}
            onNavigate={setScreen}
            alerts={alerts}
          />
        )}
        {screen === 'results' && <Results profile={profile} results={results} onAddResult={() => setAdding(true)} onBack={goHome} />}
        {screen === 'coach' && (
          <Coach
            profile={profile}
            results={results}
            insights={insights}
            focus={focus}
            risk={risk}
            aiEnabled={aiEnabled}
            pendingQuestion={coachQuestion}
            onPendingConsumed={() => setCoachQuestion(null)}
          />
        )}
        {screen === 'labs' && <Labs onBack={goHome} onBook={setBookingLab} />}
        {screen === 'risk' && <Risk profile={profile} results={results} inputs={effectiveRiskInputs} onInputsChange={setRiskInputs} onBack={goHome} onAskCoach={askCoach} />}
        {screen === 'report' && <DoctorReport profile={profile} results={results} insights={insights} risk={risk} aiEnabled={aiEnabled} onBack={goHome} />}
        {screen === 'profile' && (
          <ProfileScreen
            profile={profile}
            results={results}
            onChange={setProfile}
            onDeleteResult={(id) => setResults((rs) => rs.filter((r) => r.id !== id))}
            alerts={alerts}
            onReset={() => {
              clearAll(Object.values(KEYS))
              setProfile(null)
              setResults([])
              setBooking(null)
              setRiskInputs(null)
              setNotify({ enabled: false })
              setScreen('home')
              setLanding(true)
            }}
          />
        )}
      </div>

      {adding && (
        <AddResult
          unit={profile.unit}
          defaultLab={activeBooking?.labName}
          defaultKind={activeBooking?.test ?? focus}
          aiEnabled={aiEnabled}
          existing={results}
          onClose={() => setAdding(false)}
          onSave={(added) => {
            setResults((rs) => [...rs, ...added])
            if (activeBooking && added.some((r) => kindOf(r) === (activeBooking.test ?? 'fbs'))) setBooking(null)
            setFocus(kindOf(added[0]))
            setAdding(false)
            setRevealed(added)
            setScreen('home')
          }}
        />
      )}

      {bookingLab && (
        <BookTest
          lab={bookingLab}
          profile={profile}
          defaultKind={reminder.kind}
          onClose={() => {
            setBookingLab(null)
            if (booking) setScreen('home')
          }}
          onConfirm={setBooking}
        />
      )}

      {revealed && revealedInsight && (
        <Sheet
          title="Result analysed"
          onClose={() => setRevealed(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRevealed(null)
                  askCoach(`I just got a new ${TESTS[revealedInsight.kind].measure} result. ${revealedInsight.headline}. What exactly should I do over the next 3 months?`)
                }}
                className={btn('secondary', 'lg')}
              >
                Ask the Coach
              </button>
              <button type="button" onClick={() => setRevealed(null)} className={btn('primary', 'lg')}>
                Done
              </button>
            </div>
          }
        >
          <p className="mb-3 border-b border-border pb-3 text-muted-foreground">
            {revealed.length === 1 ? (
              <>
                New {TESTS[kindOf(revealed[0])].measure} result: <b className="text-foreground">{formatResult(revealed[0], profile.unit)}</b>
              </>
            ) : (
              <>{revealed.length} new results</>
            )}
            , compared with {results.length} results on record.
          </p>
          <InsightCard insight={revealedInsight} />
        </Sheet>
      )}
    </Shell>
  )
}
