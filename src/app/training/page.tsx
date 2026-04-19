"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Search,
  ClipboardList,
  HardHat,
  BookMarked,
  Star,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  FileText,
} from "lucide-react";
import WarehouseSelector from "@/components/ui/WarehouseSelector";
import PageHeader from "@/components/ui/PageHeader";

/*
 * ============================================================
 * NEXT.JS FOLDER STRUCTURE FOR /training ROUTES
 * ============================================================
 *
 * Place files in your Next.js app directory like this:
 *
 * app/
 * └── training/
 *     ├── page.tsx                          ← THIS FILE (index/hub page)
 *     ├── layout.tsx                        ← Optional: shared layout with sidebar nav
 *     │
 *     ├── attendance-sheet/
 *     │   └── page.tsx                      ← Import from CFPLA_C7_F_03_TrainingAttendanceSheet.tsx
 *     │
 *     ├── attendance-workers/
 *     │   └── page.tsx                      ← Import { TrainingAttendanceWorkers } from CFPLA_C7_F_03_TrainingSubForms.tsx
 *     │
 *     ├── reference-sheet/
 *     │   └── page.tsx                      ← Import { TrainingReferenceSheet } from CFPLA_C7_F_03_TrainingSubForms.tsx
 *     │
 *     ├── feedback/
 *     │   └── page.tsx                      ← Import { TrainingFeedbackRecord } from CFPLA_C7_F_03_TrainingSubForms.tsx
 *     │
 *     └── training-card/
 *         └── page.tsx                      ← Import { EmployeeTrainingCard } from CFPLA_C7_F_03_TrainingSubForms.tsx
 *
 * ============================================================
 * EXAMPLE: How to use in each sub-route page.tsx
 * ============================================================
 *
 * // app/training/attendance-sheet/page.tsx
 * import TrainingAttendanceSheet from "@/components/forms/CFPLA_C7_F_03_TrainingAttendanceSheet";
 * export default function Page() { return <TrainingAttendanceSheet />; }
 *
 * // app/training/attendance-workers/page.tsx
 * import { TrainingAttendanceWorkers } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
 * export default function Page() { return <TrainingAttendanceWorkers />; }
 *
 * // app/training/reference-sheet/page.tsx
 * import { TrainingReferenceSheet } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
 * export default function Page() { return <TrainingReferenceSheet />; }
 *
 * // app/training/feedback/page.tsx
 * import { TrainingFeedbackRecord } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
 * export default function Page() { return <TrainingFeedbackRecord />; }
 *
 * // app/training/training-card/page.tsx
 * import { EmployeeTrainingCard } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
 * export default function Page() { return <EmployeeTrainingCard />; }
 *
 * ============================================================
 */

const TRAINING_PAGES = [
  {
    href: "/training/attendance-sheet",
    title: "Training Attendance Sheet",
    docNo: "CFPLA.C7.F.03",
    description: "Main attendance sheet with evaluation & effectiveness tracking for staff",
    icon: ClipboardList,
    tone: "brand" as const,
  },
  {
    href: "/training/attendance-workers",
    title: "Training Attendance (Workers)",
    docNo: "CFPLA.C7.F.03",
    description: "Simplified attendance & evaluation record specifically for workers",
    icon: HardHat,
    tone: "warning" as const,
  },
  {
    href: "/training/reference-sheet",
    title: "Reference Material Sheet",
    docNo: "CFPLA.C7.F.03i",
    description: "Reference material & record for evaluation/effectiveness basis",
    icon: BookMarked,
    tone: "ink" as const,
  },
  {
    href: "/training/feedback",
    title: "Trainee & Trainer Feedback",
    docNo: "CFPLA.C7.F.03j",
    description: "Feedback record with 1-5 rating on training parameters",
    icon: Star,
    tone: "warning" as const,
  },
  {
    href: "/training/training-card",
    title: "Employee Training Card",
    docNo: "CFPLA.C7.F.03k",
    description: "Individual employee training history card with topic tracking",
    icon: CreditCard,
    tone: "brand" as const,
  },
];

const toneClass = (tone: "brand" | "warning" | "ink") => {
  if (tone === "warning") return "bg-warning-500";
  if (tone === "ink") return "bg-ink-600";
  return "bg-brand-500";
};

export default function TrainingIndexPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TRAINING_PAGES;
    return TRAINING_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.docNo.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-ink-500 hover:text-ink-700 hover:bg-cream-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <PageHeader
          title="Training Management"
          subtitle="Candor Foods Private Limited — Training Records & Documentation"
          icon={GraduationCap}
          actions={<WarehouseSelector />}
        />

        {/* Search */}
        <div className="surface-card p-4 mb-6 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search training forms..."
              className="input-base pl-10 w-full"
            />
          </div>
        </div>

        {/* Navigation Cards */}
        {filtered.length === 0 ? (
          <div className="surface-card p-12 flex flex-col items-center text-center animate-fade-in">
            <div className="bg-cream-200 w-16 h-16 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-ink-300" />
            </div>
            <p className="text-sm font-semibold text-ink-500">No training forms found</p>
            <p className="text-xs text-ink-400 mt-0.5">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((page, i) => {
              const Icon = page.icon;
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className="surface-card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all cursor-pointer animate-fade-in-up group block"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-11 h-11 rounded-xl ${toneClass(page.tone)} text-white flex items-center justify-center shadow-soft`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-bold text-ink-600 line-clamp-2">{page.title}</h2>
                      <p className="text-[11px] text-ink-400 font-medium mt-0.5 font-mono">{page.docNo}</p>
                      <p className="text-xs text-ink-500 mt-2 line-clamp-2">{page.description}</p>
                      <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-brand-500 group-hover:gap-2 transition-all">
                        Open form
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 surface-card p-5 animate-fade-in">
          <h3 className="text-sm font-bold text-ink-600 mb-3">Quick Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-cream-100 border border-cream-300 p-4 text-center">
              <p className="text-2xl font-bold text-brand-500">{TRAINING_PAGES.length}</p>
              <p className="text-xs text-ink-400 font-medium mt-0.5">Training Forms</p>
            </div>
            <div className="rounded-xl bg-cream-100 border border-cream-300 p-4 text-center">
              <p className="text-2xl font-bold text-success-700">&ge;80%</p>
              <p className="text-xs text-ink-400 font-medium mt-0.5">Effective Threshold</p>
            </div>
            <div className="rounded-xl bg-cream-100 border border-cream-300 p-4 text-center">
              <p className="text-2xl font-bold text-warning-700">&lt;60%</p>
              <p className="text-xs text-ink-400 font-medium mt-0.5">Retraining Required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
