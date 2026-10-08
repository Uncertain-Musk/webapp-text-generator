'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { OperatingEnvironment } from '@/config/operating-environment'
import { ENVIRONMENT_STORAGE_KEY, parseOperatingEnvironment } from '@/config/operating-environment'

const EnvironmentContext = createContext<{
  environment: OperatingEnvironment | null
  saveEnvironment: (value: OperatingEnvironment | null) => void
  storageUnavailable: boolean
}>({ environment: null, saveEnvironment: () => {}, storageUnavailable: false })

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<OperatingEnvironment | null>(null)
  const [storageUnavailable, setStorageUnavailable] = useState(false)

  useEffect(() => {
    try {
      setEnvironment(parseOperatingEnvironment(localStorage.getItem(ENVIRONMENT_STORAGE_KEY)))
    }
    catch {
      setStorageUnavailable(true)
    }
    const sync = (event: StorageEvent) => {
      if (event.key === ENVIRONMENT_STORAGE_KEY || event.key === null)
        setEnvironment(parseOperatingEnvironment(event.newValue))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const saveEnvironment = (value: OperatingEnvironment | null) => {
    setEnvironment(value)
    try {
      if (value)
        localStorage.setItem(ENVIRONMENT_STORAGE_KEY, JSON.stringify(value))
      else
        localStorage.removeItem(ENVIRONMENT_STORAGE_KEY)
      setStorageUnavailable(false)
    }
    catch {
      setStorageUnavailable(true)
    }
  }

  return <EnvironmentContext.Provider value={{ environment, saveEnvironment, storageUnavailable }}>{children}</EnvironmentContext.Provider>
}

export const useOperatingEnvironment = () => useContext(EnvironmentContext)
