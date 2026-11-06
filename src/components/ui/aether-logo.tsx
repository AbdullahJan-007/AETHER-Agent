import React from "react";

interface AetherLogoProps {
  className?: string;
  size?: number;
}

export function AetherLogo({ className = "", size = 28 }: AetherLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="AETHER logo"
    >
      <defs>
        <linearGradient id="prism-left" x1="8" y1="44" x2="24" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="prism-right" x1="24" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="prism-bar" x1="15" y1="28" x2="33" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>

      {/* Left Prism Plane */}
      <path
        d="M24 4L7 43H17.5L21.5 32H24V16L18.5 32H12.5L24 7V4Z"
        fill="url(#prism-left)"
      />

      {/* Right Prism Plane */}
      <path
        d="M24 4L41 43H30.5L26.5 32H24V16L29.5 32H35.5L24 7V4Z"
        fill="url(#prism-right)"
      />

      {/* Crossbar Accent */}
      <path
        d="M16 28H32L29.5 34H18.5L16 28Z"
        fill="url(#prism-bar)"
        fillOpacity="0.9"
      />
    </svg>
  );
}
