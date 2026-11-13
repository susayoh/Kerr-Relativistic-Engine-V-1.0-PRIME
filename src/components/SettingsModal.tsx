import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Settings,
  Sliders,
  Camera,
  Eye,
  Sparkles,
  RotateCcw,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  Compass,
  Smartphone,
  Check,
  Vibrate,
  Download,
  Atom,
  Music,
  Play,
  Pause,
  Volume2,
  Video,
  Square,
  Globe,
  Terminal,
  Cpu,
  Zap,
  DollarSign,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Search,
  Clock,
  Radio,
  Brain,
  Layers,
  Palette,
  Activity,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Crosshair,
} from 'lucide-react';
import {
  VisualizerSettings,
  DEFAULT_VISUALIZER_SETTINGS,
  UiThemeId,
} from '../scene/BlackHoleScene';
import {
  AccretionState,
  PhysicsPresetId,
  PHYSICS_PRESETS_CONFIG,
  getActivePhysicsPresetId,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
} from '../physics/gravitationalPhysics';
import { useHaptics } from '../hooks/useHaptics';
import {
  trapQueenPlayer,
  TrapQueenPlayerState,
  SongTrackDefinition,
  SONG_SPEED_PRESETS,
  AUDIO_QUALITY_PRESETS,
  AudioQualityPresetId,
  filterAndValidatePlaybackQueue,
} from '../audio/trapQueenPlayer';
import {
  SyncedLyricLine,
  fetchSyncedLyricsForTrack,
  buildTrackSubtitleFallback,
  getActiveLyricIndex,
  getActiveLineProgress,
} from '../audio/songLyrics';
import { AppLanguage, LANGUAGE_OPTIONS, TRANSLATIONS } from '../i18n/translations';
import {
  KerrEngineTierId,
  KERR_ENGINE_TIERS,
  KerrEngineRunLog,
  generateKerrEngineCalculationRun,
} from './KerrRelativityEngineModal';
const LazyIQTestModule = React.lazy(() =>
  import('./IQTestModule').then((m) => ({ default: m.IQTestModule }))
);
const LazyChessModule = React.lazy(() =>
  import('./ChessModule').then((m) => ({ default: m.ChessModule }))
);
import {
  CodebaseDetailsView,
  FORMAT_CODEBASE_LINES_BADGE,
  TOTAL_CODEBASE_LINES,
  TOTAL_CODEBASE_CHARS,
  computeLiveCodebaseTelemetry,
  syncLiveCodebaseFromServer,
} from './CodebaseDetailsView';
import { DiagnosticSuiteView } from './DiagnosticSuiteView';

const RAW_SETTINGS_SONGS_LIST: SongTrackDefinition[] = [
  {
    id: 'again',
    title: 'Again',
    subtitle: 'Fetty Wap',
    artistName: 'Fetty Wap',
    badge: 'Fetty Wap',
    durationSec: 313,
    durationLabel: '5:13',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/53/9b/95/539b9581-3dd6-7a02-8b25-ebad59ba0949/814908020318.jpg/600x600bb.jpg',
    accentColor: 'fuchsia',
    sources: [
      '/audio/again-full.mp3',
      'https://archive.org/download/fettywapagainaudio/Fetty%20Wap%20-%20Again%20%5B%20Audio%20%5D.mp3',
    ],
    bpm: 148,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
  {
    id: 'moonrock_saltynuggets',
    title: 'Moonrock',
    subtitle: 'XXXTENTACION • SaltyNuggets',
    artistName: 'SaltyNuggets',
    badge: 'XXXTENTACION',
    durationSec: 129,
    durationLabel: '2:09',
    artworkUrl:
      'https://i1.sndcdn.com/artworks-000365422812-92e8l2-t500x500.jpg',
    accentColor: 'emerald',
    sources: ['/audio/moonrock-saltynuggets.mp3'],
    bpm: 144,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
  {
    id: 'clarity_nightcore',
    title: 'Clarity',
    subtitle: 'Nightcore',
    artistName: 'Nightcore • Zedd ft. Foxes',
    badge: 'Nightcore',
    durationSec: 241,
    durationLabel: '4:01',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/05/e2/80/05e28091-d908-655c-c2ef-bbb0fd45e8f8/859730761916_cover.jpg/600x600bb.jpg',
    accentColor: 'emerald',
    sources: ['/audio/clarity-nightcore.mp3'],
    bpm: 160,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Nightcore',
  },
  {
    id: 'end_it_nightcore',
    title: 'End It',
    subtitle: 'Nightcore',
    artistName: 'Nightcore • Sinnon / RIELL',
    badge: 'Nightcore',
    durationSec: 168,
    durationLabel: '2:48',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/146c8de07fdcd33369bc3267195df94d/500x500-000000-80-0-0.jpg',
    accentColor: 'fuchsia',
    sources: ['/audio/end-it-nightcore.mp3'],
    bpm: 165,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Nightcore',
  },
  {
    id: 'no_friends_female',
    title: 'No Friends',
    subtitle: 'Female Version',
    artistName: 'Female Version • The Nostal Days, Flávia Delfín',
    badge: 'Female Version',
    durationSec: 257,
    durationLabel: '4:17',
    artworkUrl:
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d0000b273a22b129b802c989735bb0374',
    accentColor: 'cyan',
    sources: ['/audio/no-friends-female.mp3'],
    bpm: 142,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'duvet_x_linger',
    title: 'Duvet x Linger',
    subtitle: 'Bôa × The Cranberries',
    artistName: 'Bôa × The Cranberries',
    badge: 'Mashup',
    durationSec: 206,
    durationLabel: '3:26',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/fc0d073cdce93824ed0038a6f0ec7ed6/500x500-000000-80-0-0.jpg',
    accentColor: 'amber',
    sources: [
      '/audio/duvet-x-linger.mp3',
      'https://archive.org/download/boa-duvet-official-video-uoox-9fpm-dp-0/B%C3%B4a%20-%20%20Duvet%20%28Official%20Video%29%20%5BUoox9fpmDP0%5D.mp3',
    ],
    bpm: 124,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'stronger_than_you_frisk',
    title: 'Stronger Than You',
    subtitle: 'Frisk version',
    artistName: 'Frisk version • XanduIsBored, Mom0ki',
    badge: 'Frisk version',
    durationSec: 207,
    durationLabel: '3:27',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/4c059a18bb7fd25748f77a8eaecb0948/500x500-000000-80-0-0.jpg',
    accentColor: 'emerald',
    sources: ['/audio/stronger-than-you-frisk.mp3'],
    bpm: 148,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'world_execute_me',
    title: 'world.execute(me);',
    subtitle: 'Mili',
    artistName: 'Mili',
    badge: 'Mili',
    durationSec: 212,
    durationLabel: '3:32',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/1285d6765ae590bd717b886bb8b8dbd8/500x500-000000-80-0-0.jpg',
    accentColor: 'fuchsia',
    sources: [
      '/audio/world-execute-me.mp3',
      'https://archive.org/download/mili-world.executeme/Mili%20-%20world.execute%28me%29%3B.mp3',
    ],
    bpm: 130,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'mazeltron',
    title: 'MazelTron',
    subtitle: 'BLP Kosher & BabyTron',
    artistName: 'BLP Kosher & BabyTron',
    badge: 'MazelTron',
    durationSec: 208,
    durationLabel: '3:28',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/ee3a4f14c8ecb9ac80b0aec21b884e89/500x500-000000-80-0-0.jpg',
    accentColor: 'cyan',
    sources: ['/audio/mazeltron.mp3'],
    bpm: 166,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
  {
    id: 'trap_queen',
    title: 'Trap Queen',
    subtitle: 'Fetty Wap',
    artistName: 'Fetty Wap',
    badge: 'Fetty Wap',
    durationSec: 222,
    durationLabel: '3:42',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/b3/df/c5/b3dfc5e2-3980-7b7c-f227-7022c846f5dd/814908020219.jpg/600x600bb.jpg',
    accentColor: 'amber',
    sources: [
      '/audio/trap-queen-full.mp3',
      'https://archive.org/download/TrapQueen/Trap%20Queen.mp3',
      'https://archive.org/download/fetty-wap-trap-queen-official-video-prod-by-tony-fadd/Fetty%20Wap%20%20%20Trap%20Queen%20Official%20Video%20Prod%20By%20Tony%20Fadd.mp3',
    ],
    bpm: 148,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
];

export const SETTINGS_SONGS_LIST: SongTrackDefinition[] =
  filterAndValidatePlaybackQueue(RAW_SETTINGS_SONGS_LIST).acceptedTracks;

function getHighResSongArtworkUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/\/100x100bb\./g, '/600x600bb.')
    .replace(/\/500x500-000000-80-0-0\.jpg/g, '/1000x1000-000000-80-0-0.jpg')
    .replace(/-large\.(jpg|png)/g, '-t500x500.$1');
}

export interface UiThemeOption {
  id: UiThemeId;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
  swatches: [string, string, string, string];
  activeCardClass: string;
  badgeClass: string;
}

export const UI_THEME_OPTIONS: UiThemeOption[] = [
  {
    id: 'observatory_gold',
    name: 'Schwarzschild Monolith',
    subtitle: 'Pure Carbon Black & Academic Ivory',
    badge: 'DEFAULT · MONOLITH',
    description:
      'High-contrast academic publication & monochrome instrumentation aesthetic pairing pure carbon black (#050506) panels with chalk-ivory (#FAFAFA) typography and classical gold (#D4AF37) metric rules.',
    swatches: ['#050506', '#121215', '#FAFAFA', '#D4AF37'],
    activeCardClass:
      'bg-[#0E0E11] border-zinc-300 text-zinc-100 shadow-[0_0_20px_rgba(244,244,245,0.14)] ring-1 ring-zinc-300/40',
    badgeClass: 'bg-zinc-900 text-zinc-100 border-zinc-400/50',
  },
  {
    id: 'kerr_claude',
    name: 'Kerr Metric Obsidian',
    subtitle: 'Warm Obsidian & Terracotta Ivory',
    badge: 'KERR v1.4 · OBSIDIAN',
    description:
      'Signature Kerr Engine [v1.4] academic research terminal pairing warm terracotta (#D97757) and parchment ivory (#F7F4EE) over deep obsidian-black surfaces.',
    swatches: ['#0B0908', '#1C1613', '#D97757', '#F7F4EE'],
    activeCardClass:
      'bg-[#16110E] border-[#D97757] text-[#F7F4EE] shadow-[0_0_20px_rgba(217,119,87,0.2)] ring-1 ring-[#D97757]/50',
    badgeClass: 'bg-[#1F1815] text-[#F4A688] border-[#D97757]/75',
  },
  {
    id: 'cryo_quantum',
    name: 'Planck Laboratory',
    subtitle: 'Pure Obsidian Black & Phosphor Sage',
    badge: 'TELEMETRY LAB',
    description:
      'Precision university laboratory & oscilloscope aesthetic featuring pure obsidian black (#040605) surfaces, calibrated phosphor-emerald (#34D399) readouts, and warm brass (#EAB308) instrumentation.',
    swatches: ['#040605', '#0B120E', '#34D399', '#EAB308'],
    activeCardClass:
      'bg-[#09110D] border-emerald-400/80 text-emerald-50 shadow-[0_0_20px_rgba(52,211,153,0.18)] ring-1 ring-emerald-400/40',
    badgeClass: 'bg-emerald-950/70 text-emerald-200 border-emerald-400/50',
  },
];

interface SpacetimeCurvatureStressScenario {
  id: string;
  code: string;
  title: string;
  regimeBadge: string;
  presetId: string;
  description: string;
  curvatureCriteria: string;
  params: Partial<BlackHoleParams>;
}

export const SPACETIME_CURVATURE_STRESS_TESTS: SpacetimeCurvatureStressScenario[] = [
  {
    id: 'stress-schwarzschild-static',
    code: 'STRESS-01',
    title: 'Schwarzschild Static Limit',
    regimeBadge: 'a* = 0.000 · Plunge 1.0×',
    presetId: 'm87',
    description:
      'Spherically symmetric non-rotating baseline manifold verifying zero Lense-Thirring frame-dragging (ω = 0) and canonical ISCO at 6.0 R_g (3.0 R_s).',
    curvatureCriteria: 'r₊ = 2.000 R_g · r_ISCO = 6.000 R_g · g_tφ = 0.0000',
    params: {
      spin: 0.0,
      wellDepthMultiplier: 1.0,
      probeRadiusRs: 4.2,
      inclinationDeg: 60,
      accretionRate: 0.75,
      accretionState: 'quiescent',
    },
  },
  {
    id: 'stress-kerr-frame-drag',
    code: 'STRESS-02',
    title: 'Lense-Thirring Frame-Dragging Shear',
    regimeBadge: 'a* = 0.750 · Plunge 2.2×',
    presetId: 'sgra',
    description:
      'Moderate-spin Boyer-Lindquist manifold stress-testing off-diagonal gravitomagnetic tensor coupling (g_tφ < 0) and Flamm paraboloid embedding curvature.',
    curvatureCriteria: 'r₊ = 1.661 R_g · r_ISCO = 3.158 R_g · g_tφ < 0',
    params: {
      spin: 0.75,
      wellDepthMultiplier: 2.2,
      probeRadiusRs: 2.8,
      inclinationDeg: 78,
      accretionRate: 1.25,
      accretionState: 'quiescent',
    },
  },
  {
    id: 'stress-thorne-extremal',
    code: 'STRESS-03',
    title: 'Near-Extremal Thorne Spin Boundary',
    regimeBadge: 'a* = 0.998 · Plunge 3.5×',
    presetId: 'cygnus_x1',
    description:
      'Maximal astrophysical spin limit (a* = 0.998) where inner and outer Killing horizons nearly coalesce and prograde ISCO plunges inside the ergosphere.',
    curvatureCriteria: 'r₊ = 1.063 R_g · r_ISCO = 1.237 R_g · Ω_H → 0.470 c/R_g',
    params: {
      spin: 0.998,
      wellDepthMultiplier: 3.5,
      probeRadiusRs: 1.65,
      inclinationDeg: 84,
      accretionRate: 2.25,
      accretionState: 'active',
    },
  },
  {
    id: 'stress-ergosphere-static-limit',
    code: 'STRESS-04',
    title: 'Ergosphere Static-Limit Plunge',
    regimeBadge: 'a* = 0.960 · Probe 0.88 R_s',
    presetId: 'ton618',
    description:
      'Deep-well probe injected inside the static limit surface (r_probe < r_ergo) where g_tt ≥ 0 forces mandatory prograde spacetime corotation.',
    curvatureCriteria: 'g_tt ≥ 0 (Inside Ergosphere) · Plunge 4.0× R_s · α → 0.31',
    params: {
      spin: 0.96,
      wellDepthMultiplier: 4.0,
      probeRadiusRs: 0.88,
      inclinationDeg: 86,
      accretionRate: 1.95,
      accretionState: 'active',
    },
  },
  {
    id: 'stress-kretschmann-tidal-peak',
    code: 'STRESS-05',
    title: 'Extreme Weyl & Kretschmann Tidal Spike',
    regimeBadge: 'a* = 0.990 · Probe 0.68 R_s',
    presetId: 'gw150914',
    description:
      'Horizon-grazing geodesic stress test verifying numerical stability of radial metric divergence g_rr = Σ/Δ and Kretschmann scalar K = R^{αβγδ}R_{αβγδ}.',
    curvatureCriteria: 'K > 1.20 M⁻⁴ · g_rr > 12.0 · Zero-NaN Tensor Convergence',
    params: {
      spin: 0.99,
      wellDepthMultiplier: 3.8,
      probeRadiusRs: 0.68,
      inclinationDeg: 88,
      accretionRate: 2.45,
      accretionState: 'active',
    },
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisualizerSettings;
  onUpdateSettings: (updater: (prev: VisualizerSettings) => VisualizerSettings) => void;
  accretionState?: AccretionState;
  onChangeAccretionState?: (state: AccretionState) => void;
  onResetPhysics?: () => void;
  currentSpin?: number;
  onSelectPhysicsPreset?: (presetId: PhysicsPresetId) => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecording?: () => void;
  kerrEngineLogs?: KerrEngineRunLog[];
  onOpenKerrLogModal?: () => void;
  onTriggerKerrCalculation?: (tierOverride?: KerrEngineTierId) => void;
  onExportGeodesicCsv?: () => void;
  onExportEventLogJson?: () => void;
  eventLogCount?: number;
  activeParams?: BlackHoleParams;
  onRecordDiagnosticStressTest?: (
    run: KerrEngineRunLog,
    applyParamsToScene?: Partial<BlackHoleParams>
  ) => void;
  isDevMode?: boolean;
  onLockDevSession?: () => void;
  codebaseLinesLabel?: string;
  codebaseTotalLines?: number;
  codebaseTotalChars?: number;
  codebaseRefreshToken?: number;
}

interface CustomScrollWorkspaceProps {
  children: React.ReactNode;
  className?: string;
  accentMode?: 'spotify' | 'kerr_claude' | 'cryo_quantum' | 'observatory_gold';
  activeItemSelector?: string;
  activeItemLabel?: string;
  testId?: string;
}

const CustomScrollWorkspace: React.FC<CustomScrollWorkspaceProps> = ({
  children,
  className = '',
  accentMode = 'observatory_gold',
  activeItemSelector,
  activeItemLabel = 'Jump to Active',
  testId = 'custom-scroll-workspace',
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const dragStartScrollTopRef = useRef<number>(0);

  const [scrollMetrics, setScrollMetrics] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
    thumbHeightPct: 100,
    thumbTopPct: 0,
    scrollPct: 0,
    canScroll: false,
  });

  const recalcScrollMetrics = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const canScroll = maxScroll > 6;
    const rawThumbPct = scrollHeight > 0 ? (clientHeight / scrollHeight) * 100 : 100;
    const thumbHeightPct = canScroll ? Math.min(85, Math.max(10, rawThumbPct)) : 100;
    const scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;
    const thumbTopPct = canScroll ? scrollProgress * (100 - thumbHeightPct) : 0;

    setScrollMetrics({
      scrollTop,
      scrollHeight,
      clientHeight,
      thumbHeightPct,
      thumbTopPct,
      scrollPct: Math.round(scrollProgress * 100),
      canScroll,
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    recalcScrollMetrics();

    const handleScroll = () => recalcScrollMetrics();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => recalcScrollMetrics());
      resizeObserver.observe(el);
      if (el.firstElementChild) {
        resizeObserver.observe(el.firstElementChild);
      }
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [recalcScrollMetrics, children]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const el = viewportRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const trackRect = track.getBoundingClientRect();
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (trackRect.height <= 0 || maxScroll <= 0) return;

      const deltaY = e.clientY - dragStartYRef.current;
      const usableTrackPx = Math.max(1, trackRect.height * (1 - scrollMetrics.thumbHeightPct / 100));
      const scrollDelta = (deltaY / usableTrackPx) * maxScroll;
      el.scrollTop = Math.min(maxScroll, Math.max(0, dragStartScrollTopRef.current + scrollDelta));
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [scrollMetrics.thumbHeightPct]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const clickRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / Math.max(1, rect.height)));
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTo({
      top: clickRatio * maxScroll,
      behavior: 'smooth',
    });
  };

  const scrollToTop = () => {
    viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const scrollToActiveItem = () => {
    const el = viewportRef.current;
    if (!el || !activeItemSelector) return;
    const target = el.querySelector<HTMLElement>(activeItemSelector);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const thumbColorClass =
    accentMode === 'spotify'
      ? 'bg-gradient-to-b from-[#1DB954] to-emerald-500 shadow-[0_0_10px_rgba(29,185,84,0.55)]'
      : accentMode === 'kerr_claude'
      ? 'bg-gradient-to-b from-[#E08263] to-[#D97757] shadow-[0_0_10px_rgba(217,119,87,0.5)]'
      : accentMode === 'cryo_quantum'
      ? 'bg-gradient-to-b from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
      : 'bg-gradient-to-b from-zinc-200 to-zinc-400 shadow-[0_0_10px_rgba(255,255,255,0.3)]';

  const badgeAccentClass =
    accentMode === 'spotify'
      ? 'text-[#1DB954] border-[#1DB954]/40 bg-[#1DB954]/10'
      : accentMode === 'kerr_claude'
      ? 'text-[#F4A688] border-[#D97757]/40 bg-[#D97757]/10'
      : accentMode === 'cryo_quantum'
      ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
      : 'text-zinc-200 border-zinc-600/60 bg-zinc-800/80';

  return (
    <div className="relative flex-1 min-h-0 min-w-0 max-w-full flex overflow-hidden">
      {/* Native Scrollbar Suppressed Content Viewport */}
      <div
        ref={viewportRef}
        data-testid={testId}
        className={`flex-1 min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden overscroll-x-none touch-pan-y no-scrollbar ${className}`}
      >
        {children}
      </div>

      {/* Custom Interactive Vertical Telemetry Scroll Rail */}
      {scrollMetrics.canScroll && (
        <div
          data-testid={`${testId}-rail`}
          className="w-7 sm:w-8 shrink-0 flex flex-col items-center justify-between py-2 px-1 bg-black/55 border-l border-zinc-800/80 select-none z-20"
          aria-label="Custom Scroll Navigation Rail"
        >
          {/* Top Quick-Jump Button */}
          <button
            type="button"
            onClick={scrollToTop}
            title="Scroll to Top"
            aria-label="Scroll to Top"
            className="w-5 h-5 rounded flex items-center justify-center bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ChevronUp className="w-3 h-3" />
          </button>

          {/* Optional Active Item Quick-Jump Button */}
          {activeItemSelector && (
            <button
              type="button"
              onClick={scrollToActiveItem}
              title={activeItemLabel}
              aria-label={activeItemLabel}
              className={`mt-1 w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${badgeAccentClass}`}
            >
              <Crosshair className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Interactive Scrubber Track + Tick Marks + Draggable Thumb */}
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="relative flex-1 w-2 my-2 rounded-full bg-zinc-900/95 border border-zinc-800/90 cursor-pointer overflow-hidden"
          >
            {/* Subtle Telemetry Ruler Ticks */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-35">
              {Array.from({ length: 9 }).map((_, idx) => (
                <span key={idx} className="w-full h-px bg-zinc-600" />
              ))}
            </div>

            {/* Draggable Scroll Thumb */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                isDraggingRef.current = true;
                dragStartYRef.current = e.clientY;
                dragStartScrollTopRef.current = viewportRef.current?.scrollTop || 0;
              }}
              style={{
                height: `${scrollMetrics.thumbHeightPct}%`,
                top: `${scrollMetrics.thumbTopPct}%`,
              }}
              className={`absolute left-0 right-0 rounded-full transition-[background-color] cursor-grab active:cursor-grabbing ${thumbColorClass}`}
            />
          </div>

          {/* Live Scroll Percentage Readout */}
          <span className="font-mono text-[8px] tabular-nums text-zinc-400 leading-none mb-1">
            {scrollMetrics.scrollPct}%
          </span>

          {/* Bottom Quick-Jump Button */}
          <button
            type="button"
            onClick={scrollToBottom}
            title="Scroll to Bottom"
            aria-label="Scroll to Bottom"
            className="w-5 h-5 rounded flex items-center justify-center bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

const LiveSpectrumVisualizer: React.FC<{
  isPlaying: boolean;
  playbackRate: number;
  trackId: string;
}> = React.memo(({ isPlaying, playbackRate, trackId }) => {
  const [bands, setBands] = useState<number[]>(() =>
    trapQueenPlayer.getSpectrumBands(16)
  );

  useEffect(() => {
    setBands(trapQueenPlayer.getSpectrumBands(16));
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setBands(trapQueenPlayer.getSpectrumBands(16));
    }, 60);
    return () => window.clearInterval(interval);
  }, [isPlaying, playbackRate, trackId]);

  return (
    <div
      data-testid="songs-live-spectrum"
      className="flex items-end gap-1 h-6 shrink-0 self-start sm:self-end"
      aria-label="Real-Time Audio Frequency Spectrum"
    >
      {bands.map((val, idx) => (
        <span
          key={idx}
          className={`w-1 rounded-t transition-all duration-75 ${
            isPlaying
              ? idx % 4 === 0
                ? 'bg-[#1DB954]'
                : 'bg-zinc-400'
              : idx % 2 === 0
              ? 'bg-[#1DB954]/80'
              : 'bg-zinc-600'
          }`}
          style={{ height: `${Math.max(12, Math.round(val * 100))}%` }}
        />
      ))}
    </div>
  );
});

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  accretionState = 'quiescent',
  onChangeAccretionState,
  onResetPhysics,
  currentSpin,
  onSelectPhysicsPreset,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecording,
  kerrEngineLogs = [],
  onOpenKerrLogModal,
  onTriggerKerrCalculation,
  onExportGeodesicCsv,
  onExportEventLogJson,
  eventLogCount,
  activeParams,
  onRecordDiagnosticStressTest,
  isDevMode = false,
  onLockDevSession,
  codebaseLinesLabel,
  codebaseTotalLines,
  codebaseTotalChars,
  codebaseRefreshToken = 0,
}) => {
  const haptics = useHaptics({
    enabled: settings.hapticsEnabled !== false,
    intensity: settings.hapticsIntensity ?? 1.0,
  });
  const [activeTab, setActiveTab] = useState<
    'settings' | 'songs' | 'iq_test' | 'chess' | 'diagnostic' | 'code'
  >('settings');

  const [secretPasswordInput, setSecretPasswordInput] = useState<string>('');
  const [secretAuthError, setSecretAuthError] = useState<boolean>(false);
  const [isInlineKerrLogOpen, setIsInlineKerrLogOpen] = useState<boolean>(false);
  const [selectedInlineLogIdx, setSelectedInlineLogIdx] = useState<number>(0);
  const [playerState, setPlayerState] = useState<TrapQueenPlayerState>(() =>
    trapQueenPlayer.getState()
  );
  const [songCategoryFilter, setSongCategoryFilter] = useState<
    'all' | 'Melancholy' | 'Hip-Hop / Trap' | 'Nightcore' | 'Electronic / Alt'
  >('all');
  const [songSearchQuery, setSongSearchQuery] = useState<string>('');
  const [isShuffleEnabled, setIsShuffleEnabled] = useState<boolean>(false);
  const [showSongsAudioFx, setShowSongsAudioFx] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [lyricSyncMode, setLyricSyncMode] = useState<boolean>(true);
  const [showFullLyricsCard, setShowFullLyricsCard] = useState<boolean>(false);
  const [lyricsCinemaMode, setLyricsCinemaMode] = useState<boolean>(false);
  const [lyricsAutoFollow, setLyricsAutoFollow] = useState<boolean>(true);
  const [lyricSyncOffsetSec, setLyricSyncOffsetSec] = useState<number>(0);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState<boolean>(false);
  const [activeLyrics, setActiveLyrics] = useState<SyncedLyricLine[]>(() =>
    buildTrackSubtitleFallback(SETTINGS_SONGS_LIST[0])
  );
  const lyricsScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasVisitedIqTest, setHasVisitedIqTest] = useState<boolean>(false);
  const [expandedArtworkTrack, setExpandedArtworkTrack] = useState<SongTrackDefinition | null>(
    null
  );
  const [diagnosticSuiteNonce, setDiagnosticSuiteNonce] = useState<number>(0);
  const [diagnosticRunningIdx, setDiagnosticRunningIdx] = useState<number | null>(null);
  const [diagnosticCompletedRuns, setDiagnosticCompletedRuns] = useState<
    Record<string, KerrEngineRunLog>
  >({});
  const [selectedDiagnosticLogId, setSelectedDiagnosticLogId] = useState<string | null>(null);
  const [syncSceneOnDiagnosticRun, setSyncSceneOnDiagnosticRun] = useState<boolean>(false);
  const [songsCatalog, setSongsCatalog] = useState<SongTrackDefinition[]>(SETTINGS_SONGS_LIST);
  const [isImportedTracksLoaded, setIsImportedTracksLoaded] = useState<boolean>(false);
  const [isLoadingImportedTracks, setIsLoadingImportedTracks] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'iq_test') {
      setHasVisitedIqTest(true);
    }
  }, [activeTab]);

  useEffect(() => {
    setLyricSyncOffsetSec(0);
  }, [playerState.trackId]);

  useEffect(() => {
    const currentTrack =
      songsCatalog.find((tr) => tr.id === playerState.trackId) || songsCatalog[0];
    if (!currentTrack) return;
    let cancelled = false;
    const isSpeedModified = /sped\s*up|speed\s*up|nightcore|slowed/i.test(
      `${currentTrack.title} ${currentTrack.artistName}`
    );
    const decodedDur =
      isSpeedModified && playerState.duration && playerState.duration >= 65
        ? Math.round(playerState.duration)
        : undefined;
    setActiveLyrics(buildTrackSubtitleFallback(currentTrack));
    fetchSyncedLyricsForTrack(currentTrack, decodedDur)
      .then((lines) => {
        if (!cancelled && lines.length > 0) {
          setActiveLyrics(lines);
        }
      })
      .catch(() => {
        // Fallback already set
      });
    return () => {
      cancelled = true;
    };
  }, [
    playerState.trackId,
    playerState.isPlaying ? Math.round((playerState.duration || 0) / 10) : 0,
    songsCatalog,
  ]);

  const activeLyricIndex = lyricSyncMode
    ? getActiveLyricIndex(activeLyrics, playerState.currentTime, lyricSyncOffsetSec)
    : 0;
  const activeLineProgress = lyricSyncMode
    ? getActiveLineProgress(
        activeLyrics,
        activeLyricIndex,
        playerState.currentTime,
        lyricSyncOffsetSec
      )
    : 0;

  // Sync live codebase metrics whenever Settings opens or tab switches so the Code tab badge is always up to date
  const [liveCodebaseTick, setLiveCodebaseTick] = useState<number>(0);
  useEffect(() => {
    if (!isOpen) return;
    syncLiveCodebaseFromServer();
    const timer = window.setTimeout(() => setLiveCodebaseTick((n) => n + 1), 350);
    return () => window.clearTimeout(timer);
  }, [isOpen, activeTab, codebaseRefreshToken]);

  const liveModalCodebase = useMemo(() => {
    void liveCodebaseTick;
    void codebaseRefreshToken;
    return computeLiveCodebaseTelemetry();
  }, [liveCodebaseTick, codebaseRefreshToken]);

  useEffect(() => {
    if (!showFullLyricsCard || lyricsCinemaMode || !lyricsAutoFollow || !lyricsScrollContainerRef.current) {
      return;
    }
    const container = lyricsScrollContainerRef.current;
    const activeEl = container.querySelector<HTMLElement>(
      `[data-lyric-idx="${activeLyricIndex}"]`
    );
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const targetTop =
        container.scrollTop +
        (activeRect.top - containerRect.top) -
        container.clientHeight / 2 +
        activeRect.height / 2;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    }
  }, [activeLyricIndex, activeLyrics, showFullLyricsCard, lyricsCinemaMode, lyricsAutoFollow]);

  useEffect(() => {
    if (!isImportedTracksLoaded) {
      trapQueenPlayer.setCatalog(SETTINGS_SONGS_LIST);
    }
    return trapQueenPlayer.subscribe(setPlayerState);
  }, [isImportedTracksLoaded]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'songs' || isImportedTracksLoaded) return;
    let cancelled = false;
    setIsLoadingImportedTracks(true);
    import('../audio/importedTracks')
      .then((mod) => {
        if (cancelled) return;
        const normalizeSongKey = (item: SongTrackDefinition) => {
          const baseTitle = item.title
            .toLowerCase()
            .replace(/\((?:with|feat\.?|ft\.?)[^)]*\)/gi, '')
            .replace(/-\s*from\s+.*$/i, '')
            .replace(/[^\p{L}\p{N}]+/gu, '')
            .trim();
          const versionTag =
            /nightcore/i.test(`${item.title} ${item.artistName}`)
              ? 'nightcore'
              : /sped\s*up|speed\s*up/i.test(item.title)
                ? 'spedup'
                : /slowed/i.test(item.title)
                  ? 'slowed'
                  : /female\s*version/i.test(`${item.title} ${item.artistName}`)
                    ? 'female'
                    : /frisk\s*version/i.test(`${item.title} ${item.artistName}`)
                      ? 'frisk'
                      : 'std';
          return `${baseTitle}_${versionTag}`;
        };
        const seenKeys = new Set<string>();
        const uniqueCandidates: SongTrackDefinition[] = [];
        for (const item of [...RAW_SETTINGS_SONGS_LIST, ...mod.IMPORTED_PLAYLIST_TRACKS]) {
          const key = normalizeSongKey(item) || item.id;
          if (!seenKeys.has(key) && !seenKeys.has(item.id)) {
            seenKeys.add(key);
            seenKeys.add(item.id);
            uniqueCandidates.push(item);
          }
        }
        const merged = filterAndValidatePlaybackQueue(uniqueCandidates).acceptedTracks;
        trapQueenPlayer.setCatalog(merged);
        setSongsCatalog(merged);
        setIsImportedTracksLoaded(true);
      })
      .catch((err) => {
        console.warn('Failed to dynamically load extended audio catalog:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingImportedTracks(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, isImportedTracksLoaded]);

  // Automatically trigger and log the spacetime curvature stress-test suite when the Diagnostic tab is opened
  useEffect(() => {
    if (!isOpen || activeTab !== 'diagnostic') return;

    let cancelled = false;
    const timers: number[] = [];
    const tierToUse: KerrEngineTierId = settings.kerrEngineTier || 'ultra';
    const baseParams: BlackHoleParams = activeParams || {
      objectCategory: 'black_hole',
      systemCategory: 'isolated',
      backgroundTheme: 'galactic_core',
      presetId: 'ton618',
      trueMassSolar: 66000000000,
      massSolar: 100,
      spin: 0.98,
      accretionRate: 1.95,
      inclinationDeg: 78,
      dopplerStrength: 0.65,
      probeRadiusRs: 3.6,
      explodedSeparation: 0.0,
      timeScale: 1.0,
      wellDepthMultiplier: 2.2,
      gravitationalLensing: true,
      trueCosmicScale: false,
      spectralMode: 'blackbody',
      accretionState: 'quiescent',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
        pulsarBeams: true,
        magneticField: true,
        anatomyLines: false,
        microlensingStar: false,
      },
    };

    setDiagnosticCompletedRuns({});
    setDiagnosticRunningIdx(0);

    SPACETIME_CURVATURE_STRESS_TESTS.forEach((scenario, idx) => {
      const timerId = window.setTimeout(() => {
        if (cancelled) return;
        setDiagnosticRunningIdx(idx);

        const targetPreset =
          ASTROPHYSICAL_PRESETS.find((p) => p.id === scenario.presetId) ||
          ASTROPHYSICAL_PRESETS[0];

        const testParams: BlackHoleParams = {
          ...baseParams,
          ...targetPreset.params,
          ...scenario.params,
          presetId: targetPreset.id,
          trueMassSolar: targetPreset.trueMassSolar,
          objectCategory: targetPreset.category,
        };

        const runLog = generateKerrEngineCalculationRun(targetPreset, testParams, tierToUse, {
          diagnosticScenarioTitle: `[${scenario.code}] ${scenario.title}`,
          diagnosticScenarioCode: `${scenario.code} · ${scenario.regimeBadge}`,
        });

        setDiagnosticCompletedRuns((prev) => ({
          ...prev,
          [scenario.id]: runLog,
        }));
        setSelectedDiagnosticLogId((prev) => prev || scenario.id);

        onRecordDiagnosticStressTest?.(
          runLog,
          syncSceneOnDiagnosticRun ? scenario.params : undefined
        );

        if (idx === SPACETIME_CURVATURE_STRESS_TESTS.length - 1) {
          const doneTimer = window.setTimeout(() => {
            if (!cancelled) {
              setDiagnosticRunningIdx(null);
            }
          }, 90);
          timers.push(doneTimer);
        }
      }, idx * 110);

      timers.push(timerId);
    });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, diagnosticSuiteNonce]);

  const currentLang: AppLanguage = settings.language || 'en';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const activePhysicsPresetId =
    typeof currentSpin === 'number' ? getActivePhysicsPresetId(currentSpin) : null;

  if (!isOpen) return null;

  const handleVerifySecretPassword = (candidate?: string) => {
    const code = (candidate ?? secretPasswordInput).trim();
    if (code === '1987') {
      haptics.success();
      setSecretAuthError(false);
      setSecretPasswordInput('');
      onUpdateSettings((prev) => ({
        ...prev,
        secret1987Unlocked: true,
        secret1987Mode: true,
      }));
    } else {
      haptics.heavy();
      setSecretAuthError(true);
    }
  };

  const toggleSetting = (key: keyof VisualizerSettings) => {
    haptics.light();
    onUpdateSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setNumericSetting = (key: keyof VisualizerSettings, val: number) => {
    haptics.sliderTick();
    onUpdateSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleTogglePhoneMode = () => {
    haptics.medium();
    onUpdateSettings((prev) => {
      const nextPhoneMode = !prev.phoneMode;
      if (nextPhoneMode) {
        // Apply optimized mobile layout preset:
        // compact view, wider FOV for vertical smartphone screens, hide cluttering desktop radar/left HUD/event log,
        // disable heavy motion blur for smooth 60fps mobile GPU rendering
        return {
          ...prev,
          phoneMode: true,
          showLeftHud: false,
          showOverheadMap: false,
          showCursorTelemetry: false,
          showEventLog: false,
          showMetricTelemetry: false,
          cameraFov: 56,
          motionBlurEnabled: false,
        };
      } else {
        // Restore desktop layout preset (keep diagnostic overlays closed by default)
        return {
          ...prev,
          phoneMode: false,
          showLeftHud: true,
          showOverheadMap: true,
          showCursorTelemetry: true,
          showEventLog: false,
          cameraFov: 46,
        };
      }
    });
  };

  const activeTrackDef =
    songsCatalog.find((tr) => tr.id === playerState.trackId) || songsCatalog[0];

  const activeUiThemeId: UiThemeId = settings.uiTheme || 'observatory_gold';
  const activeUiThemeOption =
    UI_THEME_OPTIONS.find((th) => th.id === activeUiThemeId) || UI_THEME_OPTIONS[0];

  const modalShellThemeClass =
    activeUiThemeId === 'kerr_claude'
      ? 'bg-[#0b0908] border-[#3a2e28] shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(217,119,87,0.12)]'
      : activeUiThemeId === 'cryo_quantum'
      ? 'bg-[#040605] border-emerald-500/35 shadow-[0_24px_60px_rgba(0,0,0,0.92),0_0_30px_rgba(16,185,129,0.1)]'
      : 'bg-[#050506] border-zinc-700/70 shadow-[0_24px_60px_rgba(0,0,0,0.94)]';

  const modalHeaderThemeClass =
    activeUiThemeId === 'kerr_claude'
      ? 'border-[#2e241f] bg-[#120e0c]'
      : activeUiThemeId === 'cryo_quantum'
      ? 'border-emerald-900/50 bg-[#070b09]'
      : 'border-zinc-800/90 bg-[#09090b]';

  const modalHeaderIconClass =
    activeUiThemeId === 'kerr_claude'
      ? 'bg-[#241C18] border-[#D97757]/60 text-[#F4A688]'
      : activeUiThemeId === 'cryo_quantum'
      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
      : 'bg-zinc-800 border-zinc-500/50 text-zinc-100';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-3 bg-black/80 pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        data-ui-theme={activeUiThemeId}
        className={`relative w-full max-w-3xl lg:max-w-4xl border rounded-2xl overflow-hidden flex flex-col max-h-[94vh] transition-colors ${modalShellThemeClass}`}
      >
        {/* Compact Single-Line Modal Header */}
        <div
          className={`flex items-center justify-between px-3.5 sm:px-5 py-2 border-b shrink-0 ${modalHeaderThemeClass}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${modalHeaderIconClass}`}
            >
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-[#F7F4EE] truncate">
                {t.settingsTitle}
              </h2>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border leading-none ${activeUiThemeOption.badgeClass}`}
              >
                {activeUiThemeOption.name}
              </span>
              <span className="hidden md:inline text-[10px] font-mono text-neutral-400 truncate">
                · {t.settingsSubtitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Icon-Free Segmented Tab Navigation Bar */}
        <div
          role="tablist"
          aria-label="Settings Modal Tabs"
          className={`grid grid-cols-3 sm:grid-cols-6 gap-1.5 px-3.5 sm:px-5 py-1.5 border-b font-mono text-[11px] shrink-0 ${modalHeaderThemeClass}`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            data-testid="settings-tab-settings"
            onClick={() => {
              haptics.light();
              setActiveTab('settings');
            }}
            className={`flex items-center justify-center px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-zinc-800 border-zinc-400 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{t.tabSettings}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'songs'}
            data-testid="settings-tab-songs"
            onClick={() => {
              haptics.light();
              setActiveTab('songs');
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'songs'
                ? 'bg-zinc-800 border-zinc-400 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{t.tabSongs}</span>
            {playerState.isPlaying && (
              <span className="hidden sm:inline text-[9px] text-[#1DB954] font-bold">
                • {playerState.playbackRate.toFixed(2).replace(/\.00$/, '.0')}x
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'iq_test'}
            data-testid="settings-tab-iq-test"
            onClick={() => {
              haptics.light();
              setActiveTab('iq_test');
            }}
            className={`flex items-center justify-center px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'iq_test'
                ? 'bg-zinc-800 border-zinc-400 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{t.tabIqTest}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chess'}
            data-testid="settings-tab-chess"
            onClick={() => {
              haptics.light();
              setActiveTab('chess');
            }}
            className={`flex items-center justify-center px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'chess'
                ? 'bg-zinc-800 border-zinc-400 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{t.tabChess}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'diagnostic'}
            data-testid="settings-tab-diagnostic"
            onClick={() => {
              haptics.light();
              setActiveTab('diagnostic');
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'diagnostic'
                ? 'bg-zinc-800 border-zinc-400 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{t.tabDiagnostic}</span>
            {Object.keys(diagnosticCompletedRuns).length > 0 && (
              <span className="hidden sm:inline text-[9px] text-zinc-300 font-bold">
                • {Object.keys(diagnosticCompletedRuns).length}/{SPACETIME_CURVATURE_STRESS_TESTS.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'code'}
            data-testid="settings-tab-code"
            onClick={() => {
              haptics.light();
              setActiveTab('code');
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap min-w-0 overflow-hidden ${
              activeTab === 'code'
                ? 'bg-zinc-800 border-zinc-400 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{t.tabCode}</span>
            <span
              data-testid="settings-tab-code-lines"
              title={`${(liveModalCodebase.totalLines || codebaseTotalLines || TOTAL_CODEBASE_LINES).toLocaleString()} lines · ${(liveModalCodebase.totalChars || codebaseTotalChars || TOTAL_CODEBASE_CHARS).toLocaleString()} characters`}
              className="inline text-[9px] text-amber-300/90 font-mono font-bold truncate"
            >
              • {liveModalCodebase.formattedLinesLabel || codebaseLinesLabel || FORMAT_CODEBASE_LINES_BADGE}
            </span>
          </button>
        </div>

        {/* Scrollable Modal Body with Custom Telemetry Scroll Rail */}
        {activeTab === 'settings' && (
          <CustomScrollWorkspace
            accentMode={activeUiThemeId}
            testId="settings-scroll-workspace"
            className="p-3.5 sm:p-5 space-y-4 text-xs"
          >
          {/* Interface Theme & Color Palette Selector (3 Pure-Black Academic Research Themes) */}
          <div
            data-testid="settings-ui-theme-section"
            className={`rounded-xl p-4 space-y-3 border transition-colors ${
              activeUiThemeId === 'kerr_claude'
                ? 'bg-gradient-to-br from-[#14100d] via-[#0c0a09] to-black border-[#D97757]/50 shadow-[0_0_24px_rgba(217,119,87,0.1)]'
                : activeUiThemeId === 'cryo_quantum'
                ? 'bg-gradient-to-br from-[#07110d] via-[#040605] to-black border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.1)]'
                : 'bg-gradient-to-br from-[#0e0e11] via-[#050506] to-black border-zinc-500/40 shadow-[0_0_24px_rgba(244,244,245,0.08)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold text-[#F7F4EE]">
                <Palette
                  className={`w-3.5 h-3.5 ${
                    activeUiThemeId === 'kerr_claude'
                      ? 'text-[#E08263]'
                      : activeUiThemeId === 'cryo_quantum'
                      ? 'text-emerald-400'
                      : 'text-zinc-200'
                  }`}
                />
                <span>{t.uiThemeSectionTitle}</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activeUiThemeOption.badgeClass}`}
              >
                {activeUiThemeOption.badge}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Select an academic research color architecture. Includes the signature <strong className="text-[#F4A688]">Kerr Metric Obsidian</strong> terracotta &amp; parchment terminal alongside <strong className="text-zinc-200">Schwarzschild Monolith</strong> and <strong className="text-emerald-300">Planck Laboratory</strong> pure-black instrumentation themes.
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5"
              role="radiogroup"
              aria-label="Interface Theme Selector"
            >
              {UI_THEME_OPTIONS.map((themeOpt) => {
                const isSelected = activeUiThemeId === themeOpt.id;
                return (
                  <button
                    key={themeOpt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`ui-theme-${themeOpt.id}`}
                    onClick={() => {
                      haptics.medium();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        uiTheme: themeOpt.id,
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? themeOpt.activeCardClass
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        {/* 4-Color Palette Swatch Chip */}
                        <div className="flex items-center gap-1">
                          {themeOpt.swatches.map((hex, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-white/10 text-white border border-white/20">
                            <Check className="w-2.5 h-2.5" /> ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="font-display font-bold text-xs text-white">
                        {themeOpt.name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-300 mt-0.5">
                        {themeOpt.subtitle}
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-snug mt-1.5">
                        {themeOpt.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-between font-mono text-[9px]">
                      <span className={`px-1.5 py-0.5 rounded border font-bold ${themeOpt.badgeClass}`}>
                        {themeOpt.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language & Localization Selector (English Default, German, Japanese, Spanish, Chinese) */}
          <div className="bg-neutral-950/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.languageSectionTitle}</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-200 border-amber-500/40">
                {LANGUAGE_OPTIONS.find((l) => l.id === currentLang)?.nativeName || 'English'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {t.languageSectionDesc}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
              {LANGUAGE_OPTIONS.map((lang) => {
                const isSelected = currentLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        language: lang.id,
                      }));
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.2)]'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800 text-amber-300">
                        {lang.badge}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-amber-300 shrink-0" />}
                    </div>
                    <div className="font-semibold text-xs mt-1.5 truncate">{lang.nativeName}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{lang.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* High-Performance Mode (WebGL Depth-Peeling & rAF Telemetry Throttle) */}
          <div
            data-testid="high-performance-mode-section"
            className="bg-gradient-to-r from-cyan-950/45 via-neutral-950/90 to-neutral-950/90 border border-cyan-500/35 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-cyan-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>{t.highPerfSectionTitle}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {Boolean(settings.webglDepthPeeling ?? settings.highPerformanceMode) && (
                  <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
                    DEPTH-PEELING ON
                  </span>
                )}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    settings.highPerformanceMode
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {settings.highPerformanceMode ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.enableHighPerfTitle}
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                  Alleviates main-thread UI lag and GPU fill-rate contention during continuous relativistic simulation:
                </p>
                <ul className="text-[11px] text-neutral-400 space-y-1 mt-2 font-mono">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>
                      Enables WebGL Depth-Peeling (front-to-back alpha threshold &amp; depth-buffer occlusion culling on volumetric disk strata)
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>
                      Throttles continuous astrophysical telemetry, pointer raycasts, and metric tensor calculations via requestAnimationFrame
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>
                      Bypasses full-screen optical lens flare overdraw &amp; caps WebAudio proximity modulation cadence
                    </span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                data-testid="high-performance-mode-toggle"
                onClick={() => {
                  haptics.medium();
                  onUpdateSettings((prev) => {
                    const nextHighPerf = !prev.highPerformanceMode;
                    return {
                      ...prev,
                      highPerformanceMode: nextHighPerf,
                      webglDepthPeeling: nextHighPerf,
                      ...(nextHighPerf ? { motionBlurEnabled: false } : {}),
                    };
                  });
                }}
                className={`w-14 h-7.5 rounded-full transition-colors p-1 shrink-0 cursor-pointer border ${
                  settings.highPerformanceMode
                    ? 'bg-cyan-500/40 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.highPerformanceMode)}
                aria-label="Toggle High-Performance Mode"
                title="Toggle High-Performance Mode (WebGL Depth-Peeling & Telemetry Throttle)"
              >
                <div
                  className={`w-5.5 h-5.5 rounded-full transition-transform ${
                    settings.highPerformanceMode
                      ? 'translate-x-6 bg-cyan-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 0: Phone Mode (Mobile Optimization) */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-950/90 to-neutral-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{t.phoneModeSectionTitle}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                settings.phoneMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800'
              }`}>
                {settings.phoneMode ? 'ACTIVE' : 'OFF'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.enablePhoneMode}
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                  Optimizes the interface for smartphones and small touchscreens:
                </p>
                <ul className="text-[11px] text-neutral-400 space-y-1 mt-2 font-mono">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Hides bulky desktop telemetry panels, overhead radar & event log for full viewport visibility</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Increases camera FOV to 56° to frame the accretion disk on vertical phone screens</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Disables heavy post-processing motion blur for maximum mobile GPU performance</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Enlarges touch targets and compacts bottom dock controls for one-thumb use</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleTogglePhoneMode}
                className={`w-14 h-7.5 rounded-full transition-colors p-1 shrink-0 cursor-pointer border ${
                  settings.phoneMode
                    ? 'bg-emerald-500/40 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                title="Toggle Phone Mode"
              >
                <div
                  className={`w-5.5 h-5.5 rounded-full transition-transform ${
                    settings.phoneMode
                      ? 'translate-x-6 bg-emerald-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Sub-item: Vibration Haptics Toggle & Intensity Slider */}
            <div className="pt-3 border-t border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                    <Vibrate className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-neutral-100 font-medium text-xs flex items-center gap-1.5">
                      <span>{t.touchHapticsTitle}</span>
                      {haptics.isSupported && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                      Tactile vibration pulses on range slider scrubbing, preset taps, and sonic boom explosions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {haptics.isSupported && (
                    <button
                      type="button"
                      onClick={() => haptics.pulseBoom()}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer shadow-sm"
                      title="Test Device Vibration Pulse"
                    >
                      {t.testPulse}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      toggleSetting('hapticsEnabled');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer border ${
                      settings.hapticsEnabled !== false
                        ? 'bg-emerald-500/40 border-emerald-400'
                        : 'bg-neutral-900 border-neutral-700'
                    }`}
                    title="Toggle Vibration Haptics"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full transition-transform ${
                        settings.hapticsEnabled !== false
                          ? 'translate-x-5 bg-emerald-300'
                          : 'translate-x-0 bg-neutral-500'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Haptic Feedback Intensity Slider */}
              <div
                className={`p-3 rounded-lg bg-neutral-900/70 border border-emerald-500/25 space-y-1.5 transition-opacity ${
                  settings.hapticsEnabled === false ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-200 font-medium text-xs">
                    {t.hapticIntensityTitle}
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-xs tabular-nums">
                    {Math.round((settings.hapticsIntensity ?? 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Haptic Feedback Intensity"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={settings.hapticsIntensity ?? 1.0}
                  onChange={(e) => {
                    const nextIntensity = parseFloat(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      hapticsIntensity: nextIntensity,
                    }));
                    haptics.sliderTick();
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                  <span>10% (Subtle)</span>
                  <span>100% (Standard)</span>
                  <span>200% (Max Boost)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 0.5: Real-Time Kerr Relativity Engine Calculation (4 Flagship Compute Tiers & Log Viewer) */}
          <div
            data-testid="kerr-engine-settings-section"
            className="bg-gradient-to-br from-[#14100d] via-neutral-950 to-neutral-950 border border-[#D97757]/45 rounded-xl p-4 space-y-3.5 shadow-[0_0_25px_rgba(217,119,87,0.08)]"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <svg
                  width="16"
                  height="16"
                  viewBox="-24 -24 48 48"
                  className="shrink-0 overflow-visible"
                  aria-hidden="true"
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const angle = (i * Math.PI) / 6;
                    const rRay = i % 2 === 0 ? 18 : 14.5;
                    return (
                      <line
                        key={i}
                        x1={Math.cos(angle) * -rRay}
                        y1={Math.sin(angle) * -rRay}
                        x2={Math.cos(angle) * rRay}
                        y2={Math.sin(angle) * rRay}
                        stroke="rgba(232, 139, 107, 0.94)"
                        strokeWidth={i % 3 === 0 ? '2.4' : '1.6'}
                        strokeLinecap="round"
                      />
                    );
                  })}
                  <circle
                    cx="0"
                    cy="0"
                    r="4.6"
                    fill="#090A0F"
                    stroke="rgba(246, 184, 158, 0.96)"
                    strokeWidth="2.1"
                  />
                </svg>
                <span className="font-display text-xs font-bold tracking-[0.06em] text-[#F7F4EE] drop-shadow-[0_0_8px_rgba(244,241,234,0.25)]">
                  Kerr Engine
                </span>
                <span className="inline-flex items-center justify-center px-1.5 py-[2px] rounded-[4px] bg-[#241C18] border border-[#D97757]/75 font-mono text-[9px] font-bold text-[#F4A688] tracking-[0.08em] leading-none shadow-[0_0_8px_rgba(217,119,87,0.25)]">
                  v1.4
                </span>
                <span className="font-mono text-[10px] font-bold text-[#D97757]/80">-</span>
                <span className="font-mono text-[10px] font-bold tracking-[0.08em] text-[#E89578]">
                  Apex Metric Core
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="view-kerr-engine-log-btn"
                  onClick={() => {
                    haptics.light();
                    setIsInlineKerrLogOpen((prev) => !prev);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                    isInlineKerrLogOpen
                      ? 'bg-[#D97757] text-neutral-950 border-[#F4A688] shadow-[0_0_12px_rgba(217,119,87,0.35)]'
                      : 'bg-[#201815] hover:bg-[#2c201c] text-[#F4A688] border-[#D97757]/55'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span>{isInlineKerrLogOpen ? 'Hide Log' : `View Log (${kerrEngineLogs.length})`}</span>
                </button>

                {onOpenKerrLogModal && (
                  <button
                    type="button"
                    data-testid="open-kerr-log-viewer-btn"
                    onClick={() => {
                      haptics.light();
                      onOpenKerrLogModal();
                    }}
                    className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 font-mono text-[10px] font-semibold cursor-pointer transition-colors"
                    title="Open Full-Screen Kerr Relativity Engine Audit Log"
                  >
                    Full Log
                  </button>
                )}

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    (settings.kerrEngineTier || 'ultra') !== 'ultra' || settings.kerrEngineEnabled !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  }`}
                >
                  {(settings.kerrEngineTier || 'ultra') !== 'ultra'
                    ? 'ALWAYS ACTIVE'
                    : settings.kerrEngineEnabled !== false
                      ? 'ENGINE ACTIVE'
                      : 'ULTRA BYPASSED'}
                </span>
              </div>
            </div>

            {/* Pre-Load Kerr Relativity Engine Terminal (Always Active; Bypass requires Ultra Tier) */}
            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="space-y-1">
                <div className="text-neutral-100 font-semibold text-xs flex items-center gap-2 flex-wrap">
                  <span>{t.kerrEnginePreloadTitle}</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-[2px] rounded-[4px] bg-[#241C18] border border-[#D97757]/75 font-mono text-[9px] font-bold text-[#F4A688] tracking-[0.08em] leading-none">
                    v1.4
                  </span>
                  <span className="font-mono text-[10px] font-bold tracking-[0.06em] text-[#E89578]">
                    Apex Metric Core
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    {KERR_ENGINE_TIERS[settings.kerrEngineTier || 'ultra'].modelCode}
                  </span>
                  {(settings.kerrEngineTier || 'ultra') !== 'ultra' && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/40 px-1.5 py-0.2 rounded">
                      <Lock className="w-2.5 h-2.5" /> Bypass Requires Ultra (Tier IV)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Executes the <strong className="text-[#F4F1EA]">Kerr Engine [v1.4] (Apex Metric Core)</strong> terminal before any black hole or star loads, streaming exact Boyer-Lindquist metric tensors (<span className="font-mono text-cyan-300">g_μν</span>), Christoffel symbols, ISCO roots, and radiative transfer telemetry. Always active on Standard, Linear, and Advanced tiers — only the exact covariant <strong className="text-amber-300">Ultra</strong> solver unlocks optional terminal bypass.
                </p>
              </div>

              <button
                type="button"
                disabled={(settings.kerrEngineTier || 'ultra') !== 'ultra'}
                onClick={() => {
                  if ((settings.kerrEngineTier || 'ultra') === 'ultra') {
                    toggleSetting('kerrEngineEnabled');
                  } else {
                    haptics.heavy();
                  }
                }}
                title={
                  (settings.kerrEngineTier || 'ultra') === 'ultra'
                    ? 'Toggle Ultra Instant Bypass'
                    : 'Engine is always active. Select the Ultra (Tier IV) tier to unlock engine bypass.'
                }
                className={`w-12 h-6.5 rounded-full transition-colors p-0.5 shrink-0 border ${
                  (settings.kerrEngineTier || 'ultra') !== 'ultra'
                    ? 'bg-emerald-500/30 border-emerald-500/50 opacity-80 cursor-not-allowed'
                    : settings.kerrEngineEnabled !== false
                      ? 'bg-amber-500/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer'
                      : 'bg-neutral-900 border-neutral-700 cursor-pointer'
                }`}
                aria-pressed={
                  (settings.kerrEngineTier || 'ultra') !== 'ultra' || settings.kerrEngineEnabled !== false
                }
                aria-label="Toggle Real-Time Kerr Relativity Engine Calculation"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform flex items-center justify-center ${
                    (settings.kerrEngineTier || 'ultra') !== 'ultra' || settings.kerrEngineEnabled !== false
                      ? 'translate-x-5.5 bg-amber-300 text-neutral-950'
                      : 'translate-x-0 bg-neutral-500 text-neutral-200'
                  }`}
                >
                  {(settings.kerrEngineTier || 'ultra') !== 'ultra' && (
                    <Lock className="w-2.5 h-2.5 text-neutral-950" />
                  )}
                </div>
              </button>
            </div>

            {/* 4 Covariant Metric Solvers Grid: Standard, Linear, Advanced, Ultra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(Object.keys(KERR_ENGINE_TIERS) as KerrEngineTierId[]).map((tierKey) => {
                const tier = KERR_ENGINE_TIERS[tierKey];
                const isSelected = (settings.kerrEngineTier || 'ultra') === tierKey;

                return (
                  <button
                    key={tier.id}
                    type="button"
                    data-testid={`kerr-tier-${tier.id}`}
                    onClick={() => {
                      haptics.medium();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        // Non-ultra tiers always force engine active
                        kerrEngineEnabled: tier.id === 'ultra' ? prev.kerrEngineEnabled : true,
                        kerrEngineTier: tier.id,
                      }));
                    }}
                    className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.16)] ring-1 ring-amber-400/40 text-white'
                        : 'bg-neutral-900/75 border-neutral-800/90 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold text-xs uppercase tracking-wider text-white">
                            {tier.name}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${tier.badgeClass}`}>
                            {tier.modelCode}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/25 text-amber-200 border border-amber-400/50">
                              <Check className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded shrink-0">
                          {tier.monthlyPriceDisplay}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-amber-200/90 mb-1">
                        {tier.tagline}
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {tier.description}
                      </p>
                    </div>

                    {/* Speed, Performance & Quality Benchmark Bars */}
                    <div className="mt-2.5 pt-2 border-t border-neutral-800/80 space-y-1.5 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          {tier.tflopsDisplay} ({tier.expectedLatencyDisplay})
                        </span>
                        <span className="text-emerald-300">{tier.costPerSolveDisplay}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-neutral-400 uppercase text-[8px]">Speed</span>
                          <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${tier.speedScore}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-amber-300">{tier.speedScore}%</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-16 text-neutral-400 uppercase text-[8px]">Perf</span>
                          <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${tier.performanceScore}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-cyan-300">{tier.performanceScore}%</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-16 text-neutral-400 uppercase text-[8px]">Quality</span>
                          <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-purple-400 rounded-full"
                              style={{ width: `${tier.qualityScore}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-purple-300">{tier.qualityScore}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Bar: Test Run Engine Now + View Calculation Log */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]">
              <div className="flex items-center gap-2 text-neutral-400">
                <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Session Solves: <strong className="text-white">{kerrEngineLogs.length}</strong> · Active Tier:{' '}
                  <strong className="text-emerald-300">
                    {KERR_ENGINE_TIERS[settings.kerrEngineTier || 'ultra'].monthlyPriceDisplay} ({KERR_ENGINE_TIERS[settings.kerrEngineTier || 'ultra'].name})
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    setIsInlineKerrLogOpen((prev) => !prev);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-200 font-semibold cursor-pointer transition-colors"
                >
                  {isInlineKerrLogOpen ? 'Collapse Calculation Log' : 'View Log in Settings'}
                </button>

                {onTriggerKerrCalculation && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onClose();
                      onTriggerKerrCalculation(settings.kerrEngineTier || 'ultra');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#201815] hover:bg-[#2c201c] border border-[#D97757]/60 text-[#F4A688] font-bold cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch Kerr Engine Terminal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Expandable Kerr Relativity Engine Calculation Log inside Settings */}
            {isInlineKerrLogOpen && (
              <div
                data-testid="settings-inline-kerr-log"
                className="mt-2 p-3 rounded-xl bg-[#080605] border border-[#D97757]/45 space-y-2.5 font-mono text-[10px]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#D97757]/25 pb-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[#E89578] font-bold tracking-wider">
                    <svg
                      width="14"
                      height="14"
                      viewBox="-24 -24 48 48"
                      className="shrink-0 overflow-visible"
                      aria-hidden="true"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => {
                        const angle = (i * Math.PI) / 6;
                        const rRay = i % 2 === 0 ? 18 : 14.5;
                        return (
                          <line
                            key={i}
                            x1={Math.cos(angle) * -rRay}
                            y1={Math.sin(angle) * -rRay}
                            x2={Math.cos(angle) * rRay}
                            y2={Math.sin(angle) * rRay}
                            stroke="rgba(232, 139, 107, 0.94)"
                            strokeWidth={i % 3 === 0 ? '2.4' : '1.6'}
                            strokeLinecap="round"
                          />
                        );
                      })}
                      <circle
                        cx="0"
                        cy="0"
                        r="4.6"
                        fill="#090A0F"
                        stroke="rgba(246, 184, 158, 0.96)"
                        strokeWidth="2.1"
                      />
                    </svg>
                    <span>Kerr Engine [v1.4] · Apex Metric Core — Calculation & Logic Log</span>
                  </div>
                  {kerrEngineLogs.length > 1 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {kerrEngineLogs.slice(0, 5).map((rLog, idx) => (
                        <button
                          key={rLog.id}
                          type="button"
                          onClick={() => setSelectedInlineLogIdx(idx)}
                          className={`px-2 py-0.5 rounded border text-[9px] cursor-pointer ${
                            selectedInlineLogIdx === idx
                              ? 'bg-[#201815] border-[#D97757] text-[#F4A688] font-bold'
                              : 'bg-neutral-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {rLog.targetName} ({rLog.tierName})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {kerrEngineLogs[selectedInlineLogIdx] || kerrEngineLogs[0] ? (
                  (() => {
                    const activeLog = kerrEngineLogs[selectedInlineLogIdx] || kerrEngineLogs[0];
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-neutral-950 border border-slate-800/90 text-[9.5px]">
                          <div>
                            <span className="text-slate-500 block">TARGET</span>
                            <strong className="text-white">{activeLog.targetName}</strong> ({activeLog.massSolarDisplay})
                          </div>
                          <div>
                            <span className="text-slate-500 block">ENGINE TIER</span>
                            <strong className="text-amber-300">{activeLog.modelCode}</strong> ({activeLog.tflopsPeak} TF)
                          </div>
                          <div>
                            <span className="text-slate-500 block">METRIC TENSOR</span>
                            <strong className="text-cyan-300">
                              g_tt={activeLog.summaryMetrics.g_tt.toFixed(3)} · g_rr=+{activeLog.summaryMetrics.g_rr.toFixed(2)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">SOLVE TIME &amp; TIER</span>
                            <strong className="text-emerald-300">
                              {activeLog.totalDurationMs} ms · {KERR_ENGINE_TIERS[activeLog.tierId]?.monthlyPriceDisplay || activeLog.tierName}
                            </strong>
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {activeLog.steps.map((st) => (
                            <div
                              key={st.id}
                              className="p-2 rounded-lg bg-neutral-950/90 border border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="text-amber-300 font-bold">
                                  [{st.stepNumber}/08 · {st.phase}] <span className="text-cyan-300">$ {st.command}</span>
                                </span>
                                <span className="text-emerald-400">{st.residual}</span>
                              </div>
                              <div className="px-2 py-1 rounded bg-[#050914] border border-slate-800/70 text-amber-200 text-[10px] overflow-x-auto">
                                {st.equation}
                              </div>
                              <div className="text-[9.5px] text-slate-300">
                                <strong className="text-purple-300">LOGIC:</strong> {st.logicDecision}
                              </div>
                              <div className="text-[9px] text-slate-400">{st.telemetry}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    No calculations logged yet. Load a black hole or star to populate the Kerr Relativity Engine log.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Physics Presets (General Relativistic Configurations) */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Atom className="w-4 h-4 text-amber-400" />
                <span>{t.physicsPresetsSectionTitle}</span>
              </div>
              <span className="font-mono text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                EXACT EINSTEIN METRICS
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Quickly switch between exact General Relativistic spacetime metrics. Dynamically shifts the dimensionless spin parameter <span className="font-mono text-amber-300">a*</span>, recalculates frame-dragging, contracts/expands the event horizon, and snaps the accretion disk to the exact prograde Innermost Stable Circular Orbit (ISCO).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(Object.keys(PHYSICS_PRESETS_CONFIG) as PhysicsPresetId[]).map((presetKey) => {
                const preset = PHYSICS_PRESETS_CONFIG[presetKey];
                const isActive = activePhysicsPresetId === presetKey;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onSelectPhysicsPreset?.(preset.id);
                    }}
                    className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40 text-neutral-100'
                        : 'bg-neutral-900/70 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold text-xs ${isActive ? 'text-amber-200' : 'text-neutral-200'}`}>
                            {preset.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/50">
                              <Check className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${preset.badgeBg}`}>
                          {preset.spinDisplay}
                        </span>
                      </div>

                      <div className="font-mono text-[10px] text-neutral-400 mb-1.5">
                        {preset.tagline}
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-800/80 grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                      <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800/60">
                        <span className="text-neutral-400 block text-[8px] uppercase tracking-wider">Horizon r_H</span>
                        <span className="text-neutral-200 font-medium">{preset.horizonRs}</span>
                      </div>
                      <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800/60">
                        <span className="text-neutral-400 block text-[8px] uppercase tracking-wider">ISCO Gap</span>
                        <span className="text-neutral-200 font-medium">{preset.iscoRs}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Rapid Parameter Adjustment Ripples Toggle */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-100 font-medium text-xs">
                    {t.rapidRipplesTitle}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      settings.rapidAdjustmentRipples !== false
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {settings.rapidAdjustmentRipples !== false ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Generates propagating relativistic gravitational wave ripples from the black hole when spin or accretion rate are rapidly adjusted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('rapidAdjustmentRipples')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.rapidAdjustmentRipples !== false
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={settings.rapidAdjustmentRipples !== false}
                aria-label="Toggle rapid adjustment ripples"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.rapidAdjustmentRipples !== false
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Background & Screen Lock */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{t.backgroundAnatomySectionTitle}</span>
            </div>

            {/* Lock Background When Moving Screen */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.lockBackgroundTitle}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Keeps the background stars and nebula completely stationary on screen when rotating or panning the camera.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('lockBackground')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.lockBackground
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.lockBackground
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Sync Singularity With Anatomy Guide */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.syncSingularityTitle}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Automatically hides the central Kerr ring singularity when you click off the Anatomy Guide.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('syncSingularityWithAnatomy')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.syncSingularityWithAnatomy
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.syncSingularityWithAnatomy
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Always Show Singularity Override */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.alwaysShowSingularityTitle}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Keep the pinpoint singularity and Kerr ring visible inside the black hole shadow even when the Anatomy Guide is off.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('alwaysShowSingularity')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.alwaysShowSingularity
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.alwaysShowSingularity
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Accretion Disk Style & Spacetime Lensing Optics */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sky-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.accretionOpticsSectionTitle}</span>
            </div>

            {/* Accretion State Physical Geometry Toggle (Quiescent vs Active) */}
            {onChangeAccretionState && (
              <div className="pt-1 pb-2 border-b border-neutral-900">
                <div className="text-neutral-100 font-medium text-xs mb-1.5">
                  {t.accretionStateTitle}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeAccretionState('quiescent')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accretionState !== 'active'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-semibold text-xs">{t.quiescentThin}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                      Standard thin equatorial Novikov-Thorne disk geometry
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeAccretionState('active')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accretionState === 'active'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-semibold text-xs">{t.activeThick}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                      Turbulent high-emission torus smoothly connecting lensed arcs
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Accretion State Change & Threshold Shockwave Toggle */}
            <div className="flex items-center justify-between gap-4 pt-2.5 pb-2 border-b border-neutral-900">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-100 font-medium text-xs">
                    {t.accretionShockwaveTitle}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      settings.accretionShockwaveEnabled !== false
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {settings.accretionShockwaveEnabled !== false ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Propagates a high-energy thermal and radiation-pressure shockwave outward from the event horizon boundary when accretion rate changes rapidly or crosses critical state thresholds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('accretionShockwaveEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.accretionShockwaveEnabled !== false
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={settings.accretionShockwaveEnabled !== false}
                aria-label="Toggle accretion shockwave animation"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.accretionShockwaveEnabled !== false
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Accretion Disk Renderer Toggle (Classic vs Raymarched) */}
            <div className="pt-1 pb-2 border-b border-neutral-900">
              <div className="text-neutral-100 font-medium text-xs mb-1.5">
                {t.accretionRendererTitle}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      accretionDiskStyle: 'classic',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.accretionDiskStyle !== 'raymarched'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="font-semibold text-xs">{t.classicDisk}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Original wide 3D equatorial ring mesh with Einstein-lensed arches
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      accretionDiskStyle: 'raymarched',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.accretionDiskStyle === 'raymarched'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="font-semibold text-xs">{t.volumetricRaymarched}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Full 3D geodesic raymarched disk with ACES tone mapping
                  </div>
                </button>
              </div>
            </div>

            {/* Opt-In Dynamic Resolution Scaling (Defaults to OFF / Locked Native High-DPI @2x) */}
            <div className="flex items-center justify-between gap-3 pt-1 pb-2 border-b border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs flex items-center gap-1.5">
                  <span>{t.dynamicResScalingTitle}</span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {settings.dynamicResolutionScaling ? 'OPT-IN ON' : 'LOCKED HIGH-DPI'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Keep OFF (default) to lock crisp High-DPI (@2x) anti-aliased rendering without automatic frame-spike resolution downgrades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('dynamicResolutionScaling')}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  settings.dynamicResolutionScaling
                    ? 'bg-amber-500/40 border border-amber-400'
                    : 'bg-neutral-800 border border-neutral-700'
                }`}
                aria-label="Toggle dynamic resolution scaling"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.dynamicResolutionScaling
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* WebGL Depth-Peeling (Front-to-Back Transparent Layer Occlusion Culling) */}
            <div className="flex items-center justify-between gap-3 pt-1 pb-2 border-b border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs flex items-center gap-1.5">
                  <span>{t.webglDepthPeelingTitle}</span>
                  <span
                    className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border ${
                      Boolean(settings.webglDepthPeeling ?? settings.highPerformanceMode)
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {Boolean(settings.webglDepthPeeling ?? settings.highPerformanceMode)
                      ? 'DEPTH-PEEL ACTIVE'
                      : 'MULTI-PASS BLEND'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Applies front-to-back alpha depth-peeling and early volumetric raymarching termination to eliminate transparent overdraw across the accretion disk and Einstein rings.
                </p>
              </div>
              <button
                type="button"
                data-testid="webgl-depth-peeling-toggle"
                onClick={() => {
                  haptics.light();
                  onUpdateSettings((prev) => ({
                    ...prev,
                    webglDepthPeeling: !Boolean(
                      prev.webglDepthPeeling ?? prev.highPerformanceMode
                    ),
                  }));
                }}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  Boolean(settings.webglDepthPeeling ?? settings.highPerformanceMode)
                    ? 'bg-cyan-500/40 border border-cyan-400'
                    : 'bg-neutral-800 border border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.webglDepthPeeling ?? settings.highPerformanceMode)}
                aria-label="Toggle WebGL depth-peeling"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    Boolean(settings.webglDepthPeeling ?? settings.highPerformanceMode)
                      ? 'translate-x-5 bg-cyan-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Bloom Intensity Slider */}
            <div className="pt-1 pb-2 border-b border-neutral-900">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  {t.bloomIntensityTitle}
                </span>
                <span className="font-mono text-amber-300 text-xs">
                  {settings.bloomIntensity.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                aria-label="Bloom Intensity"
                min={0.0}
                max={2.5}
                step={0.05}
                value={settings.bloomIntensity}
                onChange={(e) =>
                  setNumericSetting('bloomIntensity', parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Controls the relativistic glow, corona halo, and luminous emission intensity on the accretion disk and photon ring.
              </p>
            </div>

            {/* Lens Flare Intensity Slider */}
            <div
              data-testid="lens-flare-intensity-section"
              className="pt-1 pb-2 border-b border-neutral-900"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-100 font-medium text-xs">
                    {t.lensFlareIntensityTitle}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      (settings.lensFlareIntensity ?? 1.0) > 0.01
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {(settings.lensFlareIntensity ?? 1.0) > 0.01 ? 'CAMERA OPTICS' : 'OFF'}
                  </span>
                </div>
                <span
                  data-testid="lens-flare-intensity-value"
                  className="font-mono text-amber-300 text-xs tabular-nums"
                >
                  {(settings.lensFlareIntensity ?? 1.0).toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                data-testid="lens-flare-intensity-slider"
                aria-label="Lens Flare Intensity"
                min={0.0}
                max={2.5}
                step={0.05}
                value={settings.lensFlareIntensity ?? 1.0}
                onChange={(e) =>
                  setNumericSetting('lensFlareIntensity', parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-0.5">
                <span>0.00× (Off)</span>
                <span>1.00× (Standard)</span>
                <span>2.50× (Cinema Anamorphic)</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {t.lensFlareIntensityDesc}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  {t.nakedDistortionTitle}
                </span>
                <span className="font-mono text-amber-300 text-xs">
                  {settings.nakedDistortionIntensity.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={settings.nakedDistortionIntensity}
                onChange={(e) =>
                  setNumericSetting('nakedDistortionIntensity', parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Amplifies the relativistic Einstein ring, warped geodesic grid contours, and background starlight deflection when the accretion disk is toggled off.
              </p>
            </div>

            {/* Camera Motion Blur */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.cameraMotionBlurTitle}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Applies directional screen-space velocity blur during rapid orbital camera slews.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('motionBlurEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.motionBlurEnabled
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.motionBlurEnabled
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Time Lapse (Long-Exposure Astrophotography) Checkbox */}
            <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-neutral-900">
              <label
                htmlFor="time-lapse-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="time-lapse-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.timeLapseEnabled)}
                  onChange={() => toggleSetting('timeLapseEnabled')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-amber-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      {t.timeLapseTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.timeLapseEnabled
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.timeLapseEnabled ? 'ACCUMULATING' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {t.timeLapseDesc}
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => toggleSetting('timeLapseEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.timeLapseEnabled
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.timeLapseEnabled)}
                aria-label="Toggle Time Lapse Long-Exposure Astrophotography"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.timeLapseEnabled
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 4: Camera & Orbit Controls */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Camera className="w-3.5 h-3.5" />
              <span>{t.cameraRigSectionTitle}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  {t.cameraFovTitle}
                </span>
                <span className="font-mono text-emerald-300 text-xs">
                  {settings.cameraFov}°
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={75}
                step={1}
                value={settings.cameraFov}
                onChange={(e) => setNumericSetting('cameraFov', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.sonicBoomShakeTitle}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Applies physical camera recoil and seismic aftershock vibration when triggering a sonic boom pulse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('screenShakeEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.screenShakeEnabled
                    ? 'bg-emerald-500/30 border-emerald-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.screenShakeEnabled
                      ? 'translate-x-5 bg-emerald-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.autoRotateCameraTitle}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Slowly orbits the camera around the black hole&apos;s Y-axis for a dynamic, cinematic perspective of the accretion disk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('autoRotate')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.autoRotate
                    ? 'bg-emerald-500/30 border-emerald-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.autoRotate
                      ? 'translate-x-5 bg-emerald-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {settings.autoRotate && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-neutral-300 text-[11px]">{t.autoOrbitSpeedTitle}</span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    {settings.autoRotateSpeed.toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={3.0}
                  step={0.1}
                  value={settings.autoRotateSpeed}
                  onChange={(e) =>
                    setNumericSetting('autoRotateSpeed', parseFloat(e.target.value))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Section 5: HUD & Telemetry Panels */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-purple-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>{t.hudVisibilitySectionTitle}</span>
            </div>

            {/* Focus Mode Toggle (Immersive Cinematic View with Bottom Status Line) */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-neutral-900">
              <label
                htmlFor="focus-mode-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="focus-mode-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.focusMode)}
                  onChange={() => toggleSetting('focusMode')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-amber-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      {t.focusModeTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.focusMode
                          ? 'border-amber-500/45 bg-amber-500/15 text-amber-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.focusMode ? 'FOCUS ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Hides non-essential HUD elements (Top Bar, Control Dock, Left HUD, Radar, and Event Log), leaving only the central 3D view and a small, unobtrusive status line at the bottom.
                  </p>
                </div>
              </label>

              <button
                type="button"
                data-testid="settings-focus-mode-toggle"
                onClick={() => toggleSetting('focusMode')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.focusMode
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.focusMode)}
                aria-label="Toggle Focus Mode"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.focusMode
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => toggleSetting('showLeftHud')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showLeftHud
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.leftHudLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showLeftHud ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showOverheadMap')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showOverheadMap
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.overheadRadarLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showOverheadMap ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showTimeDilation')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showTimeDilation
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.timeDilationLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showTimeDilation ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showCursorTelemetry')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showCursorTelemetry
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.cursorReadoutLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showCursorTelemetry ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showEventLog')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showEventLog !== false
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.eventLogLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showEventLog !== false ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>
            </div>

            {/* Show Metric Telemetry Checkbox (Real-Time Spacetime Metric Tensor Evolution Overlay) */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
              <label
                htmlFor="show-metric-telemetry-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="show-metric-telemetry-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.showMetricTelemetry)}
                  onChange={() => toggleSetting('showMetricTelemetry')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-purple-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      {t.showMetricTelemetryTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.showMetricTelemetry
                          ? 'border-purple-500/40 bg-purple-500/15 text-purple-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.showMetricTelemetry ? 'LIVE g_μν' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {t.showMetricTelemetryDesc}
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => toggleSetting('showMetricTelemetry')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.showMetricTelemetry
                    ? 'bg-purple-500/30 border-purple-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.showMetricTelemetry)}
                aria-label="Toggle Show Metric Telemetry"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.showMetricTelemetry
                      ? 'translate-x-5 bg-purple-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Show Performance Monitor Checkbox (Three.js Frame Time, Draw Calls, Memory & Shader Layer Bottleneck Diagnostics) */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
              <label
                htmlFor="show-performance-monitor-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="show-performance-monitor-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.showPerformanceMonitor)}
                  onChange={() => toggleSetting('showPerformanceMonitor')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-cyan-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      {t.showPerfMonitorTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.showPerformanceMonitor
                          ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.showPerformanceMonitor ? 'LIVE TELEMETRY' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Displays real-time frame time (ms/FPS), WebGL draw calls, GPU/heap memory usage, and interactive shader layer toggles to diagnose desktop GPU bottlenecks.
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => toggleSetting('showPerformanceMonitor')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.showPerformanceMonitor
                    ? 'bg-cyan-500/30 border-cyan-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.showPerformanceMonitor)}
                aria-label="Toggle Show Performance Monitor"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.showPerformanceMonitor
                      ? 'translate-x-5 bg-cyan-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 6: Snapshot & Video Recording Export */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-cyan-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Download className="w-3.5 h-3.5" />
                <span>{t.snapshotVideoSectionTitle}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onExportEventLogJson && (
                  <a
                    href="#export-event-log-json"
                    download="simulation-event-log.json"
                    data-testid="settings-export-event-log-json-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      haptics.medium();
                      onExportEventLogJson();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 text-amber-200 transition-all cursor-pointer"
                    title="Export current simulation event log as a JSON file"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>
                      Export Event Log JSON
                      {typeof eventLogCount === 'number' ? ` (${eventLogCount})` : ''}
                    </span>
                  </a>
                )}

                {onExportGeodesicCsv && (
                  <button
                    type="button"
                    data-testid="settings-export-geodesic-csv-btn"
                    onClick={() => {
                      haptics.medium();
                      onExportGeodesicCsv();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 transition-all cursor-pointer"
                    title="Export live geodesic trajectory coordinates, velocity vectors, redshift, and Boyer-Lindquist metric tensors as CSV"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Export Geodesic CSV</span>
                  </button>
                )}

                {onToggleRecording && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onToggleRecording();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                      isRecording
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                        : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-cyan-200'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                        <span>
                          {t.stopRecording} {Math.floor(recordingSeconds / 60)}:
                          {(recordingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 text-rose-400" />
                        <span>{t.startRecordingBtn}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Toggle 1: Photo Export UI Overlay */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-neutral-200">
                      {t.includeUiPhotoTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        settings.includeUiInExport
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.includeUiInExport ? 'UI ON' : 'CLEAN 3D'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-snug">
                    {t.includeUiPhotoDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('includeUiInExport')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.includeUiInExport ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`}
                  aria-pressed={settings.includeUiInExport}
                  aria-label="Toggle UI elements in photo export"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.includeUiInExport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Video Recording UI Overlay */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-neutral-200">
                      {t.includeUiVideoTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        settings.includeUiInVideoExport
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.includeUiInVideoExport ? 'UI ON' : 'CLEAN 3D'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-snug">
                    {t.includeUiVideoDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('includeUiInVideoExport')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.includeUiInVideoExport ? 'bg-rose-500' : 'bg-neutral-800'
                  }`}
                  aria-pressed={Boolean(settings.includeUiInVideoExport)}
                  aria-label="Toggle UI elements in video recording"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.includeUiInVideoExport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 7: Classified Super Secret Setting (Password: "1987") */}
          <div
            className={`rounded-xl p-4 space-y-3 border transition-all ${
              settings.secret1987Unlocked
                ? 'bg-gradient-to-r from-amber-950/45 via-fuchsia-950/35 to-neutral-950 border-amber-400/50 shadow-[0_0_24px_rgba(245,158,11,0.18)]'
                : 'bg-neutral-950/95 border-rose-500/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold">
                {settings.secret1987Unlocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">{t.secretVaultUnlockedTitle}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">{t.secretVaultLockedTitle}</span>
                  </>
                )}
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  settings.secret1987Unlocked
                    ? settings.secret1987Mode
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                }`}
              >
                {settings.secret1987Unlocked
                  ? settings.secret1987Mode
                    ? '1987 OVERDRIVE ACTIVE'
                    : 'UNLOCKED'
                  : 'LOCKED'}
              </span>
            </div>

            {!settings.secret1987Unlocked ? (
              <div className="space-y-2.5 pt-1">
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Enter the 4-digit classified clearance passcode to unlock the hidden experimental spacetime anomaly setting.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={secretPasswordInput}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setSecretPasswordInput(nextVal);
                      setSecretAuthError(false);
                      if (nextVal.trim() === '1987') {
                        handleVerifySecretPassword(nextVal);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifySecretPassword();
                      }
                    }}
                    placeholder="Enter 4-digit passcode..."
                    aria-label="Secret Setting Passcode"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-amber-200 font-mono text-xs tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifySecretPassword()}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-mono text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Unlock
                  </button>
                </div>

                {secretAuthError && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-950/40 border border-rose-500/40 px-2.5 py-1.5 rounded-lg">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>ACCESS DENIED — Invalid clearance code.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Master Actions Bar: Enable All Secret Anomalies + Detonate 1987A Hypernova */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/35">
                  <div className="text-[11px] font-mono text-amber-200 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Classified Anomaly Suite (6 Stackable 3D/Shader Modules)</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      data-testid="secret-detonate-hypernova-btn"
                      onClick={() => {
                        haptics.pulseBoom();
                        onUpdateSettings((prev) => ({
                          ...prev,
                          secretHypernovaNonce: (prev.secretHypernovaNonce ?? 0) + 1,
                        }));
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 border border-rose-400/60 text-rose-200 font-mono text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <Zap className="w-3 h-3 text-rose-300" />
                      <span>Detonate 1987A Hypernova</span>
                    </button>
                    <button
                      type="button"
                      data-testid="secret-toggle-all-btn"
                      onClick={() => {
                        haptics.medium();
                        const allActive = Boolean(
                          settings.secret1987Mode &&
                            settings.secretQuasarJets &&
                            settings.secretHawkingSwarm &&
                            settings.secretWormholePortal &&
                            settings.secretChromaticOverdrive &&
                            settings.secretTimeReversal
                        );
                        const nextVal = !allActive;
                        onUpdateSettings((prev) => ({
                          ...prev,
                          secret1987Mode: nextVal,
                          secretQuasarJets: nextVal,
                          secretHawkingSwarm: nextVal,
                          secretWormholePortal: nextVal,
                          secretChromaticOverdrive: nextVal,
                          secretTimeReversal: nextVal,
                          secretHypernovaNonce: nextVal
                            ? (prev.secretHypernovaNonce ?? 0) + 1
                            : prev.secretHypernovaNonce,
                        }));
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {settings.secret1987Mode &&
                        settings.secretQuasarJets &&
                        settings.secretHawkingSwarm &&
                        settings.secretWormholePortal &&
                        settings.secretChromaticOverdrive &&
                        settings.secretTimeReversal
                          ? 'Disable All Anomalies'
                          : 'Enable All 6 Effects'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Grid of 6 Stackable Classified Anomaly Effects */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. SN 1987A Triple-Ring Nebula & Golden Synth Grid */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-900/80 border border-amber-500/40">
                    <div className="space-y-0.5 pr-1">
                      <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>SN 1987A Triple-Ring &amp; Synth Grid</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-300 leading-snug">
                        Equatorial 24-pearl necklace + twin bipolar hourglass rings &amp; golden spacetime well.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSetting('secret1987Mode')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.secret1987Mode ? 'bg-amber-500' : 'bg-neutral-800'
                      }`}
                      aria-pressed={Boolean(settings.secret1987Mode)}
                      aria-label="Toggle Protocol 1987 Secret Mode"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.secret1987Mode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2. Blandford-Znajek Relativistic Quasar Jets */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-900/80 border border-cyan-500/40">
                    <div className="space-y-0.5 pr-1">
                      <div className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Blandford-Znajek Quasar Jets</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-300 leading-snug">
                        Twin polar plasma cones wrapped in double-helix magnetic filaments &amp; superluminal shock knots.
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="secret-quasar-jets-toggle"
                      onClick={() => toggleSetting('secretQuasarJets')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.secretQuasarJets ? 'bg-cyan-500' : 'bg-neutral-800'
                      }`}
                      aria-pressed={Boolean(settings.secretQuasarJets)}
                      aria-label="Toggle Blandford-Znajek Relativistic Quasar Jets"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.secretQuasarJets ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 3. Hawking Quantum Pair-Production Storm */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-900/80 border border-fuchsia-500/40">
                    <div className="space-y-0.5 pr-1">
                      <div className="text-xs font-bold text-fuchsia-200 flex items-center gap-1.5">
                        <Atom className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                        <span>Hawking Quantum Pair Storm</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-300 leading-snug">
                        320 Cherenkov matter–antimatter vacuum fluctuation pairs erupting and spiraling from the horizon.
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="secret-hawking-swarm-toggle"
                      onClick={() => toggleSetting('secretHawkingSwarm')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.secretHawkingSwarm ? 'bg-fuchsia-500' : 'bg-neutral-800'
                      }`}
                      aria-pressed={Boolean(settings.secretHawkingSwarm)}
                      aria-label="Toggle Hawking Quantum Pair-Production Storm"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.secretHawkingSwarm ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 4. Einstein-Rosen Wormhole Throat Cage */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-900/80 border border-purple-500/40">
                    <div className="space-y-0.5 pr-1">
                      <div className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Einstein-Rosen Wormhole Cage</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-300 leading-snug">
                        Counter-rotating gyroscopic exotic-matter containment rings &amp; geodesic icosahedral throat lattice.
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="secret-wormhole-portal-toggle"
                      onClick={() => toggleSetting('secretWormholePortal')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.secretWormholePortal ? 'bg-purple-500' : 'bg-neutral-800'
                      }`}
                      aria-pressed={Boolean(settings.secretWormholePortal)}
                      aria-label="Toggle Einstein-Rosen Wormhole Throat Cage"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.secretWormholePortal ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 5. 1987 Retro-Synth Chromatic Prism & Scanlines */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-900/80 border border-pink-500/40">
                    <div className="space-y-0.5 pr-1">
                      <div className="text-xs font-bold text-pink-200 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span>1987 Chromatic Prism &amp; CRT Scanlines</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-300 leading-snug">
                        Full-screen optical RGB wavelength dispersion prism with retro-synth phosphor scanline shimmer.
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="secret-chromatic-overdrive-toggle"
                      onClick={() => toggleSetting('secretChromaticOverdrive')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.secretChromaticOverdrive ? 'bg-pink-500' : 'bg-neutral-800'
                      }`}
                      aria-pressed={Boolean(settings.secretChromaticOverdrive)}
                      aria-label="Toggle 1987 Chromatic Prism and Scanlines"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.secretChromaticOverdrive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 6. Tachyon Time-Reversal Matrix */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-900/80 border border-emerald-500/40">
                    <div className="space-y-0.5 pr-1">
                      <div className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Tachyon Time-Reversal Matrix</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-300 leading-snug">
                        Inverts proper-time parity (dτ &lt; 0): spins the accretion disk &amp; rings backward in emerald tachyonic phase.
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="secret-time-reversal-toggle"
                      onClick={() => toggleSetting('secretTimeReversal')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.secretTimeReversal ? 'bg-emerald-500' : 'bg-neutral-800'
                      }`}
                      aria-pressed={Boolean(settings.secretTimeReversal)}
                      aria-label="Toggle Tachyon Time-Reversal Matrix"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          settings.secretTimeReversal ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1">
                  <span className="text-amber-300/90">Clearance 1987 Verified · All 6 Anomalies Unlocked</span>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        secret1987Unlocked: false,
                        secret1987Mode: false,
                        secretQuasarJets: false,
                        secretHawkingSwarm: false,
                        secretWormholePortal: false,
                        secretChromaticOverdrive: false,
                        secretTimeReversal: false,
                      }));
                    }}
                    className="flex items-center gap-1 text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Re-Lock Vault</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </CustomScrollWorkspace>
        )}

        {/* TAB 2: Spotify-Style Songs Player & Audio Mastering */}
        {activeTab === 'songs' && (() => {
          const validatedCatalog = trapQueenPlayer.getValidatedCatalog();
          const visibleSongs = validatedCatalog.filter((tr) => {
            const matchesCategory =
              songCategoryFilter === 'all' || tr.genreTag === songCategoryFilter;
            const q = songSearchQuery.trim().toLowerCase();
            const matchesQuery =
              !q ||
              tr.title.toLowerCase().includes(q) ||
              tr.artistName.toLowerCase().includes(q) ||
              tr.subtitle.toLowerCase().includes(q) ||
              (tr.genreTag || '').toLowerCase().includes(q);
            return matchesCategory && matchesQuery;
          });

          const handleNextSong = () => {
            haptics.light();
            if (isShuffleEnabled && validatedCatalog.length > 1) {
              const otherTracks = validatedCatalog.filter(
                (tItem) => tItem.id !== playerState.trackId
              );
              const pick =
                otherTracks[Math.floor(Math.random() * otherTracks.length)] ||
                validatedCatalog[0];
              trapQueenPlayer.selectTrack(pick.id, true);
            } else {
              trapQueenPlayer.nextTrack();
            }
          };

          const activeBytesMb = playerState.queueValidation.activeTrackBytes
            ? (playerState.queueValidation.activeTrackBytes / (1024 * 1024)).toFixed(1)
            : null;

          return (
            <motion.div
              key="songs-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              data-testid="settings-tab-panel-songs"
              className="flex-1 min-h-0 min-w-0 max-w-full flex flex-col bg-[#121212] text-xs overflow-hidden overscroll-none"
            >
              {/* Scrollable Upper Songs Workspace with Custom Interactive Scroll Rail */}
              <CustomScrollWorkspace
                accentMode="spotify"
                activeItemSelector={`[data-testid="song-track-${playerState.trackId}"]`}
                activeItemLabel={`Scroll to Active Song (${activeTrackDef.title})`}
                testId="songs-scroll-workspace"
                className="px-3 sm:px-4 py-2.5 space-y-2.5"
              >
                {/* Spotify Playlist Header Card (Matching original design without top Play/Shuffle/Repeat) */}
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-zinc-800/60 to-[#181818] border border-zinc-800/80 space-y-3.5 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        type="button"
                        data-testid="songs-header-artwork-btn"
                        onClick={() => {
                          haptics.light();
                          setExpandedArtworkTrack(activeTrackDef);
                        }}
                        title="Click to expand song cover picture"
                        aria-label={`Expand ${activeTrackDef.title} cover picture`}
                        className="group/art relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-zinc-900 shadow-xl shrink-0 flex items-center justify-center border border-white/10 hover:border-[#1DB954] transition-all cursor-pointer"
                      >
                        {playerState.artworkUrl ? (
                          <img
                            src={playerState.artworkUrl}
                            alt={`${playerState.artistName} - ${playerState.trackTitle} cover`}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover group-hover/art:scale-105 transition-transform"
                          />
                        ) : (
                          <Music className="w-8 h-8 text-zinc-500" />
                        )}
                        <span className="absolute inset-0 bg-black/45 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-mono font-bold text-white">
                          EXPAND
                        </span>
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                          PLAYLIST · {playerState.bitrateDisplay.toUpperCase()}
                        </div>
                        <div>
                          <span
                            data-testid="audio-queue-validation-badge"
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/35 text-amber-200/90 font-mono text-[9.5px]"
                            title="Client-side audio completeness & truncation validation passed for all queued tracks"
                          >
                            <Check className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>
                              FULL-LENGTH VERIFIED · {playerState.queueValidation.verifiedQueueCount}{' '}
                              COMPLETE
                              {activeBytesMb ? ` · ${activeBytesMb} MB` : ''}
                            </span>
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate pt-0.5">
                          {activeTrackDef.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap">
                          <span className="text-zinc-100 font-semibold">
                            {playerState.artistName}
                          </span>
                          <span>·</span>
                          <span>{activeTrackDef.badge}</span>
                          <span>·</span>
                          <span>{validatedCatalog.length} full songs</span>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-zinc-300">
                            {activeTrackDef.bpm} BPM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live 16-Band Spectrum Visualizer */}
                    <LiveSpectrumVisualizer
                      isPlaying={playerState.isPlaying}
                      playbackRate={playerState.playbackRate}
                      trackId={playerState.trackId}
                    />
                  </div>
                </div>

                {/* Native Time-Aligned Lyric Sync Stage (Teleprompter, Cinema Stage & Full Lyrics) */}
                {showSubtitles && activeLyrics.length > 0 && (() => {
                  const prev3Line =
                    activeLyricIndex > 2 ? activeLyrics[activeLyricIndex - 3] : null;
                  const prev2Line =
                    activeLyricIndex > 1 ? activeLyrics[activeLyricIndex - 2] : null;
                  const prevLine =
                    activeLyricIndex > 0 ? activeLyrics[activeLyricIndex - 1] : null;
                  const currLine = activeLyrics[activeLyricIndex] || activeLyrics[0];
                  const nextLine =
                    activeLyricIndex + 1 < activeLyrics.length
                      ? activeLyrics[activeLyricIndex + 1]
                      : null;
                  const next2Line =
                    activeLyricIndex + 2 < activeLyrics.length
                      ? activeLyrics[activeLyricIndex + 2]
                      : null;
                  const next3Line =
                    activeLyricIndex + 3 < activeLyrics.length
                      ? activeLyrics[activeLyricIndex + 3]
                      : null;

                  const renderSyncedLyricWords = (text: string, progress: number) => {
                    if (!lyricSyncMode) return <span>{text}</span>;
                    const words = text.split(/\s+/).filter(Boolean);
                    if (words.length <= 1) return <span>{text}</span>;
                    const activeWordFloat = progress * words.length;
                    const activeWordIdx = Math.min(
                      words.length - 1,
                      Math.floor(activeWordFloat)
                    );
                    return (
                      <span className="inline">
                        {words.map((word, wIdx) => {
                          const isSpoken = wIdx < activeWordIdx;
                          const isCurrentWord = wIdx === activeWordIdx;
                          return (
                            <span
                              key={wIdx}
                              className={`transition-colors duration-75 ${
                                isCurrentWord
                                  ? 'text-[#1ed760] drop-shadow-[0_0_8px_rgba(29,185,84,0.55)] underline decoration-[#1DB954]/80 decoration-2 underline-offset-4'
                                  : isSpoken
                                    ? 'text-white'
                                    : 'text-zinc-300/75'
                              }`}
                            >
                              {word}
                              {wIdx < words.length - 1 ? ' ' : ''}
                            </span>
                          );
                        })}
                      </span>
                    );
                  };

                  return (
                    <div
                      data-testid="spotify-live-subtitles-card"
                      className="rounded-xl bg-gradient-to-br from-[#1b2e22]/95 via-[#161a17] to-[#121212] border border-[#1DB954]/45 p-3 sm:p-4 space-y-2.5 shadow-xl overflow-hidden"
                    >
                      {/* Top Header & Native Lyric Sync Mode Controls Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <button
                            type="button"
                            data-testid="lyric-sync-mode-toggle-btn"
                            aria-pressed={lyricSyncMode}
                            onClick={() => {
                              haptics.light();
                              setLyricSyncMode((prev) => !prev);
                            }}
                            title="Toggle Lyric Sync Mode to lock lyrics natively to playback time"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[9.5px] font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                              lyricSyncMode
                                ? 'bg-[#1DB954]/20 border-[#1DB954]/60 text-[#1ed760]'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                lyricSyncMode
                                  ? `bg-[#1DB954] ${playerState.isPlaying ? 'animate-pulse' : ''}`
                                  : 'bg-zinc-500'
                              }`}
                            />
                            <span>Lyric Sync Mode: {lyricSyncMode ? 'ON' : 'OFF'}</span>
                          </button>

                          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9.5px] text-zinc-300 tabular-nums">
                            Line {Math.min(activeLyrics.length, activeLyricIndex + 1)} /{' '}
                            {activeLyrics.length}
                          </span>

                          {/* Fine-Tune Vocal Sync Offset Calibrator (-0.25s / +0.25s) */}
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/45 border border-zinc-700/80 font-mono text-[9.5px]"
                            title="Fine-tune vocal lyric sync offset in 0.25s steps"
                          >
                            <button
                              type="button"
                              data-testid="lyric-offset-minus-btn"
                              onClick={() => {
                                haptics.light();
                                setLyricSyncOffsetSec((v) =>
                                  Math.max(-5, Math.round((v - 0.25) * 100) / 100)
                                );
                              }}
                              className="px-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                              title="Delay lyrics by 0.25s"
                            >
                              -0.25s
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                setLyricSyncOffsetSec(0);
                              }}
                              className={`px-1 rounded cursor-pointer tabular-nums ${
                                Math.abs(lyricSyncOffsetSec) > 0.01
                                  ? 'text-[#1ed760] font-bold'
                                  : 'text-zinc-400'
                              }`}
                              title="Reset lyric sync offset to 0.0s"
                            >
                              {lyricSyncOffsetSec > 0
                                ? `+${lyricSyncOffsetSec.toFixed(2)}s`
                                : `${lyricSyncOffsetSec.toFixed(2)}s`}
                            </button>
                            <button
                              type="button"
                              data-testid="lyric-offset-plus-btn"
                              onClick={() => {
                                haptics.light();
                                setLyricSyncOffsetSec((v) =>
                                  Math.min(5, Math.round((v + 0.25) * 100) / 100)
                                );
                              }}
                              className="px-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                              title="Advance lyrics by 0.25s"
                            >
                              +0.25s
                            </button>
                          </div>
                        </div>

                        {/* View Mode Switcher: Teleprompter / Cinema Stage / Full Lyrics / Auto-Scroll / Hide */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {showFullLyricsCard && !lyricsCinemaMode && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                setLyricsAutoFollow((prev) => !prev);
                              }}
                              className={`px-2 py-0.5 rounded-full font-mono text-[9.5px] font-semibold border transition-colors cursor-pointer ${
                                lyricsAutoFollow
                                  ? 'bg-[#1DB954]/20 text-[#1ed760] border-[#1DB954]/50'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                              title="Lock scroll position to currently spoken line"
                            >
                              {lyricsAutoFollow ? 'Auto-Scroll: ON' : 'Auto-Scroll: OFF'}
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid="toggle-teleprompter-lyrics-btn"
                            onClick={() => {
                              haptics.light();
                              setShowFullLyricsCard(false);
                              setLyricsCinemaMode(false);
                            }}
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border transition-colors cursor-pointer ${
                              !showFullLyricsCard && !lyricsCinemaMode
                                ? 'bg-[#1DB954] text-black border-[#1DB954]'
                                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                            }`}
                            title="Compact 5-line rolling teleprompter lyric sync"
                          >
                            Teleprompter
                          </button>

                          <button
                            type="button"
                            data-testid="toggle-cinema-lyrics-btn"
                            onClick={() => {
                              haptics.light();
                              setLyricsCinemaMode((prev) => {
                                const next = !prev;
                                if (next) {
                                  setShowFullLyricsCard(false);
                                }
                                return next;
                              });
                            }}
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border transition-colors cursor-pointer ${
                              lyricsCinemaMode
                                ? 'bg-[#1DB954] text-black border-[#1DB954]'
                                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                            }`}
                            title="Expand large-type Cinema Lyric Stage synced 1:1 with Teleprompter"
                          >
                            Cinema Stage
                          </button>

                          <button
                            type="button"
                            data-testid="toggle-full-lyrics-view-btn"
                            onClick={() => {
                              haptics.light();
                              setShowFullLyricsCard((prev) => {
                                const next = !prev;
                                if (next) {
                                  setLyricsCinemaMode(false);
                                }
                                return next;
                              });
                            }}
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border transition-colors cursor-pointer ${
                              showFullLyricsCard && !lyricsCinemaMode
                                ? 'bg-[#1DB954] text-black border-[#1DB954]'
                                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                            }`}
                            title="Browse all song lyrics in a scrollable list"
                          >
                            Full Lyrics
                          </button>

                          <button
                            type="button"
                            data-testid="hide-subtitles-btn"
                            onClick={() => {
                              haptics.light();
                              setShowSubtitles(false);
                            }}
                            title="Hide Lyrics"
                            className="px-2 py-0.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 font-mono text-[10px] cursor-pointer"
                          >
                            Hide
                          </button>
                        </div>
                      </div>

                      {!showFullLyricsCard && !lyricsCinemaMode ? (
                        /* 5-Line Rolling Teleprompter View */
                        <div className="space-y-1.5 py-1 px-1">
                          {prev2Line && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(prev2Line.timeSec);
                              }}
                              className="block w-full text-left text-[11px] text-zinc-600 hover:text-zinc-400 truncate transition-colors cursor-pointer"
                            >
                              {prev2Line.text}
                            </button>
                          )}
                          {prevLine && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(prevLine.timeSec);
                              }}
                              className="block w-full text-left text-xs text-zinc-400 hover:text-zinc-200 truncate transition-colors cursor-pointer"
                            >
                              {prevLine.text}
                            </button>
                          )}

                          {/* Active Line with Native Word-by-Word Highlight & Progress Bar */}
                          <div className="rounded-lg bg-black/35 border border-[#1DB954]/40 px-3 py-2 space-y-1.5">
                            <button
                              type="button"
                              data-testid="spotify-active-subtitle-line"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(currLine.timeSec);
                              }}
                              className="flex items-baseline justify-between gap-3 w-full text-left group cursor-pointer"
                            >
                              <span className="text-sm sm:text-base font-extrabold tracking-tight leading-snug">
                                {renderSyncedLyricWords(currLine.text, activeLineProgress)}
                              </span>
                              <span className="font-mono text-[10px] text-[#1ed760] shrink-0 tabular-nums">
                                {Math.floor(currLine.timeSec / 60)}:
                                {Math.floor(currLine.timeSec % 60)
                                  .toString()
                                  .padStart(2, '0')}
                              </span>
                            </button>

                            {/* Live Syllable / Line Timecode Progress Bar */}
                            <div className="w-full h-1 rounded-full bg-zinc-800/90 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-[width] duration-75"
                                style={{
                                  width: `${Math.round(activeLineProgress * 100)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {nextLine && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(nextLine.timeSec);
                              }}
                              className="block w-full text-left text-xs text-zinc-300/90 hover:text-white truncate transition-colors cursor-pointer font-medium"
                            >
                              {nextLine.text}
                            </button>
                          )}
                          {next2Line && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(next2Line.timeSec);
                              }}
                              className="block w-full text-left text-[11px] text-zinc-500 hover:text-zinc-300 truncate transition-colors cursor-pointer"
                            >
                              {next2Line.text}
                            </button>
                          )}
                        </div>
                      ) : lyricsCinemaMode ? (
                        /* 7-Line Cinema Stage View — Synchronized 1:1 with Teleprompter Active Line */
                        <div
                          data-testid="spotify-cinema-lyrics-stage"
                          className="rounded-xl bg-gradient-to-b from-black/55 via-[#0d1811]/90 to-black/65 border border-[#1DB954]/35 px-4 py-4 sm:px-6 sm:py-5 space-y-2.5 text-center shadow-inner"
                        >
                          {prev3Line && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(prev3Line.timeSec);
                              }}
                              className="block w-full text-center text-xs text-zinc-600 hover:text-zinc-400 truncate transition-colors cursor-pointer"
                            >
                              {prev3Line.text}
                            </button>
                          )}
                          {prev2Line && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(prev2Line.timeSec);
                              }}
                              className="block w-full text-center text-xs sm:text-sm text-zinc-500 hover:text-zinc-300 truncate transition-colors cursor-pointer"
                            >
                              {prev2Line.text}
                            </button>
                          )}
                          {prevLine && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(prevLine.timeSec);
                              }}
                              className="block w-full text-center text-sm sm:text-base text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer font-medium"
                            >
                              {prevLine.text}
                            </button>
                          )}

                          {/* Cinema Center Spotlight Card — Identical Active Lyric & Progress Sync as Teleprompter */}
                          <div className="rounded-xl bg-black/60 border border-[#1DB954]/60 px-4 py-3.5 sm:px-5 sm:py-4 space-y-2.5 shadow-[0_0_28px_rgba(29,185,84,0.18)]">
                            <button
                              type="button"
                              data-testid="spotify-active-subtitle-line"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(currLine.timeSec);
                              }}
                              className="flex flex-col items-center justify-center gap-1.5 w-full text-center cursor-pointer"
                            >
                              <span className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight leading-snug">
                                {renderSyncedLyricWords(currLine.text, activeLineProgress)}
                              </span>
                              <span className="font-mono text-[10px] text-[#1ed760] px-2 py-0.5 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/35 tabular-nums">
                                {Math.floor(currLine.timeSec / 60)}:
                                {Math.floor(currLine.timeSec % 60)
                                  .toString()
                                  .padStart(2, '0')}{' '}
                                · Line {Math.min(activeLyrics.length, activeLyricIndex + 1)} of{' '}
                                {activeLyrics.length}
                              </span>
                            </button>

                            {/* Cinema Live Syllable / Line Progress Bar */}
                            <div className="w-full h-1.5 rounded-full bg-zinc-800/90 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-[width] duration-75"
                                style={{
                                  width: `${Math.round(activeLineProgress * 100)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {nextLine && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(nextLine.timeSec);
                              }}
                              className="block w-full text-center text-sm sm:text-base text-zinc-200 hover:text-white transition-colors cursor-pointer font-semibold"
                            >
                              {nextLine.text}
                            </button>
                          )}
                          {next2Line && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(next2Line.timeSec);
                              }}
                              className="block w-full text-center text-xs sm:text-sm text-zinc-400 hover:text-zinc-200 truncate transition-colors cursor-pointer"
                            >
                              {next2Line.text}
                            </button>
                          )}
                          {next3Line && (
                            <button
                              type="button"
                              onClick={() => {
                                haptics.light();
                                trapQueenPlayer.seek(next3Line.timeSec);
                              }}
                              className="block w-full text-center text-xs text-zinc-500 hover:text-zinc-300 truncate transition-colors cursor-pointer"
                            >
                              {next3Line.text}
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Full Lyrics Scrollable View */
                        <div
                          ref={lyricsScrollContainerRef}
                          data-testid="spotify-full-lyrics-scroll"
                          className="relative max-h-60 overflow-y-auto pr-1.5 space-y-1.5 py-1.5 scroll-smooth"
                        >
                          {activeLyrics.map((line, lIdx) => {
                            const isCurrent = lIdx === activeLyricIndex;
                            const isPast = lIdx < activeLyricIndex;
                            return (
                              <button
                                key={`${line.timeSec}-${lIdx}`}
                                type="button"
                                data-lyric-idx={lIdx}
                                onClick={() => {
                                  haptics.light();
                                  trapQueenPlayer.seek(line.timeSec);
                                }}
                                className={`w-full flex flex-col gap-1 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-[#1DB954]/20 border border-[#1DB954]/55 text-white font-extrabold shadow-md text-sm sm:text-[15px]'
                                    : isPast
                                      ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] font-medium text-xs'
                                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.04] font-semibold text-xs'
                                }`}
                              >
                                <div className="w-full flex items-baseline justify-between gap-3">
                                  <span className="leading-snug">
                                    {isCurrent
                                      ? renderSyncedLyricWords(line.text, activeLineProgress)
                                      : line.text}
                                  </span>
                                  <span
                                    className={`font-mono text-[10px] shrink-0 tabular-nums ${
                                      isCurrent ? 'text-[#1ed760]' : 'text-zinc-500'
                                    }`}
                                  >
                                    {Math.floor(line.timeSec / 60)}:
                                    {Math.floor(line.timeSec % 60)
                                      .toString()
                                      .padStart(2, '0')}
                                  </span>
                                </div>
                                {isCurrent && (
                                  <div className="w-full h-1 rounded-full bg-black/50 overflow-hidden mt-0.5">
                                    <div
                                      className="h-full bg-[#1ed760] transition-[width] duration-75"
                                      style={{
                                        width: `${Math.round(activeLineProgress * 100)}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Category Filter Pills + Search Input + Subtitles & Audio FX Toggles */}
                <div className="p-3 rounded-xl bg-[#181818] border border-zinc-800/80 space-y-2.5 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {(['all', 'Hip-Hop / Trap', 'Nightcore', 'Electronic / Alt', 'Melancholy'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              haptics.light();
                              setSongCategoryFilter(cat);
                            }}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                              songCategoryFilter === cat
                                ? 'bg-white text-black font-semibold'
                                : 'bg-[#232323] hover:bg-[#2a2a2a] text-zinc-300'
                            }`}
                          >
                            {cat === 'all' ? 'All' : cat}
                          </button>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-48">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={songSearchQuery}
                          onChange={(e) => setSongSearchQuery(e.target.value)}
                          placeholder="Search songs in library"
                          aria-label="Search songs in library"
                          className="w-full pl-8 pr-3 py-1 rounded-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] border border-transparent focus:border-zinc-600 text-white placeholder-zinc-400 text-[11px] outline-none transition-colors"
                        />
                      </div>

                      <button
                        type="button"
                        data-testid="toggle-songs-subtitles-btn"
                        onClick={() => {
                          haptics.light();
                          setShowSubtitles((prev) => {
                            const next = !prev;
                            if (next) setLyricSyncMode(true);
                            return next;
                          });
                        }}
                        aria-pressed={showSubtitles && lyricSyncMode}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10.5px] font-semibold border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                          showSubtitles && lyricSyncMode
                            ? 'bg-[#1DB954] text-black border-[#1DB954]'
                            : 'bg-[#232323] hover:bg-[#2a2a2a] text-zinc-200 border-zinc-700/80'
                        }`}
                        title="Toggle Native Lyric Sync Mode"
                      >
                        <Music className="w-3 h-3 shrink-0" />
                        <span>Lyric Sync Mode</span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-songs-audio-fx-btn"
                        onClick={() => {
                          haptics.light();
                          setShowSongsAudioFx((prev) => !prev);
                        }}
                        aria-expanded={showSongsAudioFx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10.5px] font-semibold border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                          showSongsAudioFx ||
                          Math.abs(playerState.playbackRate - 1.0) > 0.01 ||
                          playerState.qualityPreset !== 'flat_reference'
                            ? 'bg-white text-black border-white'
                            : 'bg-[#232323] hover:bg-[#2a2a2a] text-zinc-200 border-zinc-700/80'
                        }`}
                        title="Toggle Playback Speed & Equalizer controls"
                      >
                        <Sliders className="w-3 h-3 shrink-0" />
                        <span>Audio FX</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Speed & Equalizer Drawer */}
                  {showSongsAudioFx && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2.5 border-t border-zinc-800/80">
                      {/* Playback Speed Control */}
                      <div className="p-3 rounded-lg bg-[#121212] border border-zinc-800/90 space-y-2">
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                          <span className="text-zinc-200 font-semibold">
                            Speed · {playerState.playbackRate.toFixed(2)}x
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              trapQueenPlayer.setPreservesPitch(!playerState.preservesPitch)
                            }
                            className={`px-2 py-0.5 rounded border text-[9.5px] font-mono cursor-pointer transition-colors whitespace-nowrap ${
                              !playerState.preservesPitch
                                ? 'bg-zinc-200 text-black border-white font-semibold'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {!playerState.preservesPitch ? 'Pitch Shift: ON' : 'Pitch Lock: ON'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[9.5px]">
                          <span className="text-zinc-500 shrink-0">0.5x</span>
                          <input
                            type="range"
                            data-testid="song-speed-slider"
                            aria-label="Song Playback Speed"
                            min={0.5}
                            max={2.0}
                            step={0.05}
                            value={playerState.playbackRate}
                            onChange={(e) =>
                              trapQueenPlayer.setPlaybackRate(parseFloat(e.target.value))
                            }
                            className="flex-1 min-w-0 accent-white cursor-pointer h-1"
                          />
                          <span className="text-zinc-500 shrink-0">2.0x</span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {SONG_SPEED_PRESETS.map((preset) => {
                            const isRateActive =
                              Math.abs(playerState.playbackRate - preset.rate) < 0.02;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                data-testid={`song-speed-${preset.label}`}
                                onClick={() => {
                                  haptics.light();
                                  trapQueenPlayer.setPlaybackRate(preset.rate);
                                }}
                                className={`py-1 px-1 rounded border font-mono text-[9.5px] font-semibold transition-colors cursor-pointer text-center whitespace-nowrap ${
                                  isRateActive
                                    ? 'bg-white text-black border-white'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Equalizer & Audio Quality Control */}
                      <div
                        data-testid="songs-dsp-mastering-panel"
                        className="p-3 rounded-lg bg-[#121212] border border-zinc-800/90 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                          <span className="text-zinc-200 font-semibold">Equalizer &amp; Fidelity</span>
                          <span className="text-zinc-400 tabular-nums text-[9.5px]">
                            {playerState.bassDb >= 0 ? `+${playerState.bassDb}` : playerState.bassDb} /{' '}
                            {playerState.midDb >= 0 ? `+${playerState.midDb}` : playerState.midDb} /{' '}
                            {playerState.trebleDb >= 0 ? `+${playerState.trebleDb}` : playerState.trebleDb} dB
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {AUDIO_QUALITY_PRESETS.map(
                            (preset: { id: AudioQualityPresetId; label: string; shortTag: string }) => {
                              const isPresetActive = playerState.qualityPreset === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  data-testid={`audio-quality-preset-${preset.id}`}
                                  onClick={() => {
                                    haptics.light();
                                    trapQueenPlayer.setQualityPreset(preset.id);
                                  }}
                                  className={`px-2 py-1 rounded border text-left font-mono transition-colors cursor-pointer min-w-0 ${
                                    isPresetActive
                                      ? 'bg-zinc-800 border-zinc-400 text-white'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  <div className="text-[9.5px] font-bold truncate">{preset.label}</div>
                                </button>
                              );
                            }
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 font-mono text-[9.5px] pt-0.5">
                          <div className="min-w-0">
                            <div className="flex justify-between text-zinc-400 mb-0.5">
                              <span>Bass</span>
                              <span className="text-zinc-200 tabular-nums">
                                {playerState.bassDb >= 0 ? `+${playerState.bassDb}` : playerState.bassDb}dB
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-6}
                              max={9}
                              step={0.5}
                              value={playerState.bassDb}
                              onChange={(e) =>
                                trapQueenPlayer.setCustomEq('bass', parseFloat(e.target.value))
                              }
                              aria-label="85Hz Sub-Bass Gain"
                              className="w-full accent-white cursor-pointer h-1"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex justify-between text-zinc-400 mb-0.5">
                              <span>Mid</span>
                              <span className="text-zinc-200 tabular-nums">
                                {playerState.midDb >= 0 ? `+${playerState.midDb}` : playerState.midDb}dB
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-6}
                              max={9}
                              step={0.5}
                              value={playerState.midDb}
                              onChange={(e) =>
                                trapQueenPlayer.setCustomEq('mid', parseFloat(e.target.value))
                              }
                              aria-label="2.4kHz Vocal Presence Gain"
                              className="w-full accent-white cursor-pointer h-1"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex justify-between text-zinc-400 mb-0.5">
                              <span>Treble</span>
                              <span className="text-zinc-200 tabular-nums">
                                {playerState.trebleDb >= 0 ? `+${playerState.trebleDb}` : playerState.trebleDb}dB
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-6}
                              max={9}
                              step={0.5}
                              value={playerState.trebleDb}
                              onChange={(e) =>
                                trapQueenPlayer.setCustomEq('treble', parseFloat(e.target.value))
                              }
                              aria-label="10kHz High-Shelf Air Gain"
                              className="w-full accent-white cursor-pointer h-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Spotify Tracklist Table */}
                <div className="rounded-xl bg-[#161616] border border-zinc-800/80 overflow-hidden max-w-full">
                  {/* Table Column Headers */}
                  <div className="grid grid-cols-[28px_minmax(0,1fr)_48px] sm:grid-cols-[32px_minmax(0,1fr)_140px_56px] items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 border-b border-zinc-800/80 text-[11px] text-zinc-400 font-medium">
                    <span className="text-center">#</span>
                    <span className="truncate">Title (click cover to expand)</span>
                    <span className="hidden sm:block truncate">Genre · Tempo</span>
                    <span className="flex justify-end pr-1">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Track Rows */}
                  <div
                    className="divide-y divide-zinc-800/40 overflow-hidden"
                    role="group"
                    aria-label="Song Library Selector"
                  >
                    {visibleSongs.map((track, idx) => {
                      const isSelected = playerState.trackId === track.id;
                      const isTrackPlaying = isSelected && playerState.isPlaying;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          data-testid={`song-track-${track.id}`}
                          onClick={() => {
                            haptics.medium();
                            if (isSelected) {
                              void trapQueenPlayer.togglePlay();
                            } else {
                              trapQueenPlayer.selectTrack(track.id, true);
                            }
                          }}
                          className={`w-full max-w-full grid grid-cols-[28px_minmax(0,1fr)_48px] sm:grid-cols-[32px_minmax(0,1fr)_140px_56px] items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 text-left transition-colors cursor-pointer group overflow-hidden ${
                            isSelected
                              ? 'bg-white/[0.08]'
                              : 'hover:bg-white/[0.05]'
                          }`}
                        >
                          {/* # or Playing Indicator */}
                          <div className="flex items-center justify-center font-mono text-xs tabular-nums">
                            {isTrackPlaying ? (
                              <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
                                <span className="w-0.5 h-3 bg-[#1DB954] animate-pulse" />
                                <span className="w-0.5 h-2 bg-[#1DB954] animate-pulse" />
                                <span className="w-0.5 h-2.5 bg-[#1DB954] animate-pulse" />
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`group-hover:hidden ${
                                    isSelected ? 'text-[#1DB954] font-bold' : 'text-zinc-400'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <Play className="w-3.5 h-3.5 text-white hidden group-hover:inline fill-current" />
                              </>
                            )}
                          </div>

                          {/* Cover (Click to Expand) + Title + Artist */}
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
                            <div
                              role="button"
                              tabIndex={0}
                              data-testid={`song-row-artwork-${track.id}`}
                              title={`Expand ${track.title} cover picture`}
                              aria-label={`Expand ${track.title} cover picture`}
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.light();
                                setExpandedArtworkTrack(track);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setExpandedArtworkTrack(track);
                                }
                              }}
                              className="group/rowart relative w-9 h-9 rounded overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center border border-white/10 hover:border-[#1DB954] transition-all cursor-zoom-in"
                            >
                              {track.artworkUrl ? (
                                <img
                                  src={track.artworkUrl}
                                  alt={`${track.title} (${track.subtitle})`}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                  className="w-full h-full object-cover group-hover/rowart:scale-110 transition-transform"
                                />
                              ) : (
                                <Music className="w-4 h-4 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div
                                className={`text-xs font-semibold truncate ${
                                  isSelected ? 'text-[#1DB954]' : 'text-white'
                                }`}
                              >
                                {track.title}
                                {track.subtitle && track.subtitle !== track.artistName ? (
                                  <span className="font-normal text-zinc-400 ml-1.5">
                                    ({track.subtitle})
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate">
                                {track.artistName}
                              </div>
                            </div>
                          </div>

                          {/* Genre & BPM */}
                          <div className="hidden sm:block text-[11px] text-zinc-400 truncate">
                            {track.genreTag} · {track.bpm} BPM
                          </div>

                          {/* Duration */}
                          <div className="text-[11px] font-mono tabular-nums text-zinc-400 text-right pr-1">
                            {track.durationLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CustomScrollWorkspace>

              {/* Expanded Song Artwork Lightbox Modal */}
              {expandedArtworkTrack && (
                <div
                  data-testid="expanded-song-artwork-modal"
                  onClick={() => setExpandedArtworkTrack(null)}
                  className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative max-w-md w-full bg-[#161616] border border-zinc-700/80 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3.5 text-center"
                  >
                    <button
                      type="button"
                      data-testid="close-expanded-artwork-btn"
                      onClick={() => setExpandedArtworkTrack(null)}
                      aria-label="Close expanded song cover"
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-xl overflow-hidden bg-zinc-900 border border-white/15 shadow-2xl flex items-center justify-center">
                      {expandedArtworkTrack.artworkUrl ? (
                        <img
                          data-testid="expanded-song-artwork-img"
                          src={getHighResSongArtworkUrl(expandedArtworkTrack.artworkUrl)}
                          alt={`${expandedArtworkTrack.title} expanded cover`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-16 h-16 text-zinc-600" />
                      )}
                    </div>

                    <div className="space-y-1 max-w-full px-2">
                      <h4 className="text-base sm:text-lg font-bold text-white truncate">
                        {expandedArtworkTrack.title}
                      </h4>
                      <p className="text-xs text-zinc-300 truncate">
                        {expandedArtworkTrack.artistName}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-400 pt-0.5">
                        <span>{expandedArtworkTrack.genreTag || 'Track'}</span>
                        <span>·</span>
                        <span>{expandedArtworkTrack.durationLabel}</span>
                        <span>·</span>
                        <span>{expandedArtworkTrack.bpm} BPM</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        data-testid="expanded-artwork-play-btn"
                        onClick={() => {
                          haptics.medium();
                          if (playerState.trackId === expandedArtworkTrack.id) {
                            void trapQueenPlayer.togglePlay();
                          } else {
                            trapQueenPlayer.selectTrack(expandedArtworkTrack.id, true);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-xs transition-transform hover:scale-105 cursor-pointer"
                      >
                        {playerState.trackId === expandedArtworkTrack.id &&
                        playerState.isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play Song</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedArtworkTrack(null)}
                        className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Sticky Bottom Spotify Now-Playing Bar (Supports Minimized Single-Line Mode for Scrolling) */}
              {isPlayerMinimized ? (
                <div
                  data-testid="songs-bottom-player-minimized"
                  className="relative px-3 sm:px-4 py-1.5 bg-[#181818] border-t border-zinc-800/90 flex items-center justify-between gap-2.5 shrink-0"
                >
                  {/* Thin 2px Progress Line Along Top Edge */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 overflow-hidden pointer-events-none">
                    <div
                      className="h-full bg-[#1DB954] transition-[width] duration-150"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            (playerState.currentTime / Math.max(1, playerState.duration)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Left: Compact Cover + Track Title & Artist */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setExpandedArtworkTrack(activeTrackDef);
                      }}
                      title="Expand cover art"
                      className="w-7 h-7 rounded overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center border border-white/10 hover:border-[#1DB954] cursor-zoom-in"
                    >
                      {playerState.artworkUrl ? (
                        <img
                          src={playerState.artworkUrl}
                          alt={activeTrackDef.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </button>
                    <div className="min-w-0 flex items-baseline gap-1.5 truncate">
                      <span className="text-xs font-semibold text-white truncate">
                        {activeTrackDef.title}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate hidden xs:inline">
                        · {playerState.artistName}
                      </span>
                    </div>
                  </div>

                  {/* Right: Compact Transport + Time + Expand Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-zinc-400 tabular-nums hidden sm:inline">
                      {Math.floor(playerState.currentTime / 60)}:
                      {Math.floor(playerState.currentTime % 60)
                        .toString()
                        .padStart(2, '0')}{' '}
                      / {Math.floor(playerState.duration / 60)}:
                      {Math.floor(playerState.duration % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        trapQueenPlayer.prevTrack();
                      }}
                      className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Previous Track"
                      aria-label="Previous Track"
                    >
                      <SkipBack className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      type="button"
                      data-testid="jukebox-play-pause-btn"
                      onClick={() => {
                        haptics.medium();
                        void trapQueenPlayer.togglePlay();
                      }}
                      className="w-7 h-7 rounded-full bg-white hover:scale-105 text-black flex items-center justify-center transition-transform cursor-pointer shrink-0"
                      title={playerState.isPlaying ? 'Pause Song' : `Play ${activeTrackDef.title}`}
                    >
                      {playerState.isPlaying ? (
                        <Pause className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      data-testid="jukebox-next-btn"
                      onClick={handleNextSong}
                      className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Next Track"
                      aria-label="Next Track"
                    >
                      <SkipForward className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      type="button"
                      data-testid="toggle-minimize-bottom-player-btn"
                      onClick={() => {
                        haptics.light();
                        setIsPlayerMinimized(false);
                      }}
                      title="Expand bottom player"
                      aria-label="Expand bottom player"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white font-mono text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronUp className="w-3 h-3 text-[#1DB954]" />
                      <span>Expand</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="songs-bottom-player-expanded"
                  className="px-4 py-2 bg-[#181818] border-t border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0"
                >
                  {/* Left: Clickable Mini Cover + Active Song Info + Mobile Minimize Button */}
                  <div className="flex items-center justify-between gap-2 min-w-0 sm:w-52">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        data-testid="songs-bottom-artwork-btn"
                        onClick={() => {
                          haptics.light();
                          setExpandedArtworkTrack(activeTrackDef);
                        }}
                        title="Click to expand song cover picture"
                        aria-label={`Expand ${activeTrackDef.title} cover picture`}
                        className="w-10 h-10 rounded overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center border border-white/10 hover:border-[#1DB954] transition-all cursor-zoom-in"
                      >
                        {playerState.artworkUrl ? (
                          <img
                            src={playerState.artworkUrl}
                            alt={activeTrackDef.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {activeTrackDef.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {playerState.artistName}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Minimize Button */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setIsPlayerMinimized(true);
                      }}
                      title="Minimize player to see more songs"
                      aria-label="Minimize bottom player"
                      className="sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white font-mono text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronDown className="w-3 h-3" />
                      <span>Minimize</span>
                    </button>
                  </div>

                  {/* Center: Spotify Transport Controls + Timeline Scrubber */}
                  <div className="flex-1 max-w-md flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        data-testid="jukebox-prev-btn"
                        onClick={() => {
                          haptics.light();
                          trapQueenPlayer.prevTrack();
                        }}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Previous Track"
                        aria-label="Previous Track"
                      >
                        <SkipBack className="w-4 h-4 fill-current" />
                      </button>

                      <button
                        type="button"
                        data-testid="jukebox-shuffle-btn"
                        onClick={() => {
                          haptics.light();
                          setIsShuffleEnabled((s) => !s);
                        }}
                        aria-pressed={isShuffleEnabled}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isShuffleEnabled
                            ? 'text-[#1DB954] bg-[#1DB954]/15'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title={isShuffleEnabled ? 'Shuffle: ON' : 'Shuffle: OFF'}
                        aria-label="Shuffle Songs"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        data-testid="jukebox-play-pause-btn"
                        onClick={() => {
                          haptics.medium();
                          void trapQueenPlayer.togglePlay();
                        }}
                        className="w-8 h-8 rounded-full bg-white hover:scale-105 text-black flex items-center justify-center transition-transform cursor-pointer shrink-0"
                        title={playerState.isPlaying ? 'Pause Song' : `Play ${activeTrackDef.title}`}
                      >
                        {playerState.isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span className="sr-only">Pause Song</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            <span className="sr-only">Play {activeTrackDef.title}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        data-testid="jukebox-loop-btn"
                        onClick={() => {
                          haptics.light();
                          trapQueenPlayer.setLoopTrack(!playerState.loopTrack);
                        }}
                        aria-pressed={playerState.loopTrack}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          playerState.loopTrack
                            ? 'text-[#1DB954] bg-[#1DB954]/15'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title={playerState.loopTrack ? 'Repeat Track: ON' : 'Repeat Track: OFF'}
                        aria-label="Toggle Loop Track"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        data-testid="jukebox-next-btn"
                        onClick={handleNextSong}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Next Track"
                        aria-label="Next Track"
                      >
                        <SkipForward className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    {/* Scrubber Bar */}
                    <div className="w-full flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400 w-8 text-right tabular-nums">
                        {Math.floor(playerState.currentTime / 60)}:
                        {Math.floor(playerState.currentTime % 60)
                          .toString()
                          .padStart(2, '0')}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, playerState.duration)}
                        step={0.1}
                        value={Math.min(playerState.currentTime, playerState.duration)}
                        onChange={(e) => trapQueenPlayer.seek(parseFloat(e.target.value))}
                        aria-label="Seek active song"
                        className="flex-1 accent-white hover:accent-[#1DB954] cursor-pointer h-1"
                      />
                      <span className="font-mono text-[10px] text-zinc-400 w-8 tabular-nums">
                        {Math.floor(playerState.duration / 60)}:
                        {Math.floor(playerState.duration % 60)
                          .toString()
                          .padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Volume Slider + Minimize Button */}
                  <div className="flex items-center justify-end gap-2 sm:w-52">
                    <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={playerState.volume}
                      onChange={(e) => trapQueenPlayer.setVolume(parseFloat(e.target.value))}
                      aria-label="Song volume"
                      className="w-20 accent-white hover:accent-[#1DB954] cursor-pointer h-1"
                    />
                    <button
                      type="button"
                      data-testid="toggle-minimize-bottom-player-btn"
                      onClick={() => {
                        haptics.light();
                        setIsPlayerMinimized(true);
                      }}
                      title="Minimize bottom player to see more songs"
                      aria-label="Minimize bottom player"
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white font-mono text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronDown className="w-3 h-3" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* TAB 3: IQ Test Module (Kept mounted once visited so switching tabs never resets progress) */}
        {(hasVisitedIqTest || activeTab === 'iq_test') && (
          <div
            className={
              activeTab === 'iq_test'
                ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
                : 'hidden'
            }
          >
            <React.Suspense
              fallback={
                <div className="flex-1 min-h-0 flex items-center justify-center p-8 text-xs font-mono text-zinc-400">
                  Loading Quantitative IQ Assessment Module...
                </div>
              }
            >
              <LazyIQTestModule
                uiTheme={activeUiThemeId}
                isActiveTab={activeTab === 'iq_test'}
                onHapticLight={() => haptics.light()}
                onHapticMedium={() => haptics.medium()}
                onHapticSuccess={() => haptics.success()}
              />
            </React.Suspense>
          </div>
        )}

        {/* TAB 3b: Chess Sandbox Module (Public, Lazy-Loaded) */}
        {activeTab === 'chess' && (
          <React.Suspense
            fallback={
              <div className="flex-1 min-h-0 flex items-center justify-center p-8 text-xs font-mono text-zinc-400">
                Loading Relativistic Chess Engine Module...
              </div>
            }
          >
            <LazyChessModule
              uiTheme={activeUiThemeId}
              onHapticLight={() => haptics.light()}
              onHapticMedium={() => haptics.medium()}
              onHapticSuccess={() => haptics.success()}
            />
          </React.Suspense>
        )}

        {/* TAB 4: Automated Spacetime Curvature Stress-Test Diagnostic Suite */}
        {activeTab === 'diagnostic' && (
          <DiagnosticSuiteView
            scenarios={SPACETIME_CURVATURE_STRESS_TESTS}
            completedRuns={diagnosticCompletedRuns}
            runningIdx={diagnosticRunningIdx}
            selectedScenarioId={selectedDiagnosticLogId}
            onSelectScenario={setSelectedDiagnosticLogId}
            onRerunSuite={() => setDiagnosticSuiteNonce((n) => n + 1)}
            onOpenKerrLogModal={onOpenKerrLogModal}
            onRecordDiagnosticStressTest={onRecordDiagnosticStressTest}
            syncSceneOnDiagnosticRun={syncSceneOnDiagnosticRun}
            onToggleSyncScene={setSyncSceneOnDiagnosticRun}
            kerrEngineLogsCount={kerrEngineLogs.length}
            activeTier={settings.kerrEngineTier || 'ultra'}
            uiTheme={activeUiThemeId}
            onHapticLight={() => haptics.light()}
            onHapticMedium={() => haptics.medium()}
            onHapticSuccess={() => haptics.success()}
          />
        )}

        {/* TAB 5: Codebase Telemetry & Architecture Details */}
        {activeTab === 'code' && (
          <CodebaseDetailsView
            uiTheme={activeUiThemeId}
            refreshToken={codebaseRefreshToken + kerrEngineLogs.length + Object.keys(diagnosticCompletedRuns).length}
            onHapticLight={() => haptics.light()}
            onHapticMedium={() => haptics.medium()}
            onHapticSuccess={() => haptics.success()}
          />
        )}

        {/* Compact Modal Footer */}
        <div className="flex items-center justify-between gap-1.5 px-3.5 sm:px-5 py-1.5 border-t border-neutral-800/90 bg-neutral-950 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              data-testid="reset-settings-btn"
              onClick={() => {
                trapQueenPlayer.stopAndReset();
                onUpdateSettings(() => ({ ...DEFAULT_VISUALIZER_SETTINGS }));
              }}
              title={t.resetSettings}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-[10px] font-mono leading-tight cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span>{t.resetSettings}</span>
            </button>

            {onResetPhysics && (
              <button
                type="button"
                data-testid="reset-physics-btn"
                onClick={onResetPhysics}
                title={t.resetPhysics}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-[10px] font-mono leading-tight cursor-pointer"
              >
                <Compass className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                <span>{t.resetPhysics}</span>
              </button>
            )}

            {isDevMode && (
              <button
                type="button"
                data-testid="lock-dev-session-btn"
                onClick={() => {
                  haptics.medium();
                  try {
                    window.localStorage.removeItem('kerr_dev_auth');
                  } catch {
                    // Ignore storage errors
                  }
                  trapQueenPlayer.stopAndReset();
                  setActiveTab('settings');
                  onLockDevSession?.();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/45 text-rose-300 hover:text-rose-100 transition-colors text-[10px] font-mono leading-tight cursor-pointer"
                title="Clear developer authentication token and restore public mode"
              >
                <Lock className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                <span>Lock Dev Session</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-colors text-[10px] font-mono font-semibold leading-tight cursor-pointer shrink-0"
          >
            {t.done}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
