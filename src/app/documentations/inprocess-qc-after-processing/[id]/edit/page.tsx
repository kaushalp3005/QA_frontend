'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import DocWarehouseGate from '@/components/documentations/DocWarehouseGate'
import InprocessQCAfterProcessingForm from '@/components/forms/InprocessQCAfterProcessingForm'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['inprocess-qc-after-processing']

export default function Page() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label}>
      <DocEditWrapper config={config} FormComponent={InprocessQCAfterProcessingForm} />
    </DocWarehouseGate>
  )
}
