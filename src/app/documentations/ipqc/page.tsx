"use client";
import { useState, useEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ipqc } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { printRecord } from "@/lib/printRecord";
import WarehouseSelector, { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { IPQCRecord, Session } from "@/types";
import {
  Plus, Search, Printer, Eye, Trash2, Pencil,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Building2,
  ClipboardCheck, Copy, Layers, X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Loader";
import { format12 } from "@/components/Time12Picker";


/**
 * Records are always ordered by the date on the record, newest first — not by
 * when the row happened to be created. Editing a record's date to today is
 * meant to move it to the top of the list, which ordering by created_at never
 * did. Inside one date the server falls back to check_time (nulls last, so
 * records predating that column sit below the timed ones) and then to id.
 */
const ORDER = { sort_by: "check_date", sort_order: "desc" } as const;

export default function IPQCListPage() {

  const router = useRouter();
  const [records, setRecords] = useState<IPQCRecord[]>([]);
  const [allRecords, setAllRecords] = useState<IPQCRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // 50 a page, matching every other documentation record list.
  const PER_PAGE = 50;
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [warehouse, setWarehouse] = useState(() => getStoredWarehouse());
  const [showOldData, setShowOldData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Floating articles popover (collapses the long per-row article list to one chip)
  const [artPopup, setArtPopup] = useState<{ record: IPQCRecord; top: number; left: number; pinned: boolean } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSessionState(s);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.warehouse) { setWarehouse(detail.warehouse); setPage(1); }
    };
    window.addEventListener('warehouseChanged', handler);
    return () => window.removeEventListener('warehouseChanged', handler);
  }, [router]);

  const isImported = (no: string) => /^\d+$/.test(no);

  // ── Articles popover ─────────────────────────────────
  // Normalize a record to its article list (falls back to flat single-article fields).
  const articlesOf = (record: IPQCRecord): any[] =>
    record.articles?.length
      ? record.articles
      : [{
          check_time: record.check_time,
          item_description: record.item_description,
          customer: record.customer,
          batch_number: record.batch_number,
          verdict: record.verdict,
        }];

  /**
   * The record's articles that the active search matched, each paired with its
   * ORIGINAL position — the position is what addresses the article when a COA
   * is created from it, so it must survive the filtering.
   *
   * The predicate mirrors the server's (batch_number / item_description /
   * customer, case-insensitive substring — see list_ipqc in ipqc_service.py).
   * Filtering on batch alone would blank the panel for a customer or product
   * search, which is a search the server happily answers.
   *
   * A record can also match on its ipqc_no, where no article matches at all.
   * Showing nothing there would read as "this entry is empty", so the whole
   * list comes back instead.
   */
  const matchedArticles = (
    record: IPQCRecord,
  ): { article: any; index: number }[] => {
    const all = articlesOf(record).map((article, index) => ({ article, index }));
    const q = search.trim().toLowerCase();
    if (!q) return all;
    const hit = all.filter(({ article: a }) =>
      [a.batch_number, a.item_description, a.customer].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      )
    );
    return hit.length ? hit : all;
  };

  /** COA link for a record, narrowed to `indexes` when the search picked out a
   *  subset. No `articles` param means "every article", the original behaviour. */
  const coaHref = (record: IPQCRecord, indexes?: number[]) => {
    const base = `/lab-reports/create?ipqc=${encodeURIComponent(record.ipqc_no)}`;
    if (!indexes || indexes.length === articlesOf(record).length) return base;
    return `${base}&articles=${indexes.join(",")}`;
  };

  function openArtPopup(e: ReactMouseEvent, record: IPQCRecord, pin: boolean) {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 340));
    setArtPopup((prev) => ({
      record,
      top: rect.bottom + 6,
      left,
      pinned: pin || (prev?.record.ipqc_no === record.ipqc_no && prev.pinned) || false,
    }));
  }
  function scheduleCloseArtPopup() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setArtPopup((p) => (p && p.pinned ? p : null));
    }, 180);
  }
  function cancelCloseArtPopup() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }

  // Close the popover on Escape, outside click, window resize, or page scroll
  // (but not when scrolling inside the popover itself).
  useEffect(() => {
    if (!artPopup) return;
    const close = () => setArtPopup(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-art-popup]")) return;
      close();
    };
    const onDown = (e: globalThis.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-art-popup]") || t.closest("[data-art-trigger]")) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [artPopup]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      if (showOldData) {
        // Show all → server-side pagination
        const res = await ipqc.list({
          page, per_page: PER_PAGE,
          search: search || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          warehouse,
          ...ORDER,
        });
        setAllRecords([]);
        setRecords(res.records);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      } else {
        // Hide imported → fetch in 500-row chunks (backend cap), filter & paginate client-side
        const collected: IPQCRecord[] = [];
        let p = 1;
        const CHUNK = 500;
        // Stop after enough pages — bumping limit if you have >10k records later.
        while (p <= 30) {
          const res = await ipqc.list({
            page: p, per_page: CHUNK,
            search: search || undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            warehouse,
            ...ORDER,
          });
          collected.push(...res.records);
          if (!res.records.length || res.records.length < CHUNK) break;
          p++;
        }
        const filtered = collected.filter(r => !isImported(r.ipqc_no));
        setAllRecords(filtered);
        setTotal(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
        const start = (page - 1) * PER_PAGE;
        setRecords(filtered.slice(start, start + PER_PAGE));
      }
    } catch {
      setRecords([]);
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, fromDate, toDate, warehouse, showOldData]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Re-slice locally when paginating in client-side mode (no refetch needed)
  useEffect(() => {
    if (!showOldData && allRecords.length > 0) {
      const start = (page - 1) * PER_PAGE;
      setRecords(allRecords.slice(start, start + PER_PAGE));
    }
  }, [page, showOldData, allRecords]);

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
    <DashboardLayout>
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
            <div className="flex items-center gap-2">
              <WarehouseSelector />
              <button
                onClick={() => router.push("/documentations/ipqc/new")}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New IPQC
              </button>
            </div>
          }
        />

        {/* ── Filters ─────────────────────────────────── */}
        <div className="surface-card p-4 mb-5 animate-fade-in-up">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search IPQC no, product, customer or batch..."
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
            <label className="inline-flex items-center gap-2 px-3 py-2.5 bg-cream-100 border border-cream-300 rounded-lg text-sm font-semibold text-ink-500 cursor-pointer select-none hover:bg-cream-200 transition-colors">
              <input
                type="checkbox"
                checked={showOldData}
                onChange={(e) => { setShowOldData(e.target.checked); setPage(1); }}
                className="w-4 h-4 accent-brand-500 cursor-pointer"
              />
              Show old data
            </label>
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
            {/* Mobile + tablet + small desktop: card list */}
            <div className="xl:hidden space-y-3">
              {records.map((record, idx) => {
                // Second copy of articlesOf(), now routed through the shared
                // filter. There is no popover at this breakpoint, so the matched
                // articles are shown inline and each one links to its own COA.
                const matched = matchedArticles(record);
                const articles = matched.map((m) => m.article);
                const total = articlesOf(record).length;
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
                        {matched.slice(0, 3).map(({ article: a, index: i }) => (
                          // Each line files a COA for that article alone. The
                          // card itself opens the record, so this stops the
                          // click bubbling up to that.
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); router.push(coaHref(record, [i])); }}
                            title={`Create a COA from article ${i + 1}`}
                            className="w-full text-left flex items-center gap-1.5 text-xs text-ink-500 flex-wrap rounded px-1 -mx-1 py-0.5 hover:bg-brand-50 transition-colors"
                          >
                            <span className="tabular-nums text-ink-300 font-bold">{i + 1}</span>
                            {a.check_time && (
                              <span className="tabular-nums text-ink-400 font-medium">{format12(a.check_time)}</span>
                            )}
                            <span className="font-semibold text-ink-600">{a.item_description || "—"}</span>
                            {a.customer && <><span className="text-ink-300">|</span><span>{a.customer}</span></>}
                            {a.batch_number && <><span className="text-ink-300">|</span><span className="font-mono">{a.batch_number}</span></>}
                            {a.verdict && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${a.verdict === "accept" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                                {a.verdict}
                              </span>
                            )}
                          </button>
                        ))}
                        {/* Counted off the FILTERED list — the old tail promised
                            rows that filtering had already removed. */}
                        {articles.length > 3 && <p className="text-xs text-ink-300 font-medium">+{articles.length - 3} more</p>}
                        {articles.length < total && (
                          <p className="text-[11px] text-brand-600 font-semibold">
                            {articles.length} of {total} match &ldquo;{search.trim()}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex border-t border-cream-300 divide-x divide-cream-300" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-ink-500 hover:bg-cream-100 hover:text-brand-500 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button onClick={() => handlePrint(record.ipqc_no)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-ink-500 hover:bg-cream-100 hover:text-brand-500 transition-colors">
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                      <button onClick={() => router.push(`/documentations/ipqc/new?from=${record.ipqc_no}`)} title="Re-check this product (creates a new pre-filled entry)" className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-ink-500 hover:bg-cream-100 hover:text-brand-500 transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button onClick={() => router.push(coaHref(record, matched.map((m) => m.index)))} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors">
                        COA{articles.length < total && <span className="tabular-nums opacity-70">· {articles.length}</span>}
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

            {/* Large desktop: table */}
            <div className="hidden xl:block surface-card overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cream-100 border-b border-cream-300">
                    <tr>
                      <th className="px-3 2xl:px-5 py-2.5 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">IPQC No.</th>
                      <th className="px-3 2xl:px-5 py-2.5 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-3 2xl:px-5 py-2.5 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Articles</th>
                      <th className="px-3 2xl:px-5 py-2.5 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Warehouse</th>
                      <th className="px-3 2xl:px-5 py-2.5 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Lab Report</th>
                      <th className="px-3 2xl:px-5 py-2.5 text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-300">
                    {records.map((record) => {
                      // Was a third byte-identical copy of articlesOf(). It fed
                      // the chip that OPENS the popover, so leaving it unfiltered
                      // put "16 articles" on the trigger and "2 of 16" in the
                      // panel it opens — the same row contradicting itself.
                      const matched = matchedArticles(record);
                      const articles = matched.map((m) => m.article);
                      const total = articlesOf(record).length;
                      return (
                        <tr key={record.ipqc_no} className="hover:bg-cream-100/50 transition-colors">
                          <td className="px-3 2xl:px-5 py-2.5 whitespace-nowrap">
                            <button
                              onClick={() => router.push(`/documentations/ipqc/view?id=${record.ipqc_no}`)}
                              className="text-sm font-bold text-brand-500 hover:text-brand-600 hover:underline tabular-nums"
                            >
                              {record.ipqc_no}
                            </button>
                          </td>
                          <td className="px-3 2xl:px-5 py-2.5 text-sm text-ink-500 whitespace-nowrap tabular-nums">{record.check_date}</td>
                          <td className="px-3 2xl:px-5 py-2.5 min-w-[220px]">
                            <button
                              type="button"
                              data-art-trigger
                              onClick={(e) => openArtPopup(e, record, true)}
                              onMouseEnter={(e) => openArtPopup(e, record, false)}
                              onMouseLeave={scheduleCloseArtPopup}
                              className="group/art inline-flex items-center gap-2 text-left max-w-full"
                            >
                              <span className="text-[13px] font-semibold text-ink-600 truncate max-w-[200px]">
                                {articles[0]?.item_description || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold border border-brand-100 whitespace-nowrap group-hover/art:bg-brand-100 transition-colors">
                                <Layers className="w-3 h-3" />
                                {articles.length < total
                                  ? `${articles.length} of ${total}`
                                  : `${articles.length} ${articles.length === 1 ? "article" : "articles"}`}
                              </span>
                            </button>
                          </td>
                          <td className="px-3 2xl:px-5 py-2.5 text-sm text-ink-500 whitespace-nowrap font-medium">{warehouse}</td>
                          <td className="px-3 2xl:px-5 py-2.5 whitespace-nowrap">
                            <button
                              onClick={() => router.push(coaHref(record, matched.map((m) => m.index)))}
                              title={
                                articles.length < total
                                  ? `Create ${articles.length} COA${articles.length === 1 ? "" : "s"} — only the articles matching "${search.trim()}"`
                                  : `Create a COA for each of the ${total} article${total === 1 ? "" : "s"}`
                              }
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 text-xs font-semibold transition-colors border border-brand-200"
                            >
                              COA
                              {articles.length < total && (
                                <span className="tabular-nums opacity-70">· {articles.length}</span>
                              )}
                            </button>
                          </td>
                          <td className="px-3 2xl:px-5 py-2.5 whitespace-nowrap">
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
                              <button
                                onClick={() => router.push(`/documentations/ipqc/new?from=${record.ipqc_no}`)}
                                className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors"
                                title="Re-check (duplicate into a new entry)"
                              >
                                <Copy className="w-4 h-4" />
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

      {/* ── Articles Popover ──────────────────────────── */}
      {artPopup && (
        <div
          data-art-popup
          className="fixed z-50 w-[320px] max-h-[60vh] overflow-y-auto rounded-xl border border-cream-300 bg-white shadow-lift p-2.5 animate-fade-in"
          style={{ top: artPopup.top, left: artPopup.left }}
          onMouseEnter={cancelCloseArtPopup}
          onMouseLeave={scheduleCloseArtPopup}
        >
          <div className="flex items-center justify-between px-1.5 pb-2 mb-1 border-b border-cream-300">
            <span className="text-[11px] font-bold text-ink-500 tabular-nums">
              {artPopup.record.ipqc_no} ·{" "}
              {matchedArticles(artPopup.record).length < articlesOf(artPopup.record).length
                ? `${matchedArticles(artPopup.record).length} of ${articlesOf(artPopup.record).length} match "${search.trim()}"`
                : `${articlesOf(artPopup.record).length} ${articlesOf(artPopup.record).length === 1 ? "article" : "articles"}`}
            </span>
            <button
              type="button"
              onClick={() => setArtPopup(null)}
              className="p-0.5 rounded-md text-ink-400 hover:text-ink-600 hover:bg-cream-200 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {matchedArticles(artPopup.record).map(({ article: a, index: i }) => (
              // Clicking one article files a COA for that article alone. The
              // number shown is its position in the ENTRY, not in this filtered
              // list, so a narrowed panel still maps onto the printed record.
              <button
                key={i}
                type="button"
                onClick={() => router.push(coaHref(artPopup.record, [i]))}
                title={`Create a COA from article ${i + 1}`}
                className="w-full text-left flex items-start gap-2 px-1.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors group/row"
              >
                <span className="w-4 h-4 mt-0.5 rounded bg-brand-50 text-brand-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 group-hover/row:bg-brand-500 group-hover/row:text-white transition-colors">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap leading-snug">
                    {a.check_time && (
                      <span className="text-[11px] tabular-nums text-ink-400 font-medium">{format12(a.check_time)}</span>
                    )}
                    <span className="text-[13px] font-semibold text-ink-600">{a.item_description || "—"}</span>
                    {a.verdict && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${a.verdict === "accept" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                        {a.verdict}
                      </span>
                    )}
                  </div>
                  {(a.customer || a.batch_number) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-400 flex-wrap mt-0.5">
                      {a.customer && <span>{a.customer}</span>}
                      {a.customer && a.batch_number && <span className="text-ink-300">|</span>}
                      {a.batch_number && <span className="font-mono">{a.batch_number}</span>}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="px-1.5 pt-2 mt-1 border-t border-cream-300 text-[10px] text-ink-300 font-medium">
            Click an article to start a COA for it.
          </p>
        </div>
      )}

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

    </DashboardLayout>
  );
}
