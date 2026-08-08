'use client'
import DocListPage from '@/components/documentations/DocListPage'
import AttendanceExpandedPanel from '@/components/training/AttendanceExpandedPanel'
import { DOC_FORMS } from '@/config/doc-forms'

export default function Page() {
  return (
    <DocListPage
      config={DOC_FORMS['training-attendance']}
      renderExpanded={(record) => <AttendanceExpandedPanel record={record} />}
    />
  )
}
