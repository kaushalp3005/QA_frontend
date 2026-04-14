'use client'

import { useEffect } from 'react'

export default function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch

    // IPQC endpoints live under /qc/ on the main backend. A 401 from an IPQC
    // route must NOT force-logout the complaint-module session — the IPQC api
    // client handles its own 401s inline.
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
        const isLogin = url.includes('/auth/login')
        const isIPQC = url.includes('/qc/ipqc') || url.includes('/qc/dropdown') || url.includes('/qc/factories') || url.includes('/qc/floors')
        if (!isLogin && !isIPQC) {
          window.dispatchEvent(new Event('force-logout'))
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
