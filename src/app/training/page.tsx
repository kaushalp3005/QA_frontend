"use client";
import Link from "next/link";
import WarehouseSelector from "@/components/ui/WarehouseSelector";

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
    icon: "📋",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
  },
  {
    href: "/training/attendance-workers",
    title: "Training Attendance (Workers)",
    docNo: "CFPLA.C7.F.03",
    description: "Simplified attendance & evaluation record specifically for workers",
    icon: "👷",
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
  },
  {
    href: "/training/reference-sheet",
    title: "Reference Material Sheet",
    docNo: "CFPLA.C7.F.03i",
    description: "Reference material & record for evaluation/effectiveness basis",
    icon: "📚",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
  },
  {
    href: "/training/feedback",
    title: "Trainee & Trainer Feedback",
    docNo: "CFPLA.C7.F.03j",
    description: "Feedback record with 1-5 rating on training parameters",
    icon: "⭐",
    color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
  },
  {
    href: "/training/training-card",
    title: "Employee Training Card",
    docNo: "CFPLA.C7.F.03k",
    description: "Individual employee training history card with topic tracking",
    icon: "🪪",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
  },
];

export default function TrainingIndexPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Management</h1>
            <p className="text-sm text-gray-500">Candor Foods Private Limited — Training Records & Documentation</p>
          </div>
        </div>
        <WarehouseSelector />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAINING_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={`block p-5 rounded-xl border-2 transition-all ${page.color} group`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{page.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{page.title}</h2>
                  <span className="text-xs text-gray-400 font-mono">{page.docNo}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{page.description}</p>
                <span className="inline-block mt-2 text-xs text-blue-600 font-medium group-hover:translate-x-1 transition-transform">Open form →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats placeholder */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Info</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-white rounded border">
            <p className="text-2xl font-bold text-blue-600">5</p>
            <p className="text-xs text-gray-500">Training Forms</p>
          </div>
          <div className="p-3 bg-white rounded border">
            <p className="text-2xl font-bold text-green-600">≥80%</p>
            <p className="text-xs text-gray-500">Effective Threshold</p>
          </div>
          <div className="p-3 bg-white rounded border">
            <p className="text-2xl font-bold text-orange-600">&lt;60%</p>
            <p className="text-xs text-gray-500">Retraining Required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
