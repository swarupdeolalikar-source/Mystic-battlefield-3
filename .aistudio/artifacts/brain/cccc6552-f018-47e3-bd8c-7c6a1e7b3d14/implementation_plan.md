# Mystic Battlefield: Full 3D Realm, Faction Skies & PBR Champions

This plan upgrades Mystic Battlefield into a real-time **3D WebGL action RPG** where players command their champion from an immersive third-person shoulder perspective beneath a living dual-faction sky dome, surrounded by 3D temples, citadels, mountains, and articulated 3D PBR armies.

## User Review & Critical Decisions

> [!IMPORTANT]
> Your preferences from the clarification phase have been locked into the 3D architecture below. Review the plan and click **Proceed** to begin building the 3D battlefield.

- **Confirmed Camera Perspective**: Dynamic **Third-Person Shoulder Camera** tracking smoothly behind the champion toward their aim direction and the horizon, paired with an instant HUD toggle to switch to an **Angled 3D Tactical Overview** at any time.
- **Confirmed Sky & Cloud Atmosphere**: **Seamless Dual-Faction Sky Dome** featuring a golden celestial sunrise with warm cumulus clouds in the West (Deva Sanctuary) transitioning into a dark volcanic storm with glowing ember clouds and crimson lightning in the East (Asura Stronghold).
- **Confirmed Character & Structure Fidelity**: **High-Detail Mythological PBR Models** built as composite multi-part 3D hierarchies with brushed metallic armor, crowns/horns, flowing capes, articulated limbs, and 3D weapons.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the flat 2D battlefield viewport with a physically-based 3D world while preserving every existing gameplay system—simultaneous movement and attacking, divine Astra skills, customizable HUD layout, camp shops, quests, war prologue, and spatial audio.
- **Target Audience / Persona**: Action RPG players seeking an atmospheric mythological war experience with realistic depth, lighting, and visceral third-person combat.
- **Key Value**: Elevates immersion by letting players look across a vast 3D valley framed by Himalayan peaks and volcanic crags, watch 3D clouds drift across faction skies, and clash with 3D armored warriors and towering bosses.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Entering the 3D Battlefield**: After character creation (and optional war prologue), the camera glides behind the player's 3D champion inside their faction's 3D Sanctuary or Stronghold.
  2. **Third-Person Navigation & Aiming**: Moving via WASD or the virtual joystick propels the 3D champion across raised stone war highways while pointer/touch aiming rotates the champion and camera view smoothly across the 3D horizon.
  3. **Simultaneous Move-and-Attack in 3D**: Players stride and strafe with full lower-body leg animations while their upper torso and weapon arm execute sword slashes, bow shots, or divine Astra strikes without movement lock.
  4. **Camera Perspective Toggle**: A dedicated camera button in the top HUD lets players toggle seamlessly between **3D Shoulder View** (horizon-facing action) and **3D Tactical View** (elevated angled battlefield view).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Mythological Epic Realism with physically-based metallic gold, bronze, carved sandstone, and volcanic obsidian surfaces.
  - *Color Palette & Mood*:
    - **Deva Realm (West)**: Radiant sunrise gold (`#F59E0B`), celestial cyan (`#38BDF8`), warm ivory marble, and lush emerald foliage.
    - **No-Man's-Land (Center)**: Weathered battlefield slate, dust haze, and glowing capture shrines.
    - **Asura Realm (East)**: Molten crimson (`#EF4444`), obsidian basalt (`#18181B`), violet storm haze, and glowing magma cracks.
  - *Typography & Hierarchy*: Display headers in `Cinzel` for mythological gravitas, paired with clean `Plus Jakarta Sans` for HUD controls and tabular numerals (`tabular-nums`) for combat stats, cooldowns, and currency.
  - *Component Styling & Layout*: Full-viewport 3D WebGL canvas (`100vw x 100vh`) with semantic, unobstructed DOM HUD overlays and customizable touch/mouse controls.
- **Interactive Feedback & Motion**:
  - Smooth spring-damped camera tracking (`THREE.MathUtils.damp`) with dynamic FOV widening during sprint/dash and camera shake on critical hits.
  - Volumetric 3D shockwave rings, spinning 3D Sudarshana Chakrams, branching 3D lightning bolts, and floating 3D world-projected health bars.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Simulation Engine with Synchronized 3D WebGL Renderer**
  - *Chosen Approach*: Keep the authoritative combat, AI, quest, and shrine simulation tick running in deterministic world coordinates (`X, Z`) while projecting all terrain, structures, units, projectiles, and sky elements into a Three.js scene graph with height-mapped `Y` elevation.
  - *Why*: Guarantees zero regressions in combat responsiveness, simultaneous move-and-attack physics, audio cues, or the 2D tactical minimap while delivering full 3D graphics.
  - *Alternatives Considered*: Rewriting all AI and collision detection in a separate 3D physics engine, which would risk desynchronizing the minimap and existing skill mechanics.
- **Decision 2: Procedural PBR Multi-Part Models & Instanced Environment**
  - *Chosen Approach*: Construct every character, boss, temple, and shrine as a composite 6–12 part 3D rig using `MeshStandardMaterial` and `RoomEnvironment` reflections, while batching repeated trees, boulders, and foliage via `InstancedMesh`.
  - *Why*: Delivers rich metallic armor reflections, articulated limb animations, and zero external asset loading delays or broken URLs at a locked 60 FPS.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       React Application & HUD Layer                     │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │  Top HUD & Camera  │  │  Camp Shop / Quest │  │ Customizable Live │  │
│  │   Mode Switcher    │  │   & Pause Modals   │  │   Action Controls │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬─────────┘  │
└────────────┼───────────────────────┼───────────────────────┼────────────┘
             │                       │                       │
             ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Authoritative Battlefield Simulation Engine              │
│  • Simultaneous Move + Attack Kinematics   • 3-Lane AI & Boss Spawners  │
│  • Shrine Capture & Buff State             • Formant Voice & SFX Synth  │
└────────────┬───────────────────────────────────────────────┬────────────┘
             │                                               │
             ▼                                               ▼
┌──────────────────────────────────────────┐    ┌─────────────────────────┐
│      Three.js 3D WebGL Scene Renderer    │    │  2D Tactical Minimap    │
│  ┌────────────────────────────────────┐  │    │  • Real-Time Unit Dots  │
│  │ Dual-Faction Sky Dome & 3D Clouds  │  │    │  • Lane & Shrine Status │
│  ├────────────────────────────────────┤  │    └─────────────────────────┘
│  │ Sculpted 3D Terrain, Mountains,    │  │
│  │ Gopuram Temple, Citadel & Shrines  │  │
│  ├────────────────────────────────────┤  │
│  │ Articulated 3D PBR Champions,      │  │
│  │ Soldiers, Bosses & 3D Skill VFX    │  │
│  ├────────────────────────────────────┤  │
│  │ Damped 3rd-Person Shoulder Camera  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Data Model & State
- **3D Coordinate Mapping**: World `(x, y)` coordinates map directly to 3D `(x, groundHeightAt(x, z), z)` space, where `groundHeightAt` computes elevation for raised war lanes, riverbeds, and perimeter mountain slopes.
- **Articulated Unit Rig Cache**: Each active unit ID maps to a pooled `THREE.Group` containing sub-pivots (`headGroup`, `torsoMesh`, `leftArmPivot`, `rightArmPivot`, `weaponGroup`, `leftLegPivot`, `rightLegPivot`, `capeMesh`) updated each frame from the unit's velocity, facing angle, and attack swing phase.
- **Sky & Cloud State**: A 3D sky sphere and 45 multi-puff cloud groups drift continuously across the upper hemisphere, tinted dynamically by their X-position between the Deva Golden West and Asura Volcanic East.

### Interactive Component & State Mapping
- **Camera Perspective Toggle**: Clicking the HUD camera button toggles `cameraMode` between `'shoulder'` (low-angle third-person chase view looking toward the horizon and sky dome) and `'tactical'` (elevated angled 3D view), smoothly interpolating camera position and look-at target via exponential damping.
- **3D Aiming & Simultaneous Combat**: Pointer movement and touch aiming project rays into the 3D ground plane relative to the active camera matrix so aiming, ranged projectiles, and directional skills work accurately in both third-person and tactical perspectives.
