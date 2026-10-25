import React from 'react';

interface LeaderClashBannerProps {
  className?: string;
  compact?: boolean;
}

export const LeaderClashBanner: React.FC<LeaderClashBannerProps> = ({
  className = '',
  compact = false,
}) => {
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl bg-[#070b14] select-none ${className}`}
    >
      {/* Background Cosmic Energy Battlefield Canvas */}
      <svg
        viewBox="0 0 1000 420"
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#08142c" />
            <stop offset="35%" stopColor="#1a1c3d" />
            <stop offset="65%" stopColor="#2c0f20" />
            <stop offset="100%" stopColor="#1f060a" />
          </linearGradient>

          <radialGradient id="brahmaHalo" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#08142c" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="asuraFire" cx="70%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#ea580c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1f060a" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="goldPlate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="obsidianPlate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#09050d" />
          </linearGradient>
        </defs>

        {/* 1. Background Sky & Cosmic Clash Fissure */}
        <rect width="1000" height="420" fill="url(#bgGrad)" />

        {/* Dynamic Storm Clouds & Energy Waves */}
        <circle cx="280" cy="180" r="240" fill="url(#brahmaHalo)" />
        <circle cx="720" cy="190" r="240" fill="url(#asuraFire)" />

        {/* Distant Armies & War Banners Silhouettes */}
        <g opacity="0.35">
          {/* Deva Army Chariots & Flags */}
          <path d="M40 340 L80 300 L120 340 L160 305 L200 340 L240 295 L280 340 L320 310 L360 340" stroke="#38bdf8" strokeWidth="2" fill="none" />
          <line x1="90" y1="340" x2="90" y2="280" stroke="#facc15" strokeWidth="2" />
          <polygon points="90,280 120,295 90,310" fill="#facc15" />
          <line x1="210" y1="340" x2="210" y2="270" stroke="#38bdf8" strokeWidth="2" />
          <polygon points="210,270 245,285 210,300" fill="#38bdf8" />

          {/* Asura Army Spikes & Dark Horn Flags */}
          <path d="M640 340 L680 295 L720 340 L760 305 L800 340 L840 290 L880 340 L920 305 L960 340" stroke="#f43f5e" strokeWidth="2" fill="none" />
          <line x1="780" y1="340" x2="780" y2="270" stroke="#e11d48" strokeWidth="2" />
          <polygon points="780,270 750,285 780,300" fill="#e11d48" />
          <line x1="900" y1="340" x2="900" y2="265" stroke="#ea580c" strokeWidth="2" />
          <polygon points="900,265 865,280 900,295" fill="#ea580c" />
        </g>

        {/* 2. Central Clash Vortex & Lightning Arcs */}
        <g>
          {/* Holy Astra Laser Beam from Brahma */}
          <line x1="380" y1="190" x2="520" y2="200" stroke="#fde047" strokeWidth="6" strokeLinecap="round" />
          <line x1="370" y1="185" x2="515" y2="198" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />

          {/* Demonic Nether Shockwave from Asura King */}
          <line x1="620" y1="210" x2="520" y2="200" stroke="#e11d48" strokeWidth="7" strokeLinecap="round" />
          <line x1="630" y1="215" x2="525" y2="202" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" />

          {/* Clash Impact Ring */}
          <circle cx="520" cy="200" r="35" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
          <circle cx="520" cy="200" r="60" fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
          <circle cx="520" cy="200" r="90" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.5" />

          {/* Spark Rays */}
          <line x1="520" y1="200" x2="480" y2="130" stroke="#fde047" strokeWidth="2" />
          <line x1="520" y1="200" x2="560" y2="125" stroke="#f87171" strokeWidth="2" />
          <line x1="520" y1="200" x2="495" y2="270" stroke="#67e8f9" strokeWidth="2" />
          <line x1="520" y1="200" x2="550" y2="275" stroke="#ea580c" strokeWidth="2" />
        </g>

        {/* 3. LEFT HEROIC FIGURE: LORD BRAHMA (LEADER OF THE GODS) */}
        <g transform="translate(140, 70)">
          {/* Giant Celestial Solar Halo */}
          <circle cx="140" cy="110" r="105" fill="none" stroke="#fde047" strokeWidth="4" />
          <circle cx="140" cy="110" r="95" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8 6" />
          {/* Radiating Lotus Petals Halo */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1={140 + Math.cos((deg * Math.PI) / 180) * 98}
              y1={110 + Math.sin((deg * Math.PI) / 180) * 98}
              x2={140 + Math.cos((deg * Math.PI) / 180) * 115}
              y2={110 + Math.sin((deg * Math.PI) / 180) * 115}
              stroke="#facc15"
              strokeWidth="2.5"
            />
          ))}

          {/* Robes & Torso */}
          <path d="M80 310 C100 210 110 170 140 170 C170 170 180 210 200 310 Z" fill="#d97706" />
          <path d="M100 310 C120 220 125 180 140 180 C155 180 160 220 180 310 Z" fill="#fef3c7" />

          {/* Golden Sacred Sash (Yajnopavita / Uttariya) */}
          <path d="M105 175 Q135 240 165 310" stroke="#f59e0b" strokeWidth="6" fill="none" />
          <path d="M108 175 Q138 240 168 310" stroke="#fde047" strokeWidth="2" fill="none" />

          {/* Four Faces / Heads of Lord Brahma */}
          {/* Left Side Face */}
          <ellipse cx="105" cy="115" rx="20" ry="26" fill="#fde68a" />
          <path d="M92 100 L105 70 L118 100 Z" fill="url(#goldPlate)" />
          <path d="M95 125 Q105 145 105 150" stroke="#ffffff" strokeWidth="3" fill="none" />

          {/* Right Side Face */}
          <ellipse cx="175" cy="115" rx="20" ry="26" fill="#fde68a" />
          <path d="M162 100 L175 70 L188 100 Z" fill="url(#goldPlate)" />
          <path d="M175 125 Q175 145 185 150" stroke="#ffffff" strokeWidth="3" fill="none" />

          {/* Center Main Majestic Face */}
          <ellipse cx="140" cy="110" rx="26" ry="34" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
          {/* Eyes & Divine Third Eye Tilak */}
          <line x1="126" y1="108" x2="135" y2="108" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="145" y1="108" x2="154" y2="108" stroke="#1e293b" strokeWidth="2.5" />
          <ellipse cx="140" cy="100" rx="3" ry="5" fill="#e11d48" />

          {/* Flowing White Sage Beard of Creation */}
          <path d="M120 125 C125 195 155 195 160 125 Q140 145 120 125 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Grand Central Mukut (Golden Crown) */}
          <path d="M118 85 L140 38 L162 85 Z" fill="url(#goldPlate)" stroke="#78350f" strokeWidth="1" />
          <polygon points="140,32 145,45 135,45" fill="#fde047" />
          <circle cx="140" cy="65" r="4" fill="#ef4444" />

          {/* Raised Hand with Sacred Golden Lotus & Vedas */}
          <circle cx="215" cy="175" r="14" fill="#fef08a" />
          {/* Blooming Pink Lotus */}
          <path d="M215 155 C205 165 205 180 215 185 C225 180 225 165 215 155 Z" fill="#f43f5e" />
          <path d="M202 165 C208 175 222 175 228 165" stroke="#fbcfe8" strokeWidth="2" fill="none" />

          {/* Sanskrit Name Banner */}
          <rect x="70" y="325" width="140" height="26" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="140" y="342" fill="#fde047" fontSize="12" fontWeight="bold" fontFamily="Cinzel" textAnchor="middle">
            LORD BRAHMA
          </text>
        </g>

        {/* 4. RIGHT DEMONIC FIGURE: ASURA OVERLORD (LEADER OF THE ASURAS) */}
        <g transform="translate(620, 50)">
          {/* Swirling Netherfire Aura */}
          <ellipse cx="140" cy="130" rx="100" ry="110" fill="none" stroke="#e11d48" strokeWidth="4" />
          <ellipse cx="140" cy="130" rx="90" ry="100" fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="10 6" />

          {/* Massive Muscular Armored Torso with Spikes */}
          <path d="M70 330 C85 220 100 170 140 170 C180 170 195 220 210 330 Z" fill="url(#obsidianPlate)" stroke="#991b1b" strokeWidth="2" />

          {/* Glowing Red Hellfire Veins on Chestplate */}
          <path d="M140 180 L140 280" stroke="#f43f5e" strokeWidth="4" />
          <path d="M100 220 L140 240 L180 220" stroke="#ea580c" strokeWidth="3" fill="none" />
          <path d="M95 260 L140 280 L185 260" stroke="#f43f5e" strokeWidth="2.5" fill="none" />

          {/* Heavy Spiked Pauldrons (Shoulders) */}
          <polygon points="65,190 40,165 75,160 90,195" fill="#18181b" stroke="#ef4444" strokeWidth="1.5" />
          <polygon points="215,190 240,165 205,160 190,195" fill="#18181b" stroke="#ef4444" strokeWidth="1.5" />

          {/* Demonic Horned Head */}
          <ellipse cx="140" cy="120" rx="28" ry="36" fill="#1e1b4b" stroke="#7f1d1d" strokeWidth="2" />

          {/* Giant Curved Obsidian Horns */}
          <path d="M118 105 C95 80 70 50 60 15 C85 45 105 75 125 95 Z" fill="#09050d" stroke="#ef4444" strokeWidth="2" />
          <path d="M162 105 C185 80 210 50 220 15 C195 45 175 75 155 95 Z" fill="#09050d" stroke="#ef4444" strokeWidth="2" />

          {/* Glowing Crimson Demonic Eyes & Fanged Mouth */}
          <polygon points="122,118 132,114 130,122" fill="#ef4444" />
          <polygon points="148,114 158,118 150,122" fill="#ef4444" />
          <circle cx="127" cy="118" r="1.5" fill="#ffffff" />
          <circle cx="153" cy="118" r="1.5" fill="#ffffff" />
          {/* Fangs */}
          <path d="M130 135 L135 144 L140 135 L145 144 L150 135" stroke="#ffffff" strokeWidth="2" fill="none" />

          {/* Massive Jagged Barbed War Mace */}
          <line x1="80" y1="210" x2="-20" y2="150" stroke="#334155" strokeWidth="9" strokeLinecap="round" />
          <circle cx="-25" cy="145" r="24" fill="#0f172a" stroke="#dc2626" strokeWidth="3" />
          {/* Spikes on mace */}
          <polygon points="-25,120 -32,135 -18,135" fill="#ef4444" />
          <polygon points="-50,145 -35,138 -35,152" fill="#ef4444" />
          <polygon points="-25,170 -32,155 -18,155" fill="#ef4444" />
          <polygon points="0,145 -15,138 -15,152" fill="#ef4444" />

          {/* Sanskrit Name Banner */}
          <rect x="65" y="345" width="150" height="26" rx="6" fill="#0f172a" stroke="#e11d48" strokeWidth="1.5" />
          <text x="140" y="362" fill="#f87171" fontSize="12" fontWeight="bold" fontFamily="Cinzel" textAnchor="middle">
            DEMON OVERLORD
          </text>
        </g>

        {/* 5. Center Title Emblem Overlay */}
        <g transform="translate(380, 295)">
          <rect x="0" y="0" width="240" height="48" rx="10" fill="#050811" stroke="#f59e0b" strokeWidth="1.5" opacity="0.95" />
          <text x="120" y="20" fill="#facc15" fontSize="11" fontWeight="bold" fontFamily="Cinzel" textAnchor="middle" letterSpacing="2">
            LEADERS OF THE COSMIC WAR
          </text>
          <text x="120" y="37" fill="#e2e8f0" fontSize="9" fontWeight="600" fontFamily="Rajdhani" textAnchor="middle" letterSpacing="1">
            DIVINE GODS VS NETHER HORDE
          </text>
        </g>
      </svg>
    </div>
  );
};
