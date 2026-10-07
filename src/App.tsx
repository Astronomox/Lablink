import { useEffect, useMemo, useState } from 'react'
import { InsightCard } from './components/InsightCard'
import { Sheet } from './components/Sheet'
import { btn } from './components/buttons'
import { navItem, type Screen } from './layout/nav'
import { Shell } from './layout/Shell'
import { toIso, today } from './lib/dates'
import { formatValue } from './lib/glucose'
import { analyze, sortByDate } from './lib/intelligence'
import { nextCheckup } from './lib/reminders'
import { defaultRiskInputs, findrisc, type RiskInputs } from './lib/risk'
import { clearAll, usePersistentState } from './lib/store'
import type { Lab, Profile, TestResult } from './lib/types'
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

const KEYS = { profile: 'lablink.profile', results: 'lablink.results', booking: 'lablink.booking', risk: 'lablink.risk', chat: 'lablink.chat' }

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
  // Public homepage: shown first to new visitors, and after a reset.
  const [landing, setLanding] = useState(() => profile === null)

  useEffect(() => {
    aiStatus().then(setAiEnabled)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen, landing])

  useEffect(() => {
    document.title = landing ? 'LabLink' : profile ? `${navItem(screen).label} · LabLink` : 'Enrol · LabLink'
  }, [screen, profile, landing])

  const results = useMemo(() => sortByDate(rawResults), [rawResults])
  const insight = useMemo(() => (profile ? analyze(results, profile) : null), [results, profile])
  const reminder = useMemo(() => nextCheckup(results, insight), [results, insight])
  const effectiveRiskInputs = riskInputs ?? (profile ? defaultRiskInputs(profile) : null)
  const risk = useMemo(() => (profile && effectiveRiskInputs ? findrisc(profile, effectiveRiskInputs, results) : null), [profile, effectiveRiskInputs, results])
  // A booking only matters until its date has passed.
  const activeBooking = booking && booking.date >= toIso(today()) ? booking : null

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

  return (
    <Shell
      profile={profile}
      screen={screen}
      onNavigate={setScreen}
      labsBadge={reminder.status !== 'upcoming' && !activeBooking}
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
            insight={insight}
            reminder={reminder}
            booking={activeBooking}
            risk={risk}
            onFindLab={() => setScreen('labs')}
            onAddResult={() => setAdding(true)}
            onOpenRisk={() => setScreen('risk')}
            onOpenReport={() => setScreen('report')}
            onAskCoach={askCoach}
            onNavigate={setScreen}
          />
        )}
        {screen === 'results' && <Results profile={profile} results={results} onAddResult={() => setAdding(true)} onBack={goHome} />}
        {screen === 'coach' && (
          <Coach
            profile={profile}
            results={results}
            insight={insight}
            risk={risk}
            aiEnabled={aiEnabled}
            pendingQuestion={coachQuestion}
            onPendingConsumed={() => setCoachQuestion(null)}
          />
        )}
        {screen === 'labs' && <Labs onBack={goHome} onBook={setBookingLab} />}
        {screen === 'risk' && <Risk profile={profile} results={results} inputs={effectiveRiskInputs} onInputsChange={setRiskInputs} onBack={goHome} onAskCoach={askCoach} />}
        {screen === 'report' && <DoctorReport profile={profile} results={results} insight={insight} risk={risk} aiEnabled={aiEnabled} onBack={goHome} />}
        {screen === 'profile' && (
          <ProfileScreen
            profile={profile}
            results={results}
            onChange={setProfile}
            onDeleteResult={(id) => setResults((rs) => rs.filter((r) => r.id !== id))}
            onReset={() => {
              clearAll(Object.values(KEYS))
              setProfile(null)
              setResults([])
              setBooking(null)
              setRiskInputs(null)
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
          aiEnabled={aiEnabled}
          existing={results}
          onClose={() => setAdding(false)}
          onSave={(added) => {
            setResults((rs) => [...rs, ...added])
            setBooking(null)
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
          onClose={() => {
            setBookingLab(null)
            if (booking) setScreen('home')
          }}
          onConfirm={setBooking}
        />
      )}

      {revealed && insight && (
        <Sheet
          title="Result analysed"
          onClose={() => setRevealed(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRevealed(null)
                  askCoach(`I just got a new result. ${insight.headline}. What exactly should I do over the next 3 months?`)
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
          <p className="mb-3 border-b border-rule-soft pb-3 text-muted">
            {revealed.length === 1 ? (
              <>
                New result: <b className="text-ink">{formatValue(revealed[0].valueMgDl, profile.unit)}</b>
              </>
            ) : (
              <>{revealed.length} new results</>
            )}
            , compared with {results.length} results on record.
          </p>
          <InsightCard insight={insight} />
        </Sheet>
      )}
    </Shell>
  )
}
