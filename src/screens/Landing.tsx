import { Bell, FlaskConical, LineChart, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Logo } from '../components/Logo'
import { btn } from '../components/buttons'
import { PARTNER_LABS } from '../data/labs'
import { DIABETES_MGDL, MGDL_PER_MMOL, PREDIABETES_MGDL } from '../lib/glucose'

interface Props {
  /** True when a member record already exists on this device. */
  member: boolean
  memberName?: string
  onEnrol: () => void
  onLogin: () => void
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`
const mmol = (mgdl: number) => (mgdl / MGDL_PER_MMOL).toFixed(1)

const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'ranges', label: 'Blood sugar ranges', short: 'Ranges' },
  { id: 'labs', label: 'Partner labs', short: 'Labs' },
  { id: 'faq', label: 'FAQs' },
]

const card = 'rounded-2xl bg-card ring-1 ring-foreground/10'

export function Landing({ member, memberName, onEnrol, onLogin }: Props) {
  const prices = PARTNER_LABS.map((l) => l.fbsPrice)
  const minPrice = Math.min(...prices)
  const homeCount = PARTNER_LABS.filter((l) => l.homeSampling).length
  const primary = member ? (
    <button type="button" onClick={onLogin} className={btn('primary', 'lg')}>
      Go to my dashboard
    </button>
  ) : (
    <button type="button" onClick={onEnrol} className={btn('primary', 'lg')}>
      Enrol now
    </button>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-6 px-4 lg:h-16 lg:px-6">
          <a href="#top" aria-label="LabLink home">
            <Logo markClassName="size-7" />
          </a>
          <nav aria-label="Sections" className="hidden flex-1 lg:block">
            <ul className="flex gap-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="rounded-4xl px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onLogin} className={btn('secondary')}>
              {member ? 'My dashboard' : 'Member login'}
            </button>
            {!member && (
              <button type="button" onClick={onEnrol} className={cn(btn('primary'), 'max-sm:hidden')}>
                Enrol
              </button>
            )}
          </div>
        </div>
        <nav aria-label="Sections" className="border-t border-border lg:hidden">
          <ul className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-4xl bg-muted px-3.5 py-1.5 text-sm font-medium whitespace-nowrap">
                  {s.short ?? s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section id="top" className="mx-auto grid max-w-[1180px] gap-8 px-4 pt-10 pb-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:px-6 lg:pt-16 lg:pb-20">
          <div>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight lg:text-5xl">Keep track of your fasting blood sugar</h1>
            <p className="mt-4 max-w-[58ch] text-lg text-muted-foreground">
              LabLink keeps your fasting blood sugar results in one place, shows whether they are going up, reminds you when your next test is due and helps you book a test at a nearby lab.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {primary}
              <a href="#how" className={btn('secondary', 'lg')}>
                How it works
              </a>
            </div>
          </div>

          <div className={cn(card, 'p-6 max-lg:hidden')}>
            <h2 className="font-semibold">Members</h2>
            {member ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Signed in on this device as <b className="text-foreground">{memberName}</b>.
                </p>
                <button type="button" onClick={onLogin} className={cn(btn('primary', 'lg'), 'mt-4 w-full')}>
                  Go to my dashboard
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">New to LabLink? Enrol in two short steps. You can import your past results from partner labs.</p>
                <button type="button" onClick={onEnrol} className={cn(btn('primary', 'lg'), 'mt-4 w-full')}>
                  <Plus /> Enrol now
                </button>
                <p className="mt-4 text-xs text-muted-foreground">Your records are kept on this device. There is no password.</p>
              </>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1180px] gap-4 px-4 pb-12 sm:grid-cols-3 lg:px-6">
          <Service icon={LineChart} title="Results and trend">
            See every result on one chart. LabLink compares each new result with your past ones and tells you if it is rising.
          </Service>
          <Service icon={Bell} title="Retest reminders">
            Get reminded when your next test is due: every 6 months if stable, every 3 months if rising, sooner if a result is high.
          </Service>
          <Service icon={FlaskConical} title="Partner labs">
            Find a partner lab near you, check opening hours and prices, and book a test. Fasting blood sugar tests from {naira(minPrice)}.
          </Service>
        </section>

        <Band id="how" title="How it works" tinted>
          <ol className="grid gap-4 sm:grid-cols-3">
            <Step n={1} title="Check your dashboard">
              See your results over time and when your next test is due.
            </Step>
            <Step n={2} title="Book a test">
              Pick a partner lab near you and choose a morning slot. Do not eat for 8 to 12 hours before.
            </Step>
            <Step n={3} title="Add your new result">
              Enter the result and LabLink tells you what changed and what to do next.
            </Step>
          </ol>
        </Band>

        <Band id="ranges" title="Fasting blood sugar ranges" subtitle="American Diabetes Association cut-offs for adults.">
          <div className={cn(card, 'overflow-hidden')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Range</TableHead>
                  <TableHead>mmol/L</TableHead>
                  <TableHead className="pr-5">mg/dL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-5 font-medium text-green-700">Normal</TableCell>
                  <TableCell>Below {mmol(PREDIABETES_MGDL)}</TableCell>
                  <TableCell className="pr-5">Below {PREDIABETES_MGDL}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-5 font-medium text-amber-700">Prediabetes</TableCell>
                  <TableCell>
                    {mmol(PREDIABETES_MGDL)} to {mmol(DIABETES_MGDL - 1)}
                  </TableCell>
                  <TableCell className="pr-5">
                    {PREDIABETES_MGDL} to {DIABETES_MGDL - 1}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-5 font-medium text-red-700">Diabetes range</TableCell>
                  <TableCell>{mmol(DIABETES_MGDL)} or higher</TableCell>
                  <TableCell className="pr-5">{DIABETES_MGDL} or higher</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">One result is not a diagnosis. A doctor will confirm with a repeat test or an HbA1c test.</p>
        </Band>

        <Band id="labs" title="Partner labs" subtitle={`${PARTNER_LABS.length} labs on Lagos Mainland. ${homeCount} offer home sample collection.`} tinted>
          <div className={cn(card, 'overflow-hidden')}>
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Lab</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Fasting blood sugar</TableHead>
                  <TableHead className="pr-5">Home collection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PARTNER_LABS.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="pl-5 font-medium">{l.name}</TableCell>
                    <TableCell>{l.area}</TableCell>
                    <TableCell>{l.hours.replace(' · ', ', ')}</TableCell>
                    <TableCell className="text-right">{naira(l.fbsPrice)}</TableCell>
                    <TableCell className="pr-5">{l.homeSampling ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Band>

        <Band id="faq" title="Frequently asked questions">
          <div className={cn(card, 'divide-y divide-border')}>
            <Faq q="Does LabLink diagnose diabetes?">No. LabLink shows your results and how they are changing. Only a doctor can diagnose diabetes.</Faq>
            <Faq q="Where is my information stored?">
              Your profile and results are stored on this device. Resetting the app deletes them. If you use the Health Coach or scan a lab report, the details needed to answer you are
              sent to the AI service.
            </Faq>
            <Faq q="How much is a fasting blood sugar test?">
              Between {naira(minPrice)} and {naira(Math.max(...prices))} at our partner labs.
            </Faq>
            <Faq q="How often should I test?">
              Every 6 months if your results are normal and stable, every 3 months if they are rising or in the prediabetes range, and within a month if a result is in the diabetes range.
            </Faq>
            <Faq q="Do I need to fast before the test?">Yes. Do not eat for 8 to 12 hours before the test. You can drink water.</Faq>
          </div>
        </Band>

        <section className="mx-auto max-w-[1180px] px-4 pb-12 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-primary px-6 py-8 text-primary-foreground lg:px-10">
            <p className="text-xl font-semibold">{member ? `Welcome back, ${memberName}.` : 'Start your record today.'}</p>
            <button type="button" onClick={member ? onLogin : onEnrol} className={cn(btn('secondary', 'lg'), 'bg-card text-foreground hover:bg-card/90')}>
              {member ? 'Go to my dashboard' : 'Enrol now'}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        © 2026 LabLink. For information only, not a diagnosis. Data: Founda Health (FHIR), MyHealthfinder (ODPHP), OpenStreetMap. Labs listed are demo partners.
      </footer>
    </div>
  )
}

function Band({ id, title, subtitle, tinted = false, children }: { id: string; title: string; subtitle?: string; tinted?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-32 py-12', tinted && 'bg-muted/60')}>
      <div className="mx-auto max-w-[1180px] px-4 lg:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}

function Service({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: ReactNode }) {
  return (
    <div className={cn(card, 'p-6')}>
      <span className="grid size-10 place-items-center rounded-2xl bg-accent text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className={cn(card, 'flex gap-4 p-6')}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  )
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium">
        {q}
        <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden />
      </summary>
      <p className="px-5 pb-5 text-sm text-muted-foreground">{children}</p>
    </details>
  )
}
