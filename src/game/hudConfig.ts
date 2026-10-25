export interface HUDControlConfig {
  version: number;
  joystick: {
    x: number; // percentage from left (0 to 100)
    y: number; // percentage from bottom (0 to 100)
    scale: number; // 0.7 to 1.5
    opacity: number; // 0.3 to 1.0
    enabled: boolean;
  };
  abilityDock: {
    x: number; // percentage from center/left (0 to 100)
    y: number; // percentage from bottom (0 to 100)
    scale: number; // 0.7 to 1.4
    opacity: number; // 0.3 to 1.0
    layout: 'ROW' | 'ARC';
    spacing: number; // pixel spacing between ability slots (6 to 24)
  };
  dodgeButton: {
    separate: boolean; // if false, docked with abilities; if true, placed freely
    x: number; // percentage from right (0 to 100)
    y: number; // percentage from bottom (0 to 100)
    scale: number; // 0.7 to 1.5
    opacity: number; // 0.3 to 1.0
  };
  directives: {
    x: number; // percentage from right
    y: number; // percentage from bottom
    scale: number; // 0.7 to 1.3
    opacity: number; // 0.3 to 1.0
    collapsed: boolean;
  };
  minimap: {
    x: number; // percentage from right
    y: number; // percentage from bottom
    scale: number; // 0.7 to 1.3
    opacity: number; // 0.3 to 1.0
    collapsed: boolean;
  };
  vibration: boolean;
}

export const DEFAULT_HUD_CONFIG: HUDControlConfig = {
  version: 1,
  joystick: {
    x: 4,
    y: 4,
    scale: 1.0,
    opacity: 0.95,
    enabled: true,
  },
  abilityDock: {
    x: 50,
    y: 3,
    scale: 1.0,
    opacity: 0.95,
    layout: 'ROW',
    spacing: 10,
  },
  dodgeButton: {
    separate: false,
    x: 12,
    y: 18,
    scale: 1.1,
    opacity: 0.95,
  },
  directives: {
    x: 3,
    y: 22,
    scale: 1.0,
    opacity: 0.95,
    collapsed: false,
  },
  minimap: {
    x: 3,
    y: 3,
    scale: 1.0,
    opacity: 0.95,
    collapsed: false,
  },
  vibration: true,
};

export const HUD_PRESETS: Record<string, { name: string; description: string; config: HUDControlConfig }> = {
  default: {
    name: 'Classic Balanced',
    description: 'Standard desktop and mobile balanced layout with bottom-docked abilities.',
    config: { ...DEFAULT_HUD_CONFIG },
  },
  combatArc: {
    name: 'Thumb Combat Arc',
    description: 'Abilities curved in a thumb-friendly arc at the right side for high-speed mobile combat.',
    config: {
      ...DEFAULT_HUD_CONFIG,
      joystick: { x: 5, y: 6, scale: 1.1, opacity: 0.9, enabled: true },
      abilityDock: { x: 82, y: 16, scale: 1.05, opacity: 0.95, layout: 'ARC', spacing: 14 },
      dodgeButton: { separate: true, x: 26, y: 8, scale: 1.25, opacity: 1.0 },
      directives: { x: 2, y: 38, scale: 0.9, opacity: 0.85, collapsed: false },
      minimap: { x: 2, y: 2, scale: 0.9, opacity: 0.85, collapsed: false },
      vibration: true,
    },
  },
  leftHanded: {
    name: 'Left-Handed Mirror',
    description: 'Abilities placed on the left side with Joystick on the right side.',
    config: {
      ...DEFAULT_HUD_CONFIG,
      joystick: { x: 82, y: 6, scale: 1.05, opacity: 0.95, enabled: true },
      abilityDock: { x: 24, y: 4, scale: 1.0, opacity: 0.95, layout: 'ROW', spacing: 10 },
      dodgeButton: { separate: true, x: 70, y: 16, scale: 1.15, opacity: 1.0 },
      directives: { x: 75, y: 42, scale: 0.9, opacity: 0.85, collapsed: false },
      minimap: { x: 2, y: 2, scale: 0.95, opacity: 0.9, collapsed: false },
      vibration: true,
    },
  },
  compactTactical: {
    name: 'Compact Tactical',
    description: 'Streamlined 80% scale HUD with slight transparency for maximum battlefield vision.',
    config: {
      ...DEFAULT_HUD_CONFIG,
      joystick: { x: 3, y: 3, scale: 0.85, opacity: 0.8, enabled: true },
      abilityDock: { x: 50, y: 2, scale: 0.85, opacity: 0.85, layout: 'ROW', spacing: 8 },
      dodgeButton: { separate: false, x: 10, y: 10, scale: 0.9, opacity: 0.85 },
      directives: { x: 2, y: 18, scale: 0.85, opacity: 0.8, collapsed: true },
      minimap: { x: 2, y: 2, scale: 0.85, opacity: 0.85, collapsed: false },
      vibration: false,
    },
  },
};

const STORAGE_KEY = 'battlefield_hud_config_v1';

export function loadHUDConfig(): HUDControlConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HUD_CONFIG;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === DEFAULT_HUD_CONFIG.version) {
      return {
        ...DEFAULT_HUD_CONFIG,
        ...parsed,
        joystick: { ...DEFAULT_HUD_CONFIG.joystick, ...parsed.joystick },
        abilityDock: { ...DEFAULT_HUD_CONFIG.abilityDock, ...parsed.abilityDock },
        dodgeButton: { ...DEFAULT_HUD_CONFIG.dodgeButton, ...parsed.dodgeButton },
        directives: { ...DEFAULT_HUD_CONFIG.directives, ...parsed.directives },
        minimap: { ...DEFAULT_HUD_CONFIG.minimap, ...parsed.minimap },
      };
    }
  } catch {
    // ignore parse error and fallback
  }
  return DEFAULT_HUD_CONFIG;
}

export function saveHUDConfig(config: HUDControlConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save HUD configuration:', err);
  }
}
