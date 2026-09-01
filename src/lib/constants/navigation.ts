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
import { TRAINING_PAGES } from '@/config/training-nav'

/** One page inside a module, listed under its parent in the sidebar. Sub-items
 *  inherit the parent's moduleCode — a user who cannot view the module never
 *  sees the parent, so its children are unreachable too. */
export interface NavChild {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** Matches qc_module_permissions.module_code. Gates sidebar visibility via
   *  the user's can_view flag, and gates the page itself via ModuleGuard.
   *  Every item carries one — including Dashboard, which used to be shown to
   *  everyone unconditionally. */
  moduleCode: string
  /** Renders this item as an expanding group. Open when the current route is
   *  inside the module; the chevron toggles it from there. */
  children?: NavChild[]
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
  // The four training forms hang off this entry rather than a second rail
  // inside the section. Built from TRAINING_PAGES so the sidebar, the hub
  // cards and the section itself cannot disagree about what exists.
  {
    name: 'Training',
    href: '/training',
    icon: GraduationCap,
    moduleCode: 'training',
    children: TRAINING_PAGES.map((p) => ({ name: p.shortTitle, href: p.href, icon: p.icon })),
  },
  { name: 'NI Report',       href: '/ni-report',       icon: ClipboardList,   moduleCode: 'ni_report' },
  { name: 'PM Inspection',   href: '/pm-inspection',   icon: Wrench,          moduleCode: 'pm_inspection' },
  { name: 'Printing Label',  href: '/printing-label',  icon: Printer,         moduleCode: 'section_1' },
]
