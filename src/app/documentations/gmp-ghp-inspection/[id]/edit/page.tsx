'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { MonthlyGMPGHPInspection } from '@/components/forms/CFPLA_ProductSafetyForms'
export default function Page() { return <DocEditWrapper config={DOC_FORMS['gmp-ghp-inspection']} FormComponent={MonthlyGMPGHPInspection} /> }
