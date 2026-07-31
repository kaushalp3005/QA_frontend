'use client'
import { ClipboardCheck } from 'lucide-react'
import DocFormShell from '@/components/documentations/DocFormShell'
import DocCreateForm from '@/components/documentations/DocCreateForm'
import DocWarehouseGate from '@/components/documentations/DocWarehouseGate'
import InprocessQCAfterProcessingForm from '@/components/forms/InprocessQCAfterProcessingForm'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['inprocess-qc-after-processing']

export default function Page() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label}>
      <DocFormShell
        title="In-Process Quality Check Record — After Processing"
        docNo={config.docNo}
        subtitle="Issue No 03 · Rev No 02 · Rev Date 02/02/2026"
        icon={ClipboardCheck}
        width="full"
        note="A185 only. Record RM moisture and salinity, then moisture and salt at the pre-heater and at the puffer/oven, for each product and batch."
      >
        <DocCreateForm
          formType="inprocess-qc-after-processing"
          FormComponent={InprocessQCAfterProcessingForm}
        />
      </DocFormShell>
    </DocWarehouseGate>
  )
}
