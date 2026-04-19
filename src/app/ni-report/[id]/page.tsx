'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { niReportsApi, NIReport } from '@/lib/api/ni-report'
import toast from 'react-hot-toast'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'

const NUTRIENT_LABELS: Record<string, [string, string]> = {
  energy_kcal: ['Energy', 'kcal'],
  protein_g: ['Protein', 'g'],
  total_fat_g: ['Total Fat', 'g'],
  saturated_fat_g: ['Saturated Fat', 'g'],
  trans_fat_g: ['Trans Fat', 'g'],
  carbohydrates_g: ['Carbohydrates', 'g'],
  total_sugars_g: ['Total Sugars', 'g'],
  added_sugars_g: ['Added Sugars', 'g'],
  sodium_mg: ['Sodium', 'mg'],
  dietary_fiber_g: ['Dietary Fiber', 'g'],
  cholesterol_mg: ['Cholesterol', 'mg'],
  vitamin_a_mcg: ['Vitamin A', 'µg'],
  vitamin_c_mg: ['Vitamin C', 'mg'],
  vitamin_d_mcg: ['Vitamin D', 'µg'],
  calcium_mg: ['Calcium', 'mg'],
  iron_mg: ['Iron', 'mg'],
}

const NUTRIENT_KEYS = Object.keys(NUTRIENT_LABELS)

export default function NIReportViewPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<NIReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = Number(params.id)
    if (!id) return
    niReportsApi
      .get(id)
      .then((res) => setReport(res.data))
      .catch((e) => {
        toast.error(e.message || 'Failed to load report')
        router.push('/ni-report')
      })
      .finally(() => setLoading(false))
  }, [params.id, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-sage-400">Loading report...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!report) return null

  const per100g = report.calculated_per_100g || {}
  const perServing = report.calculated_per_serving || {}
  const rdaPct = report.rda_percentages || {}

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/ni-report" className="text-sage-400 hover:text-sage-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-sage-800">{report.product_name}</h1>
              <p className="text-sm text-sage-500">
                {report.report_no} &bull; Serving Size: {report.serving_size_g}g &bull; {report.report_date}
              </p>
            </div>
          </div>
          <a
            href={niReportsApi.getPdfUrl(report.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm rounded-md hover:bg-sage-700 transition-colors"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-sage-700 mb-3">Formulation</h3>
          <div className="flex flex-wrap gap-2">
            {report.ingredients.map((ing, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  ing.flagged
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-sage-100 text-sage-700 border border-sage-200'
                }`}
              >
                {ing.ingred_name} — {ing.percentage}%
              </span>
            ))}
          </div>
        </div>

        {/* Nutrition Table */}
        <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-sage-700 mb-4">Nutritional Information</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-tan-200">
              <thead className="bg-cream-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600 uppercase">Nutrient</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600 uppercase">Per 100g</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600 uppercase">
                    Per Serving ({report.serving_size_g}g)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600 uppercase">%RDA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tan-100">
                {NUTRIENT_KEYS.map((key) => {
                  const val100 = per100g[key] ?? 0
                  const valServe = perServing[key] ?? 0
                  // Only hide these optional micronutrients when 0
                  const HIDE_WHEN_ZERO = ['vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'calcium_mg', 'iron_mg']
                  if (HIDE_WHEN_ZERO.includes(key) && !val100 && !valServe) return null
                  const [label, unit] = NUTRIENT_LABELS[key]
                  return (
                    <tr key={key} className="hover:bg-cream-50">
                      <td className="px-4 py-2.5 text-sm text-sage-700 font-medium">{label} ({unit})</td>
                      <td className="px-4 py-2.5 text-sm text-center text-sage-800">{val100}</td>
                      <td className="px-4 py-2.5 text-sm text-center text-sage-800">{valServe}</td>
                      <td className="px-4 py-2.5 text-sm text-center text-sage-800">
                        {rdaPct[key] != null ? `${rdaPct[key]}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-sage-400">
            *%RDA based on FSSAI/ICMR 2020 guidelines (2000 kcal reference diet). Trans fat has no established RDA.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
