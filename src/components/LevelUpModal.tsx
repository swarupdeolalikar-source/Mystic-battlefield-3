import React from 'react';
import { PlayerCharacter, UpgradeOption } from '../game/types';
import { Swords, Heart, Zap, Flame, Shield, Sparkles } from 'lucide-react';

interface LevelUpModalProps {
  player: PlayerCharacter;
  options: UpgradeOption[];
  onSelectUpgrade: (upgrade: UpgradeOption) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  player,
  options,
  onSelectUpgrade,
}) => {
  const isDeva = player.faction === 'DEVAS';

  const getIcon = (name: string) => {
    switch (name) {
      case 'Swords':
        return <Swords className="w-6 h-6 text-amber-400" />;
      case 'Heart':
        return <Heart className="w-6 h-6 text-emerald-400" />;
      case 'Zap':
        return <Zap className="w-6 h-6 text-sky-400" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-orange-400" />;
      case 'Shield':
        return <Shield className="w-6 h-6 text-blue-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none select-none">
      <div className="relative w-full max-w-2xl bg-[#090d16] border border-amber-500/40 rounded-2xl p-6 md:p-8 shadow-2xl text-center space-y-6">
        {/* Level Up Banner */}
        <div className="space-y-1">
          <div className="inline-block text-xs uppercase tracking-[0.25em] font-bold text-amber-400/90 px-3 py-1 rounded border border-amber-500/30 bg-amber-500/10 font-cinzel">
            {isDeva ? 'DIVINE ASCENSION' : 'DEMONIC AWAKENING'}
          </div>
          <h2 className="font-cinzel text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500">
            LEVEL UP! (LV. {player.level})
          </h2>
          <p className="text-slate-400 text-sm">
            Select a celestial blessing or dark boon to strengthen your presence on the battlefield.
          </p>
        </div>

        {/* 3 Upgrade Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectUpgrade(opt)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                isDeva
                  ? 'border-slate-800 bg-slate-900/60 hover:border-sky-400 hover:bg-sky-950/40 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                  : 'border-slate-800 bg-slate-900/60 hover:border-rose-500 hover:bg-rose-950/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              }`}
            >
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-slate-950/80 w-fit group-hover:scale-110 transition-transform">
                  {getIcon(opt.iconName)}
                </div>
                <div>
                  <h4 className="font-cinzel font-bold text-slate-100 text-sm leading-snug">
                    {opt.title}
                  </h4>
                  <div className="text-[11px] text-amber-400/80 font-medium">
                    {opt.sanskritSub}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800 text-[11px] font-bold uppercase tracking-wider text-amber-400 group-hover:text-amber-300 flex items-center justify-between">
                <span>Select Boon</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
