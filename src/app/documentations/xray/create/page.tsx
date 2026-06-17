"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, ArrowLeft, AlertCircle, Plus, Trash2, CheckCircle2,
  Loader2, Building2, Pencil, X, Printer, Save, Copy,
} from "lucide-react";
import { cn, buttonStyles, layoutStyles } from "@/lib/styles";
import {
  createXRayBatch, getXRayRecord, getXRayRecords,
  updateXRayEntry, deleteXRayEntry,
  XRAY_HEADER, type XRayEntry, type XRayEntryInput,
} from "@/lib/api/xray";
import Time12Picker from "@/components/Time12Picker";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";

/** The new-row form holds everything except the date, which is fixed per sheet. */
type RowForm = Omit<XRayEntryInput, "date">;

const EMPTY = (carry?: Partial<RowForm>): RowForm => ({
  time: new Date().toTimeString().slice(0, 5),
  product_name: "",
  batch_no: "",
  ss316: true,
  ceramic: true,
  soda_lime_glass: true,
  action_on_xray: "NO",
  action_on_product_passed: "NO",
  calibrated_monitored_by: carry?.calibrated_monitored_by ?? "",
  verified_by: carry?.verified_by ?? "",
  remarks: "",
});

function fmt12(time24: string) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${p}`;
}

const today = () => new Date().toISOString().split("T")[0];

export default function XRayFillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheetIdParam = searchParams.get("id");

  const [sheetDate, setSheetDate] = useState<string>(today());
  const [recordId, setRecordId] = useState<number | null>(null);
  const [savedRows, setSavedRows] = useState<XRayEntry[]>([]);

  const [form, setForm] = useState<RowForm>(EMPTY());
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loadingSheet, setLoadingSheet] = useState(true);
  const [busy, setBusy] = useState(false);          // add / save in flight
  const [rowBusyId, setRowBusyId] = useState<number | null>(null); // delete in flight
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null); // briefly flag a jumped-to row

  const set = (field: keyof RowForm, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  // ── Load the sheet for a given date (or empty if none exists yet) ───────────
  const loadSheetForDate = async (date: string) => {
    setLoadingSheet(true);
    setError(null);
    try {
      const list = await getXRayRecords();
      const match = list.find((r) => r.check_date === date);
      if (match) {
        const full = await getXRayRecord(match.id);
        setRecordId(full.id);
        setSavedRows(full.entries || []);
      } else {
        setRecordId(null);
        setSavedRows([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the sheet");
    } finally {
      setLoadingSheet(false);
    }
  };

  // On mount: continue a specific sheet (?id=) or open today's sheet.
  useEffect(() => {
    (async () => {
      if (sheetIdParam) {
        setLoadingSheet(true);
        try {
          const full = await getXRayRecord(sheetIdParam);
          setSheetDate(full.check_date || today());
          setRecordId(full.id);
          setSavedRows(full.entries || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load the sheet");
        } finally {
          setLoadingSheet(false);
        }
      } else {
        await loadSheetForDate(today());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetIdParam]);

  const onDateChange = async (date: string) => {
    setSheetDate(date);
    cancelEdit();
    await loadSheetForDate(date);
  };

  const validate = (): string | null => {
    if (!form.product_name.trim() || !form.batch_no.trim())
      return "Product Name and Batch No are required.";
    if (!form.calibrated_monitored_by || !form.verified_by)
      return "Checked By and Verified By are required.";
    return null;
  };

  // ── Add a row → save to DB immediately ──────────────────────────────────────
  const addRow = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setBusy(true);
    try {
      const sheet = await createXRayBatch({
        check_date: sheetDate,
        entries: [{ ...form, date: sheetDate }],
      });
      setRecordId(sheet.id);
      setSavedRows(sheet.entries || []);
      // Carry the sign-offs to the next row (same sheet, usually same staff).
      setForm(EMPTY({
        calibrated_monitored_by: form.calibrated_monitored_by,
        verified_by: form.verified_by,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save row");
    } finally {
      setBusy(false);
    }
  };

  // ── Jump to a row from the Items sidebar, with a brief highlight ─────────────
  const scrollToRow = (id: number) => {
    document.getElementById(`xray-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1500);
  };

  // ── Recreate: copy a row's values into the New Row form, ready to tweak & add ─
  const recreateRow = (row: XRayEntry) => {
    setEditingId(null);
    setError(null);
    setForm({
      time: row.time,
      product_name: row.product_name,
      batch_no: row.batch_no,
      ss316: row.ss316,
      ceramic: row.ceramic,
      soda_lime_glass: row.soda_lime_glass,
      action_on_xray: row.action_on_xray,
      action_on_product_passed: row.action_on_product_passed,
      calibrated_monitored_by: row.calibrated_monitored_by,
      verified_by: row.verified_by,
      remarks: row.remarks,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Edit an existing row ─────────────────────────────────────────────────────
  const startEdit = (row: XRayEntry) => {
    setEditingId(row.id);
    setError(null);
    setForm({
      time: row.time,
      product_name: row.product_name,
      batch_no: row.batch_no,
      ss316: row.ss316,
      ceramic: row.ceramic,
      soda_lime_glass: row.soda_lime_glass,
      action_on_xray: row.action_on_xray,
      action_on_product_passed: row.action_on_product_passed,
      calibrated_monitored_by: row.calibrated_monitored_by,
      verified_by: row.verified_by,
      remarks: row.remarks,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY({
      calibrated_monitored_by: form.calibrated_monitored_by,
      verified_by: form.verified_by,
    }));
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setBusy(true);
    try {
      const updated = await updateXRayEntry(editingId, { ...form, date: sheetDate });
      setSavedRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setBusy(false);
    }
  };

  // ── Delete a row → remove from DB immediately ────────────────────────────────
  const deleteRow = async (id: number) => {
    if (!confirm("Delete this row from the database?")) return;
    setRowBusyId(id);
    try {
      const { sheet_deleted } = await deleteXRayEntry(id);
      setSavedRows((prev) => prev.filter((r) => r.id !== id));
      if (sheet_deleted) setRecordId(null);
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete row");
    } finally {
      setRowBusyId(null);
    }
  };

  const partialSubmit = () => router.push("/documentations/xray");
  const finalSubmit = () => {
    if (recordId) router.push(`/documentations/xray/print?id=${recordId}`);
    else router.push("/documentations/xray");
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm";
  const isEditing = editingId != null;

  const fmtDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return day ? `${day}/${m}/${y}` : d;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className={layoutStyles.container}>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => router.push("/documentations/xray")} className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2")}>
                <ArrowLeft size={16} />
                Back
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">X-Ray Detection Check Record</h1>
                <p className="text-xs text-gray-500 mt-0.5">{XRAY_HEADER.ccp} · Document: {XRAY_HEADER.documentNo}</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {savedRows.length} row{savedRows.length === 1 ? "" : "s"} saved
            </span>
          </div>
        </div>
      </div>

      <div className={cn(layoutStyles.container, "py-6")}>
        <div className="flex gap-6 items-start max-w-6xl mx-auto">

          {/* ── Left Items sidebar (jump-to-row + Recreate) ───────────────── */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-20 self-start">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Items</p>
              {savedRows.length === 0 ? (
                <p className="text-[11px] text-gray-400 px-1 py-2">No rows yet.</p>
              ) : (
                <ol className="space-y-0.5">
                  {savedRows.map((r, idx) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => scrollToRow(r.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 transition-colors group text-left"
                      >
                        <span className="w-5 h-5 rounded-md bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700 shrink-0 group-hover:bg-brand-200">
                          {idx + 1}
                        </span>
                        <span className="text-gray-600 truncate group-hover:text-brand-700 leading-tight">
                          {r.product_name || `Row ${idx + 1}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => recreateRow(r)}
                        title="Duplicate this row into the form, ready to tweak & add"
                        className="ml-7 mb-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Recreate
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>

          {/* ── Main column ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

          {/* Sheet date + fixed machine header */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sheet (one per day · fixed machine)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-brand-50 rounded-md px-3 py-2 border border-brand-100">
                <label className="block text-[11px] text-brand-700 mb-1">Sheet Date</label>
                <input
                  type="date"
                  value={sheetDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full bg-white px-2 py-1 border border-brand-200 rounded text-sm font-semibold text-gray-900"
                />
              </div>
              {[["Machine Details", XRAY_HEADER.machineDetails], ["Machine ID", XRAY_HEADER.machineId], ["Location", XRAY_HEADER.location]].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-md px-3 py-2">
                  <p className="text-[11px] text-gray-500">{k}</p>
                  <p className="font-semibold text-gray-900">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Rows are saved to the database the moment you add them. All rows for <strong>{fmtDate(sheetDate)}</strong> go onto this one sheet.
            </p>
          </div>

          {/* New / edit row form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className={cn("px-6 py-4 border-b border-gray-200", isEditing ? "bg-amber-50" : "bg-gray-50")}>
              <h2 className="text-lg font-bold text-gray-900">{isEditing ? "Edit Row" : "New Row"}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditing
                  ? "Update the fields, then Save Changes — the row is updated in the database."
                  : <>Fill the hourly check, tap <strong>Add Row</strong> to save it, repeat. Finish with <strong>Final Submit</strong>.</>}
              </p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="px-6 py-6 space-y-7">
              {/* Batch Info */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-500 rounded-full inline-block" /> Batch Info
                </h3>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <Time12Picker value={form.time} onChange={(v) => set("time", v)} />
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs text-gray-400">Date for this row: <strong className="text-gray-600">{fmtDate(sheetDate)}</strong> (set above)</p>
                  </div>
                </div>
                <div className={cn(layoutStyles.grid2, "mt-4")}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="e.g. Frozen Peas 500g" value={form.product_name} onChange={(e) => set("product_name", e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch No <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="e.g. B240401" value={form.batch_no} onChange={(e) => set("batch_no", e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Sensitivity Checks */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-500 rounded-full inline-block" /> Sensitivity Checks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["ss316", "ceramic", "soda_lime_glass"] as const).map((field) => {
                    const labels = { ss316: "SS 316", ceramic: "Ceramic", soda_lime_glass: "Soda Lime Glass" };
                    return (
                      <div
                        key={field}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-all",
                          form[field] ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-300"
                        )}
                        onClick={() => set(field, !form[field])}
                        role="checkbox"
                        aria-checked={form[field]}
                        tabIndex={0}
                      >
                        <div className={cn("flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 transition-all", form[field] ? "bg-brand-500 border-brand-500" : "border-gray-300")}>
                          {form[field] && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{labels[field]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corrective Action */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" /> Corrective Action (if X-Ray not working)
                </h3>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action Taken on X-Ray</label>
                    <input type="text" className={inputCls} value={form.action_on_xray} onChange={(e) => set("action_on_xray", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action on Product Passed</label>
                    <input type="text" className={inputCls} value={form.action_on_product_passed} onChange={(e) => set("action_on_product_passed", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sign-offs */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-500 rounded-full inline-block" /> Sign-offs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SignaturePicker
                    label="Checked By (Calibrated / Monitored By)"
                    value={form.calibrated_monitored_by}
                    onChange={(v) => set("calibrated_monitored_by", v)}
                    options={CHECKED_BY_OPTIONS}
                    roleHint="Quality Control Executive"
                    required
                    inputCls={inputCls}
                    labelCls="block text-sm font-medium text-gray-700 mb-1.5"
                  />
                  <SignaturePicker
                    label="Verified By"
                    value={form.verified_by}
                    onChange={(v) => set("verified_by", v)}
                    options={QC_VERIFIED_BY_OPTIONS}
                    roleHint="Quality Manager"
                    required
                    inputCls={inputCls}
                    labelCls="block text-sm font-medium text-gray-700 mb-1.5"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-brand-500 rounded-full inline-block" /> Remarks
                </h3>
                <textarea className={inputCls} placeholder="Any additional observations" rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} style={{ resize: "vertical" }} />
              </div>

              {/* Add / Save buttons */}
              <div className="pt-2 flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button type="button" onClick={saveEdit} disabled={busy} className={cn(buttonStyles.base, "gap-2 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50")}>
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                    </button>
                    <button type="button" onClick={cancelEdit} disabled={busy} className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2")}>
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={addRow} disabled={busy} className={cn(buttonStyles.base, "gap-2 bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50")}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add Row
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Saved rows (live from DB) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Rows on this sheet ({savedRows.length})</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 size={13} /> Saved to database
              </span>
            </div>

            {loadingSheet ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sheet…
              </div>
            ) : savedRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No rows yet for {fmtDate(sheetDate)}. Add your first row above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sensitivity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Checked / Verified</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {savedRows.map((r, idx) => (
                      <tr id={`xray-row-${r.id}`} key={r.id} className={cn("transition-colors hover:bg-gray-50", editingId === r.id && "bg-amber-50", highlightId === r.id && "bg-emerald-50 ring-2 ring-inset ring-emerald-300")}>
                        <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmt12(r.time)}</td>
                        <td className="px-3 py-2 text-gray-900 font-medium">{r.product_name}</td>
                        <td className="px-3 py-2 text-gray-700">{r.batch_no}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {[["SS316", r.ss316], ["Ceramic", r.ceramic], ["Soda Lime", r.soda_lime_glass]].map(([label, ok]) => (
                              <span key={String(label)} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${ok ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                {ok && <Check className="w-2.5 h-2.5" />} {String(label)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{r.calibrated_monitored_by} / {r.verified_by}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button onClick={() => recreateRow(r)} disabled={busy || rowBusyId === r.id} title="Duplicate this row into the form, ready to tweak & add" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-40">
                              <Copy size={13} /> Recreate
                            </button>
                            <button onClick={() => startEdit(r)} disabled={busy || rowBusyId === r.id} className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 disabled:opacity-40">
                              <Pencil size={13} /> Edit
                            </button>
                            <button onClick={() => deleteRow(r.id)} disabled={rowBusyId === r.id} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-40">
                              {rowBusyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Submit bar */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-500">
                Every row is already saved. Use <strong>Partial Submit</strong> to pause (continue later from the list) or <strong>Final Submit</strong> to finish & print.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={partialSubmit}
                  className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2 justify-center")}
                >
                  Partial Submit
                </button>
                <button
                  type="button"
                  onClick={finalSubmit}
                  disabled={savedRows.length === 0}
                  className={cn(buttonStyles.base, "gap-2 bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 justify-center")}
                >
                  <Printer size={16} /> Final Submit
                </button>
              </div>
            </div>
          </div>

          </div>{/* end main column */}
        </div>{/* end flex sidebar + main */}
      </div>
    </div>
  );
}
