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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-black border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-900 text-amber-400 border border-neutral-800">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-neutral-100">
                Cosmic Background Environments
              </h2>
              <p className="text-xs text-neutral-400">
                Choose a soothing, eye-friendly celestial environment to reduce contrast and glare
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
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
              pure_black: 'from-black via-black to-black',
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
                    ? 'bg-neutral-900 border-neutral-700 shadow-md ring-1 ring-neutral-700'
                    : 'bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Miniature swatch orb */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${previewGradients[theme.id]} border border-neutral-750 shadow-inner shrink-0 flex items-center justify-center`}
                  >
                    <Sparkles
                      className={`w-4 h-4 ${
                        theme.id === 'galactic_core'
                          ? 'text-amber-400'
                          : theme.id === 'cosmic_nebula'
                          ? 'text-cyan-400'
                          : theme.id === 'stellar_nursery'
                          ? 'text-purple-400'
                          : 'text-neutral-400'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-neutral-100">
                        {theme.name}
                      </h3>
                      {theme.id === 'soothing_void' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono">
                          Calm Neutral
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                      {theme.tagline}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-neutral-800 text-amber-300 border border-neutral-700 flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-neutral-800 hover:border-neutral-700" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 font-mono">
          <span>Anti-glare environments eliminate stark pitch-black eye fatigue</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded font-sans text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
