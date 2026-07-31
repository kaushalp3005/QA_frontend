'use client'
import DocListPage from '@/components/documentations/DocListPage'
import DocWarehouseGate from '@/components/documentations/DocWarehouseGate'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['ccp-puffer']

export default function Page() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label}>
      <DocListPage config={config} />
    </DocWarehouseGate>
  )
}
