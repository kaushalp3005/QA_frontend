'use client'

import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function DocumentationsPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Metal Detector & X-Ray Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={() => router.push('/documentations/metaldetector')}
            className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Metal Detector</h2>
              <p className="mt-2 text-sm text-gray-500">Click to open CCP calibration, Monitoring and Verification Record</p>
            </div>
          </div>

          <div
            onClick={() => router.push('/documentations/xray')}
            className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">X-Ray</h2>
              <p className="mt-2 text-sm text-gray-500">Click to open X-Ray Detection Monitoring and Verification Record</p>
            </div>
          </div>
        </div>

        {/* IPQC Container */}
        <div
          onClick={() => router.push('/documentations/ipqc')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">IPQC</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open In-Process Quality Control Monitoring and Verification Record</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
