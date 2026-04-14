'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { docsApi } from '@/lib/api/documentations'
import type { DocFormConfig } from '@/config/doc-forms'

interface Props {
  config: DocFormConfig
  FormComponent: React.ComponentType<{
    initialData?: Record<string, any>
    onSubmit?: (data: Record<string, any>) => Promise<void>
    isEdit?: boolean
  }>
}

export default function DocEditWrapper({ config, FormComponent }: Props) {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [prevId, setPrevId] = useState<number | null>(null)
  const [nextId, setNextId] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    docsApi.get(config.formType, id)
      .then((res) => {
        setInitialData(res.data)
        setPrevId(res.data._prev_id ?? null)
        setNextId(res.data._next_id ?? null)
      })
      .catch((e) => console.error('Failed to load record:', e))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (data: Record<string, any>) => {
    await docsApi.update(config.formType, id, data)
    router.push(`/documentations/${config.routeSlug}/${id}`)
  }

  if (loading) {
    return <DashboardLayout><div className="text-center py-10 text-gray-500">Loading...</div></DashboardLayout>
  }

  if (!initialData) {
    return <DashboardLayout><div className="text-center py-10 text-red-500">Record not found.</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Top bar: back arrow + title + nav arrows */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/documentations/${config.routeSlug}/${id}`)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Back to record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Edit — {config.label}</h1>
              <p className="text-sm text-gray-500">Record #{id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => prevId && router.push(`/documentations/${config.routeSlug}/${prevId}/edit`)}
              disabled={!prevId}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Edit previous record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => nextId && router.push(`/documentations/${config.routeSlug}/${nextId}/edit`)}
              disabled={!nextId}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Edit next record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <FormComponent initialData={initialData} onSubmit={handleSubmit} isEdit={true} />
      </div>
    </DashboardLayout>
  )
}
