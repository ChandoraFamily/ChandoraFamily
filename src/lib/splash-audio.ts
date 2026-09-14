"use client";

// Audio controller and procedural Web Audio synthesizers for Lineage Chronicles Splash Screen
// Supports custom MP3 files (/sounds/jai-maa-chamunda.mp3, /sounds/eagle-chirp.mp3, /sounds/fire-crackle.mp3)
// with procedural Web Audio API & Speech Synthesis fallback so audio always works without external files.

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

let activeFireSource: { stop: () => void } | null = null;
let customAudioUrls: {
  chamunda?: string;
  eagle?: string;
  fire?: string;
} = {};

export function setCustomAudioUrl(type: "chamunda" | "eagle" | "fire", url: string) {
  customAudioUrls[type] = url;
}

/**
 * Plays the "Jai Maa Chamunda" audio.
 * Attempts to load /sounds/jai-maa-chamunda.mp3, /audio/jai-maa-chamunda.mp3, or custom URL.
 * If not found, synthesizes sacred temple bell harmonics + conch resonance and speaks "जय माँ चामुण्डा".
 */
export async function playJaiMaaChamundaSound(muted = false): Promise<void> {
  if (muted || typeof window === "undefined") return;

  const audioFilesToTry = [
    customAudioUrls.chamunda,
    "/sounds/jai-maa-chamunda.mp3",
    "/audio/jai-maa-chamunda.mp3",
    "/sounds/jai_maa_chamunda.mp3",
    "/sounds/chamunda.mp3",
  ].filter(Boolean) as string[];

  // Try playing real file
  for (const src of audioFilesToTry) {
    try {
      const audio = new Audio(src);
      audio.volume = 0.9;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        return; // successfully playing
      }
    } catch {
      // Continue to next or fallback
    }
  }

  // Fallback: Procedural Divine Temple Bells, Conch & Sacred Devotional Voice
  const ctx = getAudioContext();
  if (ctx) {
    playTempleBellsAndConch(ctx);
  }

  // Sacred voice chant "जय माँ चामुण्डा" using SpeechSynthesis
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("जय माँ चामुण्डा, जय माँ चामुण्डा");
      utterance.lang = "hi-IN";
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Select Hindi voice if available
      const voices = window.speechSynthesis.getVoices();
      const hiVoice = voices.find((v) => v.lang.startsWith("hi") || v.lang.includes("Hindi"));
      if (hiVoice) {
        utterance.voice = hiVoice;
      }
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 350);
    } catch {
      // ignore
    }
  }
}

/**
 * Synthesizes sacred temple bells (Ghanṭā) and divine deep conch (Shankha) resonance
 */
function playTempleBellsAndConch(ctx: AudioContext) {
  const now = ctx.currentTime;

  // Deep resonant drone (OM / Conch vibration)
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = "sine";
  droneOsc.frequency.setValueAtTime(136.1, now); // 136.1 Hz is traditional Vedic OM frequency
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(0.35, now + 0.5);
  droneGain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);
  droneOsc.connect(droneGain);
  droneGain.connect(ctx.destination);
  droneOsc.start(now);
  droneOsc.stop(now + 4.5);

  // Temple Bell Chimes with multi-harmonic overtone series (Ghanṭā)
  const bellFrequencies = [528, 1056, 1584, 2112, 2640];
  const bellDampings = [3.5, 2.8, 2.2, 1.6, 1.2];

  [0, 0.6, 1.4].forEach((strikeDelay, strikeIdx) => {
    const strikeTime = now + strikeDelay;
    bellFrequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq * (strikeIdx === 1 ? 1.25 : 1), strikeTime);

      const amp = (0.28 / (i + 1)) * (strikeIdx === 0 ? 1 : 0.7);
      gain.gain.setValueAtTime(0, strikeTime);
      gain.gain.linearRampToValueAtTime(amp, strikeTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + bellDampings[i]);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(strikeTime);
      osc.stop(strikeTime + bellDampings[i] + 0.1);
    });
  });
}

/**
 * Plays the majestic Eagle Chirp / Screech sound.
 * Attempts file first, then synthesizes authentic eagle raptor cry.
 */
export async function playEagleChirpSound(muted = false): Promise<void> {
  if (muted || typeof window === "undefined") return;

  const audioFilesToTry = [
    customAudioUrls.eagle,
    "/sounds/eagle-chirp.mp3",
    "/sounds/eagle.mp3",
    "/audio/eagle-chirp.mp3",
    "/sounds/hawk.mp3",
  ].filter(Boolean) as string[];

  for (const src of audioFilesToTry) {
    try {
      const audio = new Audio(src);
      audio.volume = 0.85;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        return;
      }
    } catch {
      // Continue to synthesis
    }
  }

  // Procedural Eagle Screech Synthesis via Web Audio API
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // A raptor cry is composed of an initial sharp rising attack followed by a downward rasping scream with FM vibrato
  [0, 0.45].forEach((chirpOffset, idx) => {
    const start = now + chirpOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // FM Vibrato modulator for authentic screech texture
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(22, start); // 22 Hz rapid vibrato
    vibratoGain.gain.setValueAtTime(140, start);
    vibrato.connect(osc.frequency);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2800, start);
    filter.Q.setValueAtTime(4, start);

    osc.type = "sawtooth";

    // Eagle screech pitch sweep: rising quickly from 2100 to 3400, then gliding down to 1800
    osc.frequency.setValueAtTime(2100, start);
    osc.frequency.exponentialRampToValueAtTime(3400 - idx * 200, start + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1850, start + 0.38);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.26, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

    vibrato.start(start);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.44);
    vibrato.stop(start + 0.44);
  });
}

/**
 * Starts ambient burning fire crackling & roaring flame sound.
 * Loops while the Sacred Fire stage is active.
 */
export function startFireSound(muted = false): { stop: () => void } {
  stopFireSound();

  if (muted || typeof window === "undefined") {
    return { stop: () => {} };
  }

  const audioFilesToTry = [
    customAudioUrls.fire,
    "/sounds/fire-crackle.mp3",
    "/sounds/fire.mp3",
    "/audio/fire-crackle.mp3",
  ].filter(Boolean) as string[];

  let audioElement: HTMLAudioElement | null = null;

  for (const src of audioFilesToTry) {
    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0.75;
      audio.play().then(() => {
        audioElement = audio;
      }).catch(() => {});
      if (audioElement) break;
    } catch {
      // Continue
    }
  }

  if (audioElement) {
    activeFireSource = {
      stop: () => {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
          audioElement = null;
        }
      },
    };
    return activeFireSource;
  }

  // Procedural Web Audio Burning Fire & Crackle Generator
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  let isRunning = true;
  const now = ctx.currentTime;

  // 1. Low frequency roaring flame rumble
  const rumbleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const rumbleData = rumbleBuffer.getChannelData(0);
  let lastVal = 0;
  for (let i = 0; i < rumbleBuffer.length; i++) {
    const white = Math.random() * 2 - 1;
    lastVal = (lastVal + 0.02 * white) / 1.02; // Brown noise for deep roar
    rumbleData[i] = lastVal * 3.5;
  }

  const rumbleSrc = ctx.createBufferSource();
  rumbleSrc.buffer = rumbleBuffer;
  rumbleSrc.loop = true;

  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.setValueAtTime(140, now);

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.28, now);

  rumbleSrc.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  rumbleSrc.start(now);

  // 2. Continuous crackles and wood pops using random short bursts
  let crackleTimeoutId: NodeJS.Timeout | null = null;

  const scheduleNextPop = () => {
    if (!isRunning || !ctx || ctx.state === "closed") return;

    const delay = Math.random() * 120 + 40; // 40-160ms between snaps
    crackleTimeoutId = setTimeout(() => {
      if (!isRunning) return;
      playWoodCrackSnap(ctx);
      scheduleNextPop();
    }, delay);
  };

  scheduleNextPop();

  activeFireSource = {
    stop: () => {
      isRunning = false;
      if (crackleTimeoutId) clearTimeout(crackleTimeoutId);
      try {
        rumbleGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        setTimeout(() => {
          try {
            rumbleSrc.stop();
            rumbleSrc.disconnect();
          } catch {}
        }, 220);
      } catch {}
      activeFireSource = null;
    },
  };

  return activeFireSource;
}

function playWoodCrackSnap(ctx: AudioContext) {
  try {
    const now = ctx.currentTime;
    const isLoudSnap = Math.random() < 0.25;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(Math.random() * 800 + 400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + (isLoudSnap ? 0.05 : 0.025));

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(Math.random() * 2500 + 1200, now);
    filter.Q.setValueAtTime(isLoudSnap ? 6 : 3, now);

    const amp = isLoudSnap ? Math.random() * 0.3 + 0.2 : Math.random() * 0.12 + 0.04;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isLoudSnap ? 0.06 : 0.03));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isLoudSnap ? 0.07 : 0.035));
  } catch {}
}

export function stopFireSound() {
  if (activeFireSource) {
    activeFireSource.stop();
    activeFireSource = null;
  }
}
