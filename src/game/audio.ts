class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Conch Shell (Shankha) - sacred resonance for Devas or battle horns
  public playShankha(frequency: number = 220) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Frequency envelope with subtle vibrato
    osc.frequency.setValueAtTime(frequency * 0.9, t);
    osc.frequency.linearRampToValueAtTime(frequency, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.05, t + 1.2);

    // Warm low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(900, t + 0.4);
    filter.frequency.exponentialRampToValueAtTime(300, t + 1.5);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.6);
  }

  // War Drum (Nagara / Dholak)
  public playWarDrum(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);

    gain.gain.setValueAtTime(0.35 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Sword / Weapon Clash
  public playSwordClash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Vajra Lightning / Thunder
  public playLightning() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // White noise burst for thunder
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Demonic Hellfire / Roar
  public playDemonRoar() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.7);
  }

  // Realistic Physical Attack Grunts
  public playAttackGrunt(isDeva: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const formantFilter1 = this.ctx.createBiquadFilter();
    const formantFilter2 = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isDeva ? 'sawtooth' : 'triangle';
    const baseFreq = isDeva ? 150 + Math.random() * 30 : 90 + Math.random() * 20;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 0.14);

    // Formants for vocal 'Ha' / 'Hoo' sound
    formantFilter1.type = 'bandpass';
    formantFilter1.frequency.setValueAtTime(isDeva ? 750 : 500, t);
    formantFilter1.Q.setValueAtTime(3.5, t);

    formantFilter2.type = 'bandpass';
    formantFilter2.frequency.setValueAtTime(isDeva ? 1400 : 950, t);
    formantFilter2.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(formantFilter1);
    osc.connect(formantFilter2);
    formantFilter1.connect(gain);
    formantFilter2.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Realistic Physical Hurt / Impact Grunt
  public playHurtGrunt(isDeva: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = isDeva ? 180 : 110;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  // Realistic Metallic Sword Clash with multiple resonance harmonics
  public playRealisticSwordClash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Primary sharp scrape
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200 + Math.random() * 800, t);
    noiseFilter.Q.setValueAtTime(4.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // Resonant metallic ring tones
    const metalPitches = [1420 + Math.random() * 50, 2840, 4260];
    metalPitches.forEach((pitch, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, t);

      const amp = (0.16 / (i + 1)) * (0.8 + Math.random() * 0.4);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + i * 0.08);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // Great War Horn (Shankha / Demonic Trumpet)
  public playWarHorn(faction: 'DEVAS' | 'ASURAS' = 'DEVAS') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const isDeva = faction === 'DEVAS';
    const fundamental = isDeva ? 220 : 130;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(fundamental * 0.96, t);
    osc1.frequency.linearRampToValueAtTime(fundamental, t + 0.35);
    osc1.frequency.linearRampToValueAtTime(fundamental * 1.03, t + 1.6);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(fundamental * 2, t);
    osc2.frequency.linearRampToValueAtTime(fundamental * 2, t + 1.6);

    filter.type = isDeva ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isDeva ? 800 : 450, t);
    filter.frequency.linearRampToValueAtTime(isDeva ? 1200 : 700, t + 0.5);
    filter.frequency.exponentialRampToValueAtTime(400, t + 2.0);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.4);
    gain.gain.linearRampToValueAtTime(0.28, t + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.3);
    osc2.stop(t + 2.3);
  }

  // Killstreak & Multi-kill sound stings with war drums
  public playKillSting(streakCount: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.playWarDrum(1.2);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const startNote = 330 + streakCount * 45;
    osc.frequency.setValueAtTime(startNote, t);
    osc.frequency.exponentialRampToValueAtTime(startNote * 1.5, t + 0.18);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.32);

    if (streakCount >= 3) {
      setTimeout(() => this.playWarHorn('DEVAS'), 200);
    }
  }

  // Cinematic Boom / Impact
  public playCinematicBoom() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.5);
  }

  // Level Up Ascension Chime
  public playLevelUp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C major pentatonic
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  // Player Damaged / Hurt
  public playHurt() {
    this.playHurtGrunt(true);
  }

  // Victory / Quest / Merit Fanfare
  public playVictoryFanfare() {
    this.playLevelUp();
    this.playWarHorn('DEVAS');
  }
}

export const sound = new SoundEngine();

