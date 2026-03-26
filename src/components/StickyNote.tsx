"use client";

import { useState } from "react";
import { format, isPast, differenceInDays, isToday } from "date-fns";

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
export type Priority = "low" | "medium" | "high";

export interface Note {
  id: string;
  title: string;
  content: string | null;
  color: NoteColor;
  priority: Priority;
  dueDate: string | null;
  reminderAt: string | null;
  reminderSent: boolean;
  done: boolean;
  createdAt: string;
  boardId?: string | null;
  x?: number;
  y?: number;
}

export const COLOR_MAP: Record<NoteColor, {
  bg: string; header: string; pin: string;
  fold: string; shadow: string; text: string; stripe: string;
}> = {
  yellow: { bg: "#fefce8", header: "#facc15", pin: "#92400e", fold: "#eab308", shadow: "rgba(234,179,8,0.55)",    text: "#3b1a00", stripe: "#eab308" },
  pink:   { bg: "#fdf2f8", header: "#ec4899", pin: "#831843", fold: "#db2777", shadow: "rgba(236,72,153,0.55)",   text: "#500724", stripe: "#db2777" },
  blue:   { bg: "#eff6ff", header: "#3b82f6", pin: "#1e3a8a", fold: "#2563eb", shadow: "rgba(59,130,246,0.55)",   text: "#172554", stripe: "#2563eb" },
  green:  { bg: "#f0fdf4", header: "#22c55e", pin: "#14532d", fold: "#16a34a", shadow: "rgba(34,197,94,0.55)",    text: "#052e16", stripe: "#16a34a" },
  purple: { bg: "#faf5ff", header: "#a855f7", pin: "#581c87", fold: "#9333ea", shadow: "rgba(168,85,247,0.55)",   text: "#3b0764", stripe: "#9333ea" },
  orange: { bg: "#fff7ed", header: "#f97316", pin: "#7c2d12", fold: "#ea580c", shadow: "rgba(249,115,22,0.55)",   text: "#431407", stripe: "#ea580c" },
};

const PRIORITY_CFG: Record<Priority, { label: string; icon: string; color: string; bg: string }> = {
  high:   { label: "High",   icon: "↑↑", color: "#dc2626", bg: "#fee2e2" },
  medium: { label: "Medium", icon: "→",  color: "#d97706", bg: "#fef3c7" },
  low:    { label: "Low",    icon: "↓",  color: "#16a34a", bg: "#dcfce7" },
};

function getRotation(id: string): number {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((h % 11) - 5) * 0.65;
}

function getDueDateStatus(dueDate: string | null): "none" | "ok" | "soon" | "overdue" {
  if (!dueDate) return "none";
  const d = new Date(dueDate);
  if (isPast(d) && !isToday(d)) return "overdue";
  if (differenceInDays(d, new Date()) <= 2) return "soon";
  return "ok";
}

interface Props {
  note: Note;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onEdit: (note: Note) => void;
}

export default function StickyNote({ note, onDelete, onToggleDone, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const c = COLOR_MAP[note.color] ?? COLOR_MAP.yellow;
  const p = PRIORITY_CFG[note.priority] ?? PRIORITY_CFG.medium;
  const rotation = getRotation(note.id);
  const dueDateStatus = getDueDateStatus(note.dueDate);

  async function handleDelete() {
    setDeleting(true);
    setErr("");
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      onDelete(note.id);
    } catch (e) {
      console.error("Delete failed:", e);
      setErr("Could not delete — try again");
      setDeleting(false);
    }
  }

  async function handleToggle() {
    setErr("");
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !note.done }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const updated = await res.json();
      onToggleDone(note.id, updated.done);
    } catch (e) {
      console.error("Toggle failed:", e);
      setErr("Could not update — try again");
    }
  }

  const dueBadge = (() => {
    if (dueDateStatus === "none") return null;
    const label = note.dueDate
      ? isToday(new Date(note.dueDate)) ? "Today!" : format(new Date(note.dueDate), "MMM d")
      : "";
    if (dueDateStatus === "overdue")
      return (
        <span className="flex items-center gap-0.5 text-[13px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border-2 border-red-400 animate-shake">
          ⚠ {label}
        </span>
      );
    if (dueDateStatus === "soon")
      return (
        <span className="flex items-center gap-0.5 text-[13px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border-2 border-orange-400 animate-pulse_badge">
          ⏰ {label}
        </span>
      );
    return (
      <span className="flex items-center gap-0.5 text-[13px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border-2 border-green-400">
        📅 {label}
      </span>
    );
  })();

  return (
    <div
      className={`relative flex flex-col rounded-md select-none
        transition-[transform,box-shadow,opacity] duration-200
        ${deleting ? "opacity-0 scale-75 pointer-events-none" : "opacity-100"}
        ${note.done ? "opacity-55" : ""}
        hover:-translate-y-3 hover:z-20 animate-float_in`}
      style={{
        transform: `rotate(${rotation}deg)`,
        boxShadow: `6px 10px 28px ${c.shadow}, 0 3px 8px rgba(0,0,0,0.2)`,
        width: "260px",
        minHeight: "240px",
        background: c.bg,
      }}
    >
      {/* Priority stripe along left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 rounded-l-md"
        style={{ background: p.color, opacity: note.done ? 0.4 : 1 }}
      />

      {/* Pushpin */}
      <div className="absolute left-1/2 -top-4 -translate-x-1/2 z-10 flex flex-col items-center">
        <div
          className="w-6 h-6 rounded-full border-[3px] border-white"
          style={{ background: c.pin, boxShadow: `0 4px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.4)` }}
        />
        <div className="w-0.5 h-2" style={{ background: c.pin, opacity: 0.6 }} />
      </div>

      {/* Header */}
      <div
        className="pl-5 pr-2 pt-5 pb-2.5 rounded-t-md flex items-start gap-2"
        style={{ background: c.header }}
      >
        {/* Done toggle */}
        <button
          onClick={handleToggle}
          title={note.done ? "Mark undone" : "Mark done"}
          className="mt-1 w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all"
          style={{
            borderColor: "rgba(0,0,0,0.35)",
            background: note.done ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.6)",
          }}
        >
          {note.done && <span className="text-white text-xs font-black leading-none">✓</span>}
        </button>

        <span
          className="font-handwriting font-extrabold flex-1 leading-tight break-words"
          style={{
            fontSize: "22px",
            color: note.done ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.8)",
            textDecoration: note.done ? "line-through" : "none",
          }}
        >
          {note.title}
        </span>

        <div className="flex items-center gap-1 shrink-0 mt-1">
          <button
            onClick={() => onEdit(note)}
            title="Edit note"
            className="text-base opacity-40 hover:opacity-90 transition-opacity"
            style={{ color: "rgba(0,0,0,0.7)" }}
          >
            ✏
          </button>
          <button
            onClick={handleDelete}
            title="Delete note"
            className="text-base opacity-40 hover:opacity-90 hover:text-red-700 transition-all font-black"
            style={{ color: "rgba(0,0,0,0.7)" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content — fixed height, scrollable */}
      <div
        data-note-content
        className="pl-5 pr-3 pt-3 pb-1"
        style={{ height: "200px", overflowY: "auto", overflowX: "hidden" }}
      >
        {note.content ? (
          <p
            className="font-handwriting leading-relaxed break-words font-semibold"
            style={{
              fontSize: "15px",
              color: note.done ? "#9ca3af" : "#1f2937",
              textDecoration: note.done ? "line-through" : "none",
              whiteSpace: "pre-wrap",
            }}
          >
            {note.content}
          </p>
        ) : (
          <p className="font-handwriting italic" style={{ fontSize: "14px", color: c.text, opacity: 0.25 }}>
            no details...
          </p>
        )}
      </div>

      {/* Error message */}
      {err && (
        <div className="mx-3 mb-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-600 font-semibold">
          {err}
        </div>
      )}

      {/* Footer */}
      <div className="pl-5 pr-4 pb-3.5 pt-2 flex items-center gap-2 flex-wrap">
        {/* Priority badge */}
        <span
          className="text-[13px] font-extrabold px-2 py-0.5 rounded-full leading-none"
          style={{ color: p.color, background: p.bg, border: `1.5px solid ${p.color}66` }}
        >
          {p.icon} {p.label}
        </span>

        {dueBadge}

        {/* Reminder bell */}
        {note.reminderAt && !note.done && (
          <span
            title={`Reminder: ${format(new Date(note.reminderAt), "MMM d, h:mm a")}`}
            className={`text-base ${note.reminderSent ? "opacity-30" : "animate-pulse_badge"}`}
          >
            🔔
          </span>
        )}

        <span className="ml-auto text-[11px] font-semibold opacity-50" style={{ color: c.text }}>
          {format(new Date(note.createdAt), "MMM d")}
        </span>
      </div>

      {/* Paper fold */}
      <div
        className="absolute bottom-0 right-0 w-8 h-8"
        style={{
          background: `linear-gradient(225deg, ${c.fold} 50%, transparent 50%)`,
          borderRadius: "0 0 4px 0",
          opacity: 0.8,
        }}
      />
    </div>
  );
}
