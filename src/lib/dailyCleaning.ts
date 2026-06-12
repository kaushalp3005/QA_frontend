// Shared model for the Daily Cleaning Checklist (CFPLA.C4.F.54).
//
// One saved record = one checklist TYPE (tab) for one month, holding one or more
// FLOORS. Each floor has its own day-grid, per-day Checked/Verified signatures and
// notes — IPQC-style. Everything is persisted inside the `grid` JSONB column
// (version 2) so per-day signatures and floor data survive the generic doc API
// (the table only has single checked_by / verified_by columns).

export type CellStatus = "✓" | "✕" | "";

export const DCC_DAYS = 31;

export interface DCCFloor {
  area: string;
  grid: Record<string, Record<number, CellStatus>>;
  checkedByPerDay: Record<number, string>;
  verifiedByPerDay: Record<number, string>;
  observations: string;
  correctiveAction: string;
}

export interface DCCTabDef {
  key: string;
  label: string;
  title: string;
  documentNo: string;
  issueDate: string;
  issueNo: string;
  revDate: string;
  revNo: string;
  defaultArea?: string;
  parameters: string[];
}

export interface NormalizedDCC {
  month: string;
  tabCode: string;
  title: string;
  documentNo: string;
  issueDate: string;
  issueNo: string;
  revDate: string;
  revNo: string;
  parameters: string[];
  floors: DCCFloor[];
}

export const AREA_OPTIONS = [
  "First Floor",
  "Lower Basement",
  "Upper Basement",
  "First Floor Mezzanine",
  "Second Floor",
  "Service Floor",
];

// Toilet checklist shares one parameter set across the Male and Female tabs so the
// two stay identical ("same fields"). Also reused by the legacy "toilet" def below.
const TOILET_PARAMETERS = [
  "Floor Cleaned", "Walls Cleaned", "Wash Basin & mirror Cleaned", "Hand dryer working/Tissue placed",
  "No Cob-webs", "Cleaning chemicals used", "Efficient Water & no leakage", "Liquid Soap Filled",
  "Windows /Mesh", "Properly cleaned", "Free from odor", "Dustbin Empty & Cleaned",
];

export const DCC_TABS: DCCTabDef[] = [
  {
    key: "floor",
    label: "Floor",
    title: "Daily Cleaning Checklist - Floor",
    documentNo: "CFPLA.C4.F.54",
    issueDate: "01/11/2017",
    issueNo: "04",
    revDate: "13/12/2025",
    revNo: "03",
    parameters: [
      "Floor cleaned", "Walls cleaned", "Strip Curtains Cleaned", "Gaps cleaned floor/door/machines",
      "Window / Mesh cleaned", "Racks & pallets are cleaned & dust free", "Stairs are cleaned",
      "No dust on stored product / No Rat droppings", "Rodent Boxes Cleaned", "Sanitization area cleaned",
      "IPA Stations filled", "Dustbins Empty & Cleaned", "No Cob-webs",
    ],
  },
  {
    key: "toilet_male",
    label: "Toilet (Male)",
    title: "Daily Cleaning Checklist - Toilet (Male)",
    documentNo: "CFPLA.C4.F.54a",
    issueDate: "01/11/2017",
    issueNo: "03",
    revDate: "01/11/2025",
    revNo: "02",
    parameters: TOILET_PARAMETERS,
  },
  {
    key: "toilet_female",
    label: "Toilet (Female)",
    title: "Daily Cleaning Checklist - Toilet (Female)",
    documentNo: "CFPLA.C4.F.54a",
    issueDate: "01/11/2017",
    issueNo: "03",
    revDate: "01/11/2025",
    revNo: "02",
    parameters: TOILET_PARAMETERS,
  },
  {
    key: "facility",
    label: "Facility Periphery",
    title: "Daily Housekeeping Cleaning Checklist - Facility Periphery & Security Room",
    documentNo: "CFPLA.C4.F.54b",
    issueDate: "01/11/2017",
    issueNo: "02",
    revDate: "02/01/2025",
    revNo: "01",
    parameters: [
      "Cleaned security cabin and staircase", "Dock area well cleaned & free from scrap",
      "Empty the dustbins & liners changed", "Cleaning of wall & are cob-web free", "Floors are cleaned",
      "Gate/shutters/windows mesh are cleaned", "No gaps between shutter, doors and walls",
      "Nitrogen cylinder/compressed air cylinders area", "Rodaboxes are in places & baited",
      "All area are free from cob-webs", "Fire Box & extinguishers are in place",
    ],
  },
  {
    key: "changing",
    label: "Changing Room",
    title: "Daily Housekeeping Cleaning Checklist - Changing Room",
    documentNo: "CFPLA.C4.F.54c",
    issueDate: "01/11/2017",
    issueNo: "02",
    revDate: "01/10/2025",
    revNo: "01",
    parameters: ["Floor", "Wall", "Ceiling", "No Cobwebs", "No personal belongings"],
  },
  {
    key: "storage",
    label: "Storage",
    title: "Daily Cleaning Checklist - Inward/Outward/Storage Area",
    documentNo: "CFPLA.C4.F.54d",
    issueDate: "01/11/2017",
    issueNo: "03",
    revDate: "01/11/2025",
    revNo: "02",
    parameters: [
      "Floor Cleaned", "Walls Cleaned", "No cob-webs", "Shutter/doors/window cleaned & gap free",
      "No Dust on Bags", "No pest activity", "Rodent Boxes cleaned", "Strip Curtains Cleaned",
      "Pallet cleaned & cob-web free", "IPA stations filled",
      "Material Stacked on clean Pallets and away from wall", "Sample Inspection Room Cleaned",
      "Lifts/Forklift Cleaned & Cob-Web free",
    ],
  },
  {
    key: "service",
    label: "Service Floor",
    title: "Daily Cleaning Checklist - FLOOR Service",
    documentNo: "CFPLA.C4.F.54e",
    issueDate: "01/11/2017",
    issueNo: "04",
    revDate: "13/12/2025",
    revNo: "03",
    defaultArea: "Service Floor",
    parameters: [
      "Floor Cleaned", "Walls Cleaned", "Strip Curtains Cleaned", "Gaps cleaned floor/door/machines",
      "Window / Mesh Cleaned", "Racks & pallets are cleaned & dust free", "Stairs are cleaned",
      "No dust on stored product / No Rat droppings", "Rodent Boxes Cleaned", "Sanitization area cleaned",
      "Dustbins Empty & Cleaned", "No Cob-webs", "Diesel drums are stored in designated place.",
    ],
  },
];

// Retired tab codes kept only so previously-saved records still resolve their
// document metadata (issue/revision numbers). Not shown on the create page.
const LEGACY_DCC_TABS: DCCTabDef[] = [
  {
    key: "toilet",
    label: "Toilet",
    title: "Daily Cleaning Checklist - Toilet",
    documentNo: "CFPLA.C4.F.54a",
    issueDate: "01/11/2017",
    issueNo: "03",
    revDate: "01/11/2025",
    revNo: "02",
    parameters: TOILET_PARAMETERS,
  },
];

export function getTabDef(tabCode: string): DCCTabDef | undefined {
  return DCC_TABS.find((t) => t.key === tabCode) || LEGACY_DCC_TABS.find((t) => t.key === tabCode);
}

export function emptyFloor(parameters: string[], defaultArea = ""): DCCFloor {
  const grid: Record<string, Record<number, CellStatus>> = {};
  parameters.forEach((p) => {
    grid[p] = {};
    for (let d = 1; d <= DCC_DAYS; d++) grid[p][d] = "";
  });
  return { area: defaultArea, grid, checkedByPerDay: {}, verifiedByPerDay: {}, observations: "", correctiveAction: "" };
}

function normCell(v: unknown): CellStatus {
  return v === "✓" || v === "✕" ? v : "";
}

function parseGrid(raw: any, parameters: string[]): Record<string, Record<number, CellStatus>> {
  const out: Record<string, Record<number, CellStatus>> = {};
  const params = parameters.length ? parameters : raw && typeof raw === "object" ? Object.keys(raw) : [];
  params.forEach((p) => {
    out[p] = {};
    for (let d = 1; d <= DCC_DAYS; d++) {
      out[p][d] = normCell(raw?.[p]?.[d] ?? raw?.[p]?.[String(d)]);
    }
  });
  return out;
}

function parsePerDay(raw: any): Record<number, string> {
  const out: Record<number, string> = {};
  for (let d = 1; d <= DCC_DAYS; d++) out[d] = String(raw?.[d] ?? raw?.[String(d)] ?? "");
  return out;
}

/** Convert a raw API record (new v2 or legacy flat format) into editable state. */
export function normalizeDCC(data: any): NormalizedDCC {
  const g = data?.grid;
  const isNew = g && !Array.isArray(g) && g.version === 2 && Array.isArray(g.floors);

  if (isNew) {
    const tabCode: string = g.tab_code || data.tab_code || "";
    const def = getTabDef(tabCode);
    const parameters: string[] =
      g.parameters || (g.floors[0]?.grid ? Object.keys(g.floors[0].grid) : def?.parameters || []);
    return {
      month: data.month || "",
      tabCode,
      title: g.title || def?.title || "Daily Cleaning Checklist",
      documentNo: g.document_no || def?.documentNo || data.tab_code || "CFPLA.C4.F.54",
      issueDate: def?.issueDate || "01/11/2017",
      issueNo: def?.issueNo || "04",
      revDate: def?.revDate || "13/12/2025",
      revNo: def?.revNo || "03",
      parameters,
      floors: g.floors.map((f: any) => ({
        area: f.area || "",
        grid: parseGrid(f.grid, parameters),
        checkedByPerDay: parsePerDay(f.checkedByPerDay),
        verifiedByPerDay: parsePerDay(f.verifiedByPerDay),
        observations: f.observations || "",
        correctiveAction: f.correctiveAction || "",
      })),
    };
  }

  // Legacy flat format: grid = { param: { day: status } }; per-day signatures were
  // never persisted (dropped by the backend), so they come back empty.
  const parameters = g && typeof g === "object" && !Array.isArray(g) ? Object.keys(g) : [];
  const tabCode: string = data.tab_code || "";
  const def = getTabDef(tabCode);
  return {
    month: data.month || "",
    tabCode,
    title: data.title || def?.title || "Daily Cleaning Checklist",
    documentNo: data.document_no || def?.documentNo || "CFPLA.C4.F.54",
    issueDate: def?.issueDate || "01/11/2017",
    issueNo: def?.issueNo || "04",
    revDate: def?.revDate || "13/12/2025",
    revNo: def?.revNo || "03",
    parameters,
    floors: [
      {
        area: data.area || "",
        grid: parseGrid(g, parameters),
        checkedByPerDay: parsePerDay(data.checked_by_per_day),
        verifiedByPerDay: parsePerDay(data.verified_by_per_day),
        observations: data.observations || "",
        correctiveAction: data.corrective_action || "",
      },
    ],
  };
}

/** Build the create/update payload. Per-day signatures + floors live in the grid JSONB. */
export function buildDCCPayload(opts: {
  month: string;
  tabCode: string;
  title: string;
  documentNo: string;
  parameters: string[];
  floors: DCCFloor[];
  warehouse: string | null;
}): Record<string, unknown> {
  return {
    month: opts.month,
    tab_code: opts.tabCode,
    area: opts.floors.map((f) => f.area).filter(Boolean).join(", "),
    observations: opts.floors.map((f) => f.observations).filter(Boolean).join(" | "),
    corrective_action: opts.floors.map((f) => f.correctiveAction).filter(Boolean).join(" | "),
    warehouse: opts.warehouse,
    grid: {
      version: 2,
      tab_code: opts.tabCode,
      title: opts.title,
      document_no: opts.documentNo,
      parameters: opts.parameters,
      floors: opts.floors.map((f) => ({
        area: f.area,
        grid: f.grid,
        checkedByPerDay: f.checkedByPerDay,
        verifiedByPerDay: f.verifiedByPerDay,
        observations: f.observations,
        correctiveAction: f.correctiveAction,
      })),
    },
  };
}
