import AppShell from "@/components/app/AppShell";

export default function AppAreaLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return <AppShell modal={modal}>{children}</AppShell>;
}
