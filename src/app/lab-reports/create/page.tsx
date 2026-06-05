'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ipqc as ipqcApi } from '@/lib/api'
import { getStoredWarehouse } from '@/components/ui/WarehouseSelector'
import { customerToleranceApi, fgCoaApi, type CustomerToleranceRecord, type ToleranceParam, type FgCoaPayload } from '@/lib/api/documentations'
import { ANALYSED_BY_OPTIONS, VERIFIED_BY_OPTIONS } from '@/lib/signatures'
import {
  SENSORY_PARAMS,
  LABEL_CHECK_PARAMS,
  getPhysicalParams,
} from '@/lib/constant'

// Mirrors the local CHEMICAL_PARAMS in IPQCForm (so we can map IPQC chemical → COA chemical by label)
const IPQC_CHEMICAL_PARAMS = [
  { key: 'moisture', label: 'Moisture' },
  { key: 'salt',     label: 'Salt' },
]
import type { IPQCRecord, IPQCCheckItem } from '@/types'
import {
  ArrowLeft,
  FlaskConical,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Microscope,
  Beaker,
  ShieldCheck,
  Package,
  User,
  ClipboardList,
  Link2,
  Search,
  Loader2,
  Tag,
  AlertCircle,
  Database,
  ChevronsUpDown,
  X,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_PHYSICAL_PARAMS: string[] = [
  'Extraneous vegetable Matter(m/m)Stalks, Pieces of shells, pits, fiber, Peel',
  'Foreign matter',
  'Off flavour, mustiness, rancidity and evidence of fermentation',
  'Immature%',
  'Mould, living/ dead insects, insect fragments and rodent contamination',
  'Organic Extraneous Matter',
  'Inorganic Extraneous Matter',
  'Admixture / Added Additives',
  'Damaged/ Mechanical injury/Sunburn %',
  'Blemished %',
  'Infested/Insect Damage %',
  'Discoloured %',
  'Other Edible Seeds %',
  'Count (NOS)',
  'Moldy Fruits %',
  'Broken/Split %',
  'Bulk Density (GM/L)',
  'Size',
  'Pits',
  'Dried%',
  'Loose Skin %',
  'Chipped & Scratches',
  'Scratched/Tonch nuts %',
  'Sugared Raisins (raisins with external or internal sugar crystals which are readily apparent and seriously affect the appearance of the raisins)',
  'Pieces of stem per kg',
  'Cap stem',
  'Inshell  Almonds,shell or skin fragments (m/m, percent)',
  'Gummy and Brown spot (m/m) %',
  'Doubles %',
  'Uniformity %',
  'N2 %',
  'Testa %',
  'Unopened shells',
  'Empty shells',
  'Split broken',
  'Dark stains',
  'Light stains',
  'Other edible grains',
  'Weevilled grains',
]

const DEFAULT_CHEMICAL_PARAMS: string[] = [
  'Moisture Content %',
  'Acid Value %',
  'Salt %',
  'Fat/Oil Content %',
  'FFA',
  'Peroxide Value (mg/kg)',
  'PH',
]

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParamRow {
  key: string
  label: string
  result: string
  tolerance: string
  method: string
  included: boolean   // checked = appears on COA, unchecked = hidden/skipped
}

interface COAFormData {
  // Link
  ipqcNo: string
  // Identification
  coaNo: string
  coaDated: string
  sampleType: string
  // Product (mirrors IPQC article fields)
  sampleName: string        // ← item_description
  customerName: string      // ← customer
  batchNo: string           // ← batch_number
  physicalCategory: string  // ← physical_category
  batchQty: string
  samplingDate: string      // ← check_date
  ingredientName: string
  countryOfOrigin: string
  packingDate: string       // ← label_check.pkg_date
  expiryDate: string        // ← label_check.exp_date
  shelfLife: string
  storageCondition: string  // ← label_check.storage_condition
  packagingType: string
  asinCode: string          // ← label_check.barcode_article_no
  allergenDeclaration: string // ← label_check.allergen_information
  // Parameters (mirrors IPQC check items + adds tolerance & method)
  sensory: ParamRow[]       // ← sensory_evaluation
  physical: ParamRow[]      // ← physical_parameters
  chemical: ParamRow[]      // ← chemical_parameter
  // Footer
  verdict: 'accept' | 'reject'
  remarks: string           // ← overall_remark
  analysedBy: string
  verifiedBy: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSensoryRows(): ParamRow[] {
  return SENSORY_PARAMS.map(p => ({
    key: p.key,
    label: p.label,
    result: '',
    tolerance: 'As Per Characteristic',
    method: 'Visual & Sensory Basis',
    included: true,
  }))
}

function makePhysicalRows(_category?: string): ParamRow[] {
  // Comprehensive default list — all unchecked so user picks what applies.
  // Replaced entirely when a customer_tolerance record is selected.
  return DEFAULT_PHYSICAL_PARAMS.map(label => ({
    key: label, label, result: '', tolerance: '', method: '', included: false,
  }))
}

function makeChemicalRows(): ParamRow[] {
  return DEFAULT_CHEMICAL_PARAMS.map(label => ({
    key: label, label, result: '', tolerance: '', method: '', included: false,
  }))
}

/** Normalise a JSONB tolerance entry — handles plain string or {tolerance, method} object */
function extractTolerance(entry: ToleranceParam | string | undefined): { tolerance: string; method: string } | null {
  if (!entry) return null
  if (typeof entry === 'string') return { tolerance: entry, method: '' }
  return { tolerance: entry.tolerance ?? '', method: entry.method ?? '' }
}

/** Build parameter rows directly from a customer_tolerance JSONB section.
 *  - If DB section has keys → use those keys as rows (the customer dictates the spec)
 *  - If DB section is empty/missing → fall back to the IPQC default rows */
function buildRowsFromTolerance(
  defaults: ParamRow[],
  dbSection: Record<string, ToleranceParam | string> | undefined,
): ParamRow[] {
  if (!dbSection || typeof dbSection !== 'object' || Object.keys(dbSection).length === 0) {
    return defaults
  }
  return Object.entries(dbSection).map(([key, val]) => {
    const extracted = extractTolerance(val) ?? { tolerance: '', method: '' }
    return {
      key,           // raw JSONB key — used to merge IPQC results later
      label: key,    // the JSONB key IS the human-readable label in this schema
      result: '',
      tolerance: extracted.tolerance,
      method: extracted.method,
      included: true,
    }
  })
}

/** Extract a label_check value from an IPQC record's checked items */
function getLabelValue(items: IPQCCheckItem[], key: string): string {
  const item = items?.find(i => i.parameter === key)
  return item?.checked ? (item.remark || '') : ''
}

/** Normalize a label/key for case-insensitive matching (strips punctuation, collapses whitespace). */
function normaliseLabel(s: string): string {
  return (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Carry over previously-filled `result` values (and the `included` flag if it was true)
 * when rebuilding rows. Used by the customer-tolerance / category-change effects so they
 * don't blow away values that were just auto-filled from a linked IPQC record.
 *
 * Matching is by normalised label, then normalised key — i.e. the same lookup IPQC uses.
 */
function preserveResultsFromPrev(newRows: ParamRow[], prevRows: ParamRow[] | undefined): ParamRow[] {
  if (!prevRows?.length) return newRows
  const byLabel = new Map<string, ParamRow>()
  const byKey = new Map<string, ParamRow>()
  for (const p of prevRows) {
    if (!p.result && !p.included) continue
    const nl = normaliseLabel(p.label)
    const nk = normaliseLabel(p.key)
    if (nl) byLabel.set(nl, p)
    if (nk) byKey.set(nk, p)
  }
  if (byLabel.size === 0 && byKey.size === 0) return newRows
  return newRows.map(r => {
    const prev = byLabel.get(normaliseLabel(r.label)) ?? byKey.get(normaliseLabel(r.key))
    if (!prev) return r
    return {
      ...r,
      result: prev.result || r.result,
      included: prev.included || r.included,
    }
  })
}

/**
 * Find the IPQC item that best matches a COA row. Tries — in order:
 *   1. exact normalised match on either the IPQC parameter key OR the canonical label
 *   2. substring match in either direction
 *   3. token-set match (every meaningful word of the shorter label appears in the longer)
 * This is what lets IPQC's short keys like `"moisture"` match a COA row labelled
 * `"Moisture Content %"`, and customer-tolerance rows labelled with long product-specific
 * specs to still find their matching IPQC value/remark.
 */
function findMatchingIpqcItem(
  rowLabel: string,
  rowKey: string,
  items: IPQCCheckItem[],
  paramConstants: { key: string; label: string }[],
  debugContext?: string,
): { item: IPQCCheckItem; via: string; matchedLabel: string } | undefined {
  const targetA = normaliseLabel(rowLabel)
  const targetB = normaliseLabel(rowKey)
  if (!targetA && !targetB) return undefined

  const candidates = items
    .filter(it => it?.parameter)
    .map(it => {
      const constMatch = paramConstants.find(p => p.key === it.parameter)
      const labels: string[] = [normaliseLabel(it.parameter)]
      if (constMatch) labels.push(normaliseLabel(constMatch.label))
      return { item: it, labels: Array.from(new Set(labels.filter(Boolean))) }
    })

  // Pass 1: exact match
  for (const c of candidates) {
    if (c.labels.includes(targetA)) return { item: c.item, via: 'exact', matchedLabel: targetA }
    if (targetB && c.labels.includes(targetB)) return { item: c.item, via: 'exact', matchedLabel: targetB }
  }

  // Pass 2: substring match (either direction)
  for (const c of candidates) {
    for (const lbl of c.labels) {
      if (!lbl) continue
      if (
        (targetA && (targetA.includes(lbl) || lbl.includes(targetA))) ||
        (targetB && (targetB.includes(lbl) || lbl.includes(targetB)))
      ) {
        return { item: c.item, via: 'substring', matchedLabel: lbl }
      }
    }
  }

  // Pass 3: token-set match — every meaningful word (≥3 chars) of the IPQC label
  //         appears as a whole token in the COA row label.
  const targetTokens = new Set(targetA.split(' ').filter(t => t.length >= 3))
  for (const c of candidates) {
    for (const lbl of c.labels) {
      const lblTokens = lbl.split(' ').filter(t => t.length >= 3)
      if (lblTokens.length > 0 && lblTokens.every(t => targetTokens.has(t))) {
        return { item: c.item, via: 'tokens', matchedLabel: lbl }
      }
    }
  }

  if (debugContext) {
    // eslint-disable-next-line no-console
    console.log(`[coa-ipqc-match] NO MATCH for row "${rowLabel}" (key="${rowKey}") in ${debugContext}. Normalised targets:`, { targetA, targetB }, 'Candidates:', candidates.map(c => ({ parameter: c.item.parameter, labels: c.labels, checked: c.item.checked })))
  }

  return undefined
}

/**
 * Fill the `result` column of existing COA rows from matching IPQC checked items.
 * - Preserves rows already present (so customer-tolerance rows aren't discarded).
 * - `preferValue: true` for physical (value first, then remark); else remark first.
 */
function fillRowsFromIpqcItems(
  rows: ParamRow[],
  items: IPQCCheckItem[],
  paramConstants: { key: string; label: string }[],
  opts: { preferValue?: boolean; defaultText?: string; section?: string } = {},
): ParamRow[] {
  const section = opts.section ?? 'section'
  if (!Array.isArray(rows) || rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[coa-ipqc-fill][${section}] no COA rows to fill — returning as-is`)
    return rows
  }
  if (!Array.isArray(items) || items.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[coa-ipqc-fill][${section}] no IPQC items present — nothing to merge`)
    return rows
  }

  const preferValue = opts.preferValue ?? false
  const defaultText = opts.defaultText ?? 'Satisfactory'

  // eslint-disable-next-line no-console
  console.log(`[coa-ipqc-fill][${section}] starting fill`, {
    rowCount: rows.length,
    rowSample: rows.slice(0, 3).map(r => ({ key: r.key, label: r.label })),
    itemCount: items.length,
    itemSample: items.slice(0, 5).map(i => ({ parameter: i.parameter, checked: i.checked, value: (i as any).value, remark: i.remark })),
    constantsSample: paramConstants.slice(0, 3),
  })

  let matched = 0
  const filledRows = rows.map(row => {
    const found = findMatchingIpqcItem(row.label, row.key, items, paramConstants, section)
    if (!found) return row
    if (!found.item.checked) {
      // eslint-disable-next-line no-console
      console.log(`[coa-ipqc-fill][${section}] matched "${row.label}" ← IPQC parameter "${found.item.parameter}" via ${found.via}, BUT item is unchecked → leaving Result blank`)
      return row
    }
    const value = ((found.item as any).value ?? '').toString().trim()
    const remark = (found.item.remark ?? '').toString().trim()
    const filled = preferValue ? (value || remark) : (remark || value)
    const finalResult = filled || defaultText
    matched++
    // eslint-disable-next-line no-console
    console.log(`[coa-ipqc-fill][${section}] ✓ "${row.label}" ← IPQC "${found.item.parameter}" via ${found.via} → "${finalResult}" (raw value="${value}", remark="${remark}")`)
    return { ...row, result: finalResult, included: true }
  })

  // eslint-disable-next-line no-console
  console.log(`[coa-ipqc-fill][${section}] done — matched ${matched} / ${rows.length} rows`)
  return filledRows
}

/** Parse various date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ISO) → YYYY-MM-DD for <input type="date"> */
function parseToISODate(s: string): string {
  if (!s) return ''
  const t = s.trim()
  // Already ISO (with or without time): "2026-04-20" or "2026-04-20T..."
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY
  const m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Last resort: native Date parser (handles e.g. "Apr 20, 2026")
  const dt = new Date(t)
  if (!isNaN(dt.getTime())) {
    const y  = dt.getFullYear()
    const mo = String(dt.getMonth() + 1).padStart(2, '0')
    const d  = String(dt.getDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return ''
}

/** Map IPQC data onto the COA form.
 *  `articleIdx` selects which article (item) of the IPQC record to use — defaults to 0.
 *  Falls back to the record-level flat fields when there are no articles at all. */
function mapIPQCToCOA(record: IPQCRecord, existing: COAFormData, articleIdx: number = 0): Partial<COAFormData> {
  const art = record.articles?.[articleIdx] ?? record.articles?.[0] ?? record
  const labelCheck: IPQCCheckItem[] = (art as any).label_check ?? []
  const sensoryItems: IPQCCheckItem[] = (art as any).sensory_evaluation ?? []
  const physicalItems: IPQCCheckItem[] = (art as any).physical_parameters ?? []
  const chemicalItems: IPQCCheckItem[] = (art as any).chemical_parameter ?? []
  const category = (art as any).physical_category ?? 'other'

  // Use the existing rows as the base (preserves customer-tolerance rows) and fill
  // the Result column from any matching IPQC item — matched by label OR internal key.
  const baseSensory  = existing.sensory?.length  ? existing.sensory  : makeSensoryRows()
  const basePhysical = existing.physical?.length ? existing.physical : makePhysicalRows(category)
  const baseChemical = existing.chemical?.length ? existing.chemical : makeChemicalRows()

  // eslint-disable-next-line no-console
  console.log(`[coa-ipqc-map] article #${articleIdx + 1} — counts:`, {
    sensory: sensoryItems.length,
    physical: physicalItems.length,
    chemical: chemicalItems.length,
    label_check: labelCheck.length,
    physical_category: category,
  })

  const sensory  = fillRowsFromIpqcItems(baseSensory,  sensoryItems,  SENSORY_PARAMS,                  { preferValue: false, section: `sensory#${articleIdx + 1}` })
  const physical = fillRowsFromIpqcItems(basePhysical, physicalItems, getPhysicalParams(category),     { preferValue: true,  section: `physical#${articleIdx + 1}` })
  const chemical = fillRowsFromIpqcItems(baseChemical, chemicalItems, IPQC_CHEMICAL_PARAMS,            { preferValue: false, defaultText: '', section: `chemical#${articleIdx + 1}` })

  return {
    coaNo:              record.ipqc_no ?? existing.coaNo,
    sampleName:         (art as any).item_description ?? existing.sampleName,
    customerName:       (art as any).customer ?? existing.customerName,
    batchNo:            (art as any).batch_number ?? existing.batchNo,
    physicalCategory:   category,
    samplingDate:       parseToISODate(record.check_date ?? '') || existing.samplingDate,
    packingDate:        parseToISODate(getLabelValue(labelCheck, 'pkg_date'))
                          || parseToISODate(record.check_date ?? '')
                          || existing.packingDate,
    expiryDate:         parseToISODate(getLabelValue(labelCheck, 'exp_date')) || existing.expiryDate,
    storageCondition:   getLabelValue(labelCheck, 'storage_condition') || existing.storageCondition,
    countryOfOrigin:    getLabelValue(labelCheck, 'country_of_origin') || existing.countryOfOrigin,
    asinCode:           getLabelValue(labelCheck, 'barcode_article_no') || existing.asinCode,
    allergenDeclaration:getLabelValue(labelCheck, 'allergen_information') || existing.allergenDeclaration,
    remarks:            (art as any).overall_remark ?? existing.remarks,
    verdict:            ((art as any).verdict === 'reject' ? 'reject' : 'accept') as 'accept' | 'reject',
    sensory,
    physical,
    chemical,
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const inputCls =
  'input-base disabled:opacity-60 disabled:cursor-not-allowed'

const labelCls = 'label-base text-ink-500'

function SectionToggle({
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  color = 'brand',
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  color?: 'brand' | 'emerald' | 'amber' | 'sky'
}) {
  const bg = { brand: 'bg-brand-500/10 text-brand-600 border-brand-500/25', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', sky: 'bg-sky-50 text-sky-700 border-sky-200' }[color]
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border ${bg} transition-all hover:opacity-80 text-left`}
    >
      <span className="p-1.5 rounded-lg bg-white/60">
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
        {subtitle && <p className="text-xs opacity-70 mt-0.5 font-normal normal-case tracking-normal">{subtitle}</p>}
      </div>
      {open ? <ChevronUp className="w-4 h-4 opacity-50 shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />}
    </button>
  )
}

function ParamTable({
  rows,
  onUpdate,
  onToggle,
  onToggleAll,
}: {
  rows: ParamRow[]
  onUpdate: (i: number, field: 'result' | 'tolerance' | 'method', val: string) => void
  onToggle: (i: number) => void
  onToggleAll: (include: boolean) => void
}) {
  const includedCount = rows.filter(r => r.included).length
  const allIncluded = rows.length > 0 && includedCount === rows.length
  const noneIncluded = includedCount === 0

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-cream-200">
      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-[44px_2fr_1.2fr_1.2fr_1.2fr] gap-0 bg-cream-100 border-b border-cream-200 items-center">
        <div className="px-3 py-2.5 flex items-center justify-center">
          <input
            type="checkbox"
            checked={allIncluded}
            ref={el => { if (el) el.indeterminate = !allIncluded && !noneIncluded }}
            onChange={e => onToggleAll(e.target.checked)}
            className="w-4 h-4 rounded border-cream-300 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
            title="Toggle all rows"
          />
        </div>
        {['Parameter', 'Result', 'Tolerance / Spec', 'Method'].map(h => (
          <div key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-400">{h}</div>
        ))}
      </div>

      {rows.map((row, i) => (
        <div
          key={row.key + i}
          className={`grid grid-cols-1 sm:grid-cols-[44px_2fr_1.2fr_1.2fr_1.2fr] gap-0 border-b border-cream-200 last:border-0 transition-all ${
            row.included ? 'hover:bg-cream-50' : 'bg-cream-100/50 opacity-50'
          }`}
        >
          {/* Include checkbox */}
          <div className="px-3 py-3 flex items-start sm:items-center justify-start sm:justify-center">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={row.included}
                onChange={() => onToggle(i)}
                className="w-4 h-4 rounded border-cream-300 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-ink-400 sm:hidden">
                {row.included ? 'Included' : 'Hidden'}
              </span>
            </label>
          </div>

          {/* Parameter name */}
          <div className="px-4 py-3 flex items-center">
            <span className={`text-sm font-medium leading-snug ${row.included ? 'text-ink-600' : 'text-ink-400 line-through'}`}>
              {row.label}
            </span>
          </div>

          {/* Result */}
          <div className="px-3 py-2.5 border-t sm:border-t-0 sm:border-l border-cream-200">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-300 sm:hidden mb-1">Result</p>
            <input
              value={row.result}
              onChange={e => onUpdate(i, 'result', e.target.value)}
              placeholder="Enter result…"
              disabled={!row.included}
              className={inputCls}
            />
          </div>

          {/* Tolerance */}
          <div className="px-3 py-2.5 border-t sm:border-t-0 sm:border-l border-cream-200">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-300 sm:hidden mb-1">Tolerance / Spec</p>
            <input
              value={row.tolerance}
              onChange={e => onUpdate(i, 'tolerance', e.target.value)}
              disabled={!row.included}
              className={inputCls}
            />
          </div>

          {/* Method */}
          <div className="px-3 py-2.5 border-t sm:border-t-0 sm:border-l border-cream-200">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-300 sm:hidden mb-1">Method</p>
            <input
              value={row.method}
              onChange={e => onUpdate(i, 'method', e.target.value)}
              disabled={!row.included}
              className={inputCls}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function makeInitialForm(today: string): COAFormData {
  return {
    ipqcNo: '',
    coaNo: '',
    coaDated: today,
    sampleType: 'FG',
    sampleName: '',
    customerName: '',
    batchNo: '',
    physicalCategory: 'nuts',
    batchQty: '',
    samplingDate: today,
    ingredientName: '',
    countryOfOrigin: 'INDIA',
    packingDate: today,
    expiryDate: '',
    shelfLife: '',
    storageCondition: 'Store in a cool, dry and hygiene place away from direct sunlight.',
    packagingType: '',
    asinCode: '',
    allergenDeclaration: '',
    sensory: makeSensoryRows(),
    physical: makePhysicalRows('nuts'),
    chemical: makeChemicalRows(),
    verdict: 'accept',
    remarks: 'The product complies with physical & chemical parameters as per FSSAI standards',
    analysedBy: '',
    verifiedBy: '',
  }
}

/** Build one COA draft per article in an IPQC record. Always returns ≥ 1 draft. */
function buildDraftsFromIpqc(record: IPQCRecord, base: COAFormData, ipqcNo: string): COAFormData[] {
  const articleCount = Math.max(record.articles?.length ?? 0, 1)
  return Array.from({ length: articleCount }, (_, idx) => {
    const patch = mapIPQCToCOA(record, base, idx)
    // Append a suffix to the COA No. so multi-article drafts don't collide on save.
    const coaNo = articleCount > 1 && patch.coaNo
      ? `${patch.coaNo}-${idx + 1}`
      : (patch.coaNo ?? base.coaNo)
    return { ...base, ...patch, ipqcNo, coaNo }
  })
}

export default function COACreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date().toISOString().split('T')[0]

  // One COA draft per IPQC article. Always length ≥ 1; if no IPQC is imported, it's a
  // single blank draft. `form` and `setForm` proxy through to coaDrafts[activeDraftIdx].
  const [coaDrafts, setCoaDrafts] = useState<COAFormData[]>(() => [makeInitialForm(today)])
  const [activeDraftIdx, setActiveDraftIdx] = useState(0)

  const form = coaDrafts[activeDraftIdx] ?? coaDrafts[0]
  type FormUpdater = COAFormData | ((prev: COAFormData) => COAFormData)
  const setForm = (updater: FormUpdater) => {
    setCoaDrafts(prev => prev.map((d, i) => {
      if (i !== activeDraftIdx) return d
      return typeof updater === 'function' ? (updater as (p: COAFormData) => COAFormData)(d) : updater
    }))
  }

  const [sections, setSections] = useState({ sensory: true, physical: true, chemical: true })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  // Tracks which draft indices have already been saved (so the single-save flow
  // doesn't double-save, and so "Save All" only sends the remaining ones).
  const [savedDraftIdxs, setSavedDraftIdxs] = useState<Set<number>>(() => new Set())
  const [savedCoaNos, setSavedCoaNos] = useState<string[]>([])
  const [ipqcSearch, setIpqcSearch] = useState('')
  const [ipqcLoading, setIpqcLoading] = useState(false)
  const [ipqcLinked, setIpqcLinked] = useState<IPQCRecord | null>(null)
  const [ipqcError, setIpqcError] = useState('')
  const [toleranceRecord, setToleranceRecord] = useState<CustomerToleranceRecord | null>(null)
  const [toleranceLoading, setToleranceLoading] = useState(false)
  // Customer dropdown
  const [customerOptions, setCustomerOptions] = useState<CustomerToleranceRecord[]>([])
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  // Rebuild physical rows when category changes — preserve any already-filled results
  // (e.g. from a linked IPQC) so switching draft tabs / categories doesn't blow them away.
  useEffect(() => {
    setForm(f => ({
      ...f,
      physical: preserveResultsFromPrev(makePhysicalRows(f.physicalCategory), f.physical),
    }))
  }, [form.physicalCategory])

  // Load all customer options from customer_tolerance table on mount
  useEffect(() => {
    customerToleranceApi.list()
      .then(res => setCustomerOptions(res.data ?? []))
      .catch(() => {})
  }, [])

  // Close customer dropdown on outside click
  useEffect(() => {
    if (!customerDropdownOpen) return
    function onOutsideClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-customer-dropdown]')) {
        setCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [customerDropdownOpen])

  // Auto-import IPQC record when ?ipqc= query param is present
  useEffect(() => {
    const ipqcNo = searchParams.get('ipqc')
    if (!ipqcNo) return
    setIpqcSearch(ipqcNo)
    setIpqcLoading(true)
    ipqcApi.get(ipqcNo, getStoredWarehouse())
      .then(record => {
        // eslint-disable-next-line no-console
        console.log('[coa-ipqc-auto-import] RAW IPQC record received (from ?ipqc=… query):', record)
        const drafts = buildDraftsFromIpqc(record, makeInitialForm(today), ipqcNo)
        // eslint-disable-next-line no-console
        console.log(`[coa-ipqc-auto-import] built ${drafts.length} draft(s)`)
        setCoaDrafts(drafts)
        setActiveDraftIdx(0)
        setSavedDraftIdxs(new Set())
        setSavedCoaNos([])
        setIpqcLinked(record)
        toast.success(
          drafts.length > 1
            ? `Imported ${drafts.length} items from IPQC ${ipqcNo}`
            : `Imported from IPQC ${ipqcNo}`
        )
      })
      .catch(() => {
        setIpqcError(`IPQC record "${ipqcNo}" not found.`)
      })
      .finally(() => setIpqcLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-calculate shelf life from packing date and expiry date — always in months
  useEffect(() => {
    if (!form.packingDate || !form.expiryDate) {
      setForm(f => ({ ...f, shelfLife: '' }))
      return
    }
    const start = new Date(form.packingDate)
    const end = new Date(form.expiryDate)
    const diffMs = end.getTime() - start.getTime()
    if (diffMs <= 0) {
      setForm(f => ({ ...f, shelfLife: '' }))
      return
    }
    // Round to nearest month using avg month length (30.4375 days)
    const months = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375))
    const label = months < 1
      ? 'Less than 1 Month'
      : months === 1 ? '1 Month' : `${months} Months`
    setForm(f => ({ ...f, shelfLife: label }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.packingDate, form.expiryDate])

  // Fetch customer tolerance from DB whenever customerName (+ sampleName) changes
  useEffect(() => {
    const customer = form.customerName.trim()
    if (!customer) {
      setToleranceRecord(null)
      // Reset to default rows but PRESERVE any already-filled results
      // (e.g. when switching draft tabs after IPQC import).
      setForm(f => ({
        ...f,
        sensory:  preserveResultsFromPrev(makeSensoryRows(),                       f.sensory),
        physical: preserveResultsFromPrev(makePhysicalRows(f.physicalCategory),    f.physical),
        chemical: preserveResultsFromPrev(makeChemicalRows(),                      f.chemical),
      }))
      return
    }
    setToleranceLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await customerToleranceApi.get(customer, form.sampleName.trim() || undefined)
        console.log('[customer-tolerance] fetch response:', res)
        if (res.data) {
          console.log('[customer-tolerance] organoleptic_sensory:', res.data.organoleptic_sensory)
          console.log('[customer-tolerance] physical:', res.data.physical)
          console.log('[customer-tolerance] chemical:', res.data.chemical)
          setToleranceRecord(res.data)
          // Apply fetched tolerances into all three param sections — but preserve
          // any results already filled in (typically from a linked IPQC).
          setForm(f => {
            const newSensory  = preserveResultsFromPrev(makeSensoryRows(),                                                                  f.sensory)
            const newPhysical = preserveResultsFromPrev(buildRowsFromTolerance(makePhysicalRows(f.physicalCategory), res.data!.physical),  f.physical)
            const newChemical = preserveResultsFromPrev(buildRowsFromTolerance(makeChemicalRows(),                   res.data!.chemical),  f.chemical)
            console.log('[customer-tolerance] sensory rows after build (results preserved):', newSensory)
            console.log('[customer-tolerance] physical rows after build (results preserved):', newPhysical)
            console.log('[customer-tolerance] chemical rows after build (results preserved):', newChemical)
            return { ...f, sensory: newSensory, physical: newPhysical, chemical: newChemical }
          })
        } else {
          console.warn('[customer-tolerance] no record returned for', customer)
          setToleranceRecord(null)
        }
      } catch (err) {
        console.error('[customer-tolerance] fetch failed:', err)
        setToleranceRecord(null)
      } finally {
        setToleranceLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customerName, form.sampleName])

  // ── Field updaters ──────────────────────────────────────────────────────────

  const set = <K extends keyof COAFormData>(key: K, value: COAFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const updateParamRow = (
    field: 'sensory' | 'physical' | 'chemical',
    i: number,
    col: 'result' | 'tolerance' | 'method',
    val: string,
  ) =>
    setForm(f => ({
      ...f,
      [field]: (f[field] as ParamRow[]).map((r, idx) => idx === i ? { ...r, [col]: val } : r),
    }))

  const toggleParamRow = (field: 'sensory' | 'physical' | 'chemical', i: number) =>
    setForm(f => ({
      ...f,
      [field]: (f[field] as ParamRow[]).map((r, idx) => idx === i ? { ...r, included: !r.included } : r),
    }))

  const toggleAllParamRows = (field: 'sensory' | 'physical' | 'chemical', include: boolean) =>
    setForm(f => ({
      ...f,
      [field]: (f[field] as ParamRow[]).map(r => ({ ...r, included: include })),
    }))

  // ── IPQC import ─────────────────────────────────────────────────────────────

  async function handleIPQCImport() {
    const no = ipqcSearch.trim()
    if (!no) return
    setIpqcLoading(true)
    setIpqcError('')
    try {
      const record = await ipqcApi.get(no, getStoredWarehouse())
      // eslint-disable-next-line no-console
      console.log('[coa-ipqc-import] RAW IPQC record received:', record)
      // eslint-disable-next-line no-console
      console.log('[coa-ipqc-import] articles count:', record.articles?.length ?? 0)
      if (record.articles?.length) {
        record.articles.forEach((a: any, i: number) => {
          // eslint-disable-next-line no-console
          console.log(`[coa-ipqc-import] article #${i + 1}:`, {
            item_description: a.item_description,
            physical_category: a.physical_category,
            sensory_evaluation: a.sensory_evaluation,
            physical_parameters: a.physical_parameters,
            chemical_parameter: a.chemical_parameter,
            label_check: a.label_check,
          })
        })
      } else {
        // eslint-disable-next-line no-console
        console.log('[coa-ipqc-import] using flat record fields (no articles array):', {
          item_description: (record as any).item_description,
          physical_category: record.physical_category,
          sensory_evaluation: record.sensory_evaluation,
          physical_parameters: record.physical_parameters,
          chemical_parameter: (record as any).chemical_parameter,
          label_check: record.label_check,
        })
      }
      const drafts = buildDraftsFromIpqc(record, makeInitialForm(today), no)
      // eslint-disable-next-line no-console
      console.log(`[coa-ipqc-import] built ${drafts.length} draft(s). First draft physical result preview:`,
        drafts[0]?.physical?.filter(r => r.result).slice(0, 10))
      setCoaDrafts(drafts)
      setActiveDraftIdx(0)
      setSavedDraftIdxs(new Set())
      setSavedCoaNos([])
      setIpqcLinked(record)
      toast.success(
        drafts.length > 1
          ? `Imported ${drafts.length} items from IPQC ${no}`
          : `Imported from IPQC ${no}`
      )
    } catch {
      setIpqcError(`IPQC record "${no}" not found.`)
    } finally {
      setIpqcLoading(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const dateOrNull = (s: string) => (s && s.trim() ? s : null)
  const strOrNull  = (s: string) => (s && s.trim() ? s : null)

  const buildPayload = (d: COAFormData): FgCoaPayload => ({
    ipqc_no:              strOrNull(d.ipqcNo),
    coa_no:               d.coaNo.trim(),
    coa_dated:            d.coaDated,
    sample_type:          d.sampleType,
    sampling_date:        dateOrNull(d.samplingDate),
    sample_name:          d.sampleName.trim(),
    customer_name:        d.customerName.trim(),
    batch_no:             strOrNull(d.batchNo),
    physical_category:    strOrNull(d.physicalCategory),
    batch_qty:            strOrNull(d.batchQty),
    ingredient_name:      strOrNull(d.ingredientName),
    country_of_origin:    strOrNull(d.countryOfOrigin),
    packing_date:         dateOrNull(d.packingDate),
    expiry_date:          dateOrNull(d.expiryDate),
    shelf_life:           strOrNull(d.shelfLife),
    storage_condition:    strOrNull(d.storageCondition),
    packaging_type:       strOrNull(d.packagingType),
    asin_code:            strOrNull(d.asinCode),
    allergen_declaration: strOrNull(d.allergenDeclaration),
    sensory:  d.sensory,
    physical: d.physical,
    chemical: d.chemical,
    verdict:              d.verdict,
    remarks:              strOrNull(d.remarks),
    analysed_by:          strOrNull(d.analysedBy),
    verified_by:          strOrNull(d.verifiedBy),
  })

  /** Validate one draft. Returns null on success, or an error message string. */
  function validateDraft(d: COAFormData): string | null {
    if (!d.coaNo || !d.sampleName || !d.customerName) {
      return 'COA No., Sample Name and Customer are required.'
    }
    return null
  }

  /** Save the active draft only ("Save COA" button at the bottom). */
  async function handleSaveOne() {
    if (savedDraftIdxs.has(activeDraftIdx)) {
      toast('This item is already saved.', { icon: 'ℹ️' })
      return
    }
    const d = coaDrafts[activeDraftIdx]
    const err = validateDraft(d)
    if (err) {
      toast.error(`Item ${activeDraftIdx + 1}: ${err}`)
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fgCoaApi.create(buildPayload(d))
      const newSavedNos = [...savedCoaNos, res.data.coa_no]
      const newSavedIdxs = new Set(savedDraftIdxs)
      newSavedIdxs.add(activeDraftIdx)
      setSavedCoaNos(newSavedNos)
      setSavedDraftIdxs(newSavedIdxs)
      toast.success(`COA ${res.data.coa_no} saved!`)

      // If every draft is now saved, jump to the success screen.
      if (newSavedIdxs.size === coaDrafts.length) {
        setCreated(newSavedNos.join(', '))
        return
      }
      // Otherwise auto-advance to the next unsaved draft (if any).
      for (let offset = 1; offset < coaDrafts.length; offset++) {
        const next = (activeDraftIdx + offset) % coaDrafts.length
        if (!newSavedIdxs.has(next)) {
          setActiveDraftIdx(next)
          break
        }
      }
    } catch (err: any) {
      console.error('[fg-coa] single create failed:', err)
      toast.error(err?.message || 'Failed to save COA. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Save all unsaved drafts sequentially ("Save All (N)" button at the top). */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Determine which drafts still need saving.
    const pendingIdxs: number[] = []
    for (let i = 0; i < coaDrafts.length; i++) {
      if (!savedDraftIdxs.has(i)) pendingIdxs.push(i)
    }
    if (pendingIdxs.length === 0) {
      // Everything already saved — show success summary.
      setCreated(savedCoaNos.join(', '))
      return
    }
    // Validate every still-pending draft up-front; surface which item is missing required fields.
    for (const i of pendingIdxs) {
      const err = validateDraft(coaDrafts[i])
      if (err) {
        toast.error(`Item ${i + 1}: ${err}`)
        setActiveDraftIdx(i)
        return
      }
    }
    setIsSubmitting(true)
    try {
      // Save sequentially so that if any one fails we know which draft caused it.
      const createdCoas: string[] = [...savedCoaNos]
      const newSavedIdxs = new Set(savedDraftIdxs)
      for (const i of pendingIdxs) {
        const res = await fgCoaApi.create(buildPayload(coaDrafts[i]))
        createdCoas.push(res.data.coa_no)
        newSavedIdxs.add(i)
      }
      setSavedCoaNos(createdCoas)
      setSavedDraftIdxs(newSavedIdxs)
      setCreated(createdCoas.join(', '))
      toast.success(
        createdCoas.length > 1
          ? `${createdCoas.length} COAs saved successfully!`
          : `COA ${createdCoas[0]} saved successfully!`
      )
    } catch (err: any) {
      console.error('[fg-coa] create failed:', err)
      toast.error(err?.message || 'Failed to create COA. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────

  if (created) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="text-center animate-fade-in-up max-w-md w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-ink-700 mb-2">
              {created.includes(',') ? 'COAs Created!' : 'COA Created!'}
            </h2>
            <p className="text-ink-400 mb-6 text-sm">
              {created.includes(',')
                ? 'Certificates of Analysis have been saved successfully.'
                : 'Certificate of Analysis has been saved successfully.'}
            </p>
            <div className="surface-card p-5 mb-8 text-left rounded-2xl">
              <p className="text-xs text-ink-300 uppercase tracking-widest mb-1 font-semibold">
                {created.includes(',') ? 'COA Numbers' : 'COA Number'}
              </p>
              <p className="font-mono text-lg sm:text-2xl font-bold text-brand-600 break-words">{created}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => router.push('/lab-reports')} className="btn-outline">View All COAs</button>
              <button onClick={() => { setCreated(null); setCoaDrafts([makeInitialForm(today)]); setActiveDraftIdx(0); setSavedDraftIdxs(new Set()); setSavedCoaNos([]) }} className="btn-primary">
                Create Another
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-5 animate-fade-in-up">

        {/* ── Sticky top nav ── */}
        <div className="glass-strong sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 flex items-center justify-between gap-3 rounded-none sm:rounded-2xl shadow-soft">
          <button type="button" onClick={() => router.back()} className="btn-ghost gap-2 text-sm px-3 py-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-brand-500/10 shrink-0">
              <FlaskConical className="w-4 h-4 text-brand-600" />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-ink-700 truncate">Certificate of Analysis</h1>
              <p className="text-xs text-ink-300 hidden sm:block">CFPL.C5.F05 · Issue No: 01</p>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary gap-2 text-sm">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {(() => {
                if (isSubmitting) return 'Saving…'
                const pending = coaDrafts.length - savedDraftIdxs.size
                if (coaDrafts.length > 1) return `Save All (${pending})`
                return 'Save COA'
              })()}
            </span>
          </button>
        </div>

        {/* ── Item tabs (only when IPQC has multiple articles) ── */}
        {coaDrafts.length > 1 && (
          <div className="surface-card sticky top-[68px] z-20 rounded-2xl shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-cream-200 bg-cream-100/60">
              <button
                type="button"
                onClick={() => setActiveDraftIdx(i => Math.max(0, i - 1))}
                disabled={activeDraftIdx === 0}
                className="btn-ghost !p-1.5 disabled:opacity-30"
                title="Previous item"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500 shrink-0">
                Item {activeDraftIdx + 1} / {coaDrafts.length}
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
                  {coaDrafts.map((d, i) => {
                    const active = i === activeDraftIdx
                    const saved = savedDraftIdxs.has(i)
                    const label = (d.sampleName || `Item ${i + 1}`).slice(0, 40)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveDraftIdx(i)}
                        className={[
                          'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5',
                          active
                            ? 'bg-brand-500 text-white shadow-sm'
                            : saved
                              ? 'bg-success-50 text-success-700 border border-success-200 hover:bg-success-100'
                              : 'bg-white text-ink-500 hover:bg-cream-100 border border-cream-200',
                        ].join(' ')}
                        title={`${d.sampleName || `Item ${i + 1}`}${saved ? ' (saved)' : ''}`}
                      >
                        <span className="opacity-70">{i + 1}.</span>{label}
                        {saved && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDraftIdx(i => Math.min(coaDrafts.length - 1, i + 1))}
                disabled={activeDraftIdx === coaDrafts.length - 1}
                className="btn-ghost !p-1.5 disabled:opacity-30"
                title="Next item"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* ── 1. Import from IPQC ── */}
        <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
            <span className="p-2 rounded-xl bg-sky-50">
              <Link2 className="w-4 h-4 text-sky-600" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Import from IPQC</h2>
              <p className="text-[11px] text-ink-300 mt-0.5">Optional — pre-fills fields from an existing IPQC record</p>
            </div>
          </div>
          <div className="p-5">
            {ipqcLinked ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Linked: {ipqcLinked.ipqc_no}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{(ipqcLinked as any).articles?.[0]?.item_description ?? (ipqcLinked as any).item_description} · {(ipqcLinked as any).articles?.[0]?.customer ?? (ipqcLinked as any).customer}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIpqcLinked(null); setIpqcSearch(''); set('ipqcNo', '') }}
                  className="text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
                  <input
                    type="text"
                    value={ipqcSearch}
                    onChange={e => { setIpqcSearch(e.target.value); setIpqcError('') }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleIPQCImport())}
                    placeholder="Enter IPQC No. (e.g. IPQC-2024-001)…"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIPQCImport}
                  disabled={ipqcLoading || !ipqcSearch.trim()}
                  className="btn-outline gap-2 shrink-0"
                >
                  {ipqcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Import
                </button>
              </div>
            )}
            {ipqcError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-danger-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {ipqcError}
              </p>
            )}
          </div>
        </div>

        {/* ── 2. Document ID ── */}
        <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
            <span className="p-2 rounded-xl bg-brand-500/10">
              <FileText className="w-4 h-4 text-brand-600" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Document Reference</h2>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>COA No. *</label>
              <input required value={form.coaNo} onChange={e => set('coaNo', e.target.value)} placeholder="e.g. 1610" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>COA Dated *</label>
              <input required type="date" value={form.coaDated} onChange={e => set('coaDated', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Sample Type</label>
              <select value={form.sampleType} onChange={e => set('sampleType', e.target.value)} className={inputCls}>
                <option value="FG">FG – Finished Goods</option>
                <option value="RM">RM – Raw Material</option>
                <option value="WIP">WIP – Work In Progress</option>
                <option value="PM">PM – Packaging Material</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Sampling Date</label>
              <input type="date" value={form.samplingDate} onChange={e => set('samplingDate', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── 3. Product Info (mirrors IPQC article fields) ── */}
        <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
            <span className="p-2 rounded-xl bg-brand-500/10">
              <Package className="w-4 h-4 text-brand-600" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Product Information</h2>
              <p className="text-[11px] text-ink-300 mt-0.5">Mirrors IPQC article fields — auto-filled when linked</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">

            {/* Sample Name ← item_description */}
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Sample Name / SKU *
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← item_description</span>
              </label>
              <input required value={form.sampleName} onChange={e => set('sampleName', e.target.value)} placeholder="e.g. Whole Cashew – Roasted & Salted 100gms" className={inputCls} />
            </div>

            {/* Physical Category ← physical_category (drives physical param rows) */}
            <div>
              <label className={labelCls}>
                Physical Category
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← physical_category</span>
              </label>
              <select value={form.physicalCategory} onChange={e => set('physicalCategory', e.target.value)} className={inputCls}>
                <option value="dates">Dates</option>
                <option value="seeds">Seeds</option>
                <option value="nuts">Nuts</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Customer ← customer (dropdown from customer_tolerance table) */}
            <div className="relative" data-customer-dropdown>
              <label className={labelCls}>
                Customer Name *
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← customer_tolerance</span>
              </label>

              {/* Trigger button */}
              <button
                type="button"
                onClick={() => { setCustomerDropdownOpen(o => !o); setCustomerSearch('') }}
                className={`${inputCls} flex items-center justify-between gap-2 text-left w-full ${!form.customerName ? 'text-ink-300' : ''}`}
              >
                <span className="truncate flex flex-col items-start min-w-0">
                  {form.customerName ? (
                    <>
                      <span className="text-sm text-ink-700 truncate w-full">{form.customerName}</span>
                      {form.sampleName && (
                        <span className="text-[11px] text-ink-300 truncate w-full">{form.sampleName}</span>
                      )}
                    </>
                  ) : (
                    <span>Select customer & sample…</span>
                  )}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {form.customerName && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); set('customerName', ''); set('sampleName', ''); setCustomerSearch('') }}
                      onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), set('customerName', ''), set('sampleName', ''))}
                      className="p-0.5 rounded hover:bg-cream-200 transition-colors"
                    >
                      <X className="w-3 h-3 text-ink-300" />
                    </span>
                  )}
                  <ChevronsUpDown className="w-3.5 h-3.5 text-ink-300" />
                </span>
              </button>

              {/* Hidden required input for form validation */}
              <input type="text" required value={form.customerName} onChange={() => {}} tabIndex={-1} aria-hidden className="sr-only" />

              {/* Dropdown panel */}
              {customerDropdownOpen && (
                <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-cream-50 border border-cream-300 rounded-xl shadow-lift overflow-hidden animate-fade-in">
                  {/* Search */}
                  <div className="p-2 border-b border-cream-200 bg-cream-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
                      <input
                        autoFocus
                        type="text"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Search customers…"
                        className="w-full border border-cream-300 bg-white rounded-lg pl-8 pr-3 py-1.5 text-sm text-ink-600 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Options list — grouped by customer, each sample is its own selectable row */}
                  <div className="max-h-64 overflow-y-auto">
                    {(() => {
                      const q = customerSearch.toLowerCase()
                      const filtered = customerOptions.filter(c =>
                        c.customer_name.toLowerCase().includes(q) ||
                        (c.sample_name ?? '').toLowerCase().includes(q)
                      )
                      if (customerOptions.length === 0) {
                        return <div className="px-4 py-3 text-xs text-ink-300 text-center">No customers found in DB</div>
                      }
                      if (filtered.length === 0) {
                        return <div className="px-4 py-3 text-xs text-ink-300 text-center">No match for "{customerSearch}"</div>
                      }
                      // Group by customer for visual segregation
                      const groups = new Map<string, typeof filtered>()
                      for (const c of filtered) {
                        const key = c.customer_name.trim()
                        if (!groups.has(key)) groups.set(key, [])
                        groups.get(key)!.push(c)
                      }
                      const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))

                      return sorted.map(([customerName, rows]) => (
                        <div key={customerName} className="border-b border-cream-200 last:border-0">
                          {/* Customer group header */}
                          <div className="px-4 py-1.5 bg-cream-100 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                            {customerName}
                          </div>
                          {/* Sample rows under this customer */}
                          {rows.map(c => {
                            const isSelected = form.customerName === c.customer_name && form.sampleName === c.sample_name
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  set('customerName', c.customer_name)
                                  set('sampleName', c.sample_name)
                                  setCustomerDropdownOpen(false)
                                  setCustomerSearch('')
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                                  isSelected ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-cream-100'
                                }`}
                              >
                                <span className="text-ink-300 text-xs">└</span>
                                <span className="truncate">{c.sample_name || '(no sample name)'}</span>
                              </button>
                            )
                          })}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Batch No ← batch_number */}
            <div>
              <label className={labelCls}>
                FG Batch No.
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← batch_number</span>
              </label>
              <input value={form.batchNo} onChange={e => set('batchNo', e.target.value)} placeholder="e.g. JD16" className={inputCls} />
            </div>

            {/* Batch Qty */}
            <div>
              <label className={labelCls}>Batch Qty</label>
              <input value={form.batchQty} onChange={e => set('batchQty', e.target.value)} placeholder="e.g. 2850 UNITS" className={inputCls} />
            </div>

            {/* Ingredient Name */}
            <div>
              <label className={labelCls}>Ingredient Name</label>
              <input value={form.ingredientName} onChange={e => set('ingredientName', e.target.value)} placeholder="e.g. Cashew & Salt" className={inputCls} />
            </div>

            {/* Country of Origin ← label_check.country_of_origin */}
            <div>
              <label className={labelCls}>
                Country of Origin
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← label_check</span>
              </label>
              <input value={form.countryOfOrigin} onChange={e => set('countryOfOrigin', e.target.value)} placeholder="e.g. India" className={inputCls} />
            </div>

            {/* Packing Date ← label_check.pkg_date */}
            <div>
              <label className={labelCls}>
                Packing Date
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← label_check.pkg_date</span>
              </label>
              <input type="date" value={form.packingDate} onChange={e => set('packingDate', e.target.value)} className={inputCls} />
            </div>

            {/* Expiry Date ← label_check.exp_date */}
            <div>
              <label className={labelCls}>
                Expiry Date
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← label_check.exp_date</span>
              </label>
              <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
            </div>

            {/* Shelf Life — auto-calculated */}
            <div>
              <label className={labelCls}>Shelf Life</label>
              <div className="relative">
                <input
                  readOnly
                  value={form.shelfLife}
                  placeholder="Set Packing & Expiry dates…"
                  className={`${inputCls} pr-10 bg-cream-100 cursor-not-allowed`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 text-xs select-none">
                  {form.shelfLife ? '✓' : '~'}
                </span>
              </div>
              <p className="text-[10px] text-ink-300 mt-1">Auto-calculated from Packing → Expiry date</p>
            </div>

            {/* Packaging Type */}
            <div>
              <label className={labelCls}>Packaging Type</label>
              <input value={form.packagingType} onChange={e => set('packagingType', e.target.value)} placeholder="e.g. PP Pouch" className={inputCls} />
            </div>

            {/* ASIN ← label_check.barcode_article_no */}
            <div>
              <label className={labelCls}>
                ASIN / Article Code
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← label_check.barcode_article_no</span>
              </label>
              <input value={form.asinCode} onChange={e => set('asinCode', e.target.value)} placeholder="e.g. 1455544" className={inputCls} />
            </div>

            {/* Storage Condition ← label_check.storage_condition */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>
                Storage Condition
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← label_check.storage_condition</span>
              </label>
              <textarea rows={2} value={form.storageCondition} onChange={e => set('storageCondition', e.target.value)} className={`${inputCls} resize-none`} />
            </div>

            {/* Allergen ← label_check.allergen_information */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>
                Allergen Declaration / EAN Code
                <span className="ml-2 text-[10px] font-normal text-ink-300 normal-case tracking-normal">← label_check.allergen_information</span>
              </label>
              <textarea rows={2} value={form.allergenDeclaration} onChange={e => set('allergenDeclaration', e.target.value)} placeholder="e.g. Contains Nuts. May contain Sulphite, Soy and Milk." className={`${inputCls} resize-none`} />
            </div>

          </div>
        </div>

        {/* ── 4. Test Parameters ── */}
        <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
            <span className="p-2 rounded-xl bg-brand-500/10">
              <ClipboardList className="w-4 h-4 text-brand-600" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Test Parameters</h2>
              <p className="text-[11px] text-ink-300 mt-0.5">Same parameter sets as IPQC — results auto-filled when linked</p>
            </div>
            {/* Tolerance source badge */}
            {toleranceLoading && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cream-200 text-ink-400 text-[11px] font-semibold shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching tolerances…
              </span>
            )}
            {!toleranceLoading && toleranceRecord && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold shrink-0">
                <Database className="w-3 h-3" /> Tolerances from DB
              </span>
            )}
            {!toleranceLoading && !toleranceRecord && form.customerName.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold shrink-0">
                <AlertCircle className="w-3 h-3" /> Using defaults
              </span>
            )}
          </div>

          <div className="p-5 space-y-5">

            {/* ── Sensory (← sensory_evaluation) ── */}
            <div>
              <SectionToggle
                icon={Microscope}
                title="Sensory Evaluation"
                subtitle="← sensory_evaluation · Visual & sensory parameters"
                color="emerald"
                open={sections.sensory}
                onToggle={() => setSections(s => ({ ...s, sensory: !s.sensory }))}
              />
              {sections.sensory && (
                <ParamTable
                  rows={form.sensory}
                  onUpdate={(i, f, v) => updateParamRow('sensory', i, f, v)}
                  onToggle={i => toggleParamRow('sensory', i)}
                  onToggleAll={inc => toggleAllParamRows('sensory', inc)}
                />
              )}
            </div>

            {/* ── Physical (← physical_parameters, driven by physicalCategory) ── */}
            <div>
              <SectionToggle
                icon={ShieldCheck}
                title="Physical Parameters"
                subtitle={`← physical_parameters · Category: ${form.physicalCategory}`}
                color="amber"
                open={sections.physical}
                onToggle={() => setSections(s => ({ ...s, physical: !s.physical }))}
              />
              {sections.physical && (
                <ParamTable
                  rows={form.physical}
                  onUpdate={(i, f, v) => updateParamRow('physical', i, f, v)}
                  onToggle={i => toggleParamRow('physical', i)}
                  onToggleAll={inc => toggleAllParamRows('physical', inc)}
                />
              )}
            </div>

            {/* ── Chemical (← chemical_parameter) ── */}
            <div>
              <SectionToggle
                icon={Beaker}
                title="Chemical Analysis"
                subtitle="← chemical_parameter · Moisture & Salt"
                color="sky"
                open={sections.chemical}
                onToggle={() => setSections(s => ({ ...s, chemical: !s.chemical }))}
              />
              {sections.chemical && (
                <ParamTable
                  rows={form.chemical}
                  onUpdate={(i, f, v) => updateParamRow('chemical', i, f, v)}
                  onToggle={i => toggleParamRow('chemical', i)}
                  onToggleAll={inc => toggleAllParamRows('chemical', inc)}
                />
              )}
            </div>

          </div>
        </div>

        {/* ── 5. Verdict + Remarks (← verdict, overall_remark) ── */}
        <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
            <span className="p-2 rounded-xl bg-brand-500/10">
              <Tag className="w-4 h-4 text-brand-600" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Verdict & Remarks</h2>
              <p className="text-[11px] text-ink-300 mt-0.5">← verdict · overall_remark</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Verdict */}
            <div>
              <label className={labelCls}>Verdict</label>
              <div className="flex gap-3 mt-1">
                {(['accept', 'reject'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('verdict', v)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                      form.verdict === v
                        ? v === 'accept'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-cream-50 border-cream-300 text-ink-400 hover:border-ink-300'
                    }`}
                  >
                    {v === 'accept' ? 'Accept ✓' : 'Reject ✗'}
                  </button>
                ))}
              </div>
            </div>
            {/* Remarks */}
            <div>
              <label className={labelCls}>Remarks</label>
              <textarea rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Compliance remarks or observations…" className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        {/* ── 6. Signatories ── */}
        <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
            <span className="p-2 rounded-xl bg-brand-500/10">
              <User className="w-4 h-4 text-brand-600" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Signatories</h2>
              <p className="text-[11px] text-ink-300 mt-0.5">Analysed by & verified by</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Analysed By — dropdown with "Other" → free text */}
            <div>
              <label className={labelCls}>Analysed By</label>
              {(() => {
                const presetNames = ANALYSED_BY_OPTIONS.filter(o => o.name !== 'Other').map(o => o.name)
                const isOther = form.analysedBy !== '' && !presetNames.includes(form.analysedBy)
                const selectVal = isOther ? 'Other' : form.analysedBy
                return (
                  <>
                    <select
                      value={selectVal}
                      onChange={e => {
                        const v = e.target.value
                        set('analysedBy', v === 'Other' ? '' : v)
                      }}
                      className={inputCls}
                    >
                      <option value="">Select…</option>
                      {ANALYSED_BY_OPTIONS.map(o => (
                        <option key={o.name} value={o.name}>{o.name}</option>
                      ))}
                    </select>
                    {(selectVal === 'Other' || isOther) && (
                      <input
                        value={form.analysedBy}
                        onChange={e => set('analysedBy', e.target.value)}
                        placeholder="Type analyst name…"
                        className={`${inputCls} mt-2`}
                        autoFocus={selectVal === 'Other' && !form.analysedBy}
                      />
                    )}
                  </>
                )
              })()}
              <p className="text-[11px] text-ink-300 mt-1.5">Quality Control Executive</p>
            </div>

            {/* Verified By — dropdown with "Other" → free text */}
            <div>
              <label className={labelCls}>Verified By</label>
              {(() => {
                const presetNames = VERIFIED_BY_OPTIONS.filter(o => o.name !== 'Other').map(o => o.name)
                const isOther = form.verifiedBy !== '' && !presetNames.includes(form.verifiedBy)
                const selectVal = isOther ? 'Other' : form.verifiedBy
                return (
                  <>
                    <select
                      value={selectVal}
                      onChange={e => {
                        const v = e.target.value
                        set('verifiedBy', v === 'Other' ? '' : v)
                      }}
                      className={inputCls}
                    >
                      <option value="">Select…</option>
                      {VERIFIED_BY_OPTIONS.map(o => (
                        <option key={o.name} value={o.name}>{o.name}</option>
                      ))}
                    </select>
                    {(selectVal === 'Other' || isOther) && (
                      <input
                        value={form.verifiedBy}
                        onChange={e => set('verifiedBy', e.target.value)}
                        placeholder="Type verifier name…"
                        className={`${inputCls} mt-2`}
                        autoFocus={selectVal === 'Other' && !form.verifiedBy}
                      />
                    )}
                  </>
                )
              })()}
              <p className="text-[11px] text-ink-300 mt-1.5">Quality Manager</p>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="glass-strong -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 flex items-center justify-between gap-3 rounded-none sm:rounded-2xl shadow-soft">
          <p className="text-xs text-ink-300 hidden sm:block">
            {coaDrafts.length > 1
              ? <>Saves <span className="font-semibold text-ink-500">only Item {activeDraftIdx + 1}</span>. Use <span className="font-semibold text-ink-500">Save All</span> at the top for every item.</>
              : <>Fields marked <span className="text-brand-500 font-bold">*</span> are required</>
            }
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button type="button" onClick={() => router.back()} className="btn-outline flex-1 sm:flex-none">Cancel</button>
            <button
              type="button"
              onClick={handleSaveOne}
              disabled={isSubmitting || savedDraftIdxs.has(activeDraftIdx)}
              className="btn-primary flex-1 sm:flex-none gap-2"
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : savedDraftIdxs.has(activeDraftIdx)
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <Save className="w-4 h-4" />}
              {isSubmitting
                ? 'Saving…'
                : savedDraftIdxs.has(activeDraftIdx)
                  ? 'Saved'
                  : coaDrafts.length > 1
                    ? `Save COA (Item ${activeDraftIdx + 1})`
                    : 'Save COA'}
            </button>
          </div>
        </div>

        <div className="h-4" />
      </form>
    </DashboardLayout>
  )
}
