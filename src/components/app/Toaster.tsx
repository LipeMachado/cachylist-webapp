"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Reads ?notice= / ?alert= from the URL and shows a transient toast,
// replacing Rails' flash messages after a redirect.
export default function Toaster() {
  const params = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>(() =>
    [params.get("notice"), params.get("alert")].filter((m): m is string => !!m)
  );

  useEffect(() => {
    if (messages.length === 0) return;

    // Strip the flash params from the URL.
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.searchParams.delete("alert");
    router.replace(url.pathname + url.search, { scroll: false });

    const timer = setTimeout(() => setMessages([]), 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed z-50 right-5.5 bottom-5.5 grid gap-2.5 w-[min(380px,calc(100vw-32px))] pointer-events-none">
      {messages.slice(0, 3).map((message, i) => (
        <p
          key={i}
          className="flash-message m-0 border border-[var(--line)] p-3.5 bg-[var(--panel-bg)] text-[var(--text)] animate-[toast-out_6s_ease_forwards]"
        >
          {message}
        </p>
      ))}
    </div>
  );
}
