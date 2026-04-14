'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { WasteDisposalRecord } from '@/components/forms/CFPLA_MaintenanceForms'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['waste-disposal']} FormComponent={WasteDisposalRecord} />
}
