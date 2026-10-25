export interface TerrainTree {
  x: number;
  y: number;
  size: number;
  type: 'BANYAN' | 'HIMALAYAN_PINE' | 'ASHOKA' | 'CHARRED_IRONWOOD' | 'OBSIDIAN_SPIRE';
  foliageColor: string;
  trunkColor: string;
  seed: number;
}

export interface Blade {
  dx: number;
  length: number;
  tilt: number;
  color: string;
}

export interface GrassTuft {
  x: number;
  y: number;
  blades: Blade[];
  flowerColor?: string;
  hasFlower: boolean;
}

export interface Boulder {
  x: number;
  y: number;
  radius: number;
  points: { r: number; angle: number }[];
  baseColor: string;
  highlightColor: string;
  shadowColor: string;
  hasMoss: boolean;
}

export interface TerrainCrater {
  x: number;
  y: number;
  radius: number;
  depth: number;
  glowColor: string;
}

export interface MountainPeak {
  x: number;
  y: number;
  width: number;
  height: number;
  snowHeight: number;
  type: 'SNOW_HIMALAYA' | 'ROCK_RIDGE' | 'VOLCANIC_CRAG';
  baseColor: string;
  snowColor: string;
  lavaVein?: boolean;
}

export interface BattlefieldEnvironment {
  northMountains: MountainPeak[];
  southMountains: MountainPeak[];
  trees: TerrainTree[];
  grassTufts: GrassTuft[];
  boulders: Boulder[];
  craters: TerrainCrater[];
}

// Simple deterministic PRNG for stable, reproducible environment features
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateBattlefieldEnvironment(
  worldWidth: number,
  worldHeight: number
): BattlefieldEnvironment {
  let seed = 42;
  const rand = () => pseudoRandom(seed++);

  // 1. GENERATE MOUNTAIN PEAKS (NORTH & SOUTH HORIZONS)
  const northMountains: MountainPeak[] = [];
  const southMountains: MountainPeak[] = [];

  const mountainCount = 36;
  for (let i = 0; i <= mountainCount; i++) {
    const x = (i / mountainCount) * worldWidth;
    const width = 110 + rand() * 90;
    const height = 90 + rand() * 110;
    const snowHeight = height * (0.45 + rand() * 0.3);

    // West: Snow Himalayas; Center: Rocky pass; East: Volcanic crags
    let type: MountainPeak['type'] = 'ROCK_RIDGE';
    let baseColor = '#1e293b';
    let snowColor = '#f8fafc';
    let lavaVein = false;

    if (x < worldWidth * 0.42) {
      // Himalayan sacred peaks
      type = 'SNOW_HIMALAYA';
      baseColor = '#1e293b';
      snowColor = '#f1f5f9';
    } else if (x > worldWidth * 0.58) {
      // Nether volcanic crags
      type = 'VOLCANIC_CRAG';
      baseColor = '#18070b';
      snowColor = '#f43f5e';
      lavaVein = rand() > 0.35;
    } else {
      // Clashing central rock ridges
      type = 'ROCK_RIDGE';
      baseColor = '#334155';
      snowColor = '#cbd5e1';
    }

    // North Mountain (tops at y = 0..160)
    northMountains.push({
      x,
      y: 0,
      width,
      height,
      snowHeight,
      type,
      baseColor,
      snowColor,
      lavaVein,
    });

    // South Mountain (tops at y = worldHeight..worldHeight - 160)
    southMountains.push({
      x: x + (rand() - 0.5) * 40,
      y: worldHeight,
      width: width * (0.9 + rand() * 0.2),
      height: height * (0.85 + rand() * 0.3),
      snowHeight,
      type,
      baseColor,
      snowColor,
      lavaVein,
    });
  }

  // 2. PROCEDURAL TREES & WOODLANDS
  const trees: TerrainTree[] = [];
  const treeCount = 90;

  for (let i = 0; i < treeCount; i++) {
    const x = 70 + rand() * (worldWidth - 140);
    // Keep lanes clear (near y=400, y=900, y=1400 have roads)
    let y = 140 + rand() * (worldHeight - 280);
    if (Math.abs(y - 400) < 55) y += 65;
    if (Math.abs(y - 900) < 55) y += 65;
    if (Math.abs(y - 1400) < 55) y -= 65;

    // Avoid immediate camp centers
    if (x < 420 && y > 700 && y < 1100) continue;
    if (x > worldWidth - 420 && y > 700 && y < 1100) continue;

    const size = 32 + rand() * 26;
    let type: TerrainTree['type'] = 'BANYAN';
    let foliageColor = '#15803d';
    let trunkColor = '#5c3a21';

    if (x < worldWidth * 0.45) {
      // Deva territory: Lush ancient Banyan, Himalayan Pine, Flowering Ashoka
      const roll = rand();
      if (roll < 0.45) {
        type = 'BANYAN';
        foliageColor = roll < 0.25 ? '#166534' : '#15803d';
        trunkColor = '#5c3a21';
      } else if (roll < 0.75) {
        type = 'HIMALAYAN_PINE';
        foliageColor = '#065f46';
        trunkColor = '#422006';
      } else {
        type = 'ASHOKA';
        foliageColor = '#ea580c';
        trunkColor = '#78350f';
      }
    } else if (x > worldWidth * 0.55) {
      // Asura territory: Charred Ironwood & Obsidian rock spires
      if (rand() < 0.65) {
        type = 'CHARRED_IRONWOOD';
        foliageColor = '#27272a';
        trunkColor = '#18181b';
      } else {
        type = 'OBSIDIAN_SPIRE';
        foliageColor = '#dc2626';
        trunkColor = '#09090b';
      }
    } else {
      // Center skirmish zone: Weathered splintered pines and battle-worn trees
      type = rand() > 0.5 ? 'HIMALAYAN_PINE' : 'CHARRED_IRONWOOD';
      foliageColor = '#3f3f46';
      trunkColor = '#292524';
    }

    trees.push({
      x,
      y,
      size,
      type,
      foliageColor,
      trunkColor,
      seed: rand() * 1000,
    });
  }

  // 3. PROCEDURAL GRASS TUFTS & WILDFLOWERS
  const grassTufts: GrassTuft[] = [];
  const grassCount = 420;

  for (let i = 0; i < grassCount; i++) {
    const x = 50 + rand() * (worldWidth - 100);
    const y = 80 + rand() * (worldHeight - 160);

    const bladeCount = 4 + Math.floor(rand() * 4);
    const blades: Blade[] = [];

    // Faction tint for blades
    let baseGrassColor = '#22c55e';
    let flowerCol: string | undefined = undefined;
    const hasFlower = rand() > 0.65;

    if (x < worldWidth * 0.45) {
      // Lush Deva Green & Golden wild flora
      baseGrassColor = rand() > 0.5 ? '#16a34a' : '#22c55e';
      if (hasFlower) flowerCol = rand() > 0.5 ? '#fde047' : '#ffffff';
    } else if (x > worldWidth * 0.55) {
      // Scorched Asura volcanic grass
      baseGrassColor = rand() > 0.5 ? '#450a0a' : '#1c1917';
      if (hasFlower) flowerCol = '#ef4444';
    } else {
      // Dry trampled battlefield steppe
      baseGrassColor = rand() > 0.5 ? '#854d0e' : '#a16207';
      if (hasFlower) flowerCol = '#cbd5e1';
    }

    for (let b = 0; b < bladeCount; b++) {
      blades.push({
        dx: (b - bladeCount / 2) * (3.5 + rand() * 2),
        length: 10 + rand() * 12,
        tilt: (rand() - 0.5) * 0.6,
        color: baseGrassColor,
      });
    }

    grassTufts.push({
      x,
      y,
      blades,
      flowerColor: flowerCol,
      hasFlower,
    });
  }

  // 4. NATURAL BOULDERS & ROCK FORMATIONS
  const boulders: Boulder[] = [];
  const boulderCount = 65;

  for (let i = 0; i < boulderCount; i++) {
    const x = 80 + rand() * (worldWidth - 160);
    let y = 100 + rand() * (worldHeight - 200);
    if (Math.abs(y - 400) < 40) y += 50;
    if (Math.abs(y - 900) < 40) y += 50;
    if (Math.abs(y - 1400) < 40) y -= 50;

    const radius = 14 + rand() * 22;
    const vertices = 7 + Math.floor(rand() * 4);
    const points: { r: number; angle: number }[] = [];

    for (let v = 0; v < vertices; v++) {
      const angle = (v / vertices) * Math.PI * 2;
      const r = radius * (0.8 + rand() * 0.35);
      points.push({ r, angle });
    }

    let baseColor = '#475569';
    let highlightColor = '#94a3b8';
    let shadowColor = '#1e293b';
    let hasMoss = false;

    if (x < worldWidth * 0.45) {
      baseColor = '#475569';
      highlightColor = '#cbd5e1';
      shadowColor = '#0f172a';
      hasMoss = rand() > 0.4;
    } else if (x > worldWidth * 0.55) {
      baseColor = '#18181b';
      highlightColor = '#7f1d1d';
      shadowColor = '#09090b';
      hasMoss = false;
    } else {
      baseColor = '#3f3f46';
      highlightColor = '#71717a';
      shadowColor = '#18181b';
      hasMoss = rand() > 0.7;
    }

    boulders.push({
      x,
      y,
      radius,
      points,
      baseColor,
      highlightColor,
      shadowColor,
      hasMoss,
    });
  }

  // 5. SMOLDERING WAR CRATERS
  const craters: TerrainCrater[] = [];
  const craterCount = 20;

  for (let i = 0; i < craterCount; i++) {
    // Mostly along the center and eastern front
    const x = worldWidth * 0.4 + rand() * (worldWidth * 0.55);
    const y = 200 + rand() * (worldHeight - 400);
    const radius = 22 + rand() * 32;
    const depth = 6 + rand() * 8;
    const glowColor = x > worldWidth * 0.55 ? '#ef4444' : '#eab308';

    craters.push({
      x,
      y,
      radius,
      depth,
      glowColor,
    });
  }

  return {
    northMountains,
    southMountains,
    trees,
    grassTufts,
    boulders,
    craters,
  };
}

/**
 * High-performance realistic battlefield environment renderer.
 * Efficiently culls non-visible elements based on camera viewport.
 */
export function renderRealisticBattlefield(
  ctx: CanvasRenderingContext2D,
  env: BattlefieldEnvironment,
  worldWidth: number,
  worldHeight: number,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
  now: number
): void {
  // Viewport culling boundaries with generous padding
  const pad = 120;
  const left = cameraX - viewWidth / 2 - pad;
  const right = cameraX + viewWidth / 2 + pad;
  const top = cameraY - viewHeight / 2 - pad;
  const bottom = cameraY + viewHeight / 2 + pad;

  // 1. BASE REAL-LIFE BATTLEFIELD TERRAIN GRADIENT
  const groundGrad = ctx.createLinearGradient(0, 0, worldWidth, 0);
  groundGrad.addColorStop(0, '#142318'); // Deva lush Himalayan alpine foothills
  groundGrad.addColorStop(0.28, '#1b2f22'); // Mountain green meadow
  groundGrad.addColorStop(0.44, '#262822'); // Transition battle valley
  groundGrad.addColorStop(0.52, '#2d231b'); // Churned frontline trenches & earth
  groundGrad.addColorStop(0.66, '#281316'); // Volcanic dark rock soil
  groundGrad.addColorStop(1, '#150608'); // Nether obsidian brimstone

  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // 2. PROCEDURAL TERRAIN TEXTURE VARIATION (Dirt patches, scree, turf)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  const patchGrid = 160;
  for (let px = 0; px < worldWidth; px += patchGrid) {
    if (px < left - patchGrid || px > right) continue;
    for (let py = 0; py < worldHeight; py += patchGrid) {
      if (py < top - patchGrid || py > bottom) continue;
      const seed = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
      const n = seed - Math.floor(seed);
      if (n > 0.45) {
        ctx.beginPath();
        ctx.ellipse(px + 80, py + 80, 50 * n, 30 * n, n * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. SMOLDERING WAR CRATERS
  for (const c of env.craters) {
    if (c.x < left - c.radius || c.x > right + c.radius) continue;
    if (c.y < top - c.radius || c.y > bottom + c.radius) continue;

    // Outer blast scorch ring
    ctx.fillStyle = 'rgba(10, 10, 12, 0.85)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.radius + 6, c.radius * 0.75 + 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner crater bowl
    const craterGrad = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.radius);
    craterGrad.addColorStop(0, c.glowColor);
    craterGrad.addColorStop(0.4, 'rgba(40, 10, 10, 0.9)');
    craterGrad.addColorStop(1, 'rgba(15, 7, 7, 0.95)');
    ctx.fillStyle = craterGrad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.radius, c.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing ember flecks
    const pulse = (Math.sin(now * 4 + c.x) + 1) * 0.5;
    ctx.fillStyle = `rgba(251, 146, 60, ${0.4 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(c.x + Math.sin(c.y) * 8, c.y + Math.cos(c.x) * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. PROCEDURAL GRASS TUFTS & WILDFLOWERS (With animated wind sway)
  const windSway = Math.sin(now * 3.5) * 3.5;
  for (const tuft of env.grassTufts) {
    if (tuft.x < left || tuft.x > right) continue;
    if (tuft.y < top || tuft.y > bottom) continue;

    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';

    for (const b of tuft.blades) {
      ctx.strokeStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(tuft.x + b.dx, tuft.y);
      // Curve blade with wind sway
      const tipX = tuft.x + b.dx + b.tilt * 8 + windSway;
      const tipY = tuft.y - b.length;
      ctx.quadraticCurveTo(
        tuft.x + b.dx + windSway * 0.5,
        tuft.y - b.length * 0.6,
        tipX,
        tipY
      );
      ctx.stroke();

      // Flower blossom on top blade if present
      if (tuft.hasFlower && tuft.flowerColor && b === tuft.blades[0]) {
        ctx.fillStyle = tuft.flowerColor;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5. NATURAL BOULDERS & ROCK FORMATIONS
  for (const b of env.boulders) {
    if (b.x < left - b.radius || b.x > right + b.radius) continue;
    if (b.y < top - b.radius || b.y > bottom + b.radius) continue;

    // Soft drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(b.x + 4, b.y + b.radius * 0.65, b.radius * 1.1, b.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boulder body with multi-vertex facet
    ctx.fillStyle = b.baseColor;
    ctx.beginPath();
    for (let i = 0; i < b.points.length; i++) {
      const pt = b.points[i];
      const px = b.x + Math.cos(pt.angle) * pt.r;
      const py = b.y + Math.sin(pt.angle) * pt.r * 0.85;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Top Highlight Facet
    ctx.fillStyle = b.highlightColor;
    ctx.beginPath();
    ctx.ellipse(b.x - 3, b.y - b.radius * 0.25, b.radius * 0.55, b.radius * 0.35, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Moss patch on top (Devas)
    if (b.hasMoss) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(b.x - 2, b.y - b.radius * 0.3, b.radius * 0.4, b.radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. REALISTIC ANCIENT TREES & WOODLANDS
  for (const t of env.trees) {
    if (t.x < left - t.size * 1.5 || t.x > right + t.size * 1.5) continue;
    if (t.y < top - t.size * 1.5 || t.y > bottom + t.size * 1.5) continue;

    const sway = Math.sin(now * 2 + t.seed) * 2;

    // Directional Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(
      t.x + t.size * 0.4,
      t.y + t.size * 0.65,
      t.size * 0.9,
      t.size * 0.45,
      0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (t.type === 'BANYAN') {
      // Magnificent Ancient Banyan Tree
      // Sprawling prop roots
      ctx.strokeStyle = t.trunkColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(t.x - 12, t.y + 14);
      ctx.lineTo(t.x, t.y - 4);
      ctx.lineTo(t.x + 12, t.y + 14);
      ctx.stroke();

      // Thick Main Trunk
      ctx.fillStyle = t.trunkColor;
      ctx.fillRect(t.x - 6, t.y - 12, 12, 22);

      // Multi-layered lush green canopy with leaf textures
      ctx.fillStyle = t.foliageColor;
      ctx.beginPath();
      ctx.arc(t.x + sway, t.y - 20, t.size * 0.85, 0, Math.PI * 2);
      ctx.arc(t.x - t.size * 0.45 + sway, t.y - 14, t.size * 0.55, 0, Math.PI * 2);
      ctx.arc(t.x + t.size * 0.45 + sway, t.y - 14, t.size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Canopy highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(t.x - 6 + sway, t.y - 28, t.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === 'HIMALAYAN_PINE') {
      // Tall Layered Himalayan Conifer Pine
      ctx.fillStyle = t.trunkColor;
      ctx.fillRect(t.x - 3.5, t.y - 10, 7, 20);

      // 3 Stacked Conical Pine Layers
      ctx.fillStyle = t.foliageColor;
      for (let layer = 0; layer < 3; layer++) {
        const ly = t.y - 12 - layer * (t.size * 0.4);
        const lw = t.size * (0.85 - layer * 0.22);
        const lh = t.size * 0.45;
        ctx.beginPath();
        ctx.moveTo(t.x + sway * (layer * 0.4), ly - lh);
        ctx.lineTo(t.x - lw / 2, ly);
        ctx.lineTo(t.x + lw / 2, ly);
        ctx.closePath();
        ctx.fill();
      }
    } else if (t.type === 'ASHOKA') {
      // Flowering Sacred Ashoka Tree
      ctx.fillStyle = t.trunkColor;
      ctx.fillRect(t.x - 4, t.y - 8, 8, 18);

      // Lush Orange/Vermilion Flowering Canopy
      ctx.fillStyle = t.foliageColor;
      ctx.beginPath();
      ctx.ellipse(t.x + sway, t.y - 18, t.size * 0.65, t.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden blossom sparkles
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(t.x - 8 + sway, t.y - 24, 2.5, 0, Math.PI * 2);
      ctx.arc(t.x + 7 + sway, t.y - 14, 2.5, 0, Math.PI * 2);
      ctx.arc(t.x + sway, t.y - 28, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === 'CHARRED_IRONWOOD') {
      // Asura Scorched Dead Ironwood
      ctx.strokeStyle = t.trunkColor;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y + 10);
      ctx.lineTo(t.x - 4, t.y - 14);
      // Gnarled branching
      ctx.lineTo(t.x - 18, t.y - 32);
      ctx.moveTo(t.x - 4, t.y - 14);
      ctx.lineTo(t.x + 16, t.y - 28);
      ctx.stroke();

      // Glowing Ember fissures inside charred timber
      const emberPulse = (Math.sin(now * 5 + t.seed) + 1) * 0.5;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + emberPulse * 0.5})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(t.x - 2, t.y + 5);
      ctx.lineTo(t.x - 4, t.y - 12);
      ctx.stroke();
    } else {
      // Obsidian Spire
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - t.size * 1.1);
      ctx.lineTo(t.x - t.size * 0.35, t.y + 8);
      ctx.lineTo(t.x + t.size * 0.35, t.y + 8);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 7. PANORAMIC MOUNTAIN RIDGES (NORTH & SOUTH HORIZONS)
  // Draw Northern Mountain Silhouette
  for (const peak of env.northMountains) {
    if (peak.x < left - peak.width || peak.x > right + peak.width) continue;

    // Mountain Peak Body
    ctx.fillStyle = peak.baseColor;
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.height);
    ctx.lineTo(peak.x - peak.width / 2, 0);
    ctx.lineTo(peak.x + peak.width / 2, 0);
    ctx.closePath();
    ctx.fill();

    // Snow Cap (Devas) or Glowing Ridge (Asuras)
    if (peak.type === 'SNOW_HIMALAYA') {
      ctx.fillStyle = peak.snowColor;
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.height);
      ctx.lineTo(peak.x - peak.width * 0.22, peak.height - peak.snowHeight * 0.5);
      ctx.lineTo(peak.x + peak.width * 0.22, peak.height - peak.snowHeight * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (peak.type === 'VOLCANIC_CRAG' && peak.lavaVein) {
      // Molten lava vein running down the dark peak
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.height);
      ctx.lineTo(peak.x + 6, peak.height - 35);
      ctx.lineTo(peak.x - 4, peak.height - 65);
      ctx.stroke();
    }
  }

  // Draw Southern Mountain Silhouette
  for (const peak of env.southMountains) {
    if (peak.x < left - peak.width || peak.x > right + peak.width) continue;

    ctx.fillStyle = peak.baseColor;
    ctx.beginPath();
    ctx.moveTo(peak.x, worldHeight - peak.height);
    ctx.lineTo(peak.x - peak.width / 2, worldHeight);
    ctx.lineTo(peak.x + peak.width / 2, worldHeight);
    ctx.closePath();
    ctx.fill();

    if (peak.type === 'SNOW_HIMALAYA') {
      ctx.fillStyle = peak.snowColor;
      ctx.beginPath();
      ctx.moveTo(peak.x, worldHeight - peak.height);
      ctx.lineTo(peak.x - peak.width * 0.22, worldHeight - peak.height + peak.snowHeight * 0.5);
      ctx.lineTo(peak.x + peak.width * 0.22, worldHeight - peak.height + peak.snowHeight * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (peak.type === 'VOLCANIC_CRAG' && peak.lavaVein) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(peak.x, worldHeight - peak.height);
      ctx.lineTo(peak.x - 5, worldHeight - peak.height + 35);
      ctx.stroke();
    }
  }

  // 8. AMBIENT DRIFTING PARTICLES (Golden pollen / leaves in West, embers in East)
  const particleCount = 18;
  for (let i = 0; i < particleCount; i++) {
    const px = left + ((i * 147 + now * 40) % (viewWidth + 200));
    const py = top + ((i * 89 + Math.sin(now + i) * 60) % (viewHeight + 200));

    if (px < worldWidth * 0.45) {
      // Golden Deva Pollen
      ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (px > worldWidth * 0.55) {
      // Red Nether Ember
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
