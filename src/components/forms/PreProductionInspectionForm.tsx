"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Time12Picker from "@/components/Time12Picker";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";

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

// The first section ("Production Floor (General)") holds the 16 general points.
// Those same points must also appear at the top of every other floor's checklist.
const GENERAL_ITEMS: CheckItem[] = INITIAL_SECTIONS[0].items;

// Prepend the 16 general points to every floor area (except the General section
// itself, which already is those points), renumbering Sr. sequentially.
const SECTIONS_WITH_GENERAL: AreaSection[] = INITIAL_SECTIONS.map((s, idx) => {
  if (idx === 0) return s;
  const merged = [...GENERAL_ITEMS, ...s.items];
  return { ...s, items: merged.map((it, i) => ({ ...it, sr: i + 1 })) };
});

const withDefaults: AreaSection[] = SECTIONS_WITH_GENERAL.map((s) => ({
  ...s,
  items: s.items.map((i) => ({ ...i, status: "OK" as Status })),
}));

// Build editable section state from a saved record, falling back to the
// default checklist. Tolerant of both camelCase and snake_case keys.
function sectionsFromInitial(initialData?: Record<string, any>): AreaSection[] {
  const incoming = initialData?.sections;
  if (!Array.isArray(incoming) || incoming.length === 0) return withDefaults;
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
}

export default function PreProductionInspectionForm({
  initialData,
  onSubmit,
  isEdit,
}: PreProductionInspectionFormProps = {}) {
  const router = useRouter();
  const [date, setDate] = useState((initialData?.inspection_date || "").slice(0, 10));
  const [sections, setSections] = useState<AreaSection[]>(() => sectionsFromInitial(initialData));
  const [activeSection, setActiveSection] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!date) {
      setSubmitError("Date is required.");
      return;
    }
    // Each floor must have its own Time of Inspection and Time of Verification before submitting.
    const missingInspection = sections
      .map((s, i) => ({ i, area: s.area, time: s.timeOfInspection }))
      .filter((s) => !s.time || !s.time.trim());
    if (missingInspection.length > 0) {
      setActiveSection(missingInspection[0].i);
      setSubmitError(
        `Time of Inspection is required for each floor. Missing: ${missingInspection
          .map((m) => m.area)
          .join(", ")}`
      );
      return;
    }
    const missing = sections
      .map((s, i) => ({ i, area: s.area, time: s.timeOfVerification }))
      .filter((s) => !s.time || !s.time.trim());
    if (missing.length > 0) {
      setActiveSection(missing[0].i);
      setSubmitError(
        `Time of Verification is required for each floor. Missing: ${missing
          .map((m) => m.area)
          .join(", ")}`
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        inspection_date: date,
        warehouse: initialData?.warehouse ?? getStoredWarehouse() ?? null,
        sections,
      };
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await docsApi.create("preproductioninspection", payload);
        router.push("/documentations/preproductioninspection");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit");
      setSubmitting(false);
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
              options={CHECKED_BY_OPTIONS}
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : isEdit ? "Update Record" : "Submit Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
