"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Flame, Plus, X, AlertTriangle, Clock, Thermometer, Loader2 } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

function addMins(hhmm: string, mins: number): string {
  if (!hhmm || !hhmm.includes(":")) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  const total = h * 60 + m + Math.round(mins);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(((total % 60) + 60) % 60).padStart(2, "0")}`;
}

interface RoastingEntry {
  id: number;
  date: string; productName: string; customer: string;
  setTemperature: string; quantity: string; roastingStage: string;
  duration: string; inTime: string; outTime: string;
  operatorSign: string; correctiveAction: string; qcVerification: string;
  monitoringPoints: { startObsTime: string; startObsTemp: string; middleObsTime: string; middleObsTemp: string; endObsTime: string; endObsTemp: string };
}

const emptyEntry = (): RoastingEntry => ({
  id: Date.now() + Math.random(),
  date: "", productName: "", customer: "", setTemperature: "", quantity: "",
  roastingStage: "", duration: "", inTime: "", outTime: "",
  operatorSign: "", correctiveAction: "No", qcVerification: "",
  monitoringPoints: { startObsTime: "", startObsTemp: "", middleObsTime: "", middleObsTemp: "", endObsTime: "", endObsTemp: "" },
});

function normalizeEntries(raw: any[]): RoastingEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyEntry(), emptyEntry(), emptyEntry()];
  return raw.map((e: any, i: number) => ({
    id: i + 1,
    date: e.date || "", productName: e.product_name || "", customer: e.customer || "",
    setTemperature: e.set_temperature || "", quantity: e.quantity || "",
    roastingStage: e.roasting_stage || "", duration: e.duration || "",
    inTime: e.in_time || "", outTime: e.out_time || "",
    operatorSign: e.operator_sign || "", correctiveAction: e.corrective_action || "No",
    qcVerification: e.qc_verification || "",
    monitoringPoints: {
      startObsTime:  e.monitoring_points?.start_obs_time  || "",
      startObsTemp:  e.monitoring_points?.start_obs_temp  || "",
      middleObsTime: e.monitoring_points?.middle_obs_time || "",
      middleObsTemp: e.monitoring_points?.middle_obs_temp || "",
      endObsTime:    e.monitoring_points?.end_obs_time    || "",
      endObsTemp:    e.monitoring_points?.end_obs_temp    || "",
    },
  }));
}

const MONITORING_STAGES = [
  { label: "Start of Stage",      timeKey: "startObsTime"  as const, tempKey: "startObsTemp"  as const, color: "bg-emerald-50 border-emerald-200" },
  { label: "At the Middle Stage", timeKey: "middleObsTime" as const, tempKey: "middleObsTemp" as const, color: "bg-amber-50 border-amber-200"   },
  { label: "End of Stage",        timeKey: "endObsTime"    as const, tempKey: "endObsTemp"    as const, color: "bg-rose-50 border-rose-200"     },
];
const STAGE_BADGE = ["bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];

export default function RoastingTemperatureEditPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = Number(params.id);

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [entries, setEntries] = useState<RoastingEntry[]>([emptyEntry(), emptyEntry(), emptyEntry()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    docsApi.get("roastingtemperature", recordId)
      .then((res) => setEntries(normalizeEntries(res.data?.entries || [])))
      .catch(() => setLoadError("Failed to load record."))
      .finally(() => setLoadingData(false));
  }, [recordId]);

  const addRow = () => setEntries((e) => [...e, emptyEntry()]);
  const removeRow = (id: number) => setEntries((e) => e.filter((r) => r.id !== id));

  const updateEntry = (id: number, field: keyof RoastingEntry, value: string) =>
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));

  const updateMonitoring = (id: number, field: keyof RoastingEntry["monitoringPoints"], value: string) =>
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, monitoringPoints: { ...e.monitoringPoints, [field]: value } } : e));

  const autoDistribute = (id: number, field: "inTime" | "duration" | "startObsTime", value: string) => {
    setEntries((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      const next = {
        ...e,
        ...(field === "inTime"   ? { inTime: value }   : {}),
        ...(field === "duration" ? { duration: value } : {}),
        monitoringPoints: { ...e.monitoringPoints, ...(field === "startObsTime" ? { startObsTime: value } : {}) },
      };
      const durMins = parseFloat(next.duration);
      const canCalc = !isNaN(durMins) && durMins > 0;
      if (!canCalc || (!next.inTime && !next.monitoringPoints.startObsTime)) return next;
      const startObs = (field === "inTime" || !next.monitoringPoints.startObsTime) ? next.inTime : next.monitoringPoints.startObsTime;
      return {
        ...next,
        outTime: addMins(startObs, durMins),
        monitoringPoints: { ...next.monitoringPoints, startObsTime: startObs, middleObsTime: addMins(startObs, durMins / 2), endObsTime: addMins(startObs, durMins) },
      };
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await docsApi.update("roastingtemperature", recordId, {
        warehouse: getStoredWarehouse() || null,
        entries: entries.map((e) => ({
          date: e.date, product_name: e.productName, customer: e.customer,
          set_temperature: e.setTemperature, quantity: e.quantity,
          roasting_stage: e.roastingStage, duration: e.duration,
          in_time: e.inTime, out_time: e.outTime,
          operator_sign: e.operatorSign, corrective_action: e.correctiveAction,
          qc_verification: e.qcVerification,
          monitoring_points: {
            start_obs_time: e.monitoringPoints.startObsTime,
            start_obs_temp: e.monitoringPoints.startObsTemp,
            middle_obs_time: e.monitoringPoints.middleObsTime,
            middle_obs_temp: e.monitoringPoints.middleObsTemp,
            end_obs_time: e.monitoringPoints.endObsTime,
            end_obs_temp: e.monitoringPoints.endObsTemp,
          },
        })),
      });
      router.push("/documentations/roastingtemperature");
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) return (
    <DocFormShell title="CCP Roasting Temperature & Time" docNo="CFPLA.C2.F.42" subtitle="Issue 04 · Rev 03 · 01/10/2025" icon={Flame} width="full">
      <div className="flex items-center justify-center py-20 gap-3 text-ink-400">
        <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading record…</span>
      </div>
    </DocFormShell>
  );

  if (loadError) return (
    <DocFormShell title="CCP Roasting Temperature & Time" docNo="CFPLA.C2.F.42" subtitle="Issue 04 · Rev 03 · 01/10/2025" icon={Flame} width="full">
      <div className="surface-card p-4 border-l-4 border-danger-500 text-danger-700 text-sm">{loadError}</div>
    </DocFormShell>
  );

  return (
    <DocFormShell title="CCP Roasting Temperature & Time" docNo="CFPLA.C2.F.42" subtitle="Issue 04 · Rev 03 · 01/10/2025" icon={Flame} width="full">
      <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50/60 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" />
        <p className="text-xs text-warning-800">
          <strong>CCP Monitoring:</strong> Temperature &amp; time must be recorded at Start, Middle, and End of each roasting stage.
          Filling <strong>In Time</strong> and <strong>Duration</strong> will auto-calculate monitoring times.
        </p>
      </div>

      <DocSection title="Roasting Log" description={`${entries.length} entr${entries.length !== 1 ? "ies" : "y"} recorded`} bleed
        actions={<button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Add Entry</button>}
      >
        <div className="flex flex-col gap-4 p-4">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="border border-cream-300 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-brand-600 text-white">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <span className="text-sm font-semibold tracking-wide">Roasting Entry #{idx + 1}</span>
                </div>
                {entries.length > 1 && (
                  <button onClick={() => removeRow(entry.id)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/20 transition-colors" title="Remove entry">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Product Info */}
              <div className="px-4 pt-4 pb-3 border-b border-cream-200 bg-white">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-3">Product Information</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                    <label className="label-base !text-[10px] !mb-0.5">Date</label>
                    <input type="date" value={entry.date} onChange={(e) => updateEntry(entry.id, "date", e.target.value)} className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                    <label className="label-base !text-[10px] !mb-0.5">Product Name</label>
                    <input type="text" value={entry.productName} onChange={(e) => updateEntry(entry.id, "productName", e.target.value)} placeholder="e.g. Roasted Peanuts" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div className="col-span-2 sm:col-span-2 lg:col-span-1">
                    <label className="label-base !text-[10px] !mb-0.5">Customer</label>
                    <input type="text" value={entry.customer} onChange={(e) => updateEntry(entry.id, "customer", e.target.value)} placeholder="Customer name" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">Set Temp (°C)</label>
                    <input type="text" value={entry.setTemperature} onChange={(e) => updateEntry(entry.id, "setTemperature", e.target.value)} placeholder="°C" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">Quantity</label>
                    <input type="text" value={entry.quantity} onChange={(e) => updateEntry(entry.id, "quantity", e.target.value)} placeholder="kg / units" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                </div>
              </div>

              {/* Roasting Stage & Timing */}
              <div className="px-4 pt-3 pb-3 border-b border-cream-200 bg-cream-50/40">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-3">Roasting Stage &amp; Timing</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">Stage</label>
                    <input type="text" value={entry.roastingStage} onChange={(e) => updateEntry(entry.id, "roastingStage", e.target.value)} placeholder="e.g. Stage 1" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">Duration (mins)</label>
                    <input type="text" value={entry.duration} onChange={(e) => autoDistribute(entry.id, "duration", e.target.value)} placeholder="e.g. 20" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3 text-brand-500" /> In Time</label>
                    <Time12Picker value={entry.inTime} onChange={(v) => autoDistribute(entry.id, "inTime", v)} />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-ink-400" /> Out Time
                      {entry.outTime && <span className="ml-1 text-[9px] text-emerald-600 font-medium">(auto)</span>}
                    </label>
                    <Time12Picker value={entry.outTime} onChange={(v) => updateEntry(entry.id, "outTime", v)} />
                  </div>
                </div>
              </div>

              {/* Monitoring Points */}
              <div className="px-4 pt-3 pb-3 border-b border-cream-200 bg-white">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-3 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-danger-500" />Time of Monitoring
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MONITORING_STAGES.map((stage, si) => (
                    <div key={stage.timeKey} className={`rounded-lg border p-3 ${stage.color}`}>
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2.5 ${STAGE_BADGE[si]}`}>{stage.label}</div>
                      <div className="space-y-2">
                        <div>
                          <label className="label-base !text-[10px] !mb-0.5 flex items-center gap-1">
                            Obs. Time {entry.monitoringPoints[stage.timeKey] && si > 0 && <span className="text-[9px] text-emerald-600 font-medium">(auto)</span>}
                          </label>
                          <Time12Picker value={entry.monitoringPoints[stage.timeKey]}
                            onChange={(v) => stage.timeKey === "startObsTime" ? autoDistribute(entry.id, "startObsTime", v) : updateMonitoring(entry.id, stage.timeKey, v)} />
                        </div>
                        <div>
                          <label className="label-base !text-[10px] !mb-0.5">Obs. Temp (°C)</label>
                          <input type="text" value={entry.monitoringPoints[stage.tempKey]} onChange={(e) => updateMonitoring(entry.id, stage.tempKey, e.target.value)} placeholder="°C" className="input-base !py-1.5 !text-xs w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign-off */}
              <div className="px-4 pt-3 pb-4 bg-cream-50/40">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-3">Sign-off</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">Operator Sign</label>
                    <input type="text" value={entry.operatorSign} onChange={(e) => updateEntry(entry.id, "operatorSign", e.target.value)} placeholder="Name / initials" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">Corrective Action (if deviation)</label>
                    <input type="text" value={entry.correctiveAction} onChange={(e) => updateEntry(entry.id, "correctiveAction", e.target.value)} placeholder="No / describe action" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                  <div>
                    <label className="label-base !text-[10px] !mb-0.5">QC Verification</label>
                    <input type="text" value={entry.qcVerification} onChange={(e) => updateEntry(entry.id, "qcVerification", e.target.value)} placeholder="QC sign" className="input-base !py-1.5 !text-xs w-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addRow} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-cream-300 text-ink-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/40 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add another roasting entry
          </button>
        </div>
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-60 inline-flex items-center gap-2">
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </DocFormShell>
  );
}
