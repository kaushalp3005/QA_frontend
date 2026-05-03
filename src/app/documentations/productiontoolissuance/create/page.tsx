"use client";
import { useState } from "react";
import { Wrench, Plus, X } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

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
  const [blocks, setBlocks] = useState<EntryBlock[]>([createBlock(1)]);

  const addBlock = () => setBlocks((prev) => [...prev, createBlock(prev.length + 1)]);

  const updateField = (blockId: number, field: keyof EntryBlock, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)));
  };

  const updateData = (blockId: number, param: string, tool: string, value: string) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      const nextData = { ...b.data, [param]: { ...b.data[param], [tool]: value } };
      if (param === "Quantity Issued") {
        nextData["Quantity Received"] = { ...nextData["Quantity Received"], [tool]: value };
      }
      return { ...b, data: nextData };
    }));
  };

  const removeBlock = (blockId: number) => {
    if (blocks.length > 1) setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  return (
    <DocFormShell
      title="Production Tools Issuance"
      docNo="CFPLA.C4.F.22"
      subtitle="Issue 03 · Rev 02 · 01/10/2025"
      icon={Wrench}
      note="Frequency: At the start and end of the day"
    >
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
              <label className="label-base">Checked By (Production)</label>
              <input type="text" value={block.checkedBy} onChange={(e) => updateField(block.id, "checkedBy", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="label-base">Verified By (QC)</label>
              <input type="text" value={block.verifiedBy} onChange={(e) => updateField(block.id, "verifiedBy", e.target.value)} className="input-base" />
            </div>
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
        <button className="btn-primary">Submit Record</button>
      </div>
    </DocFormShell>
  );
}
