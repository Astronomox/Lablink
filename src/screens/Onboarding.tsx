import { useState } from 'react'
import { Panel } from '../components/Panel'
import { btn } from '../components/buttons'
import { CheckRow, Field, Segmented } from '../components/ui'
import { Input } from '@/components/ui/input'
import { PageHeader } from '../layout/PageHeader'
import { importFastingGlucose } from '../services/founda'
import type { Profile, Sex, TestResult, Unit } from '../lib/types'

interface Props {
  onDone: (profile: Profile, results: TestResult[]) => void
}

export function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState<'profile' | 'connect'>('profile')
  const [profile, setProfile] = useState<Profile>({
    name: 'Tobi',
    age: 38,
    sex: 'male',
    weightKg: 84,
    heightCm: 175,
    familyHistory: true,
    unit: 'mmol',
  })
  const [importing, setImporting] = useState(false)

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }))
  const valid = profile.name.trim() && profile.age >= 18 && profile.age <= 100

  async function runImport() {
    setImporting(true)
    const results = await importFastingGlucose()
    onDone(profile, results)
  }

  return (
    <>
      <PageHeader title="Enrol" description={step === 'profile' ? 'Step 1 of 2: your details' : 'Step 2 of 2: past results'} />

      <div className="max-lg:space-y-3 max-lg:px-4 max-lg:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-5">
        {step === 'profile' ? (
          <Panel title="Your details" bodyClassName="p-4">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                if (valid) setStep('connect')
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="First name">
                  <Input value={profile.name} autoComplete="given-name" onChange={(e) => set('name', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age" hint={profile.age && (profile.age < 18 || profile.age > 100) ? 'Must be 18 to 100' : undefined}>
                    <Input type="number" inputMode="numeric" value={profile.age || ''} onChange={(e) => set('age', Number(e.target.value))} />
                  </Field>
                  <Field label="Sex" group>
                    <Segmented<Sex> value={profile.sex} options={[['male', 'Male'], ['female', 'Female']]} onChange={(v) => set('sex', v)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight (kg)">
                    <Input type="number" inputMode="decimal" value={profile.weightKg ?? ''} onChange={(e) => set('weightKg', Number(e.target.value) || undefined)} />
                  </Field>
                  <Field label="Height (cm)">
                    <Input type="number" inputMode="decimal" value={profile.heightCm ?? ''} onChange={(e) => set('heightCm', Number(e.target.value) || undefined)} />
                  </Field>
                </div>
                <Field label="Unit" group>
                  <Segmented<Unit> value={profile.unit} options={[['mmol', 'mmol/L'], ['mgdl', 'mg/dL']]} onChange={(v) => set('unit', v)} />
                </Field>
              </div>
              <CheckRow label="A parent, brother or sister has diabetes" checked={profile.familyHistory} onChange={(v) => set('familyHistory', v)} />
              <div className="border-t border-border pt-4">
                <button type="submit" disabled={!valid} className={`${btn('primary', 'lg')} max-lg:w-full`}>
                  Continue
                </button>
              </div>
            </form>
          </Panel>
        ) : (
          <Panel title="Import past results" bodyClassName="p-4">
            <p>LabLink can import your past fasting blood sugar results from partner labs through Founda Health.</p>
            <table className="mt-3 w-full text-sm">
              <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:py-2.5 [&_tr:last-child_td]:border-b-0">
                <tr>
                  <td className="w-28 text-muted-foreground">Name</td>
                  <td>
                    {profile.name}, {profile.age}, {profile.sex === 'male' ? 'male' : 'female'}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Test</td>
                  <td>Fasting blood sugar (LOINC 1558-6)</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Saved to</td>
                  <td>This device</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 lg:flex-row lg:items-center">
              <button type="button" onClick={runImport} disabled={importing} className={btn('primary', 'lg')}>
                {importing ? 'Importing…' : 'Import my lab history'}
              </button>
              <button type="button" onClick={() => onDone(profile, [])} disabled={importing} className={btn('secondary', 'lg')}>
                Skip, I’ll add results myself
              </button>
              <button type="button" onClick={() => setStep('profile')} disabled={importing} className="py-2 text-primary hover:underline lg:ml-auto">
                Back
              </button>
            </div>
          </Panel>
        )}

        <Panel title="Why we ask" className="max-lg:hidden">
          <ul className="list-disc space-y-1.5 pl-4 text-sm">
            <li>Age and sex: screening is advised from age 35, and health guidance depends on both.</li>
            <li>Weight and height: used to work out your BMI for the risk score.</li>
            <li>Family history: a parent or sibling with diabetes raises your risk.</li>
          </ul>
          <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">Your details are stored on this device. You can reset them from My Profile.</p>
        </Panel>
      </div>
    </>
  )
}
