/**
 * The training section carries no chrome of its own.
 *
 * Its forms are listed under "Training" in the main sidebar (see
 * lib/constants/navigation.ts), replacing the TrainingSideNav rail that used to
 * live here. Every page in the section renders <DashboardLayout> itself —
 * directly on the hub and the create pages, and via DocListPage / DocViewPage /
 * DocEditWrapper everywhere else — so wrapping anything around them here would
 * have no effect: DashboardLayout is `fixed inset-0` and escapes its parent.
 * The print routes deliberately render neither.
 */
export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
