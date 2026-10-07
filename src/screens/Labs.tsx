import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, ZoomControl } from 'react-leaflet'
import { Badge } from '@/components/ui/badge'
import { Panel } from '../components/Panel'
import { btn } from '../components/buttons'
import { DEFAULT_LOCATION, distanceKm, isOpenNow, PARTNER_LABS } from '../data/labs'
import { PageHeader } from '../layout/PageHeader'
import { isDesktopNow } from '../layout/useMedia'
import type { Lab } from '../lib/types'

const LAGOS_RADIUS_KM = 60

interface Props {
  onBack: () => void
  onBook: (lab: Lab) => void
}

function pin(selected: boolean, label: string) {
  const bg = selected ? '#b42318' : '#1f5592'
  return L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -14],
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};border:2px solid #fff;color:#fff;display:grid;place-items:center;font:700 12px/1 Arial,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.4)">${label}</div>`,
  })
}

const youIcon = L.divIcon({
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  tooltipAnchor: [0, -9],
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#2a64a8;border:3px solid #fff;box-shadow:0 0 0 1px #2a64a8"></div>',
})

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 0.6 })
  }, [lat, lng, map])
  return null
}

export function Labs({ onBack, onBook }: Props) {
  const [here, setHere] = useState<{ lat: number; lng: number; label: string }>(DEFAULT_LOCATION)
  const [selected, setSelected] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        // Partner labs are Lagos-only; outside Lagos keep the campus default.
        if (distanceKm(p, DEFAULT_LOCATION) < LAGOS_RADIUS_KM) setHere({ ...p, label: 'Your location' })
      },
      () => {},
      { timeout: 5000 },
    )
  }, [])

  const labs = useMemo(
    () => PARTNER_LABS.map((lab) => ({ lab, km: distanceKm(here, lab), open: isOpenNow(lab.hours) })).sort((a, b) => a.km - b.km),
    [here],
  )
  const focus = labs.find((l) => l.lab.id === selected)?.lab

  const selectFromMap = (id: string) => {
    setSelected(id)
    if (isDesktopNow()) itemRefs.current[id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <>
      <PageHeader screen="labs" onBack={onBack} description={`Nearest first, from ${here.label}. Fast for 8 to 12 hours before the test.`} />

      <div className="max-lg:space-y-3 max-lg:px-4 max-lg:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="lg:sticky lg:top-4 lg:order-2">
          <div className="isolate h-60 overflow-hidden rounded-2xl ring-1 ring-foreground/10 lg:h-[560px]">
            <MapContainer center={[here.lat, here.lng]} zoom={13} zoomControl={false} className="h-full w-full">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ZoomControl position="bottomright" />
              <Marker position={[here.lat, here.lng]} icon={youIcon}>
                <Tooltip direction="top">{here.label}</Tooltip>
              </Marker>
              {labs.map(({ lab }, i) => (
                <Marker key={lab.id} position={[lab.lat, lab.lng]} icon={pin(lab.id === selected, String(i + 1))} eventHandlers={{ click: () => selectFromMap(lab.id) }}>
                  <Tooltip direction="top">{lab.name}</Tooltip>
                </Marker>
              ))}
              {focus && <FlyTo lat={focus.lat} lng={focus.lng} />}
            </MapContainer>
          </div>
        </div>

        <Panel title={`${labs.length} partner labs`} className="lg:order-1" bodyClassName="">
          <ol className="divide-y divide-border">
            {labs.map(({ lab, km, open }, i) => {
              const isSel = lab.id === selected
              return (
                <li
                  key={lab.id}
                  ref={(el) => {
                    itemRefs.current[lab.id] = el
                  }}
                  className={`px-5 py-4 transition-colors ${isSel ? 'bg-accent' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" aria-pressed={isSel} onClick={() => setSelected(lab.id)} className="min-w-0 text-left">
                      <span className="font-semibold hover:underline">
                        {i + 1}. {lab.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">{lab.address}</span>
                    </button>
                    <span className="shrink-0 text-sm font-semibold">{km.toFixed(1)} km</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                    <Badge variant="secondary" className={open ? 'bg-green-50 text-green-700' : ''}>
                      {open ? 'Open now' : 'Closed'}
                    </Badge>
                    <span className="text-muted-foreground">{lab.hours.replace(' · ', ', ')}</span>
                    <span className="font-semibold">from ₦{Math.min(...Object.values(lab.prices)).toLocaleString('en-NG')}</span>
                    {lab.homeSampling && <Badge variant="outline">Home collection</Badge>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => onBook(lab)} className={`${btn('primary')} max-lg:flex-1`}>
                      Book test
                    </button>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${lab.lat},${lab.lng}`} target="_blank" rel="noreferrer" className={btn('secondary')}>
                      Directions
                    </a>
                    <a href={`tel:${lab.phone.replace(/\s/g, '')}`} className={btn('secondary')}>
                      Call
                    </a>
                  </div>
                </li>
              )
            })}
          </ol>
        </Panel>
      </div>
      <p className="mt-3 text-xs text-muted-foreground max-lg:px-4">These are demo partner labs.</p>
    </>
  )
}
