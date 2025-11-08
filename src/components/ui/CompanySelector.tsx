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
      <div className="flex items-center space-x-2 text-gray-400">
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
          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300",
          isOpen && "bg-gray-200 ring-2 ring-blue-500"
        )}
      >
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="hidden sm:inline font-semibold">{currentCompany}</span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform text-gray-500",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Select Company</h3>
              <p className="text-xs text-gray-500 mt-1">
                Switch between company databases
              </p>
            </div>
            
            {companies.map((company) => (
              <button
                key={company.value}
                onClick={() => handleCompanySelect(company.value)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors",
                  currentCompany === company.value && "bg-blue-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold",
                      company.value === 'CFPL' ? "bg-green-600" : "bg-blue-600"
                    )}>
                      {company.shortName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {company.shortName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {company.label}
                      </div>
                    </div>
                  </div>
                  
                  {currentCompany === company.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-500">
              Company data is stored separately. Switching will show different complaints, customers, and reports.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}