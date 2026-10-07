import { useState } from 'react'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
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
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-1 text-sm font-medium text-muted-foreground">With the changes below</p>
                <Score result={projected} />
              </div>
            )}
            <p className="mt-4 text-sm" aria-live="polite">
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

          <Panel
            title="Where your points come from"
            className="order-4 lg:order-none"
            action={
              <span className="text-sm text-muted-foreground">
                Total <b className="text-foreground">{current.score}</b> / {MAX_FINDRISC}
              </span>
            }
          >
            <BreakdownChart breakdown={current.breakdown} />
            <p className="mt-3 text-xs text-muted-foreground">
              FINDRISC (Lindström and Tuomilehto, 2003) is a screening tool, not a diagnosis. It was developed in Finland and may be less accurate for other populations. The high blood sugar
              item is filled in from your results.
            </p>
          </Panel>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <Panel title="What if I…" className="order-2 lg:order-none">
            <div className="space-y-5">
              <WhatIfSlider label={`Lose ${loseKg} kg`} sub={`${inputs.weightKg - loseKg} kg`} value={loseKg} max={20} onChange={setLoseKg} />
              <WhatIfSlider label={`Trim waist by ${trimWaist} cm`} sub={`${inputs.waistCm - trimWaist} cm`} value={trimWaist} max={15} onChange={setTrimWaist} />
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
  const color = result.score >= 15 ? 'bg-red-600' : result.score >= 12 ? 'bg-amber-500' : 'bg-green-600'
  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight">{result.score}</span>
        <span className="text-muted-foreground">/ {MAX_FINDRISC}</span>
        <span className="ml-auto text-sm font-medium capitalize">{result.band} risk</span>
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function WhatIfSlider({ label, sub, value, max, onChange }: { label: string; sub: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{sub}</span>
      </div>
      <Slider aria-label={label} min={0} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" inputMode="decimal" value={value || ''} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  )
}

const breakdownConfig = { points: { label: 'Points', color: 'var(--chart-1)' } } satisfies ChartConfig

/** Horizontal bar per FINDRISC factor; factors scoring 0 are dimmed. */
function BreakdownChart({ breakdown }: { breakdown: RiskResult['breakdown'] }) {
  return (
    <ChartContainer config={breakdownConfig} className="aspect-auto w-full" style={{ height: breakdown.length * 34 + 16 }}>
      <BarChart data={breakdown} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }}>
        <XAxis type="number" hide domain={[0, 5]} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={190} tickMargin={6} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="points" radius={8} isAnimationActive={false} label={{ position: 'right', fontSize: 12, fill: 'var(--foreground)' }}>
          {breakdown.map((b) => (
            <Cell key={b.label} fill={b.points ? 'var(--color-points)' : 'var(--muted)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
