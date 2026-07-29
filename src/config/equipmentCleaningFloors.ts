// frontend/src/config/equipmentCleaningFloors.ts
//
// Floor → equipment lists for the Equipment Cleaning & Sanitation form.
// Shared between the create page and the print page so entry numbering and
// printed numbering never drift apart.
//
// W202 uses the generic CFPLA.C4.F.19 floor set. A185 uses its own
// CFPLB.C4.F.68 floor set (Production / Packing / Mezzanine), plus an
// "Overall" section for equipment that's NOT in daily use (checked monthly).

export const W202_EQUIPMENT_LIST = [
  "Weight Machine", "Sealing Machine", "Foot Sealer", "Strapping Machine", "Shrink Wrap Machine",
  "Web Sealer", "Pet Sealer", "Metal Detector", "Vacuum Machine", "FSS Machine", "Tray Roaster",
  "Flow Wrap Machines", "Oven-Roasting", "Mixers", "Cutter", "Slicer", "X-Ray Machine", "Cup Sealer",
  "Chocolate Enrober", "Dicer", "Blast Freezer", "Deep Freezer", "Sorting Tables", "Roasting Tray",
  "Coating Pan", "Salinity Tank", "Blancher", "Sheet & Cut Machine", "Paddle Mixer", "Pulveriser",
  "Tempering Machine", "Kruger Machine", "Manual Cutter", "Vibro Shifter", "Destoner",
  "Hand Magnet", "Vacuum Packing Machine",
];

export const W202_FLOOR_EQUIPMENT: Record<string, string[]> = {
  "Lower Basement": ["Shrink Wrap Machine", "Pet Sealer", "Vacuum Machine", "Strapping Machine", "L-sealer", "Web Sealer", "Foot Sealer", "Hand Sealer", "Weight Machine", "Sealing Machine", "Sorting Tables", "Hand Magnet"],
  "Upper Basement": ["Metal Detector", "Magnet", "Weight Machine", "Sealing Machine", "Sorting Tables", "Strapping Machine"],
  "First Floor": ["Metal Detector", "FFS Machine", "Destoner", "Vibro Shifter", "Strapping Machine", "Magnet", "Weight Machine", "Sealing Machine", "Sorting Tables"],
  "First Floor Mezz": ["Metal Detector", "FFS Machine", "Magnet", "Weight Machine", "Sealing Machine", "Foot Sealer", "Sorting Tables", "Vacuum Packing Machine"],
  "Second Floor": ["Kruger Machine", "Sheet & Cut Machine", "Manual Cutter", "Oven-Roasting", "Tray Roaster", "Roasting Tray", "Tempering Machine", "Chocolate Enrober", "Flow Wrap Machines", "X-Ray Machine", "Coating Pan", "Paddle Mixer", "Slicer", "Mixers", "Pulveriser", "Magnet", "Deep Freezer", "Weight Machine", "Sealing Machine", "Shrink Wrap Machine", "Foot Sealer"],
  "Terrace Floor": ["Coating Pan", "Slicer", "Dicer", "Blancher", "Magnet", "Salinity Tank", "Sorting Tables", "Weight Machine", "Sealing Machine", "Foot Sealer", "Vacuum Machine", "Tray Roaster", "Roasting Tray"],
  "Other / All": W202_EQUIPMENT_LIST,
};

// Source: 68) CFPLB.C4.F.68 Equipment Cleaning (185).pdf
// The source PDF's own Sr. No column skips 28–29 on the Production Floor
// section (a numbering slip in the physical document) — renumbered 1–34
// here with no equipment dropped.
export const A185_FLOOR_EQUIPMENT: Record<string, string[]> = {
  "Production Floor": [
    "Tray Roaster Machine",
    "Puffer",
    "Cooling Tumbler Blower 1",
    "Cooling Tumbler Blower 2",
    "Preheater (Roasting Machine)",
    "Coating Pan (Seasoning)",
    "Coating Pan (Trail Mix)",
    "Trays and Trolleys of Roaster",
    "Slurry Kettle 1",
    "Slurry Kettle 2",
    "Nested Feeder 1",
    "Nested Feeder 2",
    "Inclined Conveyor A",
    "Inclined Conveyor B",
    "Scarf Feeder",
    "Buffer Shifter",
    "Syrup Tank 1",
    "Syrup Tank 2",
    "Pan Coater 1",
    "Pan Coater 2",
    "Pan Coater 3",
    "Collection Conveyor 1",
    "Collection Conveyor 2",
    "Collection Conveyor 3",
    "Main Transfer Conveyor",
    "Powder Hopper",
    "Screw Conveyor",
    "Ribbon Blender",
    "Conveyor with Divertor",
    "Salinity Tank 1",
    "Salinity Tank 2",
    "Extruder",
    "Dewatering Tumbler",
    "Pipes (In Between Product Transfer)",
  ],
  "Packing Floor": [
    "Metal Detector Seed 1",
    "Metal Detector Seed 2",
    "Metal Detector",
    "Sealing Machine 1",
    "Sealing Machine 2",
    "Weighing Balance",
    "Vibrosifter",
    "Hand Magnets",
    "Bucket Elevator",
    "Weighing Belt",
    "Destoner Machine & Vibrosifter",
    "Induction Sealer Machine",
    "Strapping Machine",
    "PFS and Metal Detector",
    "FFS and Metal Detector",
    "Weighing Utensils",
    "Inspection Conveyor",
    "Hopper",
    "Sorting Tables (1-16)",
  ],
  "Mezzanine Floor": [
    "PFS Hopper",
    "FFS Hopper",
    "Sorting Tables",
    "Cross Feeder 1",
    "Cross Feeder 2",
    "Cross Feeder 3",
    "Z Conveyor",
    "Distribution Unit",
    "Sorting Tables (1-4)",
  ],
};

// "Ideal machine" section of CFPLB.C4.F.68 — equipment NOT in daily use, checked
// monthly (Jan–Dec) and shrink-wrapped after cleaning, rather than the daily
// Before/After-production grid used by the three floors above.
export const A185_OVERALL_EQUIPMENT = [
  "Hopper (Production Area)",
  "Conveyor (Production Floor)",
  "FFS Machine (FG Area)",
  "Rewinding Machine (Packaging Area)",
  "Pet Sealer (Storage Area)",
  "Vacuum Oven (Lab)",
  "Cross Feeder (Mezzanine Area)",
];

// Floor-dropdown label for that section, and the value stored in the record's
// `area` column / `notesByFloor` keys. Renamed from "Overall"; records saved
// under the old name are still recognised via A185_OVERALL_LEGACY_KEYS below.
export const A185_OVERALL_KEY = "Ideal machine";

/** Names this section was stored under before the rename. */
export const A185_OVERALL_LEGACY_KEYS = ["Overall"];

/** True for the current name or any name this section used to be saved under. */
export function isOverallFloor(name: string): boolean {
  return name === A185_OVERALL_KEY || A185_OVERALL_LEGACY_KEYS.includes(name);
}

/**
 * Re-key per-floor notes saved under a legacy section name onto the current one,
 * so notes written against "Overall" keep showing after the rename. Notes already
 * under the current key win.
 */
export function migrateOverallNotesKey<T>(notes: Record<string, T>): Record<string, T> {
  const out = { ...notes };
  for (const legacy of A185_OVERALL_LEGACY_KEYS) {
    if (legacy in out) {
      if (!(A185_OVERALL_KEY in out)) out[A185_OVERALL_KEY] = out[legacy];
      delete out[legacy];
    }
  }
  return out;
}

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
