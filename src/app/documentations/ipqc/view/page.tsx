"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import IPQCForm from "@/components/IPQCForm";
import IPQCPrint from "@/components/IPQCPrint";
import { ipqc } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Session, IPQCRecord } from "@/types";

function ViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ipqcNo = searchParams.get("id");

  const [record, setRecord] = useState<IPQCRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  const session = getSession() as Session | null;
  const isAdmin = session?.isAdmin;

  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }
    if (!ipqcNo) {
      setLoading(false);
      return;
    }
    ipqc
      .get(ipqcNo)
      .then(setRecord)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ipqcNo, router]);

  async function handleUpdate(data: any) {
    setSaving(true);
    try {
      const res = await ipqc.update(ipqcNo!, data);
      setRecord(res);
      alert("Record updated");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setError("");
    setApproving(true);
    try {
      const res = await ipqc.approve(ipqcNo!);
      setRecord(res);
      alert(`Approved by ${res.approved_by}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center py-12 text-gray-400">
          <svg className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (!ipqcNo || !record) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          Record not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800">IPQC: {record.ipqc_no}</h1>
        <div className="flex flex-wrap gap-2">
          {record.approved_by ? (
            <span className="text-sm text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl font-medium">
              Approved by {record.approved_by} on {record.approved_at?.slice(0, 16)}
            </span>
          ) : isAdmin ? (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              {approving ? "Approving..." : "Approve"}
            </button>
          ) : null}
          <IPQCPrint record={record} />
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Back
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <div className="mb-4 text-sm text-gray-400">
        Checked by: {record.checked_by || "-"} &nbsp;|&nbsp; Created: {record.created_at?.slice(0, 16)}
      </div>

      <IPQCForm initialData={record} onSubmit={handleUpdate} loading={saving} isAdmin={isAdmin} />
    </div>
  );
}

export default function ViewIPQCPage() {
  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <Navbar />
      <Suspense fallback={
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center py-12 text-gray-400">
            <svg className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        </div>
      }>
        <ViewContent />
      </Suspense>
    </div>
  );
}
