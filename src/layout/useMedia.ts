import { useSyncExternalStore } from 'react'

/** Desktop portal layout from 1024px; below that the mobile app layout. */
export const DESKTOP_QUERY = '(min-width: 1024px)'

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = () => useMedia(DESKTOP_QUERY)
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const isDesktopNow = () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
