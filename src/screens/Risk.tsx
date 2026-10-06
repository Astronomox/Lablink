import { useState } from 'react'
import { Panel } from '../components/Panel'
import { btn } from '../components/buttons'
import { CheckRow, Field, Segmented } from '../components/ui'
import { PageHeader } from '../layout/PageHeader'
import { findrisc, MAX_FINDRISC, type FamilyHistory, type RiskInputs, type RiskResult } from '../lib/risk'
import type { Profile, TestResult } from '../lib/types'

interface Props {
  profile: Profile
  results: TestResult[]
  inputs: RiskInputs
  onInputsChange: (i: RiskInputs) => void
  onBack: () => void
  onAskCoach: (question: string) => void
}

export function Risk({ profile, results, inputs, onInputsChange, onBack, onAskCoach }: Props) {
  const [loseKg, setLoseKg] = useState(0)
  const [trimWaist, setTrimWaist] = useState(0)
  // null = follow the 'about you' answer; boolean = what-if override
  const [walkOverride, setWalk] = useState<boolean | null>(null)
  const [vegOverride, setVeg] = useState<boolean | null>(null)
  const walk = walkOverride ?? inputs.dailyActivity
  const veg = vegOverride ?? inputs.dailyVeg

  const current = findrisc(profile, inputs, results)
  const whatIfInputs: RiskInputs = { ...inputs, weightKg: inputs.weightKg - loseKg, waistCm: inputs.waistCm - trimWaist, dailyActivity: walk, dailyVeg: veg }
  const projected = findrisc(profile, whatIfInputs, results)
  const changed = projected.score !== current.score
  const set = <K extends keyof RiskInputs>(k: K, v: RiskInputs[K]) => onInputsChange({ ...inputs, [k]: v })

  return (
    <>
      <PageHeader screen="risk" onBack={onBack} />

      <div className="flex flex-col gap-3 max-lg:px-4 max-lg:pt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <Panel title="Your score" className="order-1 lg:order-none">
            <Score result={current} />
            {changed && (
              <div className="mt-3 border-t border-rule-soft pt-3">
                <p className="text-[13px] font-bold text-muted">With the changes below</p>
                <Score result={projected} />
              </div>
            )}
            <p className="mt-3 text-[14px]" aria-live="polite">
              {changed ? (
                <>
                  These changes would lower your score by <b>{current.score - projected.score} points</b>, from {current.tenYearRisk.replace('≈', 'about ')} to {projected.tenYearRisk.replace('≈', 'about ')} chance of type 2
                  diabetes in 10 years.
                </>
              ) : (
                <>Your chance of developing type 2 diabetes in the next 10 years is {current.tenYearRisk.replace('≈', 'about ')}.</>
              )}
            </p>
          </Panel>

          <Panel title="How the score is worked out" className="order-4 lg:order-none" bodyClassName="">
            <table className="w-full text-[13px]">
              <tbody className="[&_td]:border-b [&_td]:border-rule-soft [&_td]:px-3 [&_td]:py-1.5 max-lg:[&_td]:px-4">
                {current.breakdown.map((b) => (
                  <tr key={b.label}>
                    <td>{b.label}</td>
                    <td className="text-right font-bold">{b.points}</td>
                  </tr>
                ))}
                <tr className="bg-vellum">
                  <td className="font-bold">Total</td>
                  <td className="text-right font-bold">
                    {current.score} / {MAX_FINDRISC}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="px-3 py-2 text-[12px] text-muted max-lg:px-4">
              FINDRISC (Lindström and Tuomilehto, 2003) is a screening tool, not a diagnosis. It was developed in Finland and may be less accurate for other populations. The high blood sugar
              item is filled in from your results.
            </p>
          </Panel>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <Panel title="What if I…" className="order-2 lg:order-none">
            <div className="space-y-4">
              <Slider label={`Lose ${loseKg} kg`} sub={`${inputs.weightKg - loseKg} kg`} value={loseKg} max={20} onChange={setLoseKg} />
              <Slider label={`Trim waist by ${trimWaist} cm`} sub={`${inputs.waistCm - trimWaist} cm`} value={trimWaist} max={15} onChange={setTrimWaist} />
              <CheckRow label="Walk 30 minutes every day" checked={walk} onChange={setWalk} />
              <CheckRow label="Eat vegetables or fruit every day" checked={veg} onChange={setVeg} />
            </div>
            {changed && (
              <button
                type="button"
                onClick={() =>
                  onAskCoach(
                    `Help me make a realistic plan to ${[loseKg && `lose ${loseKg} kg`, trimWaist && `trim my waist by ${trimWaist} cm`, walk && !inputs.dailyActivity && 'walk 30 minutes daily', veg && !inputs.dailyVeg && 'eat vegetables daily'].filter(Boolean).join(', ')}.`,
                  )
                }
                className={`${btn('primary', 'lg')} mt-4 w-full`}
              >
                Ask Coach for a plan
              </button>
            )}
          </Panel>

          <Panel title="About you now" className="order-3 lg:order-none">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Weight (kg)" value={inputs.weightKg} onChange={(v) => set('weightKg', v)} />
                <NumberField label="Waist at navel (cm)" value={inputs.waistCm} onChange={(v) => set('waistCm', v)} />
              </div>
              <CheckRow label="Active 30 minutes or more most days" checked={inputs.dailyActivity} onChange={(v) => set('dailyActivity', v)} />
              <CheckRow label="Vegetables or fruit every day" checked={inputs.dailyVeg} onChange={(v) => set('dailyVeg', v)} />
              <CheckRow label="Ever taken blood pressure medicine" checked={inputs.bpMeds} onChange={(v) => set('bpMeds', v)} />
              <Field label="Family with diabetes" group>
                <Segmented<FamilyHistory> value={inputs.family} options={[['none', 'None'], ['second', 'Relatives'], ['first', 'Parent/sibling']]} onChange={(v) => set('family', v)} />
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Score({ result }: { result: RiskResult }) {
  const pct = (Math.min(result.score, MAX_FINDRISC) / MAX_FINDRISC) * 100
  const color = result.score >= 15 ? 'bg-oxblood-600' : result.score >= 12 ? 'bg-ochre-500' : 'bg-[#1e7b34]'
  return (
    <div>
      <p>
        <b className="text-[22px]">{result.score}</b> / {MAX_FINDRISC} <span className="capitalize">({result.band} risk)</span>
      </p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-rule-soft" aria-hidden>
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Slider({ label, sub, value, max, onChange }: { label: string; sub: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[14px]">
        <b>{label}</b>
        <span className="text-muted">{sub}</span>
      </span>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-brand-600" />
    </label>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-[3px] border border-rule bg-white px-3 py-2 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 max-lg:rounded-md max-lg:text-[16px]"
      />
    </Field>
  )
}
