// frontend/src/config/doc-forms.ts

import type { WarehouseCode } from '@/lib/warehouseAccess'

export interface DocFormConfig {
  formType: string
  label: string
  docNo: string
  dateField: string | null
  listColumns: string[]
  routeSlug: string
  printable?: boolean
  /** Warehouse-specific text prefixed in front of `label` (e.g. A185 → "Tray Roaster"). */
  titlePrefixByWarehouse?: Record<string, string>
  /**
   * Plants this format exists at. Omit for a form used at every plant. When set,
   * the card is hidden from the documentations grid and every page of the form
   * is gated for any other plant — see <DocWarehouseGate>. Mirrors the
   * "warehouses" key in backend/app/config/doc_registry.py, which does the real
   * enforcement.
   */
  warehouses?: WarehouseCode[]
  /**
   * Base path this form's pages live under. Defaults to "/documentations" —
   * only override for forms whose Next.js routes live outside that tree
   * (e.g. the training-* forms live under app/training/, not app/documentations/training/).
   */
  basePath?: string
}

export const PRINTABLE_SLUGS = new Set<string>([
  "productweightcheck",
  "productiontoolissuance",
  "dailycleaningchecklist",
  "equipmentcleaningsanitation",
  "preproductioninspection",
  "weighingscalecalibration",
  "new-product-verification",
  "roastingtemperature",
  "lux-monitoring",
  "gmp-schedule",
  "gmp-ghp-inspection",
  "inprocess-qc-after-processing",
  "ccp-puffer",
  "daily-pest-inspection",
  // Training forms (basePath /training — these are routeSlugs, not formTypes).
  "attendance-sheet",
  "training-card",
])

// Forms whose create page supports pre-filling from an existing record
// (?duplicateFrom=<id>), so a full entry can be "recreated" as a new record
// instead of retyping every field.
export const DUPLICATABLE_SLUGS = new Set<string>([
  // Forms with bespoke duplicate handling in their own create page.
  "lux-monitoring",
  "productweightcheck",
  "productiontoolissuance",
  "dailycleaningchecklist",
  "equipmentcleaningsanitation",
  "preproductioninspection",
  "lineclearancerecord",
  "personalhygienecheckup",
  "roastingtemperature",
  "weighingscalecalibration",
  "gmp-ghp-inspection",
  // Forms whose create page delegates to <DocCreateForm>, which loads the
  // record named by ?duplicateFrom= and passes it as `initialData`.
  "water-analysis",
  "incident-report",
  "safety-meeting",
  "new-product-verification",
  "mock-drill",
  "temperature-humidity",
  "inprocess-qc-record",
  "inprocess-qc-after-processing",
  "ccp-puffer",
  "gmp-schedule",
  "inward-rm-check",
  "fg-chemical-analysis",
  "eyewash-refill",
  "first-aid-box",
  "traceability",
  "mock-recall",
  "pre-weighing",
  "fly-catcher",
  "ccp-roasting-bar",
  "vehicle-inspection",
  "outgoing-vehicle-inspection",
  "glass-brittle-check",
  "preventive-maintenance",
  "new-equipment-clearance",
  "waste-disposal",
  "chemical-preparation",
  "deep-cleaning",
  "non-conforming-product",
  "rework-recycling",
  // Training forms (basePath /training — these are routeSlugs, not formTypes).
  "attendance-sheet",
  "attendance-workers",
  "reference-sheet",
  "feedback",
  "training-card",
])

export const DOC_FORMS: Record<string, DocFormConfig> = {
  // ── Batch 1 (22) ──
  productweightcheck:        { formType: "productweightcheck",        routeSlug: "productweightcheck",        label: "Product Weight & Sealing Check",   docNo: "CFPLA.C6.F.16",  dateField: "check_date",      listColumns: ["check_date", "product_name", "batch_no", "customer", "location"] },
  productiontoolissuance:    { formType: "productiontoolissuance",    routeSlug: "productiontoolissuance",    label: "Production Tool Issuance",         docNo: "CFPLA.C4.F.22",  dateField: "check_date",      listColumns: ["check_date", "checked_by", "verified_by", "warehouse"] },
  dailycleaningchecklist:    { formType: "dailycleaningchecklist",    routeSlug: "dailycleaningchecklist",    label: "Daily Cleaning Checklist",         docNo: "CFPLA.C4.F.54",  dateField: "month",           listColumns: ["month", "area", "tab_code", "warehouse"] },
  equipmentcleaningsanitation: { formType: "equipmentcleaningsanitation", routeSlug: "equipmentcleaningsanitation", label: "Equipment Cleaning & Sanitation", docNo: "CFPLA.C4.F.19", dateField: "month",          listColumns: ["month", "area", "warehouse", "status"] },
  preproductioninspection:   { formType: "preproductioninspection",   routeSlug: "preproductioninspection",   label: "Pre-Production Inspection",        docNo: "CFPLA.C6.F.07",  dateField: "inspection_date", listColumns: ["inspection_date", "warehouse", "created_at"] },
  lineclearancerecord:       { formType: "lineclearancerecord",       routeSlug: "lineclearancerecord",       label: "Line Clearance Record",            docNo: "CFPLA.C5.F.44",  dateField: null,              listColumns: ["area", "warehouse", "created_at"] },
  personalhygienecheckup:    { formType: "personalhygienecheckup",    routeSlug: "personalhygienecheckup",    label: "Personal Hygiene & Health Checkup",docNo: "CFPLA.C7.F.39",  dateField: "check_date",      listColumns: ["check_date", "area", "checked_by", "warehouse"] },
  roastingtemperature:       { formType: "roastingtemperature",       routeSlug: "roastingtemperature",       label: "Roasting Temperature & Time",      docNo: "CFPLA.C2.F.42",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"], titlePrefixByWarehouse: { A185: "Tray Roaster" } },
  weighingscalecalibration:  { formType: "weighingscalecalibration",  routeSlug: "weighingscalecalibration",  label: "Weighing Scale Calibration",       docNo: "CFPLA.C6.F.41",  dateField: "inspection_date", listColumns: ["inspection_date", "calibrated_by", "verified_by", "warehouse"] },
  "water-analysis":          { formType: "water-analysis",            routeSlug: "water-analysis",            label: "Water Analysis Record",            docNo: "CFPLA.C4.F.04",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "incident-report":         { formType: "incident-report",           routeSlug: "incident-report",           label: "Food Safety Incident Report",      docNo: "CFPLA.C5.F.05",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "safety-meeting":          { formType: "safety-meeting",            routeSlug: "safety-meeting",            label: "Food Safety Meeting Minutes",      docNo: "CFPLA.C.F.09",   dateField: "meeting_date",    listColumns: ["meeting_date", "venue", "warehouse"] },
  "new-product-verification":{ formType: "new-product-verification",  routeSlug: "new-product-verification",  label: "New Product Verification",         docNo: "CFPLA.C5.F.13",  dateField: "verify_date",     listColumns: ["verify_date", "product_name", "customer_name", "warehouse"] },
  "mock-drill":              { formType: "mock-drill",                routeSlug: "mock-drill",                label: "Emergency Mock Drill",             docNo: "CFPLA.C4.F.14",  dateField: "drill_datetime",  listColumns: ["drill_datetime", "location", "warehouse"] },
  "gmp-ghp-inspection":      { formType: "gmp-ghp-inspection",        routeSlug: "gmp-ghp-inspection",        label: "Monthly GMP & GHP Inspection",     docNo: "CFPLA.C3.F.15",  dateField: "audit_datetime",  listColumns: ["audit_datetime", "auditor_name", "rating", "percentage", "status", "warehouse"] },
  "temperature-humidity":    { formType: "temperature-humidity",      routeSlug: "temperature-humidity",      label: "Temperature & Humidity Record",    docNo: "CFPLA.C6.F.17",  dateField: "month",           listColumns: ["month", "area", "checked_by", "warehouse", "status"] },
  "inprocess-qc-record":     { formType: "inprocess-qc-record",       routeSlug: "inprocess-qc-record",       label: "In-process Quality Check",         docNo: "CFPLA.C6.F.18",  dateField: "check_date",      listColumns: ["check_date", "warehouse", "created_by"] },
  "inprocess-qc-after-processing": { formType: "inprocess-qc-after-processing", routeSlug: "inprocess-qc-after-processing", label: "In-process QC — After Processing", docNo: "CFPLB.C5.F.11", dateField: "check_date", listColumns: ["check_date", "warehouse", "created_by"], warehouses: ["A185"] },
  "ccp-puffer":              { formType: "ccp-puffer", routeSlug: "ccp-puffer", label: "CCP Puffer Monitoring", docNo: "CFPLB.C2.F.62", dateField: "check_date", listColumns: ["check_date", "product_name", "batch_no", "warehouse"], warehouses: ["A185"] },
  "gmp-schedule":            { formType: "gmp-schedule",            routeSlug: "gmp-schedule",              label: "Monthly GMP Schedule",             docNo: "CFPLA.C3.F.23",  dateField: "year",            listColumns: ["year", "warehouse", "created_by"] },
  "inward-rm-check":         { formType: "inward-rm-check",           routeSlug: "inward-rm-check",           label: "Inward Raw Material Check",        docNo: "CFPLA.C5.F.25",  dateField: "month",           listColumns: ["month", "area", "warehouse"] },
  "fg-chemical-analysis":    { formType: "fg-chemical-analysis",      routeSlug: "fg-chemical-analysis",      label: "Finished Good Chemical Analysis",  docNo: "CFPLA.C5.F.26",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "eyewash-refill":          { formType: "eyewash-refill",            routeSlug: "eyewash-refill",            label: "Eye Wash Bottle Refilling",        docNo: "CFPLA.C7.F.27",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "first-aid-box":           { formType: "first-aid-box",             routeSlug: "first-aid-box",             label: "First Aid Box Record",             docNo: "CFPLA.C7.F.29",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  // ── Batch 2 (15) ──
  "traceability":            { formType: "traceability",              routeSlug: "traceability",              label: "Traceability Report",              docNo: "CFPLA.C3.F.30",  dateField: "report_date",     listColumns: ["report_date", "product_name", "batch_number", "warehouse"] },
  "mock-recall":             { formType: "mock-recall",               routeSlug: "mock-recall",               label: "Mock Recall",                      docNo: "CFPLA.C3.F.31",  dateField: "recall_date",     listColumns: ["recall_date", "product_name", "batch_number", "recall_efficiency_pct", "warehouse"] },
  "lux-monitoring":          { formType: "lux-monitoring",            routeSlug: "lux-monitoring",            label: "Lux Monitoring Record",            docNo: "CFPLA.C4.F.32",  dateField: "check_date",      listColumns: ["check_date", "checked_by", "warehouse", "status"] },
  "pre-weighing":            { formType: "pre-weighing",              routeSlug: "pre-weighing",              label: "Pre Weighing Check Record",        docNo: "CFPLA.C6.F.34",  dateField: "check_date",      listColumns: ["check_date", "customer", "product", "warehouse"] },
  "fly-catcher":             { formType: "fly-catcher",               routeSlug: "fly-catcher",               label: "Daily Fly Catcher Check",          docNo: "CFPLA.C7.F.37",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "ccp-roasting-bar":        { formType: "ccp-roasting-bar",          routeSlug: "ccp-roasting-bar",          label: "CCP Roasting (Bar Line)",          docNo: "CFPLA.C2.F.43",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "vehicle-inspection":      { formType: "vehicle-inspection",        routeSlug: "vehicle-inspection",        label: "Incoming Vehicle Inspection",      docNo: "CFPLA.C3.F.45",  dateField: "inspection_date", listColumns: ["inspection_date", "vendor_name", "vehicle_number", "warehouse"] },
  "outgoing-vehicle-inspection": { formType: "outgoing-vehicle-inspection", routeSlug: "outgoing-vehicle-inspection", label: "Outgoing Vehicle Inspection", docNo: "CFPLA.C5.F.46", dateField: "dispatch_date",  listColumns: ["dispatch_date", "customer_name", "vehicle_number", "warehouse"] },
  "glass-brittle-check":     { formType: "glass-brittle-check",       routeSlug: "glass-brittle-check",       label: "Glass & Brittle Check Record",     docNo: "CFPLA.C4.F.48",  dateField: "year",            listColumns: ["year", "warehouse", "created_by"] },
  // W202 files this as CFPLA.C4.F.47, A185 as CFPLB.C4.RA.04 — same layout,
  // different areas and header block (see config/dailyPestAreas.ts). docNo here
  // is only the list-page fallback; the printed sheet reads the per-plant one.
  "daily-pest-inspection":   { formType: "daily-pest-inspection",     routeSlug: "daily-pest-inspection",     label: "Daily Pest Inspection Report",     docNo: "CFPLA.C4.F.47",  dateField: "month",           listColumns: ["month", "checked_by", "verified_by", "warehouse"] },
  "preventive-maintenance":  { formType: "preventive-maintenance",    routeSlug: "preventive-maintenance",    label: "Preventive Maintenance Checklist", docNo: "CFPLA.C4.F.50a", dateField: "month",           listColumns: ["month", "checked_by", "warehouse"] },
  "new-equipment-clearance": { formType: "new-equipment-clearance",   routeSlug: "new-equipment-clearance",   label: "New Equipment Clearance",          docNo: "CFPLA.C4.F.51",  dateField: "commissioning_date", listColumns: ["commissioning_date", "equipment_name", "warehouse"] },
  "waste-disposal":          { formType: "waste-disposal",            routeSlug: "waste-disposal",            label: "Waste Disposal Record",            docNo: "CFPLA.C4.F.52",  dateField: "month",           listColumns: ["month", "area", "warehouse"] },
  "chemical-preparation":    { formType: "chemical-preparation",      routeSlug: "chemical-preparation",      label: "Chemical Preparation Record",      docNo: "CFPLA.C4.F.53",  dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "deep-cleaning":           { formType: "deep-cleaning",             routeSlug: "deep-cleaning",             label: "Deep Cleaning Record",             docNo: "CFPLA.C4.F.55",  dateField: "month",           listColumns: ["month", "checked_by", "warehouse"] },
  "non-conforming-product":  { formType: "non-conforming-product",    routeSlug: "non-conforming-product",    label: "Non Conforming Product Report",    docNo: "CFPLA.C5.F.57",  dateField: null,              listColumns: ["non_conformity_no", "supplier", "detected_by", "warehouse"] },
  "rework-recycling":        { formType: "rework-recycling",          routeSlug: "rework-recycling",          label: "Re-Work / Re-Cycling / Re-Packing",docNo: "CFPLA.C5.F.58", dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  // ── Training (5) ──
  "training-attendance":     { formType: "training-attendance",       routeSlug: "attendance-sheet",  basePath: "/training", label: "Training Attendance Sheet",        docNo: "CFPLA.C7.F.03",  dateField: "training_date",   listColumns: ["training_date", "conducted_by", "department", "warehouse"] },
  "training-attendance-workers": { formType: "training-attendance-workers", routeSlug: "attendance-workers", basePath: "/training", label: "Training Attendance (Workers)", docNo: "CFPLA.C7.F.03", dateField: null,            listColumns: ["warehouse", "created_at", "created_by"] },
  "training-reference-sheet":{ formType: "training-reference-sheet",  routeSlug: "reference-sheet",  basePath: "/training", label: "Reference Material Sheet",         docNo: "CFPLA.C7.F.03i", dateField: null,              listColumns: ["warehouse", "created_at", "created_by"] },
  "training-feedback":       { formType: "training-feedback",         routeSlug: "feedback",         basePath: "/training", label: "Trainee & Trainer Feedback",       docNo: "CFPLA.C7.F.03j", dateField: "feedback_date",   listColumns: ["feedback_date", "participant_name", "training_program", "warehouse"] },
  "training-card":           { formType: "training-card",             routeSlug: "training-card",    basePath: "/training", label: "Employee Training Card",           docNo: "CFPLA.C7.F.03k", dateField: null,              listColumns: ["employee_name", "designation", "warehouse"] },
}
