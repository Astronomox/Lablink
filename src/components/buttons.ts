import { buttonVariants } from '@/components/ui/button'

/**
 * Button classes for <button> and <a> elements, mapped onto the shadcn button.
 * For responsive hiding use `max-lg:hidden` / `lg:hidden`, never bare `hidden`.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline'
type Size = 'sm' | 'md' | 'lg'

const VARIANT = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
  dangerOutline: 'outline',
} as const

const SIZE = { sm: 'sm', md: 'default', lg: 'lg' } as const

export const btn = (variant: Variant = 'primary', size: Size = 'md') =>
  buttonVariants({ variant: VARIANT[variant], size: SIZE[size], className: variant === 'dangerOutline' ? 'text-destructive hover:text-destructive' : undefined })
