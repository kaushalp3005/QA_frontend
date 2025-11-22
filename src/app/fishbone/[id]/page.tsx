'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Package, 
  AlertCircle,
  FileText,
  Clock,
  Loader2,
  Printer,
  Target
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getFishboneById } from '@/lib/api/fishbone'
import { isAuthenticated } from '@/lib/api/auth'
import { toast } from 'react-hot-toast'

export default function FishboneViewPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canView, canEdit } = usePermissions()
  const [fishbone, setFishbone] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const fishboneId = params.id as string

  // Check authentication first
  useEffect(() => {
    if (!isAuthenticated()) {
      const returnUrl = `/fishbone/${fishboneId}`
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }
    setCheckingAuth(false)
  }, [fishboneId, router])

  useEffect(() => {
    if (!checkingAuth && fishboneId && currentCompany) {
      fetchFishboneData()
    }
  }, [checkingAuth, fishboneId, currentCompany])

  const fetchFishboneData = async () => {
    try {
      setLoading(true)
      const data = await getFishboneById(parseInt(fishboneId), currentCompany)
      setFishbone(data)
    } catch (error) {
      console.error('Error fetching fishbone:', error)
      toast.error('Failed to load fishbone analysis')
      router.push('/fishbone')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!fishbone) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Fishbone analysis not found</h3>
          <div className="mt-6">
            <Link
              href="/fishbone"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
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

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'delayed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/fishbone"
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {fishbone.fishbone_number || `FA-${fishbone.id}`}
              </h1>
              <p className="text-sm text-gray-600 mt-1">Fishbone Analysis Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/fishbone/${fishboneId}/print`}
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Link>
            {canEdit('fishbone') && (
              <Link
                href={`/fishbone/${fishboneId}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Analysis Information</h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(fishbone.status || 'draft')}`}>
                  {fishbone.status || 'Draft'}
                </span>
                {fishbone.impact_level && (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getImpactColor(fishbone.impact_level)}`}>
                    {fishbone.impact_level.toUpperCase()} Impact
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Basic Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fishbone.complaint_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Complaint ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{fishbone.complaint_id}</dd>
                  </div>
                )}
                {fishbone.customer_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{fishbone.customer_name}</dd>
                  </div>
                )}
                {fishbone.item_category && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Item Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">{fishbone.item_category}</dd>
                  </div>
                )}
                {fishbone.item_subcategory && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Item Subcategory</dt>
                    <dd className="mt-1 text-sm text-gray-900">{fishbone.item_subcategory}</dd>
                  </div>
                )}
                {fishbone.item_description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Item Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{fishbone.item_description}</dd>
                  </div>
                )}
                {fishbone.analysis_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Analysis Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateShort(fishbone.analysis_date)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Problem Statement */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Problem Statement
              </h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg">
                {fishbone.problem_statement}
              </p>
            </div>

            {/* Issue Description */}
            {fishbone.issue_description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Issue Description</h3>
                <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {fishbone.issue_description}
                </p>
              </div>
            )}

            {/* Root Causes by Category */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Root Causes</h3>
              <div className="space-y-4">
                {fishbone.people_causes && fishbone.people_causes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">People</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                      {fishbone.people_causes.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fishbone.process_causes && fishbone.process_causes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Process</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                      {fishbone.process_causes.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fishbone.equipment_causes && fishbone.equipment_causes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Equipment/Machine</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                      {fishbone.equipment_causes.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fishbone.materials_causes && fishbone.materials_causes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Materials</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                      {fishbone.materials_causes.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fishbone.environment_causes && fishbone.environment_causes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Environment</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                      {fishbone.environment_causes.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fishbone.management_causes && fishbone.management_causes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Management/Methods</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
                      {fishbone.management_causes.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Action Plan */}
            {fishbone.action_plan && fishbone.action_plan.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Action Plan</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Responsible</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fishbone.action_plan.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.action}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.responsible}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.deadline ? formatDateShort(item.deadline) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionStatusColor(item.status || 'pending')}`}>
                              {item.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Metadata
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fishbone.created_by && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{fishbone.created_by}</dd>
                  </div>
                )}
                {fishbone.created_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateShort(fishbone.created_at)}</dd>
                  </div>
                )}
                {fishbone.updated_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateShort(fishbone.updated_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

