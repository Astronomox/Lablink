import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Sheet } from '../components/Sheet'
import { btn } from '../components/buttons'
import { Field, Segmented } from '../components/ui'
import { addDays, formatDate, toIso, today } from '../lib/dates'
import { TEST_KINDS, TESTS } from '../lib/tests'
import type { Lab, Profile, TestKind } from '../lib/types'

export interface Booking {
  labId: string
  labName: string
  /** Bookings made before multi-test support are fasting blood sugar. */
  test?: TestKind
  date: string
  slot: string
  homeSampling: boolean
}

// Fasting tests need an early slot; the others can be done any time the lab is open.
const FASTING_SLOTS = ['07:00', '08:00', '09:00', '10:00']
const DAY_SLOTS = ['08:00', '10:00', '12:00', '14:00']

interface Props {
  lab: Lab
  profile: Profile
  defaultKind?: TestKind
  onClose: () => void
  onConfirm: (booking: Booking) => void
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`
const choice = (selected: boolean) =>
  cn('rounded-2xl border text-sm font-medium transition-colors', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-input/30 hover:bg-muted')

export function BookTest({ lab, profile, defaultKind = 'fbs', onClose, onConfirm }: Props) {
  const [test, setTest] = useState<TestKind>(defaultKind)
  const [date, setDate] = useState(toIso(addDays(today(), 1)))
  const [slot, setSlot] = useState(FASTING_SLOTS[0])
  const [mode, setMode] = useState<'lab' | 'home'>('lab')
  const [done, setDone] = useState(false)
  const def = TESTS[test]
  const slots = def.fasting ? FASTING_SLOTS : DAY_SLOTS
  const price = naira(lab.prices[test])
  const fastingNote = <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Do not eat for 8 to 12 hours before the test. You can drink water.</p>

  const pickTest = (k: TestKind) => {
    setTest(k)
    const next = TESTS[k].fasting ? FASTING_SLOTS : DAY_SLOTS
    if (!next.includes(slot)) setSlot(next[0])
  }

  if (done) {
    return (
      <Sheet
        title="Test booked"
        onClose={onClose}
        footer={
          <button type="button" onClick={onClose} className={`${btn('primary', 'lg')} w-full`}>
            Done
          </button>
        }
      >
        <p>Your {def.measure} test is booked.</p>
        <Rows
          rows={[
            ['Lab', lab.name],
            ['Test', def.name],
            ['Date', formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
            ['Time', slot],
            ['Collection', mode === 'home' ? 'Home sample collection' : 'At the lab'],
            ['Price', price],
          ]}
        />
        {def.fasting && fastingNote}
      </Sheet>
    )
  }

  return (
    <Sheet
      title="Book a test"
      onClose={onClose}
      footer={
        <button
          type="button"
          className={`${btn('primary', 'lg')} w-full`}
          onClick={() => {
            onConfirm({ labId: lab.id, labName: lab.name, test, date, slot, homeSampling: mode === 'home' })
            setDone(true)
          }}
        >
          Confirm booking · {price}
        </button>
      }
    >
      <p className="font-semibold">{lab.name}</p>
      <p className="text-sm text-muted-foreground">{lab.address}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        For {profile.name}, {profile.age}
      </p>

      <div className="mt-5 space-y-5">
        <Field label="Test" group>
          <div className="grid grid-cols-2 gap-2">
            {TEST_KINDS.map((k) => (
              <button key={k} type="button" aria-pressed={test === k} onClick={() => pickTest(k)} className={cn(choice(test === k), 'px-3 py-2.5 text-left')}>
                <span className="block">{TESTS[k].name}</span>
                <span className={cn('block text-xs', test === k ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{naira(lab.prices[k])}</span>
              </button>
            ))}
          </div>
        </Field>
        {lab.homeSampling && (
          <Field label="Collection" group>
            <Segmented<'lab' | 'home'> value={mode} options={[['lab', 'At the lab'], ['home', 'At home']]} onChange={setMode} />
          </Field>
        )}
        <Field label="Date">
          <Input type="date" min={toIso(addDays(today(), 1))} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time" group>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button key={s} type="button" aria-pressed={slot === s} onClick={() => setSlot(s)} className={cn(choice(slot === s), 'h-10 rounded-4xl')}>
                {s}
              </button>
            ))}
          </div>
        </Field>
        {def.fasting && <p className="text-sm text-muted-foreground">Morning slots only, because you need to fast for 8 to 12 hours before this test.</p>}
      </div>
    </Sheet>
  )
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <table className="mt-3 w-full text-sm">
      <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:py-2.5 [&_tr:last-child_td]:border-b-0">
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="w-28 text-muted-foreground">{k}</td>
            <td className="text-right font-semibold">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
