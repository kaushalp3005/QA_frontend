'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/styles'

interface CustomerOption {
  id: string
  name: string
  company: string
  value: string
}

interface CustomerDropdownProps {
  value: string
  onChange: (value: string) => void
  company?: string
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

export default function CustomerDropdown({
  value,
  onChange,
  company = 'CDPL',
  placeholder = 'Select customer...',
  disabled = false,
  error = false,
  className
}: CustomerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch customers when component mounts or search changes
  useEffect(() => {
    fetchCustomers(debouncedSearch)
  }, [debouncedSearch, company])

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const fetchCustomers = async (search: string = '') => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        company: company,
        ...(search && { search })
      })

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/dropdown/customers?${params}`
      console.log('Fetching customers from:', url) // Debug log
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        setCustomers([])
        return
      }
      
      const result = await response.json()

      // Handle different response formats
      let customersData: any[] = []
      
      if (result.customers && Array.isArray(result.customers)) {
        // Format: {customers: [...], meta: {...}}
        customersData = result.customers.map((customer: any) => ({
          id: customer.id.toString(),
          name: customer.customer_name,
          value: customer.customer_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          company: company
        }))
      } else if (result.success && Array.isArray(result.data)) {
        // Format: {success: true, data: [...]}
        customersData = result.data
      } else if (Array.isArray(result)) {
        // Direct array response
        customersData = result
      } else if (result.data && Array.isArray(result.data)) {
        // Has data property but no success flag
        customersData = result.data
      } else {
        console.error('Invalid response format from API')
        setCustomers([])
        return
      }

      // Add "Other" option at the end
      customersData.push({
        id: 'other',
        name: 'Other',
        value: 'other',
        company: company
      })

      setCustomers(customersData)
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCustomer = customers.find(c => 
    c.value === value || 
    c.name === value || 
    c.value.toLowerCase() === value.toLowerCase() ||
    c.name.toUpperCase().replace(/\s+/g, '_') === value
  )
  const displayValue = selectedCustomer ? selectedCustomer.name : (value || placeholder)

  const handleSelect = (customerValue: string) => {
    onChange(customerValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "flex items-center justify-between",
          error && "border-red-300 focus:border-red-500 focus:ring-red-500",
          disabled && "bg-gray-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-blue-500"
        )}
      >
        <span className={cn(
          "block truncate",
          !selectedCustomer && "text-gray-400"
        )}>
          {displayValue}
        </span>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-auto">
            {customers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {isLoading ? 'Loading...' : 'No customers found'}
              </div>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer.value)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100",
                    customer.value === value && "bg-blue-50 text-blue-600 font-medium"
                  )}
                >
                  {customer.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}