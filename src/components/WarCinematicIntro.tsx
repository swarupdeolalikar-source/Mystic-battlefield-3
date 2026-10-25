/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, SkipForward, Play, Shield, Swords, Sparkles, Flame } from 'lucide-react';
import { sound } from '../game/audio';

interface WarCinematicIntroProps {
  onComplete: () => void;
  playerFaction?: 'DEVAS' | 'ASURAS';
}

interface CinematicScene {
  id: number;
  actTitle: string;
  headline: string;
  narration: string;
  duration: number; // in seconds
  theme: 'COSMIC' | 'DEVAS' | 'ASURAS' | 'CLASH';
  cameraZoomStart: number;
  cameraZoomEnd: number;
}

const CINEMATIC_SCENES: CinematicScene[] = [
  {
    id: 1,
    actTitle: 'ACT I: THE COSMIC FRACTURE',
    headline: 'Eons of strife tear the sacred cosmos asunder',
    narration:
      'From the churning of the primordial ocean arose the nectar of immortality. Neither gods nor demons would yield dominion, splitting the universe between the golden spires of Mount Meru and the volcanic fires of the Nether Abysses.',
    duration: 8.5,
    theme: 'COSMIC',
    cameraZoomStart: 1.0,
    cameraZoomEnd: 1.15,
  },
  {
    id: 2,
    actTitle: 'ACT II: THE TWO IMMORTAL ARMIES',
    headline: 'Celestial astras face unholy underworld legions',
    narration:
      'The Deva hosts assemble under banners of lightning and holy light, invoking the mighty Vajra and Sudarshana Chakra. From the scorched earth, the Asura warlords muster ironclad legions, breathing venom and molten brimstone.',
    duration: 8.5,
    theme: 'DEVAS',
    cameraZoomStart: 1.1,
    cameraZoomEnd: 1.25,
  },
  {
    id: 3,
    actTitle: 'ACT III: THE BATTLEFIELD AWAKENS',
    headline: 'Blood and thunder shake the Himalayas',
    narration:
      'Ancient Power Shrines pulse along the ridges. The earth trembles under war chariots, war drums roar across the foothills, and the blood of fallen warriors fuels the raging momentum of war.',
    duration: 8.0,
    theme: 'CLASH',
    cameraZoomStart: 1.2,
    cameraZoomEnd: 1.35,
  },
  {
    id: 4,
    actTitle: 'ACT IV: THE CALL OF DESTINY',
    headline: 'A champion rises to conquer the battlefield',
    narration:
      'The cosmic balance now rests upon your blade. Advance through enemy ranks, claim the sacred shrines, unleash legendary astras, and claim eternal glory!',
    duration: 8.0,
    theme: 'COSMIC',
    cameraZoomStart: 1.25,
    cameraZoomEnd: 1.05,
  },
];

export const WarCinematicIntro: React.FC<WarCinematicIntroProps> = ({
  onComplete,
  playerFaction = 'DEVAS',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(0);
  const [sceneProgress, setSceneProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);
  const [hasStartedAudio, setHasStartedAudio] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  const sceneStartTimeRef = useRef<number>(Date.now());
  const currentScene = CINEMATIC_SCENES[currentSceneIdx];

  // Narration speech synth
  const speakNarration = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 0.88;
      utterance.volume = isMuted ? 0 : 0.95;

      const voices = window.speechSynthesis.getVoices();
      const deepVoice =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Daniel'))) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (deepVoice) utterance.voice = deepVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synth fallback
    }
  }, [isMuted]);

  // Audio cues on scene change
  useEffect(() => {
    sceneStartTimeRef.current = Date.now();
    setSceneProgress(0);

    if (hasStartedAudio && !isMuted) {
      if (currentScene.theme === 'COSMIC') {
        sound.playWarHorn('DEVAS');
        sound.playWarDrum(1.3);
      } else if (currentScene.theme === 'DEVAS') {
        sound.playWarHorn('DEVAS');
        sound.playShankha(440);
      } else if (currentScene.theme === 'CLASH') {
        sound.playCinematicBoom();
        sound.playRealisticSwordClash();
        sound.playWarDrum(1.5);
      }
      speakNarration(currentScene.narration);
    }
  }, [currentSceneIdx, currentScene, hasStartedAudio, isMuted, speakNarration]);

  // Start audio on first interaction
  const startAudioExperience = () => {
    setHasStartedAudio(true);
    sound.playWarHorn(playerFaction);
    sound.playWarDrum(1.2);
    speakNarration(currentScene.narration);
  };

  const handleSkip = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    sound.playWarDrum(1.0);
    onComplete();
  };

  const handleNextScene = () => {
    if (currentSceneIdx < CINEMATIC_SCENES.length - 1) {
      setCurrentSceneIdx((prev) => prev + 1);
    } else {
      handleSkip();
    }
  };

  // Canvas visual rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle system for cinematic atmosphere
    interface CinematicParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      life: number;
      maxLife: number;
      type: 'EMBER' | 'LIGHT_MOTE' | 'SMOKE' | 'DUST';
    }

    const particles: CinematicParticle[] = [];
    const maxParticles = 120;

    const spawnParticle = () => {
      if (particles.length >= maxParticles) return;
      const isRight = Math.random() > 0.45;
      const theme = currentScene.theme;

      let color = '#fbbf24';
      let type: CinematicParticle['type'] = 'LIGHT_MOTE';

      if (theme === 'DEVAS') {
        color = Math.random() > 0.5 ? '#38bdf8' : '#fef08a';
        type = 'LIGHT_MOTE';
      } else if (theme === 'ASURAS' || isRight) {
        color = Math.random() > 0.5 ? '#f43f5e' : '#fb923c';
        type = 'EMBER';
      }

      particles.push({
        x: Math.random() * width,
        y: height * 0.4 + Math.random() * height * 0.6,
        vx: (Math.random() - 0.5) * 40 + (type === 'EMBER' ? 20 : -15),
        vy: -20 - Math.random() * 50,
        size: 2 + Math.random() * 4,
        color,
        alpha: 0.2 + Math.random() * 0.7,
        life: 0,
        maxLife: 2 + Math.random() * 3,
        type,
      });
    };

    let startTime = Date.now();
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const elapsedInScene = (Date.now() - sceneStartTimeRef.current) / 1000;
      const progress = Math.min(1, elapsedInScene / currentScene.duration);
      setSceneProgress(progress);

      // Auto-advance scene
      if (progress >= 1) {
        if (currentSceneIdx < CINEMATIC_SCENES.length - 1) {
          setCurrentSceneIdx((i) => i + 1);
        } else {
          handleSkip();
          return;
        }
      }

      // Smooth camera zoom
      const zoom =
        currentScene.cameraZoomStart +
        (currentScene.cameraZoomEnd - currentScene.cameraZoomStart) * progress;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Background Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, width, height);
      if (currentScene.theme === 'DEVAS') {
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.5, '#0369a1');
        skyGrad.addColorStop(1, '#0f172a');
      } else if (currentScene.theme === 'ASURAS') {
        skyGrad.addColorStop(0, '#450a0a');
        skyGrad.addColorStop(0.5, '#1c1917');
        skyGrad.addColorStop(1, '#0c0a09');
      } else {
        // Dual split cosmic clash: Golden/Cyan Left to Crimson/Obsidian Right
        skyGrad.addColorStop(0, '#0c4a6e');
        skyGrad.addColorStop(0.48, '#1e1b4b');
        skyGrad.addColorStop(0.52, '#2e1065');
        skyGrad.addColorStop(1, '#450a0a');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant Mythological Mountain Silhouettes with Parallax
      const mountainGradLeft = ctx.createLinearGradient(0, height * 0.3, 0, height);
      mountainGradLeft.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      mountainGradLeft.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

      // Draw Himalayan Peak Silhouettes on Left
      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(zoom, zoom);
      ctx.translate(-width * 0.5, -height * 0.5);

      ctx.beginPath();
      ctx.moveTo(0, height * 0.55);
      ctx.lineTo(width * 0.12, height * 0.38);
      ctx.lineTo(width * 0.22, height * 0.48);
      ctx.lineTo(width * 0.35, height * 0.32);
      ctx.lineTo(width * 0.5, height * 0.58);
      ctx.lineTo(width * 0.5, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = mountainGradLeft;
      ctx.fill();

      // Golden Sun Rays behind Himalayan Ridge
      const sunCenterX = width * 0.28;
      const sunCenterY = height * 0.35;
      const raysGrad = ctx.createRadialGradient(
        sunCenterX,
        sunCenterY,
        10,
        sunCenterX,
        sunCenterY,
        width * 0.5
      );
      raysGrad.addColorStop(0, 'rgba(253, 224, 71, 0.6)');
      raysGrad.addColorStop(0.4, 'rgba(234, 179, 8, 0.2)');
      raysGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
      ctx.fillStyle = raysGrad;
      ctx.beginPath();
      ctx.arc(sunCenterX, sunCenterY, width * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw Volcanic Crags on Right
      const mountainGradRight = ctx.createLinearGradient(0, height * 0.3, 0, height);
      mountainGradRight.addColorStop(0, 'rgba(225, 29, 72, 0.45)');
      mountainGradRight.addColorStop(1, 'rgba(24, 24, 27, 0.95)');

      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.58);
      ctx.lineTo(width * 0.65, height * 0.36);
      ctx.lineTo(width * 0.78, height * 0.49);
      ctx.lineTo(width * 0.9, height * 0.34);
      ctx.lineTo(width, height * 0.52);
      ctx.lineTo(width, height);
      ctx.lineTo(width * 0.5, height);
      ctx.closePath();
      ctx.fillStyle = mountainGradRight;
      ctx.fill();

      // Molten Lava Glow on Right
      const lavaGrad = ctx.createRadialGradient(
        width * 0.8,
        height * 0.7,
        20,
        width * 0.8,
        height * 0.7,
        width * 0.4
      );
      lavaGrad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
      lavaGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
      lavaGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = lavaGrad;
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.7, width * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Foreground Ridge Silhouette
      ctx.beginPath();
      ctx.moveTo(0, height * 0.75);
      ctx.bezierCurveTo(
        width * 0.25,
        height * 0.68,
        width * 0.4,
        height * 0.76,
        width * 0.5,
        height * 0.72
      );
      ctx.bezierCurveTo(
        width * 0.6,
        height * 0.68,
        width * 0.75,
        height * 0.76,
        width,
        height * 0.73
      );
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = '#050508';
      ctx.fill();

      // Army Silhouettes on Frontline
      const numSilhouettes = 36;
      for (let i = 0; i < numSilhouettes; i++) {
        const sx = (i / numSilhouettes) * width;
        const isAlliedDeva = sx < width * 0.48;
        const isDemonicAsura = sx > width * 0.52;
        const sy = height * 0.73 + Math.sin(i * 1.5) * 15;
        const warriorHeight = 22 + (i % 4) * 5;

        // Silhouette head & torso
        ctx.fillStyle = isAlliedDeva ? '#0284c7' : isDemonicAsura ? '#991b1b' : '#334155';
        ctx.beginPath();
        ctx.arc(sx, sy - warriorHeight, 4, 0, Math.PI * 2);
        ctx.fill();

        // Weapon thrust
        ctx.strokeStyle = isAlliedDeva ? '#facc15' : isDemonicAsura ? '#f87171' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - warriorHeight * 0.6);
        const weaponAngle = isAlliedDeva ? 0.35 : -0.35;
        ctx.lineTo(
          sx + Math.cos(weaponAngle) * (warriorHeight + 12),
          sy - warriorHeight * 0.6 - Math.sin(weaponAngle) * (warriorHeight + 12)
        );
        ctx.stroke();
      }

      // Dynamic Shockwave Energy Arc at the Center Line
      const pulseTime = (Date.now() - startTime) / 1000;
      const centerFissureX = width * 0.5 + Math.sin(pulseTime * 3) * 12;
      const shockwaveAlpha = 0.4 + Math.sin(pulseTime * 5) * 0.3;

      ctx.save();
      ctx.strokeStyle = `rgba(251, 191, 36, ${shockwaveAlpha})`;
      ctx.lineWidth = 4 + Math.sin(pulseTime * 8) * 2;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(centerFissureX, height * 0.3);
      for (let y = height * 0.3; y <= height; y += 30) {
        const jitter = Math.sin(y * 0.05 + pulseTime * 6) * 18;
        ctx.lineTo(centerFissureX + jitter, y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // end camera zoom

      // Update & render cinematic atmospheric particles
      if (Math.random() < 0.6) spawnParticle();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.life >= p.maxLife || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        const particleProgress = p.life / p.maxLife;
        const alpha = p.alpha * (1 - particleProgress);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - particleProgress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Vignette effect
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.35,
        width / 2,
        height / 2,
        width * 0.75
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentScene, currentSceneIdx]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-black text-amber-100 select-none">
      {/* Dynamic Cinematic Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-amber-500/40 bg-amber-950/40 backdrop-blur-md shadow-lg shadow-amber-950/50">
            <Swords className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400/90 font-mono font-semibold">
              Kuru-Kshetra: Gods vs Demons
            </div>
            <div className="text-sm font-serif font-bold text-slate-100">
              The Cosmic War Prologue
            </div>
          </div>
        </div>

        {/* Controls: Mute, Scene Navigation, Skip */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
              if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 border border-slate-700/80 hover:border-amber-500/60 text-slate-300 hover:text-amber-300 backdrop-blur-md transition-all text-xs font-mono"
            title="Toggle Narration and Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Sound ON'}</span>
          </button>

          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs tracking-wide shadow-lg shadow-amber-900/40 border border-amber-400/30 transition-all hover:scale-105 active:scale-95"
          >
            <span>Skip to Battle</span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Start Audio Prompt if user has not interacted */}
      {!hasStartedAudio && (
        <div className="relative z-20 mx-auto my-auto max-w-md p-6 text-center bg-black/85 border border-amber-500/50 rounded-2xl backdrop-blur-xl shadow-2xl shadow-amber-900/40 animate-in fade-in zoom-in-95 duration-500">
          <Sparkles className="w-10 h-10 mx-auto text-amber-400 mb-3 animate-bounce" />
          <h2 className="text-xl font-bold font-serif text-amber-200 mb-2">
            Experience the War with Sound
          </h2>
          <p className="text-xs text-amber-100/80 mb-5 leading-relaxed">
            Enable celestial war horns, thunderous drums, and spoken narration for the full mythological battlefield prologue.
          </p>
          <button
            onClick={startAudioExperience}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-bold text-sm shadow-xl shadow-amber-950/60 border border-amber-300/40 transition-transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Engage Audio Experience</span>
          </button>
        </div>
      )}

      {/* Bottom Subtitle / Story Narration Box */}
      <div className="relative z-10 p-6 md:p-8 max-w-4xl mx-auto w-full bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* Scene Progress Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CINEMATIC_SCENES.map((scene, idx) => {
            const isActive = idx === currentSceneIdx;
            const isCompleted = idx < currentSceneIdx;
            const fillWidth = isActive ? `${sceneProgress * 100}%` : isCompleted ? '100%' : '0%';

            return (
              <div
                key={scene.id}
                onClick={() => setCurrentSceneIdx(idx)}
                className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden cursor-pointer hover:bg-slate-700/80 transition-colors"
                title={scene.actTitle}
              >
                <div
                  className={`h-full transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-amber-200 shadow-sm shadow-amber-400'
                      : isCompleted
                      ? 'bg-amber-600'
                      : 'bg-transparent'
                  }`}
                  style={{ width: fillWidth }}
                />
              </div>
            );
          })}
        </div>

        {/* Narrative Card */}
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-amber-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold">
              {currentScene.actTitle}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-sans italic">
              {currentScene.headline}
            </span>
          </div>

          <p className="text-base md:text-lg font-serif leading-relaxed text-amber-100/95 tracking-wide">
            "{currentScene.narration}"
          </p>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Scene {currentSceneIdx + 1} of {CINEMATIC_SCENES.length}</span>
            </div>

            <button
              onClick={handleNextScene}
              className="text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 font-semibold transition-colors"
            >
              <span>{currentSceneIdx === CINEMATIC_SCENES.length - 1 ? 'Enter Battlefield' : 'Next Chapter'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
