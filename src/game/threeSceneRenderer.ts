import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BattlefieldParticle,
  BattlefieldUnit,
  HeroClass,
  PlayerCharacter,
  PowerShrine,
  Projectile,
} from './types';
import { BattlefieldEnvironment } from './battlefieldTerrain';
import { BATTLEFIELD_ROUTES, WORLD_HEIGHT, WORLD_WIDTH } from './battlefieldEngine';

export type CameraPerspectiveMode = 'SHOULDER' | 'TACTICAL';

// Detect software WebGL (SwiftShader, llvmpipe) from GPU renderer string
export const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

// Pre-allocated math helpers to avoid per-frame GC
const _vec3 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndcMouse = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _intersectPt = new THREE.Vector3();

interface UnitRig {
  group: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  capeMesh: THREE.Mesh;
  auraMesh: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  bodyMaterials: THREE.MeshStandardMaterial[];
  lastHp: number;
  attackSwingPhase: number;
  walkPhase: number;
  lastX: number;
  lastZ: number;
}

interface ShrineRig {
  group: THREE.Group;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  crystalMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  zoneRing: THREE.Mesh;
  pointLight: THREE.PointLight;
}

interface CloudCluster {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  puffs: THREE.Mesh[];
}

export class ThreeSceneRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public cameraMode: CameraPerspectiveMode = 'SHOULDER';

  private container: HTMLElement;
  private unitRigs = new Map<string, UnitRig>();
  private projectileMeshes = new Map<string, THREE.Object3D>();
  private shrineRigs = new Map<string, ShrineRig>();
  private particlePool: THREE.Mesh[] = [];
  private clouds: CloudCluster[] = [];

  private skyMaterial!: THREE.ShaderMaterial;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private devaCampLotus!: THREE.Group;
  private asuraAltarCrystal!: THREE.Mesh;

  // Shared materials cache
  private matCache = new Map<string, THREE.Material>();

  // Smooth camera state
  private currentCamPos = new THREE.Vector3(450, 180, 1100);
  private currentLookAt = new THREE.Vector3(600, 20, 900);
  private smoothAimAngle = 0;
  private playerAttackVisualTimer = 0;

  constructor(container: HTMLElement, env: BattlefieldEnvironment, playerFaction: 'DEVAS' | 'ASURAS') {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x141824, 0.00038);

    // Studio environment map for realistic metallic gold & obsidian reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      2,
      5500
    );

    this.smoothAimAngle = playerFaction === 'DEVAS' ? 0 : Math.PI;
    const startX = playerFaction === 'DEVAS' ? 450 : WORLD_WIDTH - 450;
    this.currentCamPos.set(startX - Math.cos(this.smoothAimAngle) * 190, 95, WORLD_HEIGHT / 2 + 40);
    this.currentLookAt.set(startX + Math.cos(this.smoothAimAngle) * 120, 22, WORLD_HEIGHT / 2);

    this.initLights();
    this.initDualFactionSkyAndClouds();
    this.initTerrainAndStructures(env);
    this.initParticlePool();

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public groundHeightAt(x: number, z: number): number {
    // Gentle valley bowl with raised mountain perimeters on North (z < 180) and South (z > WORLD_HEIGHT - 180)
    let h = 0;
    if (z < 180) {
      const t = (180 - z) / 180;
      h += t * t * 38;
    } else if (z > WORLD_HEIGHT - 180) {
      const t = (z - (WORLD_HEIGHT - 180)) / 180;
      h += t * t * 38;
    }
    // Subtle rolling hills across battlefield
    h += Math.sin(x * 0.004) * Math.cos(z * 0.004) * 3.5;
    return h;
  }

  private initLights() {
    // Warm/Cool Hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0xfde68a, 0x1e1b4b, 0.95);
    this.hemiLight.position.set(WORLD_WIDTH / 2, 800, WORLD_HEIGHT / 2);
    this.scene.add(this.hemiLight);

    // Key Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    this.sunLight.position.set(350, 680, WORLD_HEIGHT * 0.35);
    this.sunLight.target.position.set(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);
    this.scene.add(this.sunLight.target);

    if (!isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 100;
      this.sunLight.shadow.camera.far = 2600;
      const d = 1400;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    // Secondary Crimson Rim Light from the East (Asura Volcanic Glow)
    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.15);
    rimLight.position.set(WORLD_WIDTH + 300, 420, WORLD_HEIGHT * 0.65);
    rimLight.target.position.set(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);
    this.scene.add(rimLight.target);
    this.scene.add(rimLight);
  }

  private initDualFactionSkyAndClouds() {
    // 1. Seamless Dual-Faction Sky Dome Shader
    // West (-X): Golden Celestial Sunrise & Azure Heavens (Devas)
    // East (+X): Stormy Obsidian-Crimson Volcanic Sky & Lightning (Asuras)
    const skyGeo = new THREE.SphereGeometry(3400, 48, 32);
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uWorldCenterX: { value: WORLD_WIDTH / 2 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform float uWorldCenterX;

        void main() {
          vec3 dir = normalize(vWorldPos - vec3(uWorldCenterX, 0.0, 900.0));
          float elevation = clamp(dir.y, -0.1, 1.0);
          // Faction blend: 0.0 = Full Deva West (-X), 1.0 = Full Asura East (+X)
          float factionMix = smoothstep(-0.65, 0.65, dir.x);

          // Deva Celestial Sky Colors (Golden Dawn Horizon -> Deep Azure Zenith)
          vec3 devaHorizon = vec3(0.98, 0.72, 0.28);
          vec3 devaMid = vec3(0.22, 0.62, 0.92);
          vec3 devaZenith = vec3(0.06, 0.18, 0.42);
          vec3 devaSky = mix(
            devaHorizon,
            mix(devaMid, devaZenith, smoothstep(0.15, 0.75, max(0.0, elevation))),
            smoothstep(0.0, 0.28, max(0.0, elevation))
          );

          // Sunburst glow in Western sky
          vec3 sunDir = normalize(vec3(-0.78, 0.26, -0.15));
          float sunDot = max(0.0, dot(dir, sunDir));
          devaSky += vec3(1.0, 0.88, 0.55) * pow(sunDot, 16.0) * 0.85;
          devaSky += vec3(1.0, 0.95, 0.8) * smoothstep(0.996, 0.9995, sunDot) * 2.0;

          // Asura Volcanic Storm Sky Colors (Molten Crimson Horizon -> Dark Violet/Obsidian Zenith)
          vec3 asuraHorizon = vec3(0.75, 0.12, 0.18);
          vec3 asuraMid = vec3(0.24, 0.05, 0.16);
          vec3 asuraZenith = vec3(0.04, 0.02, 0.06);
          vec3 asuraSky = mix(
            asuraHorizon,
            mix(asuraMid, asuraZenith, smoothstep(0.15, 0.75, max(0.0, elevation))),
            smoothstep(0.0, 0.28, max(0.0, elevation))
          );

          // Distant volcanic storm lightning flash in East sky
          vec3 stormDir = normalize(vec3(0.78, 0.22, 0.15));
          float stormDot = max(0.0, dot(dir, stormDir));
          float flash = pow(max(0.0, sin(uTime * 3.7) * sin(uTime * 11.3)), 8.0);
          asuraSky += vec3(0.95, 0.25, 0.35) * pow(stormDot, 8.0) * (0.35 + flash * 1.4);

          // Nebula / aurora veil across zenith
          float aurora = sin(dir.z * 6.0 + uTime * 0.4) * cos(dir.x * 5.0 - uTime * 0.3);
          vec3 finalSky = mix(devaSky, asuraSky, factionMix);
          finalSky += mix(vec3(0.15, 0.45, 0.55), vec3(0.45, 0.08, 0.18), factionMix) * max(0.0, aurora) * 0.12 * smoothstep(0.1, 0.5, elevation);

          gl_FragColor = vec4(finalSky, 1.0);
        }
      `,
    });

    const skyDome = new THREE.Mesh(skyGeo, this.skyMaterial);
    skyDome.position.set(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);
    this.scene.add(skyDome);

    // 2. 3D Blazing Celestial Sun Orb (West) & Eclipsed Blood Moon (East)
    const sunOrbGeo = new THREE.SphereGeometry(95, 24, 24);
    const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
    sunOrb.position.set(-900, 620, 450);
    this.scene.add(sunOrb);

    const bloodMoonGeo = new THREE.SphereGeometry(85, 24, 24);
    const bloodMoonMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const bloodMoon = new THREE.Mesh(bloodMoonGeo, bloodMoonMat);
    bloodMoon.position.set(WORLD_WIDTH + 900, 560, 1250);
    this.scene.add(bloodMoon);

    // 3. Volumetric 3D Cloud Clusters Drifting Across the Sky
    const puffGeo = new THREE.DodecahedronGeometry(1, 1);
    const cloudCount = 46;

    for (let i = 0; i < cloudCount; i++) {
      const clusterGroup = new THREE.Group();
      const bx = -600 + Math.random() * (WORLD_WIDTH + 1200);
      const by = 290 + Math.random() * 240;
      const bz = -500 + Math.random() * (WORLD_HEIGHT + 1000);
      const speed = 12 + Math.random() * 18;

      const isEast = bx > WORLD_WIDTH * 0.52;
      const cloudMat = new THREE.MeshStandardMaterial({
        color: isEast ? 0x27272a : 0xfffbeb,
        emissive: isEast ? 0x7f1d1d : 0xfde68a,
        emissiveIntensity: isEast ? 0.35 : 0.18,
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.86,
      });

      const puffs: THREE.Mesh[] = [];
      const numPuffs = 4 + Math.floor(Math.random() * 4);
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        const rx = 38 + Math.random() * 42;
        const ry = 18 + Math.random() * 18;
        const rz = 28 + Math.random() * 32;
        puff.scale.set(rx, ry, rz);
        puff.position.set(
          (p - numPuffs / 2) * 34 + (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 24
        );
        clusterGroup.add(puff);
        puffs.push(puff);
      }

      clusterGroup.position.set(bx, by, bz);
      this.scene.add(clusterGroup);
      this.clouds.push({
        group: clusterGroup,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        speed,
        puffs,
      });
    }
  }

  private createTerrainTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Faction-blended base gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0.0, '#143321'); // Deva lush Himalayan emerald foothills
    grad.addColorStop(0.28, '#1d3f28'); // Sacred grove meadow
    grad.addColorStop(0.45, '#3b3526'); // Kurukshetra trampled war earth
    grad.addColorStop(0.55, '#422c20'); // Scorched frontline trenches
    grad.addColorStop(0.72, '#2d1215'); // Volcanic dark rock soil
    grad.addColorStop(1.0, '#160709'); // Asura obsidian brimstone
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Organic terrain detail noise, stone tiles, and magma cracks
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 2 + Math.random() * 12;
      if (x < canvas.width * 0.42) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(250, 204, 21, 0.05)';
      } else if (x > canvas.width * 0.58) {
        ctx.fillStyle = Math.random() > 0.7 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(9, 9, 11, 0.25)';
      } else {
        ctx.fillStyle = 'rgba(120, 113, 108, 0.1)';
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
    return texture;
  }

  private initTerrainAndStructures(env: BattlefieldEnvironment) {
    // 1. 3D Sculpted Ground Plane (extends beyond playable bounds for natural horizon)
    const padX = 1400;
    const padZ = 1200;
    const totalW = WORLD_WIDTH + padX * 2;
    const totalH = WORLD_HEIGHT + padZ * 2;
    const groundGeo = new THREE.PlaneGeometry(totalW, totalH, 110, 80);
    groundGeo.rotateX(-Math.PI / 2);

    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) + WORLD_WIDTH / 2;
      const vz = posAttr.getZ(i) + WORLD_HEIGHT / 2;
      posAttr.setY(i, this.groundHeightAt(vx, vz));
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: this.createTerrainTexture(),
      roughness: 0.88,
      metalness: 0.06,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);
    groundMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(groundMesh);

    // 2. 3D Raised Stone War Highways (BATTLEFIELD_ROUTES)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.75,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const roadTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.45,
      metalness: 0.65,
    });

    for (const route of BATTLEFIELD_ROUTES) {
      for (let i = 0; i < route.points.length - 1; i++) {
        const [x1, z1] = route.points[i];
        const [x2, z2] = route.points[i + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const angle = Math.atan2(z2 - z1, x2 - x1);

        const segGeo = new THREE.BoxGeometry(len + 16, 2.2, route.width);
        const segMesh = new THREE.Mesh(segGeo, roadMat);
        segMesh.position.set(midX, this.groundHeightAt(midX, midZ) + 0.6, midZ);
        segMesh.rotation.y = -angle;
        segMesh.receiveShadow = !isSoftwareGl;
        this.scene.add(segMesh);

        // Raised golden/stone curbstone trim
        const curbGeo = new THREE.BoxGeometry(len, 2.8, 3);
        const leftCurb = new THREE.Mesh(curbGeo, roadTrimMat);
        leftCurb.position.set(
          midX + Math.sin(angle) * (route.width * 0.48),
          this.groundHeightAt(midX, midZ) + 0.9,
          midZ + Math.cos(angle) * (route.width * 0.48)
        );
        leftCurb.rotation.y = -angle;
        this.scene.add(leftCurb);
      }
    }

    // 3. 3D Mountain Peaks (North & South Horizons + Far West/East Peaks)
    this.build3DMountains(env);

    // 4. 3D Trees, Boulders, Craters & Swaying Grass
    this.build3DEnvironmentProps(env);

    // 5. 3D Faction Sanctuaries & Camp Buildings (Deva Gopuram & Asura Citadel)
    this.buildDevaSanctuary3D();
    this.buildAsuraCitadel3D();
  }

  private build3DMountains(env: BattlefieldEnvironment) {
    const allPeaks = [
      ...env.northMountains.map((p) => ({ ...p, zPos: -80 - Math.random() * 90 })),
      ...env.southMountains.map((p) => ({ ...p, zPos: WORLD_HEIGHT + 80 + Math.random() * 90 })),
    ];

    for (const peak of allPeaks) {
      const mGroup = new THREE.Group();
      const radius = peak.width * 0.75;
      const height = peak.height * 2.4;

      const rockColor =
        peak.type === 'SNOW_HIMALAYA'
          ? 0x334155
          : peak.type === 'VOLCANIC_CRAG'
          ? 0x18181b
          : 0x475569;

      const baseGeo = new THREE.ConeGeometry(radius, height, 7);
      const baseMat = new THREE.MeshStandardMaterial({
        color: rockColor,
        roughness: 0.85,
        metalness: 0.12,
        flatShading: true,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = height * 0.5;
      mGroup.add(baseMesh);

      // Secondary flanking ridge peak for composite silhouette
      const subGeo = new THREE.ConeGeometry(radius * 0.65, height * 0.72, 6);
      const subMesh = new THREE.Mesh(subGeo, baseMat);
      subMesh.position.set(radius * 0.45, height * 0.36, 15);
      mGroup.add(subMesh);

      // Snow Cap or Volcanic Lava Cap
      const capHeight = height * 0.42;
      const capRadius = radius * 0.43;
      const capGeo = new THREE.ConeGeometry(capRadius, capHeight, 7);
      const isVolcano = peak.type === 'VOLCANIC_CRAG';
      const capMat = new THREE.MeshStandardMaterial({
        color: isVolcano ? 0xdc2626 : 0xf8fafc,
        emissive: isVolcano ? 0xef4444 : 0x38bdf8,
        emissiveIntensity: isVolcano ? 0.65 : 0.08,
        roughness: isVolcano ? 0.4 : 0.6,
        metalness: 0.1,
        flatShading: true,
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.y = height - capHeight * 0.48;
      mGroup.add(capMesh);

      mGroup.position.set(peak.x, -10, peak.zPos);
      mGroup.rotation.y = (peak.x * 0.1) % (Math.PI * 2);
      this.scene.add(mGroup);
    }
  }

  private build3DEnvironmentProps(env: BattlefieldEnvironment) {
    // 1. Multi-Part 3D Trees
    const trunkGeo = new THREE.CylinderGeometry(2.5, 4.2, 22, 7);
    const sphereFoliageGeo = new THREE.DodecahedronGeometry(14, 1);
    const coneFoliageGeo = new THREE.ConeGeometry(14, 24, 7);
    const spireGeo = new THREE.OctahedronGeometry(10, 0);

    for (const t of env.trees) {
      const treeGroup = new THREE.Group();
      const scale = t.size / 36;
      const groundY = this.groundHeightAt(t.x, t.y);

      const trunkMat = new THREE.MeshStandardMaterial({
        color: t.trunkColor,
        roughness: 0.9,
        metalness: 0.05,
      });

      if (t.type === 'OBSIDIAN_SPIRE') {
        const spireMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          emissive: 0xdc2626,
          emissiveIntensity: 0.45,
          roughness: 0.25,
          metalness: 0.8,
          flatShading: true,
        });
        const mainSpire = new THREE.Mesh(spireGeo, spireMat);
        mainSpire.scale.set(0.8 * scale, 2.8 * scale, 0.8 * scale);
        mainSpire.position.y = 22 * scale;
        treeGroup.add(mainSpire);

        const subSpire = new THREE.Mesh(spireGeo, spireMat);
        subSpire.scale.set(0.5 * scale, 1.6 * scale, 0.5 * scale);
        subSpire.position.set(8 * scale, 12 * scale, 4 * scale);
        subSpire.rotation.z = -0.25;
        treeGroup.add(subSpire);
      } else {
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 11 * scale;
        trunk.scale.setScalar(scale);
        trunk.castShadow = !isSoftwareGl;
        treeGroup.add(trunk);

        const foliageMat = new THREE.MeshStandardMaterial({
          color: t.foliageColor,
          emissive: t.type === 'ASHOKA' ? 0xea580c : t.type === 'CHARRED_IRONWOOD' ? 0x7f1d1d : 0x000000,
          emissiveIntensity: t.type === 'ASHOKA' || t.type === 'CHARRED_IRONWOOD' ? 0.25 : 0,
          roughness: 0.78,
          metalness: 0.08,
          flatShading: true,
        });

        if (t.type === 'HIMALAYAN_PINE') {
          for (let l = 0; l < 3; l++) {
            const cone = new THREE.Mesh(coneFoliageGeo, foliageMat);
            const ls = scale * (1.15 - l * 0.24);
            cone.scale.set(ls, scale * 0.95, ls);
            cone.position.y = (20 + l * 13) * scale;
            cone.castShadow = !isSoftwareGl;
            treeGroup.add(cone);
          }
        } else {
          // Banyan / Ashoka / Ironwood multi-dome canopy
          const mainDome = new THREE.Mesh(sphereFoliageGeo, foliageMat);
          mainDome.scale.set(1.25 * scale, 0.95 * scale, 1.25 * scale);
          mainDome.position.y = 26 * scale;
          mainDome.castShadow = !isSoftwareGl;
          treeGroup.add(mainDome);

          const leftDome = new THREE.Mesh(sphereFoliageGeo, foliageMat);
          leftDome.scale.setScalar(0.8 * scale);
          leftDome.position.set(-10 * scale, 21 * scale, 5 * scale);
          treeGroup.add(leftDome);

          const rightDome = new THREE.Mesh(sphereFoliageGeo, foliageMat);
          rightDome.scale.setScalar(0.8 * scale);
          rightDome.position.set(10 * scale, 21 * scale, -5 * scale);
          treeGroup.add(rightDome);
        }
      }

      treeGroup.position.set(t.x, groundY, t.y);
      this.scene.add(treeGroup);
    }

    // 2. 3D Boulders
    const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
    for (const b of env.boulders) {
      const bGroup = new THREE.Group();
      const bMat = new THREE.MeshStandardMaterial({
        color: b.baseColor,
        roughness: 0.85,
        metalness: 0.12,
        flatShading: true,
      });
      const mainRock = new THREE.Mesh(boulderGeo, bMat);
      mainRock.scale.set(b.radius, b.radius * 0.72, b.radius * 0.9);
      mainRock.position.y = b.radius * 0.35;
      bGroup.add(mainRock);

      if (b.hasMoss) {
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 });
        const mossCap = new THREE.Mesh(boulderGeo, mossMat);
        mossCap.scale.set(b.radius * 0.75, b.radius * 0.35, b.radius * 0.7);
        mossCap.position.y = b.radius * 0.65;
        bGroup.add(mossCap);
      }

      bGroup.position.set(b.x, this.groundHeightAt(b.x, b.y), b.y);
      bGroup.rotation.y = b.x * 0.1;
      this.scene.add(bGroup);
    }

    // 3. 3D Smoldering War Craters
    for (const c of env.craters) {
      const cGroup = new THREE.Group();
      const rimGeo = new THREE.TorusGeometry(c.radius, 3.5, 8, 20);
      rimGeo.rotateX(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.9,
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.y = 1.0;
      cGroup.add(rim);

      const coreGeo = new THREE.CircleGeometry(c.radius * 0.88, 18);
      coreGeo.rotateX(-Math.PI / 2);
      const coreMat = new THREE.MeshBasicMaterial({
        color: c.glowColor,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.8;
      cGroup.add(core);

      cGroup.position.set(c.x, this.groundHeightAt(c.x, c.y), c.y);
      this.scene.add(cGroup);
    }

    // 4. Instanced 3D Grass Blades
    const grassGeo = new THREE.ConeGeometry(1.8, 9, 4);
    grassGeo.translate(0, 4.5, 0);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.05,
    });
    const instancedGrass = new THREE.InstancedMesh(grassGeo, grassMat, env.grassTufts.length);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    env.grassTufts.forEach((tuft, idx) => {
      const gy = this.groundHeightAt(tuft.x, tuft.y);
      dummy.position.set(tuft.x, gy, tuft.y);
      dummy.rotation.set(0, (idx * 1.7) % (Math.PI * 2), 0);
      const s = 0.85 + (idx % 5) * 0.12;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      instancedGrass.setMatrixAt(idx, dummy.matrix);

      col.set(tuft.blades[0]?.color || '#22c55e');
      instancedGrass.setColorAt(idx, col);
    });
    instancedGrass.instanceMatrix.needsUpdate = true;
    if (instancedGrass.instanceColor) instancedGrass.instanceColor.needsUpdate = true;
    instancedGrass.computeBoundingSphere();
    this.scene.add(instancedGrass);
  }

  private buildDevaSanctuary3D() {
    const campGroup = new THREE.Group();
    const baseY = this.groundHeightAt(250, 900);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.2,
      metalness: 0.85,
      roughness: 0.22,
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.45,
      metalness: 0.1,
    });
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
    });

    // 1. Sacred Mandala Sanctuary Plinth
    const plinthGeo = new THREE.CylinderGeometry(240, 255, 3, 40);
    const plinth = new THREE.Mesh(plinthGeo, marbleMat);
    plinth.position.set(250, baseY + 1.5, 900);
    plinth.receiveShadow = !isSoftwareGl;
    campGroup.add(plinth);

    // Golden outer ring
    const ringGeo = new THREE.TorusGeometry(242, 3, 12, 48);
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.position.set(250, baseY + 3.2, 900);
    campGroup.add(ring);

    // 2. Grand Golden Gopuram Temple Gateway (West edge of camp, x=95, z=900)
    const gopuram = new THREE.Group();
    gopuram.position.set(85, baseY + 3, 900);
    // 4 Temple Pillars
    const pillarGeo = new THREE.CylinderGeometry(6, 7.5, 65, 12);
    const pillarZOffsets = [-55, -25, 25, 55];
    for (const pz of pillarZOffsets) {
      const p = new THREE.Mesh(pillarGeo, goldMat);
      p.position.set(0, 32.5, pz);
      gopuram.add(p);
    }
    // 4 Stepped Gopuram Pyramid Tiers
    for (let tier = 0; tier < 4; tier++) {
      const w = 36 - tier * 5;
      const d = 140 - tier * 22;
      const h = 18;
      const tierGeo = new THREE.BoxGeometry(w, h, d);
      const tierMesh = new THREE.Mesh(tierGeo, tier % 2 === 0 ? goldMat : marbleMat);
      tierMesh.position.set(0, 68 + tier * 17, 0);
      gopuram.add(tierMesh);
    }
    // Kalasha Finials on top
    for (let k = -2; k <= 2; k++) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 12), cyanGlowMat);
      fin.position.set(0, 138, k * 16);
      gopuram.add(fin);
    }
    campGroup.add(gopuram);

    // 3. Sacred Amrita Healing Well (x=160, z=900)
    const wellGroup = new THREE.Group();
    wellGroup.position.set(160, baseY + 3, 900);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(48, 52, 8, 24), marbleMat);
    basin.position.y = 4;
    wellGroup.add(basin);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(43, 43, 8.6, 24), cyanGlowMat);
    water.position.y = 4.2;
    wellGroup.add(water);

    this.devaCampLotus = new THREE.Group();
    this.devaCampLotus.position.y = 10;
    const petalGeo = new THREE.ConeGeometry(6, 16, 5);
    petalGeo.rotateZ(Math.PI / 3);
    for (let i = 0; i < 8; i++) {
      const petal = new THREE.Mesh(petalGeo, goldMat);
      petal.rotation.y = (i * Math.PI * 2) / 8;
      petal.position.set(Math.cos(petal.rotation.y) * 14, 0, Math.sin(petal.rotation.y) * 14);
      this.devaCampLotus.add(petal);
    }
    wellGroup.add(this.devaCampLotus);
    campGroup.add(wellGroup);

    // 4. Quartermaster Armory Pavilion (x=250, z=820) & War Council Mandapa (x=250, z=980)
    campGroup.add(this.createPavilion3D(250, baseY + 3, 820, 0xf59e0b, 0xfde047));
    campGroup.add(this.createPavilion3D(250, baseY + 3, 980, 0x0284c7, 0x38bdf8));

    this.scene.add(campGroup);
  }

  private buildAsuraCitadel3D() {
    const campGroup = new THREE.Group();
    const baseX = WORLD_WIDTH - 250;
    const baseY = this.groundHeightAt(baseX, 900);

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.75,
    });
    const crimsonMetalMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.8,
    });
    const magmaGlowMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });

    // 1. Obsidian Citadel Dais
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(240, 255, 3, 16), obsidianMat);
    dais.position.set(baseX, baseY + 1.5, 900);
    campGroup.add(dais);

    const lavaRing = new THREE.Mesh(
      new THREE.TorusGeometry(242, 3.2, 10, 32).rotateX(Math.PI / 2),
      magmaGlowMat
    );
    lavaRing.position.set(baseX, baseY + 3.2, 900);
    campGroup.add(lavaRing);

    // 2. Towering Spiked Demon Citadel Gate (East edge, x=WORLD_WIDTH - 85, z=900)
    const gate = new THREE.Group();
    gate.position.set(WORLD_WIDTH - 85, baseY + 3, 900);
    for (const gz of [-60, 60]) {
      const bastion = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 95, 8), obsidianMat);
      bastion.position.set(0, 47.5, gz);
      gate.add(bastion);

      const hornSpire = new THREE.Mesh(new THREE.ConeGeometry(14, 48, 6), crimsonMetalMat);
      hornSpire.position.set(0, 118, gz);
      hornSpire.rotation.z = 0.25;
      gate.add(hornSpire);
    }
    const archBridge = new THREE.Mesh(new THREE.BoxGeometry(28, 18, 140), crimsonMetalMat);
    archBridge.position.set(0, 82, 0);
    gate.add(archBridge);
    campGroup.add(gate);

    // 3. Levitating Bloodstone Altar (x=WORLD_WIDTH - 160, z=900)
    const altarGroup = new THREE.Group();
    altarGroup.position.set(WORLD_WIDTH - 160, baseY + 3, 900);
    const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(44, 52, 9, 8), obsidianMat);
    altarBase.position.y = 4.5;
    altarGroup.add(altarBase);

    this.asuraAltarCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(22, 0), magmaGlowMat);
    this.asuraAltarCrystal.scale.set(0.75, 1.65, 0.75);
    this.asuraAltarCrystal.position.y = 36;
    altarGroup.add(this.asuraAltarCrystal);
    campGroup.add(altarGroup);

    // 4. Nether Forge Shop & Warlord Council Pavilion
    campGroup.add(this.createPavilion3D(baseX, baseY + 3, 820, 0x991b1b, 0xef4444, true));
    campGroup.add(this.createPavilion3D(baseX, baseY + 3, 980, 0x581c87, 0xc084fc, true));

    this.scene.add(campGroup);
  }

  private createPavilion3D(
    x: number,
    y: number,
    z: number,
    roofHex: number,
    trimHex: number,
    spiked: boolean = false
  ): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const baseMat = new THREE.MeshStandardMaterial({
      color: spiked ? 0x18181b : 0xfef3c7,
      roughness: 0.6,
      metalness: 0.3,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofHex,
      roughness: 0.35,
      metalness: 0.65,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: trimHex,
      emissive: trimHex,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.8,
    });

    // Platform
    const plat = new THREE.Mesh(new THREE.BoxGeometry(68, 4, 54), baseMat);
    plat.position.y = 2;
    g.add(plat);

    // 4 Corner Columns
    const colGeo = new THREE.CylinderGeometry(2.4, 2.8, 32, 8);
    for (const [cx, cz] of [
      [-28, -22],
      [28, -22],
      [-28, 22],
      [28, 22],
    ]) {
      const col = new THREE.Mesh(colGeo, trimMat);
      col.position.set(cx, 18, cz);
      g.add(col);
    }

    // Stepped Roof Canopy
    const roofGeo = new THREE.ConeGeometry(48, 26, spiked ? 6 : 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 45;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);

    // Finial Orb / Spike
    const finial = new THREE.Mesh(
      spiked ? new THREE.ConeGeometry(4, 14, 5) : new THREE.SphereGeometry(5, 12, 12),
      trimMat
    );
    finial.position.y = 60;
    g.add(finial);

    // 3D NPC Guardian standing in front of Pavilion
    const npcGroup = new THREE.Group();
    npcGroup.position.set(0, 4, 18);
    const npcTorso = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 16, 10), roofMat);
    npcTorso.position.y = 10;
    npcGroup.add(npcTorso);
    const npcHead = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 12), trimMat);
    npcHead.position.y = 21;
    npcGroup.add(npcHead);
    g.add(npcGroup);

    return g;
  }

  private getOrCreateShrineRig(shrine: PowerShrine): ShrineRig {
    let rig = this.shrineRigs.get(shrine.id);
    if (rig) return rig;

    const group = new THREE.Group();
    const gy = this.groundHeightAt(shrine.x, shrine.y);
    group.position.set(shrine.x, gy, shrine.y);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.2,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.25,
      metalness: 0.85,
    });

    // 3-Tiered Octagonal Pedestal
    for (let i = 0; i < 3; i++) {
      const r = 32 - i * 7;
      const step = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 4, 4.5, 8), stoneMat);
      step.position.y = 2.25 + i * 4.5;
      group.add(step);
    }

    // 4 Corner Obelisk Pillars around Shrine
    for (let c = 0; c < 4; c++) {
      const a = (c * Math.PI) / 2 + Math.PI / 4;
      const obelisk = new THREE.Mesh(new THREE.BoxGeometry(5, 32, 5), stoneMat);
      obelisk.position.set(Math.cos(a) * 34, 16, Math.sin(a) * 34);
      group.add(obelisk);
    }

    // Levitating Sacred Crystal Core
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.5,
    });
    const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(11, 0), crystalMat);
    crystalMesh.position.y = 34;
    group.add(crystalMesh);

    // 2 Rotating Sacred Rings
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(18, 1.4, 8, 28), goldMat);
    outerRing.position.y = 34;
    group.add(outerRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(14, 1.1, 8, 24), crystalMat);
    innerRing.position.y = 34;
    group.add(innerRing);

    // Towering Translucent Light Pillar Beam
    const beamGeo = new THREE.CylinderGeometry(12, 16, 360, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 190;
    group.add(beamMesh);

    // Capture Radius Ground Ring
    const zoneGeo = new THREE.RingGeometry(shrine.radius - 3, shrine.radius, 48);
    zoneGeo.rotateX(-Math.PI / 2);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const zoneRing = new THREE.Mesh(zoneGeo, zoneMat);
    zoneRing.position.y = 1.2;
    group.add(zoneRing);

    const pointLight = new THREE.PointLight(0x94a3b8, 2.5, 220);
    pointLight.position.y = 42;
    group.add(pointLight);

    this.scene.add(group);
    rig = { group, outerRing, innerRing, crystalMesh, beamMesh, zoneRing, pointLight };
    this.shrineRigs.set(shrine.id, rig);
    return rig;
  }

  private createArticulatedUnitRig(u: BattlefieldUnit, heroClass?: HeroClass): UnitRig {
    const group = new THREE.Group();
    const isDeva = u.faction === 'DEVAS';
    const isBoss = Boolean(u.isBoss || u.role === 'BOSS');
    const isHero = Boolean(u.isPlayer);

    const scale = isBoss ? 1.85 : isHero ? 1.32 : u.role === 'BRUTE' ? 1.2 : 0.96;
    group.scale.setScalar(scale);

    // PBR Materials with distinct metallic & roughness contrast
    const armorPrimaryMat = new THREE.MeshStandardMaterial({
      color: isDeva ? 0xfacc15 : 0x27272a,
      emissive: isDeva ? 0xb45309 : 0x450a0a,
      emissiveIntensity: isHero || isBoss ? 0.28 : 0.12,
      metalness: isDeva ? 0.86 : 0.72,
      roughness: isDeva ? 0.22 : 0.38,
    });
    const armorSecondaryMat = new THREE.MeshStandardMaterial({
      color: isDeva ? 0x0284c7 : 0x991b1b,
      metalness: 0.45,
      roughness: 0.52,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: isDeva ? 0xfcd34d : 0xa1a1aa,
      roughness: 0.65,
      metalness: 0.08,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: isDeva ? 0x38bdf8 : 0xf43f5e,
      emissive: isDeva ? 0x38bdf8 : 0xe11d48,
      emissiveIntensity: 0.95,
      roughness: 0.15,
    });

    const bodyMaterials = [armorPrimaryMat, armorSecondaryMat, skinMat];

    // 1. Ground Aura / Contact Shadow Ring
    const auraRadius = isBoss ? 22 : isHero ? 19 : 12;
    const auraGeo = new THREE.RingGeometry(auraRadius * 0.65, auraRadius, 24);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: isDeva ? (isHero || isBoss ? 0xfacc15 : 0x38bdf8) : 0xf43f5e,
      transparent: true,
      opacity: isHero || isBoss ? 0.65 : 0.28,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.y = 0.6;
    group.add(auraMesh);

    // 2. Articulated Left & Right Legs with Greaves
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0, 12, -3.6);
    const legGeo = new THREE.CylinderGeometry(2.2, 1.8, 12, 8);
    legGeo.translate(0, -6, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, armorPrimaryMat);
    leftLegPivot.add(leftLegMesh);
    group.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0, 12, 3.6);
    const rightLegMesh = new THREE.Mesh(legGeo, armorPrimaryMat);
    rightLegPivot.add(rightLegMesh);
    group.add(rightLegPivot);

    // 3. Articulated Upper Body Torso Group
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 12, 0);
    group.add(torsoGroup);

    // Armored Cuirass Chestplate
    const chestGeo = new THREE.CylinderGeometry(6.2, 4.6, 13, 10);
    chestGeo.translate(0, 6.5, 0);
    const chestMesh = new THREE.Mesh(chestGeo, armorSecondaryMat);
    chestMesh.castShadow = !isSoftwareGl;
    torsoGroup.add(chestMesh);

    // Breastplate Trim & Glowing Core Insignia
    const plateGeo = new THREE.BoxGeometry(3.2, 9.5, 9.8);
    plateGeo.translate(2.2, 7.0, 0);
    const plateMesh = new THREE.Mesh(plateGeo, armorPrimaryMat);
    torsoGroup.add(plateMesh);

    const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(2.0, 0), glowMat);
    coreGem.position.set(4.2, 7.5, 0);
    torsoGroup.add(coreGem);

    // Ornate Layered Pauldrons (Shoulders)
    const pauldronGeo = new THREE.SphereGeometry(4.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const leftPauldron = new THREE.Mesh(pauldronGeo, armorPrimaryMat);
    leftPauldron.position.set(0, 11.5, -7.2);
    leftPauldron.rotation.x = -0.35;
    torsoGroup.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeo, armorPrimaryMat);
    rightPauldron.position.set(0, 11.5, 7.2);
    rightPauldron.rotation.x = 0.35;
    torsoGroup.add(rightPauldron);

    // Flowing 3D Battle Cape (Angavastra)
    const capeGeo = new THREE.PlaneGeometry(11, 16, 2, 4);
    capeGeo.translate(0, -8, 0);
    const capeMat = new THREE.MeshStandardMaterial({
      color: isDeva ? 0xea580c : 0x7f1d1d,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const capeMesh = new THREE.Mesh(capeGeo, capeMat);
    capeMesh.position.set(-4.8, 12.5, 0);
    capeMesh.rotation.y = Math.PI / 2;
    capeMesh.rotation.x = 0.28;
    torsoGroup.add(capeMesh);

    // 4. Head, Eyes & Mythological Crown / Demon Horns
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 16.5, 0);
    torsoGroup.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 12), skinMat);
    headGroup.add(headMesh);

    // Glowing Divine / Demon Eyes
    const eyeGeo = new THREE.SphereGeometry(0.75, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, glowMat);
    leftEye.position.set(3.8, 0.8, -1.5);
    const rightEye = new THREE.Mesh(eyeGeo, glowMat);
    rightEye.position.set(3.8, 0.8, 1.5);
    headGroup.add(leftEye, rightEye);

    let haloMesh: THREE.Mesh | undefined;
    if (isDeva) {
      // Tall Golden Mukut Crown
      const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.3, 3.2, 10), armorPrimaryMat);
      crownBase.position.y = 3.2;
      headGroup.add(crownBase);

      const crownSpire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7.5, 8), armorPrimaryMat);
      crownSpire.position.y = 8.2;
      headGroup.add(crownSpire);

      if (isHero || isBoss) {
        // Vertical Sacred Solar Halo behind head
        const haloGeo = new THREE.TorusGeometry(7.2, 0.65, 8, 24);
        haloGeo.rotateY(Math.PI / 2);
        haloMesh = new THREE.Mesh(haloGeo, glowMat);
        haloMesh.position.set(-2.5, 3.5, 0);
        headGroup.add(haloMesh);
      }
    } else {
      // Curved Demonic Obsidian/Crimson War Horns
      const hornGeo = new THREE.ConeGeometry(1.6, 8.5, 7);
      const hornMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        emissive: 0x991b1b,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.8,
      });
      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(1.2, 5.5, -3.8);
      leftHorn.rotation.set(-0.55, 0, -0.35);
      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(1.2, 5.5, 3.8);
      rightHorn.rotation.set(0.55, 0, -0.35);
      headGroup.add(leftHorn, rightHorn);
    }

    // 5. Articulated Left & Right Arms + 3D Weapons
    const armGeo = new THREE.CylinderGeometry(1.7, 1.5, 10, 8);
    armGeo.translate(0, -5, 0);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0, 11.5, -7.2);
    const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
    leftArmPivot.add(leftArmMesh);
    torsoGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0, 11.5, 7.2);
    const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    rightArmPivot.add(rightArmMesh);
    torsoGroup.add(rightArmPivot);

    // Attach 3D Weapon to Right Hand & Shield/Bow to Left Hand
    this.attach3DWeapons(u, heroClass, rightArmPivot, leftArmPivot, armorPrimaryMat, glowMat);

    this.scene.add(group);
    return {
      group,
      torsoGroup,
      headGroup,
      leftLegPivot,
      rightLegPivot,
      leftArmPivot,
      rightArmPivot,
      capeMesh,
      auraMesh,
      haloMesh,
      bodyMaterials,
      lastHp: u.hp,
      attackSwingPhase: 0,
      walkPhase: Math.random() * 10,
      lastX: u.x,
      lastZ: u.y,
    };
  }

  private attach3DWeapons(
    u: BattlefieldUnit,
    heroClass: HeroClass | undefined,
    rightArm: THREE.Group,
    leftArm: THREE.Group,
    metalMat: THREE.MeshStandardMaterial,
    glowMat: THREE.MeshStandardMaterial
  ) {
    const isArcher = u.role === 'ARCHER' || heroClass === 'SURYA_ARCHER';
    const isMage = u.role === 'MAGE' || heroClass === 'RAVANA_SORCERER';
    const isBrute =
      u.role === 'BRUTE' ||
      u.isBoss ||
      heroClass === 'MAHISHA_BERSERKER' ||
      heroClass === 'TARAKA_TITAN';
    const isTrident = heroClass === 'RUDRA_VANGUARD';

    if (isArcher) {
      // 3D Curved Greatbow in Left Hand
      leftArm.rotation.z = Math.PI * 0.42;
      const bowCurve = new THREE.TorusGeometry(9.5, 0.85, 8, 20, Math.PI * 1.1);
      const bowMesh = new THREE.Mesh(bowCurve, metalMat);
      bowMesh.position.set(3, -9, 0);
      bowMesh.rotation.z = -Math.PI * 0.55;
      leftArm.add(bowMesh);

      // Luminous Arrow in Right Hand
      rightArm.rotation.z = Math.PI * 0.38;
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 18, 6), glowMat);
      arrowShaft.rotation.z = Math.PI / 2;
      arrowShaft.position.set(7, -9, 0);
      rightArm.add(arrowShaft);
    } else if (isMage) {
      // 3D Mystic Staff with Levitating Orb
      rightArm.rotation.z = Math.PI * 0.3;
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 26, 8), metalMat);
      staff.rotation.z = Math.PI / 2;
      staff.position.set(6, -9, 0);
      rightArm.add(staff);

      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(3.4, 0), glowMat);
      orb.position.set(20, -9, 0);
      rightArm.add(orb);
    } else if (isTrident) {
      // 3D Celestial Trishula (Trident)
      rightArm.rotation.z = Math.PI * 0.35;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 28, 8), metalMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.set(8, -9, 0);
      rightArm.add(shaft);

      for (const pz of [-2.6, 0, 2.6]) {
        const prong = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7.5, 6), glowMat);
        prong.rotation.z = -Math.PI / 2;
        prong.position.set(23 + (pz === 0 ? 2 : 0), -9, pz);
        rightArm.add(prong);
      }
    } else if (isBrute) {
      // Massive 3D Flanged Gada War-Mace
      rightArm.rotation.z = Math.PI * 0.35;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 22, 8), metalMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(6, -9, 0);
      rightArm.add(handle);

      const maceHead = new THREE.Mesh(new THREE.DodecahedronGeometry(4.8, 0), metalMat);
      maceHead.position.set(18, -9, 0);
      rightArm.add(maceHead);

      const maceGlow = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.7, 6, 16), glowMat);
      maceGlow.rotation.y = Math.PI / 2;
      maceGlow.position.set(18, -9, 0);
      rightArm.add(maceGlow);
    } else {
      // 3D Khadga Broadsword + Round Shield
      rightArm.rotation.z = Math.PI * 0.35;
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 4.5), metalMat);
      hilt.position.set(2, -9, 0);
      rightArm.add(hilt);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(19, 0.8, 2.4), glowMat);
      blade.position.set(12.5, -9, 0);
      rightArm.add(blade);

      // Ornate Shield on Left Arm
      leftArm.rotation.z = Math.PI * 0.22;
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 1.2, 16), metalMat);
      shield.position.set(2, -8, -2.5);
      leftArm.add(shield);
    }
  }

  private initParticlePool() {
    const geo = new THREE.OctahedronGeometry(1, 0);
    for (let i = 0; i < 160; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push(mesh);
    }
  }

  public triggerPlayerAttackSwing() {
    this.playerAttackVisualTimer = 0.28;
  }

  public screenToWorld(screenX: number, screenY: number, width: number, height: number): { x: number; y: number } {
    _ndcMouse.x = (screenX / width) * 2 - 1;
    _ndcMouse.y = -(screenY / height) * 2 + 1;
    _raycaster.setFromCamera(_ndcMouse, this.camera);
    if (_raycaster.ray.intersectPlane(_groundPlane, _intersectPt)) {
      return {
        x: Math.max(0, Math.min(WORLD_WIDTH, _intersectPt.x)),
        y: Math.max(0, Math.min(WORLD_HEIGHT, _intersectPt.z)),
      };
    }
    return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
  }

  public projectToScreen(
    worldX: number,
    worldY: number,
    worldZ: number,
    viewWidth: number,
    viewHeight: number
  ): { x: number; y: number; visible: boolean } {
    _projVec.set(worldX, worldY, worldZ);
    _projVec.project(this.camera);
    if (_projVec.z > 1.0) {
      return { x: -9999, y: -9999, visible: false };
    }
    return {
      x: (_projVec.x * 0.5 + 0.5) * viewWidth,
      y: (-(_projVec.y * 0.5) + 0.5) * viewHeight,
      visible: true,
    };
  }

  public updateAndRender(
    dt: number,
    now: number,
    player: PlayerCharacter,
    units: BattlefieldUnit[],
    projectiles: Projectile[],
    particles: BattlefieldParticle[],
    shrines: PowerShrine[],
    cameraShake: number,
    isMouseDown: boolean
  ) {
    // 1. Update Sky Shader & Drifting Volumetric 3D Clouds
    this.skyMaterial.uniforms.uTime.value = now;

    for (const c of this.clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > WORLD_WIDTH + 700) {
        c.group.position.x = -700;
      }
      c.group.position.y = c.baseY + Math.sin(now * 0.6 + c.baseZ) * 4;
    }

    // Animate Camp Landmarks
    if (this.devaCampLotus) {
      this.devaCampLotus.rotation.y = now * 0.6;
    }
    if (this.asuraAltarCrystal) {
      this.asuraAltarCrystal.rotation.y = -now * 1.1;
      this.asuraAltarCrystal.position.y = 36 + Math.sin(now * 2.5) * 4;
    }

    // 2. Sync 3D Shrines of Power
    for (const s of shrines) {
      const sRig = this.getOrCreateShrineRig(s);
      sRig.outerRing.rotation.x = now * 1.1;
      sRig.outerRing.rotation.y = now * 0.8;
      sRig.innerRing.rotation.z = -now * 1.4;
      sRig.innerRing.rotation.x = now * 0.6;
      sRig.crystalMesh.rotation.y = now * 1.5;
      sRig.crystalMesh.position.y = 34 + Math.sin(now * 3) * 3;

      const hexColor =
        s.controller === 'DEVAS' ? 0x38bdf8 : s.controller === 'ASURAS' ? 0xef4444 : 0x94a3b8;
      (sRig.crystalMesh.material as THREE.MeshStandardMaterial).color.setHex(hexColor);
      (sRig.crystalMesh.material as THREE.MeshStandardMaterial).emissive.setHex(hexColor);
      (sRig.beamMesh.material as THREE.MeshBasicMaterial).color.setHex(hexColor);
      (sRig.zoneRing.material as THREE.MeshBasicMaterial).color.setHex(hexColor);
      sRig.pointLight.color.setHex(hexColor);
    }

    // 3. Sync Articulated 3D Units (Players, Soldiers, Archers, Brutes, Mages, Bosses)
    const activeIds = new Set<string>();
    let playerUnit: BattlefieldUnit | undefined;

    if (isMouseDown && this.playerAttackVisualTimer <= 0) {
      this.playerAttackVisualTimer = 0.26;
    }
    if (this.playerAttackVisualTimer > 0) {
      this.playerAttackVisualTimer = Math.max(0, this.playerAttackVisualTimer - dt);
    }

    for (const u of units) {
      activeIds.add(u.id);
      if (u.isPlayer) playerUnit = u;

      let rig = this.unitRigs.get(u.id);
      if (!rig) {
        rig = this.createArticulatedUnitRig(u, u.isPlayer ? player.heroClass : undefined);
        this.unitRigs.set(u.id, rig);
      }

      const gy = this.groundHeightAt(u.x, u.y);
      rig.group.position.set(u.x, gy, u.y);
      // In Three.js right-handed XZ plane, facing (atan2(dz, dx)) maps to rotation.y = -u.facing
      rig.group.rotation.y = -u.facing;

      // Death dissolve / fall animation
      if (u.state === 'DEAD') {
        rig.group.rotation.z = Math.min(Math.PI / 2, (0.6 - u.deadTimer) * 3);
      } else {
        rig.group.rotation.z = 0;
      }

      // Hit flash highlight
      const isHit = u.hitFlash > 0;
      for (const mat of rig.bodyMaterials) {
        if (isHit) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 0.9;
        } else {
          mat.emissive.setHex(u.faction === 'DEVAS' ? 0xb45309 : 0x450a0a);
          mat.emissiveIntensity = u.isPlayer || u.isBoss ? 0.25 : 0.1;
        }
      }

      // Simultaneous Walk & Attack Skeletal Animation
      const movedDist = Math.hypot(u.x - rig.lastX, u.y - rig.lastZ);
      rig.lastX = u.x;
      rig.lastZ = u.y;

      if (movedDist > 0.15) {
        rig.walkPhase += movedDist * 0.22;
        const stride = Math.sin(rig.walkPhase) * 0.65;
        rig.leftLegPivot.rotation.z = stride;
        rig.rightLegPivot.rotation.z = -stride;
        rig.capeMesh.rotation.x = 0.35 + Math.abs(stride) * 0.35 + Math.sin(now * 8) * 0.08;
      } else {
        rig.leftLegPivot.rotation.z *= 0.82;
        rig.rightLegPivot.rotation.z *= 0.82;
        rig.capeMesh.rotation.x = 0.22 + Math.sin(now * 3 + u.x) * 0.05;
      }

      // Upper-body weapon swing animation (works simultaneously while legs run!)
      const isAttacking = u.isPlayer
        ? this.playerAttackVisualTimer > 0
        : u.attackCooldown > u.maxCooldown - 0.32;

      if (isAttacking) {
        rig.attackSwingPhase += dt * 22;
        const swing = Math.sin(rig.attackSwingPhase);
        rig.torsoGroup.rotation.y = swing * 0.48;
        rig.rightArmPivot.rotation.z = Math.PI * 0.4 + swing * 1.15;
        rig.rightArmPivot.rotation.x = swing * 0.45;
      } else {
        rig.torsoGroup.rotation.y *= 0.82;
        rig.rightArmPivot.rotation.z = THREE.MathUtils.lerp(
          rig.rightArmPivot.rotation.z,
          Math.PI * 0.35 + Math.sin(rig.walkPhase) * 0.2,
          0.2
        );
        rig.rightArmPivot.rotation.x *= 0.82;
      }

      if (rig.haloMesh) {
        rig.haloMesh.rotation.x = now * 1.5;
      }
      rig.auraMesh.rotation.z = now * 0.8;
    }

    // Remove stale unit rigs
    for (const [id, rig] of this.unitRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.group);
        this.unitRigs.delete(id);
      }
    }

    // 4. Sync 3D Projectiles (Spinning Chakrams, Surya Solar Beams, Void Scythes, Arrows)
    const activeProjIds = new Set<string>();
    for (const p of projectiles) {
      activeProjIds.add(p.id);
      let pMesh = this.projectileMeshes.get(p.id);
      if (!pMesh) {
        pMesh = this.create3DProjectile(p);
        this.scene.add(pMesh);
        this.projectileMeshes.set(p.id, pMesh);
      }
      const py = this.groundHeightAt(p.x, p.y) + 15;
      pMesh.position.set(p.x, py, p.y);
      if (p.type === 'CHAKRA' || p.type === 'VOID_SCYTHE') {
        pMesh.rotation.y = now * 14;
      } else {
        pMesh.rotation.y = -p.angle;
      }
    }
    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!activeProjIds.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }

    // 5. Sync 3D Particles & Volumetric Shockwaves
    const poolLen = this.particlePool.length;
    for (let i = 0; i < poolLen; i++) {
      const mesh = this.particlePool[i];
      if (i < particles.length) {
        const pt = particles[i];
        mesh.visible = true;
        const gy = this.groundHeightAt(pt.x, pt.y);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(pt.color);
        mat.opacity = pt.alpha;

        if (pt.shape === 'SHOCKWAVE') {
          const curR = Math.max(2, pt.size * (pt.life / pt.maxLife));
          mesh.position.set(pt.x, gy + 2.0, pt.y);
          mesh.scale.set(curR, 1.2, curR);
        } else {
          const hBoost = (1 - pt.alpha) * 18;
          mesh.position.set(pt.x, gy + 10 + hBoost, pt.y);
          const s = Math.max(1.2, pt.size * 0.45);
          mesh.scale.set(s, s, s);
          mesh.rotation.y = now * 5 + i;
        }
      } else {
        mesh.visible = false;
      }
    }

    // 6. Update Dynamic Third-Person Shoulder Camera (or Tactical 3D Overview)
    if (playerUnit) {
      const py = this.groundHeightAt(playerUnit.x, playerUnit.y);

      if (this.cameraMode === 'SHOULDER') {
        // Base frontline direction (Devas face East 0, Asuras face West PI) with smooth angular lead toward player facing
        const frontlineYaw = player.faction === 'DEVAS' ? 0 : Math.PI;
        let facingDelta = Math.atan2(
          Math.sin(playerUnit.facing - frontlineYaw),
          Math.cos(playerUnit.facing - frontlineYaw)
        );
        // Allow smooth 55% rotational tracking around the frontline axis so horizon & sky dome stay majestically framed
        const targetYaw = frontlineYaw + facingDelta * 0.55;

        let angleDiff = targetYaw - this.smoothAimAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.smoothAimAngle += angleDiff * Math.min(1, dt * 6.5);

        // AAA Third-Person Over-the-Shoulder Framing:
        // Places champion in lower-middle third while horizon, 3D structures, mountains & 3D sky/clouds fill upper viewport
        const camDist = 175;
        const camHeight = 62;
        const shoulderOffset = 16;

        _camTargetPos.set(
          playerUnit.x - Math.cos(this.smoothAimAngle) * camDist - Math.sin(this.smoothAimAngle) * shoulderOffset,
          py + camHeight,
          playerUnit.y - Math.sin(this.smoothAimAngle) * camDist + Math.cos(this.smoothAimAngle) * shoulderOffset
        );

        _camLookAt.set(
          playerUnit.x + Math.cos(this.smoothAimAngle) * 240,
          py + 48,
          playerUnit.y + Math.sin(this.smoothAimAngle) * 240
        );
      } else {
        // Elevated 3D Tactical Overview Camera
        _camTargetPos.set(playerUnit.x, py + 380, playerUnit.y + 340);
        _camLookAt.set(playerUnit.x, py + 15, playerUnit.y - 30);
      }

      const dampFactor = 1 - Math.exp(-8.5 * dt);
      this.currentCamPos.lerp(_camTargetPos, dampFactor);
      this.currentLookAt.lerp(_camLookAt, dampFactor);

      this.camera.position.copy(this.currentCamPos);
      if (cameraShake > 0) {
        this.camera.position.x += (Math.random() - 0.5) * cameraShake * 0.8;
        this.camera.position.y += (Math.random() - 0.5) * cameraShake * 0.8;
      }
      this.camera.lookAt(this.currentLookAt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public toggleCameraMode(): CameraPerspectiveMode {
    this.cameraMode = this.cameraMode === 'SHOULDER' ? 'TACTICAL' : 'SHOULDER';
    return this.cameraMode;
  }

  private create3DProjectile(p: Projectile): THREE.Object3D {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: p.color });

    if (p.type === 'CHAKRA') {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(p.radius, 2.2, 8, 20).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      group.add(torus);
    } else if (p.type === 'SURYA_RAY') {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, p.radius * 6, 8).rotateZ(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      group.add(beam);
    } else {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(Math.max(3.5, p.radius), 8, 8), mat);
      group.add(orb);
    }
    return group;
  }

  public handleResize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
