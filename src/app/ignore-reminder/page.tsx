'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface IgnoreReminderResult {
  success: boolean
  message: string
  licenseNo?: string
  companyName?: string
}

export default function IgnoreReminderPage() {
  const searchParams = useSearchParams()
  const licenseId = searchParams.get('id')
  
  const [result, setResult] = useState<IgnoreReminderResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (licenseId) {
      ignoreReminder(licenseId)
    } else {
      setResult({
        success: false,
        message: 'Invalid reminder link. Missing license ID.'
      })
      setLoading(false)
    }
  }, [licenseId])

  const ignoreReminder = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/licenses/${id}/ignore-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setResult({
          success: true,
          message: data.message,
          licenseNo: data.license_no,
          companyName: data.company_name
        })
      } else {
        const error = await response.json()
        setResult({
          success: false,
          message: error.detail || 'Failed to ignore reminder'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your request...</p>
          </div>
        ) : result ? (
          <div className="text-center">
            {result.success ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Reminder Ignored
                </h1>
                <p className="text-gray-600 mb-6">
                  {result.message}
                </p>
                {result.licenseNo && result.companyName && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm text-gray-600 mb-1">License Number:</p>
                    <p className="font-semibold text-gray-900 mb-3">{result.licenseNo}</p>
                    <p className="text-sm text-gray-600 mb-1">Company:</p>
                    <p className="font-semibold text-gray-900">{result.companyName}</p>
                  </div>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-1">✓ No more reminders will be sent</p>
                  <p className="text-blue-600">
                    Make sure to update the license validity date in the system after renewal.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Error
                </h1>
                <p className="text-gray-600 mb-6">
                  {result.message}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
