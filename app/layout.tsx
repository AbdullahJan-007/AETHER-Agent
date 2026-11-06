import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import ServiceWorkerRegistration from "./sw-register";

export const metadata: Metadata = {
  title: "AETHER • Full-Stack AI Workstation",
  description:
    "Hybrid Cloud & Local-first AI Principal Engineer & UI/UX Workstation. Powered by LangChain & Gemini with tool execution, staged diff review, and safe rollback protection.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
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
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col overflow-hidden">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
