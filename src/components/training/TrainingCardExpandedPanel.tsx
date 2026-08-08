"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { formatDateShort } from "@/lib/date-utils";

/**
 * The "Training History" grid, rendered read-only for the list page's
 * expand-a-row panel and the detail page's `rows` field. Mirrors the section of
 * the same name on CFPLA.C7.F.03k so an expanded row reads like the form it
 * came from — the same idea as AttendanceExpandedPanel next door.
 */

interface TrainingRow {
  date?: string | null;
  total_hours?: number | string | null;
  topics_covered?: string | null;
  trainer?: string | null;
  acknowledgement?: string | null;
  source_attendance_id?: number | string | null;
}

const text = (v: unknown): string => {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v).trim();
};

const Dash = () => <span className="text-ink-300">—</span>;

const Cell = ({ value }: { value: unknown }) => {
  const s = text(value);
  return <>{s ? s : <Dash />}</>;
};

const th =
  "px-3 py-2 text-left font-semibold text-[10px] tracking-wider uppercase text-ink-400 whitespace-nowrap";
const td = "px-3 py-2 text-ink-600 align-middle";

export default function TrainingCardExpandedPanel({
  record,
}: {
  record: Record<string, any>;
}) {
  const rows: TrainingRow[] = Array.isArray(record?.rows) ? record.rows : [];

  if (rows.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-ink-400 italic">
        No training sessions recorded on this card.
      </p>
    );
  }

  // Hours are entered per session (0.48, 1, …); the running total is the one
  // number a reviewer actually wants off this card, so surface it in the header
  // rather than making them add the column up.
  const totalHours = rows.reduce((sum, r) => {
    const n = Number(r.total_hours);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-ink-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Training History
        </span>
        <span className="text-[11px] text-ink-300">
          · {rows.length} {rows.length === 1 ? "entry" : "entries"}
          {totalHours > 0 && ` · ${+totalHours.toFixed(2)} h total`}
        </span>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-cream-100/70">
              <tr className="border-b border-cream-300">
                <th className={`${th} w-10`}>Sr.</th>
                <th className={`${th} min-w-[110px]`}>Date</th>
                <th className={`${th} text-center`}>Hours</th>
                <th className={`${th} min-w-[260px]`}>Training Topics Covered</th>
                <th className={`${th} min-w-[140px]`}>Trainer</th>
                <th className={`${th} min-w-[120px]`}>Acknowledgment</th>
                <th className={`${th} text-center`}>Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-cream-100/60 transition-colors">
                  <td className={`${td} text-ink-400 font-medium`}>{i + 1}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {text(r.date) ? formatDateShort(r.date) : <Dash />}
                  </td>
                  <td className={`${td} text-center tabular-nums`}>
                    <Cell value={r.total_hours} />
                  </td>
                  <td className={`${td} font-medium`}>
                    <Cell value={r.topics_covered} />
                  </td>
                  <td className={td}>
                    <Cell value={r.trainer} />
                  </td>
                  <td className={td}>
                    <Cell value={r.acknowledgement} />
                  </td>
                  <td className={`${td} text-center`}>
                    {r.source_attendance_id ? (
                      <Link
                        href={`/training/attendance-sheet/${r.source_attendance_id}`}
                        title="Open the attendance sheet this row came from"
                        className="font-mono text-[10px] font-semibold text-brand-500 hover:underline"
                      >
                        F.03 #{r.source_attendance_id}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-ink-300">Manual</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
