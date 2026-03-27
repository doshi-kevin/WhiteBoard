"use client";

import { useEffect } from "react";
import { format, isPast, differenceInDays, isToday } from "date-fns";
import { Note, COLOR_MAP } from "./StickyNote";

const PRIORITY_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  high:   { label: "High",   icon: "↑↑", color: "#dc2626", bg: "#fee2e2" },
  medium: { label: "Medium", icon: "→",  color: "#d97706", bg: "#fef3c7" },
  low:    { label: "Low",    icon: "↓",  color: "#16a34a", bg: "#dcfce7" },
};

interface Props {
  note: Note;
  onClose: () => void;
  onEdit: (note: Note) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}

export default function NoteDetailView({ note, onClose, onEdit, onToggleDone, onDelete }: Props) {
  const c = COLOR_MAP[note.color] ?? COLOR_MAP.yellow;
  const p = PRIORITY_CFG[note.priority] ?? PRIORITY_CFG.medium;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dueDateStatus = (() => {
    if (!note.dueDate) return "none";
    const d = new Date(note.dueDate);
    if (isPast(d) && !isToday(d)) return "overdue";
    if (differenceInDays(d, new Date()) <= 2) return "soon";
    return "ok";
  })();

  const dueBadge = (() => {
    if (dueDateStatus === "none") return null;
    const label = note.dueDate
      ? isToday(new Date(note.dueDate)) ? "Today!" : format(new Date(note.dueDate), "MMMM d, yyyy")
      : "";
    if (dueDateStatus === "overdue")
      return (
        <span className="flex items-center gap-1 text-base font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-600 border-2 border-red-400">
          ⚠ Overdue — {label}
        </span>
      );
    if (dueDateStatus === "soon")
      return (
        <span className="flex items-center gap-1 text-base font-extrabold px-3 py-1 rounded-full bg-orange-100 text-orange-600 border-2 border-orange-400">
          ⏰ Due soon — {label}
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-base font-bold px-3 py-1 rounded-full bg-green-100 text-green-700 border-2 border-green-400">
        📅 {label}
      </span>
    );
  })();

  async function handleToggle() {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !note.done }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      onToggleDone(note.id, updated.done);
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) return;
      onDelete(note.id);
      onClose();
    } catch { /* ignore */ }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col animate-float_in"
        style={{
          width: "min(640px, 92vw)",
          maxHeight: "88vh",
          background: c.bg,
          borderRadius: "12px",
          boxShadow: `0 24px 80px rgba(0,0,0,0.45), 8px 16px 40px ${c.shadow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Priority stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 rounded-l-xl"
          style={{ width: "8px", background: p.color, opacity: note.done ? 0.4 : 1 }}
        />

        {/* Pushpin */}
        <div className="absolute left-1/2 -top-5 -translate-x-1/2 z-10 flex flex-col items-center">
          <div
            className="w-8 h-8 rounded-full border-[3px] border-white"
            style={{ background: c.pin, boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.4)" }}
          />
          <div className="w-0.5 h-3" style={{ background: c.pin, opacity: 0.6 }} />
        </div>

        {/* Header */}
        <div
          className="pl-7 pr-4 pt-8 pb-4 rounded-t-xl flex items-start gap-3"
          style={{ background: c.header }}
        >
          {/* Done toggle */}
          <button
            onClick={handleToggle}
            title={note.done ? "Mark undone" : "Mark done"}
            className="mt-1 w-8 h-8 rounded border-2 flex items-center justify-center shrink-0 transition-all"
            style={{
              borderColor: "rgba(0,0,0,0.35)",
              background: note.done ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.6)",
            }}
          >
            {note.done && <span className="text-white text-sm font-black leading-none">✓</span>}
          </button>

          <h2
            className="font-handwriting font-extrabold flex-1 leading-tight break-words"
            style={{
              fontSize: "32px",
              color: note.done ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.85)",
              textDecoration: note.done ? "line-through" : "none",
            }}
          >
            {note.title}
          </h2>

          <div className="flex items-center gap-1 shrink-0 mt-1">
            <button
              onClick={() => { onEdit(note); onClose(); }}
              title="Edit note"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base
                         opacity-60 hover:opacity-100 hover:bg-black/10 transition-all"
              style={{ color: "rgba(0,0,0,0.8)" }}
            >
              ✏
            </button>
            <button
              onClick={handleDelete}
              title="Delete note"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-black
                         opacity-60 hover:opacity-100 hover:bg-red-500/20 hover:text-red-700 transition-all"
              style={{ color: "rgba(0,0,0,0.8)" }}
            >
              ✕
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl font-bold ml-1
                         opacity-40 hover:opacity-100 hover:bg-black/10 transition-all"
              style={{ color: "rgba(0,0,0,0.8)" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="pl-7 pr-5 pt-5 pb-4 flex-1 overflow-y-auto"
          style={{ minHeight: "120px" }}
        >
          {note.content ? (
            <p
              className="font-handwriting leading-relaxed break-words font-semibold"
              style={{
                fontSize: "20px",
                color: note.done ? "#9ca3af" : "#1f2937",
                textDecoration: note.done ? "line-through" : "none",
                whiteSpace: "pre-wrap",
              }}
            >
              {note.content}
            </p>
          ) : (
            <p className="font-handwriting italic" style={{ fontSize: "18px", color: c.text, opacity: 0.25 }}>
              No details...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pl-7 pr-5 pb-5 pt-3 flex items-center gap-3 flex-wrap border-t" style={{ borderColor: `${c.fold}33` }}>
          {/* Priority badge */}
          <span
            className="text-base font-extrabold px-3 py-1 rounded-full leading-none"
            style={{ color: p.color, background: p.bg, border: `2px solid ${p.color}66` }}
          >
            {p.icon} {p.label}
          </span>

          {dueBadge}

          {/* Reminder */}
          {note.reminderAt && !note.done && (
            <span
              className="flex items-center gap-1 text-base font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border-2 border-amber-300"
            >
              🔔 {format(new Date(note.reminderAt), "MMM d, h:mm a")}
            </span>
          )}

          <span className="ml-auto text-sm font-semibold opacity-50" style={{ color: c.text }}>
            Created {format(new Date(note.createdAt), "MMM d, yyyy")}
          </span>
        </div>

        {/* Paper fold */}
        <div
          className="absolute bottom-0 right-0 w-10 h-10"
          style={{
            background: `linear-gradient(225deg, ${c.fold} 50%, transparent 50%)`,
            borderRadius: "0 0 12px 0",
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
}
