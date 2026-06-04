"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
import { docsApi } from "@/lib/api/documentations";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS, type SignatureOption } from "@/lib/signatures";

const AREA_OPTIONS = [
  "First Floor",
  "Lower Basement",
  "Upper Basement",
  "First Floor Mezzanine",
  "Second Floor",
  "Service Floor",
];

type CellStatus = "✓" | "✕" | "";

function normalizeCell(v: unknown): CellStatus {
  if (v === "✓" || v === "✕") return v;
  return "";
}

function CompactSignSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SignatureOption[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[10px] px-1 py-0.5 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
      title={value || "Select"}
    >
      <option value="">—</option>
      {options
        .filter((o) => o.name !== "Other")
        .map((o) => (
          <option key={o.name} value={o.name}>{o.name}</option>
        ))}
    </select>
  );
}

export default function EditDailyCleaningChecklist() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [recordTitle, setRecordTitle] = useState("");
  const [recordDocNo, setRecordDocNo] = useState("");

  // Form fields
  const [month, setMonth] = useState("");
  const [area, setArea] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [parameters, setParameters] = useState<string[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<number, CellStatus>>>({});
  const [checkedByPerDay, setCheckedByPerDay] = useState<Record<number, string>>({});
  const [verifiedByPerDay, setVerifiedByPerDay] = useState<Record<number, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  useEffect(() => {
    docsApi
      .get("dailycleaningchecklist", id)
      .then((res) => {
        const data = res.data;
        setRecordTitle(data.title || "Daily Cleaning Checklist");
        setRecordDocNo(data.document_no || "CFPLA.C4.F.54");
        setMonth(data.month || "");
        setArea(data.area || "");
        setObservations(data.observations || "");
        setCorrectiveAction(data.corrective_action || "");

        const rawGrid: Record<string, Record<string | number, unknown>> = data.grid || {};
        const paramKeys = Object.keys(rawGrid);
        setParameters(paramKeys);

        const parsedGrid: Record<string, Record<number, CellStatus>> = {};
        paramKeys.forEach((p) => {
          parsedGrid[p] = {};
          for (let d = 1; d <= 31; d++) {
            parsedGrid[p][d] = normalizeCell(rawGrid[p]?.[d] ?? rawGrid[p]?.[String(d)]);
          }
        });
        setGrid(parsedGrid);

        const cbRaw: Record<string | number, unknown> = data.checked_by_per_day || {};
        const vbRaw: Record<string | number, unknown> = data.verified_by_per_day || {};
        const cbParsed: Record<number, string> = {};
        const vbParsed: Record<number, string> = {};
        for (let d = 1; d <= 31; d++) {
          cbParsed[d] = String(cbRaw[d] ?? cbRaw[String(d)] ?? "");
          vbParsed[d] = String(vbRaw[d] ?? vbRaw[String(d)] ?? "");
        }
        setCheckedByPerDay(cbParsed);
        setVerifiedByPerDay(vbParsed);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleCell = (param: string, day: number) => {
    setGrid((prev) => {
      const current = prev[param]?.[day] || "";
      const next: CellStatus = current === "✓" ? "" : "✓";
      return { ...prev, [param]: { ...prev[param], [day]: next } };
    });
  };

  const markCellFail = (param: string, day: number) => {
    setGrid((prev) => {
      const current = prev[param]?.[day] || "";
      const next: CellStatus = current === "✕" ? "" : "✕";
      return { ...prev, [param]: { ...prev[param], [day]: next } };
    });
  };

  const markAllOKForDay = (day: number) => {
    setGrid((prev) => {
      const next = { ...prev };
      parameters.forEach((p) => { next[p] = { ...next[p], [day]: "✓" }; });
      return next;
    });
  };

  const clearAllForDay = (day: number) => {
    setGrid((prev) => {
      const next = { ...prev };
      parameters.forEach((p) => { next[p] = { ...next[p], [day]: "" }; });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitOk(false);
    setSubmitting(true);
    try {
      await docsApi.update("dailycleaningchecklist", id, {
        area,
        observations,
        corrective_action: correctiveAction,
        grid,
        checked_by_per_day: checkedByPerDay,
        verified_by_per_day: verifiedByPerDay,
      });
      setSubmitOk(true);
      router.push(`/documentations/dailycleaningchecklist/${id}`);
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to update record");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-ink-400">Loading record…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-danger-600 font-semibold">Record not found.</p>
      </div>
    );
  }

  return (
    <DocFormShell
      title={`Edit: ${recordTitle}`}
      docNo={recordDocNo}
      subtitle="Daily Cleaning Checklist — Edit Mode"
      icon={Sparkles}
      width="full"
    >
      {/* Header Fields */}
      <DocSection title="Record Info" description="Month is read-only; area and notes can be updated.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Month</label>
            <input
              type="month"
              value={month}
              readOnly
              className="input-base bg-cream-200/60 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="label-base">Area (Floor Name)</label>
            <select
              value={AREA_OPTIONS.includes(area) ? area : area === "" ? "" : "__other__"}
              onChange={(e) => {
                if (e.target.value === "__other__") setArea("");
                else setArea(e.target.value);
              }}
              className="input-base"
            >
              <option value="">Select area…</option>
              {AREA_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="__other__">Other…</option>
            </select>
            {!AREA_OPTIONS.includes(area) && (
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="input-base mt-1"
                placeholder="Type area name…"
              />
            )}
          </div>
        </div>
        <p className="text-[11px] text-ink-400 italic mt-3">
          <strong>Click</strong> a cell to toggle <span className="text-success-600 font-bold">✓</span> on/off.
          <strong> Right-click</strong> to mark <span className="text-danger-600 font-bold">✕</span>.
          Use the column <span className="bg-success-50 text-success-700 px-1 rounded">✓</span> button to fill all parameters for that day.
        </p>
      </DocSection>

      {/* Daily Status Grid */}
      {parameters.length > 0 && (
        <DocSection
          title="Daily Status Grid"
          description={`${parameters.length} parameters × 31 days`}
          bleed
        >
          <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all days</p>
          <div className="overflow-x-auto">
            <table className="text-[10px]">
              <thead className="bg-cream-100/70 border-b border-cream-300">
                <tr>
                  <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 min-w-[160px] text-left text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                    Parameter
                  </th>
                  {Array.from({ length: 31 }, (_, i) => (
                    <th key={i + 1} className="px-1 py-2 text-center min-w-[24px] text-[11px] font-semibold text-ink-400">
                      {i + 1}
                    </th>
                  ))}
                </tr>
                <tr className="border-t border-cream-300">
                  <th className="px-2 py-1 sticky left-0 bg-cream-100 z-10 text-[9px] text-ink-400 text-left">All ✓ ↓</th>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <th key={day} className="px-0.5 py-0.5 text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          <button
                            onClick={() => markAllOKForDay(day)}
                            className="text-[9px] bg-success-50 text-success-700 px-1 rounded hover:bg-success-100"
                            title={`Mark all ✓ for day ${day}`}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => clearAllForDay(day)}
                            className="text-[9px] bg-cream-100 text-ink-400 px-1 rounded hover:bg-danger-50 hover:text-danger-500"
                            title={`Clear all for day ${day}`}
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {parameters.map((param) => (
                  <tr key={param} className="hover:bg-cream-100/60">
                    <td className="px-2 py-1 sticky left-0 bg-cream-50 z-10 font-semibold whitespace-nowrap text-xs text-ink-500">
                      {param}
                    </td>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const val = grid[param]?.[day] || "";
                      return (
                        <td
                          key={day}
                          className={`px-0.5 py-0.5 text-center cursor-pointer select-none font-bold border-l border-cream-300 ${
                            val === "✓"
                              ? "bg-success-50 text-success-700"
                              : val === "✕"
                              ? "bg-danger-50 text-danger-600"
                              : ""
                          }`}
                          onClick={() => toggleCell(param, day)}
                          onContextMenu={(e) => { e.preventDefault(); markCellFail(param, day); }}
                          title="Click ✓ · Right-click ✕"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Checked By row */}
                <tr className="bg-brand-50/30">
                  <td className="px-2 py-1 sticky left-0 bg-brand-50 z-10 font-bold whitespace-nowrap text-[11px] text-brand-700 uppercase tracking-wider">
                    Checked By
                  </td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <td key={day} className="px-0.5 py-0.5 border-l border-cream-300 align-middle">
                        <CompactSignSelect
                          value={checkedByPerDay[day] || ""}
                          onChange={(v) => setCheckedByPerDay((prev) => ({ ...prev, [day]: v }))}
                          options={CHECKED_BY_OPTIONS}
                        />
                      </td>
                    );
                  })}
                </tr>

                {/* Verified By row */}
                <tr className="bg-brand-50/30">
                  <td className="px-2 py-1 sticky left-0 bg-brand-50 z-10 font-bold whitespace-nowrap text-[11px] text-brand-700 uppercase tracking-wider">
                    Verified By
                  </td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <td key={day} className="px-0.5 py-0.5 border-l border-cream-300 align-middle">
                        <CompactSignSelect
                          value={verifiedByPerDay[day] || ""}
                          onChange={(v) => setVerifiedByPerDay((prev) => ({ ...prev, [day]: v }))}
                          options={QC_VERIFIED_BY_OPTIONS}
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-400 italic px-4 pt-3 pb-2">
            Per-day <strong>Checked By</strong> and <strong>Verified By</strong> resolve to signature images on print.
          </p>
        </DocSection>
      )}

      {/* Notes & Corrective Action */}
      <DocSection title="Notes & Corrective Action">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">Corrective Action</label>
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              rows={3}
              className="input-base"
            />
          </div>
        </div>
      </DocSection>

      {/* Footer */}
      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {submitError && (
            <span className="text-xs text-danger-600 font-semibold">{submitError}</span>
          )}
          {submitOk && (
            <span className="text-xs text-success-600 font-semibold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </DocFormShell>
  );
}
