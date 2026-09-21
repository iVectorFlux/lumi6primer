/**
 * VoicePill — Dynamic AI Voice Pill Character Widget
 * 
 * A compact, symmetrical pill character designed for chat sections and input bars.
 * Features:
 * - Animated eye-only facial rig (zero mouth, zero unwanted floating marks)
 * - Pure seamless gradient pill body (zero shadow / zero extra layers)
 * - Calibrated Listening mode: ALWAYS LOOKS UP with calm, non-vibrating, attentive gaze
 * - Dynamic nose line that appears and wiggles during Speaking mode
 * - Speaking mode: natural talking eyes (joyful squint cadence & syllable bounce)
 * - Comprehensive 16-expression gesture suite (Stars, Heart, Sus Glance, Wink, Dizzy, etc.)
 * - Automatic luminous white eyes for dark themes (Obsidian, Matte Carbon)
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VoicePill = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // =========================================================================
  // Curated Vibrant Gradient Palettes
  // =========================================================================
  const PALETTES = {
    amber: {
      name: 'Amber Ember',
      subtitle: 'Warm Spiced Cognac',
      bodyGrad: ['#f59e0b', '#b45309'],
      defaultEyeColor: 'black',
      accent: '#78350f'
    },
    violet: {
      name: 'Cyber Violet',
      subtitle: 'Electric Plum Indigo',
      bodyGrad: ['#a855f7', '#6b21a8'],
      defaultEyeColor: 'black',
      accent: '#581c87'
    },
    emerald: {
      name: 'Emerald Jade',
      subtitle: 'Lush Seafoam Forest',
      bodyGrad: ['#10b981', '#047857'],
      defaultEyeColor: 'black',
      accent: '#064e3b'
    },
    azure: {
      name: 'Ocean Azure',
      subtitle: 'Sky Sapphire Cobalt',
      bodyGrad: ['#0ea5e9', '#1d4ed8'],
      defaultEyeColor: 'black',
      accent: '#1e3a8a'
    },
    coral: {
      name: 'Sunset Coral',
      subtitle: 'Fiery Rose Peach',
      bodyGrad: ['#f43f5e', '#ea580c'],
      defaultEyeColor: 'black',
      accent: '#9f1239'
    },
    gunmetal: {
      name: 'Titanium Steel',
      subtitle: 'Brushed Silver Slate',
      bodyGrad: ['#94a3b8', '#475569'],
      defaultEyeColor: 'black',
      accent: '#1e293b'
    },
    obsidian: {
      name: 'Obsidian Slate',
      subtitle: 'Deep Graphite Dark',
      bodyGrad: ['#334155', '#0f172a'],
      defaultEyeColor: 'white', // Automatic white on dark
      accent: '#38bdf8'
    },
    puredark: {
      name: 'Matte Carbon',
      subtitle: 'Minimalist Pitch Black',
      bodyGrad: ['#27272a', '#09090b'],
      defaultEyeColor: 'white', // Automatic white on dark
      accent: '#ffffff'
    }
  };

  class VoicePill {
    constructor(container, options = {}) {
      if (typeof container === 'string') {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }

      if (!this.container) {
        throw new Error('VoicePill: target container was not found in DOM.');
      }

      this.options = Object.assign({
        width: 100,
        height: 62,
        palette: 'amber',
        state: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'
        eyeColorMode: 'auto', // 'auto' | 'black' | 'white'
        expression: 'normal',
        showNoseOnSpeaking: true,
        showNoseAlways: false,
        trackPointer: true,
        enableMic: false,
        autoStop: false, // Stop as soon as listening or speaking finishes
        listeningDuration: 4.0, // Seconds in simulated listening before auto-stop
        speakingDuration: 4.2, // Seconds in simulated speaking before auto-stop
        onStateChange: null,
        onAudioLevel: null,
        onDone: null
      }, options);

      this.width = this.options.width;
      this.height = this.options.height;
      this.state = this.options.state;
      this.paletteKey = this.options.palette in PALETTES ? this.options.palette : 'amber';
      this.expression = this.options.expression;
      this.eyeColorMode = this.options.eyeColorMode;

      // Audio & Speech Simulation
      this.audioLevel = 0.0;
      this.targetAudioLevel = 0.0;
      this.audioContext = null;
      this.analyser = null;
      this.audioDataArray = null;
      this.isMicActive = false;
      this.micStream = null;

      // Kinematics & Animation State
      this.time = 0;
      this._lastFrameTime = performance.now();
      this.isRunning = true;

      // Auto-stop completion & Alert-perk transition
      this.autoStop = !!this.options.autoStop;
      this.stateTimer = 0;
      this.alertPerkTimer = 0; // 1s alert when entering listening
      this.alertSpeakingTimer = 0; // 1s alert when entering speaking from idle
      this._hasSpokenInTurn = false;
      this._lastSpokeTime = performance.now();

      // Gaze Tracking (-1.0 to 1.0)
      this.lookX = 0;
      this.lookY = 0;
      this.targetLookX = 0;
      this.targetLookY = 0;

      // Blinking & Squinting
      this.blinkTimer = 2.4 + Math.random() * 2.6;
      this.blinkProgress = 0;
      this.isBlinking = false;
      this.isWinking = false;

      // Idle natural occasional squinting
      this.idleSquintTimer = 4.0 + Math.random() * 4.0;
      this.isIdleSquinting = false;
      this.idleSquintProgress = 0;

      // Happy flash transition on click
      this.happyFlashTimer = 0;

      // Body motion
      this.bodyTilt = 0;
      this.targetBodyTilt = 0;
      this.bodySquashX = 1.0;
      this.bodySquashY = 1.0;
      this.hoverOffsetY = 0;

      // Eye scale modifiers
      this.leftEyeScaleY = 1.0;
      this.rightEyeScaleY = 1.0;
      this.leftEyeScaleX = 1.0;
      this.rightEyeScaleX = 1.0;

      // Swipe effect
      this.isSwiping = false;
      this.swipeProgress = 0;

      // Status mark (ONLY for ponder '...')
      this.statusMark = null;

      this._initDOM();
      this._bindEvents();

      if (this.options.enableMic) {
        this.startMic();
      }

      this._loop = this._renderLoop.bind(this);
      requestAnimationFrame(this._loop);
    }

    _initDOM() {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'voice-pill-wrapper';
      this.wrapper.style.position = 'relative';
      this.wrapper.style.display = 'inline-flex';
      this.wrapper.style.alignItems = 'center';
      this.wrapper.style.justifyContent = 'center';
      this.wrapper.style.width = `${this.width}px`;
      this.wrapper.style.height = `${this.height}px`;
      this.wrapper.style.userSelect = 'none';
      this.wrapper.style.touchAction = 'none';
      this.wrapper.style.background = 'transparent';

      // Retina Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'voice-pill-canvas';
      this.canvas.style.position = 'relative';
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.canvas.style.display = 'block';
      this.canvas.style.cursor = 'pointer';
      this.canvas.style.background = 'transparent';
      this.wrapper.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');
      this._resizeCanvas();

      this.container.appendChild(this.wrapper);
    }

    _resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      this.dpr = dpr;
      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _bindEvents() {
      const onPointerMove = (e) => {
        if (this.expression !== 'normal' && this.expression !== null) return;
        if (this.state === 'listening' || this.state === 'thinking') return;

        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (e.clientX - centerX) / (rect.width * 1.3);
        const dy = (e.clientY - centerY) / (rect.height * 1.3);

        this.targetLookX = Math.max(-0.9, Math.min(0.9, dx));
        this.targetLookY = Math.max(-0.9, Math.min(0.9, dy));
      };

      const onPointerLeave = () => {
        if (this.state === 'idle' && (this.expression === 'normal' || !this.expression)) {
          this.targetLookX = 0;
          this.targetLookY = 0;
        }
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      this.canvas.addEventListener('pointerleave', onPointerLeave);

      // On Click / Tap: Flash happy eyes and transition into listening if in idle!
      this.canvas.addEventListener('click', () => {
        if (this.state === 'idle') {
          this.triggerHappyToListen();
        } else {
          this.triggerWink();
        }
      });

      this._cleanupEvents = () => {
        window.removeEventListener('pointermove', onPointerMove);
        this.canvas.removeEventListener('pointerleave', onPointerLeave);
      };
    }

    // ==========================================
    // Public API
    // ==========================================

    setState(newState) {
      if (!['idle', 'listening', 'thinking', 'speaking'].includes(newState)) return;
      const prevState = this.state;
      this.state = newState;
      this.options.state = newState;
      this.expression = 'normal';
      this.stateTimer = 0; // Reset state timer

      if (newState === 'listening') {
        // User request: alert first when moving from idle to listening for 1 full second
        if (prevState === 'idle' || prevState === 'speaking') {
          this.alertPerkTimer = 1.0; // 1 full second of alert perk!
        } else {
          this.alertPerkTimer = 0;
        }
        this.alertSpeakingTimer = 0;
        // User instruction: "in listening it should not be looking down, always up!"
        this.targetLookX = 0;
        this.targetLookY = -0.78; // ALWAYS LOOKING UP
        this.statusMark = null;
        this._hasSpokenInTurn = false;
        this._lastSpokeTime = performance.now();
      } else if (newState === 'thinking') {
        this.alertPerkTimer = 0;
        this.alertSpeakingTimer = 0;
        this.targetLookX = 0.60;
        this.targetLookY = -0.75; // Pondering look upwards
        this.statusMark = '...'; // Only ponder has floating dots!
      } else if (newState === 'speaking') {
        this.alertPerkTimer = 0;
        // User request: "when it goeas from idle to speaking it should be in alert first but should be for 1 seconds and then -----"
        if (prevState === 'idle') {
          this.alertSpeakingTimer = 1.0; // In Alert for 1 full second before speaking begins!
        } else {
          this.alertSpeakingTimer = 0;
        }
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.statusMark = null; // No floating wave!
        this._hasSpokenInTurn = true;
        this._lastSpokeTime = performance.now();
      } else {
        this.alertPerkTimer = 0;
        this.alertSpeakingTimer = 0;
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.statusMark = null;
      }

      if (typeof this.options.onStateChange === 'function') {
        this.options.onStateChange(newState);
      }
    }

    setAutoStop(enabled) {
      this.autoStop = !!enabled;
      this.options.autoStop = this.autoStop;
    }

    stop(reason = 'manual') {
      const finishedState = this.state;
      this.setState('idle');
      if (typeof this.options.onDone === 'function') {
        this.options.onDone(finishedState, reason);
      }
    }

    setPalette(key) {
      if (PALETTES[key]) {
        this.paletteKey = key;
        this.options.palette = key;
      }
    }

    setEyeColorMode(mode) {
      if (['auto', 'black', 'white'].includes(mode)) {
        this.eyeColorMode = mode;
      }
    }

    getEffectiveEyeColor() {
      if (this.eyeColorMode === 'white') return '#ffffff';
      if (this.eyeColorMode === 'black') return '#090d16';

      // Auto mode: Obsidian and Matte Carbon MUST have white eyes
      if (this.paletteKey === 'obsidian' || this.paletteKey === 'puredark') {
        return '#ffffff';
      }
      return '#090d16';
    }

    setExpression(expr) {
      this.expression = expr;

      // Lock gaze & attributes based on expression
      if (expr === 'lookDown') {
        this.targetLookX = 0;
        this.targetLookY = 0.95;
        this.statusMark = null;
      } else if (expr === 'lookUp') {
        this.targetLookX = 0;
        this.targetLookY = -0.95;
        this.statusMark = null;
      } else if (expr === 'glanceRight') {
        this.targetLookX = 0.92;
        this.targetLookY = 0;
        this.statusMark = null;
      } else if (expr === 'glanceLeft') {
        this.targetLookX = -0.92;
        this.targetLookY = 0;
        this.statusMark = null;
      } else if (expr === 'curiousUp') {
        this.targetLookX = 0.20;
        this.targetLookY = -0.80;
        this.statusMark = null;
      } else if (expr === 'alert') {
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.statusMark = null;
      } else if (expr === 'question') {
        this.targetLookX = -0.15;
        this.targetLookY = -0.25;
        this.statusMark = null;
      } else if (expr === 'ponder') {
        this.targetLookX = 0.65;
        this.targetLookY = -0.75;
        this.statusMark = '...';
      } else if (expr === 'wink') {
        this.triggerWink();
        this.statusMark = null;
      } else if (expr === 'heart') {
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.statusMark = null;
      } else if (expr === 'stars') {
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.statusMark = null;
      } else if (expr === 'happy') {
        this.targetLookX = 0;
        this.targetLookY = -0.10;
        this.statusMark = null;
      } else if (expr === 'squint') {
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.statusMark = null;
      } else if (expr === 'sleepy') {
        this.targetLookX = 0;
        this.targetLookY = 0.40;
        this.statusMark = null;
      } else if (expr === 'dizzy') {
        this.targetLookX = 0;
        this.targetLookY = 0;
      } else if (expr === 'irritated') {
        this.targetLookX = -0.55;
        this.targetLookY = 0.10;
        this.statusMark = null;
      } else if (expr === 'proud') {
        this.targetLookX = 0.15;
        this.targetLookY = -0.50;
        this.statusMark = null;
      } else if (expr === 'swipe') {
        this.triggerSwipe();
        this.statusMark = null;
      } else {
        this.targetLookX = 0;
        this.targetLookY = this.state === 'listening' ? -0.75 : 0;
        this.statusMark = this.state === 'thinking' ? '...' : null;
      }
    }

    triggerSwipe() {
      this.isSwiping = true;
      this.swipeProgress = 0;
    }

    triggerWink() {
      this.isWinking = true;
      this.blinkProgress = 0;
    }

    setSize(width, height) {
      this.width = width;
      this.height = height;
      this.wrapper.style.width = `${width}px`;
      this.wrapper.style.height = `${height}px`;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this._resizeCanvas();
    }

    setAudioLevel(level) {
      this.targetAudioLevel = Math.max(0.0, Math.min(1.0, level));
    }

    async startMic() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('VoicePill: getUserMedia not supported.');
          return false;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
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
        console.warn('VoicePill: Microphone access denied:', err);
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
      this.isRunning = false;
    }

    resume() {
      if (!this.isRunning) {
        this.isRunning = true;
        this._lastFrameTime = performance.now();
        requestAnimationFrame(this._loop);
      }
    }

    destroy() {
      this.isRunning = false;
      this.stopMic();
      if (this._cleanupEvents) this._cleanupEvents();
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
    }

    // ==========================================
    // Render Loop & Dynamics
    // ==========================================

    _renderLoop(now) {
      if (!this.isRunning) return;

      const dt = Math.min((now - this._lastFrameTime) / 1000, 0.1);
      this._lastFrameTime = now;
      this.time += dt;

      // Extract real microphone audio if active
      if (this.isMicActive && this.analyser && this.audioDataArray) {
        this.analyser.getByteFrequencyData(this.audioDataArray);
        let sum = 0;
        const count = Math.min(42, this.audioDataArray.length);
        for (let i = 2; i < count; i++) {
          sum += this.audioDataArray[i];
        }
        const avg = sum / (count - 2);
        const normalized = Math.max(0.0, (avg - 10) / 110);
        this.targetAudioLevel = Math.min(1.0, normalized * 1.8);
      }

      // Smooth audio level interpolation
      const audioLerp = this.targetAudioLevel > this.audioLevel ? 0.30 : 0.12;
      this.audioLevel += (this.targetAudioLevel - this.audioLevel) * audioLerp;

      if (typeof this.options.onAudioLevel === 'function') {
        this.options.onAudioLevel(this.audioLevel);
      }

      this._updateKinematics(dt, now);
      this._draw();

      requestAnimationFrame(this._loop);
    }

    _updateKinematics(dt, now) {
      // 1. One-shot Manual Swipe Gesture
      if (this.isSwiping) {
        this.swipeProgress += dt * 2.0;
        this.lookX = Math.sin(this.swipeProgress * Math.PI) * 0.95;
        this.lookY = Math.sin(this.swipeProgress * Math.PI * 2.0) * 0.15;

        if (this.swipeProgress >= 1.0) {
          this.isSwiping = false;
          this.targetLookX = 0;
          this.targetLookY = this.state === 'listening' ? -0.75 : 0;
        }
      } else {
        const gazeLerp = 1.0 - Math.exp(-dt * 8.0);
        this.lookX += (this.targetLookX - this.lookX) * gazeLerp;
        this.lookY += (this.targetLookY - this.lookY) * gazeLerp;
      }

      // 2. Happy Flash Transition (on click)
      if (this.happyFlashTimer > 0) {
        this.happyFlashTimer -= dt;
      }

      // 3. Natural Blinking logic
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0 && !this.isBlinking && !this.isWinking && this.happyFlashTimer <= 0) {
        this.isBlinking = true;
        this.blinkProgress = 0;
        this.blinkTimer = 2.6 + Math.random() * 3.5;
      }

      if (this.isBlinking || this.isWinking) {
        this.blinkProgress += dt * 12.0;
        if (this.blinkProgress >= Math.PI) {
          this.isBlinking = false;
          this.isWinking = false;
          this.blinkProgress = 0;
        }
      }

      // 4. Idle occasional natural squint
      if (this.state === 'idle' && this.expression === 'normal' && this.happyFlashTimer <= 0) {
        this.idleSquintTimer -= dt;
        if (this.idleSquintTimer <= 0 && !this.isIdleSquinting) {
          this.isIdleSquinting = true;
          this.idleSquintProgress = 0;
          this.idleSquintTimer = 4.5 + Math.random() * 5.0;
        }

        if (this.isIdleSquinting) {
          this.idleSquintProgress += dt * 3.2;
          if (this.idleSquintProgress >= Math.PI) {
            this.isIdleSquinting = false;
            this.idleSquintProgress = 0;
          }
        }
      } else {
        this.isIdleSquinting = false;
      }

      // Base eye scales
      let lScaleY = 1.0;
      let rScaleY = 1.0;
      let lScaleX = 1.0;
      let rScaleX = 1.0;

      if (this.isBlinking) {
        const factor = Math.sin(this.blinkProgress);
        lScaleY = Math.max(0.08, 1.0 - factor * 0.95);
        rScaleY = Math.max(0.08, 1.0 - factor * 0.95);
      } else if (this.isWinking) {
        const factor = Math.sin(this.blinkProgress);
        rScaleY = Math.max(0.08, 1.0 - factor * 0.95);
      } else if (this.isIdleSquinting) {
        const factor = Math.sin(this.idleSquintProgress);
        lScaleY = Math.max(0.40, 1.0 - factor * 0.60);
        rScaleY = Math.max(0.40, 1.0 - factor * 0.60);
      }

      // 5. Expression Overrides
      if (this.happyFlashTimer > 0) {
        this.hoverOffsetY = -4.5;
        this.bodySquashX = 0.96;
        this.bodySquashY = 1.04;
        this.targetBodyTilt = 0;

      } else if (this.expression === 'lookDown') {
        this.targetLookX = 0;
        this.targetLookY = 0.95;
        this.hoverOffsetY = 0;
        this.targetBodyTilt = 0;

      } else if (this.expression === 'lookUp') {
        this.targetLookX = 0;
        this.targetLookY = -0.95;
        this.hoverOffsetY = 0;
        this.targetBodyTilt = 0;

      } else if (this.expression === 'glanceRight') {
        this.targetLookX = 0.92;
        this.targetLookY = 0;
        this.hoverOffsetY = 0;
        this.targetBodyTilt = 0.04;

      } else if (this.expression === 'glanceLeft') {
        this.targetLookX = -0.92;
        this.targetLookY = 0;
        this.hoverOffsetY = 0;
        this.targetBodyTilt = -0.04;

      } else if (this.expression === 'curiousUp') {
        this.targetLookX = 0.20;
        this.targetLookY = -0.85;
        lScaleY = 1.30;
        rScaleY = 0.65;
        this.targetBodyTilt = 0.08;
        this.hoverOffsetY = -1.5;

      } else if (this.expression === 'alert') {
        lScaleX = 1.35;
        lScaleY = 1.35;
        rScaleX = 1.35;
        rScaleY = 1.35;
        this.hoverOffsetY = -3.5;
        this.bodySquashX = 0.96;
        this.bodySquashY = 1.04;
        this.targetBodyTilt = 0;

      } else if (this.expression === 'question') {
        lScaleY = 1.35;
        lScaleX = 1.15;
        rScaleY = 0.60;
        this.targetBodyTilt = 0.09;
        this.hoverOffsetY = -1.5;

      } else if (this.expression === 'squint') {
        lScaleY = 0.28;
        rScaleY = 0.28;
        this.targetBodyTilt = 0;
        this.hoverOffsetY = 0;

      } else if (this.expression === 'sleepy') {
        lScaleY = 0.12;
        rScaleY = 0.12;
        this.hoverOffsetY = Math.sin(this.time * 1.5) * 1.5;
        this.targetBodyTilt = 0.03;

      } else if (this.expression === 'irritated') {
        this.targetLookX = -0.55;
        this.targetLookY = 0.10;
        this.hoverOffsetY = 0.8;
        this.targetBodyTilt = -0.04;
        this.bodySquashX = 1.02;
        this.bodySquashY = 0.98;

      } else if (this.expression === 'proud') {
        this.targetLookX = 0.15;
        this.targetLookY = -0.50;
        this.hoverOffsetY = -4.0 + Math.sin(this.time * 2.2) * 0.8;
        this.targetBodyTilt = -0.05;
        this.bodySquashX = 0.96;
        this.bodySquashY = 1.05;

      } else if (this.state === 'listening') {
        // =========================================================================
        // REFINED LISTENING MODE:
        // - "remove the vibration its too much ether has slow motion than vibration or slow vibratiion"
        //   -> Zero jitter! Calibrated, serene, slow-motion breathing float.
        // - "in listening it should not be lookig down, always up!"
        //   -> Eyes always gaze steadily upward at the user.
        // - Alert perk for 1 full second when entered from idle.
        // =========================================================================
        let alertScale = 1.0;
        let alertPerkOffsetY = 0;

        if (this.alertPerkTimer > 0) {
          this.alertPerkTimer -= dt;
          const p = Math.max(0, this.alertPerkTimer / 1.0); // 1.0s alert duration
          alertScale = 1.0 + p * 0.38; // 1.38x wide alert eyes
          alertPerkOffsetY = -3.8 * Math.sin(p * Math.PI); // Perk up lift
          // Smoothly eases into steady upward gaze
          this.targetLookY = -0.78 * (0.60 + (1.0 - p) * 0.40);
        } else {
          this.targetLookY = -0.78; // Always gaze upward toward speaker
        }

        // Gentle, calm, slow-motion drift (zero high-frequency vibration)
        this.targetLookX = Math.sin(this.time * 0.8) * 0.06;
        this.targetBodyTilt = 0.012 * Math.sin(this.time * 0.7);

        // Smooth subtle dilation on voice (damped, zero flutter)
        const voiceDilation = Math.min(0.10, this.audioLevel * 0.10);
        lScaleX = (lScaleX + voiceDilation) * alertScale;
        lScaleY = (lScaleY + voiceDilation) * alertScale;
        rScaleX = (rScaleX + voiceDilation) * alertScale;
        rScaleY = (rScaleY + voiceDilation) * alertScale;

        // Serene slow-motion breathing float (smooth ~5s cycle, zero vibration)
        this.hoverOffsetY = Math.sin(this.time * 1.2) * 1.2 + alertPerkOffsetY;
        this.bodySquashX = 1.0;
        this.bodySquashY = 1.0;

      } else if (this.state === 'thinking') {
        // THINKING MODE:
        // Pondering look upwards to the corner, gentle thoughtful sway
        this.targetLookX = 0.60 + Math.sin(this.time * 1.4) * 0.12;
        this.targetLookY = -0.75;

        lScaleY *= 0.85;
        rScaleY *= 0.75;

        this.targetBodyTilt = -0.03 + Math.sin(this.time * 1.8) * 0.02;
        this.hoverOffsetY = Math.sin(this.time * 2.0) * 2.4;
        this.bodySquashX = 0.98;
        this.bodySquashY = 0.98;

      } else if (this.state === 'speaking') {
        // =========================================================================
        // REFINED SPEAKING MODE:
        // User request:
        // "when it goeas from idle to speaking it should be in alert first but should be for 1 seconds and then -----"
        // =========================================================================
        if (this.alertSpeakingTimer > 0) {
          this.alertSpeakingTimer -= dt;
          // In Alert for 1.0 full second!
          lScaleX = 1.35;
          lScaleY = 1.35;
          rScaleX = 1.35;
          rScaleY = 1.35;
          this.hoverOffsetY = -3.5;
          this.targetLookX = 0;
          this.targetLookY = 0;
          this.targetBodyTilt = 0;
          this.bodySquashX = 1.0;
          this.bodySquashY = 1.0;

        } else {
          // 1.0s alert finished -> Active Speaking Mode!
          const speechCadence = Math.abs(
            Math.sin(this.time * 7.5) * Math.cos(this.time * 3.8) +
            Math.sin(this.time * 13.0) * 0.30
          );
          const voiceVol = Math.max(speechCadence * 0.75, this.audioLevel);

          this.targetLookX = Math.sin(this.time * 1.8) * 0.10;
          this.targetLookY = 0;

          // Joyful squint talking eyes on stressed syllables
          const syllableSquint = voiceVol * 0.50;
          lScaleY = Math.max(0.24, 1.0 - syllableSquint);
          rScaleY = Math.max(0.24, 1.0 - syllableSquint);

          // Natural syllable bounce
          this.hoverOffsetY = -Math.abs(Math.sin(this.time * 7.0)) * (2.8 + voiceVol * 3.2);
          this.targetBodyTilt = Math.sin(this.time * 4.0) * 0.025;
          this.bodySquashX = 0.98 + voiceVol * 0.04;
          this.bodySquashY = 1.0 + voiceVol * 0.05;
        }

      } else {
        // IDLE MODE:
        this.hoverOffsetY = Math.sin(this.time * 1.8) * 1.8;
        this.targetBodyTilt = 0;
        this.bodySquashX = 1.0;
        this.bodySquashY = 1.0;
      }

      this.leftEyeScaleY = lScaleY;
      this.rightEyeScaleY = rScaleY;
      this.leftEyeScaleX = lScaleX;
      this.rightEyeScaleX = rScaleX;

      this.bodyTilt += (this.targetBodyTilt - this.bodyTilt) * (1.0 - Math.exp(-dt * 8.0));

      // Auto-stop completion logic:
      // Option to stop as soon as listening or speaking is done
      if (this.autoStop) {
        this.stateTimer += dt;
        if (this.state === 'listening') {
          if (this.isMicActive) {
            if (this.audioLevel > 0.18) {
              this._hasSpokenInTurn = true;
              this._lastSpokeTime = now;
            }
            // User spoke and has paused for 1.3s -> listening is done!
            if (this._hasSpokenInTurn && (now - this._lastSpokeTime > 1300)) {
              this.stop('listening_done');
            } else if (!this._hasSpokenInTurn && this.stateTimer > 8.0) {
              // Silence timeout if no speech detected
              this.stop('listening_timeout');
            }
          } else {
            // In simulated listening: stop as soon as listening duration completes
            if (this.stateTimer >= this.options.listeningDuration) {
              this.stop('listening_done');
            }
          }
        } else if (this.state === 'speaking') {
          // In speaking: stop as soon as speech duration completes
          if (this.stateTimer >= this.options.speakingDuration) {
            this.stop('speaking_done');
          }
        }
      }
    }

    // ==========================================
    // Drawing Engine (Zero Shadow, Pure Gradient Pill)
    // ==========================================

    _draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const p = PALETTES[this.paletteKey] || PALETTES.amber;

      ctx.clearRect(0, 0, w, h);

      ctx.save();

      const cx = w / 2;
      const cy = h / 2 + this.hoverOffsetY;

      ctx.translate(cx, cy);
      ctx.rotate(this.bodyTilt);
      ctx.scale(this.bodySquashX, this.bodySquashY);

      // -------------------------------------------------------------
      // 1. Draw Pill Body: Pristine Seamless Gradient (ZERO SHADOW!)
      // -------------------------------------------------------------
      const pillW = w * 0.88;
      const pillH = h * 0.82;
      const pillR = pillH / 2;

      const x0 = -pillW / 2;
      const y0 = -pillH / 2;

      ctx.beginPath();
      ctx.roundRect(x0, y0, pillW, pillH, pillR);
      ctx.closePath();

      // Clean vibrant gradient fill (NO extra unclipped rects or shadows!)
      const bodyGrad = ctx.createLinearGradient(0, y0, 0, y0 + pillH);
      bodyGrad.addColorStop(0, p.bodyGrad[0]);
      bodyGrad.addColorStop(1, p.bodyGrad[1]);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // -------------------------------------------------------------
      // 2. Draw Eyes
      // -------------------------------------------------------------
      const eyeSpacing = pillW * 0.22;
      const eyeCenterY = 0;
      const gazeMaxX = pillW * 0.12;
      const gazeMaxY = pillH * 0.28;

      const currentGazeX = this.lookX * gazeMaxX;
      const currentGazeY = this.lookY * gazeMaxY;

      const eyeCol = this.getEffectiveEyeColor();

      this._drawEye(ctx, -eyeSpacing, eyeCenterY, currentGazeX, currentGazeY, this.leftEyeScaleX, this.leftEyeScaleY, eyeCol, false);
      this._drawEye(ctx, eyeSpacing, eyeCenterY, currentGazeX, currentGazeY, this.rightEyeScaleX, this.rightEyeScaleY, eyeCol, true);

      // -------------------------------------------------------------
      // 3. Draw Nose (User requested: "add nose in speaking maybe")
      // In speaking mode: appears and wiggles AFTER the 1.0s alert finishes!
      // -------------------------------------------------------------
      if ((this.state === 'speaking' && this.alertSpeakingTimer <= 0) || this.options.showNoseAlways) {
        this._drawNose(ctx, pillW, pillH, eyeCol);
      }

      // -------------------------------------------------------------
      // 4. Floating Thinking Dots (ONLY in Ponder / Thinking mode!)
      // -------------------------------------------------------------
      if (this.statusMark === '...') {
        this._drawThinkingDots(ctx, pillW * 0.38, -pillH * 0.48, eyeCol);
      }

      ctx.restore();
    }

    _drawEye(ctx, baseX, baseY, gazeX, gazeY, scaleX, scaleY, eyeColor, isRight) {
      const eyeR = Math.max(5.0, this.height * 0.10);
      const eyeX = baseX + gazeX;
      const eyeY = baseY + gazeY;

      ctx.save();
      ctx.translate(eyeX, eyeY);
      ctx.scale(scaleX, scaleY);

      // A. Happy Flash on Click or Happy Expression
      if (this.happyFlashTimer > 0 || this.expression === 'happy' || (this.state === 'speaking' && this.alertSpeakingTimer <= 0 && scaleY < 0.38)) {
        ctx.beginPath();
        ctx.arc(0, eyeR * 0.3, eyeR * 1.05, Math.PI * 1.15, Math.PI * 1.85, false);
        ctx.lineWidth = Math.max(2.4, this.height * 0.045);
        ctx.strokeStyle = eyeColor;
        ctx.lineCap = 'round';
        ctx.stroke();

      // B. Heart Expression
      } else if (this.expression === 'heart') {
        ctx.font = `${Math.round(eyeR * 2.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = eyeColor;
        ctx.fillText('♥', 0, 0);

      // C. Stars Expression (Sparkly anime star eyes!)
      } else if (this.expression === 'stars') {
        this._drawStar(ctx, 0, 0, 5, eyeR * 1.35, eyeR * 0.58, eyeColor);

      // D. Dizzy Expression
      } else if (this.expression === 'dizzy') {
        ctx.rotate(this.time * (isRight ? 6.0 : -6.0));
        ctx.beginPath();
        ctx.arc(0, 0, eyeR * 0.95, 0, Math.PI * 1.6);
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = eyeColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, eyeR * 0.45, Math.PI * 0.8, Math.PI * 2.4);
        ctx.stroke();

      // E. Irritated Expression (Unamused flat-top bead with sharp eyelid line)
      } else if (this.expression === 'irritated') {
        // Flat-top unamused bead
        ctx.beginPath();
        ctx.arc(0, eyeR * 0.12, eyeR * 0.92, 0, Math.PI, false);
        ctx.lineTo(-eyeR * 0.92, eyeR * 0.12);
        ctx.closePath();
        ctx.fillStyle = eyeColor;
        ctx.fill();

        // Sharp unamused eyelid stroke across top with slight annoyed angle
        ctx.beginPath();
        const slant = isRight ? eyeR * 0.16 : -eyeR * 0.16;
        ctx.moveTo(-eyeR * 1.15, eyeR * 0.10 - slant);
        ctx.lineTo(eyeR * 1.15, eyeR * 0.10 + slant);
        ctx.lineWidth = Math.max(2.2, this.height * 0.042);
        ctx.strokeStyle = eyeColor;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Small lower catchlight
        ctx.beginPath();
        ctx.arc(eyeR * 0.25, eyeR * 0.45, eyeR * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

      // F. Proud Expression (Confident upturned smug crescents with blush dots)
      } else if (this.expression === 'proud') {
        // Confident smug upturned closed crescent arc
        ctx.beginPath();
        ctx.arc(0, -eyeR * 0.20, eyeR * 0.95, Math.PI * 0.16, Math.PI * 0.84, false);
        ctx.lineWidth = Math.max(2.6, this.height * 0.05);
        ctx.strokeStyle = eyeColor;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Cute proud pink/glow blush dot below each eye
        ctx.beginPath();
        ctx.arc(isRight ? eyeR * 0.45 : -eyeR * 0.45, eyeR * 0.85, eyeR * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = eyeColor === '#ffffff' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(244, 63, 94, 0.60)';
        ctx.fill();

      // G. Classic Bead Eyes
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = eyeColor;
        ctx.fill();

        // Eye Specular Catchlight (Twinkle in upper right)
        if (scaleY > 0.35) {
          ctx.beginPath();
          ctx.arc(eyeR * 0.35, -eyeR * 0.35, eyeR * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      ctx.restore();
    }

    _drawNose(ctx, pillW, pillH, eyeColor) {
      // Delicate, cute quick line that wiggles playfully during speech
      const noseLen = pillH * 0.16;
      const noseY = pillH * 0.12;
      const wiggle = (this.state === 'speaking' && this.alertSpeakingTimer <= 0) 
        ? Math.sin(this.time * 16.0) * (0.8 + this.audioLevel * 1.8) 
        : 0;

      ctx.save();
      ctx.translate(wiggle, noseY);
      ctx.beginPath();
      ctx.moveTo(0, -noseLen * 0.5);
      ctx.quadraticCurveTo(noseLen * 0.15, 0, 0, noseLen * 0.5);
      ctx.lineWidth = Math.max(1.8, pillH * 0.032);
      ctx.strokeStyle = eyeColor;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    _drawThinkingDots(ctx, x, y, eyeColor) {
      ctx.save();
      ctx.translate(x, y + Math.sin(this.time * 5.0) * 2.0);

      const dotR = 2.4;
      const gap = 6.5;
      const markColor = eyeColor === '#ffffff' ? '#38bdf8' : '#090d16';

      for (let i = 0; i < 3; i++) {
        const bounce = Math.sin(this.time * 5.5 - i * 1.1) * 2.8;
        ctx.beginPath();
        ctx.arc((i - 1) * gap, bounce, dotR, 0, Math.PI * 2);
        ctx.fillStyle = markColor;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  VoicePill.PALETTES = PALETTES;
  return VoicePill;
}));
