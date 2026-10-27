/**
 * Pure checklist logic ported from presentation/checklist/ (ChecklistType in
 * ChecklistCatalog.kt, ChecklistViewModel's row model, BreakdownFormSpec.kt,
 * BreakdownF06Logic.kt), util/PeriodLabel.kt and util/pdf/ChecklistPdfModel.kt.
 */
import type {
  BreakdownFlagDto,
  BreakdownRecordDto,
  ChecklistFormType,
  ChecklistRecordDetail,
  CheckpointStatus,
} from '@/lib/maintenance/api/checklist'
import { fmtTime, isoDateIst } from '@/lib/maintenance/format'
import { AFTER_MAINTENANCE_CHECKS, catalogFor } from './catalog'

// ── ChecklistType ────────────────────────────────────────────────────────

export interface ChecklistTypeMeta {
  id: ChecklistFormType
  docNo: string
  label: string
  plant: 'W202' | 'A185'
}

/** Enum order matters: plantOf() tries plants in this order. */
export const CHECKLIST_TYPES: ChecklistTypeMeta[] = [
  { id: 'MONTHLY', docNo: 'CFPLA.C4.F.50a', label: 'Monthly', plant: 'W202' },
  { id: 'QUARTERLY', docNo: 'CFPLA.C4.F.50b', label: 'Quarterly', plant: 'W202' },
  // A-185's two blocks live in ONE controlled document (F.41) — the type name tells them apart.
  { id: 'A185_QUARTERLY', docNo: 'CFPLB.C4.F.41', label: 'Quarterly', plant: 'A185' },
  { id: 'A185_MONTHLY', docNo: 'CFPLB.C4.F.41', label: 'Monthly', plant: 'A185' },
]

export const DEFAULT_PLANT = 'W202'

export const typeMeta = (id: ChecklistFormType) => CHECKLIST_TYPES.find((t) => t.id === id) ?? CHECKLIST_TYPES[0]

export function parseFormType(raw: string | null | undefined): ChecklistFormType | null {
  const r = (raw ?? '').trim().toUpperCase()
  return CHECKLIST_TYPES.find((t) => t.id === r)?.id ?? null
}

/**
 * mt_users.location is free text ("A-185-Koparkhairne", "185-Koparkhairnae",
 * "W202"). Strip to alphanumerics and accept the code or just its number;
 * anything unrecognised falls back to W-202 so nobody is left without forms.
 */
export function plantOf(plantId: string | null | undefined): 'W202' | 'A185' {
  const n = (plantId ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!n) return DEFAULT_PLANT
  for (const plant of ['W202', 'A185'] as const) {
    const digits = plant.replace(/\D/g, '')
    if (n.includes(plant) || (digits && n.includes(digits))) return plant
  }
  return DEFAULT_PLANT
}

/** True when the plant text names one specific plant (not "both" / blank). */
export function isSpecificPlant(plantId: string | null | undefined): boolean {
  const n = (plantId ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /W202|A185|202|185/.test(n)
}

/** The forms one plant's technician fills. */
export const typesForPlant = (plantId: string | null | undefined) =>
  CHECKLIST_TYPES.filter((t) => t.plant === plantOf(plantId))

/** Owning plant of a stored record: form type first, then doc no; unknown → W-202. */
export function plantOfRecord(formType: string | null | undefined, docNo: string | null | undefined): string {
  const byType = CHECKLIST_TYPES.find((t) => t.id === (formType ?? '').trim().toUpperCase())
  if (byType) return byType.plant
  const doc = (docNo ?? '').trim().toLowerCase()
  const byDoc = CHECKLIST_TYPES.find((t) => t.docNo.toLowerCase() === doc)
  return byDoc?.plant ?? DEFAULT_PLANT
}

/** List/detail heading (strings_preventive.xml preventive_type_*). */
export function formTypeLabel(formType: string): string {
  switch (formType.toUpperCase()) {
    case 'MONTHLY':
      return 'Monthly (50a)'
    case 'QUARTERLY':
      return 'Quarterly (50b)'
    case 'A185_MONTHLY':
      return 'Monthly (F.41)'
    case 'A185_QUARTERLY':
      return 'Quarterly (F.41)'
    default:
      return formType
  }
}

/** Hub subtitle: "Monthly (50a) / Quarterly (50b)" or "Quarterly / Monthly (41)". */
export function preventiveSubtitle(types: ChecklistTypeMeta[]): string {
  const short = (t: ChecklistTypeMeta) => t.docNo.slice(t.docNo.lastIndexOf('.') + 1)
  const shorts = Array.from(new Set(types.map(short)))
  if (shorts.length === 1) return `${types.map((t) => t.label).join(' / ')} (${shorts[0]})`
  return types.map((t) => `${t.label} (${short(t)})`).join(' / ')
}

// ── Period label (util/PeriodLabel.kt) ───────────────────────────────────

// "Sept", as the printed forms write it.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

function parseIso(v: string | null | undefined): { y: number; m: number } | null {
  const raw = (v ?? '').trim()
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { y, m: mo }
}

const monthLabel = (d: { y: number; m: number }) => `${MONTHS[d.m - 1]} ${d.y}`

/** "Sept 2026" for a monthly sheet, "Jul–Sep 2026" for a quarterly one. */
export function periodLabel(from?: string | null, to?: string | null, fallback?: string | null): string {
  const start = parseIso(from)
  const end = parseIso(to)
  if (start && end) {
    if (start.y === end.y && start.m === end.m) return monthLabel(start)
    if (start.y === end.y) return `${MONTHS[start.m - 1]}–${MONTHS[end.m - 1]} ${end.y}`
    return `${monthLabel(start)}–${monthLabel(end)}`
  }
  if (start) return monthLabel(start)
  if (end) return monthLabel(end)
  if (fallback?.trim()) {
    const f = parseIso(fallback)
    return f ? monthLabel(f) : fallback.trim()
  }
  return '—'
}

// ── Checklist form rows (ChecklistViewModel.kt) ──────────────────────────

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** One tick + remarks row. `checkpoint` is blank for single-row equipment. */
export interface ChecklistRow {
  section: string
  equipment: string
  srNo: number | null
  /** Monthly: the single date. Quarterly: the FROM of the machine's range. */
  equipmentDate: string
  /** Quarterly only: the TO of the range. Blank on monthly forms. */
  equipmentDateTo: string
  checkpoint: string
  checked: boolean
  remarks: string
}

export const isRowFilled = (r: ChecklistRow) => r.checked || r.remarks.trim() !== ''

export const rowStatus = (r: ChecklistRow): CheckpointStatus =>
  r.checked ? 'OK' : r.remarks.trim() ? 'NOT_OK' : 'UNSET'

/** Dates are per equipment — this is the key every one of its rows shares. */
export const equipmentKey = (r: Pick<ChecklistRow, 'section' | 'srNo' | 'equipment'>) =>
  `${r.section}|${r.srNo}|${r.equipment}`

export const rowKey = (section: string, srNo: number | null, equipment: string, checkpoint: string) =>
  `${section}|${srNo}|${equipment}|${checkpoint}`

export const needsEquipmentRange = (t: ChecklistFormType) => t === 'QUARTERLY' || t === 'A185_QUARTERLY'

export function buildRows(type: ChecklistFormType): ChecklistRow[] {
  const today = isoDateIst()
  const rows: ChecklistRow[] = []
  for (const sec of catalogFor(type)) {
    for (const e of sec.equipment) {
      const base = { section: sec.name, equipment: e.name, srNo: e.srNo, equipmentDate: today, equipmentDateTo: '', checked: false, remarks: '' }
      if (e.checkpoints.length === 0) {
        rows.push({ ...base, checkpoint: '' })
      } else {
        // Real machines: maintenance checkpoints + the 4 After-Maintenance checks.
        for (const cp of [...e.checkpoints, ...AFTER_MAINTENANCE_CHECKS]) rows.push({ ...base, checkpoint: cp })
      }
    }
  }
  return rows
}

export function rangeOk(type: ChecklistFormType, from: string, to: string): boolean {
  if (needsEquipmentRange(type)) return DATE_REGEX.test(from) && DATE_REGEX.test(to) && to >= from
  return DATE_REGEX.test(from)
}

/** A complaint about one machine's dates, or null while it is merely incomplete. */
export function equipmentDateError(type: ChecklistFormType, from: string, to: string): string | null {
  if (from.trim() && !DATE_REGEX.test(from)) return 'Format: YYYY-MM-DD, e.g. 2026-07-01'
  if (!needsEquipmentRange(type)) return null
  if (to.trim() && !DATE_REGEX.test(to)) return 'Format: YYYY-MM-DD, e.g. 2026-09-30'
  if (!from.trim() || !to.trim()) return null
  if (to < from) return 'Date To must be on or after Date From'
  return null
}

// ── Stored-record status (PreventiveDetailScreen ItemRow) ────────────────

export type ItemOutcome = 'OK' | 'NOT_OK' | 'PENDING'

/** Three states: an untouched UNSET cell is pending, not a failure. */
export function itemOutcome(status: string): ItemOutcome {
  const s = status.trim().toUpperCase()
  if (s === 'OK' || s === 'PASS') return 'OK'
  if (s === 'NOT_OK' || s === 'FAIL') return 'NOT_OK'
  return 'PENDING'
}

export const isItemFilled = (status: string) => !['', 'UNSET'].includes(status.trim().toUpperCase())

/** "12. Lift 1 Old  ·  2026-07-01 to 2026-07-09" */
export function equipmentTitle(item: { srNo: number | null; equipment: string; equipmentDate: string; equipmentDateTo: string }) {
  let s = item.srNo != null ? `${item.srNo}. ${item.equipment}` : item.equipment
  if (item.equipmentDate.trim()) {
    s += `  ·  ${item.equipmentDate}`
    if (item.equipmentDateTo.trim() && item.equipmentDateTo !== item.equipmentDate) s += ` to ${item.equipmentDateTo}`
  }
  return s
}

// ── PDF model (util/pdf/ChecklistPdfModel.kt) ────────────────────────────

export type PdfForm = 'PREVENTIVE_MONTHLY' | 'PREVENTIVE_QUARTERLY' | 'BREAKDOWN' | 'PREVENTIVE_A185' | 'BREAKDOWN_A185'

export interface DocMeta {
  documentNo: string
  formatTitle: string
  issueNo: string
  revisionNo: string
  issueDate: string
  revisionDate: string
  landscape: boolean
}

/** Header metadata reproduced from the controlled-copy PDFs. */
export const DOC_META: Record<PdfForm, DocMeta> = {
  PREVENTIVE_MONTHLY: {
    documentNo: 'CFPLA.C4.F.50a',
    formatTitle: 'Preventive Maintenance Checklist- Monthly',
    issueNo: '06',
    revisionNo: '05',
    issueDate: '01/11/2027',
    revisionDate: '13/12/2025',
    landscape: false,
  },
  PREVENTIVE_QUARTERLY: {
    documentNo: 'CFPLA.C4.F.50b',
    formatTitle: 'Preventive Maintenance Checklist-Quarterly',
    issueNo: '05',
    revisionNo: '04',
    issueDate: '01/11/2027',
    revisionDate: '01/10/2025',
    landscape: false,
  },
  BREAKDOWN: {
    documentNo: 'CFPLA.C4.F.06',
    formatTitle: 'Breakdown Maintainance Record',
    issueNo: '04',
    revisionNo: '03',
    issueDate: '01/11/2017',
    revisionDate: '01/10/2025',
    landscape: true,
  },
  PREVENTIVE_A185: {
    documentNo: 'CFPLB.C4.F.41',
    formatTitle: 'Preventive Maintenance Checklist- Quarterly and monthly',
    issueNo: '03',
    revisionNo: '02',
    issueDate: '04/08/2021',
    revisionDate: '15/04/2026',
    landscape: false,
  },
  BREAKDOWN_A185: {
    documentNo: 'CFPLB.C4.F.61',
    formatTitle: 'Breakdown  Maintenance Record',
    issueNo: '04',
    revisionNo: '03',
    issueDate: '01/11/2017',
    revisionDate: '02/02/2026',
    landscape: true,
  },
}

export function pdfFormFor(formType: string): PdfForm {
  switch (formType.trim().toUpperCase()) {
    case 'QUARTERLY':
      return 'PREVENTIVE_QUARTERLY'
    case 'A185_QUARTERLY':
    case 'A185_MONTHLY':
      return 'PREVENTIVE_A185'
    default:
      return 'PREVENTIVE_MONTHLY'
  }
}

export type PreventiveRow =
  | { kind: 'section'; title: string }
  | { kind: 'equipment'; title: string }
  | { kind: 'sub'; title: string }
  | { kind: 'checkpoint'; name: string; status: string; remarks: string }

/** Flatten a record into render rows: section banner, machine row, checkpoints. */
export function flattenPreventive(detail: ChecklistRecordDetail): PreventiveRow[] {
  const out: PreventiveRow[] = []
  detail.items.forEach((item, i) => {
    const prev = i > 0 ? detail.items[i - 1] : undefined
    const newSection = !prev || prev.section !== item.section
    const newEquipment = newSection || prev?.equipment !== item.equipment || prev?.srNo !== item.srNo
    if (newSection && item.section.trim()) out.push({ kind: 'section', title: item.section.toUpperCase() })
    if (newEquipment) out.push({ kind: 'equipment', title: equipmentTitle(item) })
    // Sub-label the after-maintenance block once per machine.
    const isAfter = AFTER_MAINTENANCE_CHECKS.includes(item.checkpoint)
    const prevAfter = !newEquipment && !!prev && AFTER_MAINTENANCE_CHECKS.includes(prev.checkpoint)
    if (isAfter && !prevAfter) out.push({ kind: 'sub', title: 'After maintenance' })
    const o = itemOutcome(item.status)
    out.push({
      kind: 'checkpoint',
      name: item.checkpoint.trim() || 'General check',
      // Pending cells print blank rather than as a failure (same rule as the detail screen).
      status: o === 'OK' ? 'OK' : o === 'NOT_OK' ? 'NOT OK' : '—',
      remarks: item.remarks,
    })
  })
  return out
}

export function pdfFileName(form: PdfForm, date: string, recordId: number | null): string {
  const safe = (date.trim() || 'record').replace(/[^A-Za-z0-9_-]/g, '-')
  const rec = recordId ?? 0
  switch (form) {
    case 'PREVENTIVE_MONTHLY':
      return `Preventive_50a_Monthly_${safe}_rec${rec}`
    case 'PREVENTIVE_QUARTERLY':
      return `Preventive_50b_Quarterly_${safe}_rec${rec}`
    case 'BREAKDOWN':
      return `Breakdown_F06_${safe}`
    case 'PREVENTIVE_A185':
      return `Preventive_F41_A185_${safe}_rec${rec}`
    case 'BREAKDOWN_A185':
      return `Breakdown_F61_A185_${safe}`
  }
}

// ── Breakdown sheet (BreakdownFormSpec.kt / BreakdownF06Logic.kt) ────────

export interface BreakdownFormSpec {
  plant: 'W202' | 'A185'
  docNo: string
  pdfForm: PdfForm
}

export const BREAKDOWN_W202: BreakdownFormSpec = { plant: 'W202', docNo: 'CFPLA.C4.F.06', pdfForm: 'BREAKDOWN' }
export const BREAKDOWN_A185: BreakdownFormSpec = { plant: 'A185', docNo: 'CFPLB.C4.F.61', pdfForm: 'BREAKDOWN_A185' }

export const breakdownSpecForPlant = (plantId: string | null | undefined) =>
  plantOf(plantId) === 'A185' ? BREAKDOWN_A185 : BREAKDOWN_W202

export const breakdownSpecForDocNo = (docNo: string | null | undefined) =>
  (docNo ?? '').trim().toLowerCase() === BREAKDOWN_A185.docNo.toLowerCase() ? BREAKDOWN_A185 : BREAKDOWN_W202

export const breakdownShortDoc = (spec: BreakdownFormSpec) => spec.docNo.slice(spec.docNo.lastIndexOf('.') + 1)

/** One register row — the same columns on F.06 and F.61. */
export interface BreakdownEntryState {
  key: string
  date: string
  location: string
  machineName: string
  equipmentModel: string
  problem: string
  typeOfMaintenance: string
  partOfMachine: string
  reason: string
  durationStart: string
  durationEnd: string
  machineOperatorSign: string
  maintenancePersonSign: string
  qcClearanceSign: string
}

/** Minimum viable row: a date, the machine, and the problem. */
export const isEntryValid = (e: BreakdownEntryState) =>
  !!e.date.trim() && !!e.machineName.trim() && !!e.problem.trim()

export interface BreakdownRow {
  srNo: number
  date: string
  location: string
  machineName: string
  equipmentModel: string
  problem: string
  typeOfMaintenance: string
  partOfMachine: string
  reason: string
  durationStart: string
  durationEnd: string
  machineOperatorSign: string
  maintenancePersonSign: string
  qcClearanceSign: string
}

/** A breakdown is fillable only once QC has approved it. */
export const isApproved = (f: BreakdownFlagDto) => (f.qc_status ?? '').toUpperCase() === 'APPROVED'

export function breakdownStatusLabel(f: BreakdownFlagDto): string {
  if (isApproved(f)) return 'Approved'
  switch ((f.status ?? '').toUpperCase()) {
    case 'PENDING_QC':
      return 'Pending QC'
    case 'ACKNOWLEDGED':
      return 'In progress'
    case 'REOPENED':
      return 'Reopened'
    case 'CLOSED':
      return 'Closed'
    default:
      return 'Open'
  }
}

/** A submitted record as a one-row sheet for printing. */
export function recordToF06Row(r: BreakdownRecordDto): BreakdownRow {
  return {
    srNo: 1,
    date: r.record_date ?? '',
    location: r.location ?? '',
    machineName: r.machine_name?.trim() ? r.machine_name : (r.equipment_model_no ?? ''),
    equipmentModel: r.equipment_model_no ?? '',
    problem: r.problem_in_brief ?? '',
    typeOfMaintenance: r.type_of_maintenance ?? '',
    partOfMachine: r.part_of_machine ?? '',
    reason: r.temporary_reason ?? '',
    durationStart: r.duration_start ?? '',
    durationEnd: r.duration_end ?? '',
    machineOperatorSign: r.machine_operator_sign ?? '',
    maintenancePersonSign: r.maintenance_person_sign ?? '',
    qcClearanceSign: r.qc_clearance_sign ?? '',
  }
}

/** Pre-fill one F.06 row from a QC-approved breakdown's lifecycle data. */
export function flagToEntry(f: BreakdownFlagDto, key: string): BreakdownEntryState {
  const raised = f.reported_at ?? 0
  return {
    key,
    date: isoDateIst(raised),
    location: f.building ?? '',
    machineName: f.asset_name?.trim() ? f.asset_name : f.asset_id,
    equipmentModel: f.asset_id,
    problem: f.description ?? '',
    typeOfMaintenance: 'Breakdown',
    partOfMachine: '',
    reason: f.parts_used ?? '', // spare parts → Reason
    durationStart: fmtTime(raised, ''),
    durationEnd: f.resolved_at ? fmtTime(f.resolved_at, '') : '',
    machineOperatorSign: '', // the record stores the operator id, not a name
    maintenancePersonSign: f.resolved_by_name ?? '',
    qcClearanceSign: f.qc_decided_by_name ?? '',
  }
}
