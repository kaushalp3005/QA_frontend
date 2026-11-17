'use client'
import DocListPage from '@/components/documentations/DocListPage'
import { DOC_FORMS } from '@/config/doc-forms'
import { averageFliesWeight, doneByNames, perFlycatcherWeight, sheetDate, totalFliesWeight } from '@/lib/flyCatcher'

// These columns are computed from the record's rows (the list endpoint returns
// them in full): the date the user entered on the sheet, the Flies Qty total,
// the same Flies Qty average the print page shows, and who did the round.
function columnValue(column: string, record: Record<string, any>): string | undefined {
  if (column === 'sheet_date') return sheetDate(record.rows)
  if (column === 'done_by') return doneByNames(record.rows)
  if (column === 'total_flies_weight') {
    const total = totalFliesWeight(record.rows)
    return total === null ? '' : String(total)
  }
  if (column === 'per_flycatcher') {
    const per = perFlycatcherWeight(record.rows)
    return per === null ? '' : String(per)
  }
  if (column === 'avg_flies_weight') {
    const avg = averageFliesWeight(record.rows)
    return avg === null ? '' : String(avg)
  }
  return undefined
}

export default function Page() {
  return <DocListPage config={DOC_FORMS['fly-catcher']} columnValue={columnValue} />
}
