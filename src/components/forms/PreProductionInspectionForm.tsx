"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Time12Picker from "@/components/Time12Picker";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { PRODUCTION_INCHARGE_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";

type Status = "OK" | "NOT OK" | "";

interface CheckItem {
  sr: number;
  particular: string;
  checkpoint: string;
  status: Status;
  correctiveAction: string;
}

interface AreaSection {
  area: string;
  items: CheckItem[];
  lineStatus: string;
  timeOfInspection: string;
  timeOfVerification: string;
  checkedBy: string;
  verifiedBy: string;
}

const INITIAL_SECTIONS: AreaSection[] = [
  {
    area: "Production Floor (General)",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Waste/Trash Area", checkpoint: "Waste bins are empty and clean at the dedicated area.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Production Floor/ceilings/wall", checkpoint: "The area is clean and debris-free. Floors, walls, windows, coving, cable trays, and ceilings are clean and free from dust and cobwebs. Dry and wet waste materials are properly contained and removed from the processing area.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Hygiene Filler Equipment", checkpoint: "Equipment soap solution, hand soap solution, and sanitizer bottles are in place, clean, and filled with solutions, with proper labels.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Handwash Station", checkpoint: "The washbasin, foot-operated taps, and hand dryer are clean & in working condition. No leakage is found. Cleaning tanks are clean & without any remnants of material.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Pest Control", checkpoint: "No pest activity observed; roadboxes are in place and intact, free from rodents & droppings on the floor or equipment or products stored on pallets, and cable trays and fly catchers are operational. Check for tubelight & gluepad integrity.", status: "", correctiveAction: "" },
      { sr: 6, particular: "Personal Hygiene", checkpoint: "Uniforms are clean, hairnets are worn properly, and there is no unauthorized jewelry. Workers' nails aren't grown, and no bandages or gloves are worn while handling the food.", status: "", correctiveAction: "" },
      { sr: 7, particular: "Weighing Scales", checkpoint: "Calibrate scales for accuracy; check cleaning of all surfaces of scales and stands.", status: "", correctiveAction: "" },
      { sr: 8, particular: "Sorting Tables", checkpoint: "Ensure tables are clean and sanitized. Check that table-mounted tube coverings are clean and dust-free. Check the cleaning of switchboards and stools/chairs and tubelights' integrity.", status: "", correctiveAction: "" },
      { sr: 9, particular: "SS Bowl/Sieves/SS Tray/Bottom", checkpoint: "No remnants of the previous material. Visual observation of clean, dry, and chemical-odor-free. Check sieve integrity.", status: "", correctiveAction: "" },
      { sr: 10, particular: "Light Intensity", checkpoint: "Before starting production, check the intensity of the lights on the tables and floor. All tubes are in working condition.", status: "", correctiveAction: "" },
      { sr: 11, particular: "Packaging Material", checkpoint: "Printed packaging and labels from the previous production have been removed from the line before changing to the next production.", status: "", correctiveAction: "" },
      { sr: 12, particular: "Glass, Brittle Acrylic, and Fiber Material", checkpoint: "Check all the glass, brittle, acrylic, and fibrous material on the floor and production line. They should be properly numbered and without any damage or cracks.", status: "", correctiveAction: "" },
      { sr: 13, particular: "Metallic Pens", checkpoint: "Only metallic pens are used by all personnel working in the production area.", status: "", correctiveAction: "" },
      { sr: 14, particular: "AC", checkpoint: "The AC is clean and in working condition with no damage or leakage. Temperature & humidity are maintained.", status: "", correctiveAction: "" },
      { sr: 15, particular: "Pallets/Crates", checkpoint: "Pallets and crates are clean as per frequency. Free from product residue, pests & cobwebs.", status: "", correctiveAction: "" },
      { sr: 16, particular: "Temporary Repairs and Nuts Bolts", checkpoint: "Free from any temporary repairs and loose metallic nuts and tools.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Lower Basement",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Shrink Wrap Machine/L-sealer/Web-sealer/Hand sealer/Foot sealer", checkpoint: "The wheels, conveyor belt, and covering of the conveyor belt are clean and without any signs of wear or damage. Check the cleanliness of the switchboard and any sign of damage. Heating sensors, Teflon tape integrity.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Pet Sealer", checkpoint: "The conveyor belt is clean without any signs of wear or damage. Check heating sensors.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Vacuum Machine", checkpoint: "Check that the conveyor belt, vacuum pipe, and Teflon tape are clean and without any signs of wear or damage. The switchboard/display panel is without any damage. Heating sensors, Teflon tape integrity.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Strapping Machine", checkpoint: "Check that the conveyor belt, vacuum pipe, and Teflon tape are clean and without any signs of wear or damage. The switchboard/display panel is without any damage.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Upper Basement",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Metal Detector", checkpoint: "Ensure the metal detector machine is calibrated with standard probes and working properly. Check the conveyor belt cleanliness and dust-free status for smooth operation.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "First Floor",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Metal Detector", checkpoint: "Ensure the metal detector machine is calibrated with standard probes and working properly. Check the conveyor belt cleanliness and dust-free status for smooth operation.", status: "", correctiveAction: "" },
      { sr: 2, particular: "FFS Machine", checkpoint: "Check cleanliness for the feeding hopper, collar, and the conveyor belt. No remnants of previous material. Free from any chemical odor. Ensure the metal detector machine of FFS is calibrated with standard probes and working properly.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Destoner", checkpoint: "Check cleanliness for the feeding hopper, conveyor belt, and outlet. No remnants of previous material. Free from any chemical odor.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Vibroshifter", checkpoint: "Check cleanliness for the sieves, outlets, and wheels of the vibroshifter. No remnants of previous material. Free from any chemical odor. Check whether the sieves are as per the required specification according to the product.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Strapping Machine", checkpoint: "Check that the conveyor belt, vacuum pipe, and Teflon tape are clean and without any signs of wear or damage. The switchboard/display panel is without any damage.", status: "", correctiveAction: "" },
      { sr: 6, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "First Floor Mezz",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Metal Detector", checkpoint: "Ensure the metal detector machine is calibrated with standard probes and working properly. Check the conveyor belt cleanliness and dust-free status for smooth operation.", status: "", correctiveAction: "" },
      { sr: 2, particular: "FFS Machine", checkpoint: "Check cleanliness for the feeding hopper, collar, and the conveyor belt. No remnants of previous material. Free from any chemical odor. Ensure the metal detector machine of FFS is calibrated with standard probes and working properly.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Second Floor / Second Floor Mezzanine",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Kruger Bar Moulding Machine", checkpoint: "Product contact surfaces are clean, sanitized, and debris-free; Check cleanliness for the feeding hopper, roller, shafts, bar molds, and conveyor belts; verify that all guards and safety devices are in place and operational. Check for any signs of wear or damage. No remnants of previous material.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Sheeting and Cutting Machine/Manual Cutter", checkpoint: "No remnants of the previous material. Observe for the clean, dry, and chemical-odor-free parts. Product contact surfaces are clean and sanitized. Ensure the feeding hopper is clean and free from blockages. Inspect the conveyor belt, cutting blades, and cutting surfaces for cleanliness.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Hot Air Oven/Roaster", checkpoint: "Check the cleanliness of door gaps, oven base, corners, or any openings. No remnants of the previous material. Observe for the clean, dry, and chemical-odor-free parts. Check the door seals, hinges, gaskets, and switchboard for any signs of wear or damage.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Trolleys/Roasting Trays", checkpoint: "Check the cleanliness of the trays, trolleys, corners, and wheels of the trolley. No remnants of the previous material. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Selmi Chocolate Machine", checkpoint: "No remnants of the previous material in the tank. The blending slate, tank, and chocolate pouring knobs are clean and sanitized. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
      { sr: 6, particular: "Chocolate Enrobing Machine", checkpoint: "No remnants of the previous material in the tank, conveyor belt, and cleaning box. The blending slates, tank, and chocolate pouring knobs or attachments are clean and sanitized. Observe for the clean, dry, and chemical-odor-free parts. Check for the integrity of the tube lights.", status: "", correctiveAction: "" },
      { sr: 7, particular: "Flow Wrap Machine", checkpoint: "No remnants of the previous material in the conveyor or product contact surfaces. Observe for the clean, dry, and chemical-odor-free parts. Check for the correct laminate roll loaded & details to be printed.", status: "", correctiveAction: "" },
      { sr: 8, particular: "X-Ray Machine", checkpoint: "Ensure the X-ray machine is calibrated and working properly. Check the conveyor for smooth operation and visual observation of cleanliness and dust-free operation.", status: "", correctiveAction: "" },
      { sr: 9, particular: "Pan Coater", checkpoint: "Check whether the inner & outer surfaces of the coating tank and cooling vent/pipe are clean & sanitized. No remnants of the previous material. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
      { sr: 10, particular: "Paddle Mixer", checkpoint: "Observe for the clean, dry, and chemical-odor-free parts. No remnants of the previous material. Covers/outlet guards are in place, and paddles are secure and undamaged. The mixing/blending paddle, mixing bowl, and all the food contact surfaces are cleaned & sanitized.", status: "", correctiveAction: "" },
      { sr: 11, particular: "Slicer/Mixers/Pulverizer Machine", checkpoint: "Ensure that all the food contact surfaces, attachments, and corners are well cleaned and ready to use. Ensure the feeding hopper is clean and free from blockages. Check the blade's intactness and integrity.", status: "", correctiveAction: "" },
      { sr: 12, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
      { sr: 13, particular: "Deep Freezer", checkpoint: "Observe for cleanliness and chemical-odor-free.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Terrace Floor",
    lineStatus: "Ready", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 14, particular: "Pan Coater", checkpoint: "Check whether the inner & outer surfaces of the coating tank are clean & sanitized. No remnants of the previous material. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
      { sr: 15, particular: "Slicer/Dicer Machine/Slivering Machine", checkpoint: "Ensure that all the food contact surfaces, attachments, and corners are well cleaned and ready to use. Ensure the feeding hopper is clean and free from blockages. Check the blade's intactness and integrity.", status: "", correctiveAction: "" },
      { sr: 16, particular: "Blancher Machine", checkpoint: "Ensure that the machine is well cleaned and ready to use. The water bath is well cleaned with all sensors and valves in working condition. The wire net buckets are cleaned properly, and the mesh integrity is maintained. The blancher's sprockets are in good condition & cleaned.", status: "", correctiveAction: "" },
      { sr: 17, particular: "Magnet", checkpoint: "Magnets in the production line are cleaned.", status: "", correctiveAction: "" },
      { sr: 18, particular: "Tank", checkpoint: "No remnants of the previous material in the tank. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
    ],
  },
];

// The first entry ("Production Floor (General)") holds the 16 general points.
// Those same points appear at the top of every floor's checklist, but the
// standalone "Production Floor (General)" tab itself is not shown.
const GENERAL_ITEMS: CheckItem[] = INITIAL_SECTIONS[0].items;

// Drop the standalone General section, then prepend the 16 general points to
// every remaining floor area, renumbering Sr. sequentially.
const SECTIONS_WITH_GENERAL: AreaSection[] = INITIAL_SECTIONS
  .filter((_, idx) => idx !== 0)
  .map((s) => {
    const merged = [...GENERAL_ITEMS, ...s.items];
    return { ...s, items: merged.map((it, i) => ({ ...it, sr: i + 1 })) };
  });

const withDefaults: AreaSection[] = SECTIONS_WITH_GENERAL.map((s) => ({
  ...s,
  items: s.items.map((i) => ({ ...i, status: "OK" as Status })),
}));

// ── A185 variant (CFPLB.C6.F.47) ────────────────────────────────────────────
// A185 uses a different checklist. Like W202, the "General" checkpoints are not
// a standalone tab — they are prepended to the top of every area's checklist
// (Packing area, Production floor). The General entry below is only the source
// of those shared points and is dropped as a standalone section.
const A185_INITIAL_SECTIONS: AreaSection[] = [
  {
    area: "General",
    lineStatus: "", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Waste/Trash Area", checkpoint: "Waste bins are empty and clean at the dedicated area.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Production Floor/Ceilings/walls", checkpoint: "The area is clean and debris-free. Floors, walls, windows, coving, cable trays, and ceilings are clean and free from dust and cobwebs. Dry and wet waste materials are properly contained and removed from the processing area.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Hygiene Filler Equipment", checkpoint: "Equipment soap solution, hand wash solution and sanitizer bottles are in place, clean, and filled with solutions, with proper labels.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Hand wash station", checkpoint: "The washbasin, foot-operated taps, and hand dryer are clean & in working condition. No leakage is found. Cleaning tanks are clean & without any remnants of material.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Pest Control", checkpoint: "No pest activity observed; roadboxes are in place and intact, free from rodents & droppings on floor or equipment or products stored on pallets, cable tray, and fly catchers are operational. Check for tube light & glue pad integrity.", status: "", correctiveAction: "" },
      { sr: 6, particular: "Personal Hygiene", checkpoint: "Uniforms are clean, hairnets are worn properly, and there is no unauthorized jewelry. Workers' nails aren't grown, no bandages and gloves are worn while handling the food.", status: "", correctiveAction: "" },
      { sr: 7, particular: "Weighing Scales", checkpoint: "Calibrate scales for accuracy; check cleaning of all surfaces of scales and stands.", status: "", correctiveAction: "" },
      { sr: 8, particular: "SS Bowl/Sieves/SS Tray/Bottom", checkpoint: "No remnants of the previous material. Visual observation of clean, dry, and chemical-odor-free. Check sieve integrity.", status: "", correctiveAction: "" },
      { sr: 9, particular: "Light intensity", checkpoint: "Before starting production, check the intensity of the lights on the tables and floor. All tubes are in working condition.", status: "", correctiveAction: "" },
      { sr: 10, particular: "Packaging material", checkpoint: "Printed packaging and labels from the previous production have been removed from the line before changing to the next production. Is the batch coding as per the legal requirement.", status: "", correctiveAction: "" },
      { sr: 11, particular: "Glass, brittle acrylic, and fiber material", checkpoint: "Check all the glass, brittle, acrylic, and fibrous material on the floor and production line. They should be properly numbered and without any damage or cracks.", status: "", correctiveAction: "" },
      { sr: 12, particular: "Metallic pens", checkpoint: "Only metallic pens are used by all personnel working in the production area.", status: "", correctiveAction: "" },
      { sr: 13, particular: "Pallets/Crates", checkpoint: "Pallets and crates are clean as per frequency. Free from product residue, pests & cobwebs.", status: "", correctiveAction: "" },
      { sr: 14, particular: "Temporary repairs and nuts bolts", checkpoint: "Free from any temporary repairs and lose metallic nuts and tolls.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Packing area",
    lineStatus: "", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Feeding hopper", checkpoint: "The feeding hopper, conveyor belt and bucket conveyor are well cleaned with no accumulation of previous product, free from dust, cobwebs, pests and chemical residue.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Weighing belt", checkpoint: "Belt clean, no damage or material buildup. Belt running centrally, no misalignment. Weight display clear and stable. Cables intact, properly secured. Surrounding area clean and dust-free.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Destoner", checkpoint: "Clean, no product or dust buildup. Screen intact, clean, no blockage. Smooth vibration, no abnormal noise. Surrounding area clean and dust-free.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Vibro-sifter", checkpoint: "Clean, no product buildup. Proper mesh, no tears or blockage. Proper vibration, stable operation. Product discharged smoothly. No leakage or dust escape. Surrounding area clean and dust-free.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Sealing machine & N2 flush", checkpoint: "Clean, no residue or dust. Heating consistent, no fluctuation. Set temperature correctly and stable. Seal strong, no leakage. Guards fitted and intact and Surrounding area clean and dust-free. N2 flush is working properly.", status: "", correctiveAction: "" },
      { sr: 6, particular: "FFS Machine", checkpoint: "Clean, no product dust or residue. Film aligned, no wrinkles or tears. Forming collar properly fixed, no damage. Sealing jaws must be cleaned, aligned and with no damage. Heat and temperature control settled correctly. No jamming, pouches stacked properly, no blockage. Surrounding area clean and tidy. N2 flush is working properly.", status: "", correctiveAction: "" },
      { sr: 7, particular: "PFS Machine", checkpoint: "Clean, no product residue or dust. Pouches feeding smoothly, no misalignment. Sealing jaws must be clean, aligned, no damage. Accurate filling, no spillage. Heat and temperature control settled correctly. No jamming, pouches stacked properly, no blockage. Surrounding area clean and tidy. N2 flush is working properly.", status: "", correctiveAction: "" },
      { sr: 8, particular: "FSS hoppers and weighing units", checkpoint: "Clean, no product residue. No damage, cracks, or leakage. Opening and closing smoothly. Load cells are cleaned and mounted properly. Weight stable and accurate. Display clear, keys functioning. Surrounding area clean and tidy.", status: "", correctiveAction: "" },
      { sr: 9, particular: "Conveyor belt", checkpoint: "Clean, no cuts or damage. Running centrally, no misalignment. Intact, effective cleaning. No product build up or residue, Surrounding area clean and tidy.", status: "", correctiveAction: "" },
      { sr: 10, particular: "Bucket elevator", checkpoint: "The elevator and surrounding area are clean. Buckets intact, firmly fixed. No damage. Closed, clean, no loose wiring.", status: "", correctiveAction: "" },
      { sr: 11, particular: "Sorting tables", checkpoint: "Ensure tables are clean and sanitized. Check that table-mounted tube coverings are clean and dust-free. Check the cleaning of switchboards and stools/chairs and tube lights' integrity.", status: "", correctiveAction: "" },
      { sr: 12, particular: "Metal detector", checkpoint: "Verification of the metal detector is done before the start of production / as per the frequency of verification.", status: "", correctiveAction: "" },
      { sr: 13, particular: "Printing machine", checkpoint: "Clean, no ink spills, no packaging material waste. Guards fitted and intact. Smooth feeding, no jams.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Production floor",
    lineStatus: "", timeOfInspection: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Diverter Chute", checkpoint: "Clean, no material buildup. No damage, cracks, or leakage. Diverter flap moves freely, no obstruction. Covers are fitted and intact. Surrounding area clean and tidy. Conveyor belts good in condition & cleaned.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Pre Roaster", checkpoint: "Clean, no product residue. No foreign material. Heaters functioning properly. Smooth feeding, no choking, free flow, surrounding area clean and safe.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Salinity Tanks", checkpoint: "Clean, no residue of previous product. No leakage and damage, surrounding area clean and tidy. Below nozzle opening are cleaned & drained properly.", status: "", correctiveAction: "" },
      { sr: 4, particular: "Ribbon blender", checkpoint: "Clean, no product residue, no damage or leakage, shaft intact, free movement. Lid and cover properly closed. Surrounding area clean and safe. The side gasket is cleaned from product residue & flakes free.", status: "", correctiveAction: "" },
      { sr: 5, particular: "Magnet", checkpoint: "Magnets are cleaned & without any metal contamination & placed at place.", status: "", correctiveAction: "" },
      { sr: 6, particular: "Powder Hopper", checkpoint: "Clean, no powder residue. No cracks and leakage found. Seals & gaskets are intact, no leakage. The surrounding area is clean and tidy. No water accumulation.", status: "", correctiveAction: "" },
      { sr: 7, particular: "Gate Outlets", checkpoint: "Clean, no material buildup. No damage, cracks. No leakage found. Surrounding area clean and safe. No cobwebs or infestation.", status: "", correctiveAction: "" },
      { sr: 8, particular: "Pan coaters", checkpoint: "Clean, no product or coating residue, smooth rotation, without any damage, surrounding area clean and safe. No water accumulation.", status: "", correctiveAction: "" },
      { sr: 9, particular: "Small/Big syrup tanks", checkpoint: "Clean, no residue of previous product. No leakage and damage, surrounding area clean and tidy. Below nozzle opening are cleaned & drained properly.", status: "", correctiveAction: "" },
      { sr: 10, particular: "Puffer", checkpoint: "Clean, no dust or material buildup, nozzle / outlet are clear, no blockage. Surrounding area clean and safe. Control panel, switches and display board are working correctly.", status: "", correctiveAction: "" },
      { sr: 11, particular: "Cooling tumbler", checkpoint: "Clean, no product residue, no damage, air cooling working properly, temperature control is set correctly and stable. Surrounding area clean and safe.", status: "", correctiveAction: "" },
      { sr: 12, particular: "Sludge Tank", checkpoint: "Clean, no residue of previous product. No leakage and damage, surrounding area clean and tidy. Below nozzle opening are cleaned & drained properly.", status: "", correctiveAction: "" },
      { sr: 13, particular: "Roaster & tray", checkpoint: "Clean, no leftover residue, no cracks and damage, fits properly in the roaster. Tray discharge is easy removal without sticking. The surrounding area is clean and safe.", status: "", correctiveAction: "" },
      { sr: 14, particular: "Seasoning Drum", checkpoint: "Clean, no residue or old seasoning, no cracks and damage. Smooth rotation, intact, no leakage, the surrounding area is clean and safe.", status: "", correctiveAction: "" },
      { sr: 15, particular: "Cable way & Electric Panels", checkpoint: "No cuts, wear, or damage, intact, no leakage, no blockage, surrounding area clean and safe. Electric panels are free from product debris, cobwebs, water accumulation & pest infestation.", status: "", correctiveAction: "" },
      { sr: 16, particular: "Valves and Union joins of tanks", checkpoint: "Clean, no syrup residue or clogging, no damage, cracks, or leakage. Valves open/close smoothly. No dripping or seepage. Surrounding area clean and dry.", status: "", correctiveAction: "" },
      { sr: 17, particular: "All Pipe connections", checkpoint: "All the residue is well drained & the pipe is free from debris, mold growth & infestation. Cleaned & properly joined with no leakage signs.", status: "", correctiveAction: "" },
      { sr: 18, particular: "Gaskets", checkpoint: "Check that all gaskets of machines are in good condition without any damage.", status: "", correctiveAction: "" },
      { sr: 19, particular: "Below Platforms, trays & tires of the equipments", checkpoint: "Cleaned free from product, water accumulation & infestation.", status: "", correctiveAction: "" },
      { sr: 20, particular: "Conveyor belt", checkpoint: "Clean, no cuts or damage. Running centrally, no misalignment. Intact, effective cleaning. No product build up or residue, surrounding area clean and tidy.", status: "", correctiveAction: "" },
      { sr: 21, particular: "Bucket elevator", checkpoint: "The elevator and surrounding area are clean. Buckets intact, firmly fixed. No damage. Closed, clean, no loose wiring.", status: "", correctiveAction: "" },
    ],
  },
];

// The first A185 entry ("General") holds the shared points. Drop that standalone
// section, then prepend the 14 general points to every remaining area, renumbering
// Sr. sequentially — same pattern as W202's SECTIONS_WITH_GENERAL.
const A185_GENERAL_ITEMS: CheckItem[] = A185_INITIAL_SECTIONS[0].items;
const A185_SECTIONS_WITH_GENERAL: AreaSection[] = A185_INITIAL_SECTIONS
  .filter((_, idx) => idx !== 0)
  .map((s) => {
    const merged = [...A185_GENERAL_ITEMS, ...s.items];
    return { ...s, items: merged.map((it, i) => ({ ...it, sr: i + 1 })) };
  });

const A185_WITH_DEFAULTS: AreaSection[] = A185_SECTIONS_WITH_GENERAL.map((s) => ({
  ...s,
  items: s.items.map((i) => ({ ...i, status: "OK" as Status })),
}));

export type PreProductionVariant = "W202" | "A185";

// Default checklist template for a fresh (create) form, per warehouse variant.
function defaultSectionsForVariant(variant: PreProductionVariant): AreaSection[] {
  return variant === "A185" ? A185_WITH_DEFAULTS : withDefaults;
}

// Build editable section state from a saved record, falling back to the
// default checklist. Tolerant of both camelCase and snake_case keys.
function sectionsFromInitial(
  initialData?: Record<string, any>,
  variant: PreProductionVariant = "W202",
): AreaSection[] {
  const incoming = initialData?.sections;
  if (!Array.isArray(incoming) || incoming.length === 0) return defaultSectionsForVariant(variant);
  return incoming.map((s: any) => ({
    area: s.area ?? "",
    lineStatus: s.lineStatus ?? s.line_status ?? "Ready",
    timeOfInspection: s.timeOfInspection ?? s.time_of_inspection ?? "",
    timeOfVerification: s.timeOfVerification ?? s.time_of_verification ?? "",
    checkedBy: s.checkedBy ?? s.checked_by ?? "",
    verifiedBy: s.verifiedBy ?? s.verified_by ?? "",
    items: Array.isArray(s.items)
      ? s.items.map((i: any, idx: number) => ({
          sr: i.sr ?? idx + 1,
          particular: i.particular ?? "",
          checkpoint: i.checkpoint ?? "",
          status: (i.status ?? "") as Status,
          correctiveAction: i.correctiveAction ?? i.corrective_action ?? "",
        }))
      : [],
  }));
}

interface PreProductionInspectionFormProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
  // Which checklist to use for a fresh form. A185 → CFPLB.C6.F.47 template.
  // When editing, the saved sections drive the layout regardless of this.
  variant?: PreProductionVariant;
}

export default function PreProductionInspectionForm({
  initialData,
  onSubmit,
  isEdit,
  variant = "W202",
}: PreProductionInspectionFormProps = {}) {
  const router = useRouter();
  const [date, setDate] = useState((initialData?.inspection_date || "").slice(0, 10));
  const [sections, setSections] = useState<AreaSection[]>(() => sectionsFromInitial(initialData, variant));
  const [activeSection, setActiveSection] = useState(0);
  // Partial submit: the first save creates the record and keeps its id so more
  // sections can be filled and saved again before finalizing.
  // Only a real edit adopts the record's id. In duplicate ("Recreate") mode the
  // source record arrives as initialData too, and adopting its id would make the
  // save overwrite the original instead of inserting a new row.
  const [savedId, setSavedId] = useState<number | null>(
    isEdit ? ((initialData?.id as number | undefined) ?? null) : null,
  );
  const [saving, setSaving] = useState<false | "draft" | "final">(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const buildPayload = (status: "draft" | "submitted"): Record<string, unknown> => ({
    inspection_date: date,
    warehouse: initialData?.warehouse ?? getStoredWarehouse() ?? null,
    sections,
    status,
  });

  // Create on the first save, update afterwards — so "Submit Partially" can be
  // used repeatedly and the final Submit updates the same record, not a duplicate.
  const persist = async (status: "draft" | "submitted"): Promise<number | null> => {
    const payload = buildPayload(status);
    if (savedId == null) {
      const res = await docsApi.create("preproductioninspection", payload);
      const id = res.data?.id as number | undefined;
      if (typeof id === "number") setSavedId(id);
      return id ?? null;
    }
    await docsApi.update("preproductioninspection", savedId, payload);
    return savedId;
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSubmitError(null);
    setSavedNote(null);
    if (!date) {
      setSubmitError("Date is required.");
      return;
    }
    // Times are only enforced on the FINAL submit, so partial drafts save early.
    if (status === "submitted") {
      const missingInspection = sections
        .map((s, i) => ({ i, area: s.area, time: s.timeOfInspection }))
        .filter((s) => !s.time || !s.time.trim());
      if (missingInspection.length > 0) {
        setActiveSection(missingInspection[0].i);
        setSubmitError(
          `Time of Inspection is required for each floor. Missing: ${missingInspection.map((m) => m.area).join(", ")}`
        );
        return;
      }
      const missing = sections
        .map((s, i) => ({ i, area: s.area, time: s.timeOfVerification }))
        .filter((s) => !s.time || !s.time.trim());
      if (missing.length > 0) {
        setActiveSection(missing[0].i);
        setSubmitError(
          `Time of Verification is required for each floor. Missing: ${missing.map((m) => m.area).join(", ")}`
        );
        return;
      }
    }
    setSaving(status === "submitted" ? "final" : "draft");
    try {
      // Edit mode final submit keeps the wrapper's update-then-navigate behavior.
      if (status === "submitted" && onSubmit) {
        await onSubmit(buildPayload(status));
        return;
      }
      const id = await persist(status);
      if (status === "submitted") {
        router.push("/documentations/preproductioninspection");
      } else if (id != null) {
        setSavedNote(`Draft saved · #${id}. Keep editing — Submit when done.`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (sectionIdx: number, itemIdx: number, field: keyof CheckItem, value: string) => {
    setSections((prev) => {
      const updated = [...prev];
      updated[sectionIdx] = {
        ...updated[sectionIdx],
        items: updated[sectionIdx].items.map((item, i) =>
          i === itemIdx ? { ...item, [field]: value } : item
        ),
      };
      return updated;
    });
  };

  const updateSection = (sectionIdx: number, field: keyof AreaSection, value: string) => {
    setSections((prev) => prev.map((s, i) => (i === sectionIdx ? { ...s, [field]: value } : s)));
  };

  const getStats = (section: AreaSection) => {
    const total = section.items.length;
    const ok = section.items.filter((i) => i.status === "OK").length;
    const notOk = section.items.filter((i) => i.status === "NOT OK").length;
    return { total, ok, notOk };
  };

  const section = sections[activeSection];
  const stats = getStats(section);

  return (
    <div className="space-y-5">
      {savedId != null && !isEdit && (
        <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50 text-xs text-warning-800 font-medium">
          Draft <span className="font-bold">#{savedId}</span> in progress. Use <strong>Submit Partially</strong> to save progress, or <strong>Submit Record</strong> to finalize.
        </div>
      )}

      <DocSection title="Inspection Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </div>
        </div>
        <p className="text-[11px] text-ink-400 mt-2">
          Time of Inspection is recorded individually per floor below.
        </p>
      </DocSection>

      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex flex-wrap gap-1 min-w-max">
          {sections.map((s, i) => {
            const st = getStats(s);
            return (
              <button
                key={i}
                onClick={() => setActiveSection(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                  activeSection === i
                    ? "bg-brand-500 text-white shadow-soft"
                    : "text-ink-500 hover:bg-cream-200"
                }`}
              >
                <span>{s.area}</span>
                {st.notOk > 0 && (
                  <span className="bg-warning-500 text-white rounded-full px-1.5 text-[10px] font-bold">{st.notOk}</span>
                )}
                {(!s.timeOfInspection?.trim() || !s.timeOfVerification?.trim()) && (
                  <span
                    title="Time of Inspection / Verification missing"
                    className="w-2 h-2 rounded-full bg-danger-500 inline-block"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DocSection
        title={`Area: ${section.area}`}
        description={`${stats.total} checkpoints`}
        bleed
        actions={
          <div className="flex gap-2 text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded-full bg-success-50 text-success-700">✓ OK {stats.ok}</span>
            <span className="px-2 py-0.5 rounded-full bg-danger-50 text-danger-600">✕ NOT OK {stats.notOk}</span>
          </div>
        }
      >
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2.5 w-10 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400">Sr.</th>
                <th className="px-2 py-2.5 w-40 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Particular</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Checkpoint</th>
                <th className="px-2 py-2.5 w-28 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400">Status</th>
                <th className="px-2 py-2.5 w-48 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Corrective Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {section.items.map((item, itemIdx) => (
                <tr
                  key={itemIdx}
                  className={`${
                    item.status === "NOT OK"
                      ? "bg-danger-50/40"
                      : item.status === "OK"
                      ? "bg-success-50/30"
                      : "hover:bg-cream-100/60"
                  }`}
                >
                  <td className="px-2 py-2 text-center text-ink-400 font-medium">{item.sr}</td>
                  <td className="px-2 py-2 font-semibold text-ink-500">{item.particular}</td>
                  <td className="px-2 py-2 text-ink-500 leading-relaxed">{item.checkpoint}</td>
                  <td className="px-2 py-2 text-center">
                    <select
                      value={item.status}
                      onChange={(e) => updateItem(activeSection, itemIdx, "status", e.target.value as Status)}
                      className={`w-full text-center border rounded-md px-1 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                        item.status === "OK"
                          ? "bg-success-50 text-success-700 border-success-200"
                          : item.status === "NOT OK"
                          ? "bg-danger-50 text-danger-600 border-danger-200"
                          : "bg-cream-50 border-cream-300 text-ink-500"
                      }`}
                    >
                      <option value="">— Select —</option>
                      <option value="OK">OK</option>
                      <option value="NOT OK">NOT OK</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.correctiveAction}
                      onChange={(e) => updateItem(activeSection, itemIdx, "correctiveAction", e.target.value)}
                      disabled={item.status !== "NOT OK"}
                      className="input-base !py-1.5 !px-2 disabled:bg-cream-200/60 disabled:text-ink-300"
                      placeholder={item.status === "NOT OK" ? "Describe corrective action..." : "—"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-cream-300 p-4 sm:p-5 bg-cream-100/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-base">Line Status</label>
              <input
                type="text"
                value={section.lineStatus}
                onChange={(e) => updateSection(activeSection, "lineStatus", e.target.value)}
                className="input-base"
                placeholder="e.g. Ready / Hold"
              />
            </div>
            <div>
              <label className="label-base">
                Time of Inspection <span className="text-danger-600">*</span>
              </label>
              {/* key forces a fresh mount per floor so the picker never shows a
                  previous floor's time (Time12Picker keeps internal text state). */}
              <Time12Picker
                key={`toi-${activeSection}`}
                value={section.timeOfInspection}
                onChange={(v) => updateSection(activeSection, "timeOfInspection", v)}
              />
            </div>
            <div>
              <label className="label-base">
                Time of Verification <span className="text-danger-600">*</span>
              </label>
              {/* key forces a fresh mount per floor so the picker never shows a
                  previous floor's time (Time12Picker keeps internal text state). */}
              <Time12Picker
                key={`tov-${activeSection}`}
                value={section.timeOfVerification}
                onChange={(v) => updateSection(activeSection, "timeOfVerification", v)}
              />
            </div>
            <SignaturePicker
              label="Checked By (Production Incharge)"
              value={section.checkedBy}
              onChange={(v) => updateSection(activeSection, "checkedBy", v)}
              options={PRODUCTION_INCHARGE_OPTIONS}
              inputCls="input-base"
              labelCls="label-base"
            />
            <SignaturePicker
              label="Verified By (Quality)"
              value={section.verifiedBy}
              onChange={(v) => updateSection(activeSection, "verifiedBy", v)}
              options={QC_VERIFIED_BY_OPTIONS}
              inputCls="input-base"
              labelCls="label-base"
            />
          </div>
        </div>
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL / Production</span>
        </p>
        <div className="flex items-center gap-3">
          {submitError && <span className="text-xs text-danger-600">{submitError}</span>}
          {savedNote && !submitError && <span className="text-xs text-success-600">{savedNote}</span>}
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={saving !== false}
            className="btn-outline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving === "draft" ? "Saving…" : "Submit Partially"}
          </button>
          <button
            type="button"
            onClick={() => handleSave("submitted")}
            disabled={saving !== false}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving === "final" ? "Saving…" : isEdit ? "Update Record" : "Submit Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
