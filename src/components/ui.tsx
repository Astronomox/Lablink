import type { ReactNode } from 'react'

// 16px text on mobile stops iOS zooming into focused inputs.
export const inputCls =
  'w-full rounded-[3px] border border-rule bg-white px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-vellum max-lg:rounded-md max-lg:py-2.5 max-lg:text-[16px]'

/** Labelled form field. Use `group` for button groups, which must not sit inside a <label>. */
export function Field({ label, group = false, hint, children }: { label: string; group?: boolean; hint?: string; children: ReactNode }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="flex min-w-0 flex-col gap-1" role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
      <span className="text-[13px] font-bold">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </Tag>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-[3px] border border-rule max-lg:rounded-md">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 border-r border-rule px-2 py-2 text-[14px] last:border-r-0 max-lg:py-2.5 ${value === v ? 'bg-brand-600 font-bold text-white' : 'bg-white text-ink hover:bg-vellum'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Checkbox row; the whole row is the label. */
export function CheckRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[3px] border border-rule bg-white px-3 py-2.5 max-lg:rounded-md">
      <span className="min-w-0">
        <span className="block text-[14px]">{label}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-[18px] shrink-0 accent-brand-600" />
    </label>
  )
}
