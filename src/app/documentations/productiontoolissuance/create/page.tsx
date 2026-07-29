"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wrench, Plus, X, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

const TOOLS = ["SIEVES", "SCOOPS", "Scissors/Knife", "SS BOWLS", "SS GLASS", "HAND MAGNET", "Gloves"];
const PARAMETERS = ["Quantity Issued", "Condition at issuance", "Quantity Received", "Condition when Received", "Cleaning up Starting of production + after each product Change"];

interface EntryBlock {
  id: number;
  date: string;
  data: Record<string, Record<string, string>>;
  remark: string;
  checkedBy: string;
  verifiedBy: string;
}

const currentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const defaultFor = (param: string): string => {
  if (param === "Condition at issuance" || param === "Condition when Received") return "OK";
  if (param === "Cleaning up Starting of production + after each product Change") return "✓";
  return "";
};

const createBlock = (id: number): EntryBlock => ({
  id, date: currentDate(), remark: "Ok", checkedBy: "", verifiedBy: "",
  data: Object.fromEntries(PARAMETERS.map((p) => [p, Object.fromEntries(TOOLS.map((t) => [t, defaultFor(p)]))])),
});

export default function ProductionToolsIssuanceRecord() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  const [blocks, setBlocks] = useState<EntryBlock[]>([createBlock(1)]);
  // Partial submit: the first save creates the record and keeps its id so more
  // entry blocks can be added/edited and saved again before finalizing.
  const [recordId, setRecordId] = useState<number | null>(null);
  const [saving, setSaving] = useState<false | "draft" | "final">(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(!!duplicateFrom);

  useEffect(() => {
    if (!duplicateFrom) return;
    setLoadingRecord(true);
    docsApi.get("productiontoolissuance", Number(duplicateFrom))
      .then((res) => {
        const d = res.data;
        const matrix = Array.isArray(d?.tool_matrix) && d.tool_matrix.length > 0
          ? d.tool_matrix
          : [{ date: d?.check_date, data: undefined, remark: d?.remark, checked_by: d?.checked_by, verified_by: d?.verified_by }];
        setBlocks(matrix.map((tm: any, i: number) => ({
          id: i + 1,
          date: tm.date || currentDate(),
          data: tm.data && Object.keys(tm.data).length > 0 ? tm.data : createBlock(i + 1).data,
          remark: tm.remark || "Ok",
          checkedBy: tm.checked_by || "",
          verifiedBy: tm.verified_by || "",
        })));
      })
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoadingRecord(false));
  }, [duplicateFrom]);

  const addBlock = () => setBlocks((prev) => [...prev, createBlock(prev.length + 1)]);

  const buildPayload = (status: "draft" | "submitted") => {
    const tool_matrix = blocks.map((b) => ({
      date: b.date,
      data: b.data,
      remark: b.remark,
      checked_by: b.checkedBy,
      verified_by: b.verifiedBy,
    }));
    return {
      check_date: blocks[0]?.date || currentDate(),
      warehouse: getStoredWarehouse() || null,
      remark: blocks[0]?.remark,
      checked_by: blocks[0]?.checkedBy,
      verified_by: blocks[0]?.verifiedBy,
      tool_matrix,
      status,
    };
  };

  // Create on first save, update afterwards. "draft" (Submit Partially) stays on
  // the page; "submitted" (Submit Record) finalizes and returns to the list.
  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(status === "draft" ? "draft" : "final");
    setMessage(null);
    try {
      const payload = buildPayload(status);
      if (recordId == null) {
        const res = await docsApi.create("productiontoolissuance", payload);
        const newId = res.data?.id as number | undefined;
        if (typeof newId === "number") setRecordId(newId);
      } else {
        await docsApi.update("productiontoolissuance", recordId, payload);
      }
      if (status === "submitted") {
        setMessage({ kind: "ok", text: "Record submitted." });
        setTimeout(() => router.push("/documentations/productiontoolissuance"), 800);
      } else {
        setMessage({ kind: "ok", text: "Draft saved." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save record";
      setMessage({ kind: "err", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (blockId: number, field: keyof EntryBlock, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)));
  };

  const updateData = (blockId: number, param: string, tool: string, value: string) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      return { ...b, data: { ...b.data, [param]: { ...b.data[param], [tool]: value } } };
    }));
  };

  const removeBlock = (blockId: number) => {
    if (blocks.length > 1) setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  if (loadingRecord) {
    return (
      <DocFormShell title="Production Tools Issuance" docNo="CFPLA.C4.F.22" icon={Wrench}>
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading record to duplicate…
        </div>
      </DocFormShell>
    );
  }

  return (
    <DocFormShell
      title="Production Tools Issuance"
      docNo="CFPLA.C4.F.22"
      subtitle="Issue 03 · Rev 02 · 01/10/2025"
      icon={Wrench}
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — adjust the fields as needed, then Submit to save as a new record.` : "Frequency: At the start and end of the day"}
    >
      {recordId != null && (
        <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50 text-xs text-warning-800 font-medium">
          Draft <span className="font-bold">#{recordId}</span> in progress. Use <strong>Submit Partially</strong> to save progress, or <strong>Submit Record</strong> to finalize.
        </div>
      )}

      {blocks.map((block, idx) => (
        <DocSection
          key={block.id}
          title={`Entry Block #${idx + 1}`}
          description={`Date: ${block.date || "—"}`}
          bleed
          actions={
            blocks.length > 1 ? (
              <button
                onClick={() => removeBlock(block.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-danger-600 hover:bg-danger-50 px-2.5 py-1.5 rounded-md border border-danger-200"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            ) : null
          }
        >
          <div className="p-4 sm:p-5 border-b border-cream-300">
            <label className="label-base">Date</label>
            <input
              type="date"
              value={block.date}
              onChange={(e) => updateField(block.id, "date", e.target.value)}
              className="input-base sm:w-auto"
            />
          </div>

          <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100/70 border-b border-cream-300">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase text-ink-400">Parameter</th>
                  {TOOLS.map((t) => (
                    <th key={t} className="px-2 py-2.5 text-center text-[11px] font-semibold tracking-wider uppercase text-ink-400">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {PARAMETERS.map((param) => (
                  <tr key={param} className="hover:bg-cream-100/60 transition-colors">
                    <td className="px-3 py-2 text-xs font-semibold text-ink-500">{param}</td>
                    {TOOLS.map((tool) => (
                      <td key={tool} className="px-1 py-1.5">
                        <input
                          type="text"
                          value={block.data[param]?.[tool] || ""}
                          onChange={(e) => updateData(block.id, param, tool, e.target.value)}
                          className="input-base !py-1.5 !px-2 text-center"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 border-t border-cream-300">
            <div>
              <label className="label-base">Remark</label>
              <input type="text" value={block.remark} onChange={(e) => updateField(block.id, "remark", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="label-base">Checked By (Production Supervisor)</label>
              <input
                type="text"
                value={block.checkedBy}
                onChange={(e) => updateField(block.id, "checkedBy", e.target.value)}
                className="input-base"
                placeholder="Production Supervisor name"
              />
            </div>
            <SignaturePicker
              label="Verified By (QC)"
              value={block.verifiedBy}
              onChange={(v) => updateField(block.id, "verifiedBy", v)}
              options={QC_VERIFIED_BY_OPTIONS}
              roleHint="Quality Manager"
              inputCls="input-base"
              labelCls="label-base"
            />
          </div>
        </DocSection>
      ))}

      <button onClick={addBlock} className="btn-outline w-full sm:w-auto">
        <Plus className="w-4 h-4 mr-1.5" /> Add Entry Block
      </button>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Verified By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          {message ? (
            <p className={`text-xs font-semibold ${message.kind === "ok" ? "text-success-600" : "text-danger-600"}`}>{message.text}</p>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving !== false}
              className="btn-outline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving === "draft" ? "Saving…" : "Submit Partially"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("submitted")}
              disabled={saving !== false}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving === "final" ? "Submitting…" : "Submit Record"}
            </button>
          </div>
        </div>
      </div>
    </DocFormShell>
  );
}
