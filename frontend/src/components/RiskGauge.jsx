import React from "react";

export default function RiskGauge({
  score = 0,
  size = 180,
  showTier = true,
  subtitle = "Composite Risk Score",
  isDark = false
}) {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * (normalizedScore / 100));

  // Determine color and tier
  let color = "#10b981"; // Safe
  let tier = "SAFE";
  let tierClass = isDark
    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (normalizedScore >= 80) {
    color = "#ef4444"; // Critical
    tier = "CRITICAL THREAT";
    tierClass = isDark
      ? "bg-rose-950/60 text-rose-300 border-rose-500/40 font-bold"
      : "bg-rose-50 text-rose-700 border-rose-200 font-bold";
  } else if (normalizedScore >= 50) {
    color = "#f97316"; // High
    tier = "HIGH RISK";
    tierClass = isDark
      ? "bg-orange-950/60 text-orange-300 border-orange-500/40 font-semibold"
      : "bg-orange-50 text-orange-700 border-orange-200 font-semibold";
  } else if (normalizedScore >= 25) {
    color = "#f59e0b"; // Medium
    tier = "SUSPICIOUS";
    tierClass = isDark
      ? "bg-amber-950/60 text-amber-300 border-amber-500/40 font-medium"
      : "bg-amber-50 text-amber-700 border-amber-200 font-medium";
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
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
            stroke={isDark ? "#334155" : "#e2e8f0"}
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
          <span className={`text-[10px] font-mono uppercase tracking-widest mt-0.5 ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}>
            / 100
          </span>
        </div>
      </div>

      {showTier && (
        <div className="mt-2 text-center flex flex-col items-center">
          <span className={`px-2.5 py-0.5 text-xs font-mono rounded-full border ${tierClass}`}>
            {tier}
          </span>
          {subtitle && (
            <span className={`text-[11px] mt-1 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
