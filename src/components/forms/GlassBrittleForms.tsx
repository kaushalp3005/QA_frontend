"use client";
/**
 * Glass and Brittle Check Record — the two plants keep differently laid-out,
 * separately controlled formats, so there are two forms behind one entry point:
 *
 *   W202  CFPLA.C4.F.48  yearly grid — every item of every floor is a row,
 *                        ticked month by month, signed off per month.
 *   A185  CFPLB.C4.F.59  monthly sheet — one block per area, four item types
 *                        each, with date / condition / remark / action / QC.
 *
 * Both save to doc_glass_brittle_check; see @/lib/glass-brittle for the shapes.
 *
 * Both can be saved part-filled with "Submit Partially" (status = "draft") and
 * finished later — the yearly sheet is filled a month at a time, and a monthly
 * round can take more than one sitting. The record is created on the first save
 * and updated on every save after, so repeated partial saves never pile up
 * duplicate records.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import {
  GLASS_DETAIL_TYPES,
  GLASS_ITEM_TYPES,
  glassBrittleDocMeta,
  glassBrittleFormatFor,
} from "@/config/glassBrittleAreas";
import {
  CHECKED_BY_OPTIONS,
  QC_VERIFIED_BY_OPTIONS,
  filterSignaturesByWarehouse,
  type SignatureOption,
  type WarehouseScope,
} from "@/lib/signatures";
import {
  GB_CROSS,
  GB_MONTHS,
  GB_TICK,
  gbConditionIsOk,
  gbEmptyMonths,
  gbGroup,
  gbHasItems,
  gbMonthDates,
  gbMonthlyRows,
  gbSeedMonthlyRows,
  gbSeedYearlyRows,
  gbSignoffs,
  gbYearlyRows,
  type GbMonth,
  type GbMonthlyRow,
  type GbMonthMap,
  type GbSignoff,
  type GbYearlyRow,
} from "@/lib/glass-brittle";

const FORM_TYPE = "glass-brittle-check";
const LIST_PATH = "/documentations/glass-brittle-check";

interface DocFormProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

interface PlantFormProps extends DocFormProps {
  warehouse: WarehouseScope;
}

/**
 * An edit keeps the record in its own plant — and so in its own layout — no
 * matter which plant the header selector is on. A new record (or a duplicate)
 * belongs to the selected plant.
 */
export function GlassBrittleCheckRecord(props: DocFormProps = {}) {
  const saved = props.initialData?.warehouse;
  const warehouse: WarehouseScope =
    props.isEdit && (saved === "A185" || saved === "W202") ? saved : getStoredWarehouse();
  return glassBrittleFormatFor(warehouse) === "monthly" ? (
    <GlassBrittleMonthlyForm {...props} warehouse={warehouse} />
  ) : (
    <GlassBrittleYearlyForm {...props} warehouse={warehouse} />
  );
}

export default GlassBrittleCheckRecord;

/* ───────────────────────────── shared pieces ───────────────────────────── */

/**
 * Signatory dropdown filtered to the record's plant. A saved name that isn't in
 * the list (an older free-text entry, or someone since removed) is kept as an
 * option — otherwise the <select> has nothing to match and shows blank.
 */
function SignSelect({
  value,
  onChange,
  options,
  warehouse,
  field,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SignatureOption[];
  warehouse: WarehouseScope;
  /** Full-height field, to sit beside `input-base` inputs. */
  field?: boolean;
  label: string;
}) {
  const visible = filterSignaturesByWarehouse(options, warehouse).filter((o) => o.name !== "Other");
  const keepSaved = value !== "" && !visible.some((o) => o.name === value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      title={value || label}
      className={
        field
          ? "input-base sm:w-48"
          : "w-full min-w-[130px] text-xs px-1.5 py-1 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
      }
    >
      <option value="">—</option>
      {keepSaved && <option value={value}>{value}</option>}
      {visible.map((o) => (
        <option key={o.name} value={o.name}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function FormHeader({ warehouse, children }: { warehouse: WarehouseScope; children: React.ReactNode }) {
  const doc = glassBrittleDocMeta(warehouse);
  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-ink-600 leading-tight">{doc.title}</h1>
          <p className="text-xs text-ink-400 mt-0.5">
            <span className="font-semibold">{doc.docNo}</span>
            <span className="mx-2 text-cream-300">|</span>
            Issue {doc.issueNo} · {doc.issueDate} · Rev {doc.revNo} · {doc.revDate}
            <span className="mx-2 text-cream-300">|</span>
            Frequency: Monthly
          </p>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </section>
  );
}

function Tabs({
  tabs,
  active,
  onSelect,
  onAdd,
  addLabel,
}: {
  tabs: { key: string; label: string; state: "empty" | "partial" | "done" }[];
  active: string;
  onSelect: (key: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="surface-card p-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {tabs.map((t) => (
          <button
            key={t.key || "unnamed"}
            type="button"
            onClick={() => onSelect(t.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              active === t.key ? "bg-brand-500 text-white shadow-soft" : "text-ink-500 hover:bg-cream-200"
            }`}
          >
            <span>{t.label}</span>
            {t.state !== "empty" && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  active === t.key ? "bg-white" : t.state === "done" ? "bg-success-500" : "bg-warning-500"
                }`}
              />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-brand-600 border border-dashed border-brand-300 hover:bg-brand-50 whitespace-nowrap"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

type Saving = false | "draft" | "final";
type SaveStatus = "draft" | "submitted";
interface SaveMessage {
  kind: "ok" | "err";
  text: string;
}

/**
 * Create-then-update saving shared by both layouts.
 *
 *  - "draft" always saves in place and stays on the form, on the create page
 *    and the edit page alike.
 *  - "submitted" on the edit page goes through the wrapper's onSubmit (which
 *    updates and returns to the record); on the create page it saves and goes
 *    back to the list.
 */
function useRecordSave({ initialData, onSubmit }: DocFormProps) {
  const router = useRouter();
  // A duplicate arrives as initialData with its id stripped, so it starts unbound.
  const [recordId, setRecordId] = useState<number | null>(
    typeof initialData?.id === "number" ? initialData.id : null,
  );
  /** What the bound record is saved as right now; null until it exists. */
  const [savedStatus, setSavedStatus] = useState<SaveStatus | null>(() =>
    typeof initialData?.id !== "number" ? null : initialData?.status === "draft" ? "draft" : "submitted",
  );
  const [saving, setSaving] = useState<Saving>(false);
  const [message, setMessage] = useState<SaveMessage | null>(null);

  const fail = (text: string) => setMessage({ kind: "err", text });

  const persist = async (status: SaveStatus, payload: Record<string, any>) => {
    if (saving) return;
    setSaving(status === "draft" ? "draft" : "final");
    setMessage(null);
    try {
      const body = { ...payload, status };
      if (status === "submitted" && onSubmit) {
        await onSubmit(body);
        return;
      }
      const { docsApi } = await import("@/lib/api/documentations");
      let id = recordId;
      if (id == null) {
        const res = await docsApi.create(FORM_TYPE, body);
        const newId = res.data?.id;
        if (typeof newId === "number") {
          id = newId;
          setRecordId(newId);
        }
      } else {
        await docsApi.update(FORM_TYPE, id, body);
      }
      setSavedStatus(status);
      if (status === "submitted") {
        setMessage({ kind: "ok", text: "Record submitted." });
        setTimeout(() => router.push(LIST_PATH), 800);
      } else {
        setMessage({ kind: "ok", text: id != null ? `Draft saved — record #${id}.` : "Draft saved." });
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not save the record.");
    } finally {
      setSaving(false);
    }
  };

  return { recordId, savedStatus, saving, message, persist, fail };
}

type RecordSave = ReturnType<typeof useRecordSave>;

/** Tells the user the record on screen is still a draft, and what each button does. */
function DraftBanner({ state, isEdit }: { state: RecordSave; isEdit?: boolean }) {
  if (state.savedStatus !== "draft") return null;
  return (
    <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50 text-xs text-warning-800 font-medium">
      Draft {state.recordId != null && <span className="font-bold">#{state.recordId}</span>} in progress. Keep using{" "}
      <strong>{isEdit ? "Save Draft" : "Submit Partially"}</strong> to save progress, or{" "}
      <strong>Submit Record</strong> to finalise.
    </div>
  );
}

function SubmitBar({
  warehouse,
  state,
  isEdit,
  onSave,
}: {
  warehouse: WarehouseScope;
  state: RecordSave;
  isEdit?: boolean;
  onSave: (status: SaveStatus) => void;
}) {
  const doc = glassBrittleDocMeta(warehouse);
  const { saving, message, savedStatus } = state;
  // Editing a record that is already final is an "Update"; anything still open
  // (new, or a draft being edited) is finalised with "Submit Record".
  const finalLabel = isEdit && savedStatus === "submitted" ? "Update" : "Submit Record";
  return (
    <>
      {message && (
        <div
          role="status"
          className={`surface-card p-3 text-sm font-medium border-l-4 ${
            message.kind === "ok"
              ? "border-success-500 text-success-800 bg-success-50"
              : "border-danger-500 text-danger-700 bg-danger-50"
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          {doc.footerLeft}
          <span className="mx-2 text-cream-300">|</span>
          {doc.footerRight}
        </p>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => onSave("draft")} disabled={saving !== false} className="btn-outline">
            {saving === "draft" ? "Saving draft…" : isEdit ? "Save Draft" : "Submit Partially"}
          </button>
          <button onClick={() => onSave("submitted")} disabled={saving !== false} className="btn-primary">
            {saving === "final" ? "Submitting…" : finalLabel}
          </button>
        </div>
      </div>
    </>
  );
}

const cellInput =
  "w-full border border-cream-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500";
const thBase = "px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400";

const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map((r) => r.id)) + 1;

/** Rows for an ID-list textarea, so a long list opens fully visible. */
const idRows = (text: string, charsPerLine: number) =>
  Math.min(8, Math.max(1, Math.ceil(text.length / charsPerLine)));

/* ───────────────────── W202 · CFPLA.C4.F.48 · yearly grid ───────────────────── */

const TICK_NEXT: Record<string, string> = { "": GB_TICK, [GB_TICK]: GB_CROSS, [GB_CROSS]: "" };

function GlassBrittleYearlyForm({ initialData, onSubmit, isEdit, warehouse }: PlantFormProps) {
  const [year, setYear] = useState(() => String(initialData?.year || new Date().getFullYear()));
  const [rows, setRows] = useState<GbYearlyRow[]>(() => {
    const saved = gbYearlyRows(initialData);
    return saved.length > 0 ? saved : gbSeedYearlyRows();
  });
  const [monthDates, setMonthDates] = useState<GbMonthMap>(() => gbMonthDates(initialData));
  const [signoffs, setSignoffs] = useState<Record<GbMonth, GbSignoff>>(() => gbSignoffs(initialData));
  const [observations, setObservations] = useState(() => initialData?.observations || "");
  const [correctiveAction, setCorrectiveAction] = useState(
    () => initialData?.corrective_action || initialData?.corrective_actions || "",
  );
  const saveState = useRecordSave({ initialData, onSubmit });

  const floors = useMemo(() => gbGroup(rows, (r) => r.floor), [rows]);
  const [activeFloor, setActiveFloor] = useState(() => floors[0]?.key ?? "");
  // A floor can be renamed or emptied out from under the active tab.
  const currentFloor = floors.some((f) => f.key === activeFloor) ? activeFloor : floors[0]?.key ?? "";
  const floorRows = rows.filter((r) => r.floor === currentFloor);

  const update = (id: number, patch: Partial<GbYearlyRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const cycle = (id: number, m: GbMonth) =>
    setRows((p) =>
      p.map((r) => (r.id === id ? { ...r, months: { ...r.months, [m]: TICK_NEXT[r.months[m]] ?? GB_TICK } } : r)),
    );
  const remove = (id: number) => setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const addRow = () =>
    setRows((p) => [
      ...p,
      { id: nextId(p), floor: currentFloor, item: "", location: "", glassNo: "", details: "", months: gbEmptyMonths() },
    ]);
  const addFloor = () => {
    const name = window.prompt("New floor / area name")?.trim();
    if (!name) return;
    if (floors.some((f) => f.key === name)) return setActiveFloor(name);
    setRows((p) => [
      ...p,
      { id: nextId(p), floor: name, item: "", location: "", glassNo: "", details: "", months: gbEmptyMonths() },
    ]);
    setActiveFloor(name);
  };
  const renameFloor = (to: string) => {
    setRows((p) => p.map((r) => (r.floor === currentFloor ? { ...r, floor: to } : r)));
    setActiveFloor(to);
  };

  /**
   * Tick a month for a set of rows. Only blank cells are filled, so a ✕ already
   * recorded against a damaged item is never overwritten; when every cell is
   * already ✓ the same button clears them again.
   */
  const tickMonth = (m: GbMonth, inScope: (r: GbYearlyRow) => boolean) =>
    setRows((p) => {
      const scope = p.filter(inScope);
      const allTicked = scope.length > 0 && scope.every((r) => r.months[m] === GB_TICK);
      return p.map((r) => {
        if (!inScope(r)) return r;
        if (allTicked) return { ...r, months: { ...r.months, [m]: "" } };
        return r.months[m] === "" ? { ...r, months: { ...r.months, [m]: GB_TICK } } : r;
      });
    });

  const marked = (m: GbMonth, list: GbYearlyRow[]) => list.filter((r) => r.months[m] !== "").length;
  const floorState = (list: GbYearlyRow[]) => {
    const any = list.some((r) => GB_MONTHS.some((m) => r.months[m] !== ""));
    return any ? ("partial" as const) : ("empty" as const);
  };

  const handleSave = (status: SaveStatus) => {
    if (!/^\d{4}$/.test(year.trim())) {
      saveState.fail("Enter the year as four digits, e.g. 2026.");
      return;
    }
    if (status === "submitted") {
      // A final submit closes the year's sheet; a part-filled one is almost
      // always meant to be a partial save, so say what is missing first.
      const open = GB_MONTHS.filter((m) => marked(m, rows) < rows.length);
      if (
        open.length > 0 &&
        !window.confirm(
          `${open.length} of 12 months still have unchecked items (${open.join(", ")}).\n\n` +
            `Submit the record as final anyway?\n\nChoose Cancel to go back, then use ` +
            `"${isEdit ? "Save Draft" : "Submit Partially"}" to keep it as a draft.`,
        )
      ) {
        return;
      }
    }
    const payload: Record<string, any> = {
      warehouse,
      year: Number(year),
      rows: rows
        .filter((r) => r.item.trim() || r.location.trim() || r.glassNo.trim() || GB_MONTHS.some((m) => r.months[m]))
        .map((r) => ({
          floor: r.floor,
          item: r.item,
          location: r.location,
          glass_no: r.glassNo,
          glass_details: r.details,
          months: Object.fromEntries(GB_MONTHS.map((m) => [m.toLowerCase(), r.months[m]])),
        })),
      month_dates: Object.fromEntries(GB_MONTHS.map((m) => [m.toLowerCase(), monthDates[m] || ""])),
      month_signoffs: Object.fromEntries(
        GB_MONTHS.map((m) => [
          m.toLowerCase(),
          { checked_by: signoffs[m].checkedBy, verified_by: signoffs[m].verifiedBy },
        ]),
      ),
      observations,
      corrective_action: correctiveAction,
    };
    saveState.persist(status, payload);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <DraftBanner state={saveState} isEdit={isEdit} />
      <FormHeader warehouse={warehouse}>
        <label className="label-base">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="input-base sm:w-28"
        />
      </FormHeader>

      <Tabs
        tabs={floors.map((f) => ({ key: f.key, label: f.key || "Unnamed floor", state: floorState(f.rows) }))}
        active={currentFloor}
        onSelect={setActiveFloor}
        onAdd={addFloor}
        addLabel="+ Add Floor"
      />

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0 sm:flex-1">
            <label className="label-base">Floor</label>
            <input
              type="text"
              value={currentFloor}
              onChange={(e) => renameFloor(e.target.value)}
              className="input-base sm:max-w-sm"
              placeholder="Floor name"
            />
          </div>
          <button onClick={addRow} className="btn-secondary !py-1.5 !px-3 text-xs whitespace-nowrap shrink-0">
            + Add Item Row
          </button>
        </header>

        <p className="text-[11px] text-ink-400 italic px-4 sm:px-5 pt-3">
          Click a month cell to cycle <span className="text-success-600 font-bold">{GB_TICK}</span> (OK) →{" "}
          <span className="text-danger-600 font-bold">{GB_CROSS}</span> (damaged / missing) → empty. The{" "}
          <span className="font-semibold">{GB_TICK}</span> under a month fills this floor&apos;s empty cells; note any{" "}
          {GB_CROSS} in Observations below.
        </p>
        <p className="text-[11px] text-ink-400 italic px-4 sm:px-5 pt-1 lg:hidden">
          ← Swipe the table sideways to reach later months.
        </p>

        <div className="overflow-x-auto mt-2">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-cream-100/70 border-y border-cream-300">
                <th className={`${thBase} sticky left-0 z-10 bg-cream-100 min-w-[150px]`}>Item</th>
                <th className={`${thBase} min-w-[170px]`}>Location</th>
                <th className={`${thBase} min-w-[200px]`}>Glass No.</th>
                <th className={`${thBase} min-w-[120px]`}>Glass Details</th>
                {GB_MONTHS.map((m) => (
                  <th key={m} className="px-1 py-2 text-center text-[11px] font-semibold text-ink-400 border-l border-cream-300 min-w-[42px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{m}</span>
                      <button
                        type="button"
                        onClick={() => tickMonth(m, (r) => r.floor === currentFloor)}
                        className="text-[9px] font-bold leading-none bg-success-50 text-success-700 px-1.5 py-0.5 rounded hover:bg-success-100"
                        title={`Mark this floor's unchecked items ${GB_TICK} for ${m}`}
                      >
                        {GB_TICK}
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-1 py-2 border-l border-cream-300 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {floorRows.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="sticky left-0 z-10 bg-white px-1 py-1 align-top">
                    <input
                      type="text"
                      value={r.item}
                      onChange={(e) => update(r.id, { item: e.target.value })}
                      className={cellInput}
                      placeholder="Item"
                    />
                  </td>
                  <td className="px-1 py-1 align-top">
                    <input
                      type="text"
                      value={r.location}
                      onChange={(e) => update(r.id, { location: e.target.value })}
                      className={cellInput}
                      placeholder="Location"
                    />
                  </td>
                  <td className="px-1 py-1 align-top">
                    <textarea
                      value={r.glassNo}
                      onChange={(e) => update(r.id, { glassNo: e.target.value })}
                      rows={idRows(r.glassNo, 28)}
                      className={`${cellInput} text-[11px] leading-snug resize-y`}
                      placeholder="e.g. 12, 13-15"
                    />
                  </td>
                  <td className="px-1 py-1 align-top">
                    <input
                      type="text"
                      list="glass-detail-options"
                      value={r.details}
                      onChange={(e) => update(r.id, { details: e.target.value })}
                      className={cellInput}
                      placeholder="Glass / Hard Plastic"
                    />
                  </td>
                  {GB_MONTHS.map((m) => (
                    <td
                      key={m}
                      onClick={() => cycle(r.id, m)}
                      title={`${r.item || "Item"} — ${m}`}
                      className={`border-l border-cream-300 px-1 py-1 text-center cursor-pointer select-none font-bold ${
                        r.months[m] === GB_TICK
                          ? "bg-success-50 text-success-700"
                          : r.months[m] === GB_CROSS
                            ? "bg-danger-50 text-danger-600"
                            : ""
                      }`}
                    >
                      {r.months[m] || <span className="text-ink-300 text-[9px]">—</span>}
                    </td>
                  ))}
                  <td className="border-l border-cream-300 px-1 py-1 text-center align-top">
                    <button
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                      title="Remove this row"
                    >
                      {GB_CROSS}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <datalist id="glass-detail-options">
        {GLASS_DETAIL_TYPES.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      {/* Per-month sign-off — one Checked By / Verified By per month for the
          whole sheet, as on the last two rows of the format. */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Monthly sign-off — all floors</h2>
          <p className="text-[11px] text-ink-400 mt-0.5">
            One sign-off per month for the whole sheet. <span className="font-semibold">Mark all</span> fills every
            unchecked item on every floor with {GB_TICK} for that month.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-cream-100/70 border-b border-cream-300">
                <th className={`${thBase} w-20`}>Month</th>
                <th className={`${thBase} min-w-[150px]`}>Items checked</th>
                <th className={`${thBase} min-w-[150px]`}>Date of check</th>
                <th className={`${thBase} min-w-[150px]`}>Checked By</th>
                <th className={`${thBase} min-w-[150px]`}>Verified By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {GB_MONTHS.map((m) => {
                const done = marked(m, rows);
                return (
                  <tr key={m} className="hover:bg-cream-100/60">
                    <td className="px-2 py-1.5 font-semibold text-ink-500">{m}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-12 text-[11px] font-semibold ${done === rows.length ? "text-success-600" : "text-ink-500"}`}>
                          {done}/{rows.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => tickMonth(m, () => true)}
                          className="text-[10px] font-bold leading-none bg-success-50 text-success-700 px-2 py-1 rounded hover:bg-success-100 whitespace-nowrap"
                          title={`Mark every unchecked item on every floor ${GB_TICK} for ${m}`}
                        >
                          Mark all
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="date"
                        value={monthDates[m] || ""}
                        onChange={(e) => setMonthDates((p) => ({ ...p, [m]: e.target.value }))}
                        aria-label={`Date of check — ${m}`}
                        className={cellInput}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <SignSelect
                        label={`Checked by — ${m}`}
                        value={signoffs[m].checkedBy}
                        onChange={(v) => setSignoffs((p) => ({ ...p, [m]: { ...p[m], checkedBy: v } }))}
                        options={CHECKED_BY_OPTIONS}
                        warehouse={warehouse}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <SignSelect
                        label={`Verified by — ${m}`}
                        value={signoffs[m].verifiedBy}
                        onChange={(v) => setSignoffs((p) => ({ ...p, [m]: { ...p[m], verifiedBy: v } }))}
                        options={QC_VERIFIED_BY_OPTIONS}
                        warehouse={warehouse}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Observations &amp; Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations / Remarks</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective / Preventive Actions</label>
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={3} className="input-base" />
          </div>
        </div>
      </section>

      <SubmitBar warehouse={warehouse} state={saveState} isEdit={isEdit} onSave={handleSave} />
    </div>
  );
}

/* ───────────────────── A185 · CFPLB.C4.F.59 · monthly sheet ───────────────────── */

const CONDITION_OPTIONS = ["OK", "Cracked", "Broken", "Missing", "Loose"];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function GlassBrittleMonthlyForm({ initialData, onSubmit, isEdit, warehouse }: PlantFormProps) {
  const [month, setMonth] = useState<string>(() => initialData?.month || currentMonth());
  const [rows, setRows] = useState<GbMonthlyRow[]>(() => {
    const saved = gbMonthlyRows(initialData);
    return saved.length > 0 ? saved : gbSeedMonthlyRows();
  });
  const saveState = useRecordSave({ initialData, onSubmit });

  // Quick fill — one check round usually shares a date and a verifier.
  const [fillDate, setFillDate] = useState(today);
  const [fillCondition, setFillCondition] = useState("OK");
  const [fillQc, setFillQc] = useState("");

  const areas = useMemo(() => gbGroup(rows, (r) => r.area), [rows]);
  const [activeArea, setActiveArea] = useState(() => areas[0]?.key ?? "");
  const currentArea = areas.some((a) => a.key === activeArea) ? activeArea : areas[0]?.key ?? "";
  const areaRows = rows.filter((r) => r.area === currentArea);
  const areaIndex = Math.max(0, areas.findIndex((a) => a.key === currentArea));

  const update = (id: number, patch: Partial<GbMonthlyRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: number) => setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const blank = (id: number, area: string, item: string): GbMonthlyRow => ({
    id, area, item, glassNo: "", date: "", condition: "", remark: "", actionTaken: "", qcVerification: "",
  });
  const addRow = () => setRows((p) => [...p, blank(nextId(p), currentArea, "")]);
  const addArea = () => {
    const name = window.prompt("New area / floor name")?.trim();
    if (!name) return;
    if (areas.some((a) => a.key === name)) return setActiveArea(name);
    setRows((p) => {
      let id = nextId(p);
      return [...p, ...GLASS_ITEM_TYPES.map((item) => blank(id++, name, item))];
    });
    setActiveArea(name);
  };
  const renameArea = (to: string) => {
    setRows((p) => p.map((r) => (r.area === currentArea ? { ...r, area: to } : r)));
    setActiveArea(to);
  };

  /**
   * Fill date / condition / QC on rows that list something to inspect. Only
   * empty cells are filled, so a finding already typed in is never overwritten.
   */
  const quickFill = (inScope: (r: GbMonthlyRow) => boolean) =>
    setRows((p) =>
      p.map((r) =>
        inScope(r) && gbHasItems(r.glassNo)
          ? {
              ...r,
              date: r.date || fillDate,
              condition: r.condition || fillCondition,
              qcVerification: r.qcVerification || fillQc,
            }
          : r,
      ),
    );

  const isChecked = (r: GbMonthlyRow) => r.date !== "" && r.condition.trim() !== "";
  const areaState = (list: GbMonthlyRow[]) => {
    const due = list.filter((r) => gbHasItems(r.glassNo));
    const done = due.filter(isChecked).length;
    if (due.length > 0 && done === due.length) return "done" as const;
    return list.some((r) => r.date || r.condition || r.remark || r.actionTaken || r.qcVerification)
      ? ("partial" as const)
      : ("empty" as const);
  };
  const due = rows.filter((r) => gbHasItems(r.glassNo));
  const doneCount = due.filter(isChecked).length;

  const handleSave = (status: SaveStatus) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      saveState.fail("Select the month this check belongs to.");
      return;
    }
    if (status === "submitted") {
      const open = due.length - doneCount;
      if (
        open > 0 &&
        !window.confirm(
          `${open} of ${due.length} items have no date and condition yet.\n\n` +
            `Submit the record as final anyway?\n\nChoose Cancel to go back, then use ` +
            `"${isEdit ? "Save Draft" : "Submit Partially"}" to keep it as a draft.`,
        )
      ) {
        return;
      }
    }
    const payload: Record<string, any> = {
      warehouse,
      // `year` is the list's sort column; the month carries the real period.
      year: Number(month.slice(0, 4)),
      month,
      rows: rows
        .filter((r) => r.item.trim() || r.glassNo.trim() || r.date || r.condition || r.remark || r.actionTaken)
        .map((r) => ({
          location: r.area,
          item: r.item,
          glass_no: r.glassNo,
          date: r.date,
          condition: r.condition,
          remark: r.remark,
          action_taken: r.actionTaken,
          qc_verification: r.qcVerification,
        })),
    };
    saveState.persist(status, payload);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <DraftBanner state={saveState} isEdit={isEdit} />
      <FormHeader warehouse={warehouse}>
        <label className="label-base">Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-base sm:w-44" />
      </FormHeader>

      {/* Quick fill */}
      <section className="surface-card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="min-w-0 lg:flex-1">
            <h2 className="text-sm font-bold text-ink-600">Quick fill</h2>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Sets the date, condition and QC verification on every item that is still blank. Anything you have
              already typed is left alone. {doneCount}/{due.length} items checked so far.
            </p>
          </div>
          <div>
            <label className="label-base">Date</label>
            <input type="date" value={fillDate} onChange={(e) => setFillDate(e.target.value)} className="input-base sm:w-40" />
          </div>
          <div>
            <label className="label-base">Condition</label>
            <input
              type="text"
              list="glass-condition-options"
              value={fillCondition}
              onChange={(e) => setFillCondition(e.target.value)}
              className="input-base sm:w-32"
            />
          </div>
          <div>
            <label className="label-base">QC Verification</label>
            <SignSelect
              field
              label="QC verification for quick fill"
              value={fillQc}
              onChange={setFillQc}
              options={QC_VERIFIED_BY_OPTIONS}
              warehouse={warehouse}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => quickFill((r) => r.area === currentArea)} className="btn-secondary !py-2 !px-3 text-xs whitespace-nowrap">
              Fill this area
            </button>
            <button type="button" onClick={() => quickFill(() => true)} className="btn-secondary !py-2 !px-3 text-xs whitespace-nowrap">
              Fill all areas
            </button>
          </div>
        </div>
      </section>

      <Tabs
        tabs={areas.map((a) => ({ key: a.key, label: a.key || "Unnamed area", state: areaState(a.rows) }))}
        active={currentArea}
        onSelect={setActiveArea}
        onAdd={addArea}
        addLabel="+ Add Area"
      />

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0 sm:flex-1">
            {/* The format heads its first sheet "Area" and the rest "Floor". */}
            <label className="label-base">{areaIndex === 0 ? "Area" : "Floor"}</label>
            <input
              type="text"
              value={currentArea}
              onChange={(e) => renameArea(e.target.value)}
              className="input-base sm:max-w-sm"
              placeholder="Area or floor name"
            />
          </div>
          <button onClick={addRow} className="btn-secondary !py-1.5 !px-3 text-xs whitespace-nowrap shrink-0">
            + Add Item Row
          </button>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 sm:px-5 pt-3 lg:hidden">
          ← Swipe the table sideways to reach QC Verification.
        </p>

        <div className="overflow-x-auto mt-2">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-cream-100/70 border-y border-cream-300">
                <th className={`${thBase} sticky left-0 z-10 bg-cream-100 min-w-[150px]`}>Item</th>
                <th className={`${thBase} min-w-[280px]`}>ID Nos.</th>
                <th className={`${thBase} min-w-[130px]`}>Date</th>
                <th className={`${thBase} min-w-[150px]`}>Condition at the Time of Check</th>
                <th className={`${thBase} min-w-[160px]`}>Remark</th>
                <th className={`${thBase} min-w-[160px]`}>Action Taken</th>
                <th className={`${thBase} min-w-[150px]`}>QC Verification</th>
                <th className="px-1 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {areaRows.map((r) => {
                const finding = r.condition.trim() !== "" && !gbConditionIsOk(r.condition);
                return (
                  <tr key={r.id} className="hover:bg-cream-100/60 align-top">
                    <td className="sticky left-0 z-10 bg-white px-1 py-1">
                      <input
                        type="text"
                        list="glass-item-options"
                        value={r.item}
                        onChange={(e) => update(r.id, { item: e.target.value })}
                        className={cellInput}
                        placeholder="Select or type…"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <textarea
                        value={r.glassNo}
                        onChange={(e) => update(r.id, { glassNo: e.target.value })}
                        rows={idRows(r.glassNo, 40)}
                        className={`${cellInput} text-[11px] leading-snug resize-y`}
                        placeholder="e.g. GL1, GL2, GL44…"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input type="date" value={r.date} onChange={(e) => update(r.id, { date: e.target.value })} className={cellInput} />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        list="glass-condition-options"
                        value={r.condition}
                        onChange={(e) => update(r.id, { condition: e.target.value })}
                        className={`${cellInput} ${finding ? "!border-danger-300 bg-danger-50 text-danger-600 font-semibold" : ""}`}
                        placeholder="OK / Cracked…"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <textarea value={r.remark} onChange={(e) => update(r.id, { remark: e.target.value })} rows={1} className={`${cellInput} resize-y`} />
                    </td>
                    <td className="px-1 py-1">
                      <textarea value={r.actionTaken} onChange={(e) => update(r.id, { actionTaken: e.target.value })} rows={1} className={`${cellInput} resize-y`} />
                    </td>
                    <td className="px-1 py-1">
                      <SignSelect
                        label={`QC verification — ${r.item || "item"}`}
                        value={r.qcVerification}
                        onChange={(v) => update(r.id, { qcVerification: v })}
                        options={QC_VERIFIED_BY_OPTIONS}
                        warehouse={warehouse}
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => remove(r.id)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                        title="Remove this row"
                      >
                        {GB_CROSS}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <datalist id="glass-item-options">
        {GLASS_ITEM_TYPES.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="glass-condition-options">
        {CONDITION_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <SubmitBar warehouse={warehouse} state={saveState} isEdit={isEdit} onSave={handleSave} />
    </div>
  );
}
