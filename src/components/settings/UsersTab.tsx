"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, X } from "lucide-react";
import {
  QcUser,
  listQcUsers,
  createQcUser,
  resetQcUserPassword,
  deleteQcUser,
} from "@/lib/api/settings";

export default function UsersTab() {
  const [users, setUsers] = useState<QcUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<QcUser | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<QcUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers(await listQcUsers());
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    try {
      await createQcUser(newEmail.trim(), newPassword);
      setShowCreate(false);
      setNewEmail("");
      setNewPassword("");
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleReset() {
    if (!resetTarget || !resetPw) return;
    setResetting(true);
    try {
      await resetQcUserPassword(resetTarget.id, resetPw);
      setResetTarget(null);
      setResetPw("");
      alert("Password updated");
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQcUser(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sage-800">QC Users</h2>
          <p className="text-xs text-sage-500">Manage QA login accounts (qc_users table)</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-tan-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-sage-500 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-sage-500 text-sm">No users yet</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead className="bg-beige-50 border-b border-tan-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sage-600 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-sage-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tan-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-cream-100">
                  <td className="px-4 py-3 text-sm text-sage-800 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-sage-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setResetTarget(u)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-danger-600 hover:text-danger-800 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Create User" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-tan-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                placeholder="user@candorfoods.in"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-tan-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                placeholder="Minimum 4 characters"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl border border-tan-100 text-sm font-semibold text-sage-600 hover:bg-beige-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newEmail || !newPassword}
                className="flex-1 py-2.5 rounded-xl bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <Modal title={`Reset password for ${resetTarget.email}`} onClose={() => setResetTarget(null)}>
          <div className="space-y-3">
            <input
              type="text"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              className="w-full border border-tan-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
              placeholder="New password"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResetTarget(null)}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl border border-tan-100 text-sm font-semibold text-sage-600 hover:bg-beige-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || !resetPw}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {resetting ? "Saving…" : "Update Password"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-sage-700 mb-4">
            Delete <span className="font-semibold">{deleteTarget.email}</span>? This also removes all their module permissions.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border border-tan-100 text-sm font-semibold text-sage-600 hover:bg-beige-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-danger-600 hover:bg-danger-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-tan-100 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-sage-800">{title}</h3>
          <button onClick={onClose} className="text-sage-400 hover:text-sage-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
