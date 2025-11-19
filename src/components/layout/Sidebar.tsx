import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  List, 
  Settings, 
  Users, 
  BarChart3,
  X,
  Shield,
  Search,
  ClipboardCheck
} from 'lucide-react'
import { cn } from '@/lib/styles'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    current: false,
  },
  {
    name: 'Complaints',
    href: '/complaints',
    icon: FileText,
    current: false,
  },
  {
    name: 'License Tracker',
    href: '/license-tracker',
    icon: Shield,
    current: false,
  },
  {
    name: 'Vendor COA',
    href: '/vendor-coa',
    icon: ClipboardCheck,
    current: false,
  },
  {
    name: 'RCA/CAPA',
    href: '/rca-capa',
    icon: Search,
    current: false,
  },
  {
    name: 'FishBone Method',
    href: '/fishbone',
    icon: BarChart3,
    current: false,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    current: false,
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-beige-50 shadow-xl border-r border-tan-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-tan-200 bg-cream-50">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-sage-700 tracking-wide">
                Q.A. System
              </h1>
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-md text-tan-300 hover:text-sage-400 hover:bg-beige-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  pathname === item.href
                    ? "bg-sage-300 text-sage-900 shadow-sm border-l-4 border-sage-400"
                    : "text-sage-700 hover:text-sage-900 hover:bg-beige-100 hover:border-l-4 hover:border-tan-200"
                )}
                onClick={onClose}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-tan-200 bg-cream-50">
            <div className="flex items-center px-3 py-2">
              <div className="flex-shrink-0 h-10 w-10 bg-sage-300 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold text-sage-900">JD</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-sage-700">John Doe</p>
                <p className="text-xs text-sage-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}