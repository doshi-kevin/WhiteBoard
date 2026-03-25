"use client";

import { useEffect } from "react";

// Polls /api/push/cron every 60 seconds in development so reminders fire
// without needing an external cron service. Does nothing in production.
export default function DevCronPoller() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const secret = process.env.NEXT_PUBLIC_DEV_CRON_SECRET;
    if (!secret) return;

    const poll = async () => {
      try {
        await fetch("/api/push/cron", {
          headers: { Authorization: `Bearer ${secret}` },
        });
      } catch {
        // Silent fail — network errors are expected during hot reloads
      }
    };

    // Poll immediately on mount, then every 60s
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
