"use client";
import { useState } from "react";
import { Gauge, Plus, X, AlertTriangle } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";

interface CalibrationRow {
  id: number;
  srNo: string;
  identificationNo: string;
  capacityKg: string;
  location: string;
  standardWeightUsed: string;
  reading1: string;
  reading2: string;
  reading3: string;
  reading4: string;
  reading5: string;
  deviation: string;
  correctiveAction: string;
  fixed?: boolean;
  excluded?: boolean;
}

const FIXED_SCALE_IDS = [
  "879", "181", "889", "630", "682", "647", "891", "645", "674", "230108",
  "644", "641", "689", "1017", "323", "683", "183", "1015", "884", "876",
  "881", "1011", "190935", "882", "804", "200121", "694", "877", "906", "819",
  "681", "2307189", "597", "212", "880", "890", "886", "875", "642", "645",
  "899", "878", "231002", "907", "1013", "883", "240907", "1009", "241113", "896",
  "904", "111", "648", "914", "240803",
];

const emptyRow = (): CalibrationRow => ({
  id: Date.now() + Math.random(),
  srNo: "",
  identificationNo: "",
  capacityKg: "",
  location: "",
  standardWeightUsed: "",
  reading1: "",
  reading2: "",
  reading3: "",
  reading4: "",
  reading5: "",
  deviation: "",
  correctiveAction: "No",
});

const fixedRow = (identificationNo: string, idx: number): CalibrationRow => ({
  ...emptyRow(),
  id: -(idx + 1),
  identificationNo,
  fixed: true,
});

const READINGS: (keyof CalibrationRow)[] = ["reading1", "reading2", "reading3", "reading4", "reading5"];

function getDeviationStatus(row: CalibrationRow): "ok" | "deviation" | "empty" {
  const std = parseFloat(row.standardWeightUsed);
  const readings = READINGS.map((r) => parseFloat(row[r] as string)).filter((v) => !isNaN(v));
  if (isNaN(std) || readings.length === 0) return "empty";
  const maxDev = Math.max(...readings.map((v) => Math.abs(v - std)));
  return maxDev <= std * 0.001 ? "ok" : "deviation";
}

export default function WeighingScaleCalibration() {
  const [dateOfInspection, setDateOfInspection] = useState("");
  const [calibratedBy, setCalibratedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState<CalibrationRow[]>(
    FIXED_SCALE_IDS.map((sid, i) => fixedRow(sid, i))
  );

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const toggleExclude = (id: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, excluded: !r.excluded } : r)));
  };

  const updateRow = (id: number, field: keyof CalibrationRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "reading1") {
          return { ...r, reading1: value, reading2: value, reading3: value, reading4: value, reading5: value };
        }
        return { ...r, [field]: value };
      })
    );
  };

  const activeRows = rows.filter((r) => !r.excluded);
  const okCount = activeRows.filter((r) => getDeviationStatus(r) === "ok").length;
  const deviations = activeRows.filter((r) => getDeviationStatus(r) === "deviation").length;
  const empty = activeRows.filter((r) => getDeviationStatus(r) === "empty").length;
  const excludedCount = rows.length - activeRows.length;

  return (
    <DocFormShell
      title="Weighing Scale Calibration"
      docNo="CFPLA.C6.F.41"
      subtitle="Issue 04 · Rev 03 · 01/10/2025"
      icon={Gauge}
      width="full"
      note="Frequency: Daily — before starting production"
    >
      <DocSection title="Inspection Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Date of Inspection</label>
            <input type="date" value={dateOfInspection} onChange={(e) => setDateOfInspection(e.target.value)} className="input-base" />
          </div>
        </div>
      </DocSection>

      {deviations > 0 && (
        <div className="surface-card p-3 border-l-4 border-danger-500 bg-danger-50/60 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
          <p className="text-xs text-danger-700">
            <strong>{deviations} scale(s)</strong> showing deviation. Corrective action required before production start.
          </p>
        </div>
      )}

      <DocSection
        title="Calibration Log"
        description={`${activeRows.length} active${excludedCount ? ` · ${excludedCount} excluded` : ""}`}
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
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 text-center w-8 text-[11px] font-semibold uppercase text-ink-400" title="Tick to exclude this row from the record">Skip</th>
                <th className="px-2 py-2 text-center w-8 text-[11px] font-semibold uppercase text-ink-400">Sr.</th>
                <th className="px-2 py-2 text-center w-24 text-[11px] font-semibold uppercase text-ink-400">ID No.</th>
                <th className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Capacity (Kg)</th>
                <th className="px-2 py-2 text-center w-28 text-[11px] font-semibold uppercase text-ink-400">Location</th>
                <th className="px-2 py-2 text-center w-24 text-[11px] font-semibold uppercase text-ink-400">Std Weight</th>
                {["1", "2", "3", "4", "5"].map((n) => (
                  <th key={n} className="px-2 py-2 text-center w-16 text-[11px] font-semibold text-blue-700 bg-blue-50/40">R {n}</th>
                ))}
                <th className="px-2 py-2 text-center w-28 text-[11px] font-semibold text-warning-700 bg-warning-50/40">Deviation</th>
                <th className="px-2 py-2 text-center w-32 text-[11px] font-semibold text-danger-600 bg-danger-50/40">Corrective</th>
                <th className="px-2 py-2 text-center w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((row, idx) => {
                const status = getDeviationStatus(row);
                const excluded = !!row.excluded;
                return (
                  <tr
                    key={row.id}
                    className={`${
                      excluded
                        ? "bg-cream-200/50 opacity-60 line-through"
                        : status === "deviation"
                        ? "bg-danger-50/40"
                        : status === "ok"
                        ? "bg-success-50/30"
                        : "hover:bg-cream-100/60"
                    }`}
                  >
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={excluded}
                        onChange={() => toggleExclude(row.id)}
                        className="w-4 h-4 accent-danger-500 cursor-pointer no-underline"
                        title={excluded ? "Include this row" : "Exclude (skip) this row"}
                      />
                    </td>
                    <td className="px-2 py-1 text-center text-ink-400 font-medium">{idx + 1}</td>
                    <td className="px-1 py-1">
                      {row.fixed ? (
                        <div className="px-2 py-1 text-xs text-center font-semibold text-ink-600 bg-cream-200/60 rounded border border-cream-300 select-none" title="Fixed Scale ID">
                          {row.identificationNo}
                        </div>
                      ) : (
                        <input type="text" disabled={excluded} value={row.identificationNo} onChange={(e) => updateRow(row.id, "identificationNo", e.target.value)} placeholder="Scale ID" className="input-base !py-1 !px-2 text-xs disabled:bg-cream-200/60" />
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" inputMode="decimal" disabled={excluded} value={row.capacityKg} onChange={(e) => updateRow(row.id, "capacityKg", e.target.value)} placeholder="kg" className="input-base !py-1 !px-2 text-xs text-center disabled:bg-cream-200/60" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" disabled={excluded} value={row.location} onChange={(e) => updateRow(row.id, "location", e.target.value)} placeholder="Floor/Area" className="input-base !py-1 !px-2 text-xs disabled:bg-cream-200/60" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" inputMode="decimal" disabled={excluded} value={row.standardWeightUsed} onChange={(e) => updateRow(row.id, "standardWeightUsed", e.target.value)} placeholder="kg" className="input-base !py-1 !px-2 text-xs text-center disabled:bg-cream-200/60" />
                    </td>
                    {READINGS.map((field) => (
                      <td key={field} className="px-1 py-1 bg-blue-50/15">
                        <input type="text" inputMode="decimal" disabled={excluded} value={row[field] as string} onChange={(e) => updateRow(row.id, field, e.target.value)} placeholder="—" className="input-base !py-1 !px-2 text-xs text-center disabled:bg-cream-200/60" />
                      </td>
                    ))}
                    <td className="px-1 py-1 bg-warning-50/15">
                      <input
                        type="text"
                        disabled={excluded}
                        value={row.deviation}
                        onChange={(e) => updateRow(row.id, "deviation", e.target.value)}
                        placeholder={status === "deviation" ? "Enter deviation" : status === "ok" ? "Within tolerance" : "—"}
                        className="input-base !py-1 !px-2 text-xs disabled:bg-cream-200/60"
                      />
                    </td>
                    <td className="px-1 py-1 bg-danger-50/15">
                      <input
                        type="text"
                        value={row.correctiveAction}
                        onChange={(e) => updateRow(row.id, "correctiveAction", e.target.value)}
                        disabled={excluded || status !== "deviation"}
                        placeholder={status === "deviation" ? "Action taken…" : "—"}
                        className="input-base !py-1 !px-2 text-xs disabled:bg-cream-200/60 disabled:text-ink-300"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      {!row.fixed && (
                        <button
                          onClick={() => removeRow(row.id)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                          title="Remove row"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-cream-300 px-4 py-2.5 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="px-2 py-0.5 rounded-full bg-success-50 text-success-700">✓ OK {okCount}</span>
          <span className="px-2 py-0.5 rounded-full bg-danger-50 text-danger-600">✕ Deviation {deviations}</span>
          <span className="px-2 py-0.5 rounded-full bg-cream-200 text-ink-400">Empty {empty}</span>
          {excludedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-ink-200/60 text-ink-500">⊘ Excluded {excludedCount}</span>
          )}
        </div>
      </DocSection>

      <DocSection title="Approvals" description="Final sign-off for this calibration">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SignaturePicker
            label="Checked By (Calibrated By)"
            value={calibratedBy}
            onChange={setCalibratedBy}
            options={CHECKED_BY_OPTIONS}
            roleHint="Quality Control Executive"
            inputCls="input-base"
            labelCls="label-base"
          />
          <SignaturePicker
            label="Verified By"
            value={verifiedBy}
            onChange={setVerifiedBy}
            options={QC_VERIFIED_BY_OPTIONS}
            roleHint="Quality Manager"
            inputCls="input-base"
            labelCls="label-base"
          />
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
