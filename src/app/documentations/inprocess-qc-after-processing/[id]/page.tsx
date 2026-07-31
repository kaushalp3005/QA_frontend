'use client'
import DocViewPage from '@/components/documentations/DocViewPage'
import DocWarehouseGate from '@/components/documentations/DocWarehouseGate'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['inprocess-qc-after-processing']

export default function Page() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label}>
      <DocViewPage config={config} />
    </DocWarehouseGate>
  )
}
