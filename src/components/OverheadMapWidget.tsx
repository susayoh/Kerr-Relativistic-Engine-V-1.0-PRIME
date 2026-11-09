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
  onSetProbeRadius?: (radiusRs: number) => void;
}

export const OverheadMapWidget: React.FC<OverheadMapWidgetProps> = ({
  sceneController,
  onSetProbeRadius,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0x (up to 7 Rs), 2.0x (zoom into ISCO/horizon)
  const [telemetry, setTelemetry] = useState<{
    rRs: number;
    rRg: number;
    phiDeg: number;
    beta: number;
    timeDilation: number;
  }>({
    rRs: 3.4,
    rRg: 6.8,
    phiDeg: 0,
    beta: 0.48,
    timeDilation: 0.82,
  });

  const [hoverRadius, setHoverRadius] = useState<number | null>(null);

  // Pulse animation phase for real-time radar sweep / beacon effect
  const radarSweepAngleRef = useRef<number>(0);

  // Animation render loop for 60fps canvas
  useEffect(() => {
    let animId = 0;
    let lastTelemetryUpdate = 0;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      radarSweepAngleRef.current += 0.035;

      const canvas = canvasRef.current;
      if (!canvas || !sceneController || isMinimized) return;

      const data: OverheadTelemetryData = sceneController.getOverheadTelemetry();

      // Throttle React state update to ~15fps for text stats to avoid unnecessary re-renders
      if (time - lastTelemetryUpdate > 65) {
        lastTelemetryUpdate = time;
        setTelemetry({
          rRs: data.probeRadiusRs,
          rRg: data.probeRadiusRg,
          phiDeg: data.probeAngleDeg,
          beta: data.probeOrbitalBeta,
          timeDilation: 1.0 / data.probeTimeDilationFactor,
        });
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
      const pixelsPerRs = (w / 2 - 14) / maxRs;

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

        // Small range label on right horizontal axis
        if (radPx + cx < w - 24 && radPx > 20) {
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

      // 10. Probe Circular Orbit Path
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

      // 11. Probe Real-Time Position Indicator
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

      // 12. Hover cursor indicator if user is hovering over canvas
      if (hoverRadius !== null) {
        const hoverPx = hoverRadius * pixelsPerRs;
        ctx.beginPath();
        ctx.arc(cx, cy, hoverPx, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [sceneController, isMinimized, zoomLevel, hoverRadius]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onSetProbeRadius) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const maxRs = 7.0 / zoomLevel;
      const pixelsPerRs = (rect.width / 2 - 14) / maxRs;
      const distRs = Math.hypot(x, y) / pixelsPerRs;

      // Clamp probe distance within realistic orbital boundaries [1.25 Rs, 6.5 Rs]
      const clampedRs = Math.min(6.5, Math.max(1.25, distRs));
      onSetProbeRadius(clampedRs);
    },
    [onSetProbeRadius, zoomLevel]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const maxRs = 7.0 / zoomLevel;
      const pixelsPerRs = (rect.width / 2 - 14) / maxRs;
      const distRs = Math.hypot(x, y) / pixelsPerRs;
      setHoverRadius(parseFloat(distRs.toFixed(2)));
    },
    [zoomLevel]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverRadius(null);
  }, []);

  return (
    <div className="w-64 bg-black/95 border border-neutral-800 rounded-lg shadow-xl overflow-hidden pointer-events-auto select-none transition-all">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-950 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400/90" />
          <span className="font-display text-xs font-semibold tracking-wide text-neutral-200 uppercase">
            Overhead Radar
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">2D X-Z</span>
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
        <div className="p-2.5 flex flex-col gap-2">
          {/* 2D Canvas */}
          <div className="relative w-full aspect-square bg-black rounded border border-neutral-800/80 overflow-hidden">
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
            {hoverRadius !== null && (
              <div className="absolute bottom-1 right-1.5 pointer-events-none text-[9px] font-mono text-amber-300/90 bg-black/80 px-1 rounded border border-neutral-800">
                r: {hoverRadius.toFixed(2)} Rₛ (Click to set)
              </div>
            )}
          </div>

          {/* Real-Time Live Probe Telemetry Strip */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums bg-neutral-950 p-2 rounded border border-neutral-800/80">
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase">Star S2 Radius</span>
              <span className="text-neutral-200 font-semibold">
                {telemetry.rRs.toFixed(2)} <span className="text-neutral-500 text-[10px]">Rₛ</span>
              </span>
              <span className="text-neutral-500 text-[10px] ml-1">
                ({telemetry.rRg.toFixed(2)} R_g)
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block text-[9px] uppercase">Azimuth (φ)</span>
              <span className="text-amber-300/90 font-semibold">
                {telemetry.phiDeg.toFixed(1)}°
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block text-[9px] uppercase">Orbital Speed</span>
              <span className="text-neutral-200 font-semibold">
                {(telemetry.beta * 100).toFixed(1)}% <span className="text-neutral-500 text-[10px]">c</span>
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block text-[9px] uppercase">Clock Dilation</span>
              <span className="text-neutral-200 font-semibold">
                {telemetry.timeDilation.toFixed(3)} <span className="text-neutral-500 text-[10px]">dτ/dt</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
