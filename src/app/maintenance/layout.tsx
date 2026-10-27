import MtShell from '@/components/maintenance/MtShell'

export const metadata = {
  title: 'Candor Maintenance System',
  description: 'Machines, breakdowns, preventive maintenance and utilities for Candor Foods plants.',
}

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return <MtShell>{children}</MtShell>
}
