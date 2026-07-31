"use client";

// CFPLB.C5.F.11 — In-Process Quality Check Record, After processing (A185 only).
// One sheet per date; each row is a product/batch with the moisture & salt
// readings taken at the pre-heater and again at the puffer/oven.

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import {
  CHECKED_BY_OPTIONS,
  QC_VERIFIED_BY_OPTIONS,
  filterSignaturesByWarehouse,
  type SignatureOption,
} from "@/lib/signatures";

const BLANK_ROWS = 6; // the printed format has six blank lines

export interface AfterProcessingRow {
  id: number;
  productName: string;
  batchNo: string;
  customer: string;
  rmMoisture: string;
  salinity: string;
  preheaterMoisture: string;
  preheaterSalt: string;
  pufferMoisture: string;
  pufferSalt: string;
  checkedBy: string;
  verifiedBy: string;
}

/**
 * Placeholder for a measurement that wasn't taken. The six reading columns start
 * at "-" so an unmeasured cell prints as a dash rather than an empty box; the
 * operator overwrites it with a figure where a reading exists. Product/Batch/
 * Customer stay blank (they identify the row, and Submit requires one of them),
 * and Checked/Verified By are dropdowns with no "-" option.
 */
const NOT_MEASURED = "-";

/** A stored reading for display: null/undefined/blank all read back as the dash. */
const reading = (v: unknown): string =>
  v === null || v === undefined || String(v).trim() === "" ? NOT_MEASURED : String(v);

const emptyRow = (id: number): AfterProcessingRow => ({
  id,
  productName: "",
  batchNo: "",
  customer: "",
  rmMoisture: NOT_MEASURED,
  salinity: NOT_MEASURED,
  preheaterMoisture: NOT_MEASURED,
  preheaterSalt: NOT_MEASURED,
  pufferMoisture: NOT_MEASURED,
  pufferSalt: NOT_MEASURED,
  checkedBy: "",
  verifiedBy: "",
});

/** Per-row signatory dropdown, filtered to the active plant, with free-text fallback. */
function RowSignSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SignatureOption[];
}) {
  const visible = filterSignaturesByWarehouse(options, getStoredWarehouse()).filter(
    (o) => o.name !== "Other",
  );
  const isOther = value !== "" && !visible.some((o) => o.name === value);
  const [other, setOther] = useState(isOther);

  return (
    <div className="space-y-1">
      <select
        value={isOther || other ? "Other" : value}
        onChange={(e) => {
          if (e.target.value === "Other") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
        className="input-base !py-1 !px-1.5 text-xs min-w-[110px]"
        title={value || "Select"}
      >
        <option value="">—</option>
        {visible.map((o) => (
          <option key={o.name} value={o.name}>
            {o.name}
          </option>
        ))}
        <option value="Other">Other…</option>
      </select>
      {(other || isOther) && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type name"
          className="input-base !py-1 !px-1.5 text-xs min-w-[110px]"
        />
      )}
    </div>
  );
}

interface Props {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export default function InprocessQCAfterProcessingForm({ initialData, onSubmit, isEdit }: Props = {}) {
  const [date, setDate] = useState(initialData?.check_date || "");
  const [rows, setRows] = useState<AfterProcessingRow[]>(() => {
    if (Array.isArray(initialData?.rows) && initialData.rows.length) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        productName: r.product_name || "",
        batchNo: r.batch_no || "",
        customer: r.customer || "",
        // A reading saved as null/blank shows the same dash a fresh row starts with.
        rmMoisture: reading(r.rm_moisture),
        salinity: reading(r.salinity),
        preheaterMoisture: reading(r.preheater_moisture),
        preheaterSalt: reading(r.preheater_salt),
        pufferMoisture: reading(r.puffer_moisture),
        pufferSalt: reading(r.puffer_salt),
        checkedBy: r.checked_by || "",
        verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: BLANK_ROWS }, (_, i) => emptyRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((p) => [...p, emptyRow(Math.max(0, ...p.map((r) => r.id)) + 1)]);
  const removeRow = (id: number) =>
    setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const upd = (id: number, f: keyof AfterProcessingRow, v: string) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    const filled = rows.filter((r) => r.productName || r.batchNo);
    if (!date) {
      alert("Please enter the date for this sheet.");
      return;
    }
    if (filled.length === 0) {
      alert("Add at least one row with a product name or batch number.");
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse(),
      check_date: date,
      rows: filled.map((r) => ({
        product_name: r.productName,
        batch_no: r.batchNo,
        customer: r.customer,
        rm_moisture: r.rmMoisture,
        salinity: r.salinity,
        preheater_moisture: r.preheaterMoisture,
        preheater_salt: r.preheaterSalt,
        puffer_moisture: r.pufferMoisture,
        puffer_salt: r.pufferSalt,
        checked_by: r.checkedBy,
        verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("inprocess-qc-after-processing", payload);
        setSuccess(true);
        setDate("");
        setRows(Array.from({ length: BLANK_ROWS }, (_, i) => emptyRow(i + 1)));
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const numCell = (r: AfterProcessingRow, f: keyof AfterProcessingRow) => (
    <input
      type="text"
      inputMode="decimal"
      value={r[f] as string}
      onChange={(e) => upd(r.id, f, e.target.value)}
      className="input-base !py-1 !px-2 text-xs w-16 text-center"
    />
  );

  return (
    <div className="space-y-5">
      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Date</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-base sm:max-w-xs"
        />
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">After-Processing Checks</h2>
          <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Row
          </button>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">
          ← Swipe to view all columns
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {[
                  "Name of Product",
                  "Batch No",
                  "Customer",
                  "RM Moisture (%)",
                  "Salinity (%)",
                ].map((h) => (
                  <th
                    key={h}
                    rowSpan={2}
                    className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 align-bottom"
                  >
                    {h}
                  </th>
                ))}
                <th
                  colSpan={2}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400 border-l border-cream-300"
                >
                  Pre-heater
                </th>
                <th
                  colSpan={2}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400 border-l border-cream-300"
                >
                  Puffer / Oven
                </th>
                {["Checked By", "Verified By", ""].map((h, i) => (
                  <th
                    key={h || `sp-${i}`}
                    rowSpan={2}
                    className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 align-bottom border-l border-cream-300"
                  >
                    {h}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="px-2 pb-2 text-center text-[10px] font-semibold text-ink-400 border-l border-cream-300">
                  Moisture (%)
                </th>
                <th className="px-2 pb-2 text-center text-[10px] font-semibold text-ink-400">
                  Salt (%)
                </th>
                <th className="px-2 pb-2 text-center text-[10px] font-semibold text-ink-400 border-l border-cream-300">
                  Moisture (%)
                </th>
                <th className="px-2 pb-2 text-center text-[10px] font-semibold text-ink-400">
                  Salt (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={r.productName}
                      onChange={(e) => upd(r.id, "productName", e.target.value)}
                      className="input-base !py-1 !px-2 text-xs min-w-[140px]"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={r.batchNo}
                      onChange={(e) => upd(r.id, "batchNo", e.target.value)}
                      className="input-base !py-1 !px-2 text-xs w-24"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={r.customer}
                      onChange={(e) => upd(r.id, "customer", e.target.value)}
                      className="input-base !py-1 !px-2 text-xs min-w-[120px]"
                    />
                  </td>
                  <td className="px-1 py-1">{numCell(r, "rmMoisture")}</td>
                  <td className="px-1 py-1">{numCell(r, "salinity")}</td>
                  <td className="px-1 py-1 border-l border-cream-300">
                    {numCell(r, "preheaterMoisture")}
                  </td>
                  <td className="px-1 py-1">{numCell(r, "preheaterSalt")}</td>
                  <td className="px-1 py-1 border-l border-cream-300">
                    {numCell(r, "pufferMoisture")}
                  </td>
                  <td className="px-1 py-1">{numCell(r, "pufferSalt")}</td>
                  <td className="px-1 py-1 border-l border-cream-300">
                    <RowSignSelect
                      value={r.checkedBy}
                      onChange={(v) => upd(r.id, "checkedBy", v)}
                      options={CHECKED_BY_OPTIONS}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <RowSignSelect
                      value={r.verifiedBy}
                      onChange={(v) => upd(r.id, "verifiedBy", v)}
                      options={QC_VERIFIED_BY_OPTIONS}
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      onClick={() => removeRow(r.id)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                      title="Remove row"
                      aria-label="Remove row"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Blank rows are dropped on save — only rows with a product name or batch number are stored.
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
