import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const NODES_DATA = [
  { id: "node-user", label: "user9821@oksbi", role: "Victim / Citizen", tier: "SAFE", color: 0x00f2fe, pos: [0, 0, 0] },
  { id: "node-starbucks", label: "starbucks.pay@hdfcbank", role: "Verified Merchant", tier: "SAFE", color: 0x10b981, pos: [-4, 2.5, -1] },
  { id: "node-zomato", label: "zomato@icici", role: "Verified Merchant", tier: "SAFE", color: 0x10b981, pos: [4, 2.8, 1] },
  { id: "node-mule1", label: "amz.refund.desk@ybl", role: "Reverse-Debit Mule", tier: "CRITICAL", color: 0xef4444, pos: [-3, -2.5, 2] },
  { id: "node-mule2", label: "raju.kumar78@okaxis", role: "Swapped QR Mule", tier: "CRITICAL", color: 0xef4444, pos: [3.5, -2, -2] },
  { id: "node-crypto", label: "unseen.crypto@binance", role: "Laundering Egress", tier: "CRITICAL", color: 0xf43f5e, pos: [0, -4.5, 0] },
  { id: "node-p2p", label: "sharma.r@oksbi", role: "P2P Contact", tier: "SAFE", color: 0x06b6d4, pos: [0, 4, -1] },
];

const EDGES_DATA = [
  { from: 0, to: 1, type: "GENUINE_DEBIT", color: 0x10b981 },
  { from: 0, to: 2, type: "GENUINE_DEBIT", color: 0x10b981 },
  { from: 0, to: 3, type: "FRAUD_REVERSE_DEBIT", color: 0xef4444, speed: 2.5 },
  { from: 0, to: 4, type: "FRAUD_SWAPPED_QR", color: 0xef4444, speed: 2.0 },
  { from: 3, to: 5, type: "MULE_LAUNDERING", color: 0xf43f5e, speed: 3.0 },
  { from: 4, to: 5, type: "MULE_LAUNDERING", color: 0xf43f5e, speed: 2.8 },
  { from: 6, to: 0, type: "GENUINE_CREDIT", color: 0x00f2fe },
];

export default function TransactionNetwork3D() {
  const mountRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 1, 11);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2fe, 2, 50);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // 3. Create Node Meshes
    const nodeObjects = [];
    const sphereGeo = new THREE.SphereGeometry(0.38, 32, 32);

    NODES_DATA.forEach((data, index) => {
      const mat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: data.tier === "CRITICAL" ? 0.8 : 0.4,
        roughness: 0.2,
        metalness: 0.6,
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.set(...data.pos);
      mesh.userData = { ...data, index };
      scene.add(mesh);
      nodeObjects.push(mesh);

      // Glow halo for critical nodes
      if (data.tier === "CRITICAL" || data.id === "node-user") {
        const haloGeo = new THREE.RingGeometry(0.48, 0.62, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: data.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(...data.pos);
        scene.add(halo);
      }
    });

    // 4. Create Edges with Particle Pulses
    const edgeLines = [];
    const particles = [];

    EDGES_DATA.forEach((edge) => {
      const p1 = new THREE.Vector3(...NODES_DATA[edge.from].pos);
      const p2 = new THREE.Vector3(...NODES_DATA[edge.to].pos);

      // Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({
        color: edge.color,
        transparent: true,
        opacity: edge.type.includes("FRAUD") ? 0.75 : 0.35,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      edgeLines.push(line);

      // Particle pulse along edge
      const pGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const pMat = new THREE.MeshBasicMaterial({ color: edge.color });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      scene.add(pMesh);

      particles.push({
        mesh: pMesh,
        start: p1,
        end: p2,
        progress: Math.random(),
        speed: (edge.speed || 1.2) * 0.008,
      });
    });

    // 5. Interaction (Raycasting & Orbit rotation)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    container.addEventListener("mousemove", onMouseMove);

    // 6. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slow scene rotation
      scene.rotation.y = Math.sin(elapsedTime * 0.25) * 0.35;
      scene.rotation.x = Math.cos(elapsedTime * 0.2) * 0.15;

      // Update particle pulses
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        p.mesh.position.lerpVectors(p.start, p.end, p.progress);
      });

      // Raycast hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeObjects);

      if (intersects.length > 0) {
        setHoveredNode(intersects[0].object.userData);
      } else {
        setHoveredNode(null);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] rounded-xl overflow-hidden border border-slate-200 bg-[#0f172a]">
      {/* Title & Legend Header */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
            Interactive Threat Topology
          </span>
          <h3 className="text-sm font-heading font-bold text-white">
            Real-Time Financial Transaction Graph
          </h3>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Citizen</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Verified</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-400 font-bold">Mule / Alert</span>
          </div>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Hover Card */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-4 p-3 rounded-xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-md z-20 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="flex items-center space-x-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  hoveredNode.tier === "CRITICAL" ? "#ef4444" : "#10b981",
              }}
            />
            <span className="text-xs font-heading font-bold text-slate-900">
              {hoveredNode.label}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 space-y-0.5">
            <div>Role: <span className="text-blue-600 font-semibold">{hoveredNode.role}</span></div>
            <div>Risk Status: <span className={hoveredNode.tier === "CRITICAL" ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold"}>{hoveredNode.tier}</span></div>
          </div>
        </div>
      )}

      {/* Instruction Tip */}
      <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-400 pointer-events-none hidden sm:block">
        Hover nodes to inspect forensic profile • Pulsing particles show live fund vectors
      </div>
    </div>
  );
}
