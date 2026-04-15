"use client";
import { useState, useEffect } from "react";
import { dropdown as dropdownApi, sku as skuApi } from "@/lib/api";
import {
  SENSORY_PARAMS,
  LABEL_CHECK_PARAMS,
  getPhysicalParams,
} from "@/lib/constant";
import { DropdownData, IPQCRecord, IPQCCheckItem } from "@/types";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Search, Save, Loader2
} from "lucide-react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

const CHEMICAL_PARAMS = [
  { key: "moisture", label: "Moisture" },
  { key: "salt",     label: "Salt" },
];

interface ArticleForm {
  item_description: string;
  customer: string;
  batch_number: string;
  physical_category: string;
  physical_category_other?: string;
  sensory_evaluation: IPQCCheckItem[];
  physical_parameters: IPQCCheckItem[];
  label_check: IPQCCheckItem[];
  chemical_parameter: IPQCCheckItem[];
  seal_check: boolean;
  verdict: "accept" | "reject";
  overall_remark: string;
}

function makeDefaultArticle(): ArticleForm {
  return {
    item_description: "",
    customer: "",
    batch_number: "",
    physical_category: "other",
    sensory_evaluation: SENSORY_PARAMS.map((p) => ({ parameter: p.key, checked: false, remark: "" })),
    physical_parameters: getPhysicalParams("other").map((p) => ({ parameter: p.key, checked: false, value: "", remark: "" })),
    label_check: LABEL_CHECK_PARAMS.map((p) => ({ parameter: p.key, checked: false, remark: "" })),
    chemical_parameter: CHEMICAL_PARAMS.map((p) => ({ parameter: p.key, checked: false, remark: "" })),
    seal_check: true,
    verdict: "accept",
    overall_remark: "",
  };
}

function mergePrams(defaults: IPQCCheckItem[], saved: IPQCCheckItem[]): IPQCCheckItem[] {
  return defaults.map((d) => {
    const s = saved.find((x) => x.parameter === d.parameter);
    return s ? { ...d, ...s } : d;
  });
}

function articleFromRecord(record: IPQCRecord): ArticleForm[] {
  if (record.articles?.length) {
    return record.articles.map((a) => ({
      item_description: a.item_description || "",
      customer: a.customer || "",
      batch_number: a.batch_number || "",
      physical_category: a.physical_category || "other",
      sensory_evaluation: mergePrams(
        SENSORY_PARAMS.map((p) => ({ parameter: p.key, checked: false, remark: "" })),
        a.sensory_evaluation || []
      ),
      physical_parameters: mergePrams(
        getPhysicalParams(a.physical_category || "other").map((p) => ({ parameter: p.key, checked: false, value: "", remark: "" })),
        a.physical_parameters || []
      ),
      label_check: mergePrams(
        LABEL_CHECK_PARAMS.map((p) => ({ parameter: p.key, checked: false, remark: "" })),
        a.label_check || []
      ),
      chemical_parameter: mergePrams(
        CHEMICAL_PARAMS.map((p) => ({ parameter: p.key, checked: false, remark: "" })),
        (a as any).chemical_parameter || []
      ),
      seal_check: a.seal_check ?? true,
      verdict: a.verdict || "accept",
      overall_remark: a.overall_remark || "",
    }));
  }
  const def = makeDefaultArticle();
  return [{
    ...def,
    item_description: record.item_description || "",
    customer: record.customer || "",
    batch_number: record.batch_number || "",
    physical_category: record.physical_category || "other",
    sensory_evaluation: mergePrams(def.sensory_evaluation, record.sensory_evaluation || []),
    physical_parameters: mergePrams(
      getPhysicalParams(record.physical_category || "other").map((p) => ({ parameter: p.key, checked: false, value: "", remark: "" })),
      record.physical_parameters || []
    ),
    label_check: mergePrams(def.label_check, record.label_check || []),
    chemical_parameter: mergePrams(def.chemical_parameter, (record as any).chemical_parameter || []),
    seal_check: record.seal_check ?? true,
    verdict: (record.verdict as any) || "accept",
    overall_remark: record.overall_remark || "",
  }];
}

interface Props {
  initialData?: IPQCRecord;
  onSubmit: (data: any) => void;
  loading: boolean;
  isAdmin?: boolean;
  useAllSkuDropdown?: boolean;
}

const inputCls = "w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide";
const sectionTitleCls = "text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-2";

export default function IPQCForm({ initialData, onSubmit, loading, isAdmin, useAllSkuDropdown }: Props) {
  const warehouse = getStoredWarehouse();
  const isA185 = warehouse === "A185";

  const [checkDate, setCheckDate] = useState(
    initialData?.check_date || new Date().toISOString().slice(0, 10)
  );
  const [floor, setFloor] = useState(initialData?.floor || "");
  const [dropdowns, setDropdowns] = useState<DropdownData>({ factories: [] });
  const [articles, setArticles] = useState<ArticleForm[]>(
    initialData ? articleFromRecord(initialData) : [makeDefaultArticle()]
  );
  const [skuResults, setSkuResults] = useState<Record<number, any[]>>({});

  // ── all_sku combobox state (only used when useAllSkuDropdown is true) ──
  const [allSkuList, setAllSkuList] = useState<string[]>([]);
  const [allSkuLoading, setAllSkuLoading] = useState(false);
  const [openSkuPanelFor, setOpenSkuPanelFor] = useState<number | null>(null);
  const [allSkuSearch, setAllSkuSearch] = useState("");

  useEffect(() => {
    if (!useAllSkuDropdown) return;
    console.log("[all-sku] effect fired, search=", JSON.stringify(allSkuSearch));
    let cancelled = false;
    setAllSkuLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await skuApi.searchAll(allSkuSearch);
        console.log("[all-sku] got", res?.items?.length ?? 0, "items");
        if (!cancelled) setAllSkuList(res.items || []);
      } catch (e) {
        console.error("[all-sku] load failed:", e);
        if (!cancelled) setAllSkuList([]);
      } finally {
        if (!cancelled) setAllSkuLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [useAllSkuDropdown, allSkuSearch]);

  useEffect(() => {
    if (openSkuPanelFor === null) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-all-sku-combobox]")) {
        setOpenSkuPanelFor(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openSkuPanelFor]);
  const [expandedArticles, setExpandedArticles] = useState<Record<number, Record<string, boolean>>>({});

  useEffect(() => {
    dropdownApi.getFactoriesFloors().then(setDropdowns).catch(() => {});
    // Default all article sections expanded
    setExpandedArticles({ 0: { sensory: true, physical: true, label: true, chemical: true } });
  }, []);

  // Get floors for the current warehouse
  const matchedFactory = dropdowns.factories?.find((f) => f.factory_code === warehouse);
  const availableFloors = matchedFactory?.floors || [];

  function toggleSection(artIdx: number, section: string) {
    setExpandedArticles((prev) => ({
      ...prev,
      [artIdx]: { ...(prev[artIdx] || {}), [section]: !(prev[artIdx]?.[section] ?? true) },
    }));
  }

  function isSectionOpen(artIdx: number, section: string) {
    return prev => (prev[artIdx]?.[section] ?? true);
  }

  function updateArticle(idx: number, patch: Partial<ArticleForm>) {
    setArticles((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function toggleCheck(
    artIdx: number,
    field: "sensory_evaluation" | "physical_parameters" | "label_check" | "chemical_parameter",
    paramKey: string
  ) {
    setArticles((prev) =>
      prev.map((a, i) =>
        i !== artIdx ? a : {
          ...a,
          [field]: (a[field as keyof ArticleForm] as IPQCCheckItem[]).map((item) =>
            item.parameter === paramKey ? { ...item, checked: !item.checked } : item
          ),
        }
      )
    );
  }

  function selectAll(
    artIdx: number,
    field: "sensory_evaluation" | "physical_parameters" | "label_check" | "chemical_parameter"
  ) {
    setArticles((prev) =>
      prev.map((a, i) => {
        if (i !== artIdx) return a;
        const items = a[field as keyof ArticleForm] as IPQCCheckItem[];
        const allChecked = items.every((item) => item.checked);
        return {
          ...a,
          [field]: items.map((item) => ({ ...item, checked: !allChecked })),
        };
      })
    );
  }

  function updateCheckField(
    artIdx: number,
    field: "sensory_evaluation" | "physical_parameters" | "label_check",
    paramKey: string,
    key: "remark" | "value",
    val: string
  ) {
    setArticles((prev) =>
      prev.map((a, i) =>
        i !== artIdx ? a : {
          ...a,
          [field]: a[field].map((item) =>
            item.parameter === paramKey ? { ...item, [key]: val } : item
          ),
        }
      )
    );
  }

  function changePhysicalCategory(artIdx: number, category: string) {
    setArticles((prev) =>
      prev.map((a, i) =>
        i !== artIdx ? a : {
          ...a,
          physical_category: category,
          physical_parameters: getPhysicalParams(category).map((p) => ({
            parameter: p.key, checked: false, value: "", remark: "",
          })),
        }
      )
    );
  }

  async function handleSkuSearch(artIdx: number, val: string) {
    updateArticle(artIdx, { item_description: val });
    if (val.length < 2) { setSkuResults((s) => ({ ...s, [artIdx]: [] })); return; }
    try {
      const res = await skuApi.search(val);
      setSkuResults((s) => ({ ...s, [artIdx]: res }));
    } catch { setSkuResults((s) => ({ ...s, [artIdx]: [] })); }
  }

  function addArticle() {
    const idx = articles.length;
    setArticles((a) => [...a, makeDefaultArticle()]);
    setExpandedArticles((prev) => ({
      ...prev,
      [idx]: { sensory: true, physical: true, label: true, chemical: true },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = articles.map((a) => ({
      ...a,
      chemical_parameter: isA185 ? a.chemical_parameter : [],
    }));
    onSubmit({ check_date: checkDate, warehouse, floor, articles: payload });
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Header Card ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-emerald-500 inline-block" />
          Record Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Check Date</label>
            <input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Warehouse</label>
            <input
              type="text"
              value={warehouse}
              disabled
              className={`${inputCls} disabled:opacity-60 bg-gray-50`}
            />
          </div>
          <div>
            <label className={labelCls}>Floor</label>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select floor…</option>
              {availableFloors.map((fl) => (
                <option key={fl.id} value={fl.floor_name}>{fl.floor_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Articles ─────────────────────────────────── */}
      {articles.map((art, artIdx) => {
        const physicalParams = getPhysicalParams(art.physical_category);
        const exp = expandedArticles[artIdx] || {};

        return (
          <div key={artIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">

            {/* Article Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                  {artIdx + 1}
                </span>
                <span className="text-sm font-semibold text-gray-800">
                  {art.item_description || `Article ${artIdx + 1}`}
                </span>
              </div>
              {articles.length > 1 && (
                <button
                  type="button"
                  onClick={() => setArticles((a) => a.filter((_, i) => i !== artIdx))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-5">

              {/* Article identity fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
                {/* SKU search */}
                {useAllSkuDropdown ? (
                  <div
                    className="relative sm:col-span-2 lg:col-span-1"
                    data-all-sku-combobox
                  >
                    <label className={labelCls}>SKU / Item Name <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => {
                        console.log("[all-sku] button clicked, artIdx=", artIdx, "currentOpen=", openSkuPanelFor);
                        setOpenSkuPanelFor(openSkuPanelFor === artIdx ? null : artIdx);
                        setAllSkuSearch("");
                      }}
                      className={`${inputCls} pl-9 text-left flex items-center justify-between`}
                    >
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <span className={art.item_description ? "text-gray-800 truncate" : "text-gray-400"}>
                        {art.item_description || "Select item…"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                    {openSkuPanelFor === artIdx && (
                      <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                        <div className="p-2 border-b border-gray-200 bg-gray-50">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <input
                              autoFocus
                              type="text"
                              value={allSkuSearch}
                              onChange={(e) => setAllSkuSearch(e.target.value)}
                              placeholder="Search particulars…"
                              className="w-full border border-gray-200 bg-white rounded-lg pl-8 pr-2 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {allSkuLoading ? (
                            <div className="px-3 py-3 text-xs text-gray-400">Loading…</div>
                          ) : allSkuList.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-gray-400">No items found</div>
                          ) : (
                            allSkuList.map((name, si) => (
                              <button
                                key={si}
                                type="button"
                                onClick={() => {
                                  updateArticle(artIdx, { item_description: name });
                                  setOpenSkuPanelFor(null);
                                  setAllSkuSearch("");
                                }}
                                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                {name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {/* hidden input to preserve required-field validation */}
                    <input
                      type="text"
                      value={art.item_description}
                      onChange={() => {}}
                      required
                      tabIndex={-1}
                      aria-hidden="true"
                      className="sr-only"
                    />
                  </div>
                ) : (
                  <div className="relative sm:col-span-2 lg:col-span-1">
                    <label className={labelCls}>SKU / Item Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={art.item_description}
                        onChange={(e) => handleSkuSearch(artIdx, e.target.value)}
                        placeholder="Search…"
                        required
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                    {(skuResults[artIdx]?.length ?? 0) > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                        {skuResults[artIdx].map((s, si) => (
                          <button
                            key={si}
                            type="button"
                            onClick={() => {
                              updateArticle(artIdx, { item_description: s.description || s.sku_code });
                              setSkuResults((r) => ({ ...r, [artIdx]: [] }));
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            {s.description || s.sku_code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className={labelCls}>Customer <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={art.customer}
                    onChange={(e) => updateArticle(artIdx, { customer: e.target.value })}
                    placeholder="Customer name"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Batch Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={art.batch_number}
                    onChange={(e) => updateArticle(artIdx, { batch_number: e.target.value })}
                    placeholder="Batch / Lot no."
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Physical Category</label>
                  <select
                    value={art.physical_category}
                    onChange={(e) => changePhysicalCategory(artIdx, e.target.value)}
                    className={inputCls}
                  >
                    <option value="dates">Dates</option>
                    <option value="seeds">Seeds</option>
                    <option value="nuts">Nuts</option>
                    <option value="other">Other</option>
                  </select>
                  {art.physical_category === "other" && (
                    <input
                      type="text"
                      placeholder="Specify category"
                      value={art.physical_category_other || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setArticles((prev) =>
                          prev.map((a, i) => i !== artIdx ? a : { ...a, physical_category_other: val })
                        );
                      }}
                      className={inputCls + " mt-2"}
                    />
                  )}
                </div>
              </div>

              {/* ── Sensory Evaluation ────── */}
              <div>
                <div className="w-full flex items-center justify-between py-2 border-b border-gray-200 mb-3">
                  <button type="button" onClick={() => toggleSection(artIdx, "sensory")} className="flex items-center gap-2 flex-1">
                    <span className={sectionTitleCls + " mb-0"}>Sensory Evaluation</span>
                    {(exp.sensory ?? true) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button type="button" onClick={() => selectAll(artIdx, "sensory_evaluation")}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors flex-shrink-0">
                    {art.sensory_evaluation.every(i => i.checked) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {(exp.sensory ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SENSORY_PARAMS.map((param) => {
                      const item = art.sensory_evaluation.find((x) => x.parameter === param.key);
                      return (
                        <label key={param.key} className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer ${item?.checked ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                          <input
                            type="checkbox"
                            checked={item?.checked || false}
                            onChange={() => toggleCheck(artIdx, "sensory_evaluation", param.key)}
                            className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800 leading-snug">{param.label}</span>
                            {item?.checked && (
                              <input
                                type="text"
                                value={item.remark || ""}
                                onChange={(e) => updateCheckField(artIdx, "sensory_evaluation", param.key, "remark", e.target.value)}
                                placeholder="Remark (optional)"
                                className="mt-1.5 w-full border border-gray-300 bg-white rounded-md px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Physical Parameters ────── */}
              <div>
                <div className="w-full flex items-center justify-between py-2 border-b border-gray-200 mb-3">
                  <button type="button" onClick={() => toggleSection(artIdx, "physical")} className="flex items-center gap-2 flex-1">
                    <span className={sectionTitleCls + " mb-0"}>Physical Parameters</span>
                    {(exp.physical ?? true) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button type="button" onClick={() => selectAll(artIdx, "physical_parameters")}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors flex-shrink-0">
                    {art.physical_parameters.every(i => i.checked) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {(exp.physical ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {physicalParams.map((param) => {
                      const item = art.physical_parameters.find((x) => x.parameter === param.key);
                      return (
                        <label key={param.key} className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer ${item?.checked ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                          <input
                            type="checkbox"
                            checked={item?.checked || false}
                            onChange={() => toggleCheck(artIdx, "physical_parameters", param.key)}
                            className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800 leading-snug">{param.label}</span>
                            {item?.checked && (
                              <div className="mt-1.5 flex flex-col gap-1.5">
                                <input
                                  type="text"
                                  value={item.value || ""}
                                  onChange={(e) => updateCheckField(artIdx, "physical_parameters", param.key, "value", e.target.value)}
                                  placeholder="Value"
                                  className="w-full border border-gray-300 bg-white rounded-md px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <input
                                  type="text"
                                  value={item.remark || ""}
                                  onChange={(e) => updateCheckField(artIdx, "physical_parameters", param.key, "remark", e.target.value)}
                                  placeholder="Remark"
                                  className="w-full border border-gray-300 bg-white rounded-md px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Label Check ────────────── */}
              <div>
                <div className="w-full flex items-center justify-between py-2 border-b border-gray-200 mb-3">
                  <button type="button" onClick={() => toggleSection(artIdx, "label")} className="flex items-center gap-2 flex-1">
                    <span className={sectionTitleCls + " mb-0"}>Label Check</span>
                    {(exp.label ?? true) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button type="button" onClick={() => selectAll(artIdx, "label_check")}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors flex-shrink-0">
                    {art.label_check.every(i => i.checked) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {(exp.label ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LABEL_CHECK_PARAMS.map((param) => {
                      const item = art.label_check.find((x) => x.parameter === param.key);
                      return (
                        <label key={param.key} className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer ${item?.checked ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                          <input
                            type="checkbox"
                            checked={item?.checked || false}
                            onChange={() => toggleCheck(artIdx, "label_check", param.key)}
                            className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800 leading-snug">{param.label}</span>
                            {item?.checked && (
                              <input
                                type="text"
                                value={item.remark || ""}
                                onChange={(e) => updateCheckField(artIdx, "label_check", param.key, "remark", e.target.value)}
                                placeholder="Remark (optional)"
                                className="mt-1.5 w-full border border-gray-300 bg-white rounded-md px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Chemical Parameter (A185 only) ── */}
              {isA185 && (
                <div>
                  <div className="w-full flex items-center justify-between py-2 border-b border-gray-200 mb-3">
                    <button type="button" onClick={() => toggleSection(artIdx, "chemical")} className="flex items-center gap-2 flex-1">
                      <span className={sectionTitleCls + " mb-0"}>Chemical Parameter</span>
                      {(exp.chemical ?? true) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button type="button" onClick={() => selectAll(artIdx, "chemical_parameter")}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors flex-shrink-0">
                      {art.chemical_parameter.every(i => i.checked) ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  {(exp.chemical ?? true) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {CHEMICAL_PARAMS.map((param) => {
                        const item = art.chemical_parameter.find((x) => x.parameter === param.key);
                        return (
                          <label key={param.key} className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer ${item?.checked ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                            <input
                              type="checkbox"
                              checked={item?.checked || false}
                              onChange={() => toggleCheck(artIdx, "chemical_parameter" as any, param.key)}
                              className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800 leading-snug">{param.label}</span>
                              {item?.checked && (
                                <input
                                  type="text"
                                  value={item.remark || ""}
                                  onChange={(e) => updateCheckField(artIdx, "chemical_parameter" as any, param.key, "remark", e.target.value)}
                                  placeholder="Remark (optional)"
                                  className="mt-1.5 w-full border border-gray-300 bg-white rounded-md px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Verdict + Seal + Remark ─ */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-3 pt-1">
                {/* Seal Check */}
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${art.seal_check ? "bg-success-50 border-success-200" : "bg-danger-50 border-danger-200"}`}>
                  <input
                    type="checkbox"
                    checked={art.seal_check}
                    onChange={(e) => updateArticle(artIdx, { seal_check: e.target.checked })}
                    className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                  />
                  <span className="text-sm font-semibold text-gray-800">Seal Check OK</span>
                </label>

                {/* Verdict */}
                <div>
                  <label className={labelCls}>Verdict</label>
                  <div className="flex gap-2">
                    {(["accept", "reject"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateArticle(artIdx, { verdict: v })}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                          art.verdict === v
                            ? v === "accept"
                              ? "bg-success-500 border-success-500 text-white shadow-sm"
                              : "bg-danger-500 border-danger-500 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-500 hover:border-emerald-400"
                        }`}
                      >
                        {v === "accept" ? "Accept" : "Reject"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overall Remark */}
                <div>
                  <label className={labelCls}>Overall Remark</label>
                  <input
                    type="text"
                    value={art.overall_remark}
                    onChange={(e) => updateArticle(artIdx, { overall_remark: e.target.value })}
                    placeholder="Optional remark…"
                    className={inputCls}
                  />
                </div>
              </div>

            </div>
          </div>
        );
      })}

      {/* ── Add Article ───────────────────────────────── */}
      <button
        type="button"
        onClick={addArticle}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-emerald-400 text-gray-500 hover:text-emerald-600 rounded-xl py-4 text-sm font-medium transition-colors mb-4"
      >
        <Plus className="w-4 h-4" />
        Add Another Article
      </button>

      {/* ── Sticky Save Bar ───────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4" /> Save Record</>
          )}
        </button>
      </div>

    </form>
  );
}
