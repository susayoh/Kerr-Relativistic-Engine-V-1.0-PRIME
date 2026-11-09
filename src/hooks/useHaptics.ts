import { useCallback, useRef } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'pulseBoom';

interface UseHapticsOptions {
  enabled?: boolean;
}

/**
 * Custom React hook for triggering native vibration haptics on mobile devices.
 * Enhances tactile feedback when scrubbing range sliders, toggling buttons,
 * triggering sonic boom pulses, or navigating astrophysical targets.
 */
export function useHaptics(options: UseHapticsOptions = {}) {
  const { enabled = true } = options;
  const lastSliderTickRef = useRef<number>(0);

  const isSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  const trigger = useCallback(
    (type: HapticType = 'light') => {
      if (!enabled || !isSupported) return;

      try {
        switch (type) {
          case 'selection': {
            // Throttled ultra-light click (8ms) for continuous slider scrubbing (max ~20 Hz)
            const now = performance.now();
            if (now - lastSliderTickRef.current < 40) return;
            lastSliderTickRef.current = now;
            navigator.vibrate(8);
            break;
          }
          case 'light':
            // Crisp, subtle tap for button clicks and tab switches (12ms)
            navigator.vibrate(12);
            break;
          case 'medium':
            // Firmer haptic bump for preset selections and toggles (25ms)
            navigator.vibrate(25);
            break;
          case 'heavy':
            // Strong tactile pulse for resets and mode shifts (45ms)
            navigator.vibrate(45);
            break;
          case 'success':
            // Two-stage confirmation sequence (e.g. photo export)
            navigator.vibrate([15, 35, 20]);
            break;
          case 'pulseBoom':
            // Double-peaked N-wave relativistic blast pattern matching the sonic boom shockwave
            navigator.vibrate([40, 45, 20, 35, 12]);
            break;
        }
      } catch {
        // Silently ignore browser restrictions or unsupported contexts
      }
    },
    [enabled, isSupported]
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
