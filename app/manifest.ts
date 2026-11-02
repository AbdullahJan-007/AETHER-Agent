import type { MetadataRoute } from "next";

// Makes AETHER installable — desktop (Chrome/Edge "Install app") and mobile
// ("Add to Home Screen"). Next.js serves this automatically at
// /manifest.webmanifest; no separate static file needed.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AETHER — AI Coding Architect",
    short_name: "AETHER",
    description: "Local-first AI coding assistant for Next.js and React. Plans, then writes real production code — runs entirely on your machine.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#6366f1",
    orientation: "any",
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
