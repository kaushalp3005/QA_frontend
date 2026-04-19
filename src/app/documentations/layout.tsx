import CreateFormNav from "@/components/documentations/CreateFormNav";

export default function DocumentationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CreateFormNav />
      {children}
    </>
  );
}
