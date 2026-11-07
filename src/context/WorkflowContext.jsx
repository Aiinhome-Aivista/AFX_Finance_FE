import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const WorkflowContext = createContext(null)

export function WorkflowProvider({ children }) {
  // Store domain progress map: { [slug]: { isKG1Ready, hasFiles, isGapMode, isFinalized, viewMode } }
  const [domainMap, setDomainMap] = useState({})

  const updateDomainWorkflow = useCallback((slug, updates) => {
    if (!slug) return
    setDomainMap((prev) => ({
      ...prev,
      [slug]: {
        ...(prev[slug] || {}),
        ...updates,
      },
    }))
  }, [])

  const value = useMemo(
    () => ({
      domainMap,
      updateDomainWorkflow,
    }),
    [domainMap, updateDomainWorkflow]
  )

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) {
    return {
      domainMap: {},
      updateDomainWorkflow: () => { },
    }
  }
  return ctx
}

