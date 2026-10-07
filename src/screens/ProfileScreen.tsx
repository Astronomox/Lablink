import { useState, type ReactNode } from 'react'
import { Panel, StatusPill } from '../components/Panel'
import { Sheet } from '../components/Sheet'
import { btn } from '../components/buttons'
import { CheckRow, Field, inputCls, Segmented } from '../components/ui'
import { PageHeader } from '../layout/PageHeader'
import { categorize, formatValue } from '../lib/glucose'
import { formatDate } from '../lib/dates'
import { bmi } from '../lib/intelligence'
import type { Profile, Sex, TestResult, Unit } from '../lib/types'

interface Props {
  profile: Profile
  results: TestResult[]
  onChange: (p: Profile) => void
  onDeleteResult: (id: string) => void
  onReset: () => void
}

export function ProfileScreen({ profile, results, onChange, onDeleteResult, onReset }: Props) {
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
                <button type="button" onClick={() => setEditing(profile)} className="text-[13px] text-brand-600 hover:underline max-lg:text-[14px]">
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
                  <input className={inputCls} value={editing.name} onChange={(e) => setDraft('name', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age">
                    <input type="number" inputMode="numeric" className={inputCls} value={editing.age || ''} onChange={(e) => setDraft('age', Number(e.target.value))} />
                  </Field>
                  <Field label="Sex" group>
                    <Segmented<Sex> value={editing.sex} options={[['male', 'Male'], ['female', 'Female']]} onChange={(v) => setDraft('sex', v)} />
                  </Field>
                  <Field label="Weight (kg)">
                    <input type="number" inputMode="decimal" className={inputCls} value={editing.weightKg ?? ''} onChange={(e) => setDraft('weightKg', Number(e.target.value) || undefined)} />
                  </Field>
                  <Field label="Height (cm)">
                    <input type="number" inputMode="decimal" className={inputCls} value={editing.heightCm ?? ''} onChange={(e) => setDraft('heightCm', Number(e.target.value) || undefined)} />
                  </Field>
                </div>
                <CheckRow label="A parent, brother or sister has diabetes" checked={editing.familyHistory} onChange={(v) => setDraft('familyHistory', v)} />
                {!draftValid && <p className="text-[13px] font-bold text-oxblood-600">Enter a first name and an age between 18 and 100.</p>}
                <div className="flex justify-end gap-2 border-t border-rule-soft pt-4">
                  <button type="button" onClick={() => setEditing(null)} className={btn('secondary')}>
                    Cancel
                  </button>
                  <button type="submit" disabled={!draftValid} className={btn('primary')}>
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <table className="w-full text-[14px]">
                <tbody className="[&_td]:border-b [&_td]:border-rule-soft [&_td]:px-3 [&_td]:py-2 max-lg:[&_td]:px-4 [&_tr:last-child_td]:border-b-0">
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
          </Panel>
        </div>

        <div className="flex flex-col gap-3 lg:gap-5">
          <Panel title={`Results (${results.length})`} bodyClassName="">
            {results.length === 0 && <p className="px-3 py-4 text-muted max-lg:px-4">No results yet.</p>}
            <ul className="divide-y divide-rule-soft">
              {[...results].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 max-lg:px-4 max-lg:py-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold">{formatValue(r.valueMgDl, profile.unit)}</span> <StatusPill category={categorize(r.valueMgDl)} />
                    <div className="truncate text-[12px] text-muted">
                      {formatDate(r.date)}, {r.lab ?? 'lab not recorded'}
                    </div>
                  </div>
                  <button type="button" onClick={() => onDeleteResult(r.id)} className="shrink-0 text-[13px] text-oxblood-600 hover:underline" aria-label={`Delete result from ${formatDate(r.date)}`}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Reset">
            <p className="text-[13px] text-muted">Delete your details, results, booking, risk answers and Coach chat from this device.</p>
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
      <td className="text-muted">{label}</td>
      <td className="text-right">{children}</td>
    </tr>
  )
}
