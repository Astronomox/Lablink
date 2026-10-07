import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { navItem, type Screen } from './nav'
import { useShell } from './shellContext'

interface Props {
  screen?: Screen
  title?: string
  description?: ReactNode
  /** Right-aligned buttons on desktop. */
  actions?: ReactNode
  /** Right-aligned content in the mobile title bar. */
  mobileActions?: ReactNode
  onBack?: () => void
  /** Render the mobile title bar. */
  mobile?: boolean
  stickyMobile?: boolean
}

/** Desktop: breadcrumb and page title above the content. Mobile: a title bar. */
export function PageHeader({ screen, title, description, actions, mobileActions, onBack, mobile = true, stickyMobile = false }: Props) {
  const { band, navigate } = useShell()
  const item = screen ? navItem(screen) : undefined
  const heading = title ?? item?.label ?? ''
  const desc = description ?? item?.description

  return (
    <>
      {band &&
        createPortal(
          <div className="mx-auto flex max-w-[1180px] items-end justify-between gap-6 px-6 pt-8">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
                <button type="button" onClick={() => navigate('home')} className="hover:text-foreground hover:underline">
                  Home
                </button>
                {screen !== 'home' && <> / {heading}</>}
              </nav>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{heading}</h1>
              {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>,
          band,
        )}
      {mobile && (
        <div className={cn('bg-background px-4 pt-4 pb-1 lg:hidden print:hidden', stickyMobile && 'top-mobile-header sticky z-30 pb-3')}>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" className="-ml-2">
                <ArrowLeft className="size-5" />
              </Button>
            )}
            <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{heading}</h1>
            {mobileActions}
          </div>
          {desc && <p className={cn('mt-0.5 text-sm text-muted-foreground', onBack && 'pl-9')}>{desc}</p>}
        </div>
      )}
    </>
  )
}
