import React, { useState, useEffect, useRef, useMemo } from "react";
import cytoscape from "cytoscape";
import {
  Network,
  Play,
  Pause,
  RotateCcw,
  Zap,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Download,
  Search,
  Filter,
  Maximize2,
  Crosshair,
  Clock,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  SkipBack,
  Layers,
  Activity,
  FileText,
  User,
  Users,
  Eye,
  CheckCircle2,
  X,
  Radio,
  ExternalLink,
  Info
} from "lucide-react";
import { api } from "../utils/api";

const SCENARIOS = [
  {
    id: "FAN_IN",
    title: "Fan-In Mule Network",
    description: "Multiple victim/feeder accounts funnel funds into one central mule aggregator.",
    tag: "Aggregator Pattern",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
  },
  {
    id: "FAN_OUT",
    title: "Fan-Out Laundering Pattern",
    description: "One primary mule account receives funds and rapidly disperses them to multiple downstream accounts.",
    tag: "Dispersion Pattern",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200"
  },
  {
    id: "RAPID_PASS_THROUGH",
    title: "Rapid Pass-Through Chain",
    description: "Sequential relay of funds across intermediate nodes with holding time under 45 seconds.",
    tag: "High Velocity Relay",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200"
  },
  {
    id: "CIRCULAR",
    title: "Circular Money Movement",
    description: "Time-ordered circular transfers returning to originating node to obfuscate transaction trails.",
    tag: "Circular Ring",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200"
  },
  {
    id: "LAYERED_MULE",
    title: "Layered Mule Network Ring",
    description: "Complex multi-tier topology: Entry accounts → Tier 1 Mules → Tier 2 Splitters → Final Collector.",
    tag: "Advanced Syndicate",
    badgeColor: "bg-red-50 text-red-700 border-red-200"
  }
];

export default function MuleNetworkPage() {
  // --- State Variables ---
  const [overview, setOverview] = useState({
    total_accounts_monitored: 243,
    suspicious_accounts_detected: 0,
    active_mule_clusters: 0,
    suspicious_transaction_volume: 0,
    formatted_suspicious_volume: "₹0",
    simulation_status: "PAUSED",
    simulation_speed: "1x",
    total_transactions_stored: 0
  });

  const [clusters, setClusters] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountDetail, setAccountDetail] = useState(null);
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, SUSPICIOUS, HIGH_RISK

  // Simulation controls
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [isInjectModalOpen, setIsInjectModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [injectingScenario, setInjectingScenario] = useState(false);
  const [injectSuccessMessage, setInjectSuccessMessage] = useState(null);

  // Money Trail Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayData, setReplayData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1.0);
  const replayTimerRef = useRef(null);

  // Cytoscape References
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);

  // --- Initial Data Fetch & Poll ---
  const fetchOverviewAndClusters = async () => {
    try {
      const [ov, cl, al] = await Promise.all([
        api.getMuleNetOverview(),
        api.getMuleNetClusters(),
        api.getMuleNetAlerts(30)
      ]);
      setOverview(ov);
      setIsSimRunning(ov.simulation_status === "LIVE");
      setClusters(cl);
      setAlerts(al);
    } catch (err) {
      console.warn("Failed to fetch MuleNet state:", err);
    }
  };

  useEffect(() => {
    fetchOverviewAndClusters();
  }, []);

  // --- SSE Real-Time Stream Subscription ---
  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource("http://localhost:8000/api/mulenet/stream");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "new_transaction") {
            const tx = payload.transaction;
            // Add live alert entry
            setAlerts((prev) => [
              {
                id: tx.id,
                timestamp: tx.timestamp,
                alert_type: payload.alerts?.length ? payload.alerts[0].alert_type : "TRANSACTION_PROCESSED",
                severity: payload.alerts?.length ? payload.alerts[0].severity : "INFO",
                account_masked: payload.sender?.masked_upi || tx.sender_id,
                details: `${payload.sender?.masked_upi || tx.sender_id} → ${payload.receiver?.masked_upi || tx.receiver_id}: ₹${tx.amount.toLocaleString("en-IN")}`
              },
              ...prev.slice(0, 40)
            ]);

            // Dynamically add edge to cytoscape if both nodes exist
            if (cyRef.current) {
              const cy = cyRef.current;
              const sourceNode = cy.$id(tx.sender_id);
              const targetNode = cy.$id(tx.receiver_id);

              if (sourceNode.length && targetNode.length) {
                cy.add({
                  group: "edges",
                  data: {
                    id: `edge_${tx.id}`,
                    source: tx.sender_id,
                    target: tx.receiver_id,
                    amount: tx.amount,
                    label: `₹${tx.amount.toLocaleString("en-IN")}`,
                    timestamp: tx.timestamp,
                    tx_id: tx.id
                  }
                });

                // Update node attributes if sender/receiver risk scores changed
                if (payload.sender) {
                  sourceNode.data("risk_score", payload.sender.risk_score);
                  sourceNode.data("risk_tier", payload.sender.risk_tier);
                }
                if (payload.receiver) {
                  targetNode.data("risk_score", payload.receiver.risk_score);
                  targetNode.data("risk_tier", payload.receiver.risk_tier);
                }
              }
            }

            // Periodic refresh of overview
            fetchOverviewAndClusters();
          }
        } catch {
          // Keep-alive or non-JSON message
        }
      };

      eventSource.onerror = () => {
        // SSE reconnects automatically
      };
    } catch (e) {
      console.warn("SSE connection error:", e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // --- Load Account Forensic Detail ---
  useEffect(() => {
    if (!selectedAccountId) {
      setAccountDetail(null);
      return;
    }
    const fetchAcc = async () => {
      try {
        const detail = await api.getMuleNetAccount(selectedAccountId);
        setAccountDetail(detail);
      } catch (err) {
        console.error("Failed to load account detail:", err);
      }
    };
    fetchAcc();
  }, [selectedAccountId]);

  // --- Initialize & Render Cytoscape Graph ---
  const loadGraphData = async () => {
    setGraphLoading(true);
    try {
      const minR = riskFilter === "HIGH_RISK" ? 60.0 : riskFilter === "SUSPICIOUS" ? 30.0 : 0.0;
      const res = await api.getMuleNetGraph({
        focusAccount: selectedAccountId || "",
        focusCluster: selectedClusterId || "",
        minRisk: minR,
        limit: 220
      });

      if (!cyContainerRef.current) return;

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const isDarkTheme = document.documentElement.classList.contains("dark");

      const cy = cytoscape({
        container: cyContainerRef.current,
        elements: res.elements,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(node_color)",
              label: "data(label)",
              color: isDarkTheme ? "#f1f5f9" : "#1e293b",
              "font-size": "10px",
              "font-weight": 600,
              "text-valign": "bottom",
              "text-margin-y": 5,
              width: "data(node_size)",
              height: "data(node_size)",
              "border-width": 2,
              "border-color": isDarkTheme ? "#0f172a" : "#ffffff",
              "transition-property": "background-color, border-color, width, height",
              "transition-duration": "0.3s"
            }
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 4,
              "border-color": "#0ea5e9",
              "shadow-blur": 15,
              "shadow-color": "#0ea5e9",
              "shadow-opacity": 0.5
            }
          },
          {
            selector: "node.highlighted",
            style: {
              "border-width": 4,
              "border-color": "#f59e0b",
              "shadow-blur": 20,
              "shadow-color": "#f59e0b",
              "shadow-opacity": 0.8
            }
          },
          {
            selector: "node.dimmed",
            style: {
              opacity: 0.25
            }
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": isDarkTheme ? "#475569" : "#cbd5e1",
              "target-arrow-color": isDarkTheme ? "#64748b" : "#94a3b8",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "arrow-scale": 0.8,
              opacity: 0.65
            }
          },
          {
            selector: "edge.highlighted",
            style: {
              width: 3.5,
              "line-color": "#f59e0b",
              "target-arrow-color": "#f59e0b",
              opacity: 1.0,
              "z-index": 999
            }
          },
          {
            selector: "edge.dimmed",
            style: {
              opacity: 0.1
            }
          }
        ],
        layout: {
          name: "cose",
          idealEdgeLength: 80,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 450000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 800,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        }
      });

      // Event Handlers
      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        setSelectedAccountId(node.id());
      });

      cy.on("mouseover", "node", (evt) => {
        const node = evt.target;
        setHoveredNode(node.data());
      });

      cy.on("mouseout", "node", () => {
        setHoveredNode(null);
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          setSelectedAccountId(null);
        }
      });

      cyRef.current = cy;
    } catch (err) {
      console.error("Failed to render graph:", err);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, [riskFilter, selectedClusterId]);

  useEffect(() => {
    const handleTheme = () => {
      loadGraphData();
    };
    window.addEventListener("paysentrix_scam_checker_theme_changed", handleTheme);
    return () => window.removeEventListener("paysentrix_scam_checker_theme_changed", handleTheme);
  }, []);

  // --- Graph Controls ---
  const handleFitScreen = () => {
    if (cyRef.current) {
      cyRef.current.animate({ fit: { padding: 40 } }, { duration: 400 });
    }
  };

  const handleResetGraph = () => {
    setSelectedAccountId(null);
    setSelectedClusterId(null);
    setRiskFilter("ALL");
    setSearchQuery("");
    loadGraphData();
  };

  // --- Search Node ---
  const handleSearch = (e) => {
    e.preventDefault();
    if (!cyRef.current || !searchQuery.trim()) return;

    const term = searchQuery.toLowerCase().trim();
    const cy = cyRef.current;
    const targetNode = cy.nodes().filter((n) => {
      const data = n.data();
      return (
        data.id.toLowerCase().includes(term) ||
        (data.label && data.label.toLowerCase().includes(term)) ||
        (data.name && data.name.toLowerCase().includes(term))
      );
    });

    if (targetNode.length > 0) {
      const first = targetNode[0];
      setSelectedAccountId(first.id());
      cy.animate(
        {
          center: { eles: first },
          zoom: 1.8
        },
        { duration: 500 }
      );
    }
  };

  // --- Simulation Controls ---
  const handleToggleSimulation = async () => {
    try {
      if (isSimRunning) {
        const res = await api.pauseMuleNetSimulation();
        setIsSimRunning(false);
        setOverview(res.overview);
      } else {
        const res = await api.startMuleNetSimulation();
        setIsSimRunning(true);
        setOverview(res.overview);
      }
    } catch (err) {
      console.error("Simulation toggle error:", err);
    }
  };

  const handleResetSimulation = async () => {
    try {
      const res = await api.resetMuleNetSimulation();
      setIsSimRunning(false);
      setOverview(res.overview);
      setSelectedAccountId(null);
      setSelectedClusterId(null);
      setIsReplaying(false);
      fetchOverviewAndClusters();
      loadGraphData();
    } catch (err) {
      console.error("Reset simulation error:", err);
    }
  };

  const handleSpeedChange = async (speedVal) => {
    try {
      const res = await api.configMuleNetSimulation({ speed: speedVal });
      setSimSpeed(speedVal);
      setOverview(res);
    } catch (err) {
      console.error("Speed change error:", err);
    }
  };

  const handleInjectScenario = async (scenarioId) => {
    setInjectingScenario(true);
    try {
      const res = await api.injectMuleNetScenario(scenarioId);
      setIsInjectModalOpen(false);
      setInjectSuccessMessage(
        `Injected ${res.transactions_injected} synthetic transactions for ${scenarioId} into live pipeline!`
      );
      setTimeout(() => setInjectSuccessMessage(null), 5000);

      // Refresh overview, clusters, and graph
      await fetchOverviewAndClusters();
      await loadGraphData();
    } catch (err) {
      console.error("Failed to inject scenario:", err);
    } finally {
      setInjectingScenario(false);
    }
  };

  // --- Money Trail Replay Engine ---
  const handleStartReplay = async (targetId) => {
    try {
      const replay = await api.getMuleNetReplay(targetId || selectedAccountId || "MULE_CLUSTER_001");
      if (!replay || !replay.steps || replay.steps.length === 0) {
        alert("No historical transactions available for replay on this account.");
        return;
      }
      setReplayData(replay);
      setCurrentStepIndex(0);
      setIsReplaying(true);
      setIsReplayPlaying(true);
      applyReplayStep(replay.steps, 0);
    } catch (err) {
      console.error("Replay fetch error:", err);
    }
  };

  const applyReplayStep = (steps, stepIdx) => {
    if (!cyRef.current || !steps || steps.length === 0) return;
    const cy = cyRef.current;
    const currentStep = steps[stepIdx];

    // Reset previous highlights
    cy.elements().removeClass("highlighted dimmed");

    // Dim all elements first
    cy.elements().addClass("dimmed");

    // Highlight current edge and endpoints
    const edge = cy.$id(`edge_${currentStep.tx_id}`);
    const src = cy.$id(currentStep.sender_id);
    const dst = cy.$id(currentStep.receiver_id);

    edge.removeClass("dimmed").addClass("highlighted");
    src.removeClass("dimmed").addClass("highlighted");
    dst.removeClass("dimmed").addClass("highlighted");

    // Animate camera to focus on this transfer
    if (src.length && dst.length) {
      cy.animate(
        {
          center: { eles: src.union(dst) },
          zoom: 1.4
        },
        { duration: 400 }
      );
    }
  };

  // Step advancement timer
  useEffect(() => {
    if (!isReplayPlaying || !replayData) return;

    const intervalMs = 2000 / replaySpeed;
    replayTimerRef.current = setTimeout(() => {
      if (currentStepIndex < replayData.steps.length - 1) {
        const nextIdx = currentStepIndex + 1;
        setCurrentStepIndex(nextIdx);
        applyReplayStep(replayData.steps, nextIdx);
      } else {
        setIsReplayPlaying(false);
      }
    }, intervalMs);

    return () => clearTimeout(replayTimerRef.current);
  }, [isReplayPlaying, currentStepIndex, replayData, replaySpeed]);

  const handleReplayNext = () => {
    if (!replayData || currentStepIndex >= replayData.steps.length - 1) return;
    const nextIdx = currentStepIndex + 1;
    setCurrentStepIndex(nextIdx);
    applyReplayStep(replayData.steps, nextIdx);
  };

  const handleReplayPrev = () => {
    if (!replayData || currentStepIndex <= 0) return;
    const prevIdx = currentStepIndex - 1;
    setCurrentStepIndex(prevIdx);
    applyReplayStep(replayData.steps, prevIdx);
  };

  const handleReplayRestart = () => {
    if (!replayData) return;
    setCurrentStepIndex(0);
    setIsReplayPlaying(true);
    applyReplayStep(replayData.steps, 0);
  };

  const handleCloseReplay = () => {
    setIsReplaying(false);
    setIsReplayPlaying(false);
    setReplayData(null);
    if (cyRef.current) {
      cyRef.current.elements().removeClass("highlighted dimmed");
      cyRef.current.animate({ fit: { padding: 40 } }, { duration: 400 });
    }
  };

  // --- Export Case Report ---
  const handleExportCase = async (clusterId) => {
    try {
      const targetC = clusterId || (clusters.length ? clusters[0].id : "MULE_CLUSTER_001");
      const report = await api.exportMuleNetCase(targetC);

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${report.case_identifier}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Export report error:", err);
    }
  };

  // --- View Transactions Modal ---
  const handleOpenTransactionsModal = async () => {
    try {
      const res = await api.getMuleNetTransactions(50, 0);
      setTxHistory(res.transactions || []);
      setIsTxModalOpen(true);
    } catch (err) {
      console.error("Failed to load tx history:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Top Header & Demo Mode Disclaimer --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Mule Network Intelligence
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Radio className="w-3 h-3 mr-1 animate-pulse text-blue-600" />
              DEMO MODE — SYNTHETIC TRANSACTION DATA
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Trace suspicious fund movements, identify connected accounts, and investigate potential money mule networks.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsInjectModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Inject Fraud Scenario
          </button>

          <button
            onClick={() => handleExportCase(selectedClusterId || (clusters[0] && clusters[0].id))}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export Case Report
          </button>
        </div>
      </div>

      {/* --- Success Banner for Injected Scenarios --- */}
      {injectSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{injectSuccessMessage}</span>
          </div>
          <button onClick={() => setInjectSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- Top Network Overview: 4 Dynamic KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Accounts Monitored
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {overview.total_accounts_monitored.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active UPI endpoints tracked in graph
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Suspicious Accounts Detected
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              {overview.suspicious_accounts_detected}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Risk score ≥ 30 (Moderate to Critical)
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Mule Clusters
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">
              {overview.active_mule_clusters}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Connected suspicious subgraphs
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Suspicious Transaction Volume
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {overview.formatted_suspicious_volume}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total volume across flagged nodes
            </p>
          </div>
        </div>
      </div>

      {/* --- Simulation Control Toolbar & Graph Filters --- */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Stream Controls */}
        <div className="flex items-center space-x-2">
          {/* Status Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isSimRunning ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isSimRunning ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span className="text-xs font-bold text-slate-700 tracking-wide">
              {isSimRunning ? "LIVE STREAMING" : "PAUSED"}
            </span>
          </div>

          {/* Start / Pause */}
          <button
            onClick={handleToggleSimulation}
            className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isSimRunning
                ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
            }`}
          >
            {isSimRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 mr-1" /> Pause Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" /> Start Stream
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={handleResetSimulation}
            title="Reset Simulation baseline"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Speed:</span>
            {[1.0, 2.0, 5.0, 10.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  simSpeed === s
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Right: Graph Filter & Search */}
        <div className="flex items-center space-x-2">
          {/* Risk Filter */}
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Nodes</option>
              <option value="SUSPICIOUS">Suspicious Only (≥30)</option>
              <option value="HIGH_RISK">High Risk (≥60)</option>
            </select>
          </div>

          {/* Account Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search UPI or ACC ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 w-48 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>

          {/* Fit Screen */}
          <button
            onClick={handleFitScreen}
            title="Fit to Screen"
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- Main Interactive Workspace: Graph + Investigation Panel --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Cytoscape Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col relative min-h-[580px]">
          {/* Canvas Toolbar overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
            <button
              onClick={handleResetGraph}
              className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-xs border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              Reset View
            </button>
            {selectedClusterId && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                Focused: {selectedClusterId}
                <button onClick={() => setSelectedClusterId(null)} className="ml-1 text-rose-500 hover:text-rose-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Cytoscape Viewport Container */}
          <div ref={cyContainerRef} className="w-full flex-1 h-[580px] bg-slate-50/40 relative cursor-grab active:cursor-grabbing">
            {graphLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xs z-20">
                <div className="flex items-center space-x-2 text-slate-600 text-xs font-semibold">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Stabilizing Network Topology...</span>
                </div>
              </div>
            )}
          </div>

          {/* Hover Tooltip Card */}
          {hoveredNode && (
            <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 p-3 rounded-xl shadow-lg text-xs w-64 pointer-events-none">
              <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                <span className="truncate">{hoveredNode.label}</span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: hoveredNode.node_color }}
                >
                  Score: {hoveredNode.risk_score}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div>Type: {hoveredNode.account_type}</div>
                <div>Inbound: {hoveredNode.formatted_inbound} ({hoveredNode.unique_senders} senders)</div>
                <div>Outbound: {hoveredNode.formatted_outbound} ({hoveredNode.unique_receivers} receivers)</div>
                {hoveredNode.avg_holding_time && (
                  <div>Avg Holding Time: {hoveredNode.avg_holding_time}s</div>
                )}
              </div>
            </div>
          )}

          {/* Compact Graph Legend */}
          <div className="p-3 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-slate-800">Legend:</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                <span>Normal (&lt;30)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span>Suspicious (30–59)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span>High-Risk (60–79)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#991b1b]" />
                <span>Network Hub (80–100)</span>
              </div>
            </div>
            <div className="text-slate-400 text-[10px]">
              Drag nodes to rearrange • Scroll to zoom • Click node to inspect
            </div>
          </div>
        </div>

        {/* Right: Forensic Investigation Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between min-h-[580px]">
          {accountDetail ? (
            <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {accountDetail.id}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {accountDetail.masked_upi}
                  </h3>
                  <div className="text-xs text-slate-500">{accountDetail.name} • {accountDetail.category || accountDetail.account_type}</div>
                </div>

                <div className="text-right">
                  <div
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      accountDetail.risk_score >= 80
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : accountDetail.risk_score >= 60
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : accountDetail.risk_score >= 30
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}
                  >
                    Score: {accountDetail.risk_score}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    {accountDetail.risk_tier}
                  </div>
                </div>
              </div>

              {/* Financial Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 text-[10px] font-semibold">Total Inbound</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {accountDetail.formatted_inbound}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {accountDetail.unique_senders} unique senders
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 text-[10px] font-semibold">Total Outbound</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {accountDetail.formatted_outbound}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {accountDetail.unique_receivers} unique receivers
                  </div>
                </div>
              </div>

              {/* Holding time */}
              {accountDetail.avg_holding_time_sec !== null && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold">Avg Fund Holding Time:</span>
                  </div>
                  <span className="font-bold">{accountDetail.avg_holding_time_sec}s</span>
                </div>
              )}

              {/* Calculated Risk Justifications */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Risk Assessment Signals
                </h4>
                <div className="space-y-1.5">
                  {accountDetail.reasons && accountDetail.reasons.length > 0 ? (
                    accountDetail.reasons.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px] text-slate-700 flex items-start space-x-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400">Normal retail transaction thresholds.</div>
                  )}
                </div>
              </div>

              {/* Connected Suspicious Counterparties */}
              {accountDetail.connected_suspicious_accounts &&
                accountDetail.connected_suspicious_accounts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Connected Suspicious Nodes ({accountDetail.connected_suspicious_accounts.length})
                    </h4>
                    <div className="space-y-1">
                      {accountDetail.connected_suspicious_accounts.map((cNode) => (
                        <div
                          key={cNode.id}
                          onClick={() => setSelectedAccountId(cNode.id)}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs border border-slate-100 transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{cNode.masked_upi}</span>
                            <span className="text-[10px] text-slate-400 block">{cNode.relationship}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Score {cNode.risk_score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartReplay(accountDetail.id)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs flex items-center justify-center space-x-1 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>Highlight Trail</span>
                </button>

                <button
                  onClick={handleOpenTransactionsModal}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center space-x-1 transition-colors"
                >
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>View Txns</span>
                </button>
              </div>
            </div>
          ) : (
            /* Default State: Display Detected Mule Clusters */
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Active Mule Ring Clusters
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a cluster below or click any graph node to inspect.
                </p>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
                {clusters.length > 0 ? (
                  clusters.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClusterId(c.id);
                        if (c.account_ids && c.account_ids.length) {
                          setSelectedAccountId(c.account_ids[0]);
                        }
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/80 cursor-pointer shadow-2xs transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{c.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Risk {c.risk_score}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Accounts</span>
                          <span className="font-semibold text-slate-800">{c.account_count}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Transactions</span>
                          <span className="font-semibold text-slate-800">{c.transaction_count}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Suspicious Vol</span>
                          <span className="font-semibold text-slate-800">{c.formatted_volume}</span>
                        </div>
                      </div>

                      {c.reasons && c.reasons.length > 0 && (
                        <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-2">
                          {c.reasons[0]}
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-semibold">
                        <span>Investigate Cluster</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No active high-risk mule clusters detected.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Phase 7: Interactive Money Trail Replay Controller --- */}
      {isReplaying && replayData && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Money Trail Replay — Forensic Chronology
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Target: {replayData.target_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Likely Pattern: {replayData.evidence_summary?.likely_pattern} • Total Volume: {replayData.formatted_total_volume}
              </p>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReplayPrev}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsReplayPlaying(!isReplayPlaying)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1"
              >
                {isReplayPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isReplayPlaying ? "Pause" : "Play"}</span>
              </button>

              <button
                onClick={handleReplayNext}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={handleReplayRestart}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Restart Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Replay Speed Toggle */}
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                {[1.0, 2.0, 4.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setReplaySpeed(s)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      replaySpeed === s ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <button
                onClick={handleCloseReplay}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                title="Exit Replay"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Step Detail Annotation & Scrubber */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Step Counter & Annotation */}
            <div className="md:col-span-8 flex items-center space-x-3">
              <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-mono text-xs font-bold shrink-0">
                Step {currentStepIndex + 1} of {replayData.steps.length}
              </span>
              <p className="text-xs text-slate-200">
                {replayData.steps[currentStepIndex]?.annotation}
              </p>
            </div>

            {/* Scrubber Range */}
            <div className="md:col-span-4 flex items-center space-x-2">
              <span className="text-[10px] text-slate-400">1</span>
              <input
                type="range"
                min="0"
                max={replayData.steps.length - 1}
                value={currentStepIndex}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCurrentStepIndex(val);
                  applyReplayStep(replayData.steps, val);
                }}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">{replayData.steps.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- Phase 6: Live Real-Time Detection Feed --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Live Fraud Detection & Transaction Stream
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Real-time SSE Event Feed (Asia/Kolkata)
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
          {alerts.length > 0 ? (
            alerts.slice(0, 15).map((al, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(al.timestamp).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour12: false
                    })}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      al.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-800"
                        : al.severity === "HIGH"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {al.alert_type}
                  </span>
                  <span className="text-slate-800 font-medium truncate max-w-md">
                    {al.details}
                  </span>
                </div>
                {al.account_id && (
                  <button
                    onClick={() => setSelectedAccountId(al.account_id)}
                    className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center space-x-0.5"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              Awaiting real-time transaction events...
            </div>
          )}
        </div>
      </div>

      {/* --- Phase 8: Inject Fraud Scenario Modal --- */}
      {isInjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Inject Fraud Scenario
                </h3>
              </div>
              <button
                onClick={() => setIsInjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Select a synthetic laundering scenario to inject into the live backend pipeline.
              Transactions will pass through the real persistence, graph analytics, and scoring engine.
            </p>

            <div className="space-y-2.5">
              {SCENARIOS.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => !injectingScenario && handleInjectScenario(sc.id)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer transition-all flex items-start justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-amber-800">
                        {sc.title}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${sc.badgeColor}`}>
                        {sc.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{sc.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 mt-1" />
                </div>
              ))}
            </div>

            {injectingScenario && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center text-xs font-semibold text-slate-600 flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Injecting transactions into graph engine...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- View Transactions Ledger Modal --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Synthetic Transaction Ledger
                </h3>
              </div>
              <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Tx ID</th>
                    <th className="p-2.5">Time (UTC)</th>
                    <th className="p-2.5">Sender</th>
                    <th className="p-2.5">Receiver</th>
                    <th className="p-2.5">Amount</th>
                    <th className="p-2.5">Pattern</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-[11px] text-slate-500">{tx.id}</td>
                      <td className="p-2.5 text-slate-600 text-[11px]">
                        {new Date(tx.timestamp).toISOString().slice(11, 19)}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">{tx.sender_id}</td>
                      <td className="p-2.5 font-medium text-slate-900">{tx.receiver_id}</td>
                      <td className="p-2.5 font-bold text-slate-900">
                        ₹{tx.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            tx.scenario_label === "NORMAL"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {tx.scenario_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
