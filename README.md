# Kerr-Relativistic-Engine · v1.4 PRIME

An interactive real-time general-relativistic astrophysics simulation and native **WebGL2 / GLSL raymarching engine** modeling Boyer–Lindquist Kerr spacetime geometry, null geodesic gravitational lensing, Novikov–Thorne accretion disk thermodynamics, relativistic Doppler beaming, and procedural relativistic sonification around black holes, binary accretion systems, and compact stellar remnants.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20App-d97757?style=for-the-badge)](https://ai.studio/apps/dd8cecee-f074-4bcb-89df-2b44c3417ccb)
[![Engine Version](https://img.shields.io/badge/Engine-v1.4.0--PRIME-f59e0b?style=for-the-badge)](#release-history--changelog)
[![WebGL2](https://img.shields.io/badge/Pipeline-WebGL2%20%2F%20GLSL-38bdf8?style=for-the-badge)](#rendering--shader-architecture)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge)](#system-architecture)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)

---

## Visual Overview

| **Ultramassive Kerr Quasar (TON 618)** | **Relativistic Doppler Asymmetry & Spacetime Manifold** |
| :---: | :---: |
| ![TON 618 Visualization](public/assets/cosmic-vis-ton618-1794212230564.png) | ![Relativistic Lensing & Grid](public/assets/cosmic-vis-ton618-1794212343879.png) |

*Real-time WebGL2 volumetric raymarching and geometric visualization featuring a Novikov–Thorne accretion disk with asymmetric relativistic Doppler boosting ($\mathcal{D}^{3+\alpha}$), primary ($n=1$) and secondary ($n=2$) Einstein photon-ring caustics, Bardeen D-shaped Kerr shadow flattening, and a dynamically deformed Flamm paraboloid spacetime curvature grid.*

---

## What's New in v1.4 PRIME

- **Cinematic Deep-Space Helical Boot & Singularity Seed Detonation:**
  - Starts at maximum deep-space orbital distance ($r_0 = 260\text{ world units} \approx 148.6\,R_s$) with HUD chrome and grid suppressed.
  - Executes a helical approach toward a suspended **Singularity Seed**, automatically detonating into the full Kerr event horizon, photon ring, and turbulent accretion disk while the Flamm spacetime manifold unfurls and the camera performs a 3.2-second quintic S-curve dolly pan into the observer lock ($r = 16.5\,R_s, \theta = 71^\circ, \phi = 96^\circ$).
- **Volumetric Geodesic Raymarcher & Classic Multi-Layer Shader Pipeline:**
  - Switchable between **Classic 3D Torus** and **Volumetric Raymarching** modes with full $n=1$ lensed upper/lower Einstein arches, $n=2$ demagnified photon-ring caustics, and 4-octave 3D fractional Brownian motion (fBM) magneto-rotational instability (MRI) plasma turbulence.
- **Automated Spacetime Curvature Stress-Test Diagnostic Suite:**
  - Dedicated **Diagnostic** module inside Settings that sequentially executes 5 extreme general-relativistic boundary stress tests (*Maximal Kerr Spin $a^* = 0.998$*, *Schwarzschild Limit $a^* = 0.000$*, *Ultramassive Quasar Horizon $6.6 \times 10^{10}\,M_\odot$*, *Super-Eddington Flare $\dot{m} = 2.85$*, and *Extreme Photon-Ring Grazing $i = 86^\circ$*), verifying Kretschmann scalar $K = R_{\alpha\beta\gamma\delta}R^{\alpha\beta\gamma\delta}$ stability and archiving full telemetry runs to the **Kerr Engine Calculation Log Viewer**.
- **General Relativity & Astrophysics IQ Assessment Module:**
  - Interactive 10-question diagnostic assessment testing mastery of Kerr horizons, Lense–Thirring frame dragging, Penrose energy extraction, Carter constants, and Tolman–Oppenheimer–Volkoff limits with domain breakdowns and detailed physical derivations.
- **24-Bit / 96 kHz Hi-Res Procedural Audio Mastering Deck:**
  - Multi-voice stereo polyphonic Web Audio engine with 5 procedural interstellar compositions (*Gargantua Organ Cathedral*, *Event Horizon Noir*, *Singularity Pulse*, *Lense–Thirring Drift*, *Hawking Whisper*), real-time FFT spectrum analyzer, 3-band mastering EQ, and camera-coupled gravitational redshift filtering.
- **Three Bespoke Scientific UI Themes:**
  - **Kerr Engine Claude (Default):** Warm obsidian glass (`#0b0a09`) paired with terracotta-amber (`#d97757`) and parchment typography.
  - **Event Horizon Noir:** Deep-space OLED carbon (`#05070e`) with Cherenkov cyan (`#38bdf8`) and high-contrast telemetry readouts.
  - **Aethelgard Alabaster:** Daylight editorial laboratory paper (`#f6f4ef`) with crisp slate ink and warm bronze accents.

---

## Relativistic Physics & Mathematical Formulation

All visual and telemetry layers are driven by exact analytical solutions to the **Boyer–Lindquist Kerr metric** in natural units ($G = c = 1$):

### 1. Kerr Metric Horizons & Ergosphere Boundary
For a rotating black hole of gravitational radius $r_g = GM/c^2 = \frac{1}{2}R_s$ and dimensionless spin parameter $a^* = Jc / (GM^2) \in [0, 0.998]$:

$$r_{\pm} = r_g \left(1 \pm \sqrt{1 - (a^*)^2}\right), \qquad r_{\text{ergo}}(\theta) = r_g \left(1 + \sqrt{1 - (a^*)^2 \cos^2\theta}\right)$$

Between $r_+$ and $r_{\text{ergo}}(\theta)$, spacetime undergoes **Lense–Thirring frame dragging** at angular velocity:

$$\omega(r, \theta) = -\frac{g_{t\phi}}{g_{\phi\phi}} = \frac{2 M r a}{\left(r^2 + a^2\right)^2 - a^2 \Delta \sin^2\theta}$$

### 2. Innermost Stable Circular Orbit (ISCO) & Photon Sphere
The prograde and retrograde equatorial ISCO radii follow the **Bardeen–Press–Teukolsky (1972)** exact formulation:

$$r_{\text{ISCO}} = r_g \left(3 + Z_2 \mp \sqrt{(3 - Z_1)(3 + Z_1 + 2Z_2)}\right)$$

$$Z_1 = 1 + \left(1 - (a^*)^2\right)^{1/3} \left[(1 + a^*)^{1/3} + (1 - a^*)^{1/3}\right], \qquad Z_2 = \sqrt{3(a^*)^2 + Z_1^2}$$

For a non-rotating Schwarzschild black hole ($a^* = 0$), $r_{\text{ISCO}} = 6\,r_g = 3\,R_s$. At maximal Kerr spin ($a^* \to 1$), the prograde ISCO plunges to $r_{\text{ISCO}} \to 1\,r_g = 0.5\,R_s$, increasing radiative accretion efficiency $\eta = 1 - E_{\text{ISCO}}$ from **5.72%** up to **42.3%**.

### 3. Relativistic Doppler Beaming & Gravitational Redshift
Specific intensity along the orbiting Novikov–Thorne plasma disk is modulated by the fourth power of the relativistic Doppler factor $\mathcal{D}$:

$$I_{\text{obs}} = \mathcal{D}^4 \, I_{\text{emit}}, \qquad \mathcal{D} = \frac{\sqrt{1 - \beta^2 - \frac{R_s}{r}}}{1 - \beta \cos\theta_{\text{los}}}$$

### 4. Paczyński Gravitational Microlensing
Background stellar transits behind the primary mass are lensed into relativistic doublet images $\theta_{\pm}$ with total magnification $A(u)$:

$$\theta_{\pm} = \frac{1}{2}\left(u \pm \sqrt{u^2 + 4}\right)\theta_E, \qquad A(u) = \frac{u^2 + 2}{u\sqrt{u^2 + 4}}$$

---

## Celestial Catalog & Astrophysical Presets

| Category | Designation | Mass ($M_\odot$) | Spin ($a^*$) | Accretion Disk & Signature |
| :--- | :--- | :---: | :---: | :--- |
| **Ultramassive BH** | **TON 618** | $6.6 \times 10^{10}$ | $0.980$ | Hyperluminous quasar core ($2,600\text{ AU}$ shadow) |
| **Supermassive BH** | **M87\*** | $6.5 \times 10^{9}$ | $0.900$ | EHT $230\text{ GHz}$ asymmetric photon ring & jet |
| **Supermassive BH** | **Sagittarius A\*** | $4.3 \times 10^{6}$ | $0.940$ | Galactic center SMBH with S2 star orbit |
| **Intermediate BH** | **GW190521** | $142$ | $0.720$ | LIGO–Virgo merger remnant with ringdown |
| **Stellar BH (Binary)** | **Cygnus X-1** | $21.2$ | $0.998$ | Near-extremal spin + O-star Roche-lobe stream |
| **Stellar BH (Binary)** | **V404 Cygni** | $9.0$ | $0.850$ | Microquasar X-ray transient outburst |
| **Neutron Star** | **PSR B1919+21** | $1.40$ | $0.150$ | Radio pulsar with dipole field & lighthouse beams |
| **Magnetar** | **SGR 1806-20** | $1.80$ | $0.320$ | $10^{15}\text{ G}$ magnetosphere + X-ray fallback ring |
| **White Dwarf** | **ZTF J1901+1458** | $1.35$ | $0.280$ | Ultra-massive Chandrasekhar-limit crystalline core |
| **Hypergiant Star** | **Eta Carinae A** | $100$ | $0.680$ | Luminous Blue Variable with Homunculus outflow |
| **Wolf–Rayet Star** | **R136a1** | $215$ | $0.620$ | Most massive known star ($8.7 \times 10^6\,L_\odot$) |
| **Red Supergiant** | **Betelgeuse** | $16.5$ | $0.180$ | Boiling convective photosphere ($764\,R_\odot$) |
| **G2V Main Sequence** | **Sol (The Sun)** | $1.00$ | $0.050$ | Weak-field hydrostatic baseline reference |

---

## Interactive Instrumentation & Features

- **Side-by-Side Synchronized Compare Viewport:** Compare any two astrophysical presets (or run a live Kerr Spin Contrast study $a^* = 0.000$ vs $a^* = 0.998$) with synchronized camera orbit and real-time ISCO/ergosphere deltas.
- **Geodesic Photon Launcher & CSV Telemetry Export:** Fire test photons at arbitrary impact parameters $b \in [-6\,R_s, +6\,R_s]$ (or double-click anywhere in the 3D viewport) to classify **Plunge**, **Critical Photon-Ring Resonance**, or **Hyperbolic Deflection** trajectories and export step-by-step coordinates to CSV.
- **Live Spacetime Metric Tensor ($g_{\mu\nu}$) & Overhead Radar HUD:** Inspect real-time Boyer–Lindquist metric components ($g_{tt}, g_{rr}, g_{\theta\theta}, g_{\phi\phi}, g_{t\phi}$), Kretschmann curvature invariants, and S2 probe orbital telemetry.
- **Native WebGL2 Performance & Shader Bottleneck Monitor:** Real-time frame-time histogram, P99 latency, estimated GPU VRAM allocation, and per-pass shader cost breakdown with dynamic NaN/Inf guards.
- **Snapshot & High-Bitrate WebM/MP4 Video Recorder:** One-click high-DPI PNG capture and in-browser canvas video recording.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :---: | :--- |
| **`Space`** | Skip boot intro / Pause or resume simulation time ($\Delta t$) |
| **`H`** | Collapse or expand the bottom Control Dock |
| **`C`** | Toggle Clean Mode (hide all UI overlays for pure 3D observation) |
| **`Esc`** | Restore UI from Clean Mode / Close active modal |
| **`Double-Click`** | Launch a null geodesic photon ray at the clicked impact parameter $b$ |

---

## System Architecture

```text
src/
├── components/
│   ├── TopBar.tsx                    # Preset selector, Compare toggle, Recording & v1.4 Changelog badge
│   ├── ControlDock.tsx               # 4-tab relativistic parameter dock (Spacetime, Spectral, Camera, Geodesics)
│   ├── SettingsModal.tsx             # Graphics, Themes, 96kHz Audio Deck, IQ Test & Curvature Diagnostics
│   ├── IQTestModule.tsx              # 10-question General Relativity & Astrophysics cognitive assessment
│   ├── KerrEngineLogViewer.tsx       # Calculation log archive & interactive terminal replay
│   ├── ChangelogModal.tsx            # Terminal-style release milestone viewer (v1.2 – v1.4)
│   ├── MetricTelemetryOverlay.tsx    # Live Boyer-Lindquist metric tensor g_μν & Kretschmann readout
│   ├── PerformanceMonitorOverlay.tsx # GPU shader pass profiler, FPS histogram & VRAM telemetry
│   ├── OverheadMapWidget.tsx         # 2D equatorial polar radar with S2 star & geodesic tracking
│   └── BlackHoleAnatomyOverlay.tsx   # Dynamic 3D-projected leader lines & relativistic callouts
├── physics/
│   ├── gravitationalPhysics.ts       # Kerr metric solver, ISCO/photon sphere math, geodesic integrator
│   ├── kerrCalculationLogger.ts      # Structured tensor calculation run generator
│   └── compactStarShaders.ts         # Neutron star crust, dipole precession & synchrotron beam shaders
├── scene/
│   ├── BlackHoleScene.ts             # Native WebGL2 Three.js engine, raymarcher, FBM disk & camera spline
│   └── gpuResourceCache.ts           # Singleton geometry/texture/shader pool for zero-GC preset switches
└── utils/
    └── relativisticAudio.ts          # Procedural Web Audio synthesizer & 24-bit/96kHz mastering deck
```

---

## Getting Started Locally

### Prerequisites
- **Node.js** `v18+`
- **npm** `v9+`

### Installation & Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/Kerr-Relativistic-Engine.git
cd Kerr-Relativistic-Engine

# 2. Install dependencies
npm install

# 3. Start the development server (runs on http://localhost:3000)
npm run dev
```

### Production Build & Type Verification

```bash
# Type-check with TypeScript
npm run lint

# Build optimized production bundle
npm run build
```

---

## Release History & Changelog

- **v1.4.0-PRIME:** Native WebGL2 hardware pipeline refactor, volumetric geodesic raymarcher ($n=1,2$ Einstein arches), deep-space helical boot & Singularity Seed auto-expansion choreography, automated Spacetime Curvature Diagnostic Stress-Test suite, General Relativity IQ Test module, 24-bit/96 kHz Audio Mastering Deck, and 3 scientific UI themes.
- **v1.3.0:** Relativistic Doppler boosting ($\mathcal{D}^{3+\alpha}$), Novikov–Thorne radial temperature profile, and gravitational lensing shader optimizations.
- **v1.2.0:** Boyer–Lindquist ergosphere boundary mapping, Lense–Thirring frame-dragging vortex shear, and real-time metric tensor telemetry instrumentation.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
