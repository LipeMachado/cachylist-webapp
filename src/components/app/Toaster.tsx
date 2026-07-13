"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ToastMessage {
  id: number;
  text: string;
}

// Reads ?notice= / ?alert= from the URL and shows a transient toast,
// replacing Rails' flash messages after a redirect. Lives inside AppShell, so
// it survives client-side navigations across the whole /app area — messages
// are appended (not replaced) so a second action's flash isn't dropped while
// an earlier toast is still fading out.
export default function Toaster() {
  const params = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const fresh = [params.get("notice"), params.get("alert")].filter(
      (m): m is string => !!m
    );
    if (fresh.length === 0) return;

    const added = fresh.map((text) => ({ id: nextId.current++, text }));
    setMessages((prev) => [...prev, ...added]);

    // Strip the flash params from the URL.
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.searchParams.delete("alert");
    router.replace(url.pathname + url.search, { scroll: false });

    const timers = added.map((m) =>
      setTimeout(() => setMessages((prev) => prev.filter((x) => x.id !== m.id)), 6000)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed z-50 right-5.5 bottom-5.5 grid gap-2.5 w-[min(380px,calc(100vw-32px))] pointer-events-none">
      {messages.slice(0, 3).map((m) => (
        <p
          key={m.id}
          className="flash-message m-0 border border-[var(--line)] p-3.5 bg-[var(--panel-bg)] text-[var(--text)] animate-[toast-out_6s_ease_forwards]"
        >
          {m.text}
        </p>
      ))}
    </div>
  );
}
