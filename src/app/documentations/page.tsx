'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Search,
  FileText,
  ShieldAlert,
  Scan,
  ClipboardCheck,
  Scale,
  Wrench,
  Sparkles,
  Hammer,
  ListChecks,
  GitBranch,
  HeartPulse,
  Flame,
  Gauge,
  Droplets,
  AlertTriangle,
  Users,
  PackageCheck,
  Siren,
  Eye,
  Thermometer,
  CalendarRange,
  Truck,
  Package,
  Beaker,
  EyeOff,
  Cross,
  Compass,
  Sun,
  Bug,
  TrendingDown,
  CircleSlash,
  Recycle,
  Trash2,
  TestTube2,
  Brush,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import WarehouseSelector from '@/components/ui/WarehouseSelector'
import PageHeader from '@/components/ui/PageHeader'

type DocItem = {
  href: string
  title: string
  description: string
  icon: typeof BookOpen
  category: 'CCP' | 'QC' | 'Hygiene' | 'Maintenance' | 'Safety' | 'Records'
  tone?: 'brand' | 'warning' | 'ink'
}

const DOCS: DocItem[] = [
  { href: '/documentations/metaldetector', title: 'Metal Detector', description: 'CCP calibration, Monitoring and Verification Record', icon: ShieldAlert, category: 'CCP', tone: 'warning' },
  { href: '/documentations/xray', title: 'X-Ray', description: 'X-Ray Detection Monitoring and Verification Record', icon: Scan, category: 'CCP', tone: 'warning' },
  { href: '/documentations/ipqc', title: 'IPQC', description: 'In-Process Quality Control Monitoring and Verification Record', icon: ClipboardCheck, category: 'QC' },
  { href: '/documentations/productweightcheck', title: 'Product Weight Check', description: 'Product Weight and Sealing Check Record', icon: Scale, category: 'QC' },
  { href: '/documentations/productiontoolissuance', title: 'Production Tool Issuance', description: 'Production Tools Issuance and Integrity Check Record', icon: Wrench, category: 'Maintenance' },
  { href: '/documentations/dailycleaningchecklist', title: 'Daily Cleaning Checklist', description: 'Daily Cleaning Checklists (Floor, Toilet, Facility, Changing Room, Storage, Service Floor)', icon: Sparkles, category: 'Hygiene' },
  { href: '/documentations/equipmentcleaningsanitation', title: 'Equipment Cleaning & Sanitation', description: 'Equipment Cleaning and Sanitation Record', icon: Brush, category: 'Hygiene' },
  { href: '/documentations/preproductioninspection', title: 'Pre-Production Inspection', description: 'Pre-Production Inspection Checklist (Floor, Basements, First/Second Floor, Terrace)', icon: ListChecks, category: 'QC' },
  { href: '/documentations/lineclearancerecord', title: 'Line Clearance Record', description: 'Product Changeover Line Clearance Record', icon: GitBranch, category: 'QC' },
  { href: '/documentations/personalhygienecheckup', title: 'Personal Hygiene & Health', description: 'Personal Hygiene and Health Checkup Record', icon: HeartPulse, category: 'Hygiene' },
  { href: '/documentations/roastingtemperature', title: 'Roasting Temperature & Time', description: 'CCP Monitoring and Verification of Roasting Temperature and Time', icon: Flame, category: 'CCP', tone: 'warning' },
  { href: '/documentations/weighingscalecalibration', title: 'Weighing Scale Calibration', description: 'In-house Weighing Scale Calibration Record', icon: Gauge, category: 'Maintenance' },
  { href: '/documentations/water-analysis', title: 'Water Analysis', description: 'Water Analysis Record (CFPLA.C4.F.04)', icon: Droplets, category: 'QC' },
  { href: '/documentations/incident-report', title: 'Food Safety Incident Report', description: 'Food Safety Incident Report Register (CFPLA.C5.F.05)', icon: AlertTriangle, category: 'Safety', tone: 'warning' },
  { href: '/documentations/safety-meeting', title: 'Food Safety Meeting Minutes', description: 'Food Safety Meeting Minutes (CFPLA.C.F.09)', icon: Users, category: 'Records' },
  { href: '/documentations/new-product-verification', title: 'New Product Verification', description: 'New Product Verification (CFPLA.C5.F.13)', icon: PackageCheck, category: 'QC' },
  { href: '/documentations/mock-drill', title: 'Emergency Mock Drill', description: 'Emergency Fire Evacuation Mock Drill (CFPLA.C4.F.14)', icon: Siren, category: 'Safety', tone: 'warning' },
  { href: '/documentations/gmp-ghp-inspection', title: 'Monthly GMP & GHP Inspection', description: 'Monthly Facility (GMP) & GHP Inspection (CFPLA.C3.F.15)', icon: Eye, category: 'Hygiene' },
  { href: '/documentations/temperature-humidity', title: 'Temperature & Humidity', description: 'Temperature & Humidity Record Register (CFPLA.C6.F.17)', icon: Thermometer, category: 'Records' },
  { href: '/documentations/inprocess-qc-record', title: 'In-process QC Record', description: 'In-process Quality Check Record (CFPLA.C6.F.18)', icon: ClipboardCheck, category: 'QC' },
  { href: '/documentations/gmp-schedule', title: 'Monthly GMP Schedule', description: 'Monthly Facility GMP & GHP Inspection Schedule (CFPLA.C3.F.23)', icon: CalendarRange, category: 'Hygiene' },
  { href: '/documentations/inward-rm-check', title: 'Inward Raw Material Check', description: 'Inward Raw Material Check Records (CFPLA.C5.F.25)', icon: Package, category: 'QC' },
  { href: '/documentations/fg-chemical-analysis', title: 'FG Chemical Analysis', description: 'Finished Good Chemical Analysis (CFPLA.C5.F.26)', icon: Beaker, category: 'QC' },
  { href: '/documentations/eyewash-refill', title: 'Eye Wash Bottle Refilling', description: 'Eye Wash Bottle Refilling Record (CFPLA.C7.F.27)', icon: EyeOff, category: 'Safety' },
  { href: '/documentations/first-aid-box', title: 'First Aid Box', description: 'First Aid Box Record (CFPLA.C7.F.29)', icon: Cross, category: 'Safety' },
  { href: '/documentations/traceability', title: 'Traceability Report', description: 'Traceability Report (CFPLA.C3.F.30)', icon: Compass, category: 'Records' },
  { href: '/documentations/lux-monitoring', title: 'Lux Monitoring', description: 'Lux Monitoring Record (CFPLA.C4.F.32)', icon: Sun, category: 'Maintenance' },
  { href: '/documentations/pre-weighing', title: 'Pre Weighing Check', description: 'Pre Weighing Check Record (CFPLA.C6.F.34)', icon: Scale, category: 'QC' },
  { href: '/documentations/fly-catcher', title: 'Daily Fly Catcher Check', description: 'Daily Checks for Fly Catcher - Inhouse (CFPLA.C7.F.37)', icon: Bug, category: 'Hygiene' },
  { href: '/documentations/ccp-roasting-bar', title: 'CCP Roasting (Bar Line)', description: 'CCP Roasting Temp & Time - Bar Line (CFPLA.C2.F.43)', icon: Flame, category: 'CCP', tone: 'warning' },
  { href: '/documentations/vehicle-inspection', title: 'Incoming Vehicle Inspection', description: 'Incoming Vehicle Inspection Record (CFPLA.C3.F.45)', icon: Truck, category: 'QC' },
  { href: '/documentations/outgoing-vehicle-inspection', title: 'Outgoing Vehicle Inspection', description: 'Outgoing Vehicle Inspection Record (CFPLA.C5.F.46)', icon: Truck, category: 'QC' },
  { href: '/documentations/glass-brittle-check', title: 'Glass & Brittle Check', description: 'Glass and Brittle Check Record (CFPLA.C4.F.48)', icon: TrendingDown, category: 'Safety' },
  { href: '/documentations/preventive-maintenance', title: 'Preventive Maintenance', description: 'Preventive Maintenance Checklist - Monthly (CFPLA.C4.F.50a/b)', icon: Hammer, category: 'Maintenance' },
  { href: '/documentations/new-equipment-clearance', title: 'New Equipment Clearance', description: 'New Equipment Clearance (Commissioning) Record (CFPLA.C4.F.51)', icon: PackageCheck, category: 'Maintenance' },
  { href: '/documentations/waste-disposal', title: 'Waste Disposal', description: 'Waste Disposal Record (CFPLA.C4.F.52)', icon: Trash2, category: 'Hygiene' },
  { href: '/documentations/chemical-preparation', title: 'Chemical Preparation', description: 'Chemical Preparation Record - Housekeeping (CFPLA.C4.F.53)', icon: TestTube2, category: 'Hygiene' },
  { href: '/documentations/deep-cleaning', title: 'Deep Cleaning', description: 'Housekeeping Deep Cleaning Record (CFPLA.C4.F.55)', icon: Sparkles, category: 'Hygiene' },
  { href: '/documentations/non-conforming-product', title: 'Non Conforming Product', description: 'Product Non Conformity / Rejection Record (CFPLA.C5.F.57)', icon: CircleSlash, category: 'QC', tone: 'warning' },
  { href: '/documentations/rework-recycling', title: 'Re-Work / Re-Cycling / Re-Packing', description: 'Re-Work / Re-Cycling / Re-Packing Record (CFPLA.C5.F.58)', icon: Recycle, category: 'QC' },
]

const CATEGORIES: Array<DocItem['category'] | 'All'> = ['All', 'CCP', 'QC', 'Hygiene', 'Maintenance', 'Safety', 'Records']

export default function DocumentationsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<DocItem['category'] | 'All'>('All')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return DOCS.filter((d) => {
      if (activeCategory !== 'All' && d.category !== activeCategory) return false
      if (!q) return true
      return (
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      )
    })
  }, [search, activeCategory])

  const toneClass = (tone?: DocItem['tone']) => {
    if (tone === 'warning') return 'bg-warning-500'
    if (tone === 'ink') return 'bg-ink-600'
    return 'bg-brand-500'
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Documentations"
          subtitle="Quality, safety & compliance record registers"
          icon={BookOpen}
          actions={<WarehouseSelector />}
        />

        {/* Search + Filters */}
        <div className="surface-card p-4 mb-6 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by title, description or category..."
                className="input-base pl-10 w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-soft'
                        : 'bg-cream-200 text-ink-500 hover:bg-cream-300'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="surface-card p-12 flex flex-col items-center text-center animate-fade-in">
            <div className="bg-cream-200 w-16 h-16 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-ink-300" />
            </div>
            <p className="text-sm font-semibold text-ink-500">No documents found</p>
            <p className="text-xs text-ink-400 mt-0.5">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc, i) => {
              const Icon = doc.icon
              return (
                <div
                  key={doc.href}
                  onClick={() => router.push(doc.href)}
                  className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-11 h-11 rounded-xl ${toneClass(doc.tone)} text-white flex items-center justify-center shadow-soft`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-sm font-bold text-ink-600 line-clamp-2">{doc.title}</h2>
                      </div>
                      <p className="text-[11px] text-ink-400 font-medium mt-1 line-clamp-2">{doc.description}</p>
                      <span className="inline-block mt-2 rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-brand-50 text-brand-600">
                        {doc.category}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
