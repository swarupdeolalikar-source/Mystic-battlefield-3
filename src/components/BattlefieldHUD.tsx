import React, { useState, useEffect } from 'react';
import { PlayerCharacter, WarState, CampQuest } from '../game/types';
import {
  Volume2,
  VolumeX,
  Pause,
  Zap,
  Swords,
  X,
  Coins,
  Scroll,
  ShoppingBag,
  Home,
  CheckCircle2,
  Sliders,
  Camera,
} from 'lucide-react';
import { VirtualJoystick } from './VirtualJoystick';
import { LeaderClashBanner } from './LeaderClashBanner';
import { ControlSettingsModal } from './ControlSettingsModal';
import { HUDControlConfig, loadHUDConfig } from '../game/hudConfig';

interface BattlefieldHUDProps {
  player: PlayerCharacter;
  war: WarState;
  quests: CampQuest[];
  nearCampNpc: 'SHOP' | 'QUEST' | null;
  isMuted: boolean;
  cameraMode?: 'SHOULDER' | 'TACTICAL';
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onToggleMute: () => void;
  onToggleCameraMode?: () => void;
  onPause: () => void;
  onTriggerAbility: (slot: number) => void;
  onTriggerDash: () => void;
  onJoystickMove: (vector: { x: number; y: number }) => void;
  onJoystickStop: () => void;
  onOpenShop: () => void;
  onOpenQuests: () => void;
  onRecallToBase: () => void;
}

export const BattlefieldHUD: React.FC<BattlefieldHUDProps> = ({
  player,
  war,
  quests,
  nearCampNpc,
  isMuted,
  cameraMode = 'SHOULDER',
  minimapRef,
  onToggleMute,
  onToggleCameraMode,
  onPause,
  onTriggerAbility,
  onTriggerDash,
  onJoystickMove,
  onJoystickStop,
  onOpenShop,
  onOpenQuests,
  onRecallToBase,
}) => {
  const [showClashIntro, setShowClashIntro] = useState<boolean>(true);
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState<boolean>(false);
  const [isQuestsCollapsed, setIsQuestsCollapsed] = useState<boolean>(false);
  const [hudConfig, setHudConfig] = useState<HUDControlConfig>(() => loadHUDConfig());
  const [isControlSettingsOpen, setIsControlSettingsOpen] = useState<boolean>(false);

  // Auto-dismiss opening battle clash banner after 5.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClashIntro(false);
    }, 5500);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcut [C] for HUD Control Customizer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'c' || e.key === 'C') && !e.repeat) {
        // Only toggle if not typing in an input
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        setIsControlSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDeva = player.faction === 'DEVAS';
  const hpPercent = Math.max(0, Math.min(100, (player.stats.hp / player.stats.maxHp) * 100));
  const energyPercent = Math.max(0, Math.min(100, (player.stats.energy / player.stats.maxEnergy) * 100));
  const xpPercent = Math.max(0, Math.min(100, (player.xp / player.xpNext) * 100));

  const devaMomentumPercent = (war.devaMomentum / war.targetMomentum) * 100;
  const asuraMomentumPercent = (war.asuraMomentum / war.targetMomentum) * 100;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 md:p-6 select-none font-rajdhani">
      {/* TOP BAR CLUSTER */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Player Vitality & Progression Cluster */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#080d1a]/85 border border-slate-700/60 p-3 rounded-xl shadow-lg backdrop-blur-none max-w-sm">
          {/* Level Badge & Faction Emblem */}
          <div
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-cinzel font-bold border ${
              isDeva
                ? 'bg-sky-950/70 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 leading-none">LV</span>
            <span className="text-lg leading-tight font-black">{player.level}</span>
          </div>

          <div className="flex-1 min-w-[190px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-cinzel font-bold text-sm text-slate-100 truncate">
                {player.name}
              </span>
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border ${
                isDeva ? 'border-sky-500/40 text-sky-400' : 'border-rose-500/40 text-rose-400'
              }`}>
                {isDeva ? 'Deva' : 'Asura'}
              </span>
            </div>

            {/* Health Bar */}
            <div className="relative w-full h-3 bg-slate-900 rounded overflow-hidden border border-slate-700/70 mb-1">
              <div
                className={`h-full transition-all duration-150 ${
                  isDeva ? 'bg-gradient-to-r from-sky-500 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-red-400'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                HP {Math.round(player.stats.hp)} / {player.stats.maxHp}
              </span>
            </div>

            {/* Prana / Fury Bar */}
            <div className="relative w-full h-2.5 bg-slate-900 rounded overflow-hidden border border-slate-700/70 mb-1">
              <div
                className={`h-full transition-all duration-150 ${
                  isDeva ? 'bg-gradient-to-r from-amber-500 to-yellow-300' : 'bg-gradient-to-r from-purple-600 to-pink-500'
                }`}
                style={{ width: `${energyPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow">
                {isDeva ? 'PRANA' : 'FURY'} {Math.round(player.stats.energy)} / {player.stats.maxEnergy}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="relative w-full h-1.5 bg-slate-900 rounded overflow-hidden">
              <div
                className="h-full bg-indigo-400 transition-all duration-200"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: War Momentum Tug-of-War */}
        <div className="pointer-events-auto flex flex-col items-center bg-[#080d1a]/85 border border-slate-700/60 px-5 py-2.5 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="text-sky-400 font-bold flex items-center gap-1">
              ☀️ DEVAS: {Math.round(war.devaMomentum)}
            </span>
            <span className="text-slate-400 font-normal">
              GOAL: {war.targetMomentum}
            </span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              ASURAS: {Math.round(war.asuraMomentum)} 🔥
            </span>
          </div>

          {/* Tug-of-war dual bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (war.devaMomentum / (war.devaMomentum + war.asuraMomentum || 1)) * 100)}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-700 transition-all duration-300 flex-1"
            />
          </div>

          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
            Capture Shrines & Slay Champions for War Victory
          </div>
        </div>

        {/* Top-Right: Merits, Kills & Camp Quick Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Merits Counter Pill */}
          <div className="bg-[#080d1a]/92 border border-amber-500/60 px-3 py-1.5 rounded-xl text-center shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-bold text-amber-400/90 tracking-wider leading-none">
                MERITS
              </span>
              <span className="font-cinzel text-lg font-black text-amber-300 leading-none tabular-nums">
                {player.merits}
              </span>
            </div>
          </div>

          {/* Kills & Streak tile */}
          <div className="bg-[#080d1a]/90 border border-slate-700/60 px-3 py-1.5 rounded-xl text-center shadow-lg">
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">
              KILLS
            </div>
            <div className="font-cinzel text-lg font-black text-amber-400 leading-none tabular-nums">
              {player.kills}
            </div>
            {player.killStreak > 1 && (
              <div className="text-[9px] font-bold text-rose-400 leading-none mt-0.5 tabular-nums">
                {player.killStreak}x
              </div>
            )}
          </div>

          {/* 3D Camera Perspective Toggle Button */}
          {onToggleCameraMode && (
            <button
              type="button"
              onClick={onToggleCameraMode}
              title="Toggle 3D Camera Perspective [V]"
              aria-label="Toggle 3D Camera View"
              className="h-10 px-2.5 rounded-xl bg-[#080d1a]/92 hover:bg-slate-800 border border-emerald-500/60 flex items-center gap-1.5 text-emerald-300 hover:text-white transition-all cursor-pointer shadow-md whitespace-nowrap shrink-0"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-cinzel font-bold hidden lg:inline">
                {cameraMode === 'SHOULDER' ? '3D Shoulder [V]' : '3D Tactical [V]'}
              </span>
            </button>
          )}

          {/* Camp Shop Quick Button */}
          <button
            type="button"
            onClick={onOpenShop}
            title="Open Allied Camp Shop [E]"
            aria-label="Camp Shop"
            className="h-10 px-2.5 rounded-xl bg-[#080d1a]/92 hover:bg-slate-800 border border-amber-500/60 flex items-center gap-1.5 text-amber-300 hover:text-white transition-all cursor-pointer shadow-md whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-cinzel font-bold hidden md:inline">Shop [E]</span>
          </button>

          {/* Camp Quests Quick Button */}
          <button
            type="button"
            onClick={onOpenQuests}
            title="Open Allied War Quests [Q]"
            aria-label="Camp Quests"
            className="relative h-10 px-2.5 rounded-xl bg-[#080d1a]/92 hover:bg-slate-800 border border-sky-500/60 flex items-center gap-1.5 text-sky-300 hover:text-white transition-all cursor-pointer shadow-md whitespace-nowrap shrink-0"
          >
            <Scroll className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-cinzel font-bold hidden md:inline">Quests [Q]</span>
            {quests.some((q) => q.isCompleted && !q.isClaimed) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow">
                !
              </span>
            )}
          </button>

          {/* Base Recall Button */}
          <button
            type="button"
            onClick={onRecallToBase}
            title="Teleport to Allied Camp Sanctuary"
            aria-label="Recall to Base"
            className="w-10 h-10 rounded-xl bg-[#080d1a]/92 hover:bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <Home className="w-4 h-4 text-teal-400" />
          </button>

          {/* Leaders Clash button */}
          <button
            type="button"
            onClick={() => setShowClashIntro((prev) => !prev)}
            aria-label="Toggle Leaders Clash Banner"
            title="Inspect Supreme Leaders Clash"
            className="w-10 h-10 rounded-xl bg-[#080d1a]/90 border border-amber-500/50 flex items-center justify-center text-amber-300 hover:text-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0"
          >
            <Swords className="w-4 h-4 text-amber-400" />
          </button>

          {/* Controls & HUD Customizer button */}
          <button
            type="button"
            onClick={() => setIsControlSettingsOpen(true)}
            aria-label="Controls & HUD Customizer (Press C)"
            title="Customize Buttons, Size & Layout [C]"
            className="w-10 h-10 rounded-xl bg-[#080d1a]/90 border border-amber-500/50 flex items-center justify-center text-amber-300 hover:text-white hover:border-amber-400 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)] shrink-0"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Mute button */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="w-10 h-10 rounded-xl bg-[#080d1a]/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Pause button */}
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="w-10 h-10 rounded-xl bg-[#080d1a]/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer shrink-0"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Supreme Leaders Clash Opening Banner Notification */}
      {showClashIntro && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl z-50 pointer-events-auto">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden">
            <LeaderClashBanner compact={true} />
            <button
              type="button"
              onClick={() => setShowClashIntro(false)}
              aria-label="Dismiss Leaders Clash"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 hover:bg-black border border-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-all cursor-pointer shadow-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ability Action Bar */}
      <div
        className="fixed z-40 pointer-events-auto flex flex-col items-center select-none"
        style={{
          left: `${hudConfig.abilityDock.x}%`,
          bottom: `${hudConfig.abilityDock.y}%`,
          transform: `translateX(-50%) scale(${hudConfig.abilityDock.scale})`,
          opacity: hudConfig.abilityDock.opacity,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className={`flex items-center bg-[#080d1a]/95 border border-slate-700/80 p-2 md:p-3 rounded-2xl shadow-2xl ${
            hudConfig.abilityDock.layout === 'ARC' ? 'pb-3.5' : ''
          }`}
          style={{ gap: `${hudConfig.abilityDock.spacing}px` }}
        >
          {/* Integrated Dash Socket (when not separated) */}
          {!hudConfig.dodgeButton.separate && (
            <>
              <button
                type="button"
                onClick={onTriggerDash}
                aria-label="Dodge Dash"
                className="group relative w-14 h-14 md:w-16 md:h-16 rounded-xl border border-slate-700 bg-slate-900/80 hover:border-sky-400 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden"
              >
                <div className="absolute top-1 left-1.5 text-[10px] font-bold text-slate-400 font-cinzel">
                  SPACE
                </div>
                <Zap className="w-5 h-5 text-sky-300 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold text-slate-300 uppercase mt-0.5">
                  Dodge
                </span>
              </button>

              <div className="w-[1px] h-10 bg-slate-700 mx-1" />
            </>
          )}

          {/* 5 Signature Astras / Demon Abilities */}
          {player.abilities.map((ab, idx) => {
            const isLocked = player.level < ab.unlockedAtLevel;
            const isOnCooldown = ab.currentCooldown > 0;
            const notEnoughEnergy = player.stats.energy < ab.energyCost;
            const arcOffset =
              hudConfig.abilityDock.layout === 'ARC'
                ? Math.abs(idx - (player.abilities.length - 1) / 2) * 7
                : 0;

            return (
              <button
                key={ab.id}
                type="button"
                onClick={() => onTriggerAbility(idx)}
                disabled={isLocked || isOnCooldown}
                style={{
                  transform: hudConfig.abilityDock.layout === 'ARC' ? `translateY(${arcOffset}px)` : undefined,
                }}
                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer overflow-hidden text-left ${
                  isLocked
                    ? 'border-slate-800 bg-slate-950/70 opacity-40 cursor-not-allowed'
                    : isOnCooldown || notEnoughEnergy
                    ? 'border-slate-700 bg-slate-900/60 cursor-not-allowed'
                    : isDeva
                    ? 'border-sky-500/60 bg-sky-950/30 hover:border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'border-rose-500/60 bg-rose-950/30 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                }`}
              >
                {/* Cooldown Overlay */}
                {isOnCooldown && (
                  <div className="absolute inset-0 bg-slate-950/80 z-10 flex items-center justify-center text-amber-400 font-cinzel font-bold text-sm">
                    {ab.currentCooldown.toFixed(1)}s
                  </div>
                )}

                {/* Key hint badge */}
                <div className="w-full flex items-center justify-between text-[10px] font-bold text-slate-300">
                  <span className="font-cinzel text-amber-400">[{ab.keyHint}]</span>
                  <span className="text-[9px] text-slate-400 font-normal">
                    {ab.energyCost} {isDeva ? 'P' : 'F'}
                  </span>
                </div>

                {/* Ability Icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ab.accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 md:w-7 md:h-7"
                >
                  <path d={ab.iconSvgPath} />
                </svg>

                {/* Name / Lock Label */}
                <div className="w-full text-center">
                  {isLocked ? (
                    <span className="text-[9px] font-semibold text-rose-400 uppercase">
                      Lv. {ab.unlockedAtLevel}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-slate-200 truncate block">
                      {ab.name.split(' ')[0]}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Clean inline control reminder */}
        <div className="text-[11px] text-slate-400 tracking-wider mt-1.5 bg-black/80 px-3 py-0.5 rounded-full">
          <span className="text-slate-300 font-semibold">Touch / WASD</span> Move · <span className="text-slate-300 font-semibold">Tap</span> Attack · <span className="text-slate-300 font-semibold">Space</span> Dodge · <span className="text-emerald-300 font-semibold">V</span> 3D Cam · <span className="text-amber-300 font-semibold">C</span> HUD
        </div>
      </div>

      {/* Freely Positioned Dodge / Dash Button (if separate) */}
      {hudConfig.dodgeButton.separate && (
        <div
          className="fixed z-40 pointer-events-auto"
          style={{
            right: `${hudConfig.dodgeButton.x}%`,
            bottom: `${hudConfig.dodgeButton.y}%`,
            transform: `scale(${hudConfig.dodgeButton.scale})`,
            opacity: hudConfig.dodgeButton.opacity,
            transformOrigin: 'bottom right',
          }}
        >
          <button
            type="button"
            onClick={onTriggerDash}
            aria-label="Separate Dodge Dash"
            className="group relative w-16 h-16 md:w-18 md:h-18 rounded-2xl border-2 border-sky-400/80 bg-gradient-to-b from-sky-950/90 to-slate-950/95 hover:border-sky-300 flex flex-col items-center justify-center transition-all cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.35)]"
          >
            <div className="absolute top-1 left-2 text-[10px] font-bold text-sky-300 font-cinzel">
              SPACE
            </div>
            <Zap className="w-6 h-6 text-sky-300 group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-bold text-white uppercase mt-0.5 tracking-wider">
              Dodge
            </span>
          </button>
        </div>
      )}

      {/* Proximity Camp Interaction Banner (Appears when near Quartermaster or Quest Master) */}
      {nearCampNpc && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-bounce">
          {nearCampNpc === 'SHOP' ? (
            <button
              type="button"
              onClick={onOpenShop}
              className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.6)] cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Talk to Quartermaster · Press [E]
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenQuests}
              className="px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-cinzel font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.6)] cursor-pointer"
            >
              <Scroll className="w-4 h-4" />
              Consult War Council · Press [Q]
            </button>
          )}
        </div>
      )}

      {/* Dynamic Virtual Analog Touch Joystick */}
      {hudConfig.joystick.enabled && (
        <div
          className="fixed z-40 pointer-events-auto"
          style={{
            left: `${hudConfig.joystick.x}%`,
            bottom: `${hudConfig.joystick.y}%`,
          }}
        >
          <VirtualJoystick
            onMove={onJoystickMove}
            onStop={onJoystickStop}
            faction={player.faction}
            scale={hudConfig.joystick.scale}
            opacity={hudConfig.joystick.opacity}
          />
        </div>
      )}

      {/* RIGHT SIDEBAR: Directives Tracker & Minimap */}
      <div
        className="fixed flex flex-col gap-2 pointer-events-auto z-30 select-none"
        style={{
          right: `${hudConfig.directives.x}%`,
          bottom: `${hudConfig.directives.y}%`,
          transform: `scale(${hudConfig.directives.scale})`,
          opacity: hudConfig.directives.opacity,
          transformOrigin: 'bottom right',
        }}
      >
        {/* Active Directives Mini-Tracker */}
        <div className="bg-[#080d1a]/95 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-left w-48 sm:w-56 md:w-60">
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase tracking-wider font-cinzel border-b border-slate-800 pb-1 mb-1.5">
            <button
              type="button"
              onClick={() => setIsQuestsCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-amber-200"
            >
              <Scroll className="w-3.5 h-3.5" />
              <span>DIRECTIVES</span>
              <span className="text-[8px] text-slate-400 font-sans font-normal">
                {isQuestsCollapsed ? '▲' : '▼'}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenQuests}
              className="text-[9px] text-sky-400 hover:underline cursor-pointer"
            >
              Quests [Q]
            </button>
          </div>

          {!isQuestsCollapsed && (
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {quests.slice(0, 3).map((q) => {
                const isReady = q.isCompleted && !q.isClaimed;
                return (
                  <div
                    key={q.id}
                    onClick={onOpenQuests}
                    className="p-1 rounded bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition-colors text-[10px]"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200 mb-0.5">
                      <span className="truncate pr-1">{q.title}</span>
                      {q.isClaimed ? (
                        <span className="text-emerald-400 flex items-center gap-0.5 text-[9px]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Done
                        </span>
                      ) : isReady ? (
                        <span className="text-amber-400 font-bold animate-pulse text-[9px]">
                          Claim!
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[9px]">
                          {q.currentProgress}/{q.targetProgress}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          q.isClaimed
                            ? 'bg-emerald-500'
                            : isReady
                            ? 'bg-amber-400'
                            : isDeva
                            ? 'bg-sky-400'
                            : 'bg-rose-400'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (q.currentProgress / q.targetProgress) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Tactical Battlefield Minimap */}
        <div className="bg-[#080d1a]/95 border border-amber-500/40 p-1.5 md:p-2 rounded-xl shadow-xl flex flex-col gap-1 w-48 sm:w-56 md:w-60">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-200 uppercase tracking-wider font-cinzel">
            <button
              type="button"
              onClick={() => setIsMinimapCollapsed((prev) => !prev)}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-200 cursor-pointer"
              title="Toggle Minimap Display"
            >
              <span>🗺️</span> <span>WAR MAP</span>
              <span className="text-[8px] text-slate-400 font-sans ml-1 font-normal">
                {isMinimapCollapsed ? '▲' : '▼'}
              </span>
            </button>
            <span className="text-[8px] text-slate-400 font-mono">2600×1800</span>
          </div>

          {!isMinimapCollapsed && (
            <>
              <div className="relative w-full h-20 sm:h-24 bg-[#070b14] border border-slate-700/80 rounded-md overflow-hidden shadow-inner">
                <canvas
                  ref={minimapRef}
                  width={190}
                  height={120}
                  data-testid="minimap-canvas"
                  className="w-full h-full block"
                />
              </div>

              <div className="flex items-center justify-between text-[8px] md:text-[9px] text-slate-300 font-semibold px-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-sky-400 inline-block" /> Allies
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 inline-block" /> Foes
                </span>
                <span className="flex items-center gap-0.5 text-amber-300 font-cinzel text-[7px] md:text-[8px]">
                  👑 BOSS
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Control Settings & HUD Customizer Modal */}
      {isControlSettingsOpen && (
        <ControlSettingsModal
          currentConfig={hudConfig}
          onUpdateConfig={setHudConfig}
          onClose={() => setIsControlSettingsOpen(false)}
        />
      )}
    </div>
  );
};
