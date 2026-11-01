"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "fasttrack-install-dismissed-at";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissedRecently = false;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const days = (Date.now() - Number(raw)) / 86400000;
        dismissedRecently = days < DISMISS_DAYS;
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — treat as not dismissed
    }
    if (dismissedRecently) return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    if (isAndroid) {
      setPlatform("android");
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome !== "accepted") return;
    setVisible(false);
  }

  if (!visible || !platform) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:hidden">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#4338CA" }}
          >
            <svg width="22" height="22" viewBox="0 0 30 30" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="11" height="11" rx="2.5" stroke="#FAFAF9" strokeWidth="2.2" />
              <rect x="18" y="1" width="11" height="11" rx="2.5" stroke="#FAFAF9" strokeOpacity="0.55" strokeWidth="2.2" />
              <rect x="9.5" y="18" width="11" height="11" rx="2.5" stroke="#FAFAF9" strokeWidth="2.2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900">Install FastTrack</p>
            <p className="mt-0.5 text-xs text-neutral-600">
              {platform === "android"
                ? "Add it to your home screen for quick, full-screen access."
                : "Add it to your home screen for quick, full-screen access."}
            </p>

            {platform === "ios" && showIosSteps && (
              <ol className="mt-2.5 space-y-1.5 text-xs text-neutral-700">
                <li className="flex gap-1.5">
                  <span className="font-semibold text-neutral-400">1.</span>
                  Tap the Share icon
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                  </svg>
                  in Safari&apos;s toolbar.
                </li>
                <li className="flex gap-1.5">
                  <span className="font-semibold text-neutral-400">2.</span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
              </ol>
            )}

            <div className="mt-3 flex gap-2">
              {platform === "android" ? (
                <button
                  onClick={handleInstall}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: "#4338CA" }}
                >
                  Install
                </button>
              ) : (
                <button
                  onClick={() => (showIosSteps ? dismiss() : setShowIosSteps(true))}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: "#4338CA" }}
                >
                  {showIosSteps ? "Got it" : "How to install"}
                </button>
              )}
              <button
                onClick={dismiss}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-xs font-medium text-neutral-700"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 rounded-md p-1 text-neutral-400 hover:text-neutral-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
