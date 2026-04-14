"use client";
import { Fragment, useState } from "react";

// ===================== Shared Props Interface =====================
interface DocFormProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

// ===================== SHARED: Vehicle Inspection (F.45 Incoming + F.46 Outgoing) =====================
const VEHICLE_EVAL_PARAMS = ["Security Lock", "Type of carrier (Full covered / Open roof)", "Mode of covering products (in case of open roof)", "Integrity of cover/container", "Overall hygiene in the interior & exterior", "Any sharp edges/points in the interior", "Any pest detected", "Any Grease/Oil Detected", "Any other material than food", "Any off odor (Yes/No)", "Vehicle Temperature (Cold/Ambient)"];

// Helper: convert label to snake_case key
const labelToKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function VehicleInspectionForm({ type, docNo, infoFields, initialData, onSubmit, isEdit, formType }: { type: "Incoming" | "Outgoing"; docNo: string; infoFields: { label: string; type?: string }[]; initialData?: Record<string, any>; onSubmit?: (data: Record<string, any>) => Promise<void>; isEdit?: boolean; formType: string }) {
  const [info, setInfo] = useState<Record<string, string>>(() => {
    if (initialData?.info && typeof initialData.info === "object") {
      const init: Record<string, string> = {};
      infoFields.forEach((f) => { const key = labelToKey(f.label); init[f.label] = initialData.info[key] || ""; });
      return init;
    }
    return {};
  });
  const [params, setParams] = useState<Record<string, string>>(() => {
    if (initialData?.params && typeof initialData.params === "object") {
      const init: Record<string, string> = {};
      VEHICLE_EVAL_PARAMS.forEach((p) => { const key = labelToKey(p); init[p] = initialData.params[key] || ""; });
      return init;
    }
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      info: Object.fromEntries(infoFields.map((f) => [labelToKey(f.label), info[f.label] || ""])),
      params: Object.fromEntries(VEHICLE_EVAL_PARAMS.map((p) => [labelToKey(p), params[p] || ""])),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create(formType, payload);
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
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">{type} Vehicle Inspection Record</p><p className="text-xs text-gray-600">Doc No: {docNo}</p></div></div>
      <h3 className="font-semibold text-sm mb-2">Vehicle Information</h3>
      <div className="border border-gray-300 rounded mb-4">{infoFields.map((f) => <div key={f.label} className="flex border-b border-gray-200 last:border-b-0"><label className="w-1/2 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{f.label}</label><div className="w-1/2 px-2 py-1"><input type={f.type || "text"} value={info[f.label] || ""} onChange={(e) => setInfo((p) => ({ ...p, [f.label]: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" /></div></div>)}</div>
      <h3 className="font-semibold text-sm mb-2">Parameters Evaluated</h3>
      <div className="border border-gray-300 rounded mb-4">{VEHICLE_EVAL_PARAMS.map((p) => <div key={p} className="flex border-b border-gray-200 last:border-b-0"><label className="w-1/2 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{p}</label><div className="w-1/2 px-2 py-1"><input type="text" value={params[p] || ""} onChange={(e) => setParams((pr) => ({ ...pr, [p]: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" placeholder="Observation" /></div></div>)}</div>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export function OutgoingVehicleInspection({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  return <VehicleInspectionForm type="Outgoing" docNo="CFPLA.C5.F.46" formType="outgoing-vehicle-inspection" initialData={initialData} onSubmit={onSubmit} isEdit={isEdit} infoFields={[{ label: "Dispatch Date", type: "date" }, { label: "Customer Name" }, { label: "SKU/Product Name" }, { label: "Material (Kgs/Units) to Dispatch", type: "number" }, { label: "Time of Vehicle Outgoing", type: "time" }, { label: "Transporter's Name" }, { label: "Transporter FSSAI License Number" }, { label: "Vehicle Number" }, { label: "Driver's Name and Number" }, { label: "Driver's License (Yes/No)" }, { label: "Location (Dispatch to)" }]} />;
}

export function IncomingVehicleInspectionV2({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  return <VehicleInspectionForm type="Incoming" docNo="CFPLA.C3.F.45" formType="vehicle-inspection" initialData={initialData} onSubmit={onSubmit} isEdit={isEdit} infoFields={[{ label: "Date of Vehicle Inward", type: "date" }, { label: "Vendor Name" }, { label: "Commodity Name" }, { label: "Transporter's Name" }, { label: "Transporter FSSAI License Number" }, { label: "Vehicle Number" }, { label: "Location (Received from)" }, { label: "Driver's Name and Number" }, { label: "Unloading Time", type: "time" }]} />;
}

// ===================== F.48 — Glass and Brittle Check Record =====================
interface GlassRow { id: number; floor: string; item: string; location: string; glassNo: string; glassDetails: string; months: Record<string, string>; }
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const eGR = (id: number): GlassRow => ({ id, floor: "", item: "", location: "", glassNo: "", glassDetails: "", months: Object.fromEntries(MONTHS_SHORT.map((m) => [m, ""])) });

export function GlassBrittleCheckRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [year, setYear] = useState(() => initialData?.year || "2026");
  const [rows, setRows] = useState<GlassRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1, floor: r.floor || "", item: r.item || "", location: r.location || "",
        glassNo: r.glass_no || "", glassDetails: r.glass_details || "",
        months: Object.fromEntries(MONTHS_SHORT.map((m) => [m, r.months?.[m.toLowerCase()] || r.months?.[m] || ""])),
      }));
    }
    return Array.from({ length: 10 }, (_, i) => eGR(i + 1));
  });
  const [observations, setObservations] = useState(() => initialData?.observations || "");
  const [correctiveActions, setCorrectiveActions] = useState(() => initialData?.corrective_actions || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const add = () => setRows((p) => [...p, eGR(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof GlassRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const upM = (id: number, m: string, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, months: { ...r.months, [m]: v } } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      year,
      rows: rows.filter((r) => r.floor || r.item).map((r) => ({
        floor: r.floor, item: r.item, location: r.location, glass_no: r.glassNo, glass_details: r.glassDetails,
        months: Object.fromEntries(MONTHS_SHORT.map((m) => [m.toLowerCase(), r.months[m]])),
      })),
      observations, corrective_actions: correctiveActions,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("glass-brittle-check", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Glass and Brittle Check Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.48</p></div></div>
      <div className="mb-4"><label className="text-sm font-medium mr-2">Year:</label><input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="border rounded px-3 py-1 w-24" /></div>
      <p className="text-xs text-gray-600 mb-2 italic">Click cells to toggle: ✓ (OK) → ✕ (Damaged) → Empty</p>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="text-xs">
          <thead className="bg-gray-100"><tr>{["Floor", "Item", "Location", "Glass No.", "Details", ...MONTHS_SHORT, ""].map((h) => <th key={h} className="border border-gray-300 px-1 py-1">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["floor", "item", "location", "glassNo", "glassDetails"] as (keyof GlassRow)[]).map((f) => <td key={f} className="border border-gray-300 px-1 py-0.5"><input type="text" value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5 min-w-[60px]" /></td>)}
                {MONTHS_SHORT.map((m) => <td key={m} className={`border border-gray-300 px-1 py-0.5 text-center cursor-pointer select-none font-bold min-w-[32px] ${r.months[m] === "✓" ? "bg-green-100 text-green-700" : r.months[m] === "✕" ? "bg-red-100 text-red-700" : ""}`} onClick={() => upM(r.id, m, r.months[m] === "" ? "✓" : r.months[m] === "✓" ? "✕" : "")}>{r.months[m]}</td>)}
                <td className="border border-gray-300 px-1 py-0.5 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="grid grid-cols-2 gap-3 mt-4"><div><label className="text-sm font-medium">Observations/Remarks</label><textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Corrective/Preventive Actions</label><textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.50a/b — Preventive Maintenance Checklist (Monthly) =====================
interface PMCheckpoint { equipment: string; checkpoint: string; }
interface PMSection { section: string; items: PMCheckpoint[]; }
const PM_SECTIONS: PMSection[] = [
  { section: "Lower Basement", items: [{ equipment: "Lift 1 Old", checkpoint: "Electrical connections, Doors, Switches" }, { equipment: "Lift 3 Hydraulic", checkpoint: "Electrical connections, Switches, Doors" }, { equipment: "L-sealer Manual", checkpoint: "Sealer & cutting knife intactness" }, { equipment: "Auto L-sealer (Shrink Wrapper)", checkpoint: "Sealer, Heater coil, Pressure/leakage, Cutting knife, Panel knobs/display" }, { equipment: "Shrink Wrap - Web Sealer", checkpoint: "Sealer, Heater coil, Pressure/leakage, Cutting knife, Panel" }, { equipment: "Pet Sealer", checkpoint: "Motor, Electric connection, Sealing check, Oiling/greasing, Conveyor belt" }, { equipment: "Cup Sealer 1 & 2", checkpoint: "Sealer intactness" }, { equipment: "Band Sealer", checkpoint: "Sealer, Conveyor, Airline/N2 pressure, Leakage" }, { equipment: "Hand Wash Station", checkpoint: "Blower & Dispenser, Water connections" }, { equipment: "Air Curtain", checkpoint: "Fan Blower" }] },
  { section: "Upper Basement Floor", items: [{ equipment: "Hand Pallet Truck", checkpoint: "Oiling/Greasing of bearings" }, { equipment: "Hand Wash Station", checkpoint: "Blower & Dispenser" }] },
  { section: "Production Floor", items: [{ equipment: "Paddle Mixer", checkpoint: "Motor, Paddle intactness, Electrical" }, { equipment: "Sheeting & Cutting Machine", checkpoint: "Blade, Belt, Motor, Conveyor" }, { equipment: "Hot Air Oven/Roaster", checkpoint: "Heating elements, Door seals, Thermostat" }, { equipment: "Flow Wrap Machine", checkpoint: "Sealing jaws, Conveyor, Film tension" }, { equipment: "X-Ray/Metal Detector", checkpoint: "Calibration, Conveyor, Sensitivity test" }, { equipment: "Weighing Scales", checkpoint: "Calibration, Display, Power supply" }] },
];

export function PreventiveMaintenanceChecklist({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [month, setMonth] = useState(() => initialData?.month || "");
  const [checkedBy, setCheckedBy] = useState(() => initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState(() => initialData?.verified_by || "");
  const [scores, setScores] = useState<Record<string, { status: "OK" | "Needs Repair" | "N/A" | ""; remarks: string }>>(() => {
    if (initialData?.scores && typeof initialData.scores === "object") {
      const init: Record<string, { status: "OK" | "Needs Repair" | "N/A" | ""; remarks: string }> = {};
      Object.entries(initialData.scores).forEach(([key, val]: [string, any]) => {
        init[key] = { status: val.status || "", remarks: val.remarks || "" };
      });
      return init;
    }
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const upS = (key: string, field: "status" | "remarks", value: string) => setScores((p) => ({ ...p, [key]: { status: p[key]?.status || "", remarks: p[key]?.remarks || "", [field]: value } }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      month, checked_by: checkedBy, verified_by: verifiedBy, scores,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("preventive-maintenance", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Preventive Maintenance Checklist - Monthly</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.50a (also covers F.50b quarterly structure)</p></div></div>
      <div className="grid grid-cols-3 gap-3 mb-4"><div><label className="text-sm font-medium">Month</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Checked By</label><input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Verified By</label><input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <div className="border border-gray-300 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="border border-gray-300 px-2 py-2">Equipment</th><th className="border border-gray-300 px-2 py-2">Checkpoints</th><th className="border border-gray-300 px-2 py-2 w-32">Status</th><th className="border border-gray-300 px-2 py-2 w-48">Remarks</th></tr></thead>
          <tbody>
            {PM_SECTIONS.map((sec) => (
              <Fragment key={sec.section}>
                <tr><td colSpan={4} className="border border-gray-300 px-3 py-2 bg-blue-50 font-bold">{sec.section}</td></tr>
                {sec.items.map((item) => {
                  const key = `${sec.section}-${item.equipment}`;
                  return (
                    <tr key={key} className="hover:bg-blue-50">
                      <td className="border border-gray-300 px-2 py-1 font-medium">{item.equipment}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{item.checkpoint}</td>
                      <td className="border border-gray-300 px-1 py-1"><select value={scores[key]?.status || ""} onChange={(e) => upS(key, "status", e.target.value)} className={`w-full border rounded px-1 py-0.5 text-xs ${scores[key]?.status === "OK" ? "bg-green-100" : scores[key]?.status === "Needs Repair" ? "bg-red-100" : ""}`}><option value="">-</option><option value="OK">OK</option><option value="Needs Repair">Needs Repair</option><option value="N/A">N/A</option></select></td>
                      <td className="border border-gray-300 px-1 py-1"><input type="text" value={scores[key]?.remarks || ""} onChange={(e) => upS(key, "remarks", e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs" /></td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.51 — New Equipment Clearance/Commissioning =====================
const SAFETY_CHECKS = ["Meets production needs (capacity, dust control)", "Accessible to clean and maintain", "Prevents contamination during operations", "Preventative Maintenance Program available", "Covered under HACCP plan?", "Pest risk?", "Product changeover cause problem?", "Contains glass or plastic?", "Equipment made from suitable material (SS 304)?", "Cleaning points safe to reach?", "Easy to take swab samples?"];
const MACHINERY_CHECKS = ["Critical parts identified?", "Spare parts easily available?", "Pulleys/belts/chains properly guarded?", "Rotating parts/pinch points guarded?", "Machine secured if fixed location?", "Commonly used parts in stock?"];
const SHUTDOWN_CHECKS = ["Single lockable electrical power disconnect?", "Isolation valves for air/steam available?", "Adequate manual reset emergency stops?", "Pneumatic/hydraulic cylinders safe?", "Environmental problem risk?", "Employees trained for maintenance?", "Equipment-specific procedures documented?"];
const WALKING_CHECKS = ["Floors/aisles clear of slippery areas?", "Floor elevation changes clearly identified?", "Equipment produces floor discharges?", "Non-slip coatings needed?", "Construction debris cleared?"];
const ELECTRICAL_CHECKS = ["All conduit/cable properly attached?"];

export function NewEquipmentClearance({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [meta, setMeta] = useState<Record<string, string>>(() => {
    if (initialData?.meta && typeof initialData.meta === "object") {
      const init: Record<string, string> = {};
      Object.entries(initialData.meta).forEach(([k, v]) => { init[k] = String(v || ""); });
      return init;
    }
    return {};
  });
  const upM = (k: string, v: string) => setMeta((p) => ({ ...p, [k]: v }));
  const [checks, setChecks] = useState<Record<string, { yn: "Yes" | "No" | ""; action: string }>>(() => {
    if (initialData?.checks && typeof initialData.checks === "object") {
      const init: Record<string, { yn: "Yes" | "No" | ""; action: string }> = {};
      Object.entries(initialData.checks).forEach(([k, v]: [string, any]) => { init[k] = { yn: v.yn || "", action: v.action || "" }; });
      return init;
    }
    return {};
  });
  const upC = (k: string, f: "yn" | "action", v: string) => setChecks((p) => ({ ...p, [k]: { yn: p[k]?.yn || "", action: p[k]?.action || "", [f]: v } }));
  const [qaSign, setQaSign] = useState(() => initialData?.qa_sign || "");
  const [maintSign, setMaintSign] = useState(() => initialData?.maint_sign || "");
  const [remark, setRemark] = useState(() => initialData?.remark || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      meta, checks, qa_sign: qaSign, maint_sign: maintSign, remark,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("new-equipment-clearance", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  const renderSection = (title: string, items: string[]) => (
    <Fragment key={title}>
      <tr><td colSpan={4} className="border border-gray-300 px-3 py-2 bg-blue-50 font-bold text-sm">{title}</td></tr>
      {items.map((item) => (
        <tr key={item} className="hover:bg-blue-50">
          <td className="border border-gray-300 px-2 py-1 text-sm" colSpan={1}>{item}</td>
          <td className="border border-gray-300 px-1 py-1 text-center w-16"><label className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${checks[item]?.yn === "Yes" ? "bg-green-100 border-green-400" : "border-gray-300"}`}><input type="radio" name={item} className="sr-only" checked={checks[item]?.yn === "Yes"} onChange={() => upC(item, "yn", "Yes")} />Yes</label></td>
          <td className="border border-gray-300 px-1 py-1 text-center w-16"><label className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${checks[item]?.yn === "No" ? "bg-red-100 border-red-400" : "border-gray-300"}`}><input type="radio" name={item} className="sr-only" checked={checks[item]?.yn === "No"} onChange={() => upC(item, "yn", "No")} />No</label></td>
          <td className="border border-gray-300 px-1 py-1"><input type="text" value={checks[item]?.action || ""} onChange={(e) => upC(item, "action", e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs" placeholder="Action required" /></td>
        </tr>
      ))}
    </Fragment>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">New Equipment Clearance Checklist (Commissioning) Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.51</p></div></div>
      <div className="grid grid-cols-2 gap-3 mb-4">{[{ l: "Name of Equipment" }, { l: "Manufacturer" }, { l: "Supplier (Contact)" }, { l: "Model & Serial Number" }, { l: "Location and Function" }, { l: "Commissioning Date", t: "date" }, { l: "Commissioning Time", t: "time" }].map((f) => <div key={f.l}><label className="text-sm font-medium">{f.l}</label><input type={f.t || "text"} value={meta[f.l] || ""} onChange={(e) => upM(f.l, e.target.value)} className="border rounded px-3 py-2 w-full text-sm" /></div>)}</div>
      <div className="border border-gray-300 rounded overflow-hidden mb-4">
        <table className="w-full">
          <thead className="bg-gray-100"><tr><th className="border border-gray-300 px-2 py-2 text-sm">Check Item</th><th className="border border-gray-300 px-2 py-2 w-16 text-sm">Yes</th><th className="border border-gray-300 px-2 py-2 w-16 text-sm">No</th><th className="border border-gray-300 px-2 py-2 text-sm">Action Required</th></tr></thead>
          <tbody>
            {renderSection("Food Safety", SAFETY_CHECKS)}
            {renderSection("Machinery Guarding/Engineering", MACHINERY_CHECKS)}
            {renderSection("Equipment Shutdown", SHUTDOWN_CHECKS)}
            {renderSection("Walking Surfaces", WALKING_CHECKS)}
            {renderSection("Electrical", ELECTRICAL_CHECKS)}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-3 gap-3"><div><label className="text-sm font-medium">Quality Assurance</label><input type="text" value={qaSign} onChange={(e) => setQaSign(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Maintenance Incharge</label><input type="text" value={maintSign} onChange={(e) => setMaintSign(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Remark</label><input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.52 — Waste Disposal Record =====================
export function WasteDisposalRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const WASTE_TYPES = ["Biodegradable waste", "Miscellaneous waste (including plastic waste)"];
  const [month, setMonth] = useState(() => initialData?.month || "");
  const [area, setArea] = useState(() => initialData?.area || "");
  const [grid, setGrid] = useState<Record<string, Record<number, string>>>(() => {
    if (initialData?.grid && typeof initialData.grid === "object") {
      const init: Record<string, Record<number, string>> = {};
      WASTE_TYPES.forEach((w) => {
        init[w] = {};
        for (let d = 1; d <= 31; d++) init[w][d] = initialData.grid[w]?.[d] || initialData.grid[w]?.[String(d)] || "";
      });
      return init;
    }
    const init: Record<string, Record<number, string>> = {};
    WASTE_TYPES.forEach((w) => { init[w] = {}; for (let d = 1; d <= 31; d++) init[w][d] = ""; });
    return init;
  });
  const [checkedBy, setCheckedBy] = useState(() => initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState(() => initialData?.verified_by || "");
  const [remarks, setRemarks] = useState(() => initialData?.remarks || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const toggle = (w: string, d: number) => setGrid((p) => ({ ...p, [w]: { ...p[w], [d]: p[w][d] === "" ? "✓" : p[w][d] === "✓" ? "✕" : "" } }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      month, area, grid, checked_by: checkedBy, verified_by: verifiedBy, remarks,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("waste-disposal", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Waste Disposal Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.52</p></div></div>
      <div className="grid grid-cols-2 gap-3 mb-4"><div><label className="text-sm font-medium">Month</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Area</label><input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="text-[10px]">
          <thead className="bg-gray-100"><tr><th className="border border-gray-300 px-1 py-1 sticky left-0 bg-gray-100 z-10 min-w-[200px]">Type of Waste</th>{Array.from({ length: 31 }, (_, i) => <th key={i + 1} className="border border-gray-300 px-1 py-1 text-center min-w-[24px]">{i + 1}</th>)}</tr></thead>
          <tbody>
            {WASTE_TYPES.map((w) => (
              <tr key={w} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-0.5 sticky left-0 bg-white z-10 font-medium">{w}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = i + 1;
                  return <td key={d} className={`border border-gray-300 px-0.5 py-0.5 text-center cursor-pointer select-none font-bold ${grid[w]?.[d] === "✓" ? "bg-green-100 text-green-700" : grid[w]?.[d] === "✕" ? "bg-red-100 text-red-700" : ""}`} onClick={() => toggle(w, d)}>{grid[w]?.[d]}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4"><div><label className="text-sm font-medium">Checked By</label><input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Verified By</label><input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Remarks</label><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.53 — Chemical Preparation Record =====================
interface ChemRow { id: number; date: string; chemicalName: string; expiryDate: string; manufacturer: string; qtyChemical: string; qtyWater: string; dilutionPercent: string; preparedBy: string; verifiedBy: string; }
const eChem = (id: number): ChemRow => ({ id, date: "", chemicalName: "", expiryDate: "", manufacturer: "", qtyChemical: "", qtyWater: "", dilutionPercent: "", preparedBy: "", verifiedBy: "" });

export function ChemicalPreparationRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [rows, setRows] = useState<ChemRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1, date: r.date || "", chemicalName: r.chemical_name || "", expiryDate: r.expiry_date || "",
        manufacturer: r.manufacturer || "", qtyChemical: r.qty_chemical?.toString() || "", qtyWater: r.qty_water?.toString() || "",
        dilutionPercent: r.dilution_percent?.toString() || "", preparedBy: r.prepared_by || "", verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: 5 }, (_, i) => eChem(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eChem(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof ChemRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.chemicalName || r.date).map((r) => ({
        date: r.date, chemical_name: r.chemicalName, expiry_date: r.expiryDate, manufacturer: r.manufacturer,
        qty_chemical: r.qtyChemical ? Number(r.qtyChemical) : null, qty_water: r.qtyWater ? Number(r.qtyWater) : null,
        dilution_percent: r.dilutionPercent ? Number(r.dilutionPercent) : null, prepared_by: r.preparedBy, verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("chemical-preparation", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Chemical Preparation Record - Housekeeping</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.53</p></div></div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Date", "Chemical Name", "Expiry Date", "Manufacturer", "Qty Chemical (ml/g)", "Qty Water (ml)", "Dilution %", "Prepared By", "Verified By", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["date", "chemicalName", "expiryDate", "manufacturer", "qtyChemical", "qtyWater", "dilutionPercent", "preparedBy", "verifiedBy"] as (keyof ChemRow)[]).map((f) => <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "date" || f === "expiryDate" ? "date" : ["qtyChemical", "qtyWater", "dilutionPercent"].includes(f as string) ? "number" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>)}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.55 — Deep Cleaning Record =====================
const DEEP_CLEAN_ITEMS = [{ area: "Window", method: "Dry cleaning", freq: "FD" }, { area: "Side walls", method: "Dry cleaning", freq: "W" }, { area: "Lockers", method: "Dry cleaning", freq: "M" }, { area: "Plant Overhead", method: "Dry Cleaning", freq: "M" }, { area: "Ceiling", method: "Dry Cleaning", freq: "M" }, { area: "Pallets", method: "Dry cleaning/Wash", freq: "W" }, { area: "Under machines", method: "Dry cleaning/Vacuum", freq: "W" }, { area: "Cooling area", method: "Dry/Wet cleaning", freq: "W" }, { area: "Dock area", method: "Dry cleaning", freq: "W" }, { area: "Drains", method: "Wet cleaning", freq: "W" }, { area: "Trolleys", method: "Dry/Wet cleaning", freq: "W" }, { area: "Racks", method: "Dry cleaning", freq: "W" }, { area: "Weighing area", method: "Dry cleaning", freq: "D" }, { area: "Light Fixtures", method: "Dry/Vacuum cleaning", freq: "W" }];

export function DeepCleaningRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [month, setMonth] = useState(() => initialData?.month || "");
  const [checkedBy, setCheckedBy] = useState(() => initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState(() => initialData?.verified_by || "");
  const [observations, setObservations] = useState(() => initialData?.observations || "");
  const [correctiveActions, setCorrectiveActions] = useState(() => initialData?.corrective_actions || "");
  const [weeks, setWeeks] = useState<Record<string, Record<string, string>>>(() => {
    if (initialData?.weeks && typeof initialData.weeks === "object") {
      const init: Record<string, Record<string, string>> = {};
      DEEP_CLEAN_ITEMS.forEach((i) => {
        init[i.area] = { w1: initialData.weeks[i.area]?.w1 || "", w2: initialData.weeks[i.area]?.w2 || "", w3: initialData.weeks[i.area]?.w3 || "", w4: initialData.weeks[i.area]?.w4 || "" };
      });
      return init;
    }
    const init: Record<string, Record<string, string>> = {};
    DEEP_CLEAN_ITEMS.forEach((i) => { init[i.area] = { w1: "", w2: "", w3: "", w4: "" }; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const upW = (area: string, week: string, value: string) => setWeeks((p) => ({ ...p, [area]: { ...p[area], [week]: value } }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      month, checked_by: checkedBy, verified_by: verifiedBy, observations, corrective_actions: correctiveActions, weeks,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("deep-cleaning", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Housekeeping Record - Deep Cleaning</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.55</p></div></div>
      <div className="mb-4"><label className="text-sm font-medium">Month</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-64 ml-2" /></div>
      <div className="border border-gray-300 rounded overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="border border-gray-300 px-2 py-2">Sr.</th><th className="border border-gray-300 px-2 py-2">Area</th><th className="border border-gray-300 px-2 py-2">Method</th><th className="border border-gray-300 px-2 py-2">Freq</th><th className="border border-gray-300 px-2 py-2">Week 1</th><th className="border border-gray-300 px-2 py-2">Week 2</th><th className="border border-gray-300 px-2 py-2">Week 3</th><th className="border border-gray-300 px-2 py-2">Week 4</th></tr></thead>
          <tbody>
            {DEEP_CLEAN_ITEMS.map((item, idx) => (
              <tr key={item.area} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-2 py-1 font-medium">{item.area}</td>
                <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{item.method}</td>
                <td className="border border-gray-300 px-2 py-1 text-center text-xs">{item.freq}</td>
                {["w1", "w2", "w3", "w4"].map((w) => <td key={w} className="border border-gray-300 px-1 py-1"><input type="date" value={weeks[item.area]?.[w] || ""} onChange={(e) => upW(item.area, w, e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Checked By</label><input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Verified By</label><input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Observations</label><textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Corrective Actions</label><textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.57 — Non Conforming Product Report =====================
export function NonConformingProductReport({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (initialData?.fields && typeof initialData.fields === "object") {
      const init: Record<string, string> = {};
      Object.entries(initialData.fields).forEach(([k, v]) => { init[k] = String(v || ""); });
      return init;
    }
    return {};
  });
  const [disposition, setDisposition] = useState<string[]>(() => {
    if (initialData?.disposition && Array.isArray(initialData.disposition)) return initialData.disposition;
    return [];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const up = (k: string, v: string) => setFields((p) => ({ ...p, [k]: v }));
  const toggleDisp = (d: string) => setDisposition((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const META = [{ l: "Non Conformity No." }, { l: "Supplier" }, { l: "Broker" }, { l: "Others" }, { l: "Detected By" }, { l: "Invoice/Challan/GRN/PO No./Batch No" }, { l: "R.C. No." }, { l: "Reason for Non Conformity" }, { l: "Food Safety Issue" }, { l: "Description" }, { l: "Documented By" }];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      fields, disposition,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("non-conforming-product", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Product Non Conformity / Rejection Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.57</p></div></div>
      <div className="border border-gray-300 rounded mb-4">{META.map((f) => <div key={f.l} className="flex border-b border-gray-200 last:border-b-0"><label className="w-1/3 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{f.l}</label><div className="w-2/3 px-2 py-1"><input type="text" value={fields[f.l] || ""} onChange={(e) => up(f.l, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div></div>)}</div>
      <h3 className="font-semibold text-sm mb-2">Suggested Disposition of Material</h3>
      <div className="flex gap-3 mb-4">{["Rejected", "Returned to Supplier/Broker", "Accepted by Dispensation"].map((d) => <label key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer ${disposition.includes(d) ? "bg-orange-100 border-orange-400" : "border-gray-300"}`}><input type="checkbox" checked={disposition.includes(d)} onChange={() => toggleDisp(d)} className="sr-only" /><span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${disposition.includes(d) ? "bg-orange-500 border-orange-500 text-white" : "border-gray-400"}`}>{disposition.includes(d) ? "✓" : ""}</span>{d}</label>)}</div>
      <div className="mb-4"><label className="text-sm font-medium">Details / Contact supplier for investigation</label><textarea value={fields["details"] || ""} onChange={(e) => up("details", e.target.value)} rows={3} className="border rounded px-3 py-2 w-full" /></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Authorized Person</label><input type="text" value={fields["authorizedPerson"] || ""} onChange={(e) => up("authorizedPerson", e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Received By</label><input type="text" value={fields["receivedBy"] || ""} onChange={(e) => up("receivedBy", e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.58 — Re-Work / Re-Cycling / Re-Packing =====================
interface ReworkRow { id: number; date: string; time: string; productNameBatch: string; reason: string; qtyToRework: string; productApproval: string; reworkedProductBatch: string; totalReworkedQty: string; responsibility: string; checkedBy: string; verifiedBy: string; }
const eRW = (id: number): ReworkRow => ({ id, date: "", time: "", productNameBatch: "", reason: "", qtyToRework: "", productApproval: "", reworkedProductBatch: "", totalReworkedQty: "", responsibility: "", checkedBy: "", verifiedBy: "" });

export function ReworkRecyclingRepacking({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [rows, setRows] = useState<ReworkRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1, date: r.date || "", time: r.time || "", productNameBatch: r.product_name_batch || "",
        reason: r.reason || "", qtyToRework: r.qty_to_rework?.toString() || "", productApproval: r.product_approval || "",
        reworkedProductBatch: r.reworked_product_batch || "", totalReworkedQty: r.total_reworked_qty?.toString() || "",
        responsibility: r.responsibility || "", checkedBy: r.checked_by || "", verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: 3 }, (_, i) => eRW(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eRW(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof ReworkRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.date || r.productNameBatch).map((r) => ({
        date: r.date, time: r.time, product_name_batch: r.productNameBatch, reason: r.reason,
        qty_to_rework: r.qtyToRework, product_approval: r.productApproval,
        reworked_product_batch: r.reworkedProductBatch, total_reworked_qty: r.totalReworkedQty,
        responsibility: r.responsibility, checked_by: r.checkedBy, verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("rework-recycling", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Re-Work / Re-Cycling / Re-Packing Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.58</p></div></div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Sr.", "Date", "Time", "Product & Batch", "Reason for Rework", "Qty to Rework", "Product Approval (Quality)", "Reworked Product & Batch", "Total Reworked Qty", "Responsibility", "Checked By", "Verified By", ""].map((h) => <th key={h} className="border border-gray-300 px-1 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1 text-center">{i + 1}</td>
                {(["date", "time", "productNameBatch", "reason", "qtyToRework", "productApproval", "reworkedProductBatch", "totalReworkedQty", "responsibility", "checkedBy", "verifiedBy"] as (keyof ReworkRow)[]).map((f) => <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "date" ? "date" : f === "time" ? "time" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5 min-w-[80px]" /></td>)}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export default OutgoingVehicleInspection;
