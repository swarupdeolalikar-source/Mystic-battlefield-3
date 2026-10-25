import {
  BattlefieldParticle,
  BattlefieldUnit,
  Faction,
  FloatingText,
  PlayerCharacter,
  PowerShrine,
  Projectile,
  WarState,
} from './types';
import { calculateDamage, updateWarMomentum } from './rules';
import { sound } from './audio';
import {
  BattlefieldEnvironment,
  generateBattlefieldEnvironment,
  renderRealisticBattlefield,
} from './battlefieldTerrain';
import {
  CameraPerspectiveMode,
  isSoftwareGl,
  ThreeSceneRenderer,
} from './threeSceneRenderer';

export interface EngineCallbacks {
  onPlayerUpdate: (char: PlayerCharacter) => void;
  onWarUpdate: (war: WarState) => void;
  onLevelUp: (newLevel: number) => void;
  onPlayerDeath: () => void;
  onEnemyKilled?: (unit: BattlefieldUnit, meritGained: number) => void;
  onShrineCaptured?: (shrine: PowerShrine) => void;
  onNearCampNPC?: (npc: 'SHOP' | 'QUEST' | null) => void;
}

export const WORLD_WIDTH = 2600;
export const WORLD_HEIGHT = 1800;

export interface TerrainRoute {
  id: string;
  name: string;
  points: [number, number][];
  width: number;
  color: string;
}

export const BATTLEFIELD_ROUTES: TerrainRoute[] = [
  // 1. North Route (Indra Pass)
  {
    id: 'route_north',
    name: 'North Indra Pass',
    points: [
      [200, 400],
      [750, 370],
      [1300, 400],
      [1850, 370],
      [2400, 400],
    ],
    width: 65,
    color: 'rgba(217, 119, 6, 0.25)',
  },
  // 2. Central Highway (Mahakaal Sacred Road)
  {
    id: 'route_center',
    name: 'Central Mahakaal Highway',
    points: [
      [180, 900],
      [700, 900],
      [1300, 900],
      [1900, 900],
      [2420, 900],
    ],
    width: 85,
    color: 'rgba(217, 119, 6, 0.32)',
  },
  // 3. South Canyon (Agni Nether Track)
  {
    id: 'route_south',
    name: 'South Agni Canyon',
    points: [
      [200, 1400],
      [750, 1430],
      [1300, 1400],
      [1850, 1430],
      [2400, 1400],
    ],
    width: 65,
    color: 'rgba(217, 119, 6, 0.25)',
  },
  // 4. Western Connecting Ridge (Deva Camp Arterial)
  {
    id: 'route_west_cross',
    name: 'Deva West Flank',
    points: [
      [450, 400],
      [450, 900],
      [450, 1400],
    ],
    width: 50,
    color: 'rgba(56, 189, 248, 0.22)',
  },
  // 5. Central Frontline Ridge
  {
    id: 'route_central_spine',
    name: 'Central Shrine Axis',
    points: [
      [1300, 400],
      [1300, 900],
      [1300, 1400],
    ],
    width: 55,
    color: 'rgba(234, 179, 8, 0.28)',
  },
  // 6. Eastern Nether Ramparts (Asura Camp Arterial)
  {
    id: 'route_east_cross',
    name: 'Asura East Flank',
    points: [
      [2150, 400],
      [2150, 900],
      [2150, 1400],
    ],
    width: 50,
    color: 'rgba(225, 29, 72, 0.22)',
  },
  // 7. Diagonal Skirmish Trails
  {
    id: 'route_diag_1',
    name: 'North-Center Flank',
    points: [
      [750, 370],
      [1300, 900],
      [1850, 1430],
    ],
    width: 38,
    color: 'rgba(148, 163, 184, 0.16)',
  },
  {
    id: 'route_diag_2',
    name: 'South-Center Flank',
    points: [
      [750, 1430],
      [1300, 900],
      [1850, 370],
    ],
    width: 38,
    color: 'rgba(148, 163, 184, 0.16)',
  },
];

export class BattlefieldEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public minimapCanvas: HTMLCanvasElement | null = null;
  private animId: number | null = null;
  private lastTime: number = 0;

  public player: PlayerCharacter;
  public units: BattlefieldUnit[] = [];
  public projectiles: Projectile[] = [];
  public particles: BattlefieldParticle[] = [];
  public floatingTexts: FloatingText[] = [];
  public shrines: PowerShrine[] = [];
  public warState: WarState;
  public environment: BattlefieldEnvironment;

  public cameraX: number = WORLD_WIDTH / 2;
  public cameraY: number = WORLD_HEIGHT / 2;
  public cameraShake: number = 0;

  // Input state
  public keys: Record<string, boolean> = {};
  public mouseWorldX: number = 0;
  public mouseWorldY: number = 0;
  public isMouseDown: boolean = false;
  public joystickVector = { x: 0, y: 0 };
  public playerWalkAnimDistance: number = 0;

  private callbacks: EngineCallbacks;
  private spawnTimer: number = 0;
  private bossSpawnTimer: number = 0;
  private hitstopTimer: number = 0;
  private nextUnitId: number = 1;
  private nextProjId: number = 1;
  private nextTextId: number = 1;
  private chakraAngle: number = 0;
  private dashCooldown: number = 0;
  private dashTimer: number = 0;
  private dashVx: number = 0;
  private dashVy: number = 0;
  private basicAttackCooldown: number = 0;
  private uiThrottleTimer: number = 0;
  public threeRenderer: ThreeSceneRenderer | null = null;
  private lastDt: number = 0.016;

  public setMinimapCanvas(canvas: HTMLCanvasElement | null) {
    this.minimapCanvas = canvas;
  }

  public setJoystickVector(vx: number, vy: number) {
    this.joystickVector.x = vx;
    this.joystickVector.y = vy;
  }

  public updateMouseScreen(screenX: number, screenY: number) {
    if (this.threeRenderer) {
      const worldPt = this.threeRenderer.screenToWorld(
        screenX,
        screenY,
        this.canvas.width,
        this.canvas.height
      );
      this.mouseWorldX = worldPt.x;
      this.mouseWorldY = worldPt.y;
    } else {
      this.mouseWorldX = screenX - this.canvas.width / 2 + this.cameraX;
      this.mouseWorldY = screenY - this.canvas.height / 2 + this.cameraY;
    }
  }

  public toggleCameraPerspective(): CameraPerspectiveMode {
    if (!this.threeRenderer) return 'SHOULDER';
    const nextMode = this.threeRenderer.toggleCameraMode();
    const p = this.getPlayerUnit();
    if (p) {
      this.addFloatingText(
        p.x,
        p.y - 45,
        nextMode === 'SHOULDER' ? '🎥 3D SHOULDER CAMERA' : '🎥 3D TACTICAL CAMERA',
        '#fde047',
        true
      );
    }
    return nextMode;
  }

  constructor(
    canvas: HTMLCanvasElement,
    initialPlayer: PlayerCharacter,
    callbacks: EngineCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = JSON.parse(JSON.stringify(initialPlayer));
    this.callbacks = callbacks;

    this.warState = {
      devaMomentum: 150,
      asuraMomentum: 150,
      targetMomentum: 1000,
      devaKills: 0,
      asuraKills: 0,
      elapsedSeconds: 0,
      battleStatus: 'PLAYING',
    };

    this.environment = generateBattlefieldEnvironment(WORLD_WIDTH, WORLD_HEIGHT);
    this.initBattlefield();
    this.initPlayerSpawn();

    if (this.canvas.parentElement) {
      try {
        this.threeRenderer = new ThreeSceneRenderer(
          this.canvas.parentElement,
          this.environment,
          this.player.faction
        );
        this.canvas.style.zIndex = '5';
      } catch (err) {
        console.warn('Fallback to 2D canvas renderer:', err);
        this.threeRenderer = null;
      }
    }
  }

  private initPlayerSpawn() {
    // Devas spawn on the West (golden camp), Asuras on East (nether fortress)
    if (this.player.faction === 'DEVAS') {
      this.cameraX = 450;
      this.cameraY = WORLD_HEIGHT / 2;
    } else {
      this.cameraX = WORLD_WIDTH - 450;
      this.cameraY = WORLD_HEIGHT / 2;
    }

    const playerUnit: BattlefieldUnit = {
      id: 'player',
      faction: this.player.faction,
      role: 'HERO',
      name: this.player.name,
      x: this.cameraX,
      y: this.cameraY,
      vx: 0,
      vy: 0,
      facing: this.player.faction === 'DEVAS' ? 0 : Math.PI,
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      atk: this.player.stats.atk,
      def: this.player.stats.def,
      speed: this.player.stats.speed,
      range: this.player.heroClass === 'SURYA_ARCHER' || this.player.heroClass === 'RAVANA_SORCERER' ? 220 : 65,
      radius: 20,
      attackCooldown: 0,
      maxCooldown: 0.5,
      windupTimer: 0,
      maxWindup: 0.1,
      state: 'IDLE',
      deadTimer: 0,
      targetId: null,
      hitFlash: 0,
      color: this.player.faction === 'DEVAS' ? '#38bdf8' : '#e11d48',
      isPlayer: true,
    };
    this.units.push(playerUnit);
  }

  private initBattlefield() {
    // 3 Shrines of Power along the central axis
    this.shrines = [
      {
        id: 'shrine_north',
        name: 'Indra’s Storm Pillar',
        x: WORLD_WIDTH / 2,
        y: 400,
        radius: 120,
        controller: 'NEUTRAL',
        progress: 0,
      },
      {
        id: 'shrine_center',
        name: 'Mahakaal Cosmic Alter',
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        radius: 140,
        controller: 'NEUTRAL',
        progress: 0,
      },
      {
        id: 'shrine_south',
        name: 'Agni’s Primordial Fire',
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT - 400,
        radius: 120,
        controller: 'NEUTRAL',
        progress: 0,
      },
    ];

    // Spawn initial army waves (approx 28 per side)
    for (let i = 0; i < 28; i++) {
      this.spawnArmyUnit('DEVAS');
      this.spawnArmyUnit('ASURAS');
    }

    // Spawn Initial Supreme Boss Commanders for both factions!
    this.spawnBossUnit('DEVAS');
    this.spawnBossUnit('ASURAS');
  }

  public spawnBossUnit(faction: Faction) {
    const isDeva = faction === 'DEVAS';
    const x = isDeva ? 500 : WORLD_WIDTH - 500;
    const y = WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 350;
    const name = isDeva ? 'Indra’s Airavata General' : 'Tarakasura’s Hellfire Overlord';
    const hp = 850;
    const atk = 48;
    const def = 26;
    const speed = 65;
    const range = 80;
    const radius = 28;

    const bossUnit: BattlefieldUnit = {
      id: `boss_${this.nextUnitId++}`,
      faction,
      role: 'BOSS',
      name,
      isBoss: true,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: isDeva ? 0 : Math.PI,
      hp,
      maxHp: hp,
      atk,
      def,
      speed,
      range,
      radius,
      attackCooldown: 1.0,
      maxCooldown: 1.4,
      windupTimer: 0,
      maxWindup: 0.3,
      state: 'MARCH',
      deadTimer: 0,
      targetId: null,
      hitFlash: 0,
      color: isDeva ? '#facc15' : '#b91c1c',
    };

    this.units.push(bossUnit);
    this.addFloatingText(x, y - 60, `👑 BOSS ENTERED: ${name}!`, isDeva ? '#fde047' : '#f43f5e', true);
  }

  public spawnArmyUnit(faction: Faction) {
    const isDeva = faction === 'DEVAS';
    const x = isDeva
      ? 200 + Math.random() * 400
      : WORLD_WIDTH - 200 - Math.random() * 400;
    const y = 200 + Math.random() * (WORLD_HEIGHT - 400);

    const gender: 'MALE' | 'FEMALE' = Math.random() < 0.5 ? 'MALE' : 'FEMALE';
    const roles: ('SOLDIER' | 'ARCHER' | 'BRUTE' | 'MAGE')[] = [
      'SOLDIER',
      'SOLDIER',
      'ARCHER',
      'BRUTE',
      'MAGE',
    ];
    const role = roles[Math.floor(Math.random() * roles.length)];

    let hp = 100;
    let atk = 14;
    let def = 6;
    let speed = 75;
    let range = 45;
    let radius = 13;
    let name = '';

    if (role === 'SOLDIER') {
      if (isDeva) {
        name = gender === 'MALE' ? 'Gandharva Warrior' : 'Apsara Spearmaiden';
      } else {
        name = gender === 'MALE' ? 'Danava Cleaver' : 'Daitya Blademaiden';
      }
      hp = 110;
      atk = 16;
      def = 8;
      speed = 85;
      range = 42;
      radius = 14;
    } else if (role === 'ARCHER') {
      if (isDeva) {
        name = gender === 'MALE' ? 'Surya Sun-Archer' : 'Chandra Moon-Huntress';
      } else {
        name = gender === 'MALE' ? 'Rahu Night-Sniper' : 'Nirriti Shadow-Bow';
      }
      hp = 80;
      atk = 20;
      def = 4;
      speed = 90;
      range = 210;
      radius = 12;
    } else if (role === 'BRUTE') {
      if (isDeva) {
        name = gender === 'MALE' ? 'Rudra Mace Warden' : 'Devi Shield-Guardian';
      } else {
        name = gender === 'MALE' ? 'Rakshasa Blood Brute' : 'Diti Void-Crusher';
      }
      hp = 220;
      atk = 24;
      def = 14;
      speed = 60;
      range = 50;
      radius = 18;
    } else if (role === 'MAGE') {
      if (isDeva) {
        name = gender === 'MALE' ? 'Vedic Chanting Priest' : 'Ushas Dawn-Sorceress';
      } else {
        name = gender === 'MALE' ? 'Asuric Maya Warlock' : 'Kaali Blood-Sorceress';
      }
      hp = 75;
      atk = 26;
      def = 4;
      speed = 70;
      range = 190;
      radius = 12;
    }

    const unit: BattlefieldUnit = {
      id: `unit_${this.nextUnitId++}`,
      faction,
      gender,
      role,
      name,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: isDeva ? 0 : Math.PI,
      hp,
      maxHp: hp,
      atk,
      def,
      speed,
      range,
      radius,
      attackCooldown: Math.random() * 0.8,
      maxCooldown: role === 'ARCHER' || role === 'MAGE' ? 1.8 : 1.1,
      windupTimer: 0,
      maxWindup: 0.25,
      state: 'MARCH',
      deadTimer: 0,
      targetId: null,
      hitFlash: 0,
      color: isDeva ? '#38bdf8' : '#e11d48',
    };

    this.units.push(unit);
  }

  public start() {
    this.lastTime = performance.now();
    const afterDraw = (cb: () => void) => {
      if (!this.threeRenderer) {
        this.animId = window.setTimeout(cb, 80);
        return;
      }
      const gl = this.threeRenderer.renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        this.animId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.animId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.animId = window.setTimeout(cb, 80);
        }
      };
      this.animId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      const currentTime = performance.now();
      const rawDt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      const dt = Math.min(rawDt, 0.05);
      this.lastDt = dt;

      this.update(dt);
      this.render();

      if (isSoftwareGl && this.threeRenderer) {
        afterDraw(tick);
      } else {
        this.animId = requestAnimationFrame(tick);
      }
    };
    this.animId = requestAnimationFrame(tick);
  }

  public stop() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      clearTimeout(this.animId);
      this.animId = null;
    }
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      this.threeRenderer = null;
    }
  }

  public update(dt: number) {
    if (this.warState.battleStatus !== 'PLAYING') {
      return;
    }

    // Hitstop freeze frame handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.warState.elapsedSeconds += dt;
    this.spawnTimer += dt;
    // Spawn reinforcements dynamically to keep frontlines raging
    if (this.spawnTimer > 1.8 && this.units.length < 75) {
      this.spawnTimer = 0;
      this.spawnArmyUnit('DEVAS');
      this.spawnArmyUnit('ASURAS');
    }

    // Periodic Boss Commander reinforcements
    this.bossSpawnTimer += dt;
    if (this.bossSpawnTimer > 40 && this.units.filter((u) => u.isBoss && u.state !== 'DEAD').length < 3) {
      this.bossSpawnTimer = 0;
      this.spawnBossUnit(Math.random() > 0.5 ? 'DEVAS' : 'ASURAS');
    }

    // Camera shake decay
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 25);
    }

    // Cooldown ticks
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.basicAttackCooldown > 0) this.basicAttackCooldown -= dt;

    // Ability cooldowns & energy regeneration
    this.player.abilities.forEach((ab) => {
      if (ab.currentCooldown > 0) {
        ab.currentCooldown = Math.max(0, ab.currentCooldown - dt);
      }
    });

    // Prana / Fury regen and subtle out-of-combat HP restoration
    const energyRegen = this.player.buffActive ? 28 : 16;
    this.player.stats.energy = Math.min(
      this.player.stats.maxEnergy,
      this.player.stats.energy + energyRegen * dt
    );

    // Passive champion vitality regeneration (5 HP/s)
    const pUnit = this.getPlayerUnit();
    if (pUnit && pUnit.state !== 'DEAD' && pUnit.hp < pUnit.maxHp) {
      pUnit.hp = Math.min(pUnit.maxHp, pUnit.hp + 6 * dt);
      this.player.stats.hp = pUnit.hp;
    }

    // Buff duration
    if (this.player.buffActive) {
      this.player.buffActive.duration -= dt;
      if (this.player.buffActive.duration <= 0) {
        delete this.player.buffActive;
      }
    }

    // Orbiting chakra angle
    this.chakraAngle += dt * 4.5;

    // Update Player Movement & Actions
    this.updatePlayer(dt);

    // Update AI Battlefield Units with player attack token limiter
    this.updateUnits(dt);

    // Update Projectiles
    this.updateProjectiles(dt);

    // Update Shrines & War Momentum
    this.updateShrines(dt);

    // Update Floating text and particles
    this.updateParticles(dt);

    // Smooth Camera Follow
    const playerUnit = this.getPlayerUnit();
    if (playerUnit) {
      const targetCamX = Math.max(
        this.canvas.width / 2,
        Math.min(WORLD_WIDTH - this.canvas.width / 2, playerUnit.x)
      );
      const targetCamY = Math.max(
        this.canvas.height / 2,
        Math.min(WORLD_HEIGHT - this.canvas.height / 2, playerUnit.y)
      );
      this.cameraX += (targetCamX - this.cameraX) * 0.12;
      this.cameraY += (targetCamY - this.cameraY) * 0.12;
    }

    // Throttle React UI State updates
    this.uiThrottleTimer += dt;
    if (this.uiThrottleTimer >= 0.15) {
      this.uiThrottleTimer = 0;
      this.callbacks.onPlayerUpdate(this.player);
      this.callbacks.onWarUpdate(this.warState);
    }
  }

  public revivePlayer() {
    let p = this.getPlayerUnit();
    const isDeva = this.player.faction === 'DEVAS';
    const spawnX = isDeva ? 400 : WORLD_WIDTH - 400;
    const spawnY = WORLD_HEIGHT / 2;

    this.player.stats.hp = this.player.stats.maxHp;
    this.player.stats.energy = this.player.stats.maxEnergy;

    if (!p) {
      p = {
        id: 'player',
        faction: this.player.faction,
        role: 'HERO',
        name: this.player.name,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        facing: isDeva ? 0 : Math.PI,
        hp: this.player.stats.hp,
        maxHp: this.player.stats.maxHp,
        atk: this.player.stats.atk,
        def: this.player.stats.def,
        speed: this.player.stats.speed,
        range: this.player.heroClass === 'SURYA_ARCHER' || this.player.heroClass === 'RAVANA_SORCERER' ? 220 : 70,
        radius: 22,
        attackCooldown: 0,
        maxCooldown: 0.4,
        windupTimer: 0,
        maxWindup: 0.1,
        state: 'IDLE',
        deadTimer: 0,
        targetId: null,
        hitFlash: 0,
        color: isDeva ? '#38bdf8' : '#e11d48',
        isPlayer: true,
      };
      this.units.push(p);
    } else {
      p.x = spawnX;
      p.y = spawnY;
      p.hp = this.player.stats.maxHp;
      p.state = 'IDLE';
      p.deadTimer = 0;
    }

    this.cameraX = spawnX;
    this.cameraY = spawnY;

    // Holy resurrection pillar particles
    for (let i = 0; i < 30; i++) {
      this.spawnParticle(
        spawnX + (Math.random() - 0.5) * 40,
        spawnY + (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 60,
        -100 - Math.random() * 100,
        isDeva ? '#facc15' : '#c084fc',
        8,
        0.7,
        'SPARK'
      );
    }

    this.addFloatingText(spawnX, spawnY - 50, 'CHAMPION RESURRECTED!', isDeva ? '#fde047' : '#f43f5e', true);
  }

  private getPlayerUnit(): BattlefieldUnit | undefined {
    return this.units.find((u) => u.isPlayer);
  }

  private updatePlayer(dt: number) {
    const p = this.getPlayerUnit();
    if (!p || p.state === 'DEAD') return;

    // Movement calculation combining keys and touch joystick - fully decoupled from attack states!
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    const joyMag = Math.hypot(this.joystickVector.x, this.joystickVector.y);
    if (joyMag > 0.05) {
      dx += this.joystickVector.x;
      dy += this.joystickVector.y;
    }

    // Aiming orientation: mouse targeting has highest precision for skills & basic attacks
    const mouseDist = Math.hypot(this.mouseWorldX - p.x, this.mouseWorldY - p.y);
    if (this.isMouseDown || mouseDist > 30) {
      p.facing = Math.atan2(this.mouseWorldY - p.y, this.mouseWorldX - p.x);
    } else if (joyMag > 0.05) {
      p.facing = Math.atan2(this.joystickVector.y, this.joystickVector.x);
    } else if (dx !== 0 || dy !== 0) {
      p.facing = Math.atan2(dy, dx);
    }

    // Dash state
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      p.x += this.dashVx * dt;
      p.y += this.dashVy * dt;
      this.playerWalkAnimDistance += 450 * dt;

      // Spawn dash trail particles
      this.spawnParticle(
        p.x + (Math.random() - 0.5) * 20,
        p.y + (Math.random() - 0.5) * 20,
        0,
        0,
        this.player.faction === 'DEVAS' ? '#38bdf8' : '#f43f5e',
        10,
        0.25,
        'SPARK'
      );
    } else {
      // Free simultaneous motion: player moves seamlessly even while swinging or casting!
      const inputLen = Math.hypot(dx, dy);
      if (inputLen > 0.05) {
        const scale = inputLen > 1 ? 1 / inputLen : 1;
        const normDx = dx * scale;
        const normDy = dy * scale;

        const buffSpeed = this.player.buffActive ? 1.35 : 1.0;
        const currentSpeed = this.player.stats.speed * buffSpeed;
        p.x += normDx * currentSpeed * dt;
        p.y += normDy * currentSpeed * dt;
        this.playerWalkAnimDistance += currentSpeed * dt;

        // Dynamic world dust particles based on terrain sector
        if (Math.random() < 0.22) {
          let dustColor = 'rgba(217, 119, 6, 0.4)'; // Center amber earth
          if (p.y < 600) {
            dustColor = 'rgba(224, 242, 254, 0.55)'; // Himalayan snow mist
          } else if (p.y > 1200) {
            dustColor = 'rgba(244, 63, 94, 0.45)'; // Volcanic ash
          }
          this.spawnParticle(
            p.x - normDx * 12 + (Math.random() - 0.5) * 10,
            p.y - normDy * 12 + (Math.random() - 0.5) * 10,
            -normDx * 15,
            -normDy * 15,
            dustColor,
            6 + Math.random() * 4,
            0.4,
            'DUST'
          );
        }
      }
    }

    // Clamp player to battlefield bounds
    p.x = Math.max(30, Math.min(WORLD_WIDTH - 30, p.x));
    p.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, p.y));

    // Sync player health from unit
    this.player.stats.hp = p.hp;

    // Check proximity to Allied Camp NPCs (Shop & Quest Master)
    const isDeva = this.player.faction === 'DEVAS';
    const shopNpcX = isDeva ? 250 : WORLD_WIDTH - 250;
    const shopNpcY = 820;
    const questNpcX = isDeva ? 250 : WORLD_WIDTH - 250;
    const questNpcY = 980;

    const distToShop = Math.hypot(p.x - shopNpcX, p.y - shopNpcY);
    const distToQuest = Math.hypot(p.x - questNpcX, p.y - questNpcY);

    let nearNpc: 'SHOP' | 'QUEST' | null = null;
    if (distToShop < 85) {
      nearNpc = 'SHOP';
    } else if (distToQuest < 85) {
      nearNpc = 'QUEST';
    }
    if (this.callbacks.onNearCampNPC) {
      this.callbacks.onNearCampNPC(nearNpc);
    }

    // Allied Camp Sanctuary Healing Aura (regenerates health while resting in base camp)
    const inDevaCamp = p.x < 500 && p.y > 450 && p.y < 1350;
    const inAsuraCamp = p.x > WORLD_WIDTH - 500 && p.y > 450 && p.y < 1350;
    const inAlliedCamp = (isDeva && inDevaCamp) || (!isDeva && inAsuraCamp);

    if (inAlliedCamp && p.hp < p.maxHp) {
      const healAmount = p.maxHp * 0.05 * dt;
      p.hp = Math.min(p.maxHp, p.hp + healAmount);
      this.player.stats.hp = p.hp;

      if (Math.random() < 0.15) {
        this.spawnParticle(
          p.x + (Math.random() - 0.5) * 30,
          p.y + (Math.random() - 0.5) * 30,
          0,
          -45,
          isDeva ? '#38bdf8' : '#f43f5e',
          5,
          0.4,
          'SPARK'
        );
      }
    }

    // Basic attack with Left Click (simultaneous with movement!)
    if (this.isMouseDown && this.basicAttackCooldown <= 0) {
      this.triggerBasicAttack(p);
    }

  }

  public recallToBase() {
    const p = this.getPlayerUnit();
    if (!p || p.state === 'DEAD') return;
    const isDeva = this.player.faction === 'DEVAS';
    const targetX = isDeva ? 250 : WORLD_WIDTH - 250;
    const targetY = WORLD_HEIGHT / 2;
    p.x = targetX;
    p.y = targetY;
    this.cameraX = targetX;
    this.cameraY = targetY;
    sound.playShankha(isDeva ? 440 : 220);
    this.addFloatingText(targetX, targetY - 40, 'RECALLED TO ALLIED CAMP!', isDeva ? '#38bdf8' : '#e11d48', true);
  }

  public triggerDash() {
    const p = this.getPlayerUnit();
    if (!p || p.state === 'DEAD' || this.dashCooldown > 0) return;

    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    let dirAngle = p.facing;
    if (dx !== 0 || dy !== 0) {
      dirAngle = Math.atan2(dy, dx);
    }

    const dashSpeed = 520;
    this.dashVx = Math.cos(dirAngle) * dashSpeed;
    this.dashVy = Math.sin(dirAngle) * dashSpeed;
    this.dashTimer = 0.22;
    this.dashCooldown = 1.1;

    sound.playSwordClash();
    this.addFloatingText(p.x, p.y - 20, 'DODGE!', '#38bdf8', false);
  }

  public triggerBasicAttack(p: BattlefieldUnit) {
    const isDeva = p.faction === 'DEVAS';
    this.basicAttackCooldown = isDeva && this.player.heroClass === 'SURYA_ARCHER' ? 0.38 : 0.32;
    if (this.player.buffActive) {
      this.basicAttackCooldown *= 0.65;
    }

    this.threeRenderer?.triggerPlayerAttackSwing();

    // Dynamic physical combat sounds & vocal grunts
    sound.playRealisticSwordClash();
    sound.playAttackGrunt(isDeva);

    // Ranged class basic attack
    if (this.player.heroClass === 'SURYA_ARCHER' || this.player.heroClass === 'RAVANA_SORCERER') {
      const angle = p.facing + (Math.random() - 0.5) * 0.08;
      const projSpeed = 480;

      // Muzzle flash shockwave
      this.spawnParticle(
        p.x + Math.cos(p.facing) * 22,
        p.y + Math.sin(p.facing) * 22,
        0,
        0,
        isDeva ? '#fde047' : '#c084fc',
        18,
        0.18,
        'SHOCKWAVE'
      );

      this.projectiles.push({
        id: `proj_${this.nextProjId++}`,
        ownerFaction: p.faction,
        ownerId: p.id,
        x: p.x + Math.cos(p.facing) * 20,
        y: p.y + Math.sin(p.facing) * 20,
        vx: Math.cos(angle) * projSpeed,
        vy: Math.sin(angle) * projSpeed,
        radius: 6,
        damage: this.player.stats.atk,
        pierce: 0,
        maxPierce: 1,
        color: isDeva ? '#facc15' : '#c084fc',
        trailColor: isDeva ? '#fef08a' : '#a855f7',
        life: 0,
        maxLife: 1.2,
        type: isDeva ? 'SURYA_RAY' : 'DARK_BOLT',
        angle,
      });
      return;
    }

    // Melee swing in arc with shockwave blade wave
    const swingRange = 78;
    const swingArc = Math.PI * 0.7;
    let hitAny = false;

    // Swing shockwave arc
    this.spawnParticle(
      p.x + Math.cos(p.facing) * 35,
      p.y + Math.sin(p.facing) * 35,
      Math.cos(p.facing) * 40,
      Math.sin(p.facing) * 40,
      isDeva ? '#38bdf8' : '#f43f5e',
      28,
      0.22,
      'SHOCKWAVE'
    );

    for (const enemy of this.units) {
      if (enemy.faction === p.faction || enemy.state === 'DEAD') continue;
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist <= swingRange + enemy.radius) {
        const angleToEnemy = Math.atan2(enemy.y - p.y, enemy.x - p.x);
        let diff = Math.abs(angleToEnemy - p.facing);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;

        if (diff <= swingArc / 2) {
          hitAny = true;
          this.applyDamage(p, enemy, 1.0);
        }
      }
    }

    // Volumetric slash particle ribbon
    for (let a = -swingArc / 2; a <= swingArc / 2; a += 0.15) {
      const arcAngle = p.facing + a;
      this.spawnParticle(
        p.x + Math.cos(arcAngle) * 50,
        p.y + Math.sin(arcAngle) * 50,
        Math.cos(arcAngle) * 70,
        Math.sin(arcAngle) * 70,
        isDeva ? '#67e8f9' : '#fb7185',
        7,
        0.24,
        'SPARK'
      );
    }

    if (hitAny) {
      this.cameraShake = Math.min(10, this.cameraShake + 3.5);
    }
  }

  // Triggering abilities 1 to 4
  public triggerAbility(slotIndex: number) {
    const ab = this.player.abilities[slotIndex];
    if (!ab) return;
    this.threeRenderer?.triggerPlayerAttackSwing();

    if (this.player.level < ab.unlockedAtLevel) {
      this.addFloatingText(this.cameraX, this.cameraY - 40, `Unlocks at Lv. ${ab.unlockedAtLevel}!`, '#f87171', false);
      return;
    }

    if (ab.currentCooldown > 0) {
      return;
    }

    if (this.player.stats.energy < ab.energyCost) {
      this.addFloatingText(this.cameraX, this.cameraY - 40, 'Not enough Prana/Fury!', '#f87171', false);
      return;
    }

    const p = this.getPlayerUnit();
    if (!p || p.state === 'DEAD') return;

    // Consume Energy & start cooldown
    this.player.stats.energy -= ab.energyCost;
    ab.currentCooldown = ab.cooldown;

    // Execute ability behavior
    switch (ab.type) {
      case 'CHAIN_LIGHTNING': {
        sound.playLightning();
        this.cameraShake = 12;
        this.hitstopTimer = 0.05;

        // Find up to 5 nearby demons
        const enemies = this.getEnemiesInRange(p.x, p.y, ab.radius, p.faction);
        let lastX = p.x;
        let lastY = p.y;
        enemies.slice(0, 5).forEach((target) => {
          this.applyDamage(p, target, ab.damageMultiplier, true);
          // Visual lightning arc particles
          this.spawnLightningVisual(lastX, lastY, target.x, target.y);
          lastX = target.x;
          lastY = target.y;
        });
        break;
      }
      case 'PROJECTILE': {
        // Piercing Surya solar laser
        sound.playShankha(440);
        this.cameraShake = 10;
        const angle = p.facing;
        const beamSpeed = 650;
        this.projectiles.push({
          id: `proj_${this.nextProjId++}`,
          ownerFaction: p.faction,
          ownerId: p.id,
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * beamSpeed,
          vy: Math.sin(angle) * beamSpeed,
          radius: 18,
          damage: this.player.stats.atk * ab.damageMultiplier,
          pierce: 0,
          maxPierce: 8,
          color: '#fbbf24',
          trailColor: '#f59e0b',
          life: 0,
          maxLife: 1.5,
          type: 'SURYA_RAY',
          angle,
        });
        break;
      }
      case 'ORBITING_CHAKRA': {
        // Sudarshana Chakra
        sound.playShankha(330);
        this.cameraShake = 14;
        this.addFloatingText(p.x, p.y - 45, 'SUDARSHANA CHAKRA!', '#f97316', true);
        // Spawn 2 whirling razor chakra projectiles orbiting
        for (let i = 0; i < 2; i++) {
          const offsetAngle = (Math.PI * 2 * i) / 2;
          this.projectiles.push({
            id: `proj_${this.nextProjId++}`,
            ownerFaction: p.faction,
            ownerId: p.id,
            x: p.x,
            y: p.y,
            vx: 0,
            vy: 0,
            radius: 16,
            damage: this.player.stats.atk * ab.damageMultiplier,
            pierce: 0,
            maxPierce: 999,
            color: '#f97316',
            trailColor: '#facc15',
            life: 0,
            maxLife: 6.0,
            type: 'CHAKRA',
            angle: offsetAngle,
          });
        }
        break;
      }
      case 'VORTEX': {
        // Shiva's Rudra-Pralaya
        sound.playLightning();
        sound.playShankha(180);
        this.cameraShake = 22;
        this.hitstopTimer = 0.08;
        this.addFloatingText(p.x, p.y - 50, 'RUDRA PRALAYA!', '#c084fc', true);

        // Heavy AOE damage and suction
        const enemies = this.getEnemiesInRange(this.mouseWorldX, this.mouseWorldY, ab.radius, p.faction);
        enemies.forEach((enemy) => {
          // Pull toward vortex center
          const angleToCenter = Math.atan2(this.mouseWorldY - enemy.y, this.mouseWorldX - enemy.x);
          enemy.x += Math.cos(angleToCenter) * 120;
          enemy.y += Math.sin(angleToCenter) * 120;
          this.applyDamage(p, enemy, ab.damageMultiplier, true);
        });

        // Massive vortex particle storm
        for (let i = 0; i < 40; i++) {
          const theta = Math.random() * Math.PI * 2;
          const r = Math.random() * ab.radius;
          this.spawnParticle(
            this.mouseWorldX + Math.cos(theta) * r,
            this.mouseWorldY + Math.sin(theta) * r,
            -Math.sin(theta) * 100,
            Math.cos(theta) * 100,
            '#a855f7',
            8,
            0.6,
            'EMBER'
          );
        }
        break;
      }
      case 'CLEAVE': {
        // Asura Mayavi Blood Scythe
        sound.playSwordClash();
        this.cameraShake = 12;
        const enemies = this.getEnemiesInRange(p.x, p.y, ab.radius, p.faction);
        let totalDamageDealt = 0;
        enemies.forEach((enemy) => {
          const dmg = this.applyDamage(p, enemy, ab.damageMultiplier, true);
          totalDamageDealt += dmg;
        });
        // Lifesteal 18% of damage
        const heal = Math.min(45, Math.round(totalDamageDealt * 0.18));
        if (heal > 0) {
          p.hp = Math.min(p.maxHp, p.hp + heal);
          this.player.stats.hp = p.hp;
          this.addFloatingText(p.x, p.y - 30, `+${heal} LIFESTEAL`, '#4ade80', false);
        }
        break;
      }
      case 'HELLFIRE_STOMP': {
        // Rakshasa Hellfire Stomp
        sound.playDemonRoar();
        this.cameraShake = 18;
        this.hitstopTimer = 0.06;
        this.addFloatingText(p.x, p.y - 45, 'NETHER HELLFIRE!', '#ea580c', true);
        const enemies = this.getEnemiesInRange(p.x, p.y, ab.radius, p.faction);
        enemies.forEach((enemy) => {
          this.applyDamage(p, enemy, ab.damageMultiplier, true);
          enemy.vx += (enemy.x - p.x) * 1.5;
          enemy.vy += (enemy.y - p.y) * 1.5;
        });
        for (let i = 0; i < 35; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * ab.radius;
          this.spawnParticle(
            p.x + Math.cos(angle) * dist,
            p.y + Math.sin(angle) * dist,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 80,
            '#ea580c',
            10,
            0.5,
            'EMBER'
          );
        }
        break;
      }
      case 'AOE_BURST': {
        // Chandrahas Void Blades
        sound.playDemonRoar();
        this.cameraShake = 16;
        this.addFloatingText(p.x, p.y - 45, 'CHANDRAHAS VOID!', '#c084fc', true);
        // Rain blades around target area
        for (let i = 0; i < 6; i++) {
          const offX = (Math.random() - 0.5) * ab.radius;
          const offY = (Math.random() - 0.5) * ab.radius;
          this.projectiles.push({
            id: `proj_${this.nextProjId++}`,
            ownerFaction: p.faction,
            ownerId: p.id,
            x: this.mouseWorldX + offX,
            y: this.mouseWorldY + offY - 200,
            vx: 0,
            vy: 600,
            radius: 12,
            damage: this.player.stats.atk * ab.damageMultiplier * 0.45,
            pierce: 0,
            maxPierce: 3,
            color: '#c084fc',
            trailColor: '#7e22ce',
            life: 0,
            maxLife: 0.6,
            type: 'VOID_SCYTHE',
            angle: Math.PI / 2,
          });
        }
        break;
      }
      case 'DEMON_WRATH': {
        // Asura-Tandava Wrath Ultimate
        sound.playDemonRoar();
        this.cameraShake = 24;
        this.hitstopTimer = 0.08;
        this.player.buffActive = {
          type: 'DEMON_WRATH',
          duration: 7.0,
        };
        this.addFloatingText(p.x, p.y - 50, 'ASURA TANDAVA WRATH!', '#e11d48', true);
        break;
      }
    }
  }

  private getEnemiesInRange(
    x: number,
    y: number,
    range: number,
    myFaction: Faction
  ): BattlefieldUnit[] {
    return this.units.filter(
      (u) =>
        u.faction !== myFaction &&
        u.state !== 'DEAD' &&
        Math.hypot(u.x - x, u.y - y) <= range + u.radius
    );
  }

  private applyDamage(
    attacker: BattlefieldUnit,
    target: BattlefieldUnit,
    multiplier: number = 1.0,
    forceCrit: boolean = false
  ): number {
    const isPlayerAttacker = attacker.isPlayer;
    let isCrit = forceCrit;
    let critMult = 1.5;

    if (isPlayerAttacker) {
      if (!isCrit && Math.random() < this.player.stats.critChance) {
        isCrit = true;
      }
      critMult = this.player.stats.critMultiplier;
    }

    const { damage, isCrit: finalCrit } = calculateDamage(
      attacker.atk,
      target.def,
      isCrit,
      critMult,
      multiplier
    );

    target.hp -= damage;
    target.hitFlash = 0.12;

    // Floating combat text
    const textColor = isPlayerAttacker
      ? finalCrit
        ? '#fbbf24'
        : '#ffffff'
      : '#f87171';
    this.addFloatingText(
      target.x + (Math.random() - 0.5) * 20,
      target.y - 25,
      `${damage}${finalCrit ? '!' : ''}`,
      textColor,
      finalCrit
    );

    // Blood / Spark burst
    const particleColor = target.faction === 'DEVAS' ? '#67e8f9' : '#e11d48';
    for (let i = 0; i < (finalCrit ? 8 : 4); i++) {
      this.spawnParticle(
        target.x,
        target.y,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        particleColor,
        5,
        0.3,
        'BLOOD'
      );
    }

    if (target.hp <= 0 && target.state !== 'DEAD') {
      this.handleUnitDeath(target, attacker);
    }

    return damage;
  }

  private handleUnitDeath(victim: BattlefieldUnit, killer: BattlefieldUnit) {
    victim.state = 'DEAD';
    victim.deadTimer = 0.6; // dissolve animation duration

    // Sound and war state updates
    if (victim.isPlayer) {
      sound.playHurt();
      this.callbacks.onPlayerDeath();
      return;
    }

    // Enemy defeat sound
    if (victim.faction === 'ASURAS') {
      sound.playDemonRoar();
    } else {
      sound.playHurtGrunt(true);
    }
    sound.playWarDrum(0.8);

    // Update war momentum
    const killPoints = victim.role === 'BRUTE' ? 12 : victim.role === 'MAGE' ? 8 : 5;
    this.warState = updateWarMomentum(this.warState, killer.faction, killPoints);

    // Player kill rewards & dynamic kill announcements
    if (killer.isPlayer) {
      this.player.kills++;
      this.player.killStreak++;
      if (this.player.killStreak > this.player.highestStreak) {
        this.player.highestStreak = this.player.killStreak;
      }

      // Play dynamic kill sound sting with drum accent
      sound.playKillSting(this.player.killStreak);

      // Multi-kill & streak announcements
      if (this.player.kills === 1) {
        this.addFloatingText(killer.x, killer.y - 65, 'FIRST BLOOD!', '#ef4444', true);
      } else if (this.player.killStreak === 2) {
        this.addFloatingText(killer.x, killer.y - 65, 'DOUBLE KILL!', '#f59e0b', true);
      } else if (this.player.killStreak === 3) {
        this.addFloatingText(killer.x, killer.y - 65, 'TRIPLE KILL!', '#38bdf8', true);
      } else if (this.player.killStreak === 4) {
        this.addFloatingText(killer.x, killer.y - 65, 'DIVINE RAMPAGE!', '#ec4899', true);
      } else if (this.player.killStreak % 5 === 0) {
        const streakTitle =
          this.player.faction === 'DEVAS'
            ? `DIVINE STREAK x${this.player.killStreak}!`
            : `DEMONIC RAMPAGE x${this.player.killStreak}!`;
        this.addFloatingText(killer.x, killer.y - 65, streakTitle, '#facc15', true);
      }


      // XP gained from kill
      const xpReward = victim.role === 'BRUTE' ? 45 : victim.role === 'MAGE' ? 30 : 20;
      this.gainExperience(xpReward);

      // Merits gained from kill
      let meritReward = 8;
      if (victim.isBoss) {
        meritReward = 150;
      } else if (victim.role === 'BRUTE') {
        meritReward = 18;
      } else if (victim.role === 'ARCHER' || victim.role === 'MAGE') {
        meritReward = 14;
      }
      this.player.merits = (this.player.merits || 0) + meritReward;
      this.addFloatingText(
        victim.x,
        victim.y - 40,
        `+${meritReward} 🪙 MERITS`,
        '#facc15',
        victim.isBoss
      );

      if (this.callbacks.onEnemyKilled) {
        this.callbacks.onEnemyKilled(victim, meritReward);
      }
    }
  }

  public gainExperience(amount: number) {
    this.player.xp += amount;
    this.addFloatingText(this.cameraX, this.cameraY + 30, `+${amount} XP`, '#38bdf8', false);

    while (this.player.xp >= this.player.xpNext && this.player.level < 20) {
      this.player.xp -= this.player.xpNext;
      this.player.level++;
      this.player.xpNext = Math.round(100 * Math.pow(1.45, this.player.level - 1));

      // Stat scaling on level up
      const isDeva = this.player.faction === 'DEVAS';
      this.player.stats.maxHp += isDeva ? 25 : 30;
      this.player.stats.hp = this.player.stats.maxHp;
      this.player.stats.maxEnergy += 10;
      this.player.stats.energy = this.player.stats.maxEnergy;
      this.player.stats.atk += 6;
      this.player.stats.def += 3;

      sound.playLevelUp();
      this.addFloatingText(this.cameraX, this.cameraY - 60, `LEVEL UP! REACHED LV. ${this.player.level}`, '#fde047', true);

      // Trigger level up modal callback for upgrade selection
      this.callbacks.onLevelUp(this.player.level);
    }
  }

  private updateUnits(dt: number) {
    const playerUnit = this.getPlayerUnit();
    let currentAttackingPlayerCount = 0;

    // Process all units
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];

      // Dead unit handling
      if (u.state === 'DEAD') {
        u.deadTimer -= dt;
        if (u.deadTimer <= 0) {
          this.units.splice(i, 1);
        }
        continue;
      }

      if (u.isPlayer) continue;

      // Hit flash decay
      if (u.hitFlash > 0) u.hitFlash -= dt;

      // Cooldown timer
      if (u.attackCooldown > 0) u.attackCooldown -= dt;

      // Find nearest enemy, limiting simultaneous attackers on player to 3
      let nearestDist = Infinity;
      let nearestTarget: BattlefieldUnit | null = null;

      for (const other of this.units) {
        if (other.faction === u.faction || other.state === 'DEAD') continue;
        if (other.isPlayer && currentAttackingPlayerCount >= 3) {
          // Player already has 3 active attackers, target nearby allied soldier instead
          continue;
        }

        const d = Math.hypot(other.x - u.x, other.y - u.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestTarget = other;
        }
      }

      if (nearestTarget) {
        if (nearestTarget.isPlayer) {
          currentAttackingPlayerCount++;
        }

        const angle = Math.atan2(nearestTarget.y - u.y, nearestTarget.x - u.x);
        u.facing = angle;

        // In attack range
        if (nearestDist <= u.range) {
          if (u.attackCooldown <= 0) {
            u.attackCooldown = u.maxCooldown;
            this.executeUnitAttack(u, nearestTarget);
          }
        } else {
          // Move toward enemy
          u.x += Math.cos(angle) * u.speed * dt;
          u.y += Math.sin(angle) * u.speed * dt;
        }
      } else {
        // March toward enemy baseline
        const marchTargetX = u.faction === 'DEVAS' ? WORLD_WIDTH - 200 : 200;
        const angle = Math.atan2(WORLD_HEIGHT / 2 - u.y, marchTargetX - u.x);
        u.facing = angle;
        u.x += Math.cos(angle) * u.speed * dt;
        u.y += Math.sin(angle) * u.speed * dt;
      }

      // Keep units inside bounds
      u.x = Math.max(20, Math.min(WORLD_WIDTH - 20, u.x));
      u.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, u.y));
    }
  }

  private executeUnitAttack(attacker: BattlefieldUnit, target: BattlefieldUnit) {
    if (attacker.role === 'ARCHER' || attacker.role === 'MAGE') {
      // Fire projectile
      const isDeva = attacker.faction === 'DEVAS';
      const angle = attacker.facing;
      this.projectiles.push({
        id: `proj_${this.nextProjId++}`,
        ownerFaction: attacker.faction,
        ownerId: attacker.id,
        x: attacker.x,
        y: attacker.y,
        vx: Math.cos(angle) * 360,
        vy: Math.sin(angle) * 360,
        radius: 5,
        damage: attacker.atk,
        pierce: 0,
        maxPierce: 1,
        color: isDeva ? '#67e8f9' : '#f43f5e',
        trailColor: isDeva ? '#38bdf8' : '#e11d48',
        life: 0,
        maxLife: 1.2,
        type: isDeva ? 'ARROW' : 'DARK_BOLT',
        angle,
      });
    } else {
      // Melee strike
      this.applyDamage(attacker, target, 1.0);
    }
  }

  private updateProjectiles(dt: number) {
    const playerUnit = this.getPlayerUnit();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;

      // Orbiting Chakra follows player in circle
      if (p.type === 'CHAKRA') {
        if (!playerUnit || playerUnit.state === 'DEAD' || p.life >= p.maxLife) {
          this.projectiles.splice(i, 1);
          continue;
        }
        const orbitRadius = 110;
        p.x = playerUnit.x + Math.cos(this.chakraAngle + p.angle) * orbitRadius;
        p.y = playerUnit.y + Math.sin(this.chakraAngle + p.angle) * orbitRadius;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // Check collisions with opposing units
      for (const target of this.units) {
        if (target.faction === p.ownerFaction || target.state === 'DEAD') continue;
        const dist = Math.hypot(target.x - p.x, target.y - p.y);
        if (dist <= p.radius + target.radius) {
          // Owner object for damage attribution
          const owner = this.units.find((u) => u.id === p.ownerId) || {
            id: p.ownerId,
            faction: p.ownerFaction,
            role: 'SOLDIER' as const,
            name: '',
            x: p.x,
            y: p.y,
            vx: 0,
            vy: 0,
            facing: 0,
            hp: 100,
            maxHp: 100,
            atk: p.damage,
            def: 0,
            speed: 0,
            range: 0,
            radius: 10,
            attackCooldown: 0,
            maxCooldown: 1,
            windupTimer: 0,
            maxWindup: 0,
            state: 'MARCH' as const,
            deadTimer: 0,
            targetId: null,
            hitFlash: 0,
            color: '',
            isPlayer: p.ownerId === 'player',
          };

          this.applyDamage(owner, target, 1.0);
          p.pierce++;
          if (p.pierce >= p.maxPierce) {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      if (p.life >= p.maxLife && p.type !== 'CHAKRA') {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateShrines(dt: number) {
    for (const shrine of this.shrines) {
      let devaCount = 0;
      let asuraCount = 0;

      for (const u of this.units) {
        if (u.state === 'DEAD') continue;
        if (Math.hypot(u.x - shrine.x, u.y - shrine.y) <= shrine.radius) {
          if (u.faction === 'DEVAS') devaCount++;
          else asuraCount++;
        }
      }

      const captureDelta = (devaCount - asuraCount) * 12 * dt;
      shrine.progress = Math.max(-100, Math.min(100, shrine.progress + captureDelta));

      if (shrine.progress >= 100) {
        if (shrine.controller !== 'DEVAS') {
          shrine.controller = 'DEVAS';
          this.addFloatingText(shrine.x, shrine.y - 60, `${shrine.name} CAPTURED BY DEVAS!`, '#38bdf8', true);
          if (this.player.faction === 'DEVAS') {
            this.player.merits = (this.player.merits || 0) + 50;
            this.addFloatingText(shrine.x, shrine.y - 90, '+50 🪙 SHRINE MERITS!', '#facc15', true);
            this.callbacks.onShrineCaptured?.(shrine);
          }
        }
        this.warState.devaMomentum = Math.min(
          this.warState.targetMomentum,
          this.warState.devaMomentum + 4 * dt
        );
      } else if (shrine.progress <= -100) {
        if (shrine.controller !== 'ASURAS') {
          shrine.controller = 'ASURAS';
          this.addFloatingText(shrine.x, shrine.y - 60, `${shrine.name} OVERRUN BY ASURAS!`, '#e11d48', true);
          if (this.player.faction === 'ASURAS') {
            this.player.merits = (this.player.merits || 0) + 50;
            this.addFloatingText(shrine.x, shrine.y - 90, '+50 🪙 SHRINE MERITS!', '#facc15', true);
            this.callbacks.onShrineCaptured?.(shrine);
          }
        }
        this.warState.asuraMomentum = Math.min(
          this.warState.targetMomentum,
          this.warState.asuraMomentum + 4 * dt
        );
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      if (pt.life >= pt.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y += ft.vy * dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    maxLife: number,
    shape: 'CIRCLE' | 'SPARK' | 'EMBER' | 'BLOOD' | 'SHOCKWAVE' | 'DUST' | 'LIGHT_RAY' = 'CIRCLE'
  ) {
    if (this.particles.length > 320) return; // limit count for peak 60fps performance
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      life: 0,
      maxLife,
      color,
      alpha: 1,
      shape,
    });
  }

  public addFloatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    isCrit: boolean = false
  ) {
    this.floatingTexts.push({
      id: `text_${this.nextTextId++}`,
      text,
      x,
      y,
      vy: -35,
      life: 0,
      maxLife: 0.85,
      color,
      isCrit,
    });
  }

  private spawnLightningVisual(x1: number, y1: number, x2: number, y2: number) {
    const steps = 10;
    let prevX = x1;
    let prevY = y1;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const jitter = (1 - Math.abs(t - 0.5) * 2) * 45;
      const curX = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
      const curY = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;

      // Primary lightning stroke core & glow
      this.spawnParticle(curX, curY, 0, 0, '#e0f2fe', 8, 0.28, 'SPARK');
      this.spawnParticle(curX, curY, 0, 0, '#38bdf8', 14, 0.22, 'CIRCLE');

      // Secondary branching arc fork
      if (Math.random() < 0.35 && i < steps - 1) {
        const branchX = curX + (Math.random() - 0.5) * 50;
        const branchY = curY + (Math.random() - 0.5) * 50;
        this.spawnParticle(branchX, branchY, 0, 0, '#67e8f9', 6, 0.2, 'SPARK');
      }

      prevX = curX;
      prevY = curY;
    }

    // Impact ground flash shockwave at destination
    this.spawnParticle(x2, y2, 0, 0, '#38bdf8', 32, 0.25, 'SHOCKWAVE');
  }

  // RENDER LOOP
  public render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    if (this.threeRenderer) {
      // 1. Render Full 3D Scene (Dual-Faction Sky Dome, 3D Clouds, 3D Terrain & Structures, 3D PBR Units)
      this.threeRenderer.updateAndRender(
        this.lastDt || 0.016,
        performance.now() / 1000,
        this.player,
        this.units,
        this.projectiles,
        this.particles,
        this.shrines,
        this.cameraShake,
        this.isMouseDown
      );

      // 2. Render Crisp 3D-Projected World Labels, Health Bars & Floating Combat Text on 2D Overlay
      this.render3DProjectedOverlays(ctx, cw, ch);
    } else {
      ctx.save();
      let shakeX = 0;
      let shakeY = 0;
      if (this.cameraShake > 0) {
        shakeX = (Math.random() - 0.5) * this.cameraShake;
        shakeY = (Math.random() - 0.5) * this.cameraShake;
      }

      ctx.translate(cw / 2 - this.cameraX + shakeX, ch / 2 - this.cameraY + shakeY);

      this.renderTerrain(ctx);
      this.renderShrines(ctx);
      this.renderProjectiles(ctx);
      this.renderUnits(ctx);
      this.renderParticles(ctx);
      this.renderFloatingText(ctx);

      ctx.restore();
    }

    // Render Real-Time Tactical Minimap onto HUD canvas if present
    if (this.minimapCanvas) {
      this.renderMinimap(this.minimapCanvas);
    }
  }

  private render3DProjectedOverlays(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    if (!this.threeRenderer) return;

    // A. Shrine Names & Capture Progress Bars
    for (const shrine of this.shrines) {
      const sy = this.threeRenderer.groundHeightAt(shrine.x, shrine.y) + 58;
      const proj = this.threeRenderer.projectToScreen(shrine.x, sy, shrine.y, cw, ch);
      if (!proj.visible) continue;

      ctx.save();
      ctx.font = 'bold 13px Cinzel';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(shrine.name, proj.x, proj.y - 12);

      const barW = 86;
      const barH = 5;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(proj.x - barW / 2, proj.y - 6, barW, barH);
      const normProgress = (shrine.progress + 100) / 200;
      ctx.fillStyle = normProgress > 0.5 ? '#38bdf8' : '#e11d48';
      ctx.fillRect(proj.x - barW / 2, proj.y - 6, barW * normProgress, barH);
      ctx.restore();
    }

    // B. Unit Health Bars & Boss Nameplates
    for (const u of this.units) {
      if (u.state === 'DEAD') continue;
      if (u.hp >= u.maxHp && !u.isBoss && !u.isPlayer) continue;

      const hOffset = u.isBoss ? 56 : u.isPlayer ? 42 : 30;
      const uy = this.threeRenderer.groundHeightAt(u.x, u.y) + hOffset;
      const proj = this.threeRenderer.projectToScreen(u.x, uy, u.y, cw, ch);
      if (!proj.visible) continue;

      const isDeva = u.faction === 'DEVAS';
      const barW = u.isBoss ? 72 : u.isPlayer ? 52 : 32;
      const barH = u.isBoss ? 6 : u.isPlayer ? 5 : 3.5;
      const hpPct = Math.max(0, u.hp / u.maxHp);

      ctx.save();
      if (u.isBoss) {
        ctx.font = 'bold 11px Cinzel';
        ctx.textAlign = 'center';
        ctx.fillStyle = isDeva ? '#fde047' : '#f43f5e';
        ctx.fillText(`👑 ${u.name}`, proj.x, proj.y - 8);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(proj.x - barW / 2, proj.y, barW, barH);
      ctx.fillStyle = hpPct > 0.4 ? (isDeva ? '#38bdf8' : '#e11d48') : '#ef4444';
      ctx.fillRect(proj.x - barW / 2, proj.y, barW * hpPct, barH);
      ctx.restore();
    }

    // C. Floating Combat Damage & Boon Texts
    for (const ft of this.floatingTexts) {
      const fy = this.threeRenderer.groundHeightAt(ft.x, ft.y) + 32 + (ft.maxLife - ft.life) * 28;
      const proj = this.threeRenderer.projectToScreen(ft.x, fy, ft.y, cw, ch);
      if (!proj.visible) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.font = ft.isCrit ? '900 18px Cinzel' : 'bold 15px Rajdhani';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, proj.x, proj.y);
      ctx.restore();
    }
  }

  private renderTerrain(ctx: CanvasRenderingContext2D) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const now = performance.now() / 1000;

    // 1. Render realistic mythological battlefield environment (Himalayan snow peaks, volcanic crags, trees, grass, boulders, craters)
    renderRealisticBattlefield(
      ctx,
      this.environment,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      this.cameraX,
      this.cameraY,
      cw,
      ch,
      now
    );

    // 2. Render Battlefield Terrain Tracks and Routes (Lanes and connecting highways)
    for (const route of BATTLEFIELD_ROUTES) {
      // Outer path trench / embankment
      ctx.beginPath();
      for (let i = 0; i < route.points.length; i++) {
        const [px, py] = route.points[i];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = route.width + 18;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Main Road Bed Pavement
      ctx.strokeStyle = route.color;
      ctx.lineWidth = route.width;
      ctx.stroke();

      // Centerline Sacred Cobblestones / Dashes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 16]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ancient Vedic & Asuric Grid Runes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 120;
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }

    // Faction-Specific Allied Forces Camps & Surrounding Environment
    this.renderFactionCamps(ctx);

    // World border rim
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, WORLD_WIDTH - 8, WORLD_HEIGHT - 8);
  }

  public renderMinimap(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mw = canvas.width;
    const mh = canvas.height;

    const sx = mw / WORLD_WIDTH;
    const sy = mh / WORLD_HEIGHT;

    ctx.clearRect(0, 0, mw, mh);

    // 1. Terrain Background & Faction Biomes
    const bgGrad = ctx.createLinearGradient(0, 0, mw, 0);
    bgGrad.addColorStop(0, '#142318'); // Devas West - Lush Foothills
    bgGrad.addColorStop(0.35, '#1b2f22');
    bgGrad.addColorStop(0.50, '#2d231b'); // Battle dirt pass
    bgGrad.addColorStop(0.65, '#281316');
    bgGrad.addColorStop(1, '#150608'); // Asuras East - Volcanic
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, mw, mh);

    // Mountain silhouettes on minimap top & bottom
    ctx.fillStyle = '#38bdf8';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(mw * 0.38, 0);
    ctx.lineTo(mw * 0.18, mh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, mh);
    ctx.lineTo(mw * 0.38, mh);
    ctx.lineTo(mw * 0.18, mh * 0.88);
    ctx.closePath();
    ctx.fill();

    // Volcanic crags east on minimap
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(mw * 0.62, 0);
    ctx.lineTo(mw, 0);
    ctx.lineTo(mw * 0.82, mh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mw * 0.62, mh);
    ctx.lineTo(mw, mh);
    ctx.lineTo(mw * 0.82, mh * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Green woodland tree groves on minimap
    ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
    for (let i = 0; i < this.environment.trees.length; i += 3) {
      const tr = this.environment.trees[i];
      if (tr.x < WORLD_WIDTH * 0.45) {
        ctx.fillRect(tr.x * sx - 1, tr.y * sy - 1, 2.5, 2.5);
      }
    }

    // 2. Terrain Tracks and Routes
    for (const route of BATTLEFIELD_ROUTES) {
      ctx.beginPath();
      for (let i = 0; i < route.points.length; i++) {
        const px = route.points[i][0] * sx;
        const py = route.points[i][1] * sy;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(2.5, route.width * sx);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Stone track dashes
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Shrines of Power along routes
    for (const shrine of this.shrines) {
      const cx = shrine.x * sx;
      const cy = shrine.y * sy;
      const sr = shrine.radius * sx;

      let auraCol = 'rgba(148, 163, 184, 0.2)';
      let centerCol = '#94a3b8';
      if (shrine.controller === 'DEVAS') {
        auraCol = 'rgba(56, 189, 248, 0.35)';
        centerCol = '#38bdf8';
      } else if (shrine.controller === 'ASURAS') {
        auraCol = 'rgba(239, 68, 68, 0.35)';
        centerCol = '#ef4444';
      }

      ctx.fillStyle = auraCol;
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = centerCol;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Units Rendering:
    // "showing enemies with red dot and allies with blue dot . And make the size of dot directly proportional to the strength of the character , and for too much stronger character make a boss sign"
    const now = performance.now() / 1000;

    for (const u of this.units) {
      if (u.state === 'DEAD') continue;
      const ux = u.x * sx;
      const uy = u.y * sy;

      // Allies = Blue Dot, Enemies = Red Dot
      const isAlly = u.faction === this.player.faction;
      const dotColor = isAlly ? '#38bdf8' : '#ef4444';

      // Strength of character calculation (MaxHp + Atk * 4)
      const strength = u.maxHp + u.atk * 4;
      // Proportional dot radius from 2.5px up to 8.5px
      const dotRadius = Math.max(2.4, Math.min(8.5, 2.0 + (strength / 1000) * 6.5));

      const isBoss = u.isBoss || u.role === 'BOSS' || u.maxHp >= 650;

      if (isBoss) {
        // --- BOSS SIGN ---
        const pulse = (Math.sin(now * 6) + 1) * 0.5;
        ctx.save();

        // Pulsing outer threat shockwave
        ctx.strokeStyle = isAlly ? '#60a5fa' : '#f87171';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(ux, uy, dotRadius + 3 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Boss Center Dot
        ctx.fillStyle = isAlly ? '#0284c7' : '#dc2626';
        ctx.beginPath();
        ctx.arc(ux, uy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Prominent Animated Boss Sign Tag above character
        const badgeY = uy - dotRadius - 7;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ux - 13, badgeY - 5, 26, 11);
        ctx.strokeStyle = isAlly ? '#38bdf8' : '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(ux - 13, badgeY - 5, 26, 11);

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 8px Rajdhani';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑 BOSS', ux, badgeY);

        ctx.restore();
      } else if (u.isPlayer) {
        // Player: Distinct Blue/Ally Dot with Golden pulsing halo
        ctx.save();
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(ux, uy, dotRadius + 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.beginPath();
        ctx.arc(ux, uy, dotRadius + 3 + (Math.sin(now * 5) + 1) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        // Standard Unit: dot size directly proportional to strength
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(ux, uy, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // 5. Camera Viewport Rectangle (Frustum)
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const viewLeft = (this.cameraX - cw / 2) * sx;
    const viewTop = (this.cameraY - ch / 2) * sy;
    const viewWidth = cw * sx;
    const viewHeight = ch * sy;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);

    // 6. Outer Border Rim
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, mw, mh);
  }

  private renderShrines(ctx: CanvasRenderingContext2D) {
    for (const shrine of this.shrines) {
      // Area ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(shrine.x, shrine.y, shrine.radius, 0, Math.PI * 2);

      let fillColor = 'rgba(100, 116, 139, 0.1)';
      let strokeColor = '#94a3b8';
      if (shrine.controller === 'DEVAS') {
        fillColor = 'rgba(56, 189, 248, 0.15)';
        strokeColor = '#38bdf8';
      } else if (shrine.controller === 'ASURAS') {
        fillColor = 'rgba(225, 29, 72, 0.15)';
        strokeColor = '#e11d48';
      }

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Pillar Monument
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(shrine.x, shrine.y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Shrine Title Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px Rajdhani';
      ctx.textAlign = 'center';
      ctx.fillText(shrine.name, shrine.x, shrine.y - shrine.radius - 8);

      // Progress bar
      const barW = 100;
      const barH = 6;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(shrine.x - barW / 2, shrine.y - shrine.radius - 24, barW, barH);
      // Progress from -100 to +100
      const normProgress = (shrine.progress + 100) / 200; // 0 (Asura) to 1 (Deva)
      ctx.fillStyle = normProgress > 0.5 ? '#38bdf8' : '#e11d48';
      ctx.fillRect(
        shrine.x - barW / 2,
        shrine.y - shrine.radius - 24,
        barW * normProgress,
        barH
      );

      ctx.restore();
    }
  }

  private renderUnits(ctx: CanvasRenderingContext2D) {
    for (const u of this.units) {
      ctx.save();
      ctx.translate(u.x, u.y);

      // Dissolve on death
      if (u.state === 'DEAD') {
        ctx.globalAlpha = Math.max(0, u.deadTimer / 0.6);
      }

      const isDeva = u.faction === 'DEVAS';

      // Hit flash
      if (u.hitFlash > 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = u.color;
      }

      // Boss Supreme Commanding Aura
      if (u.isBoss) {
        const bossAuraColor = isDeva ? 'rgba(250, 204, 21, 0.45)' : 'rgba(225, 29, 72, 0.55)';
        ctx.strokeStyle = isDeva ? '#fde047' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, u.radius + 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = bossAuraColor;
        ctx.beginPath();
        ctx.arc(0, 0, u.radius + 8, 0, Math.PI * 2);
        ctx.fill();

        // Spiked boss crown rays
        for (let i = 0; i < 8; i++) {
          const bossAngle = (Math.PI * 2 * i) / 8 + this.chakraAngle * 0.4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(bossAngle) * (u.radius + 5), Math.sin(bossAngle) * (u.radius + 5));
          ctx.lineTo(Math.cos(bossAngle) * (u.radius + 15), Math.sin(bossAngle) * (u.radius + 15));
          ctx.stroke();
        }
      }

      // Player Humanoid Character Rendering
      if (u.isPlayer) {
        this.renderHumanoidPlayer(ctx, u);
        ctx.restore();

        // Health bar above player
        if (u.hp < u.maxHp && u.state !== 'DEAD') {
          const barW = 48;
          const barH = 5;
          const hpPct = Math.max(0, u.hp / u.maxHp);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(u.x - barW / 2, u.y - u.radius - 18, barW, barH);
          ctx.fillStyle = hpPct > 0.4 ? (isDeva ? '#38bdf8' : '#e11d48') : '#ef4444';
          ctx.fillRect(u.x - barW / 2, u.y - u.radius - 18, barW * hpPct, barH);
        }
        continue;
      }

      // Detailed Humanoid Minion Soldier Rendering (Male & Female variants for Devas & Asuras)
      this.renderHumanoidMinion(ctx, u, isDeva, performance.now() / 1000);
      ctx.restore();

      // Health bar above unit
      if (u.hp < u.maxHp && u.state !== 'DEAD') {
        const barW = u.isPlayer ? 44 : 26;
        const barH = u.isPlayer ? 5 : 3;
        const hpPct = Math.max(0, u.hp / u.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(u.x - barW / 2, u.y - u.radius - 14, barW, barH);
        ctx.fillStyle = hpPct > 0.4 ? (isDeva ? '#38bdf8' : '#e11d48') : '#ef4444';
        ctx.fillRect(u.x - barW / 2, u.y - u.radius - 14, barW * hpPct, barH);
      }
    }
  }

  private renderHumanoidPlayer(ctx: CanvasRenderingContext2D, u: BattlefieldUnit) {
    const isDeva = u.faction === 'DEVAS';
    const isHit = u.hitFlash > 0;
    const heroClass = this.player.heroClass;

    // 1. Mythological Ground Shadow & Ambient Aura
    ctx.save();
    // Drop shadow under warrior
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Celestial or Demonic Radial Aura on ground
    const auraGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 32);
    if (isDeva) {
      auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      auraGrad.addColorStop(0.7, 'rgba(250, 204, 21, 0.2)');
      auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else {
      auraGrad.addColorStop(0, 'rgba(225, 29, 72, 0.4)');
      auraGrad.addColorStop(0.7, 'rgba(147, 51, 234, 0.2)');
      auraGrad.addColorStop(1, 'rgba(225, 29, 72, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Runic Mandala Rings
    ctx.strokeStyle = isDeva ? 'rgba(250, 204, 21, 0.7)' : 'rgba(251, 113, 133, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Sacred Lotus / Nether Blade Petals
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
      const pAngle = (Math.PI * 2 * i) / petalCount + this.chakraAngle * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(pAngle) * 25, Math.sin(pAngle) * 25);
      ctx.lineTo(Math.cos(pAngle) * 31, Math.sin(pAngle) * 31);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Rotate to Warrior Facing Direction
    ctx.save();
    ctx.rotate(u.facing);

    // Walking stride calculation
    const walkPhase = this.playerWalkAnimDistance * 0.16;
    const legSwing = Math.sin(walkPhase) * 6.5;

    // A. HUMAN LEGS & GREAVES (Walking Animation)
    ctx.fillStyle = isDeva ? '#ca8a04' : '#3f3f46';
    ctx.strokeStyle = isDeva ? '#fef08a' : '#991b1b';
    ctx.lineWidth = 1.2;
    // Left foot / boot
    ctx.fillRect(-10 - legSwing, -11, 12, 6);
    ctx.strokeRect(-10 - legSwing, -11, 12, 6);

    // Right foot / boot
    ctx.fillRect(-10 + legSwing, 5, 12, 6);
    ctx.strokeRect(-10 + legSwing, 5, 12, 6);

    // B. FLOWING SASH (Angavastra / Battle Cape)
    const sashFlutter = Math.sin(walkPhase * 1.5) * 2.5;
    ctx.fillStyle = isDeva ? '#f97316' : '#991b1b';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-24, -12 + sashFlutter);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-24, 12 - sashFlutter);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isDeva ? '#fde047' : '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // C. HUMAN TORSO & ARMORED CUIRASS (Kavacha)
    if (isHit) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = isDeva ? '#0284c7' : '#18181b';
    }
    // Main Torso shape
    ctx.beginPath();
    ctx.ellipse(-2, 0, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden / Obsidian Breastplate (Kavacha)
    ctx.fillStyle = isDeva ? '#eab308' : '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDeva ? '#fef08a' : '#f87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center Sacred Insignia / Chakra on chest
    ctx.fillStyle = isDeva ? '#ffffff' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // D. ORNATE LAYERED SHOULDER PAULDRONS
    // Left pauldron
    ctx.fillStyle = isDeva ? '#ca8a04' : '#450a0a';
    ctx.beginPath();
    ctx.arc(-2, -14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDeva ? '#fef08a' : '#e11d48';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Right pauldron
    ctx.beginPath();
    ctx.arc(-2, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // E. HUMAN ARMS & GAUNTLETS
    const skinColor = isDeva ? '#d4a373' : '#b08968';
    ctx.fillStyle = skinColor;
    // Left arm
    ctx.fillRect(2, -13, 10, 4.5);
    // Right arm
    ctx.fillRect(2, 8.5, 10, 4.5);
    // Gold/Iron Bracers
    ctx.fillStyle = isDeva ? '#f59e0b' : '#3f3f46';
    ctx.fillRect(8, -13, 5, 4.5);
    ctx.fillRect(8, 8.5, 5, 4.5);

    // F. HUMAN HEAD, WARRIOR HAIR & SACRED MUKUT / WAR HELMET
    // Head base (top-down view of warrior head)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Dark warrior hair / Jata
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-2.5, 0, 6.2, Math.PI * 0.45, Math.PI * 1.55);
    ctx.fill();

    // Forehead Sacred Tilak / Third Eye
    ctx.fillStyle = isDeva ? '#ef4444' : '#facc15';
    ctx.fillRect(2.5, -1, 3.5, 2);

    if (isDeva) {
      // Celestial Golden Mukut (Crown) with divine crest
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(3, -4);
      ctx.lineTo(8, 0);
      ctx.lineTo(3, 4);
      ctx.lineTo(1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ruby in Mukut center
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(4, 0, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Demonic Horned War Helm
      ctx.fillStyle = '#09090b';
      // Left horn
      ctx.beginPath();
      ctx.moveTo(1, -5);
      ctx.lineTo(7, -12);
      ctx.lineTo(3, -4);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Right horn
      ctx.beginPath();
      ctx.moveTo(1, 5);
      ctx.lineTo(7, 12);
      ctx.lineTo(3, 4);
      ctx.fill();
      ctx.stroke();
    }

    // G. CLASS SPECIFIC DIVINE & DEMONIC WEAPONS
    if (heroClass === 'SURYA_ARCHER') {
      // Golden Greatbow (Gandiva / Kodanda)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, 0, 15, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16 + Math.cos(-Math.PI * 0.42) * 15, Math.sin(-Math.PI * 0.42) * 15);
      ctx.lineTo(6, 0);
      ctx.lineTo(16 + Math.cos(Math.PI * 0.42) * 15, Math.sin(Math.PI * 0.42) * 15);
      ctx.stroke();

      // Luminous Surya Arrow ready to loose
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(6, -1.2, 22, 2.4);
      ctx.beginPath();
      ctx.moveTo(28, -3.5);
      ctx.lineTo(34, 0);
      ctx.lineTo(28, 3.5);
      ctx.closePath();
      ctx.fill();
    } else if (heroClass === 'RUDRA_VANGUARD') {
      // Trishula / Vajra Staff with Electric Arc
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, 9);
      ctx.lineTo(26, 9);
      ctx.stroke();

      // Trident head / Vajra prongs
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.moveTo(24, 4);
      ctx.lineTo(32, 4);
      ctx.lineTo(27, 9);
      ctx.lineTo(36, 9);
      ctx.lineTo(27, 9);
      ctx.lineTo(32, 14);
      ctx.lineTo(24, 14);
      ctx.closePath();
      ctx.fill();

      // Electric spark ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(31, 9, 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (heroClass === 'MAHISHA_BERSERKER' || heroClass === 'TARAKA_TITAN') {
      // Heavy Spiked Gada (Iron War Mace)
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-4, 9);
      ctx.lineTo(18, 9);
      ctx.stroke();

      // Massive flanged spiked head
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(22, 9, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spikes
      ctx.fillStyle = '#f87171';
      for (let s = 0; s < 4; s++) {
        const sa = (Math.PI * 2 * s) / 4 + this.chakraAngle;
        ctx.beginPath();
        ctx.arc(22 + Math.cos(sa) * 9, 9 + Math.sin(sa) * 9, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (heroClass === 'RAVANA_SORCERER') {
      // Demonic Bone Staff with Dark Netherfire Orb
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, 9);
      ctx.lineTo(22, 9);
      ctx.stroke();

      // Nether orb
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(26, 9, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Default: Flaming Celestial Khadga / Sacred Broadsword (VAJRA_WARRIOR & SHIVA_WARRIOR)
      ctx.fillStyle = isDeva ? '#f59e0b' : '#3f3f46';
      ctx.fillRect(10, 7, 5, 4);
      ctx.fillRect(14, 4, 3, 10);

      // Sword Blade (Khadga)
      ctx.fillStyle = isDeva ? '#fef08a' : '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(17, 7.5);
      ctx.lineTo(34, 7.5);
      ctx.lineTo(38, 9);
      ctx.lineTo(34, 10.5);
      ctx.lineTo(17, 10.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isDeva ? '#fbbf24' : '#991b1b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Radiant energy glow along sword edge
      ctx.strokeStyle = isDeva ? 'rgba(254, 240, 138, 0.7)' : 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderHumanoidMinion(
    ctx: CanvasRenderingContext2D,
    u: BattlefieldUnit,
    isDeva: boolean,
    now: number
  ) {
    const isFemale = u.gender === 'FEMALE';
    const isHit = u.hitFlash > 0;
    const isMoving = u.state === 'MARCH' || Math.hypot(u.vx, u.vy) > 8;
    const walkPhase = isMoving ? now * 11 + u.x * 0.08 : 0;
    const legSwing = Math.sin(walkPhase) * 4.5;

    // 1. Drop Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 3, u.radius * 0.9, u.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Rotate to Facing Direction
    ctx.save();
    ctx.rotate(u.facing);

    // A. HUMAN LEGS & GREAVES (Walking Animation)
    ctx.fillStyle = isDeva ? '#ca8a04' : '#27272a';
    ctx.strokeStyle = isDeva ? '#fef08a' : '#7f1d1d';
    ctx.lineWidth = 1;
    // Left leg
    ctx.fillRect(-8 - legSwing, -7, 8, 4);
    ctx.strokeRect(-8 - legSwing, -7, 8, 4);
    // Right leg
    ctx.fillRect(-8 + legSwing, 3, 8, 4);
    ctx.strokeRect(-8 + legSwing, 3, 8, 4);

    // B. FLOWING SASH / CLOTH (Angavastra / Battle Cape)
    const sashFlutter = Math.sin(walkPhase * 1.4) * 2;
    ctx.fillStyle = isDeva
      ? isFemale
        ? '#0284c7' // Azure sash for female celestial
        : '#ea580c' // Saffron sash for male deva
      : isFemale
      ? '#701a75' // Violet shadow silk for demoness
      : '#991b1b'; // Crimson battle kilt for asura
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(-15, -9 + sashFlutter);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-15, 9 - sashFlutter);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();

    // C. HUMAN TORSO & ARMORED CUIRASS
    if (isHit) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = isDeva ? '#0369a1' : '#18181b';
    }
    ctx.beginPath();
    // Male has broader shoulders, female is more tapered
    if (isFemale) {
      ctx.ellipse(-1, 0, 6.5, 8, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(-1, 0, 8, 10, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // Cuirass Breastplate (Kavacha)
    ctx.fillStyle = isDeva ? '#eab308' : '#881337';
    ctx.beginPath();
    if (isFemale) {
      ctx.ellipse(0, 0, 5.5, 6, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, 0, 6.5, 7.5, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = isDeva ? '#fef08a' : '#f43f5e';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // D. SHOULDER PAULDRONS
    ctx.fillStyle = isDeva ? '#ca8a04' : '#3f3f46';
    ctx.strokeStyle = isDeva ? '#fde047' : '#991b1b';
    ctx.lineWidth = 1;
    // Left pauldron
    ctx.beginPath();
    ctx.arc(-1, isFemale ? -8.5 : -10, isFemale ? 3.5 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Right pauldron
    ctx.beginPath();
    ctx.arc(-1, isFemale ? 8.5 : 10, isFemale ? 3.5 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // E. HEAD, HAIR & HEADDRESS (CROWNS / HORNS)
    const skinTone = isDeva ? '#fcd34d' : '#a1a1aa';
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(3, 0, isFemale ? 4.5 : 5.2, 0, Math.PI * 2);
    ctx.fill();

    if (isDeva) {
      if (isFemale) {
        // Celestial hair bun with jeweled tiara
        ctx.fillStyle = '#1e1b4b'; // Dark hair
        ctx.beginPath();
        ctx.arc(-1, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        // Golden hair pin / tiara
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Male Celestial Mukut Crown
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(1, -4);
        ctx.lineTo(8, 0);
        ctx.lineTo(1, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else {
      // ASURAS
      if (isFemale) {
        // Demonic bladed horns & shadow hair
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(-1, 0, 4.2, 0, Math.PI * 2);
        ctx.fill();
        // Sleek curved horn crests
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(1, -3);
        ctx.lineTo(7, -7);
        ctx.lineTo(3, -1);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1, 3);
        ctx.lineTo(7, 7);
        ctx.lineTo(3, 1);
        ctx.fill();
      } else {
        // Male Heavy curved demon horns
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(8, -8);
        ctx.lineTo(3, -2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(8, 8);
        ctx.lineTo(3, 2);
        ctx.fill();
      }
    }

    // F. WEAPONS
    if (u.role === 'ARCHER') {
      // Bow & Arrow
      ctx.strokeStyle = isDeva ? '#facc15' : '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(8, 0, 9, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      // Nocked Arrow
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
    } else if (u.role === 'BRUTE') {
      // Heavy Gada Mace or War Axe
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(2, 4);
      ctx.lineTo(14, 8);
      ctx.stroke();

      ctx.fillStyle = isDeva ? '#f59e0b' : '#b91c1c';
      ctx.beginPath();
      ctx.arc(15, 9, isFemale ? 5.5 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (u.role === 'MAGE') {
      // Mystic Chant Staff with glowing magical orb
      ctx.strokeStyle = isDeva ? '#38bdf8' : '#a855f7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(2, 5);
      ctx.lineTo(13, 7);
      ctx.stroke();

      ctx.fillStyle = isDeva ? '#67e8f9' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(14, 7, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // SOLDIER: Sword (Male) or Spearmaiden Spear (Female)
      if (isFemale && isDeva) {
        // Divine Trishula / Spear
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, 5);
        ctx.lineTo(17, 7);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(17, 7);
        ctx.lineTo(21, 7);
        ctx.stroke();
      } else {
        // Sacred Sword / Demon Cleaver
        ctx.fillStyle = isDeva ? '#fef08a' : '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(6, -3);
        ctx.lineTo(17, 0);
        ctx.lineTo(6, 3);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private renderFactionCamps(ctx: CanvasRenderingContext2D) {
    const now = performance.now() / 1000;
    const playerUnit = this.getPlayerUnit();
    const isPlayerDeva = this.player.faction === 'DEVAS';

    // ==========================================
    // 1. DEVA CELESTIAL SANCTUM CAMP (WEST)
    // ==========================================
    ctx.save();
    // Base Ground Plinth
    const devaCampGrad = ctx.createRadialGradient(250, 900, 50, 250, 900, 360);
    devaCampGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    devaCampGrad.addColorStop(0.55, 'rgba(234, 179, 8, 0.15)');
    devaCampGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = devaCampGrad;
    ctx.beginPath();
    ctx.arc(250, 900, 360, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Concentric Golden Mandala Rings on ground
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(250, 900, 260, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(250, 900, 200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sacred Amrita Healing Font (Center of Deva Camp)
    const fontX = 160;
    const fontY = 900;
    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.beginPath();
    ctx.arc(fontX, fontY, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Shimmering Lotus in Healing Font
    ctx.fillStyle = '#fde047';
    for (let i = 0; i < 8; i++) {
      const pa = (Math.PI * 2 * i) / 8 + now * 0.4;
      ctx.beginPath();
      ctx.arc(fontX + Math.cos(pa) * 22, fontY + Math.sin(pa) * 22, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('AMRITA HEALING WELL', fontX, fontY - 60);

    // Quartermaster Shop Pavilion (Devas: 250, 820)
    const shopDevaX = 250;
    const shopDevaY = 820;
    // Pavilion tent roof
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(shopDevaX - 45, shopDevaY - 30);
    ctx.lineTo(shopDevaX, shopDevaY - 65);
    ctx.lineTo(shopDevaX + 45, shopDevaY - 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Canopy Body
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.fillRect(shopDevaX - 35, shopDevaY - 30, 70, 45);
    ctx.strokeStyle = '#ca8a04';
    ctx.strokeRect(shopDevaX - 35, shopDevaY - 30, 70, 45);

    // Quartermaster NPC Standee
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(shopDevaX, shopDevaY - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shop sign
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(shopDevaX - 42, shopDevaY - 78, 84, 16);
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(shopDevaX - 42, shopDevaY - 78, 84, 16);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText('ARMORY SHOP', shopDevaX, shopDevaY - 66);

    // War Quests Council Tent (Devas: 250, 980)
    const questDevaX = 250;
    const questDevaY = 980;
    // Tent roof
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(questDevaX - 45, questDevaY - 30);
    ctx.lineTo(questDevaX, questDevaY - 65);
    ctx.lineTo(questDevaX + 45, questDevaY - 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.fillRect(questDevaX - 35, questDevaY - 30, 70, 45);
    ctx.strokeStyle = '#0284c7';
    ctx.strokeRect(questDevaX - 35, questDevaY - 30, 70, 45);

    // Quest Master Commander NPC
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(questDevaX, questDevaY - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(questDevaX - 42, questDevaY - 78, 84, 16);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(questDevaX - 42, questDevaY - 78, 84, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText('WAR COUNCIL', questDevaX, questDevaY - 66);

    // Proximity Prompts for Deva Player
    if (playerUnit && isPlayerDeva) {
      if (Math.hypot(playerUnit.x - shopDevaX, playerUnit.y - shopDevaY) < 85) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(shopDevaX - 55, shopDevaY + 22, 110, 22);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px Cinzel';
        ctx.fillText('PRESS [E] SHOP', shopDevaX, shopDevaY + 37);
      }
      if (Math.hypot(playerUnit.x - questDevaX, playerUnit.y - questDevaY) < 85) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(questDevaX - 55, questDevaY + 22, 110, 22);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px Cinzel';
        ctx.fillText('PRESS [Q] QUESTS', questDevaX, questDevaY + 37);
      }
    }

    // ==========================================
    // 2. ASURA NETHERFIRE CITADEL CAMP (EAST)
    // ==========================================
    const asuraBaseX = WORLD_WIDTH - 250;
    const asuraCampGrad = ctx.createRadialGradient(
      asuraBaseX,
      900,
      50,
      asuraBaseX,
      900,
      360
    );
    asuraCampGrad.addColorStop(0, 'rgba(225, 29, 72, 0.25)');
    asuraCampGrad.addColorStop(0.55, 'rgba(127, 29, 29, 0.2)');
    asuraCampGrad.addColorStop(1, 'rgba(24, 7, 8, 0)');
    ctx.fillStyle = asuraCampGrad;
    ctx.beginPath();
    ctx.arc(asuraBaseX, 900, 360, 0, Math.PI * 2);
    ctx.fill();

    // Spiked obsidian boundary & lava veins
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(asuraBaseX, 900, 260, 0, Math.PI * 2);
    ctx.stroke();

    // Demonic Bloodstone Altar (Center of Asura Camp)
    const altarX = WORLD_WIDTH - 160;
    const altarY = 900;
    ctx.fillStyle = 'rgba(153, 27, 27, 0.45)';
    ctx.beginPath();
    ctx.arc(altarX, altarY, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glowing Bloodstone Monolith
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(altarX - 16, altarY + 20);
    ctx.lineTo(altarX, altarY - 30);
    ctx.lineTo(altarX + 16, altarY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('BLOODSTONE ALTAR', altarX, altarY - 60);

    // Nether Armory Forge (Asura: WORLD_WIDTH - 250, 820)
    const shopAsuraX = WORLD_WIDTH - 250;
    const shopAsuraY = 820;
    // Spiked iron roof
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(shopAsuraX - 45, shopAsuraY - 30);
    ctx.lineTo(shopAsuraX, shopAsuraY - 65);
    ctx.lineTo(shopAsuraX + 45, shopAsuraY - 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
    ctx.fillRect(shopAsuraX - 35, shopAsuraY - 30, 70, 45);
    ctx.strokeStyle = '#991b1b';
    ctx.strokeRect(shopAsuraX - 35, shopAsuraY - 30, 70, 45);

    // Quartermaster NPC Standee
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(shopAsuraX, shopAsuraY - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(shopAsuraX - 42, shopAsuraY - 78, 84, 16);
    ctx.strokeStyle = '#ef4444';
    ctx.strokeRect(shopAsuraX - 42, shopAsuraY - 78, 84, 16);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 10px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText('NETHER FORGE', shopAsuraX, shopAsuraY - 66);

    // Warlord Council Tent (Asura: WORLD_WIDTH - 250, 980)
    const questAsuraX = WORLD_WIDTH - 250;
    const questAsuraY = 980;
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(questAsuraX - 45, questAsuraY - 30);
    ctx.lineTo(questAsuraX, questAsuraY - 65);
    ctx.lineTo(questAsuraX + 45, questAsuraY - 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
    ctx.fillRect(questAsuraX - 35, questAsuraY - 30, 70, 45);
    ctx.strokeStyle = '#7e22ce';
    ctx.strokeRect(questAsuraX - 35, questAsuraY - 30, 70, 45);

    // Warlord NPC
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(questAsuraX, questAsuraY - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(questAsuraX - 42, questAsuraY - 78, 84, 16);
    ctx.strokeStyle = '#a855f7';
    ctx.strokeRect(questAsuraX - 42, questAsuraY - 78, 84, 16);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 10px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText('WAR LORDS', questAsuraX, questAsuraY - 66);

    // Proximity Prompts for Asura Player
    if (playerUnit && !isPlayerDeva) {
      if (Math.hypot(playerUnit.x - shopAsuraX, playerUnit.y - shopAsuraY) < 85) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(shopAsuraX - 55, shopAsuraY + 22, 110, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Cinzel';
        ctx.fillText('PRESS [E] SHOP', shopAsuraX, shopAsuraY + 37);
      }
      if (Math.hypot(playerUnit.x - questAsuraX, playerUnit.y - questAsuraY) < 85) {
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(questAsuraX - 55, questAsuraY + 22, 110, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Cinzel';
        ctx.fillText('PRESS [Q] BOUNTIES', questAsuraX, questAsuraY + 37);
      }
    }

    ctx.restore();
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (p.type === 'CHAKRA') {
        // Divine Sudarshana Chakra with radiant solar flare & spinning teeth
        // 1. Outer solar aura corona
        const chakraGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, p.radius * 1.8);
        chakraGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        chakraGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.4)');
        chakraGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = chakraGlow;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 2. Spinning razor wheel
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Golden ring & sacred center
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // 4. 8 Sharp Serrated Sun Blades
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8 + this.chakraAngle * 3;
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (p.radius * 0.4), Math.sin(a) * (p.radius * 0.4));
          ctx.lineTo(Math.cos(a) * (p.radius + 8), Math.sin(a) * (p.radius + 8));
          ctx.stroke();
        }
      } else if (p.type === 'SURYA_RAY') {
        // Blinding Volumetric Surya Solar Laser Beam
        const beamLen = p.radius * 5.5;
        const beamH = p.radius * 1.4;

        // Outer holy flare
        const rayGlow = ctx.createRadialGradient(0, 0, 3, 0, 0, beamLen);
        rayGlow.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
        rayGlow.addColorStop(0.4, 'rgba(234, 179, 8, 0.35)');
        rayGlow.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = rayGlow;
        ctx.beginPath();
        ctx.ellipse(0, 0, beamLen, beamH * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // High intensity core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-beamLen * 0.6, -beamH * 0.3, beamLen * 1.2, beamH * 0.6);

        ctx.fillStyle = '#fde047';
        ctx.fillRect(-beamLen * 0.5, -beamH * 0.6, beamLen, beamH * 1.2);
      } else if (p.type === 'VOID_SCYTHE') {
        // Spinning Void Scythe Blade
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.3, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.arc(p.radius * 0.5, 0, p.radius * 0.8, Math.PI * 0.6, -Math.PI * 0.6, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Bolt / Arrow with glowing tail
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Trail ribbon
        ctx.strokeStyle = p.trailColor || p.color;
        ctx.lineWidth = Math.max(1.5, p.radius * 0.6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-p.radius * 3.5, 0);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = pt.alpha;

      if (pt.shape === 'SHOCKWAVE') {
        // Expanding Concentric Shockwave Ring
        const currentRadius = Math.max(1, pt.size * (pt.life / pt.maxLife));
        const strokeW = Math.max(1, 4 * (1 - pt.life / pt.maxLife));

        ctx.strokeStyle = pt.color;
        ctx.lineWidth = strokeW;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner soft flash
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha * 0.12;
        ctx.fill();
      } else if (pt.shape === 'SPARK') {
        // Electrifying diamond spark
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - pt.size);
        ctx.lineTo(pt.x + pt.size * 0.45, pt.y);
        ctx.lineTo(pt.x, pt.y + pt.size);
        ctx.lineTo(pt.x - pt.size * 0.45, pt.y);
        ctx.closePath();
        ctx.fill();
      } else if (pt.shape === 'EMBER') {
        // Smoldering fiery ember with heat haze
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.shape === 'DUST') {
        // Expanding atmospheric ground dust cloud
        const dustRadius = pt.size * (0.6 + 0.7 * (pt.life / pt.maxLife));
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, dustRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.shape === 'BLOOD') {
        // Directional combat splatter
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pt.size * 0.6, pt.size * 1.4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard circle particle
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderFloatingText(ctx: CanvasRenderingContext2D) {
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.font = ft.isCrit ? '900 18px Cinzel' : 'bold 15px Rajdhani';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
