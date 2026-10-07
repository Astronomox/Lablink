import { useId } from 'react'
import { cn } from '@/lib/utils'

/** LabLink flame mark. */
export function FlameMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}o`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#dc2626" />
          <stop offset="0.55" stopColor="#f97316" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id={`${id}i`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id}o)`}
        d="M16.6 1.5c.6 4.4 3.7 6.6 6.1 9.6 2.2 2.8 3.6 5.6 3.6 9.1C26.3 26 21.8 30.5 16 30.5S5.7 26 5.7 20.2c0-3.5 1.5-6.5 3.9-8.7.2 2.3 1 4.1 2.6 5.2-.4-6.7 1.6-11.6 4.4-15.2Z"
      />
      <path
        fill={`url(#${id}i)`}
        d="M16.4 14.2c.3 2.5 2 3.7 3.3 5.3 1 1.3 1.6 2.6 1.6 4.2 0 2.9-2.4 5.3-5.3 5.3s-5.3-2.4-5.3-5.3c0-1.7.8-3.2 2-4.2.1 1.2.6 2.1 1.4 2.6-.2-3.3.8-5.8 2.3-7.9Z"
      />
    </svg>
  )
}

/** Flame mark with the LabLink wordmark. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <FlameMark className={markClassName} />
      <span className="text-xl font-bold tracking-tight">LabLink</span>
    </span>
  )
}
