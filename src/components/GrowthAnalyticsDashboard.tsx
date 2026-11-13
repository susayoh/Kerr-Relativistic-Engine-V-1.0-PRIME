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
  const [focusedDomain, setFocusedDomain] = useState<'all' | 'composite_iq' | GardnerIntelligenceId>('all');
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(() =>
    Math.max(0, history.length - 1)
  );

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
  const iqDelta = latestSession && firstSession ? latestSession.compositeIq - firstSession.compositeIq : 0;

  // D3.js Coordinate & Path Geometry Calculations
  const chartWidth = 760;
  const chartHeight = 290;
  const margin = { top: 24, right: 32, bottom: 38, left: 46 };
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
    const yMin = isIqMode ? 85 : 35;
    const yMax = isIqMode ? 162 : 100;

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
      .y0(innerHeight)
      .y1((d) => d.y)
      .curve(d3.curveMonotoneX);

    const domainLines = GARDNER_INTELLIGENCES.map((meta) => {
      const points = history.map((snap) => ({
        x: xScale(snap.sessionLabel) ?? 0,
        y: yScale(snap.domainScores[meta.id] ?? 60),
        rawValue: snap.domainScores[meta.id] ?? 60,
        sessionLabel: snap.sessionLabel,
      }));
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
    };
  }, [history, focusedDomain, innerWidth, innerHeight]);

  return (
    <div
      data-testid="iq-growth-analytics-dashboard"
      className="space-y-5 text-sm text-zinc-200"
    >
      {/* Top 4 Longitudinal Summary Cards (Matching Code & Diagnostic Tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Composite IQ Trend</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-white tracking-tight">
            {latestSession?.compositeIq ?? 120}{' '}
            <span className="text-xs font-mono text-emerald-400">
              ({iqDelta >= 0 ? `+${iqDelta}` : iqDelta} pts)
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 font-mono">
            Across {history.length} recorded sessions
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Fastest Growing Domain</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 text-base font-bold text-white truncate">
            {mostImprovedDomain?.smartTitle || 'Number/Reasoning Smart'}
          </div>
          <div className="text-xs text-emerald-400 mt-0.5 font-mono">
            +{mostImprovedDomain?.deltaScore ?? 0}% since baseline
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Dominant Cognitive Focus</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-1 text-base font-bold text-white truncate">
            {currentFocusLeader?.name || 'Spatial Intelligence'}
          </div>
          <div className="text-xs text-cyan-300 mt-0.5 font-mono">
            {currentFocusLeader?.latestScore ?? 88}% current mastery
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Telemetry Snapshots</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-center gap-2 pt-1.5">
            <button
              type="button"
              data-testid="growth-record-snapshot-btn"
              onClick={() => {
                onHapticSuccess?.();
                onRecordSimulatedOrLiveRun();
                setSelectedSessionIdx(history.length);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 font-mono text-xs font-semibold cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Run</span>
            </button>
            <button
              type="button"
              data-testid="growth-reset-history-btn"
              onClick={() => {
                onHapticLight?.();
                onResetGrowthHistory();
                setSelectedSessionIdx(3);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer transition-colors"
              title="Reset growth history to 4-session baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main D3.js Multi-Domain Line Chart Panel */}
      <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>D3.js Longitudinal Growth Trajectory — 9 Intelligence Domains</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tracks cognitive mastery shifts across Howard Gardner’s nine primary domains over consecutive sessions.
            </p>
          </div>

          {/* Domain Filter Bar */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              data-testid="growth-filter-all"
              onClick={() => {
                onHapticLight?.();
                setFocusedDomain('all');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                focusedDomain === 'all'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              All 9 Domains
            </button>
            <button
              type="button"
              data-testid="growth-filter-iq"
              onClick={() => {
                onHapticLight?.();
                setFocusedDomain('composite_iq');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                focusedDomain === 'composite_iq'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Composite IQ
            </button>
          </div>
        </div>

        {/* Clickable 9-Domain Legend Pills / Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {GARDNER_INTELLIGENCES.map((meta) => {
            const isFocused = focusedDomain === meta.id;
            const summary = domainSummaries.find((d) => d.domainId === meta.id);
            return (
              <button
                key={meta.id}
                type="button"
                data-testid={`growth-domain-toggle-${meta.id}`}
                onClick={() => {
                  onHapticLight?.();
                  setFocusedDomain(isFocused ? 'all' : meta.id);
                }}
                className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-zinc-800 border-white text-white shadow-sm'
                    : focusedDomain === 'all'
                    ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.accentColor }}
                />
                <span>{meta.shortCode}</span>
                <span className="text-[10px] text-zinc-400">
                  {summary ? `${summary.latestScore}%` : ''}
                </span>
              </button>
            );
          })}
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
                      {focusedDomain === 'composite_iq' ? tickVal : `${tickVal}%`}
                    </text>
                  </g>
                );
              })}

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
                      y={innerHeight + 22}
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
                    focusedDomain === 'all' || focusedDomain === meta.id;
                  const isSingleFocused = focusedDomain === meta.id;
                  return (
                    <g
                      key={meta.id}
                      opacity={isHighlighted ? 1 : 0.14}
                      className="transition-opacity duration-200"
                    >
                      {isSingleFocused && (
                        <path
                          d={areaD}
                          fill={meta.accentColor}
                          fillOpacity="0.12"
                        />
                      )}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={meta.accentColor}
                        strokeWidth={isSingleFocused ? '3' : '2'}
                      />
                      {points.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={isSingleFocused ? 5 : idx === safeSessionIdx ? 4.5 : 3}
                          fill={meta.accentColor}
                          stroke="#09090b"
                          strokeWidth="1.5"
                          className="cursor-pointer"
                          onClick={() => setSelectedSessionIdx(idx)}
                        >
                          <title>
                            {meta.name} ({meta.smartTitle}) — {pt.sessionLabel}: {pt.rawValue}%
                          </title>
                        </circle>
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
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold">
                Inspected Snapshot: {inspectedSession.sessionLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300">
                Composite IQ {inspectedSession.compositeIq}
              </span>
            </div>
            <div className="text-zinc-400">
              Click any session column on the D3 chart to inspect historical domain weights
            </div>
          </div>
        )}
      </div>

      {/* 9-Domain Longitudinal Shift Table */}
      <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider">
            Domain-by-Domain Cognitive Growth &amp; Focus Shifts
          </h4>
          <span className="text-xs font-mono text-zinc-400">
            Baseline vs. Latest Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {domainSummaries.map((dom) => {
            const inspectedVal =
              inspectedSession?.domainScores[dom.domainId] ?? dom.latestScore;
            return (
              <div
                key={dom.domainId}
                onClick={() => {
                  onHapticLight?.();
                  setFocusedDomain(
                    focusedDomain === dom.domainId ? 'all' : dom.domainId
                  );
                }}
                className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dom.accentColor }}
                    />
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {dom.name}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold ${
                      dom.deltaScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {dom.deltaScore >= 0 ? `+${dom.deltaScore}%` : `${dom.deltaScore}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>{dom.smartTitle}</span>
                  <span>
                    Base {dom.baselineScore}% → Now{' '}
                    <strong className="text-white">{inspectedVal}%</strong>
                  </span>
                </div>

                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(6, inspectedVal)}%`,
                      backgroundColor: dom.accentColor,
                    }}
                  />
                </div>
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
  // 9-Axis Radar Chart Geometry using D3 scales
  const radarSize = 240;
  const radarCenter = radarSize / 2;
  const radarRadius = 86;

  const radarGeometry = useMemo(() => {
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radarRadius]);
    const axes = report.gardnerDomains.map((dom, idx) => {
      const angle = (idx / report.gardnerDomains.length) * Math.PI * 2 - Math.PI / 2;
      const val = dom.itemCount > 0 ? dom.percent : 65;
      const r = rScale(val);
      return {
        dom,
        angle,
        x: radarCenter + r * Math.cos(angle),
        y: radarCenter + r * Math.sin(angle),
        outerX: radarCenter + radarRadius * Math.cos(angle),
        outerY: radarCenter + radarRadius * Math.sin(angle),
        labelX: radarCenter + (radarRadius + 20) * Math.cos(angle),
        labelY: radarCenter + (radarRadius + 20) * Math.sin(angle),
      };
    });
    const polygonPoints = axes.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(' ');
    return { axes, polygonPoints };
  }, [report.gardnerDomains, radarCenter]);

  // Response-Time Latency Curve D3 Geometry
  const latWidth = 740;
  const latHeight = 210;
  const latMargin = { top: 22, right: 24, bottom: 34, left: 46 };
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
      yTicks: yScale.ticks(4),
      yScale,
      avgY,
      avgSec,
    };
  }, [report.latencyCurve, report.avgLatencyMs, latInnerW, latInnerH]);

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
        className="p-4 sm:p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Post-Test Psychometric Telemetry Report · Run Set #{testDrawNumber}
              </div>
              <div className="text-xl sm:text-2xl font-bold font-display text-white flex items-baseline gap-2.5 flex-wrap">
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
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Full-Scale IQ (SD = {report.standardDeviation})
            </span>
            <strong className="text-lg text-white">{report.confidenceIntervalLabel}</strong>
            <span className="text-[11px] text-cyan-300 block mt-0.5">
              Z-Score: {report.zScore} ({report.classificationTitle})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Normative Percentile
            </span>
            <strong className="text-lg text-emerald-300">{report.percentileRank}%</strong>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              {report.correctCount} / {report.totalQuestions} items correct
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Mean Item Latency
            </span>
            <strong className="text-lg text-amber-300">
              {report.avgLatencyMs.toLocaleString()} ms
            </strong>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              {(report.avgLatencyMs / 1000).toFixed(2)}s / question
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase">
              Total Session Elapsed
            </span>
            <strong className="text-lg text-sky-300">{formattedTotalTime}</strong>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              {report.speedAccuracyVerdict}
            </span>
          </div>
        </div>

        {/* Normal Bell Curve Marker */}
        <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/90">
          {bellCurveSlot}
        </div>
      </div>

      {/* 2. COGNITIVE SUB-DOMAIN BREAKDOWN + RADAR PROFILE */}
      <div
        data-testid="telemetry-cognitive-subdomains"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* Left: 4 Core Reasoning Sub-Domains */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Cognitive Sub-Domain Breakdown (Accuracy &amp; Speed)</span>
            </h4>
            <span className="text-[11px] font-mono text-zinc-400">4 Core Reasoning Axes</span>
          </div>

          <div className="space-y-3">
            {report.cognitiveSubDomains.map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="font-bold text-white">{sub.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-400">
                      {sub.avgLatencyMs > 0 ? `${(sub.avgLatencyMs / 1000).toFixed(1)}s avg` : '—'}
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
                      width: `${Math.max(5, sub.accuracyPercent)}%`,
                      backgroundColor: sub.accentColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: 9-Domain Multiple Intelligences Radar Chart */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider">
              9-Domain Radar Topology
            </h4>
            <span className="text-[11px] font-mono text-zinc-400">Gardner Vector</span>
          </div>

          <svg
            data-testid="telemetry-radar-chart"
            viewBox={`0 0 ${radarSize} ${radarSize}`}
            className="w-full max-w-[230px] h-auto my-1"
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
              <g key={axis.dom.meta.id}>
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
                  {axis.dom.meta.shortCode}
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
                key={axis.dom.meta.id}
                cx={axis.x}
                cy={axis.y}
                r="3.2"
                fill={axis.dom.meta.accentColor}
                stroke="#09090b"
                strokeWidth="1"
              />
            ))}
          </svg>

          <div className="w-full text-center text-[11px] font-mono text-zinc-400">
            Top Signature:{' '}
            <strong className="text-cyan-300">
              {report.topGardnerStrengths[0]?.meta.name || 'Spatial Intelligence'}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. RESPONSE-TIME LATENCY CURVE (Q1..QN TIMELINE) */}
      <div
        data-testid="telemetry-latency-curve"
        className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Response-Time Latency Curve (Q1–Q{report.totalQuestions})</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Per-question response duration (seconds) color-coded by correctness (Emerald = Correct, Rose = Miss).
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <XCircle className="w-3.5 h-3.5" /> Miss / Unanswered
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${latWidth} ${latHeight}`}
            className="w-full h-auto min-w-[520px]"
            role="img"
            aria-label="Response-Time Latency Curve across assessment questions"
          >
            <g transform={`translate(${latMargin.left},${latMargin.top})`}>
              {latencyD3.yTicks.map((tick) => {
                const y = latencyD3.yScale(tick);
                return (
                  <g key={tick} transform={`translate(0,${y})`}>
                    <line x1={0} y1={0} x2={latInnerW} y2={0} stroke="#27272a" strokeDasharray="3 3" />
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

              {/* Latency Curve Path */}
              <path
                d={latencyD3.pathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
              />

              {/* Question Nodes */}
              {latencyD3.coords.map((pt) => {
                const nodeColor =
                  pt.status === 'correct'
                    ? '#10b981'
                    : pt.status === 'incorrect'
                    ? '#f43f5e'
                    : '#71717a';
                return (
                  <g key={pt.questionId} transform={`translate(${pt.x},0)`}>
                    <circle
                      cx={0}
                      cy={pt.y}
                      r="4.5"
                      fill={nodeColor}
                      stroke="#09090b"
                      strokeWidth="1.5"
                    >
                      <title>
                        {pt.label} ({pt.domainTitle}) — {pt.latencySec}s ({pt.status.toUpperCase()})
                      </title>
                    </circle>
                    <text
                      x={0}
                      y={latInnerH + 18}
                      textAnchor="middle"
                      fill="#a1a1aa"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* 4. DIFFICULTY TIER CALIBRATION */}
      <div
        data-testid="telemetry-difficulty-calibration"
        className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span>Difficulty Tier Calibration (Baseline → Mensa-Tier Ceiling)</span>
          </h4>
          <span className="text-xs font-mono text-zinc-400">
            Pass Rate Across 4 Complexity Brackets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {report.difficultyBrackets.map((tier) => (
            <div
              key={tier.id}
              className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-2"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-white">{tier.title}</span>
                <span className="font-bold" style={{ color: tier.accentColor }}>
                  {tier.passRatePercent}%
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                {tier.iqCeilingLabel} · {tier.correctCount}/{tier.itemCount} passed
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(5, tier.passRatePercent)}%`,
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
                <span className="font-mono text-xs font-bold text-cyan-300 shrink-0">
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

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onReviewQuestions}
            className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs cursor-pointer transition-colors"
          >
            Review Answers &amp; Explanations
          </button>

          <button
            type="button"
            data-testid="open-growth-analytics-from-results-btn"
            onClick={onOpenGrowthAnalytics}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/60 text-indigo-200 font-mono text-xs font-semibold cursor-pointer transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>View D3 Growth Analytics</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="iq-retake-new-questions-btn"
          onClick={onStartNewTest}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-100 font-mono text-xs font-bold cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Assessment (Fresh Question Set)</span>
        </button>
      </div>
    </div>
  );
};
