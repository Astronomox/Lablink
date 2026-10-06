import { X, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from './useModal'

interface Props {
  title: string
  onClose: () => void
  /** Kept for existing callers; not shown. */
  icon?: LucideIcon
  /** Actions pinned under the scrolling body. */
  footer?: ReactNode
  children: ReactNode
}

/** Bottom sheet on mobile; centred dialog on desktop. */
export function Sheet({ title, onClose, footer, children }: Props) {
  const ref = useModal<HTMLDivElement>(onClose)
  const titleId = useId()
  // Portalled to <body> so no ancestor stacking context can trap it under the app chrome.
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center lg:items-center lg:p-6 print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-xl bg-white outline-none lg:max-h-[88vh] lg:rounded-[3px] lg:border lg:border-rule"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3 lg:bg-vellum lg:py-2">
          <h2 id={titleId} className="min-w-0 truncate text-[17px] font-bold lg:text-[15px]">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className={`overflow-y-auto overscroll-contain px-4 pt-4 ${footer ? 'pb-4' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-rule px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
