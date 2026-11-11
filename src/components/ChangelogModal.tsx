import React from 'react';
import { X, Terminal, Cpu, Sparkles, CheckCircle2, Layers } from 'lucide-react';
import { UiThemeId } from '../scene/BlackHoleScene';

interface ChangelogEntry {
  version: string;
  codename: string;
  dateLabel: string;
  isCurrent?: boolean;
  summary: string;
  highlights: string[];
}

export const ENGINE_CHANGELOG_MILESTONES: ChangelogEntry[] = [
  {
    version: 'v1.4',
    codename: 'Apex Metric Core · Native WebGL2 & Mastering Deck',
    dateLabel: 'CURRENT BUILD',
    isCurrent: true,
    summary:
      'Native WebGL2 hardware pipeline refactor, high-DPI retina rendering, restored procedural disk turbulence & anamorphic flare, and integrated Hi-Res Audio Mastering Deck.',
    highlights: [
      'Native WebGL2 hardware pipeline refactor with zero-allocation per-frame uniform updates and pre-warmed GLSL shader programs.',
      'High-DPI retina rendering (locked up to 2.0x devicePixelRatio) with crisp spacetime curvature wireframes and 12-step volumetric Beer-Lambert raymarching.',
      'Restored procedural Keplerian disk turbulence, multi-order photon ring caustics, and viewing-angle anamorphic lens flare.',
      'Integrated Hi-Res 48kHz Audio Mastering Deck with 3-band EQ, real-time 16-band FFT spectrum analyzer, and Automated Spacetime Curvature Stress-Test Diagnostics.',
    ],
  },
  {
    version: 'v1.3',
    codename: 'Relativistic Radiative Transfer & Lensing Core',
    dateLabel: 'MILESTONE RELEASE',
    summary:
      'Relativistic Doppler boosting and gravitational lensing shader optimizations.',
    highlights: [
      'Special-relativistic Doppler beaming D = [γ(1 - β cos θ)]⁻¹ and gravitational redshift z across optical blackbody, EHT 230 GHz, and X-ray coronal bands.',
      'Gravitational lensing shader optimizations for primary and secondary (n=1, n=2) photon ring caustics and Einstein ring starfield deflection.',
      'Side-by-side Compare Mode with relativistic metric delta chart contrasting event horizon r₊, prograde ISCO, photon sphere, and Kretschmann invariants.',
    ],
  },
  {
    version: 'v1.2',
    codename: 'Boyer-Lindquist Manifold & Telemetry Instrumentation',
    dateLabel: 'FOUNDATION RELEASE',
    summary:
      'Ergosphere boundary mapping and telemetry instrumentation.',
    highlights: [
      'Exact Boyer-Lindquist oblate ergosphere static-limit mapping r_ergo(θ) = M + √(M² - a² cos²θ) and Lense-Thirring frame-dragging angular velocity Ω_H.',
      'Real-time metric tensor telemetry (g_tt, g_rr, g_tφ, ADM lapse α) and interactive null geodesic photon trajectory integrator.',
      'Flamm paraboloid 3D spacetime embedding well and S-Star relativistic orbital precession tracers.',
    ],
  },
];

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiTheme?: UiThemeId;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  uiTheme = 'kerr_claude',
}) => {
  if (!isOpen) return null;

  const isClaude = uiTheme === 'kerr_claude';
  const isCryo = uiTheme === 'cryo_quantum';

  const shellClass = isClaude
    ? 'bg-[#0e0b09] border-[#3d3029] shadow-[0_24px_64px_rgba(0,0,0,0.88),0_0_32px_rgba(217,119,87,0.14)]'
    : isCryo
    ? 'bg-[#050b14] border-sky-500/40 shadow-[0_24px_64px_rgba(0,0,0,0.88),0_0_32px_rgba(56,189,248,0.14)]'
    : 'bg-[#060911] border-amber-500/40 shadow-[0_24px_64px_rgba(0,0,0,0.88),0_0_32px_rgba(245,158,11,0.12)]';

  const headerClass = isClaude
    ? 'bg-[#14100d] border-[#2e241f]'
    : isCryo
    ? 'bg-[#07101e] border-sky-900/50'
    : 'bg-neutral-950 border-neutral-800/90';

  const accentBadgeClass = isClaude
    ? 'bg-[#241C18] border-[#D97757]/70 text-[#F4A688]'
    : isCryo
    ? 'bg-sky-500/15 border-sky-400/60 text-sky-200'
    : 'bg-amber-500/15 border-amber-400/60 text-amber-200';

  return (
    <div
      data-testid="changelog-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm pointer-events-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-modal-title"
        data-testid="changelog-modal"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl border rounded-2xl overflow-hidden flex flex-col max-h-[86vh] font-mono ${shellClass}`}
      >
        {/* Terminal Header */}
        <div className={`flex items-center justify-between px-4 sm:px-5 py-3.5 border-b ${headerClass}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accentBadgeClass}`}>
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="changelog-modal-title"
                  className="font-display text-sm font-bold uppercase tracking-wider text-[#F7F4EE]"
                >
                  Kerr Engine · Release Changelog
                </h2>
                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${accentBadgeClass}`}>
                  v1.4
                </span>
              </div>
              <p className="text-[10.5px] text-neutral-400">
                $ git log --oneline --decorate kerr-metric-core
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="changelog-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            title="Close Changelog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terminal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          {ENGINE_CHANGELOG_MILESTONES.map((entry) => (
            <div
              key={entry.version}
              data-testid={`changelog-entry-${entry.version}`}
              className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                entry.isCurrent
                  ? isClaude
                    ? 'bg-[#17120f] border-[#D97757]/60 shadow-[0_0_20px_rgba(217,119,87,0.1)]'
                    : isCryo
                    ? 'bg-[#091526] border-sky-400/55 shadow-[0_0_20px_rgba(56,189,248,0.1)]'
                    : 'bg-neutral-950 border-amber-400/55 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'bg-neutral-950/80 border-neutral-800/90'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      entry.isCurrent
                        ? accentBadgeClass
                        : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {entry.version}
                  </span>
                  <span className="font-sans font-bold text-white text-xs sm:text-[13px]">
                    {entry.codename}
                  </span>
                </div>
                <span
                  className={`text-[9.5px] px-2 py-0.5 rounded border font-semibold ${
                    entry.isCurrent
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {entry.dateLabel}
                </span>
              </div>

              {/* Primary Milestone Summary */}
              <div className="p-2.5 rounded-lg bg-black/50 border border-neutral-800/90 text-neutral-200 leading-relaxed text-[11.5px]">
                <span className="text-emerald-400 font-bold mr-1.5">&gt;</span>
                {entry.summary}
              </div>

              {/* Technical Breakdown */}
              <ul className="space-y-1.5 pt-0.5">
                {entry.highlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-neutral-400 leading-relaxed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Terminal Footer */}
        <div className={`px-4 sm:px-5 py-3 border-t flex items-center justify-between ${headerClass}`}>
          <div className="flex items-center gap-2 text-[10.5px] text-neutral-400">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>BUILD STATUS: VERIFIED · WEBGL2 GLSL ES 3.00</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${accentBadgeClass} hover:opacity-90`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
