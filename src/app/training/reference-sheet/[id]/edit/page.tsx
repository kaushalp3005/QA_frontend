'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { TrainingReferenceSheet } from '@/components/forms/CFPLA_C7_F_03_TrainingSubForms'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['training-reference-sheet']} FormComponent={TrainingReferenceSheet} />
}
