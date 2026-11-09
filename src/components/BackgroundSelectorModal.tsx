import React from 'react';
import { X, Check, Sun, Moon, Sparkles, Compass } from 'lucide-react';
import {
  BackgroundThemeId,
  BACKGROUND_THEMES,
} from '../physics/gravitationalPhysics';

interface BackgroundSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: BackgroundThemeId;
  onSelectTheme: (themeId: BackgroundThemeId) => void;
}

export const BackgroundSelectorModal: React.FC<BackgroundSelectorModalProps> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const themes = Object.values(BACKGROUND_THEMES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#070b16] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090e1c]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-100">
                Cosmic Background Environments
              </h2>
              <p className="text-xs text-slate-400">
                Choose a soothing, eye-friendly celestial environment to reduce contrast and glare
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close background selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Themes List */}
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {themes.map((theme) => {
            const isSelected = theme.id === activeThemeId;

            // Visual preview swatches
            const previewGradients: Record<BackgroundThemeId, string> = {
              galactic_core: 'from-[#2d180d] via-[#140a05] to-[#0a0705]',
              cosmic_nebula: 'from-[#082332] via-[#09152b] to-[#040810]',
              stellar_nursery: 'from-[#260e32] via-[#150722] to-[#08040d]',
              soothing_void: 'from-[#111722] via-[#080c14] to-[#030407]',
              slate_minimal: 'from-[#141b29] via-[#0c121d] to-[#080a10]',
            };

            return (
              <div
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0d162d] border-amber-500 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-[#0a0f20]/60 border-slate-800/90 hover:border-slate-600 hover:bg-[#0c1326]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Miniature swatch orb */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${previewGradients[theme.id]} border border-slate-700/60 shadow-inner shrink-0 flex items-center justify-center`}
                  >
                    <Sparkles
                      className={`w-4 h-4 ${
                        theme.id === 'galactic_core'
                          ? 'text-amber-400'
                          : theme.id === 'cosmic_nebula'
                          ? 'text-cyan-400'
                          : theme.id === 'stellar_nursery'
                          ? 'text-purple-400'
                          : 'text-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-slate-100">
                        {theme.name}
                      </h3>
                      {theme.id === 'soothing_void' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                          Headache Relief
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      {theme.tagline}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-700 hover:border-slate-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 bg-[#050811] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Anti-glare environments eliminate stark pitch-black eye fatigue</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
