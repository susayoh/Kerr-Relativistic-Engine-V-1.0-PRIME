import React, { useState, useMemo } from 'react';
import {
  Code,
  FileCode,
  Layers,
  Sparkles,
  Search,
  Copy,
  Check,
  Download,
  ArrowUpDown,
  Orbit,
  Sliders,
  Gamepad2,
  Music,
  Palette,
  Cpu,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from 'lucide-react';

export interface CodeFileInfo {
  path: string;
  name: string;
  lines: number;
  bytes?: number;
  liveSourcePreview?: string;
  subsystem: 'shaders' | 'hud' | 'interactive' | 'physics' | 'audio' | 'infra';
  subsystemName: string;
  description: string;
  role: string;
  techTags: string[];
}

// Live Vite raw source glob so every code edit or newly added file in /src automatically updates the Code tab
const RAW_SRC_FILES: Record<string, string> =
  typeof import.meta !== 'undefined' && typeof (import.meta as unknown as { glob?: unknown }).glob === 'function'
    ? (import.meta as unknown as {
        glob: (pattern: string[], opts: { query: string; import: string; eager: boolean }) => Record<string, string>;
      }).glob(
        [
          '/src/**/*.{ts,tsx,css}',
          '/server.ts',
          '/index.html',
          '/package.json',
          '/vite.config.ts',
          '/tsconfig.json',
          '/metadata.json',
        ],
        { query: '?raw', import: 'default', eager: true }
      )
    : {};

function countRawLines(raw: string): number {
  if (!raw) return 0;
  const lines = raw.split(/\r?\n/).length;
  return raw.endsWith('\n') ? Math.max(1, lines - 1) : lines;
}

const BASE_CODEBASE_FILES: CodeFileInfo[] = [
  {
    path: 'src/scene/BlackHoleScene.ts',
    name: 'BlackHoleScene.ts',
    lines: 9636,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Three.js WebGL rendering pipeline, custom GLSL spacetime raymarching shaders (gravitational lensing, accretion disk with relativistic Doppler beaming & breathing pulsations, frame-dragging ergosphere cage, camera lens flare, spacetime grid), Hardware WebGL Shader Pre-Warming Cache (geodesic, accretion disk, ergosphere), IMAX Multi-Stage Supersonic Boom shockwave, Dynamic Quality Tier shader swapping, and Thermal Throttling (u_stepCount).',
    role: 'Primary 3D WebGL Engine, Shader Pre-Warmer & Core',
    techTags: ['Three.js', 'Custom GLSL', 'Shader Pre-Warming', 'Supersonic Mach Boom', 'Thermal Throttling', 'WebGL2'],
  },
  {
    path: 'src/scene/renderScaleUtils.ts',
    name: 'renderScaleUtils.ts',
    lines: 615,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Desktop pixel-ratio clamping, 30-frame rolling FPS dynamic resolution scaler, User Timing API (performance.mark / performance.measure) pass classifier, Full Geodesic vs. Approximated Null-Geodesic shader snippet generator, passive-cooling RC thermal throttling state machine for u_stepCount, and Shader Pre-Warming Cache manifest & telemetry report builder.',
    role: 'GPU Performance, Shader Pre-Warming & Thermal Engine',
    techTags: ['Shader Pre-Warming', 'Thermal Throttling', 'User Timing API', 'Dynamic DPR', 'GLSL Snippets'],
  },
  {
    path: 'src/scene/renderScaleUtils.test.ts',
    name: 'renderScaleUtils.test.ts',
    lines: 332,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Automated unit test suite verifying desktop DPR caps, rolling 30-frame resolution scaling, bottleneck classification, dynamic shader quality tier hysteresis, sustained thermal throttling u_stepCount step-down/recovery, and Shader Pre-Warming Cache manifest verification.',
    role: 'GPU Scaler, Shader Pre-Warmer & Thermal Unit Tests',
    techTags: ['node:test', 'Unit Testing', 'Shader Cache Verification', 'Thermal Model Assertions'],
  },
  {
    path: 'src/components/SettingsModal.tsx',
    name: 'SettingsModal.tsx',
    lines: 3583,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Multi-tab control center providing visualizer settings, audio/theme preferences, Spotify-style Songs player, diagnostic curvature stress-test suite, and codebase telemetry dashboard.',
    role: 'Central Settings & Audio/Diagnostic Hub',
    techTags: ['React 18', 'Framer Motion', 'Tailwind CSS', 'State Management'],
  },
  {
    path: 'src/App.tsx',
    name: 'App.tsx',
    lines: 2793,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Root application orchestrator managing Three.js canvas mounts, Focus Mode transitions, boot telemetry sequence, 12-ray singularity watermark rendering, event log JSON exports, and synchronized compare viewports.',
    role: 'Application Orchestrator & Viewport Host',
    techTags: ['React 18', 'Canvas Compositing', 'HTML5 to-image', 'Hooks', 'Keyboard Shortcuts'],
  },
  {
    path: 'src/components/ControlDock.tsx',
    name: 'ControlDock.tsx',
    lines: 2684,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Dual-mode control dock (desktop wide toolbar and ergonomic mobile bottom drawer) featuring Spacetime parameter sliders, Spectral Layer toggles, Camera preset controls, and Null Geodesic impact parameter launcher.',
    role: 'Interactive Parameter Control Chassis',
    techTags: ['Responsive Design', 'Haptics', 'SVG Controls', 'Ergonomic Drawer'],
  },
  {
    path: 'src/components/ChessModule.tsx',
    name: 'ChessModule.tsx',
    lines: 2206,
    subsystem: 'interactive',
    subsystemName: 'Interactive Modules',
    description:
      'Complete Lichess-referenced chess sandbox with White, Black, and Random board orientation, legal move calculation, check/checkmate detection, 5 Kerr Engine algorithmic bots (Lv 1–5), and 5 aggressive Andy bots (Lv 1–5).',
    role: 'Full-Featured Chess Engine & Minimax Bot Suite',
    techTags: ['Game State Tree', 'Chess Rules Engine', 'Minimax Bot AI', 'Lichess Styling'],
  },
  {
    path: 'src/components/IQTestModule.tsx',
    name: 'IQTestModule.tsx',
    lines: 2183,
    subsystem: 'interactive',
    subsystemName: 'Interactive Modules',
    description:
      'Standardized 24-question psychometric intelligence assessment featuring authentic Mensa-style pattern sequences and Raven’s Progressive Matrices, countdown timer, timed question presentation, and percentile distribution scoring.',
    role: 'Standardized Psychometric Matrix Assessment',
    techTags: ['Matrix Reasoning', 'Psychometrics', 'SVG Pattern Generator', 'Timed Assessment'],
  },
  {
    path: 'src/physics/gravitationalPhysics.ts',
    name: 'gravitationalPhysics.ts',
    lines: 1439,
    subsystem: 'physics',
    subsystemName: 'Mathematical Physics',
    description:
      'Analytical Kerr metric tensor solver in Boyer-Lindquist coordinates, event horizon radii (r±), ergosphere boundary (r_E), ISCO radii, photon sphere orbits, Carter constant calculations, and 4th-order Runge-Kutta (RK4) null geodesic integrator.',
    role: 'Analytical Kerr Metric & Relativistic Physics Library',
    techTags: ['Boyer-Lindquist Metric', 'General Relativity', 'Runge-Kutta RK4', 'Carter Constant', 'Astrophysics Presets'],
  },
  {
    path: 'src/components/KerrRelativityEngineModal.tsx',
    name: 'KerrRelativityEngineModal.tsx',
    lines: 1046,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Kerr Engine v1.4 computation terminal modal, tier management (Standard, Linear, Advanced, Ultra), real-time step-by-step tensor calculation simulation, billing estimation, and historical calculation logs viewer.',
    role: 'Metric Solver Terminal & Engine Tier Manager',
    techTags: ['Terminal Emulator', 'Pricing Models', 'Telemetry Log Viewer', 'Framer Motion'],
  },
  {
    path: 'src/components/CodebaseDetailsView.tsx',
    name: 'CodebaseDetailsView.tsx',
    lines: 1115,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Interactive codebase telemetry dashboard and architectural analytics module reporting line counts, subsystem categorization, technology stack breakdown, and exportable documentation.',
    role: 'Codebase Metrics & Architecture Telemetry Dashboard',
    techTags: ['Interactive Filtering', 'Live Search', 'Subsystem Metrics', 'Markdown & JSON Export'],
  },
  {
    path: 'src/components/DiagnosticSuiteView.tsx',
    name: 'DiagnosticSuiteView.tsx',
    lines: 543,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'High-contrast spacetime curvature stress-test diagnostic suite providing automated metric tensor sweeps, Killing horizon verification, and interactive solver traces.',
    role: 'Spacetime Curvature Stress-Test Diagnostic Suite',
    techTags: ['Curvature Verification', 'Metric Tensors', 'Stress Scenarios', 'Interactive Trace'],
  },
  {
    path: 'src/components/CompareModeOverlay.tsx',
    name: 'CompareModeOverlay.tsx',
    lines: 907,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Side-by-side comparative visualization HUD supporting independent spin adjustments, preset swapping, synchronized controls, and differential curvature metrics between two astrophysical systems.',
    role: 'Dual-Viewport Comparison HUD',
    techTags: ['Split Viewport', 'Differential Telemetry', 'Spin Contrast Presets'],
  },
  {
    path: 'src/index.css',
    name: 'index.css',
    lines: 906,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description:
      'Global CSS definitions, Tailwind utility extensions, Observatory Gold, Cryo-Quantum, and Kerr Claude color palettes, CRT monitor scanlines, and HUD glassmorphic filters.',
    role: 'Global Styling & Theme System',
    techTags: ['Tailwind CSS', 'Theme Palettes', 'CSS Variables', 'Keyframe Animations'],
  },
  {
    path: 'src/components/TopBar.tsx',
    name: 'TopBar.tsx',
    lines: 772,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Main header navigation bar providing target preset selection, system category switcher (Isolated Singularity vs Binary Accretion), snapshot/recording triggers, quick modal openers, and version badges.',
    role: 'Top Navigation & Quick Command Bar',
    techTags: ['Dropdown Selectors', 'Record Actions', 'Haptic Triggers', 'Responsive Header'],
  },
  {
    path: 'src/audio/importedTracks.ts',
    name: 'importedTracks.ts',
    lines: 4766,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Complete 266-track audio catalog containing song titles, artist metadata, high-resolution album cover URLs, audio preview streams, durations, BPM tempos, and genre classifications for the Songs tab.',
    role: 'Master Playlist Track Catalog & Audio Metadata',
    techTags: ['Audio Catalog', '266 Tracks', 'Cover Artwork', 'Stream Sources'],
  },
  {
    path: 'src/audio/trapQueenPlayer.ts',
    name: 'trapQueenPlayer.ts',
    lines: 726,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Web Audio API multi-track procedural player with stereo panning, variable playback speed (0.5x–2.0x), real-time frequency band FFT analysis, playlist manager, and procedural fallback beat synthesizer.',
    role: 'Web Audio Music Player & Procedural Beat Engine',
    techTags: ['Web Audio API', 'FFT Analyser', 'AudioContext', 'Procedural Synthesis'],
  },
  {
    path: 'src/scene/CompactStarMaterial.ts',
    name: 'CompactStarMaterial.ts',
    lines: 698,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Custom Three.js shader material for relativistic neutron stars, magnetars, and luminous hypergiants featuring dipolar magnetic field lines, crust thermal emission, and relativistic limb darkening.',
    role: 'Relativistic Compact Star Shader Materials',
    techTags: ['Three.js ShaderMaterial', 'GLSL Surface Noise', 'Dipolar Magnetic Fields'],
  },
  {
    path: 'src/components/MetricTelemetryOverlay.tsx',
    name: 'MetricTelemetryOverlay.tsx',
    lines: 694,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Live metric tensor monitor displaying g_tt, g_tphi, g_rr, g_thetatheta, g_phiphi, Kretschmann scalar curvature invariant, and Boyer-Lindquist observer distance slider.',
    role: 'Live Metric Tensor Component Telemetry Display',
    techTags: ['Tensor Calculus Readout', 'Real-time Charting', 'Curvature Invariants'],
  },
  {
    path: 'src/i18n/translations.ts',
    name: 'translations.ts',
    lines: 602,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description:
      'Complete internationalization string dictionary supporting English (en), German (de), Japanese (ja), Spanish (es), and Simplified Chinese (zh) across all UI modules and scientific terminology.',
    role: 'Multi-Language Internationalization Core',
    techTags: ['i18n Localization', '5 Languages', 'Astrophysical Glossary'],
  },
  {
    path: 'src/components/PerformanceMonitorOverlay.tsx',
    name: 'PerformanceMonitorOverlay.tsx',
    lines: 598,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Real-time Three.js WebGL performance profiler reporting FPS, millisecond frame delta, draw calls, GPU memory geometry/texture count, and per-shader pass load estimates.',
    role: 'WebGL & GPU Profiler HUD',
    techTags: ['Frame Delta Profiling', 'Three.js Renderer Stats', 'Shader Pass Diagnostics'],
  },
  {
    path: 'src/components/OverheadMapWidget.tsx',
    name: 'OverheadMapWidget.tsx',
    lines: 553,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      '2D top-down equatorial radar widget showing observer orbital coordinates, horizon circle, ISCO ring, ergosphere profile, and interactive probe coordinate radius manipulator.',
    role: '2D Orbital Radar & Observer Coordinate Map',
    techTags: ['HTML5 Canvas 2D', 'Orbital Mechanics', 'Interactive Probe Pointer'],
  },
  {
    path: 'src/components/ArchetypeModal.tsx',
    name: 'ArchetypeModal.tsx',
    lines: 459,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Cosmic archetype reference guide detailing Supermassive, Intermediate, Stellar-mass, Primordial black holes, and compact stars with real-world astronomical counterparts.',
    role: 'Astrophysical Archetypes Encyclopedia',
    techTags: ['Encyclopedia Layout', 'Astrophysical Categorization', 'Solar Mass Scales'],
  },
  {
    path: 'src/audio/relativisticAudio.ts',
    name: 'relativisticAudio.ts',
    lines: 415,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Real-time gravitational sound synthesis generating accretion shockwave boom pulses, gravitational wave frequency chirps, Doppler frequency shifts, and relativistic frame-dragging low-frequency drone audio.',
    role: 'Relativistic Sonification & Shockwave Audio Engine',
    techTags: ['Web Audio Synthesis', 'BiquadFilterNode', 'Custom Drone Oscillators', 'Chirps'],
  },
  {
    path: 'src/components/PhysicsQuickGuideModal.tsx',
    name: 'PhysicsQuickGuideModal.tsx',
    lines: 409,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Intuitive plain-English guide explaining Kerr black hole anatomy, spacetime whirlpools, accretion disk Doppler beaming, gravitational time dilation, and event horizons through accessible analogies.',
    role: 'Accessible Physics Learning Modal',
    techTags: ['Educational UI', 'Physics Analogies', 'Interactive Diagrams'],
  },
  {
    path: 'src/components/BlackHoleAnatomyOverlay.tsx',
    name: 'BlackHoleAnatomyOverlay.tsx',
    lines: 362,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Dynamic 3D-to-2D projected leader lines identifying the Event Horizon, Ergosphere, ISCO, Photon Sphere, and Relativistic Accretion Flow directly on the viewport.',
    role: '3D Leader Line Annotation Overlay',
    techTags: ['3D Vector Unprojection', 'SVG Leader Lines', 'Camera Tracking'],
  },
  {
    path: 'src/components/CosmicScaleModal.tsx',
    name: 'CosmicScaleModal.tsx',
    lines: 335,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Astronomical scale comparison modal contrasting TON 618’s 390-billion-kilometer event horizon against the Solar System, Neptune’s orbit, and Voyager 1 distance.',
    role: 'Order-of-Magnitude Scale Comparison Tool',
    techTags: ['Scale Visualizer', 'Logarithmic Comparisons', 'Solar System Models'],
  },
  {
    path: 'src/components/EventLogOverlay.tsx',
    name: 'EventLogOverlay.tsx',
    lines: 319,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Stackable real-time astrophysical event log displaying metric transitions, shockwave triggers, and geodesic calculations, featuring single-click JSON file device export.',
    role: 'Telemetry Event Stream & JSON File Exporter',
    techTags: ['JSON Exporter', 'Event Stream', 'Filter Categories'],
  },
  {
    path: 'src/components/PhysicsModal.tsx',
    name: 'PhysicsModal.tsx',
    lines: 232,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Formal theoretical physics modal providing mathematical formulas for the Kerr metric, effective potential V_eff, ISCO radii equations, and CSV trajectory dataset download.',
    role: 'Rigorous Mathematical Formulation Modal',
    techTags: ['LaTeX / Math Formulas', 'CSV Exporter', 'Effective Potential'],
  },
  {
    path: 'src/components/ChangelogModal.tsx',
    name: 'ChangelogModal.tsx',
    lines: 231,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Minimalist terminal-style release notes viewer tracing the evolution from Kerr Engine v1.0 foundational shaders to v1.4 Apex Metric Core.',
    role: 'Version History & Changelog Terminal',
    techTags: ['Terminal UI', 'Changelog Timeline', 'Version Tracking'],
  },
  {
    path: 'src/components/TimeDilationDisplay.tsx',
    name: 'TimeDilationDisplay.tsx',
    lines: 182,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Compact gravitational time dilation readout calculating the exact proper time elapsed for an observer vs asymptotic coordinate time infinity at probe radius.',
    role: 'Gravitational Time Dilation Calculator',
    techTags: ['Proper Time Equations', 'Coordinate Time Ratio', 'Probe Binding'],
  },
  {
    path: 'src/components/BackgroundSelectorModal.tsx',
    name: 'BackgroundSelectorModal.tsx',
    lines: 143,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'High-resolution cosmic environment selector supporting Galactic Core, Deep Space Void, Starburst Nebula, and CMB themes.',
    role: 'Deep-Space Environment Selector',
    techTags: ['Environment Map Swapping', 'Cubemap & Starfield Themes'],
  },
  {
    path: 'src/hooks/useHaptics.ts',
    name: 'useHaptics.ts',
    lines: 106,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description:
      'Universal haptic feedback hook providing tactile vibration patterns for mobile devices (light, medium, heavy, success, warning, sonic boom shock pulse).',
    role: 'Tactile Feedback & Vibration Hook',
    techTags: ['Navigator.vibrate API', 'Custom Vibration Patterns', 'Fallback Safety'],
  },
  {
    path: 'src/physics/gravitationalPhysics.test.ts',
    name: 'gravitationalPhysics.test.ts',
    lines: 100,
    subsystem: 'physics',
    subsystemName: 'Mathematical Physics',
    description:
      'Unit test suite verifying Kerr metric calculations, event horizon existence, frame-dragging angular velocity limits, and ISCO prograde vs retrograde radius bounds.',
    role: 'Physics Metric Verification Unit Tests',
    techTags: ['Unit Tests', 'Numerical Assertions', 'Boundary Condition Checks'],
  },
  {
    path: 'src/main.tsx',
    name: 'main.tsx',
    lines: 5,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description: 'Standard React 18 createRoot DOM bootstrap and index.html mount point.',
    role: 'React Application Entry Point',
    techTags: ['React 18', 'createRoot', 'DOM Mount'],
  },
  {
    path: 'root/config (package.json, vite.config.ts, tsconfig.json, index.html, metadata.json)',
    name: 'Root Configurations',
    lines: 119,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description:
      'Vite bundler configuration, TypeScript strict compiler definitions, package dependencies (Three.js, Lucide, Framer Motion, html-to-image), and HTML5 entry point.',
    role: 'Build & Project Configuration Files',
    techTags: ['Vite', 'TypeScript', 'Package Manifest', 'HTML5 Metadata'],
  },
];

function buildLiveCodebaseFiles(): CodeFileInfo[] {
  const knownPaths = new Set<string>();
  const rootConfigPaths = ['/package.json', '/vite.config.ts', '/tsconfig.json', '/index.html', '/metadata.json'];

  const updatedBase = BASE_CODEBASE_FILES.map((entry) => {
    if (entry.path.startsWith('root/config')) {
      let rootLines = 0;
      let rootBytes = 0;
      const rootSnippets: string[] = [];
      for (const rp of rootConfigPaths) {
        const raw = RAW_SRC_FILES[rp];
        if (typeof raw === 'string') {
          rootLines += countRawLines(raw);
          rootBytes += raw.length;
          rootSnippets.push(`// --- ${rp.slice(1)} ---\n${raw.split(/\r?\n/).slice(0, 12).join('\n')}`);
        }
      }
      return {
        ...entry,
        lines: rootLines > 0 ? rootLines : entry.lines,
        bytes: rootBytes > 0 ? rootBytes : undefined,
        liveSourcePreview: rootSnippets.length > 0 ? rootSnippets.join('\n\n') : undefined,
      };
    }

    const normalizedKey = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
    knownPaths.add(normalizedKey);
    const raw = RAW_SRC_FILES[normalizedKey];
    if (typeof raw === 'string') {
      const allLines = raw.split(/\r?\n/);
      const previewLines = allLines.slice(0, 28).join('\n');
      return {
        ...entry,
        lines: countRawLines(raw),
        bytes: raw.length,
        liveSourcePreview: previewLines,
      };
    }
    return entry;
  });

  // Automatically discover any new files added under /src/** that weren't in BASE_CODEBASE_FILES
  for (const [globPath, raw] of Object.entries(RAW_SRC_FILES)) {
    if (!globPath.startsWith('/src/') || knownPaths.has(globPath) || typeof raw !== 'string') {
      continue;
    }
    const relPath = globPath.slice(1);
    const fileName = relPath.split('/').pop() || relPath;
    let subsystem: CodeFileInfo['subsystem'] = 'infra';
    let subsystemName = 'Styling & Infrastructure';
    if (relPath.startsWith('src/scene/')) {
      subsystem = 'shaders';
      subsystemName = '3D Graphics & Shaders';
    } else if (relPath.startsWith('src/components/')) {
      subsystem = 'hud';
      subsystemName = 'UI & Command HUD';
    } else if (relPath.startsWith('src/physics/')) {
      subsystem = 'physics';
      subsystemName = 'Mathematical Physics';
    } else if (relPath.startsWith('src/audio/')) {
      subsystem = 'audio';
      subsystemName = 'Audio & Sonification';
    }
    updatedBase.push({
      path: relPath,
      name: fileName,
      lines: countRawLines(raw),
      bytes: raw.length,
      liveSourcePreview: raw.split(/\r?\n/).slice(0, 28).join('\n'),
      subsystem,
      subsystemName,
      description: `Live auto-indexed project module (${relPath}) dynamically tracked via Vite raw source introspection.`,
      role: 'Auto-Indexed Source Module',
      techTags: ['TypeScript', 'Live Auto-Sync'],
    });
  }

  return updatedBase;
}

export const CODEBASE_FILES: CodeFileInfo[] = buildLiveCodebaseFiles();

export const TOTAL_CODEBASE_LINES: number = CODEBASE_FILES.reduce((sum, f) => sum + f.lines, 0);

export const FORMAT_CODEBASE_LINES_BADGE: string = `${(TOTAL_CODEBASE_LINES / 1000).toFixed(1)}k`;

const SUBSYSTEM_METRICS = [
  {
    id: 'shaders',
    name: '3D Graphics & Shaders',
    shortName: '3D & Shaders',
    icon: Orbit,
    color: '#F59E0B',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'hud',
    name: 'UI & Command HUD',
    shortName: 'UI & HUD',
    icon: Sliders,
    color: '#38BDF8',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    id: 'interactive',
    name: 'Interactive Modules (Chess & IQ)',
    shortName: 'Chess & IQ Test',
    icon: Gamepad2,
    color: '#A855F7',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'physics',
    name: 'Mathematical Physics',
    shortName: 'Astrophysics',
    icon: Cpu,
    color: '#10B981',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'audio',
    name: 'Audio & Sonification',
    shortName: 'Web Audio',
    icon: Music,
    color: '#EC4899',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  {
    id: 'infra',
    name: 'Styling & Infrastructure',
    shortName: 'Styles & Config',
    icon: Palette,
    color: '#94A3B8',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
] as const;

interface CodebaseDetailsViewProps {
  uiTheme?: 'observatory_gold' | 'cryo_quantum' | 'kerr_claude';
  onHapticLight?: () => void;
  onHapticMedium?: () => void;
  onHapticSuccess?: () => void;
}

export const CodebaseDetailsView: React.FC<CodebaseDetailsViewProps> = ({
  uiTheme = 'observatory_gold',
  onHapticLight,
  onHapticMedium,
  onHapticSuccess,
}) => {
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'lines_desc' | 'lines_asc' | 'name_asc'>('lines_desc');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Compute total lines
  const totalLines = useMemo(() => {
    return CODEBASE_FILES.reduce((sum, f) => sum + f.lines, 0);
  }, []);

  const totalFiles = CODEBASE_FILES.length;

  const subsystemLineTotals = useMemo(() => {
    const map: Record<string, number> = {};
    CODEBASE_FILES.forEach((f) => {
      map[f.subsystem] = (map[f.subsystem] || 0) + f.lines;
    });
    return map;
  }, []);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return CODEBASE_FILES.filter((f) => {
      if (selectedSubsystem !== 'all' && f.subsystem !== selectedSubsystem) {
        return false;
      }
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.role.toLowerCase().includes(q) ||
        f.techTags.some((t) => t.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      if (sortBy === 'lines_desc') return b.lines - a.lines;
      if (sortBy === 'lines_asc') return a.lines - b.lines;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [searchQuery, selectedSubsystem, sortBy]);

  const handleCopySummary = () => {
    onHapticSuccess?.();
    const rows = CODEBASE_FILES.map(
      (f) => `| \`${f.name}\` | ${f.lines.toLocaleString()} | ${f.subsystemName} | ${f.role} |`
    ).join('\n');

    const summary = `# Kerr Relativity Engine v1.4 — Codebase Metrics
Total Lines of Code: ${totalLines.toLocaleString()} Lines
Total Tracked Files: ${totalFiles} Files
Technologies: TypeScript, React 18, Three.js (WebGL2/GLSL), Web Audio API, Tailwind CSS

### Subsystem Breakdown:
- 3D Graphics & Shaders: ${(subsystemLineTotals['shaders'] || 0).toLocaleString()} lines (${(((subsystemLineTotals['shaders'] || 0) / totalLines) * 100).toFixed(1)}%)
- UI & Command HUD: ${(subsystemLineTotals['hud'] || 0).toLocaleString()} lines (${(((subsystemLineTotals['hud'] || 0) / totalLines) * 100).toFixed(1)}%)
- Interactive Modules (Chess & IQ Test): ${(subsystemLineTotals['interactive'] || 0).toLocaleString()} lines (${(((subsystemLineTotals['interactive'] || 0) / totalLines) * 100).toFixed(1)}%)
- Mathematical Physics & Geodesics: ${(subsystemLineTotals['physics'] || 0).toLocaleString()} lines (${(((subsystemLineTotals['physics'] || 0) / totalLines) * 100).toFixed(1)}%)
- Web Audio & Procedural Sonification: ${(subsystemLineTotals['audio'] || 0).toLocaleString()} lines (${(((subsystemLineTotals['audio'] || 0) / totalLines) * 100).toFixed(1)}%)
- Styling & Core Infrastructure: ${(subsystemLineTotals['infra'] || 0).toLocaleString()} lines (${(((subsystemLineTotals['infra'] || 0) / totalLines) * 100).toFixed(1)}%)

### File Breakdown:
| File | Lines | Subsystem | Role |
| :--- | :--- | :--- | :--- |
${rows}
`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(summary);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2400);
    }
  };

  const handleExportJson = () => {
    onHapticSuccess?.();
    const payload = {
      project: 'Kerr Relativity Engine',
      version: '1.4 Apex Metric Core',
      totalLines,
      totalFiles,
      generatedAt: new Date().toISOString(),
      subsystemBreakdown: subsystemLineTotals,
      files: CODEBASE_FILES,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `kerr-engine-codebase-metrics-${Date.now()}.json`;
    link.href = url;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 6000);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 text-sm text-zinc-200">
      {/* Hero Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-white tracking-wide font-display">
              Codebase Metrics &amp; Details
            </h3>
            <span
              data-testid="codebase-live-lines-badge"
              className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs font-semibold"
            >
              {totalLines.toLocaleString()} Lines · LIVE SYNC
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Live auto-updating architectural breakdown of all {totalFiles} source files across 6 core subsystems (synced directly from raw source).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
            title="Copy formatted markdown report of all code counts and architecture details"
          >
            {hasCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer"
            title="Export complete codebase metrics as JSON file"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Big Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total Lines</span>
            <Code className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
            {totalLines.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Lines of code</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Source Files</span>
            <FileCode className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
            {totalFiles}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Tracked modules</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Core Subsystems</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
            6
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Architectures</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Primary Tech</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 text-base font-bold text-white truncate">
            TypeScript + GLSL
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">React 18 &amp; Three.js</div>
        </div>
      </div>

      {/* Clean Horizontal Subsystem Distribution Bar */}
      <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-200">Subsystem Share</span>
          <span className="text-zinc-400 text-xs">Click any category below to filter</span>
        </div>

        {/* Visual Bar */}
        <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex shadow-inner">
          {SUBSYSTEM_METRICS.map((sub) => {
            const count = subsystemLineTotals[sub.id] || 0;
            const pct = (count / totalLines) * 100;
            const isSelected = selectedSubsystem === sub.id;
            return (
              <div
                key={sub.id}
                onClick={() => {
                  onHapticLight?.();
                  setSelectedSubsystem(selectedSubsystem === sub.id ? 'all' : sub.id);
                }}
                style={{ width: `${pct}%`, backgroundColor: sub.color }}
                className={`h-full cursor-pointer transition-all ${
                  selectedSubsystem === 'all' || isSelected
                    ? 'opacity-95'
                    : 'opacity-30 hover:opacity-75'
                }`}
                title={`${sub.name}: ${count.toLocaleString()} lines (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Clickable Subsystem Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
          {SUBSYSTEM_METRICS.map((sub) => {
            const count = subsystemLineTotals[sub.id] || 0;
            const pct = ((count / totalLines) * 100).toFixed(1);
            const isSelected = selectedSubsystem === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  onHapticLight?.();
                  setSelectedSubsystem(selectedSubsystem === sub.id ? 'all' : sub.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${sub.badgeClass} ring-1 ring-amber-400/50 shadow-md`
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="truncate">{sub.shortName}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between font-mono">
                  <span className="text-xs font-bold text-zinc-200">
                    {count.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter, Search & View Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Subsystem Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              onHapticLight?.();
              setSelectedSubsystem('all');
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedSubsystem === 'all'
                ? 'bg-zinc-800 border-zinc-400 text-white font-semibold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            All Subsystems ({totalFiles})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file, tag, or role..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-500 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* View Toggle: Grouped vs Flat List */}
          <div className="flex items-center border border-zinc-800 rounded-lg bg-zinc-900 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onHapticLight?.();
                setViewMode('grouped');
              }}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Group files by subsystem"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onHapticLight?.();
                setViewMode('list');
              }}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="View all files in single ranked list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 outline-none cursor-pointer"
            >
              <option value="lines_desc">Highest Lines</option>
              <option value="lines_asc">Lowest Lines</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Files Display: Clean, Easy-to-Read Table Layout */}
      {viewMode === 'grouped' && selectedSubsystem === 'all' && !searchQuery ? (
        /* GROUPED VIEW: 6 Distinct, Clean Subsystem Sections */
        <div className="space-y-4">
          {SUBSYSTEM_METRICS.map((sub) => {
            const files = CODEBASE_FILES.filter((f) => f.subsystem === sub.id).sort(
              (a, b) => b.lines - a.lines
            );
            const subTotal = files.reduce((sum, f) => sum + f.lines, 0);
            const subPct = ((subTotal / totalLines) * 100).toFixed(1);
            const SubIcon = sub.icon;

            return (
              <div
                key={sub.id}
                className="rounded-xl bg-zinc-950/80 border border-zinc-800/90 overflow-hidden shadow-sm"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${sub.color}25` }}
                    >
                      <SubIcon className="w-4 h-4" style={{ color: sub.color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {sub.name}
                      </h4>
                      <span className="text-xs text-zinc-400">
                        {files.length} {files.length === 1 ? 'module' : 'modules'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-zinc-200">
                      {subTotal.toLocaleString()}{' '}
                      <span className="text-xs text-zinc-400 font-normal">lines</span>
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {subPct}%
                    </span>
                  </div>
                </div>

                {/* File Rows in Clean Table */}
                <div className="divide-y divide-zinc-800/60">
                  {files.map((file) => {
                    const isExpanded = expandedFile === file.path;
                    const pct = ((file.lines / totalLines) * 100).toFixed(1);

                    return (
                      <div
                        key={file.path}
                        className="p-3.5 hover:bg-zinc-900/40 transition-colors"
                      >
                        <div
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                          onClick={() => {
                            onHapticLight?.();
                            setExpandedFile(isExpanded ? null : file.path);
                          }}
                        >
                          {/* File Name & Role */}
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-white hover:text-amber-300 transition-colors">
                                {file.name}
                              </span>
                              <span className="text-xs text-zinc-400 hidden sm:inline">
                                • {file.role}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 sm:hidden mt-0.5">
                              {file.role}
                            </div>
                          </div>

                          {/* Line Count & Expand Chevron */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-20 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(4, parseFloat(pct) * 3.5))}%`,
                                  backgroundColor: sub.color,
                                }}
                                className="h-full rounded-full"
                              />
                            </div>

                            <span className="font-mono text-sm font-bold text-white tabular-nums">
                              {file.lines.toLocaleString()}
                            </span>
                            <span className="text-xs font-mono text-zinc-400 w-12 text-right">
                              {pct}%
                            </span>

                            <button
                              type="button"
                              className="p-1 text-zinc-400 hover:text-white rounded"
                              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-amber-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Deep Details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-lg">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <strong className="text-white">Path: </strong>
                                <code className="text-zinc-400 font-mono text-xs">{file.path}</code>
                              </div>
                              {typeof file.bytes === 'number' && (
                                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                                  Live Size: {(file.bytes / 1024).toFixed(1)} KB ({file.lines.toLocaleString()} lines)
                                </span>
                              )}
                            </div>
                            <div>
                              <strong className="text-white">Implementation: </strong>
                              {file.description}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <strong className="text-white mr-1">Technologies:</strong>
                              {file.techTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            {file.liveSourcePreview && (
                              <div className="pt-2">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 mb-1">
                                  Live Source Snapshot (Auto-Synced via Vite ?raw):
                                </div>
                                <pre className="p-2.5 rounded-lg bg-black/70 border border-zinc-800 text-[10.5px] font-mono text-zinc-300 overflow-x-auto max-h-44 leading-snug">
                                  <code>{file.liveSourcePreview}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT LIST / FILTERED VIEW: Clean Scannable Cards */
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 flex items-center justify-between px-1">
            <span>
              Showing <strong className="text-white">{filteredFiles.length}</strong> of{' '}
              <strong className="text-white">{totalFiles}</strong> files
            </span>
            <span>
              Total in view:{' '}
              <strong className="text-amber-300 font-mono tabular-nums">
                {filteredFiles.reduce((s, f) => s + f.lines, 0).toLocaleString()}
              </strong>{' '}
              lines
            </span>
          </div>

          <div className="divide-y divide-zinc-800/70 rounded-xl bg-zinc-950/80 border border-zinc-800/90 overflow-hidden">
            {filteredFiles.map((file, idx) => {
              const sub =
                SUBSYSTEM_METRICS.find((s) => s.id === file.subsystem) || SUBSYSTEM_METRICS[0];
              const pct = ((file.lines / totalLines) * 100).toFixed(1);
              const isExpanded = expandedFile === file.path;

              return (
                <div
                  key={file.path}
                  className="p-3.5 hover:bg-zinc-900/40 transition-colors"
                >
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                    onClick={() => {
                      onHapticLight?.();
                      setExpandedFile(isExpanded ? null : file.path);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-zinc-500 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-white hover:text-amber-300 transition-colors">
                            {file.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sub.badgeClass}`}
                          >
                            {sub.shortName}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 truncate mt-0.5">
                          {file.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-8 sm:pl-0">
                      <div className="w-20 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(4, parseFloat(pct) * 3.5))}%`,
                            backgroundColor: sub.color,
                          }}
                          className="h-full rounded-full"
                        />
                      </div>

                      <span className="font-mono text-sm font-bold text-white tabular-nums">
                        {file.lines.toLocaleString()}
                      </span>
                      <span className="text-xs font-mono text-zinc-400 w-12 text-right">
                        {pct}%
                      </span>

                      <button
                        type="button"
                        className="p-1 text-zinc-400 hover:text-white rounded"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Card Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-lg ml-8 sm:ml-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <strong className="text-white">Path: </strong>
                          <code className="text-zinc-400 font-mono text-xs">{file.path}</code>
                        </div>
                        {typeof file.bytes === 'number' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                            Live Size: {(file.bytes / 1024).toFixed(1)} KB ({file.lines.toLocaleString()} lines)
                          </span>
                        )}
                      </div>
                      <div>
                        <strong className="text-white">Implementation: </strong>
                        {file.description}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <strong className="text-white mr-1">Technologies:</strong>
                        {file.techTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {file.liveSourcePreview && (
                        <div className="pt-2">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 mb-1">
                            Live Source Snapshot (Auto-Synced via Vite ?raw):
                          </div>
                          <pre className="p-2.5 rounded-lg bg-black/70 border border-zinc-800 text-[10.5px] font-mono text-zinc-300 overflow-x-auto max-h-44 leading-snug">
                            <code>{file.liveSourcePreview}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredFiles.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-sm bg-zinc-950/60 rounded-xl border border-zinc-800">
              No files found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      )}

      {/* Clean Quick Architectural Highlights Footer */}
      <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Code className="w-4 h-4 text-amber-400" />
          <span>Core Engineering Highlights</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400 leading-relaxed">
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-1">
            <span className="font-semibold text-zinc-200">
              WebGL2 Relativistic Raytracer
            </span>
            <p>
              Custom GLSL shaders in <code className="text-amber-300 font-mono">BlackHoleScene.ts</code> integrate null geodesics directly in Boyer-Lindquist curved coordinates with frame-dragging, Doppler beaming, and ISCO accretion disks.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-1">
            <span className="font-semibold text-zinc-200">
              Analytical Mathematical Physics
            </span>
            <p>
              <code className="text-emerald-300 font-mono">gravitationalPhysics.ts</code> solves Kerr metric tensor components, event horizon bounds r± = M ± √(M² - a²), and 4th-order Runge-Kutta numerical trajectories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
