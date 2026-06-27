"use client";

import { useEffect } from "react";
import gsap from "gsap";

// Ports motion_controller#animatePage for public (landing/auth) pages.
export default function PublicMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out", overwrite: "auto" },
      });
      timeline.fromTo(
        ".landing-copy > *, .auth-panel > *",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.055, clearProps: "opacity,y" }
      );
      timeline.fromTo(
        "[data-motion]",
        { opacity: 0, y: 14, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, stagger: 0.025, clearProps: "opacity,y,scale" },
        "-=0.2"
      );
      timeline.fromTo(
        ".pace-copy, .category-strip",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, clearProps: "opacity,y" },
        "-=0.15"
      );
    });
    return () => ctx.revert();
  }, []);

  return null;
}
