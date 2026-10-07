import { useId, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Band } from '../lib/tests'

interface PanelProps {
  title?: ReactNode
  /** Right-aligned header content, e.g. a `PanelLink`. */
  action?: ReactNode
  as?: 'section' | 'article' | 'aside' | 'div'
  className?: string
  /** Body padding; pass '' for edge-to-edge tables and lists. */
  bodyClassName?: string
  children: ReactNode
}

/** A titled card (shadcn card surface, rendered as a landmark element). */
export function Panel({ title, action, as: Tag = 'section', className, bodyClassName, children }: PanelProps) {
  const id = useId()
  return (
    <Tag
      data-slot="card"
      aria-labelledby={title ? id : undefined}
      className={cn('flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10', className)}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 id={id} className="min-w-0 truncate text-[15px] font-semibold">
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClassName ?? (title ? 'px-5 pb-5' : 'p-5')}>{children}</div>
    </Tag>
  )
}

export function PanelLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-sm font-medium text-primary hover:underline">
      {children}
    </button>
  )
}

const TONE = ['bg-green-50 text-green-700', 'bg-amber-50 text-amber-700', 'bg-red-50 text-red-700', 'bg-red-100 text-red-800']

/** Status badge for a result band (Normal, Prediabetes range, High, ...). */
export function StatusPill({ band, className }: { band: Band; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(TONE[Math.min(band.level, TONE.length - 1)], className)}>
      {band.label}
    </Badge>
  )
}
