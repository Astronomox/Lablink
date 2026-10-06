import { Bot, Home, MapPin, Menu, User, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useModal } from '../components/useModal'
import { formatDate } from '../lib/dates'
import type { Reminder } from '../lib/reminders'
import type { Profile, TestResult } from '../lib/types'
import type { Booking } from '../screens/BookTest'
import { NAV, type Screen } from './nav'
import { ShellContext } from './shellContext'

interface Props {
  /** `null` while enrolling: no menus are shown. */
  profile: Profile | null
  screen: Screen
  onNavigate: (screen: Screen) => void
  labsBadge?: boolean
  latest?: TestResult
  reminder?: Reminder
  booking?: Booking | null
  onAddResult?: () => void
  /** Back to the public homepage. */
  onPublicHome?: () => void
  children: ReactNode
}

const TABS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'coach', label: 'Coach', icon: Bot },
  { id: 'labs', label: 'Labs', icon: MapPin },
  { id: 'profile', label: 'Profile', icon: User },
]

export function Shell({ profile, screen, onNavigate, labsBadge = false, latest, onAddResult, onPublicHome, children }: Props) {
  const [band, setBand] = useState<HTMLDivElement | null>(null)
  const [drawer, setDrawer] = useState(false)
  const member = profile !== null
  const go = (s: Screen) => {
    setDrawer(false)
    onNavigate(s)
  }

  return (
    <ShellContext.Provider value={{ band, navigate: go }}>
      <div className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        {/* Desktop */}
        <header className="hidden border-b border-rule bg-white lg:block print:hidden">
          <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5">
            <button type="button" onClick={() => member && go('home')} className="flex items-center gap-2">
              <Logo />
              <span className="text-[22px] font-bold text-brand-700">LabLink</span>
            </button>
            {member && (
              <div className="text-right text-[13px]">
                <div>
                  Welcome, <b>{profile.name}</b>
                </div>
                <div className="text-muted">{latest ? `Last result: ${formatDate(latest.date)}` : 'No results yet'}</div>
              </div>
            )}
          </div>
          {member && <MenuBar screen={screen} onNavigate={go} labsBadge={labsBadge} />}
        </header>

        {/* Mobile */}
        <header className="sticky top-0 z-40 bg-brand-700 pt-[env(safe-area-inset-top)] text-white lg:hidden print:hidden">
          <div className="flex h-12 items-center gap-2 px-2">
            {member ? (
              <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} className="grid size-10 place-items-center">
                <Menu size={22} />
              </button>
            ) : (
              <span className="w-2" />
            )}
            <span className="text-[18px] font-bold">LabLink</span>
          </div>
        </header>
        {member && drawer && (
          <Drawer
            profile={profile}
            screen={screen}
            labsBadge={labsBadge}
            onNavigate={go}
            onPublicHome={onPublicHome}
            onClose={() => setDrawer(false)}
          />
        )}

        <div ref={setBand} className="hidden lg:block print:hidden" />

        <div className="mx-auto w-full max-w-[1100px] flex-1 lg:px-5 lg:py-5 print:max-w-none print:p-0">
          <div className={member ? 'lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-5 print:block' : ''}>
            {member && (
              <aside className="hidden lg:block print:hidden" aria-label="Side menu">
                <SideMenu onNavigate={go} onAddResult={onAddResult} />
              </aside>
            )}
            <main id="main" tabIndex={-1} className={`min-w-0 outline-none ${member ? 'pb-tabbar' : 'pb-6'} lg:pb-0 print:p-0`}>
              {children}
            </main>
          </div>
        </div>

        <footer className={`border-t border-rule bg-white px-4 py-3 text-center text-[12px] text-muted print:hidden ${member ? 'max-lg:hidden' : ''}`}>
          {onPublicHome && (
            <>
              <button type="button" onClick={onPublicHome} className="text-brand-600 hover:underline">
                LabLink home
              </button>
              {' · '}
            </>
          )}
          © 2026 LabLink. For information only, not a diagnosis. Results are stored on this device. Data: Founda Health (FHIR), MyHealthfinder (ODPHP), OpenStreetMap.
        </footer>

        {member && <TabBar screen={screen} labsBadge={labsBadge} onNavigate={go} />}
      </div>
    </ShellContext.Provider>
  )
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="4" className="fill-brand-700" />
      <path d="M14 6c-3 4.2-5 7.1-5 9.6a5 5 0 0 0 10 0C19 13.1 17 10.2 14 6z" fill="#fff" />
    </svg>
  )
}

function Badge() {
  return (
    <span className="ml-1.5 inline-block rounded-full bg-oxblood-600 px-1.5 text-[11px] leading-[16px] font-bold text-white">
      1<span className="sr-only"> checkup due</span>
    </span>
  )
}

function MenuBar({ screen, onNavigate, labsBadge }: { screen: Screen; onNavigate: (s: Screen) => void; labsBadge: boolean }) {
  return (
    <nav aria-label="Main menu" className="bg-brand-700">
      <ul className="mx-auto flex max-w-[1100px] px-5">
        {NAV.map((n) => {
          const active = n.id === screen
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onNavigate(n.id)}
                aria-current={active ? 'page' : undefined}
                className={`h-10 px-3.5 text-[13px] font-bold ${active ? 'bg-white text-brand-700' : 'text-white hover:bg-brand-600'}`}
              >
                {n.label}
                {n.id === 'labs' && labsBadge && <Badge />}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function SideMenu({ onNavigate, onAddResult }: { onNavigate: (s: Screen) => void; onAddResult?: () => void }) {
  const link = 'block w-full border-b border-rule-soft px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-brand-50'
  return (
    <div className="space-y-4">
      <div className="panel">
        <h2 className="border-b border-rule bg-vellum px-3 py-2 text-[13px] font-bold">Quick links</h2>
        <button type="button" onClick={onAddResult} className={`${link} text-brand-600`}>
          Add a result
        </button>
        <button type="button" onClick={() => onNavigate('labs')} className={`${link} text-brand-600`}>
          Book a test
        </button>
        <button type="button" onClick={() => onNavigate('coach')} className={`${link} text-brand-600`}>
          Ask the Coach
        </button>
        <button type="button" onClick={() => onNavigate('report')} className={`${link} text-brand-600`}>
          Print doctor’s summary
        </button>
      </div>
      <div className="panel px-3 py-2.5 text-[12px] text-muted">
        <b className="text-ink">Help</b>
        <p className="mt-1">support@lablink.demo</p>
        <p>Mon to Sat, 7am to 6pm</p>
      </div>
    </div>
  )
}

function Drawer({
  profile,
  screen,
  labsBadge,
  onNavigate,
  onPublicHome,
  onClose,
}: {
  profile: Profile
  screen: Screen
  labsBadge: boolean
  onNavigate: (s: Screen) => void
  onPublicHome?: () => void
  onClose: () => void
}) {
  const ref = useModal<HTMLDivElement>(onClose)
  return (
    <div className="fixed inset-0 z-[1100] lg:hidden print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1} className="absolute inset-y-0 left-0 flex w-[min(80vw,300px)] flex-col overflow-y-auto bg-white outline-none">
        <div className="flex items-center justify-between bg-brand-700 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 text-white">
          <span className="text-[15px]">
            Welcome, <b>{profile.name}</b>
          </span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid size-10 place-items-center">
            <X size={20} />
          </button>
        </div>
        <ul>
          {NAV.map((n) => {
            const active = n.id === screen
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(n.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 border-b border-rule-soft px-4 py-3 text-left text-[15px] ${active ? 'bg-brand-50 font-bold text-brand-700' : ''}`}
                >
                  <n.icon size={18} className="text-brand-600" aria-hidden />
                  {n.label}
                  {n.id === 'labs' && labsBadge && <Badge />}
                </button>
              </li>
            )
          })}
        </ul>
        {onPublicHome && (
          <button type="button" onClick={onPublicHome} className="border-b border-rule-soft px-4 py-3 text-left text-[15px] text-brand-600">
            LabLink home
          </button>
        )}
        <p className="mt-auto px-4 py-3 text-[12px] text-muted">
          For information only, not a diagnosis.
          <br />
          support@lablink.demo
        </p>
      </div>
    </div>
  )
}

function TabBar({ screen, labsBadge, onNavigate }: { screen: Screen; labsBadge: boolean; onNavigate: (s: Screen) => void }) {
  const current = TABS.some((t) => t.id === screen) ? screen : 'home'
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
      <ul className="grid h-[var(--tabbar-h)] grid-cols-4">
        {TABS.map((t) => {
          const active = t.id === current
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onNavigate(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] ${active ? 'font-bold text-brand-700' : 'text-muted'}`}
              >
                <span className="relative">
                  <t.icon size={20} aria-hidden />
                  {t.id === 'labs' && labsBadge && (
                    <span className="absolute -top-0.5 -right-1.5 size-2 rounded-full bg-oxblood-600">
                      <span className="sr-only">Checkup due</span>
                    </span>
                  )}
                </span>
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
