// Ordered list of documentation forms for prev/next navigation between their create pages.
// `slug` is the folder name under /documentations; `createSubpath` is the subroute with the form
// (usually "create", but ipqc uses "new" and metaldetector uses "entry").

export interface DocNavEntry {
  slug: string;
  label: string;
  createSubpath: string;
}

export const DOC_NAV_ORDER: DocNavEntry[] = [
  { slug: "ipqc", label: "IPQC", createSubpath: "new" },
  { slug: "productweightcheck", label: "Product Weight & Sealing Check", createSubpath: "create" },
  { slug: "productiontoolissuance", label: "Production Tool Issuance", createSubpath: "create" },
  { slug: "dailycleaningchecklist", label: "Daily Cleaning Checklist", createSubpath: "create" },
  { slug: "equipmentcleaningsanitation", label: "Equipment Cleaning & Sanitation", createSubpath: "create" },
  { slug: "preproductioninspection", label: "Pre-Production Inspection", createSubpath: "create" },
  { slug: "lineclearancerecord", label: "Line Clearance Record", createSubpath: "create" },
  { slug: "personalhygienecheckup", label: "Personal Hygiene & Health Checkup", createSubpath: "create" },
  { slug: "roastingtemperature", label: "Roasting Temperature & Time", createSubpath: "create" },
  { slug: "weighingscalecalibration", label: "Weighing Scale Calibration", createSubpath: "create" },
  { slug: "water-analysis", label: "Water Analysis Record", createSubpath: "create" },
  { slug: "incident-report", label: "Food Safety Incident Report", createSubpath: "create" },
  { slug: "safety-meeting", label: "Food Safety Meeting Minutes", createSubpath: "create" },
  { slug: "new-product-verification", label: "New Product Verification", createSubpath: "create" },
  { slug: "mock-drill", label: "Emergency Mock Drill", createSubpath: "create" },
  { slug: "gmp-ghp-inspection", label: "Monthly GMP & GHP Inspection", createSubpath: "create" },
  { slug: "temperature-humidity", label: "Temperature & Humidity Record", createSubpath: "create" },
  { slug: "inprocess-qc-record", label: "In-process Quality Check", createSubpath: "create" },
  { slug: "gmp-schedule", label: "Monthly GMP Schedule", createSubpath: "create" },
  { slug: "inward-rm-check", label: "Inward Raw Material Check", createSubpath: "create" },
  { slug: "fg-chemical-analysis", label: "Finished Good Chemical Analysis", createSubpath: "create" },
  { slug: "eyewash-refill", label: "Eye Wash Bottle Refilling", createSubpath: "create" },
  { slug: "first-aid-box", label: "First Aid Box Record", createSubpath: "create" },
  { slug: "traceability", label: "Traceability Report", createSubpath: "create" },
  { slug: "lux-monitoring", label: "Lux Monitoring Record", createSubpath: "create" },
  { slug: "pre-weighing", label: "Pre Weighing Check Record", createSubpath: "create" },
  { slug: "fly-catcher", label: "Daily Fly Catcher Check", createSubpath: "create" },
  { slug: "ccp-roasting-bar", label: "CCP Roasting (Bar Line)", createSubpath: "create" },
  { slug: "vehicle-inspection", label: "Incoming Vehicle Inspection", createSubpath: "create" },
  { slug: "outgoing-vehicle-inspection", label: "Outgoing Vehicle Inspection", createSubpath: "create" },
  { slug: "glass-brittle-check", label: "Glass & Brittle Check Record", createSubpath: "create" },
  { slug: "preventive-maintenance", label: "Preventive Maintenance Checklist", createSubpath: "create" },
  { slug: "new-equipment-clearance", label: "New Equipment Clearance", createSubpath: "create" },
  { slug: "waste-disposal", label: "Waste Disposal Record", createSubpath: "create" },
  { slug: "chemical-preparation", label: "Chemical Preparation Record", createSubpath: "create" },
  { slug: "deep-cleaning", label: "Deep Cleaning Record", createSubpath: "create" },
  { slug: "non-conforming-product", label: "Non Conforming Product Report", createSubpath: "create" },
  { slug: "rework-recycling", label: "Re-Work / Re-Cycling / Re-Packing", createSubpath: "create" },
  { slug: "metaldetector", label: "Metal Detector", createSubpath: "entry" },
  { slug: "xray", label: "X-Ray", createSubpath: "create" },
];

export function findCreatePageIndex(pathname: string): number {
  return DOC_NAV_ORDER.findIndex((e) => pathname === `/documentations/${e.slug}/${e.createSubpath}`);
}
