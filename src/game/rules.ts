import {
  Ability,
  Faction,
  HeroClass,
  PlayerCharacter,
  PlayerStats,
  UpgradeOption,
  WarState,
  ShopItem,
  CampQuest,
} from './types';

export const BASE_XP_REQ = 100;
export const XP_SCALING_FACTOR = 1.45;
export const MAX_LEVEL = 20;

export function getXpRequiredForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(BASE_XP_REQ * Math.pow(XP_SCALING_FACTOR, level - 1));
}

export function createInitialCharacter(
  name: string,
  faction: Faction,
  heroClass: HeroClass
): PlayerCharacter {
  const cleanName = name.trim() || (faction === 'DEVAS' ? 'Arjuna' : 'Karan');

  let baseStats: PlayerStats;
  let title = '';

  if (faction === 'DEVAS') {
    switch (heroClass) {
      case 'VAJRA_WARRIOR':
        title = 'Bearer of Indra’s Thunder';
        baseStats = {
          hp: 220,
          maxHp: 220,
          energy: 100,
          maxEnergy: 100,
          atk: 36,
          def: 18,
          speed: 180,
          critChance: 0.15,
          critMultiplier: 1.8,
        };
        break;
      case 'SURYA_ARCHER':
        title = 'Solar Disciple of the Sun';
        baseStats = {
          hp: 170,
          maxHp: 170,
          energy: 120,
          maxEnergy: 120,
          atk: 42,
          def: 12,
          speed: 210,
          critChance: 0.25,
          critMultiplier: 2.0,
        };
        break;
      case 'RUDRA_VANGUARD':
      default:
        title = 'Fierce Vanguard of Mahakaal';
        baseStats = {
          hp: 250,
          maxHp: 250,
          energy: 90,
          maxEnergy: 90,
          atk: 38,
          def: 22,
          speed: 170,
          critChance: 0.12,
          critMultiplier: 1.7,
        };
        break;
    }
  } else {
    // ASURAS
    switch (heroClass) {
      case 'MAHISHA_BERSERKER':
        title = 'Dread Horn of the Nether Realm';
        baseStats = {
          hp: 260,
          maxHp: 260,
          energy: 90,
          maxEnergy: 90,
          atk: 40,
          def: 20,
          speed: 175,
          critChance: 0.14,
          critMultiplier: 1.75,
        };
        break;
      case 'RAVANA_SORCERER':
        title = 'Ten-Headed Lord of Dark Maya';
        baseStats = {
          hp: 165,
          maxHp: 165,
          energy: 130,
          maxEnergy: 130,
          atk: 44,
          def: 11,
          speed: 200,
          critChance: 0.22,
          critMultiplier: 2.1,
        };
        break;
      case 'TARAKA_TITAN':
      default:
        title = 'Indestructible Daitya Behemoth';
        baseStats = {
          hp: 290,
          maxHp: 290,
          energy: 80,
          maxEnergy: 80,
          atk: 35,
          def: 25,
          speed: 160,
          critChance: 0.1,
          critMultiplier: 1.6,
        };
        break;
    }
  }

  const abilities = getAbilitiesForClass(faction, heroClass);

  return {
    name: cleanName,
    faction,
    heroClass,
    title,
    level: 1,
    xp: 0,
    xpNext: getXpRequiredForLevel(1),
    stats: baseStats,
    kills: 0,
    killStreak: 0,
    highestStreak: 0,
    merits: 80,
    equippedWeapon: faction === 'DEVAS' ? 'Khadga Divine Blade' : 'Asura Cleaver',
    activeBuffs: [],
    abilities,
    upgradesCount: {},
  };
}

export function getAbilitiesForClass(faction: Faction, heroClass: HeroClass): Ability[] {
  if (faction === 'DEVAS') {
    return [
      {
        id: 'deva_1',
        name: 'Vajra Lightning Chain',
        sanskritName: 'Vajrastra (वज्रास्त्र)',
        keyHint: '1',
        description: 'Summons Indra’s divine lightning that arcs between up to 4 demonic enemies, frying them with holy voltage.',
        cooldown: 4.5,
        currentCooldown: 0,
        energyCost: 25,
        damageMultiplier: 2.2,
        radius: 180,
        type: 'CHAIN_LIGHTNING',
        unlockedAtLevel: 1, // Available from start!
        iconSvgPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
        accentColor: '#38bdf8',
      },
      {
        id: 'deva_2',
        name: 'Surya Sunburst Beam',
        sanskritName: 'Suryastra (सूर्यास्त्र)',
        keyHint: '2',
        description: 'Focuses incandescent solar brilliance into a piercing laser beam that decimates all demons in its path.',
        cooldown: 6.0,
        currentCooldown: 0,
        energyCost: 35,
        damageMultiplier: 2.8,
        radius: 260,
        type: 'PROJECTILE',
        unlockedAtLevel: 2,
        iconSvgPath: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
        accentColor: '#fbbf24',
      },
      {
        id: 'deva_3',
        name: 'Sudarshana Orbiting Disc',
        sanskritName: 'Sudarshana Chakra (सुदर्शन चक्र)',
        keyHint: '3',
        description: 'Launches a whirling razor disc of cosmic fire that orbits around the hero for 5 seconds, slicing all nearby fiends.',
        cooldown: 10.0,
        currentCooldown: 0,
        energyCost: 45,
        damageMultiplier: 1.6,
        radius: 130,
        type: 'ORBITING_CHAKRA',
        unlockedAtLevel: 3,
        iconSvgPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 14a4 4 0 110-8 4 4 0 010 8z',
        accentColor: '#f97316',
      },
      {
        id: 'deva_4',
        name: 'Rudra Cosmic Pralaya',
        sanskritName: 'Rudra Pralaya (रुद्र प्रलय)',
        keyHint: '4',
        description: 'ULTIMATE: Unfurls the storm of Shiva’s third eye. A cataclysmic divine vortex pulls and obliterates enemy ranks.',
        cooldown: 18.0,
        currentCooldown: 0,
        energyCost: 65,
        damageMultiplier: 4.5,
        radius: 300,
        type: 'VORTEX',
        unlockedAtLevel: 4,
        iconSvgPath: 'M12 2v4m0 12v4m10-10h-4M6 12H2m15.07 7.07l-2.83-2.83M8.76 8.76L5.93 5.93m11.14 0l-2.83 2.83m-6.24 6.24l-2.83 2.83',
        accentColor: '#a855f7',
      },
    ];
  } else {
    // ASURAS
    return [
      {
        id: 'asura_1',
        name: 'Mayavi Blood Scythe',
        sanskritName: 'Raktastra (रक्तास्त्र)',
        keyHint: '1',
        description: 'Unleashes an arc of demonic blood-energy that cleaves through gods and restores health on contact.',
        cooldown: 4.5,
        currentCooldown: 0,
        energyCost: 25,
        damageMultiplier: 2.3,
        radius: 170,
        type: 'CLEAVE',
        unlockedAtLevel: 1, // Available from start!
        iconSvgPath: 'M4 4l16 16m-4-16l-8 8 2 2 8-8z',
        accentColor: '#f43f5e',
      },
      {
        id: 'asura_2',
        name: 'Rakshasa Hellfire Stomp',
        sanskritName: 'Agni Pralaya (अग्नि पाताल)',
        keyHint: '2',
        description: 'Slams the scorched earth, sending forth fissures of Nether magma that erupt under celestial ranks.',
        cooldown: 6.5,
        currentCooldown: 0,
        energyCost: 35,
        damageMultiplier: 2.7,
        radius: 220,
        type: 'HELLFIRE_STOMP',
        unlockedAtLevel: 2,
        iconSvgPath: 'M12 2c-3 4-7 8-7 13a7 7 0 0014 0c0-5-4-9-7-13z',
        accentColor: '#ea580c',
      },
      {
        id: 'asura_3',
        name: 'Chandrahas Void Volley',
        sanskritName: 'Chandrahas (चन्द्रहास खड्ग)',
        keyHint: '3',
        description: 'Ravana’s cursed moon-blades rain from the dark sky, piercing armor and executing weakened foes.',
        cooldown: 9.0,
        currentCooldown: 0,
        energyCost: 45,
        damageMultiplier: 3.2,
        radius: 240,
        type: 'AOE_BURST',
        unlockedAtLevel: 3,
        iconSvgPath: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
        accentColor: '#c084fc',
      },
      {
        id: 'asura_4',
        name: 'Asura-Tandava Wrath',
        sanskritName: 'Asura Tandava (असुर ताण्डव)',
        keyHint: '4',
        description: 'ULTIMATE: Awakens primordial titan rage. Hero gains +60% attack speed, massive fiery aura, and unstoppable immunity for 7s.',
        cooldown: 20.0,
        currentCooldown: 0,
        energyCost: 60,
        damageMultiplier: 1.5,
        radius: 200,
        type: 'DEMON_WRATH',
        unlockedAtLevel: 4,
        iconSvgPath: 'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
        accentColor: '#e11d48',
      },
    ];
  }
}

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  isCrit: boolean = false,
  critMultiplier: number = 1.5,
  skillMultiplier: number = 1.0
): { damage: number; isCrit: boolean } {
  // Defense mitigation formula: damage = atk * (100 / (100 + def * 1.5))
  const mitigationFactor = 100 / (100 + Math.max(0, defenderDef) * 1.4);
  let baseDamage = attackerAtk * skillMultiplier * mitigationFactor;
  // Variance +/- 8%
  const variance = 0.92 + Math.random() * 0.16;
  baseDamage = Math.max(5, baseDamage * variance);

  if (isCrit) {
    baseDamage *= critMultiplier;
  }

  return {
    damage: Math.round(baseDamage),
    isCrit,
  };
}

export function addExperience(
  char: PlayerCharacter,
  xpGained: number
): { leveledUp: boolean; levelsGained: number; updatedChar: PlayerCharacter } {
  let xp = char.xp + xpGained;
  let level = char.level;
  let xpNext = char.xpNext;
  let levelsGained = 0;

  while (level < MAX_LEVEL && xp >= xpNext) {
    xp -= xpNext;
    level++;
    levelsGained++;
    xpNext = getXpRequiredForLevel(level);
  }

  if (level >= MAX_LEVEL) {
    xp = 0;
  }

  const updatedChar: PlayerCharacter = {
    ...char,
    level,
    xp,
    xpNext,
  };

  // If leveled up, grant automatic stat bumps and unlock abilities
  if (levelsGained > 0) {
    const isDeva = char.faction === 'DEVAS';
    const hpBump = isDeva ? 25 * levelsGained : 30 * levelsGained;
    const atkBump = Math.round(5 * levelsGained);
    const defBump = Math.round(3 * levelsGained);
    const energyBump = 10 * levelsGained;

    updatedChar.stats = {
      ...char.stats,
      maxHp: char.stats.maxHp + hpBump,
      hp: Math.min(char.stats.maxHp + hpBump, char.stats.hp + hpBump),
      maxEnergy: char.stats.maxEnergy + energyBump,
      energy: char.stats.maxEnergy + energyBump,
      atk: char.stats.atk + atkBump,
      def: char.stats.def + defBump,
    };
  }

  return {
    leveledUp: levelsGained > 0,
    levelsGained,
    updatedChar,
  };
}

export function getAvailableUpgrades(char: PlayerCharacter): UpgradeOption[] {
  const isDeva = char.faction === 'DEVAS';

  const pool: UpgradeOption[] = [
    {
      id: 'divine_might',
      title: isDeva ? 'Brahmashira Might' : 'Krodha Bloodpower',
      sanskritSub: isDeva ? 'ब्रह्मशिर बल' : 'क्रोध रक्तबल',
      description: 'Increases Attack Power by +18% and Critical Damage by +15%.',
      iconName: 'Swords',
      apply: (c) => {
        c.stats.atk = Math.round(c.stats.atk * 1.18);
        c.stats.critMultiplier = Number((c.stats.critMultiplier + 0.15).toFixed(2));
      },
    },
    {
      id: 'amrita_vitality',
      title: isDeva ? 'Amrita Elixir of Immortality' : 'Daitya Asuric Flesh',
      sanskritSub: isDeva ? 'अमृत जीवन' : 'दैत्य काया',
      description: 'Increases Maximum Health by +65 and restores full health immediately.',
      iconName: 'Heart',
      apply: (c) => {
        c.stats.maxHp += 65;
        c.stats.hp = c.stats.maxHp;
        c.stats.def += 4;
      },
    },
    {
      id: 'vayu_speed',
      title: isDeva ? 'Vayu’s Astral Swiftness' : 'Maya Shadow Step',
      sanskritSub: isDeva ? 'वायु वेग' : 'माया चरण',
      description: 'Grants +25 Movement Speed and +8% Critical Strike Chance.',
      iconName: 'Zap',
      apply: (c) => {
        c.stats.speed += 25;
        c.stats.critChance = Math.min(0.75, c.stats.critChance + 0.08);
      },
    },
    {
      id: 'prana_channeling',
      title: isDeva ? 'Prana Divine Channeling' : 'Nether Abyss Font',
      sanskritSub: isDeva ? 'प्राण तेज' : 'पाताल स्रोत',
      description: 'Boosts Energy Pool by +30 and lowers all Astra cooldowns by 15%.',
      iconName: 'Flame',
      apply: (c) => {
        c.stats.maxEnergy += 30;
        c.stats.energy = c.stats.maxEnergy;
        c.abilities = c.abilities.map((a) => ({
          ...a,
          cooldown: Number((a.cooldown * 0.85).toFixed(1)),
        }));
      },
    },
    {
      id: 'kavacha_armor',
      title: isDeva ? 'Karna’s Celestial Kavacha' : 'Vajra-Skin Carapace',
      sanskritSub: isDeva ? 'दैवी कवच' : 'वज्र चर्म',
      description: 'Strengthens Defense by +12 and grants 10% damage reflection on attackers.',
      iconName: 'Shield',
      apply: (c) => {
        c.stats.def += 12;
      },
    },
  ];

  // Pick 3 distinct options
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

export function updateWarMomentum(
  state: WarState,
  killerFaction: Faction,
  killPoints: number = 5
): WarState {
  let devaMomentum = state.devaMomentum;
  let asuraMomentum = state.asuraMomentum;
  let devaKills = state.devaKills;
  let asuraKills = state.asuraKills;

  if (killerFaction === 'DEVAS') {
    devaMomentum = Math.min(state.targetMomentum, devaMomentum + killPoints);
    devaKills++;
  } else {
    asuraMomentum = Math.min(state.targetMomentum, asuraMomentum + killPoints);
    asuraKills++;
  }

  let battleStatus: WarState['battleStatus'] = 'PLAYING';
  if (devaMomentum >= state.targetMomentum) {
    battleStatus = 'DEVA_VICTORY';
  } else if (asuraMomentum >= state.targetMomentum) {
    battleStatus = 'ASURA_VICTORY';
  }

  return {
    ...state,
    devaMomentum,
    asuraMomentum,
    devaKills,
    asuraKills,
    battleStatus,
  };
}

export function getShopItems(faction: Faction): ShopItem[] {
  const isDeva = faction === 'DEVAS';

  return [
    // Elixirs
    {
      id: isDeva ? 'elixir_soma' : 'elixir_rakta',
      name: isDeva ? 'Soma of Immortality' : 'Rakta Blood Essence',
      sanskritName: isDeva ? 'सोमरस (Soma Rasa)' : 'रक्त रस (Rakta Rasa)',
      category: 'ELIXIR',
      cost: 60,
      description: isDeva
        ? 'Nectar churned from the ocean of milk. Restores HP to full and permanently increases Max HP by +50.'
        : 'Primordial demon draught distilled from volcanic underworld fury. Restores HP to full and raises Max HP by +50.',
      statBonus: '+50 Max HP & Full Heal',
      iconType: 'potion',
    },
    {
      id: isDeva ? 'elixir_amrita' : 'elixir_fury',
      name: isDeva ? 'Amrita Prana Dew' : 'Nether Fury Draught',
      sanskritName: isDeva ? 'अमृत प्राण (Amrita Prana)' : 'असुर क्रोध (Asura Krodha)',
      category: 'ELIXIR',
      cost: 50,
      description: isDeva
        ? 'Replenishes Prana immediately and expands your maximum energy reserve by +40.'
        : 'Ignites demonic bloodlust, refilling Fury and expanding maximum energy pool by +40.',
      statBonus: '+40 Max Energy & Full Refill',
      iconType: 'potion',
    },
    {
      id: isDeva ? 'elixir_kavacha' : 'elixir_carapace',
      name: isDeva ? 'Indra’s Kavacha Tincture' : 'Vajra-Horn Carapace Elixir',
      sanskritName: isDeva ? 'इन्द्र कवच (Indra Kavacha)' : 'असुर चर्म (Asura Charma)',
      category: 'ELIXIR',
      cost: 75,
      description: 'Hardens skin and spirit with ancient warding mantras, granting permanent +15 Defense.',
      statBonus: '+15 Permanent Defense',
      iconType: 'potion',
    },
    {
      id: isDeva ? 'elixir_vayu' : 'elixir_maruta',
      name: isDeva ? 'Vayu Tempest Elixir' : 'Maruta Shadow Draft',
      sanskritName: isDeva ? 'वायु गति (Vayu Gati)' : 'छाया वेग (Chhaya Vega)',
      category: 'ELIXIR',
      cost: 65,
      description: 'Infuses warrior limbs with wind spirits. Increases movement speed by +25 and Critical Chance by +8%.',
      statBonus: '+25 Speed & +8% Crit',
      iconType: 'potion',
    },

    // Weapons
    {
      id: isDeva ? 'weapon_sudarshan_blade' : 'weapon_chandrahas',
      name: isDeva ? 'Sudarshana Sacred Khadga' : 'Chandrahas Demon Scythe',
      sanskritName: isDeva ? 'सुदर्शन खड्ग' : 'चन्द्रहास खड्ग',
      category: 'WEAPON',
      cost: 160,
      description: isDeva
        ? 'A blessed celestial blade imbued with spinning solar fire. Unleashes sweeping holy slashes.'
        : 'The dread crescent blade bestowed by Lord Shiva. Tears through divine armor with ruthless fury.',
      statBonus: '+28 Attack & +15% Cleave Range',
      iconType: 'sword',
    },
    {
      id: isDeva ? 'weapon_pinaka_bow' : 'weapon_rahu_bow',
      name: isDeva ? 'Pinaka Celestial Recurve' : 'Rahu Abyssal Longbow',
      sanskritName: isDeva ? 'पिनाक धनुष' : 'राहु धनुष',
      category: 'WEAPON',
      cost: 180,
      description: isDeva
        ? 'Sacred bow firing blazing rays of light with high arrow velocity and armor pierce.'
        : 'Cursed night-bow forged in lunar eclipse shadow, piercing enemy ranks effortlessly.',
      statBonus: '+32 Attack & Pierce +2 Targets',
      iconType: 'bow',
    },
    {
      id: isDeva ? 'weapon_vajra_gada' : 'weapon_kaalagni_axe',
      name: isDeva ? 'Vajra Thunder Gada' : 'Kaalagni Nether War-Axe',
      sanskritName: isDeva ? 'वज्र गदा' : 'कालाग्नि कुठार',
      category: 'WEAPON',
      cost: 220,
      description: isDeva
        ? 'Massive electrified war mace that shatters the earth, delivering crushing holy shockwaves.'
        : 'Two-handed demon battle-axe forged in hellfire that crushes through defensive barriers.',
      statBonus: '+45 Attack & 25% Crushing Stun',
      iconType: 'axe',
    },

    // Divine Astras & Secret Skills
    {
      id: isDeva ? 'skill_brahmashira' : 'skill_cataclysm',
      name: isDeva ? 'Brahmashira Celestial Astra' : 'Mahishasura Nether Eruption',
      sanskritName: isDeva ? 'ब्रह्मशिरा अस्त्र' : 'महिषासुर प्रलय',
      category: 'SKILL',
      cost: 250,
      description: isDeva
        ? 'Unlocks a cataclysmic rain of 12 celestial meteor lightning strikes crashing upon all nearby enemy legions.'
        : 'Unleashes an underworld hellfire eruption, igniting the earth in demonic magma for 8 seconds.',
      statBonus: 'Unlocks Supreme 5th Astra',
      iconType: 'astra',
    },
    {
      id: isDeva ? 'skill_maya_doubles' : 'skill_shadow_clone',
      name: isDeva ? 'Maya Deva Mirror Manifestation' : 'Chhaya Shadow Doppelganger',
      sanskritName: isDeva ? 'माया देव रूप' : 'छाया प्रतिरूप',
      category: 'SKILL',
      cost: 200,
      description: isDeva
        ? 'Summons 2 celestial golden warrior illusions that march alongside you and fight enemy forces.'
        : 'Summons 2 blood-shadow berserkers that leap upon enemy champions and cleave them down.',
      statBonus: 'Summons 2 Allied Combat Clones',
      iconType: 'scroll',
    },
  ];
}

export function getInitialQuests(faction: Faction): CampQuest[] {
  const isDeva = faction === 'DEVAS';

  return [
    {
      id: 'quest_infantry',
      title: isDeva ? 'Purge the Nether Vanguard' : 'Crush the Golden Phalanx',
      sanskritTitle: isDeva ? 'दानव संहार' : 'देव दलन',
      description: isDeva
        ? 'Slay 12 demonic Danava infantry soldiers marching toward our sacred camp.'
        : 'Slay 12 celestial Gandharva infantry warriors standing in the way of our conquest.',
      objectiveType: 'KILL_SOLDIERS',
      currentProgress: 0,
      targetProgress: 12,
      rewardMerits: 90,
      rewardXp: 220,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_snipers',
      title: isDeva ? 'Silence Shadow Snipers' : 'Shatter Solar Archers',
      sanskritTitle: isDeva ? 'धनुर्धर वध' : 'सूर्य बाण भंजन',
      description: isDeva
        ? 'Eliminate 5 enemy archers or shadow mages harassing our frontlines.'
        : 'Eliminate 5 celestial longbowmen raining arrows upon our ranks.',
      objectiveType: 'KILL_ARCHERS',
      currentProgress: 0,
      targetProgress: 5,
      rewardMerits: 110,
      rewardXp: 280,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_shrine',
      title: 'Consecrate Power Shrine',
      sanskritTitle: 'शक्ति पीठ विजय',
      description: 'Capture and firmly hold any of the 3 sacred Shrines of Power along the central axis.',
      objectiveType: 'HOLD_SHRINE',
      currentProgress: 0,
      targetProgress: 1,
      rewardMerits: 140,
      rewardXp: 350,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_boss',
      title: isDeva ? 'Slay the Nether Overlord' : 'Fell the Airavata General',
      sanskritTitle: isDeva ? 'असुर सेनापति वध' : 'इन्द्र सेनापति वध',
      description: 'Defeat an enemy Supreme Boss Commander leading the enemy army.',
      objectiveType: 'KILL_BOSS',
      currentProgress: 0,
      targetProgress: 1,
      rewardMerits: 220,
      rewardXp: 600,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_momentum',
      title: 'Frontline Spearhead',
      sanskritTitle: 'रणभूमि विजय अभियान',
      description: 'Push your faction’s war momentum to 400 points through sustained battlefield pressure.',
      objectiveType: 'GAIN_MOMENTUM',
      currentProgress: 0,
      targetProgress: 400,
      rewardMerits: 150,
      rewardXp: 400,
      isCompleted: false,
      isClaimed: false,
    },
  ];
}

