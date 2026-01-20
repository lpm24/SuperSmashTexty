/**
 * Programmatic Bit Sound System
 * Generates retro-style sounds using Web Audio API
 */

// Audio context singleton
let audioContext = null;

// Master volume control
let masterVolume = 1.0;

// Music volume control (separate from SFX)
let musicVolume = 1.0;

// SFX volume control (separate from music)
let sfxVolume = 1.0;

// Sound enabled flag
let soundEnabled = true;

// UI sounds enabled (menu clicks, notifications)
let uiSoundsEnabled = true;

// Combat sounds enabled (hit sounds, abilities)
let combatSoundsEnabled = true;

// Music playback state
let currentMusic = null;
let currentMusicTrack = null;
let musicEnabled = true;

// Music file paths (relative to public folder)
const MUSIC_TRACKS = {
    menu: './audio/menu-theme.mp3',
    combat: './audio/combat-theme.mp3',
    defeat: './audio/defeat-theme.mp3'
};

// Preloaded audio buffers
const musicCache = {};

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
 * Resume audio context if suspended (required for browser autoplay policy)
 * Call this on first user interaction to enable audio
 */
export function resumeAudioContext() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log('[Audio] AudioContext resumed');
    }).catch(err => {
      console.warn('[Audio] Failed to resume AudioContext:', err);
    });
  }
}

/**
 * Get or create audio context
 */
function getAudioContext() {
  if (!audioContext) {
    initAudio();
  }
  // Auto-resume if suspended
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Set master volume (0.0 to 1.0)
 */
export function setMasterVolume(volume) {
  masterVolume = Math.max(0, Math.min(1, volume));
  // Update music volume to reflect master change
  if (currentMusic) {
    currentMusic.volume = musicVolume * masterVolume;
  }
}

/**
 * Get master volume
 */
export function getMasterVolume() {
  return masterVolume;
}

/**
 * Set SFX volume (0.0 to 1.0)
 */
export function setSfxVolume(volume) {
  sfxVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Get SFX volume
 */
export function getSfxVolume() {
  return sfxVolume;
}

/**
 * Enable or disable UI sounds
 */
export function setUiSoundsEnabled(enabled) {
  uiSoundsEnabled = enabled;
}

/**
 * Enable or disable combat sounds
 */
export function setCombatSoundsEnabled(enabled) {
  combatSoundsEnabled = enabled;
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
 * @param {object} options - Additional options (attack, decay, pitchBend, isUI, etc.)
 */
function playTone(frequency, duration, type = 'square', volume = 0.3, options = {}) {
  if (!soundEnabled) return;

  // Check if this is a UI sound or combat sound and if those are disabled
  if (options.isUI && !uiSoundsEnabled) return;
  if (options.isCombat && !combatSoundsEnabled) return;

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
  // Apply all volume multipliers: base volume * sfx volume * master volume
  const finalVolume = volume * sfxVolume * masterVolume;

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

  // Check if this is a combat sound and if those are disabled
  if (options.isCombat && !combatSoundsEnabled) return;

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
  // Apply all volume multipliers: base volume * sfx volume * master volume
  const finalVolume = volume * sfxVolume * masterVolume;

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
    playTone(vary(220, 0.3), 0.04, 'triangle', 0.08, {
      attack: 0.001,
      decay: 0.025,
      pitchBend: 0.5
    });
  } else if (variation < 0.66) {
    playTone(vary(240, 0.3), 0.035, 'sine', 0.09, {
      attack: 0.001,
      decay: 0.02,
      pitchBend: 0.6
    });
  } else {
    playTone(vary(200, 0.3), 0.045, 'triangle', 0.08, {
      attack: 0.001,
      decay: 0.03,
      pitchBend: 0.4
    });
  }
}

/**
 * Shotgun fire sound (deep boom with noise)
 */
export function playShotgunFire() {
  // Soft thump - much more pleasant
  const freq = vary(60, 0.15);
  playTone(freq, 0.1, 'sine', 0.12, {
    attack: 0.002,
    decay: 0.08,
    pitchBend: 0.4
  });

  // Gentle noise - reduced volume and filtered lower
  playNoise(vary(0.04, 0.2), vary(0.12, 0.2), {
    attack: 0.002,
    decay: 0.06,
    filterType: 'lowpass',
    filterFreq: vary(800, 0.3)
  });
}

/**
 * Sniper fire sound (sharp, high-impact)
 */
export function playSniperFire() {
  // Clean crack with triangle wave
  playTone(vary(350, 0.2), 0.05, 'triangle', 0.12, {
    attack: 0.001,
    decay: 0.03,
    pitchBend: 0.3
  });

  // Low frequency thump
  playTone(vary(50, 0.15), 0.1, 'sine', 0.1, {
    attack: 0.001,
    decay: 0.07,
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
  // Deep thump - softer
  playTone(vary(55, 0.2), 0.15, 'sine', 0.1, {
    attack: 0.002,
    decay: 0.12,
    pitchBend: 0.4
  });

  // Mid-range whomp - triangle for smoothness
  playTone(vary(100, 0.2), 0.12, 'triangle', 0.08, {
    attack: 0.005,
    decay: 0.08,
    pitchBend: 0.5
  });
}

/**
 * Chain lightning sound
 */
export function playChainLightningFire() {
  // Electric zap - ascending pitch, softer
  playTone(vary(250, 0.3), 0.08, 'triangle', 0.1, {
    attack: 0.001,
    decay: 0.06,
    pitchBend: 1.6
  });

  // Subtle crackle - much quieter
  playNoise(vary(0.03, 0.3), 0.08, {
    attack: 0.001,
    decay: 0.04,
    filterType: 'bandpass',
    filterFreq: vary(2000, 0.4)
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
 * Enemy hit sound - soft pop/thump
 */
export function playEnemyHit() {
  const variation = Math.random();

  if (variation < 0.25) {
    // Soft pop 1
    playTone(vary(280, 0.2), 0.06, 'sine', 0.12, {
      attack: 0.002,
      decay: 0.04,
      pitchBend: 0.2
    });
  } else if (variation < 0.5) {
    // Soft pop 2
    playTone(vary(320, 0.2), 0.05, 'triangle', 0.12, {
      attack: 0.002,
      decay: 0.035,
      pitchBend: 0.15
    });
  } else if (variation < 0.75) {
    // Soft thump 1
    playTone(vary(240, 0.2), 0.07, 'sine', 0.14, {
      attack: 0.003,
      decay: 0.05,
      pitchBend: 0.25
    });
  } else {
    // Soft thump 2
    playTone(vary(360, 0.2), 0.05, 'triangle', 0.10, {
      attack: 0.002,
      decay: 0.03,
      pitchBend: 0.1
    });
  }
}

/**
 * Player damage sound - softer but noticeable
 */
export function playPlayerHit() {
  const variation = Math.random();

  if (variation < 0.33) {
    // Soft impact 1
    playTone(vary(180, 0.2), 0.10, 'triangle', 0.18, {
      attack: 0.003,
      decay: 0.07,
      pitchBend: 0.2
    });
    playTone(vary(400, 0.2), 0.06, 'sine', 0.10, {
      attack: 0.005,
      decay: 0.04,
      pitchBend: 0.1
    });
  } else if (variation < 0.66) {
    // Soft impact 2
    playTone(vary(160, 0.2), 0.12, 'triangle', 0.18, {
      attack: 0.003,
      decay: 0.08,
      pitchBend: 0.25
    });
    playTone(vary(320, 0.2), 0.07, 'sine', 0.12, {
      attack: 0.005,
      decay: 0.05,
      pitchBend: 0.15
    });
  } else {
    // Soft impact 3
    playTone(vary(200, 0.2), 0.11, 'triangle', 0.18, {
      attack: 0.003,
      decay: 0.08,
      pitchBend: 0.3
    });
    playTone(vary(440, 0.2), 0.05, 'sine', 0.08, {
      attack: 0.005,
      decay: 0.03,
      pitchBend: 0.1
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

// ==================== MUSIC PLAYBACK ====================

/**
 * Set music volume (0.0 to 1.0)
 * @param {number} volume - Volume level
 */
export function setMusicVolume(volume) {
    musicVolume = Math.max(0, Math.min(1, volume));
    if (currentMusic) {
        currentMusic.volume = musicVolume * masterVolume;
    }
}

/**
 * Enable or disable music
 * @param {boolean} enabled
 */
export function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    if (!enabled && currentMusic) {
        stopMusic();
    }
}

/**
 * Stop currently playing music
 */
export function stopMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
        currentMusic = null;
        currentMusicTrack = null;
    }
}

/**
 * Play a music track
 * @param {string} trackName - 'menu' or 'combat'
 * @param {boolean} loop - Whether to loop the track
 */
function playMusicTrack(trackName, loop = true) {
    if (!musicEnabled) return;

    // Don't restart if same track is already playing
    if (currentMusicTrack === trackName && currentMusic && !currentMusic.paused) {
        return;
    }

    // Stop current music
    stopMusic();

    const trackPath = MUSIC_TRACKS[trackName];
    if (!trackPath) {
        console.warn(`[Music] Unknown track: ${trackName}`);
        return;
    }

    try {
        // Use cached audio element or create new one
        if (!musicCache[trackName]) {
            musicCache[trackName] = new Audio(trackPath);
        }

        currentMusic = musicCache[trackName];
        currentMusic.loop = loop;
        currentMusic.volume = musicVolume * masterVolume;
        currentMusicTrack = trackName;

        // Play with error handling
        const playPromise = currentMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`[Music] Playback failed for ${trackName}:`, error.message);
            });
        }
    } catch (error) {
        console.warn(`[Music] Failed to play ${trackName}:`, error.message);
    }
}

/**
 * Play menu theme music
 */
export function playMenuMusic() {
    playMusicTrack('menu');
}

/**
 * Play combat/gameplay theme music
 */
export function playCombatMusic() {
    playMusicTrack('combat');
}

/**
 * Play defeat/game over theme music
 */
export function playDefeatMusic() {
    playMusicTrack('defeat');
}

/**
 * Check if music is currently playing
 * @returns {boolean}
 */
export function isMusicPlaying() {
    return currentMusic && !currentMusic.paused;
}

/**
 * Get current music track name
 * @returns {string|null}
 */
export function getCurrentMusicTrack() {
    return currentMusicTrack;
}
