// Google Analytics event tracking utilities for SuperSmashTexty

export function trackEvent(eventName, params = {}) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// SuperSmashTexty specific events
export const Analytics = {
  // Track game start
  gameStarted: (characterId, isMultiplayer = false) => {
    trackEvent("game_start", {
      character: characterId,
      multiplayer: isMultiplayer,
    });
  },

  // Track game over
  gameOver: (score, floor, playTimeSeconds, playerCount = 1) => {
    trackEvent("game_over", {
      score,
      floor_reached: floor,
      play_time_seconds: playTimeSeconds,
      player_count: playerCount,
    });
  },

  // Track boss defeated
  bossDefeated: (bossId, floor) => {
    trackEvent("boss_defeated", {
      boss: bossId,
      floor,
    });
  },

  // Track upgrade purchased in shop
  upgradePurchased: (upgradeId, cost) => {
    trackEvent("upgrade_purchased", {
      upgrade: upgradeId,
      cost,
    });
  },

  // Track multiplayer session
  multiplayerStarted: (playerCount, isHost) => {
    trackEvent("multiplayer_started", {
      player_count: playerCount,
      is_host: isHost,
    });
  },

  // Track achievement unlocked
  achievementUnlocked: (achievementId) => {
    trackEvent("achievement_unlocked", {
      achievement: achievementId,
    });
  },

  // Track character unlocked
  characterUnlocked: (characterId) => {
    trackEvent("character_unlocked", {
      character: characterId,
    });
  },
};
