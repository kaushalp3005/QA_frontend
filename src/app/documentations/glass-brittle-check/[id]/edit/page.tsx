'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { GlassBrittleCheckRecord } from '@/components/forms/GlassBrittleForms'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['glass-brittle-check']} FormComponent={GlassBrittleCheckRecord} />
}
