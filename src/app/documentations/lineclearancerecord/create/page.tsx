"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Plus, X } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

interface ChangeoverRow {
  id: number;
  date: string;
  productBeforeChangeover: string;
  batchNo: string;
  table: string;
  weighingUtensils: string;
  tools: string;
  weighingScale: string;
  sieves: string;
  changeOfGloves: string;
  noProductLeftOver: string;
  machineProperlyCleaned: string;
  checkedBy: string;
  verifiedBy: string;
}

const FLOORS = [
  "Lower Basement",
  "Upper Basement",
  "First Floor",
  "First Floor Mezz",
  "Second Floor",
  "Terrace Floor",
];

const emptyRow = (): ChangeoverRow => ({
  id: Date.now() + Math.random(),
  date: "",
  productBeforeChangeover: "",
  batchNo: "",
  table: "✓",
  weighingUtensils: "✓",
  tools: "✓",
  weighingScale: "✓",
  sieves: "✓",
  changeOfGloves: "✓",
  noProductLeftOver: "✓",
  machineProperlyCleaned: "✓",
  checkedBy: "",
  verifiedBy: "",
});

export default function ProductChangeoverLineClearance() {
  const router = useRouter();
  const [floorRows, setFloorRows] = useState<Record<string, ChangeoverRow[]>>(() =>
    Object.fromEntries(FLOORS.map((f) => [f, [emptyRow(), emptyRow(), emptyRow()]]))
  );
  const [activeFloor, setActiveFloor] = useState(FLOORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rows = floorRows[activeFloor];

  const addRow = () =>
    setFloorRows((prev) => ({ ...prev, [activeFloor]: [...prev[activeFloor], emptyRow()] }));

  const removeRow = (id: number) =>
    setFloorRows((prev) => ({
      ...prev,
      [activeFloor]: prev[activeFloor].filter((row) => row.id !== id),
    }));

  const updateRow = (id: number, field: keyof ChangeoverRow, value: string) => {
    setFloorRows((prev) => ({
      ...prev,
      [activeFloor]: prev[activeFloor].map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      ),
    }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const floorsWithData = FLOORS.filter((floor) =>
      floorRows[floor].some(
        (r) => r.date.trim() || r.productBeforeChangeover.trim() || r.batchNo.trim()
      )
    );
    if (floorsWithData.length === 0) {
      setSubmitError("Fill at least one row (date, product, or batch) before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(
        floorsWithData.map((floor) =>
          docsApi.create("lineclearancerecord", { warehouse: getStoredWarehouse() || null, area: floor, rows: floorRows[floor] })
        )
      );
      router.push("/documentations/lineclearancerecord");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit record");
    } finally {
      setSubmitting(false);
    }
  };

  const TickCell = ({ id, field, value }: { id: number; field: keyof ChangeoverRow; value: string }) => {
    const ok = value === "✓";
    return (
      <label
        className={`flex items-center justify-center cursor-pointer py-1 rounded ${
          ok ? "bg-success-50" : value === "✕" ? "bg-danger-50" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => updateRow(id, field, e.target.checked ? "✓" : "✕")}
          className="h-4 w-4 accent-brand-500 cursor-pointer"
        />
      </label>
    );
  };

  return (
    <DocFormShell
      title="Product Changeover Line Clearance"
      docNo="CFPLA.C5.F.44"
      subtitle="Issue 04 · Rev 03 · 01/10/2025"
      icon={GitBranch}
      width="full"
      note="Frequency: After every product change."
    >
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex flex-wrap gap-1">
          {FLOORS.map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setActiveFloor(floor)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                activeFloor === floor
                  ? "bg-brand-500 text-white shadow-soft"
                  : "text-ink-500 hover:bg-cream-200"
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      <DocSection
        title="Changeover Log"
        description={`${activeFloor} · ${rows.length} entries`}
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
                <th rowSpan={2} className="px-2 py-2 text-center w-8 text-[11px] font-semibold uppercase text-ink-400">#</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-24 text-[11px] font-semibold uppercase text-ink-400">Date</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-32 text-[11px] font-semibold uppercase text-ink-400">Product Before</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Batch No.</th>
                <th colSpan={6} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-brand-600 bg-brand-50">Cleaning & Sanitation</th>
                <th colSpan={2} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-success-700 bg-success-50">Hygiene Clearance</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Checked By</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Verified By</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-8"></th>
              </tr>
              <tr className="bg-cream-100/70 border-b border-cream-300">
                {["Table", "Weighing Utensils", "Tools", "Weighing Scale", "Sieves", "Change of Gloves"].map((h) => (
                  <th key={h} className="px-1 py-2 text-center text-[10px] font-semibold text-brand-600 bg-brand-50/60 w-16">{h}</th>
                ))}
                <th className="px-1 py-2 text-center text-[10px] font-semibold text-success-700 bg-success-50/60 w-20">No Product Leftover</th>
                <th className="px-1 py-2 text-center text-[10px] font-semibold text-success-700 bg-success-50/60 w-24">Machine Cleaned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-cream-100/60">
                  <td className="px-2 py-1.5 text-center text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-1 py-1.5">
                    <input type="date" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.productBeforeChangeover} onChange={(e) => updateRow(row.id, "productBeforeChangeover", e.target.value)} className="input-base !py-1 !px-2 text-xs" placeholder="Product name" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.batchNo} onChange={(e) => updateRow(row.id, "batchNo", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  {(["table", "weighingUtensils", "tools", "weighingScale", "sieves", "changeOfGloves"] as (keyof ChangeoverRow)[]).map((field) => (
                    <td key={field} className="px-1 py-1.5 text-center bg-brand-50/20">
                      <TickCell id={row.id} field={field} value={row[field] as string} />
                    </td>
                  ))}
                  {(["noProductLeftOver", "machineProperlyCleaned"] as (keyof ChangeoverRow)[]).map((field) => (
                    <td key={field} className="px-1 py-1.5 text-center bg-success-50/20">
                      <TickCell id={row.id} field={field} value={row[field] as string} />
                    </td>
                  ))}
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.checkedBy} onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.verifiedBy} onChange={(e) => updateRow(row.id, "verifiedBy", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => removeRow(row.id)}
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
        <div className="flex flex-col gap-1">
          <p className="text-xs text-ink-400">
            Prepared By: <span className="font-semibold text-ink-500">Production Supervisor</span>
            <span className="mx-2 text-cream-300">|</span>
            Approved By: <span className="font-semibold text-ink-500">FSTL</span>
          </p>
          {submitError && <p className="text-xs text-danger-600">{submitError}</p>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : "Submit Record"}
        </button>
      </div>
    </DocFormShell>
  );
}
