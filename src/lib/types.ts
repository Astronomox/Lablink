export type Sex = 'male' | 'female'
export type Unit = 'mmol' | 'mgdl'

/** Lab tests LabLink tracks: fasting blood sugar, HbA1c, blood pressure, total cholesterol. */
export type TestKind = 'fbs' | 'hba1c' | 'bp' | 'chol'

export interface Profile {
  name: string
  age: number
  sex: Sex
  weightKg?: number
  heightCm?: number
  familyHistory: boolean
  /** Display unit for fasting blood sugar and cholesterol. */
  unit: Unit
}

export interface TestResult {
  id: string
  /** ISO date (yyyy-mm-dd) */
  date: string
  /** Which test this is; results saved before multi-test support are fasting blood sugar. */
  kind?: TestKind
  /** Main value in the test's storage unit (see lib/tests.ts); systolic for blood pressure. */
  value: number
  /** Second value where the test has one: diastolic blood pressure. */
  value2?: number
  source: 'founda' | 'manual'
  lab?: string
}

export interface Lab {
  id: string
  name: string
  address: string
  area: string
  lat: number
  lng: number
  hours: string
  phone: string
  /** Price in naira for each test the lab offers. */
  prices: Record<TestKind, number>
  homeSampling: boolean
}
