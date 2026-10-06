import { Bell, FlaskConical, LineChart } from 'lucide-react'
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
  { id: 'how', label: 'How it works', short: 'How it works' },
  { id: 'ranges', label: 'Blood sugar ranges', short: 'Ranges' },
  { id: 'labs', label: 'Partner labs', short: 'Labs' },
  { id: 'faq', label: 'FAQs', short: 'FAQs' },
]

export function Landing({ member, memberName, onEnrol, onLogin }: Props) {
  const minPrice = Math.min(...PARTNER_LABS.map((l) => l.fbsPrice))
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
    <div className="flex min-h-dvh flex-col bg-white">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-rule bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 px-4 lg:h-16 lg:px-5">
          <a href="#top" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
              <rect width="28" height="28" rx="4" className="fill-brand-700" />
              <path d="M14 6c-3 4.2-5 7.1-5 9.6a5 5 0 0 0 10 0C19 13.1 17 10.2 14 6z" fill="#fff" />
            </svg>
            <span className="text-[20px] font-bold text-brand-700 lg:text-[22px]">LabLink</span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onLogin} className={btn('secondary')}>
              {member ? 'My dashboard' : 'Member login'}
            </button>
            {!member && (
              <button type="button" onClick={onEnrol} className={`${btn('primary')} max-sm:hidden`}>
                Enrol
              </button>
            )}
          </div>
        </div>
        <nav aria-label="Sections" className="bg-brand-700">
          <ul className="mx-auto flex max-w-[1100px] overflow-x-auto px-1 [scrollbar-width:none] lg:px-5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block px-2.5 py-2 text-[13px] font-bold whitespace-nowrap text-white hover:bg-brand-600 lg:px-3">
                  <span className="sm:hidden">{s.short}</span>
                  <span className="max-sm:hidden">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="flex-1">
        {/* Intro */}
        <section id="top" className="border-b border-rule bg-vellum">
          <div className="mx-auto grid max-w-[1100px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-5 lg:py-12">
            <div>
              <h1 className="text-[26px] leading-tight font-bold lg:text-[34px]">Keep track of your fasting blood sugar</h1>
              <p className="mt-3 max-w-[60ch] text-[15px] lg:text-[16px]">
                LabLink keeps your fasting blood sugar results in one place, shows whether they are going up, reminds you when your next test is due and helps you
                book a test at a nearby lab.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {primary}
                <a href="#how" className={btn('secondary', 'lg')}>
                  How it works
                </a>
              </div>
            </div>

            <div className="panel self-start max-lg:hidden">
              <h2 className="border-b border-rule bg-vellum px-3 py-2 text-[13px] font-bold">Members</h2>
              <div className="space-y-3 p-3 text-[13px]">
                {member ? (
                  <>
                    <p>
                      Signed in on this device as <b>{memberName}</b>.
                    </p>
                    <button type="button" onClick={onLogin} className={`${btn('primary')} w-full`}>
                      Go to my dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <p>New to LabLink? Enrol in two short steps. You can import your past results from partner labs.</p>
                    <button type="button" onClick={onEnrol} className={`${btn('primary')} w-full`}>
                      Enrol now
                    </button>
                    <p className="border-t border-rule-soft pt-3 text-muted">Your records are kept on this device. There is no password.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mx-auto grid max-w-[1100px] gap-4 px-4 py-8 sm:grid-cols-3 lg:px-5">
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

        {/* How it works */}
        <section id="how" className="scroll-mt-28 border-t border-rule bg-vellum">
          <div className="mx-auto max-w-[1100px] px-4 py-8 lg:px-5">
            <h2 className="text-[20px] font-bold">How it works</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
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
          </div>
        </section>

        {/* Ranges */}
        <section id="ranges" className="mx-auto max-w-[1100px] scroll-mt-28 px-4 py-8 lg:px-5">
          <h2 className="text-[20px] font-bold">Fasting blood sugar ranges</h2>
          <p className="mt-1 text-muted">American Diabetes Association cut-offs for adults.</p>
          <div className="panel mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-[14px]">
              <thead>
                <tr className="border-b border-rule bg-vellum text-left [&_th]:px-3 [&_th]:py-2">
                  <th>Range</th>
                  <th>mmol/L</th>
                  <th>mg/dL</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-rule-soft [&_td]:px-3 [&_td]:py-2">
                <tr>
                  <td className="font-bold text-[#1e7b34]">Normal</td>
                  <td>Below {mmol(PREDIABETES_MGDL)}</td>
                  <td>Below {PREDIABETES_MGDL}</td>
                </tr>
                <tr>
                  <td className="font-bold text-ochre-700">Prediabetes</td>
                  <td>
                    {mmol(PREDIABETES_MGDL)} to {mmol(DIABETES_MGDL - 1)}
                  </td>
                  <td>
                    {PREDIABETES_MGDL} to {DIABETES_MGDL - 1}
                  </td>
                </tr>
                <tr>
                  <td className="font-bold text-oxblood-600">Diabetes range</td>
                  <td>{mmol(DIABETES_MGDL)} or higher</td>
                  <td>{DIABETES_MGDL} or higher</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[13px] text-muted">One result is not a diagnosis. A doctor will confirm with a repeat test or an HbA1c test.</p>
        </section>

        {/* Labs */}
        <section id="labs" className="scroll-mt-28 border-t border-rule bg-vellum">
          <div className="mx-auto max-w-[1100px] px-4 py-8 lg:px-5">
            <h2 className="text-[20px] font-bold">Partner labs</h2>
            <p className="mt-1 text-muted">
              {PARTNER_LABS.length} labs on Lagos Mainland. {homeCount} offer home sample collection.
            </p>
            <div className="panel mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule bg-vellum text-left [&_th]:px-3 [&_th]:py-2">
                    <th>Lab</th>
                    <th>Area</th>
                    <th>Hours</th>
                    <th className="text-right">Fasting blood sugar</th>
                    <th>Home collection</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-vellum">
                  {PARTNER_LABS.map((l) => (
                    <tr key={l.id}>
                      <td className="font-bold">{l.name}</td>
                      <td>{l.area}</td>
                      <td className="whitespace-nowrap">{l.hours.replace(' · ', ', ')}</td>
                      <td className="text-right">{naira(l.fbsPrice)}</td>
                      <td>{l.homeSampling ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section id="faq" className="mx-auto max-w-[1100px] scroll-mt-28 px-4 py-8 lg:px-5">
          <h2 className="text-[20px] font-bold">Frequently asked questions</h2>
          <div className="panel mt-4 divide-y divide-rule-soft">
            <Faq q="Does LabLink diagnose diabetes?">
              No. LabLink shows your results and how they are changing. Only a doctor can diagnose diabetes.
            </Faq>
            <Faq q="Where is my information stored?">
              Your profile and results are stored on this device. Resetting the app deletes them. If you use the Health Coach or scan a lab report, the details needed
              to answer you are sent to the AI service.
            </Faq>
            <Faq q="How much is a fasting blood sugar test?">
              Between {naira(minPrice)} and {naira(Math.max(...PARTNER_LABS.map((l) => l.fbsPrice)))} at our partner labs.
            </Faq>
            <Faq q="How often should I test?">
              Every 6 months if your results are normal and stable, every 3 months if they are rising or in the prediabetes range, and within a month if a result is in the
              diabetes range.
            </Faq>
            <Faq q="Do I need to fast before the test?">Yes. Do not eat for 8 to 12 hours before the test. You can drink water.</Faq>
          </div>
        </section>

        <section className="border-t border-rule bg-vellum">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-6 lg:px-5">
            <p className="text-[16px] font-bold">{member ? `Welcome back, ${memberName}.` : 'Start your record today.'}</p>
            {primary}
          </div>
        </section>
      </main>

      <footer className="border-t border-rule bg-white px-4 py-3 text-center text-[12px] text-muted">
        © 2026 LabLink. For information only, not a diagnosis. Data: Founda Health (FHIR), MyHealthfinder (ODPHP), OpenStreetMap. Labs listed are demo partners.
      </footer>
    </div>
  )
}

function Service({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <h3 className="flex items-center gap-2 text-[15px] font-bold">
        <Icon size={18} className="text-brand-600" aria-hidden />
        {title}
      </h3>
      <p className="mt-2 text-[14px]">{children}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="panel flex gap-3 p-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-700 text-[13px] font-bold text-white">{n}</span>
      <div>
        <h3 className="text-[15px] font-bold">{title}</h3>
        <p className="mt-1 text-[14px]">{children}</p>
      </div>
    </li>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[14px] font-bold">
        {q}
        <span className="text-brand-600 group-open:hidden" aria-hidden>
          +
        </span>
        <span className="hidden text-brand-600 group-open:inline" aria-hidden>
          −
        </span>
      </summary>
      <p className="px-3 pb-3 text-[14px]">{children}</p>
    </details>
  )
}
