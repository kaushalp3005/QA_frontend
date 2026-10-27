'use client'

import MachinesReadingView from '@/components/maintenance/reports/MachinesReadingView'
import { MT } from '@/lib/maintenance/nav'

export default function ReportsMachinesPage() {
  return <MachinesReadingView back={MT.reports} />
}
