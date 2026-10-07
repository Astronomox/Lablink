/**
 * FINDRISC (Finnish Diabetes Risk Score) — 10-year risk of type 2 diabetes.
 * Lindström & Tuomilehto, Diabetes Care 2003. Validated in European cohorts;
 * shown here as an indicative screening score, not a diagnosis.
 */
import { bmi } from './profile'
import { kindOf, TESTS } from './tests'
import type { Profile, TestResult } from './types'

export type FamilyHistory = 'none' | 'second' | 'first'

export interface RiskInputs {
  weightKg: number
  waistCm: number
  dailyActivity: boolean
  dailyVeg: boolean
  bpMeds: boolean
  family: FamilyHistory
}

export interface RiskResult {
  score: number
  band: 'low' | 'slightly elevated' | 'moderate' | 'high' | 'very high'
  tenYearRisk: string
  breakdown: { label: string; points: number }[]
}

export function defaultRiskInputs(profile: Profile): RiskInputs {
  return {
    weightKg: profile.weightKg ?? 75,
    waistCm: profile.sex === 'male' ? 96 : 86,
    dailyActivity: false,
    dailyVeg: false,
    bpMeds: false,
    family: profile.familyHistory ? 'first' : 'none',
  }
}

export function findrisc(profile: Profile, inputs: RiskInputs, results: TestResult[]): RiskResult {
  const b = bmi({ ...profile, weightKg: inputs.weightKg }) ?? 0
  // FINDRISC asks whether high blood glucose was ever found: fasting blood sugar or HbA1c above normal.
  const highGlucoseEver = results.some((r) => (kindOf(r) === 'fbs' || kindOf(r) === 'hba1c') && TESTS[kindOf(r)].classify(r.value) > 0)
  const male = profile.sex === 'male'

  const breakdown = [
    { label: `Age ${profile.age}`, points: profile.age < 45 ? 0 : profile.age < 55 ? 2 : profile.age < 65 ? 3 : 4 },
    { label: `BMI ${b.toFixed(1)}`, points: b < 25 ? 0 : b <= 30 ? 1 : 3 },
    {
      label: `Waist ${inputs.waistCm} cm`,
      points: male ? (inputs.waistCm < 94 ? 0 : inputs.waistCm <= 102 ? 3 : 4) : inputs.waistCm < 80 ? 0 : inputs.waistCm <= 88 ? 3 : 4,
    },
    { label: inputs.dailyActivity ? 'Active 30 min daily' : 'Not active daily', points: inputs.dailyActivity ? 0 : 2 },
    { label: inputs.dailyVeg ? 'Vegetables/fruit daily' : 'Not eating veg/fruit daily', points: inputs.dailyVeg ? 0 : 1 },
    { label: inputs.bpMeds ? 'On blood-pressure medication' : 'No blood-pressure medication', points: inputs.bpMeds ? 2 : 0 },
    { label: highGlucoseEver ? 'High blood sugar on record' : 'No high blood sugar on record', points: highGlucoseEver ? 5 : 0 },
    {
      label: inputs.family === 'first' ? 'Parent/sibling with diabetes' : inputs.family === 'second' ? 'Extended family with diabetes' : 'No family history',
      points: inputs.family === 'first' ? 5 : inputs.family === 'second' ? 3 : 0,
    },
  ]

  const score = breakdown.reduce((s, b) => s + b.points, 0)
  const [band, tenYearRisk]: [RiskResult['band'], string] =
    score < 7 ? ['low', '≈1 in 100'] : score <= 11 ? ['slightly elevated', '≈1 in 25'] : score <= 14 ? ['moderate', '≈1 in 6'] : score <= 20 ? ['high', '≈1 in 3'] : ['very high', '≈1 in 2']

  return { score, band, tenYearRisk, breakdown }
}

export const MAX_FINDRISC = 26
