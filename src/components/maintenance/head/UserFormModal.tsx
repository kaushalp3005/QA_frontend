'use client'

/**
 * Add / edit sheet over the mt_users columns (UserFormSheet.kt). No password
 * field — new users share the fixed login. Username is trimmed and lowercased.
 */

import { useEffect, useState } from 'react'
import { Button, ErrorBanner, Field, Input, Modal, Select } from '@/components/maintenance/ui'
import { USER_ROLES, type MtUserRow, type MtUserWrite } from '@/lib/maintenance/api/users'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function UserFormModal({
  open,
  existing,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  existing: MtUserRow | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (u: MtUserWrite) => void
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [empId, setEmpId] = useState('')
  const [location, setLocation] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [emailId, setEmailId] = useState('')
  const [role, setRole] = useState<string>('OPERATOR')

  useEffect(() => {
    if (!open) return
    setName(existing?.name ?? '')
    setUsername(existing?.username ?? '')
    setEmpId(existing?.emp_id ?? '')
    setLocation(existing?.location ?? '')
    setContactNo(existing?.contact_no ?? '')
    setEmailId(existing?.email_id ?? '')
    setRole(existing?.role?.toUpperCase() || 'OPERATOR')
  }, [open, existing])

  const emailValid = !emailId.trim() || EMAIL_RE.test(emailId.trim())
  const canSubmit = !!name.trim() && !!username.trim() && emailValid && !saving
  const orNull = (v: string) => v.trim() || null

  // A legacy role string not in the enum still shows in the dropdown.
  const roles: string[] = USER_ROLES.includes(role as any) ? [...USER_ROLES] : [role, ...USER_ROLES]

  const submit = () => {
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      emp_id: orNull(empId),
      location: orNull(location),
      contact_no: orNull(contactNo),
      email_id: orNull(emailId),
      role,
    })
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={existing ? 'Edit user' : 'Add new user'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!canSubmit}>
            {existing ? 'Save changes' : 'Add user'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field
          label="Username"
          required
          hint="Username is the login id (stored in lowercase). New users sign in with the shared password."
        >
          <Input value={username} autoCapitalize="none" onChange={(e) => setUsername(e.target.value.trim())} />
        </Field>
        <Field label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value)} options={roles} />
        </Field>
        <Field label="Employee ID">
          <Input value={empId} onChange={(e) => setEmpId(e.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Contact no.">
          <Input type="tel" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
        </Field>
        <Field label="Email" error={!emailValid ? 'Enter a valid email or leave it blank.' : undefined}>
          <Input type="email" value={emailId} onChange={(e) => setEmailId(e.target.value)} />
        </Field>
        <ErrorBanner error={error} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
