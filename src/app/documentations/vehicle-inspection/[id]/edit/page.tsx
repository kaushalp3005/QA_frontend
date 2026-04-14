'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { IncomingVehicleInspection } from '@/components/forms/CFPLA_QCOperationsForms'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['vehicle-inspection']} FormComponent={IncomingVehicleInspection} />
}
