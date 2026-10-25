import React from 'react';
import { PlayerCharacter, WarState } from '../game/types';
import { Play, RotateCcw, Award, Skull, Users, Sliders } from 'lucide-react';

interface PauseModalProps {
  player: PlayerCharacter;
  war: WarState;
  onResume: () => void;
  onRestart: () => void;
  onChangeHero: () => void;
  onOpenControls?: () => void;
  onWatchPrologue?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  player,
  war,
  onResume,
  onRestart,
  onChangeHero,
  onOpenControls,
  onWatchPrologue,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none font-rajdhani">
      <div className="w-full max-w-md bg-[#090d16] border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-6">
        <div className="space-y-1">
          <h3 className="font-cinzel text-2xl font-black text-amber-400">
            BATTLE PAUSED
          </h3>
          <p className="text-slate-400 text-xs">
            The mythological clash is momentarily stilled.
          </p>
        </div>

        {/* Current Run Metrics */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">LEVEL</div>
            <div className="font-cinzel text-lg font-bold text-slate-100">{player.level}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">KILLS</div>
            <div className="font-cinzel text-lg font-bold text-amber-400">{player.kills}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">STREAK</div>
            <div className="font-cinzel text-lg font-bold text-rose-400">{player.highestStreak}x</div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2">
          <button
            type="button"
            data-start="true"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Battle (Esc / P)
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart Battle
          </button>

          {onWatchPrologue && (
            <button
              type="button"
              onClick={onWatchPrologue}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-900/60 to-purple-900/60 hover:from-amber-800/80 hover:to-purple-800/80 text-amber-200 font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-amber-500/30"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Watch War Cinematic Prologue
            </button>
          )}

          {onOpenControls && (
            <button
              type="button"
              onClick={onOpenControls}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-amber-500/40"
            >
              <Sliders className="w-3.5 h-3.5" />
              Customize Controls & HUD
            </button>
          )}

          <button
            type="button"
            onClick={onChangeHero}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            Switch Character & Side
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isVictory: boolean;
  player: PlayerCharacter;
  war: WarState;
  onPlayAgain: () => void;
  onChangeHero: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  player,
  war,
  onPlayAgain,
  onChangeHero,
}) => {
  const isDeva = player.faction === 'DEVAS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none font-rajdhani">
      <div
        className={`w-full max-w-lg bg-[#090d16] border rounded-2xl p-6 md:p-8 shadow-2xl text-center space-y-6 ${
          isVictory ? 'border-amber-500/50' : 'border-rose-900/60'
        }`}
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] font-bold px-3 py-1 rounded border font-cinzel">
            {isVictory ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Award className="w-4 h-4" /> ETERNAL TRIUMPH
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <Skull className="w-4 h-4" /> FALLEN IN BATTLE
              </span>
            )}
          </div>

          <h2 className="font-cinzel text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-rose-400">
            {isVictory
              ? isDeva
                ? 'DIVINE VICTORY OF DEVAS'
                : 'DEMONIC CONQUEST OF ASURAS'
              : 'CHAMPION DEFEATED'}
          </h2>

          <p className="text-slate-400 text-sm">
            {isVictory
              ? `Through unmatched valor and legendary astras, ${player.name} led the frontlines to ultimate dominion!`
              : `Though struck down by enemy forces, your deeds in the cosmic war echo through the heavens.`}
          </p>
        </div>

        {/* Battle Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">FINAL LEVEL</div>
            <div className="font-cinzel text-xl font-black text-slate-100">{player.level}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">FOES SLAIN</div>
            <div className="font-cinzel text-xl font-black text-amber-400">{player.kills}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">BEST STREAK</div>
            <div className="font-cinzel text-xl font-black text-rose-400">{player.highestStreak}x</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">WAR TIME</div>
            <div className="font-cinzel text-xl font-black text-sky-400">
              {Math.round(war.elapsedSeconds)}s
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className={`w-full py-3.5 rounded-xl font-cinzel font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${
              isVictory
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110'
                : 'bg-gradient-to-r from-rose-600 to-red-500 text-white hover:brightness-110'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {isVictory ? 'Fight Another Battle' : 'Rise & Rejoin Battle'}
          </button>

          <button
            type="button"
            onClick={onChangeHero}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-800"
          >
            <Users className="w-3.5 h-3.5" />
            Select Another Champion / Faction
          </button>
        </div>
      </div>
    </div>
  );
};
