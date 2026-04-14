'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { docsApi, isDocAdmin } from '@/lib/api/documentations'
import type { DocFormConfig } from '@/config/doc-forms'

interface Props {
  config: DocFormConfig
}

export default function DocViewPage({ config }: Props) {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [prevId, setPrevId] = useState<number | null>(null)
  const [nextId, setNextId] = useState<number | null>(null)
  const admin = isDocAdmin()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    docsApi.get(config.formType, id)
      .then((res) => {
        setRecord(res.data)
        setPrevId(res.data._prev_id ?? null)
        setNextId(res.data._next_id ?? null)
      })
      .catch((e) => console.error('Failed to load record:', e))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      await docsApi.delete(config.formType, id)
      router.push(`/documentations/${config.routeSlug}`)
    } catch (e: any) {
      alert(e.message || 'Delete failed')
    }
  }

  const renderValue = (key: string, value: any) => {
    if (value == null || value === '') return <span className="text-gray-400">—</span>
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400">Empty</span>
      if (typeof value[0] === 'object') {
        const keys = Object.keys(value[0])
        return (
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs border">
              <thead className="bg-gray-50">
                <tr>
                  {keys.map((k) => (
                    <th key={k} className="border px-2 py-1 text-left font-medium">
                      {k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {keys.map((k) => (
                      <td key={k} className="border px-2 py-1">
                        {typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      return <span>{value.join(', ')}</span>
    }
    if (typeof value === 'object') {
      return <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(value, null, 2)}</pre>
    }
    return <span>{String(value)}</span>
  }

  if (loading) {
    return <DashboardLayout><div className="text-center py-10 text-gray-500">Loading...</div></DashboardLayout>
  }

  if (!record) {
    return <DashboardLayout><div className="text-center py-10 text-red-500">Record not found.</div></DashboardLayout>
  }

  const scalarFields: [string, any][] = []
  const jsonFields: [string, any][] = []
  for (const [k, v] of Object.entries(record)) {
    if (k === 'id' || k === '_prev_id' || k === '_next_id') continue
    if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
      jsonFields.push([k, v])
    } else {
      scalarFields.push([k, v])
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top bar: back arrow + title + nav arrows */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/documentations/${config.routeSlug}`)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Back to list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{config.label}</h1>
              <p className="text-sm text-gray-500">{config.docNo} — Record #{record.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev/Next navigation arrows */}
            <button
              onClick={() => prevId && router.push(`/documentations/${config.routeSlug}/${prevId}`)}
              disabled={!prevId}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => nextId && router.push(`/documentations/${config.routeSlug}/${nextId}`)}
              disabled={!nextId}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Action buttons */}
            <button onClick={() => router.push(`/documentations/${config.routeSlug}/${id}/edit`)} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 ml-2">Edit</button>
            {admin && <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>}
          </div>
        </div>

        {/* Scalar fields */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {scalarFields.map(([key, val]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-gray-500 uppercase">{key.replace(/_/g, ' ')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{renderValue(key, val)}</dd>
              </div>
            ))}
          </div>
        </div>

        {/* JSONB / array fields */}
        {jsonFields.map(([key, val]) => (
          <div key={key} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase">{key.replace(/_/g, ' ')}</h2>
            {renderValue(key, val)}
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
