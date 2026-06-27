import PublicMotion from "@/components/PublicMotion";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="public-body antialiased m-0 min-h-screen">
      <PublicMotion />
      {children}
    </div>
  );
}
