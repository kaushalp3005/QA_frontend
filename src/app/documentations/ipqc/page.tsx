"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ipqc, dropdown as dropdownApi } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { printRecord } from "@/lib/printRecord";
import { IPQCRecord, DropdownData, Session } from "@/types";
import {
  Plus, SlidersHorizontal, Search, Printer, Eye, Trash2,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, X, Building2
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
  const [floor, setFloor] = useState("");
  const [factoriesData, setFactoriesData] = useState<DropdownData>({ factories: [] });
  const [loading, setLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSessionState(s);
    dropdownApi.getFactoriesFloors().then(setFactoriesData).catch(() => {});
  }, [router]);

  const selectedFactory = factoriesData.factories?.find((f) => f.factory_code === factoryCode);
  const availableFloors = selectedFactory?.floors || [];

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ipqc.list({
        page, per_page: 20,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        factory_code: factoryCode || undefined,
        floor: floor || undefined,
      });
      setRecords(res.records);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, fromDate, toDate, factoryCode, floor]);

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
  const hasFilters = !!(search || fromDate || toDate || factoryCode || floor);

  function clearFilters() {
    setSearch(""); setFromDate(""); setToDate(""); setFactoryCode(""); setFloor(""); setPage(1);
  }

  return (
    <div className="min-h-[100dvh] bg-cream-100">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {/* ── Page Header ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-sage-800">IPQC Records</h1>
            {!loading && (
              <p className="text-xs text-sage-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={() => router.push("/documentations/ipqc/new")}
            className="flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        </div>

        {/* ── Search + Filter Toggle ───────────────────── */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search IPQC No..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full border border-tan-100 bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm text-sage-800 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              filtersOpen || hasFilters
                ? "bg-sage-500 border-sage-500 text-white"
                : "bg-white border-tan-100 text-sage-600 hover:border-sage-300"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && !filtersOpen && (
              <span className="w-2 h-2 rounded-full bg-white/80 inline-block" />
            )}
          </button>
        </div>

        {/* ── Filter Panel ────────────────────────────── */}
        {filtersOpen && (
          <div className="bg-white border border-tan-100 rounded-2xl p-4 mb-4 shadow-sm animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-sage-600 mb-1.5">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                  className="w-full border border-tan-100 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-sage-600 mb-1.5">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                  className="w-full border border-tan-100 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-sage-600 mb-1.5">Factory</label>
                <select
                  value={factoryCode}
                  onChange={(e) => { setFactoryCode(e.target.value); setFloor(""); setPage(1); }}
                  className="w-full border border-tan-100 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                >
                  <option value="">All</option>
                  {factoriesData.factories?.map((f) => (
                    <option key={f.factory_code} value={f.factory_code}>{f.factory_code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-sage-600 mb-1.5">Floor</label>
                <select
                  value={floor}
                  onChange={(e) => { setFloor(e.target.value); setPage(1); }}
                  disabled={!factoryCode}
                  className="w-full border border-tan-100 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 disabled:opacity-40"
                >
                  <option value="">All</option>
                  {availableFloors.map((fl) => (
                    <option key={fl.id} value={fl.floor_name}>{fl.floor_name}</option>
                  ))}
                </select>
              </div>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700 font-medium"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── Records List ─────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-sage-400">
            <svg className="w-6 h-6 animate-spin text-sage-400" fill="none" viewBox="0 0 24 24">
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
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-sage-400 underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2.5">
              {records.map((record) => (
                <div
                  key={record.ipqc_no}
                  className="bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden active:bg-cream-100 transition-colors"
                  onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                >
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-sage-800 text-sm leading-snug">{record.ipqc_no}</span>
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
                    <div className="flex items-center gap-3 text-xs text-sage-500">
                      <span>{record.check_date}</span>
                      <span className="w-1 h-1 rounded-full bg-sage-300 inline-block" />
                      <span>{record.factory_code} / {record.floor}</span>
                    </div>
                  </div>
                  <div className="flex border-t border-tan-100 divide-x divide-tan-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-sage-600 hover:bg-beige-50 active:bg-beige-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button
                      onClick={() => handlePrint(record.ipqc_no)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-sage-600 hover:bg-beige-50 active:bg-beige-100 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(record.ipqc_no)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-danger-600 hover:bg-danger-50 active:bg-danger-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-beige-50 border-b border-tan-100">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">IPQC No.</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">Factory / Floor</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-sage-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tan-100">
                  {records.map((record) => (
                    <tr key={record.ipqc_no} className="hover:bg-cream-100 transition-colors group">
                      <td
                        className="px-5 py-3.5 text-sm font-semibold text-sage-700 cursor-pointer group-hover:text-sage-500"
                        onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                      >
                        {record.ipqc_no}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-sage-600">{record.check_date}</td>
                      <td className="px-5 py-3.5 text-sm text-sage-600">{record.factory_code} / {record.floor}</td>
                      <td className="px-5 py-3.5">
                        {record.approved_by ? (
                          <span className="inline-flex items-center gap-1 bg-success-100 text-success-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-warning-100 text-warning-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-sage-50 text-sage-700 rounded-lg text-xs font-medium hover:bg-sage-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => handlePrint(record.ipqc_no)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-beige-50 text-sage-600 rounded-lg text-xs font-medium hover:bg-beige-100 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(record.ipqc_no)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-danger-50 text-danger-600 rounded-lg text-xs font-medium hover:bg-danger-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
