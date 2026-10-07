import { cn } from '@/lib/utils'

/** LabLink logo: flask-and-link mark with the "lablink" wordmark. Set the height; width follows. */
export function Logo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="LabLink" width={1791} height={599} className={cn('h-8 w-auto', className)} />
}

/** The flask-and-link mark on its own, for tight spaces. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo-mark.png" alt="" width={993} height={965} className={cn('size-8', className)} />
}
