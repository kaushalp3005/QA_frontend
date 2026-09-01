"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import IPQCForm from "@/components/IPQCForm";
import { ipqc } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { Session, IPQCRecord } from "@/types";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

function NewIPQCContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFrom = searchParams.get("from");

  const [loading, setLoading] = useState(false);
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
          // A re-check happens at a new time as well as a new date, so the
          // source record's time must not carry over — IPQCForm then falls
          // through to now, matching how check_date is reset below.
          check_time: _checkTime,
          ...rest
        } = rec as any;
        setCloneData({
          ...rest,
          check_date: new Date().toISOString().slice(0, 10),
          // Each article carries its own time now, so stripping the record-level
          // one is not enough — clear them per article too, or every copied
          // article would claim it was checked at the original's hour.
          articles: (rest.articles || []).map((a: any) => {
            const { check_time: _articleTime, ...art } = a;
            return art;
          }),
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
      // The record number is assigned server-side, and this toast is now the
      // only place it surfaces — it replaces the interstitial success screen.
      toast.success(`IPQC record ${res.ipqc_no} created`);
      // replace, not push: Back should return to wherever the user came from,
      // never to a form they have already submitted.
      router.replace("/documentations/ipqc");
      // `loading` is deliberately left true. The save button stays disabled for
      // the moment it takes to route away, so a double-tap cannot create a
      // second record.
    } catch (err: any) {
      toast.error(err.message || "Could not create the record");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-cream-100">
      <Navbar
        showBack
        backHref="/documentations/ipqc"
        title={cloneFrom ? "Re-check Entry" : "New Entry"}
      />
      {/* Extra bottom padding only below sm, where the save bar is fixed over the page. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-8">
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
