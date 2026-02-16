'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/styles'

interface ItemSubcategoryDropdownProps {
  value: string
  onChange: (value: string) => void
  company: string
  category: string
  placeholder?: string
  error?: boolean
  disabled?: boolean
}

export default function ItemSubcategoryDropdown({
  value,
  onChange,
  company,
  category,
  placeholder = 'Select subcategory...',
  error = false,
  disabled = false
}: ItemSubcategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (category) {
      fetchSubcategories()
    } else {
      setSubcategories([])
    }
  }, [company, category])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSubcategories = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        company: company,
        material_type: 'FG',
        item_category: category
      })

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sku/dropdown?${params}`
      console.log('Fetching subcategories from:', url)

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        setSubcategories([])
        return
      }
      
      const result = await response.json()
      console.log('Subcategories API Response:', result)

      if (result.options && Array.isArray(result.options.sub_categories)) {
        // Add "Other" option at the end
        setSubcategories([...result.options.sub_categories, 'Other'])
      } else {
        console.error('Invalid response format from API')
        setSubcategories(['Other'])
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      setSubcategories(['Other'])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSubcategories = subcategories.filter(subcat =>
    subcat.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (subcategory: string) => {
    onChange(subcategory)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between",
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300',
          (isLoading || disabled) && 'opacity-50 cursor-not-allowed'
        )}
        disabled={isLoading || disabled}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search subcategories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : filteredSubcategories.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No subcategories found' : 'No subcategories available'}
              </div>
            ) : (
              filteredSubcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  onClick={() => handleSelect(subcategory)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100",
                    value === subcategory && "bg-blue-50 text-blue-600"
                  )}
                >
                  {subcategory}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
