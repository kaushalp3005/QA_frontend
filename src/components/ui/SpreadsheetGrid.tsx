'use client'
/**
 * A small Excel-style grid for editing rows of text cells.
 *
 *  - Click a cell to select it; drag, Shift+click or Shift+arrows to select a
 *    block; click a row number or column heading to select the row / column.
 *  - Type to replace a cell; Enter, F2 or double-click to edit it in place.
 *    Enter / Tab save and move on, Esc cancels.
 *  - Ctrl/⌘+C, X and V use the same tab-separated text Excel and Google Sheets
 *    put on the clipboard, so a block copied there pastes straight in (and back).
 *    Pasting past the last row adds rows. A single copied value pasted onto a
 *    selected block fills the block. A pasted block whose first row is the
 *    column headings is matched to the columns by name, in any order.
 *  - Delete / Backspace clears the selection; Ctrl/⌘+Z undoes, Ctrl+Y or
 *    ⌘+Shift+Z redoes.
 *
 * Rows are plain objects keyed by `columns[].key` with string values; the grid
 * never changes their shape, so whatever saves them keeps working.
 */
import { useEffect, useRef, useState } from 'react'

export interface SheetColumn {
  key: string
  label: string
  /** Column width in px. */
  width?: number
}

interface SpreadsheetGridProps<R extends { id: number }> {
  columns: SheetColumn[]
  rows: R[]
  onChange: (rows: R[]) => void
  /** A blank row, for rows added by a paste or by typing past the end. */
  makeRow: (id: number) => R
  onRemoveRow?: (id: number) => void
  /** Non-blocking messages, e.g. pasted columns that had nowhere to go. */
  onNotice?: (message: string) => void
  /** Labels of columns that exist but are switched off — named in the paste notice. */
  hiddenColumns?: string[]
  label?: string
}

type Cell = { r: number; c: number }
type EditState = { value: string; /** "enter": started by typing, arrows leave the cell. "edit": F2 / double-click, arrows move the caret. */ mode: 'enter' | 'edit' }

/* ─────────────────────────── clipboard text ─────────────────────────── */

/**
 * Excel / Google Sheets clipboard text → rows of cells. Cells are split on tabs
 * and rows on newlines; a cell that holds a tab, newline or quote arrives
 * wrapped in quotes with inner quotes doubled. A cell that merely starts with
 * a quote but is not wrapped that way is kept as typed.
 */
export function parseClipboardTable(text: string): string[][] {
  const s = text.replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch === '"' && cell === '') {
      let j = i + 1
      let buf = ''
      while (j < s.length) {
        if (s[j] === '"') {
          if (s[j + 1] === '"') { buf += '"'; j += 2; continue }
          break
        }
        buf += s[j]
        j++
      }
      const after = s[j + 1]
      if (j < s.length && (after === undefined || after === '\t' || after === '\n')) {
        cell = buf
        i = j + 1
        continue
      }
    }
    if (ch === '\t') { row.push(cell); cell = ''; i++; continue }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue }
    cell += ch
    i++
  }
  row.push(cell)
  rows.push(row)
  // Excel ends a copied block with a newline, which leaves one empty row behind.
  while (rows.length > 1 && rows[rows.length - 1].every((v) => v === '')) rows.pop()
  return rows
}

/** Rows of cells → the tab-separated text Excel reads back. */
export function toClipboardText(cells: string[][]): string {
  const quote = (v: string) => (/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return cells.map((r) => r.map(quote).join('\t')).join('\n')
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/* ─────────────────────────────── grid ─────────────────────────────── */

export default function SpreadsheetGrid<R extends { id: number }>({
  columns,
  rows,
  onChange,
  makeRow,
  onRemoveRow,
  onNotice,
  hiddenColumns = [],
  label = 'Spreadsheet',
}: SpreadsheetGridProps<R>) {
  const [active, setActive] = useState<Cell>({ r: 0, c: 0 })
  const [anchor, setAnchor] = useState<Cell>({ r: 0, c: 0 })
  const [editing, setEditingState] = useState<EditState | null>(null)
  // Mirrors `editing` synchronously. Leaving the editor fires its blur handler
  // with the render's stale state, so without this an Esc would still save.
  const editRef = useRef<EditState | null>(null)
  const setEditing = (v: EditState | null) => { editRef.current = v; setEditingState(v) }
  const wrapRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>())
  const dragging = useRef(false)
  const clickedActive = useRef(false)
  const moved = useRef(false)
  const undoStack = useRef<R[][]>([])
  const redoStack = useRef<R[][]>([])

  // With no rows, one blank row is shown so there is still somewhere to type or
  // paste; it only becomes a real row once something is written into it.
  const phantom = rows.length === 0
  const shown: R[] = phantom ? [makeRow(0)] : rows
  const lastRow = shown.length - 1
  const lastCol = columns.length - 1
  const clamp = (p: Cell): Cell => ({ r: Math.max(0, Math.min(p.r, lastRow)), c: Math.max(0, Math.min(p.c, lastCol)) })
  const act = clamp(active)
  const anc = clamp(anchor)
  const r1 = Math.min(act.r, anc.r), r2 = Math.max(act.r, anc.r)
  const c1 = Math.min(act.c, anc.c), c2 = Math.max(act.c, anc.c)
  const inSel = (r: number, c: number) => r >= r1 && r <= r2 && c >= c1 && c <= c2
  const single = r1 === r2 && c1 === c2

  const valueAt = (r: number, c: number): string => {
    const row = shown[r] as any
    const v = row?.[columns[c]?.key]
    return v == null ? '' : String(v)
  }

  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // Keep the active cell in view while moving with the keyboard.
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    cellRefs.current.get(`${act.r}:${act.c}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [act.r, act.c])

  const focusGrid = () => wrapRef.current?.focus({ preventScroll: true })

  /* ── writing ── */
  const commit = (next: R[]) => {
    undoStack.current.push(rows)
    if (undoStack.current.length > 100) undoStack.current.shift()
    redoStack.current = []
    onChange(next)
  }
  const write = (cells: { r: number; c: number; v: string }[]) => {
    if (!cells.length) return
    const next = rows.map((row) => ({ ...row }))
    let id = Math.max(0, ...rows.map((row) => row.id))
    for (const { r, c, v } of cells) {
      const key = columns[c]?.key
      if (!key) continue
      while (next.length <= r) next.push(makeRow(++id))
      ;(next[r] as any)[key] = v
    }
    commit(next)
  }
  const undo = () => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(rows)
    onChange(prev)
  }
  const redo = () => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(rows)
    onChange(next)
  }

  /* ── selection ── */
  const select = (to: Cell, extend = false) => {
    const t = clamp(to)
    moved.current = true
    setActive(t)
    if (!extend) setAnchor(t)
  }
  const selectBlock = (from: Cell, to: Cell) => { setAnchor(clamp(from)); setActive(clamp(to)) }

  /* ── editing ── */
  const startEdit = (mode: EditState['mode'], value = valueAt(act.r, act.c)) => setEditing({ value, mode })
  const commitEdit = () => {
    const ed = editRef.current
    if (!ed) return
    setEditing(null)
    if (ed.value !== valueAt(act.r, act.c)) write([{ r: act.r, c: act.c, v: ed.value }])
  }
  const cancelEdit = () => { setEditing(null); focusGrid() }

  /* ── clipboard ── */
  const selectionCells = () => {
    const out: string[][] = []
    for (let r = r1; r <= r2; r++) {
      const line: string[] = []
      for (let c = c1; c <= c2; c++) line.push(valueAt(r, c))
      out.push(line)
    }
    return out
  }
  const clearSelection = () => {
    const cells: { r: number; c: number; v: string }[] = []
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (!phantom && valueAt(r, c) !== '') cells.push({ r, c, v: '' })
    write(cells)
  }

  const paste = (text: string) => {
    let data = parseClipboardTable(text)
    if (!data.length || (data.length === 1 && data[0].length === 1 && data[0][0] === '')) return
    const notices: string[] = []

    // One value onto a selected block fills the block, as in Excel.
    if (data.length === 1 && data[0].length === 1 && !single) {
      const v = data[0][0]
      const cells: { r: number; c: number; v: string }[] = []
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cells.push({ r, c, v })
      write(cells)
      return
    }

    // A first row that names two or more of the columns is a heading row: map
    // each pasted column to its column by name, wherever it sits.
    const headerIdx = data[0].map((h) => {
      const n = norm(h)
      if (n.length < 3) return -1
      return columns.findIndex((col) => norm(col.label) === n || norm(col.key) === n || norm(col.label).startsWith(n))
    })
    const named = headerIdx.filter((i) => i >= 0).length
    const filled = data[0].filter((h) => h.trim()).length
    const isHeader = data.length > 1 && named >= 2 && named * 2 >= filled
    let target: number[]
    if (isHeader) {
      const unmatched = data[0].filter((h, i) => h.trim() && headerIdx[i] < 0)
      const hidden = unmatched.filter((h) => hiddenColumns.some((hc) => norm(hc).startsWith(norm(h)) || norm(hc) === norm(h)))
      const other = unmatched.filter((h) => !hidden.includes(h))
      if (hidden.length) notices.push(`${hidden.join(', ')} ${hidden.length > 1 ? 'are' : 'is'} switched off — tick ${hidden.length > 1 ? 'them' : 'it'} above the table and paste again to fill ${hidden.length > 1 ? 'them' : 'it'}.`)
      if (other.length) notices.push(`Not pasted (no matching column): ${other.join(', ')}.`)
      target = headerIdx
      data = data.slice(1)
    } else {
      const width = Math.max(...data.map((r) => r.length))
      target = Array.from({ length: width }, (_, i) => (c1 + i <= lastCol ? c1 + i : -1))
      const dropped = target.filter((t) => t < 0).length
      if (dropped) notices.push(`${dropped} pasted column${dropped > 1 ? 's' : ''} did not fit to the right and ${dropped > 1 ? 'were' : 'was'} left out.`)
    }

    const startRow = r1
    const cells: { r: number; c: number; v: string }[] = []
    data.forEach((line, i) => line.forEach((v, j) => { if (target[j] >= 0) cells.push({ r: startRow + i, c: target[j], v }) }))
    write(cells)

    const usedCols = target.filter((t) => t >= 0)
    if (usedCols.length && data.length) {
      setAnchor({ r: startRow, c: Math.min(...usedCols) })
      setActive({ r: startRow + data.length - 1, c: Math.max(...usedCols) })
    }
    const added = startRow + data.length - (phantom ? 0 : rows.length)
    if (added > 0) notices.unshift(`Added ${added} row${added > 1 ? 's' : ''} for the pasted data.`)
    if (notices.length) onNotice?.(notices.join(' '))
  }

  /* ── keyboard (grid focused, not editing) ── */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return
    const mod = e.metaKey || e.ctrlKey
    const k = e.key
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return }
    if (mod && (k === 'a' || k === 'A')) { e.preventDefault(); selectBlock({ r: 0, c: 0 }, { r: lastRow, c: lastCol }); return }
    if (mod && ['c', 'C', 'x', 'X', 'v', 'V'].includes(k)) return // handled by the clipboard events
    const moves: Record<string, Cell> = {
      ArrowUp: { r: mod ? 0 : act.r - 1, c: act.c },
      ArrowDown: { r: mod ? lastRow : act.r + 1, c: act.c },
      ArrowLeft: { r: act.r, c: mod ? 0 : act.c - 1 },
      ArrowRight: { r: act.r, c: mod ? lastCol : act.c + 1 },
      Home: { r: mod ? 0 : act.r, c: 0 },
      End: { r: mod ? lastRow : act.r, c: lastCol },
    }
    if (moves[k]) { e.preventDefault(); select(moves[k], e.shiftKey); return }
    if (k === 'Tab') {
      // Tab walks the cells and wraps to the next row; at either end it lets
      // focus leave the grid instead of trapping the keyboard.
      const flat = act.r * columns.length + act.c + (e.shiftKey ? -1 : 1)
      if (flat < 0 || flat > lastRow * columns.length + lastCol) return
      e.preventDefault()
      select({ r: Math.floor(flat / columns.length), c: flat % columns.length })
      return
    }
    if (k === 'Enter' || k === 'F2') { e.preventDefault(); startEdit('edit'); return }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); clearSelection(); return }
    if (k === 'Escape') { selectBlock(act, act); return }
    if (k.length === 1 && !mod && !e.altKey) {
      // Typing over a cell replaces it, as in Excel.
      e.preventDefault()
      if (!single) setAnchor(act)
      startEdit('enter', k)
    }
  }

  /* ── keyboard (inside the cell editor) ── */
  const onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key
    const go = (to: Cell) => { commitEdit(); select(to); focusGrid() }
    if (k === 'Enter') { e.preventDefault(); go({ r: act.r + (e.shiftKey ? -1 : 1), c: act.c }); return }
    if (k === 'Tab') { e.preventDefault(); go({ r: act.r, c: act.c + (e.shiftKey ? -1 : 1) }); return }
    if (k === 'Escape') { e.preventDefault(); cancelEdit(); return }
    if (editing?.mode === 'enter') {
      const arrows: Record<string, Cell> = {
        ArrowUp: { r: act.r - 1, c: act.c }, ArrowDown: { r: act.r + 1, c: act.c },
        ArrowLeft: { r: act.r, c: act.c - 1 }, ArrowRight: { r: act.r, c: act.c + 1 },
      }
      if (arrows[k]) { e.preventDefault(); go(arrows[k]) }
    }
  }
  const onEditPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // A block from Excel pasted while typing goes into the grid, not this one cell.
    const text = e.clipboardData.getData('text/plain')
    if (!/[\t\n]/.test(text.replace(/\r?\n$/, ''))) return
    e.preventDefault()
    setEditing(null)
    paste(text)
    focusGrid()
  }

  /* ── mouse ── */
  const onCellMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (e.button !== 0) return
    e.preventDefault()
    // Only a second click on a cell already selected in a focused grid edits it;
    // the first click into the grid — even on the cell that starts selected — just selects.
    const hadFocus = !!wrapRef.current && wrapRef.current.contains(document.activeElement)
    clickedActive.current = hadFocus && !editing && single && act.r === r && act.c === c && !e.shiftKey
    if (editing) commitEdit()
    select({ r, c }, e.shiftKey)
    dragging.current = true
    focusGrid()
  }
  const onCellMouseEnter = (r: number, c: number) => {
    if (dragging.current) setActive(clamp({ r, c }))
  }
  // A second tap on the selected cell edits it — the way in on a touch screen.
  const onCellClick = () => { if (clickedActive.current) { clickedActive.current = false; startEdit('edit') } }

  const selectRows = (e: React.MouseEvent, r: number) => {
    e.preventDefault()
    if (editing) commitEdit()
    if (e.shiftKey) { setAnchor({ r: anc.r, c: 0 }); setActive(clamp({ r, c: lastCol })) }
    else selectBlock({ r, c: 0 }, { r, c: lastCol })
    focusGrid()
  }
  const selectCols = (e: React.MouseEvent, c: number) => {
    e.preventDefault()
    if (editing) commitEdit()
    if (e.shiftKey) { setAnchor({ r: 0, c: anc.c }); setActive(clamp({ r: lastRow, c })) }
    else selectBlock({ r: 0, c }, { r: lastRow, c })
    focusGrid()
  }

  const total = 44 + columns.reduce((n, col) => n + (col.width ?? 140), 0) + (onRemoveRow ? 36 : 0)

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="grid"
      aria-label={label}
      aria-multiselectable="true"
      aria-rowcount={shown.length}
      aria-colcount={columns.length}
      onKeyDown={onKeyDown}
      onCopy={(e) => { if (editing) return; e.preventDefault(); e.clipboardData.setData('text/plain', toClipboardText(selectionCells())) }}
      onCut={(e) => { if (editing) return; e.preventDefault(); e.clipboardData.setData('text/plain', toClipboardText(selectionCells())); clearSelection() }}
      onPaste={(e) => { if (editing) return; e.preventDefault(); paste(e.clipboardData.getData('text/plain')) }}
      className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <table className="border-collapse text-sm select-none" style={{ tableLayout: 'fixed', width: total, minWidth: '100%' }}>
        <colgroup>
          <col style={{ width: 44 }} />
          {columns.map((col) => <col key={col.key} style={{ width: col.width ?? 140 }} />)}
          {onRemoveRow && <col style={{ width: 36 }} />}
        </colgroup>
        <thead>
          <tr>
            <th
              onMouseDown={(e) => { e.preventDefault(); selectBlock({ r: 0, c: 0 }, { r: lastRow, c: lastCol }); focusGrid() }}
              title="Select all"
              className="sticky left-0 z-20 border border-cream-300 bg-cream-200/80 cursor-pointer"
            />
            {columns.map((col, c) => (
              <th
                key={col.key}
                onMouseDown={(e) => selectCols(e, c)}
                title={`Select the ${col.label} column`}
                className={`border border-cream-300 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${
                  c >= c1 && c <= c2 ? 'bg-brand-100 text-brand-700' : 'bg-cream-100 text-ink-400'
                }`}
              >
                {col.label}
              </th>
            ))}
            {onRemoveRow && <th className="border border-cream-300 bg-cream-100" />}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, r) => (
            <tr key={phantom ? 'phantom' : row.id}>
              <th
                onMouseDown={(e) => selectRows(e, r)}
                title={`Select row ${r + 1}`}
                className={`sticky left-0 z-10 border border-cream-300 px-1 text-center text-[11px] font-semibold cursor-pointer ${
                  r >= r1 && r <= r2 ? 'bg-brand-100 text-brand-700' : 'bg-cream-100 text-ink-400'
                }`}
              >
                {r + 1}
              </th>
              {columns.map((col, c) => {
                const isActive = r === act.r && c === act.c
                const selected = inSel(r, c)
                const v = valueAt(r, c)
                return (
                  <td
                    key={col.key}
                    ref={(el) => { if (el) cellRefs.current.set(`${r}:${c}`, el); else cellRefs.current.delete(`${r}:${c}`) }}
                    role="gridcell"
                    aria-selected={selected}
                    onMouseDown={(e) => onCellMouseDown(e, r, c)}
                    onMouseEnter={() => onCellMouseEnter(r, c)}
                    onClick={onCellClick}
                    onDoubleClick={() => startEdit('edit')}
                    className={`relative border border-cream-300 p-0 h-[34px] ${selected && !(isActive && single) ? 'bg-brand-50' : 'bg-white'}`}
                    style={isActive ? { boxShadow: 'inset 0 0 0 2px #A41F13' } : undefined}
                  >
                    {isActive && editing ? (
                      <input
                        autoFocus
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onKeyDown={onEditKeyDown}
                        onPaste={onEditPaste}
                        onBlur={commitEdit}
                        onFocus={(e) => { if (editing.mode === 'edit') e.currentTarget.select() }}
                        aria-label={`${col.label}, row ${r + 1}`}
                        className="absolute inset-0 w-full h-full px-2 text-sm bg-white outline-none"
                        style={{ boxShadow: 'inset 0 0 0 2px #A41F13' }}
                      />
                    ) : (
                      <div className="px-2 py-1.5 truncate text-ink-600" title={v || undefined}>
                        {v || ' '}
                      </div>
                    )}
                  </td>
                )
              })}
              {onRemoveRow && (
                <td className="border border-cream-300 bg-white text-center">
                  {!phantom && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onRemoveRow(row.id)}
                      title={`Remove row ${r + 1}`}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-danger-500 hover:bg-danger-50 hover:text-danger-600 text-sm font-bold leading-none"
                    >
                      ✕
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

