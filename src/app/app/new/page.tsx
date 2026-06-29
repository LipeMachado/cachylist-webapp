import { EMPTY_MEDIA_VALUES } from "@/lib/media-form";
import MediaFormPage from "@/components/app/MediaFormPage";
import { CATEGORY_TO_INT, type CategoryKey } from "@/lib/media";

export default async function NewMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const initialCategory: CategoryKey =
    category && category in CATEGORY_TO_INT ? (category as CategoryKey) : "anime";

  return (
    <>
      <div className="px-10 py-10 border-b border-[var(--line)]">
        <h1 className="text-xl font-extrabold tracking-[-.03em] m-0">Nova Mídia</h1>
        <p className="mt-3 text-sm leading-[1.7] text-[var(--muted)]">
          Cadastre qualquer anime, série, filme, livro ou jogo em uma única ficha.
        </p>
      </div>
      <MediaFormPage
        mode="create"
        initial={{ ...EMPTY_MEDIA_VALUES, category: initialCategory, status: "planned" }}
        cancelHref="/app/library"
        successHref="/app/library"
      />
    </>
  );
}
