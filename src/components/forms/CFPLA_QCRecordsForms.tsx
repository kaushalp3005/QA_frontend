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
    <div className="space-y-5">
      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Period & Area</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Area</label>
            <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="input-base" />
          </div>
        </div>
        <p className="text-[11px] text-ink-400 italic mt-3">Humidity acceptable: 50–70%. Out-of-range values highlight red.</p>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Daily Readings</h2>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all days</p>
        <div className="overflow-x-auto">
          <table className="text-[10px]">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 w-28 text-left text-[11px] font-semibold uppercase text-ink-400">Reading</th>
                {Array.from({ length: days }, (_, i) => (
                  <th key={i + 1} className="px-1 py-2 min-w-[46px] text-center text-[11px] font-semibold text-ink-400">{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {["Start", "Mid", "End"].map((label, idx) => (
                <Fragment key={label}>
                  <tr className="hover:bg-cream-100/60">
                    <td className="px-2 py-1 sticky left-0 bg-cream-50 z-10 font-semibold text-ink-500 text-xs">{label} Temp °C</td>
                    {Array.from({ length: days }, (_, d) => (
                      <td key={d + 1} className="px-0.5 py-0.5 border-l border-cream-300">
                        <input type="number" value={grid[d + 1]?.[idx]?.temp || ""} onChange={(e) => updateCell(d + 1, idx, "temp", e.target.value)} className="w-full bg-transparent text-center text-xs focus:outline-none focus:bg-brand-50/30 rounded" />
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-cream-100/60">
                    <td className="px-2 py-1 sticky left-0 bg-cream-50 z-10 font-semibold text-ink-500 text-xs">{label} Humidity %</td>
                    {Array.from({ length: days }, (_, d) => {
                      const v = parseFloat(grid[d + 1]?.[idx]?.humidity || "");
                      const bad = !isNaN(v) && (v < 50 || v > 70);
                      return (
                        <td key={d + 1} className={`px-0.5 py-0.5 border-l border-cream-300 ${bad ? "bg-danger-50" : ""}`}>
                          <input type="number" value={grid[d + 1]?.[idx]?.humidity || ""} onChange={(e) => updateCell(d + 1, idx, "humidity", e.target.value)} className={`w-full bg-transparent text-center text-xs focus:outline-none focus:bg-brand-50/30 rounded ${bad ? "text-danger-600 font-semibold" : ""}`} />
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Approvals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Checked By</label>
            <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Verified By</label>
            <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="input-base" />
          </div>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">Frequency: Start, Mid and End of shift</p>
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
    <div className="space-y-5">
      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Date</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base sm:max-w-xs" />
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">QC Samples</h2>
          <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Row</button>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["SKU", "Customer", "Batch", "Sensory", "Physical", "Label", "Seal", "Decision", "Remarks", "Checked By", "Verified By", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1"><input type="text" value={r.skuName} onChange={(e) => upd(r.id, "skuName", e.target.value)} className="input-base !py-1 !px-2 text-xs min-w-[100px]" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.customer} onChange={(e) => upd(r.id, "customer", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.batchNo} onChange={(e) => upd(r.id, "batchNo", e.target.value)} className="input-base !py-1 !px-2 text-xs w-20" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.sensory} onChange={(e) => upd(r.id, "sensory", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.physical} onChange={(e) => upd(r.id, "physical", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.labelCheck} onChange={(e) => upd(r.id, "labelCheck", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1">
                    <select value={r.sealCheck} onChange={(e) => upd(r.id, "sealCheck", e.target.value)} className={`w-full border rounded-md px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${r.sealCheck === "Ok" ? "bg-success-50 text-success-700 border-success-200" : r.sealCheck === "Not Ok" ? "bg-danger-50 text-danger-600 border-danger-200" : "bg-cream-50 border-cream-300 text-ink-500"}`}>
                      <option value="">—</option><option value="Ok">Ok</option><option value="Not Ok">Not Ok</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <select value={r.decision} onChange={(e) => upd(r.id, "decision", e.target.value)} className={`w-full border rounded-md px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${r.decision === "Accept" ? "bg-success-50 text-success-700 border-success-200" : r.decision === "Reject" ? "bg-danger-50 text-danger-600 border-danger-200" : "bg-cream-50 border-cream-300 text-ink-500"}`}>
                      <option value="">—</option><option value="Accept">Accept</option><option value="Reject">Reject</option>
                    </select>
                  </td>
                  <td className="px-1 py-1"><input type="text" value={r.remarks} onChange={(e) => upd(r.id, "remarks", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.checkedBy} onChange={(e) => upd(r.id, "checkedBy", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={r.verifiedBy} onChange={(e) => upd(r.id, "verifiedBy", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1 text-center"><button onClick={() => removeRow(r.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
        </button>
      </div>
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
    <div className="space-y-5">
      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Year</h2>
        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="input-base sm:max-w-xs" />
      </section>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Inspection Schedule</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 w-10 text-center text-[11px] font-semibold uppercase text-ink-400">Sr.</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Month</th>
                <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase text-ink-400">Year</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Planned</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Actual</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-2 py-1.5 text-center text-ink-400 font-medium">{r.id}</td>
                  <td className="px-2 py-1.5 font-semibold text-ink-500">{r.month}</td>
                  <td className="px-2 py-1.5 text-center text-ink-500">{year}</td>
                  <td className="px-1 py-1.5"><input type="date" value={r.plannedDate} onChange={(e) => upd(r.id, "plannedDate", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1.5"><input type="date" value={r.actualDate} onChange={(e) => upd(r.id, "actualDate", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1.5"><input type="text" value={r.remarks} onChange={(e) => upd(r.id, "remarks", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
        </button>
      </div>
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
    <div className="space-y-5">
      {entries.map((e: any, ei: number) => (
        <section key={e.id} className="surface-card overflow-hidden">
          <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
            <h2 className="text-sm font-bold text-ink-600">Material Entry #{ei + 1}</h2>
          </header>
          <div className="p-4 sm:p-5 border-b border-cream-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">General</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(([["materialName", "Material Name"], ["inwardDate", "Inward Date", "date"], ["vendorName", "Vendor Name"], ["lotNumber", "Lot Number"], ["customerName", "Customer Name"], ["quantity", "Quantity (kg)"], ["mfgDate", "MFG Date", "date"], ["expDate", "EXP Date", "date"], ["packagingCondition", "Packaging Condition"]]) as [string, string, string?][]).map(([f, l, t]) => (
                <div key={f}>
                  <label className="label-base">{l}</label>
                  <input type={t || "text"} value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="input-base" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-b border-cream-300">
            <h3 className="px-4 sm:px-5 pt-4 text-xs font-bold uppercase tracking-wider text-ink-400">Sensory</h3>
            <div className="overflow-x-auto p-2">
              <table className="w-full text-xs">
                <thead className="bg-cream-100/70">
                  <tr>
                    {["Parameter", "Observations", "Defects", "Result"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {sp.map((p) => (
                    <tr key={p}>
                      <td className="px-2 py-1.5 font-semibold capitalize text-ink-500">{p}</td>
                      <td className="px-1 py-1.5"><input type="text" value={(e as any)[`${p}Obs`] || ""} onChange={(ev) => upd(e.id, `${p}Obs`, ev.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                      <td className="px-1 py-1.5"><input type="text" value={(e as any)[`${p}Defect`] || ""} onChange={(ev) => upd(e.id, `${p}Defect`, ev.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                      <td className="px-1 py-1.5">
                        <select
                          value={(e as any)[`${p}Result`] || ""}
                          onChange={(ev) => upd(e.id, `${p}Result`, ev.target.value)}
                          className={`w-full border rounded-md px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                            (e as any)[`${p}Result`] === "Pass"
                              ? "bg-success-50 text-success-700 border-success-200"
                              : (e as any)[`${p}Result`] === "Fail"
                              ? "bg-danger-50 text-danger-600 border-danger-200"
                              : "bg-cream-50 border-cream-300 text-ink-500"
                          }`}
                        >
                          <option value="">—</option><option value="Pass">Pass</option><option value="Fail">Fail</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 sm:p-5 border-b border-cream-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">Chemical</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(([["moistureIR", "Moisture IR (%)"], ["fatPercent", "Fat (%)"], ["acidValue", "Acid Value"], ["peroxideValue", "Peroxide Value"]]) as [string, string][]).map(([f, l]) => (
                <div key={f}>
                  <label className="label-base">{l}</label>
                  <input type="number" value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="input-base" step="0.01" />
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="label-base">Remarks</label><input type="text" value={e.remarks} onChange={(ev) => upd(e.id, "remarks", ev.target.value)} className="input-base" /></div>
              <div><label className="label-base">Checked By</label><input type="text" value={e.checkedBy} onChange={(ev) => upd(e.id, "checkedBy", ev.target.value)} className="input-base" /></div>
              <div><label className="label-base">Verified By</label><input type="text" value={e.verifiedBy} onChange={(ev) => upd(e.id, "verifiedBy", ev.target.value)} className="input-base" /></div>
            </div>
          </div>
        </section>
      ))}

      <button onClick={addEntry} className="btn-outline w-full sm:w-auto">+ Add Material</button>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
        </button>
      </div>
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
    <div className="space-y-5">
      {entries.map((e: any, ei: number) => (
        <section key={e.id} className="surface-card overflow-hidden">
          <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
            <h2 className="text-sm font-bold text-ink-600">Analysis #{ei + 1}</h2>
          </header>
          <div className="divide-y divide-cream-300">
            {(([["productName", "Product Name"], ["dateReceiving", "Date Sample Receiving", "date"], ["customer", "Customer"], ["dateAnalysis", "Date of Analysis", "date"], ["fgBatchNo", "FG Batch No."]]) as [string, string, string?][]).map(([f, l, t]) => (
              <div key={f} className="grid grid-cols-1 sm:grid-cols-[35%_65%] gap-1 sm:gap-0">
                <label className="px-4 sm:px-5 pt-3 sm:py-3 text-xs sm:text-sm font-semibold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center">{l}</label>
                <div className="px-3 sm:px-4 pb-3 sm:py-2.5">
                  <input type={t || "text"} value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="input-base !py-2 !px-3" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 sm:p-5 border-t border-cream-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">Chemical Parameters</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {(([["moistureHotAir", "Moisture % (Hot Air)"], ["moistureIR", "Moisture % (IR)"], ["acidValue", "Acid Value"], ["peroxideValue", "Peroxide Value"], ["saltPercent", "Salt (%)"], ["fatPercent", "Fat (%)"]]) as [string, string][]).map(([f, l]) => (
                <div key={f}>
                  <label className="label-base">{l}</label>
                  <input type="number" value={(e as any)[f]} onChange={(ev) => upd(e.id, f, ev.target.value)} className="input-base" step="0.01" />
                </div>
              ))}
            </div>
            <div>
              <label className="label-base">Remarks</label>
              <textarea value={e.remarks} onChange={(ev) => upd(e.id, "remarks", ev.target.value)} rows={2} className="input-base" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div><label className="label-base">Analyzed By (QC)</label><input type="text" value={e.analyzedBy} onChange={(ev) => upd(e.id, "analyzedBy", ev.target.value)} className="input-base" /></div>
              <div><label className="label-base">Verified By (Quality Mgr)</label><input type="text" value={e.verifiedBy} onChange={(ev) => upd(e.id, "verifiedBy", ev.target.value)} className="input-base" /></div>
            </div>
          </div>
        </section>
      ))}

      <button onClick={addEntry} className="btn-outline w-full sm:w-auto">+ Add Analysis</button>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
        </button>
      </div>
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
    <div className="space-y-5">
      {quarters.map((q: any, qi: number) => (
        <section key={q.id} className="surface-card overflow-hidden">
          <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
            <h2 className="text-sm font-bold text-ink-600">Quarter {qi + 1}</h2>
          </header>
          <div className="p-4 sm:p-5 border-b border-cream-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label-base">Month</label>
                <input type="month" value={q.month} onChange={(e) => setQuarters((p: any[]) => p.map((r) => (r.id === q.id ? { ...r, month: e.target.value } : r)))} className="input-base" />
              </div>
              <div>
                <label className="label-base">Done By</label>
                <input type="text" value={q.doneBy} onChange={(e) => setQuarters((p: any[]) => p.map((r) => (r.id === q.id ? { ...r, doneBy: e.target.value } : r)))} className="input-base" />
              </div>
              <div>
                <label className="label-base">Verified By</label>
                <input type="text" value={q.verifiedBy} onChange={(e) => setQuarters((p: any[]) => p.map((r) => (r.id === q.id ? { ...r, verifiedBy: e.target.value } : r)))} className="input-base" />
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[11px] text-ink-400 italic mb-2">Tap each day to cycle: empty \u2192 \u2713 \u2192 \u2715 \u2192 empty.</p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const val = q.grid[day] || "";
                return (
                  <button
                    key={day}
                    onClick={() => toggleCell(q.id, day)}
                    className={`w-8 h-8 border rounded-md text-[11px] font-bold flex items-center justify-center cursor-pointer select-none transition-colors ${
                      val === "\u2713"
                        ? "bg-success-50 border-success-200 text-success-700"
                        : val === "\u2715"
                        ? "bg-danger-50 border-danger-200 text-danger-600"
                        : "border-cream-300 text-ink-400 hover:bg-cream-100"
                    }`}
                  >
                    {val || day}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Notes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective Action</label>
            <textarea value={corrective} onChange={(e) => setCorrective(e.target.value)} rows={3} className="input-base" />
          </div>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
        </button>
      </div>
    </div>
  );
}

export default TemperatureHumidityRecord;
