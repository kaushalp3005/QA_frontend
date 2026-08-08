'use client'
import DocViewPage from '@/components/documentations/DocViewPage'
import TrainingCardExpandedPanel from '@/components/training/TrainingCardExpandedPanel'
import { DOC_FORMS } from '@/config/doc-forms'

export default function Page() {
  return (
    <DocViewPage
      config={DOC_FORMS['training-card']}
      // Same panel the list page's expanded row uses, so the session grid reads
      // identically on both pages instead of falling back to the generic table.
      renderJsonField={(key, _value, record) =>
        key === 'rows' ? <TrainingCardExpandedPanel record={record} /> : null
      }
    />
  )
}
