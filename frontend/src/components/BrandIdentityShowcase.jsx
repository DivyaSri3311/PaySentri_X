import React, { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Download,
  Copy,
  Check,
  Eye,
  Sliders,
  Maximize2,
  Layers,
  Palette,
  ExternalLink
} from "lucide-react";
import PaySentriXLogo, { PaySentriXIcon, PaySentriXWordmark, ConceptBIcon, ConceptCIcon } from "./PaySentriXLogo";
import { BRAND } from "../utils/constants";

export default function BrandIdentityShowcase() {
  const [previewTheme, setPreviewTheme] = useState("dark");
  const [copiedFile, setCopiedFile] = useState(null);

  const copyToClipboard = (filename, content) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const assetList = [
    {
      name: "paysentrix-icon.svg",
      type: "Standalone Vector Icon",
      desc: "Transparent background, scaleable from 16px to 1024px. Ideal for app icons, avatars, and hardware POS badges.",
      path: "/paysentrix-icon.svg",
    },
    {
      name: "paysentrix-logo-dark.svg",
      type: "Horizontal Wordmark (Dark)",
      desc: "High-contrast horizontal lockup with crisp white & electric cyan typography for near-black backgrounds.",
      path: "/paysentrix-logo-dark.svg",
    },
    {
      name: "paysentrix-logo-light.svg",
      type: "Horizontal Wordmark (Light)",
      desc: "Calibrated horizontal lockup with obsidian & deep cyan typography for white and light grey backgrounds.",
      path: "/paysentrix-logo-light.svg",
    },
    {
      name: "paysentrix-lockup-dark.svg",
      type: "Full Brand Lockup + Tagline",
      desc: "Complete master lockup featuring the official tagline: 'Beyond Detection. Ahead of Deception.' and CyberCup metadata.",
      path: "/paysentrix-lockup-dark.svg",
    },
    {
      name: "favicon.svg",
      type: "Browser Favicon & App Tile",
      desc: "High-visibility 64x64 squircle tile with bold contrast and luminescence for browser tab bars.",
      path: "/favicon.svg",
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-[#05070D] via-[#0A0F1D] to-[#0F172A] border border-cyan-500/20 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>OFFICIAL BRAND IDENTITY SYSTEM</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                CyberCup 6.0 • AI02
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-white">
              PaySentriX Visual Identity & Brand System
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed">
              Engineered for the next generation of AI-powered financial fraud prevention. 
              Built on mathematical precision, geometric authority, and instant visual trust.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-cyan-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Selected Concept: <strong>PX Sentry Aegis</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span>Tagline: <em>"Beyond Detection. Ahead of Deception."</em></span>
            </div>
          </div>

          <div className="shrink-0 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-2xl flex items-center justify-center">
            <PaySentriXLogo variant="stacked" theme="dark" size="lg" showTagline={true} />
          </div>
        </div>
      </div>

      {/* 2. Interactive Dark / Light Background Preview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-600" />
              <span>Interactive Logo Canvas & Theme Switcher</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify how the brand mark adapts dynamically across dark and light surfaces.
            </p>
          </div>

          {/* Theme Switcher Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setPreviewTheme("dark")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                previewTheme === "dark"
                  ? "bg-[#05070D] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🌙 Dark Environment (#05070D)
            </button>
            <button
              onClick={() => setPreviewTheme("light")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                previewTheme === "light"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ☀️ Light Environment (#FFFFFF)
            </button>
          </div>
        </div>

        {/* Canvas Display */}
        <div
          className={`rounded-2xl p-8 sm:p-12 transition-colors duration-300 border ${
            previewTheme === "dark"
              ? "bg-[#05070D] border-slate-800 text-white"
              : "bg-[#F8FAFC] border-slate-200 text-slate-900"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
            {/* Standalone Icon */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-xl border ${
              previewTheme === "dark" ? "bg-[#0A0F1D]/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <span className="text-[11px] font-mono uppercase tracking-wider mb-4 opacity-60">
                1. Standalone Emblem
              </span>
              <PaySentriXIcon size={76} theme={previewTheme} />
              <span className="text-xs font-mono mt-4 opacity-70">
                76px • Transparent SVG
              </span>
            </div>

            {/* Horizontal Wordmark */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-xl border ${
              previewTheme === "dark" ? "bg-[#0A0F1D]/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <span className="text-[11px] font-mono uppercase tracking-wider mb-4 opacity-60">
                2. Horizontal Wordmark
              </span>
              <PaySentriXLogo variant="horizontal" theme={previewTheme} size="lg" />
              <span className="text-xs font-mono mt-4 opacity-70">
                Exact Wordmark: PaySentriX
              </span>
            </div>

            {/* Full Brand Lockup with Tagline */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-xl border md:col-span-2 lg:col-span-1 ${
              previewTheme === "dark" ? "bg-[#0A0F1D]/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <span className="text-[11px] font-mono uppercase tracking-wider mb-4 opacity-60">
                3. Full Master Lockup
              </span>
              <PaySentriXLogo
                variant="lockup"
                theme={previewTheme}
                size="md"
                showTagline={true}
                tagline="Beyond Detection. Ahead of Deception."
              />
              <span className="text-xs font-mono mt-4 opacity-70">
                Master Brand Lockup
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Scalability & Optical Sizing Test Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-blue-600" />
            <span>Optical Legibility & Scale Test (16px to 128px)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Strict verification: The logo maintains clarity and instantaneous recognition across micro and macro dimensions.
          </p>
        </div>

        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-end justify-between gap-6 overflow-x-auto">
          {/* 16px */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded border border-slate-800">
              <PaySentriXIcon size={16} theme="dark" glow={false} />
            </div>
            <span className="text-[10px] font-mono text-slate-400">16px (Favicon)</span>
          </div>

          {/* 24px */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center bg-slate-900 rounded-lg border border-slate-800">
              <PaySentriXIcon size={24} theme="dark" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">24px (Mobile Nav)</span>
          </div>

          {/* 32px */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-lg border border-slate-800">
              <PaySentriXIcon size={32} theme="dark" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">32px (Sidebar)</span>
          </div>

          {/* 48px */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
              <PaySentriXIcon size={48} theme="dark" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">48px (Header)</span>
          </div>

          {/* 64px */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
              <PaySentriXIcon size={64} theme="dark" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">64px (App Icon)</span>
          </div>

          {/* 96px */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
              <PaySentriXIcon size={96} theme="dark" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">96px (Display Hero)</span>
          </div>
        </div>
      </div>

      {/* 4. Three Explored Design Concepts & Evaluation Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Design Process: Three Explored Concepts & Evaluation Matrix</span>
          </h3>
          <p className="text-xs text-slate-500">
            Comprehensive creative exploration adhering to world-class brand identity standards.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Concept A - Selected */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950/20 to-slate-900/10 border-2 border-cyan-500/50 relative space-y-4">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-400 text-slate-950 uppercase tracking-wider">
                Selected Winner
              </span>
            </div>

            <div className="w-16 h-16 rounded-xl bg-[#05070D] flex items-center justify-center border border-cyan-500/30">
              <PaySentriXIcon size={44} theme="dark" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-cyan-600 font-bold uppercase">Concept A</span>
              <h4 className="text-base font-heading font-extrabold text-slate-900">
                The PX Sentry Aegis
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Geometric fusion of <strong>'P'</strong> (Payment/Promise) and <strong>'X'</strong> (SentriX/Verification) within a faceted hexagonal cyber-shield. An engineered negative-space channel represents mathematical invariance.
            </p>

            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Memorability:</span>
                <span className="font-bold text-emerald-600">10 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">16px Legibility:</span>
                <span className="font-bold text-emerald-600">10 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fintech Relevance:</span>
                <span className="font-bold text-emerald-600">10 / 10</span>
              </div>
            </div>
          </div>

          {/* Concept B */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-xl bg-[#05070D] flex items-center justify-center border border-slate-800">
              <ConceptBIcon size={44} />
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Concept B</span>
              <h4 className="text-base font-heading font-extrabold text-slate-900">
                The Invariance Nexus
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Two continuous isometric loops representing the dual data streams: the incoming NLP promise and the actual UPI execution payload, locking at an invariance verification node.
            </p>

            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Memorability:</span>
                <span className="font-bold text-blue-600">8.8 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">16px Legibility:</span>
                <span className="font-bold text-amber-600">7.5 / 10 (Complex loops)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fintech Relevance:</span>
                <span className="font-bold text-blue-600">9.0 / 10</span>
              </div>
            </div>
          </div>

          {/* Concept C */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-xl bg-[#05070D] flex items-center justify-center border border-slate-800">
              <ConceptCIcon size={44} />
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Concept C</span>
              <h4 className="text-base font-heading font-extrabold text-slate-900">
                The Sentinel Prism
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hexagonal 60-degree telemetry prism with directional sensor fins and active pulse radar rings. Signifies proactive surveillance of real-time transactions.
            </p>

            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Memorability:</span>
                <span className="font-bold text-blue-600">8.5 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">16px Legibility:</span>
                <span className="font-bold text-blue-600">8.0 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fintech Relevance:</span>
                <span className="font-bold text-slate-600">7.8 / 10 (More general cyber)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Production SVG Assets Download Center */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <span>Production SVG Asset Deliverables</span>
            </h3>
            <p className="text-xs text-slate-500">
              Clean, standalone SVG files saved directly in the project public root.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assetList.map((asset) => (
            <div
              key={asset.name}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {asset.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                    {asset.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {asset.desc}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <a
                  href={asset.path}
                  download={asset.name}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </a>
                <a
                  href={asset.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
