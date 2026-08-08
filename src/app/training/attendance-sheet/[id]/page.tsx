'use client'
import DocViewPage from '@/components/documentations/DocViewPage'
import AttendanceExpandedPanel from '@/components/training/AttendanceExpandedPanel'
import { DOC_FORMS } from '@/config/doc-forms'

export default function Page() {
  return (
    <DocViewPage
      config={DOC_FORMS['training-attendance']}
      // The attendee grid carries the per-attendee Training Card button, so the
      // detail page gets the same panel the list page's expanded row uses.
      renderJsonField={(key, _value, record) =>
        key === 'attendees' ? <AttendanceExpandedPanel record={record} /> : null
      }
    />
  )
}
