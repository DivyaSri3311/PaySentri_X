import React from "react";

/**
 * PaySentriX Master Brand Identity System
 * 
 * Winner Concept: "PX Sentry Aegis"
 * Architectural fusion of:
 * 1. 'P' (Payment & Natural Language Promise)
 * 2. 'X' (SentriX, Algorithmic Verification & Invariance)
 * 3. Hexagonal Sentry Shield (Deterministic Cyber Defense)
 * 4. Invariance Negative-Space Channel (The mathematical comparison gap)
 * 
 * Tagline: "Beyond Detection. Ahead of Deception."
 */

export function PaySentriXIcon({
  size = 36,
  className = "",
  theme = "dark", // "dark" | "light" | "auto"
  glow = true,
  idSuffix = "def"
}) {
  const isLight = theme === "light";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ${className}`}
      role="img"
      aria-label="PaySentriX Logo Icon"
    >
      <defs>
        {/* Core Electric Cyan Gradient */}
        <linearGradient id={`psx-cyan-${idSuffix}`} x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Dynamic Highlight Gradient */}
        <linearGradient id={`psx-cyan-hi-${idSuffix}`} x1="30" y1="20" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="30%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>

        {/* Structural Dark Titanium Plate */}
        <linearGradient id={`psx-plate-dark-${idSuffix}`} x1="20" y1="15" x2="65" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Structural Light Plate */}
        <linearGradient id={`psx-plate-light-${idSuffix}`} x1="20" y1="15" x2="65" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Specular Edge Highlight */}
        <linearGradient id={`psx-edge-glow-${idSuffix}`} x1="50" y1="8" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
        </linearGradient>

        {glow && (
          <filter id={`psx-glow-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* 1. Outer Faceted Sentry Shield Frame */}
      <path
        d="M50 7 L86 23 L86 58 L50 93 L14 58 L14 23 Z"
        stroke={`url(#psx-edge-glow-${idSuffix})`}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={isLight ? "rgba(240, 249, 255, 0.4)" : "rgba(10, 15, 29, 0.6)"}
      />

      {/* 2. The 'P' Plate (Left Pillar & Upper Vault/Loop) */}
      <path
        d="M24 25 H54 C66 25 72 31 72 41 C72 50 65 56 54 56 H37 V75 L24 67 V25 Z"
        fill={isLight ? `url(#psx-plate-light-${idSuffix})` : `url(#psx-plate-dark-${idSuffix})`}
        stroke={isLight ? "#0F172A" : "#38BDF8"}
        strokeWidth="1.2"
        strokeOpacity={isLight ? "0.6" : "0.3"}
      />

      {/* 3. The 'P' Inner Aperture (Negative Space Counter) */}
      <path
        d="M37 36 H52 C57 36 60 38 60 41 C60 45 57 47 52 47 H37 V36 Z"
        fill={isLight ? "#FFFFFF" : "#0A0F1D"}
      />

      {/* 4. The 'X' Verification Spar (Electric Cyan Descending Vector) */}
      <path
        d="M66 20 L80 27 L48 78 L34 71 Z"
        fill={`url(#psx-cyan-${idSuffix})`}
        filter={glow ? `url(#psx-glow-${idSuffix})` : undefined}
      />

      {/* 5. The 'X' Rising Dynamic Wing (Anchoring into the Sentry Apex) */}
      <path
        d="M44 61 L56 52 L80 81 L68 89 Z"
        fill={`url(#psx-cyan-hi-${idSuffix})`}
        filter={glow ? `url(#psx-glow-${idSuffix})` : undefined}
      />

      {/* 6. Invariance Core Nexus (The Mathematical Verification Point) */}
      <polygon
        points="50,56 57,63 50,70 43,63"
        fill="#00F2FE"
      />

      {/* 7. Precision Micro-Telemetry Accents */}
      <circle cx="50" cy="93" r="2.2" fill="#00F2FE" />
      <circle cx="50" cy="7" r="1.8" fill="#38BDF8" />
    </svg>
  );
}

/**
 * PaySentriX Typographic Wordmark
 * Exact spelling: PaySentriX
 * 'Pay': Bold modern geometric grotesk
 * 'Sentri': High-tech crisp medium weight
 * 'X': Electric Cyan high-contrast cyber accent
 */
export function PaySentriXWordmark({
  theme = "dark", // "dark" | "light" | "auto"
  size = "md", // "sm" | "md" | "lg" | "xl"
  showSubtitle = false,
  subtitleText = "AI UPI THREAT SHIELD",
  className = ""
}) {
  const isLight = theme === "light";

  const sizeStyles = {
    sm: {
      text: "text-base tracking-tight",
      subtitle: "text-[9px] tracking-[0.2em]",
      gap: "gap-0.5",
    },
    md: {
      text: "text-xl tracking-tight",
      subtitle: "text-[10px] tracking-[0.24em]",
      gap: "gap-0.5",
    },
    lg: {
      text: "text-2xl sm:text-3xl tracking-tight",
      subtitle: "text-xs tracking-[0.28em]",
      gap: "gap-1",
    },
    xl: {
      text: "text-4xl sm:text-5xl tracking-tight",
      subtitle: "text-sm tracking-[0.32em]",
      gap: "gap-1.5",
    },
  }[size] || {
    text: "text-xl tracking-tight",
    subtitle: "text-[10px] tracking-[0.24em]",
    gap: "gap-0.5",
  };

  const primaryColor = isLight ? "text-slate-900" : "text-white";
  const sentriColor = isLight ? "text-slate-700" : "text-slate-200";
  const subtitleColor = isLight ? "text-slate-500" : "text-cyan-400/80";

  return (
    <div className={`flex flex-col select-none ${sizeStyles.gap} ${className}`}>
      <div className={`font-heading font-extrabold flex items-baseline leading-none ${sizeStyles.text}`}>
        <span className={primaryColor}>Pay</span>
        <span className={`font-semibold ${sentriColor}`}>Sentri</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-bright to-blue-500 font-extrabold ml-[1px]">
          X
        </span>
      </div>

      {showSubtitle && (
        <span className={`font-mono font-semibold uppercase ${sizeStyles.subtitle} ${subtitleColor}`}>
          {subtitleText}
        </span>
      )}
    </div>
  );
}

/**
 * PaySentriX Master Logo Lockup
 * Supports "horizontal", "icon", "stacked", "lockup" (with full tagline)
 */
export default function PaySentriXLogo({
  variant = "horizontal", // "icon" | "horizontal" | "stacked" | "lockup"
  theme = "dark", // "dark" | "light" | "auto"
  size = "md", // "sm" | "md" | "lg" | "xl"
  showTagline = false,
  tagline = "Beyond Detection. Ahead of Deception.",
  className = "",
  onClick,
  glow = true
}) {
  const isLight = theme === "light";

  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  }[size] || 36;

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} onClick={onClick}>
        <PaySentriXIcon size={iconSizes} theme={theme} glow={glow} />
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={`flex flex-col items-center text-center gap-3 ${className} ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        <PaySentriXIcon size={iconSizes * 1.3} theme={theme} glow={glow} />
        <PaySentriXWordmark
          theme={theme}
          size={size}
          showSubtitle={true}
          subtitleText="AI THREAT SHIELD"
        />
        {showTagline && (
          <p className={`text-xs font-mono tracking-wider mt-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            {tagline}
          </p>
        )}
      </div>
    );
  }

  // Horizontal or Full Brand Lockup
  return (
    <div
      className={`flex items-center gap-3 select-none ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <PaySentriXIcon size={iconSizes} theme={theme} glow={glow} />
      <div className="flex flex-col justify-center">
        <PaySentriXWordmark
          theme={theme}
          size={size}
          showSubtitle={variant === "lockup" || showTagline}
          subtitleText={variant === "lockup" ? "CYBERCUP 6.0 • AI02" : "AI UPI THREAT SHIELD"}
        />
        {showTagline && (
          <p className={`text-[11px] font-mono tracking-wide mt-1 ${isLight ? "text-slate-600" : "text-cyan-400/90 font-medium"}`}>
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Concept B: "The Invariance Nexus" (Alternative explored concept)
 * Abstract payment-security symbol featuring two intersecting invariant topological loops.
 */
export function ConceptBIcon({ size = 48, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="nexus-cyan" x1="10" y1="10" x2="90" y2="90">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="nexus-indigo" x1="10" y1="90" x2="90" y2="10">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
      {/* Promise Loop */}
      <path
        d="M25 50 C25 32 40 22 55 35 L75 55 C85 65 85 80 70 80 C55 80 45 68 35 58 Z"
        stroke="url(#nexus-cyan)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Execution Loop (Interlocking) */}
      <path
        d="M75 50 C75 32 60 22 45 35 L25 55 C15 65 15 80 30 80 C45 80 55 68 65 58 Z"
        stroke="url(#nexus-indigo)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Invariance Aperture */}
      <polygon points="50,42 58,50 50,58 42,50" fill="#00F2FE" />
      <circle cx="50" cy="50" r="2" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Concept C: "The Sentinel Prism" (Alternative explored concept)
 * Dynamic risk-intelligence radar aperture with directional telemetry fins.
 */
export function ConceptCIcon({ size = 48, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="prism-grad" x1="20" y1="10" x2="80" y2="90">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="60%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      {/* Hex Prism Body */}
      <polygon
        points="50,12 85,32 85,68 50,88 15,68 15,32"
        stroke="url(#prism-grad)"
        strokeWidth="3"
        fill="rgba(15, 23, 42, 0.7)"
      />
      {/* Directional Sensor Fin */}
      <path d="M50 20 L75 50 L50 78 L50 56 L35 50 L50 44 Z" fill="url(#prism-grad)" />
      {/* Active Pulse Radar Rings */}
      <circle cx="50" cy="50" r="16" stroke="#00F2FE" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
      <circle cx="50" cy="50" r="5" fill="#00F2FE" />
    </svg>
  );
}
