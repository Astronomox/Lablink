/**
 * Button classes. Variant and size are chosen here (not by appending
 * overrides) so utilities never compete on the same CSS property.
 * For responsive hiding use `max-lg:hidden` / `lg:hidden`, never bare `hidden`.
 */
type Variant = 'primary' | 'secondary' | 'gold' | 'danger' | 'dangerOutline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const BASE = 'inline-flex items-center justify-center gap-1.5 rounded-[3px] border font-bold disabled:cursor-not-allowed disabled:opacity-50'

const VARIANT: Record<Variant, string> = {
  primary: 'border-brand-700 bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border-rule bg-white text-brand-700 hover:bg-brand-50',
  gold: 'border-brand-700 bg-brand-600 text-white hover:bg-brand-700',
  danger: 'border-oxblood-600 bg-oxblood-600 text-white hover:bg-oxblood-500',
  dangerOutline: 'border-oxblood-600 bg-white text-oxblood-600 hover:bg-oxblood-50',
}

const SIZE: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-[12px]',
  md: 'px-3.5 py-2 text-[13px]',
  lg: 'px-4 py-2.5 text-[14px]',
  icon: 'px-2.5 py-2 text-[13px]',
}

export const btn = (variant: Variant = 'primary', size: Size = 'md') => `${BASE} ${VARIANT[variant]} ${SIZE[size]}`
