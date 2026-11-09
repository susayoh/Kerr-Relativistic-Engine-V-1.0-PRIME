import React from 'react';
import { ASTROPHYSICAL_PRESETS } from '../physics/gravitationalPhysics';

interface TopBarProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onOpenTheoryModal: () => void;
  onExportSnapshot: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenTheoryModal,
  onExportSnapshot,
}) => {
  return (
    <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#060911]/95 border-b border-slate-800/90">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectPreset('sgra');
        }}
        className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
      >
        Black Hole Interactive Visualizer
      </a>

      {/* Zone 2: 4-5 concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        {ASTROPHYSICAL_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b ${
                isActive
                  ? 'text-amber-400 border-amber-400'
                  : 'text-slate-400 border-transparent hover:text-slate-100 hover:border-slate-600'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenTheoryModal}
          className="text-slate-400 hover:text-slate-100 hover:border-slate-600 border-b border-transparent pb-0.5 transition-colors whitespace-nowrap shrink-0"
        >
          Relativistic Metrics
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportSnapshot}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Export Snapshot
        </button>
      </div>
    </header>
  );
};
