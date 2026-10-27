'use client'

/**
 * "Summary Report" card shared by the Supervisor and Head report hubs
 * (SummaryReportCard.kt + SummaryReportViewModel.kt). The Android app renders a
 * PDF; here it opens the print-friendly summary page, which prints / saves as PDF.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { Button, Card } from '@/components/maintenance/ui'
import { MT } from '@/lib/maintenance/nav'
import { DateRangeFields, defaultRange } from './ReportFilters'

/** Print page for the summary (not in the fixed MT route set — lives under /reports). */
export const summaryPrintPath = (from: string, to: string, back: string) =>
  `${MT.reports}/summary?${new URLSearchParams({ from, to, back }).toString()}`

export default function SummaryReportCard({ back }: { back: string }) {
  const router = useRouter()
  const [range, setRange] = useState(defaultRange)

  const download = () => {
    if (range.from > range.to) {
      toast.error('"From" must be on or before "To"')
      return
    }
    router.push(summaryPrintPath(range.from, range.to, back))
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Summary Report</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        One consolidated PDF covering machines, utilities, and PM activity for the selected period.
      </p>
      <div className="mt-4">
        <DateRangeFields from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
      </div>
      <Button icon={Download} onClick={download} className="mt-4 w-full sm:w-auto">
        Download Summary Report
      </Button>
    </Card>
  )
}
