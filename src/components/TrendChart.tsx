import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DIABETES_MGDL, PREDIABETES_MGDL, toDisplay, unitLabel } from '../lib/glucose'
import { formatDate } from '../lib/dates'
import type { TestResult, Unit } from '../lib/types'

interface Props {
  results: TestResult[]
  unit: Unit
  /** Tailwind height classes for the chart box. */
  className?: string
}

const TICK = { fontSize: 11, fill: '#5f5f5f', fontFamily: 'Arial, Helvetica, sans-serif' }
const LINE = '#1f5592'

export function TrendChart({ results, unit, className = 'h-56' }: Props) {
  const data = results.map((r) => ({ date: r.date, value: toDisplay(r.valueMgDl, unit), lab: r.lab }))

  const pre = toDisplay(PREDIABETES_MGDL, unit)
  const dia = toDisplay(DIABETES_MGDL, unit)
  const values = data.map((d) => d.value)
  const pad = unit === 'mmol' ? 0.6 : 10
  const step = unit === 'mmol' ? 0.5 : 5
  const lo = Math.min(...values, pre) - pad
  const hi = Math.max(...values, pre) + pad
  const domain: [number, number] = [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]
  const ticks: number[] = []
  for (let t = domain[0]; t <= domain[1] + 1e-9; t += step) ticks.push(Math.round(t * 10) / 10)
  const fmt = (v: number) => (unit === 'mmol' ? v.toFixed(1) : String(v))

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#e3e3e3" />
          <ReferenceLine
            y={pre}
            stroke="#c98a00"
            strokeDasharray="4 3"
            label={{ value: `Prediabetes (${fmt(pre)})`, position: 'insideTopLeft', ...TICK, fill: '#845b00' }}
          />
          {domain[1] > dia && (
            <ReferenceLine y={dia} stroke="#b42318" strokeDasharray="4 3" label={{ value: `Diabetes (${fmt(dia)})`, position: 'insideTopLeft', ...TICK, fill: '#b42318' }} />
          )}
          <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { month: 'short', year: '2-digit' })} tick={TICK} stroke="#cccccc" interval="preserveStartEnd" />
          <YAxis domain={domain} ticks={ticks} tick={TICK} stroke="#cccccc" tickFormatter={fmt} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <div className="border border-rule bg-white px-2 py-1 text-[12px]">
                  <b>
                    {fmt(p.value)} {unitLabel(unit)}
                  </b>
                  <div>{formatDate(p.date)}</div>
                  {p.lab && <div className="text-muted">{p.lab}</div>}
                </div>
              )
            }}
          />
          <Line type="linear" dataKey="value" stroke={LINE} strokeWidth={2} dot={{ r: 3, fill: LINE, stroke: LINE }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
