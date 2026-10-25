import React, { useState } from 'react';
import { Faction, HeroClass, PlayerCharacter } from '../game/types';
import { createInitialCharacter } from '../game/rules';
import { Shield, Zap, Sparkles, Flame, Swords, ArrowRight } from 'lucide-react';
import { LeaderClashBanner } from './LeaderClashBanner';

interface CharacterCreatorProps {
  onStartGame: (char: PlayerCharacter) => void;
  onWatchPrologue?: () => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onStartGame, onWatchPrologue }) => {
  const [faction, setFaction] = useState<Faction>('DEVAS');
  const [heroClass, setHeroClass] = useState<HeroClass>('VAJRA_WARRIOR');
  const [heroName, setHeroName] = useState<string>('Arjuna');

  const devaClasses: { id: HeroClass; name: string; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'VAJRA_WARRIOR',
      name: 'Vajra-Wielder',
      title: 'Bearer of Indra’s Thunder',
      desc: 'Balanced frontline powerhouse wields chain-lightning astras and high defense.',
      icon: <Zap className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'SURYA_ARCHER',
      name: 'Surya Radiant Archer',
      title: 'Solar Disciple of the Sun',
      desc: 'Swift marksman firing high-velocity solar beams that pierce demonic ranks.',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'RUDRA_VANGUARD',
      name: 'Rudra Vanguard',
      title: 'Avatar of Mahakaal',
      desc: 'Heavy bruiser unleashing cosmic vortexes and earth-shaking shockwaves.',
      icon: <Swords className="w-5 h-5 text-purple-400" />,
    },
  ];

  const asuraClasses: { id: HeroClass; name: string; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'MAHISHA_BERSERKER',
      name: 'Dread Berserker',
      title: 'Blood Horn of the Abyss',
      desc: 'Vicious cleaver draining enemy vitality through dark Maya blood waves.',
      icon: <Flame className="w-5 h-5 text-rose-500" />,
    },
    {
      id: 'RAVANA_SORCERER',
      name: 'Mayavi Sorcerer',
      title: 'Master of Dark Maya',
      desc: 'Summons cursed Chandrahas moon-blades from the void with high critical burst.',
      icon: <Sparkles className="w-5 h-5 text-violet-400" />,
    },
    {
      id: 'TARAKA_TITAN',
      name: 'Hellfire Titan',
      title: 'Indestructible Behemoth',
      desc: 'Colossal titan with supreme armor that triggers volcanic magma fissures.',
      icon: <Shield className="w-5 h-5 text-orange-500" />,
    },
  ];

  const handleFactionChange = (newFaction: Faction) => {
    setFaction(newFaction);
    if (newFaction === 'DEVAS') {
      setHeroClass('VAJRA_WARRIOR');
      setHeroName('Arjuna');
    } else {
      setHeroClass('MAHISHA_BERSERKER');
      setHeroName('Mahisha');
    }
  };

  const handleStart = () => {
    const char = createInitialCharacter(heroName, faction, heroClass);
    onStartGame(char);
  };

  const currentClassList = faction === 'DEVAS' ? devaClasses : asuraClasses;
  const isDeva = faction === 'DEVAS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#04060d]/90 overflow-y-auto">
      {/* Background Mythological Ambient Art Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600 via-rose-900 to-transparent" />

      <div className="relative w-full max-w-4xl bg-[#090d16] border border-amber-900/40 rounded-2xl shadow-2xl p-6 md:p-8 text-slate-100 flex flex-col gap-6">
        {/* Title Lockup */}
        <div className="text-center space-y-1">
          <div className="inline-block text-xs uppercase tracking-[0.3em] font-semibold text-amber-400/80 px-3 py-1 rounded border border-amber-500/20 bg-amber-500/5">
            Ancient Mythological War of Bharat
          </div>
          <h1 className="font-cinzel text-3xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-rose-400 drop-shadow-sm">
            MYSTIC BATTLEFIELD
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Choose your allegiance in the eternal cosmic war. Slay foes on the frontline, gain experience, and awaken cataclysmic Astras and Demonic wrath.
          </p>
        </div>

        {/* Majestic Leader Clash Artwork: Lord Brahma vs Demonic Asura Overlord */}
        <LeaderClashBanner className="max-h-52 w-full object-cover" />

        {/* Faction Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Devas Button */}
          <button
            type="button"
            onClick={() => handleFactionChange('DEVAS')}
            className={`p-5 rounded-xl border text-left transition-all relative overflow-hidden ${
              isDeva
                ? 'border-sky-400 bg-sky-950/40 shadow-[0_0_25px_rgba(56,189,248,0.25)] ring-2 ring-sky-400/30'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-cinzel text-lg font-bold text-sky-300 flex items-center gap-2">
                <span className="text-xl">☀️</span> THE DIVINE HOST (DEVAS)
              </span>
              {isDeva && (
                <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-400/30 uppercase tracking-widest font-semibold">
                  Selected
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-300">
              Masters of the celestial heavens and solar astras. Summon Indra’s Vajra lightning, Surya’s sunbeams, and Sudarshana Chakra to uphold cosmic Dharma.
            </p>
          </button>

          {/* Asuras Button */}
          <button
            type="button"
            onClick={() => handleFactionChange('ASURAS')}
            className={`p-5 rounded-xl border text-left transition-all relative overflow-hidden ${
              !isDeva
                ? 'border-rose-500 bg-rose-950/40 shadow-[0_0_25px_rgba(244,63,94,0.25)] ring-2 ring-rose-500/30'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-cinzel text-lg font-bold text-rose-400 flex items-center gap-2">
                <span className="text-xl">🔥</span> THE NETHER HORDE (ASURAS)
              </span>
              {!isDeva && (
                <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-400/30 uppercase tracking-widest font-semibold">
                  Selected
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-300">
              Lords of Netherfire and dark Maya sorcery. Wield Ravana’s Chandrahas void blades, blood-leeches, and primordial Asura Tandava wrath to conquer the realm.
            </p>
          </button>
        </div>

        {/* Hero Archetype Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Select Champion Class & Astra Mastery
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentClassList.map((cls) => {
              const selected = heroClass === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setHeroClass(cls.id)}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selected
                      ? isDeva
                        ? 'border-sky-400 bg-sky-900/30 ring-1 ring-sky-400'
                        : 'border-rose-500 bg-rose-900/30 ring-1 ring-rose-500'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-2">
                      {cls.icon}
                      <h4 className="font-cinzel font-bold text-slate-100 text-sm">
                        {cls.name}
                      </h4>
                    </div>
                    <div className="text-[11px] font-semibold text-amber-400/90 italic">
                      {cls.title}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {cls.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Character Name Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Warrior Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                maxLength={20}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950/80 border border-slate-700 focus:border-amber-400 focus:outline-none text-slate-100 font-cinzel"
                placeholder="Enter hero name..."
              />
              <button
                type="button"
                onClick={() => {
                  const devaNames = ['Arjuna', 'Karna', 'Indrajit', 'Bheeshma', 'Aswatthama', 'Garuda'];
                  const asuraNames = ['Mahisha', 'Ravana', 'Tarakasura', 'Kumbhakarna', 'Vritra', 'Bhasmasura'];
                  const pool = isDeva ? devaNames : asuraNames;
                  setHeroName(pool[Math.floor(Math.random() * pool.length)]);
                }}
                className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Randomize
              </button>
            </div>
          </div>

          {/* Quick Perks / Summary */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs space-y-1">
            <div className="text-amber-400 font-semibold uppercase tracking-wider">
              Battlefield Directive:
            </div>
            <div className="text-slate-300">
              Advance to the frontlines. Slay enemy soldiers to earn XP and level up from Lv 1 to Lv 20. Capture Shrines of Power to swing battle momentum.
            </div>
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Controls: <span className="text-slate-200 font-semibold">WASD</span> to Move · <span className="text-slate-200 font-semibold">Mouse</span> to Aim · <span className="text-slate-200 font-semibold">Left Click</span> Attack · <span className="text-slate-200 font-semibold">Space</span> Dash · <span className="text-slate-200 font-semibold">1, 2, 3, 4</span> Astras
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {onWatchPrologue && (
              <button
                type="button"
                onClick={onWatchPrologue}
                className="w-full md:w-auto px-5 py-3 rounded-xl font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/40 text-amber-200 hover:text-white hover:border-amber-400 transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Watch War Prologue</span>
              </button>
            )}

            <button
              type="button"
              data-start="true"
              onClick={handleStart}
              className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-cinzel font-bold text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg ${
                isDeva
                  ? 'bg-gradient-to-r from-sky-500 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-slate-950 shadow-sky-500/20'
                  : 'bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-rose-600/20'
              }`}
            >
              <span>Enter the Battlefield</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
