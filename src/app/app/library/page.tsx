import LibraryView, { type LibrarySearchParams } from "@/components/app/LibraryView";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<LibrarySearchParams>;
}) {
  const params = await searchParams;
  return <LibraryView selectedCategory={null} basePath="/app/library" searchParams={params} />;
}
