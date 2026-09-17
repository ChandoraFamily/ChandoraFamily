"use client";

// Audio controller and procedural Web Audio synthesizers for Lineage Chronicles Splash Screen
// Supports custom MP3 files (/sounds/jai-maa-chamunda.mp3, /sounds/eagle-chirp.mp3, /sounds/fire.mp3)
// with seamless autoplay unlock and procedural Web Audio API & Speech Synthesis fallback.

let sharedAudioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

const activeAudioElements = new Set<HTMLAudioElement>();
const activeWebAudioNodes = new Set<{
  stop?: (when?: number) => void;
  disconnect: () => void;
}>();

const audioBufferCache = new Map<string, AudioBuffer>();
const preloadedAudioElements = new Map<string, HTMLAudioElement>();

let speechTimeoutId: ReturnType<typeof setTimeout> | null = null;
let crackleTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activeFireSource: { stop: () => void } | null = null;

// Track autoplay policy state
let isAudioUnlocked = false;
let autoplayBlockedCallback: ((blocked: boolean) => void) | null = null;
let pendingStageToPlay: 1 | 2 | 3 | null = null;
const pendingMutedAudios = new Set<HTMLAudioElement>();

// Monotonically increasing play request ID to prevent race conditions across stage transitions
let currentPlayRequestId = 0;

let customAudioUrls: {
  chamunda?: string;
  eagle?: string;
  fire?: string;
} = {};

export function setCustomAudioUrl(
  type: "chamunda" | "eagle" | "fire",
  url: string,
) {
  customAudioUrls[type] = url;
}

export function onAutoplayBlocked(callback: (blocked: boolean) => void) {
  autoplayBlockedCallback = callback;
}

function notifyAutoplayBlocked(blocked: boolean) {
  if (autoplayBlockedCallback) {
    try {
      autoplayBlockedCallback(blocked);
    } catch {
      // ignore
    }
  }
}

/**
 * Preloads and decodes audio files into Web Audio buffers ahead of time
 * so stages 1, 2, and 3 play immediately with zero latency and no autoplay blocking.
 */
export async function preloadSplashAudio(): Promise<void> {
  if (typeof window === "undefined") return;

  const audioFiles = [
    "/sounds/jai-maa-chamunda.mp3",
    "/sounds/eagle-chirp.mp3",
    "/sounds/fire.mp3",
  ];

  // 1. Prime HTMLAudioElement instances
  for (const url of audioFiles) {
    if (!preloadedAudioElements.has(url)) {
      try {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.load();
        preloadedAudioElements.set(url, audio);
      } catch {
        // ignore
      }
    }
  }

  // 2. Fetch and decode into Web Audio AudioBuffers
  const setup = getAudioContext();
  if (setup) {
    for (const url of audioFiles) {
      if (!audioBufferCache.has(url)) {
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error("Status " + res.status);
            return res.arrayBuffer();
          })
          .then((arr) => setup.ctx.decodeAudioData(arr))
          .then((decoded) => {
            audioBufferCache.set(url, decoded);
          })
          .catch(() => {
            // ignore network or decode failures
          });
      }
    }
  }
}

export function unlockAudio(): void {
  isAudioUnlocked = true;
  notifyAutoplayBlocked(false);

  // Resume Web Audio Context if suspended
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  } else if (!sharedAudioCtx && typeof window !== "undefined") {
    getAudioContext();
  }

  // Preload buffers
  preloadSplashAudio().catch(() => {});

  // Instantly unmute any audio playing in muted background mode
  for (const audio of Array.from(pendingMutedAudios)) {
    try {
      audio.muted = false;
      audio.volume = 0.95;
    } catch {
      // ignore
    }
  }
  pendingMutedAudios.clear();

  // If there was a pending stage, trigger it
  if (pendingStageToPlay) {
    const stage = pendingStageToPlay;
    pendingStageToPlay = null;
    if (stage === 1) playJaiMaaChamundaSound(false);
    else if (stage === 2) playEagleChirpSound(false);
    else if (stage === 3) startFireSound(false);
  }
}

// Global user interaction listener to unlock & unmute audio on first interaction
if (typeof window !== "undefined") {
  const handleInteraction = () => {
    unlockAudio();
  };

  const events = [
    "pointerdown",
    "touchstart",
    "click",
    "keydown",
    "pointermove",
    "mousemove",
    "wheel",
    "scroll",
    "focus",
  ] as const;

  events.forEach((evt) => {
    window.addEventListener(evt, handleInteraction, {
      capture: true,
      passive: true,
    });
  });

  // Also trigger preload on load
  if (document.readyState === "complete") {
    preloadSplashAudio().catch(() => {});
  } else {
    window.addEventListener("load", () => {
      preloadSplashAudio().catch(() => {});
    });
  }
}

function trackAudio(audio: HTMLAudioElement) {
  activeAudioElements.add(audio);
  const onDone = () => {
    activeAudioElements.delete(audio);
    pendingMutedAudios.delete(audio);
    audio.removeEventListener("ended", onDone);
    audio.removeEventListener("error", onDone);
  };
  audio.addEventListener("ended", onDone);
  audio.addEventListener("error", onDone);
}

function stopAudioElement(audio: HTMLAudioElement) {
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // ignore
  }
  activeAudioElements.delete(audio);
  pendingMutedAudios.delete(audio);
}

/**
 * Attempts unmuted playback first. If the browser blocks unmuted autoplay,
 * starts immediately in muted mode and unmutes automatically on first gesture.
 */
async function attemptPlayAudio(
  audio: HTMLAudioElement,
  reqId: number,
  volume = 0.95,
): Promise<boolean> {
  audio.preload = "auto";
  trackAudio(audio);

  // 1. Attempt unmuted audio play
  try {
    audio.muted = false;
    audio.volume = volume;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
    if (reqId !== currentPlayRequestId) {
      stopAudioElement(audio);
      return false;
    }
    isAudioUnlocked = true;
    notifyAutoplayBlocked(false);
    return true;
  } catch (err: unknown) {
    // 2. Browser autoplay policy blocked unmuted sound. Start muted so it plays automatically!
    try {
      audio.muted = true;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      if (reqId !== currentPlayRequestId) {
        stopAudioElement(audio);
        return false;
      }
      pendingMutedAudios.add(audio);

      return false;
    } catch {
      return false;
    }
  }
}

function stopAllAudioElements() {
  for (const audio of Array.from(activeAudioElements)) {
    stopAudioElement(audio);
  }
  activeAudioElements.clear();
}

function trackWebAudioNode(node: {
  stop?: (when?: number) => void;
  disconnect: () => void;
}) {
  activeWebAudioNodes.add(node);
}

function stopAllWebAudioNodes() {
  for (const node of Array.from(activeWebAudioNodes)) {
    try {
      if (typeof node.stop === "function") {
        node.stop();
      }
      node.disconnect();
    } catch {
      // ignore
    }
  }
  activeWebAudioNodes.clear();
}

function cancelSpeech() {
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

function getAudioContext(): { ctx: AudioContext; masterGain: GainNode } | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioCtx();
    masterGainNode = sharedAudioCtx.createGain();
    masterGainNode.connect(sharedAudioCtx.destination);
  } else if (!masterGainNode) {
    masterGainNode = sharedAudioCtx.createGain();
    masterGainNode.connect(sharedAudioCtx.destination);
  }

  try {
    masterGainNode.gain.cancelScheduledValues(sharedAudioCtx.currentTime);
    masterGainNode.gain.setValueAtTime(1, sharedAudioCtx.currentTime);
  } catch {
    // ignore
  }

  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }

  return { ctx: sharedAudioCtx, masterGain: masterGainNode };
}

/**
 * Plays a pre-decoded AudioBuffer through the active AudioContext.
 * Guaranteed zero-latency, works across stages once AudioContext is active.
 */
function playDecodedAudioBuffer(
  url: string,
  volume = 0.95,
  loop = false,
): { stop: () => void } | null {
  const setup = getAudioContext();
  if (!setup) return null;
  const { ctx, masterGain } = setup;

  const buffer = audioBufferCache.get(url);
  if (!buffer) return null;

  try {
    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buffer;
    srcNode.loop = loop;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    srcNode.connect(gainNode);
    gainNode.connect(masterGain);

    srcNode.start(0);
    trackWebAudioNode(srcNode);

    return {
      stop: () => {
        try {
          srcNode.stop();
          srcNode.disconnect();
          gainNode.disconnect();
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return null;
  }
}

export function stopAllSplashAudio(): void {
  // 1. Stop fire sound
  stopFireSound();

  // 2. Stop all active HTMLAudioElement instances
  stopAllAudioElements();

  // 3. Cancel speech synthesis
  cancelSpeech();

  // 4. Stop and disconnect all active oscillators and buffer sources
  stopAllWebAudioNodes();
}

export const stopAllAudio = stopAllSplashAudio;

export function stopFireSound(): void {
  if (activeFireSource) {
    try {
      activeFireSource.stop();
    } catch {
      // ignore
    }
    activeFireSource = null;
  }
  if (crackleTimeoutId) {
    clearTimeout(crackleTimeoutId);
    crackleTimeoutId = null;
  }
}

/**
 * Plays the "Jai Maa Chamunda" audio.
 * Attempts real audio file first (/sounds/jai-maa-chamunda.mp3),
 * with fallback to divine temple bells, conch, and devotional speech.
 */
export async function playJaiMaaChamundaSound(muted = false): Promise<void> {
  const reqId = ++currentPlayRequestId;
  stopAllSplashAudio();

  if (muted || typeof window === "undefined") return;

  // 1. First attempt: Pre-decoded AudioBuffer via Web Audio API (instant & unmuted)
  const bufferPlayed = playDecodedAudioBuffer(
    "/sounds/jai-maa-chamunda.mp3",
    0.95,
  );
  if (bufferPlayed) {
    return;
  }

  // 2. Second attempt: HTMLAudioElement instances

  const audioFilesToTry = [
    customAudioUrls.chamunda,
    "/sounds/jai-maa-chamunda.mp3",
    "/sounds/chamunda.mp3",
    "/audio/jai-maa-chamunda.mp3",
    "/audio/chamunda.mp3",
  ].filter(Boolean) as string[];

  for (const src of audioFilesToTry) {
    if (reqId !== currentPlayRequestId) return;
    try {
      const audio = preloadedAudioElements.get(src) || new Audio(src);
      audio.currentTime = 0;
      const ok = await attemptPlayAudio(audio, reqId, 0.95);
      if (ok) return;
    } catch {
      // Continue to next candidate
    }
  }

  if (reqId !== currentPlayRequestId) return;

  // Fallback: Procedural Divine Temple Bells, Conch & Sacred Devotional Voice
  const audioSetup = getAudioContext();
  if (audioSetup) {
    playTempleBellsAndConch(audioSetup.ctx, audioSetup.masterGain);
  }

  // Sacred voice chant "जय माँ चामुण्डा" using SpeechSynthesis
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "जय माँ चामुण्डा, जय माँ चामुण्डा",
      );
      utterance.lang = "hi-IN";
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const hiVoice = voices.find(
        (v) => v.lang.startsWith("hi") || v.lang.includes("Hindi"),
      );
      if (hiVoice) {
        utterance.voice = hiVoice;
      }
      speechTimeoutId = setTimeout(() => {
        if (reqId === currentPlayRequestId) {
          window.speechSynthesis.speak(utterance);
        }
      }, 300);
    } catch {
      // ignore
    }
  }
}

/**
 * Synthesizes sacred temple bells (Ghanṭā) and divine deep conch (Shankha) resonance
 */
function playTempleBellsAndConch(
  ctx: AudioContext,
  destination: GainNode | AudioNode,
) {
  const now = ctx.currentTime;

  // Deep resonant drone (OM / Conch vibration)
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = "sine";
  droneOsc.frequency.setValueAtTime(136.1, now); // 136.1 Hz traditional OM vibration
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(0.35, now + 0.4);
  droneGain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);
  droneOsc.connect(droneGain);
  droneGain.connect(destination);
  droneOsc.start(now);
  droneOsc.stop(now + 4.5);
  trackWebAudioNode(droneOsc);

  // Temple Bell Chimes with multi-harmonic overtone series (Ghanṭā)
  const bellFrequencies = [528, 1056, 1584, 2112, 2640];
  const bellDampings = [3.5, 2.8, 2.2, 1.6, 1.2];

  [0, 0.6, 1.4].forEach((strikeDelay, strikeIdx) => {
    const strikeTime = now + strikeDelay;
    bellFrequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(
        freq * (strikeIdx === 1 ? 1.25 : 1),
        strikeTime,
      );

      const amp = (0.28 / (i + 1)) * (strikeIdx === 0 ? 1 : 0.7);
      gain.gain.setValueAtTime(0, strikeTime);
      gain.gain.linearRampToValueAtTime(amp, strikeTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        strikeTime + bellDampings[i],
      );

      osc.connect(gain);
      gain.connect(destination);
      osc.start(strikeTime);
      osc.stop(strikeTime + bellDampings[i] + 0.1);
      trackWebAudioNode(osc);
    });
  });
}

/**
 * Plays the majestic Eagle Chirp / Screech sound.
 * Attempts file first (/sounds/eagle-chirp.mp3), then synthesizes authentic raptor cry.
 */
export async function playEagleChirpSound(muted = false): Promise<void> {
  const reqId = ++currentPlayRequestId;
  stopAllSplashAudio();

  if (muted || typeof window === "undefined") return;

  // 1. First attempt: Pre-decoded AudioBuffer via Web Audio API (instant & unmuted)
  const bufferPlayed = playDecodedAudioBuffer("/sounds/eagle-chirp.mp3", 0.95);

  if (bufferPlayed) {
    return;
  }

  // 2. Second attempt: HTMLAudioElement instances

  const audioFilesToTry = [
    customAudioUrls.eagle,
    "/sounds/eagle-chirp.mp3",
    "/sounds/eagle.mp3",
    "/sounds/hawk.mp3",
    "/audio/eagle-chirp.mp3",
  ].filter(Boolean) as string[];

  for (const src of audioFilesToTry) {
    if (reqId !== currentPlayRequestId) return;
    try {
      const audio = preloadedAudioElements.get(src) || new Audio(src);
      audio.currentTime = 0;
      const ok = await attemptPlayAudio(audio, reqId, 0.9);
      if (ok) return;
    } catch {
      // Continue
    }
  }

  if (reqId !== currentPlayRequestId) return;
}

export async function startFireSound(
  muted = false,
): Promise<{ stop: () => void }> {
  const reqId = ++currentPlayRequestId;
  stopAllSplashAudio();

  if (muted || typeof window === "undefined") {
    return { stop: () => {} };
  }

  // 1. First attempt: Pre-decoded AudioBuffer loop via Web Audio API (instant & unmuted)
  const bufferPlayed = playDecodedAudioBuffer("/sounds/fire.mp3", 0.9, true);
  if (bufferPlayed) {
    activeFireSource = bufferPlayed;
    return activeFireSource;
  }

  // 2. Second attempt: HTMLAudioElement instances

  const audioFilesToTry = [
    customAudioUrls.fire,
    "/sounds/fire.mp3",
    "/sounds/fire-crackle.mp3",
    "/audio/fire.mp3",
    "/audio/fire-crackle.mp3",
  ].filter(Boolean) as string[];

  for (const src of audioFilesToTry) {
    if (reqId !== currentPlayRequestId) return { stop: () => {} };
    try {
      const audio = preloadedAudioElements.get(src) || new Audio(src);
      audio.loop = true;
      audio.currentTime = 0;
      const ok = await attemptPlayAudio(audio, reqId, 0.9);
      if (ok) {
        activeFireSource = {
          stop: () => {
            stopAudioElement(audio);
            activeFireSource = null;
          },
        };
        return activeFireSource;
      }
    } catch {
      // Continue to next candidate
    }
  }

  if (reqId !== currentPlayRequestId) return { stop: () => {} };

  return { stop: () => {} };
}

function playWoodCrackSnap(
  ctx: AudioContext,
  destination: GainNode | AudioNode,
) {
  try {
    const now = ctx.currentTime;
    const isLoudSnap = Math.random() < 0.25;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(Math.random() * 800 + 400, now);
    osc.frequency.exponentialRampToValueAtTime(
      80,
      now + (isLoudSnap ? 0.05 : 0.025),
    );

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(Math.random() * 2500 + 1200, now);
    filter.Q.setValueAtTime(isLoudSnap ? 6 : 3, now);

    const amp = isLoudSnap
      ? Math.random() * 0.3 + 0.2
      : Math.random() * 0.12 + 0.04;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + (isLoudSnap ? 0.06 : 0.03),
    );

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + (isLoudSnap ? 0.07 : 0.035));
  } catch {}
}
