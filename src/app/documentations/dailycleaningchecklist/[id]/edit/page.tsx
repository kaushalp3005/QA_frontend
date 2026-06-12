"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DailyCleaningTypeForm from "@/components/forms/DailyCleaningTypeForm";
import { docsApi } from "@/lib/api/documentations";
import { normalizeDCC, getTabDef, type DCCTabDef, type DCCFloor } from "@/lib/dailyCleaning";

export default function EditDailyCleaningChecklist() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<DCCTabDef | null>(null);
  const [initialMonth, setInitialMonth] = useState("");
  const [initialFloors, setInitialFloors] = useState<DCCFloor[]>([]);

  useEffect(() => {
    docsApi
      .get("dailycleaningchecklist", id)
      .then((res) => {
        const n = normalizeDCC(res.data);
        const def = getTabDef(n.tabCode);
        setMeta({
          key: n.tabCode,
          label: n.title,
          title: n.title,
          documentNo: n.documentNo,
          issueDate: n.issueDate,
          issueNo: n.issueNo,
          revDate: n.revDate,
          revNo: n.revNo,
          defaultArea: def?.defaultArea,
          parameters: n.parameters,
        });
        setInitialMonth(n.month);
        setInitialFloors(n.floors);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (payload: Record<string, unknown>) => {
    await docsApi.update("dailycleaningchecklist", id, payload);
    router.push(`/documentations/dailycleaningchecklist/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-ink-400">Loading record…</p>
        </div>
      </div>
    );
  }

  if (notFound || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-danger-600 font-semibold">Record not found.</p>
      </div>
    );
  }

  return (
    <DocFormShell
      title={`Edit: ${meta.title}`}
      docNo={meta.documentNo}
      subtitle="Daily Cleaning Checklist — Edit Mode"
      icon={Sparkles}
      width="full"
    >
      <DailyCleaningTypeForm
        meta={meta}
        initialMonth={initialMonth}
        initialFloors={initialFloors}
        monthReadOnly
        isEdit
        onSubmit={handleUpdate}
      />
    </DocFormShell>
  );
}
