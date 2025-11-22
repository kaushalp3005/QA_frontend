'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Shield,
  AlertCircle,
  FileText,
  Clock,
  Loader2,
  MapPin,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getLicenseById } from '@/lib/api/licenses'
import { toast } from 'react-hot-toast'

export default function LicenseViewPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canView, canEdit } = usePermissions()
  const [license, setLicense] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const licenseId = params.id as string

  useEffect(() => {
    if (licenseId) {
      fetchLicenseData()
    }
  }, [licenseId])

  const fetchLicenseData = async () => {
    try {
      setLoading(true)
      const data = await getLicenseById(parseInt(licenseId))
      setLicense(data)
    } catch (error) {
      console.error('Error fetching license:', error)
      toast.error('Failed to load license')
      router.push('/license-tracker')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!license) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">License not found</h3>
          <div className="mt-6">
            <Link
              href="/license-tracker"
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'surrendered':
      case 'surrender':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isExpiringSoon = (validity: string) => {
    const expiryDate = new Date(validity)
    const today = new Date()
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/license-tracker"
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{license.license_no}</h1>
              <p className="text-sm text-gray-600 mt-1">License Details</p>
            </div>
          </div>
          {canEdit('license') && (
            <Link
              href={`/license-tracker?edit=${licenseId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">License Information</h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(license.status)}`}>
                  {license.status}
                </span>
                {isExpiringSoon(license.validity) && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    Expiring Soon
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Company Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Company Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{license.company_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {license.location}
                  </dd>
                </div>
              </dl>
            </div>

            {/* License Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                License Details
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">License Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{license.license_no}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">License Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{license.type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Validity (Expiry Date)</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDateShort(license.validity)}
                    {isExpiringSoon(license.validity) && (
                      <span className="ml-2 text-xs text-orange-600 font-semibold">
                        ({Math.floor((new Date(license.validity).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining)
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(license.status)}`}>
                      {license.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Additional Information */}
            {(license.issuing_authority || license.remind_me_in || license.business_types) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Additional Information
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {license.issuing_authority && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Issuing Authority</dt>
                      <dd className="mt-1 text-sm text-gray-900">{license.issuing_authority}</dd>
                    </div>
                  )}
                  {license.remind_me_in && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reminder Setting</dt>
                      <dd className="mt-1 text-sm text-gray-900">{license.remind_me_in}</dd>
                    </div>
                  )}
                  {license.business_types && license.business_types.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Business Types</dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        {license.business_types.map((type: string, index: number) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            {type}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Reminder Information */}
            {(license.last_reminder_sent || license.reminders_sent_count !== undefined) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Reminder Information
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {license.last_reminder_sent && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Reminder Sent</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDateShort(license.last_reminder_sent)}</dd>
                    </div>
                  )}
                  {license.reminders_sent_count !== undefined && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reminders Sent</dt>
                      <dd className="mt-1 text-sm text-gray-900">{license.reminders_sent_count}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Metadata
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {license.created_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateShort(license.created_at)}</dd>
                  </div>
                )}
                {license.updated_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateShort(license.updated_at)}</dd>
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

