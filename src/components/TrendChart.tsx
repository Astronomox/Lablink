import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { formatDate } from '../lib/dates'
import { TESTS } from '../lib/tests'
import type { TestKind, TestResult, Unit } from '../lib/types'

interface Props {
  /** Results of one test, oldest first. */
  results: TestResult[]
  kind: TestKind
  unit: Unit
  /** Height classes for the chart box. */
  className?: string
}

const LINE_COLOR = ['var(--chart-3)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-3)']

export function TrendChart({ results, kind, unit, className = 'h-56' }: Props) {
  const id = useId().replace(/:/g, '')
  const def = TESTS[kind]
  const data = results.map((r) => ({ date: r.date, value: def.toDisplay(r.value, unit), value2: r.value2 }))
  const unitLabel = def.unit(unit)
  const config: ChartConfig = (
    def.paired
      ? { value: { label: 'Systolic', color: 'var(--chart-1)' }, value2: { label: 'Diastolic', color: 'var(--chart-5)' } }
      : { value: { label: `${def.name} (${unitLabel})`, color: 'var(--chart-1)' } }
  )

  const lines = def.refLines(unit)
  const values = data.flatMap((d) => (d.value2 === undefined ? [d.value] : [d.value, d.value2]))
  const span = Math.max(...values, ...lines.map((l) => l.value)) - Math.min(...values, ...lines.map((l) => l.value))
  const step = niceStep(span)
  const lo = Math.min(...values, lines[0].value) - step
  const hi = Math.max(...values, lines[0].value) + step
  const domain: [number, number] = [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]
  const ticks: number[] = []
  for (let t = domain[0]; t <= domain[1] + 1e-9; t += step) ticks.push(Math.round(t * 10) / 10)
  const decimals = step < 1 ? 1 : 0
  const fmt = (v: number) => v.toFixed(decimals)
  const short = (d: string) => formatDate(d, { month: 'short', year: '2-digit' })

  return (
    <ChartContainer config={config} className={cn('aspect-auto w-full', className)}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={short} interval="preserveStartEnd" />
        <YAxis domain={domain} ticks={ticks} tickLine={false} axisLine={false} tickMargin={4} tickFormatter={fmt} width={44} />
        {lines
          .filter((l) => l.value >= domain[0] && l.value <= domain[1])
          .map((l) => (
            <ReferenceLine
              key={`${l.label}-${l.value}`}
              y={l.value}
              stroke={LINE_COLOR[l.level]}
              strokeDasharray="5 4"
              label={l.label ? { value: `${l.label} ${fmt(l.value)}`, position: 'insideTopLeft', fill: LINE_COLOR[l.level], fontSize: 11 } : undefined}
            />
          ))}
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, p) => formatDate(p?.[0]?.payload?.date ?? '')} />} />
        <Area dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2.5} fill={`url(#fill-${id})`} dot={{ r: 3.5, fill: 'var(--color-value)', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        {def.paired && (
          <Area dataKey="value2" type="monotone" stroke="var(--color-value2)" strokeWidth={2.5} fill="none" dot={{ r: 3.5, fill: 'var(--color-value2)', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        )}
      </AreaChart>
    </ChartContainer>
  )
}

/** A round tick step giving roughly 5 ticks across the span. */
function niceStep(span: number): number {
  const raw = Math.max(span, 0.5) / 5
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
}
