import Link from "next/link";
import { GripVertical } from "lucide-react";
import { statusClass, type CardData } from "@/lib/media";

// Presentational card. Drag behaviour is delegated by the Kanban client
// component via the data-kanban-* attributes. Mirrors shared/_media_card.
export default function MediaCard({ item }: { item: CardData }) {
  const showBar = item.progressPercentage > 0 && !item.completed;

  return (
    <article
      className="border-b border-[var(--line)] bg-[var(--card-bg)] overflow-hidden transition-[background,filter] duration-150 hover:bg-[var(--hover-bg)]"
      data-kanban-card-id={item.id}
      data-kanban-status={item.statusKey}
    >
      <Link
        href={`/app/media_items/${item.id}`}
        className="flex items-start gap-3 p-4 no-underline text-inherit"
        data-kanban-link
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.cover}
          alt={`Capa de ${item.title}`}
          className="w-12 h-[68px] object-cover flex-[0_0_48px] grayscale-[25%] contrast-110 border border-[var(--line-soft)]"
        />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="text-[12px] font-bold tracking-[.08em] uppercase truncate">{item.title}</strong>
            <span className={`status-dot ${statusClass(item.statusKey)}`} />
          </div>
          <p className="text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)] m-0 truncate">
            {item.category}
            {item.releaseYear ? ` • ${item.releaseYear}` : ""}
          </p>
          <span className="text-[10px] text-[var(--tertiary)]">
            {item.progressLabel || item.platform || "-"}
          </span>
          <div className={`h-[3px] bg-[var(--line-soft)] overflow-hidden mt-2 ${showBar ? "" : "invisible"}`}>
            <span className="block h-full bg-[var(--accent)] transition-[width]" style={{ width: `${item.progressPercentage}%` }} />
          </div>
        </div>
        <span className="flex items-center justify-center text-[var(--muted)] flex-[0_0_24px] self-start mt-1" aria-hidden="true">
          <GripVertical size={14} />
        </span>
      </Link>
    </article>
  );
}
