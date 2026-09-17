"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  playJaiMaaChamundaSound,
  playEagleChirpSound,
  startFireSound,
  stopFireSound,
  stopAllSplashAudio,
  setCustomAudioUrl,
  unlockAudio,
  preloadSplashAudio,
} from "@/lib/splash-audio";

interface TreeLoadingSplashProps {
  isLoaded: boolean;
  error?: string | null;
  onRetry?: () => void;
  onComplete: () => void;
}

// Stage Order:
// 1 = Maa Chamunda (Kuldevi)
// 2 = Parihar Crest (Eagle, Flags, Sun)
// 3 = Sacred Fire & Tree
// 4 = Welcome Note
type SplashAnimationStage = 1 | 2 | 3 | 4;

const STAGE_DURATION_MS = 5600; // 5.6 seconds per animation stage in auto-play

function CrownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
    </svg>
  );
}

function ShieldIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function HeartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function SparklesIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function Volume2Icon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function VolumeXIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export default function TreeLoadingSplash({
  isLoaded,
  error,
  onRetry,
  onComplete,
}: TreeLoadingSplashProps) {
  const [currentStage, setCurrentStage] = useState<SplashAnimationStage>(1);
  const [stageProgress, setStageProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  useEffect(() => {
    unlockAudio();
    preloadSplashAudio().catch(() => {});
  }, []);

  const uid = useId().replace(/:/g, "_");

  const isLoadedRef = useRef(isLoaded);
  const onCompleteRef = useRef(onComplete);
  const currentStageRef = useRef(currentStage);
  const isPlayingRef = useRef(isPlaying);
  const isExitingRef = useRef(isExiting);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
    onCompleteRef.current = onComplete;
    currentStageRef.current = currentStage;
    isPlayingRef.current = isPlaying;
    isExitingRef.current = isExiting;
    isMutedRef.current = isMuted;
  }, [isLoaded, onComplete, currentStage, isPlaying, isExiting, isMuted]);

  useEffect(() => {
    return () => {
      stopAllSplashAudio();
    };
  }, []);

  const handleFinishAndEnter = () => {
    if (isExitingRef.current) return;
    setIsExiting(true);
    stopFireSound();
    stopAllSplashAudio();
    setTimeout(() => {
      stopAllSplashAudio();
      onCompleteRef.current();
    }, 450);
  };

  // Sound triggering on stage change
  useEffect(() => {
    if (isExiting) {
      stopAllSplashAudio();
      return;
    }

    if (currentStage === 1) {
      playJaiMaaChamundaSound(isMuted);
    } else if (currentStage === 2) {
      console.log("current Stage: ", currentStage);
      playEagleChirpSound(isMuted);
    } else if (currentStage === 3) {
      console.log("current Stage: ", currentStage);
      startFireSound(isMuted);
    } else {
      stopAllSplashAudio();
    }

    return () => {
      stopAllSplashAudio();
    };
  }, [currentStage, isMuted, isExiting]);

  // Main animation timer loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let accumulatedMs = 0;

    const tick = (now: number) => {
      const delta = Math.min(100, now - lastTime);
      lastTime = now;

      if (!isExitingRef.current && isPlayingRef.current) {
        accumulatedMs += delta;
        const prog = Math.min(1, accumulatedMs / STAGE_DURATION_MS);
        setStageProgress(prog);

        if (accumulatedMs >= STAGE_DURATION_MS) {
          accumulatedMs = 0;
          setStageProgress(0);
          if (currentStageRef.current < 4) {
            setCurrentStage((s) => (s + 1) as SplashAnimationStage);
          } else {
            // Stage 4 has completed! If tree is loaded, transition to app
            if (isLoadedRef.current) {
              handleFinishAndEnter();
              return;
            } else {
              // Loop gently on stage 4 until tree data arrives
              setCurrentStage(4);
            }
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      stopAllSplashAudio();
    };
  }, []);

  const jumpToStage = (stage: SplashAnimationStage) => {
    unlockAudio();
    setCurrentStage(stage);
    setStageProgress(0);
  };

  const prevStage = () => {
    unlockAudio();
    setCurrentStage((s) => (s > 1 ? ((s - 1) as SplashAnimationStage) : 1));
    setStageProgress(0);
  };

  const nextStage = () => {
    unlockAudio();
    if (currentStage < 4) {
      setCurrentStage((s) => (s + 1) as SplashAnimationStage);
      setStageProgress(0);
    } else {
      handleFinishAndEnter();
    }
  };

  const toggleSound = () => {
    unlockAudio();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      stopAllSplashAudio();
    } else {
      if (currentStage === 1) playJaiMaaChamundaSound(false);
      else if (currentStage === 2) playEagleChirpSound(false);
      else if (currentStage === 3) startFireSound(false);
    }
  };

  const handleGlobalClick = () => {
    unlockAudio();
  };

  return (
    <div
      onClick={handleGlobalClick}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#070919] text-white transition-opacity duration-500 select-none overflow-hidden ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 25%, rgba(217, 119, 6, 0.16), transparent 55%),
          radial-gradient(circle at 50% 85%, rgba(99, 102, 241, 0.14), transparent 50%),
          radial-gradient(rgba(251, 191, 36, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: "auto, auto, 28px 28px",
      }}
    >
      {/* ============================================================ */}
      {/* TOP HEADER: Breadcrumbs, Audio Controls & Skip Button        */}
      {/* ============================================================ */}
      <header className="relative z-20 flex w-full max-w-5xl items-center justify-between px-4 pt-3 sm:px-6 sm:pt-5">
        {/* Left: Brand Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-950/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <CrownIcon className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-wider text-amber-100">
              CHANDORA
            </span>
            <span className="text-[10px] font-medium tracking-widest uppercase text-amber-400/80">
              Lineage Chronicles
            </span>
          </div>
        </div>

        {/* Center: Stage Navigator Indicators - NEW ORDER */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-[#0d122b]/85 px-3 py-1.5 shadow-lg backdrop-blur">
          {[
            { id: 1, label: "1. Maa Chamunda", icon: SunIcon },
            { id: 2, label: "2. Parihar Crest", icon: ShieldIcon },
            { id: 3, label: "3. Sacred Fire & Tree", icon: FlameIcon },
            { id: 4, label: "4. Welcome Note", icon: HeartIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStage === item.id;
            const isDone = currentStage > item.id;
            return (
              <button
                key={item.id}
                onClick={() => jumpToStage(item.id as SplashAnimationStage)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    : isDone
                    ? "text-amber-300 hover:text-amber-200 hover:bg-white/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Audio Control & Skip Button */}
        <div className="flex items-center gap-2">
          {/* Sound Mute / Unmute Button */}
          <button
            onClick={toggleSound}
            title={isMuted ? "Unmute sound" : "Mute sound"}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all shadow-md backdrop-blur ${
              isMuted
                ? "border-slate-700 bg-slate-900/80 text-slate-400 hover:text-slate-200"
                : "border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            {isMuted ? (
              <>
                <VolumeXIcon className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden xs:inline">Sound: Off</span>
              </>
            ) : (
              <>
                <Volume2Icon className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span className="hidden xs:inline">Sound: On</span>
              </>
            )}
          </button>

          {/* Audio customization / settings modal toggle */}
          <button
            onClick={() => setShowAudioSettings(true)}
            title="Custom audio files & settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-[#0e142e]/90 text-amber-300/80 hover:text-amber-300 hover:border-amber-500/40 transition"
          >
            <span className="text-xs">🎵</span>
          </button>

          {/* Skip Button */}
          <button
            onClick={handleFinishAndEnter}
            className="group flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#0e142e]/90 px-3.5 py-1.5 text-xs font-medium text-amber-300 shadow-md backdrop-blur transition-all hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-200 active:scale-95"
          >
            <span>{isLoaded ? "Enter Family Tree" : "Skip"}</span>
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN STAGE CANVAS: Displaying Active Animation 1, 2, 3 or 4  */}
      {/* ============================================================ */}
      <main className="relative flex flex-1 w-full max-w-4xl flex-col items-center justify-center px-4 py-2">
        {error ? (
          <div className="flex max-w-sm flex-col items-center rounded-2xl border border-red-500/30 bg-[#0e142e] p-6 text-center shadow-2xl backdrop-blur">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl text-red-400">
              ⚠
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">
              Lineage Error
            </h3>
            <p className="mb-4 text-xs text-slate-400">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-500"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            {/* ANIMATION 1: Maa Chamunda (Now First!) */}
            {currentStage === 1 && (
              <MaaChamundaFaithAnimation
                progress={stageProgress}
                uid={`${uid}_chamunda`}
                isMuted={isMuted}
                onReplayAudio={() => playJaiMaaChamundaSound(false)}
              />
            )}

            {/* ANIMATION 2: Eagle chirping, waving flags, rotating sun, Parihar banner */}
            {currentStage === 2 && (
              <PariharRoyalCrestAnimation
                progress={stageProgress}
                uid={`${uid}_parihar`}
                isMuted={isMuted}
                onChirpEagle={() => playEagleChirpSound(false)}
              />
            )}

            {/* ANIMATION 3: Sacred Fire with real flame movement & burning sound, tree emerging */}
            {currentStage === 3 && (
              <FireAndTreeAnimation
                progress={stageProgress}
                uid={`${uid}_fire`}
                isMuted={isMuted}
                onPlayFire={() => {
                  unlockAudio();
                  startFireSound(false);
                }}
              />
            )}

            {/* ANIMATION 4: Welcome note from Chandora Lineage Tree */}
            {currentStage === 4 && (
              <ChandoraWelcomeAnimation
                progress={stageProgress}
                isTreeReady={isLoaded}
                onEnter={handleFinishAndEnter}
                uid={`${uid}_welcome`}
              />
            )}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* BOTTOM CONTROLS & TIMELINE PROGRESS BAR                      */}
      {/* ============================================================ */}
      <footer className="relative z-20 flex w-full max-w-2xl flex-col items-center gap-3 px-4 pb-4 sm:pb-6">
        {/* Stage Timeline Segments (1, 2, 3, 4) */}
        <div className="flex w-full items-center gap-2">
          {[1, 2, 3, 4].map((step) => {
            const isCurrent = currentStage === step;
            const isCompleted = currentStage > step;
            return (
              <div
                key={step}
                onClick={() => jumpToStage(step as SplashAnimationStage)}
                className="group relative flex-1 h-1.5 cursor-pointer rounded-full bg-slate-800/80 overflow-hidden"
                title={`Jump to Animation ${step}`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  style={{
                    width: isCurrent
                      ? `${Math.round(stageProgress * 100)}%`
                      : isCompleted
                      ? "100%"
                      : "0%",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Player Controls */}
        <div className="flex w-full items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={prevStage}
              disabled={currentStage === 1}
              className={`flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0d122b]/80 px-2.5 py-1 transition ${
                currentStage === 1
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Prev</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-[#0d122b]/80 px-3 py-1 font-medium text-amber-300 hover:bg-amber-500/10 transition"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-3.5 w-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={nextStage}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0d122b]/80 px-2.5 py-1 hover:bg-slate-800 hover:text-white transition"
            >
              <span className="hidden xs:inline">
                {currentStage === 4 ? "Finish" : "Next"}
              </span>
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-slate-400">
              STAGE {currentStage} OF 4
            </span>
            {isLoaded && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Tree Ready
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* Audio Settings & Custom Sound Upload Modal */}
      {showAudioSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-w-md w-full flex-col rounded-2xl border border-amber-500/40 bg-[#0b1028] p-5 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎵</span>
                <h3 className="font-display font-bold text-white text-base">
                  Sound & Audio Settings
                </h3>
              </div>
              <button
                onClick={() => setShowAudioSettings(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Real-time synthesizers and audio players are active. You can add
              your own custom MP3 files in{" "}
              <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded font-mono text-[11px]">
                /public/sounds/
              </code>{" "}
              or upload one below to test immediately:
            </p>

            <div className="mt-4 space-y-3 text-xs">
              {/* Maa Chamunda Audio */}
              <div className="rounded-xl border border-slate-800 bg-[#070b1e] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-300">
                      1. Jai Maa Chamunda Audio
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      /sounds/jai-maa-chamunda.mp3
                    </div>
                  </div>
                  <button
                    onClick={() => playJaiMaaChamundaSound(false)}
                    className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30"
                  >
                    ▶ Test
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="cursor-pointer text-[11px] text-slate-400 hover:text-amber-200 underline">
                    Select custom file:
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setCustomAudioUrl("chamunda", url);
                          playJaiMaaChamundaSound(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Eagle Chirp */}
              <div className="rounded-xl border border-slate-800 bg-[#070b1e] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-300">
                      2. Eagle Chirp & Screech
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      /sounds/eagle-chirp.mp3
                    </div>
                  </div>
                  <button
                    onClick={() => playEagleChirpSound(false)}
                    className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30"
                  >
                    ▶ Test
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="cursor-pointer text-[11px] text-slate-400 hover:text-amber-200 underline">
                    Select custom file:
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setCustomAudioUrl("eagle", url);
                          playEagleChirpSound(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Burning Fire Sound */}
              <div className="rounded-xl border border-slate-800 bg-[#070b1e] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-300">
                      3. Burning Fire Crackle
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      /sounds/fire-crackle.mp3
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      startFireSound(false);
                      setTimeout(stopFireSound, 3000);
                    }}
                    className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30"
                  >
                    ▶ Test (3s)
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="cursor-pointer text-[11px] text-slate-400 hover:text-amber-200 underline">
                    Select custom file:
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setCustomAudioUrl("fire", url);
                          startFireSound(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowAudioSettings(false)}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:from-amber-400 hover:to-amber-500"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* ANIMATION 1 (NOW FIRST): Faith of Goddess Chamunda Devi                   */
/* ========================================================================= */
function MaaChamundaFaithAnimation({
  progress,
  uid,
  isMuted,
  onReplayAudio,
}: {
  progress: number;
  uid: string;
  isMuted: boolean;
  onReplayAudio: () => void;
}) {
  const haloScale = Math.max(0, Math.min(1, progress / 0.35));
  const trishulProg = Math.max(0, Math.min(1, (progress - 0.18) / 0.42));
  const jyotiFlame = Math.max(0, Math.min(1, (progress - 0.38) / 0.37));
  const bellsProg = Math.max(0, Math.min(1, (progress - 0.58) / 0.42));

  // Time state for living temple ambiance
  const [time, setTime] = useState(0);
  useEffect(() => {
    let animId: number;
    const loop = (t: number) => {
      setTime(t * 0.001);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Subtle rhythmic bell swaying
  const bellSwingLeft = Math.sin(time * 3.5) * 5;
  const bellSwingRight = Math.sin(time * 3.5 + 1.2) * 5;

  // Living flame pulsation on Akhand Jyoti
  const flameWiggle = Math.sin(time * 8) * 3;
  const flameHeightScale = 1 + Math.sin(time * 12) * 0.08;

  // Halo rotation
  const haloRotation = (time * 15) % 360;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
      <div className="relative w-full aspect-[500/440] max-h-[50vh]">
        {/* Divine radiant crimson-gold aura */}
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: "320px",
            height: "320px",
            background:
              "radial-gradient(circle, rgba(225, 29, 72, 0.25) 0%, rgba(245, 158, 11, 0.18) 45%, transparent 70%)",
            filter: "blur(32px)",
            opacity: 0.6 + 0.4 * haloScale,
          }}
        />

        <svg
          viewBox="0 0 500 460"
          className="w-full h-full overflow-visible drop-shadow-[0_15px_35px_rgba(0,0,0,0.7)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Divine Aura Halo Gradient */}
            <radialGradient id={`${uid}_divineAura`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0" />
            </radialGradient>

            {/* Sacred Trishul Golden Gradient */}
            <linearGradient
              id={`${uid}_trishulGold`}
              x1="250"
              y1="40"
              x2="250"
              y2="380"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Akhand Jyoti Diya Gradient */}
            <linearGradient
              id={`${uid}_diyaGold`}
              x1="200"
              y1="360"
              x2="300"
              y2="420"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <filter
              id={`${uid}_divineGlow`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. MEHRANGARH FORT SILHOUETTE IN BACKGROUND (JODHPUR) */}
          <g opacity={0.35 + 0.35 * bellsProg}>
            <path
              d="M 20 430 L 70 380 L 130 395 L 180 370 L 250 375 L 320 370 L 370 395 L 430 380 L 480 430 Z"
              fill="#0b0e26"
            />
            <path
              d="M 80 380 L 80 345 L 95 345 L 95 350 L 110 350 L 110 345 L 125 345 L 125 380"
              fill="#121738"
              stroke="#262f5e"
              strokeWidth="1"
            />
            <path
              d="M 370 380 L 370 345 L 385 345 L 385 350 L 400 350 L 400 345 L 415 345 L 415 380"
              fill="#121738"
              stroke="#262f5e"
              strokeWidth="1"
            />
            {/* Temple Shikhar silhouette in center background */}
            <path
              d="M 235 375 L 250 320 L 265 375 Z"
              fill="#1e1b4b"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.8"
            />
            <circle cx="250" cy="318" r="3" fill="#fbbf24" />
          </g>

          {/* 2. DIVINE CIRCULAR HALO / PRABHAMANDAL WITH ROTATING SACRED CHAKRA */}
          <g
            transform={`translate(250, 180) scale(${haloScale})`}
            opacity={haloScale}
          >
            <circle r="150" fill={`url(#${uid}_divineAura)`} />
            <g transform={`rotate(${haloRotation})`}>
              <circle
                r="135"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="6 8"
                opacity="0.75"
              />
              <circle
                r="120"
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity="0.6"
              />
              {/* Chakra petal markers */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
                (angle, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1="-118"
                    x2="0"
                    y2="-132"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    transform={`rotate(${angle})`}
                  />
                ),
              )}
            </g>
          </g>

          {/* 3. SACRED TRISHUL OF MAA CHAMUNDA DEVI */}
          <g
            transform={`translate(0, ${(1 - trishulProg) * 30})`}
            opacity={trishulProg}
            filter={`url(#${uid}_divineGlow)`}
          >
            <line
              x1="250"
              y1="60"
              x2="250"
              y2="370"
              stroke={`url(#${uid}_trishulGold)`}
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Central Spear Blade */}
            <path
              d="M 250 35 C 242 55, 245 85, 250 115 C 255 85, 258 55, 250 35 Z"
              fill={`url(#${uid}_trishulGold)`}
              stroke="#78350f"
              strokeWidth="1.8"
            />

            {/* Left Trishul Curved Prong */}
            <path
              d="M 250 115 C 220 120, 185 95, 195 50 C 205 85, 230 95, 246 102"
              fill={`url(#${uid}_trishulGold)`}
              stroke="#78350f"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polygon
              points="195,50 188,68 198,64 204,70"
              fill="#fef08a"
              stroke="#78350f"
              strokeWidth="1"
            />

            {/* Right Trishul Curved Prong */}
            <path
              d="M 250 115 C 280 120, 315 95, 305 50 C 295 85, 270 95, 254 102"
              fill={`url(#${uid}_trishulGold)`}
              stroke="#78350f"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polygon
              points="305,50 296,70 302,64 312,68"
              fill="#fef08a"
              stroke="#78350f"
              strokeWidth="1"
            />

            {/* Sacred Damru tied to the Trishul with swaying red tassels */}
            <g transform="translate(250, 160)">
              <polygon
                points="0,0 -16,-18 16,-18"
                fill="#b45309"
                stroke="#fef08a"
                strokeWidth="1.5"
              />
              <polygon
                points="0,0 -16,18 16,18"
                fill="#b45309"
                stroke="#fef08a"
                strokeWidth="1.5"
              />
              <rect x="-4" y="-3" width="8" height="6" rx="2" fill="#dc2626" />
              <path
                d={`M 0 0 C ${-12 + bellSwingLeft * 0.5} 10, ${
                  -18 + bellSwingLeft
                } 30, ${-22 + bellSwingLeft * 1.5} 45`}
                stroke="#ef4444"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d={`M 0 0 C ${12 + bellSwingRight * 0.5} 10, ${
                  18 + bellSwingRight
                } 30, ${22 + bellSwingRight * 1.5} 45`}
                stroke="#ef4444"
                strokeWidth="2.5"
                fill="none"
              />
            </g>
          </g>

          {/* 4. HANGING TEMPLE BELLS SWAYING GENTLY */}
          <g opacity={bellsProg}>
            <g transform={`translate(130, 90) rotate(${bellSwingLeft})`}>
              <line
                x1="0"
                y1="-60"
                x2="0"
                y2="0"
                stroke="#b45309"
                strokeWidth="2"
              />
              <path
                d="M -16 28 C -16 10, -8 0, 0 0 C 8 0, 16 10, 16 28 C 22 34, -22 34, -16 28 Z"
                fill="#fbbf24"
                stroke="#78350f"
                strokeWidth="1.5"
              />
              <circle cx={bellSwingLeft * 0.4} cy="35" r="3.5" fill="#78350f" />
              <path
                d="M -26 20 Q -32 28, -26 36"
                stroke="#fbbf24"
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M 26 20 Q 32 28, 26 36"
                stroke="#fbbf24"
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
            </g>

            <g transform={`translate(370, 90) rotate(${bellSwingRight})`}>
              <line
                x1="0"
                y1="-60"
                x2="0"
                y2="0"
                stroke="#b45309"
                strokeWidth="2"
              />
              <path
                d="M -16 28 C -16 10, -8 0, 0 0 C 8 0, 16 10, 16 28 C 22 34, -22 34, -16 28 Z"
                fill="#fbbf24"
                stroke="#78350f"
                strokeWidth="1.5"
              />
              <circle
                cx={bellSwingRight * 0.4}
                cy="35"
                r="3.5"
                fill="#78350f"
              />
              <path
                d="M -26 20 Q -32 28, -26 36"
                stroke="#fbbf24"
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M 26 20 Q 32 28, 26 36"
                stroke="#fbbf24"
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
            </g>
          </g>

          {/* 5. AKHAND JYOTI (SACRED LIVING OIL LAMP) */}
          <g transform="translate(250, 395)" opacity={jyotiFlame}>
            <ellipse
              cx="0"
              cy="18"
              rx="45"
              ry="12"
              fill={`url(#${uid}_diyaGold)`}
              stroke="#78350f"
              strokeWidth="2"
            />
            <path
              d="M -42 16 C -35 2, 35 2, 42 16 Z"
              fill={`url(#${uid}_diyaGold)`}
              stroke="#78350f"
              strokeWidth="1.5"
            />
            {/* Living, pulsating flame */}
            <g
              transform={`scale(1, ${flameHeightScale})`}
              filter={`url(#${uid}_divineGlow)`}
            >
              <path
                d={`M 0 -38 C ${-14 + flameWiggle} -15, -12 8, 0 8 C 12 8, ${
                  14 + flameWiggle
                } -15, 0 -38 Z`}
                fill="#ea580c"
              />
              <path
                d={`M 0 -32 C ${-8 + flameWiggle * 0.7} -15, -6 4, 0 4 C 6 4, ${
                  8 + flameWiggle * 0.7
                } -15, 0 -32 Z`}
                fill="#fde047"
              />
              <path
                d={`M 0 -22 C ${-4 + flameWiggle * 0.4} -10, -3 0, 0 0 C 3 0, ${
                  4 + flameWiggle * 0.4
                } -10, 0 -22 Z`}
                fill="#ffffff"
              />
            </g>
          </g>
        </svg>
      </div>

      {/* Narrative Legend & Audio Trigger */}
      <div className="flex flex-col items-center text-center mt-1 px-4 max-w-md">
        <span className="text-xs font-semibold tracking-widest uppercase text-rose-400">
          DIVINE GUARDIAN & KULDEVI
        </span>
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white mt-1">
          ॥ जय माँ चामुंडा देवी ॥
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
          The revered Kuldevi of the Parihar lineage, enshrined at Mehrangarh
          Fort in Jodhpur, Rajasthan. Her divine blessing shields our roots and
          illuminates every generation.
        </p>

        {/* Audio status and replay button */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onReplayAudio}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 shadow-md backdrop-blur transition hover:scale-105 active:scale-95"
          >
            <SparklesIcon className="h-3.5 w-3.5 text-amber-400" />
            <span>🔊 जय माँ चामुण्डा (Chant Sound)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* ANIMATION 2: Parihar Crest (Eagle Chirping, Real Flags, Rotating Sun)     */
/* ========================================================================= */
function PariharRoyalCrestAnimation({
  progress,
  uid,
  isMuted,
  onChirpEagle,
}: {
  progress: number;
  uid: string;
  isMuted: boolean;
  onChirpEagle: () => void;
}) {
  const sunPhase = Math.max(0, Math.min(1, progress / 0.3));
  const flagsPhase = Math.max(0, Math.min(1, (progress - 0.15) / 0.35));
  const swordsPhase = Math.max(0, Math.min(1, (progress - 0.3) / 0.35));
  const eaglePhase = Math.max(0, Math.min(1, (progress - 0.45) / 0.35));
  const bannerPhase = Math.max(0, Math.min(1, (progress - 0.65) / 0.35));

  // Time state for fluid dynamic motion: waving flags, rotating sun, and chirping eagle
  const [time, setTime] = useState(0);
  useEffect(() => {
    let animId: number;
    const loop = (t: number) => {
      setTime(t * 0.001);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 1. Continuous smooth rotating sun (Surya Kiran)
  const sunRotation = (time * 24) % 360;
  const solarPulse = 1 + Math.sin(time * 3.5) * 0.035;

  // 2. Eagle Beak Chirping & Wing Flapping Motion
  // Chirp cycles: open beak every 2.4 seconds with a rapid flutter
  const chirpCycle = time % 2.4;
  const isChirping = chirpCycle < 0.75;
  const beakGap = isChirping ? Math.abs(Math.sin(time * 16)) * 9 : 0;
  const wingSpread = Math.sin(time * 4) * 6; // wing flap angle
  const eagleChestBreathe = 1 + Math.sin(time * 3) * 0.02;

  // 3. Realistic Waving Rajput Saffron Flags (Double-pennant cloth wave physics)
  // Left Flag Wave calculation:
  const leftW1 = Math.sin(time * 7) * 9;
  const leftW2 = Math.cos(time * 6.5 + 1) * 11;
  const leftTip1 = Math.sin(time * 8.5 + 2) * 16;
  const leftTip2 = Math.cos(time * 9 + 0.5) * 18;

  // Right Flag Wave calculation:
  const rightW1 = Math.sin(time * 7 + 0.8) * 9;
  const rightW2 = Math.cos(time * 6.5 + 1.8) * 11;
  const rightTip1 = Math.sin(time * 8.5 + 2.8) * 16;
  const rightTip2 = Math.cos(time * 9 + 1.3) * 18;

  // Generating dynamic SVG cloth wave path for the Left Rajput pennant
  const leftFlagPath = `
    M 135 125
    C ${110 + leftW1 * 0.4} ${132 + leftW1}, ${95 + leftW2 * 0.6} ${
    152 + leftW2
  }, ${70 + leftTip1} ${162 + leftTip1}
    C ${100 + leftW1 * 0.7} ${172 + leftW1 * 0.5}, ${115 + leftW2 * 0.8} ${
    185 + leftW2 * 0.5
  }, ${80 + leftTip2} ${210 + leftTip2}
    C ${120 + leftW1 * 0.5} ${202 + leftW1 * 0.5}, ${
    150 + leftW2 * 0.3
  } ${182}, 175 178
    Z
  `;

  // Generating dynamic SVG cloth wave path for the Right Rajput pennant
  const rightFlagPath = `
    M 365 125
    C ${390 + rightW1 * 0.4} ${132 + rightW1}, ${405 + rightW2 * 0.6} ${
    152 + rightW2
  }, ${430 + rightTip1} ${162 + rightTip1}
    C ${400 + rightW1 * 0.7} ${172 + rightW1 * 0.5}, ${385 + rightW2 * 0.8} ${
    185 + rightW2 * 0.5
  }, ${420 + rightTip2} ${210 + rightTip2}
    C ${380 + rightW1 * 0.5} ${202 + rightW1 * 0.5}, ${
    350 + rightW2 * 0.3
  } ${182}, 325 178
    Z
  `;

  // Sun Rays angles array
  const sunRays = useMemo(
    () => Array.from({ length: 24 }).map((_, i) => (i * 360) / 24),
    [],
  );

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
      <div className="relative w-full aspect-[500/500] max-h-[50vh]">
        {/* Ambient solar radiant backlight */}
        <div
          className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: "300px",
            height: "300px",
            background:
              "radial-gradient(circle, rgba(239, 68, 68, 0.32) 0%, rgba(245, 158, 11, 0.22) 40%, transparent 70%)",
            filter: "blur(28px)",
            opacity: 0.6 + 0.4 * sunPhase,
          }}
        />

        <svg
          viewBox="0 0 500 500"
          className="w-full h-full overflow-visible drop-shadow-[0_15px_35px_rgba(0,0,0,0.65)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Crimson Rising Sun Gradient */}
            <linearGradient
              id={`${uid}_suryaGrad`}
              x1="250"
              y1="50"
              x2="250"
              y2="170"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#ff4d00" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="80%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>

            {/* Bhagwa Saffron Flag Gradient */}
            <linearGradient id={`${uid}_bhagwa`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8c00" />
              <stop offset="45%" stopColor="#ff5500" />
              <stop offset="80%" stopColor="#e63900" />
              <stop offset="100%" stopColor="#b30e00" />
            </linearGradient>

            {/* Golden Eagle Plumage Gradient */}
            <linearGradient
              id={`${uid}_eaglePlumage`}
              x1="250"
              y1="180"
              x2="250"
              y2="420"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="65%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>

            {/* Steel Talwar Blade Gradient */}
            <linearGradient
              id={`${uid}_talwarSteel`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#e2e8f0" />
              <stop offset="85%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Royal Gold Ribbon Banner Gradient */}
            <linearGradient
              id={`${uid}_goldBanner`}
              x1="100"
              y1="420"
              x2="400"
              y2="420"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>

            <filter
              id={`${uid}_glow`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. CONTINUOUSLY ROTATING RADIANT SUNBURST RAYS (SURYA KIRAN) */}
          <g
            transform={`translate(250, 140) rotate(${sunRotation})`}
            opacity={sunPhase}
          >
            {sunRays.map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={i % 2 === 0 ? -120 : -95}
                  stroke={i % 4 === 0 ? "#fbbf24" : "#f97316"}
                  strokeWidth={i % 2 === 0 ? "2.6" : "1.5"}
                  opacity={0.88}
                />
                {i % 4 === 0 && (
                  <circle cx="0" cy={-124} r="2.2" fill="#fde047" />
                )}
              </g>
            ))}
          </g>

          {/* 2. ROTATING INNER CORONA RING & LIVING RISING CRIMSON SUN (SURYA) */}
          <g
            transform={`translate(250, 140) scale(${sunPhase * solarPulse})`}
            opacity={sunPhase}
          >
            {/* Blazing solar disk */}
            <path
              d="M -72 0 A 72 72 0 0 1 72 0 Z"
              fill={`url(#${uid}_suryaGrad)`}
              stroke="#b91c1c"
              strokeWidth="2.8"
              filter={`url(#${uid}_glow)`}
            />
            <path
              d="M -52 0 A 52 52 0 0 1 52 0 Z"
              fill="#fbbf24"
              opacity="0.45"
            />
            <circle cx="0" cy="-6" r="28" fill="#fef08a" opacity="0.3" />
          </g>

          {/* 3. TWO REALISTICALLY WAVING BHAGWA HINDU FLAGS ON SPEARS */}
          {/* Left Spear & Realistically Waving Flag */}
          <g opacity={flagsPhase}>
            <line
              x1="340"
              y1="410"
              x2="135"
              y2="115"
              stroke="#991b1b"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <polygon
              points="135,115 125,135 135,128 145,135"
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth="1.2"
            />
            {/* Dynamic Waving Flag Cloth */}
            <path
              d={leftFlagPath}
              fill={`url(#${uid}_bhagwa)`}
              stroke="#991b1b"
              strokeWidth="1.6"
            />
            {/* Dynamic cloth ripple highlight line */}
            <path
              d={`M 135 140 Q ${105 + leftW1 * 0.5} ${155 + leftW1}, ${
                76 + leftTip1
              } ${178 + leftTip1}`}
              stroke="rgba(254, 240, 138, 0.45)"
              strokeWidth="2"
              fill="none"
            />
          </g>

          {/* Right Spear & Realistically Waving Flag */}
          <g opacity={flagsPhase}>
            <line
              x1="160"
              y1="410"
              x2="365"
              y2="115"
              stroke="#991b1b"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <polygon
              points="365,115 355,135 365,128 375,135"
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth="1.2"
            />
            {/* Dynamic Waving Flag Cloth */}
            <path
              d={rightFlagPath}
              fill={`url(#${uid}_bhagwa)`}
              stroke="#991b1b"
              strokeWidth="1.6"
            />
            {/* Dynamic cloth ripple highlight line */}
            <path
              d={`M 365 140 Q ${395 + rightW1 * 0.5} ${155 + rightW1}, ${
                424 + rightTip1
              } ${178 + rightTip1}`}
              stroke="rgba(254, 240, 138, 0.45)"
              strokeWidth="2"
              fill="none"
            />
          </g>

          {/* 4. TWO CROSSED RAJPUT TALWARS (SWORDS) */}
          <g
            transform={`translate(250, 140) scale(${swordsPhase})`}
            opacity={swordsPhase}
          >
            {/* Left-leaning Curved Talwar */}
            <g transform="rotate(-35)">
              <path
                d="M -3 30 L -3 -75 C 5 -55, 14 -20, 10 30 Z"
                fill={`url(#${uid}_talwarSteel)`}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <rect
                x="-16"
                y="28"
                width="32"
                height="5"
                rx="2"
                fill="#eab308"
                stroke="#713f12"
                strokeWidth="1"
              />
              <rect
                x="-4"
                y="33"
                width="8"
                height="18"
                rx="1.5"
                fill="#713f12"
                stroke="#eab308"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="54"
                r="7"
                fill="#eab308"
                stroke="#713f12"
                strokeWidth="1"
              />
            </g>

            {/* Right-leaning Curved Talwar */}
            <g transform="rotate(35)">
              <path
                d="M 3 30 L 3 -75 C -5 -55, -14 -20, -10 30 Z"
                fill={`url(#${uid}_talwarSteel)`}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <rect
                x="-16"
                y="28"
                width="32"
                height="5"
                rx="2"
                fill="#eab308"
                stroke="#713f12"
                strokeWidth="1"
              />
              <rect
                x="-4"
                y="33"
                width="8"
                height="18"
                rx="1.5"
                fill="#713f12"
                stroke="#eab308"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="54"
                r="7"
                fill="#eab308"
                stroke="#713f12"
                strokeWidth="1"
              />
            </g>

            <circle
              cx="0"
              cy="30"
              r="4"
              fill="#ffffff"
              filter={`url(#${uid}_glow)`}
            />
          </g>

          {/* 5. THE MAJESTIC GOLDEN EAGLE / GARUDA (WITH CHIRPING BEAK & FLAPPING WINGS) */}
          <g
            transform={`translate(250, 290) scale(${
              eaglePhase * eagleChestBreathe
            })`}
            opacity={eaglePhase}
          >
            {/* Eagle Head with Chirping Beak */}
            <g transform="translate(0, -110)">
              {/* Head crown */}
              <path
                d="M -12 0 C -15 -18, 5 -25, 20 -15 C 28 0, 24 20, 15 30 C 5 32, -5 25, -12 0 Z"
                fill={`url(#${uid}_eaglePlumage)`}
                stroke="#431407"
                strokeWidth="1.8"
              />
              {/* Eagle Upper Beak */}
              <path
                d="M -12 -8 C -26 -6, -34 3, -26 13 C -21 10, -15 6, -12 3 Z"
                fill="#b45309"
                stroke="#431407"
                strokeWidth="1.8"
              />
              {/* Eagle Lower Beak - HINGES OPEN AND CHIRPS! */}
              <path
                d={`M -12 3 L ${-22 - beakGap * 0.4} ${10 + beakGap} L -12 ${
                  8 + beakGap
                } Z`}
                fill="#92400e"
                stroke="#431407"
                strokeWidth="1.4"
              />
              {/* Chirp Sound Waves escaping beak when chirping */}
              {isChirping && (
                <g
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.85"
                >
                  <path d="M -36 5 Q -42 8, -36 12" />
                  <path d="M -42 2 Q -50 8, -42 16" />
                </g>
              )}
              {/* Eagle Eye */}
              <circle
                cx="-3"
                cy="-8"
                r="3.5"
                fill="#ffffff"
                stroke="#431407"
                strokeWidth="1"
              />
              <circle cx="-4" cy="-8" r="1.8" fill="#000000" />
            </g>

            {/* Left Outstretched Wing - Flaps with aerodynamic curvature */}
            <g transform={`rotate(${-wingSpread}, -15, -80)`}>
              <path
                d="M -15 -80 C -65 -78, -102 -40, -106 22 C -100 75, -88 115, -78 132 C -68 112, -47 50, -25 15 Z"
                fill={`url(#${uid}_eaglePlumage)`}
                stroke="#431407"
                strokeWidth="2.2"
              />
              {[-85, -75, -65, -55, -45, -35].map((xOffset, idx) => (
                <line
                  key={idx}
                  x1={xOffset + 20}
                  y1="-30"
                  x2={xOffset}
                  y2="100"
                  stroke="#431407"
                  strokeWidth="1.4"
                />
              ))}
            </g>

            {/* Right Outstretched Wing - Flaps symmetrically */}
            <g transform={`rotate(${wingSpread}, 15, -80)`}>
              <path
                d="M 15 -80 C 65 -78, 102 -40, 106 22 C 100 75, 88 115, 78 132 C 68 112, 47 50, 25 15 Z"
                fill={`url(#${uid}_eaglePlumage)`}
                stroke="#431407"
                strokeWidth="2.2"
              />
              {[85, 75, 65, 55, 45, 35].map((xOffset, idx) => (
                <line
                  key={idx}
                  x1={xOffset - 20}
                  y1="-30"
                  x2={xOffset}
                  y2="100"
                  stroke="#431407"
                  strokeWidth="1.4"
                />
              ))}
            </g>

            {/* Central Chest and Torso */}
            <path
              d="M -30 -60 C -45 -10, -40 40, -28 95 L 28 95 C 40 40, 45 -10, 30 -60 Z"
              fill={`url(#${uid}_eaglePlumage)`}
              stroke="#431407"
              strokeWidth="2.2"
            />
            <g stroke="#7c2d12" strokeWidth="1.4" fill="none">
              <path d="M -15 -35 Q 0 -25, 15 -35" />
              <path d="M -22 -15 Q 0 -5, 22 -15" />
              <path d="M -20 10 Q 0 20, 20 10" />
              <path d="M -18 35 Q 0 45, 18 35" />
              <path d="M -15 60 Q 0 70, 15 60" />
            </g>

            {/* Tail Plumage */}
            <g>
              <polygon
                points="-26,95 -32,135 -15,138 0,140 15,138 32,135 26,95"
                fill={`url(#${uid}_eaglePlumage)`}
                stroke="#431407"
                strokeWidth="2"
              />
              <line
                x1="-15"
                y1="95"
                x2="-20"
                y2="136"
                stroke="#431407"
                strokeWidth="1.4"
              />
              <line
                x1="0"
                y1="95"
                x2="0"
                y2="140"
                stroke="#431407"
                strokeWidth="1.4"
              />
              <line
                x1="15"
                y1="95"
                x2="20"
                y2="136"
                stroke="#431407"
                strokeWidth="1.4"
              />
            </g>

            {/* Eagle Talons gripping the banner */}
            <g fill="#f59e0b" stroke="#431407" strokeWidth="1.6">
              <path d="M -24 110 L -30 125 L -20 126 Z" />
              <path d="M -14 110 L -18 126 L -8 127 Z" />
              <path d="M 24 110 L 30 125 L 20 126 Z" />
              <path d="M 14 110 L 18 126 L 8 127 Z" />
            </g>
          </g>

          {/* 6. ROYAL GOLDEN BANNER INSCRIBED WITH "पड़िहार" */}
          <g
            transform={`translate(0, ${(1 - bannerPhase) * 15})`}
            opacity={bannerPhase}
          >
            {/* Left Red Ribbon swallowtail end */}
            <path
              d="M 125 410 L 75 415 L 95 435 L 75 455 L 125 448 Z"
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="1.5"
            />
            {/* Right Red Ribbon swallowtail end */}
            <path
              d="M 375 410 L 425 415 L 405 435 L 425 455 L 375 448 Z"
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="1.5"
            />

            {/* Central Golden Curving Scroll Banner */}
            <path
              d="M 115 422 C 180 435, 320 435, 385 422 C 375 458, 305 470, 250 470 C 195 470, 125 458, 115 422 Z"
              fill={`url(#${uid}_goldBanner)`}
              stroke="#78350f"
              strokeWidth="2.2"
            />

            {/* INSCRIBED SACRED CLAN NAME: पड़िहार */}
            <text
              x="250"
              y="456"
              textAnchor="middle"
              className="font-bold font-display"
              style={{
                fontSize: "26px",
                letterSpacing: "0.18em",
                fill: "#7f1d1d",
                filter: "drop-shadow(0 1px 2px rgba(254, 240, 138, 0.8))",
              }}
            >
              पड़िहार
            </text>
          </g>
        </svg>
      </div>

      {/* Narrative Legend & Audio Trigger */}
      <div className="flex flex-col items-center text-center mt-1 px-4 max-w-md">
        <span className="text-xs font-semibold tracking-widest uppercase text-amber-400">
          THE ROYAL CREST
        </span>
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white mt-1">
          Parihar Lineage - पड़िहार वंश
        </h2>
        {/* Eagle Chirp trigger button */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onChirpEagle}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 shadow-md backdrop-blur transition hover:scale-105 active:scale-95"
          >
            <span>🦅 Eagle Chirp Sound</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* ANIMATION 3: Sacred Fire & Family Tree (Realistic Dancing Fire + Sound)   */
/* ========================================================================= */
function FireAndTreeAnimation({
  progress,
  uid,
  isMuted,
  onPlayFire,
}: {
  progress: number;
  uid: string;
  isMuted: boolean;
  onPlayFire?: () => void;
}) {
  // Phase 1 (0.00 - 0.40): Burning fire intensifies
  const fireIntensity =
    progress < 0.4 ? progress / 0.4 : 1 - (progress - 0.4) * 0.4;
  // Phase 2 (0.25 - 0.70): Roots and trunk emerging out of fire
  const trunkGrowth = Math.max(0, Math.min(1, (progress - 0.2) / 0.45));
  // Phase 3 (0.45 - 0.90): Branches and blooming golden foliage
  const canopyGrowth = Math.max(0, Math.min(1, (progress - 0.42) / 0.45));
  // Phase 4 (0.65 - 1.00): Golden pedigree nodes ignite
  const jewelsGlow = Math.max(0, Math.min(1, (progress - 0.65) / 0.35));

  // Time state for living turbulent real fire motion
  const [time, setTime] = useState(0);
  useEffect(() => {
    let animId: number;
    const loop = (t: number) => {
      setTime(t * 0.001);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Realistic turbulent dancing flame tongues:
  const leftTongueSway = Math.sin(time * 9.5) * 12;
  const leftTongueHeight = Math.cos(time * 11) * 16;

  const rightTongueSway = Math.cos(time * 10) * 12;
  const rightTongueHeight = Math.sin(time * 11.5) * 16;

  const centerFlameSway = Math.sin(time * 8.2) * 9;
  const centerFlameHeight = Math.cos(time * 9.8) * 22;

  const innerCoreSway = Math.sin(time * 14) * 6;
  const innerCoreHeight = Math.cos(time * 13) * 14;

  // Floating embers array
  const embers = useMemo(() => {
    return Array.from({ length: 22 }).map((_, i) => ({
      x: 170 + ((i * 19) % 160),
      baseY: 420,
      size: 1.5 + (i % 3) * 1.2,
      speed: 0.8 + (i % 5) * 0.25,
      drift: Math.sin(i) * 25,
    }));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
      <div className="relative w-full aspect-[500/440] max-h-[50vh]">
        {/* Background fiery radiant aura with turbulent flicker */}
        <div
          className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: "320px",
            height: "320px",
            background:
              "radial-gradient(circle, rgba(239, 68, 68, 0.32) 0%, rgba(245, 158, 11, 0.22) 45%, transparent 70%)",
            filter: "blur(32px)",
            opacity: 0.5 + 0.4 * fireIntensity + Math.sin(time * 10) * 0.1,
          }}
        />

        <svg
          viewBox="0 0 500 460"
          className="w-full h-full overflow-visible drop-shadow-[0_15px_35px_rgba(0,0,0,0.7)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Fire Flame Gradient */}
            <linearGradient
              id={`${uid}_fireFlame`}
              x1="250"
              y1="440"
              x2="250"
              y2="240"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#450a0a" />
              <stop offset="25%" stopColor="#dc2626" />
              <stop offset="55%" stopColor="#ea580c" />
              <stop offset="80%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>

            {/* Tree Golden Trunk from Fire Gradient */}
            <linearGradient
              id={`${uid}_fireTrunk`}
              x1="250"
              y1="410"
              x2="250"
              y2="130"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>

            <filter
              id={`${uid}_fireGlow`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. SACRED HAVAN / FIRE ALTAR BASE */}
          <g transform="translate(250, 420)">
            <ellipse
              cx="0"
              cy="0"
              rx="140"
              ry="18"
              fill="#140c1e"
              stroke="#78350f"
              strokeWidth="2.5"
            />
            <ellipse
              cx="0"
              cy="-3"
              rx="125"
              ry="14"
              fill="#260f0d"
              stroke="#b45309"
              strokeWidth="1.5"
            />
            <path
              d="M -110 0 L -80 18 L 80 18 L 110 0"
              fill="#0f0917"
              stroke="#b45309"
              strokeWidth="1.5"
            />
            <path
              d="M -70 18 L -45 28 L 45 28 L 70 18"
              fill="#090510"
              stroke="#78350f"
              strokeWidth="1.2"
            />
          </g>

          {/* 2. REALISTICALLY MOVING SACRED BURNING FIRE (DANCING FLAMES) */}
          <g filter={`url(#${uid}_fireGlow)`}>
            {/* Outer roaring flame tongues dancing left */}
            <path
              d={`M 175 420 C ${155 + leftTongueSway} ${
                375 + leftTongueHeight
              }, ${170 + leftTongueSway * 1.2} ${330 + leftTongueHeight}, ${
                205 + leftTongueSway
              } ${295 + leftTongueHeight} C 215 345, 235 365, 220 420 Z`}
              fill={`url(#${uid}_fireFlame)`}
              opacity={0.88 * fireIntensity}
            />
            {/* Outer roaring flame tongues dancing right */}
            <path
              d={`M 325 420 C ${345 + rightTongueSway} ${
                375 + rightTongueHeight
              }, ${330 + rightTongueSway * 1.2} ${330 + rightTongueHeight}, ${
                295 + rightTongueSway
              } ${295 + rightTongueHeight} C 285 345, 265 365, 280 420 Z`}
              fill={`url(#${uid}_fireFlame)`}
              opacity={0.88 * fireIntensity}
            />
            {/* Central leaping flame pillar */}
            <path
              d={`M 205 420 C ${205 + centerFlameSway} 350, ${
                225 + centerFlameSway * 1.4
              } 290, ${250 + centerFlameSway} ${240 + centerFlameHeight} C ${
                275 + centerFlameSway * 1.4
              } 290, ${295 + centerFlameSway} 350, 295 420 Z`}
              fill={`url(#${uid}_fireFlame)`}
              opacity={0.96 * fireIntensity}
            />
            {/* Secondary flickering mid-tongue */}
            <path
              d={`M 225 420 C ${220 + innerCoreSway} 360, ${
                235 + innerCoreSway * 1.2
              } 310, ${250 + innerCoreSway} ${275 + innerCoreHeight} C ${
                265 + innerCoreSway * 1.2
              } 310, ${280 + innerCoreSway} 360, 275 420 Z`}
              fill="#fbbf24"
              opacity={0.9 * fireIntensity}
            />
            {/* White-hot pulsating inner core flame */}
            <path
              d={`M 235 420 C 235 375, ${245 + innerCoreSway * 0.7} 335, 250 ${
                305 + innerCoreHeight * 0.7
              } C 255 335, 265 375, 265 420 Z`}
              fill="#ffffff"
              opacity={0.92 * fireIntensity}
            />
          </g>

          {/* 3. SWIRLING FLOATING FIRE EMBERS / SPARKS */}
          <g>
            {embers.map((ember, idx) => {
              const emberProg =
                (progress * ember.speed * 2.2 + idx * 0.12 + time * 0.2) % 1;
              const y = ember.baseY - emberProg * 270;
              const x =
                ember.x + Math.sin(emberProg * 6.28 + time * 2) * ember.drift;
              const op = Math.sin(emberProg * Math.PI) * fireIntensity;
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={ember.size}
                  fill={idx % 2 === 0 ? "#fbbf24" : "#f97316"}
                  opacity={op}
                />
              );
            })}
          </g>

          {/* 4. THE TREE ARISING OUT OF FIRE (Roots & Trunk) */}
          <g>
            {/* Strong Roots weaving through the embers */}
            <path
              d="M 245 390 C 220 405, 175 415, 120 420"
              stroke={`url(#${uid}_fireTrunk)`}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={140 * (1 - trunkGrowth)}
            />
            <path
              d="M 255 390 C 280 405, 325 415, 380 420"
              stroke={`url(#${uid}_fireTrunk)`}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={140 * (1 - trunkGrowth)}
            />
            <path
              d="M 250 400 C 250 415, 245 425, 250 435"
              stroke={`url(#${uid}_fireTrunk)`}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="40"
              strokeDashoffset={40 * (1 - trunkGrowth)}
            />

            {/* Twin Intertwined Trunk rising upwards from the fire */}
            <path
              d="M 242 410 C 235 340, 265 290, 245 230 C 235 200, 248 175, 250 150"
              stroke={`url(#${uid}_fireTrunk)`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="280"
              strokeDashoffset={280 * (1 - trunkGrowth)}
            />
            <path
              d="M 258 410 C 265 340, 235 290, 255 230 C 265 200, 252 175, 250 150"
              stroke={`url(#${uid}_fireTrunk)`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="280"
              strokeDashoffset={280 * (1 - trunkGrowth)}
            />
          </g>

          {/* 5. GENERATIONAL BOUGHS & CANOPY SPREADING OUT */}
          <g strokeLinecap="round" stroke={`url(#${uid}_fireTrunk)`}>
            <path
              d="M 250 160 C 250 120, 248 90, 250 60"
              strokeWidth="4"
              strokeDasharray="110"
              strokeDashoffset={110 * (1 - canopyGrowth)}
            />
            <path
              d="M 250 190 C 210 180, 160 160, 110 120 C 80 95, 60 70, 50 45"
              strokeWidth="3.8"
              strokeDasharray="230"
              strokeDashoffset={230 * (1 - canopyGrowth)}
            />
            <path
              d="M 250 190 C 290 180, 340 160, 390 120 C 420 95, 440 70, 450 45"
              strokeWidth="3.8"
              strokeDasharray="230"
              strokeDashoffset={230 * (1 - canopyGrowth)}
            />
            <path
              d="M 175 165 C 150 135, 125 100, 115 65"
              strokeWidth="2.8"
              strokeDasharray="120"
              strokeDashoffset={120 * (1 - canopyGrowth)}
            />
            <path
              d="M 325 165 C 350 135, 375 100, 385 65"
              strokeWidth="2.8"
              strokeDasharray="120"
              strokeDashoffset={120 * (1 - canopyGrowth)}
            />
          </g>

          {/* 6. GLOWING LEAVES & GOLDEN LINEAGE NODES */}
          <g opacity={jewelsGlow}>
            {[
              { cx: 250, cy: 55, r: 7.5, label: "Origin" },
              { cx: 50, cy: 45, r: 6, label: "Pioneers" },
              { cx: 115, cy: 62, r: 5.5, label: "" },
              { cx: 180, cy: 95, r: 5, label: "" },
              { cx: 320, cy: 95, r: 5, label: "" },
              { cx: 385, cy: 62, r: 5.5, label: "" },
              { cx: 450, cy: 45, r: 6, label: "Elders" },
              { cx: 110, cy: 120, r: 5, label: "" },
              { cx: 390, cy: 120, r: 5, label: "" },
            ].map((node, i) => (
              <g key={i}>
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r * 1.8}
                  fill="#f59e0b"
                  opacity="0.3"
                  filter={`url(#${uid}_fireGlow)`}
                />
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill="#fef08a"
                  stroke="#b45309"
                  strokeWidth="1.5"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Narrative Legend & Sound Info */}
      <div className="flex flex-col items-center text-center mt-1 px-4 max-w-md">
        <span className="text-xs font-semibold tracking-widest uppercase text-amber-400">
          THE SACRED FIRE
        </span>
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white mt-1">
          A Lineage Born of Sacred Fire
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
          From the sacred Agnikula fire altar of Mount Abu, through generations
          of courage, our roots have grown into an enduring lineage tree.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          {onPlayFire ? (
            <button
              onClick={onPlayFire}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 shadow-md backdrop-blur transition hover:scale-105 active:scale-95"
            >
              <FlameIcon className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>🔥 Sacred Fire Sound (Crackle)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-300/80 bg-amber-950/40 border border-amber-500/20 px-3 py-1 rounded-full">
              <FlameIcon className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Burning Fire Ambient Audio Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* ANIMATION 4: Welcome Note from Chandora Lineage Tree                      */
/* ========================================================================= */
function ChandoraWelcomeAnimation({
  progress,
  isTreeReady,
  onEnter,
  uid,
}: {
  progress: number;
  isTreeReady: boolean;
  onEnter: () => void;
  uid: string;
}) {
  const badgeScale = Math.max(0, Math.min(1, progress / 0.35));
  const cardOpacity = Math.max(0, Math.min(1, (progress - 0.2) / 0.4));
  const autoEnterSecondsLeft = Math.max(
    0,
    Math.ceil((1 - progress) * (STAGE_DURATION_MS / 1000)),
  );

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg px-2 animate-in fade-in zoom-in-95 duration-500">
      {/* Central Royal Family Medallion */}
      <div
        className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#1a234f] via-[#0f1533] to-[#070b1e] shadow-[0_0_40px_rgba(245,158,11,0.35)] backdrop-blur"
        style={{ transform: `scale(${badgeScale})`, opacity: badgeScale }}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-16 w-16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${uid}_crestGold`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke={`url(#${uid}_crestGold)`}
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="rgba(251, 191, 36, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 50 22 L 50 78 M 50 40 Q 32 30 26 42 M 50 40 Q 68 30 74 42 M 50 54 Q 30 50 24 64 M 50 54 Q 70 50 76 64"
            stroke={`url(#${uid}_crestGold)`}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="50" cy="22" r="4" fill="#fbbf24" />
        </svg>
      </div>

      {/* Royal Welcome Card */}
      <div
        className="flex flex-col items-center rounded-3xl border border-amber-500/30 bg-[#0d1330]/90 p-6 sm:p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur transition-all"
        style={{ opacity: cardOpacity }}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-amber-400">
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>स्वागतम् • DIGITAL PEDIGREE & HERITAGE</span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5">
          Chandora Family Tree
        </h1>

        <p className="font-display text-xs sm:text-sm font-medium text-amber-200/90 mt-0.5 tracking-wider">
          चाँदोरा वंश-वृक्ष • गौरवशाली परम्परा
        </p>

        <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
          Welcome to our shared ancestral home. Here, the memories of our
          revered forebears are preserved, the journeys of our elders are
          honored, and every new branch is connected across the passage of time.
        </p>

        {/* Feature Pill Tags */}
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] text-slate-300">
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-medium text-rose-200">
            🙏 Maa Chamunda Blessings
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-medium text-amber-200">
            🏛️ Parihar Lineage
          </span>
        </div>

        {/* Action Button to Enter Tree */}
        <div className="mt-6 flex flex-col items-center gap-2 w-full max-w-xs">
          <button
            onClick={onEnter}
            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-3 px-6 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] active:scale-98"
          >
            <span>प्रवेश करें • Enter Family Tree</span>
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>

          <span className="text-[11px] text-slate-400">
            {isTreeReady ? (
              autoEnterSecondsLeft > 0 ? (
                <>
                  Auto-entering in {autoEnterSecondsLeft}s or tap above to
                  explore
                </>
              ) : (
                <>Ready • Tap to enter</>
              )
            ) : (
              <>Loading family pedigree records…</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
