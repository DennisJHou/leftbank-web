export const metadata = { title: { default: "後台", template: "%s｜左岸計畫後台" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="admin-ui min-h-dvh bg-canvas">{children}</div>;
}
