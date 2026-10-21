export function AuthShell({ title, lead, children }: { title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center pb-10 pt-14 md:pt-24">
      <div className="w-full max-w-[460px]">
        <h1 className="h-page">{title}</h1>
        {lead && <div className="mt-4 text-body text-ash">{lead}</div>}
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
