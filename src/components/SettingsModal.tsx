import React, { useState, useEffect } from 'react';
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
  Radio,
  Brain,
  Layers,
  Palette,
  Activity,
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
} from '../audio/trapQueenPlayer';
import { AppLanguage, LANGUAGE_OPTIONS, TRANSLATIONS } from '../i18n/translations';
import {
  KerrEngineTierId,
  KERR_ENGINE_TIERS,
  KerrEngineRunLog,
  generateKerrEngineCalculationRun,
} from './KerrRelativityEngineModal';
import { IQTestModule } from './IQTestModule';

export const SETTINGS_SONGS_LIST: SongTrackDefinition[] = [
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
    durationSec: 167,
    durationLabel: '2:47',
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
    artistName: 'Female Version • CADMIUM ft. Rosendale',
    badge: 'Female Version',
    durationSec: 226,
    durationLabel: '3:46',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/36ea7a8f01b1af0000f04348bc71b102/500x500-000000-80-0-0.jpg',
    accentColor: 'cyan',
    sources: [
      '/audio/no-friends-female.mp3',
      'https://archive.org/download/cadmium-no-friendsfeat.-rosendale/CADMIUM%2B-%2BNo%2BFriends%2B%28feat.%2BRosendale%29.mp3',
    ],
    bpm: 145,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'duvet_x_linger',
    title: 'Duvet x Linger',
    subtitle: 'Bôa × The Cranberries',
    artistName: 'Bôa × The Cranberries',
    badge: 'Mashup',
    durationSec: 202,
    durationLabel: '3:22',
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
    artistName: 'Frisk version • Undertale',
    badge: 'Frisk version',
    durationSec: 237,
    durationLabel: '3:57',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/4c059a18bb7fd25748f77a8eaecb0948/500x500-000000-80-0-0.jpg',
    accentColor: 'emerald',
    sources: ['/audio/stronger-than-you-frisk.mp3'],
    bpm: 130,
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
    durationSec: 144,
    durationLabel: '2:24',
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
    id: 'kerr_claude',
    name: 'Kerr Engine Claude',
    subtitle: 'Apex Terracotta & Parchment Ivory',
    badge: 'KERR v1.4 · CLAUDE',
    description:
      'Signature Kerr Engine [v1.4] editorial terminal look pairing warm terracotta (#D97757) and parchment ivory (#F7F4EE) over deep espresso carbon surfaces.',
    swatches: ['#120F0D', '#241C18', '#D97757', '#F7F4EE'],
    activeCardClass:
      'bg-[#1D1613] border-[#D97757] text-[#F7F4EE] shadow-[0_0_20px_rgba(217,119,87,0.22)] ring-1 ring-[#D97757]/50',
    badgeClass: 'bg-[#241C18] text-[#F4A688] border-[#D97757]/75',
  },
  {
    id: 'observatory_gold',
    name: 'Observatory Gold',
    subtitle: 'Doppler Amber & Abyssal Navy',
    badge: 'EHT TELEMETRY',
    description:
      'Professional Event Horizon Telescope mission-control interface with relativistic amber (#F59E0B) highlights and deep void navy (#050811) panels.',
    swatches: ['#050811', '#0D1322', '#F59E0B', '#22D3EE'],
    activeCardClass:
      'bg-amber-500/15 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
  },
  {
    id: 'cryo_quantum',
    name: 'Cryo-Optic Quantum',
    subtitle: 'Laser Sky-Cyan & Titanium Slate',
    badge: 'CERN / ESO LAB',
    description:
      'Precision cryogenic detector & optical interferometry aesthetic featuring crisp sky-cyan (#38BDF8), indigo plasma (#818CF8), and brushed titanium.',
    swatches: ['#060B14', '#0F172A', '#38BDF8', '#818CF8'],
    activeCardClass:
      'bg-sky-500/15 border-sky-400 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.22)] ring-1 ring-sky-400/40',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/50',
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
  activeParams?: BlackHoleParams;
  onRecordDiagnosticStressTest?: (
    run: KerrEngineRunLog,
    applyParamsToScene?: Partial<BlackHoleParams>
  ) => void;
}

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
  activeParams,
  onRecordDiagnosticStressTest,
}) => {
  const haptics = useHaptics({
    enabled: settings.hapticsEnabled !== false,
    intensity: settings.hapticsIntensity ?? 1.0,
  });
  const [activeTab, setActiveTab] = useState<'settings' | 'songs' | 'iq_test' | 'diagnostic'>(
    'settings'
  );
  const [secretPasswordInput, setSecretPasswordInput] = useState<string>('');
  const [secretAuthError, setSecretAuthError] = useState<boolean>(false);
  const [isInlineKerrLogOpen, setIsInlineKerrLogOpen] = useState<boolean>(false);
  const [selectedInlineLogIdx, setSelectedInlineLogIdx] = useState<number>(0);
  const [playerState, setPlayerState] = useState<TrapQueenPlayerState>(() =>
    trapQueenPlayer.getState()
  );
  const [songCategoryFilter, setSongCategoryFilter] = useState<
    'all' | 'Hip-Hop / Trap' | 'Nightcore' | 'Electronic / Alt'
  >('all');
  const [spectrumBands, setSpectrumBands] = useState<number[]>(() =>
    trapQueenPlayer.getSpectrumBands(16)
  );
  const [diagnosticSuiteNonce, setDiagnosticSuiteNonce] = useState<number>(0);
  const [diagnosticRunningIdx, setDiagnosticRunningIdx] = useState<number | null>(null);
  const [diagnosticCompletedRuns, setDiagnosticCompletedRuns] = useState<
    Record<string, KerrEngineRunLog>
  >({});
  const [selectedDiagnosticLogId, setSelectedDiagnosticLogId] = useState<string | null>(null);
  const [syncSceneOnDiagnosticRun, setSyncSceneOnDiagnosticRun] = useState<boolean>(false);

  useEffect(() => {
    trapQueenPlayer.setCatalog(SETTINGS_SONGS_LIST);
    return trapQueenPlayer.subscribe(setPlayerState);
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== 'songs') return;
    setSpectrumBands(trapQueenPlayer.getSpectrumBands(16));
    if (!playerState.isPlaying) return;
    const interval = window.setInterval(() => {
      setSpectrumBands(trapQueenPlayer.getSpectrumBands(16));
    }, 60);
    return () => window.clearInterval(interval);
  }, [isOpen, activeTab, playerState.isPlaying, playerState.playbackRate, playerState.trackId]);

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
    SETTINGS_SONGS_LIST.find((tr) => tr.id === playerState.trackId) || SETTINGS_SONGS_LIST[0];

  const activeUiThemeId: UiThemeId = settings.uiTheme || 'kerr_claude';
  const activeUiThemeOption =
    UI_THEME_OPTIONS.find((th) => th.id === activeUiThemeId) || UI_THEME_OPTIONS[0];

  const modalShellThemeClass =
    activeUiThemeId === 'kerr_claude'
      ? 'bg-[#100d0b] border-[#3a2e28] shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(217,119,87,0.12)]'
      : activeUiThemeId === 'cryo_quantum'
      ? 'bg-[#060b14] border-sky-500/35 shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.12)]'
      : 'bg-[#070a12] border-neutral-800 shadow-2xl';

  const modalHeaderThemeClass =
    activeUiThemeId === 'kerr_claude'
      ? 'border-[#2e241f] bg-[#15110e]'
      : activeUiThemeId === 'cryo_quantum'
      ? 'border-sky-900/50 bg-[#080f1d]'
      : 'border-neutral-800/90 bg-neutral-950';

  const modalHeaderIconClass =
    activeUiThemeId === 'kerr_claude'
      ? 'bg-[#241C18] border-[#D97757]/60 text-[#F4A688]'
      : activeUiThemeId === 'cryo_quantum'
      ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
      : 'bg-amber-500/15 border-amber-500/40 text-amber-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 pointer-events-auto">
      <div
        data-ui-theme={activeUiThemeId}
        className={`relative w-full max-w-xl border rounded-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${modalShellThemeClass}`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b ${modalHeaderThemeClass}`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${modalHeaderIconClass}`}
            >
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#F7F4EE]">
                  {t.settingsTitle}
                </h2>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${activeUiThemeOption.badgeClass}`}
                >
                  {activeUiThemeOption.name}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {t.settingsSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Tab Navigation Bar: Settings | Songs | IQ Test */}
        <div
          role="tablist"
          aria-label="Settings Modal Tabs"
          className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 border-b font-mono text-xs ${modalHeaderThemeClass}`}
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? activeUiThemeId === 'kerr_claude'
                  ? 'bg-[#241C18] border-[#D97757] text-[#F7F4EE] shadow-[0_0_12px_rgba(217,119,87,0.28)]'
                  : activeUiThemeId === 'cryo_quantum'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.22)]'
                  : 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <Sliders
              className={`w-3.5 h-3.5 ${
                activeUiThemeId === 'kerr_claude'
                  ? 'text-[#E08263]'
                  : activeUiThemeId === 'cryo_quantum'
                  ? 'text-sky-400'
                  : 'text-amber-400'
              }`}
            />
            <span>Settings</span>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'songs'
                ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.22)]'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Songs</span>
            {playerState.isPlaying && (
              <span className="text-[9.5px] text-amber-300 font-bold">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'iq_test'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <Atom className="w-3.5 h-3.5 text-cyan-400" />
            <span>IQ Test</span>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'diagnostic'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.22)]'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Diagnostic</span>
            {Object.keys(diagnosticCompletedRuns).length > 0 && (
              <span className="text-[9.5px] text-emerald-300 font-bold">
                • {Object.keys(diagnosticCompletedRuns).length}/{SPACETIME_CURVATURE_STRESS_TESTS.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Modal Body */}
        {activeTab === 'settings' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 text-xs">
          {/* Interface Theme & Color Palette Selector (3 Professional Themes including Kerr Engine Claude Look) */}
          <div
            data-testid="settings-ui-theme-section"
            className={`rounded-xl p-4 space-y-3 border transition-colors ${
              activeUiThemeId === 'kerr_claude'
                ? 'bg-gradient-to-br from-[#191310] via-[#120e0c] to-neutral-950 border-[#D97757]/50 shadow-[0_0_24px_rgba(217,119,87,0.1)]'
                : activeUiThemeId === 'cryo_quantum'
                ? 'bg-gradient-to-br from-[#081326] via-neutral-950 to-neutral-950 border-sky-500/40 shadow-[0_0_24px_rgba(56,189,248,0.1)]'
                : 'bg-neutral-950/90 border-amber-500/35'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold text-[#F7F4EE]">
                <Palette
                  className={`w-3.5 h-3.5 ${
                    activeUiThemeId === 'kerr_claude'
                      ? 'text-[#E08263]'
                      : activeUiThemeId === 'cryo_quantum'
                      ? 'text-sky-400'
                      : 'text-amber-400'
                  }`}
                />
                <span>Interface Theme & Color Architecture</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activeUiThemeOption.badgeClass}`}
              >
                {activeUiThemeOption.badge}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Select a workspace color architecture. Includes the signature <strong className="text-[#F4A688]">Kerr Engine Claude</strong> terracotta &amp; parchment look alongside two precision observatory themes.
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
            className="bg-gradient-to-br from-[#090d1a] via-neutral-950 to-neutral-950 border border-amber-500/40 rounded-xl p-4 space-y-3.5 shadow-[0_0_25px_rgba(245,158,11,0.08)]"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <Terminal className="w-4 h-4 text-[#E08263]" />
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
                      ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/40'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span>{isInlineKerrLogOpen ? 'Hide Log' : `View Log (${kerrEngineLogs.length})`}</span>
                </button>

                {onOpenKerrLogModal && (
                  <button
                    type="button"
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
                  <span>Pre-Load Kerr Engine Terminal</span>
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
                      <Lock className="w-2.5 h-2.5" /> Bypass Requires Ultra ($499/mo)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Executes the <strong className="text-[#F4F1EA]">Kerr Engine [v1.4] (Apex Metric Core)</strong> terminal before any black hole or star loads, streaming exact Boyer-Lindquist metric tensors (<span className="font-mono text-cyan-300">g_μν</span>), Christoffel symbols, ISCO roots, and radiative transfer telemetry. Always active on Standard, Linear, and Advanced tiers — only the flagship <strong className="text-amber-300">Ultra</strong> model unlocks optional terminal bypass.
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
                    : 'Engine is always active. Select the Ultra ($499/mo) tier to unlock engine bypass.'
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

            {/* 4 Flagship Compute Tiers Grid: Standard, Linear, Advanced, Ultra */}
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
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Session Solves: <strong className="text-white">{kerrEngineLogs.length}</strong> · Accrued Compute:{' '}
                  <strong className="text-emerald-300">
                    ${kerrEngineLogs.reduce((acc, r) => acc + r.costUsd, 0).toFixed(3)} USD
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
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold cursor-pointer transition-colors"
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
                className="mt-2 p-3 rounded-xl bg-[#03060c] border border-amber-500/40 space-y-2.5 font-mono text-[10px]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[#E89578] font-bold tracking-wider">
                    <Terminal className="w-3.5 h-3.5" />
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
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
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
                            <span className="text-slate-500 block">SOLVE TIME & COST</span>
                            <strong className="text-emerald-300">
                              {activeLog.totalDurationMs} ms · ${activeLog.costUsd.toFixed(3)}
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
                    Rapid Parameter Adjustment Ripples
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
              <span>Background & Anatomy Behavior</span>
            </div>

            {/* Lock Background When Moving Screen */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Lock Background When Moving Screen
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
                  Toggle Off Singularity When Closing Anatomy Guide
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
                  Always Show Central Singularity
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
              <span>Accretion Disk Style & Relativistic Optics</span>
            </div>

            {/* Accretion State Physical Geometry Toggle (Quiescent vs Active) */}
            {onChangeAccretionState && (
              <div className="pt-1 pb-2 border-b border-neutral-900">
                <div className="text-neutral-100 font-medium text-xs mb-1.5">
                  Accretion State (Physical Geometry)
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
                    <div className="font-semibold text-xs">Quiescent (Razor-Thin)</div>
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
                    <div className="font-semibold text-xs">Active (Volumetric Thick)</div>
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
                    Accretion Shockwave Animation
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
                Accretion Disk Renderer
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
                  <div className="font-semibold text-xs">Classic 3D Disk (Original)</div>
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
                  <div className="font-semibold text-xs">Volumetric Raymarched</div>
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
                  <span>Dynamic Resolution Downscaling</span>
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
                  Naked Spacetime Distortion Intensity (No Accretion Disk)
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
                  Relativistic Camera Motion Blur
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
                  Camera Field of View (FOV)
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
                  Sonic Boom Screen Shake
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
                  Auto-Rotate Camera Mode (Y-Axis Orbit)
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
                  <span className="text-neutral-300 text-[11px]">Auto-Orbit Speed</span>
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
                      Show Performance Monitor (Three.js GPU Diagnostics)
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
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-neutral-900/75 border border-amber-500/40">
                  <div className="space-y-0.5 pr-2">
                    <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Protocol 1987: SN 1987A Triple-Ring & Golden Synth Grid</span>
                    </div>
                    <div className="text-[11px] text-neutral-300 leading-snug">
                      Unleashes the iconic glowing equatorial "Cosmic Pearl Necklace" and twin bipolar hourglass rings of Supernova 1987A, paired with a 1987 Golden-Magenta Cyber Spacetime Manifold and shockwave burst.
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

                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span className="text-amber-300/90">Clearance 1987 Verified</span>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        secret1987Unlocked: false,
                        secret1987Mode: false,
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
        </div>
        )}

        {/* TAB 2: Songs Studio Deck, Web Audio DSP Mastering & Speed Changer */}
        {activeTab === 'songs' && (
          <div
            data-testid="settings-tab-panel-songs"
            className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"
          >
            {/* Flagship Now Playing Studio Deck */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0e0716] via-neutral-950 to-[#070b14] border border-fuchsia-500/45 space-y-3.5 shadow-[0_0_28px_rgba(217,70,239,0.14)]">
              {/* Top Telemetry Bar: Hi-Res DSP Status & Bitrate */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800/80 font-mono text-[10px]">
                <div className="flex items-center gap-1.5 text-fuchsia-300 font-semibold">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>KERR HI-RES STUDIO MASTERING DECK</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
                    {playerState.bitrateDisplay}
                  </span>
                </div>
              </div>

              {/* Artwork, Track Info & Live 16-Band Spectrum Visualizer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-400/60 bg-neutral-900 shrink-0 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.2)]">
                    {playerState.artworkUrl ? (
                      <img
                        src={playerState.artworkUrl}
                        alt={`${playerState.artistName} - ${playerState.trackTitle} cover`}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className={`w-full h-full object-cover ${
                          playerState.isPlaying ? 'scale-105 transition-transform duration-500' : ''
                        }`}
                      />
                    ) : (
                      <Music className="w-6 h-6 text-amber-300" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {activeTrackDef.title} ({activeTrackDef.subtitle})
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        {activeTrackDef.audioQualityBadge || '48kHz Hi-Res'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-fuchsia-300 truncate">
                      {playerState.artistName} ·{' '}
                      <span className="text-amber-200 font-semibold">
                        {Math.round(activeTrackDef.bpm * playerState.playbackRate)} BPM
                      </span>{' '}
                      ({playerState.playbackRate.toFixed(2)}x)
                    </div>
                    {/* Real-Time 16-Band Spectrum Analyzer Strip */}
                    <div
                      data-testid="songs-live-spectrum"
                      className="flex items-end gap-1 h-4 pt-1"
                      aria-label="Real-Time Audio Frequency Spectrum"
                    >
                      {spectrumBands.map((val, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 rounded-t transition-all duration-75 ${
                            playerState.isPlaying
                              ? idx % 3 === 0
                                ? 'bg-amber-400'
                                : idx % 2 === 0
                                ? 'bg-fuchsia-400'
                                : 'bg-cyan-400'
                              : 'bg-neutral-700'
                          }`}
                          style={{ height: `${Math.round(val * 100)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transport Controls: Prev | Play/Pause | Next | Loop */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="jukebox-prev-btn"
                    onClick={() => {
                      haptics.light();
                      trapQueenPlayer.prevTrack();
                    }}
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Previous Track"
                    aria-label="Previous Track"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    data-testid="jukebox-play-pause-btn"
                    onClick={() => {
                      haptics.medium();
                      void trapQueenPlayer.togglePlay();
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap ${
                      playerState.isPlaying
                        ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                        : 'bg-fuchsia-500/25 hover:bg-fuchsia-500/35 text-amber-200 border-fuchsia-400/60'
                    }`}
                  >
                    {playerState.isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Song</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play {activeTrackDef.title}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid="jukebox-next-btn"
                    onClick={() => {
                      haptics.light();
                      trapQueenPlayer.nextTrack();
                    }}
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Next Track"
                    aria-label="Next Track"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    data-testid="jukebox-loop-btn"
                    onClick={() => {
                      haptics.light();
                      trapQueenPlayer.setLoopTrack(!playerState.loopTrack);
                    }}
                    className={`p-2 rounded-lg border font-mono text-[10px] transition-colors cursor-pointer ${
                      playerState.loopTrack
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={playerState.loopTrack ? 'Loop Current Song: ON' : 'Auto-Advance Queue: ON'}
                    aria-label="Toggle Loop Track"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Timeline Scrubber */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-neutral-400 w-9 tabular-nums">
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
                    className="flex-1 accent-fuchsia-400 cursor-pointer h-1.5"
                  />
                  <span className="font-mono text-[10px] text-neutral-400 w-9 text-right tabular-nums">
                    {Math.floor(playerState.duration / 60)}:
                    {Math.floor(playerState.duration % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                </div>

                {/* Song Speed Changer + Pitch Shift / Lock + Volume */}
                <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[10.5px]">
                    <span className="text-amber-300 font-bold">
                      Song Speed Changer: {playerState.playbackRate.toFixed(2)}x
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          trapQueenPlayer.setPreservesPitch(!playerState.preservesPitch)
                        }
                        className={`px-2 py-0.5 rounded border text-[9.5px] font-mono cursor-pointer transition-colors whitespace-nowrap ${
                          !playerState.preservesPitch
                            ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200'
                            : 'bg-neutral-950 border-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                        title="Toggle between vinyl/nightcore pitch shift and constant-pitch time stretch"
                      >
                        {!playerState.preservesPitch ? 'Pitch Shift: ON' : 'Pitch Lock: ON'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={playerState.volume}
                          onChange={(e) =>
                            trapQueenPlayer.setVolume(parseFloat(e.target.value))
                          }
                          aria-label="Song volume"
                          className="w-16 accent-amber-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Continuous Speed Slider (0.50x to 2.00x) */}
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-neutral-500">0.5x</span>
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
                      className="flex-1 accent-amber-400 cursor-pointer h-1.5"
                    />
                    <span className="text-neutral-500">2.0x</span>
                  </div>

                  {/* Quick Speed Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1">
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
                          className={`py-1 px-1.5 rounded border font-mono text-[9.5px] font-semibold transition-colors cursor-pointer text-center whitespace-nowrap ${
                            isRateActive
                              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {preset.label} · {preset.tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Web Audio API Studio Mastering & 3-Band Parametric EQ */}
                <div
                  data-testid="songs-dsp-mastering-panel"
                  className="p-3 rounded-xl bg-neutral-900/90 border border-fuchsia-500/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]">
                    <span className="text-fuchsia-200 font-bold uppercase tracking-wider">
                      Hi-Res Audio Mastering & 3-Band Parametric EQ
                    </span>
                    <span className="text-emerald-300 font-semibold">
                      Bass {playerState.bassDb >= 0 ? `+${playerState.bassDb}` : playerState.bassDb} dB · Mid{' '}
                      {playerState.midDb >= 0 ? `+${playerState.midDb}` : playerState.midDb} dB · Air{' '}
                      {playerState.trebleDb >= 0 ? `+${playerState.trebleDb}` : playerState.trebleDb} dB
                    </span>
                  </div>

                  {/* 4 Mastering Quality Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {AUDIO_QUALITY_PRESETS.map((preset: { id: AudioQualityPresetId; label: string; shortTag: string }) => {
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
                          className={`p-1.5 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                            isPresetActive
                              ? 'bg-fuchsia-500/20 border-fuchsia-400 text-white shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          <div className="text-[9.5px] font-bold truncate">{preset.label}</div>
                          <div className="text-[8.5px] text-amber-300/90 truncate">{preset.shortTag}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 3-Band EQ Sliders: Sub-Bass (85Hz) | Presence (2.4kHz) | Crystal Air (10kHz) */}
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[9.5px]">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                      <div className="flex justify-between text-neutral-300">
                        <span>85Hz Bass</span>
                        <span className="text-amber-300 font-bold">
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
                        className="w-full accent-amber-400 cursor-pointer h-1"
                      />
                    </div>

                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                      <div className="flex justify-between text-neutral-300">
                        <span>2.4kHz Mid</span>
                        <span className="text-fuchsia-300 font-bold">
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
                        className="w-full accent-fuchsia-400 cursor-pointer h-1"
                      />
                    </div>

                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                      <div className="flex justify-between text-neutral-300">
                        <span>10kHz Air</span>
                        <span className="text-cyan-300 font-bold">
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
                        className="w-full accent-cyan-400 cursor-pointer h-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Length Songs Library with Category Filter */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[10.5px] text-neutral-400 px-0.5">
                <span className="uppercase tracking-wider font-semibold text-neutral-200">
                  Full-Length Remastered Songs ({SETTINGS_SONGS_LIST.length} Tracks · 48 kHz Stereo)
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {(['all', 'Hip-Hop / Trap', 'Nightcore', 'Electronic / Alt'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setSongCategoryFilter(cat);
                      }}
                      className={`px-2 py-0.5 rounded border text-[9.5px] font-mono cursor-pointer transition-colors ${
                        songCategoryFilter === cat
                          ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-200 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? `All (${SETTINGS_SONGS_LIST.length})` : cat}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                role="group"
                aria-label="Song Library Selector"
              >
                {SETTINGS_SONGS_LIST.filter(
                  (tr) => songCategoryFilter === 'all' || tr.genreTag === songCategoryFilter
                ).map((track) => {
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
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_14px_rgba(245,158,11,0.2)]'
                          : 'bg-neutral-950/90 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 shrink-0 flex items-center justify-center">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt={`${track.title} (${track.subtitle})`}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-4 h-4 text-amber-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white leading-snug">
                            {track.title}{' '}
                            <span className="font-normal text-amber-300/90">
                              ({track.subtitle})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 truncate mt-0.5">
                            <span className="truncate">{track.artistName}</span>
                            <span>·</span>
                            <span className="text-neutral-300">{track.durationLabel}</span>
                            <span>·</span>
                            <span className="text-emerald-300/90">{track.bpm} BPM</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${
                          isTrackPlaying
                            ? 'bg-amber-400 text-neutral-950 border-amber-300'
                            : isSelected
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {isTrackPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: IQ Test Module (General Relativity & Astrophysics IQ Assessment) */}
        {activeTab === 'iq_test' && (
          <IQTestModule
            uiTheme={activeUiThemeId}
            onHapticLight={() => haptics.light()}
            onHapticMedium={() => haptics.medium()}
            onHapticSuccess={() => haptics.success()}
          />
        )}

        {/* TAB 4: Automated Spacetime Curvature Stress-Test Diagnostic Suite */}
        {activeTab === 'diagnostic' && (() => {
          const completedCount = Object.keys(diagnosticCompletedRuns).length;
          const totalTests = SPACETIME_CURVATURE_STRESS_TESTS.length;
          const isSuiteComplete = completedCount === totalTests && diagnosticRunningIdx === null;
          const activeScenario =
            SPACETIME_CURVATURE_STRESS_TESTS.find((s) => s.id === selectedDiagnosticLogId) ||
            SPACETIME_CURVATURE_STRESS_TESTS[0];
          const activeRunLog = diagnosticCompletedRuns[activeScenario.id];

          const bannerThemeClass =
            activeUiThemeId === 'kerr_claude'
              ? 'bg-gradient-to-br from-[#191310] via-[#120e0c] to-neutral-950 border-[#D97757]/50'
              : activeUiThemeId === 'cryo_quantum'
              ? 'bg-gradient-to-br from-[#071526] via-[#09111e] to-neutral-950 border-sky-500/45'
              : 'bg-gradient-to-br from-emerald-950/35 via-neutral-950 to-neutral-950 border-emerald-500/40';

          return (
            <div
              data-testid="settings-diagnostic-tab-panel"
              className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"
            >
              {/* Automated Stress-Test Telemetry Header */}
              <div className={`rounded-xl border p-4 space-y-3 ${bannerThemeClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-bold text-[#F7F4EE]">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Spacetime Curvature Stress-Test Suite</span>
                      <span
                        data-testid="diagnostic-suite-status-badge"
                        className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                          isSuiteComplete
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                            : 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                        }`}
                      >
                        {isSuiteComplete
                          ? `VERIFIED (${completedCount}/${totalTests} LOGGED)`
                          : `RUNNING (${completedCount}/${totalTests})`}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Automatically sweeps Boyer-Lindquist metric tensors, Bardeen-Press-Teukolsky ISCO roots, ergosphere static limits, and Kretschmann invariants across {totalTests} extreme curvature regimes, persisting all runs directly to{' '}
                      <span className="font-mono text-emerald-300 font-semibold">
                        KerrEngineLogViewer
                      </span>
                      .
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="diagnostic-rerun-suite-btn"
                      onClick={() => {
                        haptics.medium();
                        setDiagnosticSuiteNonce((n) => n + 1);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 font-mono text-[10.5px] font-bold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-Run Stress Suite</span>
                    </button>

                    {onOpenKerrLogModal && (
                      <button
                        type="button"
                        data-testid="diagnostic-open-log-viewer-btn"
                        onClick={() => {
                          haptics.light();
                          onOpenKerrLogModal();
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 font-mono text-[10.5px] font-bold transition-colors cursor-pointer"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>Open KerrEngineLogViewer ({kerrEngineLogs.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Viewport Sync Toggle */}
                <div className="space-y-2 pt-1">
                  <div className="h-1.5 w-full rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-200"
                      style={{
                        width: `${Math.round((completedCount / totalTests) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-400">
                    <span>
                      Solver Tier:{' '}
                      <strong className="text-amber-300 uppercase">
                        {settings.kerrEngineTier || 'ultra'}
                      </strong>{' '}
                      · Saved in KerrEngineLogViewer:{' '}
                      <strong className="text-emerald-300">{kerrEngineLogs.length} runs</strong>
                    </span>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-neutral-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={syncSceneOnDiagnosticRun}
                        onChange={(e) => {
                          haptics.light();
                          setSyncSceneOnDiagnosticRun(e.target.checked);
                        }}
                        className="rounded border-neutral-700 bg-neutral-900 text-emerald-500"
                      />
                      <span>Sync 3D Viewport on Re-Run</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 5 Spacetime Curvature Stress Test Scenario Cards */}
              <div className="space-y-2" data-testid="diagnostic-stress-test-list">
                {SPACETIME_CURVATURE_STRESS_TESTS.map((scenario, idx) => {
                  const runLog = diagnosticCompletedRuns[scenario.id];
                  const isRunningThis = diagnosticRunningIdx === idx;
                  const isSelected = activeScenario.id === scenario.id;

                  return (
                    <div
                      key={scenario.id}
                      data-testid={`diagnostic-stress-card-${scenario.code.toLowerCase()}`}
                      onClick={() => {
                        haptics.light();
                        setSelectedDiagnosticLogId(scenario.id);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/25 border-emerald-400/70 shadow-[0_0_16px_rgba(16,185,129,0.14)]'
                          : 'bg-neutral-950/90 border-neutral-800/90 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 font-mono text-[10px] font-bold text-cyan-300">
                            {scenario.code}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {scenario.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 font-mono text-[9.5px] text-amber-200">
                            {scenario.regimeBadge}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {runLog && onRecordDiagnosticStressTest && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.medium();
                                onRecordDiagnosticStressTest(runLog, scenario.params);
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 font-mono text-[9.5px] cursor-pointer"
                              title="Apply these curvature parameters to the 3D Black Hole scene"
                            >
                              Apply to 3D Scene
                            </button>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[9.5px] font-bold border ${
                              runLog
                                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                                : isRunningThis
                                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 animate-pulse'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                            }`}
                          >
                            {runLog ? 'PASS · LOGGED' : isRunningThis ? 'SOLVING...' : 'QUEUED'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-400 mt-1.5 leading-snug">
                        {scenario.description}
                      </p>

                      {runLog && (
                        <div className="mt-2.5 pt-2 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[10px]">
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">
                              Metric g_tt / g_rr
                            </span>
                            <span className="text-emerald-300 font-semibold">
                              {runLog.summaryMetrics.g_tt.toFixed(4)}
                            </span>{' '}
                            <span className="text-neutral-400">
                              / +{runLog.summaryMetrics.g_rr.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">
                              Frame-Drag g_tφ
                            </span>
                            <span className="text-cyan-300 font-semibold">
                              {runLog.summaryMetrics.g_tphi.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">
                              Horizon / ISCO
                            </span>
                            <span className="text-purple-300 font-semibold">
                              {runLog.summaryMetrics.rPlusRg.toFixed(3)} R_g
                            </span>{' '}
                            <span className="text-neutral-400">
                              / {runLog.summaryMetrics.iscoRg.toFixed(3)} R_g
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">
                              Kretschmann K
                            </span>
                            <span className="text-amber-300 font-semibold">
                              {runLog.summaryMetrics.kretschmann.toExponential(2)} M⁻⁴
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase">
                              ADM Lapse α
                            </span>
                            <span className="text-sky-300 font-semibold">
                              {runLog.summaryMetrics.admLapse.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Embedded KerrEngineLogViewer Inspector for Selected Diagnostic Run */}
              {activeRunLog && (
                <div
                  data-testid="diagnostic-embedded-kerr-log-viewer"
                  className="rounded-xl bg-[#04070e] border border-slate-800 p-3.5 space-y-2.5 font-mono"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-[10.5px]">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-200 font-bold">
                        KerrEngineLogViewer Trace · {activeRunLog.targetName}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400">
                      {activeRunLog.modelCode} · {activeRunLog.totalDurationMs} ms · CONVERGED
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {activeRunLog.steps.map((step) => (
                      <div
                        key={step.id}
                        className="p-2 rounded-lg bg-neutral-950/90 border border-slate-800/80 space-y-1 text-[10px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-cyan-300 font-semibold">
                            STEP {step.stepNumber} [{step.phase}] $ {step.command}
                          </span>
                          <span className="text-emerald-400 shrink-0">{step.residual}</span>
                        </div>
                        <div className="text-amber-200/95 text-[10px] overflow-x-auto">
                          {step.equation}
                        </div>
                        <div className="text-slate-400 text-[9.5px]">{step.logicDecision}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-neutral-800/90 bg-neutral-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                trapQueenPlayer.stopAndReset();
                onUpdateSettings(() => ({ ...DEFAULT_VISUALIZER_SETTINGS }));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.resetSettings}</span>
            </button>

            {onResetPhysics && (
              <button
                type="button"
                onClick={onResetPhysics}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.resetPhysics}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-colors text-xs font-mono font-semibold cursor-pointer"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
