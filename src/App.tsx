/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerCharacter, UpgradeOption, WarState, CampQuest, ShopItem } from './game/types';
import { createInitialCharacter, getAvailableUpgrades, getInitialQuests } from './game/rules';
import { BattlefieldEngine } from './game/battlefieldEngine';
import { CharacterCreator } from './components/CharacterCreator';
import { BattlefieldHUD } from './components/BattlefieldHUD';
import { LevelUpModal } from './components/LevelUpModal';
import { PauseModal, GameOverModal } from './components/BattlefieldModals';
import { CampShopModal } from './components/CampShopModal';
import { CampQuestModal } from './components/CampQuestModal';
import { ControlSettingsModal } from './components/ControlSettingsModal';
import { HUDControlConfig, loadHUDConfig } from './game/hudConfig';
import { WarCinematicIntro } from './components/WarCinematicIntro';
import { sound } from './game/audio';

type GameState = 'intro' | 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattlefieldEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('war_prologue_seen')) {
      return 'intro';
    }
    return 'title';
  });
  const [hudConfig, setHudConfig] = useState<HUDControlConfig>(() => loadHUDConfig());
  const [isControlsModalOpen, setIsControlsModalOpen] = useState<boolean>(false);
  const [player, setPlayer] = useState<PlayerCharacter>(() =>
    createInitialCharacter('Arjuna', 'DEVAS', 'VAJRA_WARRIOR')
  );
  const [warState, setWarState] = useState<WarState>({
    devaMomentum: 150,
    asuraMomentum: 150,
    targetMomentum: 1000,
    devaKills: 0,
    asuraKills: 0,
    elapsedSeconds: 0,
    battleStatus: 'PLAYING',
  });

  const [quests, setQuests] = useState<CampQuest[]>(() =>
    getInitialQuests('DEVAS')
  );
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState<boolean>(false);
  const [nearCampNpc, setNearCampNpc] = useState<'SHOP' | 'QUEST' | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'SHOULDER' | 'TACTICAL'>('SHOULDER');
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [gameOverVictory, setGameOverVictory] = useState<boolean>(false);

  // Sync state to body dataset for ultra-mode compliance
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Start the battle simulation
  const handleStartGame = useCallback((character: PlayerCharacter) => {
    setPlayer(character);
    setQuests(getInitialQuests(character.faction));
    setIsShopOpen(false);
    setIsQuestModalOpen(false);
    setGameState('playing');
    sound.playShankha(character.faction === 'DEVAS' ? 330 : 180);

    // Initialize battlefield engine on next frame
    requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      if (engineRef.current) {
        engineRef.current.stop();
      }

      const engine = new BattlefieldEngine(canvas, character, {
        onPlayerUpdate: (updatedChar) => {
          setPlayer({ ...updatedChar });
        },
        onWarUpdate: (updatedWar) => {
          setWarState({ ...updatedWar });

          // Update momentum quest
          const momentumVal = character.faction === 'DEVAS' ? updatedWar.devaMomentum : updatedWar.asuraMomentum;
          setQuests((prev) =>
            prev.map((q) => {
              if (q.objectiveType === 'GAIN_MOMENTUM' && !q.isClaimed) {
                const prog = Math.min(q.targetProgress, Math.round(momentumVal));
                return {
                  ...q,
                  currentProgress: prog,
                  isCompleted: prog >= q.targetProgress,
                };
              }
              return q;
            })
          );

          if (updatedWar.battleStatus === 'DEVA_VICTORY') {
            const won = character.faction === 'DEVAS';
            setGameOverVictory(won);
            setGameState('gameover');
          } else if (updatedWar.battleStatus === 'ASURA_VICTORY') {
            const won = character.faction === 'ASURAS';
            setGameOverVictory(won);
            setGameState('gameover');
          }
        },
        onLevelUp: (_newLevel) => {
          const upgrades = getAvailableUpgrades(character);
          setUpgradeOptions(upgrades);
          setPendingLevelUp(_newLevel);
        },
        onPlayerDeath: () => {
          setGameOverVictory(false);
          setGameState('gameover');
        },
        onEnemyKilled: (victim, _meritsGained) => {
          setQuests((prev) =>
            prev.map((q) => {
              if (q.isClaimed) return q;
              if (q.objectiveType === 'KILL_SOLDIERS' && victim.role === 'SOLDIER') {
                const nextProg = Math.min(q.targetProgress, q.currentProgress + 1);
                return {
                  ...q,
                  currentProgress: nextProg,
                  isCompleted: nextProg >= q.targetProgress,
                };
              }
              if (q.objectiveType === 'KILL_ARCHERS' && (victim.role === 'ARCHER' || victim.role === 'MAGE')) {
                const nextProg = Math.min(q.targetProgress, q.currentProgress + 1);
                return {
                  ...q,
                  currentProgress: nextProg,
                  isCompleted: nextProg >= q.targetProgress,
                };
              }
              if (q.objectiveType === 'KILL_BOSS' && victim.isBoss) {
                return {
                  ...q,
                  currentProgress: 1,
                  isCompleted: true,
                };
              }
              return q;
            })
          );
        },
        onShrineCaptured: (_shrine) => {
          setQuests((prev) =>
            prev.map((q) => {
              if (q.objectiveType === 'HOLD_SHRINE' && !q.isClaimed) {
                return {
                  ...q,
                  currentProgress: 1,
                  isCompleted: true,
                };
              }
              return q;
            })
          );
        },
        onNearCampNPC: (npc) => {
          setNearCampNpc(npc);
        },
      });

      if (minimapCanvasRef.current) {
        engine.setMinimapCanvas(minimapCanvasRef.current);
      }

      engineRef.current = engine;
      engine.start();
    });
  }, []);

  // Ensure minimap canvas is connected when HUD mounts
  useEffect(() => {
    if (engineRef.current && minimapCanvasRef.current) {
      engineRef.current.setMinimapCanvas(minimapCanvasRef.current);
    }
  }, [gameState]);

  // Handle Autostart query parameter `?autostart=1`
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const defaultHero = createInitialCharacter('Arjuna', 'DEVAS', 'VAJRA_WARRIOR');
      handleStartGame(defaultHero);
    }
  }, [handleStartGame]);

  // Window resize handler for canvas & 3D WebGL renderer
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      engineRef.current?.threeRenderer?.handleResize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard & Mouse Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          handleStartGame(player);
        }
        return;
      }

      if (e.code === 'KeyE') {
        e.preventDefault();
        setIsShopOpen((prev) => !prev);
        setIsQuestModalOpen(false);
        return;
      }

      if (e.code === 'KeyQ') {
        e.preventDefault();
        setIsQuestModalOpen((prev) => !prev);
        setIsShopOpen(false);
        return;
      }

      if (e.code === 'Escape') {
        if (isShopOpen || isQuestModalOpen) {
          e.preventDefault();
          setIsShopOpen(false);
          setIsQuestModalOpen(false);
          return;
        }
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        const muted = sound.toggleMute();
        setIsMuted(muted);
        return;
      }

      if (e.code === 'KeyV' && !e.repeat) {
        e.preventDefault();
        if (engineRef.current) {
          const nextCam = engineRef.current.toggleCameraPerspective();
          setCameraMode(nextCam);
        }
        return;
      }

      if (gameState !== 'playing' || pendingLevelUp !== null || isShopOpen || isQuestModalOpen) return;

      const engine = engineRef.current;
      if (!engine) return;

      engine.keys[e.code] = true;

      // Abilities trigger on keys 1, 2, 3, 4, 5
      if (e.code === 'Digit1') engine.triggerAbility(0);
      if (e.code === 'Digit2') engine.triggerAbility(1);
      if (e.code === 'Digit3') engine.triggerAbility(2);
      if (e.code === 'Digit4') engine.triggerAbility(3);
      if (e.code === 'Digit5') engine.triggerAbility(4);

      // Dash trigger on Space or Shift
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        engine.triggerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (engine) {
        engine.keys[e.code] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Project screen coordinate into 3D ground plane (or 2D world fallback)
      engine.updateMouseScreen(screenX, screenY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && engineRef.current && !isShopOpen && !isQuestModalOpen) {
        engineRef.current.isMouseDown = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && engineRef.current) {
        engineRef.current.isMouseDown = false;
      }
    };

    const handleBlur = () => {
      if (engineRef.current) {
        engineRef.current.keys = {};
        engineRef.current.isMouseDown = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, pendingLevelUp, player, handleStartGame, isShopOpen, isQuestModalOpen]);

  const handleSelectUpgrade = (upgrade: UpgradeOption) => {
    if (engineRef.current) {
      upgrade.apply(engineRef.current.player);
      setPlayer({ ...engineRef.current.player });
    }
    setPendingLevelUp(null);
  };

  const handleResume = () => {
    setGameState('playing');
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.revivePlayer();
      setPlayer({ ...engineRef.current.player });
      setGameState('playing');
    } else {
      handleStartGame(player);
    }
  };

  const handleChangeHero = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setGameState('title');
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleTriggerAbility = (slot: number) => {
    if (engineRef.current) {
      engineRef.current.triggerAbility(slot);
    }
  };

  const handleTriggerDash = () => {
    if (engineRef.current) {
      engineRef.current.triggerDash();
    }
  };

  const handleBuyShopItem = (item: ShopItem) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    if (engine.player.merits < item.cost) return;

    engine.player.merits -= item.cost;

    if (item.category === 'ELIXIR') {
      if (item.id.includes('soma') || item.id.includes('rakta')) {
        engine.player.stats.maxHp += 50;
        engine.player.stats.hp = engine.player.stats.maxHp;
        const pUnit = engine.units.find((u) => u.isPlayer);
        if (pUnit) {
          pUnit.maxHp = engine.player.stats.maxHp;
          pUnit.hp = pUnit.maxHp;
        }
      } else if (item.id.includes('amrita') || item.id.includes('fury')) {
        engine.player.stats.maxEnergy += 40;
        engine.player.stats.energy = engine.player.stats.maxEnergy;
      } else if (item.id.includes('kavacha') || item.id.includes('carapace')) {
        engine.player.stats.def += 15;
      } else if (item.id.includes('vayu') || item.id.includes('maruta')) {
        engine.player.stats.speed += 25;
        engine.player.stats.critChance += 0.08;
      }
    } else if (item.category === 'WEAPON') {
      engine.player.equippedWeapon = item.name;
      if (item.id.includes('blade') || item.id.includes('cleaver')) {
        engine.player.stats.atk += 28;
      } else if (item.id.includes('bow')) {
        engine.player.stats.atk += 32;
      } else if (item.id.includes('gada') || item.id.includes('axe')) {
        engine.player.stats.atk += 45;
      }
      const pUnit = engine.units.find((u) => u.isPlayer);
      if (pUnit) {
        pUnit.atk = engine.player.stats.atk;
      }
    } else if (item.category === 'SKILL') {
      if (item.id.includes('brahmashira') || item.id.includes('cataclysm')) {
        const isDeva = engine.player.faction === 'DEVAS';
        const newAbility = {
          id: 'secret_5',
          name: isDeva ? 'Brahmashira Meteor Astra' : 'Mahishasura Cataclysm',
          sanskritName: isDeva ? 'ब्रह्मशिरा अस्त्र' : 'महिषासुर प्रलय',
          keyHint: '5',
          description: isDeva
            ? 'Celestial meteor barrage incinerating foes.'
            : 'Underworld magma eruption.',
          cooldown: 8.0,
          currentCooldown: 0,
          energyCost: 40,
          damageMultiplier: 3.5,
          radius: 260,
          type: 'AOE_BURST' as const,
          unlockedAtLevel: 1,
          iconSvgPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
          accentColor: isDeva ? '#fde047' : '#ef4444',
        };
        if (!engine.player.abilities.some((a) => a.id === 'secret_5')) {
          engine.player.abilities.push(newAbility);
        }
      } else if (item.id.includes('maya') || item.id.includes('shadow')) {
        for (let i = 0; i < 2; i++) {
          engine.spawnArmyUnit(engine.player.faction);
        }
        engine.addFloatingText(engine.cameraX, engine.cameraY - 40, '2 ALLIED WARRIORS MANIFESTED!', '#38bdf8', true);
      }
    }

    setPlayer({ ...engine.player });
  };

  const handleClaimQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === questId && q.isCompleted && !q.isClaimed) {
          if (engineRef.current) {
            engineRef.current.player.merits = (engineRef.current.player.merits || 0) + q.rewardMerits;
            engineRef.current.gainExperience(q.rewardXp);
            setPlayer({ ...engineRef.current.player });
          }
          return { ...q, isClaimed: true };
        }
        return q;
      })
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050508] select-none font-rajdhani">
      {/* 2D Simulation Canvas Viewport */}
      <canvas
        ref={canvasRef}
        data-testid="battlefield-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
      />

      {/* Screen 0: Cinematic Animated War Prologue */}
      {gameState === 'intro' && (
        <WarCinematicIntro
          playerFaction={player.faction}
          onComplete={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('war_prologue_seen', 'true');
            }
            setGameState('title');
          }}
        />
      )}

      {/* Screen 1: Title Screen / Character Creator */}
      {gameState === 'title' && (
        <CharacterCreator
          onStartGame={handleStartGame}
          onWatchPrologue={() => setGameState('intro')}
        />
      )}

      {/* Screen 2: Active Gameplay HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <BattlefieldHUD
          player={player}
          war={warState}
          quests={quests}
          nearCampNpc={nearCampNpc}
          isMuted={isMuted}
          cameraMode={cameraMode}
          minimapRef={minimapCanvasRef}
          onToggleMute={handleToggleMute}
          onToggleCameraMode={() => {
            if (engineRef.current) {
              const nextCam = engineRef.current.toggleCameraPerspective();
              setCameraMode(nextCam);
            }
          }}
          onPause={() => setGameState('paused')}
          onTriggerAbility={handleTriggerAbility}
          onTriggerDash={handleTriggerDash}
          onJoystickMove={(v) => engineRef.current?.setJoystickVector(v.x, v.y)}
          onJoystickStop={() => engineRef.current?.setJoystickVector(0, 0)}
          onOpenShop={() => {
            setIsShopOpen(true);
            setIsQuestModalOpen(false);
          }}
          onOpenQuests={() => {
            setIsQuestModalOpen(true);
            setIsShopOpen(false);
          }}
          onRecallToBase={() => engineRef.current?.recallToBase()}
        />
      )}

      {/* Camp Shop Modal */}
      {isShopOpen && (
        <CampShopModal
          player={player}
          onClose={() => setIsShopOpen(false)}
          onBuyItem={handleBuyShopItem}
        />
      )}

      {/* Camp Quest Board Modal */}
      {isQuestModalOpen && (
        <CampQuestModal
          player={player}
          quests={quests}
          onClose={() => setIsQuestModalOpen(false)}
          onClaimQuest={handleClaimQuest}
        />
      )}

      {/* Screen 3: Level Up Boon Selection Modal */}
      {pendingLevelUp !== null && (
        <LevelUpModal
          player={player}
          options={upgradeOptions}
          onSelectUpgrade={handleSelectUpgrade}
        />
      )}

      {/* Screen 4: Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          player={player}
          war={warState}
          onResume={handleResume}
          onRestart={handleRestart}
          onChangeHero={handleChangeHero}
          onOpenControls={() => setIsControlsModalOpen(true)}
          onWatchPrologue={() => setGameState('intro')}
        />
      )}

      {/* Control Settings Modal (when opened from Pause Menu) */}
      {isControlsModalOpen && (
        <ControlSettingsModal
          currentConfig={hudConfig}
          onUpdateConfig={setHudConfig}
          onClose={() => setIsControlsModalOpen(false)}
        />
      )}

      {/* Screen 5: Victory / Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          isVictory={gameOverVictory}
          player={player}
          war={warState}
          onPlayAgain={handleRestart}
          onChangeHero={handleChangeHero}
        />
      )}
    </div>
  );
}
