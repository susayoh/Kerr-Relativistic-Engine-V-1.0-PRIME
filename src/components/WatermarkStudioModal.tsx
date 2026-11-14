import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Download,
  Sparkles,
  Play,
  Pause,
  Video,
  Image as ImageIcon,
  Layers,
  Columns2,
  Check,
  Sliders,
  FileCode2,
  Palette,
  Orbit,
} from 'lucide-react';
import { UiThemeId } from '../scene/BlackHoleScene';
import { useHaptics } from '../hooks/useHaptics';

export const REFERENCE_WATERMARK_SVG_PATH =
  '/assets/aistudio/kerr-engine-v1.4-watermark-logo_917b28f3.svg';

export type WatermarkColorPresetId =
  | 'terracotta_copper'
  | 'observatory_gold'
  | 'cherenkov_cyan'
  | 'cryo_emerald'
  | 'chandra_violet'
  | 'crimson_flare'
  | 'monochrome_platinum'
  | 'doppler_bichrome';

export interface WatermarkColorPalette {
  id: WatermarkColorPresetId;
  name: string;
  subtitle: string;
  rayPrimary: string;
  raySecondary: string;
  photonRing: string;
  coreFill: string;
  dividerCenter: string;
  dividerEdge: string;
  titleColor: string;
  versionColor: string;
  subtitleColor: string;
  bgCenter: string;
  bgMid: string;
  bgEdge: string;
  swatchHex: string;
}

export const WATERMARK_COLOR_PALETTES: WatermarkColorPalette[] = [
  {
    id: 'terracotta_copper',
    name: 'Signature Terracotta',
    subtitle: 'Official v1.4 Copper-Gold',
    rayPrimary: '#E88B6B',
    raySecondary: '#F6B89E',
    photonRing: '#F6B89E',
    coreFill: '#090A0F',
    dividerCenter: '#F6B89E',
    dividerEdge: '#E88B6B',
    titleColor: '#F7F4EE',
    versionColor: '#E88B6B',
    subtitleColor: '#D6D0C6',
    bgCenter: '#140d0a',
    bgMid: '#070608',
    bgEdge: '#020203',
    swatchHex: '#E88B6B',
  },
  {
    id: 'observatory_gold',
    name: 'Observatory Gold',
    subtitle: 'Imperial Relativistic Gold',
    rayPrimary: '#D4AF37',
    raySecondary: '#FDE68A',
    photonRing: '#FDE68A',
    coreFill: '#080705',
    dividerCenter: '#FEF08A',
    dividerEdge: '#D4AF37',
    titleColor: '#FAFAFA',
    versionColor: '#F59E0B',
    subtitleColor: '#D4D4D8',
    bgCenter: '#141005',
    bgMid: '#080705',
    bgEdge: '#020203',
    swatchHex: '#D4AF37',
  },
  {
    id: 'cherenkov_cyan',
    name: 'Cherenkov Cyan',
    subtitle: 'Relativistic Blueshift',
    rayPrimary: '#38BDF8',
    raySecondary: '#BAE6FD',
    photonRing: '#BAE6FD',
    coreFill: '#040811',
    dividerCenter: '#E0F2FE',
    dividerEdge: '#38BDF8',
    titleColor: '#F0F9FF',
    versionColor: '#38BDF8',
    subtitleColor: '#94A3B8',
    bgCenter: '#06121e',
    bgMid: '#04070d',
    bgEdge: '#010204',
    swatchHex: '#38BDF8',
  },
  {
    id: 'cryo_emerald',
    name: 'Planck Emerald',
    subtitle: 'Cryo-Quantum Telemetry',
    rayPrimary: '#10B981',
    raySecondary: '#6EE7B7',
    photonRing: '#A7F3D0',
    coreFill: '#030907',
    dividerCenter: '#A7F3D0',
    dividerEdge: '#10B981',
    titleColor: '#ECFDF5',
    versionColor: '#34D399',
    subtitleColor: '#A7F3D0',
    bgCenter: '#05140f',
    bgMid: '#030806',
    bgEdge: '#010302',
    swatchHex: '#10B981',
  },
  {
    id: 'chandra_violet',
    name: 'Chandra X-Ray',
    subtitle: 'High-Energy Coronal Violet',
    rayPrimary: '#A855F7',
    raySecondary: '#E9D5FF',
    photonRing: '#E9D5FF',
    coreFill: '#09040E',
    dividerCenter: '#F3E8FF',
    dividerEdge: '#A855F7',
    titleColor: '#FAF5FF',
    versionColor: '#C084FC',
    subtitleColor: '#D8B4FE',
    bgCenter: '#13071e',
    bgMid: '#08040d',
    bgEdge: '#020104',
    swatchHex: '#A855F7',
  },
  {
    id: 'crimson_flare',
    name: 'Horizon Crimson',
    subtitle: 'Deep Gravitational Redshift',
    rayPrimary: '#F43F5E',
    raySecondary: '#FDA4AF',
    photonRing: '#FECDD3',
    coreFill: '#0D0406',
    dividerCenter: '#FECDD3',
    dividerEdge: '#F43F5E',
    titleColor: '#FFF1F2',
    versionColor: '#FB7185',
    subtitleColor: '#FDA4AF',
    bgCenter: '#19060a',
    bgMid: '#090406',
    bgEdge: '#030102',
    swatchHex: '#F43F5E',
  },
  {
    id: 'monochrome_platinum',
    name: 'Monochrome Silver',
    subtitle: 'Pure Architectural Platinum',
    rayPrimary: '#E4E4E7',
    raySecondary: '#FFFFFF',
    photonRing: '#FFFFFF',
    coreFill: '#050507',
    dividerCenter: '#FFFFFF',
    dividerEdge: '#A1A1AA',
    titleColor: '#FFFFFF',
    versionColor: '#D4D4D8',
    subtitleColor: '#A1A1AA',
    bgCenter: '#111115',
    bgMid: '#070709',
    bgEdge: '#020203',
    swatchHex: '#E4E4E7',
  },
  {
    id: 'doppler_bichrome',
    name: 'Doppler Dual-Shift',
    subtitle: 'Blueshift / Redshift Split',
    rayPrimary: '#38BDF8',
    raySecondary: '#F43F5E',
    photonRing: '#FDE68A',
    coreFill: '#06070C',
    dividerCenter: '#FDE68A',
    dividerEdge: '#38BDF8',
    titleColor: '#F8FAFC',
    versionColor: '#38BDF8',
    subtitleColor: '#CBD5E1',
    bgCenter: '#0d0a18',
    bgMid: '#06060b',
    bgEdge: '#020204',
    swatchHex: 'linear-gradient(135deg, #38BDF8 0%, #F43F5E 100%)',
  },
];

export type MovingAnimationStyleId =
  | 'minimal_vector_spin'
  | 'kerr_frame_dragging'
  | 'dual_harmonic_orbit'
  | 'singularity_pulse_reveal';

interface WatermarkStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiTheme?: UiThemeId;
  hapticsEnabled?: boolean;
}

type StudioViewMode = 'split' | 'still' | 'moving';

// Exact 6 intersecting ray lines (12 rays) matching /public/assets/aistudio/kerr-engine-v1.4-watermark-logo_917b28f3.svg
const EXACT_STARBURST_RAYS = [0, 1, 2, 3, 4, 5].map((i) => {
  const angle = (i * Math.PI) / 6;
  const rRay = i % 2 === 0 ? 110 : 88;
  const x1 = Math.cos(angle) * -rRay;
  const y1 = Math.sin(angle) * -rRay;
  const x2 = Math.cos(angle) * rRay;
  const y2 = Math.sin(angle) * rRay;
  const strokeWidth = i % 3 === 0 ? 13.5 : 9;
  return { i, angle, rRay, x1, y1, x2, y2, strokeWidth };
});

export const WatermarkStudioModal: React.FC<WatermarkStudioModalProps> = ({
  isOpen,
  onClose,
  hapticsEnabled = true,
}) => {
  const haptics = useHaptics({ enabled: hapticsEnabled });

  const [viewMode, setViewMode] = useState<StudioViewMode>('split');
  const [selectedColorId, setSelectedColorId] =
    useState<WatermarkColorPresetId>('terracotta_copper');
  const [motionStyle, setMotionStyle] =
    useState<MovingAnimationStyleId>('kerr_frame_dragging');
  const [isPlayingMotion, setIsPlayingMotion] = useState<boolean>(true);
  const [spinSpeed, setSpinSpeed] = useState<number>(1.0);
  const [glowIntensity, setGlowIntensity] = useState<number>(0.85);
  const [isRecordingMotionVideo, setIsRecordingMotionVideo] = useState<boolean>(false);
  const [recordingProgressPct, setRecordingProgressPct] = useState<number>(0);
  const [downloadedBadge, setDownloadedBadge] = useState<string | null>(null);

  const movingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRafRef = useRef<number | null>(null);

  const activePalette = useMemo(
    () =>
      WATERMARK_COLOR_PALETTES.find((p) => p.id === selectedColorId) ||
      WATERMARK_COLOR_PALETTES[0],
    [selectedColorId]
  );

  const showSavedFeedback = useCallback((label: string) => {
    setDownloadedBadge(label);
    window.setTimeout(() => {
      setDownloadedBadge((prev) => (prev === label ? null : prev));
    }, 2400);
  }, []);

  // Build exact SVG markup matching /public/assets/aistudio/kerr-engine-v1.4-watermark-logo_917b28f3.svg
  // with support for any selected color palette and optional native SVG animation
  const buildWatermarkSvgString = useCallback(
    (palette: WatermarkColorPalette, animated: boolean, transparentBg: boolean = false) => {
      const isBichrome = palette.id === 'doppler_bichrome';
      const spinDurationSec = Math.max(2, 12 / Math.max(0.25, spinSpeed)).toFixed(2);
      const counterSpinDurationSec = Math.max(3, 18 / Math.max(0.25, spinSpeed)).toFixed(2);

      const raysMarkup = EXACT_STARBURST_RAYS.map((ray) => {
        const strokeAttr = isBichrome ? 'url(#bichromeRayGrad)' : palette.rayPrimary;
        return `<line x1="${ray.x1.toFixed(2)}" y1="${ray.y1.toFixed(2)}" x2="${ray.x2.toFixed(
          2
        )}" y2="${ray.y2.toFixed(
          2
        )}" stroke="${strokeAttr}" stroke-opacity="0.95" stroke-width="${
          ray.strokeWidth
        }" stroke-linecap="round" />`;
      }).join('\n      ');

      const secondaryHarmonicMarkup =
        animated && motionStyle === 'dual_harmonic_orbit'
          ? `<g opacity="${(0.42 * glowIntensity).toFixed(2)}">
      <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="${counterSpinDurationSec}s" repeatCount="indefinite" />
      ${EXACT_STARBURST_RAYS.map(
        (ray) =>
          `<line x1="${(ray.x1 * 1.18).toFixed(2)}" y1="${(ray.y1 * 1.18).toFixed(
            2
          )}" x2="${(ray.x2 * 1.18).toFixed(2)}" y2="${(ray.y2 * 1.18).toFixed(
            2
          )}" stroke="${palette.raySecondary}" stroke-opacity="0.55" stroke-width="${(
            ray.strokeWidth * 0.45
          ).toFixed(1)}" stroke-linecap="round" />`
      ).join('\n      ')}
    </g>`
          : '';

      const frameDragRingsMarkup =
        animated &&
        (motionStyle === 'kerr_frame_dragging' || motionStyle === 'dual_harmonic_orbit')
          ? `<g opacity="${(0.65 * glowIntensity).toFixed(2)}">
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(
        Number(spinDurationSec) * 0.75
      ).toFixed(2)}s" repeatCount="indefinite" />
      <circle cx="0" cy="0" r="134" fill="none" stroke="url(#dividerGrad)" stroke-width="2.2" stroke-dasharray="140 95 80 110" stroke-linecap="round" />
      <circle cx="0" cy="0" r="64" fill="none" stroke="${
        palette.photonRing
      }" stroke-opacity="0.38" stroke-width="2" stroke-dasharray="60 55 40 65" stroke-linecap="round" />
    </g>`
          : '';

      const pulseWaveMarkup =
        animated && motionStyle === 'singularity_pulse_reveal'
          ? `<circle cx="0" cy="0" r="34" fill="none" stroke="${palette.photonRing}" stroke-width="3">
      <animate attributeName="r" values="30;155;155" dur="3.2s" repeatCount="indefinite" />
      <animate attributeName="stroke-opacity" values="0.85;0;0" dur="3.2s" repeatCount="indefinite" />
    </circle>`
          : '';

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="obsidianBg" cx="50%" cy="43%" r="65%">
      <stop offset="0%" stop-color="${palette.bgCenter}"/>
      <stop offset="35%" stop-color="${palette.bgMid}"/>
      <stop offset="100%" stop-color="${palette.bgEdge}"/>
    </radialGradient>
    <radialGradient id="emblemGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.rayPrimary}" stop-opacity="${(
        0.26 * glowIntensity
      ).toFixed(2)}"/>
      <stop offset="55%" stop-color="${palette.rayPrimary}" stop-opacity="${(
        0.06 * glowIntensity
      ).toFixed(2)}"/>
      <stop offset="100%" stop-color="${palette.rayPrimary}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="dividerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${palette.dividerEdge}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${palette.dividerCenter}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${palette.dividerEdge}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bichromeRayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.rayPrimary}"/>
      <stop offset="50%" stop-color="${palette.photonRing}"/>
      <stop offset="100%" stop-color="${palette.raySecondary}"/>
    </linearGradient>
  </defs>
  ${transparentBg ? '' : '<rect width="1920" height="1080" fill="url(#obsidianBg)"/>'}
  <circle cx="960" cy="445" r="240" fill="url(#emblemGlow)" />
  <g transform="translate(960, 445)">
    ${frameDragRingsMarkup}
    ${secondaryHarmonicMarkup}
    ${pulseWaveMarkup}
    <g>
      ${
        animated
          ? `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${spinDurationSec}s" repeatCount="indefinite" />`
          : ''
      }
      ${raysMarkup}
    </g>
    <circle cx="0" cy="0" r="28" fill="${palette.coreFill}" stroke="${
        palette.photonRing
      }" stroke-width="11.5">
      ${
        animated
          ? `<animate attributeName="stroke-width" values="11.5;13.2;11.5" dur="2.4s" repeatCount="indefinite" />`
          : ''
      }
    </circle>
  </g>
  <line x1="630" y1="620" x2="1290" y2="620" stroke="url(#dividerGrad)" stroke-width="2"/>
  <text x="960" y="688" text-anchor="middle" font-family="'Chakra Petch', 'Plus Jakarta Sans', sans-serif" font-size="48" font-weight="700" letter-spacing="4" fill="${
    palette.titleColor
  }">
    KERR RELATIVITY ENGINE <tspan fill="${
      palette.versionColor
    }" font-family="'JetBrains Mono', monospace" font-size="34">v1.4</tspan>
  </text>
  <text x="960" y="742" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="21" font-weight="500" letter-spacing="5" fill="${
    palette.subtitleColor
  }" fill-opacity="0.8">
    GENERATED BY KERR ENGINE · APEX METRIC CORE
  </text>
</svg>`;
    },
    [glowIntensity, motionStyle, spinSpeed]
  );

  // Draw the exact SVG layout onto a 2D Canvas (used for both 4K Still PNG Export and 60FPS Moving Video Export)
  const drawWatermarkFrameToCanvas = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      palette: WatermarkColorPalette,
      phaseRad: number,
      isAnimatedFrame: boolean,
      transparentBackground: boolean
    ) => {
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Exact coordinate mapping to viewBox="0 0 1920 1080"
      const s = width / 1920;
      const cx = 960 * s;
      const cy = 445 * s;

      if (!transparentBackground) {
        // Exact radialGradient id="obsidianBg" cx="50%" cy="43%" r="65%"
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.43,
          2 * s,
          width * 0.5,
          height * 0.43,
          width * 0.65
        );
        bgGrad.addColorStop(0, palette.bgCenter);
        bgGrad.addColorStop(0.35, palette.bgMid);
        bgGrad.addColorStop(1, palette.bgEdge);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Subtle volumetric corona around (960, 445)
      if (glowIntensity > 0.05) {
        const coronaRadius = (230 + (isAnimatedFrame ? 18 * Math.sin(phaseRad * 2) : 0)) * s;
        const haloGrad = ctx.createRadialGradient(cx, cy, 18 * s, cx, cy, coronaRadius);
        haloGrad.addColorStop(0, palette.rayPrimary + '38');
        haloGrad.addColorStop(0.5, palette.rayPrimary + '12');
        haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coronaRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Emblem Group at (960, 445)
      ctx.save();
      ctx.translate(cx, cy);

      if (isAnimatedFrame) {
        // Style 1: Kerr Frame-Dragging swirling geodesic arcs & afterimage trails
        if (
          motionStyle === 'kerr_frame_dragging' ||
          motionStyle === 'dual_harmonic_orbit'
        ) {
          const arcCount = 12;
          for (let k = 0; k < arcCount; k++) {
            const norm = k / arcCount;
            const rArc = (48 + norm * 88) * s;
            const startAngle = phaseRad * (1.6 - norm * 0.55) + k * ((Math.PI * 2) / arcCount);
            const sweepAngle = 0.55 + 0.25 * Math.sin(phaseRad * 2 + k);
            ctx.beginPath();
            ctx.arc(0, 0, rArc, startAngle, startAngle + sweepAngle);
            ctx.strokeStyle = k % 2 === 0 ? palette.rayPrimary : palette.raySecondary;
            ctx.globalAlpha = (0.28 * (1 - norm * 0.55) * glowIntensity);
            ctx.lineWidth = (2.6 - norm * 1.1) * s;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Style 2: Counter-rotating harmonic lattice
        if (motionStyle === 'dual_harmonic_orbit') {
          ctx.save();
          ctx.rotate(-phaseRad * 0.65);
          ctx.globalAlpha = 0.34 * glowIntensity;
          for (const ray of EXACT_STARBURST_RAYS) {
            ctx.beginPath();
            ctx.strokeStyle = palette.raySecondary;
            ctx.lineWidth = ray.strokeWidth * 0.48 * s;
            ctx.lineCap = 'round';
            ctx.moveTo(ray.x1 * 1.18 * s, ray.y1 * 1.18 * s);
            ctx.lineTo(ray.x2 * 1.18 * s, ray.y2 * 1.18 * s);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Style 3: Singularity Pulse Reveal expanding gravitational ripple
        if (motionStyle === 'singularity_pulse_reveal') {
          const cycle = (phaseRad * 0.45) % 1;
          const waveR = (30 + cycle * 145) * s;
          ctx.beginPath();
          ctx.arc(0, 0, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = palette.photonRing;
          ctx.globalAlpha = Math.max(0, (1 - cycle) * 0.65 * glowIntensity);
          ctx.lineWidth = 3.2 * s;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Subtle rotational motion-blur ghost steps for silky 60fps perception
        if (motionStyle !== 'minimal_vector_spin' && glowIntensity > 0.2) {
          for (let g = 3; g >= 1; g--) {
            ctx.save();
            ctx.rotate(phaseRad - g * 0.045 * spinSpeed);
            ctx.globalAlpha = (0.11 / g) * glowIntensity;
            ctx.strokeStyle = palette.rayPrimary;
            ctx.lineCap = 'round';
            for (const ray of EXACT_STARBURST_RAYS) {
              ctx.beginPath();
              ctx.lineWidth = ray.strokeWidth * s;
              ctx.moveTo(ray.x1 * s, ray.y1 * s);
              ctx.lineTo(ray.x2 * s, ray.y2 * s);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      // Main 12-Ray Starburst Singularity Emblem (Exact SVG coordinates)
      ctx.save();
      if (isAnimatedFrame) {
        ctx.rotate(phaseRad);
      }

      const rayScale =
        isAnimatedFrame && motionStyle === 'singularity_pulse_reveal'
          ? 0.92 + 0.08 * Math.sin(phaseRad * 2)
          : 1.0;

      for (const ray of EXACT_STARBURST_RAYS) {
        ctx.beginPath();
        if (palette.id === 'doppler_bichrome') {
          const rayGrad = ctx.createLinearGradient(
            ray.x1 * s,
            ray.y1 * s,
            ray.x2 * s,
            ray.y2 * s
          );
          rayGrad.addColorStop(0, palette.rayPrimary);
          rayGrad.addColorStop(0.5, palette.photonRing);
          rayGrad.addColorStop(1, palette.raySecondary);
          ctx.strokeStyle = rayGrad;
        } else {
          ctx.strokeStyle = palette.rayPrimary;
        }
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = ray.strokeWidth * s;
        ctx.lineCap = 'round';
        ctx.moveTo(ray.x1 * rayScale * s, ray.y1 * rayScale * s);
        ctx.lineTo(ray.x2 * rayScale * s, ray.y2 * rayScale * s);
        ctx.stroke();
      }
      ctx.restore();

      // Event Horizon Core & Photon Sphere Ring: <circle cx="0" cy="0" r="28" fill="#090A0F" stroke="#F6B89E" stroke-width="11.5"/>
      const ringPulse = isAnimatedFrame ? 11.5 + 1.1 * Math.sin(phaseRad * 3) : 11.5;
      ctx.beginPath();
      ctx.arc(0, 0, 28 * s, 0, Math.PI * 2);
      ctx.fillStyle = palette.coreFill;
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.lineWidth = ringPulse * s;
      ctx.strokeStyle = palette.photonRing;
      ctx.stroke();

      ctx.restore();

      // Architectural Hairline Divider: <line x1="630" y1="620" x2="1290" y2="620" stroke="url(#dividerGrad)" stroke-width="2"/>
      const divY = 620 * s;
      const divX1 = 630 * s;
      const divX2 = 1290 * s;
      const divGrad = ctx.createLinearGradient(divX1, divY, divX2, divY);
      divGrad.addColorStop(0, 'rgba(0,0,0,0)');
      divGrad.addColorStop(0.5, palette.dividerCenter);
      divGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 2 * s;
      ctx.moveTo(divX1, divY);
      ctx.lineTo(divX2, divY);
      ctx.stroke();

      // Traveling photon shimmer on divider when moving
      if (isAnimatedFrame && glowIntensity > 0.1) {
        const shimmerX = cx + Math.sin(phaseRad * 1.5) * (260 * s);
        const shimmerGrad = ctx.createRadialGradient(
          shimmerX,
          divY,
          1 * s,
          shimmerX,
          divY,
          48 * s
        );
        shimmerGrad.addColorStop(0, palette.photonRing);
        shimmerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(shimmerX - 48 * s, divY - 3 * s, 96 * s, 6 * s);
      }
      ctx.restore();

      // Primary Typography at y="688": KERR RELATIVITY ENGINE v1.4
      ctx.save();
      const titleY = 688 * s;
      ctx.textBaseline = 'alphabetic';

      // Measure with letter-spacing="4" equivalent
      const titleText = 'KERR RELATIVITY ENGINE ';
      const versionText = 'v1.4';
      ctx.font = `700 ${Math.round(48 * s)}px "Chakra Petch", "Plus Jakarta Sans", sans-serif`;
      if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${4 * s}px`;
      }
      const titleW = ctx.measureText(titleText).width;

      ctx.font = `700 ${Math.round(34 * s)}px "JetBrains Mono", monospace`;
      const versionW = ctx.measureText(versionText).width;

      const totalLine1W = titleW + versionW;
      const startX1 = cx - totalLine1W * 0.5;

      ctx.font = `700 ${Math.round(48 * s)}px "Chakra Petch", "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = palette.titleColor;
      ctx.textAlign = 'left';
      ctx.fillText(titleText, startX1, titleY);

      ctx.font = `700 ${Math.round(34 * s)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = palette.versionColor;
      ctx.fillText(versionText, startX1 + titleW, titleY);

      // Subtitle Typography at y="742": GENERATED BY KERR ENGINE · APEX METRIC CORE
      const subY = 742 * s;
      ctx.font = `500 ${Math.round(21 * s)}px "JetBrains Mono", monospace`;
      if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${5 * s}px`;
      }
      ctx.fillStyle = palette.subtitleColor;
      ctx.globalAlpha = 0.8;
      ctx.textAlign = 'center';
      ctx.fillText('GENERATED BY KERR ENGINE · APEX METRIC CORE', cx, subY);
      ctx.restore();

      ctx.restore();
    },
    [glowIntensity, motionStyle, spinSpeed]
  );

  // 60 FPS Animation Loop for the Moving Watermark Canvas
  useEffect(() => {
    if (!isOpen || viewMode === 'still') return;
    const canvas = movingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    let lastTime = performance.now();
    let isMounted = true;

    const step = (now: number) => {
      if (!isMounted) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isPlayingMotion) {
        phase += dt * 1.15 * spinSpeed;
      }

      drawWatermarkFrameToCanvas(
        ctx,
        canvas.width,
        canvas.height,
        activePalette,
        phase,
        true,
        false
      );

      animRafRef.current = window.requestAnimationFrame(step);
    };

    animRafRef.current = window.requestAnimationFrame(step);
    return () => {
      isMounted = false;
      if (animRafRef.current !== null) {
        window.cancelAnimationFrame(animRafRef.current);
      }
    };
  }, [
    isOpen,
    viewMode,
    isPlayingMotion,
    spinSpeed,
    activePalette,
    drawWatermarkFrameToCanvas,
  ]);

  // Export 4K Still PNG (Obsidian Background or Transparent Alpha)
  const handleExport4KStillPng = useCallback(
    (transparentAlpha: boolean) => {
      haptics.success();
      const offscreen = document.createElement('canvas');
      offscreen.width = 3840;
      offscreen.height = 2160;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      drawWatermarkFrameToCanvas(
        ctx,
        offscreen.width,
        offscreen.height,
        activePalette,
        0,
        false,
        transparentAlpha
      );
      const dataUrl = offscreen.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = transparentAlpha
        ? `kerr-engine-v1.4-watermark-${activePalette.id}-4K-transparent.png`
        : `kerr-engine-v1.4-watermark-${activePalette.id}-4K.png`;
      link.href = dataUrl;
      link.click();
      showSavedFeedback(
        transparentAlpha ? '4K Transparent PNG Saved' : '4K Master PNG Saved'
      );
    },
    [activePalette, drawWatermarkFrameToCanvas, haptics, showSavedFeedback]
  );

  // Export Still or Animated Vector SVG
  const handleExportSvg = useCallback(
    (animated: boolean) => {
      haptics.success();
      const svgContent = buildWatermarkSvgString(activePalette, animated, false);
      const blob = new Blob([svgContent], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = animated
        ? `kerr-engine-v1.4-watermark-${activePalette.id}-moving.svg`
        : `kerr-engine-v1.4-watermark-${activePalette.id}-still.svg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      showSavedFeedback(
        animated ? 'Animated Vector .SVG Saved' : 'Still Vector .SVG Saved'
      );
    },
    [activePalette, buildWatermarkSvgString, haptics, showSavedFeedback]
  );

  // Record 60FPS Moving Watermark Video (.MP4 / .WebM)
  const handleRecordMovingWatermarkVideo = useCallback(() => {
    const canvas = movingCanvasRef.current;
    if (!canvas || isRecordingMotionVideo) return;

    haptics.medium();
    setIsPlayingMotion(true);
    setIsRecordingMotionVideo(true);
    setRecordingProgressPct(0);

    const stream = canvas.captureStream(60);
    const candidateMimeTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const selectedMimeType =
      candidateMimeTypes.find(
        (type) =>
          typeof MediaRecorder !== 'undefined' &&
          MediaRecorder.isTypeSupported(type)
      ) || '';

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(
      stream,
      selectedMimeType
        ? { mimeType: selectedMimeType, videoBitsPerSecond: 12_000_000 }
        : { videoBitsPerSecond: 12_000_000 }
    );

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const durationMs = 4000;
    const startMs = performance.now();
    const progressInterval = window.setInterval(() => {
      const elapsed = performance.now() - startMs;
      setRecordingProgressPct(
        Math.min(100, Math.round((elapsed / durationMs) * 100))
      );
    }, 80);

    recorder.onstop = () => {
      window.clearInterval(progressInterval);
      stream.getTracks().forEach((t) => t.stop());
      setIsRecordingMotionVideo(false);
      setRecordingProgressPct(0);

      if (chunks.length === 0) return;
      const finalMime = recorder.mimeType || selectedMimeType || 'video/webm';
      const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: finalMime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `kerr-engine-v1.4-watermark-${activePalette.id}-moving-60fps.${ext}`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      haptics.success();
      showSavedFeedback(`Moving 60FPS .${ext.toUpperCase()} Saved`);
    };

    recorder.start(200);
    window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, durationMs);
  }, [activePalette.id, haptics, isRecordingMotionVideo, showSavedFeedback]);

  if (!isOpen) return null;

  const isBichrome = activePalette.id === 'doppler_bichrome';

  return (
    <div
      data-testid="watermark-studio-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md pointer-events-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="watermark-studio-title"
        data-testid="watermark-studio-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl border border-[#D97757]/40 bg-[#080605] rounded-2xl overflow-hidden flex flex-col max-h-[92vh] font-mono shadow-[0_28px_80px_rgba(0,0,0,0.96),0_0_40px_rgba(217,119,87,0.14)]"
      >
        {/* Studio Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-[#D97757]/25 bg-[#120e0c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-[#D97757]/65 bg-[#201815] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(217,119,87,0.2)]">
              <svg
                width="20"
                height="20"
                viewBox="-140 -140 280 280"
                className="shrink-0 overflow-visible animate-[spin_10s_linear_infinite]"
                aria-hidden="true"
              >
                {EXACT_STARBURST_RAYS.map((ray) => (
                  <line
                    key={ray.i}
                    x1={ray.x1}
                    y1={ray.y1}
                    x2={ray.x2}
                    y2={ray.y2}
                    stroke={activePalette.rayPrimary}
                    strokeOpacity="0.95"
                    strokeWidth={ray.strokeWidth}
                    strokeLinecap="round"
                  />
                ))}
                <circle
                  cx="0"
                  cy="0"
                  r="28"
                  fill={activePalette.coreFill}
                  stroke={activePalette.photonRing}
                  strokeWidth="11.5"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="watermark-studio-title"
                  className="font-display text-sm sm:text-base font-bold text-[#F7F4EE] tracking-wide uppercase"
                >
                  Kerr Engine Watermark Logo Studio
                </h2>
                <span
                  className="px-1.5 py-0.5 rounded bg-[#201815] border text-[9.5px] font-bold"
                  style={{
                    borderColor: `${activePalette.rayPrimary}88`,
                    color: activePalette.photonRing,
                  }}
                >
                  {activePalette.name.toUpperCase()}
                </span>
              </div>
              <p className="text-[10.5px] text-zinc-400">
                Precision 1920×1080 Vector Architecture · Still & 60 FPS Relativistic Motion Exports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {downloadedBadge && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-[10.5px] font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloadedBadge}</span>
              </span>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg bg-[#090706] p-0.5 border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setViewMode('split');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-[#201815] text-[#F7F4EE] border border-[#D97757]/60 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Columns2 className="w-3 h-3 text-[#E88B6B]" />
                <span>Both</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setViewMode('still');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] transition-all cursor-pointer ${
                  viewMode === 'still'
                    ? 'bg-[#201815] text-[#F7F4EE] border border-[#D97757]/60 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ImageIcon className="w-3 h-3 text-[#E88B6B]" />
                <span>Still</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setViewMode('moving');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] transition-all cursor-pointer ${
                  viewMode === 'moving'
                    ? 'bg-[#201815] text-[#F7F4EE] border border-[#D97757]/60 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Video className="w-3 h-3 text-[#E88B6B]" />
                <span>Moving</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-400 hover:text-white cursor-pointer transition-colors"
              aria-label="Close Watermark Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Studio Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Color Theme Selector Bar */}
          <div className="rounded-xl border border-zinc-800/90 bg-[#0d0b0a] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                <Palette className="w-3.5 h-3.5 text-[#E88B6B]" />
                <span>Watermark Color Spectrum</span>
              </div>
              <span className="text-[10px] text-zinc-400">
                {activePalette.name} — {activePalette.subtitle}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
              {WATERMARK_COLOR_PALETTES.map((palette) => {
                const isSelected = palette.id === selectedColorId;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    data-testid={`watermark-color-${palette.id}`}
                    onClick={() => {
                      haptics.light();
                      setSelectedColorId(palette.id);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1512] border-white/60 text-white shadow-[0_0_14px_rgba(255,255,255,0.12)] font-semibold'
                        : 'bg-[#080706] hover:bg-[#141110] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                      style={{ background: palette.swatchHex }}
                    />
                    <span className="text-[10px] truncate">{palette.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Still & Moving Preview Stage Grid */}
          <div
            className={`grid gap-4 ${
              viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* PANEL 1: STILL WATERMARK LOGO (Exact Vector Geometry of Attached SVG) */}
            {(viewMode === 'split' || viewMode === 'still') && (
              <div
                data-testid="watermark-still-card"
                className="flex flex-col rounded-xl border border-zinc-800/90 bg-[#0c0a09] overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-zinc-800/80 bg-[#120f0d]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: activePalette.swatchHex }}
                    />
                    <span className="font-display text-xs font-bold tracking-wider uppercase text-[#F7F4EE]">
                      1. Still Watermark Logo
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      (Exact 1920×1080 Vector Master)
                    </span>
                  </div>
                  <span className="text-[9.5px] px-2 py-0.5 rounded bg-black/60 border border-zinc-800 text-zinc-300">
                    Lossless Geometry
                  </span>
                </div>

                {/* Live Crisp Vector SVG Still Preview matching /public/assets/aistudio/kerr-engine-v1.4-watermark-logo_917b28f3.svg */}
                <div className="relative aspect-video w-full bg-[#020203] flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                  <svg
                    viewBox="0 0 1920 1080"
                    className="w-full h-full object-contain select-none"
                    aria-label="Kerr Relativity Engine v1.4 Still Watermark Logo"
                  >
                    <defs>
                      <radialGradient
                        id={`stillBg-${activePalette.id}`}
                        cx="50%"
                        cy="43%"
                        r="65%"
                      >
                        <stop offset="0%" stopColor={activePalette.bgCenter} />
                        <stop offset="35%" stopColor={activePalette.bgMid} />
                        <stop offset="100%" stopColor={activePalette.bgEdge} />
                      </radialGradient>
                      <linearGradient
                        id={`stillDiv-${activePalette.id}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor={activePalette.dividerEdge}
                          stopOpacity="0"
                        />
                        <stop
                          offset="50%"
                          stopColor={activePalette.dividerCenter}
                          stopOpacity="0.9"
                        />
                        <stop
                          offset="100%"
                          stopColor={activePalette.dividerEdge}
                          stopOpacity="0"
                        />
                      </linearGradient>
                      <linearGradient
                        id={`stillBichrome-${activePalette.id}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor={activePalette.rayPrimary} />
                        <stop offset="50%" stopColor={activePalette.photonRing} />
                        <stop offset="100%" stopColor={activePalette.raySecondary} />
                      </linearGradient>
                    </defs>

                    <rect
                      width="1920"
                      height="1080"
                      fill={`url(#stillBg-${activePalette.id})`}
                    />

                    <g transform="translate(960, 445)">
                      {EXACT_STARBURST_RAYS.map((ray) => (
                        <line
                          key={ray.i}
                          x1={ray.x1}
                          y1={ray.y1}
                          x2={ray.x2}
                          y2={ray.y2}
                          stroke={
                            isBichrome
                              ? `url(#stillBichrome-${activePalette.id})`
                              : activePalette.rayPrimary
                          }
                          strokeOpacity="0.95"
                          strokeWidth={ray.strokeWidth}
                          strokeLinecap="round"
                        />
                      ))}
                      <circle
                        cx="0"
                        cy="0"
                        r="28"
                        fill={activePalette.coreFill}
                        stroke={activePalette.photonRing}
                        strokeWidth="11.5"
                      />
                    </g>

                    <line
                      x1="630"
                      y1="620"
                      x2="1290"
                      y2="620"
                      stroke={`url(#stillDiv-${activePalette.id})`}
                      strokeWidth="2"
                    />

                    <text
                      x="960"
                      y="688"
                      textAnchor="middle"
                      fontFamily="'Chakra Petch', 'Plus Jakarta Sans', sans-serif"
                      fontSize="48"
                      fontWeight="700"
                      letterSpacing="4"
                      fill={activePalette.titleColor}
                    >
                      KERR RELATIVITY ENGINE{' '}
                      <tspan
                        fill={activePalette.versionColor}
                        fontFamily="'JetBrains Mono', monospace"
                        fontSize="34"
                      >
                        v1.4
                      </tspan>
                    </text>

                    <text
                      x="960"
                      y="742"
                      textAnchor="middle"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="21"
                      fontWeight="500"
                      letterSpacing="5"
                      fill={activePalette.subtitleColor}
                      fillOpacity="0.8"
                    >
                      GENERATED BY KERR ENGINE · APEX METRIC CORE
                    </text>
                  </svg>

                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 border border-zinc-700/80 text-[9.5px] text-zinc-300">
                    STILL · PRECISION VECTOR ({activePalette.name.toUpperCase()})
                  </div>
                </div>

                {/* Still Export Controls */}
                <div className="p-3.5 space-y-2.5 bg-[#0c0a09]">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Exact geometric match to your reference SVG with customizable astrophysical color palettes.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="download-still-vector-svg"
                      onClick={() => handleExportSvg(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201815] hover:bg-[#2b201c] border border-[#D97757]/65 text-[#F7F4EE] text-[11px] font-semibold cursor-pointer transition-all"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-[#E88B6B]" />
                      <span>Download Still Vector (.SVG)</span>
                    </button>

                    <button
                      type="button"
                      data-testid="download-still-4k-png"
                      onClick={() => handleExport4KStillPng(false)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10.5px] cursor-pointer transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>4K PNG (3840×2160)</span>
                    </button>

                    <button
                      type="button"
                      data-testid="download-still-transparent-png"
                      onClick={() => handleExport4KStillPng(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10.5px] cursor-pointer transition-all"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>4K PNG (Transparent)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL 2: MOVING WATERMARK LOGO (Exact Vector Proportions + 60 FPS Relativistic Motion) */}
            {(viewMode === 'split' || viewMode === 'moving') && (
              <div
                data-testid="watermark-moving-card"
                className="flex flex-col rounded-xl border border-[#D97757]/40 bg-[#0c0a09] overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-zinc-800/80 bg-[#120f0d] flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-display text-xs font-bold tracking-wider uppercase text-[#F7F4EE]">
                      2. Moving Watermark Logo
                    </span>
                  </div>

                  {/* Motion Style Selector */}
                  <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-md border border-zinc-800 text-[9.5px] flex-wrap">
                    {(
                      [
                        { id: 'kerr_frame_dragging', label: 'Frame-Drag' },
                        { id: 'minimal_vector_spin', label: 'Pure Spin' },
                        { id: 'dual_harmonic_orbit', label: 'Dual Orbit' },
                        { id: 'singularity_pulse_reveal', label: 'Pulse Wave' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          haptics.light();
                          setMotionStyle(mode.id);
                        }}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          motionStyle === mode.id
                            ? 'bg-[#201815] text-[#F4A688] border border-[#D97757]/50 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Moving Visual Stage (1920x1080 60FPS Precision Canvas matching the SVG) */}
                <div className="relative aspect-video w-full bg-[#020203] flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                  <canvas
                    ref={movingCanvasRef}
                    width={1920}
                    height={1080}
                    className="w-full h-full object-contain block"
                  />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-zinc-700/80 text-[9.5px] text-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>
                      MOVING 60 FPS · {spinSpeed.toFixed(1)}× ω
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPlayingMotion((p) => !p)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/80 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] cursor-pointer"
                    >
                      {isPlayingMotion ? (
                        <>
                          <Pause className="w-3 h-3 text-amber-400" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Moving Controls & Exports */}
                <div className="p-3.5 space-y-2.5 bg-[#0c0a09]">
                  <div className="grid grid-cols-2 gap-3 pt-0.5 pb-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Orbit className="w-3 h-3 text-[#E88B6B]" />
                          Angular Velocity (ω)
                        </span>
                        <span className="text-[#F4A688] font-bold">
                          {spinSpeed.toFixed(2)}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.25}
                        max={2.5}
                        step={0.05}
                        value={spinSpeed}
                        onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
                        className="sci-slider w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-cyan-400" />
                          Relativistic Halo & Trails
                        </span>
                        <span className="text-cyan-300 font-bold">
                          {Math.round(glowIntensity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.4}
                        step={0.05}
                        value={glowIntensity}
                        onChange={(e) =>
                          setGlowIntensity(parseFloat(e.target.value))
                        }
                        className="sci-slider w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="record-moving-watermark-video-btn"
                      disabled={isRecordingMotionVideo}
                      onClick={handleRecordMovingWatermarkVideo}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${
                        isRecordingMotionVideo
                          ? 'bg-rose-950/90 border-rose-400 text-rose-200'
                          : 'bg-[#201815] hover:bg-[#2b201c] border-[#D97757]/65 text-[#F7F4EE]'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5 text-[#E88B6B]" />
                      <span>
                        {isRecordingMotionVideo
                          ? `Encoding 60FPS Video (${recordingProgressPct}%)...`
                          : 'Download Moving Video (60FPS .MP4/.WebM)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      data-testid="download-animated-vector-svg"
                      onClick={() => handleExportSvg(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10.5px] cursor-pointer transition-all"
                      title="Export resolution-independent Animated SVG that spins natively in any browser"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Animated Vector (.SVG)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
