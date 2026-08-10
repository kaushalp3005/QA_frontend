"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Users } from "lucide-react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { trainingApi, type CardMatch } from "@/lib/api/training";
import { Pill, percentTone, resultTone, scoreTone, statusTone } from "@/components/training/FormShell";

/**
 * The "Attendees, Evaluation & Effectiveness" grid, rendered read-only for the
 * list page's expand-a-row panel. Mirrors the section of the same name on
 * CFPLA.C7.F.03 so an expanded row reads like the form it came from.
 */

interface AttendeeRecord {
  name?: string | null;
  designation?: string | null;
  evaluation_method?: string[] | string | null;
  evaluation_scoring?: number | string | null;
  evaluation_result?: string | null;
  effectiveness_method?: string[] | string | null;
  effectiveness_scoring?: number | string | null;
  effectiveness_result?: string | null;
  average_scoring?: number | string | null;
  training_status?: string | null;
}

const text = (v: unknown): string => {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v);
};

const Dash = () => <span className="text-ink-300">—</span>;

const Cell = ({ value }: { value: unknown }) => {
  const s = text(value);
  return <>{s ? s : <Dash />}</>;
};

const Score = ({ value, suffix = " / 5" }: { value: unknown; suffix?: string }) => {
  const s = text(value);
  if (!s) return <Dash />;
  return <Pill tone={scoreTone(s)}>{s}{suffix}</Pill>;
};

/** The average of the two marks — carried as a percentage of 5, not a /5 mark. */
const AveragePercent = ({ value }: { value: unknown }) => {
  const s = text(value);
  if (!s) return <Dash />;
  return <Pill tone={percentTone(s)}>{s}%</Pill>;
};

const Result = ({ value }: { value: unknown }) => {
  const s = text(value);
  if (!s) return <Dash />;
  return <Pill tone={resultTone(s)}>{s}</Pill>;
};

const th = "px-3 py-2 text-left font-semibold text-[10px] tracking-wider uppercase text-ink-400 whitespace-nowrap";
const td = "px-3 py-2 text-ink-600 align-middle";

export default function AttendanceExpandedPanel({ record }: { record: Record<string, any> }) {
  const router = useRouter();
  const attendees: AttendeeRecord[] = Array.isArray(record?.attendees) ? record.attendees : [];

  // Which attendee row is mid-resolve, and the chooser shown when the answer is
  // ambiguous. Keyed by row index — attendee names on one sheet may repeat.
  const [resolving, setResolving] = useState<number | null>(null);
  const [chooser, setChooser] = useState<
    { index: number; name: string; designation: string; options: CardMatch[]; note: string | null } | null
  >(null);

  const sheetId: number | null = Number.isFinite(Number(record?.id)) ? Number(record.id) : null;

  /** Open an existing card, carrying the clicked session with us. */
  const openCard = (cardId: number) => {
    const suffix = sheetId ? `?add_attendance=${sheetId}` : "";
    router.push(`/training/training-card/${cardId}/edit${suffix}`);
  };

  /** Open a blank card prefilled with this attendee's identity and session. */
  const openNewCard = (name: string, designation: string) => {
    const params = new URLSearchParams({ employee_name: name });
    if (designation) params.set("designation", designation);
    if (sheetId) params.set("add_attendance", String(sheetId));
    router.push(`/training/training-card/create?${params}`);
  };

  /**
   * Find this attendee's training card and go to it — creating one only when
   * none exists, so a second session appends to the same card instead of
   * spawning a duplicate. Ambiguity is handed to the user, never guessed.
   */
  const goToCard = async (attendee: AttendeeRecord, index: number) => {
    const name = text(attendee.name).trim();
    if (!name) return;
    const designation = text(attendee.designation).trim();

    setResolving(index);
    setChooser(null);
    try {
      const res = await trainingApi.findCardForEmployee(
        name,
        designation,
        record?.warehouse ?? getStoredWarehouse()
      );
      if (res.matches.length === 1 && res.others.length === 0) {
        openCard(res.matches[0].card_id);
        return;
      }
      if (res.matches.length === 0 && res.others.length === 0) {
        openNewCard(name, designation);
        return;
      }
      setChooser({
        index,
        name,
        designation,
        options: [...res.matches, ...res.others],
        note:
          res.matches.length === 0
            ? "A card exists under this name but with a different designation — probably a different person."
            : "More than one card matches this employee. Pick the right one.",
      });
    } catch (e: any) {
      // The lookup is a convenience; never let it block making a card.
      console.error("Training card lookup failed:", e);
      setChooser({
        index,
        name,
        designation,
        options: [],
        note: `Couldn't check for an existing card (${e.message}). Creating a new one will not merge with an old card.`,
      });
    } finally {
      setResolving(null);
    }
  };

  if (attendees.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-ink-400 italic">
        No attendees recorded on this sheet.
      </p>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-ink-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Attendees, Evaluation &amp; Effectiveness
        </span>
        <span className="text-[11px] text-ink-300">· {attendees.length}</span>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-xs">
            <thead className="bg-cream-100/70">
              <tr className="border-b border-cream-300">
                <th className={`${th} w-10`} rowSpan={2}>Sr.</th>
                <th className={`${th} min-w-[250px]`} rowSpan={2}>Name</th>
                <th className={`${th} min-w-[130px]`} rowSpan={2}>Designation</th>
                <th className={`${th} border-l border-cream-300 text-center`} colSpan={3}>Evaluation</th>
                <th className={`${th} border-l border-cream-300 text-center`} colSpan={3}>Effectiveness</th>
                <th className={`${th} border-l border-cream-300 text-center`} rowSpan={2}>Avg %</th>
                <th className={`${th} text-center`} rowSpan={2}>Status</th>
              </tr>
              <tr className="border-b border-cream-300">
                <th className={`${th} border-l border-cream-300`}>Method</th>
                <th className={`${th} text-center`}>Score</th>
                <th className={`${th} text-center`}>Result</th>
                <th className={`${th} border-l border-cream-300`}>Method</th>
                <th className={`${th} text-center`}>Score</th>
                <th className={`${th} text-center`}>Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {attendees.map((a, i) => (
                <Fragment key={i}>
                <tr className="hover:bg-cream-100/60 transition-colors">
                  <td className={`${td} text-ink-400 font-medium`}>{i + 1}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold"><Cell value={a.name} /></span>
                      {text(a.name) && (
                        <button
                          type="button"
                          onClick={() => goToCard(a, i)}
                          disabled={resolving !== null}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 hover:bg-brand-100 hover:border-brand-500 transition-colors disabled:opacity-50"
                          title={`Open ${text(a.name)}'s training card and add this session`}
                        >
                          {resolving === i
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CreditCard className="w-3 h-3" />}
                          Training Card
                        </button>
                      )}
                    </div>
                  </td>
                  <td className={td}><Cell value={a.designation} /></td>
                  <td className={`${td} border-l border-cream-200`}><Cell value={a.evaluation_method} /></td>
                  <td className={`${td} text-center`}><Score value={a.evaluation_scoring} /></td>
                  <td className={`${td} text-center`}><Result value={a.evaluation_result} /></td>
                  <td className={`${td} border-l border-cream-200`}><Cell value={a.effectiveness_method} /></td>
                  <td className={`${td} text-center`}><Score value={a.effectiveness_scoring} /></td>
                  <td className={`${td} text-center`}><Result value={a.effectiveness_result} /></td>
                  <td className={`${td} border-l border-cream-200 text-center`}><AveragePercent value={a.average_scoring} /></td>
                  <td className={`${td} text-center`}>
                    {a.training_status
                      ? <Pill tone={statusTone(String(a.training_status))}>{a.training_status}</Pill>
                      : <Dash />}
                  </td>
                </tr>
                {chooser?.index === i && (
                  <tr key={`chooser-${i}`}>
                    <td colSpan={11} className="bg-cream-100/70 px-3 py-3">
                      <p className="mb-2 text-[11px] font-semibold text-ink-500">{chooser.note}</p>
                      <div className="flex flex-wrap gap-2">
                        {chooser.options.map((c) => (
                          <button
                            key={c.card_id}
                            type="button"
                            onClick={() => openCard(c.card_id)}
                            className="rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-left text-[11px] hover:border-brand-500 transition-colors"
                          >
                            <span className="font-semibold text-ink-600">
                              {c.employee_name || "(no name)"}
                            </span>
                            <span className="text-ink-400">
                              {" "}· {c.designation || "no designation"} · {c.row_count} row
                              {c.row_count === 1 ? "" : "s"} · card #{c.card_id}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => openNewCard(chooser.name, chooser.designation)}
                          className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-brand-100 transition-colors"
                        >
                          Create a new card instead
                        </button>
                        <button
                          type="button"
                          onClick={() => setChooser(null)}
                          className="rounded-lg px-2.5 py-1.5 text-[11px] text-ink-400 hover:text-ink-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
