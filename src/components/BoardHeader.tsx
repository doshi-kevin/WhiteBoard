"use client";

import { useState } from "react";

interface Props {
  boardId: string;
  initialName: string;
  noteCount: number;
  connectMode: boolean;
  onToggleConnect: () => void;
  onAddNote: () => void;
}

export default function BoardHeader({
  boardId,
  initialName,
  noteCount,
  connectMode,
  onToggleConnect,
  onAddNote,
}: Props) {
  const [name,    setName]    = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(initialName);

  async function saveName() {
    setEditing(false);
    const trimmed = draft.trim() || name;
    if (trimmed === name) return;
    setName(trimmed);
    await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  return (
    <header
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: "52px",
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.13)",
        zIndex: 50,
        position: "relative",
      }}
    >
      {/* Back button */}
      <a
        href="/"
        className="flex items-center gap-1 text-sm font-semibold text-gray-500
                   hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg
                   transition-all shrink-0"
      >
        ← Boards
      </a>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Board name — inline editable */}
      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter")  saveName();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          maxLength={60}
          className="font-handwriting text-2xl font-bold text-gray-800 border-b-2 border-indigo-400
                     focus:outline-none bg-transparent min-w-0 flex-1"
        />
      ) : (
        <button
          onClick={() => { setDraft(name); setEditing(true); }}
          title="Click to rename"
          className="font-handwriting text-2xl font-bold text-gray-800 hover:text-indigo-700
                     truncate flex-1 text-left bg-transparent min-w-0"
        >
          {name}
        </button>
      )}

      <span className="text-xs text-gray-400 font-semibold shrink-0">
        {noteCount} note{noteCount !== 1 ? "s" : ""}
      </span>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Connect mode toggle */}
      <button
        onClick={onToggleConnect}
        title="Toggle connection drawing mode"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
                   transition-all shrink-0 border"
        style={{
          background:   connectMode ? "#4f46e5" : "transparent",
          color:        connectMode ? "white"   : "#6b7280",
          borderColor:  connectMode ? "#4f46e5" : "#d1d5db",
        }}
      >
        ⇢ Connect
      </button>

      {/* Add note */}
      <button
        onClick={onAddNote}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold text-white
                   hover:opacity-90 active:scale-95 transition-all shrink-0"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          boxShadow:  "0 2px 8px rgba(239,68,68,0.35)",
        }}
      >
        + Note
      </button>
    </header>
  );
}
