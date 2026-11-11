import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BlackHoleSceneController,
  OverheadTelemetryData,
} from '../scene/BlackHoleScene';

interface OverheadMapWidgetProps {
  sceneController: BlackHoleSceneController | null;
  cameraCoordsRef?: React.RefObject<{ r: number; theta: number; phi: number }>;
  onSetProbeRadius?: (radiusRs: number) => void;
}

export const OverheadMapWidget: React.FC<OverheadMapWidgetProps> = ({
  sceneController,
  cameraCoordsRef,
  onSetProbeRadius,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0x (up to 7 Rs), 2.0x (zoom into ISCO/horizon)
  const [orbitalStarsVisible, setOrbitalStarsVisible] = useState<boolean>(false);
  const orbitalStarsVisibleRef = useRef<boolean>(false);

  // Direct DOM refs for numeric telemetry so updates never trigger React component re-renders
  const horizonValRef = useRef<HTMLSpanElement | null>(null);
  const iscoValRef = useRef<HTMLSpanElement | null>(null);
  const s2RadiusValRef = useRef<HTMLSpanElement | null>(null);
  const s2RgValRef = useRef<HTMLSpanElement | null>(null);
  const s2PhiValRef = useRef<HTMLSpanElement | null>(null);
  const s2SpeedValRef = useRef<HTMLSpanElement | null>(null);
  const s2DilationValRef = useRef<HTMLSpanElement | null>(null);

  const [hoverRadius, setHoverRadius] = useState<number | null>(null);
  const lastStateUpdateRef = useRef<number>(0);
  const lastHoverUpdateRef = useRef<number>(0);

  // Pulse animation phase for real-time radar sweep / beacon effect
  const radarSweepAngleRef = useRef<number>(0);

  // Imperative 2D canvas + DOM ref update loop throttled to at most once every 150ms
  useEffect(() => {
    const FRAME_INTERVAL_MS = 150;

    const render = () => {
      const time = performance.now();
      radarSweepAngleRef.current += 0.07;

      const canvas = canvasRef.current;
      if (!canvas || !sceneController || isMinimized) return;

      const data: OverheadTelemetryData = sceneController.getOverheadTelemetry();

      // Throttle React state updates to at most once every 150ms
      if (
        data.orbitalStarsVisible !== orbitalStarsVisibleRef.current &&
        time - lastStateUpdateRef.current >= 150
      ) {
        lastStateUpdateRef.current = time;
        orbitalStarsVisibleRef.current = data.orbitalStarsVisible;
        setOrbitalStarsVisible(data.orbitalStarsVisible);
      }

      // Imperatively update numeric readout DOM nodes with zero React re-renders
      if (data.orbitalStarsVisible) {
        if (s2RadiusValRef.current) s2RadiusValRef.current.textContent = data.probeRadiusRs.toFixed(2);
        if (s2RgValRef.current) s2RgValRef.current.textContent = `(${data.probeRadiusRg.toFixed(2)} R_g)`;
        if (s2PhiValRef.current) s2PhiValRef.current.textContent = `${data.probeAngleDeg.toFixed(1)}°`;
        if (s2SpeedValRef.current) s2SpeedValRef.current.textContent = `${(data.probeOrbitalBeta * 100).toFixed(1)}%`;
        if (s2DilationValRef.current) {
          s2DilationValRef.current.textContent = (1.0 / data.probeTimeDilationFactor).toFixed(3);
        }
      } else {
        if (horizonValRef.current) horizonValRef.current.textContent = data.eventHorizonRs.toFixed(2);
        if (iscoValRef.current) iscoValRef.current.textContent = data.iscoRs.toFixed(2);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = canvas.clientWidth || 220;
      const displayHeight = canvas.clientHeight || 220;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = displayWidth;
      const h = displayHeight;
      const cx = w / 2;
      const cy = h / 2;

      // Coordinate scaling: map boundary corresponds to maxRs
      const maxRs = 7.0 / zoomLevel;
      const pixelsPerRs = (Math.min(w, h) / 2 - 10) / maxRs;

      // 1. Clear background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw subtle background coordinate grid
      ctx.strokeStyle = 'rgba(50, 50, 50, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, h - 10);
      ctx.moveTo(10, cy);
      ctx.lineTo(w - 10, cy);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('+X', w - 8, cy + 4);
      ctx.fillText('-X', 8, cy + 4);
      ctx.fillText('-Z', cx + 4, 2);
      ctx.fillText('+Z', cx + 4, h - 12);

      // 3. Concentric range rings in Rs
      const ringSteps = [1, 2, 3, 4, 5, 6];
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      for (const r of ringSteps) {
        if (r > maxRs * 1.05) continue;
        const radPx = r * pixelsPerRs;
        ctx.beginPath();
        ctx.arc(cx, cy, radPx, 0, Math.PI * 2);
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(51, 65, 85, 0.55)' : 'rgba(30, 41, 59, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small range label on right horizontal axis (even rings only to avoid crowding)
        if (r % 2 === 0 && radPx + cx < w - 22 && radPx > 14) {
          ctx.fillStyle = '#475569';
          ctx.font = '8px monospace';
          ctx.fillText(`${r}Rₛ`, cx + radPx + 2, cy - 2);
        }
      }

      // 4. Accretion Disk Swirl Extent (between ISCO and outer disk)
      const iscoPx = data.iscoRs * pixelsPerRs;
      const outerDiskPx = Math.min(w / 2, data.accretionOuterRs * pixelsPerRs);

      if (outerDiskPx > iscoPx) {
        const diskGrad = ctx.createRadialGradient(cx, cy, iscoPx, cx, cy, outerDiskPx);
        diskGrad.addColorStop(0.0, 'rgba(245, 158, 11, 0.28)');
        diskGrad.addColorStop(0.2, 'rgba(217, 119, 6, 0.18)');
        diskGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.08)');
        diskGrad.addColorStop(1.0, 'rgba(120, 53, 15, 0.0)');

        ctx.beginPath();
        ctx.arc(cx, cy, outerDiskPx, 0, Math.PI * 2);
        ctx.arc(cx, cy, iscoPx, 0, Math.PI * 2, true);
        ctx.fillStyle = diskGrad;
        ctx.fill();

        // Subtle frame-dragging prograde spin indicator arrows
        if (data.spin > 0.05) {
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.lineWidth = 1;
          const arrowR = (iscoPx + outerDiskPx) * 0.48;
          ctx.beginPath();
          ctx.arc(cx, cy, arrowR, -Math.PI * 0.35, Math.PI * 0.15, false);
          ctx.stroke();
          // Arrowhead
          const tipX = cx + arrowR * Math.cos(Math.PI * 0.15);
          const tipY = cy + arrowR * Math.sin(Math.PI * 0.15);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - 4, tipY - 3);
          ctx.lineTo(tipX - 1, tipY + 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Ergosphere Outer Boundary (r_ergo = 1.0 Rs at equator)
      const ergoPx = data.ergosphereRs * pixelsPerRs;
      ctx.beginPath();
      ctx.arc(cx, cy, ergoPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 6. ISCO (Innermost Stable Circular Orbit) Ring
      ctx.beginPath();
      ctx.arc(cx, cy, iscoPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 7. Photon Sphere Ring (r_ph)
      const photonPx = data.photonSphereRs * pixelsPerRs;
      ctx.beginPath();
      ctx.arc(cx, cy, photonPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 8. Event Horizon Shadow (r_+)
      const horizonPx = data.eventHorizonRs * pixelsPerRs;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, horizonPx), 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 9. Fired Photon Geodesic Paths on XZ plane
      if (data.geodesics && data.geodesics.length > 0) {
        for (const ray of data.geodesics) {
          if (ray.points.length < 2) continue;
          ctx.beginPath();
          ctx.strokeStyle = `#${ray.colorHex.toString(16).padStart(6, '0')}`;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < ray.points.length; i++) {
            const px = cx + ray.points[i].x * pixelsPerRs;
            const py = cy + ray.points[i].z * pixelsPerRs;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Active moving photon pulse dot
          const curPx = cx + ray.currentPos.x * pixelsPerRs;
          const curPy = cy + ray.currentPos.z * pixelsPerRs;
          ctx.beginPath();
          ctx.arc(curPx, curPy, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `#${ray.colorHex.toString(16).padStart(6, '0')}`;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      // 10 & 11. Star S2 Circular Orbit Path & Real-Time Position Indicator (Only visible when S-Stars layer is enabled)
      if (data.orbitalStarsVisible) {
        const probeOrbitPx = data.probeRadiusRs * pixelsPerRs;
        ctx.beginPath();
        ctx.arc(cx, cy, probeOrbitPx, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
        ctx.lineWidth = 0.9;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radial beam connecting singularity to probe
        const probePx = cx + data.probeX * pixelsPerRs;
        const probePy = cy + data.probeZ * pixelsPerRs;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(probePx, probePy);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Expanding radar beacon wave around probe
        const pulsePhase = (time * 0.003) % 1;
        const pulseRad = 4 + pulsePhase * 10;
        ctx.beginPath();
        ctx.arc(probePx, probePy, pulseRad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.85 * (1 - pulsePhase)})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Instantaneous tangent velocity vector
        const tangentVx = -Math.sin(data.probeAngleRad) * 12;
        const tangentVz = -Math.cos(data.probeAngleRad) * 12;
        ctx.beginPath();
        ctx.moveTo(probePx, probePy);
        ctx.lineTo(probePx + tangentVx, probePy + tangentVz);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Star S2 core marker (Blue-white B-type star with glowing halo)
        ctx.beginPath();
        ctx.arc(probePx, probePy, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#93c5fd';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Star label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '8px monospace';
        ctx.fillText('STAR S2', probePx + 6, probePy - 4);
      }

      // 12. Hover cursor indicator if user is hovering over canvas and S-Stars are enabled
      if (hoverRadius !== null && data.orbitalStarsVisible) {
        const hoverPx = hoverRadius * pixelsPerRs;
        ctx.beginPath();
        ctx.arc(cx, cy, hoverPx, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 13. Real-Time Observer Camera Azimuth & Line-of-Sight Indicator from cameraCoordsRef
      const camCoords = cameraCoordsRef?.current;
      if (camCoords) {
        const phiRad = (camCoords.phi * Math.PI) / 180;
        const indicatorRadius = Math.min(w, h) * 0.44;
        const camX = cx + Math.cos(phiRad) * indicatorRadius;
        const camY = cy + Math.sin(phiRad) * indicatorRadius;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(camX, camY);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 0.85;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(camX, camY, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
      }

      ctx.restore();
    };

    render();
    const timerId = window.setInterval(render, FRAME_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, [sceneController, cameraCoordsRef, isMinimized, zoomLevel, hoverRadius]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onSetProbeRadius) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const maxRs = 7.0 / zoomLevel;
      const pixelsPerRs = (Math.min(rect.width, rect.height) / 2 - 10) / maxRs;
      const distRs = Math.hypot(x, y) / pixelsPerRs;

      // Clamp probe distance within realistic orbital boundaries [1.25 Rs, 6.5 Rs]
      const clampedRs = Math.min(6.5, Math.max(1.25, distRs));
      onSetProbeRadius(clampedRs);
    },
    [onSetProbeRadius, zoomLevel]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const now = performance.now();
      if (now - lastHoverUpdateRef.current < 150) return;
      lastHoverUpdateRef.current = now;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const maxRs = 7.0 / zoomLevel;
      const pixelsPerRs = (Math.min(rect.width, rect.height) / 2 - 10) / maxRs;
      const distRs = Math.hypot(x, y) / pixelsPerRs;
      setHoverRadius(parseFloat(distRs.toFixed(2)));
    },
    [zoomLevel]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverRadius(null);
  }, []);

  return (
    <div className="hud-panel w-60 bg-black/95 border border-neutral-800 rounded-lg shadow-xl overflow-hidden pointer-events-auto select-none transition-all">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-950 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400/90" />
          <span className="font-display text-[11px] font-semibold tracking-wide text-neutral-200 uppercase">
            Overhead Radar
          </span>
          <span className="text-[9px] text-neutral-500 font-mono">2D X-Z</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => (z === 1.0 ? 1.75 : 1.0))}
            className="p-1 text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-800 text-[10px] font-mono leading-none transition-colors cursor-pointer"
            title={zoomLevel === 1.0 ? 'Zoom In to Core' : 'Zoom Out'}
          >
            {zoomLevel === 1.0 ? <ZoomIn className="w-3 h-3" /> : <ZoomOut className="w-3 h-3 text-neutral-300" />}
          </button>

          {/* Minimize / Maximize */}
          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1 text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-800 transition-colors cursor-pointer"
            title={isMinimized ? 'Expand Overhead Map' : 'Minimize Overhead Map'}
            aria-label={isMinimized ? 'Expand Overhead Map' : 'Minimize Overhead Map'}
          >
            {isMinimized ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Viewport and Telemetry */}
      {!isMinimized && (
        <div className="p-2 flex flex-col gap-1.5">
          {/* 2D Canvas */}
          <div className="relative w-full h-32 2xl:h-40 bg-black rounded border border-neutral-800/80 overflow-hidden">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-full cursor-crosshair block"
            />
            {/* Legend Overlay at Top Corner */}
            <div className="absolute top-1 left-1.5 pointer-events-none flex flex-col gap-0.5 text-[9px] font-mono leading-tight">
              <span className="text-amber-400/90 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/90"></span>
                r₊ Horizon
              </span>
              <span className="text-neutral-300 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                ISCO Orbit
              </span>
            </div>

            {/* Hover radius helper */}
            {hoverRadius !== null && orbitalStarsVisible && (
              <div className="absolute bottom-1 right-1.5 pointer-events-none text-[9px] font-mono text-amber-300/90 bg-black/80 px-1 rounded border border-neutral-800">
                r: {hoverRadius.toFixed(2)} Rₛ (Click to set)
              </div>
            )}
          </div>

          {/* Real-Time Telemetry Strip (Updated imperatively via DOM refs) */}
          {orbitalStarsVisible ? (
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono tabular-nums bg-neutral-950 px-2 py-1.5 rounded border border-neutral-800/80">
              <div>
                <span className="text-neutral-500 block text-[8.5px] uppercase leading-tight">Star S2 Radius</span>
                <span className="text-neutral-200 font-semibold">
                  <span ref={s2RadiusValRef}>3.40</span> <span className="text-neutral-500 text-[9px]">Rₛ</span>
                </span>
                <span ref={s2RgValRef} className="text-neutral-500 text-[9px] ml-1">
                  (6.80 R_g)
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[8.5px] uppercase leading-tight">Azimuth (φ)</span>
                <span ref={s2PhiValRef} className="text-amber-300/90 font-semibold">
                  0.0°
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[8.5px] uppercase leading-tight">Orbital Speed</span>
                <span className="text-neutral-200 font-semibold">
                  <span ref={s2SpeedValRef}>48.0%</span> <span className="text-neutral-500 text-[9px]">c</span>
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[8.5px] uppercase leading-tight">Clock Dilation</span>
                <span className="text-neutral-200 font-semibold">
                  <span ref={s2DilationValRef}>0.820</span> <span className="text-neutral-500 text-[9px]">dτ/dt</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono tabular-nums bg-neutral-950 px-2 py-1.5 rounded border border-neutral-800/80">
              <div>
                <span className="text-neutral-500 block text-[8.5px] uppercase leading-tight">Horizon (r₊)</span>
                <span className="text-amber-300/90 font-semibold">
                  <span ref={horizonValRef}>0.60</span> <span className="text-neutral-500 text-[9px]">Rₛ</span>
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[8.5px] uppercase leading-tight">ISCO Boundary</span>
                <span className="text-cyan-300/90 font-semibold">
                  <span ref={iscoValRef}>0.81</span> <span className="text-neutral-500 text-[9px]">Rₛ</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

