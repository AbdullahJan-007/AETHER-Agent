import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ServiceWorkerRegistration from "./sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AETHER • AI Coding Architect",
  description: "Local-first AI coding assistant for Next.js and React. Plans deeply, then writes real production code — runs entirely on your machine, no account or hosting required.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AETHER",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Background/text colors intentionally NOT set here — html/body already get
          them from globals.css (`html, body { background: var(--bg); color: var(--text) }`).
          This file used to hardcode the old dark-theme colors directly (bg-[#0a0b0f],
          text-[#e6e8ec]), which fought with the light-theme CSS variables and could
          flash the old dark background before the app's own styles took over. */}
      <body className="min-h-full flex flex-col overflow-hidden">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
