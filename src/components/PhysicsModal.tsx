import React from 'react';
import { X, Download } from 'lucide-react';
import { BlackHoleParams, DerivedRelativisticMetrics } from '../physics/gravitationalPhysics';

interface PhysicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: BlackHoleParams;
  metrics: DerivedRelativisticMetrics;
  onExportGeodesicCsv?: () => void;
}

export const PhysicsModal: React.FC<PhysicsModalProps> = ({
  isOpen,
  onClose,
  params,
  metrics,
  onExportGeodesicCsv,
}) => {
  if (!isOpen) return null;

  // Generate SVG path for the relativistic effective potential V_eff(r)
  const points: string[] = [];
  const iscoR = metrics.iscoProgradeRg;
  for (let i = 0; i <= 80; i++) {
    const rRg = 1.25 + (i / 80) * 12.0;
    const L = Math.sqrt(Math.max(1.5, iscoR * 1.15));
    // Relativistic effective potential: V_eff = -1/r + L^2/(2r^2) - (1 - 0.35*a)*L^2/r^3
    const vEff =
      -1.0 / rRg +
      (L * L) / (2.0 * rRg * rRg) -
      ((1.0 - 0.35 * params.spin) * (L * L)) / (rRg * rRg * rRg);

    const x = 40 + (i / 80) * 440;
    const y = 110 - Math.max(-0.35, Math.min(0.25, vEff)) * 220;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const iscoX = 40 + ((iscoR - 1.25) / 12.0) * 440;
  const photonX = 40 + ((metrics.photonSphereRg - 1.25) / 12.0) * 440;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="w-full max-w-3xl bg-black border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950 gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-neutral-100">
              Kerr Spacetime Telemetry & Effective Potential
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Exact Boyer-Lindquist & Bardeen-Press-Teukolsky general-relativistic diagnostics
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onExportGeodesicCsv && (
              <button
                type="button"
                data-testid="physics-modal-export-csv-btn"
                onClick={onExportGeodesicCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 font-mono text-xs font-semibold transition-colors cursor-pointer"
                title="Export live geodesic trajectory data as CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Geodesic CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-md border border-neutral-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Solar Mass Concept Note */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-amber-300">Active Simulation Mass:</span>{' '}
              <span className="font-mono text-neutral-100 font-bold">{params.massSolar.toFixed(1)} Solar Masses (M☉)</span>{' '}
              <span className="text-neutral-400 font-sans">= Equal to {params.massSolar.toFixed(1)} Suns</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              1 M☉ ≈ 1.989 × 10³⁰ kg (~333,000 Earths)
            </span>
          </div>

          {/* Metric Readout Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-neutral-950 border border-neutral-800/90 rounded-lg">
              <div className="text-[11px] text-neutral-400">Schwarzschild Radius (Rₛ)</div>
              <div className="mt-1 font-mono text-lg font-bold text-neutral-100 tabular-nums">
                {metrics.schwarzschildRadiusKm.toFixed(1)}
                <span className="text-xs text-neutral-500 ml-1">km</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-500 mt-0.5">2GM / c²</div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800/90 rounded-lg">
              <div className="text-[11px] text-neutral-400">Kerr Horizon (r₊)</div>
              <div className="mt-1 font-mono text-lg font-bold text-amber-300/90 tabular-nums">
                {metrics.eventHorizonRg.toFixed(3)}
                <span className="text-xs text-neutral-500 ml-1">R_g</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                {metrics.eventHorizonKm.toFixed(1)} km
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800/90 rounded-lg">
              <div className="text-[11px] text-neutral-400">Prograde ISCO</div>
              <div className="mt-1 font-mono text-lg font-bold text-neutral-200 tabular-nums">
                {metrics.iscoProgradeRg.toFixed(3)}
                <span className="text-xs text-neutral-500 ml-1">R_g</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                Innermost Stable Orbit
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800/90 rounded-lg">
              <div className="text-[11px] text-neutral-400">Probe Time Dilation</div>
              <div className="mt-1 font-mono text-lg font-bold text-amber-300 tabular-nums">
                {metrics.probeTimeDilationFactor.toFixed(3)}
                <span className="text-xs text-neutral-500 ml-1">×</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                z = +{metrics.probeRedshiftZ.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Relativistic Effective Potential Curve Chart */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-200">
                Relativistic Radial Effective Potential V_eff(r / R_g)
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Spin a* = {params.spin.toFixed(3)} · Probe at {(params.probeRadiusRs * 2).toFixed(2)} R_g
              </span>
            </div>
            <svg viewBox="0 0 500 175" className="w-full h-40 overflow-visible">
              {/* Coordinate Grid Lines */}
              <line x1="40" y1="20" x2="40" y2="150" stroke="#262626" strokeWidth="1" />
              <line x1="40" y1="110" x2="480" y2="110" stroke="#262626" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="150" x2="480" y2="150" stroke="#262626" strokeWidth="1" />

              {/* Photon Sphere Marker */}
              <line
                x1={photonX}
                y1="20"
                x2={photonX}
                y2="150"
                stroke="#d97706"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text x={photonX + 4} y="32" fill="#d97706" fontSize="9" fontFamily="monospace">
                r_ph ({metrics.photonSphereRg.toFixed(2)} R_g)
              </text>

              {/* ISCO Marker */}
              <line
                x1={iscoX}
                y1="20"
                x2={iscoX}
                y2="150"
                stroke="#737373"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <text x={iscoX + 4} y="46" fill="#a3a3a3" fontSize="9" fontFamily="monospace">
                ISCO ({metrics.iscoProgradeRg.toFixed(2)} R_g)
              </text>

              {/* Potential Curve */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={points.join(' ')}
              />

              <text x="45" y="164" fill="#737373" fontSize="9" fontFamily="monospace">
                1.25 R_g (Horizon Proximity)
              </text>
              <text x="410" y="164" fill="#737373" fontSize="9" fontFamily="monospace">
                13.25 R_g
              </text>
            </svg>
          </div>

          {/* Concise Governing Equations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-300">
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
              <div className="font-semibold text-neutral-100">Boyer-Lindquist Kerr Metric Horizon</div>
              <div className="font-mono text-amber-300 text-[11px]">
                Δ = r² - 2Mr + a² = 0 ⇒ r₊ = M + √(M² - a²)
              </div>
              <p className="text-neutral-400 leading-relaxed">
                As dimensionless spin a* approaches 1, frame-dragging pulls the prograde ISCO inward from 6 R_g (Schwarzschild) down to 1 R_g, dramatically increasing radiative accretion efficiency up to 42%.
              </p>
            </div>
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
              <div className="font-semibold text-neutral-100">Relativistic Doppler Beaming (Liouville Invariance)</div>
              <div className="font-mono text-neutral-200 text-[11px]">
                I_obs / I_emit = D⁴ = [γ(1 - β cos θ)]⁻⁴
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Because specific intensity scales as the fourth power of the Doppler factor D, plasma orbiting toward the observer appears intensely blue-shifted and luminous compared to the receding side.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
