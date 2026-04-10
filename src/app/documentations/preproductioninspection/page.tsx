"use client";
import { useState } from "react";

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
  timeOfVerification: string;
  checkedBy: string;
  verifiedBy: string;
}

const INITIAL_SECTIONS: AreaSection[] = [
  {
    area: "Production Floor (General)",
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
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
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
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
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Metal Detector", checkpoint: "Ensure the metal detector machine is calibrated with standard probes and working properly. Check the conveyor belt cleanliness and dust-free status for smooth operation.", status: "", correctiveAction: "" },
      { sr: 2, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "First Floor",
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
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
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 1, particular: "Metal Detector", checkpoint: "Ensure the metal detector machine is calibrated with standard probes and working properly. Check the conveyor belt cleanliness and dust-free status for smooth operation.", status: "", correctiveAction: "" },
      { sr: 2, particular: "FFS Machine", checkpoint: "Check cleanliness for the feeding hopper, collar, and the conveyor belt. No remnants of previous material. Free from any chemical odor. Ensure the metal detector machine of FFS is calibrated with standard probes and working properly.", status: "", correctiveAction: "" },
      { sr: 3, particular: "Magnet", checkpoint: "Magnets in the production line are in place & cleaned.", status: "", correctiveAction: "" },
    ],
  },
  {
    area: "Second Floor / Second Floor Mezzanine",
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
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
    lineStatus: "", timeOfVerification: "", checkedBy: "", verifiedBy: "",
    items: [
      { sr: 14, particular: "Pan Coater", checkpoint: "Check whether the inner & outer surfaces of the coating tank are clean & sanitized. No remnants of the previous material. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
      { sr: 15, particular: "Slicer/Dicer Machine/Slivering Machine", checkpoint: "Ensure that all the food contact surfaces, attachments, and corners are well cleaned and ready to use. Ensure the feeding hopper is clean and free from blockages. Check the blade's intactness and integrity.", status: "", correctiveAction: "" },
      { sr: 16, particular: "Blancher Machine", checkpoint: "Ensure that the machine is well cleaned and ready to use. The water bath is well cleaned with all sensors and valves in working condition. The wire net buckets are cleaned properly, and the mesh integrity is maintained. The blancher's sprockets are in good condition & cleaned.", status: "", correctiveAction: "" },
      { sr: 17, particular: "Magnet", checkpoint: "Magnets in the production line are cleaned.", status: "", correctiveAction: "" },
      { sr: 18, particular: "Tank", checkpoint: "No remnants of the previous material in the tank. Observe for the clean, dry, and chemical-odor-free parts.", status: "", correctiveAction: "" },
    ],
  },
];

export default function PreProductionInspection() {
  const [date, setDate] = useState("");
  const [timeOfInspection, setTimeOfInspection] = useState("");
  const [sections, setSections] = useState<AreaSection[]>(INITIAL_SECTIONS);
  const [activeSection, setActiveSection] = useState(0);

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
    <div className="min-h-screen bg-slate-50 font-mono">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:grid sm:grid-cols-3 sm:divide-x divide-gray-200">
            <div className="flex items-center gap-3 p-4 border-b sm:border-b-0">
              <div className="w-10 h-10 bg-red-700 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">CF</span>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-sm">Candor Foods</div>
                <div className="text-xs text-gray-500">Private Limited</div>
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="font-bold text-gray-800 text-sm">Pre-production Inspection Checklist</div>
              <div className="text-xs text-gray-500 mt-1">Document No: CFPLA.C6.F.07</div>
            </div>
            <div className="p-4 text-xs text-gray-600 space-y-0.5">
              <div className="flex justify-between"><span>Issue Date:</span><span className="font-medium">01/08/2024</span></div>
              <div className="flex justify-between"><span>Issue No:</span><span className="font-medium">03</span></div>
              <div className="flex justify-between"><span>Revision Date:</span><span className="font-medium">13/12/2025</span></div>
              <div className="flex justify-between"><span>Revision No.:</span><span className="font-medium">02</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Date/Time */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mb-4 bg-white p-3 rounded border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Date:</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Time of Inspection:</span>
            <input type="time" value={timeOfInspection} onChange={(e) => setTimeOfInspection(e.target.value)}
              className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-sm" />
          </div>
        </div>

        {/* Area Tabs */}
        <p className="text-xs text-gray-400 mb-1 italic sm:hidden">← Swipe to view all columns</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {sections.map((s, i) => {
            const st = getStats(s);
            return (
              <button key={i} onClick={() => setActiveSection(i)}
                className={`px-3 py-1.5 text-xs rounded border transition-all ${activeSection === i
                  ? "bg-red-700 text-white border-red-700"
                  : "bg-white text-gray-700 border-gray-300 hover:border-red-400"}`}>
                {s.area}
                {st.notOk > 0 && <span className="ml-1 bg-orange-500 text-white rounded-full px-1 text-xs">{st.notOk}</span>}
              </button>
            );
          })}
        </div>

        {/* Section Content */}
        <div className="bg-white rounded border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
            <span className="font-semibold text-gray-800 text-sm">Area: {section.area}</span>
            <div className="flex gap-3 text-xs">
              <span className="text-green-600 font-medium">✓ OK: {stats.ok}</span>
              <span className="text-red-600 font-medium">✕ NOT OK: {stats.notOk}</span>
              <span className="text-gray-500">Total: {stats.total}</span>
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 p-2 w-10 text-center">Sr.</th>
                <th className="border border-gray-200 p-2 w-40 text-left">Particular / Equipment</th>
                <th className="border border-gray-200 p-2 text-left">Checkpoint</th>
                <th className="border border-gray-200 p-2 w-28 text-center">Status</th>
                <th className="border border-gray-200 p-2 w-48 text-left">Corrective Action</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item, itemIdx) => (
                <tr key={itemIdx} className={`${item.status === "NOT OK" ? "bg-red-50" : item.status === "OK" ? "bg-green-50/40" : "hover:bg-gray-50"}`}>
                  <td className="border border-gray-200 p-2 text-center text-gray-500">{item.sr}</td>
                  <td className="border border-gray-200 p-2 font-medium text-gray-700">{item.particular}</td>
                  <td className="border border-gray-200 p-2 text-gray-600 leading-relaxed">{item.checkpoint}</td>
                  <td className="border border-gray-200 p-2 text-center">
                    <select value={item.status}
                      onChange={(e) => updateItem(activeSection, itemIdx, "status", e.target.value as Status)}
                      className={`w-full text-center border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 ${item.status === "OK" ? "bg-green-100 text-green-700 border-green-300" : item.status === "NOT OK" ? "bg-red-100 text-red-700 border-red-300" : "bg-white border-gray-300"}`}>
                      <option value="">— Select —</option>
                      <option value="OK">OK</option>
                      <option value="NOT OK">NOT OK</option>
                    </select>
                  </td>
                  <td className="border border-gray-200 p-1">
                    <input type="text" value={item.correctiveAction}
                      onChange={(e) => updateItem(activeSection, itemIdx, "correctiveAction", e.target.value)}
                      disabled={item.status !== "NOT OK"}
                      className="w-full px-1 py-0.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-400 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder={item.status === "NOT OK" ? "Describe corrective action..." : "—"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Section Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Line Status:</span>
                <input type="text" value={section.lineStatus}
                  onChange={(e) => updateSection(activeSection, "lineStatus", e.target.value)}
                  className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs flex-1"
                  placeholder="e.g. Ready / Hold" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Time of Verification:</span>
                <input type="time" value={section.timeOfVerification}
                  onChange={(e) => updateSection(activeSection, "timeOfVerification", e.target.value)}
                  className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Checked by (Production Incharge):</span>
                <input type="text" value={section.checkedBy}
                  onChange={(e) => updateSection(activeSection, "checkedBy", e.target.value)}
                  className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Verified by (Quality):</span>
                <input type="text" value={section.verifiedBy}
                  onChange={(e) => updateSection(activeSection, "verifiedBy", e.target.value)}
                  className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs flex-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span>Prepared By: <strong>FST</strong></span>
          <span>Approved By: <strong>FSTL / Production</strong></span>
        </div>

        <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
      </div>
    </div>
  );
}
