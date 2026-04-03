"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ipqc, dropdown as dropdownApi } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { printRecord } from "@/lib/printRecord";
import { IPQCRecord, DropdownData, Session } from "@/types";
import {
  Plus, Search, Printer, Eye, Trash2, Pencil,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Building2
} from "lucide-react";

export default function IPQCListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<IPQCRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [factoryCode, setFactoryCode] = useState("");
  const [factoriesData, setFactoriesData] = useState<DropdownData>({ factories: [] });
  const [loading, setLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSessionState(s);
    dropdownApi.getFactoriesFloors().then(setFactoriesData).catch(() => {});
  }, [router]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ipqc.list({
        page, per_page: 20,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        factory_code: factoryCode || undefined,
      });
      setRecords(res.records);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, fromDate, toDate, factoryCode]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function handleDelete(ipqcNo: string) {
    if (!confirm(`Delete ${ipqcNo}?`)) return;
    try {
      await ipqc.delete(ipqcNo);
      fetchRecords();
    } catch (err: any) { alert(err.message); }
  }

  async function handlePrint(ipqcNo: string) {
    try {
      const fullRecord = await ipqc.get(ipqcNo);
      printRecord(fullRecord as any);
    } catch (err: any) { alert("Failed to load record: " + err.message); }
  }

  const isAdmin = session?.isAdmin;

  return (
    <div className="min-h-[100dvh] bg-cream-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {/* ── Page Header ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-sage-800">IPQC Records</h1>
          <button
            onClick={() => router.push("/documentations/ipqc/new")}
            className="flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            + New IPQC
          </button>
        </div>

        {/* ── Filters ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-tan-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search records..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full border border-tan-100 bg-cream-50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-sage-800 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 transition"
              />
            </div>
            {/* From */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-sage-500 font-medium whitespace-nowrap">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="border border-tan-100 bg-cream-50 rounded-xl px-3 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 transition"
              />
            </div>
            {/* To */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-sage-500 font-medium whitespace-nowrap">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="border border-tan-100 bg-cream-50 rounded-xl px-3 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 transition"
              />
            </div>
            {/* Factory */}
            <select
              value={factoryCode}
              onChange={(e) => { setFactoryCode(e.target.value); setPage(1); }}
              className="border border-tan-100 bg-cream-50 rounded-xl px-3 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 transition"
            >
              <option value="">All Factories</option>
              {factoriesData.factories?.map((f) => (
                <option key={f.factory_code} value={f.factory_code}>{f.factory_code}</option>
              ))}
            </select>
            {/* Record count */}
            {!loading && (
              <span className="ml-auto text-xs text-sage-500 font-medium whitespace-nowrap">
                {total} record{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Records ─────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-sage-400">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading records…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-beige-50 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-sage-300" />
            </div>
            <p className="text-sm text-sage-500 font-medium">No records found</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2.5">
              {records.map((record) => {
                const articles = record.articles?.length ? record.articles : [{
                  item_description: record.item_description,
                  customer: record.customer,
                  batch_number: record.batch_number,
                  verdict: record.verdict,
                }];
                return (
                  <div
                    key={record.ipqc_no}
                    className="bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden"
                    onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-sage-700 text-sm">{record.ipqc_no}</span>
                        {record.approved_by ? (
                          <span className="inline-flex items-center gap-1 bg-success-100 text-success-700 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sage-500 mb-2">{record.check_date} &nbsp;·&nbsp; {record.factory_code} / {record.floor}</p>
                      <div className="space-y-1">
                        {articles.slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-sage-600 flex-wrap">
                            <span className="font-medium">{a.item_description || "—"}</span>
                            {a.customer && <><span className="text-sage-300">|</span><span>{a.customer}</span></>}
                            {a.batch_number && <><span className="text-sage-300">|</span><span>{a.batch_number}</span></>}
                            {a.verdict && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${a.verdict === "accept" ? "bg-success-100 text-success-700" : "bg-danger-100 text-danger-700"}`}>
                                {a.verdict}
                              </span>
                            )}
                          </div>
                        ))}
                        {articles.length > 3 && <p className="text-xs text-sage-400">+{articles.length - 3} more</p>}
                      </div>
                    </div>
                    <div className="flex border-t border-tan-100 divide-x divide-tan-100" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-sage-600 hover:bg-beige-50 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button onClick={() => handlePrint(record.ipqc_no)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-sage-600 hover:bg-beige-50 transition-colors">
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                      <button onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-sage-600 hover:bg-beige-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(record.ipqc_no)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-danger-600 hover:bg-danger-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-beige-50 border-b border-tan-100">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide whitespace-nowrap">IPQC No.</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">Articles</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide whitespace-nowrap">Factory</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide whitespace-nowrap">Approved By</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tan-100">
                  {records.map((record) => {
                    const articles = record.articles?.length ? record.articles : [{
                      item_description: record.item_description,
                      customer: record.customer,
                      batch_number: record.batch_number,
                      verdict: record.verdict,
                    }];
                    return (
                      <tr key={record.ipqc_no} className="hover:bg-cream-100 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {record.ipqc_no}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-sage-600 whitespace-nowrap">{record.check_date}</td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            {articles.map((a: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-sm text-sage-700 flex-wrap">
                                <span className="font-medium">{a.item_description || "—"}</span>
                                {a.customer && <><span className="text-sage-300">|</span><span className="text-sage-500">{a.customer}</span></>}
                                {a.batch_number && <><span className="text-sage-300">|</span><span className="text-sage-500">{a.batch_number}</span></>}
                                {a.verdict && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.verdict === "accept" ? "bg-success-100 text-success-700" : "bg-danger-100 text-danger-700"}`}>
                                    {a.verdict}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-sage-600 whitespace-nowrap">{record.factory_code} / {record.floor}</td>
                        <td className="px-4 py-3.5 text-sm text-sage-500 whitespace-nowrap">
                          {record.approved_by || "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handlePrint(record.ipqc_no)}
                              className="px-3 py-1.5 text-xs font-semibold text-sage-600 hover:text-sage-800 hover:underline transition-colors"
                            >
                              Print
                            </button>
                            <button
                              onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                              className="px-3 py-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                            >
                              Edit
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(record.ipqc_no)}
                                className="px-3 py-1.5 text-xs font-semibold text-danger-600 hover:text-danger-800 hover:underline transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Pagination ───────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-sage-500">
              Page {page} of {totalPages} &nbsp;·&nbsp; {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3.5 py-2 border border-tan-100 bg-white rounded-xl text-sm text-sage-600 font-medium hover:bg-beige-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3.5 py-2 border border-tan-100 bg-white rounded-xl text-sm text-sage-600 font-medium hover:bg-beige-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
