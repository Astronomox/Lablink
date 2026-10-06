import { type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { CATEGORY_LABEL, type Category } from '../lib/glucose'

interface PanelProps {
  title?: ReactNode
  /** Kept for existing callers; not shown. */
  icon?: LucideIcon
  /** Right-aligned header content, e.g. a `PanelLink`. */
  action?: ReactNode
  /** Kept for existing callers; both tones render the same. */
  tone?: 'plain' | 'green'
  as?: 'section' | 'article' | 'aside' | 'div'
  headingLevel?: 2 | 3
  className?: string
  bodyClassName?: string
  footer?: ReactNode
  children: ReactNode
}

/** Bordered box with a grey header row. */
export function Panel({ title, action, as: Tag = 'section', headingLevel = 2, className = '', bodyClassName = 'p-3 max-lg:px-4', footer, children }: PanelProps) {
  const id = useId()
  const H = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <Tag className={`panel max-lg:overflow-hidden max-lg:rounded-lg max-lg:border-rule-soft ${className}`} aria-labelledby={title ? id : undefined}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-rule bg-vellum px-3 py-2 max-lg:border-rule-soft max-lg:bg-white max-lg:px-4 max-lg:pt-3 max-lg:pb-2.5">
          <H id={id} className="min-w-0 truncate text-[13px] font-bold max-lg:text-[15px]">
            {title}
          </H>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer}
    </Tag>
  )
}

export function PanelLink({ onClick, children }: { onClick: () => void; children: ReactNode; dark?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-[12px] text-brand-600 hover:underline max-lg:text-[14px]">
      {children}
    </button>
  )
}

const PILL: Record<Category, string> = {
  normal: 'text-[#1e7b34]',
  prediabetes: 'text-ochre-700',
  diabetes: 'text-oxblood-600',
}

export function StatusPill({ category, className = '' }: { category: Category; className?: string }) {
  return <span className={`text-[12px] font-bold whitespace-nowrap ${PILL[category]} ${className}`}>{CATEGORY_LABEL[category]}</span>
}
