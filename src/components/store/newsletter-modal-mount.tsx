"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const NewsletterModal = dynamic(() => import("@/components/store/newsletter-modal").then((mod) => mod.NewsletterModal), {
  ssr: false,
});

export function NewsletterModalMount() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!window.localStorage.getItem("velora-newsletter")) setMounted(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return mounted ? <NewsletterModal initialDelayMs={0} /> : null;
}
