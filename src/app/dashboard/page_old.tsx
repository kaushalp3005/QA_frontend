'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cardStyles, layoutStyles, textStyles, badgeStyles, cn } from '@/lib/styles'

const stats = [
  { 
    name: 'Total Complaints', 
    value: '124', 
    change: '+12%', 
    changeType: 'increase',
    icon: FileText 
  },
  { 
    name: 'Active Customers', 
    value: '89', 
    change: '+5%', 
    changeType: 'increase',
    icon: Users 
  },
  { 
    name: 'Resolution Rate', 
    value: '87%', 
    change: '+3%', 
    changeType: 'increase',
    icon: TrendingUp 
  },
  { 
    name: 'Avg. Response Time', 
    value: '2.4h', 
    change: '-15min', 
    changeType: 'decrease',
    icon: Clock 
  },
]

const recentComplaints = [
  {
    id: 'CID202410251030',
    customer: 'Rajesh Kumar',
    title: 'Defective smartphone screen',
    status: 'in_review',
    createdAt: '2024-10-25T10:30:00Z',
  },
  {
    id: 'CID202410250915', 
    customer: 'Priya Sharma',
    title: 'Late delivery of order',
    status: 'resolved',
    createdAt: '2024-10-25T09:15:00Z',
  },
  {
    id: 'CID202410250845',
    customer: 'Mohammed Ali',
    title: 'Billing discrepancy',
    status: 'submitted',
    createdAt: '2024-10-25T08:45:00Z',
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'submitted':
      return badgeStyles.submitted
    case 'in_review':
      return badgeStyles.inReview
    case 'resolved':
      return badgeStyles.resolved
    case 'rejected':
      return badgeStyles.rejected
    default:
      return badgeStyles.draft
  }
}



export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className={textStyles.h1}>Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's an overview of your complaint management system.
          </p>
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
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Complaints */}
        <div className={cardStyles.base}>
          <div className={cardStyles.header}>
            <h2 className={textStyles.h3}>Recent Complaints</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Complaint ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
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
                {recentComplaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {complaint.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {complaint.customer}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {complaint.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(badgeStyles.base, getStatusBadge(complaint.status))}>
                        {complaint.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateShort(complaint.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={layoutStyles.grid2}>
          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className={layoutStyles.flexStart}>
                <AlertTriangle className="h-8 w-8 text-orange-500 mr-4" />
                <div>
                  <h3 className={textStyles.h4}>Urgent Complaints</h3>
                  <p className={textStyles.body}>3 complaints need immediate attention</p>
                  <button className="mt-3 text-primary-600 hover:text-primary-800 text-sm font-medium">
                    View urgent complaints →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={cardStyles.base}>
            <div className={cardStyles.body}>
              <div className={layoutStyles.flexStart}>
                <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
                <div>
                  <h3 className={textStyles.h4}>Resolved Today</h3>
                  <p className={textStyles.body}>8 complaints resolved successfully</p>
                  <button className="mt-3 text-primary-600 hover:text-primary-800 text-sm font-medium">
                    View resolved complaints →
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