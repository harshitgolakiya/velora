"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function GlobalRouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [barWidth, setBarWidth] = useState("0%");
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }
    previousPathnameRef.current = pathname;

    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (hideRef.current) window.clearTimeout(hideRef.current);

    frameRef.current = window.requestAnimationFrame(() => {
      setVisible(true);
      setBarWidth("70%");

      timerRef.current = window.setTimeout(() => {
        setBarWidth("100%");
        hideRef.current = window.setTimeout(() => {
          setVisible(false);
          setBarWidth("0%");
        }, 220);
      }, 400);
    });

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (hideRef.current) window.clearTimeout(hideRef.current);
    };
  }, [pathname]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: 2,
        width: "100%",
        zIndex: 9999,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 160ms linear",
      }}
    >
      <div
        style={{
          height: "100%",
          width: barWidth,
          background: "var(--accent)",
          boxShadow: "0 0 18px color-mix(in srgb, var(--accent) 55%, transparent)",
          transition: "width 420ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}
