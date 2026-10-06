import type { Unit } from './types'

// ADA fasting plasma glucose cut-offs, in mg/dL.
export const PREDIABETES_MGDL = 100
export const DIABETES_MGDL = 126
export const MGDL_PER_MMOL = 18

export type Category = 'normal' | 'prediabetes' | 'diabetes'

export function categorize(mgdl: number): Category {
  if (mgdl >= DIABETES_MGDL) return 'diabetes'
  if (mgdl >= PREDIABETES_MGDL) return 'prediabetes'
  return 'normal'
}

export const CATEGORY_LABEL: Record<Category, string> = {
  normal: 'Normal',
  prediabetes: 'Prediabetes range',
  diabetes: 'Diabetes range',
}

export function toDisplay(mgdl: number, unit: Unit): number {
  return unit === 'mmol' ? Math.round((mgdl / MGDL_PER_MMOL) * 10) / 10 : Math.round(mgdl)
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'mmol' ? value * MGDL_PER_MMOL : value
}

export function unitLabel(unit: Unit): string {
  return unit === 'mmol' ? 'mmol/L' : 'mg/dL'
}

export function formatValue(mgdl: number, unit: Unit): string {
  const v = toDisplay(mgdl, unit)
  return `${unit === 'mmol' ? v.toFixed(1) : v} ${unitLabel(unit)}`
}
