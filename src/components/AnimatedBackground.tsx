"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  pulseSpeed: number;
  pulseVal: number;
  color: string;
}

export default function AnimatedBackground() {
  const { themeConfig, backgroundAnimation } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!backgroundAnimation) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
      initParticles();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const colors = themeConfig.particleColors;
    const particleCount =
      Math.min(Math.floor((width * height) / 22000), 55) || 35;
    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: Math.random() * 1.8 + 0.8,
          alpha: Math.random() * 0.4 + 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          pulseVal: Math.random() * Math.PI,
          color: colors[i % colors.length],
        });
      }
    };

    initParticles();

    let orbAngle = 0;

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      orbAngle += 0.003;
      const orb1X = width * 0.3 + Math.sin(orbAngle) * 80;
      const orb1Y = height * 0.25 + Math.cos(orbAngle * 0.8) * 60;
      const orb1Rad = Math.min(width, height) * 0.45;

      const grad1 = ctx.createRadialGradient(
        orb1X,
        orb1Y,
        0,
        orb1X,
        orb1Y,
        orb1Rad,
      );
      grad1.addColorStop(0, themeConfig.glowColor);
      grad1.addColorStop(1, "transparent");
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(orb1X, orb1Y, orb1Rad, 0, Math.PI * 2);
      ctx.fill();

      const orb2X = width * 0.75 + Math.cos(orbAngle * 0.9) * 90;
      const orb2Y = height * 0.8 + Math.sin(orbAngle * 0.7) * 70;
      const orb2Rad = Math.min(width, height) * 0.5;

      const grad2 = ctx.createRadialGradient(
        orb2X,
        orb2Y,
        0,
        orb2X,
        orb2Y,
        orb2Rad,
      );
      grad2.addColorStop(0, themeConfig.glowColor.replace("0.35", "0.22"));
      grad2.addColorStop(1, "transparent");
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.arc(orb2X, orb2Y, orb2Rad, 0, Math.PI * 2);
      ctx.fill();

      const maxDist = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = themeConfig.accent;
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.75;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.pulseVal += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulseVal) * 0.15;
        const safeAlpha = Math.max(0.05, Math.min(0.8, currentAlpha));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = safeAlpha;
        ctx.fill();

        if (p.size > 1.8) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = safeAlpha * 0.25;
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [themeConfig, backgroundAnimation]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, ${
            themeConfig.glowColor
          } 0%, transparent 60%), radial-gradient(circle at 50% 100%, ${themeConfig.glowColor.replace(
            "0.35",
            "0.15",
          )} 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {backgroundAnimation && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full opacity-80"
        />
      )}
    </div>
  );
}
