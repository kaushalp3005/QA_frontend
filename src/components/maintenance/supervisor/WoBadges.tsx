'use client'

/** Status pills from SupervisorHomeScreen (WoStatusChip) and SupervisorPmReviewScreen (StatusPill). */

import { Badge, type Tone } from '@/components/maintenance/ui'

const WO: Record<string, [string, Tone]> = {
  NOTIFIED: ['NOTIFIED', 'amber'],
  ACKNOWLEDGED: ['ACKNOWLEDGED', 'amber'],
  IN_PROGRESS: ['IN PROGRESS', 'blue'],
  SUBMITTED: ['AWAITING SUPERVISOR', 'blue'],
  SUPERVISOR_APPROVED: ['SUP APPROVED', 'green'],
  PENDING_QC: ['PENDING QC', 'amber'],
  QC_APPROVED: ['QC APPROVED', 'green'],
  CLOSED: ['CLOSED', 'green'],
  OVERDUE: ['OVERDUE', 'red'],
  CANCELLED: ['CANCELLED', 'gray'],
  DRAFT: ['DRAFT', 'gray'],
}

export function WoStatusBadge({ status }: { status: string }) {
  // Unknown values read as NOTIFIED, like PmWoStatus.valueOf(...).getOrDefault(NOTIFIED)
  const [label, tone] = WO[status?.toUpperCase()] ?? WO.NOTIFIED
  return <Badge tone={tone}>{label}</Badge>
}

const LOG: Record<string, [string, Tone]> = {
  PASS: ['GOOD', 'green'],
  FAIL: ['NOT GOOD', 'red'],
  NOT_APPLICABLE: ['N/A', 'gray'],
  PENDING: ['PENDING', 'amber'],
}

export function TaskLogBadge({ status }: { status: string }) {
  const [label, tone] = LOG[status?.toUpperCase()] ?? LOG.PENDING
  return <Badge tone={tone}>{label}</Badge>
}
