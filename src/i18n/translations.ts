export type AppLanguage = 'en' | 'de' | 'ja' | 'es' | 'zh';

export interface LanguageOption {
  id: AppLanguage;
  name: string;
  nativeName: string;
  badge: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'en', name: 'English (Default)', nativeName: 'English', badge: 'EN' },
  { id: 'de', name: 'German', nativeName: 'Deutsch', badge: 'DE' },
  { id: 'ja', name: 'Japanese', nativeName: '日本語', badge: 'JA' },
  { id: 'es', name: 'Spanish', nativeName: 'Español', badge: 'ES' },
  { id: 'zh', name: 'Chinese', nativeName: '中文 (简体)', badge: 'ZH' },
];

export interface UiTranslations {
  // TopBar
  brandVisualizer: string;
  isolatedSingularity: string;
  isolatedShort: string;
  binaryAccretion: string;
  binaryShort: string;
  hideUi: string;
  showUi: string;
  anatomyGuide: string;
  backgrounds: string;
  realScale: string;
  archetypes: string;
  quickGuide: string;
  metrics: string;
  settings: string;
  exportSnapshot: string;
  recordVideo: string;
  stopRecording: string;

  // Boot & Watermark UI
  bootInitializingTitle: string;
  bootInitializingSubtitle: string;

  // Main HUD & Viewport Prompts
  simulationPaused: string;
  resume: string;
  horizonLabel: string;
  crustLabel: string;
  photosphereLabel: string;
  compareRealSize: string;
  cursorLabel: string;
  singularitySeedPrompt: string;
  pulseButton: string;
  controlsButton: string;

  // Settings Modal Header, Tabs & Footer
  settingsTitle: string;
  settingsSubtitle: string;
  tabSettings: string;
  tabSongs: string;
  tabIqTest: string;
  tabChess: string;
  tabDiagnostic: string;
  tabCode: string;
  resetSettings: string;
  resetPhysics: string;
  done: string;

  // Theme & High-Performance Sections
  uiThemeSectionTitle: string;
  highPerfSectionTitle: string;
  enableHighPerfTitle: string;
  kerrEnginePreloadTitle: string;

  // Language Section in Settings
  languageSectionTitle: string;
  languageSectionDesc: string;

  // Settings Section Titles
  phoneModeSectionTitle: string;
  enablePhoneMode: string;
  touchHapticsTitle: string;
  hapticIntensityTitle: string;
  testPulse: string;
  physicsPresetsSectionTitle: string;
  rapidRipplesTitle: string;
  backgroundAnatomySectionTitle: string;
  lockBackgroundTitle: string;
  syncSingularityTitle: string;
  alwaysShowSingularityTitle: string;
  accretionOpticsSectionTitle: string;
  accretionStateTitle: string;
  quiescentThin: string;
  activeThick: string;
  accretionShockwaveTitle: string;
  accretionRendererTitle: string;
  classicDisk: string;
  volumetricRaymarched: string;
  dynamicResScalingTitle: string;
  webglDepthPeelingTitle: string;
  bloomIntensityTitle: string;
  lensFlareIntensityTitle: string;
  lensFlareIntensityDesc: string;
  nakedDistortionTitle: string;
  cameraMotionBlurTitle: string;
  timeLapseTitle: string;
  timeLapseDesc: string;
  cameraRigSectionTitle: string;
  cameraFovTitle: string;
  sonicBoomShakeTitle: string;
  autoRotateCameraTitle: string;
  autoOrbitSpeedTitle: string;
  hudVisibilitySectionTitle: string;
  focusModeTitle: string;
  leftHudLabel: string;
  overheadRadarLabel: string;
  timeDilationLabel: string;
  cursorReadoutLabel: string;
  eventLogTitle: string;
  eventLogLabel: string;
  metricTelemetryTitle: string;
  showMetricTelemetryTitle: string;
  showMetricTelemetryDesc: string;
  showPerfMonitorTitle: string;
  visibleStatus: string;
  hiddenStatus: string;
  snapshotVideoSectionTitle: string;
  startRecordingBtn: string;
  includeUiPhotoTitle: string;
  includeUiPhotoDesc: string;
  includeUiVideoTitle: string;
  includeUiVideoDesc: string;
  secretVaultLockedTitle: string;
  secretVaultUnlockedTitle: string;
  unlockBtn: string;
  reLockVaultBtn: string;
}

export const TRANSLATIONS: Record<AppLanguage, UiTranslations> = {
  en: {
    brandVisualizer: 'Visualizer',
    isolatedSingularity: 'Isolated Singularity',
    isolatedShort: 'Isolated',
    binaryAccretion: 'Binary Accretion',
    binaryShort: 'Binary',
    hideUi: 'Hide UI',
    showUi: 'Show UI',
    anatomyGuide: 'Anatomy Guide',
    backgrounds: 'Backgrounds',
    realScale: 'Real Scale',
    archetypes: 'Archetypes',
    quickGuide: 'Quick Guide',
    metrics: 'Metrics',
    settings: 'Settings',
    exportSnapshot: 'Export',
    recordVideo: 'Record',
    stopRecording: 'REC',

    bootInitializingTitle: 'INITIALIZING KERR-NEWMAN METRIC CORE...',
    bootInitializingSubtitle: 'Pre-Warming Geodesic Shaders & Covariant Metric Core',

    simulationPaused: 'SIMULATION PAUSED',
    resume: 'Resume',
    horizonLabel: 'Horizon',
    crustLabel: 'Crust',
    photosphereLabel: 'Photosphere',
    compareRealSize: 'Compare Real Size',
    cursorLabel: 'Cursor',
    singularitySeedPrompt: 'Singularity Seed — Tap black hole to expand',
    pulseButton: 'Pulse',
    controlsButton: 'Controls',

    settingsTitle: 'Visualizer Settings & Preferences',
    settingsSubtitle: 'Customize language, camera behavior, Phone Mode layout, spacetime optics & HUD',
    tabSettings: 'Settings',
    tabSongs: 'Songs',
    tabIqTest: 'IQ Test',
    tabChess: 'Chess',
    tabDiagnostic: 'Diagnostic',
    tabCode: 'Code',
    resetSettings: 'Reset Settings',
    resetPhysics: 'Reset Physics',
    done: 'Done',

    uiThemeSectionTitle: 'Interface Theme & Color Architecture',
    highPerfSectionTitle: 'High-Performance Mode (WebGL Depth-Peeling & Telemetry Throttle)',
    enableHighPerfTitle: 'Enable High-Performance Mode',
    kerrEnginePreloadTitle: 'Pre-Load Kerr Engine Terminal',

    languageSectionTitle: 'Language & Localization',
    languageSectionDesc: 'Select your preferred interface language (English is default).',

    phoneModeSectionTitle: 'Phone Mode (Mobile Experience)',
    enablePhoneMode: 'Enable Phone Mode',
    touchHapticsTitle: 'Touch Vibration Haptics',
    hapticIntensityTitle: 'Haptic Feedback Intensity',
    testPulse: 'Test Pulse',
    physicsPresetsSectionTitle: 'Physics Presets (GR Configurations)',
    rapidRipplesTitle: 'Rapid Parameter Adjustment Ripples',
    backgroundAnatomySectionTitle: 'Background & Anatomy Behavior',
    lockBackgroundTitle: 'Lock Background When Moving Screen',
    syncSingularityTitle: 'Toggle Off Singularity When Closing Anatomy Guide',
    alwaysShowSingularityTitle: 'Always Show Central Singularity',
    accretionOpticsSectionTitle: 'Accretion Disk Style & Relativistic Optics',
    accretionStateTitle: 'Accretion State (Physical Geometry)',
    quiescentThin: 'Quiescent (Razor-Thin)',
    activeThick: 'Active (Volumetric Thick)',
    accretionShockwaveTitle: 'Accretion Shockwave Animation',
    accretionRendererTitle: 'Accretion Disk Renderer',
    classicDisk: 'Classic 3D Disk (Original)',
    volumetricRaymarched: 'Volumetric Raymarched',
    dynamicResScalingTitle: 'Dynamic Resolution Downscaling',
    webglDepthPeelingTitle: 'WebGL Depth-Peeling',
    bloomIntensityTitle: 'Bloom Intensity',
    lensFlareIntensityTitle: 'Lens Flare Intensity',
    lensFlareIntensityDesc:
      'Controls the strength of camera-space anamorphic streaks, diffraction starbursts, chromatic aperture ghosts, and grazing-angle lens artifacts when viewing the star or black hole from different angles.',
    nakedDistortionTitle: 'Naked Spacetime Distortion Intensity (No Accretion Disk)',
    cameraMotionBlurTitle: 'Relativistic Camera Motion Blur',
    timeLapseTitle: 'Time Lapse (Long-Exposure Astrophotography)',
    timeLapseDesc:
      'Automatically accumulates accretion disk emission intensity and integrates temporal light frames over time to capture glowing high-velocity orbital star and geodesic trails.',
    cameraRigSectionTitle: 'Camera & Orbital Rig',
    cameraFovTitle: 'Camera Field of View (FOV)',
    sonicBoomShakeTitle: 'Sonic Boom Screen Shake',
    autoRotateCameraTitle: 'Auto-Rotate Camera Mode (Y-Axis Orbit)',
    autoOrbitSpeedTitle: 'Auto-Orbit Speed',
    hudVisibilitySectionTitle: 'HUD & Telemetry Visibility',
    focusModeTitle: 'Focus Mode (Cinematic Immersion)',
    leftHudLabel: 'Left HUD',
    overheadRadarLabel: 'Overhead Radar',
    timeDilationLabel: 'Time Dilation',
    cursorReadoutLabel: 'Cursor Readout',
    eventLogTitle: 'Astrophysical Event Log',
    eventLogLabel: 'Event Log',
    metricTelemetryTitle: 'Metric Tensor Telemetry',
    showMetricTelemetryTitle: 'Show Metric Telemetry',
    showMetricTelemetryDesc:
      'Displays a real-time Boyer-Lindquist spacetime metric tensor (g_μν) evolution graph, ADM lapse readout, and Kretschmann curvature scalar overlay for advanced users.',
    showPerfMonitorTitle: 'Show Performance Monitor (Three.js GPU Diagnostics)',
    visibleStatus: 'Visible',
    hiddenStatus: 'Hidden',
    snapshotVideoSectionTitle: 'Snapshot & Video Recording',
    startRecordingBtn: 'Start Recording',
    includeUiPhotoTitle: 'Include UI Elements in Photo Export',
    includeUiPhotoDesc: 'Composites the top bar, HUD metrics, and bottom dock into exported PNG snapshots.',
    includeUiVideoTitle: 'Include UI Elements in Video Recording',
    includeUiVideoDesc: 'Composites the live interface and telemetry HUD over the 60fps 3D scene when recording videos.',
    secretVaultLockedTitle: 'Super Secret Setting (Password Protected)',
    secretVaultUnlockedTitle: 'Classified Vault // Protocol 1987',
    unlockBtn: 'Unlock',
    reLockVaultBtn: 'Re-Lock Vault',
  },

  de: {
    brandVisualizer: 'Visualisierer',
    isolatedSingularity: 'Isolierte Singularität',
    isolatedShort: 'Isoliert',
    binaryAccretion: 'Binäre Akkretion',
    binaryShort: 'Binär',
    hideUi: 'UI ausblenden',
    showUi: 'UI anzeigen',
    anatomyGuide: 'Anatomie-Führer',
    backgrounds: 'Hintergründe',
    realScale: 'Realer Maßstab',
    archetypes: 'Archetypen',
    quickGuide: 'Kurzanleitung',
    metrics: 'Metriken',
    settings: 'Einstellungen',
    exportSnapshot: 'Exportieren',
    recordVideo: 'Aufnehmen',
    stopRecording: 'AUFN',

    bootInitializingTitle: 'KERR-NEWMAN-METRIK-KERN WIRD INITIALISIERT...',
    bootInitializingSubtitle: 'Geodäten-Shader & Kovarianter Metrik-Kern werden vorbereitet',

    simulationPaused: 'SIMULATION PAUSIERT',
    resume: 'Fortsetzen',
    horizonLabel: 'Horizont',
    crustLabel: 'Kruste',
    photosphereLabel: 'Photosphäre',
    compareRealSize: 'Wahre Größe vergleichen',
    cursorLabel: 'Cursor',
    singularitySeedPrompt: 'Singularitätskern — Tippen zum Entfalten',
    pulseButton: 'Impuls',
    controlsButton: 'Steuerung',

    settingsTitle: 'Visualisierer-Einstellungen & Präferenzen',
    settingsSubtitle: 'Sprache, Kameraverhalten, Smartphone-Modus, Raumzeit-Optik & HUD anpassen',
    tabSettings: 'Einstellungen',
    tabSongs: 'Musik',
    tabIqTest: 'IQ-Test',
    tabChess: 'Schach',
    tabDiagnostic: 'Diagnose',
    tabCode: 'Quellcode',
    resetSettings: 'Einstellungen zurücksetzen',
    resetPhysics: 'Physik zurücksetzen',
    done: 'Fertig',

    uiThemeSectionTitle: 'Oberflächen-Design & Farbarchitektur',
    highPerfSectionTitle: 'Hochleistungsmodus (WebGL Depth-Peeling & Telemetrie-Drosselung)',
    enableHighPerfTitle: 'Hochleistungsmodus aktivieren',
    kerrEnginePreloadTitle: 'Kerr-Engine-Terminal vorladen',

    languageSectionTitle: 'Sprache & Lokalisierung',
    languageSectionDesc: 'Wählen Sie Ihre bevorzugte Oberflächensprache (Englisch ist Standard).',

    phoneModeSectionTitle: 'Smartphone-Modus (Mobile Ansicht)',
    enablePhoneMode: 'Smartphone-Modus aktivieren',
    touchHapticsTitle: 'Vibrations-Haptik bei Berührung',
    hapticIntensityTitle: 'Intensität des haptischen Feedbacks',
    testPulse: 'Test-Impuls',
    physicsPresetsSectionTitle: 'Physik-Voreinstellungen (ART-Konfigurationen)',
    rapidRipplesTitle: 'Gravitationswellen bei schneller Parameteränderung',
    backgroundAnatomySectionTitle: 'Hintergrund- & Anatomie-Verhalten',
    lockBackgroundTitle: 'Hintergrund beim Kameraschwenk fixieren',
    syncSingularityTitle: 'Singularität beim Schließen des Anatomie-Führers ausblenden',
    alwaysShowSingularityTitle: 'Zentrale Singularität immer anzeigen',
    accretionOpticsSectionTitle: 'Akkretionsscheiben-Stil & Relativistische Optik',
    accretionStateTitle: 'Akkretionszustand (Physische Geometrie)',
    quiescentThin: 'Ruhig (Rasiermesserdünn)',
    activeThick: 'Aktiv (Volumetrisch Dick)',
    accretionShockwaveTitle: 'Akkretions-Stoßwellen-Animation',
    accretionRendererTitle: 'Akkretionsscheiben-Renderer',
    classicDisk: 'Klassische 3D-Scheibe (Original)',
    volumetricRaymarched: 'Volumetrisches Raymarching',
    dynamicResScalingTitle: 'Dynamische Auflösungsskalierung',
    webglDepthPeelingTitle: 'WebGL Depth-Peeling (Tiefenschichtung)',
    bloomIntensityTitle: 'Leuchtintensität (Bloom)',
    lensFlareIntensityTitle: 'Linsenreflexions-Intensität (Lens Flare)',
    lensFlareIntensityDesc:
      'Steuert die Stärke der kameraseitigen anamorphotischen Streifen, Beugungssterne und chromatischen Blendenreflexe beim Betrachten des Sterns oder Schwarzen Lochs aus verschiedenen Winkeln.',
    nakedDistortionTitle: 'Reine Raumzeit-Verzerrung (Ohne Akkretionsscheibe)',
    cameraMotionBlurTitle: 'Relativistische Kamerabewegungsunschärfe',
    timeLapseTitle: 'Zeitraffer (Langzeitbelichtungs-Astrofotografie)',
    timeLapseDesc:
      'Akkumuliert automatisch die Emissionsintensität der Akkretionsscheibe über die Zeit, um schnelle Orbitspuren von Sternen und Geodäten als Langzeitbelichtung einzufangen.',
    cameraRigSectionTitle: 'Kamera & Orbital-Rig',
    cameraFovTitle: 'Kamera-Sichtfeld (FOV)',
    sonicBoomShakeTitle: 'Überschallknall-Kamerabeben',
    autoRotateCameraTitle: 'Automatische Kameradrehung (Y-Achsen-Orbit)',
    autoOrbitSpeedTitle: 'Orbit-Geschwindigkeit',
    hudVisibilitySectionTitle: 'HUD- & Telemetrie-Sichtbarkeit',
    focusModeTitle: 'Fokus-Modus (Kinoreife Immersion)',
    leftHudLabel: 'Linkes HUD',
    overheadRadarLabel: 'Orbital-Radar',
    timeDilationLabel: 'Zeitdilatation',
    cursorReadoutLabel: 'Cursor-Anzeige',
    eventLogTitle: 'Astrophysikalisches Ereignisprotokoll',
    eventLogLabel: 'Ereignisprotokoll',
    metricTelemetryTitle: 'Metriktensor-Telemetrie',
    showMetricTelemetryTitle: 'Metriktensor-Telemetrie anzeigen',
    showMetricTelemetryDesc:
      'Zeigt ein Echtzeit-Diagramm der Raumzeit-Metriktensor-Entwicklung (g_μν), ADM-Lapse und Kretschmann-Krümmungsinvariante für fortgeschrittene Nutzer.',
    showPerfMonitorTitle: 'Leistungsmonitor anzeigen (Three.js GPU-Diagnose)',
    visibleStatus: 'Sichtbar',
    hiddenStatus: 'Versteckt',
    snapshotVideoSectionTitle: 'Schnappschuss & Videoaufnahme',
    startRecordingBtn: 'Aufnahme starten',
    includeUiPhotoTitle: 'UI-Elemente im Foto-Export einbinden',
    includeUiPhotoDesc: 'Bindet Kopfleiste, HUD-Telemetrie und Steuerdock in exportierte PNG-Bilder ein.',
    includeUiVideoTitle: 'UI-Elemente in Videoaufnahme einbinden',
    includeUiVideoDesc: 'Überlagert die 60fps-3D-Szene bei Videoaufnahmen mit der Live-Benutzeroberfläche.',
    secretVaultLockedTitle: 'Supergeheime Einstellung (Passwortgeschützt)',
    secretVaultUnlockedTitle: 'Geheimtresor // Protokoll 1987',
    unlockBtn: 'Entsperren',
    reLockVaultBtn: 'Tresor sperren',
  },

  ja: {
    brandVisualizer: 'ビジュアライザー',
    isolatedSingularity: '孤立特異点',
    isolatedShort: '孤立系',
    binaryAccretion: '連星降着系',
    binaryShort: '連星系',
    hideUi: 'UIを隠す',
    showUi: 'UIを表示',
    anatomyGuide: '構造ガイド',
    backgrounds: '背景テーマ',
    realScale: '実寸スケール',
    archetypes: '天体分類',
    quickGuide: '入門ガイド',
    metrics: '時空計量',
    settings: '設定',
    exportSnapshot: '画像保存',
    recordVideo: '録画',
    stopRecording: '録画中',

    bootInitializingTitle: 'KERR-NEWMAN 計量コアを初期化中...',
    bootInitializingSubtitle: '測地線シェーダー＆共変計量コアをプリウォーム中',

    simulationPaused: 'シミュレーション一時停止中',
    resume: '再開',
    horizonLabel: '事象の地平面',
    crustLabel: '地殻半径',
    photosphereLabel: '光球半径',
    compareRealSize: '実際のサイズを比較',
    cursorLabel: 'カーソル',
    singularitySeedPrompt: '特異点シード — タップしてブラックホールを展開',
    pulseButton: '衝撃波',
    controlsButton: 'コントロール',

    settingsTitle: 'ビジュアライザー設定・環境設定',
    settingsSubtitle: '言語、カメラ動作、スマホモード、時空レンズ光学、HUD表示をカスタマイズ',
    tabSettings: '設定',
    tabSongs: '音楽',
    tabIqTest: 'IQテスト',
    tabChess: 'チェス',
    tabDiagnostic: '診断スイート',
    tabCode: 'コード',
    resetSettings: '設定をリセット',
    resetPhysics: '物理パラメータを初期化',
    done: '完了',

    uiThemeSectionTitle: 'インターフェーステーマ＆色彩設計',
    highPerfSectionTitle: 'ハイパフォーマンス・モード（WebGL深度ピーリング＆テレメトリ制御）',
    enableHighPerfTitle: 'ハイパフォーマンス・モードを有効化',
    kerrEnginePreloadTitle: 'Kerr Engine ターミナルのプリロード',

    languageSectionTitle: '言語設定 (Language)',
    languageSectionDesc: 'インターフェースの表示言語を選択してください（デフォルトは英語）。',

    phoneModeSectionTitle: 'スマホモード（モバイル最適化）',
    enablePhoneMode: 'スマホモードを有効化',
    touchHapticsTitle: 'タッチ振動フィードバック（ハプティクス）',
    hapticIntensityTitle: '触覚フィードバックの強度',
    testPulse: '振動テスト',
    physicsPresetsSectionTitle: '物理プリセット（一般相対論メトリック）',
    rapidRipplesTitle: 'パラメータ急変時の重力波リップル',
    backgroundAnatomySectionTitle: '背景と構造ガイドの動作',
    lockBackgroundTitle: '視点移動時に背景の星空を固定',
    syncSingularityTitle: '構造ガイド終了時に特異点を非表示にする',
    alwaysShowSingularityTitle: '中心の特異点を常に表示',
    accretionOpticsSectionTitle: '降着円盤スタイル＆相対論的光学',
    accretionStateTitle: '降着状態（物理ジオメトリ）',
    quiescentThin: '静穏期（極薄円盤）',
    activeThick: '活動期（立体トーラス）',
    accretionShockwaveTitle: '降着ショックウェーブ・アニメーション',
    accretionRendererTitle: '降着円盤レンダラー',
    classicDisk: 'クラシック3D円盤（標準）',
    volumetricRaymarched: 'ボリューメトリック・レイマーチング',
    dynamicResScalingTitle: '動的解像度ダウンスケーリング',
    webglDepthPeelingTitle: 'WebGL デプス・ピーリング（深度カリング）',
    bloomIntensityTitle: 'ブルーム（発光）強度',
    lensFlareIntensityTitle: 'レンズフレア強度',
    lensFlareIntensityDesc:
      'ブラックホールや恒星をさまざまな角度から観測した際に発生する、カメラ空間のアナモルフィック光条、回折スパイク、色収差ゴーストの強度を制御します。',
    nakedDistortionTitle: '裸の時空歪曲強度（降着円盤オフ時）',
    cameraMotionBlurTitle: '相対論的カメラモーションブラー',
    timeLapseTitle: 'タイムラプス（長時間露光天体写真）',
    timeLapseDesc:
      '時間の経過とともに降着円盤の発光強度を蓄積し、高速周回する恒星や光子の軌道トレイルを長時間露光のように描画します。',
    cameraRigSectionTitle: 'カメラ＆軌道リグ',
    cameraFovTitle: 'カメラ視野角 (FOV)',
    sonicBoomShakeTitle: '衝撃波カメラシェイク',
    autoRotateCameraTitle: 'カメラ自動回転モード（Y軸周回）',
    autoOrbitSpeedTitle: '自動回転スピード',
    hudVisibilitySectionTitle: 'HUD＆テレメトリ表示切り替え',
    focusModeTitle: 'フォーカスモード（シネマティック没入表示）',
    leftHudLabel: '左パネルHUD',
    overheadRadarLabel: '軌道レーダー',
    timeDilationLabel: '時間の遅れ',
    cursorReadoutLabel: 'カーソル計測',
    eventLogTitle: '天体物理イベントログ',
    eventLogLabel: 'イベントログ',
    metricTelemetryTitle: '時空計量テンソル・テレメトリ',
    showMetricTelemetryTitle: '計量テンソル波形を表示',
    showMetricTelemetryDesc:
      '上級ユーザー向けに、ボイヤー・リンキスト座標系における時空計量テンソル (g_μν) のリアルタイム時間発展グラフとクレッチマン曲率不変量をオーバーレイ表示します。',
    showPerfMonitorTitle: 'パフォーマンスモニターを表示（Three.js GPU診断）',
    visibleStatus: '表示中',
    hiddenStatus: '非表示',
    snapshotVideoSectionTitle: 'スナップショット＆動画録画',
    startRecordingBtn: '録画開始',
    includeUiPhotoTitle: '写真保存時にUI要素を含める',
    includeUiPhotoDesc: 'PNGスナップショット出力に上部バー、HUD、下部ドックを合成します。',
    includeUiVideoTitle: '動画録画時にUI要素を含める',
    includeUiVideoDesc: '60fpsの3D映像の上にライブUIオーバーレイを合成して録画します。',
    secretVaultLockedTitle: '超極秘設定（パスワード保護）',
    secretVaultUnlockedTitle: '機密ヴォールト // プロトコル 1987',
    unlockBtn: 'ロック解除',
    reLockVaultBtn: '再ロック',
  },

  es: {
    brandVisualizer: 'Visualizador',
    isolatedSingularity: 'Singularidad Aislada',
    isolatedShort: 'Aislado',
    binaryAccretion: 'Acreción Binaria',
    binaryShort: 'Binario',
    hideUi: 'Ocultar UI',
    showUi: 'Mostrar UI',
    anatomyGuide: 'Guía Anatómica',
    backgrounds: 'Fondos',
    realScale: 'Escala Real',
    archetypes: 'Arquetipos',
    quickGuide: 'Guía Rápida',
    metrics: 'Métricas',
    settings: 'Ajustes',
    exportSnapshot: 'Exportar',
    recordVideo: 'Grabar',
    stopRecording: 'GRAB',

    bootInitializingTitle: 'INICIALIZANDO NÚCLEO MÉTRICO KERR-NEWMAN...',
    bootInitializingSubtitle: 'Precalentando Shaders Geodésicos y Núcleo Métrico Covariante',

    simulationPaused: 'SIMULACIÓN EN PAUSA',
    resume: 'Reanudar',
    horizonLabel: 'Horizonte',
    crustLabel: 'Corteza',
    photosphereLabel: 'Fotosfera',
    compareRealSize: 'Comparar Tamaño Real',
    cursorLabel: 'Cursor',
    singularitySeedPrompt: 'Semilla de Singularidad — Toca para expandir',
    pulseButton: 'Pulso',
    controlsButton: 'Controles',

    settingsTitle: 'Ajustes y Preferencias del Visualizador',
    settingsSubtitle: 'Personaliza el idioma, cámara, Modo Teléfono, óptica del espacio-tiempo y HUD',
    tabSettings: 'Ajustes',
    tabSongs: 'Música',
    tabIqTest: 'Test de CI',
    tabChess: 'Ajedrez',
    tabDiagnostic: 'Diagnóstico',
    tabCode: 'Código',
    resetSettings: 'Restablecer Ajustes',
    resetPhysics: 'Restablecer Física',
    done: 'Listo',

    uiThemeSectionTitle: 'Tema de Interfaz y Arquitectura de Color',
    highPerfSectionTitle: 'Modo de Alto Rendimiento (WebGL Depth-Peeling y Telemetría)',
    enableHighPerfTitle: 'Activar Modo de Alto Rendimiento',
    kerrEnginePreloadTitle: 'Precargar Terminal del Motor Kerr',

    languageSectionTitle: 'Idioma y Localización',
    languageSectionDesc: 'Selecciona el idioma de la interfaz (Inglés por defecto).',

    phoneModeSectionTitle: 'Modo Teléfono (Experiencia Móvil)',
    enablePhoneMode: 'Activar Modo Teléfono',
    touchHapticsTitle: 'Vibración Háptica Táctil',
    hapticIntensityTitle: 'Intensidad de Respuesta Háptica',
    testPulse: 'Probar Pulso',
    physicsPresetsSectionTitle: 'Ajustes Físicos (Métricas de Relatividad General)',
    rapidRipplesTitle: 'Ondas por Ajuste Rápido de Parámetros',
    backgroundAnatomySectionTitle: 'Comportamiento del Fondo y Anatomía',
    lockBackgroundTitle: 'Bloquear Fondo al Mover la Cámara',
    syncSingularityTitle: 'Ocultar Singularidad al Cerrar la Guía Anatómica',
    alwaysShowSingularityTitle: 'Mostrar Siempre la Singularidad Central',
    accretionOpticsSectionTitle: 'Estilo del Disco de Acreción y Óptica Relativista',
    accretionStateTitle: 'Estado de Acreción (Geometría Física)',
    quiescentThin: 'Quiescente (Ultradelgado)',
    activeThick: 'Activo (Toro Volumétrico)',
    accretionShockwaveTitle: 'Animación de Onda de Choque de Acreción',
    accretionRendererTitle: 'Renderizador del Disco de Acreción',
    classicDisk: 'Disco 3D Clásico (Original)',
    volumetricRaymarched: 'Raymarching Volumétrico',
    dynamicResScalingTitle: 'Escalado Dinámico de Resolución',
    webglDepthPeelingTitle: 'WebGL Depth-Peeling (Capas de Profundidad)',
    bloomIntensityTitle: 'Intensidad de Resplandor (Bloom)',
    lensFlareIntensityTitle: 'Intensidad de Destello de Lente (Lens Flare)',
    lensFlareIntensityDesc:
      'Controla la intensidad de los destellos anamórficos en el espacio de cámara, picos de difracción y reflejos ópticos cromáticos al observar la estrella o el agujero negro desde distintos ángulos.',
    nakedDistortionTitle: 'Distorsión del Espacio-Tiempo Desnudo (Sin Disco)',
    cameraMotionBlurTitle: 'Desenfoque de Movimiento Relativista',
    timeLapseTitle: 'Time Lapse (Astrofotografía de Larga Exposición)',
    timeLapseDesc:
      'Acumula automáticamente la intensidad de emisión del disco de acreción con el tiempo para capturar estelas orbitales de alta velocidad.',
    cameraRigSectionTitle: 'Cámara y Plataforma Orbital',
    cameraFovTitle: 'Campo de Visión de la Cámara (FOV)',
    sonicBoomShakeTitle: 'Vibración de Pantalla por Explosión Sónica',
    autoRotateCameraTitle: 'Rotación Automática de Cámara (Órbita Eje Y)',
    autoOrbitSpeedTitle: 'Velocidad de Auto-Órbita',
    hudVisibilitySectionTitle: 'Visibilidad de HUD y Telemetría',
    focusModeTitle: 'Modo Enfoque (Inmersión Cinematográfica)',
    leftHudLabel: 'HUD Izquierdo',
    overheadRadarLabel: 'Radar Orbital',
    timeDilationLabel: 'Dilatación Temporal',
    cursorReadoutLabel: 'Lectura del Cursor',
    eventLogTitle: 'Registro de Eventos Astrofísicos',
    eventLogLabel: 'Registro de Eventos',
    metricTelemetryTitle: 'Telemetría del Tensor Métrico',
    showMetricTelemetryTitle: 'Mostrar Telemetría del Tensor Métrico',
    showMetricTelemetryDesc:
      'Muestra un gráfico en tiempo real de la evolución del tensor métrico del espacio-tiempo (g_μν) y el escalar de curvatura de Kretschmann para usuarios avanzados.',
    showPerfMonitorTitle: 'Mostrar Monitor de Rendimiento (Diagnóstico GPU Three.js)',
    visibleStatus: 'Visible',
    hiddenStatus: 'Oculto',
    snapshotVideoSectionTitle: 'Capturas y Grabación de Video',
    startRecordingBtn: 'Iniciar Grabación',
    includeUiPhotoTitle: 'Incluir Elementos UI en Fotos',
    includeUiPhotoDesc: 'Superpone la barra superior, telemetría HUD y panel inferior en las capturas PNG.',
    includeUiVideoTitle: 'Incluir Elementos UI en Grabación de Video',
    includeUiVideoDesc: 'Superpone la interfaz en vivo sobre la escena 3D a 60fps durante la grabación de video.',
    secretVaultLockedTitle: 'Ajuste Súper Secreto (Protegido con Contraseña)',
    secretVaultUnlockedTitle: 'Bóveda Clasificada // Protocolo 1987',
    unlockBtn: 'Desbloquear',
    reLockVaultBtn: 'Bloquear Bóveda',
  },

  zh: {
    brandVisualizer: '可视化引擎',
    isolatedSingularity: '孤立奇点系统',
    isolatedShort: '孤立系',
    binaryAccretion: '双星吸积系统',
    binaryShort: '双星系',
    hideUi: '隐藏界面',
    showUi: '显示界面',
    anatomyGuide: '结构图解',
    backgrounds: '星系背景',
    realScale: '真实尺度',
    archetypes: '天体图鉴',
    quickGuide: '物理速览',
    metrics: '时空度规',
    settings: '设置',
    exportSnapshot: '导出截图',
    recordVideo: '录制视频',
    stopRecording: '录制中',

    bootInitializingTitle: '正在初始化 KERR-NEWMAN 度规核心...',
    bootInitializingSubtitle: '正在预热测地线着色器与协变度规核心',

    simulationPaused: '模拟已暂停',
    resume: '继续运行',
    horizonLabel: '事件视界',
    crustLabel: '星壳直径',
    photosphereLabel: '光球直径',
    compareRealSize: '对比真实宇宙尺度',
    cursorLabel: '光标测算',
    singularitySeedPrompt: '奇点核心 — 点击黑洞展开时空',
    pulseButton: '冲击波',
    controlsButton: '控制台',

    settingsTitle: '可视化设置与偏好',
    settingsSubtitle: '自定义界面语言、相机轨道、手机模式布局、相对论光学与 HUD 遥测面板',
    tabSettings: '设置',
    tabSongs: '音乐库',
    tabIqTest: '智商测试',
    tabChess: '国际象棋',
    tabDiagnostic: '曲率诊断',
    tabCode: '代码库',
    resetSettings: '重置设置',
    resetPhysics: '重置物理参数',
    done: '完成',

    uiThemeSectionTitle: '界面主题与色彩架构',
    highPerfSectionTitle: '高性能模式（WebGL 深度剥离与遥测节流）',
    enableHighPerfTitle: '启用高性能模式',
    kerrEnginePreloadTitle: '预加载克尔相对论计算终端',

    languageSectionTitle: '语言与多语种支持 (Language)',
    languageSectionDesc: '选择您的界面显示语言（默认为英语 English）。',

    phoneModeSectionTitle: '手机模式（移动端触控优化）',
    enablePhoneMode: '启用手机模式',
    touchHapticsTitle: '触控振动反馈 (Haptics)',
    hapticIntensityTitle: '触控振动反馈强度',
    testPulse: '测试振动',
    physicsPresetsSectionTitle: '广义相对论物理预设 (GR Configurations)',
    rapidRipplesTitle: '参数快速调节引力波涟漪',
    backgroundAnatomySectionTitle: '背景锁定与奇点图解行为',
    lockBackgroundTitle: '旋转视角时锁定星空背景',
    syncSingularityTitle: '关闭结构图解时自动隐藏中心奇点',
    alwaysShowSingularityTitle: '始终显示中心克尔环奇点',
    accretionOpticsSectionTitle: '吸积盘渲染风格与相对论光学',
    accretionStateTitle: '吸积态物理几何',
    quiescentThin: '宁静态（极薄赤道盘）',
    activeThick: '活跃态（体渲染厚环）',
    accretionShockwaveTitle: '吸积率激波爆发动画',
    accretionRendererTitle: '吸积盘渲染引擎',
    classicDisk: '经典 3D 吸积盘（原版）',
    volumetricRaymarched: '体光线步进渲染 (Raymarched)',
    dynamicResScalingTitle: '动态分辨率降采样',
    webglDepthPeelingTitle: 'WebGL 深度剥离 (Depth-Peeling)',
    bloomIntensityTitle: '辉光强度 (Bloom)',
    lensFlareIntensityTitle: '镜头眩光强度 (Lens Flare)',
    lensFlareIntensityDesc:
      '控制从不同视角观测恒星或黑洞时，相机空间变形宽银幕光斑、衍射星芒与色散光圈重影的伪影强度。',
    nakedDistortionTitle: '裸奇点时空引力透镜强度（关闭吸积盘时）',
    cameraMotionBlurTitle: '相对论相机动态模糊',
    timeLapseTitle: '延时摄影（长曝光深空天体摄影）',
    timeLapseDesc:
      '随时间自动累积吸积盘辐射强度并融合多帧光迹，模拟长曝光深空摄影以捕捉高速轨道恒星与光子测地线轨迹。',
    cameraRigSectionTitle: '相机视野与自动轨道',
    cameraFovTitle: '相机视场角 (FOV)',
    sonicBoomShakeTitle: '音爆冲击波屏幕震动',
    autoRotateCameraTitle: '相机自动环绕模式（Y轴轨道）',
    autoOrbitSpeedTitle: '自动环绕速度',
    hudVisibilitySectionTitle: 'HUD 与遥测面板显示控制',
    focusModeTitle: '专注模式（电影级沉浸视图）',
    leftHudLabel: '左侧信息栏',
    overheadRadarLabel: '俯视轨道雷达',
    timeDilationLabel: '引力时间膨胀',
    cursorReadoutLabel: '光标实时读数',
    eventLogTitle: '天体物理事件日志',
    eventLogLabel: '事件日志',
    metricTelemetryTitle: '时空度规张量遥测',
    showMetricTelemetryTitle: '显示度规张量遥测图',
    showMetricTelemetryDesc:
      '为高级用户叠加实时博耶-林德奎斯特时空度规张量 (g_μν) 演化波形图、ADM 流逝函数与克雷奇曼曲率标量读数。',
    showPerfMonitorTitle: '显示性能监控面板（Three.js GPU 诊断）',
    visibleStatus: '显示',
    hiddenStatus: '隐藏',
    snapshotVideoSectionTitle: '截图导出与视频录制',
    startRecordingBtn: '开始录制',
    includeUiPhotoTitle: '截图导出时包含 UI 界面元素',
    includeUiPhotoDesc: '启用后，导出的 PNG 截图将合成顶部导航栏、HUD 遥测数据与底部控制坞。',
    includeUiVideoTitle: '视频录制时包含 UI 界面元素',
    includeUiVideoDesc: '启用后，在 60fps 3D 视频录制中实时合成 HUD 与界面叠加层。',
    secretVaultLockedTitle: '超机密隐藏设置（密码保护）',
    secretVaultUnlockedTitle: '机密档案室 // 1987 协议',
    unlockBtn: '解锁',
    reLockVaultBtn: '重新锁定',
  },
};
