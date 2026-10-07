import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { DIABETES_MGDL, PREDIABETES_MGDL, toDisplay, unitLabel } from '../lib/glucose'
import { formatDate } from '../lib/dates'
import type { TestResult, Unit } from '../lib/types'

interface Props {
  results: TestResult[]
  unit: Unit
  /** Height classes for the chart box. */
  className?: string
}

export function TrendChart({ results, unit, className = 'h-56' }: Props) {
  const fillId = `fill-${useId().replace(/:/g, '')}`
  const data = results.map((r) => ({ date: r.date, value: toDisplay(r.valueMgDl, unit) }))
  const config = { value: { label: `Fasting blood sugar (${unitLabel(unit)})`, color: 'var(--chart-1)' } } satisfies ChartConfig

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
  const short = (d: string) => formatDate(d, { month: 'short', year: '2-digit' })

  return (
    <ChartContainer config={config} className={cn('aspect-auto w-full', className)}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={short} interval="preserveStartEnd" />
        <YAxis domain={domain} ticks={ticks} tickLine={false} axisLine={false} tickMargin={4} tickFormatter={fmt} width={44} />
        <ReferenceLine y={pre} stroke="var(--chart-2)" strokeDasharray="5 4" label={{ value: `Prediabetes ${fmt(pre)}`, position: 'insideTopLeft', fill: 'var(--chart-2)', fontSize: 11 }} />
        {domain[1] > dia && (
          <ReferenceLine y={dia} stroke="var(--chart-3)" strokeDasharray="5 4" label={{ value: `Diabetes ${fmt(dia)}`, position: 'insideTopLeft', fill: 'var(--chart-3)', fontSize: 11 }} />
        )}
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, p) => formatDate(p?.[0]?.payload?.date ?? '')} />} />
        <Area dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2.5} fill={`url(#${fillId})`} dot={{ r: 3.5, fill: 'var(--color-value)', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
