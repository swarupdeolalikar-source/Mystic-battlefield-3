export type Faction = 'DEVAS' | 'ASURAS';

export type DevaClass = 'VAJRA_WARRIOR' | 'SURYA_ARCHER' | 'RUDRA_VANGUARD';
export type AsuraClass = 'MAHISHA_BERSERKER' | 'RAVANA_SORCERER' | 'TARAKA_TITAN';
export type HeroClass = DevaClass | AsuraClass;

export type AbilityType =
  | 'CLEAVE'
  | 'PROJECTILE'
  | 'CHAIN_LIGHTNING'
  | 'AOE_BURST'
  | 'ORBITING_CHAKRA'
  | 'VORTEX'
  | 'DEMON_WRATH'
  | 'HELLFIRE_STOMP';

export interface Ability {
  id: string;
  name: string;
  sanskritName: string;
  keyHint: string;
  description: string;
  cooldown: number; // in seconds
  currentCooldown: number;
  energyCost: number; // Prana or Fury
  damageMultiplier: number;
  radius: number;
  type: AbilityType;
  unlockedAtLevel: number;
  iconSvgPath: string;
  accentColor: string;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  energy: number; // Prana (Devas) or Fury (Asuras)
  maxEnergy: number;
  atk: number;
  def: number;
  speed: number;
  critChance: number;
  critMultiplier: number;
}

export interface PlayerCharacter {
  name: string;
  faction: Faction;
  heroClass: HeroClass;
  title: string;
  level: number;
  xp: number;
  xpNext: number;
  stats: PlayerStats;
  kills: number;
  killStreak: number;
  highestStreak: number;
  merits: number;
  equippedWeapon?: string;
  activeBuffs?: {
    id: string;
    name: string;
    duration: number;
    maxDuration: number;
    description: string;
  }[];
  abilities: Ability[];
  upgradesCount: Record<string, number>;
  buffActive?: {
    type: 'DEMON_WRATH' | 'RUDRA_SURGE';
    duration: number;
  };
}

export type UnitRole = 'SOLDIER' | 'ARCHER' | 'BRUTE' | 'MAGE' | 'WAR_BEAST' | 'HERO' | 'BOSS';

export type UnitActionState = 'IDLE' | 'MARCH' | 'WINDUP' | 'ATTACK' | 'HURT' | 'DEAD';

export interface BattlefieldUnit {
  id: string;
  faction: Faction;
  gender?: 'MALE' | 'FEMALE';
  role: UnitRole;
  name: string;
  isBoss?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // angle in radians
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  range: number;
  radius: number;
  attackCooldown: number;
  maxCooldown: number;
  windupTimer: number;
  maxWindup: number;
  state: UnitActionState;
  deadTimer: number;
  targetId: string | null;
  hitFlash: number;
  color: string;
  isPlayer?: boolean;
}

export interface Projectile {
  id: string;
  ownerFaction: Faction;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number;
  maxPierce: number;
  color: string;
  trailColor: string;
  life: number;
  maxLife: number;
  type: 'ARROW' | 'SURYA_RAY' | 'CHAKRA' | 'DARK_BOLT' | 'VOID_SCYTHE';
  angle: number;
}

export interface BattlefieldParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  alpha: number;
  shape?: 'CIRCLE' | 'SPARK' | 'EMBER' | 'BLOOD' | 'SHOCKWAVE' | 'DUST' | 'LIGHT_RAY';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  isCrit?: boolean;
}

export interface PowerShrine {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  controller: Faction | 'NEUTRAL';
  progress: number; // -100 (Full Asuras) to +100 (Full Devas)
}

export interface WarState {
  devaMomentum: number;
  asuraMomentum: number;
  targetMomentum: number;
  devaKills: number;
  asuraKills: number;
  elapsedSeconds: number;
  battleStatus: 'PLAYING' | 'DEVA_VICTORY' | 'ASURA_VICTORY';
}

export interface UpgradeOption {
  id: string;
  title: string;
  sanskritSub: string;
  description: string;
  iconName: string;
  apply: (char: PlayerCharacter) => void;
}

export type ShopItemCategory = 'ELIXIR' | 'WEAPON' | 'SKILL';

export interface ShopItem {
  id: string;
  name: string;
  sanskritName: string;
  category: ShopItemCategory;
  cost: number;
  description: string;
  statBonus: string;
  faction?: Faction; // undefined means available to both
  iconType: 'potion' | 'sword' | 'bow' | 'axe' | 'astra' | 'scroll';
}

export interface CampQuest {
  id: string;
  title: string;
  sanskritTitle: string;
  description: string;
  objectiveType: 'KILL_SOLDIERS' | 'KILL_ARCHERS' | 'KILL_BOSS' | 'HOLD_SHRINE' | 'GAIN_MOMENTUM';
  currentProgress: number;
  targetProgress: number;
  rewardMerits: number;
  rewardXp: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

