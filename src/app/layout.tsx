import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { CompanyProvider } from '@/contexts/CompanyContext'
import AuthGuard from '@/components/AuthGuard'
import FetchInterceptor from '@/components/FetchInterceptor'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: 'Candor Foods · QA / QC System',
  description: 'Quality Assurance & Quality Control management for Candor Foods.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#A41F13',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* No-flash theme: apply class to <html> BEFORE first paint to avoid
            a brief flash of the wrong theme on hard refresh. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <FetchInterceptor />
        <AuthGuard>
          <CompanyProvider>
            {children}
          </CompanyProvider>
        </AuthGuard>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4500,
            className: 'qc-toast',
            style: {
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 12px 32px -8px rgba(41, 47, 54, 0.30)',
              // Colors come from CSS variables so they flip with the theme
              background: 'rgb(var(--c-ink-600))',
              color: 'rgb(var(--c-cream-100))',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#FAF5F1' },
            },
            error: {
              iconTheme: { primary: '#A41F13', secondary: '#FAF5F1' },
            },
          }}
        />
      </body>
    </html>
  )
}