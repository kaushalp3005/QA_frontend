'use client'

/**
 * Manage Users — HEAD (and ADMIN, matching the backend) list / add / edit /
 * delete over /mt-users (ManageUsersScreen.kt / ManageUsersViewModel.kt).
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, ShieldAlert, Trash2, UserPlus, Users } from 'lucide-react'
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, PageHeader, SearchInput, SkeletonRows } from '@/components/maintenance/ui'
import UserFormModal from '@/components/maintenance/head/UserFormModal'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import {
  addMtUser,
  deleteMtUser,
  listMtUsers,
  updateMtUser,
  userErrorText,
  type MtUserRow,
  type MtUserWrite,
} from '@/lib/maintenance/api/users'

export default function ManageUsersPage() {
  const session = useMtSession()
  const canManage = session?.role === 'HEAD' || session?.role === 'ADMIN'

  const { data, error, loading, reload } = useMtQuery(async () => {
    if (!canManage) return [] as MtUserRow[]
    try {
      return await listMtUsers()
    } catch (e) {
      throw new Error(userErrorText(e, 'Failed to load users'))
    }
  }, [canManage])

  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<MtUserRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MtUserRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!session) return null
  const back = session.role === 'ADMIN' ? MT.admin : MT.head

  if (!canManage)
    return (
      <>
        <PageHeader title="Manage Users" back={back} />
        <EmptyState icon={ShieldAlert} title="Only Head can manage users." />
      </>
    )

  const openSheet = (u: MtUserRow | null) => {
    setEditing(u)
    setSaveError(null)
    setSheetOpen(true)
  }

  const submit = async (u: MtUserWrite) => {
    setSaving(true)
    setSaveError(null)
    try {
      if (editing && editing.id) {
        await updateMtUser(editing.id, u)
        toast.success(`Saved ${u.name}`)
      } else {
        await addMtUser(u)
        toast.success(`Added ${u.name}`)
      }
      setSheetOpen(false)
      setEditing(null)
      reload()
    } catch (e) {
      setSaveError(userErrorText(e, editing ? 'Failed to update user' : 'Failed to add user'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteMtUser(pendingDelete.id)
      toast.success(`Removed ${pendingDelete.name}`)
      reload()
    } catch (e) {
      // Keep the list on screen; report the failure.
      toast.error(userErrorText(e, 'Failed to delete user'))
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const users = data ?? []
  const q = query.trim().toLowerCase()
  const shown = q
    ? users.filter((u) =>
        [u.name, u.username, u.role, u.location, u.emp_id].some((v) => v?.toLowerCase().includes(q)),
      )
    : users

  return (
    <>
      <PageHeader
        title="Manage Users"
        subtitle={data ? `${users.length} users` : undefined}
        back={back}
        actions={
          <Button icon={UserPlus} onClick={() => openSheet(null)}>
            Add user
          </Button>
        }
      />

      {error ? (
        <ErrorBanner error={error} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows rows={6} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet." message="Tap Add user to add one." />
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search users…" className="mb-4 sm:max-w-sm" />
          <div className="grid gap-2 lg:grid-cols-2">
            {shown.map((u) => (
              <Card key={u.id} className="flex items-center gap-2 p-4">
                <button type="button" onClick={() => openSheet(u)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{u.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {[u.username, u.role, u.location].filter((v) => v?.trim()).join(' • ')}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => openSheet(u)}
                  className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-factory-700 dark:hover:bg-zinc-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setPendingDelete(u)}
                  className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      <UserFormModal
        open={sheetOpen}
        existing={editing}
        saving={saving}
        error={saveError}
        onClose={() => {
          setSheetOpen(false)
          setEditing(null)
          setSaveError(null)
        }}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete user?"
        message={pendingDelete ? `Remove ${pendingDelete.name} (${pendingDelete.username})? This can't be undone.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
