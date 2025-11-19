/**
 * Programmatic Bit Sound System
 * Generates retro-style sounds using Web Audio API
 */

// Audio context singleton
let audioContext = null;

// Master volume control
let masterVolume = 0.3;

// Sound enabled flag
let soundEnabled = true;

/**
 * Initialize audio context (must be called after user interaction)
 */
export function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Get or create audio context
 */
function getAudioContext() {
  if (!audioContext) {
    initAudio();
  }
  return audioContext;
}

/**
 * Set master volume (0.0 to 1.0)
 */
export function setMasterVolume(volume) {
  masterVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Enable or disable sounds
 */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

/**
 * Play a simple tone
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
 * @param {number} volume - Volume (0.0 to 1.0)
 * @param {object} options - Additional options (attack, decay, pitchBend, etc.)
 */
function playTone(frequency, duration, type = 'square', volume = 0.3, options = {}) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Create oscillator
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  // Pitch bend if specified
  if (options.pitchBend) {
    osc.frequency.exponentialRampToValueAtTime(
      frequency * options.pitchBend,
      now + duration
    );
  }

  // Create gain node for volume envelope
  const gainNode = ctx.createGain();
  const finalVolume = volume * masterVolume;

  // Attack
  const attack = options.attack || 0.01;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(finalVolume, now + attack);

  // Decay/Release
  const decay = options.decay || 0.1;
  gainNode.gain.setValueAtTime(finalVolume, now + duration - decay);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  // Connect nodes
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Start and stop
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Play white noise burst
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume (0.0 to 1.0)
 * @param {object} options - Additional options
 */
function playNoise(duration, volume = 0.3, options = {}) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Create buffer with white noise
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  // Create source
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Create filter for colored noise
  const filter = ctx.createBiquadFilter();
  filter.type = options.filterType || 'lowpass';
  filter.frequency.setValueAtTime(options.filterFreq || 2000, now);

  // Create gain node
  const gainNode = ctx.createGain();
  const finalVolume = volume * masterVolume;

  const attack = options.attack || 0.01;
  const decay = options.decay || 0.1;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(finalVolume, now + attack);
  gainNode.gain.setValueAtTime(finalVolume, now + duration - decay);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  // Connect nodes
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

/**
 * Random variation helper
 */
function vary(value, amount = 0.1) {
  return value * (1 + (Math.random() - 0.5) * amount);
}

/**
 * Random choice helper
 */
function choice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ==================== WEAPON FIRING SOUNDS ====================

/**
 * Pistol fire sound
 */
export function playPistolFire() {
  const variation = Math.random();

  if (variation < 0.33) {
    // Smooth pop with triangle wave
    playTone(vary(280, 0.15), 0.08, 'triangle', 0.14, {
      attack: 0.002,
      decay: 0.05,
      pitchBend: 0.65
    });
  } else if (variation < 0.66) {
    // Softer shot with sine wave
    playTone(vary(320, 0.15), 0.09, 'sine', 0.13, {
      attack: 0.003,
      decay: 0.06,
      pitchBend: 0.7
    });
  } else {
    // Crisp but pleasant with triangle
    playTone(vary(300, 0.15), 0.07, 'triangle', 0.14, {
      attack: 0.002,
      decay: 0.04,
      pitchBend: 0.6
    });
  }
}

/**
 * SMG fire sound (rapid, lighter)
 */
export function playSMGFire() {
  const variation = Math.random();

  if (variation < 0.33) {
    playTone(vary(250, 0.3), 0.05, 'square', 0.12, {
      attack: 0.001,
      decay: 0.03,
      pitchBend: 0.4
    });
  } else if (variation < 0.66) {
    playTone(vary(280, 0.3), 0.04, 'sawtooth', 0.12, {
      attack: 0.001,
      decay: 0.025,
      pitchBend: 0.5
    });
  } else {
    playTone(vary(230, 0.3), 0.06, 'square', 0.12, {
      attack: 0.001,
      decay: 0.04,
      pitchBend: 0.3
    });
  }
}

/**
 * Shotgun fire sound (deep boom with noise)
 */
export function playShotgunFire() {
  const variation = Math.random();

  // Low frequency boom
  const freq = vary(80, 0.15);
  playTone(freq, 0.15, 'sawtooth', 0.25, {
    attack: 0.001,
    decay: 0.1,
    pitchBend: 0.3
  });

  // Noise burst
  playNoise(vary(0.12, 0.2), vary(0.2, 0.3), {
    attack: 0.001,
    decay: 0.08,
    filterType: 'lowpass',
    filterFreq: vary(1500, 0.4)
  });
}

/**
 * Sniper fire sound (sharp, high-impact)
 */
export function playSniperFire() {
  const variation = Math.random();

  // High frequency crack
  playTone(vary(400, 0.2), 0.06, 'square', 0.2, {
    attack: 0.001,
    decay: 0.04,
    pitchBend: 0.2
  });

  // Low frequency thump
  playTone(vary(60, 0.15), 0.12, 'sine', 0.18, {
    attack: 0.001,
    decay: 0.08,
    pitchBend: 0.5
  });
}

/**
 * Flamethrower sound (continuous crackle - call repeatedly)
 */
export function playFlamethrowerFire() {
  playNoise(0.08, vary(0.15, 0.4), {
    attack: 0.005,
    decay: 0.04,
    filterType: 'bandpass',
    filterFreq: vary(800, 0.5)
  });
}

/**
 * Explosive launcher sound
 */
export function playExplosiveFire() {
  const variation = Math.random();

  // Deep thump
  playTone(vary(70, 0.2), 0.2, 'sawtooth', 0.22, {
    attack: 0.001,
    decay: 0.15,
    pitchBend: 0.4
  });

  // Mid-range boom
  playTone(vary(120, 0.2), 0.15, 'square', 0.18, {
    attack: 0.005,
    decay: 0.1,
    pitchBend: 0.5
  });
}

/**
 * Chain lightning sound
 */
export function playChainLightningFire() {
  const variation = Math.random();

  // Electric zap - ascending pitch
  playTone(vary(300, 0.3), 0.12, 'sawtooth', 0.18, {
    attack: 0.001,
    decay: 0.08,
    pitchBend: 1.8
  });

  // High frequency crackle
  playNoise(vary(0.1, 0.3), 0.15, {
    attack: 0.001,
    decay: 0.06,
    filterType: 'highpass',
    filterFreq: vary(3000, 0.4)
  });
}

/**
 * Orbital weapon sound (whoosh)
 */
export function playOrbitalFire() {
  playTone(vary(180, 0.4), 0.1, 'triangle', 0.14, {
    attack: 0.02,
    decay: 0.06,
    pitchBend: 1.3
  });
}

/**
 * Generic weapon fire (fallback)
 */
export function playGenericFire() {
  playPistolFire();
}

// ==================== IMPACT SOUNDS ====================

/**
 * Enemy hit sound
 */
export function playEnemyHit() {
  const variation = Math.random();

  if (variation < 0.25) {
    // Thud 1
    playTone(vary(120, 0.3), 0.08, 'square', 0.16, {
      attack: 0.001,
      decay: 0.05,
      pitchBend: 0.5
    });
  } else if (variation < 0.5) {
    // Thud 2
    playTone(vary(100, 0.3), 0.09, 'sawtooth', 0.16, {
      attack: 0.001,
      decay: 0.06,
      pitchBend: 0.6
    });
  } else if (variation < 0.75) {
    // Impact 1
    playTone(vary(140, 0.3), 0.07, 'square', 0.16, {
      attack: 0.001,
      decay: 0.04,
      pitchBend: 0.4
    });
    playNoise(0.05, 0.1, {
      attack: 0.001,
      decay: 0.03,
      filterFreq: vary(1200, 0.4)
    });
  } else {
    // Impact 2
    playTone(vary(160, 0.3), 0.06, 'triangle', 0.16, {
      attack: 0.001,
      decay: 0.04,
      pitchBend: 0.3
    });
  }
}

/**
 * Player damage sound
 */
export function playPlayerHit() {
  const variation = Math.random();

  if (variation < 0.33) {
    // Harsh impact 1
    playTone(vary(80, 0.2), 0.15, 'sawtooth', 0.25, {
      attack: 0.001,
      decay: 0.1,
      pitchBend: 0.4
    });
    playNoise(0.12, 0.2, {
      attack: 0.001,
      decay: 0.08,
      filterType: 'lowpass',
      filterFreq: vary(1000, 0.3)
    });
  } else if (variation < 0.66) {
    // Harsh impact 2
    playTone(vary(70, 0.2), 0.18, 'square', 0.25, {
      attack: 0.001,
      decay: 0.12,
      pitchBend: 0.5
    });
    playTone(vary(200, 0.3), 0.08, 'triangle', 0.15, {
      attack: 0.005,
      decay: 0.05,
      pitchBend: 0.3
    });
  } else {
    // Harsh impact 3
    playTone(vary(90, 0.2), 0.16, 'sawtooth', 0.25, {
      attack: 0.001,
      decay: 0.11,
      pitchBend: 0.6
    });
    playNoise(0.1, 0.18, {
      attack: 0.001,
      decay: 0.07,
      filterType: 'bandpass',
      filterFreq: vary(800, 0.4)
    });
  }
}

/**
 * Enemy death sound
 */
export function playEnemyDeath() {
  const variation = Math.random();

  if (variation < 0.33) {
    // Descending death 1
    playTone(vary(200, 0.2), 0.25, 'sawtooth', 0.2, {
      attack: 0.01,
      decay: 0.2,
      pitchBend: 0.2
    });
  } else if (variation < 0.66) {
    // Descending death 2
    playTone(vary(180, 0.2), 0.3, 'square', 0.2, {
      attack: 0.01,
      decay: 0.25,
      pitchBend: 0.15
    });
    playNoise(0.15, 0.12, {
      attack: 0.05,
      decay: 0.1,
      filterFreq: vary(1500, 0.4)
    });
  } else {
    // Descending death 3
    playTone(vary(220, 0.2), 0.28, 'triangle', 0.2, {
      attack: 0.01,
      decay: 0.23,
      pitchBend: 0.25
    });
  }
}

/**
 * Explosion sound
 */
export function playExplosion() {
  const variation = Math.random();

  // Deep bass boom
  playTone(vary(50, 0.15), 0.3, 'sawtooth', 0.3, {
    attack: 0.001,
    decay: 0.25,
    pitchBend: 0.3
  });

  // Mid-range explosion
  playTone(vary(100, 0.2), 0.25, 'square', 0.25, {
    attack: 0.005,
    decay: 0.2,
    pitchBend: 0.4
  });

  // Noise burst
  playNoise(vary(0.3, 0.2), vary(0.25, 0.3), {
    attack: 0.001,
    decay: 0.25,
    filterType: 'lowpass',
    filterFreq: vary(1200, 0.5)
  });
}

// ==================== UI & GAME EVENT SOUNDS ====================

/**
 * XP pickup sound
 */
export function playXPPickup() {
  const variation = Math.random();

  if (variation < 0.33) {
    playTone(vary(600, 0.2), 0.08, 'sine', 0.15, {
      attack: 0.01,
      decay: 0.05,
      pitchBend: 1.2
    });
  } else if (variation < 0.66) {
    playTone(vary(650, 0.2), 0.09, 'triangle', 0.15, {
      attack: 0.01,
      decay: 0.06,
      pitchBend: 1.3
    });
  } else {
    playTone(vary(550, 0.2), 0.1, 'sine', 0.15, {
      attack: 0.01,
      decay: 0.07,
      pitchBend: 1.15
    });
  }
}

/**
 * Currency/cash pickup sound
 */
export function playCurrencyPickup() {
  const variation = Math.random();

  if (variation < 0.33) {
    // Bright coin "ching" - two quick tones
    playTone(vary(800, 0.2), 0.06, 'sine', 0.16, {
      attack: 0.005,
      decay: 0.04
    });
    setTimeout(() => {
      playTone(vary(1000, 0.2), 0.05, 'triangle', 0.14, {
        attack: 0.005,
        decay: 0.03
      });
    }, 30);
  } else if (variation < 0.66) {
    // Metallic ping
    playTone(vary(900, 0.2), 0.08, 'triangle', 0.16, {
      attack: 0.005,
      decay: 0.05,
      pitchBend: 0.85
    });
    playTone(vary(1200, 0.2), 0.06, 'sine', 0.12, {
      attack: 0.01,
      decay: 0.04
    });
  } else {
    // Cash register "ka-ching"
    playTone(vary(750, 0.2), 0.05, 'square', 0.14, {
      attack: 0.005,
      decay: 0.03
    });
    setTimeout(() => {
      playTone(vary(1100, 0.2), 0.07, 'sine', 0.16, {
        attack: 0.005,
        decay: 0.05
      });
    }, 40);
  }
}

/**
 * Level up sound
 */
export function playLevelUp() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Ascending arpeggio
  const baseFreq = 400;
  const notes = [1, 1.25, 1.5, 2];

  notes.forEach((mult, i) => {
    setTimeout(() => {
      playTone(baseFreq * mult, 0.15, 'square', 0.2, {
        attack: 0.01,
        decay: 0.1
      });
    }, i * 80);
  });
}

/**
 * Door open/room transition sound
 */
export function playDoorOpen() {
  const variation = Math.random();

  // Ascending sweep
  playTone(vary(200, 0.2), 0.25, 'sawtooth', 0.18, {
    attack: 0.02,
    decay: 0.15,
    pitchBend: 1.6
  });
}

/**
 * Menu select sound
 */
export function playMenuSelect() {
  playTone(vary(500, 0.15), 0.08, 'square', 0.15, {
    attack: 0.01,
    decay: 0.05
  });
}

/**
 * Menu navigation sound
 */
export function playMenuNav() {
  playTone(vary(400, 0.15), 0.06, 'triangle', 0.12, {
    attack: 0.01,
    decay: 0.04
  });
}

/**
 * Upgrade select sound
 */
export function playUpgradeSelect() {
  // Two-tone chord
  playTone(vary(500, 0.1), 0.2, 'square', 0.18, {
    attack: 0.01,
    decay: 0.15
  });

  setTimeout(() => {
    playTone(vary(750, 0.1), 0.18, 'square', 0.15, {
      attack: 0.01,
      decay: 0.13
    });
  }, 50);
}

/**
 * Boss spawn sound
 */
export function playBossSpawn() {
  // Deep ominous tone
  playTone(vary(50, 0.1), 0.5, 'sawtooth', 0.25, {
    attack: 0.05,
    decay: 0.4,
    pitchBend: 0.8
  });

  // High warning tone
  setTimeout(() => {
    playTone(vary(800, 0.2), 0.3, 'square', 0.2, {
      attack: 0.01,
      decay: 0.25
    });
  }, 100);
}

/**
 * Boss death sound
 */
export function playBossDeath() {
  // Epic descending cascade
  const baseFreq = 400;
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      playTone(baseFreq * (1 - i * 0.1), 0.15, 'sawtooth', 0.2, {
        attack: 0.01,
        decay: 0.1
      });
    }, i * 60);
  }

  // Final explosion
  setTimeout(() => {
    playExplosion();
  }, 480);
}

/**
 * Achievement unlocked sound
 */
export function playAchievement() {
  // Triumphant fanfare
  const notes = [400, 500, 600, 800];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.2, 'square', 0.18, {
        attack: 0.01,
        decay: 0.15
      });
    }, i * 100);
  });
}

/**
 * Purchase success sound
 */
export function playPurchaseSuccess() {
  // Positive ascending chime
  playTone(vary(600, 0.1), 0.15, 'sine', 0.2, {
    attack: 0.01,
    decay: 0.1
  });

  setTimeout(() => {
    playTone(vary(800, 0.1), 0.2, 'sine', 0.18, {
      attack: 0.01,
      decay: 0.15
    });
  }, 80);
}

/**
 * Purchase error / insufficient funds sound
 */
export function playPurchaseError() {
  // Negative buzz
  playTone(vary(150, 0.1), 0.2, 'sawtooth', 0.2, {
    attack: 0.01,
    decay: 0.15,
    pitchBend: 0.7
  });

  playNoise(0.1, 0.15, {
    attack: 0.01,
    decay: 0.08,
    filterType: 'lowpass',
    filterFreq: vary(500, 0.3)
  });
}

/**
 * Pause sound
 */
export function playPause() {
  playTone(vary(400, 0.1), 0.08, 'square', 0.15, {
    attack: 0.01,
    decay: 0.05,
    pitchBend: 0.8
  });
}

/**
 * Unpause sound
 */
export function playUnpause() {
  playTone(vary(400, 0.1), 0.08, 'square', 0.15, {
    attack: 0.01,
    decay: 0.05,
    pitchBend: 1.2
  });
}

// ==================== WEAPON TYPE MAPPING ====================

/**
 * Play weapon fire sound based on weapon type
 * @param {string} weaponType - The weapon type identifier
 */
export function playWeaponFire(weaponType) {
  const weaponName = weaponType?.toLowerCase() || '';

  if (weaponName.includes('pistol')) {
    playPistolFire();
  } else if (weaponName.includes('smg') || weaponName.includes('submachine')) {
    playSMGFire();
  } else if (weaponName.includes('shotgun')) {
    playShotgunFire();
  } else if (weaponName.includes('sniper') || weaponName.includes('rifle')) {
    playSniperFire();
  } else if (weaponName.includes('flame') || weaponName.includes('thrower')) {
    playFlamethrowerFire();
  } else if (weaponName.includes('explosive') || weaponName.includes('launcher') || weaponName.includes('rocket')) {
    playExplosiveFire();
  } else if (weaponName.includes('chain') || weaponName.includes('lightning')) {
    playChainLightningFire();
  } else if (weaponName.includes('orbital')) {
    playOrbitalFire();
  } else {
    playGenericFire();
  }
}

// Auto-initialize on first sound play attempt
export function ensureAudioContext() {
  return getAudioContext();
}
