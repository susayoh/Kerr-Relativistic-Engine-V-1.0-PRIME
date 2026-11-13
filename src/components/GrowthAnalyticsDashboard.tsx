import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  Activity,
  Award,
  Clock,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Gauge,
  Layers,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import {
  GARDNER_INTELLIGENCES,
  GARDNER_INTELLIGENCE_MAP,
  type GardnerIntelligenceId,
} from './iqQuestionBank';
import {
  computeGrowthAnalyticsSummaries,
  type GrowthSessionSnapshot,
  type PostTestTelemetryReportData,
} from './iqTelemetryEngine';

export interface GrowthAnalyticsDashboardProps {
  history: GrowthSessionSnapshot[];
  onRecordSimulatedOrLiveRun: () => void;
  onResetGrowthHistory: () => void;
  onHapticLight?: () => void;
  onHapticSuccess?: () => void;
}

export const GrowthAnalyticsDashboard: React.FC<GrowthAnalyticsDashboardProps> = ({
  history,
  onRecordSimulatedOrLiveRun,
  onResetGrowthHistory,
  onHapticLight,
  onHapticSuccess,
}) => {
  const [focusedDomain, setFocusedDomain] = useState<
    'all' | 'focus_shift' | 'composite_iq' | GardnerIntelligenceId
  >('all');
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(() =>
    Math.max(0, history.length - 1)
  );
  const [expandedDomainId, setExpandedDomainId] = useState<GardnerIntelligenceId | null>(null);
  const [hasCopiedGrowth, setHasCopiedGrowth] = useState<boolean>(false);

  const safeSessionIdx = Math.min(selectedSessionIdx, Math.max(0, history.length - 1));
  const inspectedSession = history[safeSessionIdx] || history[history.length - 1];

  const domainSummaries = useMemo(
    () => computeGrowthAnalyticsSummaries(history),
    [history]
  );

  const mostImprovedDomain = useMemo(() => {
    return [...domainSummaries].sort((a, b) => b.deltaScore - a.deltaScore)[0];
  }, [domainSummaries]);

  const currentFocusLeader = useMemo(() => {
    return [...domainSummaries].sort((a, b) => b.latestScore - a.latestScore)[0];
  }, [domainSummaries]);

  const firstSession = history[0];
  const latestSession = history[history.length - 1];
  const iqDelta =
    latestSession && firstSession
      ? latestSession.compositeIq - firstSession.compositeIq
      : 0;

  // D3.js Coordinate & Path Geometry Calculations
  const chartWidth = 780;
  const chartHeight = 300;
  const margin = { top: 26, right: 34, bottom: 40, left: 50 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const d3ChartGeometry = useMemo(() => {
    const labels = history.map((s) => s.sessionLabel);
    const xScale = d3
      .scalePoint<string>()
      .domain(labels)
      .range([0, innerWidth])
      .padding(0.15);

    const isIqMode = focusedDomain === 'composite_iq';
    const isShiftMode = focusedDomain === 'focus_shift';
    const yMin = isIqMode ? 95 : isShiftMode ? -10 : 40;
    const yMax = isIqMode ? 160 : isShiftMode ? 35 : 100;

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);
    const yTicks = yScale.ticks(5);

    const lineGenerator = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3
      .area<{ x: number; y: number }>()
      .x((d) => d.x)
      .y0(isShiftMode ? yScale(0) : innerHeight)
      .y1((d) => d.y)
      .curve(d3.curveMonotoneX);

    const baselineSnap = history[0];

    const domainLines = GARDNER_INTELLIGENCES.map((meta) => {
      const baseVal = baselineSnap?.domainScores[meta.id] ?? 60;
      const points = history.map((snap) => {
        const rawScore = snap.domainScores[meta.id] ?? 60;
        const plottedValue = isShiftMode ? rawScore - baseVal : rawScore;
        return {
          x: xScale(snap.sessionLabel) ?? 0,
          y: yScale(plottedValue),
          rawValue: rawScore,
          deltaValue: rawScore - baseVal,
          plottedValue,
          sessionLabel: snap.sessionLabel,
        };
      });
      return {
        meta,
        points,
        pathD: lineGenerator(points) || '',
        areaD: areaGenerator(points) || '',
      };
    });

    const iqPoints = history.map((snap) => ({
      x: xScale(snap.sessionLabel) ?? 0,
      y: yScale(snap.compositeIq),
      rawValue: snap.compositeIq,
      sessionLabel: snap.sessionLabel,
    }));

    return {
      xScale,
      yScale,
      yTicks,
      domainLines,
      iqPoints,
      iqPathD: lineGenerator(iqPoints) || '',
      iqAreaD: areaGenerator(iqPoints) || '',
      zeroY: isShiftMode ? yScale(0) : null,
    };
  }, [history, focusedDomain, innerWidth, innerHeight]);

  const handleCopyGrowthReport = () => {
    onHapticSuccess?.();
    const rows = domainSummaries
      .map(
        (d) =>
          `| ${d.shortCode} | ${d.name} (${d.smartTitle}) | ${d.baselineScore}% | ${d.latestScore}% | ${
            d.deltaScore >= 0 ? `+${d.deltaScore}%` : `${d.deltaScore}%`
          } | ${d.focusSharePercent}% |`
      )
      .join('\n');

    const md = `# Kerr Relativity Engine — 9-Domain Growth Analytics Report
Sessions Tracked: ${history.length}
Latest Composite IQ: ${latestSession?.compositeIq ?? 132} (${iqDelta >= 0 ? `+${iqDelta}` : iqDelta} pts vs. baseline)
Fastest Growing Domain: ${mostImprovedDomain?.name} (+${mostImprovedDomain?.deltaScore}%)
Dominant Cognitive Focus: ${currentFocusLeader?.name} (${currentFocusLeader?.latestScore}%)

| Code | Intelligence Domain | Baseline | Latest | Net Delta | Focus Share |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}
`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(md).catch(() => {});
    }
    setHasCopiedGrowth(true);
    window.setTimeout(() => setHasCopiedGrowth(false), 2200);
  };

  const handleExportGrowthJson = () => {
    onHapticSuccess?.();
    const payload = {
      suite: 'Kerr 9-Domain Longitudinal Growth Analytics (D3.js)',
      exportedAt: new Date().toISOString(),
      sessionsCount: history.length,
      compositeIqDelta: iqDelta,
      domainSummaries,
      snapshots: history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kerr-growth-analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="iq-growth-analytics-dashboard"
      className="space-y-5 text-sm text-zinc-200"
    >
      {/* Hero Overview Header — Matches CodebaseDetailsView & DiagnosticSuiteView */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-lg space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>9-Domain Growth Analytics</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-semibold whitespace-nowrap">
              {history.length} SESSIONS · 9 DOMAINS · D3.JS
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              data-testid="growth-record-snapshot-btn"
              onClick={() => {
                onHapticSuccess?.();
                onRecordSimulatedOrLiveRun();
                setSelectedSessionIdx(history.length);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 transition-colors text-xs font-semibold cursor-pointer shadow-sm whitespace-nowrap"
              title="Append current or simulated session telemetry to the D3 growth curve"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Run</span>
            </button>

            <button
              type="button"
              onClick={handleCopyGrowthReport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              {hasCopiedGrowth ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportGrowthJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              data-testid="growth-reset-history-btn"
              onClick={() => {
                onHapticLight?.();
                onResetGrowthHistory();
                setSelectedSessionIdx(3);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
              title="Reset growth history to 4-session baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Visualizes longitudinal progress and shifts in cognitive focus across Howard Gardner’s nine primary intelligence domains using interactive D3.js line trajectories.
        </p>
      </div>

      {/* Top 4 Longitudinal Summary Cards (Matching Code & Diagnostic Tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Composite IQ Trend</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
            {latestSession?.compositeIq ?? 132}{' '}
            <span className="text-xs font-mono text-emerald-400">
              ({iqDelta >= 0 ? `+${iqDelta}` : iqDelta} pts)
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 font-mono">
            Baseline {firstSession?.compositeIq ?? 112} → Now {latestSession?.compositeIq ?? 132}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Fastest Growing Domain</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white truncate">
            {mostImprovedDomain?.smartTitle || 'Number/Reasoning Smart'}
          </div>
          <div className="text-xs text-emerald-400 mt-0.5 font-mono">
            +{mostImprovedDomain?.deltaScore ?? 22}% mastery gain ({mostImprovedDomain?.shortCode})
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Dominant Cognitive Focus</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white truncate">
            {currentFocusLeader?.name || 'Logical-Mathematical'}
          </div>
          <div className="text-xs text-cyan-300 mt-0.5 font-mono">
            {currentFocusLeader?.latestScore ?? 90}% mastery · {currentFocusLeader?.focusSharePercent ?? 11.8}% share
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Inspected Session</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-sky-300 truncate">
            {inspectedSession?.sessionLabel || 'Run #4 (Prior)'}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 font-mono">
            Session {safeSessionIdx + 1} of {history.length} · Click chart nodes
          </div>
        </div>
      </div>

      {/* Horizontal 9-Domain Cognitive Focus Share Bar (Matches CodebaseDetailsView Subsystem Share Bar) */}
      <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-200">
            9-Domain Cognitive Focus Share (Snapshot: {inspectedSession?.sessionLabel})
          </span>
          <span className="text-zinc-400 text-xs">
            Click any intelligence segment below to isolate its D3 trajectory
          </span>
        </div>

        {/* Segmented Proportional Bar */}
        <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex shadow-inner">
          {domainSummaries.map((dom) => {
            const isSelected = focusedDomain === dom.domainId;
            return (
              <div
                key={dom.domainId}
                onClick={() => {
                  onHapticLight?.();
                  setFocusedDomain(isSelected ? 'all' : dom.domainId);
                }}
                style={{
                  width: `${dom.focusSharePercent}%`,
                  backgroundColor: dom.accentColor,
                }}
                className={`h-full cursor-pointer transition-all ${
                  focusedDomain === 'all' || focusedDomain === 'focus_shift' || isSelected
                    ? 'opacity-95'
                    : 'opacity-25 hover:opacity-75'
                }`}
                title={`${dom.name} (${dom.smartTitle}): ${dom.latestScore}% mastery (${dom.focusSharePercent}% focus share)`}
              />
            );
          })}
        </div>

        {/* Clickable 9-Domain Pills */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 pt-1">
          {GARDNER_INTELLIGENCES.map((meta) => {
            const isFocused = focusedDomain === meta.id;
            const summary = domainSummaries.find((d) => d.domainId === meta.id);
            const snapScore =
              inspectedSession?.domainScores[meta.id] ?? summary?.latestScore ?? 75;
            return (
              <button
                key={meta.id}
                type="button"
                data-testid={`growth-domain-toggle-${meta.id}`}
                onClick={() => {
                  onHapticLight?.();
                  setFocusedDomain(isFocused ? 'all' : meta.id);
                }}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isFocused
                    ? 'bg-zinc-800 border-white text-white shadow-md ring-1 ring-cyan-400/50'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: meta.accentColor }}
                  />
                  <span className="truncate text-zinc-200">{meta.shortCode}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-xs font-bold text-white tabular-nums">
                    {snapScore}%
                  </span>
                  <span className="text-[10px] text-emerald-400 tabular-nums">
                    {summary && summary.deltaScore >= 0
                      ? `+${summary.deltaScore}`
                      : summary?.deltaScore}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main D3.js Multi-Domain Line Chart Panel */}
      <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>D3.js Longitudinal Growth Trajectory — 9 Intelligence Domains</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              {focusedDomain === 'focus_shift'
                ? 'Plotting cumulative mastery gain (Δ% vs. Baseline Run #1) to highlight shifts in cognitive focus.'
                : focusedDomain === 'composite_iq'
                ? 'Plotting Full-Scale Composite IQ progression across recorded telemetry sessions.'
                : 'Plotting domain mastery trajectories (0–100%) across all nine Howard Gardner intelligences over time.'}
            </p>
          </div>

          {/* Chart Mode Filter Bar */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              data-testid="growth-filter-all"
              onClick={() => {
                onHapticLight?.();
                setFocusedDomain('all');
              }}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                focusedDomain === 'all'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              All 9 Domains (%)
            </button>
            <button
              type="button"
              data-testid="growth-filter-delta"
              onClick={() => {
                onHapticLight?.();
                setFocusedDomain('focus_shift');
              }}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                focusedDomain === 'focus_shift'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Focus Shift (Δ%)
            </button>
            <button
              type="button"
              data-testid="growth-filter-iq"
              onClick={() => {
                onHapticLight?.();
                setFocusedDomain('composite_iq');
              }}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                focusedDomain === 'composite_iq'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Composite IQ
            </button>
          </div>
        </div>

        {/* Responsive D3.js SVG Line Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            data-testid="d3-growth-analytics-chart"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto min-w-[540px] select-none"
            role="img"
            aria-label="D3.js Longitudinal Growth Chart across Howard Gardner's 9 Multiple Intelligences"
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {d3ChartGeometry.yTicks.map((tickVal) => {
                const y = d3ChartGeometry.yScale(tickVal);
                return (
                  <g key={tickVal} transform={`translate(0,${y})`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={innerWidth}
                      y2={0}
                      stroke="#27272a"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={-10}
                      y={3.5}
                      textAnchor="end"
                      fill="#a1a1aa"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {focusedDomain === 'composite_iq'
                        ? tickVal
                        : focusedDomain === 'focus_shift'
                        ? `${tickVal >= 0 ? `+${tickVal}` : tickVal}%`
                        : `${tickVal}%`}
                    </text>
                  </g>
                );
              })}

              {/* Zero Baseline Reference in Focus Shift Mode */}
              {d3ChartGeometry.zeroY !== null && (
                <line
                  x1={0}
                  y1={d3ChartGeometry.zeroY}
                  x2={innerWidth}
                  y2={d3ChartGeometry.zeroY}
                  stroke="#52525b"
                  strokeWidth="1.5"
                />
              )}

              {/* X-Axis Session Guides & Labels */}
              {history.map((snap, idx) => {
                const x = d3ChartGeometry.xScale(snap.sessionLabel) ?? 0;
                const isSelected = idx === safeSessionIdx;
                return (
                  <g
                    key={snap.sessionId}
                    transform={`translate(${x},0)`}
                    className="cursor-pointer"
                    onClick={() => {
                      onHapticLight?.();
                      setSelectedSessionIdx(idx);
                    }}
                  >
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={innerHeight}
                      stroke={isSelected ? '#22d3ee' : '#18181b'}
                      strokeWidth={isSelected ? '1.5' : '1'}
                    />
                    <text
                      x={0}
                      y={innerHeight + 24}
                      textAnchor="middle"
                      fill={isSelected ? '#22d3ee' : '#a1a1aa'}
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {snap.sessionLabel}
                    </text>
                  </g>
                );
              })}

              {/* D3 Line Paths */}
              {focusedDomain === 'composite_iq' ? (
                <g>
                  <path
                    d={d3ChartGeometry.iqAreaD}
                    fill="#fbbf24"
                    fillOpacity="0.12"
                  />
                  <path
                    d={d3ChartGeometry.iqPathD}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                  />
                  {d3ChartGeometry.iqPoints.map((pt, idx) => (
                    <g
                      key={idx}
                      transform={`translate(${pt.x},${pt.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedSessionIdx(idx)}
                    >
                      <circle
                        r={idx === safeSessionIdx ? 6 : 4}
                        fill="#fbbf24"
                        stroke="#09090b"
                        strokeWidth="2"
                      />
                      <text
                        x={0}
                        y={-10}
                        textAnchor="middle"
                        fill="#fef3c7"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                      >
                        IQ {pt.rawValue}
                      </text>
                    </g>
                  ))}
                </g>
              ) : (
                d3ChartGeometry.domainLines.map(({ meta, points, pathD, areaD }) => {
                  const isHighlighted =
                    focusedDomain === 'all' ||
                    focusedDomain === 'focus_shift' ||
                    focusedDomain === meta.id;
                  const isSingleFocused = focusedDomain === meta.id;
                  return (
                    <g
                      key={meta.id}
                      opacity={isHighlighted ? 1 : 0.12}
                      className="transition-opacity duration-200"
                    >
                      {isSingleFocused && (
                        <path
                          d={areaD}
                          fill={meta.accentColor}
                          fillOpacity="0.14"
                        />
                      )}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={meta.accentColor}
                        strokeWidth={isSingleFocused ? '3' : '2'}
                      />
                      {points.map((pt, idx) => (
                        <g key={idx}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSingleFocused ? 5.5 : idx === safeSessionIdx ? 4.5 : 3}
                            fill={meta.accentColor}
                            stroke="#09090b"
                            strokeWidth="1.5"
                            className="cursor-pointer"
                            onClick={() => setSelectedSessionIdx(idx)}
                          >
                            <title>
                              {meta.name} ({meta.smartTitle}) — {pt.sessionLabel}: {pt.rawValue}% (
                              {pt.deltaValue >= 0 ? `+${pt.deltaValue}%` : `${pt.deltaValue}%`})
                            </title>
                          </circle>
                          {isSingleFocused && (
                            <text
                              x={pt.x}
                              y={pt.y - 10}
                              textAnchor="middle"
                              fill="#f4f4f5"
                              fontSize="9.5"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="bold"
                            >
                              {pt.rawValue}%
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })
              )}
            </g>
          </svg>
        </div>

        {/* Inspected Session Readout Bar */}
        {inspectedSession && (
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-cyan-300 font-bold">
                Snapshot: {inspectedSession.sessionLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold">
                Composite IQ {inspectedSession.compositeIq}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-400">
                Recorded {new Date(inspectedSession.timestampIso).toLocaleDateString()}
              </span>
            </div>
            <div className="text-zinc-400">
              Click any session column or domain pill above to inspect historical focus weights
            </div>
          </div>
        )}
      </div>

      {/* 9-Domain Longitudinal Shift Table (Matches CodebaseDetailsView & DiagnosticSuiteView Rows) */}
      <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/90 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/80">
          <div>
            <h4 className="font-semibold text-white text-sm">
              9-Domain Longitudinal Growth &amp; Cognitive Focus Ledger
            </h4>
            <span className="text-xs text-zinc-400">
              Baseline Run #1 vs. Inspected Session ({inspectedSession?.sessionLabel})
            </span>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
            9 Intelligences
          </span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {domainSummaries.map((dom) => {
            const meta = GARDNER_INTELLIGENCE_MAP[dom.domainId];
            const inspectedVal =
              inspectedSession?.domainScores[dom.domainId] ?? dom.latestScore;
            const inspectedDelta = inspectedVal - dom.baselineScore;
            const isExpanded = expandedDomainId === dom.domainId;

            return (
              <div
                key={dom.domainId}
                className="p-3.5 hover:bg-zinc-900/40 transition-colors"
              >
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                  onClick={() => {
                    onHapticLight?.();
                    setExpandedDomainId(isExpanded ? null : dom.domainId);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-xs font-bold border shrink-0 ${dom.badgeClass}`}
                    >
                      {dom.shortCode}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-white hover:text-amber-300 transition-colors">
                          {dom.name}
                        </span>
                        <span className="text-xs text-zinc-400">
                          • {dom.smartTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHapticLight?.();
                        setFocusedDomain(
                          focusedDomain === dom.domainId ? 'all' : dom.domainId
                        );
                      }}
                      className={`px-2 py-0.5 rounded border font-mono text-[11px] cursor-pointer transition-colors ${
                        focusedDomain === dom.domainId
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {focusedDomain === dom.domainId ? 'Isolated on Chart' : 'Isolate Curve'}
                    </button>

                    <div className="w-24 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 hidden md:block">
                      <div
                        style={{
                          width: `${Math.max(6, inspectedVal)}%`,
                          backgroundColor: dom.accentColor,
                        }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>

                    <span className="font-mono text-sm font-bold text-white tabular-nums w-12 text-right">
                      {inspectedVal}%
                    </span>

                    <span
                      className={`font-mono text-xs font-bold tabular-nums w-14 text-right ${
                        inspectedDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {inspectedDelta >= 0 ? `+${inspectedDelta}%` : `${inspectedDelta}%`}
                    </span>

                    <button
                      type="button"
                      className="p-1 text-zinc-400 hover:text-white rounded"
                      aria-label={isExpanded ? 'Collapse domain details' : 'Expand domain details'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && meta && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 bg-zinc-900/40 p-3 rounded-lg space-y-2 text-xs text-zinc-300">
                    <div className="flex items-center justify-between flex-wrap gap-2 font-mono">
                      <span>
                        <strong className="text-white">Psychometric Battery:</strong>{' '}
                        <span className="text-cyan-300">{meta.psychometricTestTitle}</span>
                      </span>
                      <span className="text-zinc-400">
                        Baseline: <strong className="text-white">{dom.baselineScore}%</strong> → Peak:{' '}
                        <strong className="text-emerald-300">{dom.peakScore}%</strong> · Share:{' '}
                        <strong className="text-amber-300">{dom.focusSharePercent}%</strong>
                      </span>
                    </div>
                    <p className="text-zinc-400">{meta.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// POST-TEST TELEMETRY REPORT VIEW (AEROSPACE / OBSERVATORY DIAGNOSTIC SUITE)
// ============================================================================

export interface PostTestTelemetryReportViewProps {
  report: PostTestTelemetryReportData;
  testDrawNumber: number;
  bellCurveSlot: React.ReactNode;
  onReviewQuestions: () => void;
  onStartNewTest: () => void;
  onOpenGrowthAnalytics: () => void;
  onCopySummary: () => void;
  onExportJson: () => void;
  hasCopied: boolean;
}

export const PostTestTelemetryReportView: React.FC<PostTestTelemetryReportViewProps> = ({
  report,
  testDrawNumber,
  bellCurveSlot,
  onReviewQuestions,
  onStartNewTest,
  onOpenGrowthAnalytics,
  onCopySummary,
  onExportJson,
  hasCopied,
}) => {
  const [radarMode, setRadarMode] = useState<'subdomains_4' | 'gardner_9'>('subdomains_4');
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'correct' | 'misses' | 'mensa'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    report.latencyCurve[0]?.questionId || null
  );

  // Radar Chart Geometry using D3 scales (supports both 4 Reasoning Sub-Domains & 9 Gardner Domains)
  const radarSize = 280;
  const radarCenter = radarSize / 2;
  const radarRadius = 72;

  const radarGeometry = useMemo(() => {
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radarRadius]);
    const items =
      radarMode === 'subdomains_4'
        ? report.cognitiveSubDomains.map((sub) => ({
            id: sub.id,
            shortCode: sub.shortLabel.split(' ')[0].toUpperCase(),
            fullTitle: sub.title,
            accentColor: sub.accentColor,
            val: sub.itemCount > 0 ? Math.max(18, sub.accuracyPercent) : 75,
          }))
        : report.gardnerDomains.map((dom) => ({
            id: dom.meta.id,
            shortCode: dom.meta.shortCode,
            fullTitle: dom.meta.name,
            accentColor: dom.meta.accentColor,
            val: dom.itemCount > 0 ? Math.max(18, dom.percent) : 70,
          }));

    const axes = items.map((item, idx) => {
      const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2;
      const r = rScale(item.val);
      return {
        item,
        angle,
        x: radarCenter + r * Math.cos(angle),
        y: radarCenter + r * Math.sin(angle),
        outerX: radarCenter + radarRadius * Math.cos(angle),
        outerY: radarCenter + radarRadius * Math.sin(angle),
        labelX: radarCenter + (radarRadius + 24) * Math.cos(angle),
        labelY: radarCenter + (radarRadius + 24) * Math.sin(angle),
      };
    });
    const polygonPoints = axes.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(' ');
    return { axes, polygonPoints };
  }, [radarMode, report.cognitiveSubDomains, report.gardnerDomains, radarCenter]);

  // Response-Time Latency Curve D3 Geometry (Q1 through Q24)
  const latWidth = 760;
  const latHeight = 225;
  const latMargin = { top: 24, right: 26, bottom: 36, left: 48 };
  const latInnerW = latWidth - latMargin.left - latMargin.right;
  const latInnerH = latHeight - latMargin.top - latMargin.bottom;

  const latencyD3 = useMemo(() => {
    const pts = report.latencyCurve;
    const labels = pts.map((p) => p.label);
    const xScale = d3
      .scalePoint<string>()
      .domain(labels)
      .range([0, latInnerW])
      .padding(0.25);

    const maxSec = Math.max(8, d3.max(pts, (p) => p.latencySec) ?? 10);
    const yScale = d3.scaleLinear().domain([0, maxSec * 1.15]).range([latInnerH, 0]);

    const lineGen = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<{ x: number; y: number }>()
      .x((d) => d.x)
      .y0(latInnerH)
      .y1((d) => d.y)
      .curve(d3.curveMonotoneX);

    const coords = pts.map((p) => ({
      ...p,
      x: xScale(p.label) ?? 0,
      y: yScale(p.latencySec),
    }));

    const avgSec = report.avgLatencyMs / 1000;
    const avgY = yScale(avgSec);

    return {
      coords,
      pathD: lineGen(coords) || '',
      areaD: areaGen(coords) || '',
      yTicks: yScale.ticks(4),
      yScale,
      avgY,
      avgSec,
    };
  }, [report.latencyCurve, report.avgLatencyMs, latInnerW, latInnerH]);

  const safeInspectedQIdx = Math.min(
    selectedQuestionIdx,
    Math.max(0, report.latencyCurve.length - 1)
  );
  const inspectedQuestion = report.latencyCurve[safeInspectedQIdx] || report.latencyCurve[0];

  const filteredLedgerItems = useMemo(() => {
    return report.latencyCurve.filter((pt) => {
      if (ledgerFilter === 'correct') return pt.status === 'correct';
      if (ledgerFilter === 'misses') return pt.status !== 'correct';
      if (ledgerFilter === 'mensa') return pt.difficultyBracket === 'mensa_tier';
      return true;
    });
  }, [report.latencyCurve, ledgerFilter]);

  const formattedTotalTime = `${Math.floor(report.totalElapsedSeconds / 60)}:${(
    report.totalElapsedSeconds % 60
  )
    .toString()
    .padStart(2, '0')}`;

  return (
    <div
      data-testid="iq-test-results-summary"
      className="space-y-5 text-sm text-zinc-200"
    >
      {/* 1. HEADLINE PSYCHOMETRIC READOUT */}
      <div
        data-testid="telemetry-headline-readout"
        className="p-4 sm:p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-lg space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Post-Test Psychometric Telemetry Report · Run Set #{testDrawNumber}
                </span>
                {report.isCalibrationPreview && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                    CALIBRATED BASELINE PREVIEW (Q1–Q{report.totalQuestions})
                  </span>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold font-display text-white flex items-baseline gap-2.5 flex-wrap mt-0.5">
                <span>Full-Scale IQ: {report.estimatedIq}</span>
                <span className="text-sm font-mono text-cyan-300">
                  (95% CI: {report.confidenceIntervalLabel})
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  · {report.percentileLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="telemetry-copy-summary-btn"
              onClick={onCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
            >
              {hasCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="telemetry-export-json-btn"
              onClick={onExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export Telemetry JSON</span>
            </button>
          </div>
        </div>

        {/* 4 Headline Psychometric Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Full-Scale IQ (σ = {report.standardDeviation})
            </span>
            <strong className="text-xl text-white tabular-nums">
              {report.confidenceIntervalLabel}
            </strong>
            <span className="text-[11px] text-cyan-300 block mt-0.5">
              Deviation z = {report.zScore} · {report.classificationTitle}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Normative Percentile Rank
            </span>
            <strong className="text-xl text-emerald-300 tabular-nums">
              {report.percentileRank}th %ile
            </strong>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              {report.correctCount} / {report.totalQuestions} items correct (
              {Math.round((report.correctCount / Math.max(1, report.totalQuestions)) * 100)}%)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Mean Item Latency
            </span>
            <strong className="text-xl text-amber-300 tabular-nums">
              {report.avgLatencyMs.toLocaleString()} ms
            </strong>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              {(report.avgLatencyMs / 1000).toFixed(2)}s / item avg response
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Total Session Elapsed
            </span>
            <strong className="text-xl text-sky-300 tabular-nums">
              {formattedTotalTime}
            </strong>
            <span className="text-[11px] text-zinc-400 block mt-0.5 truncate">
              {report.speedAccuracyVerdict}
            </span>
          </div>
        </div>

        {/* Normal Bell Curve Marker */}
        <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>
              Gaussian Normative Distribution (μ = 100, σ = 15) · Shaded Mensa Tail (≥130, Top 2%)
            </span>
            <span className="text-emerald-300 font-bold">
              Marker: IQ {report.estimatedIq} ({report.confidenceIntervalLabel})
            </span>
          </div>
          {bellCurveSlot}
        </div>
      </div>

      {/* 2. COGNITIVE SUB-DOMAIN BREAKDOWN + DUAL-MODE RADAR PROFILE */}
      <div
        data-testid="telemetry-cognitive-subdomains"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* Left: 4 Core Reasoning Sub-Domains (Horizontal Progress Bars + Accuracy & Speed) */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Cognitive Sub-Domain Breakdown (Accuracy &amp; Speed)</span>
            </h4>
            <span className="text-[11px] font-mono text-zinc-400">
              4 Core Reasoning Categories
            </span>
          </div>

          <div className="space-y-3">
            {report.cognitiveSubDomains.map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="font-bold text-white">{sub.title}</span>
                  <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                    <span className="text-zinc-400">
                      {sub.avgLatencyMs > 0
                        ? `${sub.avgLatencyMs.toLocaleString()} ms (${(
                            sub.avgLatencyMs / 1000
                          ).toFixed(1)}s)`
                        : '—'}
                    </span>
                    <span className="text-cyan-300 font-bold">
                      {sub.correctCount}/{sub.itemCount} ({sub.accuracyPercent}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(6, sub.accuracyPercent)}%`,
                      backgroundColor: sub.accentColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Interactive Radar Chart (Toggle between 4 Sub-Domains & 9 Gardner Intelligences) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col items-center justify-between space-y-2">
          <div className="w-full flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider">
              Cognitive Radar Topology
            </h4>
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setRadarMode('subdomains_4')}
                className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer transition-colors ${
                  radarMode === 'subdomains_4'
                    ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                4 Sub-Domains
              </button>
              <button
                type="button"
                onClick={() => setRadarMode('gardner_9')}
                className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer transition-colors ${
                  radarMode === 'gardner_9'
                    ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                9 Intelligences
              </button>
            </div>
          </div>

          <svg
            data-testid="telemetry-radar-chart"
            viewBox={`0 0 ${radarSize} ${radarSize}`}
            className="w-full max-w-[235px] h-auto my-1"
          >
            {[0.33, 0.66, 1].map((ringFrac, rIdx) => (
              <circle
                key={rIdx}
                cx={radarCenter}
                cy={radarCenter}
                r={radarRadius * ringFrac}
                fill="none"
                stroke="#27272a"
                strokeDasharray={rIdx < 2 ? '2 2' : undefined}
              />
            ))}
            {radarGeometry.axes.map((axis) => (
              <g key={axis.item.id}>
                <line
                  x1={radarCenter}
                  y1={radarCenter}
                  x2={axis.outerX}
                  y2={axis.outerY}
                  stroke="#27272a"
                />
                <text
                  x={axis.labelX}
                  y={axis.labelY + 3}
                  textAnchor="middle"
                  fill="#d4d4d8"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {axis.item.shortCode}
                </text>
              </g>
            ))}
            <polygon
              points={radarGeometry.polygonPoints}
              fill="#22d3ee"
              fillOpacity="0.22"
              stroke="#22d3ee"
              strokeWidth="2"
            />
            {radarGeometry.axes.map((axis) => (
              <circle
                key={axis.item.id}
                cx={axis.x}
                cy={axis.y}
                r="3.5"
                fill={axis.item.accentColor}
                stroke="#09090b"
                strokeWidth="1.2"
              >
                <title>
                  {axis.item.fullTitle}: {axis.item.val}%
                </title>
              </circle>
            ))}
          </svg>

          <div className="w-full text-center text-[11px] font-mono text-zinc-400">
            Peak Cognitive Signature:{' '}
            <strong className="text-cyan-300">
              {report.topGardnerStrengths[0]?.meta.name || 'Spatial Intelligence'}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. RESPONSE-TIME LATENCY CURVE (Q1..Q24 TIMELINE) */}
      <div
        data-testid="telemetry-latency-curve"
        className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                Response-Time Latency Curve (Q1 through Q{report.totalQuestions})
              </span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Per-question timeline plotting seconds spent on each item alongside correctness, highlighting speed-vs-accuracy trade-offs and late-test fatigue.
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Correct ({report.correctCount})
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <XCircle className="w-3.5 h-3.5" /> Miss ({report.totalQuestions - report.correctCount})
            </span>
          </div>
        </div>

        {/* Speed-vs-Accuracy & Fatigue Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">
              1st Half (Q1–Q{Math.floor(report.totalQuestions / 2)}):
            </span>
            <span className="text-white font-bold tabular-nums">
              {report.firstHalfAccuracyPercent}% acc · {(report.firstHalfAvgLatencyMs / 1000).toFixed(1)}s avg
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">
              2nd Half (Q{Math.floor(report.totalQuestions / 2) + 1}–Q{report.totalQuestions}):
            </span>
            <span className="text-white font-bold tabular-nums">
              {report.secondHalfAccuracyPercent}% acc · {(report.secondHalfAvgLatencyMs / 1000).toFixed(1)}s avg
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">Late-Test Fatigue Δ:</span>
            <span
              className={`font-bold tabular-nums ${
                report.fatigueDeltaPercent >= -10 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {report.fatigueDeltaPercent >= 0
                ? `+${report.fatigueDeltaPercent}%`
                : `${report.fatigueDeltaPercent}%`}{' '}
              ({report.speedAccuracyVerdict.split('·')[0].trim()})
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${latWidth} ${latHeight}`}
            className="w-full h-auto min-w-[560px] select-none"
            role="img"
            aria-label="Response-Time Latency Curve across assessment questions"
          >
            <g transform={`translate(${latMargin.left},${latMargin.top})`}>
              {latencyD3.yTicks.map((tick) => {
                const y = latencyD3.yScale(tick);
                return (
                  <g key={tick} transform={`translate(0,${y})`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={latInnerW}
                      y2={0}
                      stroke="#27272a"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={-8}
                      y={3}
                      textAnchor="end"
                      fill="#a1a1aa"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {tick}s
                    </text>
                  </g>
                );
              })}

              {/* Mean Latency Reference Line */}
              <line
                x1={0}
                y1={latencyD3.avgY}
                x2={latInnerW}
                y2={latencyD3.avgY}
                stroke="#fbbf24"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text
                x={latInnerW - 4}
                y={Math.max(10, latencyD3.avgY - 5)}
                textAnchor="end"
                fill="#fbbf24"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
              >
                Mean {latencyD3.avgSec.toFixed(1)}s ({report.avgLatencyMs} ms)
              </text>

              {/* Shaded Area + Latency Curve Path */}
              <path d={latencyD3.areaD} fill="#38bdf8" fillOpacity="0.08" />
              <path
                d={latencyD3.pathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
              />

              {/* Question Nodes (Q1..Q24) */}
              {latencyD3.coords.map((pt, idx) => {
                const isSelected = idx === safeInspectedQIdx;
                const nodeColor =
                  pt.status === 'correct'
                    ? '#10b981'
                    : pt.status === 'incorrect'
                    ? '#f43f5e'
                    : '#71717a';
                return (
                  <g
                    key={pt.questionId}
                    transform={`translate(${pt.x},0)`}
                    className="cursor-pointer"
                    onClick={() => setSelectedQuestionIdx(idx)}
                  >
                    {isSelected && (
                      <line
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={latInnerH}
                        stroke="#22d3ee"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}
                    <circle
                      cx={0}
                      cy={pt.y}
                      r={isSelected ? '6' : '4.5'}
                      fill={nodeColor}
                      stroke={isSelected ? '#ffffff' : '#09090b'}
                      strokeWidth="1.5"
                    >
                      <title>
                        {pt.label} ({pt.domainTitle}) — {pt.latencySec}s / {pt.latencyMs}ms (
                        {pt.status.toUpperCase()})
                      </title>
                    </circle>
                    <text
                      x={0}
                      y={latInnerH + 18}
                      textAnchor="middle"
                      fill={isSelected ? '#22d3ee' : '#a1a1aa'}
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Interactive Inspected Question Callout */}
        {inspectedQuestion && (
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold">
                {inspectedQuestion.label}
              </span>
              <span className="text-white font-bold">{inspectedQuestion.domainTitle}</span>
              <span className="text-zinc-400">· {inspectedQuestion.subDomainTitle}</span>
              <span className="text-zinc-400">· {inspectedQuestion.difficultyTitle}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-amber-300 tabular-nums">
                {inspectedQuestion.latencyMs.toLocaleString()} ms ({inspectedQuestion.latencySec}s)
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  inspectedQuestion.status === 'correct'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {inspectedQuestion.status === 'correct' ? 'PASS' : 'MISS'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. DIFFICULTY TIER CALIBRATION */}
      <div
        data-testid="telemetry-difficulty-calibration"
        className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
          <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span>Difficulty Tier Calibration (Baseline → Mensa-Tier Ceiling)</span>
          </h4>
          <span className="text-xs font-mono text-zinc-400">
            Early Slips: {report.earlySlipsCount} · Ceiling Misses: {report.ceilingMissesCount}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {report.difficultyBrackets.map((tier) => (
            <div
              key={tier.id}
              className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-2"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-white">{tier.title}</span>
                <span className="font-bold tabular-nums" style={{ color: tier.accentColor }}>
                  {tier.passRatePercent}% Pass
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{tier.iqCeilingLabel}</span>
                <span className="tabular-nums">
                  {tier.correctCount}/{tier.itemCount} · {(tier.avgLatencyMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(6, tier.passRatePercent)}%`,
                    backgroundColor: tier.accentColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-xs font-mono text-zinc-300">
          <strong className="text-cyan-300">Calibration Verdict:</strong>{' '}
          {report.calibrationDiagnostic}
        </div>
      </div>

      {/* 5. HOWARD GARDNER'S 9 MULTIPLE INTELLIGENCES BREAKDOWN */}
      <div
        data-testid="gardner-9-intelligences-results"
        className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            Howard Gardner’s 9 Multiple Intelligences Profile
          </span>
          <span className="font-mono text-xs text-zinc-400">
            Domain-by-Domain Cognitive Breakdown
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {report.gardnerDomains.map(({ meta, itemCount, correctCount: domCorrect, percent }) => (
            <div
              key={meta.id}
              className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-mono text-xs font-bold text-white truncate">
                  {meta.name}
                </span>
                <span className="font-mono text-xs font-bold text-cyan-300 shrink-0 tabular-nums">
                  {itemCount > 0 ? `${domCorrect}/${itemCount} (${percent}%)` : 'Untested'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                {meta.smartTitle}
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${meta.barColorClass}`}
                  style={{ width: `${itemCount > 0 ? Math.max(6, percent) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. QUESTION-BY-QUESTION TELEMETRY LEDGER (Matches CodebaseDetailsView & DiagnosticSuiteView) */}
      <div
        data-testid="telemetry-question-ledger"
        className="rounded-xl bg-zinc-950/80 border border-zinc-800/90 overflow-hidden shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/80">
          <div>
            <h4 className="font-semibold text-white text-sm">
              Per-Question Diagnostic Telemetry Ledger (Q1–Q{report.totalQuestions})
            </h4>
            <span className="text-xs text-zinc-400">
              Click any item row to inspect prompt, chosen option, latency, and psychometric solution rationale
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                ['all', `All (${report.totalQuestions})`],
                ['correct', `Passed (${report.correctCount})`],
                ['misses', `Misses (${report.totalQuestions - report.correctCount})`],
                ['mensa', 'Mensa-Tier'],
              ] as const
            ).map(([filterId, label]) => (
              <button
                key={filterId}
                type="button"
                onClick={() => setLedgerFilter(filterId)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs border cursor-pointer transition-colors ${
                  ledgerFilter === filterId
                    ? 'bg-zinc-800 border-cyan-400 text-white font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-zinc-800/60 max-h-[420px] overflow-y-auto">
          {filteredLedgerItems.map((pt) => {
            const isExpanded = expandedQuestionId === pt.questionId;
            return (
              <div
                key={pt.questionId}
                className="p-3.5 hover:bg-zinc-900/40 transition-colors"
              >
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                  onClick={() =>
                    setExpandedQuestionId(isExpanded ? null : pt.questionId)
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-xs font-bold text-cyan-300 shrink-0">
                      {pt.label}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-white truncate">
                          {pt.domainTitle}
                        </span>
                        <span className="text-xs text-zinc-400">
                          • {pt.subDomainTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300">
                      {pt.difficultyTitle}
                    </span>
                    <span className="font-mono text-xs text-amber-300 tabular-nums w-20 text-right">
                      {pt.latencyMs.toLocaleString()} ms
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                        pt.status === 'correct'
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                      }`}
                    >
                      {pt.status === 'correct' ? 'PASS' : 'MISS'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 bg-zinc-900/40 p-3 rounded-lg space-y-2 text-xs text-zinc-300">
                    <div>
                      <strong className="text-white">Stimulus Prompt: </strong>
                      <span>{pt.questionPrompt}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-400 block text-[10px] uppercase">
                          Selected Response ({pt.latencySec}s)
                        </span>
                        <span
                          className={
                            pt.status === 'correct' ? 'text-emerald-300' : 'text-rose-300'
                          }
                        >
                          {pt.selectedOptionText || 'Unanswered'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-400 block text-[10px] uppercase">
                          Verified Key ({pt.points} pts)
                        </span>
                        <span className="text-emerald-300">{pt.correctOptionText}</span>
                      </div>
                    </div>
                    <div className="text-zinc-400">
                      <strong className="text-cyan-300">Psychometric Rationale: </strong>
                      {pt.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. SESSION TELEMETRY & EXPORT FOOTER BAR */}
      <div
        data-testid="telemetry-session-export-bar"
        className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1 font-mono text-xs">
          <div className="text-white font-bold flex items-center gap-2 flex-wrap">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Session Telemetry: {formattedTotalTime} Total Elapsed ·{' '}
              {report.avgLatencyMs.toLocaleString()} ms/item avg
            </span>
          </div>
          <div className="text-zinc-400 text-[11px]">
            Export full JSON or Markdown summary matching EventLogOverlay &amp; DiagnosticSuiteView schemas.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onReviewQuestions}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs cursor-pointer transition-colors"
          >
            Inspect Items
          </button>

          <button
            type="button"
            data-testid="open-growth-analytics-from-results-btn"
            onClick={onOpenGrowthAnalytics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/60 text-indigo-200 font-mono text-xs font-semibold cursor-pointer transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>D3 Growth Analytics</span>
          </button>

          <button
            type="button"
            data-testid="iq-retake-new-questions-btn"
            onClick={onStartNewTest}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-100 font-mono text-xs font-bold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Assessment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
