"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import IPQCForm from "@/components/IPQCForm";
import { ipqc } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { Session, IPQCRecord } from "@/types";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";

function NewIPQCContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFrom = searchParams.get("from");

  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [cloneData, setCloneData] = useState<IPQCRecord | null>(null);
  // Block the form from mounting until the source record is loaded — IPQCForm
  // reads initialData only on mount, so it must be ready first.
  const [cloneLoading, setCloneLoading] = useState(!!cloneFrom);
  const [cloneError, setCloneError] = useState(false);

  useEffect(() => {
    if (!getSession()) router.push("/");
  }, [router]);

  useEffect(() => {
    if (!cloneFrom) return;
    let cancelled = false;
    setCloneLoading(true);
    setCloneError(false);
    ipqc
      .get(cloneFrom, getStoredWarehouse())
      .then((rec) => {
        if (cancelled) return;
        // Copy everything, but strip identity + approval so this becomes a
        // fresh, pending record dated today (a new number is assigned on save).
        const {
          ipqc_no: _ipqcNo,
          approved_by: _approvedBy,
          verified_by: _verifiedBy,
          approved_at: _approvedAt,
          created_at: _createdAt,
          ...rest
        } = rec as any;
        setCloneData({
          ...rest,
          check_date: new Date().toISOString().slice(0, 10),
        });
      })
      .catch(() => {
        if (!cancelled) setCloneError(true);
      })
      .finally(() => {
        if (!cancelled) setCloneLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cloneFrom]);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const user = getSession() as Session;
      const res = await ipqc.create({
        ...data,
        checked_by: data.checked_by || user?.displayName,
      });
      setCreated(res.ipqc_no);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="min-h-[100dvh] bg-cream-100">
        <Navbar showBack backHref="/documentations/ipqc" title="New Entry" />
        <div className="flex flex-col items-center justify-center min-h-[70dvh] px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-success-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-sage-800 mb-1">Record Created</p>
            <p className="text-sm text-sage-500">{created}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mt-2">
            <button
              onClick={() => router.push(`/documentations/ipqc/view?id=${created}`)}
              className="flex-1 bg-sage-500 hover:bg-sage-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              View Record
            </button>
            <button
              onClick={() => router.push("/documentations/ipqc")}
              className="flex-1 border border-tan-200 bg-white text-sage-700 py-3 rounded-xl text-sm font-semibold hover:bg-beige-50 transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-cream-100">
      <Navbar
        showBack
        backHref="/documentations/ipqc"
        title={cloneFrom ? "Re-check Entry" : "New Entry"}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28">
        {cloneFrom && cloneData && (
          <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            <Copy className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Pre-filled from <span className="font-bold font-mono">{cloneFrom}</span>. Review the
              details (update batch / values as needed) and save to create a new record.
            </span>
          </div>
        )}

        {cloneError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            Couldn&apos;t load <span className="font-mono font-semibold">{cloneFrom}</span> to copy
            from. Starting a blank entry instead.
          </div>
        )}

        {cloneLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">Loading {cloneFrom} to copy…</span>
          </div>
        ) : (
          <IPQCForm
            initialData={cloneData ?? undefined}
            onSubmit={handleSubmit}
            loading={loading}
            /*useAllSkuDropdown*/
          />
        )}
      </div>
    </div>
  );
}

export default function NewIPQCPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-cream-100">
          <Navbar showBack backHref="/documentations/ipqc" title="New Entry" />
          <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-3 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">Loading…</span>
          </div>
        </div>
      }
    >
      <NewIPQCContent />
    </Suspense>
  );
}
