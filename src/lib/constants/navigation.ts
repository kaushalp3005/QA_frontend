import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Shield,
  Search,
  ClipboardCheck,
  ClipboardList,
  BookOpen,
  GraduationCap,
  Beaker,
  Wrench,
  Printer,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** Matches qc_module_permissions.module_code. Gates sidebar visibility via
   *  the user's can_view flag, and gates the page itself via ModuleGuard.
   *  Every item carries one — including Dashboard, which used to be shown to
   *  everyone unconditionally. */
  moduleCode: string
}

/** Single source of truth for the module nav. Consumed by the sidebar and by
 *  the post-login landing resolver, so a user who cannot view Dashboard is
 *  never sent there. Order matters: the landing resolver picks the first entry
 *  the user can view. */
export const NAVIGATION: NavItem[] = [
  { name: 'Dashboard',       href: '/dashboard',       icon: LayoutDashboard, moduleCode: 'dashboard' },
  { name: 'Complaints',      href: '/complaints',      icon: FileText,        moduleCode: 'complaints' },
  { name: 'License Tracker', href: '/license-tracker', icon: Shield,          moduleCode: 'license_tracker' },
  { name: 'Vendor COA',      href: '/vendor-coa',      icon: ClipboardCheck,  moduleCode: 'vendor_coa' },
  { name: 'RCA / CAPA',      href: '/rca-capa',        icon: Search,          moduleCode: 'rca_capa' },
  { name: 'Fishbone',        href: '/fishbone',        icon: BarChart3,       moduleCode: 'fishbone' },
  { name: 'Lab Reports',     href: '/lab-reports',     icon: Beaker,          moduleCode: 'lab_reports' },
  { name: 'Documentations',  href: '/documentations',  icon: BookOpen,        moduleCode: 'documentations' },
  { name: 'Training',        href: '/training',        icon: GraduationCap,   moduleCode: 'training' },
  { name: 'NI Report',       href: '/ni-report',       icon: ClipboardList,   moduleCode: 'ni_report' },
  { name: 'PM Inspection',   href: '/pm-inspection',   icon: Wrench,          moduleCode: 'pm_inspection' },
  { name: 'Printing Label',  href: '/printing-label',  icon: Printer,         moduleCode: 'section_1' },
]
