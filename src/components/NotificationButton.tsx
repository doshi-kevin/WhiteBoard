"use client";

import { useState, useEffect } from "react";
import { getSubscriptionState, subscribe, unsubscribe } from "@/lib/push";

type State = "loading" | "unsupported" | "denied" | "default" | "subscribing" | "subscribed" | "testing";

export default function NotificationButton() {
  const [state,   setState]   = useState<State>("loading");
  const [toast,   setToast]   = useState("");
  const [showOff, setShowOff] = useState(false);

  useEffect(() => {
    getSubscriptionState().then((s) => setState(s === "subscribed" ? "subscribed" : s));

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        getSubscriptionState().then((s) => {
          if (s !== "subscribed") setState(s === "default" ? "default" : s);
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleEnable() {
    setState("subscribing");
    const ok = await subscribe();
    setState(ok ? "subscribed" : "denied");
    if (!ok) flashToast("Permission denied in browser settings.");
  }

  async function handleTest() {
    setState("testing");
    try {
      const res  = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      flashToast(res.ok ? `Sent to ${data.sent} device${data.sent !== 1 ? "s" : ""}!` : (data.error ?? "Test failed."));
    } catch {
      flashToast("Network error.");
    }
    setState("subscribed");
  }

  async function handleDisable() {
    await unsubscribe();
    setState("default");
    setShowOff(false);
    flashToast("Notifications disabled.");
  }

  // Nothing to show while loading or unsupported
  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="flex items-center gap-2">
      {/* Toast */}
      {toast && (
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 whitespace-nowrap">
          {toast}
        </span>
      )}

      {state === "denied" && (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
          🔕 Blocked
        </span>
      )}

      {(state === "default" || state === "subscribing") && (
        <button
          onClick={handleEnable}
          disabled={state === "subscribing"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white
                     transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            boxShadow: "0 2px 10px rgba(124,58,237,0.4)",
          }}
        >
          🔔 {state === "subscribing" ? "Enabling…" : "Enable Reminders"}
        </button>
      )}

      {(state === "subscribed" || state === "testing") && (
        <div className="flex items-center gap-1.5">
          {/* Active indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="text-sm font-bold text-green-700">Reminders on</span>
          </div>

          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={state === "testing"}
            className="px-3 py-1.5 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50
                       border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50
                       whitespace-nowrap"
          >
            {state === "testing" ? "…" : "Test"}
          </button>

          {/* Turn off — toggle */}
          {showOff ? (
            <button
              onClick={handleDisable}
              className="px-3 py-1.5 rounded-xl text-sm font-bold text-red-600 bg-red-50
                         border border-red-200 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              Turn off?
            </button>
          ) : (
            <button
              onClick={() => setShowOff(true)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100
                         transition-colors text-lg leading-none"
              title="Disable notifications"
            >
              ···
            </button>
          )}
        </div>
      )}
    </div>
  );
}
