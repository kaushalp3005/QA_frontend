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
  FileText,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Package,
  RefreshCw,
  Wrench
} from 'lucide-react'
import { cardStyles, layoutStyles, textStyles, badgeStyles, cn } from '@/lib/styles'
import { getRCAList } from '@/lib/api/rca'
import { getFishboneAnalyses } from '@/lib/api/fishbone'
import { getLicenses, type License } from '@/lib/api/licenses'
import { getComplaints } from '@/lib/api/complaints'
import type { ComplaintResponse } from '@/lib/api/complaints'
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

interface ComplaintRecord {
  id: number
  complaintId: string
  customerName: string
  itemDescription: string
  complaintNature: string
  measuresToResolve: string
  justifiedStatus: string
  receivedDate: string
  batchCode: string
  quantityRejected: number
  status: string
}

export default function DashboardPage() {
  const { currentCompany } = useCompany()
  const [rcaRecords, setRcaRecords] = useState<RCARecord[]>([])
  const [fishboneRecords, setFishboneRecords] = useState<FishboneRecord[]>([])
  const [licenseRecords, setLicenseRecords] = useState<LicenseRecord[]>([])
  const [complaintRecords, setComplaintRecords] = useState<ComplaintRecord[]>([])
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
        status: 'draft',
        created_at: rca.created_at || ''
      }))
      setRcaRecords(mappedRCA.slice(0, 10)) // Latest 10

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

      // Fetch Complaint records
      try {
        const complaintResponse = await getComplaints({
          company: currentCompany,
          page: 1,
          limit: 20
        })
        const complaintList = complaintResponse.data || []
        const mappedComplaints: ComplaintRecord[] = complaintList.map((c: ComplaintResponse) => ({
          id: c.id,
          complaintId: c.complaintId,
          customerName: c.customerName,
          itemDescription: c.itemDescription || '',
          complaintNature: c.complaintNature || '',
          measuresToResolve: c.measuresToResolve || '',
          justifiedStatus: c.justifiedStatus || '',
          receivedDate: c.receivedDate || '',
          batchCode: c.batchCode || '',
          quantityRejected: c.quantityRejected || 0,
          status: c.justifiedStatus || ''
        }))
        setComplaintRecords(mappedComplaints)
      } catch (err) {
        console.error('Error fetching complaints:', err)
      }

      // Calculate complaint counts
      const totalComplaints = complaintRecords.length

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

        {/* Recent RCA Records - Card Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent RCA/CAPA Records</h2>
                <p className="text-sm text-gray-500">{rcaRecords.length} latest records</p>
              </div>
            </div>
            <Link href="/rca-capa" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {rcaRecords.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {rcaRecords.map((rca, index) => (
                <Link
                  key={rca.rca_id}
                  href={`/rca-capa/${rca.rca_id}/edit`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {rca.rca_number}
                    </span>
                    <span className="text-xs text-gray-400">#{index + 1}</span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-3 group-hover:text-blue-700 transition-colors min-h-[40px]">
                    {rca.problem_statement || 'No problem statement'}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      getStatusBadge(rca.status)
                    )}>
                      {rca.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateShort(rca.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Search className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No RCA records found</p>
            </div>
          )}
        </div>

        {/* Complaints Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ClipboardList className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Complaint Records</h2>
                <p className="text-sm text-gray-500">{complaintRecords.length} total complaints</p>
              </div>
            </div>
            <Link href="/complaints" className="text-sm text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Complaint Summary Counters */}
          {(() => {
            const ccfsComplaints = complaintRecords.filter(c => c.complaintId?.startsWith('CCFS'))
            const ccnfsComplaints = complaintRecords.filter(c => c.complaintId?.startsWith('CCNFS'))

            const measureConfig: Record<string, { label: string; badge: string }> = {
              replacement: { label: 'Replacement', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
              rca_capa: { label: 'RCA/CAPA', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
              fishbone: { label: 'Fishbone', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
              rtv: { label: 'RTV', badge: 'bg-teal-100 text-teal-700 border-teal-200' },
              refund: { label: 'Refund', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
              other: { label: 'Other', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
            }

            const getMeasureLabel = (measure: string) => {
              if (!measure) return 'Not Specified'
              return measureConfig[measure.toLowerCase()]?.label || measure.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }

            const getMeasureBadge = (measure: string) => {
              if (!measure) return 'bg-gray-100 text-gray-600 border-gray-200'
              return measureConfig[measure.toLowerCase()]?.badge || 'bg-gray-100 text-gray-600 border-gray-200'
            }

            const getMeasureCount = (list: ComplaintRecord[], measure: string) =>
              list.filter(c => c.measuresToResolve?.toLowerCase() === measure.toLowerCase()).length

            return (
              <>
                {/* CCFS - Food Safety Complaints */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 bg-red-500 rounded-full"></div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Food Safety Complaints (CCFS)
                        </h3>
                        <p className="text-xs text-gray-500">{ccfsComplaints.length} complaints</p>
                      </div>
                    </div>
                    {/* CCFS Measure Counts */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                        Replacement: {getMeasureCount(ccfsComplaints, 'replacement')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        RCA/CAPA: {getMeasureCount(ccfsComplaints, 'rca_capa')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        Fishbone: {getMeasureCount(ccfsComplaints, 'fishbone')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">
                        RTV: {getMeasureCount(ccfsComplaints, 'rtv')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                        Refund: {getMeasureCount(ccfsComplaints, 'refund')}
                      </span>
                    </div>
                  </div>
                  {ccfsComplaints.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {ccfsComplaints.slice(0, 8).map((complaint) => (
                        <Link
                          key={complaint.id}
                          href={`/complaints/${complaint.id}`}
                          className="bg-white rounded-xl border border-red-100 p-4 hover:shadow-lg hover:border-red-300 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                              {complaint.complaintId}
                            </span>
                            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1 truncate group-hover:text-red-700">
                            {complaint.customerName}
                          </p>
                          <p className="text-xs text-gray-500 truncate mb-2">
                            {complaint.itemDescription || 'No description'}
                          </p>
                          {/* Measure to Resolve - Prominent Badge */}
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border mb-2",
                            getMeasureBadge(complaint.measuresToResolve)
                          )}>
                            <Wrench className="h-3 w-3" />
                            {getMeasureLabel(complaint.measuresToResolve)}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-400">
                              {formatDateShort(complaint.receivedDate)}
                            </span>
                            {complaint.justifiedStatus && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                complaint.justifiedStatus.toLowerCase() === 'justified'
                                  ? 'bg-green-50 text-green-700'
                                  : complaint.justifiedStatus.toLowerCase() === 'not justified'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-yellow-50 text-yellow-700'
                              )}>
                                {complaint.justifiedStatus}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-red-100 p-6 text-center">
                      <ShieldAlert className="mx-auto h-8 w-8 text-red-200 mb-2" />
                      <p className="text-sm text-gray-400">No food safety complaints</p>
                    </div>
                  )}
                </div>

                {/* CCNFS - Non-Food Safety Complaints */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 bg-amber-500 rounded-full"></div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Non-Food Safety Complaints (CCNFS)
                        </h3>
                        <p className="text-xs text-gray-500">{ccnfsComplaints.length} complaints</p>
                      </div>
                    </div>
                    {/* CCNFS Measure Counts */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                        Replacement: {getMeasureCount(ccnfsComplaints, 'replacement')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        RCA/CAPA: {getMeasureCount(ccnfsComplaints, 'rca_capa')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        Fishbone: {getMeasureCount(ccnfsComplaints, 'fishbone')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">
                        RTV: {getMeasureCount(ccnfsComplaints, 'rtv')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                        Refund: {getMeasureCount(ccnfsComplaints, 'refund')}
                      </span>
                    </div>
                  </div>
                  {ccnfsComplaints.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {ccnfsComplaints.slice(0, 8).map((complaint) => (
                        <Link
                          key={complaint.id}
                          href={`/complaints/${complaint.id}`}
                          className="bg-white rounded-xl border border-amber-100 p-4 hover:shadow-lg hover:border-amber-300 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              {complaint.complaintId}
                            </span>
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1 truncate group-hover:text-amber-700">
                            {complaint.customerName}
                          </p>
                          <p className="text-xs text-gray-500 truncate mb-2">
                            {complaint.itemDescription || 'No description'}
                          </p>
                          {/* Measure to Resolve - Prominent Badge */}
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border mb-2",
                            getMeasureBadge(complaint.measuresToResolve)
                          )}>
                            <Wrench className="h-3 w-3" />
                            {getMeasureLabel(complaint.measuresToResolve)}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-400">
                              {formatDateShort(complaint.receivedDate)}
                            </span>
                            {complaint.justifiedStatus && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                complaint.justifiedStatus.toLowerCase() === 'justified'
                                  ? 'bg-green-50 text-green-700'
                                  : complaint.justifiedStatus.toLowerCase() === 'not justified'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-yellow-50 text-yellow-700'
                              )}>
                                {complaint.justifiedStatus}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-amber-100 p-6 text-center">
                      <ShieldCheck className="mx-auto h-8 w-8 text-amber-200 mb-2" />
                      <p className="text-sm text-gray-400">No non-food safety complaints</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
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
