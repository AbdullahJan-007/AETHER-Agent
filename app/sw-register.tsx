"use client";

import { useEffect } from "react";

// Registers the app-shell service worker (see public/sw.js). Split into its own
// tiny client component so the root layout can stay a server component — that's
// what lets it export `metadata`/`viewport` for the PWA manifest and theme-color.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — app works fine without it, just skips app-shell caching
    });
  }, []);

  return null;
}
