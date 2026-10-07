/**
 * Mock of the Founda Health API (FHIR R4, IHE QEDm).
 *
 * The real service exposes provider data through standardized FHIR endpoints,
 * e.g. `GET /Observation?patient={id}&code=http://loinc.org|1558-6,4548-4,85354-9,2093-3`.
 * This mock returns the same shape so swapping in the live endpoint only
 * means replacing `fetchBundle`.
 */
import { addDays, addMonths, toIso, today } from '../lib/dates'
import { TESTS } from '../lib/tests'
import type { TestKind, TestResult } from '../lib/types'

const LOINC_SYSTOLIC = '8480-6'
const LOINC_DIASTOLIC = '8462-4'

interface Quantity {
  value: number
  unit: string
  system: string
  code: string
}

interface Coding {
  system: string
  code: string
  display: string
}

interface FhirObservation {
  resourceType: 'Observation'
  id: string
  status: 'final'
  category: { coding: { system: string; code: string }[] }[]
  code: { coding: Coding[] }
  subject: { reference: string }
  effectiveDateTime: string
  performer: { display: string }[]
  valueQuantity?: Quantity
  component?: { code: { coding: Coding[] }; valueQuantity: Quantity }[]
}

interface FhirBundle {
  resourceType: 'Bundle'
  type: 'searchset'
  total: number
  entry: { fullUrl: string; resource: FhirObservation }[]
}

interface DemoPoint {
  kind: TestKind
  monthsAgo: number
  value: number
  value2?: number
  lab: string
}

// Demo patient history. Fasting blood sugar drifts slowly upward while still "normal" (the demo story);
// the other tests give a realistic picture: HbA1c and blood pressure normal, cholesterol just borderline.
const DEMO_HISTORY: DemoPoint[] = [
  { kind: 'fbs', monthsAgo: 18, value: 88, lab: 'Yaba MedLab' },
  { kind: 'fbs', monthsAgo: 15, value: 89, lab: 'Akoka Diagnostics Centre' },
  { kind: 'fbs', monthsAgo: 12, value: 91, lab: 'Akoka Diagnostics Centre' },
  { kind: 'fbs', monthsAgo: 9, value: 92, lab: 'Mainland Clinical Laboratory' },
  { kind: 'fbs', monthsAgo: 6, value: 94, lab: 'Akoka Diagnostics Centre' },
  { kind: 'fbs', monthsAgo: 3, value: 97, lab: 'Yaba MedLab' },
  { kind: 'hba1c', monthsAgo: 13, value: 5.3, lab: 'Yaba MedLab' },
  { kind: 'hba1c', monthsAgo: 7, value: 5.4, lab: 'Mainland Clinical Laboratory' },
  { kind: 'bp', monthsAgo: 12, value: 118, value2: 76, lab: 'Akoka Diagnostics Centre' },
  { kind: 'bp', monthsAgo: 9, value: 116, value2: 75, lab: 'Mainland Clinical Laboratory' },
  { kind: 'bp', monthsAgo: 6, value: 119, value2: 77, lab: 'Akoka Diagnostics Centre' },
  { kind: 'bp', monthsAgo: 2, value: 117, value2: 76, lab: 'Yaba MedLab' },
  { kind: 'chol', monthsAgo: 14, value: 186, lab: 'Gbagada Precision Labs' },
  { kind: 'chol', monthsAgo: 5, value: 204, lab: 'Yaba MedLab' },
]

const UNITS: Record<TestKind, string> = { fbs: 'mg/dL', hba1c: '%', bp: 'mm[Hg]', chol: 'mg/dL' }
const DISPLAY: Record<TestKind, string> = {
  fbs: 'Fasting glucose [Mass/volume] in Serum or Plasma',
  hba1c: 'Hemoglobin A1c/Hemoglobin.total in Blood',
  bp: 'Blood pressure panel with all children optional',
  chol: 'Cholesterol [Mass/volume] in Serum or Plasma',
}

const quantity = (value: number, unit: string): Quantity => ({ value, unit, system: 'http://unitsofmeasure.org', code: unit })
const loinc = (code: string, display: string): Coding => ({ system: 'http://loinc.org', code, display })

function observation(patientId: string, i: number, date: string, p: DemoPoint): FhirObservation {
  const base = {
    resourceType: 'Observation' as const,
    id: `obs-${p.kind}-${i}`,
    status: 'final' as const,
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: p.kind === 'bp' ? 'vital-signs' : 'laboratory' }] }],
    code: { coding: [loinc(TESTS[p.kind].loinc, DISPLAY[p.kind])] },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: date,
    performer: [{ display: p.lab }],
  }
  if (p.kind === 'bp') {
    return {
      ...base,
      component: [
        { code: { coding: [loinc(LOINC_SYSTOLIC, 'Systolic blood pressure')] }, valueQuantity: quantity(p.value, UNITS.bp) },
        { code: { coding: [loinc(LOINC_DIASTOLIC, 'Diastolic blood pressure')] }, valueQuantity: quantity(p.value2 ?? 0, UNITS.bp) },
      ],
    }
  }
  return { ...base, valueQuantity: quantity(p.value, UNITS[p.kind]) }
}

async function fetchBundle(patientId: string): Promise<FhirBundle> {
  await new Promise((r) => setTimeout(r, 1200)) // simulated network round-trip
  const now = today()
  // The latest fasting blood sugar lands just past its 3-month retest window so the reminder fires.
  const entries = DEMO_HISTORY.map((p, i) => {
    const date = addDays(addMonths(now, -p.monthsAgo), p.kind === 'fbs' && p.monthsAgo === 3 ? -10 : 0)
    const resource = observation(patientId, i, toIso(date), p)
    return { fullUrl: `https://api.founda.health/fhir/Observation/${resource.id}`, resource }
  })
  return { resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries }
}

const KIND_BY_LOINC = Object.fromEntries(Object.values(TESTS).map((t) => [t.loinc, t.kind])) as Record<string, TestKind>

function toResult(obs: FhirObservation): TestResult | null {
  const kind = obs.code.coding.map((c) => KIND_BY_LOINC[c.code]).find(Boolean)
  if (!kind) return null
  const base = { id: obs.id, date: obs.effectiveDateTime.slice(0, 10), kind, source: 'founda' as const, lab: obs.performer[0]?.display }
  if (kind === 'bp') {
    const part = (code: string) => obs.component?.find((c) => c.code.coding.some((x) => x.code === code))?.valueQuantity.value
    const systolic = part(LOINC_SYSTOLIC)
    return systolic === undefined ? null : { ...base, value: systolic, value2: part(LOINC_DIASTOLIC) }
  }
  if (!obs.valueQuantity) return null
  const { value, code } = obs.valueQuantity
  // Convert SI units to the storage unit where a lab reports them.
  const converted = code === 'mmol/L' ? TESTS[kind].fromDisplay(value, 'mmol') : value
  return { ...base, value: converted }
}

/** Pulls the patient's lab history (all tests LabLink tracks) from partner labs. */
export async function importLabHistory(patientId = 'demo-patient'): Promise<TestResult[]> {
  const bundle = await fetchBundle(patientId)
  return bundle.entry.map((e) => toResult(e.resource)).filter((r): r is TestResult => r !== null)
}
