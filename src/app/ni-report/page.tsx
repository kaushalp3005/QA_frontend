'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { niRecordsApi, niReportsApi, NIRecord, NIReport } from '@/lib/api/ni-report'
import toast from 'react-hot-toast'
import { Plus, Upload, Trash2, Download, Eye, AlertTriangle, Search, FileText, X, Type, Pencil, Save } from 'lucide-react'
import Link from 'next/link'

// ── RDA Reference (FSSAI/ICMR 2020) ────────────────

const RDA_REFERENCE: Record<string, number | null> = {
  energy_kcal: 2000,
  protein_g: 50,
  total_fat_g: 67,
  saturated_fat_g: 22,
  trans_fat_g: null,
  carbohydrates_g: 310,
  total_sugars_g: 50,
  added_sugars_g: 50,
  sodium_mg: 2000,
  dietary_fiber_g: 25,
  cholesterol_mg: 300,
  vitamin_a_mcg: 1000,
  vitamin_c_mg: 80,
  vitamin_d_mcg: 15,
  calcium_mg: 1000,
  iron_mg: 17,
}

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

// Map to handle spelling differences between DB ni keys and our standard keys
const NI_KEY_ALIASES: Record<string, string[]> = {
  added_sugars_g: ['added_sugars_g', 'added_sugar_g'],
  dietary_fiber_g: ['dietary_fiber_g', 'dietary_fibre_g'],
}

/**
 * Extract per-100g value for a nutrient from an NI record.
 * Handles both schemas:
 *   - New: flat columns like record.energy_kcal = 599
 *   - Production: nested ni JSONB like record.ni.energy_kcal.total_per_100g = 599
 */
function getNutrientValue(record: any, nutrientKey: string): number {
  // 1. Try flat column
  if (record[nutrientKey] !== undefined && record[nutrientKey] !== null) {
    return Number(record[nutrientKey]) || 0
  }

  // 2. Try ni JSONB object
  const ni = record.ni
  if (ni && typeof ni === 'object') {
    const keysToTry = NI_KEY_ALIASES[nutrientKey] || [nutrientKey]
    for (const k of keysToTry) {
      const val = ni[k]
      if (val == null) continue
      if (typeof val === 'object') {
        return Number(val.total_per_100g ?? val.per_100g ?? val.value ?? 0) || 0
      }
      return Number(val) || 0
    }
  }

  return 0
}

// ── Interfaces ──────────────────────────────────────

interface IngredientRow {
  ingred_name: string
  percentage: number
  ni_record_id: number | null
  ni_data: NIRecord | null
  flagged: boolean
}

// ── Main Page ───────────────────────────────────────

export default function NIReportPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'upload' | 'reports'>('create')

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sage-800">NI Report</h1>
          <p className="text-sm text-sage-600 mt-1">
            Nutritional Information — Calculate & manage product nutrition data
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-tan-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { key: 'create' as const, label: 'Create NI Report', icon: FileText },
              { key: 'upload' as const, label: 'Upload NI Data', icon: Upload },
              { key: 'reports' as const, label: 'Saved Reports', icon: Search },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-sage-500 text-sage-700'
                    : 'border-transparent text-sage-400 hover:text-sage-600 hover:border-tan-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'create' && <CreateReportTab />}
        {activeTab === 'upload' && <UploadDataTab />}
        {activeTab === 'reports' && <SavedReportsTab />}
      </div>
    </DashboardLayout>
  )
}

// ── Create Report Tab ───────────────────────────────

function CreateReportTab() {
  const [productName, setProductName] = useState('')
  const [servingSize, setServingSize] = useState<number>(0)
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [allRecords, setAllRecords] = useState<NIRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    niRecordsApi.list().then((res) => setAllRecords(res.records)).catch(() => {})
  }, [])

  const totalPercentage = ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0)
  const hasFlagged = ingredients.some((ing) => ing.flagged)

  // Live calculation
  const calculated = useCallback(() => {
    const per100g: Record<string, number> = {}
    const perServing: Record<string, number> = {}
    const rdaPct: Record<string, number | null> = {}

    for (const key of NUTRIENT_KEYS) {
      let total = 0
      for (const ing of ingredients) {
        if (ing.ni_data) {
          const val = getNutrientValue(ing.ni_data, key)
          total += (ing.percentage / 100) * val
        }
      }
      per100g[key] = Math.round(total * 100) / 100
      const servVal = servingSize > 0 ? Math.round(total * (servingSize / 100) * 100) / 100 : 0
      perServing[key] = servVal
      const rda = RDA_REFERENCE[key]
      rdaPct[key] = rda && servVal > 0 ? Math.round((servVal / rda) * 10000) / 100 : null
    }
    return { per100g, perServing, rdaPct }
  }, [ingredients, servingSize])

  const { per100g, perServing, rdaPct } = calculated()

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { ingred_name: '', percentage: 0, ni_record_id: null, ni_data: null, flagged: false },
    ])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const selectIngredient = (index: number, record: NIRecord | null, name?: string) => {
    const updated = [...ingredients]
    if (record) {
      updated[index] = {
        ...updated[index],
        ingred_name: record.ingred_name,
        ni_record_id: record.id,
        ni_data: record,
        flagged: false,
      }
    } else {
      // "Other" — not in DB
      updated[index] = {
        ...updated[index],
        ingred_name: name || '',
        ni_record_id: null,
        ni_data: null,
        flagged: true,
      }
    }
    setIngredients(updated)
    setDropdownOpen(null)
    setSearchTerm('')
  }

  const updatePercentage = (index: number, pct: number) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], percentage: pct }
    setIngredients(updated)
  }

  const handleSave = async () => {
    if (!productName.trim()) return toast.error('Enter product name')
    if (servingSize <= 0) return toast.error('Enter serving size')
    if (ingredients.length === 0) return toast.error('Add at least one ingredient')
    if (Math.abs(totalPercentage - 100) > 0.01) return toast.error('Formulation must total 100%')
    if (hasFlagged) return toast.error('Some ingredients are not in the database. Upload their NI data first.')

    setSaving(true)
    try {
      const res = await niReportsApi.create({
        product_name: productName,
        serving_size_g: servingSize,
        ingredients: ingredients.map((ing) => ({
          ingred_name: ing.ingred_name,
          percentage: ing.percentage,
          ni_record_id: ing.ni_record_id,
        })),
      })
      toast.success(`Report ${res.data.report_no} created!`)
      setProductName('')
      setServingSize(0)
      setIngredients([])
    } catch (e: any) {
      toast.error(e.message || 'Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Product Info */}
      <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-sage-700 mb-4">Product Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
              placeholder="e.g., Khalas Date Almond Chocolate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1">Serving Size (g) *</label>
            <input
              type="number"
              value={servingSize || ''}
              onChange={(e) => setServingSize(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
              placeholder="e.g., 30"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-sage-700">Ingredients (Formulation)</h3>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
              Total: {totalPercentage.toFixed(1)}%
            </span>
            <button
              onClick={addIngredient}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-sage-500 text-white text-sm rounded-md hover:bg-sage-600 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Ingredient
            </button>
          </div>
        </div>

        {ingredients.length === 0 ? (
          <p className="text-sm text-sage-400 text-center py-8">
            No ingredients added. Click &quot;Add Ingredient&quot; to start building your formulation.
          </p>
        ) : (
          <div className="space-y-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-cream-50 rounded-lg border border-tan-100">
                {/* Ingredient Dropdown */}
                <div className="flex-1 relative">
                  <div
                    className={`w-full rounded-md border px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                      ing.flagged ? 'border-amber-400 bg-amber-50' : 'border-tan-200 bg-white'
                    }`}
                    onClick={() => setDropdownOpen(dropdownOpen === idx ? null : idx)}
                  >
                    <span className={ing.ingred_name ? 'text-sage-800' : 'text-sage-400'}>
                      {ing.ingred_name || 'Select ingredient...'}
                    </span>
                    {ing.flagged && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </div>

                  {dropdownOpen === idx && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-tan-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-tan-100">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full rounded border border-tan-200 px-2 py-1 text-sm"
                          placeholder="Search ingredients..."
                          autoFocus
                        />
                      </div>
                      {allRecords
                        .filter((r) => r.ingred_name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((record) => (
                          <div
                            key={record.id}
                            className="px-3 py-2 hover:bg-sage-50 cursor-pointer border-b border-tan-50 last:border-0"
                            onClick={() => selectIngredient(idx, record)}
                          >
                            <div className="text-sm text-sage-800">{record.ingred_name}</div>
                            {record.source_ref && (
                              <p className="text-[11px] text-sage-400 mt-0.5 leading-snug">{record.source_ref}</p>
                            )}
                          </div>
                        ))}
                      <div
                        className="px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer border-t border-tan-100 text-amber-600 font-medium"
                        onClick={() => {
                          const name = searchTerm || prompt('Enter ingredient name:')
                          if (name) selectIngredient(idx, null, name)
                        }}
                      >
                        + Other (not in database)
                      </div>
                    </div>
                  )}
                </div>

                {/* Percentage */}
                <div className="w-28">
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={ing.percentage || ''}
                      onChange={(e) => updatePercentage(idx, parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm text-center focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
                      placeholder="%"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="ml-1 text-sm text-sage-500">%</span>
                  </div>
                </div>

                {/* Remove */}
                <button onClick={() => removeIngredient(idx)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {hasFlagged && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Some ingredients are not in the database and their NI values are unavailable.
              Go to the &quot;Upload NI Data&quot; tab to add them first.
            </p>
          </div>
        )}
      </div>

      {/* Live Preview */}
      {ingredients.length > 0 && servingSize > 0 && (
        <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-sage-700 mb-4">Nutritional Information Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-tan-200">
              <thead className="bg-cream-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600 uppercase">Nutrient</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600 uppercase">Per 100g</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600 uppercase">Per Serving ({servingSize}g)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600 uppercase">%RDA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tan-100">
                {NUTRIENT_KEYS.map((key) => {
                  // Only hide these optional micronutrients when 0
                  const HIDE_WHEN_ZERO = ['vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'calcium_mg', 'iron_mg']
                  if (HIDE_WHEN_ZERO.includes(key) && !per100g[key] && !perServing[key]) return null
                  const [label, unit] = NUTRIENT_LABELS[key]
                  return (
                    <tr key={key} className="hover:bg-cream-50">
                      <td className="px-4 py-2 text-sm text-sage-700">{label} ({unit})</td>
                      <td className="px-4 py-2 text-sm text-center text-sage-800 font-medium">{per100g[key]}</td>
                      <td className="px-4 py-2 text-sm text-center text-sage-800 font-medium">{perServing[key]}</td>
                      <td className="px-4 py-2 text-sm text-center text-sage-800 font-medium">
                        {rdaPct[key] != null ? `${rdaPct[key]}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || Math.abs(totalPercentage - 100) > 0.01 || hasFlagged}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-md hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save NI Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Upload Data Tab ─────────────────────────────────

function UploadDataTab() {
  const [records, setRecords] = useState<NIRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [showTextForm, setShowTextForm] = useState(false)
  const [vendorName, setVendorName] = useState('')
  const [ingredName, setIngredName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [textContent, setTextContent] = useState('')
  const [textUploading, setTextUploading] = useState(false)
  const [manualData, setManualData] = useState<Partial<NIRecord>>({})
  const [searchFilter, setSearchFilter] = useState('')
  const [viewRecord, setViewRecord] = useState<NIRecord | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await niRecordsApi.list()
      setRecords(res.records)
    } catch (e) {
      toast.error('Failed to load NI records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file to upload')
    if (!vendorName.trim()) return toast.error('Enter vendor name')

    setUploading(true)
    try {
      const res = await niRecordsApi.upload(file, vendorName, ingredName || undefined)
      toast.success(`Ingredient "${res.data.ingred_name}" uploaded! Parsed fields: ${res.parsed_fields.length}`)
      setFile(null)
      setVendorName('')
      setIngredName('')
      fetchRecords()
    } catch (e: any) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleTextUpload = async () => {
    if (!textContent.trim()) return toast.error('Paste or type NI data text')
    if (!vendorName.trim()) return toast.error('Enter vendor name')

    setTextUploading(true)
    try {
      const res = await niRecordsApi.uploadText(textContent, vendorName, ingredName || undefined)
      toast.success(`Ingredient "${res.data.ingred_name}" parsed from text! Fields found: ${res.parsed_fields.length}`)
      setTextContent('')
      setVendorName('')
      setIngredName('')
      setShowTextForm(false)
      fetchRecords()
    } catch (e: any) {
      toast.error(e.message || 'Text parsing failed')
    } finally {
      setTextUploading(false)
    }
  }

  const handleManualSave = async () => {
    if (!manualData.ingred_name?.trim()) return toast.error('Enter ingredient name')

    try {
      await niRecordsApi.create({ ...manualData, vendor_name: vendorName || undefined } as any)
      toast.success('Ingredient NI data saved!')
      setManualData({})
      setVendorName('')
      setShowManualForm(false)
      fetchRecords()
    } catch (e: any) {
      toast.error(e.message || 'Save failed')
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" from NI database?`)) return
    try {
      await niRecordsApi.delete(id)
      toast.success('Deleted')
      fetchRecords()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filtered = records.filter(
    (r) => r.ingred_name.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-sage-700 mb-4">Upload Ingredient NI Data</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1">Vendor Name *</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
              placeholder="e.g., Van Leer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1">Ingredient Name (optional)</label>
            <input
              type="text"
              value={ingredName}
              onChange={(e) => setIngredName(e.target.value)}
              className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
              placeholder="Auto-detected from file if blank"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1">File (Excel/PDF/TXT) *</label>
            <input
              type="file"
              accept=".xlsx,.xls,.pdf,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-sage-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-sage-100 file:text-sage-700 hover:file:bg-sage-200"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm rounded-md hover:bg-sage-700 disabled:opacity-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload & Parse'}
          </button>
          <button
            onClick={() => { setShowTextForm(!showTextForm); setShowManualForm(false) }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-tan-200 text-sage-700 text-sm rounded-md hover:bg-cream-50 transition-colors"
          >
            <Type className="h-4 w-4" />
            Paste Text
          </button>
          <button
            onClick={() => { setShowManualForm(!showManualForm); setShowTextForm(false) }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-tan-200 text-sage-700 text-sm rounded-md hover:bg-cream-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Paste Text Form */}
      {showTextForm && (
        <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-sage-700">Paste NI Data as Text</h3>
            <button onClick={() => setShowTextForm(false)} className="text-sage-400 hover:text-sage-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-sage-500 mb-3">
            Paste nutritional information text from a COA, spec sheet, or any document. The system will automatically detect nutrient names and values.
            <br />
            <span className="text-sage-400 mt-1 inline-block">
              Example format: &quot;Energy (kcal): 345&quot;, &quot;Protein 12.5 g&quot;, &quot;Total Fat: 8.2g&quot;
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Vendor Name *</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm"
                placeholder="e.g., Van Leer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Ingredient Name (optional)</label>
              <input
                type="text"
                value={ingredName}
                onChange={(e) => setIngredName(e.target.value)}
                className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm"
                placeholder="Auto-detected from text if blank"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-sage-600 mb-1">NI Data Text *</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm font-mono focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
              placeholder={`Paste nutritional information here, e.g.:\n\nProduct Name: Dark Chocolate Compound\nEnergy (kcal): 540\nProtein (g): 5.2\nTotal Fat (g): 32.0\nSaturated Fat (g): 19.5\nTrans Fat (g): 0.1\nCarbohydrates (g): 57.3\nTotal Sugars (g): 52.0\nAdded Sugars (g): 50.0\nSodium (mg): 85\nDietary Fiber (g): 3.2\nCholesterol (mg): 0\nCalcium (mg): 120\nIron (mg): 2.5`}
            />
          </div>
          <button
            onClick={handleTextUpload}
            disabled={textUploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm rounded-md hover:bg-sage-700 disabled:opacity-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {textUploading ? 'Parsing...' : 'Parse & Save'}
          </button>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualForm && (
        <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-sage-700">Manual NI Entry</h3>
            <button onClick={() => setShowManualForm(false)} className="text-sage-400 hover:text-sage-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-sage-600 mb-1">Ingredient Name *</label>
              <input
                type="text"
                value={manualData.ingred_name || ''}
                onChange={(e) => setManualData({ ...manualData, ingred_name: e.target.value })}
                className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm"
                placeholder="e.g., Khalas Date"
              />
            </div>
            {NUTRIENT_KEYS.map((key) => {
              const [label, unit] = NUTRIENT_LABELS[key]
              return (
                <div key={key}>
                  <label className="block text-xs font-medium text-sage-600 mb-1">{label} ({unit})</label>
                  <input
                    type="number"
                    value={(manualData as any)[key] ?? ''}
                    onChange={(e) => setManualData({ ...manualData, [key]: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-tan-200 px-3 py-2 text-sm"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-4">
            <button
              onClick={handleManualSave}
              className="px-4 py-2 bg-sage-600 text-white text-sm rounded-md hover:bg-sage-700 transition-colors"
            >
              Save Ingredient
            </button>
          </div>
        </div>
      )}

      {/* Existing Records */}
      <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-sage-700">Ingredient NI Database ({records.length})</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-sage-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full rounded-md border border-tan-200 pl-9 pr-3 py-2 text-sm"
              placeholder="Search ingredients..."
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-sage-400 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-sage-400 text-center py-8">No ingredient records found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((rec, idx) => (
              <div
                key={rec.id}
                className="flex items-center gap-3 px-4 py-3 bg-cream-50 rounded-lg border border-tan-100 hover:border-sage-200 hover:shadow-sm transition-all group"
              >
                {/* Row number */}
                <span className="text-xs font-medium text-sage-400 w-7 text-right flex-shrink-0">{idx + 1}.</span>

                {/* Ingredient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sage-800 text-sm">{rec.ingred_name}</span>
                    {rec.vendor_name && (
                      <span className="text-[11px] px-1.5 py-0.5 bg-sage-100 text-sage-500 rounded">
                        {rec.vendor_name}
                      </span>
                    )}
                  </div>
                  {rec.source_ref && (
                    <p className="text-xs text-sage-500 mt-0.5 leading-snug">{rec.source_ref}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setViewRecord(rec)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-tan-200 text-sage-700 hover:bg-sage-50 hover:border-sage-300 transition-colors shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View NI
                  </button>
                  <button
                    onClick={() => handleDelete(rec.id, rec.ingred_name)}
                    className="p-1.5 rounded-md text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NI Details Popup Modal */}
        {viewRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => { if (!isEditing) { setViewRecord(null); setIsEditing(false) } }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.2s_ease-out]" />

            {/* Modal */}
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-[popIn_0.25s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-tan-200">
                <div>
                  <h3 className="text-lg font-bold text-sage-800">{viewRecord.ingred_name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    {viewRecord.vendor_name && (
                      <span className="text-xs text-sage-500">Vendor: {viewRecord.vendor_name}</span>
                    )}
                    {viewRecord.source_ref && (
                      <p className="text-xs text-sage-500 leading-snug">{viewRecord.source_ref}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => {
                        const vals: Record<string, number> = {}
                        NUTRIENT_KEYS.forEach((key) => {
                          vals[key] = getNutrientValue(viewRecord as any, key)
                        })
                        setEditValues(vals)
                        setIsEditing(true)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-sage-100 text-sage-700 hover:bg-sage-200 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => { setViewRecord(null); setIsEditing(false) }}
                    className="p-1.5 rounded-md text-sage-400 hover:text-sage-700 hover:bg-cream-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5">
                <h4 className="text-sm font-semibold text-sage-600 uppercase tracking-wide mb-3">
                  {isEditing ? 'Edit Nutritional Values (per 100g)' : 'Nutritional Information'}
                </h4>

                <table className="w-full text-sm border border-tan-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-sage-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-sage-600 border-b border-tan-200">Nutrient</th>
                      {isEditing ? (
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-sage-600 border-b border-tan-200">Value (per 100g)</th>
                      ) : (
                        <>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-sage-600 border-b border-tan-200">Per 100g</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-sage-600 border-b border-tan-200">Per Serving</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-sage-600 border-b border-tan-200">%RDA</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tan-100">
                    {NUTRIENT_KEYS.map((key) => {
                      const [label, unit] = NUTRIENT_LABELS[key]

                      if (isEditing) {
                        return (
                          <tr key={key} className="hover:bg-cream-50 transition-colors">
                            <td className="px-4 py-1.5 text-sage-700">{label} ({unit})</td>
                            <td className="px-4 py-1.5 text-right">
                              <input
                                type="number"
                                value={editValues[key] ?? ''}
                                onChange={(e) => setEditValues({ ...editValues, [key]: parseFloat(e.target.value) || 0 })}
                                className="w-28 ml-auto text-right rounded-md border border-tan-200 px-2 py-1 text-sm tabular-nums focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
                                step="0.01"
                                min="0"
                              />
                            </td>
                          </tr>
                        )
                      }

                      const rec = viewRecord as any
                      const ni = rec.ni && typeof rec.ni === 'object' ? rec.ni : null
                      const per100g = getNutrientValue(rec, key)
                      let perServing: number | null = null
                      let rdaPct: number | null = null

                      if (ni) {
                        const keysToTry = NI_KEY_ALIASES[key] || [key]
                        for (const niKey of keysToTry) {
                          const niVal = ni[niKey]
                          if (niVal != null && typeof niVal === 'object') {
                            const serveKey = Object.keys(niVal).find(k => k.startsWith('per_serve'))
                            perServing = serveKey ? niVal[serveKey] : (niVal.per_serving ?? null)
                            rdaPct = niVal.rda_percent ?? null
                            break
                          }
                        }
                      }

                      if (per100g === 0 && perServing === null) return null

                      const fmt = (v: number | null) => v != null ? Math.round(v * 100) / 100 : '—'

                      return (
                        <tr key={key} className="hover:bg-cream-50 transition-colors">
                          <td className="px-4 py-2 text-sage-700">{label} ({unit})</td>
                          <td className="px-4 py-2 text-right tabular-nums text-sage-800 font-medium">{fmt(per100g)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-sage-800 font-medium">{fmt(perServing)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-sage-800 font-medium">
                            {rdaPct != null && rdaPct > 0 ? `${Math.round(rdaPct * 100) / 100}%` : '—'}
                          </td>
                        </tr>
                      )
                    }).filter(Boolean)}
                  </tbody>
                </table>
                {!isEditing && (() => {
                  const ss = (viewRecord as any).ni?.serve_size || (viewRecord as any).serve_size
                  return ss ? (
                    <p className="text-xs text-sage-500 mt-2">Serving Size: {ss}</p>
                  ) : null
                })()}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 p-4 border-t border-tan-200">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-cream-100 text-sage-600 hover:bg-cream-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={savingEdit}
                      onClick={async () => {
                        setSavingEdit(true)
                        try {
                          await niRecordsApi.update(viewRecord.id, editValues)
                          toast.success('NI values updated!')
                          setIsEditing(false)
                          setViewRecord(null)
                          fetchRecords()
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to update')
                        } finally {
                          setSavingEdit(false)
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setViewRecord(null); setIsEditing(false) }}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-sage-100 text-sage-700 hover:bg-sage-200 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Saved Reports Tab ───────────────────────────────

function SavedReportsTab() {
  const [reports, setReports] = useState<NIReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    niReportsApi
      .list()
      .then((res) => setReports(res.records))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete report for "${name}"?`)) return
    try {
      await niReportsApi.delete(id)
      toast.success('Report deleted')
      setReports(reports.filter((r) => r.id !== id))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-tan-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-sage-700 mb-4">Saved NI Reports</h3>

      {loading ? (
        <p className="text-sm text-sage-400 text-center py-8">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-sage-400 text-center py-8">No reports saved yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-tan-200 text-sm">
            <thead className="bg-cream-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600">Report No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600">Product</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600">Serving (g)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600">Ingredients</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-sage-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tan-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-sage-800">{report.report_no}</td>
                  <td className="px-4 py-3 text-sage-700">{report.product_name}</td>
                  <td className="px-4 py-3 text-center">{report.serving_size_g}</td>
                  <td className="px-4 py-3 text-center">{report.ingredients?.length || 0}</td>
                  <td className="px-4 py-3 text-sage-500">{report.report_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/ni-report/${report.id}`}
                        className="text-sage-500 hover:text-sage-700 transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <a
                        href={niReportsApi.getPdfUrl(report.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(report.id, report.product_name)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
