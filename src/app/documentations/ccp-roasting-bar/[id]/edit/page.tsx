'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { CCPRoastingBarLine } from '@/components/forms/CFPLA_QCOperationsForms'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['ccp-roasting-bar']} FormComponent={CCPRoastingBarLine} />
}
