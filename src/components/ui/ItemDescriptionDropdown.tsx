'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/styles'

interface ItemDescriptionDropdownProps {
  value: string
  onChange: (value: string) => void
  company: string
  category: string
  subcategory: string
  placeholder?: string
  error?: boolean
  disabled?: boolean
}

export default function ItemDescriptionDropdown({
  value,
  onChange,
  company,
  category,
  subcategory,
  placeholder = 'Select item description...',
  error = false,
  disabled = false
}: ItemDescriptionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (category && subcategory && subcategory !== 'Other') {
      fetchItems()
    } else {
      setItems([])
    }
  }, [company, category, subcategory])

  // Add current value to items if not present (for auto-filled values)
  useEffect(() => {
    if (value && !items.includes(value)) {
      console.log('Adding current value to items list:', value)
      setItems(prev => [value, ...prev])
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        company: company,
        material_type: 'FG',
        item_category: category,
        sub_category: subcategory,
        limit: '500'
      })

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sku/dropdown?${params}`
      console.log('Fetching items from:', url)

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        setItems([])
        return
      }
      
      const result = await response.json()
      console.log('Items API Response:', result)

      if (result.options && Array.isArray(result.options.item_descriptions)) {
        setItems(result.options.item_descriptions)
      } else {
        console.error('Invalid response format from API')
        setItems([])
      }
    } catch (error) {
      console.error('Error fetching items:', error)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (item: string) => {
    onChange(item)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleSearchWithAPI = async (search: string) => {
    if (!search || search.length < 2) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        company: company,
        material_type: 'FG',
        search: search,
        limit: '100'
      })

      // If category and subcategory are selected, include them
      if (category) params.append('item_category', category)
      if (subcategory && subcategory !== 'Other') params.append('sub_category', subcategory)

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sku/dropdown?${params}`
      console.log('Searching items from:', url)

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        return
      }
      
      const result = await response.json()

      if (result.options && Array.isArray(result.options.item_descriptions)) {
        setItems(result.options.item_descriptions)
      }
    } catch (error) {
      console.error('Error searching items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timer = setTimeout(() => {
        handleSearchWithAPI(searchTerm)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchTerm])

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
                placeholder="Search items..."
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
            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to search</p>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No items found' : 'No items available'}
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100",
                    value === item && "bg-blue-50 text-blue-600"
                  )}
                >
                  {item}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
