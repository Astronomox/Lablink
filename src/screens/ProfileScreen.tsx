import { useState, type ReactNode } from 'react'
import { Panel, StatusPill } from '../components/Panel'
import { Sheet } from '../components/Sheet'
import { btn } from '../components/buttons'
import { CheckRow, Field, Segmented } from '../components/ui'
import { Input } from '@/components/ui/input'
import { PageHeader } from '../layout/PageHeader'
import { categorize, formatValue } from '../lib/glucose'
import { formatDate } from '../lib/dates'
import { bmi } from '../lib/intelligence'
import type { Profile, Sex, TestResult, Unit } from '../lib/types'
import type { ReminderAlerts } from '../services/notifications'

interface Props {
  profile: Profile
  results: TestResult[]
  onChange: (p: Profile) => void
  onDeleteResult: (id: string) => void
  onReset: () => void
  alerts: ReminderAlerts
}

export function ProfileScreen({ profile, results, onChange, onDeleteResult, onReset, alerts }: Props) {
  const b = bmi(profile)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const draftValid = editing ? editing.name.trim() !== '' && editing.age >= 18 && editing.age <= 100 : false
  const setDraft = <K extends keyof Profile>(k: K, v: Profile[K]) => setEditing((p) => (p ? { ...p, [k]: v } : p))

  return (
    <>
      <PageHeader screen="profile" />

      <div className="flex flex-col gap-3 max-lg:px-4 max-lg:pt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div className="flex flex-col gap-3 lg:gap-5">
          <Panel
            title="Personal details"
            bodyClassName=""
            action={
              !editing && (
                <button type="button" onClick={() => setEditing(profile)} className="text-sm text-primary hover:underline max-lg:text-sm">
                  Edit
                </button>
              )
            }
          >
            {editing ? (
              <form
                className="space-y-4 p-3 max-lg:p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draftValid) return
                  onChange({ ...editing, name: editing.name.trim() })
                  setEditing(null)
                }}
              >
                <Field label="First name">
                  <Input value={editing.name} onChange={(e) => setDraft('name', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age">
                    <Input type="number" inputMode="numeric" value={editing.age || ''} onChange={(e) => setDraft('age', Number(e.target.value))} />
                  </Field>
                  <Field label="Sex" group>
                    <Segmented<Sex> value={editing.sex} options={[['male', 'Male'], ['female', 'Female']]} onChange={(v) => setDraft('sex', v)} />
                  </Field>
                  <Field label="Weight (kg)">
                    <Input type="number" inputMode="decimal" value={editing.weightKg ?? ''} onChange={(e) => setDraft('weightKg', Number(e.target.value) || undefined)} />
                  </Field>
                  <Field label="Height (cm)">
                    <Input type="number" inputMode="decimal" value={editing.heightCm ?? ''} onChange={(e) => setDraft('heightCm', Number(e.target.value) || undefined)} />
                  </Field>
                </div>
                <CheckRow label="A parent, brother or sister has diabetes" checked={editing.familyHistory} onChange={(v) => setDraft('familyHistory', v)} />
                {!draftValid && <p className="text-sm font-semibold text-red-600">Enter a first name and an age between 18 and 100.</p>}
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <button type="button" onClick={() => setEditing(null)} className={btn('secondary')}>
                    Cancel
                  </button>
                  <button type="submit" disabled={!draftValid} className={btn('primary')}>
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <table className="w-full text-sm">
                <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:px-5 [&_td]:py-2.5 [&_tr:last-child_td]:border-b-0">
                  <Row label="Name">{profile.name}</Row>
                  <Row label="Age">{profile.age} years</Row>
                  <Row label="Sex">{profile.sex === 'male' ? 'Male' : 'Female'}</Row>
                  <Row label="Weight">{profile.weightKg ? `${profile.weightKg} kg` : '—'}</Row>
                  <Row label="Height">{profile.heightCm ? `${profile.heightCm} cm` : '—'}</Row>
                  <Row label="BMI">{b ?? '—'}</Row>
                  <Row label="Family history">{profile.familyHistory ? 'Yes' : 'No'}</Row>
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Settings">
            <Field label="Show results in" group>
              <Segmented<Unit> value={profile.unit} options={[['mmol', 'mmol/L'], ['mgdl', 'mg/dL']]} onChange={(unit) => onChange({ ...profile, unit })} />
            </Field>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm font-medium">Checkup reminders</p>
              <p className="mt-1 text-sm text-muted-foreground">{reminderStatus(alerts)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alerts.enabled ? (
                  <>
                    <button type="button" onClick={alerts.onTest} className={btn('secondary')}>
                      Send a test
                    </button>
                    <button type="button" onClick={alerts.onDisable} className={btn('ghost')}>
                      Turn off
                    </button>
                  </>
                ) : (
                  alerts.permission !== 'unsupported' &&
                  alerts.permission !== 'denied' && (
                    <button type="button" onClick={alerts.onEnable} className={btn('primary')}>
                      Turn on reminders
                    </button>
                  )
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-3 lg:gap-5">
          <Panel title={`Results (${results.length})`} bodyClassName="">
            {results.length === 0 && <p className="px-5 pb-5 text-muted-foreground">No results yet.</p>}
            <ul className="divide-y divide-border border-t border-border">
              {[...results].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{formatValue(r.valueMgDl, profile.unit)}</span> <StatusPill category={categorize(r.valueMgDl)} />
                    <div className="truncate text-xs text-muted-foreground">
                      {formatDate(r.date)}, {r.lab ?? 'lab not recorded'}
                    </div>
                  </div>
                  <button type="button" onClick={() => onDeleteResult(r.id)} className={`${btn('ghost', 'sm')} text-destructive`} aria-label={`Delete result from ${formatDate(r.date)}`}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Reset">
            <p className="text-sm text-muted-foreground">Delete your details, results, booking, risk answers and Coach chat from this device.</p>
            <button type="button" onClick={() => setConfirmReset(true)} className={`${btn('dangerOutline')} mt-3 max-lg:w-full`}>
              Reset demo
            </button>
          </Panel>
        </div>
      </div>

      {confirmReset && (
        <Sheet
          title="Reset demo?"
          onClose={() => setConfirmReset(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className={btn('secondary', 'lg')}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false)
                  onReset()
                }}
                className={btn('danger', 'lg')}
              >
                Reset
              </button>
            </div>
          }
        >
          <p>
            This deletes {results.length} result{results.length === 1 ? '' : 's'}, your details, booking, risk answers and Coach chat from this device. It cannot be undone.
          </p>
        </Sheet>
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <td className="text-muted-foreground">{label}</td>
      <td className="text-right">{children}</td>
    </tr>
  )
}

function reminderStatus(alerts: ReminderAlerts): string {
  if (alerts.permission === 'unsupported') return 'This browser cannot show notifications here. They need HTTPS (or localhost) and a supported browser.'
  if (alerts.permission === 'denied') return 'Notifications are blocked for LabLink. Allow them in your browser’s site settings to get reminders.'
  if (alerts.enabled) return 'On. LabLink notifies you once a day while a checkup is due and not booked, when you open the app.'
  return 'Get a notification on this device when your next blood sugar checkup is due.'
}
