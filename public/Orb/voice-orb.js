/**
 * Voice Orb — World-Class Volumetric Fluid AI Voice Component
 * Built with 3D raymarched fluid dynamics, elegant internal folding petals,
 * 12 curated philosophical palettes, and tactile editorial film grain.
 */

(function(global) {
  'use strict';

  // 12 Curated Thematic Palettes & Philosophies
  const PALETTES = {
    peach: {
      name: 'Soft Peach',
      subtitle: 'Talk Signature',
      c1: [1.00, 0.98, 0.95], // Pearlescent Ivory (#FFFBF2)
      c2: [1.00, 0.87, 0.78], // Soft Cream Peach (#FFDEC7)
      c3: [1.00, 0.75, 0.64], // Warm Peach Apricot (#FFC0A3)
      c4: [0.98, 0.61, 0.52], // Delicate Coral Blush (#FA9C85)
      c5: [0.88, 0.45, 0.38], // Deep Translucent Ember (#E07361)
      glow: 'rgba(255, 180, 155, 0.32)'
    },
    apricot: {
      name: 'Warm Apricot',
      subtitle: 'Golden Hearth',
      c1: [1.00, 0.98, 0.92], // Champagne Ivory
      c2: [1.00, 0.89, 0.73], // Light Apricot
      c3: [1.00, 0.77, 0.54], // Honey Peach
      c4: [0.98, 0.64, 0.40], // Sunlit Apricot Coral
      c5: [0.88, 0.48, 0.28], // Rich Amber Hearth
      glow: 'rgba(255, 190, 135, 0.32)'
    },
    rose: {
      name: 'Rose Pearl',
      subtitle: 'Blush Quartz',
      c1: [1.00, 0.97, 0.98], // Rose Quartz Pearl
      c2: [0.99, 0.86, 0.89], // Soft Powder Blush
      c3: [0.98, 0.72, 0.78], // Blushing Peach Pink
      c4: [0.94, 0.54, 0.64], // Petal Rose
      c5: [0.82, 0.38, 0.50], // Velvet Dusk
      glow: 'rgba(250, 175, 190, 0.30)'
    },
    sunset: {
      name: 'Sunset Sorbet',
      subtitle: 'Evening Horizon',
      c1: [1.00, 0.96, 0.93], // Dawn Cream
      c2: [1.00, 0.84, 0.72], // Peach Sorbet
      c3: [0.98, 0.68, 0.58], // Warm Coral Glow
      c4: [0.90, 0.52, 0.54], // Twilight Peach Rose
      c5: [0.75, 0.38, 0.45], // Muted Mauve Ember
      glow: 'rgba(255, 170, 150, 0.30)'
    },
    kids: {
      name: 'Playful Wonder',
      subtitle: 'Kids Joy',
      c1: [1.00, 0.99, 0.92], // Sweet Marshmallow
      c2: [1.00, 0.90, 0.60], // Buttercup Sunshine
      c3: [0.68, 0.90, 1.00], // Bubble Cyan
      c4: [1.00, 0.65, 0.82], // Playful Bubblegum
      c5: [0.72, 0.52, 0.94], // Magic Berry Violet
      glow: 'rgba(180, 210, 255, 0.35)'
    },
    sky: {
      name: 'Cloudy Sky',
      subtitle: 'Azure Drift',
      c1: [0.96, 0.98, 1.00], // Pure Cirrus White
      c2: [0.82, 0.91, 0.99], // Soft Powder Blue
      c3: [0.60, 0.80, 0.96], // Pale Cerulean
      c4: [0.38, 0.64, 0.90], // Open Sky Azure
      c5: [0.24, 0.45, 0.76], // Deep Stratosphere
      glow: 'rgba(130, 190, 255, 0.32)'
    },
    oceanic: {
      name: 'Oceanic Abyss',
      subtitle: 'Deep Marina',
      c1: [0.92, 1.00, 0.98], // Glacial Seafoam
      c2: [0.68, 0.94, 0.90], // Sunlit Aqua Coral
      c3: [0.32, 0.78, 0.78], // Tropical Lagoon
      c4: [0.16, 0.58, 0.68], // Deep Oceanic Teal
      c5: [0.08, 0.32, 0.48], // Abyss Midnight
      glow: 'rgba(60, 200, 200, 0.32)'
    },
    himalayan: {
      name: 'Himalayan Dawn',
      subtitle: 'Sacred Peaks',
      c1: [1.00, 0.99, 0.98], // Snow Peak Crystal
      c2: [0.88, 0.93, 0.98], // Glacial Mountain Ice
      c3: [1.00, 0.85, 0.70], // Saffron Sunrise Mist
      c4: [0.82, 0.62, 0.78], // Sacred Lotus Rose
      c5: [0.55, 0.42, 0.68], // Himalayan Twilight Violet
      glow: 'rgba(220, 190, 240, 0.32)'
    },
    indic: {
      name: 'Indic Heritage',
      subtitle: 'Vedic Saffron',
      c1: [1.00, 0.98, 0.90], // Temple Sandalwood
      c2: [1.00, 0.84, 0.50], // Turmeric Golden Sun
      c3: [0.98, 0.62, 0.20], // Marigold Saffron
      c4: [0.90, 0.36, 0.22], // Royal Vermillion Sindoor
      c5: [0.68, 0.18, 0.28], // Heritage Madder Crimson
      glow: 'rgba(255, 160, 60, 0.35)'
    },
    desert: {
      name: 'Desert Dune',
      subtitle: 'Sahara Gold',
      c1: [1.00, 0.97, 0.90], // Bleached Sand
      c2: [0.98, 0.87, 0.72], // Desert Silk
      c3: [0.94, 0.74, 0.50], // Warm Dune Sand
      c4: [0.86, 0.54, 0.32], // Sun-Baked Terracotta
      c5: [0.68, 0.34, 0.18], // Canyon Clay
      glow: 'rgba(240, 170, 100, 0.30)'
    },
    forest: {
      name: 'Enchanted Forest',
      subtitle: 'Verdant Canopy',
      c1: [0.96, 1.00, 0.94], // Morning Dew Mist
      c2: [0.82, 0.94, 0.78], // Pale Sage Leaf
      c3: [0.58, 0.85, 0.52], // Spring Chartreuse
      c4: [0.28, 0.68, 0.40], // Emerald Canopy
      c5: [0.14, 0.44, 0.26], // Deep Moss Woodland
      glow: 'rgba(120, 220, 140, 0.32)'
    },
    cosmic: {
      name: 'Cosmic Nebula',
      subtitle: 'Astral Starburst',
      c1: [0.98, 0.95, 1.00], // Supernova Starburst White
      c2: [0.38, 0.16, 0.68], // Deep Interstellar Violet
      c3: [0.08, 0.52, 0.78], // Electric Stardust Cyan
      c4: [0.58, 0.12, 0.52], // Radiant Nebula Magenta
      c5: [0.04, 0.02, 0.12], // Deep Black Astral Void
      glow: 'rgba(85, 25, 150, 0.45)'
    }
  };

  // Vertex Shader
  const VS_SOURCE = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment Shader — 3D Volumetric Fluid Sphere with Internal 3D Folding Petals & Tactile Grain
  const FS_SOURCE = `
    precision highp float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_audio;
    uniform float u_zoom;
    uniform float u_speed;
    uniform float u_turbulence;
    uniform float u_grain;
    uniform float u_state;        // 0: idle, 1: listening, 2: thinking, 3: speaking

    // Color Palette Uniforms
    uniform vec3 u_c1;
    uniform vec3 u_c2;
    uniform vec3 u_c3;
    uniform vec3 u_c4;
    uniform vec3 u_c5;

    // 2D Rotation Helper
    mat2 rot(float a) {
      float c = cos(a);
      float s = sin(a);
      return mat2(c, -s, s, c);
    }

    // High-frequency triangular dither / film grain
    float filmGrain(vec2 coord, float seed) {
      vec2 p = coord + vec2(seed * 17.13, seed * 23.41);
      float n1 = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      float n2 = fract(sin(dot(p + 42.19, vec2(93.9898, 67.345))) * 24634.6345);
      return (n1 + n2 - 1.0) * 0.5;
    }

    // 3D Organic Fluid Signed Distance Function
    // Dynamically shaped according to conversational state:
    // 0 = Idle: Meditative slow-mo cloud floating, gently rising & sinking
    // 1 = Listening: Alert cloud movement, lively turbulence & inward acoustic sound waves
    // 2 = Thinking: Growing ocean wave swells rolling rhythmically (NO dizzy spinning!)
    // 3 = Speaking: Fast, turbulent, bombarding phonetic bursts & outward radiation
    float map(vec3 p) {
      float t = u_time * 0.45 * u_speed;
      vec3 q = p;

      // Base radius with slow-mo breathing, starting at 1.30x for full circular volume
      float baseR = 0.72 * u_zoom + 0.02 * sin(u_time * 0.9) + u_audio * 0.08;

      if (u_state < 0.5) {
        // --- STATE 0: IDLE ---
        // Meditative, slow, serene cloud floating: gently rising and sinking
        float floatY = sin(t * 0.85) * 0.04;
        q.y -= floatY;

        q.yz *= rot(0.12 + 0.03 * sin(t * 0.4));
        q.xz *= rot(t * 0.20);

        float fold = sin(q.y * 1.8 + t * 0.5) * cos(q.x * 1.5 - t * 0.3);
        float billow = cos(q.z * 1.8 + q.x * 1.1 + t * 0.4);
        float ripple = sin(q.y * 2.6 + q.z * 1.6 - t * 0.5) * 0.18;
        float gyroid = dot(sin(q * 1.7 + t * 0.25), cos(q.yzx * 1.7 - t * 0.3));

        float disp = (fold * 0.09 + billow * 0.07 + ripple * 0.03 + gyroid * 0.025) * u_turbulence;
        return (length(p) - baseR) + disp;

      } else if (u_state < 1.5) {
        // --- STATE 1: LISTENING ---
        // Attentive, alert ear: Good amount of cloud movement, faster turbulence,
        // and inward acoustic sound absorption waves
        q.yz *= rot(0.20 + 0.08 * sin(t * 0.9));
        q.xz *= rot(t * 0.75); // Fast, active circulation

        // Concentric acoustic ripples travelling inward:
        float r = length(p);
        float soundAbsorption = sin(r * 10.0 - t * 4.2) * (0.030 + u_audio * 0.10);

        // Responsive billowing folds with active turbulence
        float fold = sin(q.y * 2.6 + t * 1.6) * cos(q.x * 2.2 - t * 1.2) * (1.0 + u_audio * 1.3);
        float billow = cos(q.z * 2.8 + q.x * 1.8 + t * 1.4);
        float gyroid = dot(sin(q * 2.6 + t * 0.9), cos(q.yzx * 2.6 - t * 1.0));

        float disp = (fold * 0.13 + billow * 0.09 + soundAbsorption + gyroid * 0.04) * (u_turbulence * 1.28);
        return (length(p) - (baseR + u_audio * 0.07)) + disp;

      } else if (u_state < 2.5) {
        // --- STATE 2: THINKING ---
        // Growing like an ocean wave: deep rolling swells, undulating crests, NO dizzy spinning
        q.yz *= rot(0.16 + 0.06 * sin(t * 0.7));
        q.xz *= rot(sin(t * 0.6) * 0.35); // Oscillating tilt, like an oceanic drift

        // Oceanic wave swells and rolling crests:
        float oceanSwell = sin(q.x * 2.4 + q.z * 1.6 + t * 1.7) * 0.12;
        float waveSurge = cos(q.y * 2.2 - q.x * 1.4 + t * 1.4) * 0.09;
        float waveCrest = sin(q.x * 3.2 + cos(t * 1.2) * 1.5) * cos(q.y * 2.8 + sin(t * 1.5)) * 0.07;
        float deepTide = sin(length(q) * 4.0 - t * 2.0) * 0.04;

        // Wave growth in volume:
        float waveGrowth = sin(t * 1.4) * 0.035;

        float disp = (oceanSwell + waveSurge + waveCrest + deepTide) * (u_turbulence * 1.15);
        return (length(p) - (baseR + waveGrowth)) + disp;

      } else {
        // --- STATE 3: SPEAKING ---
        // Fast, turbulent, bombarding phonetic speech bursts & outward acoustic waves
        q.yz *= rot(0.26 + 0.12 * sin(t * 1.2));
        q.xz *= rot(t * 0.85); // Rapid outward momentum

        // Acoustic radiation waves travelling outward from core:
        float r = length(p);
        float outwardWave = sin(r * 8.5 - t * 5.6) * (0.042 + u_audio * 0.12);

        // Phonetic syllable cadence (bombarding bursts of syllables):
        float syllableCadence = abs(sin(t * 4.6) * cos(t * 2.3) + sin(t * 7.0) * 0.35);
        float vocalBloom = syllableCadence * 0.065 * (1.0 + u_audio * 1.6);

        float fold = sin(q.y * 2.8 + t * 2.2) * cos(q.x * 2.4 - t * 1.6);
        float billow = cos(q.z * 3.0 + q.x * 2.0 + t * 1.8);

        float disp = (fold * 0.14 + billow * 0.11 + outwardWave + vocalBloom) * (u_turbulence * 1.35);
        return (length(p) - (baseR + vocalBloom * 0.45)) + disp;
      }
    }

    // Volumetric color sampling across the 3D fluid body
    vec3 sampleCloudColor(vec3 p, float d) {
      float t = u_time * 0.40 * u_speed;
      vec3 q = p;

      if (u_state < 0.5) {
        q.y -= sin(t * 0.85) * 0.04;
        q.xz *= rot(t * 0.20);
        q.yz *= rot(0.12 + 0.03 * sin(t * 0.4));
      } else if (u_state < 1.5) {
        q.xz *= rot(t * 0.70);
        q.yz *= rot(0.20 + 0.08 * sin(t * 0.9));
      } else if (u_state < 2.5) {
        q.xz *= rot(sin(t * 0.6) * 0.35);
        q.yz *= rot(0.16 + 0.06 * sin(t * 0.7));
      } else {
        q.xz *= rot(t * 0.80);
        q.yz *= rot(0.26 + 0.12 * sin(t * 1.2));
      }

      // Coordinate color gradient:
      // Smooth transition across the volume, highlighting the internal fold
      float foldAxis = q.x * 0.9 + 0.3 * sin(q.y * 2.4 + t * 0.8) + q.z * 0.35;
      float depthFactor = clamp((0.15 - d) / 0.15, 0.0, 1.0);

      // Interpolate through the 5 curated theme tones
      vec3 col = u_c2;
      if (foldAxis < -0.2) {
        float f = smoothstep(-0.85, -0.2, foldAxis);
        col = mix(u_c4, u_c3, f);
      } else if (foldAxis < 0.25) {
        float f = smoothstep(-0.2, 0.25, foldAxis);
        col = mix(u_c3, u_c2, f);
      } else {
        float f = smoothstep(0.25, 0.85, foldAxis);
        col = mix(u_c2, u_c1, f);
      }

      // Golden warm crease / amber ember gather along the internal fold cleft
      float cleft = 1.0 - smoothstep(0.0, 0.22, abs(foldAxis));
      cleft *= smoothstep(0.5, -0.4, q.y);
      col = mix(col, u_c5, cleft * 0.45);

      // State-specific core luminance and aura
      if (u_state < 0.5) {
        // IDLE: Calm, pearlescent resting illumination
        float distCenter = length(p);
        float coreGlow = clamp((0.85 - distCenter) / 0.85, 0.0, 1.0);
        col = mix(col, u_c1, pow(coreGlow, 1.6) * 0.38);

      } else if (u_state < 1.5) {
        // LISTENING: Receptive auroral illumination, expands with incoming mic sound
        float distCenter = length(p);
        float coreGlow = clamp((0.85 - distCenter) / 0.85, 0.0, 1.0);
        col = mix(col, u_c1, pow(coreGlow, 1.4) * (0.42 + u_audio * 0.35));
        float rimReceptive = smoothstep(0.55, 0.88, distCenter);
        col = mix(col, u_c3, rimReceptive * 0.22 * (1.0 + u_audio));

      } else if (u_state < 2.5) {
        // THINKING: Ocean wave surge illumination rolling through the volume
        float wavePulse = 0.5 + 0.5 * sin(t * 1.8);
        float distCenter = length(p);
        float coreGlow = clamp((0.78 - distCenter) / 0.78, 0.0, 1.0);
        col = mix(col, u_c1, pow(coreGlow, 1.7) * (0.48 + wavePulse * 0.26));
        float waveRim = 1.0 - smoothstep(0.0, 0.18, abs(d));
        col = mix(col, u_c3, waveRim * 0.22 * wavePulse);

      } else {
        // SPEAKING: Outward vocal bloom with phonetic syllable warmth
        float syllableCadence = abs(sin(t * 4.6) * cos(t * 2.3) + sin(t * 7.0) * 0.35);
        float distCenter = length(p);
        float coreGlow = clamp((0.85 - distCenter) / 0.85, 0.0, 1.0);
        col = mix(col, u_c1, pow(coreGlow, 1.5) * (0.45 + u_audio * 0.35));
        col = mix(col, u_c3, min(1.0, syllableCadence * 0.25 * (1.0 + u_audio * 1.0)));
      }

      return col;
    }

    void main() {
      // Centered coordinates with aspect ratio correction
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / (0.5 * min(u_resolution.x, u_resolution.y));
      float r = length(uv);

      // CIRCULAR SILHOUETTE GUARD:
      // The outer shape is strictly a circle with smooth anti-aliased edge
      float circleR = min(0.95, 0.72 * u_zoom);
      float outerEdge = 1.0 - smoothstep(circleR - 0.02, circleR + 0.015, r);

      if (r > circleR + 0.03) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
        return;
      }

      // Ray origin and direction
      vec3 ro = vec3(0.0, 0.0, 2.4);
      vec3 rd = normalize(vec3(uv * 1.02, -1.8));

      // Volumetric accumulation
      vec3 colAcc = vec3(0.0);
      float alphaAcc = 0.0;

      float t = 1.15;
      const int NUM_STEPS = 42;
      const float STEP_SIZE = 0.042;

      for (int i = 0; i < NUM_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);

        // Volumetric density inside fluid body
        if (d < 0.20) {
          float density = clamp((0.20 - d) / 0.20, 0.0, 1.0);
          density = pow(density, 1.5) * 0.18;

          vec3 stepCol = sampleCloudColor(p, d);

          float weight = density * (1.0 - alphaAcc);
          colAcc += stepCol * weight;
          alphaAcc += weight;

          if (alphaAcc > 0.96) {
            alphaAcc = 1.0;
            break;
          }
        }
        t += STEP_SIZE;
      }

      if (alphaAcc < 0.002) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
        return;
      }

      // Normalize color by accumulated density
      vec3 finalCol = colAcc / max(alphaAcc, 0.001);

      // Smooth circular mask multiplication to guarantee a clean circular silhouette
      alphaAcc *= outerEdge;

      // Soft Specular Highlight on top-right (tactile frosted glass depth)
      float z = sqrt(max(0.0, circleR * circleR - r * r));
      vec3 normal = normalize(vec3(uv.x, uv.y, z));
      vec3 lightDir = normalize(vec3(0.42, 0.56, 0.72));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      vec3 halfVec = normalize(lightDir + viewDir);
      float spec = pow(max(0.0, dot(normal, halfVec)), 20.0) * 0.24;
      finalCol += vec3(spec);

      // Soft Fresnel Rim Lighting along the outer glass perimeter
      float fresnel = pow(1.0 - max(0.0, normal.z), 2.8);
      finalCol = mix(finalCol, u_c1, fresnel * 0.45);

      // Tactile Editorial Film Grain / Dither Texture (Paper-matte finish)
      // State-calibrated film grain texture:
      // - Listening: High tactile grain (alert acoustic texture, granular effect MORE)
      // - Speaking: Low grain / silky luminous emission (clean radiant clarity, granular effect LESS)
      // - Thinking: Soft oceanic wave grain
      // - Idle: Serene gentle resting grain
      float stateGrainMult = 0.60;
      if (u_state < 0.5) {
        stateGrainMult = 0.60;
      } else if (u_state < 1.5) {
        stateGrainMult = 1.45; // Tactile high grain for Listening!
      } else if (u_state < 2.5) {
        stateGrainMult = 0.80; // Smooth oceanic wave grain for Thinking
      } else {
        stateGrainMult = 0.52; // Low grain / luminous radiant clarity for Speaking!
      }
      float grain = filmGrain(gl_FragCoord.xy, fract(u_time * 13.71)) * 0.075 * u_grain * stateGrainMult;
      finalCol += grain;

      gl_FragColor = vec4(finalCol, clamp(alphaAcc, 0.0, 1.0));
    }
  `;

  class VoiceOrb {
    constructor(container, options = {}) {
      if (!container) {
        throw new Error('VoiceOrb: Container element is required');
      }

      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) {
        throw new Error('VoiceOrb: Container element not found');
      }

      // Configuration options
      this.options = Object.assign({
        size: 300,               // Diameter in pixels
        theme: 'peach',          // 12 curated themes
        state: 'idle',           // 'idle' | 'listening' | 'thinking' | 'speaking'
        reactToMic: false,       // Auto-enable microphone
        speed: 1.0,              // Motion speed (1.0x default for idle)
        turbulence: 0.7,         // Fluid fold amplitude (0.7x default for idle)
        zoom: 1.55,              // Default Idle zoom scale (min clamp: 1.30)
        grain: 0.8,              // Film grain intensity (0.8x default for idle)
        showShadow: true,        // Ambient underglow
        interactive: true,       // Hover reactions
        onStateChange: null,
        onAudioLevel: null
      }, options);

      // Internal State
      this.state = this.options.state;
      this.themeKey = PALETTES[this.options.theme] ? this.options.theme : 'peach';
      this.theme = PALETTES[this.themeKey];
      this.audioLevel = 0.0;
      this.targetAudioLevel = 0.0;
      this.smoothedZoom = this.options.zoom;
      this.time = 0.0;
      this.isRunning = true;
      this.isPaused = false;
      this.isMicActive = false;
      this._isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      this._frameSkip = 0;

      // Audio Nodes
      this.audioContext = null;
      this.analyser = null;
      this.micStream = null;
      this.audioDataArray = null;

      // DOM Elements
      this.wrapper = null;
      this.canvas = null;
      this.gl = null;
      this.program = null;
      this.uniforms = {};

      this._initDOM();
      this._initRenderer();
      this._bindEvents();

      if (this.options.reactToMic) {
        this.startMic();
      }

      this._lastFrameTime = performance.now();
      this._renderLoop = this._renderLoop.bind(this);
      requestAnimationFrame(this._renderLoop);
    }

    _initDOM() {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'voice-orb-wrapper';
      this.wrapper.style.position = 'relative';
      this.wrapper.style.display = 'inline-flex';
      this.wrapper.style.alignItems = 'center';
      this.wrapper.style.justifyContent = 'center';
      this.wrapper.style.userSelect = 'none';
      this.wrapper.style.touchAction = 'none';

      const size = this.options.size;
      const sizePx = typeof size === 'number' ? `${size}px` : size;
      this.wrapper.style.width = sizePx;
      this.wrapper.style.height = sizePx;

      // Ambient Underglow
      if (this.options.showShadow) {
        this.shadowEl = document.createElement('div');
        this.shadowEl.className = 'voice-orb-shadow';
        this.shadowEl.style.position = 'absolute';
        this.shadowEl.style.width = '75%';
        this.shadowEl.style.height = '75%';
        this.shadowEl.style.borderRadius = '50%';
        this.shadowEl.style.background = this.theme.glow;
        this.shadowEl.style.filter = 'blur(34px)';
        this.shadowEl.style.opacity = '0.55';
        this.shadowEl.style.pointerEvents = 'none';
        this.shadowEl.style.transition = 'background 0.5s ease, transform 0.4s ease, opacity 0.4s ease';
        this.wrapper.appendChild(this.shadowEl);
      }

      // Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'voice-orb-canvas';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.borderRadius = '50%';
      this.wrapper.appendChild(this.canvas);

      this.container.appendChild(this.wrapper);
    }

    _initRenderer() {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false
      }) || this.canvas.getContext('experimental-webgl');

      if (!gl) {
        this.use2DFallback = true;
        this.ctx2d = this.canvas.getContext('2d');
        return;
      }

      this.gl = gl;
      this.use2DFallback = false;

      const vs = this._compileShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = this._compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
      if (!vs || !fs) {
        this.use2DFallback = true;
        this.ctx2d = this.canvas.getContext('2d');
        return;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('VoiceOrb: Program link error:', gl.getProgramInfoLog(prog));
        this.use2DFallback = true;
        this.ctx2d = this.canvas.getContext('2d');
        return;
      }

      this.program = prog;
      gl.useProgram(prog);

      // Geometry: Fullscreen quad
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const posAttr = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      this.uniforms = {
        resolution: gl.getUniformLocation(prog, 'u_resolution'),
        time: gl.getUniformLocation(prog, 'u_time'),
        audio: gl.getUniformLocation(prog, 'u_audio'),
        zoom: gl.getUniformLocation(prog, 'u_zoom'),
        speed: gl.getUniformLocation(prog, 'u_speed'),
        turbulence: gl.getUniformLocation(prog, 'u_turbulence'),
        grain: gl.getUniformLocation(prog, 'u_grain'),
        state: gl.getUniformLocation(prog, 'u_state'),
        c1: gl.getUniformLocation(prog, 'u_c1'),
        c2: gl.getUniformLocation(prog, 'u_c2'),
        c3: gl.getUniformLocation(prog, 'u_c3'),
        c4: gl.getUniformLocation(prog, 'u_c4'),
        c5: gl.getUniformLocation(prog, 'u_c5')
      };

      this._updateThemeUniforms();
      this._updateCanvasSize();
    }

    _compileShader(type, src) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('VoiceOrb: Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    _updateThemeUniforms() {
      if (!this.gl || !this.program) return;
      const gl = this.gl;
      gl.useProgram(this.program);
      const th = this.theme;
      gl.uniform3fv(this.uniforms.c1, th.c1);
      gl.uniform3fv(this.uniforms.c2, th.c2);
      gl.uniform3fv(this.uniforms.c3, th.c3);
      gl.uniform3fv(this.uniforms.c4, th.c4);
      gl.uniform3fv(this.uniforms.c5, th.c5);

      if (this.shadowEl) {
        this.shadowEl.style.background = th.glow;
      }
    }

    _updateCanvasSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, this._isPhone ? 1.25 : 2.0);
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.round((rect.width || this.options.size || 300) * dpr);
      const h = Math.round((rect.height || this.options.size || 300) * dpr);

      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        if (this.gl) {
          this.gl.viewport(0, 0, w, h);
          this.gl.useProgram(this.program);
          this.gl.uniform2f(this.uniforms.resolution, w, h);
        }
      }
    }

    _bindEvents() {
      window.addEventListener('resize', () => {
        this._updateCanvasSize();
      });

      if (this.options.interactive) {
        this.wrapper.addEventListener('pointerenter', () => {
          if (this.state === 'idle') {
            this.setAudioLevel(0.2);
          }
        });
        this.wrapper.addEventListener('pointerleave', () => {
          if (this.state === 'idle' && !this.isMicActive) {
            this.setAudioLevel(0.0);
          }
        });
      }
    }

    // ==========================================
    // Public API Methods
    // ==========================================

    setState(stateName) {
      const validStates = ['idle', 'listening', 'thinking', 'speaking'];
      if (!validStates.includes(stateName)) return;
      this.state = stateName;
      if (typeof this.options.onStateChange === 'function') {
        this.options.onStateChange(stateName);
      }
    }

    getState() {
      return this.state;
    }

    setTheme(themeKey) {
      if (PALETTES[themeKey]) {
        this.themeKey = themeKey;
        this.theme = PALETTES[themeKey];
        this._updateThemeUniforms();
      } else if (typeof themeKey === 'object') {
        this.theme = Object.assign({}, PALETTES.peach, themeKey);
        this._updateThemeUniforms();
      }
    }

    getTheme() {
      return this.themeKey;
    }

    static getPalettes() {
      return PALETTES;
    }

    setAudioLevel(level) {
      this.targetAudioLevel = Math.max(0.0, Math.min(1.0, level));
    }

    setSpeed(s) {
      this.options.speed = Math.max(0.1, Math.min(5.0, s));
    }

    setTurbulence(t) {
      this.options.turbulence = Math.max(0.2, Math.min(3.0, t));
    }

    setGrain(g) {
      this.options.grain = Math.max(0.0, Math.min(3.0, g));
    }

    setZoom(z) {
      this.options.zoom = Math.max(1.30, Math.min(2.5, z));
    }

    setSize(size) {
      this.options.size = size;
      const sizePx = typeof size === 'number' ? `${size}px` : size;
      this.wrapper.style.width = sizePx;
      this.wrapper.style.height = sizePx;
      this._updateCanvasSize();
    }

    // Live Microphone via Web Audio API
    async startMic() {
      if (this.isMicActive) return true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.micStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.7;
        source.connect(this.analyser);

        this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.isMicActive = true;
        return true;
      } catch (err) {
        console.warn('VoiceOrb: Microphone access was denied or not supported:', err);
        this.isMicActive = false;
        return false;
      }
    }

    stopMic() {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
      this.analyser = null;
      this.isMicActive = false;
      this.setAudioLevel(0.0);
    }

    pause() {
      this.isPaused = true;
    }

    resume() {
      if (!this.isRunning || !this.isPaused) return;
      this.isPaused = false;
      this._lastFrameTime = performance.now();
      requestAnimationFrame(this._renderLoop);
    }

    destroy() {
      this.isRunning = false;
      this.isPaused = true;
      this.stopMic();
      if (this.gl) {
        try {
          const lose = this.gl.getExtension("WEBGL_lose_context");
          if (lose) lose.loseContext();
        } catch {}
        this.gl = null;
      }
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
    }

    // ==========================================
    // Render Loop & Fluid Dynamics
    // ==========================================

    _renderLoop(now) {
      if (!this.isRunning || this.isPaused) return;
      if (this._isPhone && this.state === "idle") {
        this._frameSkip = (this._frameSkip + 1) % 2;
        if (this._frameSkip === 1) {
          requestAnimationFrame(this._renderLoop);
          return;
        }
      }

      const dt = Math.min((now - this._lastFrameTime) / 1000, 0.1);
      this._lastFrameTime = now;

      // Extract real mic level if active
      if (this.isMicActive && this.analyser && this.audioDataArray) {
        this.analyser.getByteFrequencyData(this.audioDataArray);
        let sum = 0;
        const count = Math.min(42, this.audioDataArray.length);
        for (let i = 2; i < count; i++) {
          sum += this.audioDataArray[i];
        }
        const avg = sum / (count - 2);
        const normalized = Math.max(0.0, (avg - 14) / 125);
        this.targetAudioLevel = Math.min(1.0, normalized * 1.6);
      }

      // Smooth audio level interpolation
      const smoothingFactor = this.targetAudioLevel > this.audioLevel ? 0.35 : 0.12;
      this.audioLevel += (this.targetAudioLevel - this.audioLevel) * smoothingFactor;

      if (typeof this.options.onAudioLevel === 'function') {
        this.options.onAudioLevel(this.audioLevel);
      }

      // State speed multiplier calibrated to natural communicative rhythms
      let stateCode = 0.0;
      let stateSpeedMod = 0.55; // Default idle: meditative slow-mo cloud breathing

      if (this.state === 'listening') {
        stateCode = 1.0;
        stateSpeedMod = 1.70; // Fast, alert cloud movement & lively turbulence ("move and move good")
      } else if (this.state === 'thinking') {
        stateCode = 2.0;
        stateSpeedMod = 1.25; // Rhythmic oceanic wave swells
      } else if (this.state === 'speaking') {
        stateCode = 3.0;
        stateSpeedMod = 2.15; // Fast, bombarding phonetic bursts
      } else {
        stateCode = 0.0;
        stateSpeedMod = 0.55; // Meditative, tranquil rising & sinking cloud
      }

      // Meditative, slow-mo breathing zoom
      const breathPhase = this.state === 'idle' ? Math.sin(now * 0.0012) * 0.035 : 0.0;
      const targetZoom = (this.options.zoom + breathPhase + this.audioLevel * 0.16);
      this.smoothedZoom += (targetZoom - this.smoothedZoom) * 0.12;

      // Advance time with dynamic audio acceleration
      const speedMultiplier = this.options.speed * stateSpeedMod * (1.0 + this.audioLevel * 2.2);
      this.time += dt * speedMultiplier;

      // Update ambient shadow pulsation
      if (this.shadowEl) {
        const shadowScale = 1.0 + this.audioLevel * 0.22;
        const shadowOpacity = 0.55 + this.audioLevel * 0.35;
        this.shadowEl.style.transform = `scale(${shadowScale})`;
        this.shadowEl.style.opacity = shadowOpacity.toFixed(2);
      }

      // Render
      if (this.gl && !this.use2DFallback) {
        this._renderWebGL(stateCode);
      } else if (this.ctx2d) {
        this._render2DFallback();
      }

      requestAnimationFrame(this._renderLoop);
    }

    _renderWebGL(stateCode) {
      const gl = this.gl;
      gl.useProgram(this.program);

      gl.uniform1f(this.uniforms.time, this.time);
      gl.uniform1f(this.uniforms.audio, this.audioLevel);
      gl.uniform1f(this.uniforms.zoom, this.smoothedZoom);
      gl.uniform1f(this.uniforms.speed, this.options.speed);
      gl.uniform1f(this.uniforms.turbulence, this.options.turbulence);
      gl.uniform1f(this.uniforms.grain, this.options.grain);
      gl.uniform1f(this.uniforms.state, stateCode);

      gl.clearColor(1.0, 1.0, 1.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _render2DFallback() {
      const ctx = this.ctx2d;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const r = Math.min(w, h) * 0.44;
      const cx = w * 0.5;
      const cy = h * 0.5;

      ctx.clearRect(0, 0, w, h);

      const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      baseGrad.addColorStop(0, 'rgba(255, 251, 242, 1)');
      baseGrad.addColorStop(0.35, 'rgba(255, 222, 199, 0.95)');
      baseGrad.addColorStop(0.7, 'rgba(250, 156, 133, 0.9)');
      baseGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Web Component Registration: <voice-orb>
  if (typeof customElements !== 'undefined' && !customElements.get('voice-orb')) {
    class VoiceOrbElement extends HTMLElement {
      connectedCallback() {
        const size = parseInt(this.getAttribute('size'), 10) || 300;
        const theme = this.getAttribute('theme') || 'peach';
        const state = this.getAttribute('state') || 'idle';
        const mic = this.hasAttribute('react-to-mic');

        this.orb = new VoiceOrb(this, {
          size: size,
          theme: theme,
          state: state,
          reactToMic: mic
        });
      }

      static get observedAttributes() {
        return ['state', 'theme', 'audio-level'];
      }

      attributeChangedCallback(name, oldVal, newVal) {
        if (!this.orb || oldVal === newVal) return;
        if (name === 'state') this.orb.setState(newVal);
        if (name === 'theme') this.orb.setTheme(newVal);
        if (name === 'audio-level') this.orb.setAudioLevel(parseFloat(newVal) || 0);
      }

      disconnectedCallback() {
        if (this.orb) {
          this.orb.destroy();
        }
      }
    }

    customElements.define('voice-orb', VoiceOrbElement);
  }

  // Export to global scope
  global.VoiceOrb = VoiceOrb;
  global.VoiceOrbPalettes = PALETTES;

})(typeof window !== 'undefined' ? window : this);
