'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/styles'

interface ItemCategoryDropdownProps {
  value: string
  onChange: (value: string) => void
  company: string
  placeholder?: string
  error?: boolean
}

export default function ItemCategoryDropdown({
  value,
  onChange,
  company,
  placeholder = 'Select item category...',
  error = false
}: ItemCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCategories()
  }, [company])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        company: company,
        material_type: 'FG'
      })

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sku/dropdown?${params}`
      console.log('Fetching categories from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        setCategories([])
        return
      }
      
      const result = await response.json()
      console.log('Categories API Response:', result)

      if (result.options && Array.isArray(result.options.item_categories)) {
        setCategories(result.options.item_categories)
      } else {
        console.error('Invalid response format from API')
        setCategories([])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (category: string) => {
    onChange(category)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between",
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
        disabled={isLoading}
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
                placeholder="Search categories..."
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
            ) : filteredCategories.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No categories found' : 'No categories available'}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100",
                    value === category && "bg-blue-50 text-blue-600"
                  )}
                >
                  {category}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
