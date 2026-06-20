"use client";
import { Fragment, useState } from "react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

// ===================== F.13 — New Product Verification =====================
interface SensoryRow { id: number; panelName: string; taste: "Ok" | "Not ok" | ""; odor: "Ok" | "Not ok" | ""; appearance: "Ok" | "Not ok" | ""; mouthfeel: "Ok" | "Not ok" | ""; decision: "Accept" | "Reject" | ""; signature: string; }
const emptySensoryRow = (id: number): SensoryRow => ({ id, panelName: "", taste: "", odor: "", appearance: "", mouthfeel: "", decision: "", signature: "" });

interface IngredientRow { id: number; ingredient: string; variety: string; vendor: string; percentage: string; specification: string; protein: string; fiber: string; sugar: string; energy: string; }
const emptyIngredientRow = (id: number): IngredientRow => ({ id, ingredient: "", variety: "", vendor: "", percentage: "", specification: "", protein: "", fiber: "", sugar: "", energy: "" });
const INGREDIENT_COLS: { key: keyof Omit<IngredientRow, "id">; label: string; min: string; optional?: boolean }[] = [
  // First five are mandatory (always shown, no checkbox); the rest are optional (toggle via checkbox).
  { key: "ingredient", label: "Ingredient", min: "min-w-[150px]" },
  { key: "variety", label: "Variety", min: "min-w-[120px]" },
  { key: "vendor", label: "Vendor", min: "min-w-[120px]" },
  { key: "percentage", label: "Percentage (%)", min: "min-w-[90px]" },
  { key: "specification", label: "Specification / Preparation", min: "min-w-[170px]" },
  { key: "protein", label: "Protein", min: "min-w-[80px]", optional: true },
  { key: "fiber", label: "Fiber", min: "min-w-[80px]", optional: true },
  { key: "sugar", label: "Sugar", min: "min-w-[80px]", optional: true },
  { key: "energy", label: "Energy (kcal)", min: "min-w-[90px]", optional: true },
];

// One trial = the Trial Information → Chemical Analysis block (repeated via tabs).
interface Trial {
  date: string; productName: string; customerName: string; trialNo: string;
  personsPresent: string; preroastingTemp: string; batchNumber: string; bakingTemp: string;
  ingredientChanges: string; flowChart: string; equipmentAdded: string;
  ingredientRows: IngredientRow[]; sensoryRows: SensoryRow[];
  moisture: string; fat: string; acidValue: string; peroxideValue: string; salt: string; ph: string;
}
const mapIngredients = (src: any): IngredientRow[] => {
  if (Array.isArray(src)) return src.map((r: any, i: number) => ({ id: i + 1, ingredient: r.ingredient || "", variety: r.variety || "", vendor: r.vendor || "", percentage: r.percentage || "", specification: r.specification || "", protein: r.protein || "", fiber: r.fiber || "", sugar: r.sugar || "", energy: r.energy || "" }));
  if (typeof src === "string" && src.trim()) return [{ ...emptyIngredientRow(1), ingredient: src }];
  return Array.from({ length: 3 }, (_, i) => emptyIngredientRow(i + 1));
};
const mapSensory = (src: any): SensoryRow[] => {
  if (Array.isArray(src)) return src.map((r: any, i: number) => ({ id: i + 1, panelName: r.panel_name || r.panelName || "", taste: r.taste || "", odor: r.odor || "", appearance: r.appearance || "", mouthfeel: r.mouthfeel || "", decision: r.decision || "", signature: r.signature || "" }));
  return Array.from({ length: 3 }, (_, i) => emptySensoryRow(i + 1));
};
const makeTrial = (src?: any): Trial => ({
  date: src?.verify_date ?? src?.date ?? "",
  productName: src?.product_name ?? src?.productName ?? "",
  customerName: src?.customer_name ?? src?.customerName ?? "",
  trialNo: src?.trial_no ?? src?.trialNo ?? "",
  personsPresent: src?.persons_present ?? src?.personsPresent ?? "",
  preroastingTemp: src?.preroasting_temp ?? src?.preroastingTemp ?? "",
  batchNumber: src?.batch_number ?? src?.batchNumber ?? "",
  bakingTemp: src?.baking_temp ?? src?.bakingTemp ?? "",
  ingredientChanges: src?.ingredient_changes ?? src?.ingredientChanges ?? "",
  flowChart: src?.flow_chart ?? src?.flowChart ?? "",
  equipmentAdded: src?.equipment_added ?? src?.equipmentAdded ?? "",
  ingredientRows: mapIngredients(src?.ingredients_used ?? src?.ingredientRows),
  sensoryRows: mapSensory(src?.sensory_rows ?? src?.sensoryRows),
  moisture: src?.moisture != null ? String(src.moisture) : "",
  fat: src?.fat != null ? String(src.fat) : "",
  acidValue: src?.acid_value != null ? String(src.acid_value) : (src?.acidValue ?? ""),
  peroxideValue: src?.peroxide_value != null ? String(src.peroxide_value) : (src?.peroxideValue ?? ""),
  salt: src?.salt != null ? String(src.salt) : "",
  ph: src?.ph != null ? String(src.ph) : "",
});
const numOrNull = (s: string) => (s ? Number(s) : null);
const trialPayload = (tr: Trial) => ({
  verify_date: tr.date, product_name: tr.productName, customer_name: tr.customerName, trial_no: tr.trialNo,
  persons_present: tr.personsPresent, preroasting_temp: tr.preroastingTemp, batch_number: tr.batchNumber, baking_temp: tr.bakingTemp,
  ingredient_changes: tr.ingredientChanges, flow_chart: tr.flowChart, equipment_added: tr.equipmentAdded,
  ingredients_used: tr.ingredientRows.filter((r) => r.ingredient.trim() || r.variety.trim() || r.vendor.trim() || r.percentage.trim() || r.specification.trim()).map((r) => ({ ingredient: r.ingredient, variety: r.variety, vendor: r.vendor, percentage: r.percentage, specification: r.specification, protein: r.protein, fiber: r.fiber, sugar: r.sugar, energy: r.energy })),
  sensory_rows: tr.sensoryRows.filter((r) => r.panelName).map((r) => ({ panel_name: r.panelName, taste: r.taste, odor: r.odor, appearance: r.appearance, mouthfeel: r.mouthfeel, decision: r.decision, signature: r.signature })),
  moisture: numOrNull(tr.moisture), fat: numOrNull(tr.fat), acid_value: numOrNull(tr.acidValue), peroxide_value: numOrNull(tr.peroxideValue), salt: numOrNull(tr.salt), ph: numOrNull(tr.ph),
});

// One pilot = the Pilot Run Details block (repeated via tabs).
interface Pilot {
  labTrialName: string; pilotQty: string; pilotBatch: string; pilotSuccess: string; pilotPersons: string;
  packagingMaterial: string; claims: string; regulatory: string; shelfLife: string;
  storageCondition: string; haccpImpact: string; crossContamination: string;
}
const makePilot = (src?: any): Pilot => ({
  labTrialName: src?.lab_trial_name ?? src?.labTrialName ?? "",
  pilotQty: src?.pilot_qty ?? src?.pilotQty ?? "",
  pilotBatch: src?.pilot_batch ?? src?.pilotBatch ?? "",
  pilotSuccess: src?.pilot_success ?? src?.pilotSuccess ?? "",
  pilotPersons: src?.pilot_persons ?? src?.pilotPersons ?? "",
  packagingMaterial: src?.packaging_material ?? src?.packagingMaterial ?? "",
  claims: src?.claims ?? "",
  regulatory: src?.regulatory ?? "",
  shelfLife: src?.shelf_life ?? src?.shelfLife ?? "",
  storageCondition: src?.storage_condition ?? src?.storageCondition ?? "",
  haccpImpact: src?.haccp_impact ?? src?.haccpImpact ?? "",
  crossContamination: src?.cross_contamination ?? src?.crossContamination ?? "",
});
const pilotPayload = (p: Pilot) => ({
  lab_trial_name: p.labTrialName, pilot_qty: p.pilotQty, pilot_batch: p.pilotBatch,
  pilot_success: p.pilotSuccess, pilot_persons: p.pilotPersons,
  packaging_material: p.packagingMaterial, claims: p.claims, regulatory: p.regulatory,
  shelf_life: p.shelfLife, storage_condition: p.storageCondition,
  haccp_impact: p.haccpImpact, cross_contamination: p.crossContamination,
});

interface NewProductVerificationProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function NewProductVerification({ initialData, onSubmit, isEdit }: NewProductVerificationProps = {}) {
  // Trials: each holds Trial Information → Chemical Analysis. Tabs switch between them.
  const [trials, setTrials] = useState<Trial[]>(() => {
    if (Array.isArray(initialData?.trials) && initialData.trials.length) return initialData.trials.map(makeTrial);
    return [makeTrial(initialData)];
  });
  const [activeTrial, setActiveTrial] = useState(0);
  const t = trials[activeTrial] ?? trials[0];
  const patchTrial = (patch: Partial<Trial>) =>
    setTrials((prev) => prev.map((tr, i) => (i === activeTrial ? { ...tr, ...patch } : tr)));

  const addTrial = () => { setTrials((prev) => [...prev, makeTrial()]); setActiveTrial(trials.length); };
  const removeTrial = (idx: number) => {
    if (trials.length <= 1) return;
    setTrials((prev) => prev.filter((_, i) => i !== idx));
    setActiveTrial((a) => {
      let na = a === idx ? Math.max(0, idx - 1) : a > idx ? a - 1 : a;
      return Math.min(na, trials.length - 2);
    });
  };

  // Per-trial accessors — read the active trial; setters patch it (so existing JSX is unchanged).
  const date = t.date, setDate = (v: string) => patchTrial({ date: v });
  const productName = t.productName, setProductName = (v: string) => patchTrial({ productName: v });
  const customerName = t.customerName, setCustomerName = (v: string) => patchTrial({ customerName: v });
  const trialNo = t.trialNo, setTrialNo = (v: string) => patchTrial({ trialNo: v });
  const personsPresent = t.personsPresent, setPersonsPresent = (v: string) => patchTrial({ personsPresent: v });
  const preroastingTemp = t.preroastingTemp, setPreroastingTemp = (v: string) => patchTrial({ preroastingTemp: v });
  const batchNumber = t.batchNumber, setBatchNumber = (v: string) => patchTrial({ batchNumber: v });
  const bakingTemp = t.bakingTemp, setBakingTemp = (v: string) => patchTrial({ bakingTemp: v });
  const ingredientChanges = t.ingredientChanges, setIngredientChanges = (v: string) => patchTrial({ ingredientChanges: v });
  const flowChart = t.flowChart, setFlowChart = (v: string) => patchTrial({ flowChart: v });
  const equipmentAdded = t.equipmentAdded, setEquipmentAdded = (v: string) => patchTrial({ equipmentAdded: v });
  const moisture = t.moisture, setMoisture = (v: string) => patchTrial({ moisture: v });
  const fat = t.fat, setFat = (v: string) => patchTrial({ fat: v });
  const acidValue = t.acidValue, setAcidValue = (v: string) => patchTrial({ acidValue: v });
  const peroxideValue = t.peroxideValue, setPeroxideValue = (v: string) => patchTrial({ peroxideValue: v });
  const salt = t.salt, setSalt = (v: string) => patchTrial({ salt: v });
  const ph = t.ph, setPh = (v: string) => patchTrial({ ph: v });
  const ingredientRows = t.ingredientRows;
  const setIngredientRows = (u: IngredientRow[] | ((p: IngredientRow[]) => IngredientRow[])) =>
    setTrials((prev) => prev.map((tr, i) => (i === activeTrial ? { ...tr, ingredientRows: typeof u === "function" ? (u as any)(tr.ingredientRows) : u } : tr)));
  const sensoryRows = t.sensoryRows;
  const setSensoryRows = (u: SensoryRow[] | ((p: SensoryRow[]) => SensoryRow[])) =>
    setTrials((prev) => prev.map((tr, i) => (i === activeTrial ? { ...tr, sensoryRows: typeof u === "function" ? (u as any)(tr.sensoryRows) : u } : tr)));
  // Pilots: each holds the Pilot Run Details block. Tabs switch between them.
  const [pilots, setPilots] = useState<Pilot[]>(() => {
    if (Array.isArray(initialData?.pilots) && initialData.pilots.length) return initialData.pilots.map(makePilot);
    return [makePilot(initialData)];
  });
  const [activePilot, setActivePilot] = useState(0);
  const pl = pilots[activePilot] ?? pilots[0];
  const patchPilot = (patch: Partial<Pilot>) =>
    setPilots((prev) => prev.map((pv, i) => (i === activePilot ? { ...pv, ...patch } : pv)));
  const addPilot = () => { setPilots((prev) => [...prev, makePilot()]); setActivePilot(pilots.length); };
  const removePilot = (idx: number) => {
    if (pilots.length <= 1) return;
    setPilots((prev) => prev.filter((_, i) => i !== idx));
    setActivePilot((a) => {
      let na = a === idx ? Math.max(0, idx - 1) : a > idx ? a - 1 : a;
      return Math.min(na, pilots.length - 2);
    });
  };
  const labTrialName = pl.labTrialName, setLabTrialName = (v: string) => patchPilot({ labTrialName: v });
  const pilotQty = pl.pilotQty, setPilotQty = (v: string) => patchPilot({ pilotQty: v });
  const pilotBatch = pl.pilotBatch, setPilotBatch = (v: string) => patchPilot({ pilotBatch: v });
  const pilotSuccess = pl.pilotSuccess, setPilotSuccess = (v: string) => patchPilot({ pilotSuccess: v });
  const pilotPersons = pl.pilotPersons, setPilotPersons = (v: string) => patchPilot({ pilotPersons: v });
  const packagingMaterial = pl.packagingMaterial, setPackagingMaterial = (v: string) => patchPilot({ packagingMaterial: v });
  const claims = pl.claims, setClaims = (v: string) => patchPilot({ claims: v });
  const regulatory = pl.regulatory, setRegulatory = (v: string) => patchPilot({ regulatory: v });
  const shelfLife = pl.shelfLife, setShelfLife = (v: string) => patchPilot({ shelfLife: v });
  const storageCondition = pl.storageCondition, setStorageCondition = (v: string) => patchPilot({ storageCondition: v });
  const haccpImpact = pl.haccpImpact, setHaccpImpact = (v: string) => patchPilot({ haccpImpact: v });
  const crossContamination = pl.crossContamination, setCrossContamination = (v: string) => patchPilot({ crossContamination: v });
  const [supervisorName, setSupervisorName] = useState(initialData?.supervisor_name || ""); const [productionManagerName, setProductionManagerName] = useState(initialData?.production_manager_name || "");
  const [approvedByName, setApprovedByName] = useState(initialData?.approved_by_name || ""); const [customerRepName, setCustomerRepName] = useState(initialData?.customer_rep_name || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // Optional ingredient columns (Protein/Fiber/Sugar/Energy) can be toggled; the 3 core columns are always shown.
  const [hiddenIngCols, setHiddenIngCols] = useState<Record<string, boolean>>({});
  const toggleIngCol = (key: string) => setHiddenIngCols((p) => ({ ...p, [key]: !p[key] }));

  const addSensoryRow = () => setSensoryRows((p) => [...p, emptySensoryRow(p.length + 1)]);
  const addIngredientRow = () => setIngredientRows((p) => [...p, emptyIngredientRow(p.length + 1)]);
  const removeIngredientRow = (id: number) => setIngredientRows((p) => p.filter((s) => s.id !== id));
  const OkSel = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-md px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
        value === "Ok"
          ? "bg-success-50 text-success-700 border-success-200"
          : value === "Not ok"
          ? "bg-danger-50 text-danger-600 border-danger-200"
          : "bg-cream-50 border-cream-300 text-ink-500"
      }`}
    >
      <option value="">—</option><option value="Ok">Ok</option><option value="Not ok">Not ok</option>
    </select>
  );

  const fields = [
    { label: "Date", value: date, set: setDate, type: "date" }, { label: "Product Name", value: productName, set: setProductName },
    { label: "Customer Name", value: customerName, set: setCustomerName }, { label: "Trial No", value: trialNo, set: setTrialNo },
    { label: "Persons Present for Trial", value: personsPresent, set: setPersonsPresent },
    { label: "Time & Temp for Preroasting (if applicable)", value: preroastingTemp, set: setPreroastingTemp }, { label: "Batch Number", value: batchNumber, set: setBatchNumber },
    { label: "Time & Temp for Baking/Roasting (if applicable)", value: bakingTemp, set: setBakingTemp },
    { label: "Ingredients Changed/Replaced (if any)", value: ingredientChanges, set: setIngredientChanges },
    { label: "Flow Chart/Line Used for Pilot Run", value: flowChart, set: setFlowChart }, { label: "Equipment Added (if any)", value: equipmentAdded, set: setEquipmentAdded },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      // Trial 1 is mirrored to the top-level columns so list/view/print keep working.
      ...trialPayload(trials[0]),
      trials: trials.map(trialPayload),
      // Pilot 1 is mirrored to the top-level columns so list/view/print keep working.
      ...pilotPayload(pilots[0]),
      pilots: pilots.map(pilotPayload),
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
    <div className="space-y-5">
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-ink-600">Trial Information</h2>
            <button type="button" onClick={addTrial} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Trial</button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {trials.map((_, i) => (
              <div
                key={i}
                className={`inline-flex items-center rounded-md border text-xs font-semibold transition-colors ${
                  i === activeTrial ? "bg-brand-500 text-white border-brand-500" : "bg-cream-50 text-ink-500 border-cream-300 hover:border-brand-400"
                }`}
              >
                <button type="button" onClick={() => setActiveTrial(i)} className="px-2.5 py-1">Trial {i + 1}</button>
                {trials.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTrial(i)}
                    title={`Remove Trial ${i + 1}`}
                    className={`pr-1.5 pl-0.5 leading-none ${i === activeTrial ? "text-white/80 hover:text-white" : "text-ink-300 hover:text-danger-600"}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </header>
        <div className="divide-y divide-cream-300">
          {fields.map((f) => (
            <div key={f.label} className="grid grid-cols-1 sm:grid-cols-[35%_65%] gap-1 sm:gap-0">
              <label className="px-4 sm:px-5 pt-3 sm:py-3 text-xs sm:text-sm font-semibold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center">{f.label}</label>
              <div className="px-3 sm:px-4 pb-3 sm:py-2.5">
                <input type={f.type || "text"} value={f.value} onChange={(e) => f.set(e.target.value)} className="input-base !py-2 !px-3" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-cream-300">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-cream-100/40">
            <h3 className="text-xs sm:text-sm font-semibold text-ink-500">Ingredients list</h3>
            <button type="button" onClick={addIngredientRow} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Ingredient</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100/70 border-b border-cream-300">
                <tr>
                  {INGREDIENT_COLS.map((c) => {
                    if (!c.optional) {
                      return (
                        <th key={c.key} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 whitespace-nowrap">
                          {c.label}
                        </th>
                      );
                    }
                    const hidden = !!hiddenIngCols[c.key];
                    return (
                      <th key={c.key} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 whitespace-nowrap">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none" title={hidden ? `Show ${c.label}` : `Hide ${c.label}`}>
                          <input type="checkbox" checked={!hidden} onChange={() => toggleIngCol(c.key)} className="accent-brand-600 w-3.5 h-3.5" />
                          {!hidden && <span>{c.label}</span>}
                        </label>
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 w-10 text-[11px] font-semibold uppercase tracking-wider text-ink-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {ingredientRows.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-100/60">
                    {INGREDIENT_COLS.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        {!hiddenIngCols[c.key] && (
                          <input type="text" value={r[c.key]} onChange={(e) => setIngredientRows((p) => p.map((s) => s.id === r.id ? { ...s, [c.key]: e.target.value } : s))} className={`input-base !py-1 !px-2 text-sm ${c.min}`} />
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeIngredientRow(r.id)} title="Remove ingredient" className="inline-flex items-center justify-center w-6 h-6 rounded-md text-danger-500 hover:bg-danger-50 hover:text-danger-600 transition-colors text-sm font-bold leading-none">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Sensory Analysis</h2>
          <button onClick={addSensoryRow} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Panelist</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["Panel", "Taste", "Odor", "Appearance", "Mouthfeel", "Decision", "Signature"].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {sensoryRows.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1"><input type="text" value={r.panelName} onChange={(e) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, panelName: e.target.value } : s))} className="input-base !py-1 !px-2 text-sm" /></td>
                  <td className="px-1 py-1"><OkSel value={r.taste} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, taste: v as any } : s))} /></td>
                  <td className="px-1 py-1"><OkSel value={r.odor} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, odor: v as any } : s))} /></td>
                  <td className="px-1 py-1"><OkSel value={r.appearance} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, appearance: v as any } : s))} /></td>
                  <td className="px-1 py-1"><OkSel value={r.mouthfeel} onChange={(v) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, mouthfeel: v as any } : s))} /></td>
                  <td className="px-1 py-1">
                    <select
                      value={r.decision}
                      onChange={(e) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, decision: e.target.value as any } : s))}
                      className={`w-full border rounded-md px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                        r.decision === "Accept"
                          ? "bg-success-50 text-success-700 border-success-200"
                          : r.decision === "Reject"
                          ? "bg-danger-50 text-danger-600 border-danger-200"
                          : "bg-cream-50 border-cream-300 text-ink-500"
                      }`}
                    >
                      <option value="">—</option><option value="Accept">Accept</option><option value="Reject">Reject</option>
                    </select>
                  </td>
                  <td className="px-1 py-1"><input type="text" value={r.signature} onChange={(e) => setSensoryRows((p) => p.map((s) => s.id === r.id ? { ...s, signature: e.target.value } : s))} className="input-base !py-1 !px-2 text-sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Chemical Analysis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[{ l: "Moisture %", v: moisture, s: setMoisture }, { l: "Fat %", v: fat, s: setFat }, { l: "Acid Value", v: acidValue, s: setAcidValue }, { l: "Peroxide Value", v: peroxideValue, s: setPeroxideValue }, { l: "Salt %", v: salt, s: setSalt }, { l: "pH", v: ph, s: setPh }].map((f) => (
            <div key={f.l}>
              <label className="label-base">{f.l}</label>
              <input type="number" value={f.v} onChange={(e) => f.s(e.target.value)} className="input-base" step="0.01" />
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-ink-600">Pilot Run Details</h2>
            <button type="button" onClick={addPilot} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Pilot</button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {pilots.map((_, i) => (
              <div
                key={i}
                className={`inline-flex items-center rounded-md border text-xs font-semibold transition-colors ${
                  i === activePilot ? "bg-brand-500 text-white border-brand-500" : "bg-cream-50 text-ink-500 border-cream-300 hover:border-brand-400"
                }`}
              >
                <button type="button" onClick={() => setActivePilot(i)} className="px-2.5 py-1">Pilot {i + 1}</button>
                {pilots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePilot(i)}
                    title={`Remove Pilot ${i + 1}`}
                    className={`pr-1.5 pl-0.5 leading-none ${i === activePilot ? "text-white/80 hover:text-white" : "text-ink-300 hover:text-danger-600"}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </header>
        <div className="divide-y divide-cream-300">
          {[{ l: "Lab Scale Trial Done By", v: labTrialName, s: setLabTrialName }, { l: "Quantity for Pilot Run (kg)", v: pilotQty, s: setPilotQty }, { l: "Batch Number", v: pilotBatch, s: setPilotBatch },
            { l: "Pilot Scale Production Done Successfully?", v: pilotSuccess, s: setPilotSuccess }, { l: "Persons Present for Pilot Run", v: pilotPersons, s: setPilotPersons },
            { l: "Packaging Material Used", v: packagingMaterial, s: setPackagingMaterial }, { l: "Any Claims for the Product", v: claims, s: setClaims },
            { l: "Any Regulatory Details", v: regulatory, s: setRegulatory }, { l: "Shelf Life of the Product", v: shelfLife, s: setShelfLife },
            { l: "Storage Condition", v: storageCondition, s: setStorageCondition }, { l: "Chances of Hampering Process/HACCP?", v: haccpImpact, s: setHaccpImpact },
            { l: "Cross Contamination Risk?", v: crossContamination, s: setCrossContamination },
          ].map((f) => (
            <div key={f.l} className="grid grid-cols-1 sm:grid-cols-[50%_50%] gap-1 sm:gap-0">
              <label className="px-4 sm:px-5 pt-3 sm:py-3 text-xs sm:text-sm font-semibold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center">{f.l}</label>
              <div className="px-3 sm:px-4 pb-3 sm:py-2.5">
                <input type="text" value={f.v} onChange={(e) => f.s(e.target.value)} className="input-base !py-2 !px-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Approvals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label-base">Pilot Run Supervisor Name</label><input type="text" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">Production Manager Name</label><input type="text" value={productionManagerName} onChange={(e) => setProductionManagerName(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">Approved by (FSTL) Name</label><input type="text" value={approvedByName} onChange={(e) => setApprovedByName(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">Customer Representative</label><input type="text" value={customerRepName} onChange={(e) => setCustomerRepName(e.target.value)} className="input-base" /></div>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
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
      warehouse: getStoredWarehouse() || null,
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
    <div className="space-y-5">
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Drill Record</h2>
        </header>
        <div className="divide-y divide-cream-300">
          {ITEMS.map((item) => (
            <div key={item.sr} className="grid grid-cols-1 sm:grid-cols-[10%_40%_50%] gap-1 sm:gap-0">
              <label className="px-3 sm:px-4 pt-3 sm:py-3 text-xs sm:text-sm font-bold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center justify-center">{item.sr}</label>
              <label className="px-3 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center">{item.label}</label>
              <div className="px-3 sm:px-4 pb-3 sm:py-2.5">
                {item.type === "textarea" ? (
                  <textarea value={fields[item.sr] || ""} onChange={(e) => update(item.sr, e.target.value)} rows={3} className="input-base !py-2 !px-3" />
                ) : (
                  <input type={item.type} value={fields[item.sr] || ""} onChange={(e) => update(item.sr, e.target.value)} className="input-base !py-2 !px-3" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
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
    // New record: pre-fill Obtained with each item's Max score (editable).
    const init: Record<number, { obtained: string; remarks: string }> = {};
    GMP_SECTIONS.forEach((s) => s.items.forEach((i) => { init[i.sr] = { obtained: String(i.maxScore), remarks: "" }; }));
    return init;
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
  const ratingTone =
    parseFloat(percentage) >= 85
      ? "border-success-500 bg-success-50/60 text-success-700"
      : parseFloat(percentage) >= 70
      ? "border-warning-500 bg-warning-50/60 text-warning-700"
      : "border-danger-500 bg-danger-50/60 text-danger-600";
  const barColor = parseFloat(percentage) >= 85 ? "#16a34a" : parseFloat(percentage) >= 70 ? "#d97706" : "#dc2626";

  // Scoring card — group the checklist into the three summary categories from the format.
  const groupDefs: { label: string; match: (name: string) => boolean }[] = [
    { label: "Manufacturing and facility", match: (n) => n !== "COLD STORAGE & WAREHOUSE" && n !== "TRANSPORT" },
    { label: "Cold storage and warehouse", match: (n) => n === "COLD STORAGE & WAREHOUSE" },
    { label: "Transport", match: (n) => n === "TRANSPORT" },
  ];
  const scoreGroups = groupDefs.map((g) => {
    const items = GMP_SECTIONS.filter((s) => g.match(s.section)).flatMap((s) => s.items);
    const max = items.reduce((sum, i) => sum + i.maxScore, 0);
    const obtained = items.reduce((sum, i) => sum + (parseFloat(scores[i.sr]?.obtained || "0") || 0), 0);
    return { label: g.label, max, obtained, percent: max > 0 ? ((obtained / max) * 100).toFixed(1) : "0" };
  });
  const RATING_BANDS = [
    { range: "Above 85%", status: "Excellent", grade: "A" },
    { range: "70-85%", status: "Average — Improvement needed", grade: "B" },
    { range: "Below 70%", status: "Poor — Urgent attention needed", grade: "C" },
  ];
  const obtainedGrade = parseFloat(percentage) >= 85 ? "A" : parseFloat(percentage) >= 70 ? "B" : "C";

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
      rating: obtainedGrade, // rating column is VARCHAR(4) — store just the grade letter (A/B/C); full text is display-only
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
    <div className="space-y-5">
      <div className={`surface-card p-4 border-l-4 ${ratingTone}`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-ink-600">{totalObt}<span className="text-base text-ink-400">/{totalMax}</span></span>
            <span className="text-lg font-bold">{percentage}%</span>
          </div>
          <span className="text-sm font-semibold">{rating}</span>
        </div>
        <div className="w-full bg-cream-200 rounded-full h-2 mt-3">
          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(percentage), 100)}%`, backgroundColor: barColor }} />
        </div>
      </div>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">GMP & GHP Checklist</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-1 py-2 w-10 text-center text-[11px] font-semibold uppercase text-ink-400">Sr</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Checklist</th>
                <th className="px-1 py-2 w-12 text-center text-[11px] font-semibold uppercase text-ink-400">Max</th>
                <th className="px-1 py-2 w-16 text-center text-[11px] font-semibold uppercase text-ink-400">Obt</th>
                <th className="px-2 py-2 w-48 text-left text-[11px] font-semibold uppercase text-ink-400">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {GMP_SECTIONS.map((section) => (
                <Fragment key={section.section}>
                  <tr>
                    <td colSpan={5} className="px-3 py-2 bg-brand-50/60 font-bold text-xs text-brand-700 uppercase tracking-wider">{section.section}</td>
                  </tr>
                  {section.items.map((item) => (
                    <tr key={item.sr} className="hover:bg-cream-100/60">
                      <td className="px-1 py-1.5 text-center font-medium text-ink-400">{item.sr}</td>
                      <td className="px-2 py-1.5 text-ink-500">{item.text}</td>
                      <td className="px-1 py-1.5 text-center font-bold text-ink-500">{item.maxScore}</td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min="0"
                          max={item.maxScore}
                          value={scores[item.sr]?.obtained || ""}
                          onChange={(e) => updateScore(item.sr, "obtained", e.target.value)}
                          className={`input-base !py-1 !px-2 text-xs text-center ${
                            scores[item.sr]?.obtained
                              ? parseFloat(scores[item.sr].obtained) >= item.maxScore
                                ? "!bg-success-50 !text-success-700"
                                : "!bg-warning-50 !text-warning-700"
                              : ""
                          }`}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="text" value={scores[item.sr]?.remarks || ""} onChange={(e) => updateScore(item.sr, "remarks", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Scoring Card</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Section Description</th>
                {["Maximum Score", "Score Obtained", "Result (In %)"].map((h) => (
                  <th key={h} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {scoreGroups.map((g) => (
                <tr key={g.label} className="hover:bg-cream-100/60">
                  <td className="px-3 py-2 text-ink-600">{g.label}</td>
                  <td className="px-3 py-2 text-center font-semibold text-ink-500">{g.max}</td>
                  <td className="px-3 py-2 text-center font-semibold text-ink-600">{g.obtained}</td>
                  <td className="px-3 py-2 text-center font-semibold text-ink-600">{g.percent}%</td>
                </tr>
              ))}
              <tr className="bg-cream-100/70 font-bold">
                <td className="px-3 py-2 text-ink-700">Total Score</td>
                <td className="px-3 py-2 text-center text-ink-700">{totalMax}</td>
                <td className="px-3 py-2 text-center text-ink-700">{totalObt}</td>
                <td className="px-3 py-2 text-center text-ink-700">{percentage}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Audit Rating Chart</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["% Score", "Status", "Rating", "Obtained Rating"].map((h) => (
                  <th key={h} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {RATING_BANDS.map((b, idx) => (
                <tr key={b.grade} className={b.grade === obtainedGrade ? "bg-brand-50/60" : "hover:bg-cream-100/60"}>
                  <td className="px-3 py-2 text-center text-ink-600">{b.range}</td>
                  <td className="px-3 py-2 text-center text-ink-600">{b.status}</td>
                  <td className="px-3 py-2 text-center font-bold text-ink-600">{b.grade}</td>
                  {idx === 0 && (
                    <td rowSpan={RATING_BANDS.length} className="px-3 py-2 text-center align-middle border-l border-cream-300">
                      <span className="text-2xl font-bold text-brand-600">{obtainedGrade}</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Audit Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="label-base">Name of Auditor</label><input type="text" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">Name of Auditee</label><input type="text" value={auditeeName} onChange={(e) => setAuditeeName(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">Date/Time of Audit</label><input type="datetime-local" value={auditDateTime} onChange={(e) => setAuditDateTime(e.target.value)} className="input-base" /></div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Corrective & Preventive Action</h2>
          <button onClick={addCapa} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Row</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["Non-Conformity", "Corrective Action", "Preventive Action", "Done By", "Verified By"].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {capaRows.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  {(["nonConformity", "correctiveAction", "preventiveAction", "doneBy", "verifiedBy"] as (keyof CAPARow)[]).map((f) => (
                    <td key={f} className="px-1 py-1">
                      <input type="text" value={r[f] as string} onChange={(e) => setCapaRows((p) => p.map((row) => row.id === r.id ? { ...row, [f]: e.target.value } : row))} className="input-base !py-1 !px-2 text-xs" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewProductVerification;
