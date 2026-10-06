export type Sex = 'male' | 'female'
export type Unit = 'mmol' | 'mgdl'

export interface Profile {
  name: string
  age: number
  sex: Sex
  weightKg?: number
  heightCm?: number
  familyHistory: boolean
  unit: Unit
}

export interface TestResult {
  id: string
  /** ISO date (yyyy-mm-dd) */
  date: string
  /** Canonical storage unit; converted for display */
  valueMgDl: number
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
  fbsPrice: number
  homeSampling: boolean
}
