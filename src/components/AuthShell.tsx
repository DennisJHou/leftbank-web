export function AuthShell({ title, lead, children }: { title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-12 md:py-20">
      <div className="w-full max-w-[440px]">
        <h1 className="display text-[36px] md:text-[44px]">{title}</h1>
        {lead && <div className="mt-3 text-[15px] text-stone">{lead}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
