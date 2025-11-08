'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Shield, Search, Calendar, MapPin, Building, Pencil } from 'lucide-react'
import { getLicenses, getLicenseStats, type License, type LicenseStats } from '@/lib/api/licenses'

// Helper function to check if license is expiring soon (within 6 months)
const isExpiringSoon = (validityDate: string) => {
  try {
    // Parse different date formats
    let parsedDate: Date
    
    if (validityDate.includes('/')) {
      // Handle MM/dd/yyyy or dd/MM/yyyy format
      const parts = validityDate.split('/')
      if (parts[0].length === 1 || parts[0].length === 2) {
        // Assume dd/MM/yyyy or MM/dd/yyyy - for Indian context, likely dd/MM/yyyy
        parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      } else {
        parsedDate = new Date(validityDate)
      }
    } else if (validityDate.includes('-')) {
      // Handle dd-MM-yyyy format
      const parts = validityDate.split('-')
      parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    } else {
      parsedDate = new Date(validityDate)
    }
    
    const today = new Date()
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(today.getMonth() + 6)
    
    return parsedDate <= sixMonthsFromNow && parsedDate >= today
  } catch {
    return false
  }
}

// Helper function to check if license is expired
const isExpired = (validityDate: string) => {
  try {
    let parsedDate: Date
    
    if (validityDate.includes('/')) {
      const parts = validityDate.split('/')
      parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    } else if (validityDate.includes('-')) {
      const parts = validityDate.split('-')
      parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    } else {
      parsedDate = new Date(validityDate)
    }
    
    return parsedDate < new Date()
  } catch {
    return false
  }
}

export default function LicenseTrackerPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [licenses, setLicenses] = useState<License[]>([])
  const [stats, setStats] = useState<LicenseStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Load licenses from API
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const [licensesData, statsData] = await Promise.all([
        getLicenses({ limit: 1000 }),
        getLicenseStats()
      ])
      
      setLicenses(licensesData.licenses)
      setStats(statsData)
    } catch (err: any) {
      console.error('Error loading licenses:', err)
      setError(err.message || 'Failed to load licenses')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter licenses based on search and type
  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = 
      license.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.license_no.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || license.type.toLowerCase() === filterType.toLowerCase()
    
    return matchesSearch && matchesType
  })

  // Stats
  const totalLicenses = stats?.total_licenses || 0
  const centralLicenses = stats?.central_licenses || 0
 
  const expiringSoon = licenses.filter(l => isExpiringSoon(l.validity)).length
  const expired = licenses.filter(l => isExpired(l.validity) || l.status === 'Surrender').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-blue-600" />
              License Tracker
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor and track all company licenses and their validity periods
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            <Calendar className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Licenses</p>
                <p className="text-2xl font-semibold text-gray-900">{totalLicenses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Central</p>
                <p className="text-2xl font-semibold text-gray-900">{centralLicenses}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-semibold text-orange-600">{expiringSoon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Expired</p>
                <p className="text-2xl font-semibold text-red-600">{expired}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by company, location, or license number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="central">Central</option>
                <option value="state">State</option>
              </select>
            </div>
          </div>
        </div>

        {/* Licenses Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              License Details ({filteredLicenses.length} of {totalLicenses})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sr.No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issuing Authority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remind Me In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLicenses.map((license, index) => {
                  const expiringSoon = isExpiringSoon(license.validity)
                  const expired = isExpired(license.validity) || license.status === 'Surrender'
                  
                  return (
                    <tr key={license.id} className={expired ? 'bg-red-50' : expiringSoon ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {license.company_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {license.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {license.license_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.validity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          license.type === 'Central' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {license.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.issuing_authority || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.remind_me_in || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {license.status === 'Surrender' ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Surrendered
                          </span>
                        ) : expired ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Expired
                          </span>
                        ) : expiringSoon ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/license-tracker/edit/${license.id}`}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredLicenses.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No licenses found</p>
                <p className="text-gray-400">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}