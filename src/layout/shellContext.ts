import { createContext, useContext } from 'react'
import type { Screen } from './nav'

interface ShellContextValue {
  /** Desktop page-title band slot; page headers portal into it. */
  band: HTMLElement | null
  navigate: (screen: Screen) => void
}

export const ShellContext = createContext<ShellContextValue>({ band: null, navigate: () => {} })

export const useShell = () => useContext(ShellContext)
