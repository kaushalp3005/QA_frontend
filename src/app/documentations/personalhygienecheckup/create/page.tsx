"use client";
import { useState } from "react";
import { HeartPulse, Plus, X } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

type CheckValue = "✓" | "✕" | "";

interface HygieneRow {
  id: number;
  srNo: string;
  name: string;
  respiratory: CheckValue;
  skinDisease: CheckValue;
  wounds: CheckValue;
  earNoseThroat: CheckValue;
  gowning: CheckValue;
  handHygiene: CheckValue;
  nails: CheckValue;
  cleanShaven: CheckValue;
  hairPins: CheckValue;
  tobacco: CheckValue;
  employeeSign: string;
  correctiveAction: string;
}

const emptyRow = (): HygieneRow => ({
  id: Date.now() + Math.random(),
  srNo: "",
  name: "",
  respiratory: "",
  skinDisease: "",
  wounds: "",
  earNoseThroat: "",
  gowning: "",
  handHygiene: "",
  nails: "",
  cleanShaven: "",
  hairPins: "",
  tobacco: "",
  employeeSign: "",
  correctiveAction: "",
});

const CHECK_FIELDS: { field: keyof HygieneRow; label: string; group: string; tone: "danger" | "info" | "success" }[] = [
  { field: "respiratory", label: "Respiratory/Fever/GI", group: "Injury/Infectious Diseases", tone: "danger" },
  { field: "skinDisease", label: "Skin Disease/Burned Skin", group: "Injury/Infectious Diseases", tone: "danger" },
  { field: "wounds", label: "Wounds/Cuts (No Bandage)", group: "Injury/Infectious Diseases", tone: "danger" },
  { field: "earNoseThroat", label: "Ear, Nose & Throat Infection", group: "Injury/Infectious Diseases", tone: "danger" },
  { field: "gowning", label: "Gowning: Apron, Gloves, Footwear, Mask", group: "Personal Cleanliness", tone: "info" },
  { field: "handHygiene", label: "Hand Hygiene", group: "Personal Cleanliness", tone: "info" },
  { field: "nails", label: "Nails Trimmed / No Nail Paint", group: "Personal Cleanliness", tone: "info" },
  { field: "cleanShaven", label: "Clean Shaven / Trim Hairs (Male)", group: "Personal Cleanliness", tone: "info" },
  { field: "hairPins", label: "Hair/Nose/Ear Pins, Rings, Bangles, Mehandi", group: "Personal Belongings", tone: "success" },
  { field: "tobacco", label: "Cigarettes, Tobacco, Pan Masala, Chewing Gums", group: "Personal Belongings", tone: "success" },
];

const GROUPS: { name: string; tone: "danger" | "info" | "success"; span: number }[] = [
  { name: "Injury/Infectious Diseases", tone: "danger", span: 4 },
  { name: "Personal Cleanliness", tone: "info", span: 4 },
  { name: "Personal Belongings", tone: "success", span: 2 },
];

const groupHeaderClass = (tone: "danger" | "info" | "success") =>
  tone === "danger"
    ? "text-danger-600 bg-danger-50/70"
    : tone === "info"
    ? "text-blue-700 bg-blue-50/70"
    : "text-success-700 bg-success-50/70";

const cellTintClass = (tone: "danger" | "info" | "success") =>
  tone === "danger"
    ? "bg-danger-50/30"
    : tone === "info"
    ? "bg-blue-50/30"
    : "bg-success-50/30";

export default function PersonalHygieneHealthCheckup() {
  const [date, setDate] = useState("");
  const [area, setArea] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [observation, setObservation] = useState("");
  const [rows, setRows] = useState<HygieneRow[]>(Array.from({ length: 10 }, emptyRow));

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: number, field: keyof HygieneRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const markRowAllOK = (id: number) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const patch: Partial<HygieneRow> = {};
      CHECK_FIELDS.forEach(({ field }) => { (patch[field] as CheckValue) = "✓"; });
      return { ...r, ...patch };
    }));
  };

  const CheckCell = ({ id, field, value, tone }: { id: number; field: keyof HygieneRow; value: string; tone: "danger" | "info" | "success" }) => {
    const ok = value === "✓";
    return (
      <label className={`flex items-center justify-center cursor-pointer py-1 rounded ${cellTintClass(tone)}`}>
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => updateRow(id, field, e.target.checked ? "✓" : "✕")}
          className="h-4 w-4 accent-brand-500 cursor-pointer"
        />
      </label>
    );
  };

  const failCount = (field: keyof HygieneRow) => rows.filter((r) => r[field] === "✕").length;

  return (
    <DocFormShell
      title="Personal Hygiene & Health Checkup"
      docNo="CFPLA.C7.F.39"
      subtitle="Frequency: Daily"
      icon={HeartPulse}
      width="full"
    >
      <DocSection title="Period & Area">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Area</label>
            <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="input-base" placeholder="Enter area" />
          </div>
        </div>
      </DocSection>

      {CHECK_FIELDS.some(({ field }) => failCount(field) > 0) && (
        <div className="surface-card p-3">
          <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wider mb-2">Failed Checks</p>
          <div className="flex flex-wrap gap-1.5">
            {CHECK_FIELDS.map(({ field, label }) => {
              const fails = failCount(field);
              return fails > 0 ? (
                <span key={field} className="text-[11px] font-semibold bg-danger-50 text-danger-600 px-2 py-0.5 rounded-full">
                  ✕ {label}: {fails}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      <DocSection
        title="Hygiene Roster"
        description={`${rows.length} employees`}
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
                <th rowSpan={2} className="px-2 py-2 text-center w-32 text-[11px] font-semibold uppercase text-ink-400">Name</th>
                {GROUPS.map((g) => (
                  <th key={g.name} colSpan={g.span} className={`px-2 py-2 text-center text-[11px] font-bold ${groupHeaderClass(g.tone)}`}>
                    {g.name}
                  </th>
                ))}
                <th rowSpan={2} className="px-2 py-2 text-center w-20 text-[11px] font-semibold uppercase text-ink-400">Sign</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-36 text-[11px] font-semibold uppercase text-ink-400">Corrective Action</th>
                <th rowSpan={2} className="px-2 py-2 text-center w-14 text-[11px] font-semibold uppercase text-ink-400"></th>
              </tr>
              <tr className="border-b border-cream-300">
                {CHECK_FIELDS.map(({ field, label, tone }) => (
                  <th key={field} className={`px-1 py-1.5 text-center w-20 text-[10px] font-semibold leading-tight ${groupHeaderClass(tone)}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((row, idx) => {
                const hasIssue = CHECK_FIELDS.some(({ field }) => row[field] === "✕");
                return (
                  <tr key={row.id} className={hasIssue ? "bg-danger-50/30" : "hover:bg-cream-100/60"}>
                    <td className="px-2 py-1 text-center text-ink-400 font-medium">{idx + 1}</td>
                    <td className="px-1 py-1">
                      <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} placeholder="Employee name" className="input-base !py-1 !px-2 text-xs" />
                    </td>
                    {CHECK_FIELDS.map(({ field, tone }) => (
                      <td key={field} className="px-0.5 py-0.5">
                        <CheckCell id={row.id} field={field} value={row[field] as string} tone={tone} />
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <input type="text" value={row.employeeSign} onChange={(e) => updateRow(row.id, "employeeSign", e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.correctiveAction}
                        onChange={(e) => updateRow(row.id, "correctiveAction", e.target.value)}
                        disabled={!hasIssue}
                        placeholder={hasIssue ? "Describe action…" : "—"}
                        className="input-base !py-1 !px-2 text-xs disabled:bg-cream-200/60 disabled:text-ink-300"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => markRowAllOK(row.id)}
                          className="text-[9px] font-semibold bg-success-50 text-success-700 px-1.5 py-0.5 rounded hover:bg-success-100 whitespace-nowrap"
                          title="Mark all checks ✓"
                        >
                          All ✓
                        </button>
                        <button
                          onClick={() => removeRow(row.id)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                          title="Remove row"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-cream-100/60">
                <td colSpan={2} className="px-3 py-2 font-bold text-xs text-ink-500">Observation</td>
                <td colSpan={10} className="px-1 py-1">
                  <input
                    type="text"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="input-base !py-1 !px-2 text-xs"
                    placeholder="Overall observation notes…"
                  />
                </td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="Approvals">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Checked By</label>
            <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Verified By</label>
            <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="input-base" />
          </div>
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
