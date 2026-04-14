'use client'

import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import WarehouseSelector from '@/components/ui/WarehouseSelector'

export default function DocumentationsPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Warehouse selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Documentations</h1>
          <WarehouseSelector />
        </div>
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

        {/* Water Analysis Record Container */}
        <div
          onClick={() => router.push('/documentations/water-analysis')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Water Analysis Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Water Analysis Record (CFPLA.C4.F.04)</p>
          </div>
        </div>

        {/* Food Safety Incident Report Container */}
        <div
          onClick={() => router.push('/documentations/incident-report')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Food Safety Incident Report</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Food Safety Incident Report Register (CFPLA.C5.F.05)</p>
          </div>
        </div>

        {/* Food Safety Meeting Minutes Container */}
        <div
          onClick={() => router.push('/documentations/safety-meeting')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Food Safety Meeting Minutes</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Food Safety Meeting Minutes (CFPLA.C.F.09)</p>
          </div>
        </div>

        {/* New Product Verification Container */}
        <div
          onClick={() => router.push('/documentations/new-product-verification')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">New Product Verification</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open New Product Verification (CFPLA.C5.F.13)</p>
          </div>
        </div>

        {/* Emergency Mock Drill Container */}
        <div
          onClick={() => router.push('/documentations/mock-drill')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Emergency Fire Evacuation Mock Drill</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Emergency Fire Evacuation Mock Drill (CFPLA.C4.F.14)</p>
          </div>
        </div>

        {/* Monthly GMP & GHP Inspection Container */}
        <div
          onClick={() => router.push('/documentations/gmp-ghp-inspection')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Monthly GMP &amp; GHP Inspection</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Monthly Facility (GMP) &amp; GHP Inspection (CFPLA.C3.F.15)</p>
          </div>
        </div>

        {/* Temperature & Humidity Record Container */}
        <div
          onClick={() => router.push('/documentations/temperature-humidity')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Temperature &amp; Humidity Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Temperature &amp; Humidity Record Register (CFPLA.C6.F.17)</p>
          </div>
        </div>

        {/* In-process Quality Check Record Container */}
        <div
          onClick={() => router.push('/documentations/inprocess-qc-record')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">In-process Quality Check Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open In-process Quality Check Record (CFPLA.C6.F.18)</p>
          </div>
        </div>

        {/* Monthly GMP Schedule Container */}
        <div
          onClick={() => router.push('/documentations/gmp-schedule')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Monthly GMP Inspection Schedule</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Monthly Facility GMP &amp; GHP Inspection Schedule (CFPLA.C3.F.23)</p>
          </div>
        </div>

        {/* Inward Raw Material Check Container */}
        <div
          onClick={() => router.push('/documentations/inward-rm-check')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Inward Raw Material Check</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Inward Raw Material Check Records (CFPLA.C5.F.25)</p>
          </div>
        </div>

        {/* Finished Good Chemical Analysis Container */}
        <div
          onClick={() => router.push('/documentations/fg-chemical-analysis')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Finished Good Chemical Analysis</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Finished Good Chemical Analysis (CFPLA.C5.F.26)</p>
          </div>
        </div>

        {/* Eye Wash Bottle Refilling Container */}
        <div
          onClick={() => router.push('/documentations/eyewash-refill')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Eye Wash Bottle Refilling Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Eye Wash Bottle Refilling Record (CFPLA.C7.F.27)</p>
          </div>
        </div>

        {/* First Aid Box Container */}
        <div
          onClick={() => router.push('/documentations/first-aid-box')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">First Aid Box Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open First Aid Box Record (CFPLA.C7.F.29)</p>
          </div>
        </div>

        {/* Traceability Report Container */}
        <div
          onClick={() => router.push('/documentations/traceability')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Traceability Report</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Traceability Report (CFPLA.C3.F.30)</p>
          </div>
        </div>

        {/* Lux Monitoring Container */}
        <div
          onClick={() => router.push('/documentations/lux-monitoring')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Lux Monitoring Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Lux Monitoring Record (CFPLA.C4.F.32)</p>
          </div>
        </div>

        {/* Pre Weighing Check Container */}
        <div
          onClick={() => router.push('/documentations/pre-weighing')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Pre Weighing Check Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Pre Weighing Check Record (CFPLA.C6.F.34)</p>
          </div>
        </div>

        {/* Daily Fly Catcher Check Container */}
        <div
          onClick={() => router.push('/documentations/fly-catcher')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Daily Fly Catcher Check</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Daily Checks for Fly Catcher - Inhouse (CFPLA.C7.F.37)</p>
          </div>
        </div>

        {/* CCP Roasting Bar Line Container */}
        <div
          onClick={() => router.push('/documentations/ccp-roasting-bar')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">CCP Roasting (Bar Line)</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open CCP Roasting Temp &amp; Time - Bar Line (CFPLA.C2.F.43)</p>
          </div>
        </div>

        {/* Incoming Vehicle Inspection Container */}
        <div
          onClick={() => router.push('/documentations/vehicle-inspection')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Incoming Vehicle Inspection</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Incoming Vehicle Inspection Record (CFPLA.C3.F.45)</p>
          </div>
        </div>

        {/* Outgoing Vehicle Inspection Container */}
        <div
          onClick={() => router.push('/documentations/outgoing-vehicle-inspection')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Outgoing Vehicle Inspection</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Outgoing Vehicle Inspection Record (CFPLA.C5.F.46)</p>
          </div>
        </div>

        {/* Glass & Brittle Check Container */}
        <div
          onClick={() => router.push('/documentations/glass-brittle-check')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Glass &amp; Brittle Check Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Glass and Brittle Check Record (CFPLA.C4.F.48)</p>
          </div>
        </div>

        {/* Preventive Maintenance Container */}
        <div
          onClick={() => router.push('/documentations/preventive-maintenance')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Preventive Maintenance Checklist</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Preventive Maintenance Checklist - Monthly (CFPLA.C4.F.50a/b)</p>
          </div>
        </div>

        {/* New Equipment Clearance Container */}
        <div
          onClick={() => router.push('/documentations/new-equipment-clearance')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">New Equipment Clearance</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open New Equipment Clearance (Commissioning) Record (CFPLA.C4.F.51)</p>
          </div>
        </div>

        {/* Waste Disposal Container */}
        <div
          onClick={() => router.push('/documentations/waste-disposal')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Waste Disposal Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Waste Disposal Record (CFPLA.C4.F.52)</p>
          </div>
        </div>

        {/* Chemical Preparation Container */}
        <div
          onClick={() => router.push('/documentations/chemical-preparation')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Chemical Preparation Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Chemical Preparation Record - Housekeeping (CFPLA.C4.F.53)</p>
          </div>
        </div>

        {/* Deep Cleaning Container */}
        <div
          onClick={() => router.push('/documentations/deep-cleaning')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Deep Cleaning Record</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Housekeeping Deep Cleaning Record (CFPLA.C4.F.55)</p>
          </div>
        </div>

        {/* Non Conforming Product Container */}
        <div
          onClick={() => router.push('/documentations/non-conforming-product')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Non Conforming Product Report</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Product Non Conformity / Rejection Record (CFPLA.C5.F.57)</p>
          </div>
        </div>

        {/* Re-Work / Re-Cycling / Re-Packing Container */}
        <div
          onClick={() => router.push('/documentations/rework-recycling')}
          className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow hover:border-blue-300"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Re-Work / Re-Cycling / Re-Packing</h2>
            <p className="mt-2 text-sm text-gray-500">Click to open Re-Work / Re-Cycling / Re-Packing Record (CFPLA.C5.F.58)</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
