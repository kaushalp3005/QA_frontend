'use client'

import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function DocumentationsPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Metal Detector Container */}
        <div 
          onClick={() => router.push('/documentations/metaldetector')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Metal Detector</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open CCP calibration, Monitoring and Verification Record</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
