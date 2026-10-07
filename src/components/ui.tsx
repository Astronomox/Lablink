import { useId, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/** Styling for native <select> elements so they match the shadcn Input. */
export const selectCls =
  'h-10 w-full min-w-0 rounded-4xl border border-input bg-input/30 px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

/** Labelled form field. Use `group` for button groups, which must not sit inside a <label>. */
export function Field({ label, group = false, hint, children }: { label: string; group?: boolean; hint?: string; children: ReactNode }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="flex min-w-0 flex-col gap-1.5" role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Tag>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="w-full"
    >
      {options.map(([v, label]) => (
        <ToggleGroupItem key={v} value={v} className="h-10 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Checkbox row; the whole row is clickable. */
export function CheckRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <Label
      htmlFor={id}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 font-normal has-data-[state=checked]:border-primary/40 has-data-[state=checked]:bg-accent"
    >
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
    </Label>
  )
}
