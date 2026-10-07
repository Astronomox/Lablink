import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet as SheetRoot, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '../layout/useMedia'

interface Props {
  title: string
  onClose: () => void
  /** Actions pinned under the scrolling body. */
  footer?: ReactNode
  children: ReactNode
}

/** Bottom sheet on mobile; centred dialog on desktop. Rendered while open. */
export function Sheet({ title, onClose, footer, children }: Props) {
  const desktop = useIsDesktop()
  const onOpenChange = (open: boolean) => !open && onClose()
  const body = <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
  const actions = footer && <div className="border-t border-border px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>

  if (desktop) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">{title}</DialogDescription>
          </DialogHeader>
          {body}
          {actions}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <SheetRoot open onOpenChange={onOpenChange}>
      {/* No auto-focus on phones: it would open the keyboard before the user has read the sheet. */}
      <SheetContent side="bottom" className="max-h-[92dvh] gap-0 rounded-t-4xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{title}</SheetDescription>
        </SheetHeader>
        {body}
        {actions}
      </SheetContent>
    </SheetRoot>
  )
}
