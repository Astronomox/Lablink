import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { btn } from '../components/buttons'
import { Field, Segmented } from '../components/ui'
import { Input } from '@/components/ui/input'
import { addDays, formatDate, toIso, today } from '../lib/dates'
import type { Lab, Profile } from '../lib/types'

export interface Booking {
  labId: string
  labName: string
  date: string
  slot: string
  homeSampling: boolean
}

const SLOTS = ['07:00', '08:00', '09:00', '10:00']

interface Props {
  lab: Lab
  profile: Profile
  onClose: () => void
  onConfirm: (booking: Booking) => void
}

export function BookTest({ lab, profile, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(toIso(addDays(today(), 1)))
  const [slot, setSlot] = useState(SLOTS[0])
  const [mode, setMode] = useState<'lab' | 'home'>('lab')
  const [done, setDone] = useState(false)
  const price = `₦${lab.fbsPrice.toLocaleString('en-NG')}`

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
        <p>Your fasting blood sugar test is booked.</p>
        <Rows
          rows={[
            ['Lab', lab.name],
            ['Date', formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
            ['Time', slot],
            ['Collection', mode === 'home' ? 'Home sample collection' : 'At the lab'],
            ['Price', price],
          ]}
        />
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Do not eat for 8 to 12 hours before the test. You can drink water.</p>
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
            onConfirm({ labId: lab.id, labName: lab.name, date, slot, homeSampling: mode === 'home' })
            setDone(true)
          }}
        >
          Confirm booking
        </button>
      }
    >
      <p className="font-semibold">{lab.name}</p>
      <p className="text-sm text-muted-foreground">{lab.address}</p>
      <Rows
        rows={[
          ['Test', 'Fasting blood sugar'],
          ['Price', price],
          ['Patient', `${profile.name}, ${profile.age}`],
        ]}
      />

      <div className="mt-4 space-y-4">
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
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={slot === s}
                onClick={() => setSlot(s)}
                className={`h-10 rounded-4xl border text-sm font-medium transition-colors ${slot === s ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-input/30 hover:bg-muted'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <p className="text-sm text-muted-foreground">Morning slots only, because you need to fast for 8 to 12 hours before the test.</p>
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
