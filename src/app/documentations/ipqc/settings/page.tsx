"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { dropdown as dropdownApi, factories as factoriesApi, floors as floorsApi } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { DropdownData } from "@/types";
import {
  Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp,
  Building2, Layers
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<DropdownData>({ factories: [] });
  const [loading, setLoading] = useState(true);

  // Add factory form
  const [newFactoryCode, setNewFactoryCode] = useState("");
  const [newFactoryName, setNewFactoryName] = useState("");
  const [addingFactory, setAddingFactory] = useState(false);

  // Edit factory
  const [editingFactory, setEditingFactory] = useState<number | null>(null);
  const [editFactoryCode, setEditFactoryCode] = useState("");
  const [editFactoryName, setEditFactoryName] = useState("");

  // Floor forms
  const [floorForm, setFloorForm] = useState<Record<string, { name: string; order: string }>>({});
  const [expandedFactory, setExpandedFactory] = useState<number | null>(null);

  useEffect(() => {
    if (!getSession()) router.push("/");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await dropdownApi.getFactoriesFloors();
      setData(res);
      // Auto-expand if only one factory
      if (res.factories?.length === 1) setExpandedFactory(res.factories[0].id);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAddFactory(e: React.FormEvent) {
    e.preventDefault();
    if (!newFactoryCode.trim()) return;
    try {
      await factoriesApi.create({
        factory_code: newFactoryCode.trim(),
        factory_name: newFactoryName.trim() || newFactoryCode.trim(),
      });
      setNewFactoryCode(""); setNewFactoryName(""); setAddingFactory(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  async function handleUpdateFactory(factoryId: number) {
    try {
      const updates: any = {};
      if (editFactoryCode.trim()) updates.factory_code = editFactoryCode.trim();
      if (editFactoryName.trim()) updates.factory_name = editFactoryName.trim();
      await factoriesApi.update(factoryId, updates);
      setEditingFactory(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDeleteFactory(factoryId: number, code: string) {
    if (!confirm(`Delete factory "${code}" and ALL its floors?`)) return;
    try {
      await factoriesApi.delete(factoryId);
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  async function handleAddFloor(factoryCode: string) {
    const form = floorForm[factoryCode];
    if (!form?.name?.trim()) return;
    try {
      await floorsApi.create({
        factory_code: factoryCode,
        floor_name: form.name.trim(),
        sort_order: parseInt(form.order) || 0,
      });
      setFloorForm((f) => ({ ...f, [factoryCode]: { name: "", order: "" } }));
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDeleteFloor(floorId: number) {
    if (!confirm("Remove this floor?")) return;
    try {
      await floorsApi.delete(floorId);
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div className="min-h-[100dvh] bg-cream-100">
      <Navbar showBack backHref="/documentations/ipqc" title="Settings" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 pb-16">

        {/* ── Section header ─────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-sage-800">Factories & Floors</h2>
            <p className="text-xs text-sage-500 mt-0.5">Manage factory locations and production floors</p>
          </div>
          <button
            onClick={() => setAddingFactory(!addingFactory)}
            className="flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Factory</span>
          </button>
        </div>

        {/* ── Add Factory Form ────────────────────── */}
        {addingFactory && (
          <div className="bg-white rounded-2xl border border-tan-100 shadow-sm p-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-sage-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> New Factory
            </h3>
            <form onSubmit={handleAddFactory} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-sage-600 mb-1.5">Factory Code <span className="text-danger-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. FAC-01"
                    value={newFactoryCode}
                    onChange={(e) => setNewFactoryCode(e.target.value)}
                    required
                    className="w-full border border-tan-100 rounded-xl px-3 py-2.5 text-sm text-sage-800 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sage-600 mb-1.5">Factory Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Plant"
                    value={newFactoryName}
                    onChange={(e) => setNewFactoryName(e.target.value)}
                    className="w-full border border-tan-100 rounded-xl px-3 py-2.5 text-sm text-sage-800 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-sage-500 hover:bg-sage-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Factory
                </button>
                <button
                  type="button"
                  onClick={() => setAddingFactory(false)}
                  className="px-4 border border-tan-200 bg-white text-sage-600 py-2.5 rounded-xl text-sm font-medium hover:bg-beige-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Loading ─────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-sage-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        ) : data.factories?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-beige-50 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-sage-300" />
            </div>
            <p className="text-sm text-sage-500">No factories yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.factories?.map((factory) => {
              const isExpanded = expandedFactory === factory.id;
              const isEditing = editingFactory === factory.id;

              return (
                <div key={factory.id} className="bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden">

                  {/* Factory Header */}
                  <div className="px-4 py-3.5">
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={editFactoryCode}
                            onChange={(e) => setEditFactoryCode(e.target.value)}
                            placeholder="Code"
                            className="border border-tan-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                          />
                          <input
                            value={editFactoryName}
                            onChange={(e) => setEditFactoryName(e.target.value)}
                            placeholder="Name"
                            className="border border-tan-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateFactory(factory.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-sage-500 text-white py-2 rounded-lg text-sm font-medium"
                          >
                            <Check className="w-4 h-4" /> Save
                          </button>
                          <button
                            onClick={() => setEditingFactory(null)}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-tan-200 text-sage-600 py-2 rounded-lg text-sm font-medium"
                          >
                            <X className="w-4 h-4" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-sage-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sage-800 text-sm truncate">{factory.factory_code}</p>
                            {factory.factory_name && factory.factory_name !== factory.factory_code && (
                              <p className="text-xs text-sage-500 truncate">{factory.factory_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <button
                            onClick={() => {
                              setEditingFactory(factory.id);
                              setEditFactoryCode(factory.factory_code);
                              setEditFactoryName(factory.factory_name);
                            }}
                            className="p-2 rounded-lg text-sage-400 hover:text-sage-600 hover:bg-beige-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFactory(factory.id, factory.factory_code)}
                            className="p-2 rounded-lg text-sage-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedFactory(isExpanded ? null : factory.id)}
                            className="p-2 rounded-lg text-sage-400 hover:text-sage-600 hover:bg-beige-50 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floors section */}
                  {isExpanded && !isEditing && (
                    <div className="border-t border-tan-100">
                      {/* Floor list */}
                      {factory.floors?.length > 0 ? (
                        <div className="divide-y divide-tan-100/60">
                          {factory.floors.map((fl) => (
                            <div key={fl.id} className="flex items-center justify-between px-4 py-3 bg-cream-100/50">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-beige-100 flex items-center justify-center">
                                  <Layers className="w-3.5 h-3.5 text-sage-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-sage-700">{fl.floor_name}</p>
                                  <p className="text-xs text-sage-400">Order: {fl.sort_order}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteFloor(fl.id)}
                                className="p-2 rounded-lg text-sage-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-xs text-sage-400">No floors yet</p>
                        </div>
                      )}

                      {/* Add floor form */}
                      <div className="px-4 py-3 bg-beige-50/50 border-t border-tan-100">
                        <p className="text-xs font-semibold text-sage-600 mb-2.5 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Add Floor
                        </p>
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleAddFloor(factory.factory_code); }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            placeholder="Floor name"
                            value={floorForm[factory.factory_code]?.name || ""}
                            onChange={(e) => setFloorForm((f) => ({
                              ...f,
                              [factory.factory_code]: { ...(f[factory.factory_code] || {}), name: e.target.value }
                            }))}
                            className="flex-1 border border-tan-100 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 transition"
                          />
                          <input
                            type="number"
                            placeholder="Order"
                            value={floorForm[factory.factory_code]?.order || ""}
                            onChange={(e) => setFloorForm((f) => ({
                              ...f,
                              [factory.factory_code]: { ...(f[factory.factory_code] || {}), order: e.target.value }
                            }))}
                            className="w-16 border border-tan-100 bg-white rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sage-300 transition"
                          />
                          <button
                            type="submit"
                            className="flex items-center gap-1 bg-sage-500 hover:bg-sage-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Collapsed floor count badge */}
                  {!isExpanded && !isEditing && factory.floors?.length > 0 && (
                    <div
                      className="px-4 pb-3 -mt-1 cursor-pointer"
                      onClick={() => setExpandedFactory(factory.id)}
                    >
                      <span className="inline-flex items-center gap-1 text-xs text-sage-500 bg-beige-50 px-2 py-1 rounded-lg">
                        <Layers className="w-3 h-3" />
                        {factory.floors.length} floor{factory.floors.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
