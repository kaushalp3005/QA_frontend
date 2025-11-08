'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { 
  Search,
  BarChart3,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Printer,
  FileText
} from 'lucide-react'
import { cardStyles, layoutStyles, textStyles, badgeStyles, cn } from '@/lib/styles'
import { getRCAList } from '@/lib/api/rca'
import { getFishboneAnalyses } from '@/lib/api/fishbone'
import { getLicenses, type License } from '@/lib/api/licenses'
import type { RCAResponse } from '@/lib/api/rca'
import type { FishboneListItem } from '@/lib/api/fishbone'
import { useCompany } from '@/contexts/CompanyContext'

interface RCARecord {
  rca_id: number
  rca_number: string
  problem_statement: string
  status: string
  created_at: string
}

interface FishboneRecord {
  fishbone_id: number
  fishbone_number?: string
  complaint_id?: string
  problem_statement: string
  status?: string
  created_at: string
  created_by?: string
  analysis_date?: string
}

interface LicenseRecord {
  license_id: number
  license_type: string
  license_number: string
  status: string
  expiry_date: string
  created_at: string
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft':
      return badgeStyles.draft
    case 'in_progress':
      return badgeStyles.submitted
    case 'pending_review':
      return badgeStyles.inReview
    case 'completed':
    case 'active':
      return badgeStyles.resolved
    case 'closed':
    case 'surrendered':
      return badgeStyles.rejected
    default:
      return badgeStyles.draft
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'in-progress':
      return 'bg-blue-100 text-blue-800'
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in-progress':
      return 'In Progress'
    case 'draft':
      return 'Draft'
    default:
      return status
  }
}

export default function DashboardPage() {
  const { currentCompany } = useCompany()
  const [rcaRecords, setRcaRecords] = useState<RCARecord[]>([])
  const [fishboneRecords, setFishboneRecords] = useState<FishboneRecord[]>([])
  const [licenseRecords, setLicenseRecords] = useState<LicenseRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Stats based on actual data
  const [stats, setStats] = useState([
    { 
      name: 'Total RCA Records', 
      value: '0', 
      change: '+0%', 
      changeType: 'increase',
      icon: Search 
    },
    { 
      name: 'Total Fishbone', 
      value: '0', 
      change: '+0%', 
      changeType: 'increase',
      icon: BarChart3 
    },
    { 
      name: 'Active Licenses', 
      value: '0', 
      change: '+0%', 
      changeType: 'increase',
      icon: Shield 
    },
    { 
      name: 'Expiring Soon', 
      value: '0', 
      change: '0 licenses', 
      changeType: 'increase',
      icon: AlertTriangle 
    },
  ])

  useEffect(() => {
    fetchDashboardData()
  }, [currentCompany]) // Re-fetch when company changes

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch RCA records using API function
      const rcaResponse = await getRCAList({
        company: currentCompany,
        page: 1,
        limit: 10
      })
      const rcaList = rcaResponse.data || []
      
      // Map API response to dashboard record format
      const mappedRCA: RCARecord[] = rcaList.map((rca: any) => ({
        rca_id: rca.id,
        rca_number: rca.rca_number || '',
        problem_statement: rca.problem_statement || '',
        status: 'draft', // RCA doesn't have status field, default to draft
        created_at: rca.created_at || ''
      }))
      setRcaRecords(mappedRCA.slice(0, 5)) // Latest 5

      // Fetch Fishbone records using API function
      const fishboneResponse = await getFishboneAnalyses({
        company: currentCompany,
        page: 1,
        limit: 10
      })
      const fishboneList = fishboneResponse.data || []
      
      // Map API response to dashboard record format
      const mappedFishbone: FishboneRecord[] = fishboneList.map((fb: any) => ({
        fishbone_id: fb.id,
        fishbone_number: fb.fishbone_number,
        complaint_id: fb.complaint_id,
        problem_statement: fb.problem_statement,
        status: fb.status,
        created_at: fb.created_at,
        created_by: fb.created_by,
        analysis_date: fb.analysis_date
      }))
      setFishboneRecords(mappedFishbone.slice(0, 5)) // Latest 5

      // Fetch License records using API function
      const licenseResponse = await getLicenses({ limit: 10 })
      const licenseList = licenseResponse.licenses || []
      
      // Map API response to dashboard record format
      const mappedLicenses: LicenseRecord[] = licenseList.map((license: License) => ({
        license_id: license.id,
        license_type: license.type,
        license_number: license.license_no,
        status: license.status || 'Active',
        expiry_date: license.validity,
        created_at: license.created_at
      }))
      setLicenseRecords(mappedLicenses.slice(0, 5)) // Latest 5

      // Calculate stats
      const activeLicenses = licenseList.filter((l: License) => (l.status || 'Active').toLowerCase() === 'active').length
      const expiringSoon = licenseList.filter((l: License) => {
        const expiryDate = new Date(l.validity)
        const today = new Date()
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (l.status || 'Active').toLowerCase() === 'active'
      }).length

      setStats([
        { 
          name: 'Total RCA Records', 
          value: rcaList.length.toString(), 
          change: `+${rcaList.length}`, 
          changeType: 'increase',
          icon: Search 
        },
        { 
          name: 'Total Fishbone', 
          value: fishboneList.length.toString(), 
          change: `+${fishboneList.length}`, 
          changeType: 'increase',
          icon: BarChart3 
        },
        { 
          name: 'Active Licenses', 
          value: activeLicenses.toString(), 
          change: `${licenseList.length} total`, 
          changeType: 'increase',
          icon: Shield 
        },
        { 
          name: 'Expiring Soon', 
          value: expiringSoon.toString(), 
          change: 'within 30 days', 
          changeType: expiringSoon > 0 ? 'increase' : 'decrease',
          icon: AlertTriangle 
        },
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={textStyles.h2}>Dashboard - {currentCompany}</h1>
          <p className={textStyles.body}>Overview of RCA, Fishbone Analysis, and License Tracker</p>
        </div>

        {/* Stats Grid */}
        <div className={layoutStyles.grid4}>
          {stats.map((item) => (
            <div key={item.name} className={cardStyles.base}>
              <div className={cardStyles.body}>
                <div className={layoutStyles.flexBetween}>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{item.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  </div>
                  <div className="p-3 bg-primary-50 rounded-full">
                    <item.icon className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className={cn(
                    "text-sm font-medium",
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {item.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">from database</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent RCA Records */}
        <div className={cardStyles.base}>
          <div className={cardStyles.header}>
            <h2 className={textStyles.h3}>Recent RCA/CAPA Records ({rcaRecords.length})</h2>
          </div>
          <div className="overflow-x-auto">
            {rcaRecords.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RCA Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Problem Statement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rcaRecords.map((rca) => (
                    <tr key={rca.rca_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rca.rca_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {rca.problem_statement}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(badgeStyles.base, getStatusBadge(rca.status))}>
                          {rca.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateShort(rca.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No RCA records found
              </div>
            )}
          </div>
        </div>

        {/* Recent Fishbone Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Fishbone Analyses ({fishboneRecords.length})</h2>
          </div>
          
          {fishboneRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analysis Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Complaint ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fishboneRecords.map((item: any) => (
                    <tr key={item.fishbone_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.fishbone_number || `FA-${item.fishbone_id}`}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {item.problem_statement}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-blue-600 font-medium">
                          {item.complaint_id || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status || 'draft')}`}>
                          {getStatusLabel(item.status || 'draft')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.analysis_date ? formatDateShort(item.analysis_date) : formatDateShort(item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.created_by || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/fishbone/${item.fishbone_id}/edit`}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/fishbone/${item.fishbone_id}/print`}
                            target="_blank"
                            className="text-purple-600 hover:text-purple-900 p-1 rounded"
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Fishbone analyses found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first Fishbone analysis.
              </p>
            </div>
          )}
        </div>

        {/* Recent License Records */}
        <div className={cardStyles.base}>
          <div className={cardStyles.header}>
            <h2 className={textStyles.h3}>Recent License Tracker Records</h2>
          </div>
          <div className="overflow-x-auto">
            {licenseRecords.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {licenseRecords.map((license) => (
                    <tr key={license.license_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {license.license_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.license_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(badgeStyles.base, getStatusBadge(license.status))}>
                          {license.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateShort(license.expiry_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateShort(license.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No license records found
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={layoutStyles.grid2}>
          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className={layoutStyles.flexStart}>
                <Search className="h-8 w-8 text-blue-500 mr-4" />
                <div>
                  <h3 className={textStyles.h4}>Create RCA/CAPA</h3>
                  <p className={textStyles.body}>Start a new root cause analysis</p>
                  <button 
                    onClick={() => window.location.href = '/rca-capa'}
                    className="mt-3 text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    Create RCA →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className={layoutStyles.flexStart}>
                <BarChart3 className="h-8 w-8 text-purple-500 mr-4" />
                <div>
                  <h3 className={textStyles.h4}>Fishbone Analysis</h3>
                  <p className={textStyles.body}>Create a new fishbone diagram</p>
                  <button 
                    onClick={() => window.location.href = '/fishbone'}
                    className="mt-3 text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    Create Fishbone →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
