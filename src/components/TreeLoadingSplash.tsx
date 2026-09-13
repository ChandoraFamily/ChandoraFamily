"use client";

import React, { useEffect, useRef, useState } from "react";

interface TreeLoadingSplashProps {
  isLoaded: boolean;
  error?: string | null;
  onRetry?: () => void;
  onComplete: () => void;
}

const CYCLE_DURATION_MS = 2200; // 2.2 seconds per cycle

function clamp(val: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, val));
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(x: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export default function TreeLoadingSplash({
  isLoaded,
  error,
  onRetry,
  onComplete,
}: TreeLoadingSplashProps) {
  const [cycleCount, setCycleCount] = useState(1);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Keep live references to prevent stale closures inside requestAnimationFrame
  const isLoadedRef = useRef(isLoaded);
  isLoadedRef.current = isLoaded;

  const errorRef = useRef(error);
  errorRef.current = error;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let animFrameId: number;
    let cycleStart = performance.now();
    let isTerminated = false;

    const tick = (now: number) => {
      if (isTerminated) return;

      // If an error occurred, stop the repeating cycle so user can read it
      if (errorRef.current) {
        return;
      }

      const elapsed = now - cycleStart;
      const rawProgress = elapsed / CYCLE_DURATION_MS;
      const progress = clamp(rawProgress, 0, 1);
      setCycleProgress(progress);

      if (progress >= 1) {
        // One complete animation cycle has finished!
        if (isLoadedRef.current) {
          // Graph has loaded! Fade out splash and transition to tree
          isTerminated = true;
          setIsFadingOut(true);
          setTimeout(() => {
            onCompleteRef.current();
          }, 350);
          return;
        } else {
          // Graph has NOT loaded yet: Repeat animation for another cycle
          setCycleCount((c) => c + 1);
          cycleStart = performance.now();
          setCycleProgress(0);
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      isTerminated = true;
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  // Compute staged easing values for the SVG elements in the current cycle
  // Stage 1: Focus seed & roots glow (0 - 0.25)
  const focusScale = easeOutBack(clamp(cycleProgress / 0.22, 0, 1));
  const glowOpacity = clamp(Math.sin(cycleProgress * Math.PI), 0.3, 0.95);

  // Stage 2: Ancestor branches draw up (0.15 - 0.50)
  const ancestorBranchPhase = easeOutCubic(
    clamp((cycleProgress - 0.15) / 0.35, 0, 1),
  );
  // Stage 3: Ancestor nodes appear (0.30 - 0.60)
  const ancestorNodePhase = easeOutBack(
    clamp((cycleProgress - 0.3) / 0.28, 0, 1),
  );

  // Stage 4: Descendant branches draw down (0.45 - 0.80)
  const descendantBranchPhase = easeOutCubic(
    clamp((cycleProgress - 0.45) / 0.35, 0, 1),
  );
  // Stage 5: Descendant nodes appear (0.60 - 0.90)
  const descendantNodePhase = easeOutBack(
    clamp((cycleProgress - 0.6) / 0.28, 0, 1),
  );

  // Stage 6: Illuminating pulse across the completed tree (0.80 - 1.0)
  const pulsePhase = clamp((cycleProgress - 0.8) / 0.2, 0, 1);
  const pulseRingScale = 1 + pulsePhase * 0.8;
  const pulseRingOpacity = (1 - pulsePhase) * 0.8;

  // Status message based on cycle
  const statusPhrases = [
    "Tracing ancestry roots…",
    "Linking generational branches…",
    "Connecting family lineage…",
    "Mapping pedigree relationships…",
  ];
  const currentPhrase = statusPhrases[(cycleCount - 1) % statusPhrases.length];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080b20] transition-opacity duration-350 select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 35%, rgba(138, 92, 255, 0.16), transparent 55%),
          radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.12), transparent 50%),
          radial-gradient(rgba(93, 106, 153, 0.18) 1px, transparent 1px)
        `,
        backgroundSize: "auto, auto, 22px 22px",
      }}
    >
      {error ? (
        <div className="flex max-w-sm flex-col items-center rounded-2xl border border-red-500/30 bg-[#121630] p-6 text-center shadow-2xl backdrop-blur">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl text-red-400">
            ⚠
          </div>
          <h3 className="mb-1 text-base font-semibold text-white">
            Unable to load tree
          </h3>
          <p className="mb-4 text-xs text-slate-400">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-[#6941c6] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#7f56d9]"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Brand header */}
          <div className="mb-2 flex items-center gap-3">
            {/* <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#37446b] bg-[#111735] text-lg text-[#bca5ff] shadow-[0_4px_20px_rgba(138,92,255,0.25)]">
              ✦
            </div> */}
            <div
              className="lineage-logo-mark h-11 w-11 shrink-0 rounded-full border-0 border-[#8a5cff] shadow-[0_0_20px_rgba(125,92,255,.12)]"
              role="img"
              aria-label="Logo"
              onContextMenu={(e) => e.preventDefault()}
            />
            <div>
              <div
                className="lineage-logo-text h-11 w-28 shrink-0 rounded-lg shadow-[0_0_20px_rgba(125,92,255,.12)]"
                role="img"
                aria-label="LogoText"
                onContextMenu={(e) => e.preventDefault}
              />
              {/* <h1 className="font-display text-2xl font-bold tracking-tight text-white">
                
              </h1> */}
              {/* <p className="text-[11px] font-medium tracking-wide text-slate-400">
                Interactive Family Heritage
              </p> */}
            </div>
          </div>

          {/* Animated Tree SVG */}
          <div className="relative h-64 w-80 sm:h-72 sm:w-96">
            <svg
              viewBox="0 0 320 240"
              className="h-full w-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="trunkGrad"
                  x1="160"
                  y1="40"
                  x2="160"
                  y2="200"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>

                <linearGradient
                  id="focusGrad"
                  x1="140"
                  y1="100"
                  x2="180"
                  y2="140"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>

                <linearGradient id="ancestorGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>

                <linearGradient id="descendantGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                <filter
                  id="softGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Ambient radial center glow */}
              <circle
                cx="160"
                cy="120"
                r="70"
                fill="url(#trunkGrad)"
                opacity={glowOpacity * 0.15}
                filter="url(#softGlow)"
              />

              {/* Ancestor Branch Paths (connecting upward from center) */}
              {/* Path to Left Grandparent cluster */}
              <path
                d="M 160 110 C 160 85, 100 80, 100 50"
                stroke="url(#trunkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="140"
                strokeDashoffset={140 * (1 - ancestorBranchPhase)}
              />
              <path
                d="M 100 68 C 100 60, 70 58, 65 50"
                stroke="url(#trunkGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="50"
                strokeDashoffset={50 * (1 - ancestorBranchPhase)}
              />

              {/* Path to Right Grandparent cluster */}
              <path
                d="M 160 110 C 160 85, 220 80, 220 50"
                stroke="url(#trunkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="140"
                strokeDashoffset={140 * (1 - ancestorBranchPhase)}
              />
              <path
                d="M 220 68 C 220 60, 250 58, 255 50"
                stroke="url(#trunkGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="50"
                strokeDashoffset={50 * (1 - ancestorBranchPhase)}
              />

              {/* Descendant Branch Paths (connecting downward from center) */}
              {/* Left Child branch */}
              <path
                d="M 160 130 C 160 160, 90 165, 90 195"
                stroke="url(#trunkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="140"
                strokeDashoffset={140 * (1 - descendantBranchPhase)}
              />
              {/* Center Child branch */}
              <path
                d="M 160 130 L 160 195"
                stroke="url(#trunkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="70"
                strokeDashoffset={70 * (1 - descendantBranchPhase)}
              />
              {/* Right Child branch */}
              <path
                d="M 160 130 C 160 160, 230 165, 230 195"
                stroke="url(#trunkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="140"
                strokeDashoffset={140 * (1 - descendantBranchPhase)}
              />

              {/* Ancestor Nodes (Generation -1) */}
              {/* Paternal Node 1 */}
              <g
                transform={`translate(65, 50) scale(${ancestorNodePhase})`}
                opacity={ancestorNodePhase}
              >
                <circle
                  r="10"
                  fill="#121838"
                  stroke="url(#ancestorGrad)"
                  strokeWidth="2"
                />
                <circle r="4" fill="#c084fc" />
              </g>

              {/* Paternal Node 2 */}
              <g
                transform={`translate(100, 50) scale(${ancestorNodePhase})`}
                opacity={ancestorNodePhase}
              >
                <circle
                  r="12"
                  fill="#121838"
                  stroke="url(#ancestorGrad)"
                  strokeWidth="2.2"
                />
                <circle r="5" fill="#a855f7" />
              </g>

              {/* Maternal Node 1 */}
              <g
                transform={`translate(220, 50) scale(${ancestorNodePhase})`}
                opacity={ancestorNodePhase}
              >
                <circle
                  r="12"
                  fill="#121838"
                  stroke="url(#ancestorGrad)"
                  strokeWidth="2.2"
                />
                <circle r="5" fill="#a855f7" />
              </g>

              {/* Maternal Node 2 */}
              <g
                transform={`translate(255, 50) scale(${ancestorNodePhase})`}
                opacity={ancestorNodePhase}
              >
                <circle
                  r="10"
                  fill="#121838"
                  stroke="url(#ancestorGrad)"
                  strokeWidth="2"
                />
                <circle r="4" fill="#c084fc" />
              </g>

              {/* Descendant Nodes (Generation +1) */}
              {/* Child 1 */}
              <g
                transform={`translate(90, 195) scale(${descendantNodePhase})`}
                opacity={descendantNodePhase}
              >
                <circle
                  r="11"
                  fill="#0f172a"
                  stroke="url(#descendantGrad)"
                  strokeWidth="2"
                />
                <circle r="4.5" fill="#38bdf8" />
              </g>

              {/* Child 2 */}
              <g
                transform={`translate(160, 195) scale(${descendantNodePhase})`}
                opacity={descendantNodePhase}
              >
                <circle
                  r="12"
                  fill="#0f172a"
                  stroke="url(#descendantGrad)"
                  strokeWidth="2.2"
                />
                <circle r="5" fill="#60a5fa" />
              </g>

              {/* Child 3 */}
              <g
                transform={`translate(230, 195) scale(${descendantNodePhase})`}
                opacity={descendantNodePhase}
              >
                <circle
                  r="11"
                  fill="#0f172a"
                  stroke="url(#descendantGrad)"
                  strokeWidth="2"
                />
                <circle r="4.5" fill="#38bdf8" />
              </g>

              {/* Central Focal Node (Generation 0 - Head of Family) */}
              {/* Outer pulsing illumination wave on cycle finish */}
              {pulsePhase > 0 && (
                <circle
                  cx="160"
                  cy="120"
                  r={22 * pulseRingScale}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  fill="none"
                  opacity={pulseRingOpacity}
                />
              )}

              {/* Focal Node container */}
              <g
                transform={`translate(160, 120) scale(${focusScale})`}
                filter="url(#softGlow)"
              >
                <circle
                  r="20"
                  fill="#0c122c"
                  stroke="url(#focusGrad)"
                  strokeWidth="2.8"
                />
                <circle r="14" fill="#1b2247" />
                {/* Family crown/seed icon */}
                <path d="M -6 4 L -4 -4 L 0 -1 L 4 -4 L 6 4 Z" fill="#fbbf24" />
                <circle cx="0" cy="-6" r="1.5" fill="#fef08a" />
              </g>
            </svg>
          </div>

          {/* Subtitle / Lineage Status indicator */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8a5cff] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#a77bff]" />
              </span>
              <p className="text-sm font-medium tracking-wide text-slate-200">
                {currentPhrase}
              </p>
            </div>

            {/* Cycle progress track bar */}
            <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-[#151c38]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8a5cff] via-[#38bdf8] to-[#fbbf24] transition-all duration-75"
                style={{
                  width: `${Math.round(cycleProgress * 100)}%`,
                }}
              />
            </div>

            {/* Subtle cycle counter tag */}
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Lineage Sync {cycleCount > 1 ? `• Cycle ${cycleCount}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
