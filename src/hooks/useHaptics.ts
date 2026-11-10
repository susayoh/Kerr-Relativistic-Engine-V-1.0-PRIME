import { useCallback, useRef } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'pulseBoom';

export interface UseHapticsOptions {
  enabled?: boolean;
  /** Haptic feedback intensity / amplitude multiplier (0.0 to 2.0, default 1.0 = 100%) */
  intensity?: number;
}

let globalHapticIntensity = 1.0;

export function setGlobalHapticIntensity(intensity: number): void {
  globalHapticIntensity = Math.max(0, Math.min(2.0, intensity));
}

export function getGlobalHapticIntensity(): number {
  return globalHapticIntensity;
}

/**
 * Custom React hook for triggering native vibration haptics on mobile devices.
 * Enhances tactile feedback when scrubbing range sliders, toggling buttons,
 * triggering sonic boom pulses, or navigating astrophysical targets.
 * Supports configurable amplitude/intensity scaling via the SettingsModal slider.
 */
export function useHaptics(options: UseHapticsOptions = {}) {
  const { enabled = true, intensity } = options;
  const lastSliderTickRef = useRef<number>(0);

  const isSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  const trigger = useCallback(
    (type: HapticType = 'light') => {
      const effectiveIntensity =
        typeof intensity === 'number'
          ? Math.max(0, Math.min(2.0, intensity))
          : globalHapticIntensity;

      if (!enabled || !isSupported || effectiveIntensity <= 0.01) return;

      const scalePulse = (baseMs: number, minMs = 2) =>
        Math.max(minMs, Math.round(baseMs * effectiveIntensity));

      try {
        switch (type) {
          case 'selection': {
            // Throttled ultra-light click (base 8ms) for continuous slider scrubbing (max ~20 Hz)
            const now = performance.now();
            if (now - lastSliderTickRef.current < 40) return;
            lastSliderTickRef.current = now;
            navigator.vibrate(scalePulse(8, 2));
            break;
          }
          case 'light':
            // Crisp, subtle tap for button clicks and tab switches (base 12ms)
            navigator.vibrate(scalePulse(12, 3));
            break;
          case 'medium':
            // Firmer haptic bump for preset selections and toggles (base 25ms)
            navigator.vibrate(scalePulse(25, 5));
            break;
          case 'heavy':
            // Strong tactile pulse for resets and mode shifts (base 45ms)
            navigator.vibrate(scalePulse(45, 8));
            break;
          case 'success':
            // Two-stage confirmation sequence (e.g. photo export)
            navigator.vibrate([scalePulse(15, 4), 35, scalePulse(20, 5)]);
            break;
          case 'pulseBoom':
            // Double-peaked N-wave relativistic blast pattern matching the sonic boom shockwave
            navigator.vibrate([
              scalePulse(40, 8),
              45,
              scalePulse(20, 5),
              35,
              scalePulse(12, 3),
            ]);
            break;
        }
      } catch {
        // Silently ignore browser restrictions or unsupported contexts
      }
    },
    [enabled, intensity, isSupported]
  );

  const sliderTick = useCallback(() => trigger('selection'), [trigger]);
  const light = useCallback(() => trigger('light'), [trigger]);
  const medium = useCallback(() => trigger('medium'), [trigger]);
  const heavy = useCallback(() => trigger('heavy'), [trigger]);
  const pulseBoom = useCallback(() => trigger('pulseBoom'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);

  return {
    isSupported,
    trigger,
    sliderTick,
    light,
    medium,
    heavy,
    pulseBoom,
    success,
  };
}
