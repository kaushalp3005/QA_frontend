'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import DocWarehouseGate from '@/components/documentations/DocWarehouseGate'
import CCPPufferForm from '@/components/forms/CCPPufferForm'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['ccp-puffer']

export default function Page() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label}>
      <DocEditWrapper config={config} FormComponent={CCPPufferForm} />
    </DocWarehouseGate>
  )
}
