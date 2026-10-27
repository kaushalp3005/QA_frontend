'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useMtSession } from '@/lib/maintenance/hooks'
import { mtLogout, ROLE_LABEL } from '@/lib/maintenance/client'
import { fmtDateTime, plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { Button, Card, ConfirmDialog, DetailGrid, PageHeader } from '@/components/maintenance/ui'

export default function SettingsPage() {
  const session = useMtSession()
  const [confirm, setConfirm] = useState(false)
  if (!session) return null

  return (
    <>
      <PageHeader title="Settings" back={MT.home} />
      <Card className="max-w-xl p-5">
        <DetailGrid
          items={[
            { label: 'Name', value: session.name },
            { label: 'Username', value: session.username },
            { label: 'Role', value: ROLE_LABEL[session.role] },
            { label: 'Plant', value: plantLabel(session.plantId) },
            { label: 'Session expires', value: fmtDateTime(session.expiresAt), wide: true },
          ]}
        />
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Button variant="danger" icon={LogOut} onClick={() => setConfirm(true)}>
            Sign out
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Sign out?"
        message="You'll need your username and password to sign in again."
        confirmLabel="Sign out"
        danger
        onConfirm={mtLogout}
        onClose={() => setConfirm(false)}
      />
    </>
  )
}
