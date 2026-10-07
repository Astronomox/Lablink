import type { Lab } from '../lib/types'

// Fictional demo partner labs around Lagos Mainland. Prices are illustrative, in naira.
export const PARTNER_LABS: Lab[] = [
  {
    id: 'akoka',
    name: 'Akoka Diagnostics Centre',
    address: '14 St. Finbarr’s College Rd, Akoka',
    area: 'Akoka',
    lat: 6.5205,
    lng: 3.3925,
    hours: 'Mon–Sat · 7:00–18:00',
    phone: '+234 801 000 0101',
    prices: { fbs: 2500, hba1c: 7500, bp: 500, chol: 5000 },
    homeSampling: true,
  },
  {
    id: 'yaba',
    name: 'Yaba MedLab',
    address: '22 Herbert Macaulay Way, Yaba',
    area: 'Yaba',
    lat: 6.5095,
    lng: 3.3768,
    hours: 'Mon–Sun · 6:30–20:00',
    phone: '+234 801 000 0202',
    prices: { fbs: 3000, hba1c: 8500, bp: 1000, chol: 6000 },
    homeSampling: false,
  },
  {
    id: 'mainland',
    name: 'Mainland Clinical Laboratory',
    address: '5 Commercial Ave, Sabo, Yaba',
    area: 'Sabo',
    lat: 6.5032,
    lng: 3.3802,
    hours: 'Mon–Fri · 7:30–17:00',
    phone: '+234 801 000 0303',
    prices: { fbs: 2000, hba1c: 7000, bp: 500, chol: 4500 },
    homeSampling: false,
  },
  {
    id: 'bariga',
    name: 'Bariga Community Health Lab',
    address: '31 Ilaje Rd, Bariga',
    area: 'Bariga',
    lat: 6.5398,
    lng: 3.3869,
    hours: 'Mon–Sat · 7:00–16:00',
    phone: '+234 801 000 0404',
    prices: { fbs: 1800, hba1c: 6500, bp: 500, chol: 4000 },
    homeSampling: true,
  },
  {
    id: 'surulere',
    name: 'Unity Diagnostics Surulere',
    address: '48 Adeniran Ogunsanya St, Surulere',
    area: 'Surulere',
    lat: 6.4935,
    lng: 3.3561,
    hours: 'Mon–Sun · 7:00–21:00',
    phone: '+234 801 000 0505',
    prices: { fbs: 3500, hba1c: 9000, bp: 1000, chol: 6500 },
    homeSampling: true,
  },
  {
    id: 'gbagada',
    name: 'Gbagada Precision Labs',
    address: '9 Diya St, Gbagada Phase 1',
    area: 'Gbagada',
    lat: 6.5552,
    lng: 3.3901,
    hours: 'Mon–Sat · 7:00–19:00',
    phone: '+234 801 000 0606',
    prices: { fbs: 2800, hba1c: 8000, bp: 1000, chol: 5500 },
    homeSampling: false,
  },
]

/** University of Lagos, Akoka — used when location access is unavailable. */
export const DEFAULT_LOCATION = { lat: 6.5158, lng: 3.3896, label: 'UNILAG, Akoka' }

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Parses hours like "Mon–Sat · 7:00–18:00" to decide whether a lab is open. */
export function isOpenNow(hours: string, now = new Date()): boolean {
  const m = hours.match(/(\w{3})–(\w{3}) · (\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})/)
  if (!m) return false
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const from = days.indexOf(m[1])
  const to = days.indexOf(m[2])
  const day = now.getDay()
  const inDays = from <= to ? day >= from && day <= to : day >= from || day <= to
  const mins = now.getHours() * 60 + now.getMinutes()
  const open = Number(m[3]) * 60 + Number(m[4])
  const close = Number(m[5]) * 60 + Number(m[6])
  return inDays && mins >= open && mins < close
}
