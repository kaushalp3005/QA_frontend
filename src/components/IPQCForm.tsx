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

interface ArticleForm {
  item_description: string;
  customer: string;
  batch_number: string;
  physical_category: string;
  sensory_evaluation: IPQCCheckItem[];
  physical_parameters: IPQCCheckItem[];
  label_check: IPQCCheckItem[];
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
}

const inputCls = "w-full border border-tan-100 bg-white rounded-xl px-3 py-3 text-sm text-sage-800 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition";
const labelCls = "block text-xs font-semibold text-sage-600 mb-1.5 uppercase tracking-wide";
const sectionTitleCls = "text-xs font-bold text-sage-600 uppercase tracking-widest mb-3 flex items-center gap-2";

export default function IPQCForm({ initialData, onSubmit, loading, isAdmin }: Props) {
  const [checkDate, setCheckDate] = useState(
    initialData?.check_date || new Date().toISOString().slice(0, 10)
  );
  const [factoryCode, setFactoryCode] = useState(initialData?.factory_code || "");
  const [floor, setFloor] = useState(initialData?.floor || "");
  const [articles, setArticles] = useState<ArticleForm[]>(
    initialData ? articleFromRecord(initialData) : [makeDefaultArticle()]
  );
  const [dropdowns, setDropdowns] = useState<DropdownData>({ factories: [] });
  const [skuResults, setSkuResults] = useState<Record<number, any[]>>({});
  const [expandedArticles, setExpandedArticles] = useState<Record<number, Record<string, boolean>>>({});

  useEffect(() => {
    dropdownApi.getFactoriesFloors().then(setDropdowns).catch(() => {});
    // Default all article sections expanded
    setExpandedArticles({ 0: { sensory: true, physical: true, label: true } });
  }, []);

  const selectedFactory = dropdowns.factories?.find((f) => f.factory_code === factoryCode);
  const availableFloors = selectedFactory?.floors || [];

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
    field: "sensory_evaluation" | "physical_parameters" | "label_check",
    paramKey: string
  ) {
    setArticles((prev) =>
      prev.map((a, i) =>
        i !== artIdx ? a : {
          ...a,
          [field]: a[field].map((item) =>
            item.parameter === paramKey ? { ...item, checked: !item.checked } : item
          ),
        }
      )
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
      [idx]: { sensory: true, physical: true, label: true },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ check_date: checkDate, factory_code: factoryCode, floor, articles });
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Header Card ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-tan-100 shadow-sm p-4 sm:p-5 mb-4">
        <h2 className="text-sm font-bold text-sage-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-sage-400 inline-block" />
          Record Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <label className={labelCls}>Factory</label>
            <select
              value={factoryCode}
              onChange={(e) => { setFactoryCode(e.target.value); setFloor(""); }}
              required
              className={inputCls}
            >
              <option value="">Select factory…</option>
              {dropdowns.factories?.map((f) => (
                <option key={f.factory_code} value={f.factory_code}>{f.factory_code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Floor</label>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              required
              disabled={!factoryCode}
              className={`${inputCls} disabled:opacity-40`}
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
          <div key={artIdx} className="bg-white rounded-2xl border border-tan-100 shadow-sm mb-4 overflow-hidden">

            {/* Article Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-beige-50 border-b border-tan-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-600">
                  {artIdx + 1}
                </span>
                <span className="text-sm font-semibold text-sage-700">
                  {art.item_description || `Article ${artIdx + 1}`}
                </span>
              </div>
              {articles.length > 1 && (
                <button
                  type="button"
                  onClick={() => setArticles((a) => a.filter((_, i) => i !== artIdx))}
                  className="p-1.5 rounded-lg text-sage-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-5">

              {/* Article identity fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* SKU search */}
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <label className={labelCls}>SKU / Item Name</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sage-400 pointer-events-none" />
                    <input
                      type="text"
                      value={art.item_description}
                      onChange={(e) => handleSkuSearch(artIdx, e.target.value)}
                      placeholder="Search…"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  {(skuResults[artIdx]?.length ?? 0) > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border border-tan-100 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {skuResults[artIdx].map((s, si) => (
                        <button
                          key={si}
                          type="button"
                          onClick={() => {
                            updateArticle(artIdx, { item_description: s.description || s.sku_code });
                            setSkuResults((r) => ({ ...r, [artIdx]: [] }));
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-sage-700 hover:bg-beige-50 transition-colors"
                        >
                          {s.description || s.sku_code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Customer</label>
                  <input
                    type="text"
                    value={art.customer}
                    onChange={(e) => updateArticle(artIdx, { customer: e.target.value })}
                    placeholder="Customer name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Batch Number</label>
                  <input
                    type="text"
                    value={art.batch_number}
                    onChange={(e) => updateArticle(artIdx, { batch_number: e.target.value })}
                    placeholder="Batch / Lot no."
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
                    <option value="other">Other</option>
                    <option value="dates">Dates</option>
                    <option value="seeds">Seeds</option>
                  </select>
                </div>
              </div>

              {/* ── Sensory Evaluation ────── */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection(artIdx, "sensory")}
                  className="w-full flex items-center justify-between py-2 border-b border-tan-100 mb-3"
                >
                  <span className={sectionTitleCls + " mb-0"}>Sensory Evaluation</span>
                  {(exp.sensory ?? true) ? <ChevronUp className="w-4 h-4 text-sage-400" /> : <ChevronDown className="w-4 h-4 text-sage-400" />}
                </button>
                {(exp.sensory ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SENSORY_PARAMS.map((param) => {
                      const item = art.sensory_evaluation.find((x) => x.parameter === param.key);
                      return (
                        <label key={param.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${item?.checked ? "bg-sage-50 border-sage-200" : "bg-cream-100/60 border-tan-100"}`}>
                          <input
                            type="checkbox"
                            checked={item?.checked || false}
                            onChange={() => toggleCheck(artIdx, "sensory_evaluation", param.key)}
                            className="mt-0.5 w-4 h-4 rounded accent-sage-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-sage-700 leading-snug">{param.label}</span>
                            {item?.checked && (
                              <input
                                type="text"
                                value={item.remark || ""}
                                onChange={(e) => updateCheckField(artIdx, "sensory_evaluation", param.key, "remark", e.target.value)}
                                placeholder="Remark (optional)"
                                className="mt-1.5 w-full border border-tan-100 bg-white rounded-lg px-2.5 py-1.5 text-xs text-sage-700 focus:outline-none focus:ring-1 focus:ring-sage-300"
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
                <button
                  type="button"
                  onClick={() => toggleSection(artIdx, "physical")}
                  className="w-full flex items-center justify-between py-2 border-b border-tan-100 mb-3"
                >
                  <span className={sectionTitleCls + " mb-0"}>Physical Parameters</span>
                  {(exp.physical ?? true) ? <ChevronUp className="w-4 h-4 text-sage-400" /> : <ChevronDown className="w-4 h-4 text-sage-400" />}
                </button>
                {(exp.physical ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {physicalParams.map((param) => {
                      const item = art.physical_parameters.find((x) => x.parameter === param.key);
                      return (
                        <label key={param.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${item?.checked ? "bg-sage-50 border-sage-200" : "bg-cream-100/60 border-tan-100"}`}>
                          <input
                            type="checkbox"
                            checked={item?.checked || false}
                            onChange={() => toggleCheck(artIdx, "physical_parameters", param.key)}
                            className="mt-0.5 w-4 h-4 rounded accent-sage-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-sage-700 leading-snug">{param.label}</span>
                            {item?.checked && (
                              <div className="mt-1.5 flex gap-1.5">
                                <input
                                  type="text"
                                  value={item.value || ""}
                                  onChange={(e) => updateCheckField(artIdx, "physical_parameters", param.key, "value", e.target.value)}
                                  placeholder="Value"
                                  className="flex-1 border border-tan-100 bg-white rounded-lg px-2.5 py-1.5 text-xs text-sage-700 focus:outline-none focus:ring-1 focus:ring-sage-300"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <input
                                  type="text"
                                  value={item.remark || ""}
                                  onChange={(e) => updateCheckField(artIdx, "physical_parameters", param.key, "remark", e.target.value)}
                                  placeholder="Remark"
                                  className="flex-1 border border-tan-100 bg-white rounded-lg px-2.5 py-1.5 text-xs text-sage-700 focus:outline-none focus:ring-1 focus:ring-sage-300"
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
                <button
                  type="button"
                  onClick={() => toggleSection(artIdx, "label")}
                  className="w-full flex items-center justify-between py-2 border-b border-tan-100 mb-3"
                >
                  <span className={sectionTitleCls + " mb-0"}>Label Check</span>
                  {(exp.label ?? true) ? <ChevronUp className="w-4 h-4 text-sage-400" /> : <ChevronDown className="w-4 h-4 text-sage-400" />}
                </button>
                {(exp.label ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LABEL_CHECK_PARAMS.map((param) => {
                      const item = art.label_check.find((x) => x.parameter === param.key);
                      return (
                        <label key={param.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${item?.checked ? "bg-sage-50 border-sage-200" : "bg-cream-100/60 border-tan-100"}`}>
                          <input
                            type="checkbox"
                            checked={item?.checked || false}
                            onChange={() => toggleCheck(artIdx, "label_check", param.key)}
                            className="w-4 h-4 rounded accent-sage-500 flex-shrink-0"
                          />
                          <span className="text-sm font-medium text-sage-700">{param.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Verdict + Seal + Remark ─ */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                {/* Seal Check */}
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${art.seal_check ? "bg-success-50 border-success-200" : "bg-danger-50 border-danger-200"}`}>
                  <input
                    type="checkbox"
                    checked={art.seal_check}
                    onChange={(e) => updateArticle(artIdx, { seal_check: e.target.checked })}
                    className="w-4 h-4 rounded accent-sage-500 flex-shrink-0"
                  />
                  <span className="text-sm font-semibold text-sage-700">Seal Check OK</span>
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
                            : "bg-white border-tan-100 text-sage-500 hover:border-sage-300"
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
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-tan-200 hover:border-sage-300 text-sage-500 hover:text-sage-600 rounded-2xl py-4 text-sm font-medium transition-colors mb-4"
      >
        <Plus className="w-4 h-4" />
        Add Another Article
      </button>

      {/* ── Sticky Save Bar ───────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-tan-100 px-4 py-3 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 disabled:opacity-60 text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
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
