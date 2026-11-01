"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a nice-to-have, not a hard requirement — if
      // registration fails (e.g. unsupported browser), just skip it.
    });
  }, []);

  return null;
}
