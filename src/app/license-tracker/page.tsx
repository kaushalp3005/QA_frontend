'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getLicenses, getLicenseStats, deleteLicense, updateLicense, type License, type LicenseStats } from '@/lib/api/licenses'
import { formatDateShort } from '@/lib/date-utils'
import { Shield, Plus, Edit, Trash2, AlertTriangle, FileText, X } from 'lucide-react'
import { cardStyles, layoutStyles, textStyles, badgeStyles, cn } from '@/lib/styles'
import { useCompany } from '@/contexts/CompanyContext'

export default function LicenseTrackerPage() {
  const { currentCompany } = useCompany()
  const [licenses, setLicenses] = useState<License[]>([])
  const [stats, setStats] = useState<LicenseStats>({ total: 0, active: 0, expired: 0, expiring_soon: 0 })
  const [loading, setLoading] = useState(true)
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  console.log('🎬 LicenseTrackerPage rendered - Company:', currentCompany)
  console.log('📊 Current State - Licenses:', licenses.length, 'Loading:', loading)

  useEffect(() => {
    console.log('⚡ useEffect triggered - Company:', currentCompany)
    fetchLicenses()
    fetchStats()
  }, [currentCompany])

  const fetchLicenses = async () => {
    try {
      console.log('🚀 Starting fetchLicenses...')
      console.log('📍 Current Company:', currentCompany)
      setLoading(true)
      const response = await getLicenses({
        // company_name: currentCompany, // Removed filter to show all licenses
        page: 1,
        limit: 1000, // Load all licenses
      })
      console.log('📦 Response received:', response)
      console.log('🔢 Number of licenses:', response.licenses?.length)
      console.log('📋 Licenses array:', response.licenses)
      setLicenses(response.licenses || [])
      console.log('✅ State updated successfully')
    } catch (error) {
      console.error('❌ Error fetching licenses:', error)
    } finally {
      setLoading(false)
      console.log('🏁 Loading finished')
    }
  }

  const fetchStats = async () => {
    try {
      console.log('📊 Starting fetchStats...')
      console.log('📍 Current Company:', currentCompany)
      const statsData = await getLicenseStats() // Removed company filter
      console.log('📈 Stats received:', statsData)
      setStats(statsData)
      console.log('✅ Stats state updated')
    } catch (error) {
      console.error('❌ Error fetching license stats:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this license?')) return

    try {
      await deleteLicense(id)
      fetchLicenses()
      fetchStats()
    } catch (error) {
      console.error('Error deleting license:', error)
      alert('Failed to delete license')
    }
  }

  const handleEdit = (license: License) => {
    console.log('✏️ Opening edit modal for license:', license.id)
    setEditingLicense(license)
    setIsEditModalOpen(true)
  }

  const handleUpdateLicense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLicense) return

    try {
      console.log('💾 Updating license:', editingLicense.id)
      // Build a safe payload: exclude server-managed fields and invalid statuses
      const {
        id,
        created_at,
        updated_at,
        license_no, // read-only on server
        last_reminder_sent,
        reminder_ignored,
        reminder_ignored_at,
        reminders_sent_count,
        final_reminder_days,
        ...payload
      } = editingLicense

      // Map UI-only statuses to DB-accepted statuses
      if (payload.status === 'Surrendered') {
        payload.status = 'Surrender'
      }
      // Drop derived statuses not accepted by DB CHECK
      if (payload.status === 'Expired' || payload.status === 'Expiring Soon') {
        const { status, ...payloadWithoutStatus } = payload
        await updateLicense(editingLicense.id, payloadWithoutStatus)
      } else {
        await updateLicense(editingLicense.id, payload)
      }
      console.log('✅ License updated successfully')
      setIsEditModalOpen(false)
      setEditingLicense(null)
      fetchLicenses()
      fetchStats()
      alert('License updated successfully!')
    } catch (error) {
      console.error('❌ Error updating license:', error)
      alert('Failed to update license')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return badgeStyles.resolved
      case 'expired':
        return badgeStyles.rejected
      case 'surrendered':
        return badgeStyles.draft
      default:
        return badgeStyles.draft
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
      <div className={layoutStyles.container}>
        {/* Header */}
        <div className={layoutStyles.flexBetween}>
          <div>
            <h1 className={textStyles.h1}>License Tracker</h1>
            <p className={textStyles.body}>Manage and track your licenses</p>
          </div>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            Add License
          </button>
        </div>

        {/* Stats */}
        <div className={layoutStyles.grid4}>
          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Licenses</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Shield className="h-12 w-12 text-blue-500" />
              </div>
            </div>
          </div>

          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Shield className="h-12 w-12 text-green-500" />
              </div>
            </div>
          </div>

          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expired</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">{stats.expired}</p>
                </div>
                <Shield className="h-12 w-12 text-red-500" />
              </div>
            </div>
          </div>

          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="mt-2 text-3xl font-bold text-orange-600">{stats.expiring_soon}</p>
                </div>
                <AlertTriangle className="h-12 w-12 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Licenses Table */}
        <div className={cardStyles.base}>
          <div className={cardStyles.header}>
            <h2 className={textStyles.h3}>All Licenses</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading licenses...</p>
            </div>
          ) : licenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {license.company_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {license.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.license_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(badgeStyles.base, getStatusBadge(license.status))}>
                          {license.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className={isExpiringSoon(license.validity) ? 'text-orange-600 font-semibold' : 'text-gray-900'}>
                            {formatDateShort(license.validity)}
                          </span>
                          {isExpiringSoon(license.validity) && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(license)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(license.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No licenses found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first license.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Edit License</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingLicense(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateLicense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={editingLicense.company_name}
                    onChange={(e) => setEditingLicense({ ...editingLicense, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editingLicense.location}
                    onChange={(e) => setEditingLicense({ ...editingLicense, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={editingLicense.license_no}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validity (Expiry Date)
                  </label>
                  <input
                    type="date"
                    value={editingLicense.validity}
                    onChange={(e) => setEditingLicense({ ...editingLicense, validity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Type
                  </label>
                  <select
                    value={editingLicense.type}
                    onChange={(e) => setEditingLicense({ ...editingLicense, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Central">Central</option>
                    <option value="State">State</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingLicense.status}
                    onChange={(e) => setEditingLicense({ ...editingLicense, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Surrendered">Surrendered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={editingLicense.issuing_authority || ''}
                    onChange={(e) => setEditingLicense({ ...editingLicense, issuing_authority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remind Me In
                  </label>
                  <select
                    value={editingLicense.remind_me_in || ''}
                    onChange={(e) => setEditingLicense({ ...editingLicense, remind_me_in: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select reminder</option>
                    <option value="5 days">5 days</option>
                    <option value="15 days">15 days</option>
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingLicense(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
