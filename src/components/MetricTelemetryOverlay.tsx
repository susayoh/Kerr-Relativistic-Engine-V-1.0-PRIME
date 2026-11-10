import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  BlackHoleParams,
  DerivedRelativisticMetrics,
} from '../physics/gravitationalPhysics';
import { BlackHoleSceneController } from '../scene/BlackHoleScene';
import { AppLanguage, TRANSLATIONS } from '../i18n/translations';

interface MetricTelemetryOverlayProps {
  params: BlackHoleParams;
  metrics: DerivedRelativisticMetrics;
  sceneController: BlackHoleSceneController | null;
  hoverCoords: { rRs: number; phiDeg: number; redshiftZ: number } | null;
  onChangeProbeRadius?: (radiusRs: number) => void;
  onClose?: () => void;
  isPhoneMode?: boolean;
  language?: AppLanguage;
}

interface MetricTensorSample {
  timestamp: number;
  rRg: number;
  rRs: number;
  g_tt: number;
  g_rr: number;
  g_tphi: number;
  g_phiphi: number;
  admLapse: number;
  omegaFrameDrag: number;
  kretschmann: number;
}

/**
 * Evaluates exact Boyer-Lindquist Kerr spacetime metric tensor components g_μν
 * in dimensionless gravitational units (G = c = M = 1, so r is in units of Rg = 0.5 Rs).
 */
export function evaluateKerrMetricTensor(
  rRg: number,
  spinA: number,
  thetaRad: number
): Omit<MetricTensorSample, 'timestamp'> {
  const a = Math.min(0.9999, Math.max(0.0, spinA));
  const rPlus = 1.0 + Math.sqrt(Math.max(0.0, 1.0 - a * a));
  // Clamp slightly above outer horizon r+ to avoid numerical division by zero while showing steep divergence
  const r = Math.max(rPlus + 0.03, rRg);

  const cosTheta = Math.cos(thetaRad);
  const sinTheta = Math.sin(thetaRad);
  const cos2 = cosTheta * cosTheta;
  const sin2 = Math.max(1e-4, sinTheta * sinTheta);

  const r2 = r * r;
  const a2 = a * a;

  // Boyer-Lindquist auxiliary functions Σ, Δ, A
  const sigma = r2 + a2 * cos2;
  const delta = Math.max(0.02, r2 - 2.0 * r + a2);
  const bigA = (r2 + a2) * (r2 + a2) - a2 * delta * sin2;

  // Covariant metric tensor components g_μν
  // Signature (-, +, +, +): flat Minkowski limit has g_tt -> -1, g_rr -> +1
  const g_tt = -(1.0 - (2.0 * r) / sigma);
  const g_rr = Math.min(18.0, sigma / delta);
  const g_tphi = -(2.0 * a * r * sin2) / sigma;
  const g_phiphi = (bigA * sin2) / sigma;

  // ADM 3+1 Lapse function α = sqrt(Δ Σ / A) and frame-dragging shift ω = 2ar / A
  const admLapse = Math.sqrt(Math.max(0.0, (delta * sigma) / Math.max(1e-5, bigA)));
  const omegaFrameDrag = (2.0 * a * r) / Math.max(1e-5, bigA);

  // Exact Kerr Kretschmann scalar invariant K = R^{αβγδ} R_{αβγδ} (in units of M^-4)
  const r4 = r2 * r2;
  const r6 = r4 * r2;
  const a4 = a2 * a2;
  const a6 = a4 * a2;
  const cos4 = cos2 * cos2;
  const cos6 = cos4 * cos2;
  const kNumerator = 48.0 * (r6 - 15.0 * a2 * r4 * cos2 + 15.0 * a4 * r2 * cos4 - a6 * cos6);
  const kretschmann = kNumerator / Math.pow(sigma, 6);

  return {
    rRg: r,
    rRs: r * 0.5,
    g_tt,
    g_rr,
    g_tphi,
    g_phiphi,
    admLapse,
    omegaFrameDrag,
    kretschmann,
  };
}

export const MetricTelemetryOverlay: React.FC<MetricTelemetryOverlayProps> = ({
  params,
  metrics,
  sceneController,
  hoverCoords,
  onChangeProbeRadius,
  onClose,
  isPhoneMode = false,
  language = 'en',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<MetricTensorSample[]>([]);
  const phaseRef = useRef<number>(0);

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [graphMode, setGraphMode] = useState<'evolution' | 'radial'>('evolution');
  const [eccentricity, setEccentricity] = useState<number>(0.18);
  const [liveSample, setLiveSample] = useState<MetricTensorSample>(() => ({
    timestamp: 0,
    ...evaluateKerrMetricTensor(
      params.probeRadiusRs * 2.0,
      params.spin,
      (params.inclinationDeg * Math.PI) / 180
    ),
  }));

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    let animId = 0;
    let lastStateUpdate = 0;
    let lastSamplePush = 0;

    const renderLoop = (now: number) => {
      animId = requestAnimationFrame(renderLoop);

      // Advance relativistic epicyclic phase when simulation is unpaused
      const dt = 0.016 * (params.timeScale ?? 1.0);
      const orbitalFreq = 1.6 / Math.pow(Math.max(1.2, params.probeRadiusRs), 1.5);
      phaseRef.current += dt * orbitalFreq * 2.4;

      // Determine instantaneous radial coordinate r (in Rs)
      // If user hovers over the accretion disk/spacetime grid, sample at cursor radius;
      // otherwise sample along the quasi-periodic relativistic epicyclic orbit around probeRadiusRs
      const baseRs = hoverCoords ? hoverCoords.rRs : params.probeRadiusRs;
      const horizonRs = metrics.eventHorizonRg * 0.5;
      const epicyclicModulation =
        hoverCoords || params.timeScale === 0
          ? 0
          : eccentricity *
            (Math.cos(phaseRef.current) + 0.35 * Math.sin(phaseRef.current * 2.15));

      const instantaneousRs = Math.max(
        horizonRs * 1.04,
        baseRs * (1.0 - epicyclicModulation)
      );
      const instantaneousRg = instantaneousRs * 2.0;

      // Include tiny polar nutation around inclination angle for Kerr frame-dragging realism
      const baseTheta = (params.inclinationDeg * Math.PI) / 180;
      const nutationTheta =
        params.timeScale === 0
          ? baseTheta
          : baseTheta + 0.06 * params.spin * Math.sin(phaseRef.current * 1.3);

      const evaluated = evaluateKerrMetricTensor(
        instantaneousRg,
        params.spin,
        nutationTheta
      );

      const sample: MetricTensorSample = {
        timestamp: now,
        ...evaluated,
      };

      // Push sample into rolling 140-point buffer at ~30Hz
      if (now - lastSamplePush > 32) {
        lastSamplePush = now;
        const buf = historyRef.current;
        buf.push(sample);
        if (buf.length > 140) {
          buf.shift();
        }
      }

      // Throttle React numeric text updates to ~15fps
      if (now - lastStateUpdate > 65) {
        lastStateUpdate = now;
        setLiveSample(sample);
      }

      const canvas = canvasRef.current;
      if (!canvas || isMinimized) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayW = canvas.clientWidth || 300;
      const displayH = canvas.clientHeight || 135;

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = displayW;
      const h = displayH;

      // 1. Deep scientific oscilloscope background
      ctx.fillStyle = '#03060c';
      ctx.fillRect(0, 0, w, h);

      // Subtle coordinate grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.32)';
      ctx.lineWidth = 0.75;
      const rows = 4;
      const cols = 6;
      for (let i = 1; i < rows; i++) {
        const y = (h / rows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let j = 1; j < cols; j++) {
        const x = (w / cols) * j;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      if (graphMode === 'evolution') {
        // MODE A: Real-Time Temporal Evolution Graph g_μν(τ)
        // Y-axis maps normalized metric values from [-1.25, +4.25]
        const yMin = -1.25;
        const yMax = 4.25;
        const mapY = (val: number) => {
          const clamped = Math.max(yMin, Math.min(yMax, val));
          return h - ((clamped - yMin) / (yMax - yMin)) * (h - 16) - 8;
        };

        // Zero reference line (g_tt = 0 Ergosphere static limit threshold)
        const zeroY = mapY(0);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(w, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flat-space Minkowski limit line (g_tt = -1)
        const minkowskiY = mapY(-1.0);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, minkowskiY);
        ctx.lineTo(w, minkowskiY);
        ctx.stroke();

        const history = historyRef.current;
        if (history.length > 1) {
          const drawTrace = (
            selector: (s: MetricTensorSample) => number,
            color: string,
            lineWidth: number,
            fillUnder = false
          ) => {
            ctx.beginPath();
            for (let i = 0; i < history.length; i++) {
              const x = (i / Math.max(1, 139)) * (w - 8) + 4;
              const y = mapY(selector(history[i]));
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            if (fillUnder) {
              const lastX = ((history.length - 1) / 139) * (w - 8) + 4;
              ctx.lineTo(lastX, h);
              ctx.lineTo(4, h);
              ctx.closePath();
              const grad = ctx.createLinearGradient(0, 0, 0, h);
              grad.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
              grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
              ctx.fillStyle = grad;
              ctx.fill();
            }
          };

          // 1. g_rr (Radial space curvature stretching) — Cyan
          drawTrace((s) => Math.min(4.1, s.g_rr), '#22d3ee', 1.6, true);

          // 2. |g_tφ| * 2.5 (Lense-Thirring frame-dragging coupling scaled for visibility) — Purple
          drawTrace((s) => Math.abs(s.g_tphi) * 2.5, '#c084fc', 1.5);

          // 3. α_ADM (Relativistic Lapse dτ/dt) — Emerald
          drawTrace((s) => s.admLapse, '#34d399', 1.4);

          // 4. g_tt (Temporal metric component) — Amber
          drawTrace((s) => s.g_tt, '#f59e0b', 1.8);

          // Live leading pulse dots on right edge
          const latest = history[history.length - 1];
          const tipX = ((history.length - 1) / 139) * (w - 8) + 4;
          const dots: Array<{ val: number; color: string }> = [
            { val: Math.min(4.1, latest.g_rr), color: '#22d3ee' },
            { val: Math.abs(latest.g_tphi) * 2.5, color: '#c084fc' },
            { val: latest.admLapse, color: '#34d399' },
            { val: latest.g_tt, color: '#f59e0b' },
          ];
          for (const d of dots) {
            const dy = mapY(d.val);
            ctx.beginPath();
            ctx.arc(tipX, dy, 2.6, 0, Math.PI * 2);
            ctx.fillStyle = d.color;
            ctx.fill();
          }
        }

        // Axis Reference Labels
        ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText('g_tt = 0 (Ergosphere)', 6, zeroY - 3);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.fillText('g_tt = -1 (Flat)', 6, minkowskiY - 3);
      } else {
        // MODE B: Radial Spatial Profile g_μν(r) from r_+ to 6.5 Rs
        const minRs = Math.max(0.5, metrics.eventHorizonRg * 0.5);
        const maxRs = 6.5;
        const yMin = -1.25;
        const yMax = 4.25;

        const mapX = (rRs: number) =>
          ((rRs - minRs) / Math.max(0.1, maxRs - minRs)) * (w - 16) + 8;
        const mapY = (val: number) => {
          const clamped = Math.max(yMin, Math.min(yMax, val));
          return h - ((clamped - yMin) / (yMax - yMin)) * (h - 18) - 10;
        };

        // Draw anatomical radius vertical markers (Photon Sphere, Ergosphere, ISCO)
        const markers = [
          { rRs: metrics.photonSphereRg * 0.5, label: 'r_ph', color: 'rgba(250, 204, 21, 0.45)' },
          { rRs: 1.0, label: 'r_ergo', color: 'rgba(192, 132, 252, 0.45)' },
          { rRs: metrics.iscoProgradeRg * 0.5, label: 'ISCO', color: 'rgba(34, 211, 238, 0.5)' },
        ];
        for (const m of markers) {
          if (m.rRs >= minRs && m.rRs <= maxRs) {
            const mx = mapX(m.rRs);
            ctx.strokeStyle = m.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(mx, 0);
            ctx.lineTo(mx, h);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = m.color;
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.fillText(m.label, mx + 2, 10);
          }
        }

        // Sample 90 radial points across [minRs, maxRs]
        const steps = 90;
        const radialSamples: Array<ReturnType<typeof evaluateKerrMetricTensor>> = [];
        const thetaRad = (params.inclinationDeg * Math.PI) / 180;
        for (let i = 0; i <= steps; i++) {
          const rRs = minRs + (i / steps) * (maxRs - minRs);
          radialSamples.push(evaluateKerrMetricTensor(rRs * 2.0, params.spin, thetaRad));
        }

        const plotRadialCurve = (
          selector: (s: ReturnType<typeof evaluateKerrMetricTensor>) => number,
          color: string,
          width: number
        ) => {
          ctx.beginPath();
          for (let i = 0; i < radialSamples.length; i++) {
            const s = radialSamples[i];
            const px = mapX(s.rRs);
            const py = mapY(selector(s));
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.stroke();
        };

        plotRadialCurve((s) => Math.min(4.1, s.g_rr), '#22d3ee', 1.6);
        plotRadialCurve((s) => Math.abs(s.g_tphi) * 2.5, '#c084fc', 1.5);
        plotRadialCurve((s) => s.admLapse, '#34d399', 1.4);
        plotRadialCurve((s) => s.g_tt, '#f59e0b', 1.8);

        // Current live tracer vertical scanline
        const curX = mapX(Math.min(maxRs, Math.max(minRs, sample.rRs)));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(curX, 0);
        ctx.lineTo(curX, h);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`r=${sample.rRs.toFixed(2)}Rₛ`, Math.min(w - 52, curX + 3), h - 4);
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    params.spin,
    params.inclinationDeg,
    params.probeRadiusRs,
    params.timeScale,
    metrics.eventHorizonRg,
    metrics.photonSphereRg,
    metrics.iscoProgradeRg,
    hoverCoords,
    eccentricity,
    graphMode,
    isMinimized,
    sceneController,
  ]);

  const isInsideErgosphere = liveSample.g_tt >= 0;
  const isInsideIsco = liveSample.rRg < metrics.iscoProgradeRg;

  return (
    <div
      data-testid="metric-telemetry-overlay"
      className={`absolute top-2 sm:top-3 right-2 sm:right-4 z-20 pointer-events-auto select-none transition-all ${
        isPhoneMode ? 'w-[260px]' : 'w-80 sm:w-[340px]'
      }`}
    >
      <div className="bg-[#050811]/95 border border-purple-500/40 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden">
        {/* Header Bar */}
        <div className="px-3 py-2 bg-neutral-950/90 border-b border-slate-800/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Activity className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-100 truncate">
              {t.metricTelemetryTitle || 'Metric Tensor Telemetry'}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
              g_μν
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                setGraphMode((prev) => (prev === 'evolution' ? 'radial' : 'evolution'))
              }
              className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-[9px] font-mono font-semibold text-cyan-300 transition-colors cursor-pointer"
              title="Switch between Temporal Evolution g_μν(τ) and Radial Spatial Profile g_μν(r)"
            >
              {graphMode === 'evolution' ? 'τ-STREAM' : 'r-PROFILE'}
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="p-1 text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-800 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand Metric Telemetry' : 'Minimize Metric Telemetry'}
              aria-label={isMinimized ? 'Expand Metric Telemetry' : 'Minimize Metric Telemetry'}
            >
              {isMinimized ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-neutral-400 hover:text-rose-300 bg-neutral-900 rounded border border-neutral-800 transition-colors cursor-pointer"
                title="Close Metric Telemetry Overlay"
                aria-label="Close Metric Telemetry Overlay"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Minimized Summary Ticker */}
        {isMinimized && (
          <div
            onClick={() => setIsMinimized(false)}
            className="px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-300 hover:bg-neutral-900/60 cursor-pointer tabular-nums"
          >
            <span>r = {liveSample.rRs.toFixed(2)} Rₛ</span>
            <span className="text-amber-300">g_tt: {liveSample.g_tt.toFixed(3)}</span>
            <span className="text-cyan-300">g_rr: {liveSample.g_rr.toFixed(2)}</span>
            <span className="text-purple-300">g_tφ: {liveSample.g_tphi.toFixed(3)}</span>
          </div>
        )}

        {/* Expanded Real-Time Graph & Tensor Matrix Readout */}
        {!isMinimized && (
          <div className="p-2.5 space-y-2">
            {/* Regime Status Banner */}
            <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-neutral-950 border border-slate-800/80 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-slate-300 truncate">
                  {isInsideErgosphere
                    ? 'Ergosphere Frame-Dragging (g_tt > 0)'
                    : isInsideIsco
                      ? 'Plunging Region (Inside ISCO)'
                      : 'Boyer-Lindquist Kerr Manifold'}
                </span>
              </div>
              <span className="text-amber-300 font-bold tabular-nums shrink-0">
                r = {liveSample.rRs.toFixed(2)} Rₛ
              </span>
            </div>

            {/* Real-Time Multi-Channel Oscilloscope Canvas */}
            <div className="relative w-full h-32 rounded-lg border border-slate-800/90 overflow-hidden bg-[#03060c]">
              <canvas ref={canvasRef} className="w-full h-full block" />

              {/* Compact Trace Legend Overlay */}
              <div className="absolute top-1.5 right-2 pointer-events-none flex flex-wrap items-center gap-2 bg-black/75 px-1.5 py-0.5 rounded border border-slate-800/80 text-[8.5px] font-mono">
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  g_tt
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  g_rr
                </span>
                <span className="flex items-center gap-1 text-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  |g_tφ|
                </span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  α_ADM
                </span>
              </div>
            </div>

            {/* Live Covariant Metric Tensor Readout Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10px] tabular-nums">
              <div className="bg-neutral-950/90 border border-slate-800/80 rounded-lg px-2 py-1.5">
                <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                  <span>g_tt (Time)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
                <div className="text-amber-300 font-bold text-xs mt-0.5">
                  {liveSample.g_tt >= 0 ? `+${liveSample.g_tt.toFixed(3)}` : liveSample.g_tt.toFixed(3)}
                </div>
              </div>

              <div className="bg-neutral-950/90 border border-slate-800/80 rounded-lg px-2 py-1.5">
                <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                  <span>g_rr (Radial)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>
                <div className="text-cyan-300 font-bold text-xs mt-0.5">
                  +{liveSample.g_rr.toFixed(3)}
                </div>
              </div>

              <div className="bg-neutral-950/90 border border-slate-800/80 rounded-lg px-2 py-1.5">
                <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                  <span>g_tφ (Drag)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                </div>
                <div className="text-purple-300 font-bold text-xs mt-0.5">
                  {liveSample.g_tphi.toFixed(3)}
                </div>
              </div>

              <div className="bg-neutral-950/90 border border-slate-800/80 rounded-lg px-2 py-1.5">
                <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                  <span>Lapse α</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-emerald-300 font-bold text-xs mt-0.5">
                  {liveSample.admLapse.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Secondary Curvature Invariant & Probe Eccentricity Scrubber */}
            <div className="px-2 py-1.5 rounded-lg bg-neutral-950/80 border border-slate-800/70 space-y-1.5 font-mono text-[9.5px]">
              <div className="flex items-center justify-between text-slate-400 tabular-nums">
                <span>
                  Kretschmann K:{' '}
                  <strong className="text-slate-200">
                    {liveSample.kretschmann.toExponential(2)} M⁻⁴
                  </strong>
                </span>
                <span>
                  ω_drag:{' '}
                  <strong className="text-purple-300">
                    {liveSample.omegaFrameDrag.toFixed(3)} c/R_g
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 pt-0.5 border-t border-slate-800/60">
                <Sliders className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-slate-400 shrink-0">Geodesic Eccentricity (e):</span>
                <input
                  type="range"
                  min={0.0}
                  max={0.45}
                  step={0.01}
                  value={eccentricity}
                  onChange={(e) => setEccentricity(parseFloat(e.target.value))}
                  aria-label="Geodesic Eccentricity"
                  className="flex-1 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
                <span className="text-purple-300 font-bold w-8 text-right tabular-nums">
                  {eccentricity.toFixed(2)}
                </span>
              </div>

              {onChangeProbeRadius && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-slate-400 shrink-0">Sample Radius (r/Rₛ):</span>
                  <input
                    type="range"
                    min={0.65}
                    max={6.5}
                    step={0.05}
                    value={params.probeRadiusRs}
                    onChange={(e) => onChangeProbeRadius(parseFloat(e.target.value))}
                    aria-label="Metric Sample Radius"
                    className="flex-1 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-400"
                  />
                  <span className="text-amber-300 font-bold w-10 text-right tabular-nums">
                    {params.probeRadiusRs.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
