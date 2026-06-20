"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, AlertTriangle } from "lucide-react";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

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

const FLOOR_RANGES: Record<string, [number, number]> = {
  "Lower Basement":   [1,  10],
  "Upper Basement":   [11, 23],
  "First Floor":      [24, 34],
  "First Floor Mezz": [35, 43],
  "Second Floor":     [44, 49],
  "Terrace":          [50, 55],
};

// A row belongs to the selected floor when it's a fixed scale whose position
// falls in the floor's id range; custom rows show under every floor.
const rowInFloor = (r: CalibrationRow, f: string): boolean => {
  if (f === "") return true;
  if (!r.fixed) return true;
  const range = FLOOR_RANGES[f];
  if (!range) return true;
  const pos = -r.id; // id = -(idx+1) → 1-based position
  return pos >= range[0] && pos <= range[1];
};

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

const CAPACITY_MAP: Record<string, string> = {
  "879": "20.000", "183": "20.000",
  "230108": "300.000", "241113": "300.000", "240803": "300.000",
  "630": "5.000", "682": "5.000", "683": "5.000",
  "190935": "100.000", "200121": "100.000", "2307189": "100.000", "231002": "100.000",
  "240907": "200.000",
  "111": "2.000",
};
const DEFAULT_CAPACITY = "10.000";

const fixedRow = (identificationNo: string, idx: number): CalibrationRow => ({
  ...emptyRow(),
  id: -(idx + 1),
  identificationNo,
  capacityKg: CAPACITY_MAP[identificationNo] ?? DEFAULT_CAPACITY,
  fixed: true,
});

// Map a saved record row back into an editable (non-fixed) form row.
const rowFromSaved = (r: any, i: number): CalibrationRow => ({
  id: i + 1,
  srNo: "",
  identificationNo: r.identification_no ?? "",
  capacityKg: r.capacity_kg != null ? String(r.capacity_kg) : "",
  location: r.location ?? "",
  standardWeightUsed: r.standard_weight_used != null ? String(r.standard_weight_used) : "",
  reading1: r.reading1 != null ? String(r.reading1) : "",
  reading2: r.reading2 != null ? String(r.reading2) : "",
  reading3: r.reading3 != null ? String(r.reading3) : "",
  reading4: r.reading4 != null ? String(r.reading4) : "",
  reading5: r.reading5 != null ? String(r.reading5) : "",
  deviation: r.deviation != null ? String(r.deviation) : "",
  correctiveAction: r.corrective_action ?? "No",
});

const READINGS: (keyof CalibrationRow)[] = ["reading1", "reading2", "reading3", "reading4", "reading5"];

function getToleranceKg(capacityKg: number): number {
  if (capacityKg <= 0.2)  return 0.00001; // 200 g  → ±0.01 g
  if (capacityKg <= 10)   return 0.001;   // 10 kg  → ±1 g
  if (capacityKg <= 20)   return 0.002;   // 20 kg  → ±2 g
  if (capacityKg <= 50)   return 0.005;   // 50 kg  → ±5 g
  if (capacityKg <= 100)  return 0.010;   // 100 kg → ±10 g
  return 0.050;                           // 300 kg → ±50 g
}

function getDeviationStatus(row: CalibrationRow): "ok" | "deviation" | "empty" {
  const std = parseFloat(row.standardWeightUsed);
  const avg = parseFloat(row.deviation); // deviation = average of R1–R5
  const cap = parseFloat(row.capacityKg);
  if (isNaN(std) || isNaN(avg) || isNaN(cap)) return "empty";
  return Math.abs(avg - std) <= getToleranceKg(cap) ? "ok" : "deviation";
}

interface Props {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function WeighingScaleCalibrationForm({ initialData, onSubmit, isEdit }: Props = {}) {
  const router = useRouter();
  const [dateOfInspection, setDateOfInspection] = useState(initialData?.inspection_date || "");
  const [calibratedBy, setCalibratedBy] = useState(initialData?.calibrated_by || "");
  const [verifiedBy, setVerifiedBy] = useState(initialData?.verified_by || "");
  const [rows, setRows] = useState<CalibrationRow[]>(() => {
    const src = initialData?.rows;
    if (Array.isArray(src) && src.length) return src.map(rowFromSaved);
    return FIXED_SCALE_IDS.map((sid, i) => fixedRow(sid, i));
  });

  const [floor, setFloor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      inspection_date: dateOfInspection,
      calibrated_by: calibratedBy,
      verified_by: verifiedBy,
      rows: rows.filter((r) => !r.excluded).map((r) => ({
        identification_no: r.identificationNo,
        capacity_kg: r.capacityKg ? Number(r.capacityKg) : null,
        location: r.location,
        standard_weight_used: r.standardWeightUsed ? Number(r.standardWeightUsed) : null,
        reading1: r.reading1 ? Number(r.reading1) : null,
        reading2: r.reading2 ? Number(r.reading2) : null,
        reading3: r.reading3 ? Number(r.reading3) : null,
        reading4: r.reading4 ? Number(r.reading4) : null,
        reading5: r.reading5 ? Number(r.reading5) : null,
        deviation: r.deviation,
        corrective_action: r.correctiveAction,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await docsApi.create("weighingscalecalibration", payload);
        setSuccess(true);
        router.push("/documentations/weighingscalecalibration");
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
      setSubmitting(false);
    }
  };

  const toggleExclude = (id: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, excluded: !r.excluded } : r)));
  };

  const updateRow = (id: number, field: keyof CalibrationRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        let next = field === "reading1"
          ? { ...r, reading1: value, reading2: value, reading3: value, reading4: value, reading5: value }
          : { ...r, [field]: value };
        if ((READINGS as string[]).includes(field)) {
          const vals = READINGS.map((rf) => parseFloat(next[rf] as string)).filter((v) => !isNaN(v));
          next = { ...next, deviation: vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3) : "" };
        }
        return next;
      })
    );
  };

  // Selecting a floor filters the rows AND auto-fills their Location with the floor.
  const onFloorChange = (f: string) => {
    setFloor(f);
    if (!f) return;
    setRows((prev) => prev.map((r) => (rowInFloor(r, f) && !r.excluded ? { ...r, location: f } : r)));
  };

  // Fill a whole column down from its first cell (first visible, non-excluded row).
  const fillColumn = (field: keyof CalibrationRow) => {
    setRows((prev) => {
      const vis = prev.filter((r) => rowInFloor(r, floor) && !r.excluded);
      if (vis.length === 0) return prev;
      const firstCell = String(vis[0][field] ?? "").trim();
      const firstFilled = vis.find((r) => String(r[field] ?? "").trim() !== "");
      const val = firstCell !== "" ? firstCell : firstFilled ? String(firstFilled[field]) : "";
      if (val === "") return prev;
      return prev.map((r) => {
        if (!(rowInFloor(r, floor) && !r.excluded)) return r;
        let next = { ...r, [field]: val } as CalibrationRow;
        if ((READINGS as string[]).includes(field as string)) {
          const vals = READINGS.map((rf) => parseFloat(next[rf] as string)).filter((v) => !isNaN(v));
          next = { ...next, deviation: vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3) : "" };
        }
        return next;
      });
    });
  };

  const fillAllBtn = (field: keyof CalibrationRow) => (
    <button
      type="button"
      onClick={() => fillColumn(field)}
      title="Fill this column down from the first value"
      className="mt-1 text-[9px] font-semibold bg-brand-50 hover:bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded whitespace-nowrap"
    >
      Fill All ↓
    </button>
  );

  const visibleRows = rows.filter((r) => rowInFloor(r, floor));

  const activeRows = rows.filter((r) => !r.excluded);
  const okCount = activeRows.filter((r) => getDeviationStatus(r) === "ok").length;
  const deviations = activeRows.filter((r) => getDeviationStatus(r) === "deviation").length;
  const empty = activeRows.filter((r) => getDeviationStatus(r) === "empty").length;
  const excludedCount = rows.length - activeRows.length;

  return (
    <div className="space-y-5">
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
        description={`${floor ? `${floor} · ` : ""}${visibleRows.filter((r) => !r.excluded).length} active${excludedCount ? ` · ${excludedCount} excluded` : ""}`}
        bleed
        actions={
          <div className="flex items-center gap-2">
            <select
              value={floor}
              onChange={(e) => onFloorChange(e.target.value)}
              className="input-base !py-1.5 !px-2 text-xs min-w-[160px]"
            >
              <option value="">All Floors</option>
              {Object.keys(FLOOR_RANGES).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </button>
          </div>
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
                <th className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-0.5"><span>Capacity (Kg)</span>{fillAllBtn("capacityKg")}</div>
                </th>
                <th className="px-2 py-2 text-center w-28 text-[11px] font-semibold uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-0.5"><span>Location</span>{fillAllBtn("location")}</div>
                </th>
                <th className="px-2 py-2 text-center w-24 text-[11px] font-semibold uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-0.5"><span>Std Weight</span>{fillAllBtn("standardWeightUsed")}</div>
                </th>
                {["1", "2", "3", "4", "5"].map((n) => (
                  <th key={n} className="px-2 py-2 text-center w-16 text-[11px] font-semibold text-blue-700 bg-blue-50/40">
                    <div className="flex flex-col items-center gap-0.5"><span>R {n}</span>{fillAllBtn(`reading${n}` as keyof CalibrationRow)}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center w-28 text-[11px] font-semibold text-warning-700 bg-warning-50/40">Deviation</th>
                <th className="px-2 py-2 text-center w-32 text-[11px] font-semibold text-danger-600 bg-danger-50/40">
                  <div className="flex flex-col items-center gap-0.5"><span>Corrective</span>{fillAllBtn("correctiveAction")}</div>
                </th>
                <th className="px-2 py-2 text-center w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {visibleRows.map((row, idx) => {
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
                      <div className="px-2 py-1 text-xs text-center font-semibold rounded border border-cream-300 select-none bg-cream-100/60 text-ink-600 min-w-[72px]">
                        {row.deviation || <span className="text-ink-300">—</span>}
                      </div>
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
        {success && <p className="text-green-600 text-sm">Record saved successfully!</p>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? "Saving…" : isEdit ? "Update Record" : "Submit Record"}
        </button>
      </div>
    </div>
  );
}

export default WeighingScaleCalibrationForm;
