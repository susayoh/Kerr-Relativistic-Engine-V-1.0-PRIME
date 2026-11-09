/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  GeodesicTrajectory,
  computeRelativisticMetrics,
} from './physics/gravitationalPhysics';
import {
  BlackHoleSceneController,
  CameraPresetId,
  InspectedFeature,
} from './scene/BlackHoleScene';
import { relativisticAudio } from './audio/relativisticAudio';
import { TopBar } from './components/TopBar';
import { ControlDock } from './components/ControlDock';
import { PhysicsModal } from './components/PhysicsModal';

const DEFAULT_PARAMS: BlackHoleParams = {
  massSolar: 43,
  spin: 0.90,
  accretionRate: 0.85,
  inclinationDeg: 78,
  dopplerStrength: 1.0,
  lensingStrength: 1.0,
  probeRadiusRs: 3.4,
  explodedSeparation: 0.0,
  timeScale: 1.0,
  spectralMode: 'blackbody',
  layers: {
    accretionDisk: true,
    lensedHalo: true,
    relativisticJets: true,
    ergosphereCage: true,
    spacetimeGrid: true,
    orbitalProbe: true,
    geodesicRays: true,
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneControllerRef = useRef<BlackHoleSceneController | null>(null);

  const [params, setParams] = useState<BlackHoleParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string>('sgra');
  const [activeCamera, setActiveCamera] = useState<CameraPresetId>('equatorial');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  const [inspectedFeature, setInspectedFeature] = useState<InspectedFeature | null>(null);
  const [lastTrajectory, setLastTrajectory] = useState<GeodesicTrajectory | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{
    rRs: number;
    phiDeg: number;
    redshiftZ: number;
  } | null>(null);

  const metrics = useMemo(() => computeRelativisticMetrics(params), [params]);

  const activePreset = useMemo(
    () => ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0],
    [activePresetId]
  );

  // Initialize Three.js WebGL scene once inside isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = new BlackHoleSceneController(mountEl, DEFAULT_PARAMS, {
      onFeatureSelect: (feat) => setInspectedFeature(feat),
      onTrajectoryCreated: (traj) => {
        setLastTrajectory(traj);
        relativisticAudio.triggerGeodesicPing(traj.outcome);
      },
      onHoverCoordsChange: (coords) => setHoverCoords(coords),
    });
    sceneControllerRef.current = controller;

    return () => {
      controller.dispose();
      sceneControllerRef.current = null;
      relativisticAudio.dispose();
    };
  }, []);

  // Push parameter updates to Three.js controller and Web Audio synthesizer
  useEffect(() => {
    sceneControllerRef.current?.updateParams(params);
    relativisticAudio.updateParameters(params);
  }, [params]);

  // Keyboard shortcut 'H' for Cinema / Zen Mode control dock collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    const found = ASTROPHYSICAL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setParams((prev) => ({
      ...prev,
      ...found.params,
    }));
  }, []);

  const handleResetParams = useCallback(() => {
    setActivePresetId('sgra');
    setParams(DEFAULT_PARAMS);
    setActiveCamera('equatorial');
    sceneControllerRef.current?.setCameraPreset('equatorial');
  }, []);

  const handleSelectCamera = useCallback((preset: CameraPresetId) => {
    setActiveCamera(preset);
    sceneControllerRef.current?.setCameraPreset(preset);
  }, []);

  const handleLaunchPhoton = useCallback((impactB: number) => {
    sceneControllerRef.current?.launchPhotonGeodesic(impactB, 0);
  }, []);

  const handleClearPhotons = useCallback(() => {
    sceneControllerRef.current?.clearGeodesics();
    setLastTrajectory(null);
  }, []);

  const handleToggleAudio = useCallback(() => {
    const enabled = relativisticAudio.toggleAudio(params);
    setAudioEnabled(enabled);
  }, [params]);

  const handleExportSnapshot = useCallback(() => {
    if (!sceneControllerRef.current) return;
    const dataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
    const link = document.createElement('a');
    link.download = `black-hole-vis-${activePresetId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [activePresetId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070d] select-none flex flex-col">
      {/* Zone 1-3 Top Navigation Bar */}
      <TopBar
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onOpenTheoryModal={() => setIsTheoryModalOpen(true)}
        onExportSnapshot={handleExportSnapshot}
      />

      {/* Main 3D Viewport Stage */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Isolated WebGL Canvas Container */}
        <div
          ref={canvasMountRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {/* Minimal Top-Left Astrophysical Target Specification Badge (Unobstructed Center) */}
        <div className="absolute top-4 left-6 z-10 pointer-events-none max-w-sm">
          <div className="text-xs font-mono text-slate-400">
            <span>{activePreset.designation}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{activePreset.classification}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
            {activePreset.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-1 tabular-nums">
            <span>Mass {activePreset.realMassSolarDisplay}</span>
            <span aria-hidden="true">·</span>
            <span>Dist {activePreset.distanceLightYears}</span>
            <span aria-hidden="true">·</span>
            <span>Spin a* {params.spin.toFixed(3)}</span>
          </div>
          {hoverCoords && (
            <div className="mt-2 text-[11px] font-mono text-cyan-300/90 tabular-nums">
              Cursor Geodesic: r = {hoverCoords.rRs.toFixed(2)} Rₛ · φ = {hoverCoords.phiDeg.toFixed(0)}° · z = +{hoverCoords.redshiftZ.toFixed(3)}
            </div>
          )}
        </div>

        {/* Interactive Click-to-Inspect Feature Popover (Only visible when user clicks a 3D subsystem) */}
        {inspectedFeature && (
          <div className="absolute top-4 right-6 z-20 w-80 bg-[#080c16]/95 border border-slate-800 rounded-lg p-3.5 shadow-xl pointer-events-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono text-amber-400">
                  {inspectedFeature.subtitle}
                </div>
                <h3 className="font-display text-sm font-bold text-slate-100 mt-0.5">
                  {inspectedFeature.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedFeature(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded cursor-pointer"
                aria-label="Close inspection card"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 px-2 py-1 bg-[#0d1322] border border-slate-800/90 rounded font-mono text-xs text-cyan-300">
              {inspectedFeature.formula}
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              {inspectedFeature.description}
            </p>
          </div>
        )}

        {/* Unified Collapsible Bottom Control Dock */}
        <ControlDock
          params={params}
          metrics={metrics}
          activePresetId={activePresetId}
          isCollapsed={isDockCollapsed}
          onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
          onChangeParams={setParams}
          onSelectPreset={handleSelectPreset}
          onResetParams={handleResetParams}
          onSelectCamera={handleSelectCamera}
          activeCamera={activeCamera}
          onLaunchPhoton={handleLaunchPhoton}
          onClearPhotons={handleClearPhotons}
          lastTrajectory={lastTrajectory}
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
        />
      </main>

      {/* Relativistic Metrics & Effective Potential Modal */}
      <PhysicsModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
        params={params}
        metrics={metrics}
      />
    </div>
  );
}
