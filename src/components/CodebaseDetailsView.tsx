import React, { useState, useMemo, useEffect } from 'react';
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

// Live Vite raw source glob (MUST be a literal import.meta.glob call so Vite's AST compiler transforms it)
let RAW_SRC_FILES: Record<string, string> = {};
try {
  // @ts-ignore - Vite compile-time literal glob transform
  const globResult = import.meta.glob(
    [
      '/src/**/*.{ts,tsx,css,json}',
      '/server.ts',
      '/index.html',
      '/package.json',
      '/vite.config.ts',
      '/tsconfig.json',
      '/metadata.json',
    ],
    { query: '?raw', import: 'default', eager: true }
  );
  if (globResult && typeof globResult === 'object') {
    RAW_SRC_FILES = globResult as Record<string, string>;
  }
} catch {
  // Fallback in non-Vite Node test environments
}

// Live on-disk file metrics synced from /api/codebase/telemetry so every update is reflected immediately
let LIVE_SERVER_METRICS: Record<string, { lines: number; bytes: number; preview: string }> = {};
const serverMetricsListeners = new Set<() => void>();
let isFetchingServerMetrics = false;

export function syncLiveCodebaseFromServer(): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function' || isFetchingServerMetrics) {
    return;
  }
  isFetchingServerMetrics = true;
  fetch('/api/codebase/telemetry')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.files && typeof data.files === 'object') {
        LIVE_SERVER_METRICS = data.files;
        serverMetricsListeners.forEach((cb) => cb());
      }
    })
    .catch(() => {
      // Ignore offline/test environment errors
    })
    .finally(() => {
      isFetchingServerMetrics = false;
    });
}

function countRawLines(raw: string): number {
  if (!raw) return 0;
  const lines = raw.split(/\r?\n/).length;
  return raw.endsWith('\n') ? Math.max(1, lines - 1) : lines;
}

export const RECENT_CODEBASE_UPDATES = [
  {
    title: 'Canonical Multi-Factor Lyrics Finder & Executive Codebase Dossier',
    files: 'songLyrics.ts, server.ts, SettingsModal.tsx, CodebaseDetailsView.tsx',
    summary:
      'Engineered a multi-factor canonical lyrics resolution algorithm (60+ pseudonymous Nightcore/Sped-Up artist overrides, token Jaccard similarity, LRC timestamp density verification, and dual-mode tempo-ratio scaling) plus an executive-grade 7-section Codebase Telemetry Summary Dossier.',
  },
  {
    title: '60FPS Watermark Studio, Song Version Retry & Streamlined IQ Navigation',
    files: 'WatermarkStudioModal.tsx, TopBar.tsx, SettingsModal.tsx, IQTestModule.tsx',
    summary:
      'Added interactive 12-Ray Starburst Watermark Studio with 5 color themes & 3 motion presets, Wrong Song Version Retry engine (Next Best / Studio / Sped Up / Slowed), and streamlined non-blocking IQ Test navigation.',
  },
  {
    title: 'D3.js Growth Analytics Dashboard & Post-Test Telemetry Report',
    files: 'GrowthAnalyticsDashboard.tsx, iqTelemetryEngine.ts, IQTestModule.tsx',
    summary:
      'Implemented D3.js longitudinal line charts across Howard Gardner’s 9 intelligence domains, an aerospace Post-Test Telemetry Report (Headline CI, 4-Category Sub-Domains, Per-Question Latency Curve, Difficulty Calibration, JSON/Summary export), and cleaned up the IQ Test UI to match the Diagnostic & Code tabs.',
  },
  {
    title: 'Howard Gardner’s 9 Multiple Intelligences & 85-Question IQ Database',
    files: 'IQTestModule.tsx, iqQuestionBank.ts, CodebaseDetailsView.tsx',
    summary:
      'Expanded IQ Test into an 85-question master database with stratified non-repeating random sampling across Howard Gardner’s 9 Primary Intelligences (Linguistic, Logical-Mathematical, Spatial, Musical, Bodily-Kinesthetic, Interpersonal, Intrapersonal, Naturalist, Existential) plus 24 visual 3×3 matrices.',
  },
] as const;

const BASE_CODEBASE_FILES: CodeFileInfo[] = [
  {
    path: 'src/scene/BlackHoleScene.ts',
    name: 'BlackHoleScene.ts',
    lines: 7529,
    bytes: 317294,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Three.js WebGL rendering pipeline, modular GLSL spacetime raymarching shader orchestration, Hardware WebGL Shader Pre-Warming Cache, Supersonic Boom shockwave, Classified 1987 6-Module Anomaly Suite (Quasar Jets, Hawking Swarm, Wormhole Cage, Tachyon Reversal, 1987A Hypernova), and Thermal Throttling.',
    role: 'Primary 3D WebGL Engine, Shader Pre-Warmer & Core',
    techTags: ['Three.js', 'Custom GLSL', 'Shader Pre-Warming', 'Classified 1987 Suite', 'Thermal Throttling', 'WebGL2'],
  },
  {
    path: 'src/scene/shaders/kerrRaymarch.glsl.ts',
    name: 'kerrRaymarch.glsl.ts',
    lines: 1205,
    bytes: 63660,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Primary general relativistic raymarching, Kerr event horizon shadow, volumetric 3D accretion disk with Doppler beaming & Novikov-Thorne thermal spectra, and gravitational lensing vertex/fragment GLSL shader modules.',
    role: 'General Relativistic Raymarching & Lensing GLSL Shaders',
    techTags: ['Kerr Metric GLSL', 'Geodesic Raymarching', 'Doppler Beaming', 'Novikov-Thorne'],
  },
  {
    path: 'src/scene/shaders/postProcess.glsl.ts',
    name: 'postProcess.glsl.ts',
    lines: 973,
    bytes: 38289,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Post-processing, relativistic motion blur, long-exposure time-lapse accumulation, anamorphic & hexagonal aperture lens flare, 1987 Chromatic Prism RGB dispersion & CRT scanline shader, Prandtl-Glauert supersonic shockwave, and lensed starfield GLSL shaders.',
    role: 'Post-Processing, Chromatic Prism, Flare & Shockwave Shaders',
    techTags: ['Anamorphic Flare', '1987 Chromatic Prism', 'Supersonic Shockwave', 'Motion Blur', 'GLSL'],
  },
  {
    path: 'src/scene/kerrUniforms.ts',
    name: 'kerrUniforms.ts',
    lines: 370,
    bytes: 12801,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Stateless uniform dictionary initializers (createInitialKerrUniforms, createInitialAccretionDiskUniforms, createInitialSingularityUniforms, createInitialCameraLensFlareUniforms, createInitialStarfieldUniforms) and astrophysical preset-to-uniform mapping tables and functions.',
    role: 'Kerr Shader Uniform Initializers & Preset Mappers',
    techTags: ['Kerr Uniforms', 'Preset Mappers', 'Spectral LUT', 'Three.js IUniform'],
  },
  {
    path: 'src/scene/cameraMath.ts',
    name: 'cameraMath.ts',
    lines: 325,
    bytes: 9597,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Stateless coordinate conversions (Boyer-Lindquist oblate spheroidal / spherical / Three.js Y-up Cartesian), equatorial accretion plane ray intersection helpers, and 3D-to-2D NDC/screen projection utilities.',
    role: 'Boyer-Lindquist Coordinate & 3D Screen Projection Math',
    techTags: ['Boyer-Lindquist Math', 'Cartesian Projection', 'NDC Screen Space', 'Camera Presets'],
  },
  {
    path: 'src/scene/renderScaleUtils.ts',
    name: 'renderScaleUtils.ts',
    lines: 663,
    bytes: 22648,
    subsystem: 'shaders',
    subsystemName: '3D Graphics & Shaders',
    description:
      'Desktop pixel-ratio clamping, 30-frame rolling FPS dynamic resolution scaler, User Timing API pass classifier, Full Geodesic vs. Approximated Null-Geodesic shader snippet generator, passive-cooling RC thermal throttling state machine, and Shader Pre-Warming Cache manifest.',
    role: 'GPU Performance, Shader Pre-Warmer & Thermal Engine',
    techTags: ['Shader Pre-Warming', 'Thermal Throttling', 'User Timing API', 'Dynamic DPR', 'GLSL Snippets'],
  },
  {
    path: 'src/scene/renderScaleUtils.test.ts',
    name: 'renderScaleUtils.test.ts',
    lines: 447,
    bytes: 15774,
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
    lines: 5185,
    bytes: 247800,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Multi-tab control center providing visualizer settings, Classified 1987 6-anomaly vault, Spotify-style Songs player with minimizable bottom bar, Lyric Sync (Teleprompter, Cinema Stage & Full Lyrics with word-by-word highlight & sync offset), persistent IQ Test host, diagnostic stress-test suite, and live Code tab.',
    role: 'Central Settings, Lyric Sync Audio Deck & Diagnostic Hub',
    techTags: ['React 19', 'Lyric Sync Engine', 'Cinema Stage', 'Minimizable Player', 'Tailwind CSS'],
  },
  {
    path: 'src/App.tsx',
    name: 'App.tsx',
    lines: 2941,
    bytes: 118740,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Root application orchestrator managing Three.js canvas mounts, Focus Mode transitions, Kerr-Newman Metric Core boot telemetry sequence, 12-ray singularity watermark rendering, event log JSON exports, and synchronized compare viewports.',
    role: 'Application Orchestrator & Viewport Host',
    techTags: ['React 19', 'Canvas Compositing', 'HTML5 to-image', 'Hooks', 'Keyboard Shortcuts'],
  },
  {
    path: 'src/components/ControlDock.tsx',
    name: 'ControlDock.tsx',
    lines: 2684,
    bytes: 125747,
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
    bytes: 74226,
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
    lines: 2790,
    bytes: 124500,
    subsystem: 'interactive',
    subsystemName: 'Interactive Modules',
    description:
      'Comprehensive psychometric & Howard Gardner 9 Multiple Intelligences assessment suite with Diagnostic/Code-matched observatory UI, 85-question master database, 24 Raven’s/Mensa 3×3 visual matrices, D3.js Growth Analytics integration, and Post-Test Telemetry Report.',
    role: 'Howard Gardner 9-Intelligence & Matrix IQ Assessment Engine',
    techTags: ['Howard Gardner 9 Intelligences', 'D3.js Analytics', 'Post-Test Telemetry', '3×3 Matrix SVG'],
  },
  {
    path: 'src/components/GrowthAnalyticsDashboard.tsx',
    name: 'GrowthAnalyticsDashboard.tsx',
    lines: 1138,
    bytes: 44941,
    subsystem: 'interactive',
    subsystemName: 'Interactive Modules',
    description:
      'D3.js longitudinal Growth Analytics dashboard visualizing user progress across all 9 intelligence domains over time with interactive domain curves, plus the aerospace Post-Test Telemetry Report (Headline CI, 4-Category Sub-Domains, Per-Question Latency Curve, Difficulty Calibration, and JSON/Summary export).',
    role: 'D3.js Longitudinal Growth Analytics & Post-Test Telemetry Dashboard',
    techTags: ['D3.js Line Charts', 'Latency Curve', '9-Axis Radar', 'Difficulty Calibration'],
  },
  {
    path: 'src/components/iqTelemetryEngine.ts',
    name: 'iqTelemetryEngine.ts',
    lines: 665,
    bytes: 20503,
    subsystem: 'interactive',
    subsystemName: 'Interactive Modules',
    description:
      'Pure psychometric telemetry and growth calculation engine computing normal CDF percentiles, confidence intervals, 4-category cognitive sub-domain accuracy & latency, per-question latency curves, difficulty tier pass rates, and longitudinal 9-domain trajectory deltas.',
    role: 'Psychometric Telemetry & Longitudinal Growth Calculation Engine',
    techTags: ['Normal CDF Percentile', 'Sub-Domain Classifier', 'Latency Telemetry', 'Longitudinal History'],
  },
  {
    path: 'src/components/iqQuestionBank.ts',
    name: 'iqQuestionBank.ts',
    lines: 1215,
    bytes: 51800,
    subsystem: 'interactive',
    subsystemName: 'Interactive Modules',
    description:
      'Master question bank defining Howard Gardner’s 9 Primary Intelligences (Linguistic/Word Smart, Logical-Mathematical/Number Smart, Spatial/Picture Smart, Musical/Music Smart, Bodily-Kinesthetic/Body Smart, Interpersonal/People Smart, Intrapersonal/Self Smart, Naturalist/Nature Smart, Existential/Philosophy Smart) and stratified non-repeating test sampling.',
    role: '9-Domain Multiple Intelligences Question Bank & Stratified Sampler',
    techTags: ['Multiple Intelligences', 'Stratified Sampling', 'Psychometric Bank', 'Anti-Repetition Memory'],
  },
  {
    path: 'src/physics/gravitationalPhysics.ts',
    name: 'gravitationalPhysics.ts',
    lines: 1439,
    bytes: 56405,
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
    lines: 1212,
    bytes: 52284,
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
    lines: 1425,
    bytes: 65200,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Live auto-syncing codebase telemetry dashboard combining Vite ?raw compile-time introspection and /api/codebase/telemetry filesystem inspection to report real-time line counts, byte sizes, subsystem distribution, and recent update logs.',
    role: 'Live Codebase Metrics & Update Telemetry Dashboard',
    techTags: ['Live Filesystem Sync', 'Vite ?raw Glob', 'Subsystem Metrics', 'Markdown & JSON Export'],
  },
  {
    path: 'src/components/DiagnosticSuiteView.tsx',
    name: 'DiagnosticSuiteView.tsx',
    lines: 543,
    bytes: 24385,
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
    bytes: 39597,
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
    lines: 969,
    bytes: 24071,
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
    bytes: 32283,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Main header navigation bar providing target preset selection, system category switcher (Isolated Singularity vs Binary Accretion), snapshot/recording triggers, quick modal openers, and version badges.',
    role: 'Top Navigation & Quick Command Bar',
    techTags: ['Dropdown Selectors', 'Record Actions', 'Haptic Triggers', 'Responsive Header'],
  },
  {
    path: 'src/components/WatermarkStudioModal.tsx',
    name: 'WatermarkStudioModal.tsx',
    lines: 715,
    bytes: 29450,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Interactive 12-Ray Starburst Watermark Studio providing side-by-side Still Emblem and 60FPS Animated Singularity previews, 5 astrophysical color palettes (Observatory Gold, Relativistic Cyan, Crimson Singularity, Emerald Quantum, Pure Monochrome), 3 motion presets, and 2400×900 PNG / 60FPS WebM / SVG vector export.',
    role: '12-Ray Starburst Watermark Studio & 60FPS Exporter',
    techTags: ['SVG Starburst', '60FPS Canvas Animation', '5 Color Palettes', 'PNG & WebM Export'],
  },
  {
    path: 'server.ts',
    name: 'server.ts',
    lines: 1503,
    bytes: 55939,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Express backend server featuring Verified Studio Master audio resolution (Archive.org FLAC/320kbps + SoundCloud progressive/HLS stream assembler), Song Version Retry engine (/api/audio/retry-version), Multi-Factor Canonical LRCLIB synced lyrics solver (/api/audio/lyrics), and live filesystem codebase telemetry (/api/codebase/telemetry).',
    role: 'Studio Audio Resolver, Canonical Lyrics Proxy & Telemetry Server',
    techTags: ['Express', 'Canonical Lyrics Solver', 'Version Retry API', 'iTunes Duration Lookup', 'HTTP Range Streaming'],
  },
  {
    path: 'src/audio/importedTracks.ts',
    name: 'importedTracks.ts',
    lines: 4479,
    bytes: 165391,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Complete 274-track audio catalog containing song titles, artist metadata, high-resolution album cover URLs, verified studio master durations, Archive.org/SoundCloud stream sources, BPM tempos, and genre classifications.',
    role: 'Master Playlist Track Catalog & Studio Audio Metadata',
    techTags: ['Audio Catalog', '274 Tracks', 'Studio Durations', 'Stream Sources'],
  },
  {
    path: 'src/audio/coreLyricsData.json',
    name: 'coreLyricsData.json',
    lines: 2437,
    bytes: 53620,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Embedded millisecond-accurate studio LRC lyric dataset providing instant zero-latency synchronized subtitles and word-by-word timing for core playlist tracks.',
    role: 'Embedded Studio LRC Synced Lyrics Dataset',
    techTags: ['LRC Timestamps', 'Zero-Latency Lyrics', 'Studio Timecodes', 'JSON Dataset'],
  },
  {
    path: 'src/audio/trapQueenPlayer.ts',
    name: 'trapQueenPlayer.ts',
    lines: 1535,
    bytes: 51559,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Web Audio API multi-track mastering player with 60ms (16.7Hz) high-precision lyric clock, 3-band DSP equalizer, stereo panning, variable playback speed (0.5x–2.0x), real-time 16-band FFT spectrum analysis, and queue completeness validator.',
    role: 'Web Audio Mastering Player & High-Precision Clock Engine',
    techTags: ['Web Audio API', '60ms Lyric Clock', '3-Band EQ', 'FFT Analyser'],
  },
  {
    path: 'src/audio/songLyrics.ts',
    name: 'songLyrics.ts',
    lines: 315,
    bytes: 9985,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Synchronized lyrics engine featuring 0.01s LRC timestamp parser, 1:1 studio timecode preservation, vocal onset anticipation lead, ±5.0s user sync offset calibration, and real-time word-by-word progress interpolation.',
    role: 'Lyric Sync Parser & Word-by-Word Progress Engine',
    techTags: ['Lyric Sync', 'LRC Parser', 'Word-by-Word Progress', 'LRCLIB Client'],
  },
  {
    path: 'src/scene/CompactStarMaterial.ts',
    name: 'CompactStarMaterial.ts',
    lines: 698,
    bytes: 26941,
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
    lines: 701,
    bytes: 27454,
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
    lines: 712,
    bytes: 33464,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description:
      'Complete internationalization string dictionary supporting English (en), German (de), Japanese (ja), Spanish (es), and Simplified Chinese (zh) across all UI modules and scientific terminology.',
    role: 'Multi-Language Internationalization Core',
    techTags: ['i18n Localization', '5 Languages', 'Astrophysical Glossary'],
  },
  {
    path: 'src/components/BlackHoleAnatomyOverlay.tsx',
    name: 'BlackHoleAnatomyOverlay.tsx',
    lines: 612,
    bytes: 21201,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Dynamic 3D-to-2D projected leader lines identifying the Event Horizon, Ergosphere, ISCO, Photon Sphere, and Relativistic Accretion Flow directly on the viewport.',
    role: '3D Leader Line Annotation Overlay',
    techTags: ['3D Vector Unprojection', 'SVG Leader Lines', 'Camera Tracking'],
  },
  {
    path: 'src/components/PerformanceMonitorOverlay.tsx',
    name: 'PerformanceMonitorOverlay.tsx',
    lines: 596,
    bytes: 22968,
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
    lines: 569,
    bytes: 22652,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      '2D top-down equatorial radar widget showing observer orbital coordinates, horizon circle, ISCO ring, ergosphere profile, and interactive probe coordinate radius manipulator.',
    role: '2D Orbital Radar & Observer Coordinate Map',
    techTags: ['HTML5 Canvas 2D', 'Orbital Mechanics', 'Interactive Probe Pointer'],
  },
  {
    path: 'src/audio/relativisticAudio.ts',
    name: 'relativisticAudio.ts',
    lines: 559,
    bytes: 22573,
    subsystem: 'audio',
    subsystemName: 'Audio & Sonification',
    description:
      'Real-time gravitational sound synthesis generating accretion shockwave boom pulses, gravitational wave frequency chirps, Doppler frequency shifts, and relativistic frame-dragging low-frequency drone audio.',
    role: 'Relativistic Sonification & Shockwave Audio Engine',
    techTags: ['Web Audio Synthesis', 'BiquadFilterNode', 'Custom Drone Oscillators', 'Chirps'],
  },
  {
    path: 'src/components/ArchetypeModal.tsx',
    name: 'ArchetypeModal.tsx',
    lines: 459,
    bytes: 24025,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Cosmic archetype reference guide detailing Supermassive, Intermediate, Stellar-mass, Primordial black holes, and compact stars with real-world astronomical counterparts.',
    role: 'Astrophysical Archetypes Encyclopedia',
    techTags: ['Encyclopedia Layout', 'Astrophysical Categorization', 'Solar Mass Scales'],
  },
  {
    path: 'src/components/PhysicsQuickGuideModal.tsx',
    name: 'PhysicsQuickGuideModal.tsx',
    lines: 409,
    bytes: 21829,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Intuitive plain-English guide explaining Kerr black hole anatomy, spacetime whirlpools, accretion disk Doppler beaming, gravitational time dilation, and event horizons through accessible analogies.',
    role: 'Accessible Physics Learning Modal',
    techTags: ['Educational UI', 'Physics Analogies', 'Interactive Diagrams'],
  },
  {
    path: 'src/components/CosmicScaleModal.tsx',
    name: 'CosmicScaleModal.tsx',
    lines: 335,
    bytes: 14666,
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
    bytes: 11226,
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
    bytes: 10683,
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
    bytes: 9658,
    subsystem: 'hud',
    subsystemName: 'UI & Command HUD',
    description:
      'Minimalist terminal-style release notes viewer tracing the evolution from Kerr Engine v1.0 foundational shaders to v1.4 Apex Metric Core.',
    role: 'Version History & Changelog Terminal',
    techTags: ['Terminal UI', 'Changelog Timeline', 'Version Tracking'],
  },
  {
    path: 'src/physics/gravitationalPhysics.test.ts',
    name: 'gravitationalPhysics.test.ts',
    lines: 216,
    bytes: 8503,
    subsystem: 'physics',
    subsystemName: 'Mathematical Physics',
    description:
      'Unit test suite verifying Kerr metric calculations, event horizon existence, frame-dragging angular velocity limits, and ISCO prograde vs retrograde radius bounds.',
    role: 'Physics Metric Verification Unit Tests',
    techTags: ['Unit Tests', 'Numerical Assertions', 'Boundary Condition Checks'],
  },
  {
    path: 'src/components/TimeDilationDisplay.tsx',
    name: 'TimeDilationDisplay.tsx',
    lines: 185,
    bytes: 7457,
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
    bytes: 5560,
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
    bytes: 3690,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description:
      'Universal haptic feedback hook providing tactile vibration patterns for mobile devices (light, medium, heavy, success, warning, sonic boom shock pulse).',
    role: 'Tactile Feedback & Vibration Hook',
    techTags: ['Navigator.vibrate API', 'Custom Vibration Patterns', 'Fallback Safety'],
  },
  {
    path: 'src/main.tsx',
    name: 'main.tsx',
    lines: 5,
    bytes: 159,
    subsystem: 'infra',
    subsystemName: 'Styling & Infrastructure',
    description: 'Standard React 19 createRoot DOM bootstrap and index.html mount point.',
    role: 'React Application Entry Point',
    techTags: ['React 19', 'createRoot', 'DOM Mount'],
  },
  {
    path: 'root/config (package.json, vite.config.ts, tsconfig.json, index.html, metadata.json)',
    name: 'Root Configurations',
    lines: 140,
    bytes: 4562,
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
  for (const rp of rootConfigPaths) {
    knownPaths.add(rp);
  }

  const updatedBase = BASE_CODEBASE_FILES.map((entry) => {
    if (entry.path.startsWith('root/config')) {
      let rootLines = 0;
      let rootBytes = 0;
      const rootSnippets: string[] = [];
      for (const rp of rootConfigPaths) {
        const serverMetric = LIVE_SERVER_METRICS[rp];
        const raw = RAW_SRC_FILES[rp];
        if (serverMetric) {
          rootLines += serverMetric.lines;
          rootBytes += serverMetric.bytes;
          rootSnippets.push(`// --- ${rp.slice(1)} ---\n${serverMetric.preview.split(/\r?\n/).slice(0, 12).join('\n')}`);
        } else if (typeof raw === 'string') {
          rootLines += countRawLines(raw);
          rootBytes += raw.length;
          rootSnippets.push(`// --- ${rp.slice(1)} ---\n${raw.split(/\r?\n/).slice(0, 12).join('\n')}`);
        }
      }
      return {
        ...entry,
        lines: rootLines > 0 ? rootLines : entry.lines,
        bytes: rootBytes > 0 ? rootBytes : entry.bytes,
        liveSourcePreview: rootSnippets.length > 0 ? rootSnippets.join('\n\n') : undefined,
      };
    }

    const normalizedKey = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
    knownPaths.add(normalizedKey);
    const serverMetric = LIVE_SERVER_METRICS[normalizedKey];
    if (serverMetric) {
      return {
        ...entry,
        lines: serverMetric.lines,
        bytes: serverMetric.bytes,
        liveSourcePreview: serverMetric.preview,
      };
    }

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

  // Automatically discover any new files added on disk or in Vite ?raw glob that weren't in BASE_CODEBASE_FILES
  const allDiscoveredPaths = new Set<string>([
    ...Object.keys(RAW_SRC_FILES),
    ...Object.keys(LIVE_SERVER_METRICS),
  ]);

  for (const globPath of allDiscoveredPaths) {
    if (knownPaths.has(globPath)) {
      continue;
    }
    if (!globPath.startsWith('/src/') && globPath !== '/server.ts') {
      continue;
    }
    const serverMetric = LIVE_SERVER_METRICS[globPath];
    const raw = RAW_SRC_FILES[globPath];
    if (!serverMetric && typeof raw !== 'string') {
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
    } else if (relPath.startsWith('src/audio/') || relPath === 'server.ts') {
      subsystem = 'audio';
      subsystemName = 'Audio & Sonification';
    }
    updatedBase.push({
      path: relPath,
      name: fileName,
      lines: serverMetric ? serverMetric.lines : countRawLines(raw || ''),
      bytes: serverMetric ? serverMetric.bytes : (raw || '').length,
      liveSourcePreview: serverMetric
        ? serverMetric.preview
        : (raw || '').split(/\r?\n/).slice(0, 28).join('\n'),
      subsystem,
      subsystemName,
      description: `Live auto-indexed project module (${relPath}) dynamically tracked via filesystem & Vite raw source introspection.`,
      role: 'Auto-Indexed Source Module',
      techTags: ['TypeScript', 'Live Auto-Sync'],
    });
  }

  return updatedBase;
}

export interface LiveCodebaseTelemetry {
  files: CodeFileInfo[];
  totalLines: number;
  totalChars: number;
  formattedLinesLabel: string;
  formattedCharsLabel: string;
  refreshedAt: number;
}

export function computeLiveCodebaseTelemetry(): LiveCodebaseTelemetry {
  const files = buildLiveCodebaseFiles();
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const totalChars = files.reduce((sum, f) => sum + (f.bytes ?? f.lines * 42), 0);
  return {
    files,
    totalLines,
    totalChars,
    formattedLinesLabel: `${totalLines.toLocaleString()} lines`,
    formattedCharsLabel: `${totalChars.toLocaleString()} chars`,
    refreshedAt: Date.now(),
  };
}

export const CODEBASE_FILES: CodeFileInfo[] = buildLiveCodebaseFiles();

export const TOTAL_CODEBASE_LINES: number = CODEBASE_FILES.reduce((sum, f) => sum + f.lines, 0);

export const TOTAL_CODEBASE_CHARS: number = CODEBASE_FILES.reduce(
  (sum, f) => sum + (f.bytes ?? f.lines * 42),
  0
);

export const FORMAT_CODEBASE_LINES_BADGE: string = `${TOTAL_CODEBASE_LINES.toLocaleString()} lines`;

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
  refreshToken?: number;
  onHapticLight?: () => void;
  onHapticMedium?: () => void;
  onHapticSuccess?: () => void;
}

export const CodebaseDetailsView: React.FC<CodebaseDetailsViewProps> = ({
  uiTheme = 'observatory_gold',
  refreshToken = 0,
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
  const [showSummaryPreview, setShowSummaryPreview] = useState<boolean>(false);
  const [serverSyncGeneration, setServerSyncGeneration] = useState<number>(0);

  useEffect(() => {
    const onUpdated = () => setServerSyncGeneration((g) => g + 1);
    serverMetricsListeners.add(onUpdated);
    syncLiveCodebaseFromServer();
    return () => {
      serverMetricsListeners.delete(onUpdated);
    };
  }, [refreshToken]);

  // Dynamically recompute live codebase files, total lines, and total characters whenever refreshToken or server sync updates
  const liveTelemetry = useMemo(() => {
    void refreshToken;
    void serverSyncGeneration;
    return computeLiveCodebaseTelemetry();
  }, [refreshToken, serverSyncGeneration]);

  const liveFiles = liveTelemetry.files;
  const totalLines = liveTelemetry.totalLines;
  const totalChars = liveTelemetry.totalChars;
  const totalFiles = liveFiles.length;

  const subsystemLineTotals = useMemo(() => {
    const map: Record<string, number> = {};
    liveFiles.forEach((f) => {
      map[f.subsystem] = (map[f.subsystem] || 0) + f.lines;
    });
    return map;
  }, [liveFiles]);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return liveFiles.filter((f) => {
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
  }, [liveFiles, searchQuery, selectedSubsystem, sortBy]);

  const comprehensiveSummaryMarkdown = useMemo(() => {
    const sortedByLines = [...liveFiles].sort((a, b) => b.lines - a.lines);
    const totalKB = (totalChars / 1024).toFixed(1);
    const totalMB = (totalChars / (1024 * 1024)).toFixed(2);
    const avgLinesPerFile = Math.round(totalLines / Math.max(1, totalFiles));
    const medianLines =
      sortedByLines[Math.floor(sortedByLines.length / 2)]?.lines || avgLinesPerFile;
    const top3Modules = sortedByLines
      .slice(0, 3)
      .map((f) => `${f.name} (${f.lines.toLocaleString()} lines)`)
      .join(' · ');

    const makeAsciiBar = (pct: number) => {
      const filled = Math.max(1, Math.min(20, Math.round((pct / 100) * 20)));
      return `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`;
    };

    const subsystemTableRows = SUBSYSTEM_METRICS.map((sub) => {
      const subFiles = sortedByLines.filter((f) => f.subsystem === sub.id);
      const subLines = subsystemLineTotals[sub.id] || 0;
      const subBytes = subFiles.reduce((s, f) => s + (f.bytes ?? f.lines * 42), 0);
      const subKB = (subBytes / 1024).toFixed(1);
      const pct = totalLines > 0 ? (subLines / totalLines) * 100 : 0;
      const leadModule = subFiles[0]
        ? `\`${subFiles[0].name}\` (${subFiles[0].lines.toLocaleString()} L)`
        : '—';
      return `| **${sub.name}** | ${subFiles.length} | ${subLines.toLocaleString()} | ${subKB} KB | **${pct.toFixed(1)}%** \`${makeAsciiBar(pct)}\` | ${leadModule} |`;
    }).join('\n');

    const rankedInventoryRows = sortedByLines
      .map((f, idx) => {
        const kb = ((f.bytes ?? f.lines * 42) / 1024).toFixed(1);
        const pct = totalLines > 0 ? ((f.lines / totalLines) * 100).toFixed(2) : '0.00';
        const tags = f.techTags.slice(0, 4).join(', ');
        return `| ${idx + 1} | \`${f.path}\` | ${f.subsystemName} | **${f.lines.toLocaleString()}** | ${kb} KB | ${pct}% | ${f.role} | ${tags} |`;
      })
      .join('\n');

    const recentChangelogRows = RECENT_CODEBASE_UPDATES.map(
      (u, idx) =>
        `${idx + 1}. **${u.title}** (\`${u.files}\`)\n   - ${u.summary}`
    ).join('\n');

    const subsystemDetailedManifest = SUBSYSTEM_METRICS.map((sub) => {
      const subFiles = sortedByLines.filter((f) => f.subsystem === sub.id);
      const subLines = subsystemLineTotals[sub.id] || 0;
      const pct = totalLines > 0 ? ((subLines / totalLines) * 100).toFixed(1) : '0.0';
      const items = subFiles
        .map(
          (f) =>
            `  - **\`${f.path}\`** — **${f.lines.toLocaleString()} lines** (${(
              (f.bytes ?? f.lines * 42) / 1024
            ).toFixed(1)} KB) · *${f.role}*\n    - ${f.description}\n    - *Tech Stack:* \`${f.techTags.join('` · `')}\``
        )
        .join('\n');
      return `#### ${sub.name} — ${subLines.toLocaleString()} Lines (${pct}% · ${subFiles.length} Modules)\n${items}`;
    }).join('\n\n');

    return `# ═══════════════════════════════════════════════════════════════════════════
# KERR RELATIVITY ENGINE v1.4 — APEX METRIC CORE
# EXECUTIVE ARCHITECTURAL & LIVE CODEBASE TELEMETRY DOSSIER
# ═══════════════════════════════════════════════════════════════════════════

## I. EXECUTIVE SYSTEM TELEMETRY SNAPSHOT
- **System Designation:** Kerr Relativity Engine v1.4 (Apex Metric Core)
- **Telemetry Sync Mode:** Live Dual-Channel Introspection (\`Vite ?raw AST Glob\` + \`/api/codebase/telemetry\` Filesystem Sync)
- **Total Lines of Code:** **${totalLines.toLocaleString()} Lines**
- **Total Source Characters / Footprint:** **${totalChars.toLocaleString()} chars** (**${totalKB} KB** / **${totalMB} MB**)
- **Total Tracked Source Modules:** **${totalFiles} Files** across **6 Core Subsystems**
- **Module Density Metrics:** Avg **${avgLinesPerFile.toLocaleString()} lines/module** · Median **${medianLines.toLocaleString()} lines/module**
- **Largest Primary Engines:** ${top3Modules}
- **Snapshot Generated:** ${new Date().toISOString()}

---

## II. MULTI-LAYER TECHNOLOGY STACK & RUNTIME MATRIX
| Architectural Layer | Primary Frameworks & Engines | Core Mathematical / Algorithmic Capabilities |
| :--- | :--- | :--- |
| **1. 3D Spacetime & WebGL2 Shaders** | Three.js r187, Custom WebGL2 GLSL, HTML5 Canvas 2D | Boyer-Lindquist geodesic raymarching, Novikov-Thorne relativistic accretion disk, Doppler beaming, Hardware Shader Pre-Warming Cache, RC Thermal Throttling |
| **2. Mathematical Physics Core** | TypeScript 7 Strict Numerical Solver, Node Test Suite | Exact Kerr metric tensor ($g_{\\mu\\nu}$), Event Horizons ($r_\\pm$), Ergosphere ($r_E$), Prograde/Retrograde ISCO & Photon Sphere, Carter Constant ($Q$), 4th-Order Runge-Kutta (RK4) |
| **3. Command HUD & Watermark Studio** | React 19, Tailwind CSS v4, Motion 12, html-to-image | Dual-mode desktop/mobile HUD, Side-by-Side Compare Viewport, 60FPS 12-Ray Starburst Watermark Studio (5 Color Themes, 3 Motion Presets, PNG/WebM/SVG Export) |
| **4. Audio DSP & Canonical Lyrics Finder** | Web Audio API, 3-Band EQ, 16-Band FFT, LRCLIB Proxy | 274-Track Studio Catalog, Multi-Factor Canonical Lyrics Finder (Artist Override Map + Token Jaccard + LRC Density + Dual-Mode Tempo Scaling), Version Retry Engine |
| **5. Psychometrics & Chess AI Sandbox** | D3.js v7, SVG Matrix Renderer, Minimax Alpha-Beta | Howard Gardner 9 Multiple Intelligences (85-Question Bank + 24 Raven's 3×3 Matrices), D3.js Longitudinal Growth Curves, Lichess-Referenced Chess Engine (10 Bots) |
| **6. Full-Stack Streaming & Telemetry** | Express 4, Node.js FS/Streams, Vite 8 Middleware | Verified 320kbps/FLAC Archive.org & SoundCloud HLS stream assembler, HTTP 206 Byte-Range streaming, Apple Music/iTunes duration verification, Live Codebase API |

---

## III. SUBSYSTEM QUANTITATIVE DISTRIBUTION (6 CORE ARCHITECTURES)
| Subsystem Architecture | Modules | Total Lines | Footprint | Share & Distribution Bar | Lead Module |
| :--- | :---: | :---: | :---: | :--- | :--- |
${subsystemTableRows}
| **TOTAL CODEBASE** | **${totalFiles}** | **${totalLines.toLocaleString()}** | **${totalKB} KB** | **100.0%** \`████████████████████\` | **All 6 Subsystems** |

---

## IV. FLAGSHIP ALGORITHMIC & ENGINEERING CAPABILITIES
1. **General Relativistic Kerr Raymarching & Shader Pre-Warming (\`BlackHoleScene.ts\`, \`kerrRaymarch.glsl.ts\`)**
   - Integrates null photon geodesics in curved Boyer-Lindquist spacetime with frame-dragging ($\\omega = -g_{t\\phi}/g_{\\phi\\phi}$), gravitational redshift, relativistic Doppler beaming, and anamorphic lens flare. Includes an offscreen WebGL Shader Pre-Warming Cache and passive-cooling RC thermal throttling state machine.
2. **Analytical Kerr Metric Tensor & RK4 Trajectory Solver (\`gravitationalPhysics.ts\`)**
   - Computes exact horizon radii $r_\\pm = M \\pm \\sqrt{M^2 - a^2}$, static limit ergosphere boundaries, prograde/retrograde ISCO and photon sphere orbits, Kretschmann curvature invariants, and CSV-exportable RK4 geodesic trajectories.
3. **Multi-Factor Canonical Lyrics Finder & Version Retry Engine (\`songLyrics.ts\`, \`server.ts\`, \`trapQueenPlayer.ts\`)**
   - Resolves pseudonymous Nightcore/Sped-Up uploaders and viral TikTok subtitles to canonical recording artists across all 274 tracks. Scores LRCLIB transcripts via Title Token Jaccard similarity, Canonical Artist verification, LRC timestamp structural density, and Dual-Mode Tempo-Ratio scaling, paired with one-click Wrong Version Retry (\`next_best\`, \`original_studio\`, \`sped_up\`, \`slowed\`).
4. **Howard Gardner 9-Intelligence Psychometric Suite & D3.js Growth Analytics (\`IQTestModule.tsx\`, \`GrowthAnalyticsDashboard.tsx\`)**
   - Features an 85-question stratified master bank across all 9 Multiple Intelligences + 24 procedural 3×3 visual matrices, normal CDF percentile scoring, per-question latency curves, and D3.js longitudinal trajectory charts.
5. **12-Ray Starburst Watermark Studio (\`WatermarkStudioModal.tsx\`)**
   - Side-by-side high-resolution still emblem and 60FPS animated singularity canvas with 5 color palettes, 3 motion dynamics presets, live speed/glow/scale sliders, and 2400×900 PNG, 60FPS WebM video, and scalable SVG exports.

---

## V. RECENT ENGINEERING CHANGELOG & LIVE BUILD SYNC
${recentChangelogRows}

---

## VI. COMPLETE RANKED MODULE INVENTORY (${totalFiles} TRACKED FILES)
| Rank | File Path | Subsystem | Lines | Size | Share | Architectural Role | Primary Tech Tags |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
${rankedInventoryRows}

---

## VII. PER-SUBSYSTEM DETAILED MODULE MANIFEST & IMPLEMENTATION NOTES
${subsystemDetailedManifest}
`;
  }, [liveFiles, subsystemLineTotals, totalChars, totalFiles, totalLines]);

  const handleCopySummary = () => {
    onHapticSuccess?.();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(comprehensiveSummaryMarkdown);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2600);
    }
  };

  const handleDownloadSummaryMarkdown = () => {
    onHapticSuccess?.();
    const blob = new Blob([comprehensiveSummaryMarkdown], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `kerr-engine-v1.4-executive-codebase-summary-${Date.now()}.md`;
    link.href = url;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 6000);
  };

  const handleExportJson = () => {
    onHapticSuccess?.();
    const payload = {
      project: 'Kerr Relativity Engine',
      version: '1.4 Apex Metric Core',
      totalLines,
      totalChars,
      totalFiles,
      generatedAt: new Date().toISOString(),
      recentUpdates: RECENT_CODEBASE_UPDATES,
      subsystemBreakdown: subsystemLineTotals,
      executiveSummaryMarkdown: comprehensiveSummaryMarkdown,
      files: liveFiles,
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
              {totalLines.toLocaleString()} lines · {totalChars.toLocaleString()} chars · LIVE SYNC
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Live auto-updating architectural breakdown of all {totalFiles} source files across 6 core subsystems (synced in real time from raw source &amp; disk).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            data-testid="copy-codebase-summary-btn"
            onClick={handleCopySummary}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              hasCopied
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/45 text-amber-200 font-semibold'
            }`}
            title="Copy comprehensive 7-section Executive Architectural & Telemetry Dossier to clipboard"
          >
            {hasCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-200 font-semibold">Copied Executive Dossier!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-300" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="toggle-summary-dossier-preview-btn"
            onClick={() => {
              onHapticLight?.();
              setShowSummaryPreview((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              showSummaryPreview
                ? 'bg-zinc-200 text-black border-white font-semibold'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-750 text-zinc-200 hover:text-white'
            }`}
            title="Preview the full formatted 7-section Executive Summary Dossier inline"
          >
            <FileCode className="w-4 h-4 text-amber-300" />
            <span>{showSummaryPreview ? 'Hide Dossier' : 'Preview Dossier'}</span>
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

      {/* Interactive Executive Summary Dossier Preview Drawer */}
      {showSummaryPreview && (
        <div
          data-testid="executive-summary-dossier-preview"
          className="p-4 rounded-2xl bg-zinc-950/95 border border-amber-500/45 shadow-xl space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                  Executive Codebase &amp; Architectural Telemetry Dossier (7 Sections)
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Includes System Telemetry Snapshot, 6-Layer Tech Matrix, ASCII Distribution Bars, Flagship Algorithms, Changelog, Ranked Inventory of all {totalFiles} files, and Per-Subsystem Module Manifest.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-[11px] font-semibold cursor-pointer"
              >
                {hasCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{hasCopied ? 'Copied!' : 'Copy Full Markdown'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSummaryMarkdown}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] font-semibold cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Download .MD</span>
              </button>
            </div>
          </div>

          <pre className="p-3.5 rounded-xl bg-black/80 border border-zinc-800/90 text-[11px] font-mono text-zinc-200 overflow-x-auto max-h-80 leading-relaxed whitespace-pre">
            <code>{comprehensiveSummaryMarkdown}</code>
          </pre>
        </div>
      )}

      {/* 4 Clean Big Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total Lines</span>
            <Code className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
            {totalLines.toLocaleString()} lines
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 font-mono">
            {totalChars.toLocaleString()} chars total
          </div>
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

      {/* Latest Updates & Live Build Synchronization Log */}
      <div
        data-testid="codebase-recent-updates-card"
        className="p-4 rounded-xl bg-zinc-950/90 border border-amber-500/35 space-y-3"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Latest Code Updates &amp; Live Build Sync</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
            AUTO-UPDATED ON EVERY BUILD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {RECENT_CODEBASE_UPDATES.map((item, uIdx) => (
            <div
              key={uIdx}
              className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/90 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{item.title}</span>
              </div>
              <div className="text-[10.5px] font-mono text-amber-300/90 truncate">
                {item.files}
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">{item.summary}</p>
            </div>
          ))}
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
            const files = liveFiles.filter((f) => f.subsystem === sub.id).sort(
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
