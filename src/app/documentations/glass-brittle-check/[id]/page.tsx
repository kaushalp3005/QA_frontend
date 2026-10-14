'use client'
import DocViewPage from '@/components/documentations/DocViewPage'
import GlassBrittleRecordView from '@/components/documentations/GlassBrittleRecordView'
import { DOC_FORMS } from '@/config/doc-forms'

export default function Page() {
  return (
    <DocViewPage
      config={DOC_FORMS['glass-brittle-check']}
      // The rows panel already carries the per-month dates and sign-offs, so
      // those two columns aren't repeated underneath as raw JSON.
      hiddenFields={['month_dates', 'month_signoffs']}
      renderJsonField={(key, _value, record) =>
        key === 'rows' ? <GlassBrittleRecordView record={record} /> : null
      }
    />
  )
}
