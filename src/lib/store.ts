import { useCallback, useEffect, useState } from 'react'

/** useState backed by localStorage; degrades to memory-only if storage is blocked. */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, [key, value])

  return [value, useCallback((v) => setValue(v), [])]
}

export function clearAll(keys: string[]) {
  try {
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
