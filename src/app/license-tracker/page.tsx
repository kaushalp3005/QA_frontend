'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getLicenses, getLicenseStats, deleteLicense, updateLicense, type License, type LicenseStats } from '@/lib/api/licenses'
import { formatDateShort } from '@/lib/date-utils'
import { Shield, Plus, Edit, Trash2, AlertTriangle, FileText, X, Eye, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'

export default function LicenseTrackerPage() {
  const { currentCompany } = useCompany()
  const { canCreate, canEdit, canDelete, canView } = usePermissions()
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
    console.log('📋 License data:', license)
    // Create a deep copy to avoid mutation issues
    setEditingLicense({ ...license })
    setIsEditModalOpen(true)
    console.log('✅ Edit modal opened')
  }

  const handleUpdateLicense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('🚀 handleUpdateLicense called')

    if (!editingLicense) {
      console.log('❌ No editingLicense found')
      return
    }

    try {
      console.log('💾 Updating license:', editingLicense.id)
      console.log('📄 Full editingLicense object:', editingLicense)

      // Build a safe payload: exclude server-managed fields
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

      console.log('📦 Payload after removing server fields:', payload)

      // Map UI statuses to DB-accepted statuses
      let finalStatus = payload.status
      console.log('🔄 Original status:', finalStatus)

      if (finalStatus === 'Surrendered') {
        finalStatus = 'Surrender'
        console.log('🔄 Mapped Surrendered → Surrender')
      } else if (finalStatus === 'State Surrender') {
        finalStatus = 'Surrender' // Map to DB value
        console.log('🔄 Mapped State Surrender → Surrender')
      }

      console.log('✅ Final status to send:', finalStatus)

      // Only send status if it's a valid DB status (Active, Surrender)
      // Drop derived statuses (Expired, Expiring Soon) as they're calculated by DB
      if (finalStatus === 'Expired' || finalStatus === 'Expiring Soon') {
        console.log('⚠️ Skipping computed status:', finalStatus)
        const { status, ...payloadWithoutStatus } = payload
        console.log('📤 Sending payload WITHOUT status:', payloadWithoutStatus)
        await updateLicense(editingLicense.id, payloadWithoutStatus)
      } else {
        const finalPayload = { ...payload, status: finalStatus }
        console.log('📤 Sending payload WITH status:', finalPayload)
        await updateLicense(editingLicense.id, finalPayload)
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
        return 'bg-success-50 text-success-700'
      case 'expired':
        return 'bg-danger-50 text-danger-700'
      case 'expiring soon':
        return 'bg-warning-50 text-warning-700'
      case 'surrendered':
      case 'surrender':
        return 'bg-cream-200 text-ink-500'
      default:
        return 'bg-cream-200 text-ink-500'
    }
  }

  const isExpiringSoon = (validity: string) => {
    const expiryDate = new Date(validity)
    const today = new Date()
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  const statTiles = [
    { label: 'Total Licenses', value: stats.total, icon: Shield },
    { label: 'Active', value: stats.active, icon: CheckCircle2 },
    { label: 'Expired', value: stats.expired, icon: XCircle },
    { label: 'Expiring Soon', value: stats.expiring_soon, icon: AlertTriangle },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="License Tracker"
          subtitle="Manage and track your licenses"
          icon={Shield}
          actions={
            canCreate('license_tracker') ? (
              <button className="btn-primary">
                <Plus className="w-4 h-4 mr-1.5" />
                Add License
              </button>
            ) : undefined
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statTiles.map((tile, i) => {
            const Icon = tile.icon
            return (
              <div
                key={tile.label}
                className="surface-card p-5 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">
                      {tile.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-ink-600 tabular-nums">{tile.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-500 text-white shadow-soft flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Licenses Table */}
        <div className="surface-card overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-cream-300 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-600">All Licenses</h2>
            <span className="text-xs text-ink-400 font-medium tabular-nums">{licenses.length} records</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Spinner size={32} className="text-brand-500 mx-auto" />
              <p className="mt-3 text-sm text-ink-400 font-medium">Loading licenses...</p>
            </div>
          ) : licenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Company Name
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Location
                    </th>
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
                    <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300 bg-white">
                  {licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-cream-100/50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-ink-600">
                        {license.company_name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-500">
                        {license.location}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-ink-500">
                        {license.type}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-ink-500 font-mono tabular-nums">
                        {license.license_no}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${getStatusBadge(license.status)}`}>
                          {license.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isExpiringSoon(license.validity)
                                ? 'text-xs font-semibold text-warning-700 tabular-nums'
                                : 'text-xs text-ink-400 font-medium tabular-nums'
                            }
                          >
                            {formatDateShort(license.validity)}
                          </span>
                          {isExpiringSoon(license.validity) && (
                            <AlertTriangle className="h-3.5 w-3.5 text-warning-700" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canView('license_tracker') && (
                            <Link
                              href={`/license-tracker/${license.id}`}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          )}
                          {canEdit('license_tracker') && (
                            <button
                              onClick={() => handleEdit(license)}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete('license_tracker') && (
                            <button
                              onClick={() => handleDelete(license.id)}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-cream-200 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
                <FileText className="h-6 w-6 text-ink-400" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink-500">No licenses found</h3>
              <p className="text-xs text-ink-400 mt-0.5">
                Get started by adding your first license.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingLicense && (
        <div className="fixed inset-0 bg-ink-600/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="surface-card max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lift animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300">
              <h2 className="text-lg font-semibold text-ink-600">Edit License</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingLicense(null)
                }}
                className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLicense} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-base">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={editingLicense.company_name}
                    onChange={(e) => setEditingLicense({ ...editingLicense, company_name: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>

                <div>
                  <label className="label-base">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editingLicense.location}
                    onChange={(e) => setEditingLicense({ ...editingLicense, location: e.target.value })}
                    className="input-base"
                    required
                  />
                </div>

                <div>
                  <label className="label-base">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={editingLicense.license_no}
                    className="input-base bg-cream-100 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label className="label-base">
                    Validity (Expiry Date)
                  </label>
                  <input
                    type="date"
                    value={editingLicense.validity}
                    onChange={(e) => setEditingLicense({ ...editingLicense, validity: e.target.value })}
                    className="input-base"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="label-base">
                    License Type
                  </label>
                  <select
                    value={editingLicense.type}
                    onChange={(e) => setEditingLicense({ ...editingLicense, type: e.target.value })}
                    className="input-base"
                    required
                  >
                    <option value="Central">Central</option>
                    <option value="State">State</option>
                  </select>
                </div>

                <div>
                  <label className="label-base">
                    Status
                  </label>
                  <select
                    value={editingLicense.status}
                    onChange={(e) => {
                      console.log('🔄 Status changed:', e.target.value)
                      setEditingLicense({ ...editingLicense, status: e.target.value })
                    }}
                    className="input-base"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Surrender">Surrender</option>
                  </select>
                </div>

                <div>
                  <label className="label-base">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={editingLicense.issuing_authority || ''}
                    onChange={(e) => setEditingLicense({ ...editingLicense, issuing_authority: e.target.value })}
                    className="input-base"
                  />
                </div>

                <div>
                  <label className="label-base">
                    Remind Me In
                  </label>
                  <select
                    value={editingLicense.remind_me_in || ''}
                    onChange={(e) => setEditingLicense({ ...editingLicense, remind_me_in: e.target.value })}
                    className="input-base"
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

              <div className="flex justify-end gap-2 pt-4 border-t border-cream-300">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingLicense(null)
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
