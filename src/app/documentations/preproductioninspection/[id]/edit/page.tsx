'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import PreProductionInspectionForm from '@/components/forms/PreProductionInspectionForm'
export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['preproductioninspection']} FormComponent={PreProductionInspectionForm} />
}
