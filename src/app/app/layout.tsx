import AppShell from "@/components/app/AppShell";

export default function AppAreaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
