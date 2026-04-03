"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import IPQCForm from "@/components/IPQCForm";
import { ipqc } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Session } from "@/types";
import { CheckCircle2 } from "lucide-react";

export default function NewIPQCPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.push("/");
  }, [router]);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const user = getSession() as Session;
      const res = await ipqc.create({ ...data, checked_by: user?.displayName });
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
      <Navbar showBack backHref="/documentations/ipqc" title="New Entry" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28">
        <IPQCForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
