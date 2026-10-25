import React, { useState } from 'react';
import { PlayerCharacter, ShopItem, ShopItemCategory } from '../game/types';
import { getShopItems } from '../game/rules';
import { sound } from '../game/audio';
import {
  X,
  Coins,
  Shield,
  Zap,
  Flame,
  Swords,
  Sparkles,
  CheckCircle,
  FlaskConical,
  Award,
} from 'lucide-react';

interface CampShopModalProps {
  player: PlayerCharacter;
  onClose: () => void;
  onBuyItem: (item: ShopItem) => void;
}

export const CampShopModal: React.FC<CampShopModalProps> = ({
  player,
  onClose,
  onBuyItem,
}) => {
  const [activeTab, setActiveTab] = useState<ShopItemCategory>('ELIXIR');
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const isDeva = player.faction === 'DEVAS';

  const shopItems = getShopItems(player.faction).filter(
    (item) => item.category === activeTab
  );

  const handlePurchase = (item: ShopItem) => {
    if (player.merits < item.cost) {
      sound.playHurt();
      return;
    }
    sound.playVictoryFanfare();
    setPurchasedIds((prev) => [...prev, item.id]);
    onBuyItem(item);
  };

  const getIcon = (item: ShopItem) => {
    switch (item.iconType) {
      case 'potion':
        return <FlaskConical className="w-6 h-6 text-emerald-400" />;
      case 'sword':
        return <Swords className="w-6 h-6 text-amber-400" />;
      case 'bow':
        return <Zap className="w-6 h-6 text-sky-400" />;
      case 'axe':
        return <Shield className="w-6 h-6 text-rose-400" />;
      case 'astra':
        return <Sparkles className="w-6 h-6 text-purple-400" />;
      case 'scroll':
      default:
        return <Award className="w-6 h-6 text-yellow-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm select-none font-rajdhani">
      <div
        className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDeva
            ? 'bg-[#080f1e] border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)]'
            : 'bg-[#15070a] border-rose-500/40 shadow-[0_0_50px_rgba(225,29,72,0.2)]'
        }`}
      >
        {/* Header Bar */}
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
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}
            >
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl md:text-2xl font-black text-slate-100 tracking-wide flex items-center gap-2">
                {isDeva ? 'Allied Celestial Armory' : 'Nether War Quartermaster'}
              </h2>
              <p className="text-xs text-slate-400">
                {isDeva
                  ? 'Trade honorable battle merits for sacred elixirs, divine weapons, and celestial astras.'
                  : 'Barter the spoils of slaughter for demonic blood drafts, dread cleavers, and nether magic.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Player Merits Coin Pill */}
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
              aria-label="Close Shop"
              className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-slate-800/80 bg-slate-950/40">
          {(['ELIXIR', 'WEAPON', 'SKILL'] as ShopItemCategory[]).map((tab) => {
            const isActive = activeTab === tab;
            const label =
              tab === 'ELIXIR'
                ? 'Elixirs & Potions'
                : tab === 'WEAPON'
                ? 'Weapons & Relics'
                : 'Astras & Divine Skills';

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-cinzel font-bold tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? isDeva
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.25)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {tab === 'ELIXIR' && <FlaskConical className="w-4 h-4" />}
                {tab === 'WEAPON' && <Swords className="w-4 h-4" />}
                {tab === 'SKILL' && <Sparkles className="w-4 h-4" />}
                {label}
              </button>
            );
          })}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {shopItems.map((item) => {
            const canAfford = player.merits >= item.cost;
            const isEquippedWeapon =
              item.category === 'WEAPON' && player.equippedWeapon === item.name;
            const isAlreadyPurchasedSkill =
              item.category === 'SKILL' && purchasedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`group relative rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isDeva
                    ? 'bg-slate-900/70 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/90'
                    : 'bg-slate-950/70 border-slate-800 hover:border-rose-500/50 hover:bg-slate-900/90'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                          isDeva
                            ? 'bg-sky-950/60 border-sky-500/40'
                            : 'bg-rose-950/60 border-rose-500/40'
                        }`}
                      >
                        {getIcon(item)}
                      </div>
                      <div>
                        <div className="font-cinzel text-xs text-amber-400/90 tracking-wide">
                          {item.sanskritName}
                        </div>
                        <h4 className="font-cinzel text-base font-bold text-slate-100 group-hover:text-amber-200 transition-colors">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    {/* Cost Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-cinzel font-bold text-sm">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      {item.cost}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {item.description}
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 mb-3">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {item.statBonus}
                  </div>
                </div>

                {/* Purchase Button */}
                <button
                  type="button"
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford || isEquippedWeapon || isAlreadyPurchasedSkill}
                  className={`w-full py-2.5 rounded-xl font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isEquippedWeapon || isAlreadyPurchasedSkill
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : canAfford
                      ? isDeva
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]'
                      : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  {isEquippedWeapon ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Currently Equipped
                    </>
                  ) : isAlreadyPurchasedSkill ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Astra Unlocked
                    </>
                  ) : canAfford ? (
                    <>
                      <Coins className="w-4 h-4" />
                      Acquire ({item.cost} Merits)
                    </>
                  ) : (
                    'Not Enough Merits'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Merits are earned continuously by slaying enemies, capturing shrines, and fulfilling camp quests.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 font-cinzel font-bold cursor-pointer"
          >
            Return to Frontline
          </button>
        </div>
      </div>
    </div>
  );
};
