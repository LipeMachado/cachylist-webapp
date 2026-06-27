import { notFound } from "next/navigation";
import LibraryView, { type LibrarySearchParams } from "@/components/app/LibraryView";
import { PATH_TO_CATEGORY } from "@/lib/media";

export default async function CategoryLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<LibrarySearchParams>;
}) {
  const { category } = await params;
  const categoryKey = PATH_TO_CATEGORY[category];
  if (!categoryKey) notFound();

  const sp = await searchParams;
  return (
    <LibraryView
      selectedCategory={categoryKey}
      basePath={`/app/library/${category}`}
      searchParams={sp}
    />
  );
}
