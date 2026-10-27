'use client'

import FloorReadingsView from '@/components/maintenance/reports/FloorReadingsView'
import { MT } from '@/lib/maintenance/nav'

export default function ReportsFloorPage() {
  return <FloorReadingsView back={MT.reports} />
}
