/**
 * Mock of the Founda Health API (FHIR R4, IHE QEDm).
 *
 * The real service exposes provider data through standardized FHIR endpoints,
 * e.g. `GET /Observation?patient={id}&code=http://loinc.org|1558-6`.
 * This mock returns the same shape so swapping in the live endpoint only
 * means replacing `fetchBundle`.
 */
import { addDays, addMonths, toIso, today } from '../lib/dates'
import type { TestResult } from '../lib/types'

export const FASTING_GLUCOSE_LOINC = '1558-6'

interface FhirObservation {
  resourceType: 'Observation'
  id: string
  status: 'final'
  category: { coding: { system: string; code: string }[] }[]
  code: { coding: { system: string; code: string; display: string }[] }
  subject: { reference: string }
  effectiveDateTime: string
  performer: { display: string }[]
  valueQuantity: { value: number; unit: string; system: string; code: string }
  referenceRange: { high: { value: number; unit: string } }[]
}

interface FhirBundle {
  resourceType: 'Bundle'
  type: 'searchset'
  total: number
  entry: { fullUrl: string; resource: FhirObservation }[]
}

// History for the demo patient: a slow upward drift that is still "normal".
const DEMO_HISTORY: { monthsAgo: number; mgdl: number; lab: string }[] = [
  { monthsAgo: 18, mgdl: 88, lab: 'Yaba MedLab' },
  { monthsAgo: 15, mgdl: 89, lab: 'Akoka Diagnostics Centre' },
  { monthsAgo: 12, mgdl: 91, lab: 'Akoka Diagnostics Centre' },
  { monthsAgo: 9, mgdl: 92, lab: 'Mainland Clinical Laboratory' },
  { monthsAgo: 6, mgdl: 94, lab: 'Akoka Diagnostics Centre' },
  { monthsAgo: 3, mgdl: 97, lab: 'Yaba MedLab' },
]

function observation(patientId: string, i: number, date: string, mgdl: number, lab: string): FhirObservation {
  return {
    resourceType: 'Observation',
    id: `obs-fbs-${i}`,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: FASTING_GLUCOSE_LOINC, display: 'Fasting glucose [Mass/volume] in Serum or Plasma' }] },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: date,
    performer: [{ display: lab }],
    valueQuantity: { value: mgdl, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
    referenceRange: [{ high: { value: 99, unit: 'mg/dL' } }],
  }
}

async function fetchBundle(patientId: string): Promise<FhirBundle> {
  await new Promise((r) => setTimeout(r, 1200)) // simulated network round-trip
  const now = today()
  // Last test lands just past its 3-month retest window so the reminder fires.
  const entries = DEMO_HISTORY.map((h, i) => {
    const date = addDays(addMonths(now, -h.monthsAgo), h.monthsAgo === 3 ? -10 : 0)
    const resource = observation(patientId, i, toIso(date), h.mgdl, h.lab)
    return { fullUrl: `https://api.founda.health/fhir/Observation/${resource.id}`, resource }
  })
  return { resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries }
}

function toResult(obs: FhirObservation): TestResult {
  const { value, code } = obs.valueQuantity
  return {
    id: obs.id,
    date: obs.effectiveDateTime.slice(0, 10),
    valueMgDl: code === 'mmol/L' ? value * 18 : value,
    source: 'founda',
    lab: obs.performer[0]?.display,
  }
}

export async function importFastingGlucose(patientId = 'demo-patient'): Promise<TestResult[]> {
  const bundle = await fetchBundle(patientId)
  return bundle.entry
    .map((e) => e.resource)
    .filter((r) => r.code.coding.some((c) => c.code === FASTING_GLUCOSE_LOINC))
    .map(toResult)
}
