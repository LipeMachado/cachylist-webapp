// Ports shared/_stat_card.
export default function StatCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  meta?: string;
  accent?: string;
}) {
  return (
    <article className={`grid gap-4 min-w-0 px-4 md:px-6 py-6 border-r border-[var(--line)] bg-[var(--panel-bg)] ${accent ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[10px] font-bold tracking-[.16em] uppercase leading-[1.5] text-[var(--muted)] m-0 break-words">
          {label}
        </p>
        <span className="flex items-center justify-center w-[28px] h-[28px] border border-[var(--line)] flex-[0_0_28px] text-[var(--accent)]">
          {icon}
        </span>
      </div>
      <div>
        <strong className="block text-[clamp(28px,3vw,42px)] leading-none font-black m-0">{value}</strong>
        <small
          className={`block mt-2 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--tertiary)] ${meta ? "" : "invisible"}`}
          aria-hidden={meta ? undefined : true}
        >
          {meta || "0%"}
        </small>
      </div>
    </article>
  );
}
