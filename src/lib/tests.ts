/**
 * The lab tests LabLink tracks, with units, cut-offs and advice for each.
 *
 * Values are stored in one unit per test (fasting blood sugar and cholesterol
 * in mg/dL, HbA1c in %, blood pressure in mmHg) and converted for display.
 * Cut-offs: ADA (glucose, HbA1c), ACC/AHA 2017 (blood pressure), NCEP ATP III
 * (total cholesterol).
 */
import type { Profile, TestKind, TestResult, Unit } from './types'
import { bmi } from './profile'

export interface Band {
  /** Short status label, e.g. "Prediabetes range". */
  label: string
  /** As used in sentences, e.g. "prediabetes range". */
  range: string
  /** 0 = healthy; higher is worse. */
  level: number
}

export interface TestDef {
  kind: TestKind
  /** Full name, e.g. "Fasting blood sugar". */
  name: string
  /** Name used inside sentences, e.g. "fasting blood sugar". */
  measure: string
  /** Short noun, e.g. "blood sugar" in "Your blood sugar is drifting upward". */
  noun: string
  short: string
  loinc: string
  fasting: boolean
  /** Has a second value (diastolic blood pressure). */
  paired: boolean
  unit: (pref: Unit) => string
  /** Storage unit -> display unit, rounded for display. */
  toDisplay: (v: number, pref: Unit) => number
  fromDisplay: (v: number, pref: Unit) => number
  decimals: (pref: Unit) => number
  bands: Band[]
  classify: (value: number, value2?: number) => number
  /** First unhealthy cut-off of the main value, in storage units (for projections). */
  watchAt: number
  /** Monthly rise (storage units) that counts as drifting, and the minimum used for projections. */
  driftSlope: number
  minSlope: number
  /** Chart reference lines in display units. */
  refLines: (pref: Unit) => { value: number; label: string; level: number }[]
  /** Retest interval in months for each analysis level. */
  retestMonths: Record<'urgent' | 'alert' | 'watch' | 'improving' | 'stable', number>
  /** Cut-off wording per level, used when a result crosses into that level. */
  cutoffText: string[]
  crossNote: string
  crossExtra: string[]
  top: { headline: string; explanation: string; actions: string[] }
  lifestyle: (profile: Profile) => string[]
  /** Valid range in storage units (main value). */
  valid: [number, number]
  /** Sample values for the demo and placeholders, in storage units. */
  sample: { value: number; value2?: number }
}

const MGDL_PER_MMOL_GLUCOSE = 18
const MGDL_PER_MMOL_CHOLESTEROL = 38.67
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d
const overweight = (p: Profile) => (bmi(p) ?? 0) >= 25
const WALK = 'Walk briskly for 30 minutes, at least 5 days a week'

const SUGAR_LIFESTYLE = (p: Profile) => [
  'Swap soft drinks, sweetened malt drinks and juice for water',
  'Halve portions of white rice, bread and swallow; add vegetables and beans',
  WALK,
  ...(overweight(p) ? ['Losing 5–7% of your body weight can cut diabetes risk by more than half'] : []),
]

const SUGAR_BANDS: Band[] = [
  { label: 'Normal', range: 'normal range', level: 0 },
  { label: 'Prediabetes range', range: 'prediabetes range', level: 1 },
  { label: 'Diabetes range', range: 'diabetes range', level: 2 },
]

const SEE_DOCTOR = 'See a doctor within the next 2 weeks and bring your LabLink history'
const NO_SELF_MEDICATION = 'Do not start or stop any medication without medical advice'

export const TESTS: Record<TestKind, TestDef> = {
  fbs: {
    kind: 'fbs',
    name: 'Fasting blood sugar',
    measure: 'fasting blood sugar',
    noun: 'blood sugar',
    short: 'FBS',
    loinc: '1558-6',
    fasting: true,
    paired: false,
    unit: (pref) => (pref === 'mmol' ? 'mmol/L' : 'mg/dL'),
    toDisplay: (v, pref) => (pref === 'mmol' ? round(v / MGDL_PER_MMOL_GLUCOSE, 1) : Math.round(v)),
    fromDisplay: (v, pref) => (pref === 'mmol' ? v * MGDL_PER_MMOL_GLUCOSE : v),
    decimals: (pref) => (pref === 'mmol' ? 1 : 0),
    bands: SUGAR_BANDS,
    classify: (v) => (v < 100 ? 0 : v < 126 ? 1 : 2),
    watchAt: 100,
    driftSlope: 0.75,
    minSlope: 0.1,
    refLines: (pref) => [
      { value: pref === 'mmol' ? 5.6 : 100, label: 'Prediabetes', level: 1 },
      { value: pref === 'mmol' ? 7 : 126, label: 'Diabetes', level: 2 },
    ],
    retestMonths: { urgent: 1, alert: 3, watch: 3, improving: 6, stable: 6 },
    cutoffText: ['', '100 mg/dL (5.6 mmol/L)', '126 mg/dL (7.0 mmol/L)'],
    crossNote: 'Prediabetes can often be reversed with diet and exercise.',
    crossExtra: ['Ask a doctor whether an HbA1c test makes sense'],
    top: {
      headline: 'This result is in the diabetes range',
      explanation:
        'A fasting blood sugar of 126 mg/dL (7.0 mmol/L) or higher needs a doctor’s review. One test is not a diagnosis. A repeat fasting test or an HbA1c test is used to confirm.',
      actions: [SEE_DOCTOR, 'Ask about a confirmatory HbA1c test', NO_SELF_MEDICATION],
    },
    lifestyle: SUGAR_LIFESTYLE,
    valid: [40, 600],
    sample: { value: 103 },
  },

  hba1c: {
    kind: 'hba1c',
    name: 'HbA1c',
    measure: 'HbA1c',
    noun: 'HbA1c',
    short: 'HbA1c',
    loinc: '4548-4',
    fasting: false,
    paired: false,
    unit: () => '%',
    toDisplay: (v) => round(v, 1),
    fromDisplay: (v) => v,
    decimals: () => 1,
    bands: SUGAR_BANDS,
    classify: (v) => (v < 5.7 ? 0 : v < 6.5 ? 1 : 2),
    watchAt: 5.7,
    driftSlope: 0.03,
    minSlope: 0.01,
    refLines: () => [
      { value: 5.7, label: 'Prediabetes', level: 1 },
      { value: 6.5, label: 'Diabetes', level: 2 },
    ],
    retestMonths: { urgent: 1, alert: 6, watch: 6, improving: 12, stable: 12 },
    cutoffText: ['', '5.7%', '6.5%'],
    crossNote: 'Prediabetes can often be reversed with diet and exercise.',
    crossExtra: [],
    top: {
      headline: 'This HbA1c is in the diabetes range',
      explanation: 'An HbA1c of 6.5% or higher needs a doctor’s review. A repeat test is used to confirm before any diagnosis is made.',
      actions: [SEE_DOCTOR, NO_SELF_MEDICATION],
    },
    lifestyle: SUGAR_LIFESTYLE,
    valid: [3, 20],
    sample: { value: 5.4 },
  },

  bp: {
    kind: 'bp',
    name: 'Blood pressure',
    measure: 'blood pressure',
    noun: 'blood pressure',
    short: 'BP',
    loinc: '85354-9',
    fasting: false,
    paired: true,
    unit: () => 'mmHg',
    toDisplay: (v) => Math.round(v),
    fromDisplay: (v) => v,
    decimals: () => 0,
    bands: [
      { label: 'Normal', range: 'normal range', level: 0 },
      { label: 'Elevated', range: 'elevated range', level: 1 },
      { label: 'High, stage 1', range: 'stage 1 range', level: 2 },
      { label: 'High, stage 2', range: 'stage 2 range', level: 3 },
    ],
    classify: (s, d = 0) => (s >= 140 || d >= 90 ? 3 : s >= 130 || d >= 80 ? 2 : s >= 120 ? 1 : 0),
    watchAt: 120,
    driftSlope: 1,
    minSlope: 0.3,
    refLines: () => [
      { value: 130, label: 'High (130/80)', level: 2 },
      { value: 80, label: '', level: 2 },
    ],
    retestMonths: { urgent: 1, alert: 3, watch: 6, improving: 12, stable: 12 },
    cutoffText: ['', '120 mmHg systolic', '130/80 mmHg', '140/90 mmHg'],
    crossNote: 'Lifestyle changes can often bring it back to normal.',
    crossExtra: ['Check your blood pressure at rest on a few different days'],
    top: {
      headline: 'Your blood pressure is in the stage 2 range',
      explanation:
        'A reading of 140/90 mmHg or higher needs a doctor’s review. Blood pressure varies, so a doctor will confirm with repeat readings. If it is 180/120 or higher, or you have chest pain, a severe headache or blurred vision, get urgent care.',
      actions: [SEE_DOCTOR, NO_SELF_MEDICATION],
    },
    lifestyle: (p) => [
      'Cut down on salt: fewer seasoning cubes, less salted fish and processed food',
      WALK,
      'Limit alcohol and avoid smoking',
      ...(overweight(p) ? ['Losing even 5 kg can lower your blood pressure'] : []),
    ],
    valid: [70, 260],
    sample: { value: 118, value2: 76 },
  },

  chol: {
    kind: 'chol',
    name: 'Total cholesterol',
    measure: 'total cholesterol',
    noun: 'cholesterol',
    short: 'Cholesterol',
    loinc: '2093-3',
    fasting: false,
    paired: false,
    unit: (pref) => (pref === 'mmol' ? 'mmol/L' : 'mg/dL'),
    toDisplay: (v, pref) => (pref === 'mmol' ? round(v / MGDL_PER_MMOL_CHOLESTEROL, 1) : Math.round(v)),
    fromDisplay: (v, pref) => (pref === 'mmol' ? v * MGDL_PER_MMOL_CHOLESTEROL : v),
    decimals: (pref) => (pref === 'mmol' ? 1 : 0),
    bands: [
      { label: 'Desirable', range: 'desirable range', level: 0 },
      { label: 'Borderline high', range: 'borderline high range', level: 1 },
      { label: 'High', range: 'high range', level: 2 },
    ],
    classify: (v) => (v < 200 ? 0 : v < 240 ? 1 : 2),
    watchAt: 200,
    driftSlope: 1.5,
    minSlope: 0.5,
    refLines: (pref) => [
      { value: pref === 'mmol' ? 5.2 : 200, label: 'Borderline', level: 1 },
      { value: pref === 'mmol' ? 6.2 : 240, label: 'High', level: 2 },
    ],
    retestMonths: { urgent: 3, alert: 6, watch: 6, improving: 12, stable: 12 },
    cutoffText: ['', '200 mg/dL (5.2 mmol/L)', '240 mg/dL (6.2 mmol/L)'],
    crossNote: 'Diet and exercise can often bring it back down.',
    crossExtra: ['Ask a doctor whether a full lipid profile makes sense'],
    top: {
      headline: 'Your cholesterol is high',
      explanation: 'A total cholesterol of 240 mg/dL (6.2 mmol/L) or higher raises your risk of heart disease. A doctor will usually check a full lipid profile (LDL, HDL and triglycerides).',
      actions: ['Ask a doctor about a full lipid profile', NO_SELF_MEDICATION],
    },
    lifestyle: (p) => [
      'Cook with less palm oil and fewer fried foods; boil, grill or steam instead',
      'Eat more beans, oats, vegetables and fruit for fibre',
      WALK,
      ...(overweight(p) ? ['Losing weight helps lower cholesterol'] : []),
    ],
    valid: [80, 500],
    sample: { value: 186 },
  },
}

export const TEST_KINDS = Object.keys(TESTS) as TestKind[]

export const kindOf = (r: TestResult): TestKind => r.kind ?? 'fbs'

export function bandOf(r: TestResult): Band {
  const def = TESTS[kindOf(r)]
  return def.bands[def.classify(r.value, r.value2)]
}

/** "5.4" / "121/78" in the user's unit, without the unit. */
export function formatNumber(r: TestResult, pref: Unit): string {
  const def = TESTS[kindOf(r)]
  const main = def.toDisplay(r.value, pref).toFixed(def.decimals(pref))
  return def.paired && r.value2 !== undefined ? `${main}/${Math.round(r.value2)}` : main
}

/** "5.4 mmol/L" / "121/78 mmHg" / "5.4%". */
export function formatResult(r: TestResult, pref: Unit): string {
  const unit = TESTS[kindOf(r)].unit(pref)
  return unit === '%' ? `${formatNumber(r, pref)}%` : `${formatNumber(r, pref)} ${unit}`
}

/** Results of one test, oldest first. */
export function resultsOf(results: TestResult[], kind: TestKind): TestResult[] {
  return results.filter((r) => kindOf(r) === kind)
}

/** Accepts saved results from older versions (fasting blood sugar only, stored as `valueMgDl`). */
export function normalizeResults(raw: unknown): TestResult[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((r) => {
    if (!r || typeof r !== 'object') return []
    const o = r as Partial<TestResult> & { valueMgDl?: number }
    const value = o.value ?? o.valueMgDl
    if (typeof value !== 'number' || typeof o.date !== 'string' || typeof o.id !== 'string') return []
    return [{ id: o.id, date: o.date, kind: o.kind ?? 'fbs', value, value2: o.value2, source: o.source ?? 'manual', lab: o.lab }]
  })
}
