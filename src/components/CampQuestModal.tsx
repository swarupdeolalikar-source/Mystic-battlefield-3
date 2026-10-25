import React from 'react';
import { PlayerCharacter, CampQuest } from '../game/types';
import { sound } from '../game/audio';
import {
  X,
  Scroll,
  Coins,
  Sparkles,
  CheckCircle2,
  Award,
  Target,
  Swords,
  ShieldAlert,
} from 'lucide-react';

interface CampQuestModalProps {
  player: PlayerCharacter;
  quests: CampQuest[];
  onClose: () => void;
  onClaimQuest: (questId: string) => void;
}

export const CampQuestModal: React.FC<CampQuestModalProps> = ({
  player,
  quests,
  onClose,
  onClaimQuest,
}) => {
  const isDeva = player.faction === 'DEVAS';

  const handleClaim = (quest: CampQuest) => {
    sound.playVictoryFanfare();
    onClaimQuest(quest.id);
  };

  const getObjectiveIcon = (type: CampQuest['objectiveType']) => {
    switch (type) {
      case 'KILL_SOLDIERS':
        return <Swords className="w-5 h-5 text-amber-400" />;
      case 'KILL_ARCHERS':
        return <Target className="w-5 h-5 text-sky-400" />;
      case 'KILL_BOSS':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'HOLD_SHRINE':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'GAIN_MOMENTUM':
      default:
        return <Award className="w-5 h-5 text-yellow-400" />;
    }
  };

  const completedCount = quests.filter((q) => q.isCompleted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm select-none font-rajdhani">
      <div
        className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDeva
            ? 'bg-[#080f1e] border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)]'
            : 'bg-[#15070a] border-rose-500/40 shadow-[0_0_50px_rgba(225,29,72,0.2)]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDeva
              ? 'bg-gradient-to-r from-sky-950/80 via-slate-900 to-amber-950/40 border-amber-500/30'
              : 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-purple-950/40 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner ${
                isDeva
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}
            >
              <Scroll className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl md:text-2xl font-black text-slate-100 tracking-wide flex items-center gap-2">
                {isDeva ? 'Allied Forces War Council' : 'Nether Warlord Bounties'}
              </h2>
              <p className="text-xs text-slate-400">
                {isDeva
                  ? 'Fulfill sacred military campaigns to inspire the Deva armies and earn glorious Merits.'
                  : 'Execute ruthless directives from the Demon Overlords to claim blood merits and power.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Merits Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                  MERITS
                </span>
                <span className="font-cinzel font-black text-lg text-amber-300 leading-none">
                  {player.merits}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Quests"
              className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
            <span>
              Active Directives: <strong className="text-slate-200">{quests.length}</strong>
            </span>
            <span>
              Directives Completed: <strong className="text-amber-400">{completedCount}</strong> / {quests.length}
            </span>
          </div>

          {quests.map((quest) => {
            const isReadyToClaim = quest.isCompleted && !quest.isClaimed;
            const progressPct = Math.min(
              100,
              Math.round((quest.currentProgress / quest.targetProgress) * 100)
            );

            return (
              <div
                key={quest.id}
                className={`relative rounded-xl border p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  quest.isClaimed
                    ? 'bg-slate-950/50 border-slate-800/80 opacity-70'
                    : isReadyToClaim
                    ? isDeva
                      ? 'bg-amber-950/20 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-rose-950/20 border-rose-400/80 shadow-[0_0_20px_rgba(225,29,72,0.15)]'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 ${
                      quest.isClaimed
                        ? 'bg-slate-900 border-slate-800'
                        : isReadyToClaim
                        ? 'bg-amber-500/20 border-amber-400'
                        : 'bg-slate-800/60 border-slate-700'
                    }`}
                  >
                    {quest.isClaimed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      getObjectiveIcon(quest.objectiveType)
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-xs text-amber-400/90 tracking-wider">
                        {quest.sanskritTitle}
                      </span>
                      {quest.isClaimed && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                          Claimed
                        </span>
                      )}
                    </div>

                    <h4 className="font-cinzel text-base font-bold text-slate-100 truncate">
                      {quest.title}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {quest.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>Progress</span>
                        <span>
                          {quest.currentProgress} / {quest.targetProgress} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            quest.isClaimed
                              ? 'bg-emerald-500'
                              : isReadyToClaim
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-300 animate-pulse'
                              : isDeva
                              ? 'bg-sky-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rewards & Claim CTA */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-cinzel font-bold">
                      <Coins className="w-3.5 h-3.5" />
                      +{quest.rewardMerits} Merits
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 font-cinzel font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      +{quest.rewardXp} XP
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaim(quest)}
                    disabled={!isReadyToClaim}
                    className={`w-full md:w-36 py-2 px-3 rounded-xl font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      quest.isClaimed
                        ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : isReadyToClaim
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-bounce'
                        : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    {quest.isClaimed ? (
                      'Fulfilled'
                    ) : isReadyToClaim ? (
                      <>
                        <Award className="w-4 h-4" />
                        Claim Reward
                      </>
                    ) : (
                      'In Progress'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            Bounties are tracked in real-time as you battle across the warzone.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 font-cinzel font-bold cursor-pointer"
          >
            Back to Combat
          </button>
        </div>
      </div>
    </div>
  );
};
