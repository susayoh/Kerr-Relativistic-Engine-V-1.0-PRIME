import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Activity,
  Sparkles,
  Orbit,
  Zap,
  Radio,
} from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '../i18n/translations';

export type AstrophysicalEventCategory =
  | 'accretion'
  | 'geodesic'
  | 'metric'
  | 'orbital'
  | 'system';

export interface AstrophysicalLogEvent {
  id: string;
  timestamp: string;
  category: AstrophysicalEventCategory;
  message: string;
  detail?: string;
}

interface EventLogOverlayProps {
  events: AstrophysicalLogEvent[];
  onClearEvents: () => void;
  isPaused: boolean;
  isDockCollapsed: boolean;
  isPhoneMode?: boolean;
  language?: AppLanguage;
}

const CATEGORY_STYLES: Record<
  AstrophysicalEventCategory,
  {
    dotClass: string;
    badgeClass: string;
    label: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  accretion: {
    dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]',
    badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
    label: 'FLUX',
    Icon: Zap,
  },
  geodesic: {
    dotClass: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]',
    badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/35',
    label: 'RAY',
    Icon: Orbit,
  },
  metric: {
    dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.7)]',
    badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-500/35',
    label: 'KERR',
    Icon: Sparkles,
  },
  orbital: {
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    badgeClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
    label: 'ORBIT',
    Icon: Radio,
  },
  system: {
    dotClass: 'bg-slate-300 shadow-[0_0_6px_rgba(203,213,225,0.5)]',
    badgeClass: 'text-slate-300 bg-slate-500/15 border-slate-500/35',
    label: 'SYS',
    Icon: Activity,
  },
};

export const EventLogOverlay: React.FC<EventLogOverlayProps> = ({
  events,
  onClearEvents,
  isPaused,
  isDockCollapsed,
  isPhoneMode = false,
  language = 'en',
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Auto-scroll to bottom when a new event arrives
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || isMinimized) return;
    el.scrollTop = el.scrollHeight;
  }, [events, isMinimized]);

  // Dynamic bottom offset so the bottom-left Event Log never overlaps the ControlDock
  const bottomPositionClass = isDockCollapsed
    ? 'bottom-12 sm:bottom-14'
    : isPhoneMode
      ? 'bottom-[198px]'
      : 'bottom-44 sm:bottom-48 2xl:bottom-4';

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div
      className={`absolute left-2 sm:left-4 ${bottomPositionClass} z-20 pointer-events-auto transition-all duration-200 ease-out ${
        isPhoneMode ? 'w-[240px]' : 'w-72 sm:w-80'
      }`}
    >
      <div className="bg-[#050811]/95 border border-slate-800/85 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Header Bar */}
        <div className="px-3 py-2 border-b border-slate-800/80 bg-neutral-950/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-100 truncate">
              {t.eventLogTitle || 'Event Log'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border ${
                isPaused
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              {isPaused ? 'HOLD' : 'LIVE'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 tabular-nums">
              {events.length}
            </span>

            {events.length > 0 && (
              <button
                type="button"
                onClick={onClearEvents}
                className="p-1 text-neutral-400 hover:text-rose-300 bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors cursor-pointer"
                title="Clear Event Log"
                aria-label="Clear Event Log"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand Event Log' : 'Minimize Event Log'}
              aria-label={isMinimized ? 'Expand Event Log' : 'Minimize Event Log'}
            >
              {isMinimized ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Minimized Single-Line Ticker Preview */}
        {isMinimized && latestEvent && (
          <div
            onClick={() => setIsMinimized(false)}
            className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-mono text-slate-300 hover:bg-neutral-900/60 cursor-pointer truncate"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                CATEGORY_STYLES[latestEvent.category].dotClass
              }`}
            />
            <span className="text-slate-500 shrink-0">{latestEvent.timestamp}</span>
            <span className="truncate text-slate-200">{latestEvent.message}</span>
          </div>
        )}

        {/* Expanded Real-Time Event Stream */}
        {!isMinimized && (
          <div
            ref={scrollContainerRef}
            className={`p-2.5 overflow-y-auto space-y-1.5 font-mono ${
              isPhoneMode ? 'max-h-28' : 'max-h-36 sm:max-h-44'
            }`}
          >
            {events.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-slate-500 font-mono">
                Monitoring relativistic telemetry stream...
              </div>
            ) : (
              events.map((evt, index) => {
                const style = CATEGORY_STYLES[evt.category];
                const isLatest = index === events.length - 1;
                return (
                  <div
                    key={evt.id}
                    className={`px-2 py-1.5 rounded-lg border transition-colors ${
                      isLatest
                        ? 'bg-neutral-900/90 border-slate-700/90 text-slate-100'
                        : 'bg-neutral-950/60 border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-[9px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dotClass}`}
                        />
                        <span
                          className={`px-1 py-0.2 rounded border font-bold tracking-wider uppercase ${style.badgeClass}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <span className="text-slate-500 tabular-nums shrink-0">
                        {evt.timestamp}
                      </span>
                    </div>

                    <div className="mt-1 text-[10.5px] leading-snug font-medium text-slate-100 break-words">
                      {evt.message}
                    </div>

                    {evt.detail && (
                      <div className="mt-0.5 text-[9.5px] text-slate-400 leading-tight break-words">
                        {evt.detail}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
