'use client'
import { Flame } from 'lucide-react'
import DocFormShell from '@/components/documentations/DocFormShell'
import DocCreateForm from '@/components/documentations/DocCreateForm'
import DocWarehouseGate from '@/components/documentations/DocWarehouseGate'
import CCPPufferForm from '@/components/forms/CCPPufferForm'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['ccp-puffer']

export default function Page() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label}>
      <DocFormShell
        title="Monitoring and Verification of CCP - Puffer"
        docNo={config.docNo}
        subtitle="Issue No 01 · Issue Date 02/01/2025"
        icon={Flame}
        width="full"
        note="A185 only. Frequency: hourly, plus start and end of every batch, after any repair / maintenance / adjustment to time & temperature, and at restart after significant unplanned downtime."
      >
        <DocCreateForm formType="ccp-puffer" FormComponent={CCPPufferForm} />
      </DocFormShell>
    </DocWarehouseGate>
  )
}
