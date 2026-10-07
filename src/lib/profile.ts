import type { Profile } from './types'

export function bmi(profile: Profile): number | undefined {
  if (!profile.weightKg || !profile.heightCm) return undefined
  const m = profile.heightCm / 100
  return Math.round((profile.weightKg / (m * m)) * 10) / 10
}

export function riskFactors(profile: Profile): string[] {
  const factors: string[] = []
  if (profile.age >= 35) factors.push(`Age ${profile.age} (screening advised from 35)`)
  const b = bmi(profile)
  if (b !== undefined && b >= 25) factors.push(`BMI ${b} (${b >= 30 ? 'obesity' : 'overweight'} range)`)
  if (profile.familyHistory) factors.push('Family history of diabetes')
  return factors
}
