// Suspense fallback for the intercepted media modal (detail + edit). Renders
// its own overlay/card shape since MediaModalShell hasn't resolved yet.
export default function MediaModalLoading() {
  return (
    <>
      <div className="fixed inset-0 z-[95] bg-[var(--overlay-bg)]" />
      <section
        className="fixed z-[96] left-1/2 top-1/2 w-[min(900px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-hidden -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--line)] shadow-[0_24px_80px_rgba(0,0,0,.65)]"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Carregando"
      >
        <div className="px-6 md:px-10 py-8">
          <div className="skeleton h-3 w-24 mb-6" />
          <div className="flex gap-6">
            <div className="skeleton w-[120px] h-[170px] flex-[0_0_120px]" />
            <div className="flex-1 grid gap-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-2.5 w-1/3" />
              <div className="skeleton h-2.5 w-full mt-3" />
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton h-2.5 w-2/3" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
