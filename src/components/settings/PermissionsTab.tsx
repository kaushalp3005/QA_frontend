"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  QcUser,
  Permission,
  listQcUsers,
  getUserPermissions,
  setUserPermissions,
} from "@/lib/api/settings";
import {
  QC_MODULES,
  PERMISSION_FLAGS,
  PERMISSION_LABELS,
  PermissionFlag,
} from "@/lib/constants/modules";

type Grid = Record<string, Record<PermissionFlag, boolean>>;
// grid[module][flag] = boolean

function emptyGrid(): Grid {
  const g: Grid = {};
  for (const m of QC_MODULES) {
    g[m.code] = {
      can_access: false,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
  }
  return g;
}

function fromPermissions(perms: Permission[]): Grid {
  const g = emptyGrid();
  for (const p of perms) {
    if (!g[p.module_code]) continue;
    g[p.module_code] = {
      can_access: p.can_access,
      can_view: p.can_view,
      can_create: p.can_create,
      can_edit: p.can_edit,
      can_delete: p.can_delete,
    };
  }
  return g;
}

function toPermissions(g: Grid): Permission[] {
  return QC_MODULES.map((m) => ({
    module_code: m.code,
    ...g[m.code],
  }));
}

export default function PermissionsTab() {
  const [users, setUsers] = useState<QcUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await listQcUsers();
        setUsers(list);
      } catch (e: any) {
        setError(e.response?.data?.detail || e.message || "Failed to load users");
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const perms = await getUserPermissions(selectedId);
        setGrid(fromPermissions(perms));
      } catch (e: any) {
        setError(e.response?.data?.detail || e.message || "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  function toggle(module: string, flag: PermissionFlag) {
    setGrid((g) => ({
      ...g,
      [module]: {
        ...g[module],
        [flag]: !g[module][flag],
      },
    }));
  }

  function toggleRow(module: string) {
    setGrid((g) => {
      const current = g[module];
      const allChecked = PERMISSION_FLAGS.every((f) => current[f]);
      const next = !allChecked;
      const updated: Record<PermissionFlag, boolean> = { ...current };
      for (const f of PERMISSION_FLAGS) updated[f] = next;
      return {
        ...g,
        [module]: updated,
      };
    });
  }

  async function handleSave() {
    if (selectedId == null) return;
    setSaving(true);
    setError("");
    try {
      await setUserPermissions(selectedId, toPermissions(grid));
      alert("Permissions saved");
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-sage-800">Module Permissions</h2>
          <p className="text-xs text-sage-500">Assign per-user module access (qc_module_permissions)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="border border-tan-100 bg-cream-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 min-w-[220px]"
          >
            <option value="">-- Select User --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={selectedId == null || saving}
            className="flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      {selectedId == null ? (
        <div className="bg-white rounded-2xl border border-tan-100 shadow-sm p-10 text-center text-sage-500 text-sm">
          Select a user to edit their permissions.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-tan-100 shadow-sm p-10 text-center text-sage-500 text-sm">
          Loading…
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-50 border-b border-tan-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-sage-600 uppercase">
                    Module
                  </th>
                  {PERMISSION_FLAGS.map((f) => (
                    <th
                      key={f}
                      className="px-4 py-2.5 text-center text-xs font-semibold text-sage-600 uppercase"
                    >
                      {PERMISSION_LABELS[f]}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-sage-600 uppercase">
                    All
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tan-100">
                {QC_MODULES.map((m) => {
                  const allChecked = PERMISSION_FLAGS.every(
                    (f) => grid[m.code][f]
                  );
                  return (
                    <tr key={m.code} className="hover:bg-cream-100">
                      <td className="px-4 py-2.5 text-sm text-sage-800 font-medium">
                        {m.label}
                      </td>
                      {PERMISSION_FLAGS.map((f) => (
                        <td key={f} className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={grid[m.code][f]}
                            onChange={() => toggle(m.code, f)}
                            className="w-4 h-4 accent-sage-500 cursor-pointer"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRow(m.code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            allChecked
                              ? "bg-sage-500 text-white hover:bg-sage-600"
                              : "bg-beige-100 text-sage-700 hover:bg-beige-200"
                          }`}
                        >
                          {allChecked ? "Clear" : "Select All"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
