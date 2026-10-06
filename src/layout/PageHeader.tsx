import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { navItem, type Screen } from './nav'
import { useShell } from './shellContext'

interface Props {
  screen?: Screen
  title?: string
  description?: ReactNode
  /** Kept for existing callers; not shown. */
  section?: string
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
          <div className="mx-auto flex max-w-[1100px] items-end justify-between gap-6 px-5 pt-4">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="text-[12px] text-muted">
                <button type="button" onClick={() => navigate('home')} className="text-brand-600 hover:underline">
                  Home
                </button>
                {heading !== 'Dashboard' && <> &gt; {heading}</>}
              </nav>
              <h1 className="mt-0.5 text-[20px] font-bold">{heading}</h1>
              {desc && <p className="text-[13px] text-muted">{desc}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>,
          band,
        )}
      {mobile && (
        <div className={`border-b border-rule bg-white px-3 py-2.5 lg:hidden print:hidden ${stickyMobile ? 'top-mobile-header sticky z-30' : ''}`}>
          <div className="flex items-center gap-2">
            {onBack && (
              <button type="button" onClick={onBack} aria-label="Back" className="grid size-9 shrink-0 place-items-center text-brand-700">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="min-w-0 flex-1 text-[17px] font-bold">{heading}</h1>
            {mobileActions}
          </div>
          {desc && <div className={`mt-0.5 text-[13px] text-muted ${onBack ? 'pl-11' : ''}`}>{desc}</div>}
        </div>
      )}
    </>
  )
}
