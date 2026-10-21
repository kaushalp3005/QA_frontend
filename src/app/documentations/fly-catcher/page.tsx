'use client'
import DocListPage from '@/components/documentations/DocListPage'
import { DOC_FORMS } from '@/config/doc-forms'
import { averageFliesWeight, sheetDate } from '@/lib/flyCatcher'

// Both columns are computed from the record's rows (the list endpoint returns
// them in full): the date the user entered on the sheet, and the same Flies Qty
// average the print page shows.
function columnValue(column: string, record: Record<string, any>): string | undefined {
  if (column === 'sheet_date') return sheetDate(record.rows)
  if (column === 'avg_flies_weight') {
    const avg = averageFliesWeight(record.rows)
    return avg === null ? '' : String(avg)
  }
  return undefined
}

export default function Page() {
  return <DocListPage config={DOC_FORMS['fly-catcher']} columnValue={columnValue} />
}
