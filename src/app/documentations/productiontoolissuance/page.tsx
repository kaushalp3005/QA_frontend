"use client";
import { useState } from "react";

const TOOLS = ["SIEVES", "SCOOPS", "Scissors", "SS BOWLS", "SS GLASS", "HAND MAGNET", "Gloves"];
const PARAMETERS = ["Quantity Issued", "Condition at issuance", "Quantity Received", "Condition when Received", "Cleaning up Starting of production + after each product Change"];

interface EntryBlock {
  id: number;
  date: string;
  data: Record<string, Record<string, string>>;
  remark: string;
  checkedBy: string;
  verifiedBy: string;
}

const createBlock = (id: number): EntryBlock => ({
  id, date: "", remark: "", checkedBy: "", verifiedBy: "",
  data: Object.fromEntries(PARAMETERS.map((p) => [p, Object.fromEntries(TOOLS.map((t) => [t, ""]))])),
});

export default function ProductionToolsIssuanceRecord() {
  const [blocks, setBlocks] = useState<EntryBlock[]>([createBlock(1)]);

  const addBlock = () => setBlocks((prev) => [...prev, createBlock(prev.length + 1)]);

  const updateField = (blockId: number, field: keyof EntryBlock, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)));
  };

  const updateData = (blockId: number, param: string, tool: string, value: string) => {
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, data: { ...b.data, [param]: { ...b.data[param], [tool]: value } } } : b));
  };

  const removeBlock = (blockId: number) => {
    if (blocks.length > 1) setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
      <div className="border border-gray-300 mb-4">
        <div className="p-2 font-bold text-center border-b border-gray-300">CANDOR FOODS PRIVATE LIMITED</div>
        <div className="p-2 text-sm font-semibold text-center border-b border-gray-300">Format: Production Tools Issuance and Integrity Check Record</div>
        <div className="p-2 text-sm text-center">Document No: CFPLA.C4.F.22 | Issue No: 03 | Rev Date: 01/10/2025 | Rev No: 02</div>
      </div>

      <p className="text-xs text-gray-600 mb-4 italic">Frequency: At the start and end of the day</p>

      {blocks.map((block) => (
        <div key={block.id} className="mb-6 border border-gray-300 rounded p-3">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div>
              <label className="text-sm font-medium mr-2">Date:</label>
              <input type="date" value={block.date} onChange={(e) => updateField(block.id, "date", e.target.value)} className="border rounded px-2 py-2 text-sm" />
            </div>
            {blocks.length > 1 && (
              <button onClick={() => removeBlock(block.id)} className="text-red-500 hover:text-red-700 text-sm px-3 py-1.5 border border-red-200 rounded">✕ Remove</button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">Parameters</th>
                  {TOOLS.map((t) => (
                    <th key={t} className="border border-gray-300 px-2 py-1 text-center">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARAMETERS.map((param) => (
                  <tr key={param} className="hover:bg-blue-50">
                    <td className="border border-gray-300 px-2 py-1 font-medium text-xs">{param}</td>
                    {TOOLS.map((tool) => (
                      <td key={tool} className="border border-gray-300 px-1 py-1">
                        <input
                          type="text"
                          value={block.data[param]?.[tool] || ""}
                          onChange={(e) => updateData(block.id, param, tool, e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-sm text-center"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-2 mb-1 italic sm:hidden">← Swipe to view all columns</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="text-xs font-medium">Remark</label>
              <input type="text" value={block.remark} onChange={(e) => updateField(block.id, "remark", e.target.value)} className="border rounded px-2 py-1 w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Checked by (Production)</label>
              <input type="text" value={block.checkedBy} onChange={(e) => updateField(block.id, "checkedBy", e.target.value)} className="border rounded px-2 py-1 w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Verified by (QC)</label>
              <input type="text" value={block.verifiedBy} onChange={(e) => updateField(block.id, "verifiedBy", e.target.value)} className="border rounded px-2 py-1 w-full text-sm" />
            </div>
          </div>
        </div>
      ))}

      <button onClick={addBlock} className="bg-green-600 text-white px-4 py-2.5 rounded text-sm hover:bg-green-700 w-full sm:w-auto">+ Add Entry Block</button>
      <div className="mt-2 text-xs text-gray-500">Prepared By: FST | Verified By: FSTL</div>
      <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
    </div>
  );
}
