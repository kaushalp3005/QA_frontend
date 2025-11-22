'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Package,
  AlertCircle,
  FileText,
  Clock,
  Loader2,
  Download,
  Eye,
  Image as ImageIcon,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { isAuthenticated } from '@/lib/api/auth'
import { toast } from 'react-hot-toast'

interface VendorCOA {
  id: number
  vendor_name: string
  lot_batch_number: string
  item_name: string
  item_subcategory: string
  item_type?: string
  date: string
  file_name: string
  file_type: string
  file_url: string
  created_at?: string
  updated_at?: string
}

export default function VendorCOAViewPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canView, canEdit } = usePermissions()
  const [coa, setCoa] = useState<VendorCOA | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const coaId = params.id as string

  // Check authentication first
  useEffect(() => {
    if (!isAuthenticated()) {
      const returnUrl = `/vendor-coa/${coaId}`
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }
    setCheckingAuth(false)
  }, [coaId, router])

  useEffect(() => {
    if (!checkingAuth && coaId) {
      fetchCOAData()
    }
  }, [checkingAuth, coaId])

  const fetchCOAData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/vendor-coa/${coaId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch COA record')
      }
      const data = await response.json()
      setCoa(data)
    } catch (error) {
      console.error('Error fetching vendor COA:', error)
      toast.error('Failed to load vendor COA record')
      router.push('/vendor-coa')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (checkingAuth || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!coa) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Vendor COA record not found</h3>
          <div className="mt-6">
            <Link
              href="/vendor-coa"
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

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = coa.file_url
    link.download = coa.file_name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/vendor-coa"
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">COA Record #{coa.id}</h1>
              <p className="text-sm text-gray-600 mt-1">Vendor Certificate of Analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.open(coa.file_url, '_blank')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Document
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">COA Information</h2>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Vendor Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Vendor Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vendor Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{coa.vendor_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {coa.date}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Item Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Item Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Item Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{coa.item_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Item Subcategory</dt>
                  <dd className="mt-1 text-sm text-gray-900">{coa.item_subcategory}</dd>
                </div>
                {coa.item_type && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Item Type</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {coa.item_type}
                      </span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Lot/Batch Number</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {coa.lot_batch_number}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Document Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Document Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">File Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    {coa.file_type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 mr-2 text-blue-600" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2 text-red-600" />
                    )}
                    {coa.file_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">File Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{coa.file_type}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Document Preview</dt>
                  <dd className="mt-1">
                    {coa.file_type.startsWith('image/') ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <img
                          src={coa.file_url}
                          alt={coa.file_name}
                          className="max-w-full h-auto max-h-96 mx-auto rounded-lg cursor-pointer hover:opacity-75"
                          onClick={() => window.open(coa.file_url, '_blank')}
                        />
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-2">{coa.file_name}</p>
                        <button
                          onClick={() => window.open(coa.file_url, '_blank')}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Open Document
                        </button>
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Metadata */}
            {(coa.created_at || coa.updated_at) && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Metadata
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {coa.created_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDateShort(coa.created_at)}</dd>
                    </div>
                  )}
                  {coa.updated_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDateShort(coa.updated_at)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

