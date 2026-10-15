import React from "react";

export default function RiskGauge({ score = 0, size = 180, showTier = true, subtitle = "Composite Risk Score" }) {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  // Semicircle arc (180 deg) or 240 deg arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * (normalizedScore / 100));

  // Determine color and tier
  let color = "#10b981"; // Safe
  let glowColor = "rgba(16, 185, 129, 0.35)";
  let tier = "SAFE";
  let tierClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  if (normalizedScore >= 80) {
    color = "#ef4444"; // Critical
    glowColor = "rgba(239, 68, 68, 0.45)";
    tier = "CRITICAL THREAT";
    tierClass = "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
  } else if (normalizedScore >= 50) {
    color = "#f97316"; // High
    glowColor = "rgba(249, 115, 22, 0.35)";
    tier = "HIGH RISK";
    tierClass = "bg-orange-500/15 text-orange-400 border-orange-500/30";
  } else if (normalizedScore >= 25) {
    color = "#f59e0b"; // Medium
    glowColor = "rgba(245, 158, 11, 0.35)";
    tier = "SUSPICIOUS";
    tierClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-135"
          width={size}
          height={size}
          viewBox="0 0 160 160"
        >
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Active Meter Stroke */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease",
              filter: `drop-shadow(0 0 8px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="font-heading text-4xl lg:text-5xl font-extrabold tracking-tight transition-colors duration-500"
            style={{ color: color }}
          >
            {normalizedScore.toFixed(0)}
          </span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {showTier && (
        <div className="mt-2 text-center flex flex-col items-center">
          <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border ${tierClass}`}>
            {tier}
          </span>
          {subtitle && (
            <span className="text-[11px] text-slate-400 mt-1 font-medium">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
