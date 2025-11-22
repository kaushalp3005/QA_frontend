'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  Package, 
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  Printer
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getRCAById, deleteRCA } from '@/lib/api/rca'
import { isAuthenticated } from '@/lib/api/auth'
import { toast } from 'react-hot-toast'

export default function RCAViewPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canEdit, canDelete } = usePermissions()
  const [rca, setRca] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const rcaId = params.id as string

  // Check authentication first
  useEffect(() => {
    if (!isAuthenticated()) {
      const returnUrl = `/rca-capa/${rcaId}`
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }
    setCheckingAuth(false)
  }, [rcaId, router])

  useEffect(() => {
    if (!checkingAuth && rcaId && currentCompany) {
      fetchRCAData()
    }
  }, [checkingAuth, rcaId, currentCompany])

  const fetchRCAData = async () => {
    try {
      setLoading(true)
      const data = await getRCAById(parseInt(rcaId), currentCompany)
      console.log('RCA Detail:', data)
      console.log('Control Sample Photos Field:', (data as any).control_sample_photos)
      console.log('Control Sample Photos Type:', typeof (data as any).control_sample_photos)
      setRca(data)
    } catch (error) {
      console.error('Error fetching RCA:', error)
      toast.error('Failed to load RCA/CAPA record')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this RCA/CAPA record? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await deleteRCA(parseInt(rcaId), currentCompany)
      toast.success('RCA/CAPA record deleted successfully')
      router.push('/rca-capa')
    } catch (error) {
      console.error('Error deleting RCA:', error)
      toast.error('Failed to delete RCA/CAPA record')
    } finally {
      setDeleting(false)
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

  if (!rca) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">RCA/CAPA not found</h3>
          <div className="mt-6">
            <Link
              href="/rca-capa"
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

  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/rca-capa"
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{rca.rca_number}</h1>
              <p className="text-sm text-gray-600 mt-1">RCA/CAPA Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/rca-capa/${rcaId}/print`}
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Link>
            {canEdit('rca') && (
              <Link
                href={`/rca-capa/${rcaId}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            )}
            {canDelete('rca') && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
              </button>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-3">
          {rca.severity && (
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${severityColors[rca.severity]}`}>
              {rca.severity.toUpperCase()}
            </span>
          )}
          {rca.problem_category && (
            <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
              {rca.problem_category}
            </span>
          )}
        </div>

        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Complaint ID</label>
              <p className="mt-1 text-sm text-gray-900">{rca.complaint_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date of Report</label>
              <p className="mt-1 text-sm text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                {rca.date_of_report ? formatDateShort(rca.date_of_report) : 'N/A'}
              </p>
            </div>
            {rca.date_initiated && (
              <div>
                <label className="text-sm font-medium text-gray-700">Date Initiated</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDateShort(rca.date_initiated)}
                </p>
              </div>
            )}
            {rca.initiated_by && (
              <div>
                <label className="text-sm font-medium text-gray-700">Initiated By</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {rca.initiated_by}
                </p>
              </div>
            )}
            {rca.date_of_complaint_receive && (
              <div>
                <label className="text-sm font-medium text-gray-700">Date Complaint Received</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDateShort(rca.date_of_complaint_receive)}
                </p>
              </div>
            )}
            {rca.food_safety_significant !== null && rca.food_safety_significant !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-700">Food Safety Significant</label>
                <p className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    rca.food_safety_significant === 'yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {rca.food_safety_significant === 'yes' ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            )}
            {rca.recall_required !== null && rca.recall_required !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-700">Recall Required</label>
                <p className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    rca.recall_required === 'yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {rca.recall_required === 'yes' ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Item Information */}
        {(rca.item_category || rca.item_subcategory || rca.item_description) && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-gray-600" />
                Item Information
              </h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {rca.item_category && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-sm text-gray-900">{rca.item_category}</p>
                </div>
              )}
              {rca.item_subcategory && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Sub-category</label>
                  <p className="mt-1 text-sm text-gray-900">{rca.item_subcategory}</p>
                </div>
              )}
              {rca.item_description && (
                <div className="md:col-span-3">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{rca.item_description}</p>
                </div>
              )}
              {rca.batch_code && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Batch Code</label>
                  <p className="mt-1 text-sm text-gray-900">{rca.batch_code}</p>
                </div>
              )}
              {rca.date_of_packing && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Packing</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateShort(rca.date_of_packing)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Information */}
        {rca.name_of_customer && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-600" />
                Customer Information
              </h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Customer Name</label>
                <p className="mt-1 text-sm text-gray-900">{rca.name_of_customer}</p>
              </div>
              {rca.phone_no_of_customer && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="mt-1 text-sm text-gray-900">{rca.phone_no_of_customer}</p>
                </div>
              )}
              {rca.email_of_customer && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{rca.email_of_customer}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Injury Information */}
        {rca.customer_sustain_injury && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                Injury Information
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Customer Sustain Injury</label>
                <p className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    rca.customer_sustain_injury === 'yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {rca.customer_sustain_injury === 'yes' ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
              {rca.customer_sustain_injury === 'yes' && rca.description_of_injury && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description of Injury</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{rca.description_of_injury}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Food Product Details */}
        {(rca.product_prepared_at_candor || rca.other_details_for_investigation) && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-yellow-600" />
                Food Product Details
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {rca.product_prepared_at_candor && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Product Prepared at Candor</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      rca.product_prepared_at_candor === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rca.product_prepared_at_candor === 'yes' ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>
              )}
              {rca.other_details_for_investigation && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Other Details for Investigation</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{rca.other_details_for_investigation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Incident Details */}
        {rca.summary_of_incident && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-600" />
                Summary of Incident
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{rca.summary_of_incident}</p>
            </div>
          </div>
        )}

        {/* Problem Analysis */}
        {rca.problem_statement && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Problem Analysis</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Problem Statement</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{rca.problem_statement}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rca.when_discovered && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">When Discovered</label>
                    <p className="mt-1 text-sm text-gray-900">{rca.when_discovered}</p>
                  </div>
                )}
                {rca.where_discovered && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Where Discovered</label>
                    <p className="mt-1 text-sm text-gray-900">{rca.where_discovered}</p>
                  </div>
                )}
                {rca.who_discovered && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Who Discovered</label>
                    <p className="mt-1 text-sm text-gray-900">{rca.who_discovered}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5 Whys Analysis */}
        {(rca.why1 || rca.why2 || rca.why3 || rca.why4 || rca.why5) && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">5 Whys Analysis</h2>
            </div>
            <div className="px-6 py-4 space-y-6">
              {[1, 2, 3, 4, 5].map((num) => {
                const why = rca[`why${num}`]
                const category = rca[`why${num}_cause_category`]
                const details = rca[`why${num}_cause_details`]
                const standardExists = rca[`why${num}_standard_exists`]
                const applied = rca[`why${num}_applied`]
                
                if (!why) return null
                
                return (
                  <div key={num} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-sm font-medium text-gray-900">Why #{num}</h3>
                    <p className="mt-1 text-sm text-gray-900">{why}</p>
                    {category && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Category:</span> {category}
                      </p>
                    )}
                    {details && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Details:</span> {details}
                      </p>
                    )}
                    {standardExists && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Standard Exists:</span> {standardExists}
                      </p>
                    )}
                    {applied && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Applied:</span> {applied}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Root Cause */}
        {rca.root_cause_description && (
          <div className="bg-blue-50 border-l-4 border-blue-500 shadow rounded-lg">
            <div className="px-6 py-4">
              <h2 className="text-lg font-medium text-blue-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Root Cause Identified
              </h2>
              {rca.source_of_rca && (
                <p className="mt-2 text-sm text-blue-800">
                  <span className="font-medium">Source:</span> {rca.source_of_rca}
                </p>
              )}
              {rca.possible_cause && (
                <p className="mt-2 text-sm text-blue-800">
                  <span className="font-medium">Possible Cause:</span> {rca.possible_cause}
                </p>
              )}
              <p className="mt-2 text-sm text-blue-800 whitespace-pre-wrap">
                <span className="font-medium">Root Cause Description:</span><br />
                {rca.root_cause_description}
              </p>
            </div>
          </div>
        )}

        {/* Action Plan */}
        {rca.action_plan && typeof rca.action_plan === 'string' && JSON.parse(rca.action_plan).length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Corrective Action Plan</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Challenges</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsibility</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {JSON.parse(rca.action_plan).map((action: any) => (
                    <tr key={action.srNo}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{action.srNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{action.challenges}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{action.actionPoints}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{action.responsibility}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          action.trafficLightStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          action.trafficLightStatus === 'on_schedule' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {action.trafficLightStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs text-gray-600">Start: {formatDateShort(action.startDate)}</span>
                          <span className="text-xs text-gray-600">End: {formatDateShort(action.completionDate)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Immediate Actions */}
        {rca.immediate_action && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Immediate Actions</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{rca.immediate_action}</p>
            </div>
          </div>
        )}

        {/* Preventive Actions */}
        {(() => {
          const preventiveActions = (rca as any).preventive_action_plan
          const actionPlan = preventiveActions 
            ? (typeof preventiveActions === 'string' ? JSON.parse(preventiveActions) : preventiveActions)
            : null
          const actions = actionPlan?.preventive_actions || []
          
          return actions.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Preventive Actions</h2>
              </div>
              <div className="px-6 py-4 space-y-6">
                {actions.map((action: any, index: number) => (
                  <div key={index} className="bg-purple-50 rounded-lg border border-purple-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-purple-900">
                        Preventive Action #{action.srNo || index + 1}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        action.trafficLightStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        action.trafficLightStatus === 'delayed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {action.trafficLightStatus === 'completed' ? '🟢 Completed' :
                         action.trafficLightStatus === 'delayed' ? '🔴 Delayed' :
                         '🟡 On Schedule'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {action.challenges && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Future Challenges / Risk Areas
                          </label>
                          <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 p-3">
                            {action.challenges}
                          </p>
                        </div>
                      )}
                      
                      {action.actionPoints && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Preventive Actions
                          </label>
                          <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 p-3">
                            {action.actionPoints}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {action.responsibility && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Responsibility
                          </label>
                          <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 p-3">
                            {action.responsibility}
                          </p>
                        </div>
                      )}
                      
                      {action.startDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Start Date
                          </label>
                          <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 p-3">
                            {new Date(action.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      
                      {action.completionDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Completion Date
                          </label>
                          <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 p-3">
                            {new Date(action.completionDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Approval & Verification */}
        {(() => {
          const photos = (rca as any).control_sample_photos
          console.log('Raw photos from DB:', photos)
          const photoArray = photos 
            ? (typeof photos === 'string' ? JSON.parse(photos) : photos)
            : []
          console.log('Parsed photo array:', photoArray)
          const hasPhotos = photoArray && photoArray.length > 0
          console.log('Has photos:', hasPhotos)
          const hasApprovalData = rca.prepared_by || (rca as any).capa_prepared_by || rca.approved_by || rca.date_approved
          
          return (hasApprovalData || hasPhotos) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Approval & Verification</h2>
              </div>
              <div className="px-6 py-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rca.prepared_by && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Prepared By</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {rca.prepared_by}
                      </p>
                    </div>
                  )}
                  {(rca as any).capa_prepared_by && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">CAPA Prepared By</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {(rca as any).capa_prepared_by}
                      </p>
                    </div>
                  )}
                  {rca.approved_by && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Approved By</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {rca.approved_by}
                      </p>
                    </div>
                  )}
                  {rca.date_approved && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Date Approved</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDateShort(rca.date_approved)}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Control Sample Photos */}
                {hasPhotos && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">Control Sample Photos</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {photoArray.map((photo: string, index: number) => (
                        <a
                          key={index}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={photo}
                            alt={`Control sample ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            Photo {index + 1}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Metadata */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Record Information</h2>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {rca.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(rca.created_at).toLocaleString()}
                </p>
              </div>
            )}
            {rca.updated_at && (
              <div>
                <label className="text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(rca.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
