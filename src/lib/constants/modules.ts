export const SUPER_ADMIN_EMAILS = [
  "pooja.parkar@candorfoods.in",
  "ai2@candorfoods.in",
] as const;

// Kept for any single-email lookups; first email is the primary super admin.
export const SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0];

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return SUPER_ADMIN_EMAILS.some((a) => a.toLowerCase() === e);
}

export const COMPANIES = ["CFPL", "CDPL"] as const;
export type CompanyCode = (typeof COMPANIES)[number];

export const QC_MODULES: { code: string; label: string }[] = [
  { code: "complaints", label: "Complaints" },
  { code: "license_tracker", label: "License Tracker" },
  { code: "vendor_coa", label: "Vendor COA" },
  { code: "rca_capa", label: "RCA/CAPA" },
  { code: "fishbone", label: "FishBone Method" },
  { code: "lab_reports", label: "Lab Reports" },
  { code: "documentations", label: "Documentations" },
  { code: "training", label: "Training" },
  { code: "ni_report", label: "NI Report" },
];

export const PERMISSION_FLAGS = [
  "can_access",
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
] as const;
export type PermissionFlag = (typeof PERMISSION_FLAGS)[number];

export const PERMISSION_LABELS: Record<PermissionFlag, string> = {
  can_access: "Access",
  can_view: "View",
  can_create: "Create",
  can_edit: "Edit",
  can_delete: "Delete",
};
