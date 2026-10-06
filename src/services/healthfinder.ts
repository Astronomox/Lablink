/**
 * ODPHP MyHealthfinder API v4.
 * The API sends no CORS headers, so the browser calls it through the Vite
 * dev proxy at /api/healthfinder. If that fails (offline, built preview),
 * we fall back to a cached copy of the relevant recommendations.
 */
import type { Profile } from '../lib/types'

export interface Recommendation {
  id: string
  title: string
  category: string
  url: string
  imageUrl?: string
}

// Topics most relevant to blood-sugar risk come first.
const PRIORITY_IDS = ['30536', '30539', '533', '30594']

const FALLBACK: Recommendation[] = [
  {
    id: '30536',
    title: 'Take Steps to Prevent Type 2 Diabetes',
    category: 'At risk for',
    url: 'https://odphp.health.gov/myhealthfinder/health-conditions/diabetes/take-steps-prevent-type-2-diabetes',
  },
  {
    id: '30539',
    title: 'Eat Healthy',
    category: 'Concerned about',
    url: 'https://odphp.health.gov/myhealthfinder/health-conditions/diabetes/eat-healthy',
  },
  {
    id: '533',
    title: 'Get Your Blood Pressure Checked',
    category: 'Screenings/visits/vaccines',
    url: 'https://odphp.health.gov/myhealthfinder/doctor-visits/screening-tests/get-your-blood-pressure-checked',
  },
]

interface RawResource {
  Id: string
  Title: string
  MyHFCategory?: string
  AccessibleVersion?: string
  ImageUrl?: string
}

export async function fetchRecommendations(profile: Profile, limit = 3): Promise<{ items: Recommendation[]; live: boolean }> {
  try {
    const params = new URLSearchParams({ age: String(profile.age), sex: profile.sex, lang: 'en' })
    const res = await fetch(`/api/healthfinder/myhealthfinder/api/v4/myhealthfinder.json?${params}`, {
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const raw: RawResource[] = json?.Result?.Resources?.All?.Resource ?? []
    if (raw.length === 0) throw new Error('empty')
    const rank = (r: RawResource) => {
      const i = PRIORITY_IDS.indexOf(r.Id)
      return i === -1 ? PRIORITY_IDS.length : i
    }
    const items = [...raw]
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, limit)
      .map((r) => ({
        id: r.Id,
        title: r.Title,
        category: r.MyHFCategory ?? '',
        url: r.AccessibleVersion ?? 'https://odphp.health.gov/myhealthfinder',
        imageUrl: r.ImageUrl,
      }))
    return { items, live: true }
  } catch {
    return { items: FALLBACK.slice(0, limit), live: false }
  }
}
