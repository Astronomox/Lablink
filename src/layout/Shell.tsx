import { Bot, Home, MapPin, Menu, Plus, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Logo } from '../components/Logo'
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

        <header className="sticky top-0 z-40 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 lg:h-16 lg:gap-6 lg:px-6">
            {member && (
              <Button variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} className="-ml-2 lg:hidden">
                <Menu className="size-5" />
              </Button>
            )}
            <button type="button" onClick={() => member && go('home')} aria-label="LabLink dashboard">
              <Logo className="h-8" />
            </button>
            {member && (
              <nav aria-label="Main menu" className="hidden flex-1 lg:block">
                <ul className="flex items-center gap-1">
                  {NAV.map((n) => {
                    const active = n.id === screen
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => go(n.id)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative rounded-4xl px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors xl:px-3.5',
                            active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          {n.label}
                          {n.id === 'labs' && labsBadge && <DueDot className="absolute top-1.5 right-1.5" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            )}
            {member && (
              <div className="ml-auto hidden text-right text-sm leading-tight xl:block">
                <div className="font-medium">{profile.name}</div>
                <div className="text-xs text-muted-foreground">{latest ? `Last result ${formatDate(latest.date)}` : 'No results yet'}</div>
              </div>
            )}
          </div>
        </header>

        {member && (
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetContent side="left" className="w-[min(82vw,320px)] gap-0 p-0 lg:hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
              <SheetHeader className="border-b border-border p-5">
                <SheetTitle>
                  <Logo className="h-8" />
                </SheetTitle>
                <SheetDescription>Signed in as {profile.name}</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu" className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1">
                  {NAV.map((n) => {
                    const active = n.id === screen
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => go(n.id)}
                          aria-current={active ? 'page' : undefined}
                          className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px]', active ? 'bg-accent font-semibold text-accent-foreground' : 'hover:bg-muted')}
                        >
                          <n.icon className="size-5 text-primary" aria-hidden />
                          {n.label}
                          {n.id === 'labs' && labsBadge && <DueDot className="ml-auto" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {onPublicHome && (
                  <button type="button" onClick={onPublicHome} className="mt-2 w-full rounded-2xl px-3 py-3 text-left text-[15px] text-primary hover:bg-muted">
                    LabLink home
                  </button>
                )}
              </nav>
              <p className="border-t border-border p-5 text-xs text-muted-foreground">For information only, not a diagnosis. support@lablink.demo</p>
            </SheetContent>
          </Sheet>
        )}

        <div ref={setBand} className="hidden lg:block print:hidden" />

        <div className="mx-auto w-full max-w-[1180px] flex-1 lg:px-6 lg:py-6 print:max-w-none print:p-0">
          <div className={member ? 'lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6 print:block' : ''}>
            {member && (
              <aside className="sticky top-24 hidden space-y-4 lg:block print:hidden" aria-label="Quick links">
                <QuickLinks onNavigate={go} onAddResult={onAddResult} />
              </aside>
            )}
            <main id="main" tabIndex={-1} className={cn('min-w-0 outline-none lg:pb-0 print:p-0', member ? 'pb-tabbar' : 'pb-8')}>
              {children}
            </main>
          </div>
        </div>

        <footer className={cn('border-t border-border px-4 py-5 text-center text-xs text-muted-foreground print:hidden', member && 'max-lg:hidden')}>
          {onPublicHome && (
            <>
              <button type="button" onClick={onPublicHome} className="text-primary hover:underline">
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

function DueDot({ className }: { className?: string }) {
  return (
    <span className={cn('size-2 rounded-full bg-orange-500', className)}>
      <span className="sr-only"> (checkup due)</span>
    </span>
  )
}

function QuickLinks({ onNavigate, onAddResult }: { onNavigate: (s: Screen) => void; onAddResult?: () => void }) {
  const link = 'w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted'
  return (
    <>
      <Button onClick={onAddResult} className="w-full" size="lg">
        <Plus /> Add a result
      </Button>
      <div className="rounded-2xl bg-card p-2 ring-1 ring-foreground/10">
        <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Quick links</p>
        <button type="button" onClick={() => onNavigate('labs')} className={link}>
          Book a test
        </button>
        <button type="button" onClick={() => onNavigate('coach')} className={link}>
          Ask the Coach
        </button>
        <button type="button" onClick={() => onNavigate('report')} className={link}>
          Print doctor’s summary
        </button>
      </div>
      <div className="rounded-2xl bg-card p-4 text-xs text-muted-foreground ring-1 ring-foreground/10">
        <p className="font-medium text-foreground">Need help?</p>
        <p className="mt-1">support@lablink.demo</p>
        <p>Mon to Sat, 7am to 6pm</p>
      </div>
    </>
  )
}

function TabBar({ screen, labsBadge, onNavigate }: { screen: Screen; labsBadge: boolean; onNavigate: (s: Screen) => void }) {
  const current = TABS.some((t) => t.id === screen) ? screen : 'home'
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
      <ul className="grid h-[var(--tabbar-h)] grid-cols-4 px-2">
        {TABS.map((t) => {
          const active = t.id === current
          return (
            <li key={t.id} className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => onNavigate(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-col items-center gap-1 text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}
              >
                <span className={cn('relative grid h-8 w-14 place-items-center rounded-4xl transition-colors', active && 'bg-accent')}>
                  <t.icon className="size-5" aria-hidden />
                  {t.id === 'labs' && labsBadge && <DueDot className="absolute top-1 right-3" />}
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
