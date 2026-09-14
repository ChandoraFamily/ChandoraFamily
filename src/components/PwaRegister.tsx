"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Capacitor already provides the installed native shell. Registering the
    // browser PWA worker here can cache a stale Next.js HTML/CSS bundle from
    // the development server, leaving the Android app partly unstyled or
    // unable to retrieve fresh API data.
    if (Capacitor.isNativePlatform()) {
      navigator.serviceWorker
        ?.getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => undefined);
      if ("caches" in window) {
        window.caches
          .keys()
          .then((keys) =>
            Promise.all(keys.map((key) => window.caches.delete(key))),
          )
          .catch(() => undefined);
      }
      return;
    }

    // 1. Register Service Worker for offline capability
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Check for service worker updates
            reg.onupdatefound = () => {
              const installing = reg.installing;
              if (installing) {
                installing.onstatechange = () => {
                  if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWA] New version available, cached locally.");
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("[PWA] Service worker registration failed:", err);
          });
      });
    }

    // 2. Detect if already installed / standalone mode on Android or iOS
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 3. Listen for Android PWA install prompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show after user has interacted with the app for at least 5 seconds
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem("pwa_install_dismissed");
        if (!dismissed) {
          setShowInstallBanner(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 4. Listen for successful install
    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log("[PWA] Application successfully installed!");
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowInstallBanner(false);
      }
    } catch (err) {
      console.error("[PWA] Error during install prompt:", err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!showInstallBanner || isStandalone) return null;

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-[#0d132a]/95 p-3.5 shadow-2xl backdrop-blur-md transition-all sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-amber-500/40 bg-[#121938] shadow-md">
          <Image
            src="/icon-192.png"
            alt="Chandora Tree Icon"
            width={44}
            height={44}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">Install Chandora Tree</p>
          <p className="text-[11px] text-slate-300">Run locally on your Android device</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleInstallClick}
          className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-medium text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-500"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1a2342] hover:text-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
