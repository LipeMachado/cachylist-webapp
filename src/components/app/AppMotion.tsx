"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

// Ports motion_controller#animateAppPage: stat count-up + card reveal.
export default function AppMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      document.querySelectorAll("[data-dashboard-stat]").forEach((element) => {
        const raw = (element.textContent ?? "").trim();
        const hasPercent = raw.endsWith("%");
        const target = Number.parseInt(raw.replace(/[^0-9-]/g, ""), 10);
        if (Number.isNaN(target)) return;

        const state = { value: 0 };
        element.textContent = hasPercent ? "0%" : "0";
        gsap.to(state, {
          value: target,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => {
            const v = Math.round(state.value);
            element.textContent = hasPercent ? `${v}%` : `${v}`;
          },
        });
      });

      gsap.fromTo(
        "[data-kanban-card-id], .mobile-progress-card, .mobile-latest-card",
        { opacity: 0, y: 14, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.38,
          stagger: 0.025,
          ease: "power3.out",
          clearProps: "opacity,y,scale",
        }
      );
    });
    return () => ctx.revert();
  }, [pathname]);

  return null;
}
