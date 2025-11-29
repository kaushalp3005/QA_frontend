'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import Sidebar from './Sidebar'
import CompanySelector from '@/components/ui/CompanySelector'
import { logout, getStoredUser } from '@/lib/api/auth'
import { cn } from '@/lib/styles'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const user = getStoredUser()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="fixed inset-0 flex bg-cream-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top bar */}
        <header className="bg-beige-50 shadow-sm border-b border-tan-200 backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-tan-300 hover:text-sage-400 hover:bg-beige-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-sage-700 lg:hidden">
                QC System
              </h1>
            </div>
            
            {/* Right side - company selector, notifications, user menu, etc. */}
            <div className="flex items-center space-x-4">
              {/* Company Selector */}
              <div className="min-w-[200px]">
                <CompanySelector />
              </div>
              
              {/* User Email */}
              {user && (
                <span className="text-sm text-sage-600 hidden md:inline font-medium">
                  {user.email}
                </span>
              )}
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-tan-200 shadow-sm text-sm leading-4 font-medium rounded-md text-sage-700 bg-cream-50 hover:bg-beige-100 hover:border-sage-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-300 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-cream-100">
          {children}
        </main>
      </div>
    </div>
  )
}