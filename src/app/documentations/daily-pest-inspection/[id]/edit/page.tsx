'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import DailyPestInspectionReport from '@/components/forms/DailyPestInspectionReport'

export default function Page() {
  return (
    <DocEditWrapper
      config={DOC_FORMS['daily-pest-inspection']}
      FormComponent={DailyPestInspectionReport}
    />
  )
}
