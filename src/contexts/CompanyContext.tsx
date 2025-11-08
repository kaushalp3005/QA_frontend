'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Company = 'CDPL' | 'CFPL'

interface CompanyContextType {
  currentCompany: Company
  setCurrentCompany: (company: Company) => void
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

interface CompanyProviderProps {
  children: ReactNode
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [currentCompany, setCurrentCompanyState] = useState<Company>('CFPL') // Default to CFPL
  const [isLoading, setIsLoading] = useState(true)

  // Load company preference from localStorage on mount
  useEffect(() => {
    const savedCompany = localStorage.getItem('currentCompany') as Company
    if (savedCompany && (savedCompany === 'CDPL' || savedCompany === 'CFPL')) {
      setCurrentCompanyState(savedCompany)
    }
    setIsLoading(false)
  }, [])

  // Save company preference to localStorage when it changes
  const setCurrentCompany = (company: Company) => {
    setCurrentCompanyState(company)
    localStorage.setItem('currentCompany', company)
    
    // Trigger a custom event to notify other components of the change
    window.dispatchEvent(new CustomEvent('companyChanged', { 
      detail: { company } 
    }))
  }

  const value = {
    currentCompany,
    setCurrentCompany,
    isLoading
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

// Helper function to get company display name
export function getCompanyDisplayName(company: Company): string {
  switch (company) {
    case 'CDPL':
      return 'Candoor Dates Private Limited'
    case 'CFPL':
      return 'Candoor Foods Private Limited'
    default:
      return company
  }
}

// Helper function to get company short name
export function getCompanyShortName(company: Company): string {
  return company
}