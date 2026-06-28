// Instant loading shell shown while an /app route streams in (Suspense fallback).
export default function AppLoading() {
  return (
    <div className="p-6 md:p-10" aria-busy="true" aria-label="Carregando">
      <div className="skeleton h-3 w-40 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-[var(--line)] p-6">
            <div className="skeleton h-2 w-20 mb-5" />
            <div className="skeleton h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="flex gap-px overflow-hidden">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="flex-1 min-w-[200px] border border-[var(--line)]">
            <div className="h-[60px] px-6 flex items-center border-b border-[var(--line)]">
              <div className="skeleton h-2 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="flex items-start gap-3 p-4 border-b border-[var(--line)]">
                <div className="skeleton w-12 h-[68px] flex-[0_0_48px]" />
                <div className="flex-1">
                  <div className="skeleton h-2.5 w-3/4 mb-2" />
                  <div className="skeleton h-2 w-1/2 mb-3" />
                  <div className="skeleton h-[3px] w-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
