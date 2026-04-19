'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { Users, Plus, Search, Filter, UserCheck, MessageSquare, BarChart3 } from 'lucide-react'

const stats = [
  { label: 'Total Customers',  value: 0, icon: Users,                accent: 'bg-brand-500'      },
  { label: 'Active Customers', value: 0, icon: UserCheck,            accent: 'bg-success-500'    },
  { label: 'Total Complaints', value: 0, icon: MessageSquare, accent: 'bg-warning-500'    },
  { label: 'Avg Complaints',   value: 0, icon: BarChart3,            accent: 'bg-ink-600'        },
]

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Customers"
          subtitle="Manage customer accounts and view complaint history"
          icon={Users}
          actions={
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Customer
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.accent} text-white flex items-center justify-center shadow-soft`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-ink-600 mt-1 tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
            <input
              type="text"
              placeholder="Search customers..."
              className="input-base pl-10"
            />
          </div>
          <button className="btn-outline">
            <Filter className="w-4 h-4 mr-1.5" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="surface-card overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-cream-300 flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-600">All Customers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-cream-100">
                <tr>
                  {['Customer', 'Email', 'Company', 'Complaints', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center">
                        <Users className="w-6 h-6 text-ink-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-500">No customers yet</p>
                        <p className="text-xs text-ink-400 mt-0.5">Click "Add Customer" to create your first record.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
