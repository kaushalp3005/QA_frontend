"use client";
import { useState } from "react";
import { Flame, Plus, X, AlertTriangle } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

interface RoastingEntry {
  id: number;
  srNo: string;
  date: string;
  productName: string;
  customer: string;
  setTemperature: string;
  quantity: string;
  roastingStage: string;
  duration: string;
  inTime: string;
  outTime: string;
  operatorSign: string;
  correctiveAction: string;
  qcVerification: string;
  monitoringPoints: {
    startObsTime: string;
    startObsTemp: string;
    middleObsTime: string;
    middleObsTemp: string;
    endObsTime: string;
    endObsTemp: string;
  };
}

const emptyEntry = (): RoastingEntry => ({
  id: Date.now() + Math.random(),
  srNo: "",
  date: "",
  productName: "",
  customer: "",
  setTemperature: "",
  quantity: "",
  roastingStage: "",
  duration: "",
  inTime: "",
  outTime: "",
  operatorSign: "",
  correctiveAction: "",
  qcVerification: "",
  monitoringPoints: {
    startObsTime: "",
    startObsTemp: "",
    middleObsTime: "",
    middleObsTemp: "",
    endObsTime: "",
    endObsTemp: "",
  },
});

export default function CCPRoastingMonitoring() {
  const [entries, setEntries] = useState<RoastingEntry[]>([emptyEntry(), emptyEntry(), emptyEntry()]);

  const addRow = () => setEntries((e) => [...e, emptyEntry()]);
  const removeRow = (id: number) => setEntries((e) => e.filter((r) => r.id !== id));

  const updateEntry = (id: number, field: keyof RoastingEntry, value: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const updateMonitoring = (id: number, field: keyof RoastingEntry["monitoringPoints"], value: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, monitoringPoints: { ...e.monitoringPoints, [field]: value } } : e
      )
    );
  };

  return (
    <DocFormShell
      title="CCP Roasting Temperature & Time"
      docNo="CFPLA.C2.F.42"
      subtitle="Issue 04 · Rev 03 · 01/10/2025"
      icon={Flame}
      width="full"
    >
      <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50/60 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" />
        <p className="text-xs text-warning-800">
          <strong>CCP Monitoring:</strong> Temperature & time must be recorded at Start, Middle, and End of each roasting stage. Flag any deviation immediately.
        </p>
      </div>

      <DocSection
        title="Roasting Log"
        description={`${entries.length} roast${entries.length !== 1 ? "s" : ""} recorded`}
        bleed
        actions={
          <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
          </button>
        }
      >
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70">
              <tr className="border-b border-cream-300">
                <th rowSpan={2} className="px-2 py-2 text-center w-8 text-[11px] font-semibold uppercase text-ink-400">Sr.</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Date</th>
                <th colSpan={4} className="px-2 py-2 text-center text-[11px] font-bold text-blue-700 bg-blue-50/70">Product Info</th>
                <th colSpan={2} className="px-2 py-2 text-center text-[11px] font-bold text-purple-700 bg-purple-50/70">Roasting</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-16 text-[11px] font-semibold uppercase text-ink-400">In Time</th>
                <th colSpan={6} className="px-2 py-2 text-center text-[11px] font-bold text-warning-700 bg-warning-50/70">Monitoring (Time / Temp)</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-16 text-[11px] font-semibold uppercase text-ink-400">Out Time</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Operator</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-28 text-[11px] font-semibold uppercase text-ink-400">Corrective</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">QC Verify</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-6"></th>
              </tr>
              <tr className="border-b border-cream-300">
                {["Product", "Customer", "Set Temp °C", "Qty"].map((h) => (
                  <th key={h} className="px-1 py-1.5 text-center text-[10px] font-semibold text-blue-700 bg-blue-50/40 w-24">{h}</th>
                ))}
                {["Stage", "Duration"].map((h) => (
                  <th key={h} className="px-1 py-1.5 text-center text-[10px] font-semibold text-purple-700 bg-purple-50/40 w-20">{h}</th>
                ))}
                {["Start Time", "Start °C", "Mid Time", "Mid °C", "End Time", "End °C"].map((h) => (
                  <th key={h} className="px-1 py-1.5 text-center text-[10px] font-semibold text-warning-700 bg-warning-50/40 w-16">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {entries.map((entry, idx) => (
                <tr key={entry.id} className="hover:bg-cream-100/60 align-middle">
                  <td className="px-2 py-1 text-center text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <input type="date" value={entry.date} onChange={(e) => updateEntry(entry.id, "date", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1 bg-blue-50/15">
                    <input type="text" value={entry.productName} onChange={(e) => updateEntry(entry.id, "productName", e.target.value)} placeholder="Product" className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1 bg-blue-50/15">
                    <input type="text" value={entry.customer} onChange={(e) => updateEntry(entry.id, "customer", e.target.value)} placeholder="Customer" className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1 bg-blue-50/15">
                    <input type="text" value={entry.setTemperature} onChange={(e) => updateEntry(entry.id, "setTemperature", e.target.value)} placeholder="°C" className="input-base !py-1 !px-2 text-xs text-center" />
                  </td>
                  <td className="px-1 py-1 bg-blue-50/15">
                    <input type="text" value={entry.quantity} onChange={(e) => updateEntry(entry.id, "quantity", e.target.value)} placeholder="Qty" className="input-base !py-1 !px-2 text-xs text-center" />
                  </td>
                  <td className="px-1 py-1 bg-purple-50/15">
                    <input type="text" value={entry.roastingStage} onChange={(e) => updateEntry(entry.id, "roastingStage", e.target.value)} placeholder="Stage" className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1 bg-purple-50/15">
                    <input type="text" value={entry.duration} onChange={(e) => updateEntry(entry.id, "duration", e.target.value)} placeholder="min" className="input-base !py-1 !px-2 text-xs text-center" />
                  </td>
                  <td className="px-1 py-1">
                    <Time12Picker value={entry.inTime} onChange={(v) => updateEntry(entry.id, "inTime", v)} />
                  </td>
                  <td className="px-1 py-1 bg-warning-50/20">
                    <Time12Picker value={entry.monitoringPoints.startObsTime} onChange={(v) => updateMonitoring(entry.id, "startObsTime", v)} />
                  </td>
                  <td className="px-1 py-1 bg-warning-50/20">
                    <input type="text" value={entry.monitoringPoints.startObsTemp} onChange={(e) => updateMonitoring(entry.id, "startObsTemp", e.target.value)} placeholder="°C" className="input-base !py-1 !px-2 text-xs text-center" />
                  </td>
                  <td className="px-1 py-1 bg-warning-50/20">
                    <Time12Picker value={entry.monitoringPoints.middleObsTime} onChange={(v) => updateMonitoring(entry.id, "middleObsTime", v)} />
                  </td>
                  <td className="px-1 py-1 bg-warning-50/20">
                    <input type="text" value={entry.monitoringPoints.middleObsTemp} onChange={(e) => updateMonitoring(entry.id, "middleObsTemp", e.target.value)} placeholder="°C" className="input-base !py-1 !px-2 text-xs text-center" />
                  </td>
                  <td className="px-1 py-1 bg-warning-50/20">
                    <Time12Picker value={entry.monitoringPoints.endObsTime} onChange={(v) => updateMonitoring(entry.id, "endObsTime", v)} />
                  </td>
                  <td className="px-1 py-1 bg-warning-50/20">
                    <input type="text" value={entry.monitoringPoints.endObsTemp} onChange={(e) => updateMonitoring(entry.id, "endObsTemp", e.target.value)} placeholder="°C" className="input-base !py-1 !px-2 text-xs text-center" />
                  </td>
                  <td className="px-1 py-1">
                    <Time12Picker value={entry.outTime} onChange={(v) => updateEntry(entry.id, "outTime", v)} />
                  </td>
                  <td className="px-1 py-1">
                    <input type="text" value={entry.operatorSign} onChange={(e) => updateEntry(entry.id, "operatorSign", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1">
                    <input type="text" value={entry.correctiveAction} onChange={(e) => updateEntry(entry.id, "correctiveAction", e.target.value)} placeholder="If deviation…" className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1">
                    <input type="text" value={entry.qcVerification} onChange={(e) => updateEntry(entry.id, "qcVerification", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      onClick={() => removeRow(entry.id)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                      title="Remove row"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <button className="btn-primary">Submit Record</button>
      </div>
    </DocFormShell>
  );
}
