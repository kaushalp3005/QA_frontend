'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { FoodSafetyIncidentReport } from '@/components/forms/CFPLA_FoodSafetyDocForms'
export default function Page() { return <DocEditWrapper config={DOC_FORMS['incident-report']} FormComponent={FoodSafetyIncidentReport} /> }
