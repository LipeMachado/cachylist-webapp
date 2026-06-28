"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

// "Spatial page transitions": map the route hierarchy to a 2D position and have
// the incoming page enter from the direction that matches where you moved
// (deeper = from below, sibling category = from the side). Adapted from the
// SvelteKit idea. This component is mounted once in the persistent app layout;
// the inner motion.div is keyed by pathname so it re-mounts (and animates in) on
// every navigation. The previous path is tracked with a ref updated in an effect,
// so the value read during render is always the path we came *from*.

const CATEGORY_X: Record<string, number> = {
  animes: -2,
  series: -1,
  movies: 0,
  books: 1,
  games: 2,
};

function position(pathname: string): { x: number; y: number } {
  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean); // ["app","library","animes"]
  if (seg.length <= 1) return { x: 0, y: 0 }; // /app (dashboard) = root

  const section = seg[1];
  if (section === "library") {
    const cat = seg[2];
    return { x: cat ? (CATEGORY_X[cat] ?? 0) : 0, y: 1 };
  }
  if (section === "users") return { x: 3, y: 1 };
  if (section === "media_items") {
    const isEdit = seg[seg.length - 1] === "edit";
    return { x: 0, y: isEdit ? 3 : 2 };
  }
  return { x: 0, y: 1 };
}

function clamp(n: number) {
  return Math.max(-3, Math.min(3, n));
}

const UNIT_VH = 6;

export default function SpatialTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  // On the first render after a navigation, `prevPath` still holds the path we
  // came from (state updates one render later), which is exactly what we need to
  // compute the entrance direction. `initial` is only read on mount, so the
  // follow-up render doesn't affect the animation.
  const [prevPath, setPrevPath] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrevPath(pathname);
  }, [pathname]);

  const curr = position(pathname);
  const prev = prevPath ? position(prevPath) : curr;
  const dx = clamp(curr.x - prev.x);
  const dy = clamp(curr.y - prev.y);

  const initial = reduced
    ? { opacity: 0 }
    : { opacity: 0, x: `${dx * UNIT_VH}vh`, y: `${dy * UNIT_VH}vh` };

  return (
    <motion.div
      key={pathname}
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{ minHeight: "100%" }}
    >
      {children}
    </motion.div>
  );
}
