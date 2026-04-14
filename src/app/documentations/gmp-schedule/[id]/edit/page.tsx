'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { MonthlyGMPSchedule } from '@/components/forms/CFPLA_QCRecordsForms'
export default function Page() { return <DocEditWrapper config={DOC_FORMS['gmp-schedule']} FormComponent={MonthlyGMPSchedule} /> }
