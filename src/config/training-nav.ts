import {
  ClipboardList,
  // HardHat, // unused — Training Attendance (Workers) is disabled
  BookMarked,
  Star,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type TrainingTone = "brand" | "warning" | "ink";

export interface TrainingNavEntry {
  href: string;
  title: string;
  /** Compact label for the side nav, where the full title wraps badly */
  shortTitle: string;
  docNo: string;
  description: string;
  icon: LucideIcon;
  tone: TrainingTone;
}

/** Single source of truth for the /training hub cards and the side nav. */
export const TRAINING_PAGES: TrainingNavEntry[] = [
  {
    href: "/training/attendance-sheet",
    title: "Training Attendance Sheet",
    shortTitle: "Attendance Sheet",
    docNo: "CFPLA.C7.F.03",
    description: "Main attendance sheet with evaluation & effectiveness tracking for staff",
    icon: ClipboardList,
    tone: "brand",
  },
  // Hidden — Training Attendance (Workers) section disabled
  // {
  //   href: "/training/attendance-workers",
  //   title: "Training Attendance (Workers)",
  //   shortTitle: "Attendance (Workers)",
  //   docNo: "CFPLA.C7.F.03",
  //   description: "Simplified attendance & evaluation record specifically for workers",
  //   icon: HardHat,
  //   tone: "warning",
  // },
  {
    href: "/training/reference-sheet",
    title: "Reference Material Sheet",
    shortTitle: "Reference Material",
    docNo: "CFPLA.C7.F.03i",
    description: "Reference material & record for evaluation/effectiveness basis",
    icon: BookMarked,
    tone: "ink",
  },
  {
    href: "/training/feedback",
    title: "Trainee & Trainer Feedback",
    shortTitle: "Feedback",
    docNo: "CFPLA.C7.F.03j",
    description: "Feedback record with 1-5 rating on training parameters",
    icon: Star,
    tone: "warning",
  },
  {
    href: "/training/training-card",
    title: "Employee Training Card",
    shortTitle: "Training Card",
    docNo: "CFPLA.C7.F.03k",
    description: "Individual employee training history card with topic tracking",
    icon: CreditCard,
    tone: "brand",
  },
];

export const toneClass = (tone: TrainingTone) => {
  if (tone === "warning") return "bg-warning-500";
  if (tone === "ink") return "bg-ink-600";
  return "bg-brand-500";
};
