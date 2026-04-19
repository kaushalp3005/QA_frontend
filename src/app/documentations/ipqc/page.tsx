"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ipqc } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { printRecord } from "@/lib/printRecord";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { IPQCRecord, Session } from "@/types";
import {
  Plus, Search, Printer, Eye, Trash2, Pencil,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Building2,
  ClipboardCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Loader";


export default function IPQCListPage() {

  const router = useRouter();
  const [records, setRecords] = useState<IPQCRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [warehouse, setWarehouse] = useState(() => getStoredWarehouse());
  const [loading, setLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSessionState(s);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.warehouse) setWarehouse(detail.warehouse);
    };
    window.addEventListener('warehouseChanged', handler);
    return () => window.removeEventListener('warehouseChanged', handler);
  }, [router]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ipqc.list({
        page, per_page: 20,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        warehouse,
      });
      setRecords(res.records);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, fromDate, toDate, warehouse]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ipqc.delete(deleteTarget, warehouse);
      setDeleteTarget(null);
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePrint(ipqcNo: string) {
    try {
      const fullRecord = await ipqc.get(ipqcNo, warehouse);
      printRecord(fullRecord as any);
    } catch (err: any) { alert("Failed to load record: " + err.message); }
  }

  const isAdmin = session?.username === 'pooja.parkar@candorfoods.in';

  return (
    <div className="min-h-[100dvh]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">

        <PageHeader
          title="IPQC Records"
          subtitle="In-Process Quality Control inspection records"
          icon={ClipboardCheck}
          badge={
            !loading ? (
              <span className="text-[11px] font-semibold text-ink-400 bg-cream-200 px-2 py-0.5 rounded-full">
                {total}
              </span>
            ) : null
          }
          actions={
            
            <button
              onClick={() => router.push("/documentations/ipqc/new")}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New IPQC
            </button>
          }
        />

        {/* ── Filters ─────────────────────────────────── */}
        <div className="surface-card p-4 mb-5 animate-fade-in-up">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search records..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-base pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-400 font-semibold whitespace-nowrap">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="input-base"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-400 font-semibold whitespace-nowrap">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="input-base"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-brand-50 border border-brand-100 rounded-lg text-sm font-semibold text-brand-700">
              <Building2 className="w-4 h-4" /> {warehouse}
            </span>
          </div>
        </div>

        {/* ── Records ─────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size={32} className="text-brand-500" />
            <span className="text-sm text-ink-400 font-medium">Loading records…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="surface-card flex flex-col items-center justify-center py-16 gap-3 animate-fade-in-up">
            <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-ink-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-500">No records found</p>
              <p className="text-xs text-ink-400 mt-0.5">Try adjusting your filters or create a new IPQC record.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-3">
              {records.map((record, idx) => {
                const articles = record.articles?.length ? record.articles : [{
                  item_description: record.item_description,
                  customer: record.customer,
                  batch_number: record.batch_number,
                  verdict: record.verdict,
                }];
                return (
                  <div
                    key={record.ipqc_no}
                    className="surface-card overflow-hidden animate-fade-in-up cursor-pointer hover:shadow-lift hover:-translate-y-0.5 transition-all"
                    style={{ animationDelay: `${idx * 30}ms` }}
                    onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-brand-500 text-sm tabular-nums">{record.ipqc_no}</span>
                        {record.approved_by ? (
                          <span className="inline-flex items-center gap-1 bg-success-50 text-success-700 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-warning-50 text-warning-700 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-400 font-medium mb-2 tabular-nums">
                        {record.check_date} · {warehouse}
                      </p>
                      <div className="space-y-1">
                        {articles.slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-ink-500 flex-wrap">
                            <span className="font-semibold text-ink-600">{a.item_description || "—"}</span>
                            {a.customer && <><span className="text-ink-300">|</span><span>{a.customer}</span></>}
                            {a.batch_number && <><span className="text-ink-300">|</span><span className="font-mono">{a.batch_number}</span></>}
                            {a.verdict && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${a.verdict === "accept" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                                {a.verdict}
                              </span>
                            )}
                          </div>
                        ))}
                        {articles.length > 3 && <p className="text-xs text-ink-300 font-medium">+{articles.length - 3} more</p>}
                      </div>
                    </div>
                    <div className="flex border-t border-cream-300 divide-x divide-cream-300" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-ink-500 hover:bg-cream-100 hover:text-brand-500 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button onClick={() => handlePrint(record.ipqc_no)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-ink-500 hover:bg-cream-100 hover:text-brand-500 transition-colors">
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                      {isAdmin && (
                        <button onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-ink-500 hover:bg-cream-100 hover:text-brand-500 transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(record.ipqc_no)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-danger-600 hover:bg-danger-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block surface-card overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-cream-100 border-b border-cream-300">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">IPQC No.</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Articles</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Warehouse</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Approved By</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-300">
                    {records.map((record) => {
                      const articles = record.articles?.length ? record.articles : [{
                        item_description: record.item_description,
                        customer: record.customer,
                        batch_number: record.batch_number,
                        verdict: record.verdict,
                      }];
                      return (
                        <tr key={record.ipqc_no} className="hover:bg-cream-100/50 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button
                              onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                              className="text-sm font-bold text-brand-500 hover:text-brand-600 hover:underline tabular-nums"
                            >
                              {record.ipqc_no}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-ink-500 whitespace-nowrap tabular-nums">{record.check_date}</td>
                          <td className="px-5 py-3.5">
                            <div className="space-y-1">
                              {articles.map((a: any, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 text-sm text-ink-600 flex-wrap">
                                  <span className="font-semibold">{a.item_description || "—"}</span>
                                  {a.customer && <><span className="text-ink-300">|</span><span className="text-ink-400">{a.customer}</span></>}
                                  {a.batch_number && <><span className="text-ink-300">|</span><span className="text-ink-400 font-mono">{a.batch_number}</span></>}
                                  {a.verdict && (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.verdict === "accept" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                                      {a.verdict}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-ink-500 whitespace-nowrap font-medium">{warehouse}</td>
                          <td className="px-5 py-3.5 text-sm text-ink-400 whitespace-nowrap">
                            {record.approved_by ? (
                              <span className="inline-flex items-center gap-1 bg-success-50 text-success-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> {record.approved_by}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-warning-50 text-warning-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-0.5 justify-end">
                              <button
                                onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                                className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePrint(record.ipqc_no)}
                                className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors"
                                title="Print"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                                  className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteTarget(record.ipqc_no)}
                                className="p-1.5 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Pagination ───────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-ink-400 font-medium">
              Page <span className="font-bold text-ink-600">{page}</span> of <span className="font-bold text-ink-600">{totalPages}</span> · {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-outline px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-outline px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Delete Confirmation Modal ─────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-700/40 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white border border-cream-300 shadow-lift p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-danger-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <p className="text-base font-bold text-ink-600">Delete Record</p>
                <p className="text-xs text-ink-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-ink-500">
              Are you sure you want to delete <span className="font-bold text-ink-600 font-mono">{deleteTarget}</span>?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 btn-outline justify-center disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-danger-600 hover:bg-danger-700 text-white text-sm font-semibold shadow-soft disabled:opacity-50"
              >
                {deleting ? (
                  <><Spinner size={16} className="text-white" /> Deleting…</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
