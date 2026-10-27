/**
 * Maintenance System routes + per-role navigation. Ported from the Android
 * app's navigation/Screen.kt, dashboard/DashboardTile.kt and the role switch
 * in NavGraph's HomeRouter. Every web route lives under /maintenance.
 */
import {
  Activity,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  FileText,
  Gauge,
  History,
  IndianRupee,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Package,
  Send,
  Settings,
  ShieldAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { MtRole } from './client'

const M = '/maintenance'

export const MT = {
  home: M,
  dashboard: `${M}/dashboard`,
  settings: `${M}/settings`,
  comingSoon: (label: string) => `${M}/coming-soon?label=${encodeURIComponent(label)}`,

  // Machines (operator home = live machine list)
  machines: `${M}/machines`,
  machine: (id: string) => `${M}/machines/${encodeURIComponent(id)}`,
  machineHistory: (id: string) => `${M}/machines/${encodeURIComponent(id)}/history`,
  machineBreakdown: (id: string) => `${M}/machines/${encodeURIComponent(id)}/breakdown`,
  machineMaster: `${M}/machine-master`,
  scheduleElectricAssets: `${M}/schedule-electric-assets`,

  // Technician
  breakdowns: `${M}/breakdowns`,
  breakdown: (id: string) => `${M}/breakdowns/${encodeURIComponent(id)}`,
  pm: `${M}/pm`,
  pmDetail: (woId: string) => `${M}/pm/${encodeURIComponent(woId)}`,
  pmExecute: (woId: string) => `${M}/pm/${encodeURIComponent(woId)}/execute`,

  // Supervisor
  supervisor: `${M}/supervisor`,
  planEditor: (planId?: string) => `${M}/supervisor/plan${planId ? `?id=${encodeURIComponent(planId)}` : ''}`,
  supervisorPmReview: (woId: string) => `${M}/supervisor/pm/${encodeURIComponent(woId)}`,

  // QC
  qc: `${M}/qc`,
  qcInbox: `${M}/qc/verification`,
  qcTicket: (id: string) => `${M}/qc/ticket/${encodeURIComponent(id)}`,
  qcPm: (woId: string) => `${M}/qc/pm/${encodeURIComponent(woId)}`,
  qcHistory: `${M}/qc/history`,
  qcHistoryPm: `${M}/qc/history/pm`,
  qcHistoryBreakdown: `${M}/qc/history/breakdown`,

  // Checklists (PM checklist forms + F.06 breakdown sheet)
  checklist: `${M}/checklist`,
  preventiveList: `${M}/checklist/preventive`,
  preventiveForm: (draftId?: number | string) =>
    `${M}/checklist/preventive/form${draftId !== undefined ? `?draftId=${draftId}` : ''}`,
  preventiveDetail: (id: number | string) => `${M}/checklist/preventive/${id}`,
  breakdownSheetList: `${M}/checklist/breakdown`,
  breakdownSheetForm: (breakdownId?: string) =>
    `${M}/checklist/breakdown/new${breakdownId ? `?breakdownId=${encodeURIComponent(breakdownId)}` : ''}`,

  // Transfers
  transfers: `${M}/transfer`,
  transferNew: `${M}/transfer/new`,

  // Daily readings / utilities
  dailyReading: `${M}/daily-reading`,
  electricConsumption: `${M}/daily-reading/electric`,
  utilityHistory: (util: string) => `${M}/utilities/${util}`,
  utilityForm: (util: string, plant?: string, date?: string) => {
    const q = new URLSearchParams()
    if (plant) q.set('plant', plant)
    if (date) q.set('date', date)
    const s = q.toString()
    return `${M}/utilities/${util}/form${s ? `?${s}` : ''}`
  },
  utilityRates: `${M}/utility-rates`,
  a185Readings: `${M}/a185-readings`,
  a185Form: (date?: string) => `${M}/a185-readings/form${date ? `?date=${date}` : ''}`,
  w202Readings: (kind: 'main' | 'solar') => `${M}/w202-readings/${kind}`,
  w202Form: (kind: 'main' | 'solar', date?: string) => `${M}/w202-readings/${kind}/form${date ? `?date=${date}` : ''}`,

  // Spare parts
  spareParts: `${M}/spare-parts`,
  sparePartsDetail: (machine: string) => `${M}/spare-parts/detail?machine=${encodeURIComponent(machine)}`,
  sparePartHistory: (partId: number | string) => `${M}/spare-parts/history?partId=${partId}`,

  // Reports (supervisor)
  reports: `${M}/reports`,
  reportsMachines: `${M}/reports/machines`,
  reportsFloor: `${M}/reports/floor-readings`,

  // Head
  head: `${M}/head`,
  headBreakdowns: `${M}/head/breakdowns`,
  headQc: `${M}/head/qc`,
  headChecklistRecords: `${M}/head/checklist-records`,
  headReports: `${M}/head/reports`,
  headReportsMachine: `${M}/head/reports/machine-readings`,
  headReportsFloor: `${M}/head/reports/floor-readings`,
  headReportsBreakdowns: `${M}/head/reports/breakdowns`,
  headReportsQc: `${M}/head/reports/qc-activity`,
  headReportsPm: `${M}/head/reports/pm`,
  users: `${M}/users`,

  // IT technician
  itAssets: `${M}/it/assets`,
  itAssetList: (category: string) => `${M}/it/assets/${category}`,
  itAsset: (assetId: string) => `${M}/it/asset/${encodeURIComponent(assetId)}`,
  raisedTickets: `${M}/tickets/raised`,
  raisedTicket: (id: number | string) => `${M}/tickets/raised/${id}`,

  admin: `${M}/admin`,
} as const

/** Where each role lands after sign-in (NavGraph HomeRouter). */
export function homePathFor(role: MtRole): string {
  switch (role) {
    case 'OPERATOR':
      return MT.machines
    case 'HEAD':
      return MT.head
    case 'QC_HEAD':
    case 'QC_MEMBER':
      return MT.qc
    case 'ADMIN':
      return MT.admin
    default:
      // TECHNICIAN, SUPERVISOR, IT_TECHNICIAN → launcher grid
      return MT.dashboard
  }
}

export type BadgeKey = 'OPEN_BREAKDOWNS' | 'MY_PM_TASKS' | 'PENDING_APPROVALS' | 'PENDING_QC'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: BadgeKey
  /** Not built in the Android app yet — opens the Coming soon page */
  comingSoon?: boolean
}

const soon = (label: string, icon: LucideIcon): NavItem => ({ label, href: MT.comingSoon(label), icon, comingSoon: true })

const supervisorHeadTiles = (reports: NavItem): NavItem[] => [
  { label: 'Machine List', href: MT.machines, icon: Wrench },
  { label: 'PM Manager', href: MT.supervisor, icon: ListChecks, badge: 'PENDING_APPROVALS' },
  { label: 'QC Status', href: MT.qcInbox, icon: CheckCircle2, badge: 'PENDING_QC' },
  { label: 'Transfer', href: MT.transfers, icon: Send },
  { label: 'Schedule Electric Assets', href: MT.scheduleElectricAssets, icon: CalendarClock },
  { label: 'Utility Rates', href: MT.utilityRates, icon: IndianRupee },
  { label: 'Spare Parts', href: MT.spareParts, icon: Package },
  soon('Checklist Forms', ClipboardList),
  reports,
]

/** Launcher tiles (DashboardTile.dashboardTilesFor). */
export function dashboardTilesFor(role: MtRole): NavItem[] {
  switch (role) {
    case 'TECHNICIAN':
      return [
        { label: 'Machine List', href: MT.machineMaster, icon: Wrench },
        { label: 'Checklist Form', href: MT.checklist, icon: ClipboardList },
        { label: 'Breakdowns', href: MT.breakdowns, icon: ShieldAlert, badge: 'OPEN_BREAKDOWNS' },
        { label: 'PM Tasks', href: MT.pm, icon: CalendarClock, badge: 'MY_PM_TASKS' },
        { label: 'Transfer', href: MT.transfers, icon: Send },
        { label: 'Daily Reading', href: MT.dailyReading, icon: Gauge },
        { label: 'Spare Parts', href: MT.spareParts, icon: Package },
        soon('Reports', BarChart3),
      ]
    case 'SUPERVISOR':
      return supervisorHeadTiles({ label: 'Reports', href: MT.reports, icon: BarChart3 })
    case 'HEAD':
      return [
        ...supervisorHeadTiles(soon('Reports', BarChart3)),
        { label: 'Daily Reading', href: MT.dailyReading, icon: Gauge },
      ]
    case 'IT_TECHNICIAN':
      return [
        { label: 'Raised Tickets', href: MT.raisedTickets, icon: MessageSquare },
        { label: 'IT Assets', href: MT.itAssets, icon: Cpu },
      ]
    default:
      return []
  }
}

/** Sidebar for a role: its home first, then everything it can open. */
export function sidebarFor(role: MtRole): Array<{ title?: string; items: NavItem[] }> {
  switch (role) {
    case 'OPERATOR':
      return [{ items: [{ label: 'Machines', href: MT.machines, icon: Activity }] }]
    case 'QC_HEAD':
    case 'QC_MEMBER':
      return [
        {
          items: [
            { label: 'QC Home', href: MT.qc, icon: LayoutGrid },
            { label: 'QC Verification', href: MT.qcInbox, icon: ClipboardCheck, badge: 'PENDING_QC' },
            { label: 'Checklist Records', href: MT.qcHistory, icon: History },
          ],
        },
      ]
    case 'ADMIN':
      return [{ items: [{ label: 'Admin', href: MT.admin, icon: Building2 }] }]
    case 'HEAD':
      return [
        {
          items: [
            { label: 'Overview', href: MT.head, icon: LayoutGrid },
            { label: 'Breakdowns', href: MT.headBreakdowns, icon: ShieldAlert },
            { label: 'QC', href: MT.headQc, icon: ClipboardCheck },
            { label: 'Checklist Records', href: MT.headChecklistRecords, icon: FileText },
            { label: 'Reports', href: MT.headReports, icon: BarChart3 },
            { label: 'Manage Users', href: MT.users, icon: Users },
          ],
        },
        { title: 'Operations', items: dashboardTilesFor('HEAD').filter((t) => !t.comingSoon) },
      ]
    default:
      return [
        {
          items: [{ label: 'Dashboard', href: MT.dashboard, icon: LayoutGrid }, ...dashboardTilesFor(role)],
        },
      ]
  }
}

export const settingsItem: NavItem = { label: 'Settings', href: MT.settings, icon: Settings }
