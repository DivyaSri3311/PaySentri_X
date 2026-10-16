import React, { useState, useEffect } from "react";
import AmbientGlow from "./components/AmbientGlow";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import ComplaintModal from "./components/ComplaintModal";
import AuditDetailModal from "./components/AuditDetailModal";

// 10 Pages
import CommandCorePage from "./pages/CommandCorePage";
import MuleNetworkPage from "./pages/MuleNetworkPage";
import TransactionIntelligencePage from "./pages/TransactionIntelligencePage";
import AIPaymentContractPage from "./pages/AIPaymentContractPage";
import MessageIntelligencePage from "./pages/MessageIntelligencePage";
import PaymentLinkScannerPage from "./pages/PaymentLinkScannerPage";
import QRGuardianPage from "./pages/QRGuardianPage";
import GhostPayDetectorPage from "./pages/GhostPayDetectorPage";
import FraudEvolutionLabPage from "./pages/FraudEvolutionLabPage";
import DataScienceStudioPage from "./pages/DataScienceStudioPage";
import AuditHistoryPage from "./pages/AuditHistoryPage";
import SettingsPage from "./pages/SettingsPage";

import { api } from "./utils/api";

export default function App() {
  const [activePage, setActivePage] = useState("command-core");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [prefilledData, setPrefilledData] = useState(null);

  // Modals state
  const [complaintDraft, setComplaintDraft] = useState(null);
  const [auditDetailRecord, setAuditDetailRecord] = useState(null);

  // Theme state synchronized with existing localStorage and system
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("paysentrix_scam_checker_theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    // Keep HTML root class synchronized for Tailwind dark mode
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const stored = localStorage.getItem("paysentrix_scam_checker_theme") || "light";
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
      } catch {}
    };
    window.addEventListener("paysentrix_scam_checker_theme_changed", handleThemeChange);
    return () => window.removeEventListener("paysentrix_scam_checker_theme_changed", handleThemeChange);
  }, []);

  // Heartbeat check on mount and interval
  useEffect(() => {
    const pingBackend = async () => {
      try {
        const res = await api.checkHealth();
        setBackendOnline(res.status === "ONLINE");
      } catch {
        setBackendOnline(false);
      }
    };
    pingBackend();
    const interval = setInterval(pingBackend, 12000);
    return () => clearInterval(interval);
  }, []);

  // Demo Presets selection handler
  const handleSelectPreset = (preset) => {
    setPrefilledData(preset.payload);
    setActivePage(preset.page);
  };

  const openComplaintModal = (draftText) => {
    setComplaintDraft(draftText);
  };

  const openAuditDetail = (record) => {
    setAuditDetailRecord(record);
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark bg-[#070b14] text-slate-100" : "bg-[#f8fafc] text-slate-800"} flex relative overflow-x-hidden transition-colors duration-200`}>
      {/* Background Grid */}
      <AmbientGlow />

      {/* Persistent Left Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        backendOnline={backendOnline}
        theme={theme}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen z-10 w-full overflow-x-hidden">
        {/* Top Navigation */}
        <TopNav
          activePage={activePage}
          setActivePage={setActivePage}
          setIsMobileOpen={setIsMobileOpen}
          backendOnline={backendOnline}
          onSelectPreset={handleSelectPreset}
          currentTheme={theme}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-16">
          {activePage === "command-core" && (
            <CommandCorePage
              setActivePage={setActivePage}
              onOpenAuditDetail={openAuditDetail}
              onSelectPreset={handleSelectPreset}
            />
          )}

          {activePage === "mule-network" && (
            <MuleNetworkPage />
          )}

          {activePage === "transaction-intel" && (
            <TransactionIntelligencePage prefilledData={prefilledData} />
          )}

          {activePage === "ai-payment-contract" && (
            <AIPaymentContractPage
              prefilledData={prefilledData}
              onOpenComplaintModal={openComplaintModal}
            />
          )}

          {activePage === "message-intel" && (
            <MessageIntelligencePage prefilledData={prefilledData} />
          )}

          {activePage === "link-scanner" && (
            <PaymentLinkScannerPage prefilledData={prefilledData} />
          )}

          {activePage === "qr-guardian" && (
            <QRGuardianPage
              prefilledData={prefilledData}
              setActivePage={setActivePage}
              onOpenComplaintModal={openComplaintModal}
            />
          )}

          {activePage === "ghostpay-detector" && (
            <GhostPayDetectorPage
              prefilledData={prefilledData}
              setActivePage={setActivePage}
              onOpenComplaintModal={openComplaintModal}
            />
          )}

          {activePage === "fraud-evolution" && (
            <FraudEvolutionLabPage />
          )}

          {activePage === "data-science-studio" && (
            <DataScienceStudioPage />
          )}

          {activePage === "audit-history" && (
            <AuditHistoryPage
              onOpenAuditDetail={openAuditDetail}
              onOpenComplaintModal={openComplaintModal}
            />
          )}

          {activePage === "settings" && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* 1930 Cybercrime Complaint Modal */}
      <ComplaintModal
        isOpen={!!complaintDraft}
        onClose={() => setComplaintDraft(null)}
        draftText={complaintDraft}
      />

      {/* Forensic Audit Detail Modal */}
      <AuditDetailModal
        isOpen={!!auditDetailRecord}
        onClose={() => setAuditDetailRecord(null)}
        record={auditDetailRecord}
        onOpenComplaintModal={openComplaintModal}
      />
    </div>
  );
}
