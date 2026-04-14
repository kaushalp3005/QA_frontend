"use client";
import { Fragment, useState } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// F.17 - Temperature & Humidity Record
interface TemperatureHumidityProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function TemperatureHumidityRecord({ initialData, onSubmit, isEdit }: TemperatureHumidityProps = {}) {
  const [month, setMonth] = useState(initialData?.month || "");
  const [area, setArea] = useState(initialData?.area || "");
  const days = 31;
  const [grid, setGrid] = useState<Record<number, { temp: string; humidity: string }[]>>(() => {
    if (initialData?.grid) return initialData.grid;
    const init: Record<number, { temp: string; humidity: string }[]> = {};
    for (let d = 1; d <= days; d++) init[d] = [{ temp: "", humidity: "" }, { temp: "", humidity: "" }, { temp: "", humidity: "" }];
    return init;
  });
  const updateCell = (day: number, idx: number, field: "temp" | "humidity", value: string) =>
    setGrid((p) => ({ ...p, [day]: p[day].map((r, i) => (i === idx ? { ...r, [field]: value } : r)) }));
  const [checkedBy, setCheckedBy] = useState(initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState(initialData?.verified_by || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      month, area, grid, checked_by: checkedBy, verified_by: verifiedBy,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("temperature-humidity", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Temperature & Humidity Record Register</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C6.F.17 | Frequency: Start, Mid and End of shift</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Area</label>
          <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2 italic">Humidity acceptable: 50-70%. Out-of-range values highlight red.</p>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="text-[10px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 sticky left-0 bg-gray-100 z-10 w-28">Reading</th>
              {Array.from({ length: days }, (_, i) => (
                <th key={i + 1} className="border border-gray-300 px-1 py-1 min-w-[46px] text-center">{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["Start", "Mid", "End"].map((label, idx) => (
              <Fragment key={label}>
                <tr className="hover:bg-blue-50">
                  <td className="border border-gray-300 px-1 py-0.5 sticky left-0 bg-white z-10 font-medium">{label} Temp °C</td>
                  {Array.from({ length: days }, (_, d) => (
                    <td key={d + 1} className="border border-gray-300 px-0.5 py-0.5">
                      <input type="number" value={grid[d + 1]?.[idx]?.temp || ""} onChange={(e) => updateCell(d + 1, idx, "temp", e.target.value)} className="w-full border rounded px-0.5 py-0 text-center" />
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-blue-50">
                  <td className="border border-gray-300 px-1 py-0.5 sticky left-0 bg-white z-10 font-medium">{label} Humidity %</td>
                  {Array.from({ length: days }, (_, d) => {
                    const v = parseFloat(grid[d + 1]?.[idx]?.humidity || "");
                    const bad = !isNaN(v) && (v < 50 || v > 70);
                    return (
                      <td key={d + 1} className={`border border-gray-300 px-0.5 py-0.5 ${bad ? "bg-red-100" : ""}`}>
                        <input type="number" value={grid[d + 1]?.[idx]?.humidity || ""} onChange={(e) => updateCell(d + 1, idx, "humidity", e.target.value)} className="w-full border rounded px-0.5 py-0 text-center" />
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="text-sm font-medium">Checked By</label>
          <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="text-sm font-medium">Verified By</label>
          <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// F.18 - In-process Quality Check
interface QCRow { id: number; skuName: string; customer: string; batchNo: string; sensory: string; physical: string; labelCheck: string; sealCheck: string; decision: string; remarks: string; checkedBy: string; verifiedBy: string; }
const emptyQC = (id: number): QCRow => ({ id, skuName: "", customer: "", batchNo: "", sensory: "", physical: "", labelCheck: "", sealCheck: "", decision: "", remarks: "", checkedBy: "", verifiedBy: "" });

interface InprocessQCProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function InprocessQualityCheckRecord({ initialData, onSubmit, isEdit }: InprocessQCProps = {}) {
  const [date, setDate] = useState(initialData?.check_date || "");
  const [rows, setRows] = useState<QCRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1, skuName: r.sku_name || "", customer: r.customer || "", batchNo: r.batch_no || "",
        sensory: r.sensory || "", physical: r.physical || "", labelCheck: r.label_check || "",
        sealCheck: r.seal_check || "", decision: r.decision || "", remarks: r.remarks || "",
        checkedBy: r.checked_by || "", verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: 8 }, (_, i) => emptyQC(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((p) => [...p, emptyQC(p.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const upd = (id: number, f: keyof QCRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      check_date: date,
      rows: rows.filter((r) => r.skuName || r.batchNo).map((r) => ({
        sku_name: r.skuName, customer: r.customer, batch_no: r.batchNo,
        sensory: r.sensory, physical: r.physical, label_check: r.labelCheck,
        seal_check: r.sealCheck, decision: r.decision, remarks: r.remarks,
        checked_by: r.checkedBy, verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("inprocess-qc-record", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">In-process Quality Check Record</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C6.F.18 | Rev Date: 01/10/2025</p>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-sm font-medium mr-2">Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2" />
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              {["SKU Name", "Customer", "Batch No.", "Sensory", "Physical", "Label Check", "Seal Check", "Accept/Reject", "Remarks", "Checked By", "Verified By", ""].map((h) => (
                <th key={h} className="border border-gray-300 px-1 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.skuName} onChange={(e) => upd(r.id, "skuName", e.target.value)} className="w-full border rounded px-1 py-0.5 min-w-[100px]" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.customer} onChange={(e) => upd(r.id, "customer", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.batchNo} onChange={(e) => upd(r.id, "batchNo", e.target.value)} className="w-20 border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.sensory} onChange={(e) => upd(r.id, "sensory", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.physical} onChange={(e) => upd(r.id, "physical", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.labelCheck} onChange={(e) => upd(r.id, "labelCheck", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={r.sealCheck} onChange={(e) => upd(r.id, "sealCheck", e.target.value)} className={`w-full border rounded px-0.5 py-0.5 ${r.sealCheck === "Ok" ? "bg-green-100" : r.sealCheck === "Not Ok" ? "bg-red-100" : ""}`}>
                    <option value="">-</option><option value="Ok">Ok</option><option value="Not Ok">Not Ok</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={r.decision} onChange={(e) => upd(r.id, "decision", e.target.value)} className={`w-full border rounded px-0.5 py-0.5 ${r.decision === "Accept" ? "bg-green-100" : r.decision === "Reject" ? "bg-red-100" : ""}`}>
                    <option value="">-</option><option value="Accept">Accept</option><option value="Reject">Reject</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.remarks} onChange={(e) => upd(r.id, "remarks", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.checkedBy} onChange={(e) => upd(r.id, "checkedBy", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.verifiedBy} onChange={(e) => upd(r.id, "verifiedBy", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => removeRow(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 ml-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// F.23 - Monthly GMP Schedule
interface GMPScheduleProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function MonthlyGMPSchedule({ initialData, onSubmit, isEdit }: GMPScheduleProps = {}) {
  const [year, setYear] = useState(initialData?.year || "2026");
  const [rows, setRows] = useState(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({ id: i + 1, month: r.month || MONTHS[i] || "", plannedDate: r.planned_date || "", actualDate: r.actual_date || "", remarks: r.remarks || "" }));
    }
    return MONTHS.map((m, i) => ({ id: i + 1, month: m, plannedDate: "", actualDate: "", remarks: "" }));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const upd = (id: number, f: string, v: string) => setRows((p: any[]) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      year,
      rows: rows.map((r: any) => ({ month: r.month, planned_date: r.plannedDate, actual_date: r.actualDate, remarks: r.remarks })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("gmp-schedule", payload);
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
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Monthly Facility GMP & GHP Inspection Schedule</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C3.F.23</p>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-sm font-medium mr-2">Year:</label>
        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="border rounded px-3 py-2 w-32" />
      </div>
      <div className="border border-gray-300 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-2 w-10">Sr.</th>
              <th className="border border-gray-300 px-2 py-2">Month</th>
              <th className="border border-gray-300 px-2 py-2">Year</th>
              <th className="border border-gray-300 px-2 py-2">Planned Date</th>
              <th className="border border-gray-300 px-2 py-2">Actual Date</th>
              <th className="border border-gray-300 px-2 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{r.id}</td>
                <td className="border border-gray-300 px-2 py-1 font-medium">{r.month}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{year}</td>
                <td className="border border-gray-300 px-1 py-1"><input type="date" value={r.plannedDate} onChange={(e) => upd(r.id, "plannedDate", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="date" value={r.actualDate} onChange={(e) => upd(r.id, "actualDate", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.remarks} onChange={(e) => upd(r.id, "remarks", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
              </tr>
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

// F.25 - Inward Raw Material Check
interface InwardRMCheckProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function InwardRawMaterialCheck({ initialData, onSubmit, isEdit }: InwardRMCheckProps = {}) {
  const blank = () => ({ id: Date.now() + Math.random(), materialName: "", inwardDate: "", vendorName: "", lotNumber: "", customerName: "", quantity: "", mfgDate: "", expDate: "", packagingCondition: "", countObs: "", appearanceObs: "", colorObs: "", tasteObs: "", odorObs: "", countDefect: "", appearanceDefect: "", colorDefect: "", tasteDefect: "", odorDefect: "", countResult: "", appearanceResult: "", colorResult: "", tasteResult: "", odorResult: "", moistureIR: "", fatPercent: "", acidValue: "", peroxideValue: "", remarks: "", checkedBy: "", verifiedBy: "" });
  const [entries, setEntries] = useState(() => {
    if (initialData?.entries && Array.isArray(initialData.entries)) {
      return initialData.entries.map((e: any) => ({
        id: Date.now() + Math.random(),
        materialName: e.material_name || "", inwardDate: e.inward_date || "", vendorName: e.vendor_name || "",
        lotNumber: e.lot_number || "", customerName: e.customer_name || "", quantity: e.quantity || "",
        mfgDate: e.mfg_date || "", expDate: e.exp_date || "", packagingCondition: e.packaging_condition || "",
        countObs: e.count_obs || "", appearanceObs: e.appearance_obs || "", colorObs: e.color_obs || "",
        tasteObs: e.taste_obs || "", odorObs: e.odor_obs || "",
        countDefect: e.count_defect || "", appearanceDefect: e.appearance_defect || "", colorDefect: e.color_defect || "",
        tasteDefect: e.taste_defect || "", odorDefect: e.odor_defect || "",
        countResult: e.count_result || "", appearanceResult: e.appearance_result || "", colorResult: e.color_result || "",
        tasteResult: e.taste_result || "", odorResult: e.odor_result || "",
        moistureIR: e.moisture_ir?.toString() || "", fatPercent: e.fat_percent?.toString() || "",
        acidValue: e.acid_value?.toString() || "", peroxideValue: e.peroxide_value?.toString() || "",
        remarks: e.remarks || "", checkedBy: e.checked_by || "", verifiedBy: e.verified_by || "",
      }));
    }
    return [blank()];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addEntry = () => setEntries((p: any[]) => [...p, blank()]);
  const upd = (id: number, f: string, v: string) => setEntries((p: any[]) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const sp = ["count", "appearance", "color", "taste", "odor"];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      entries: entries.filter((e: any) => e.materialName || e.vendorName).map((e: any) => ({
        material_name: e.materialName, inward_date: e.inwardDate, vendor_name: e.vendorName,
        lot_number: e.lotNumber, customer_name: e.customerName, quantity: e.quantity,
        mfg_date: e.mfgDate, exp_date: e.expDate, packaging_condition: e.packagingCondition,
        count_obs: e.countObs, appearance_obs: e.appearanceObs, color_obs: e.colorObs,
        taste_obs: e.tasteObs, odor_obs: e.odorObs,
        count_defect: e.countDefect, appearance_defect: e.appearanceDefect, color_defect: e.colorDefect,
        taste_defect: e.tasteDefect, odor_defect: e.odorDefect,
        count_result: e.countResult, appearance_result: e.appearanceResult, color_result: e.colorResult,
        taste_result: e.tasteResult, odor_result: e.odorResult,
        moisture_ir: e.moistureIR ? Number(e.moistureIR) : null, fat_percent: e.fatPercent ? Number(e.fatPercent) : null,
        acid_value: e.acidValue ? Number(e.acidValue) : null, peroxide_value: e.peroxideValue ? Number(e.peroxideValue) : null,
        remarks: e.remarks, checked_by: e.checkedBy, verified_by: e.verifiedBy,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("inward-rm-check", payload);
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
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Inward Raw Material Check Records</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.25</p>
        </div>
      </div>
      {entries.map((e: any, ei: number) => (
        <div key={e.id} className="border border-gray-300 rounded mb-6 p-4">
          <h3 className="font-semibold text-sm mb-3">Entry #{ei + 1}</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(([["materialName", "Material Name"], ["inwardDate", "Inward Date", "date"], ["vendorName", "Vendor Name"], ["lotNumber", "Lot Number"], ["customerName", "Customer Name"], ["quantity", "Quantity (kg)"], ["mfgDate", "MFG Date", "date"], ["expDate", "EXP Date", "date"], ["packagingCondition", "Packaging Condition"]]) as [string, string, string?][]).map(([f, l, t]) => (
              <div key={f} className="flex items-center gap-2">
                <label className="text-xs font-medium w-1/2">{l}</label>
                <input type={t || "text"} value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="border rounded px-2 py-1 w-1/2 text-sm" />
              </div>
            ))}
          </div>
          <h4 className="text-xs font-bold mb-1">Sensory</h4>
          <div className="overflow-x-auto border border-gray-200 rounded mb-3">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr><th className="border px-1 py-1">Parameter</th><th className="border px-1 py-1">Observations</th><th className="border px-1 py-1">Defects</th><th className="border px-1 py-1">Result</th></tr>
              </thead>
              <tbody>
                {sp.map((p) => (
                  <tr key={p}>
                    <td className="border px-1 py-0.5 font-medium capitalize">{p}</td>
                    <td className="border px-1 py-0.5"><input type="text" value={(e as any)[`${p}Obs`] || ""} onChange={(ev) => upd(e.id, `${p}Obs`, ev.target.value)} className="w-full border rounded px-1 py-0" /></td>
                    <td className="border px-1 py-0.5"><input type="text" value={(e as any)[`${p}Defect`] || ""} onChange={(ev) => upd(e.id, `${p}Defect`, ev.target.value)} className="w-full border rounded px-1 py-0" /></td>
                    <td className="border px-1 py-0.5">
                      <select value={(e as any)[`${p}Result`] || ""} onChange={(ev) => upd(e.id, `${p}Result`, ev.target.value)} className={`w-full border rounded px-0.5 py-0 ${(e as any)[`${p}Result`] === "Pass" ? "bg-green-100" : (e as any)[`${p}Result`] === "Fail" ? "bg-red-100" : ""}`}>
                        <option value="">-</option><option value="Pass">Pass</option><option value="Fail">Fail</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 className="text-xs font-bold mb-1">Chemical</h4>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {(([["moistureIR", "Moisture IR (%)"], ["fatPercent", "Fat (%)"], ["acidValue", "Acid Value"], ["peroxideValue", "Peroxide Value"]]) as [string, string][]).map(([f, l]) => (
              <div key={f}>
                <label className="text-[10px] font-medium">{l}</label>
                <input type="number" value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" step="0.01" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs font-medium">Remarks</label><input type="text" value={e.remarks} onChange={(ev) => upd(e.id, "remarks", ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
            <div><label className="text-xs font-medium">Checked By</label><input type="text" value={e.checkedBy} onChange={(ev) => upd(e.id, "checkedBy", ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
            <div><label className="text-xs font-medium">Verified By</label><input type="text" value={e.verifiedBy} onChange={(ev) => upd(e.id, "verifiedBy", ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          </div>
        </div>
      ))}
      <button onClick={addEntry} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Material</button>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 ml-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// F.26 - Finished Good Chemical Analysis
interface FGChemicalProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function FinishedGoodChemicalAnalysis({ initialData, onSubmit, isEdit }: FGChemicalProps = {}) {
  const blank = () => ({ id: Date.now() + Math.random(), productName: "", dateReceiving: "", customer: "", dateAnalysis: "", fgBatchNo: "", moistureHotAir: "", moistureIR: "", acidValue: "", peroxideValue: "", saltPercent: "", fatPercent: "", remarks: "", analyzedBy: "", verifiedBy: "" });
  const [entries, setEntries] = useState(() => {
    if (initialData?.entries && Array.isArray(initialData.entries)) {
      return initialData.entries.map((e: any) => ({
        id: Date.now() + Math.random(),
        productName: e.product_name || "", dateReceiving: e.date_receiving || "", customer: e.customer || "",
        dateAnalysis: e.date_analysis || "", fgBatchNo: e.fg_batch_no || "",
        moistureHotAir: e.moisture_hot_air?.toString() || "", moistureIR: e.moisture_ir?.toString() || "",
        acidValue: e.acid_value?.toString() || "", peroxideValue: e.peroxide_value?.toString() || "",
        saltPercent: e.salt_percent?.toString() || "", fatPercent: e.fat_percent?.toString() || "",
        remarks: e.remarks || "", analyzedBy: e.analyzed_by || "", verifiedBy: e.verified_by || "",
      }));
    }
    return [blank()];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addEntry = () => setEntries((p: any[]) => [...p, blank()]);
  const upd = (id: number, f: string, v: string) => setEntries((p: any[]) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      entries: entries.filter((e: any) => e.productName || e.fgBatchNo).map((e: any) => ({
        product_name: e.productName, date_receiving: e.dateReceiving, customer: e.customer,
        date_analysis: e.dateAnalysis, fg_batch_no: e.fgBatchNo,
        moisture_hot_air: e.moistureHotAir ? Number(e.moistureHotAir) : null,
        moisture_ir: e.moistureIR ? Number(e.moistureIR) : null,
        acid_value: e.acidValue ? Number(e.acidValue) : null,
        peroxide_value: e.peroxideValue ? Number(e.peroxideValue) : null,
        salt_percent: e.saltPercent ? Number(e.saltPercent) : null,
        fat_percent: e.fatPercent ? Number(e.fatPercent) : null,
        remarks: e.remarks, analyzed_by: e.analyzedBy, verified_by: e.verifiedBy,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("fg-chemical-analysis", payload);
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
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Finished Good Chemical Analysis</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.26</p>
        </div>
      </div>
      {entries.map((e: any, ei: number) => (
        <div key={e.id} className="border border-gray-300 rounded mb-6">
          <div className="border-b border-gray-200">
            {(([["productName", "Product Name"], ["dateReceiving", "Date Sample Receiving", "date"], ["customer", "Customer"], ["dateAnalysis", "Date of Analysis", "date"], ["fgBatchNo", "FG Batch No."]]) as [string, string, string?][]).map(([f, l, t]) => (
              <div key={f} className="flex border-b border-gray-100 last:border-0">
                <label className="w-1/3 px-3 py-2 text-xs font-medium bg-gray-50 border-r border-gray-200">{l}</label>
                <div className="w-2/3 px-2 py-1"><input type={t || "text"} value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
              </div>
            ))}
          </div>
          <div className="p-3">
            <div className="grid grid-cols-3 gap-3 mb-3">
              {(([["moistureHotAir", "Moisture % (Hot Air)"], ["moistureIR", "Moisture % (IR)"], ["acidValue", "Acid Value"], ["peroxideValue", "Peroxide Value"], ["saltPercent", "Salt (%)"], ["fatPercent", "Fat (%)"]]) as [string, string][]).map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs font-medium">{l}</label>
                  <input type="number" value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" step="0.01" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium">Remarks</label>
              <textarea value={e.remarks} onChange={(ev) => upd(e.id, "remarks", ev.target.value)} rows={2} className="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><label className="text-xs font-medium">Analyzed by (QC)</label><input type="text" value={e.analyzedBy} onChange={(ev) => upd(e.id, "analyzedBy", ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
              <div><label className="text-xs font-medium">Verified By (Quality Mgr)</label><input type="text" value={e.verifiedBy} onChange={(ev) => upd(e.id, "verifiedBy", ev.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
            </div>
          </div>
        </div>
      ))}
      <button onClick={addEntry} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Analysis</button>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 ml-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// F.27 - Eye Wash Bottle Refilling Record
interface EyeWashProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function EyeWashBottleRefillingRecord({ initialData, onSubmit, isEdit }: EyeWashProps = {}) {
  const days = 31;
  const mkGrid = () => Object.fromEntries(Array.from({ length: days }, (_, i) => [i + 1, "" as "\u2713" | "\u2715" | ""]));
  const [quarters, setQuarters] = useState(() => {
    if (initialData?.quarters && Array.isArray(initialData.quarters)) {
      return initialData.quarters.map((q: any, i: number) => ({
        id: i + 1, month: q.month || "", doneBy: q.done_by || "", verifiedBy: q.verified_by || "",
        grid: q.grid || mkGrid(),
      }));
    }
    return [
      { id: 1, month: "", doneBy: "", verifiedBy: "", grid: mkGrid() },
      { id: 2, month: "", doneBy: "", verifiedBy: "", grid: mkGrid() },
      { id: 3, month: "", doneBy: "", verifiedBy: "", grid: mkGrid() },
      { id: 4, month: "", doneBy: "", verifiedBy: "", grid: mkGrid() },
    ];
  });
  const [observations, setObservations] = useState(initialData?.observations || "");
  const [corrective, setCorrective] = useState(initialData?.corrective || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleCell = (qId: number, day: number) =>
    setQuarters((p: any[]) => p.map((q) => {
      if (q.id !== qId) return q;
      const c = q.grid[day];
      const n = c === "" ? "\u2713" : c === "\u2713" ? "\u2715" : "";
      return { ...q, grid: { ...q.grid, [day]: n } };
    }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      quarters: quarters.map((q: any) => ({ month: q.month, done_by: q.doneBy, verified_by: q.verifiedBy, grid: q.grid })),
      observations,
      corrective,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("eyewash-refill", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Eye Wash Bottle Refilling Record</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C7.F.27</p>
        </div>
      </div>
      {quarters.map((q: any) => (
        <div key={q.id} className="mb-4 border border-gray-300 rounded p-3">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div>
              <label className="text-xs font-medium">Month</label>
              <input type="month" value={q.month} onChange={(e) => setQuarters((p: any[]) => p.map((r) => (r.id === q.id ? { ...r, month: e.target.value } : r)))} className="border rounded px-2 py-1 w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Done By</label>
              <input type="text" value={q.doneBy} onChange={(e) => setQuarters((p: any[]) => p.map((r) => (r.id === q.id ? { ...r, doneBy: e.target.value } : r)))} className="border rounded px-2 py-1 w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Verified By</label>
              <input type="text" value={q.verifiedBy} onChange={(e) => setQuarters((p: any[]) => p.map((r) => (r.id === q.id ? { ...r, verifiedBy: e.target.value } : r)))} className="border rounded px-2 py-1 w-full text-sm" />
            </div>
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const val = q.grid[day] || "";
              return (
                <button key={day} onClick={() => toggleCell(q.id, day)} className={`w-8 h-8 border rounded text-[10px] font-bold flex items-center justify-center cursor-pointer select-none ${val === "\u2713" ? "bg-green-100 border-green-400 text-green-700" : val === "\u2715" ? "bg-red-100 border-red-400 text-red-700" : "border-gray-300 text-gray-400 hover:bg-gray-50"}`}>
                  {val || day}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <label className="text-sm font-medium">Observations</label>
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="text-sm font-medium">Corrective Action</label>
          <textarea value={corrective} onChange={(e) => setCorrective(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export default TemperatureHumidityRecord;
