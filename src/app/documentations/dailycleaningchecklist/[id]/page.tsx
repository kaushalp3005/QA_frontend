"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Printer, Trash2, Loader2, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { docsApi, isDocAdmin } from "@/lib/api/documentations";
import { normalizeDCC, DCC_DAYS, type NormalizedDCC } from "@/lib/dailyCleaning";

const DAY_LIST = Array.from({ length: DCC_DAYS }, (_, i) => i + 1);

export default function ViewDailyCleaningChecklist() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const admin = isDocAdmin();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<NormalizedDCC | null>(null);
  const [prevId, setPrevId] = useState<number | null>(null);
  const [nextId, setNextId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    docsApi
      .get("dailycleaningchecklist", id)
      .then((res) => {
        setData(normalizeDCC(res.data));
        setPrevId(res.data._prev_id ?? null);
        setNextId(res.data._next_id ?? null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await docsApi.delete("dailycleaningchecklist", id);
      router.push("/documentations/dailycleaningchecklist");
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-ink-400">Loading record…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !data) {
    return (
      <DashboardLayout>
        <p className="text-center py-20 text-sm text-danger-600 font-semibold">Record not found.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/documentations/dailycleaningchecklist")}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-cream-50 border border-cream-300 text-ink-500 hover:text-brand-500 hover:border-brand-500 shadow-soft transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-brand">
              <Sparkles className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-ink-600 tracking-tight leading-tight truncate">{data.title}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold px-2 py-0.5">{data.documentNo}</span>
                <span className="text-xs text-ink-400 font-medium">Record #{id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevId && router.push(`/documentations/dailycleaningchecklist/${prevId}`)}
              disabled={!prevId}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-cream-300 text-ink-500 hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous record"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => nextId && router.push(`/documentations/dailycleaningchecklist/${nextId}`)}
              disabled={!nextId}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-cream-300 text-ink-500 hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next record"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
            <button onClick={() => router.push(`/documentations/dailycleaningchecklist/${id}/edit`)} className="btn-primary inline-flex items-center gap-1.5 ml-1">
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button onClick={() => router.push(`/documentations/dailycleaningchecklist/print?id=${id}`)} className="btn-outline inline-flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </button>
            {admin && (
              <button onClick={handleDelete} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Month */}
        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Month</span>
          <p className="text-sm text-ink-700 font-semibold mt-0.5">{data.month || "—"}</p>
        </div>

        {/* Floors */}
        {data.floors.map((floor, fi) => (
          <div key={fi} className="surface-card overflow-hidden">
            <div className="px-4 py-3 border-b border-cream-300 bg-cream-100/60 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink-600">
                Floor / Area {fi + 1}: <span className="text-brand-600">{floor.area || "—"}</span>
              </h2>
              <span className="text-[11px] text-ink-400">{data.parameters.length} parameters</span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-[10px]">
                <thead className="bg-cream-100/70 border-b border-cream-300">
                  <tr>
                    <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 min-w-[160px] text-left text-[11px] font-semibold uppercase text-ink-400">Parameter</th>
                    {DAY_LIST.map((d) => (
                      <th key={d} className="px-1 py-2 text-center min-w-[22px] text-[11px] font-semibold text-ink-400">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {data.parameters.map((param) => (
                    <tr key={param}>
                      <td className="px-2 py-1 sticky left-0 bg-cream-50 z-10 font-semibold whitespace-nowrap text-xs text-ink-500">{param}</td>
                      {DAY_LIST.map((day) => {
                        const val = floor.grid[param]?.[day] || "";
                        return (
                          <td
                            key={day}
                            className={`px-0.5 py-0.5 text-center font-bold border-l border-cream-300 ${
                              val === "✓" ? "bg-success-50 text-success-700" : val === "✕" ? "bg-danger-50 text-danger-600" : ""
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-brand-50/30">
                    <td className="px-2 py-1 sticky left-0 bg-brand-50 z-10 font-bold whitespace-nowrap text-[10px] text-brand-700 uppercase tracking-wider">Checked By</td>
                    {DAY_LIST.map((day) => (
                      <td key={day} className="px-0.5 py-1 text-center text-[9px] text-ink-500 border-l border-cream-300 align-middle leading-tight">{floor.checkedByPerDay[day] || ""}</td>
                    ))}
                  </tr>
                  <tr className="bg-brand-50/30">
                    <td className="px-2 py-1 sticky left-0 bg-brand-50 z-10 font-bold whitespace-nowrap text-[10px] text-brand-700 uppercase tracking-wider">Verified By</td>
                    {DAY_LIST.map((day) => (
                      <td key={day} className="px-0.5 py-1 text-center text-[9px] text-ink-500 border-l border-cream-300 align-middle leading-tight">{floor.verifiedByPerDay[day] || ""}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {(floor.observations || floor.correctiveAction) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border-t border-cream-300 bg-cream-100/30">
                <div>
                  <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Observations</span>
                  <p className="text-sm text-ink-600 mt-0.5 whitespace-pre-wrap">{floor.observations || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Corrective Action</span>
                  <p className="text-sm text-ink-600 mt-0.5 whitespace-pre-wrap">{floor.correctiveAction || "—"}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
