"use client";
import { Fragment, useState } from "react";

// ===================== F.13 — New Product Verification =====================
interface SensoryRow { id: number; panelName: string; taste: "Ok" | "Not ok" | ""; odor: "Ok" | "Not ok" | ""; appearance: "Ok" | "Not ok" | ""; mouthfeel: "Ok" | "Not ok" | ""; decision: "Accept" | "Reject" | ""; signature: string; }
const emptySensoryRow = (id: number): SensoryRow => ({ id, panelName: "", taste: "", odor: "", appearance: "", mouthfeel: "", decision: "", signature: "" });

interface NewProductVerificationProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function NewProductVerification({ initialData, onSubmit, isEdit }: NewProductVerificationProps = {}) {
  const [date, setDate] = useState(initialData?.verify_date || ""); const [productName, setProductName] = useState(initialData?.product_name || ""); const [customerName, setCustomerName] = useState(initialData?.customer_name || ""); const [trialNo, setTrialNo] = useState(initialData?.trial_no || "");
  const [personsPresent, setPersonsPresent] = useState(initialData?.persons_present || ""); const [ingredientsUsed, setIngredientsUsed] = useState(initialData?.ingredients_used || ""); const [preroastingTemp, setPreroastingTemp] = useState(initialData?.preroasting_temp || "");
  const [batchNumber, setBatchNumber] = useState(initialData?.batch_number || ""); const [bakingTemp, setBakingTemp] = useState(initialData?.baking_temp || ""); const [ingredientChanges, setIngredientChanges] = useState(initialData?.ingredient_changes || "");
  const [flowChart, setFlowChart] = useState(initialData?.flow_chart || ""); const [equipmentAdded, setEquipmentAdded] = useState(initialData?.equipment_added || "");
  const [sensoryRows, setSensoryRows] = useState<SensoryRow[]>(() => {
    if (initialData?.sensory_rows && Array.isArray(initialData.sensory_rows)) {
      return initialData.sensory_rows.map((r: any, i: number) => ({ id: i + 1, panelName: r.panel_name || "", taste: r.taste || "", odor: r.odor || "", appearance: r.appearance || "", mouthfeel: r.mouthfeel || "", decision: r.decision || "", signature: r.signature || "" }));
    }
    return Array.from({ length: 3 }, (_, i) => emptySensoryRow(i + 1));
  });
  const [moisture, setMoisture] = useState(initialData?.moisture?.toString() || ""); const [fat, setFat] = useState(initialData?.fat?.toString() || ""); const [acidValue, setAcidValue] = useState(initialData?.acid_value?.toString() || "");
  const [peroxideValue, setPeroxideValue] = useState(initialData?.peroxide_value?.toString() || ""); const [salt, setSalt] = useState(initialData?.salt?.toString() || ""); const [ph, setPh] = useState(initialData?.ph?.toString() || "");
  const [labTrialName, setLabTrialName] = useState(initialData?.lab_trial_name || ""); const [pilotQty, setPilotQty] = useState(initialData?.pilot_qty || ""); const [pilotBatch, setPilotBatch] = useState(initialData?.pilot_batch || "");
  const [pilotSuccess, setPilotSuccess] = useState(initialData?.pilot_success || ""); const [pilotPersons, setPilotPersons] = useState(initialData?.pilot_persons || "");
  const [packagingMaterial, setPackagingMaterial] = useState(initialData?.packaging_material || ""); const [claims, setClaims] = useState(initialData?.claims || ""); const [regulatory, setRegulatory] = useState(initialData?.regulatory || "");
  const [shelfLife, setShelfLife] = useState(initialData?.shelf_life || ""); const [storageCondition, setStorageCondition] = useState(initialData?.storage_condition || ""); const [haccpImpact, setHaccpImpact] = useState(initialData?.haccp_impact || ""); const [crossContamination, setCrossContamination] = useState(initialData?.cross_contamination || "");
  const [supervisorName, setSupervisorName] = useState(initialData?.supervisor_name || ""); const [productionManagerName, setProductionManagerName] = useState(initialData?.production_manager_name || "");
  const [approvedByName, setApprovedByName] = useState(initialData?.approved_by_name || ""); const [customerRepName, setCustomerRepName] = useState(initialData?.customer_rep_name || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addSensoryRow = () => setSensoryRows((p) => [...p, emptySensoryRow(p.length + 1)]);
  const OkSel = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full border rounded px-1 py-0.5 text-xs ${value === "Ok" ? "bg-green-100" : value === "Not ok" ? "bg-red-100" : ""}`}>
      <option value="">-</option><option value="Ok">Ok</option><option value="Not ok">Not ok</option>
    </select>
  );

  const fields = [
    { label: "Date", value: date, set: setDate, type: "date" }, { label: "Product Name", value: productName, set: setProductName },
    { label: "Customer Name", value: customerName, set: setCustomerName }, { label: "Trial No", value: trialNo, set: setTrialNo },
    { label: "Persons Present for Trial", value: personsPresent, set: setPersonsPresent }, { label: "Ingredients Used", value: ingredientsUsed, set: setIngredientsUsed },
    { label: "Time & Temp for Preroasting (if applicable)", value: preroastingTemp, set: setPreroastingTemp }, { label: "Batch Number", value: batchNumber, set: setBatchNumber },
    { label: "Time & Temp for Baking/Roasting (if applicable)", value: bakingTemp, set: setBakingTemp },
    { label: "Ingredients Changed/Replaced (if any)", value: ingredientChanges, set: setIngredientChanges },
    { label: "Flow Chart/Line Used for Pilot Run", value: flowChart, set: setFlowChart }, { label: "Equipment Added (if any)", value: equipmentAdded, set: setEquipmentAdded },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      verify_date: date, product_name: productName, customer_name: customerName, trial_no: trialNo,
      persons_present: personsPresent, ingredients_used: ingredientsUsed, preroasting_temp: preroastingTemp,
      batch_number: batchNumber, baking_temp: bakingTemp, ingredient_changes: ingredientChanges,
      flow_chart: flowChart, equipment_added: equipmentAdded,
      sensory_rows: sensoryRows.filter((r) => r.panelName).map((r) => ({ panel_name: r.panelName, taste: r.taste, odor: r.odor, appearance: r.appearance, mouthfeel: r.mouthfeel, decision: r.decision, signature: r.signature })),
      moisture: moisture ? Number(moisture) : null, fat: fat ? Number(fat) : null, acid_value: acidValue ? Number(acidValue) : null,
      peroxide_value: peroxideValue ? Number(peroxideValue) : null, salt: salt ? Number(salt) : null, ph: ph ? Number(ph) : null,
      lab_trial_name: labTrialName, pilot_qty: pilotQty, pilot_batch: pilotBatch,
      pilot_success: pilotSuccess, pilot_persons: pilotPersons,
      packaging_material: packagingMaterial, claims, regulatory,
      shelf_life: shelfLife, storage_condition: storageCondition, haccp_impact: haccpImpact, cross_contamination: crossContamination,
      supervisor_name: supervisorName, production_manager_name: productionManagerName,
      approved_by_name: approvedByName, customer_rep_name: customerRepName,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("new-product-verification", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">New Product Verification</p><p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.13 | Issue No: 01 | Issue Date: 02/01/2025</p></div>
      </div>

      {/* Main fields */}
      <div className="border border-gray-300 rounded mb-4">
        {fields.map((f) => (
          <div key={f.label} className="flex border-b border-gray-200 last:border-b-0">
            <label className="w-1/3 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{f.label}</label>
            <div className="w-2/3 px-2 py-1"><input type={f.type || "text"} value={f.value} onChange={(e) => f.set(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          </div>
        ))}
      </div>

      {/* Sensory Analysis */}
      <h3 className="font-semibold text-sm mb-2">Sensory Analysis</h3>
      <div className="overflow-x-auto border border-gray-300 rounded mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr><th className="border border-gray-300 px-2 py-1">Sensory Panel</th><th className="border border-gray-300 px-2 py-1">Taste</th><th className="border border-gray-300 px-2 py-1">Odor</th><th className="border border-gray-300 px-2 py-1">Appearance</th><th className="border border-gray-300 px-2 py-1">Mouthfeel</th><th className="border border-gray-300 px-2 py-1">Accept/Reject</th><th className="border border-gray-300 px-2 py-1">Signature</th></tr>
          </thead>
          <tbody>
            {sensoryRows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.panelName} onChange={(e) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, panelName: e.target.value } : s))} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><OkSel value={r.taste} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, taste: v as any } : s))} /></td>
                <td className="border border-gray-300 px-1 py-1"><OkSel value={r.odor} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, odor: v as any } : s))} /></td>
                <td className="border border-gray-300 px-1 py-1"><OkSel value={r.appearance} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, appearance: v as any } : s))} /></td>
                <td className="border border-gray-300 px-1 py-1"><OkSel value={r.mouthfeel} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, mouthfeel: v as any } : s))} /></td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={r.decision} onChange={(e) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, decision: e.target.value as any } : s))} className={`w-full border rounded px-1 py-0.5 text-xs ${r.decision === "Accept" ? "bg-green-100" : r.decision === "Reject" ? "bg-red-100" : ""}`}>
                    <option value="">-</option><option value="Accept">Accept</option><option value="Reject">Reject</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.signature} onChange={(e) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, signature: e.target.value } : s))} className="w-full border rounded px-1 py-0.5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addSensoryRow} className="mb-4 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">+ Add Panelist</button>

      {/* Chemical Analysis */}
      <h3 className="font-semibold text-sm mb-2">Chemical Analysis</h3>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {[{ l: "Moisture %", v: moisture, s: setMoisture }, { l: "Fat %", v: fat, s: setFat }, { l: "Acid Value", v: acidValue, s: setAcidValue }, { l: "Peroxide Value", v: peroxideValue, s: setPeroxideValue }, { l: "Salt %", v: salt, s: setSalt }, { l: "PH", v: ph, s: setPh }].map((f) => (
          <div key={f.l}><label className="block text-xs font-medium mb-1">{f.l}</label><input type="number" value={f.v} onChange={(e) => f.s(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" step="0.01" /></div>
        ))}
      </div>

      {/* Pilot Run Details */}
      <h3 className="font-semibold text-sm mb-2">Pilot Run Details</h3>
      <div className="border border-gray-300 rounded mb-4">
        {[{ l: "Lab Scale Trial Done By", v: labTrialName, s: setLabTrialName }, { l: "Quantity for Pilot Run (kg)", v: pilotQty, s: setPilotQty }, { l: "Batch Number", v: pilotBatch, s: setPilotBatch },
          { l: "Pilot Scale Production Done Successfully?", v: pilotSuccess, s: setPilotSuccess }, { l: "Persons Present for Pilot Run", v: pilotPersons, s: setPilotPersons },
          { l: "Packaging Material Used", v: packagingMaterial, s: setPackagingMaterial }, { l: "Any Claims for the Product", v: claims, s: setClaims },
          { l: "Any Regulatory Details", v: regulatory, s: setRegulatory }, { l: "Shelf Life of the Product", v: shelfLife, s: setShelfLife },
          { l: "Storage Condition", v: storageCondition, s: setStorageCondition }, { l: "Chances of Hampering Process/HACCP?", v: haccpImpact, s: setHaccpImpact },
          { l: "Cross Contamination Risk?", v: crossContamination, s: setCrossContamination },
        ].map((f) => (
          <div key={f.l} className="flex border-b border-gray-200 last:border-b-0">
            <label className="w-1/2 px-3 py-2 text-xs font-medium bg-gray-50 border-r border-gray-200">{f.l}</label>
            <div className="w-1/2 px-2 py-1"><input type="text" value={f.v} onChange={(e) => f.s(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          </div>
        ))}
      </div>

      {/* Approvals */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="text-xs font-medium">Pilot Run Supervisor Name</label><input type="text" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
        <div><label className="text-xs font-medium">Production Manager Name</label><input type="text" value={productionManagerName} onChange={(e) => setProductionManagerName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
        <div><label className="text-xs font-medium">Approved by (FSTL) Name</label><input type="text" value={approvedByName} onChange={(e) => setApprovedByName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
        <div><label className="text-xs font-medium">Customer Representative (if applicable)</label><input type="text" value={customerRepName} onChange={(e) => setCustomerRepName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
      </div>
      <div className="mt-2 text-xs text-gray-500">Prepared By: FST | Approved By: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.14 — Emergency Fire Evacuation Mock Drill =====================
interface EmergencyMockDrillProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function EmergencyMockDrill({ initialData, onSubmit, isEdit }: EmergencyMockDrillProps = {}) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (initialData?.fields) return initialData.fields;
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (key: string, value: string) => setFields((p) => ({ ...p, [key]: value }));

  const ITEMS = [
    { sr: "1", label: "Date & Time of Mock Drill", type: "datetime-local" },
    { sr: "a", label: "Emergency Siren Started at", type: "time" },
    { sr: "2", label: "Location", type: "text" },
    { sr: "3", label: "Details of Scenario", type: "textarea" },
    { sr: "4", label: "Reported by (First person informed about scenario)", type: "text" },
    { sr: "5", label: "Response / action initiated by reporting person", type: "textarea" },
    { sr: "6", label: "Description of the Mock Drill (narrative of the situation, all actions)", type: "textarea" },
    { sr: "7", label: "Response of various teams in the Organization", type: "textarea" },
    { sr: "8a", label: "Total persons available at Assembly point(s)", type: "number" },
    { sr: "8b", label: "Difference of Head count after drill", type: "number" },
    { sr: "8d", label: "Action taken to search the shortfall of head counts, if any", type: "textarea" },
    { sr: "9", label: "Time of All Clear", type: "time" },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      drill_datetime: fields["1"] || null,
      location: fields["2"] || null,
      fields,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("mock-drill", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Emergency Fire Evacuation Mock Drill</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.14 | Issue No: 03 | Rev Date: 02/02/2025 | Rev No: 02</p></div>
      </div>
      <div className="border border-gray-300 rounded">
        {ITEMS.map((item) => (
          <div key={item.sr} className="flex border-b border-gray-200 last:border-b-0">
            <label className="w-12 px-2 py-3 text-sm font-bold bg-gray-50 border-r border-gray-200 text-center">{item.sr}</label>
            <label className="w-1/3 px-3 py-3 text-sm font-medium bg-gray-50 border-r border-gray-200">{item.label}</label>
            <div className="flex-1 px-2 py-2">
              {item.type === "textarea" ? (
                <textarea value={fields[item.sr] || ""} onChange={(e) => update(item.sr, e.target.value)} rows={3} className="w-full border rounded px-2 py-1 text-sm" />
              ) : (
                <input type={item.type} value={fields[item.sr] || ""} onChange={(e) => update(item.sr, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">Prepared By: FST | Approved By: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.15 — Monthly GMP & GHP Inspection =====================
const GMP_SECTIONS: { section: string; items: { sr: number; text: string; maxScore: number }[] }[] = [
  { section: "MANUFACTURING", items: [
    { sr: 1, text: "Last modified FSSAI License copy and other certifications is displayed at prominent place", maxScore: 2 },
    { sr: 2, text: "Policies, Plant layout, Do's and Don'ts pictorial posters displayed on site", maxScore: 2 },
  ]},
  { section: "Facility and Housekeeping", items: [
    { sr: 3, text: "Floors, ceilings, walls and doors maintained in sound condition, smooth and easy to clean", maxScore: 2 },
    { sr: 4, text: "Windows, doors screened with wire-mesh or insect proof screen, clean and dust free", maxScore: 2 },
    { sr: 5, text: "Surrounding & Process area clean, free from debris and dust", maxScore: 2 },
    { sr: 6, text: "Cleaning equipment, Chemicals stored separately in lock and key area", maxScore: 2 },
    { sr: 7, text: "Lightings, overhead fixtures protected in storage area", maxScore: 2 },
    { sr: 8, text: "Premise has sufficient lighting", maxScore: 2 },
    { sr: 9, text: "Adequate ventilation within premises", maxScore: 2 },
    { sr: 10, text: "Personnel hygiene facilities available and in clean conditions", maxScore: 2 },
    { sr: 11, text: "Air/Strip curtains present, operational, clean, dust-free", maxScore: 2 },
    { sr: 12, text: "Segregation for storage of raw, processed, rejected materials", maxScore: 2 },
    { sr: 13, text: "Equipment made of non-toxic, impervious, non-corrosive material", maxScore: 2 },
    { sr: 14, text: "Potable water (IS:10500) used, tested Bi-annually", maxScore: 4 },
    { sr: 15, text: "Fire extinguishers in place, check expiry/refilling date", maxScore: 2 },
    { sr: 16, text: "Light fixtures cleaned regularly", maxScore: 2 },
    { sr: 17, text: "Drains equipped with traps to capture contaminants", maxScore: 2 },
    { sr: 18, text: "Laboratory Area clean, chemicals labelled", maxScore: 2 },
    { sr: 19, text: "Control samples properly labelled & segregated", maxScore: 2 },
    { sr: 20, text: "Terrace area - no pest/birds, mesh intact", maxScore: 2 },
    { sr: 21, text: "Terrace walls & floor cleaned, dry, no damage", maxScore: 2 },
    { sr: 22, text: "Terrace Roasting area cleaned, no pest", maxScore: 2 },
    { sr: 23, text: "Fumigation chambers enclosed, no leakage, clean", maxScore: 2 },
  ]},
  { section: "Control of Operations", items: [
    { sr: 24, text: "Incoming material as per spec & from approved vendors", maxScore: 2 },
    { sr: 25, text: "Inward record of raw/packaging materials maintained", maxScore: 2 },
    { sr: 26, text: "Materials stored with proper labelling, FIFO/FEFO practiced", maxScore: 2 },
    { sr: 27, text: "Time and temperature achieved, monitored & recorded", maxScore: 4 },
    { sr: 28, text: "Food stored above ground, away from walls", maxScore: 2 },
    { sr: 29, text: "Food packed in hygienic manner", maxScore: 2 },
    { sr: 30, text: "Packaging materials food grade & sound", maxScore: 2 },
    { sr: 31, text: "Cleaning chemicals stored separately from food", maxScore: 2 },
    { sr: 32, text: "Transport vehicles clean and maintained", maxScore: 2 },
    { sr: 33, text: "Transport capable of meeting temperature requirements", maxScore: 2 },
    { sr: 34, text: "Recalled products held under supervision", maxScore: 2 },
    { sr: 35, text: "Food waste removed periodically, proper disposal", maxScore: 2 },
    { sr: 36, text: "Waste bins covered, no accumulation in work areas", maxScore: 2 },
  ]},
  { section: "Personal Hygiene", items: [
    { sr: 37, text: "Annual medical examination done", maxScore: 2 },
    { sr: 38, text: "No sick person handling food", maxScore: 2 },
    { sr: 39, text: "Food handlers maintain personal cleanliness & behaviour", maxScore: 4 },
    { sr: 40, text: "Visitor Policy followed", maxScore: 2 },
    { sr: 41, text: "Food handlers equipped with aprons, gloves, headgear", maxScore: 2 },
    { sr: 42, text: "Hygiene stations properly equipped", maxScore: 2 },
    { sr: 43, text: "Sanitizer bottles at all strategic locations", maxScore: 2 },
    { sr: 44, text: "Loose Jewellery removed", maxScore: 2 },
    { sr: 45, text: "No smoking, spitting, chewing evident", maxScore: 2 },
  ]},
  { section: "Equipment and Fixtures", items: [
    { sr: 46, text: "Equipment non-toxic, non-corrosive material", maxScore: 2 },
    { sr: 47, text: "Cleaning as per schedule", maxScore: 2 },
    { sr: 48, text: "Preventive maintenance done regularly", maxScore: 2 },
    { sr: 49, text: "List of critical spares available", maxScore: 2 },
    { sr: 50, text: "Measuring devices calibrated periodically", maxScore: 2 },
    { sr: 51, text: "No temporary repairs observed", maxScore: 2 },
    { sr: 52, text: "Unnecessary equipment labelled/removed", maxScore: 2 },
  ]},
  { section: "Pest Control", items: [
    { sr: 53, text: "Pest control program available, carried out by trained personnel", maxScore: 4 },
    { sr: 54, text: "Spraying/Treatment as per schedule", maxScore: 2 },
    { sr: 55, text: "No signs of pest activity", maxScore: 2 },
    { sr: 56, text: "Rodent boxes in place with proper numbering", maxScore: 2 },
    { sr: 57, text: "No evidence of live pest/birds", maxScore: 2 },
    { sr: 58, text: "Fly Catchers operational at every entrance", maxScore: 2 },
  ]},
  { section: "Training and Complaint Handling", items: [
    { sr: 59, text: "Internal/External audit done periodically", maxScore: 2 },
    { sr: 60, text: "Effective consumer complaints mechanism", maxScore: 2 },
    { sr: 61, text: "Food handlers trained to handle food safely", maxScore: 2 },
    { sr: 62, text: "Personnel aware of emergency procedures", maxScore: 2 },
    { sr: 63, text: "First-Aid box available with contents", maxScore: 2 },
  ]},
  { section: "Documentation and Record Keeping", items: [
    { sr: 64, text: "Documentation retained for 1 year or shelf-life", maxScore: 4 },
    { sr: 65, text: "Daily Hygiene records up to date", maxScore: 2 },
    { sr: 66, text: "SOPs displayed on site", maxScore: 2 },
    { sr: 67, text: "Recall plan & Traceability SOP in place", maxScore: 2 },
  ]},
  { section: "COLD STORAGE & WAREHOUSE", items: [
    { sr: 68, text: "Facility capable of maintaining temperature", maxScore: 4 },
    { sr: 69, text: "Cold Room clean, free from mold", maxScore: 2 },
    { sr: 70, text: "Products on pallets, away from wall, labelled", maxScore: 2 },
    { sr: 71, text: "FIFO/FEFO practiced, no expired product", maxScore: 2 },
  ]},
  { section: "TRANSPORT", items: [
    { sr: 72, text: "Transporter has updated FSSAI license", maxScore: 2 },
    { sr: 73, text: "Vehicle covered, intact, no rusting", maxScore: 4 },
    { sr: 74, text: "Vehicle equipped for temperature control", maxScore: 2 },
    { sr: 75, text: "Proper locking/sealing facility", maxScore: 2 },
    { sr: 76, text: "Bulk foodstuffs in reserved containers marked 'for foodstuffs only'", maxScore: 4 },
    { sr: 77, text: "Unfit food during transport identified & disposed", maxScore: 2 },
  ]},
];

interface CAPARow { id: number; nonConformity: string; correctiveAction: string; preventiveAction: string; doneBy: string; verifiedBy: string; }

interface GMPGHPInspectionProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function MonthlyGMPGHPInspection({ initialData, onSubmit, isEdit }: GMPGHPInspectionProps = {}) {
  const [scores, setScores] = useState<Record<number, { obtained: string; remarks: string }>>(() => {
    if (initialData?.scores) return initialData.scores;
    return {};
  });
  const [auditorName, setAuditorName] = useState(initialData?.auditor_name || "");
  const [auditeeName, setAuditeeName] = useState(initialData?.auditee_name || "");
  const [auditDateTime, setAuditDateTime] = useState(initialData?.audit_datetime || "");
  const [capaRows, setCapaRows] = useState<CAPARow[]>(() => {
    if (initialData?.capa_rows && Array.isArray(initialData.capa_rows)) {
      return initialData.capa_rows.map((r: any, i: number) => ({ id: i + 1, nonConformity: r.non_conformity || "", correctiveAction: r.corrective_action || "", preventiveAction: r.preventive_action || "", doneBy: r.done_by || "", verifiedBy: r.verified_by || "" }));
    }
    return Array.from({ length: 5 }, (_, i) => ({ id: i + 1, nonConformity: "", correctiveAction: "", preventiveAction: "", doneBy: "", verifiedBy: "" }));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateScore = (sr: number, field: "obtained" | "remarks", value: string) => setScores((p) => ({ ...p, [sr]: { ...p[sr], obtained: p[sr]?.obtained || "", remarks: p[sr]?.remarks || "", [field]: value } }));
  const addCapa = () => setCapaRows((p) => [...p, { id: p.length + 1, nonConformity: "", correctiveAction: "", preventiveAction: "", doneBy: "", verifiedBy: "" }]);

  // Calculate totals
  const allItems = GMP_SECTIONS.flatMap((s) => s.items);
  const totalMax = allItems.reduce((sum, i) => sum + i.maxScore, 0);
  const totalObt = allItems.reduce((sum, i) => sum + (parseFloat(scores[i.sr]?.obtained || "0") || 0), 0);
  const percentage = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : "0";
  const rating = parseFloat(percentage) >= 85 ? "A — Excellent" : parseFloat(percentage) >= 70 ? "B — Average (Improvement needed)" : "C — Poor (Urgent attention needed)";
  const ratingColor = parseFloat(percentage) >= 85 ? "text-green-700 bg-green-50" : parseFloat(percentage) >= 70 ? "text-yellow-700 bg-yellow-50" : "text-red-700 bg-red-50";

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      audit_datetime: auditDateTime,
      auditor_name: auditorName,
      auditee_name: auditeeName,
      scores,
      percentage: parseFloat(percentage),
      rating,
      capa_rows: capaRows.filter((r) => r.nonConformity).map((r) => ({ non_conformity: r.nonConformity, corrective_action: r.correctiveAction, preventive_action: r.preventiveAction, done_by: r.doneBy, verified_by: r.verifiedBy })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("gmp-ghp-inspection", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Monthly Facility (GMP) & GHP Inspection</p><p className="text-xs text-gray-600">Doc No: CFPLA.C3.F.15 | Issue No: 5 | Rev Date: 28/08/2025 | Rev No: 4</p></div>
      </div>

      {/* Live Score Bar */}
      <div className={`mb-4 p-3 rounded-lg border ${ratingColor}`}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">{totalObt} / {totalMax} ({percentage}%)</span>
          <span className="font-semibold">{rating}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(percentage), 100)}%`, backgroundColor: parseFloat(percentage) >= 85 ? "#16a34a" : parseFloat(percentage) >= 70 ? "#ca8a04" : "#dc2626" }} /></div>
      </div>

      {/* Checklist */}
      <div className="border border-gray-300 rounded overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr><th className="border border-gray-300 px-1 py-2 w-10">Sr</th><th className="border border-gray-300 px-2 py-2">GMP and GHP Checklist</th><th className="border border-gray-300 px-1 py-2 w-12">Max</th><th className="border border-gray-300 px-1 py-2 w-16">Obt.</th><th className="border border-gray-300 px-2 py-2 w-48">Remarks</th></tr>
          </thead>
          <tbody>
            {GMP_SECTIONS.map((section) => (
              <Fragment key={section.section}>
                <tr><td colSpan={5} className="border border-gray-300 px-2 py-2 bg-blue-50 font-bold text-sm">{section.section}</td></tr>
                {section.items.map((item) => (
                  <tr key={item.sr} className="hover:bg-blue-50">
                    <td className="border border-gray-300 px-1 py-1 text-center font-medium">{item.sr}</td>
                    <td className="border border-gray-300 px-2 py-1">{item.text}</td>
                    <td className="border border-gray-300 px-1 py-1 text-center font-bold">{item.maxScore}</td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input type="number" min="0" max={item.maxScore} value={scores[item.sr]?.obtained || ""} onChange={(e) => updateScore(item.sr, "obtained", e.target.value)}
                        className={`w-full border rounded px-1 py-0.5 text-center ${scores[item.sr]?.obtained ? (parseFloat(scores[item.sr].obtained) >= item.maxScore ? "bg-green-100" : "bg-yellow-100") : ""}`} />
                    </td>
                    <td className="border border-gray-300 px-1 py-1"><input type="text" value={scores[item.sr]?.remarks || ""} onChange={(e) => updateScore(item.sr, "remarks", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Info */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div><label className="text-xs font-medium">Name of Auditor</label><input type="text" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
        <div><label className="text-xs font-medium">Name of Auditee</label><input type="text" value={auditeeName} onChange={(e) => setAuditeeName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
        <div><label className="text-xs font-medium">Date/Time of Audit</label><input type="datetime-local" value={auditDateTime} onChange={(e) => setAuditDateTime(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
      </div>

      {/* CAPA Table */}
      <h3 className="font-semibold text-sm mb-2">Corrective and Preventive Action</h3>
      <div className="overflow-x-auto border border-gray-300 rounded mb-4">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr><th className="border border-gray-300 px-2 py-1">Non Conformities</th><th className="border border-gray-300 px-2 py-1">Correction/Corrective Action</th><th className="border border-gray-300 px-2 py-1">Preventive Action</th><th className="border border-gray-300 px-2 py-1">Done By</th><th className="border border-gray-300 px-2 py-1">Verified By</th></tr>
          </thead>
          <tbody>
            {capaRows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["nonConformity", "correctiveAction", "preventiveAction", "doneBy", "verifiedBy"] as (keyof CAPARow)[]).map((f) => (
                  <td key={f} className="border border-gray-300 px-1 py-1"><input type="text" value={r[f] as string} onChange={(e) => setCapaRows((p) => p.map((row) => row.id === r.id ? { ...row, [f]: e.target.value } : row))} className="w-full border rounded px-1 py-0.5" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addCapa} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">+ Add CAPA Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved By: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export default NewProductVerification;
