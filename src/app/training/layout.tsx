import TrainingSideNav, { TrainingTopNav } from "@/components/training/TrainingSideNav";

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1600px] mx-auto">
      <TrainingTopNav />
      <div className="flex items-start gap-5">
        <TrainingSideNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
