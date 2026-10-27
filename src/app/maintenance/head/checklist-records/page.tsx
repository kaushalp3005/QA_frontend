'use client'

/** Head: filled checklists, read-only — the PreventiveListScreen(readOnly = true) route in NavGraph. */

import { PreventiveList } from '@/components/maintenance/checklist/PreventiveList'

export default function HeadChecklistRecordsPage() {
  return <PreventiveList readOnly />
}
