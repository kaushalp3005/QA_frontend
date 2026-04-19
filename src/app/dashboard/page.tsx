'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import { formatDateShort } from '@/lib/date-utils'
import {
  Search,
  BarChart3,
  Shield,
  AlertTriangle,
  Edit3,
  Printer,
  FileText,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Wrench,
  LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/styles'
import { getRCAList } from '@/lib/api/rca'
import { getFishboneAnalyses } from '@/lib/api/fishbone'
import { getLicenses, type License } from '@/lib/api/licenses'
import { getComplaints } from '@/lib/api/complaints'
import type { ComplaintResponse } from '@/lib/api/complaints'
import { useCompany } from '@/contexts/CompanyContext'
import { canAccessReports } from '@/lib/api/reports'
import { Calendar } from 'lucide-react'

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

const getStatusPill = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'active':
      return 'bg-success-50 text-success-700'
    case 'in_progress':
    case 'in-progress':
      return 'bg-blue-50 text-blue-700'
    case 'pending_review':
      return 'bg-warning-50 text-warning-700'
    case 'closed':
    case 'surrendered':
      return 'bg-brand-50 text-brand-600'
    case 'draft':
    default:
      return 'bg-cream-200 text-ink-500'
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
  const [canReports, setCanReports] = useState(false)
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
      icon: Search,
      iconBg: 'bg-brand-500'
    },
    {
      name: 'Total Fishbone',
      value: '0',
      change: '+0%',
      changeType: 'increase',
      icon: BarChart3,
      iconBg: 'bg-ink-600'
    },
    {
      name: 'Active Licenses',
      value: '0',
      change: '+0%',
      changeType: 'increase',
      icon: Shield,
      iconBg: 'bg-success-500'
    },
    {
      name: 'Expiring Soon',
      value: '0',
      change: '0 licenses',
      changeType: 'increase',
      icon: AlertTriangle,
      iconBg: 'bg-warning-500'
    },
  ])

  useEffect(() => {
    setCanReports(canAccessReports())
  }, [])

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
          icon: Search,
          iconBg: 'bg-brand-500'
        },
        {
          name: 'Total Fishbone',
          value: fishboneList.length.toString(),
          change: `+${fishboneList.length}`,
          changeType: 'increase',
          icon: BarChart3,
          iconBg: 'bg-ink-600'
        },
        {
          name: 'Active Licenses',
          value: activeLicenses.toString(),
          change: `${licenseList.length} total`,
          changeType: 'increase',
          icon: Shield,
          iconBg: 'bg-success-500'
        },
        {
          name: 'Expiring Soon',
          value: expiringSoon.toString(),
          change: 'within 30 days',
          changeType: expiringSoon > 0 ? 'increase' : 'decrease',
          icon: AlertTriangle,
          iconBg: 'bg-warning-500'
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
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Spinner />
            <p className="text-sm text-ink-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title={`Dashboard - ${currentCompany}`}
          subtitle="Overview of RCA, Fishbone Analysis, and License Tracker"
          icon={LayoutDashboard}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, i) => (
            <div
              key={item.name}
              style={{ animationDelay: `${i * 60}ms` }}
              className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all animate-fade-in-up"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">{item.name}</p>
                  <p className="mt-2 text-2xl font-bold text-ink-600 tabular-nums">{item.value}</p>
                </div>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-soft shrink-0",
                  item.iconBg
                )}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={cn(
                  "text-xs font-semibold",
                  item.changeType === 'increase' ? 'text-success-700' : 'text-brand-500'
                )}>
                  {item.change}
                </span>
                <span className="text-xs text-ink-400">from database</span>
              </div>
            </div>
          ))}

          {/* Daily Reports card (restricted) — appended as the last count card */}
          {canReports && (
            <Link
              href="/reports"
              style={{ animationDelay: `${stats.length * 60}ms` }}
              className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 hover:border-brand-500 transition-all block group animate-fade-in-up"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Daily Reports</p>
                  <p className="mt-2 text-sm font-bold text-ink-600 group-hover:text-brand-500 transition-colors">View entries</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft shrink-0">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xs font-semibold text-brand-500 inline-flex items-center gap-1">
                  Today / Week / Month <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* Recent RCA Records - Card Grid */}
        <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink-600">Recent RCA/CAPA Records</h2>
                <p className="text-xs text-ink-400 font-medium">{rcaRecords.length} latest records</p>
              </div>
            </div>
            <Link href="/rca-capa" className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {rcaRecords.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {rcaRecords.map((rca, index) => (
                <Link
                  key={rca.rca_id}
                  href={`/rca-capa/${rca.rca_id}/edit`}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className="surface-card p-4 hover:shadow-lift hover:-translate-y-0.5 hover:border-brand-500 transition-all cursor-pointer group animate-fade-in-up"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                      {rca.rca_number}
                    </span>
                    <span className="text-[11px] text-ink-400">#{index + 1}</span>
                  </div>
                  <p className="text-sm text-ink-600 font-medium line-clamp-2 mb-3 group-hover:text-brand-500 transition-colors min-h-[40px]">
                    {rca.problem_statement || 'No problem statement'}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-cream-300">
                    <span className={cn(
                      "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
                      getStatusPill(rca.status)
                    )}>
                      {rca.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-ink-400">
                      {formatDateShort(rca.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface-card p-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-ink-400" />
              </div>
              <h3 className="text-sm font-bold text-ink-600">No RCA records found</h3>
              <p className="text-xs text-ink-400 font-medium mt-1">Records will appear here once created</p>
            </div>
          )}
        </div>

        {/* Complaints Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-500 flex items-center justify-center shadow-soft">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink-600">Complaint Records</h2>
                <p className="text-xs text-ink-400 font-medium">{complaintRecords.length} total complaints</p>
              </div>
            </div>
            <Link href="/complaints" className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Complaint Summary Counters */}
          {(() => {
            const ccfsComplaints = complaintRecords.filter(c => c.complaintId?.startsWith('CCFS'))
            const ccnfsComplaints = complaintRecords.filter(c => c.complaintId?.startsWith('CCNFS'))

            const measureConfig: Record<string, { label: string; badge: string }> = {
              replacement: { label: 'Replacement', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
              rca_capa: { label: 'RCA/CAPA', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
              fishbone: { label: 'Fishbone', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              rtv: { label: 'RTV', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
              refund: { label: 'Refund', badge: 'bg-warning-50 text-warning-700 border-warning-200' },
              other: { label: 'Other', badge: 'bg-cream-200 text-ink-500 border-cream-300' },
            }

            const getMeasureLabel = (measure: string) => {
              if (!measure) return 'Not Specified'
              return measureConfig[measure.toLowerCase()]?.label || measure.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }

            const getMeasureBadge = (measure: string) => {
              if (!measure) return 'bg-cream-200 text-ink-500 border-cream-300'
              return measureConfig[measure.toLowerCase()]?.badge || 'bg-cream-200 text-ink-500 border-cream-300'
            }

            const getMeasureCount = (list: ComplaintRecord[], measure: string) =>
              list.filter(c => c.measuresToResolve?.toLowerCase() === measure.toLowerCase()).length

            const measureChip = (label: string, count: number, badgeClass: string) => (
              <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold border", badgeClass)}>
                {label}: {count}
              </span>
            )

            return (
              <>
                {/* CCFS - Food Safety Complaints */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 bg-brand-500 rounded-full"></div>
                      <div>
                        <h3 className="text-sm font-bold text-ink-600">
                          Food Safety Complaints (CCFS)
                        </h3>
                        <p className="text-xs text-ink-400 font-medium">{ccfsComplaints.length} complaints</p>
                      </div>
                    </div>
                    {/* CCFS Measure Counts */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {measureChip('Replacement', getMeasureCount(ccfsComplaints, 'replacement'), 'bg-purple-50 text-purple-700 border-purple-200')}
                      {measureChip('RCA/CAPA', getMeasureCount(ccfsComplaints, 'rca_capa'), 'bg-blue-50 text-blue-700 border-blue-200')}
                      {measureChip('Fishbone', getMeasureCount(ccfsComplaints, 'fishbone'), 'bg-indigo-50 text-indigo-700 border-indigo-200')}
                      {measureChip('RTV', getMeasureCount(ccfsComplaints, 'rtv'), 'bg-teal-50 text-teal-700 border-teal-200')}
                      {measureChip('Refund', getMeasureCount(ccfsComplaints, 'refund'), 'bg-warning-50 text-warning-700 border-warning-200')}
                    </div>
                  </div>
                  {ccfsComplaints.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {ccfsComplaints.slice(0, 8).map((complaint, idx) => (
                        <Link
                          key={complaint.id}
                          href={`/complaints/${complaint.id}`}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className="surface-card p-4 hover:shadow-lift hover:-translate-y-0.5 hover:border-brand-500 transition-all group animate-fade-in-up"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                              {complaint.complaintId}
                            </span>
                            <ShieldAlert className="h-3.5 w-3.5 text-brand-400" />
                          </div>
                          <p className="text-sm font-medium text-ink-600 mb-1 truncate group-hover:text-brand-500">
                            {complaint.customerName}
                          </p>
                          <p className="text-xs text-ink-400 truncate mb-2">
                            {complaint.itemDescription || 'No description'}
                          </p>
                          {/* Measure to Resolve - Prominent Badge */}
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border mb-2",
                            getMeasureBadge(complaint.measuresToResolve)
                          )}>
                            <Wrench className="h-3 w-3" />
                            {getMeasureLabel(complaint.measuresToResolve)}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-cream-300">
                            <span className="text-[11px] text-ink-400">
                              {formatDateShort(complaint.receivedDate)}
                            </span>
                            {complaint.justifiedStatus && (
                              <span className={cn(
                                "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
                                complaint.justifiedStatus.toLowerCase() === 'justified'
                                  ? 'bg-success-50 text-success-700'
                                  : complaint.justifiedStatus.toLowerCase() === 'not justified'
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'bg-warning-50 text-warning-700'
                              )}>
                                {complaint.justifiedStatus}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="surface-card p-8 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mb-2">
                        <ShieldAlert className="h-5 w-5 text-ink-400" />
                      </div>
                      <p className="text-xs text-ink-400 font-medium">No food safety complaints</p>
                    </div>
                  )}
                </div>

                {/* CCNFS - Non-Food Safety Complaints */}
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 bg-warning-500 rounded-full"></div>
                      <div>
                        <h3 className="text-sm font-bold text-ink-600">
                          Non-Food Safety Complaints (CCNFS)
                        </h3>
                        <p className="text-xs text-ink-400 font-medium">{ccnfsComplaints.length} complaints</p>
                      </div>
                    </div>
                    {/* CCNFS Measure Counts */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {measureChip('Replacement', getMeasureCount(ccnfsComplaints, 'replacement'), 'bg-purple-50 text-purple-700 border-purple-200')}
                      {measureChip('RCA/CAPA', getMeasureCount(ccnfsComplaints, 'rca_capa'), 'bg-blue-50 text-blue-700 border-blue-200')}
                      {measureChip('Fishbone', getMeasureCount(ccnfsComplaints, 'fishbone'), 'bg-indigo-50 text-indigo-700 border-indigo-200')}
                      {measureChip('RTV', getMeasureCount(ccnfsComplaints, 'rtv'), 'bg-teal-50 text-teal-700 border-teal-200')}
                      {measureChip('Refund', getMeasureCount(ccnfsComplaints, 'refund'), 'bg-warning-50 text-warning-700 border-warning-200')}
                    </div>
                  </div>
                  {ccnfsComplaints.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {ccnfsComplaints.slice(0, 8).map((complaint, idx) => (
                        <Link
                          key={complaint.id}
                          href={`/complaints/${complaint.id}`}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className="surface-card p-4 hover:shadow-lift hover:-translate-y-0.5 hover:border-warning-500 transition-all group animate-fade-in-up"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-warning-700 bg-warning-50 px-2 py-0.5 rounded-full">
                              {complaint.complaintId}
                            </span>
                            <ShieldCheck className="h-3.5 w-3.5 text-warning-500" />
                          </div>
                          <p className="text-sm font-medium text-ink-600 mb-1 truncate group-hover:text-warning-700">
                            {complaint.customerName}
                          </p>
                          <p className="text-xs text-ink-400 truncate mb-2">
                            {complaint.itemDescription || 'No description'}
                          </p>
                          {/* Measure to Resolve - Prominent Badge */}
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border mb-2",
                            getMeasureBadge(complaint.measuresToResolve)
                          )}>
                            <Wrench className="h-3 w-3" />
                            {getMeasureLabel(complaint.measuresToResolve)}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-cream-300">
                            <span className="text-[11px] text-ink-400">
                              {formatDateShort(complaint.receivedDate)}
                            </span>
                            {complaint.justifiedStatus && (
                              <span className={cn(
                                "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
                                complaint.justifiedStatus.toLowerCase() === 'justified'
                                  ? 'bg-success-50 text-success-700'
                                  : complaint.justifiedStatus.toLowerCase() === 'not justified'
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'bg-warning-50 text-warning-700'
                              )}>
                                {complaint.justifiedStatus}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="surface-card p-8 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mb-2">
                        <ShieldCheck className="h-5 w-5 text-ink-400" />
                      </div>
                      <p className="text-xs text-ink-400 font-medium">No non-food safety complaints</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>

        {/* Recent Fishbone Analysis */}
        <div className="surface-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          <div className="px-5 py-4 border-b border-cream-300 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-600 flex items-center justify-center shadow-soft">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-600">Recent Fishbone Analyses</h2>
              <p className="text-xs text-ink-400 font-medium">{fishboneRecords.length} latest records</p>
            </div>
          </div>

          {fishboneRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Analysis Details
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Complaint ID
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created Date
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created By
                    </th>
                    <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-cream-300">
                  {fishboneRecords.map((item: any) => (
                    <tr key={item.fishbone_id} className="hover:bg-cream-100/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <div className="text-sm font-semibold text-ink-600">
                            {item.fishbone_number || `FA-${item.fishbone_id}`}
                          </div>
                          <div className="text-xs text-ink-400 mt-1 line-clamp-2">
                            {item.problem_statement}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm text-brand-500 font-semibold">
                          {item.complaint_id || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex px-2.5 py-0.5 text-[11px] font-semibold rounded-full",
                          getStatusPill(item.status || 'draft')
                        )}>
                          {getStatusLabel(item.status || 'draft')}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-600">
                        {item.analysis_date ? formatDateShort(item.analysis_date) : formatDateShort(item.created_at)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-500">
                        {item.created_by || '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/fishbone/${item.fishbone_id}/edit`}
                            className="p-1.5 rounded-lg text-ink-500 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/fishbone/${item.fishbone_id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-ink-500 hover:text-ink-600 hover:bg-cream-200 transition-colors"
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
              <div className="mx-auto w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-ink-400" />
              </div>
              <h3 className="text-sm font-bold text-ink-600">No Fishbone analyses found</h3>
              <p className="mt-1 text-xs text-ink-400 font-medium">
                Get started by creating your first Fishbone analysis.
              </p>
            </div>
          )}
        </div>

        {/* Recent License Records */}
        <div className="surface-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '420ms' }}>
          <div className="px-5 py-4 border-b border-cream-300 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500 flex items-center justify-center shadow-soft">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-600">Recent License Tracker Records</h2>
              <p className="text-xs text-ink-400 font-medium">{licenseRecords.length} latest licenses</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {licenseRecords.length > 0 ? (
              <table className="min-w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      License Type
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      License Number
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Expiry Date
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-cream-300">
                  {licenseRecords.map((license) => (
                    <tr key={license.license_id} className="hover:bg-cream-100/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-ink-600">
                        {license.license_type}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-600">
                        {license.license_number}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex px-2.5 py-0.5 text-[11px] font-semibold rounded-full",
                          getStatusPill(license.status)
                        )}>
                          {license.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-500">
                        {formatDateShort(license.expiry_date)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-500">
                        {formatDateShort(license.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-ink-400" />
                </div>
                <h3 className="text-sm font-bold text-ink-600">No license records found</h3>
                <p className="text-xs text-ink-400 font-medium mt-1">Track regulatory licenses here</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '480ms' }}>
          <div className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft shrink-0">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-ink-600">Create RCA/CAPA</h3>
                <p className="text-xs text-ink-400 font-medium mt-0.5">Start a new root cause analysis</p>
                <button
                  onClick={() => window.location.href = '/rca-capa'}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                >
                  Create RCA <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-ink-600 flex items-center justify-center shadow-soft shrink-0">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-ink-600">Fishbone Analysis</h3>
                <p className="text-xs text-ink-400 font-medium mt-0.5">Create a new fishbone diagram</p>
                <button
                  onClick={() => window.location.href = '/fishbone'}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                >
                  Create Fishbone <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
