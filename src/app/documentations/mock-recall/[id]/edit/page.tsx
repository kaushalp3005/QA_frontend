'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import MockRecall from '@/components/forms/CFPLA_C3_F_31_MockRecall'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['mock-recall']} FormComponent={MockRecall} />
}
