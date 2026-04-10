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

        {/* Product Weight Check Container */}
        <div
          onClick={() => router.push('/documentations/productweightcheck')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Product Weight Check</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Product Weight and Sealing Check Record</p>
          </div>
        </div>

        {/* Production Tool Issuance Container */}
        <div
          onClick={() => router.push('/documentations/productiontoolissuance')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Production Tool Issuance</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Production Tools Issuance and Integrity Check Record</p>
          </div>
        </div>

        {/* Daily Cleaning Checklist Container */}
        <div
          onClick={() => router.push('/documentations/dailycleaningchecklist')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Daily Cleaning Checklist</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Daily Cleaning Checklists (Floor, Toilet, Facility, Changing Room, Storage, Service Floor)</p>
          </div>
        </div>

        {/* Equipment Cleaning & Sanitation Container */}
        <div
          onClick={() => router.push('/documentations/equipmentcleaningsanitation')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Equipment Cleaning &amp; Sanitation</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Equipment Cleaning and Sanitation Record</p>
          </div>
        </div>

        {/* Pre-Production Inspection Checklist Container */}
        <div
          onClick={() => router.push('/documentations/preproductioninspection')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Pre-Production Inspection Checklist</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Pre-Production Inspection Checklist (Floor, Basements, First Floor, Second Floor, Terrace)</p>
          </div>
        </div>

        {/* Line Clearance Record Container */}
        <div
          onClick={() => router.push('/documentations/lineclearancerecord')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Line Clearance Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Product Changeover Line Clearance Record</p>
          </div>
        </div>

        {/* Personal Hygiene & Health Checkup Container */}
        <div
          onClick={() => router.push('/documentations/personalhygienecheckup')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Personal Hygiene &amp; Health Checkup</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Personal Hygiene and Health Checkup Record</p>
          </div>
        </div>

        {/* Roasting Temperature & Time Container */}
        <div
          onClick={() => router.push('/documentations/roastingtemperature')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Roasting Temperature &amp; Time</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open CCP Monitoring and Verification of Roasting Temperature and Time</p>
          </div>
        </div>

        {/* In-house Weighing Scale Calibration Container */}
        <div
          onClick={() => router.push('/documentations/weighingscalecalibration')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">In-house Weighing Scale Calibration</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open In-house Weighing Scale Calibration Record</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
