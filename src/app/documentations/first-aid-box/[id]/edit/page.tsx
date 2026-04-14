'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { FirstAidBoxRecord } from '@/components/forms/CFPLA_QCOperationsForms'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['first-aid-box']} FormComponent={FirstAidBoxRecord} />
}
