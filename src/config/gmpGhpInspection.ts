// frontend/src/config/gmpGhpInspection.ts
//
// Per-plant document metadata for the Monthly Facility (GMP) & GHP Inspection
// print sheet.
//
// Sources (both in /docs):
//   W202 → "15)CFPLA.C3.F.15 Monthly Facility (GMP) & GHP Inspection.pdf" — 77 items, total 170
//   A185 → "1)CFPLB.C3.F.01 Monthly Facility (GMP) & GHP Inspection.pdf"  — 74 items, total 164
//
// The two formats share the same checklist wording but differ in item count:
// W202 carries three extra Terrace items (Sr. 20–22) that A185 doesn't have, so
// every Sr. No. after them is shifted by 3. That's why the section boundaries and
// scoring-card maximums below are held per plant rather than derived.

export interface GmpGhpFormat {
  documentNo: string;
  issueDate: string;
  issueNo: string;
  revDate: string;
  revNo: string;
  /** Section heading → Sr. No. the section starts at, in printed order. */
  sections: { title: string; startSr: number }[];
  /** Scoring-card rows, exactly as the source format prints them. */
  scoringCard: { label: string; max: number; fromSr: number; toSr: number }[];
  /** Scoring-card "Total Score" maximum as printed on the format. */
  totalMax: number;
}

const W202: GmpGhpFormat = {
  documentNo: "CFPLA.C3.F.15",
  issueDate: "05/01/2023",
  issueNo: "5",
  revDate: "28/08/2025",
  revNo: "4",
  sections: [
    { title: "MANUFACTURING", startSr: 1 },
    { title: "Facility and House keeping", startSr: 3 },
    { title: "Control of operations", startSr: 24 },
    { title: "Personal Hygiene", startSr: 37 },
    { title: "Equipment and fixtures", startSr: 46 },
    { title: "Pest control", startSr: 53 },
    { title: "Training and Complaint handling", startSr: 59 },
    { title: "Documentation and Record keeping", startSr: 64 },
    { title: "COLD STORAGE & WAREHOUSE", startSr: 68 },
    { title: "TRANSPORT", startSr: 72 },
  ],
  // NOTE: the printed CFPLA.C3.F.15 scoring card says 142 / 10 / 18, but the
  // items themselves sum to 144 / 10 / 16 — two offsetting typos in the source
  // document (both give the same 170 total). The print page sums the record's
  // own item maximums instead, so the per-section percentages come out right;
  // these figures are only the fallback when a section has no rows.
  scoringCard: [
    { label: "Manufacturing and facility", max: 144, fromSr: 1, toSr: 67 },
    { label: "Cold storage and warehouse", max: 10, fromSr: 68, toSr: 71 },
    { label: "Transport", max: 16, fromSr: 72, toSr: 77 },
  ],
  totalMax: 170,
};

const A185: GmpGhpFormat = {
  documentNo: "CFPLB.C3.F.01",
  issueDate: "01/08/2024",
  issueNo: "02",
  revDate: "02/02/2026",
  revNo: "01",
  sections: [
    { title: "MANUFACTURING", startSr: 1 },
    { title: "Facility and House keeping", startSr: 3 },
    { title: "Control of operations", startSr: 21 },
    { title: "Personal Hygiene", startSr: 34 },
    { title: "Equipment and fixtures", startSr: 43 },
    { title: "Pest control", startSr: 50 },
    { title: "Training and Complaint handling", startSr: 56 },
    { title: "Documentation and Record keeping", startSr: 61 },
    { title: "COLD STORAGE & WAREHOUSE", startSr: 65 },
    { title: "TRANSPORT", startSr: 69 },
  ],
  scoringCard: [
    { label: "Manufacturing and facility", max: 138, fromSr: 1, toSr: 64 },
    { label: "Cold storage and warehouse", max: 10, fromSr: 65, toSr: 68 },
    { label: "Transport", max: 16, fromSr: 69, toSr: 74 },
  ],
  totalMax: 164,
};

export function gmpGhpFormatFor(warehouse: string | null | undefined): GmpGhpFormat {
  return warehouse === "A185" ? A185 : W202;
}

/** Audit rating chart, identical on both formats. */
export const GMP_RATING_CHART = [
  { range: "Above 85%", status: "Excellent", rating: "A" },
  { range: "70-85%", status: "Average – Improvement needed", rating: "B" },
  { range: "Below 70", status: "Poor – Urgent attention needed", rating: "C" },
];
