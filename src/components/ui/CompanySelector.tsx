'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Check } from 'lucide-react'
import { useCompany, Company, getCompanyDisplayName } from '@/contexts/CompanyContext'
import { cn } from '@/lib/styles'

export default function CompanySelector() {
  const { currentCompany, setCurrentCompany, isLoading } = useCompany()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const companies: { value: Company; label: string; shortName: string }[] = [
    { value: 'CFPL', label: 'Candoor Foods Private Limited', shortName: 'CFPL' },
    { value: 'CDPL', label: 'Candoor Dates Private Limited', shortName: 'CDPL' }
  ]

  const handleCompanySelect = (company: Company) => {
    setCurrentCompany(company)
    setIsOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-tan-300">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Company selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
          "bg-cream-50 text-sage-700 hover:bg-beige-100 focus:outline-none focus:ring-2 focus:ring-sage-300 border border-tan-200 shadow-sm",
          isOpen && "bg-beige-100 ring-2 ring-sage-300 border-sage-300"
        )}
      >
        <Building2 className="h-4 w-4 text-sage-600" />
        <span className="hidden sm:inline font-semibold">{currentCompany}</span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform text-tan-300",
          isOpen && "rotate-180 text-sage-400"
        )} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-beige-50 rounded-lg shadow-xl border border-tan-200 z-50 backdrop-blur-sm">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-tan-200">
              <h3 className="text-sm font-medium text-sage-900">Select Company</h3>
              <p className="text-xs text-sage-600 mt-1">
                Switch between company databases
              </p>
            </div>
            
            {companies.map((company) => (
              <button
                key={company.value}
                onClick={() => handleCompanySelect(company.value)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-beige-100 focus:outline-none focus:bg-beige-100 transition-colors",
                  currentCompany === company.value && "bg-sage-50 border-l-4 border-sage-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sage-900 text-xs font-bold shadow-sm",
                      company.value === 'CFPL' ? "bg-sage-200" : "bg-sage-300"
                    )}>
                      {company.shortName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-sage-900">
                        {company.shortName}
                      </div>
                      <div className="text-xs text-sage-600">
                        {company.label}
                      </div>
                    </div>
                  </div>
                  
                  {currentCompany === company.value && (
                    <Check className="h-4 w-4 text-sage-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <div className="border-t border-tan-200 px-4 py-2 bg-cream-50">
            <p className="text-xs text-sage-600">
              Company data is stored separately. Switching will show different complaints, customers, and reports.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}