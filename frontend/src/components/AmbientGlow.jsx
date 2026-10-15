import React from "react";

export default function AmbientGlow() {
  return (
    <>
      <div className="ambient-mesh" />
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-10" />
    </>
  );
}
