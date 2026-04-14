'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import TrainingAttendanceSheet from '@/components/forms/CFPLA_C7_F_03_TrainingAttendanceSheet'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['training-attendance']} FormComponent={TrainingAttendanceSheet} />
}
