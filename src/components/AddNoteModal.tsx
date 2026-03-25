"use client";

import { useState, useMemo } from "react";
import { NoteColor, Note, Priority, COLOR_MAP } from "./StickyNote";

const COLORS: { id: NoteColor; label: string }[] = [
  { id: "yellow", label: "Yellow" },
  { id: "pink",   label: "Pink"   },
  { id: "blue",   label: "Blue"   },
  { id: "green",  label: "Green"  },
  { id: "purple", label: "Purple" },
  { id: "orange", label: "Orange" },
];

const PRIORITIES: { id: Priority; label: string; icon: string; color: string }[] = [
  { id: "high",   label: "High",   icon: "↑↑", color: "#dc2626" },
  { id: "medium", label: "Medium", icon: "→",  color: "#d97706" },
  { id: "low",    label: "Low",    icon: "↓",  color: "#16a34a" },
];

// value = minutes before dueDate, "custom" = absolute datetime, "none" = no reminder
const REMINDER_PRESETS = [
  { value: "none",    label: "No reminder" },
  { value: "0",       label: "At due time" },
  { value: "30",      label: "30 min before" },
  { value: "60",      label: "1 hour before" },
  { value: "120",     label: "2 hours before" },
  { value: "480",     label: "8 hours before" },
  { value: "1440",    label: "1 day before" },
  { value: "custom",  label: "Custom date & time..." },
];

function existingReminderPreset(note: Note): string {
  if (!note.reminderAt) return "none";
  // If due date exists, try to match a preset offset
  if (note.dueDate) {
    const due = new Date(note.dueDate).getTime();
    const rem = new Date(note.reminderAt).getTime();
    const diff = Math.round((due - rem) / 60000);
    const match = REMINDER_PRESETS.find((p) => p.value !== "none" && p.value !== "custom" && parseInt(p.value) === diff);
    if (match) return match.value;
  }
  return "custom";
}

interface Props {
  onClose: () => void;
  onSaved: (note: Note) => void;
  editNote?: Note | null;
  boardId?: string | null;
  initialPosition?: { x: number; y: number };
}

export default function AddNoteModal({ onClose, onSaved, editNote, boardId, initialPosition }: Props) {
  const [title,          setTitle]          = useState(editNote?.title ?? "");
  const [content,        setContent]        = useState(editNote?.content ?? "");
  const [color,          setColor]          = useState<NoteColor>(editNote?.color ?? "yellow");
  const [priority,       setPriority]       = useState<Priority>(editNote?.priority ?? "medium");
  const [dueDate,        setDueDate]        = useState(editNote?.dueDate ? editNote.dueDate.slice(0, 10) : "");
  const [reminderPreset, setReminderPreset] = useState(() =>
    editNote ? existingReminderPreset(editNote) : "none"
  );
  const [customReminder, setCustomReminder] = useState(() => {
    if (editNote?.reminderAt && existingReminderPreset(editNote) === "custom") {
      return new Date(editNote.reminderAt).toISOString().slice(0, 16);
    }
    return "";
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const isEdit = !!editNote;
  const activeColor = COLOR_MAP[color];
  const needsDue = reminderPreset !== "none" && reminderPreset !== "custom";

  // Compute the final absolute reminderAt to send to the API
  const computedReminderAt = useMemo((): string | null => {
    if (reminderPreset === "none") return null;
    if (reminderPreset === "custom") return customReminder ? new Date(customReminder).toISOString() : null;
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const offsetMs = parseInt(reminderPreset) * 60 * 1000;
    return new Date(due.getTime() - offsetMs).toISOString();
  }, [reminderPreset, customReminder, dueDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (needsDue && !dueDate) { setError("Please set a due date to use this reminder preset"); return; }
    if (reminderPreset === "custom" && !customReminder) { setError("Please pick a custom reminder date & time"); return; }

    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim() || null,
        color,
        priority,
        dueDate: dueDate || null,
        reminderAt: computedReminderAt,
        reminderSent: false,
      };
      if (!isEdit) {
        if (boardId)          body.boardId = boardId;
        if (initialPosition)  { body.x = initialPosition.x; body.y = initialPosition.y; }
      }

      const res = isEdit
        ? await fetch(`/api/notes/${editNote!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) throw new Error("Failed");
      const note: Note = await res.json();
      note.createdAt = new Date(note.createdAt).toISOString();
      if (note.dueDate)    note.dueDate    = new Date(note.dueDate).toISOString();
      if (note.reminderAt) note.reminderAt = new Date(note.reminderAt).toISOString();
      onSaved(note);
      onClose();
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4 animate-float_in overflow-hidden"
        style={{ boxShadow: `0 24px 60px rgba(0,0,0,0.35), 0 8px 24px ${activeColor.shadow}` }}
      >
        {/* Colored top bar */}
        <div className="h-3 w-full transition-colors duration-300" style={{ background: activeColor.header }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-gray-100">
          <h2 className="font-handwriting text-3xl font-bold text-gray-700">
            {isEdit ? "✏ Edit Note" : "📌 New Note"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-all text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              maxLength={80}
              autoFocus
              className="w-full font-handwriting text-xl border-2 border-gray-200 rounded-xl px-4 py-2.5
                         focus:outline-none focus:border-indigo-400 transition-colors placeholder-gray-300"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Details
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Any extra notes..."
              rows={3}
              maxLength={500}
              className="w-full font-handwriting text-lg border-2 border-gray-200 rounded-xl px-4 py-2.5
                         focus:outline-none focus:border-indigo-400 transition-colors resize-none placeholder-gray-300"
            />
          </div>

          {/* Due date + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:border-indigo-400 transition-colors text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setPriority(pr.id)}
                    title={pr.label}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2"
                    style={{
                      color: priority === pr.id ? "white" : pr.color,
                      background: priority === pr.id ? pr.color : "transparent",
                      borderColor: pr.color,
                      opacity: priority === pr.id ? 1 : 0.5,
                    }}
                  >
                    {pr.icon}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-0.5">
                {PRIORITIES.find((p) => p.id === priority)?.label}
              </p>
            </div>
          </div>

          {/* ── Reminder ─────────────────────────────────── */}
          <div
            className="rounded-xl p-3 space-y-2.5 border-2"
            style={{ borderColor: computedReminderAt ? "#a78bfa" : "#e5e7eb",
                     background: computedReminderAt ? "#faf5ff" : "#f9fafb" }}
          >
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"
                   style={{ color: computedReminderAt ? "#7c3aed" : "#6b7280" }}>
              🔔 Reminder
              {computedReminderAt && (
                <span className="ml-auto text-[10px] font-normal normal-case text-purple-500">
                  {new Date(computedReminderAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </label>

            <select
              value={reminderPreset}
              onChange={(e) => setReminderPreset(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm
                         focus:outline-none focus:border-purple-400 transition-colors text-gray-600 bg-white"
            >
              {REMINDER_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Custom datetime picker */}
            {reminderPreset === "custom" && (
              <input
                type="datetime-local"
                value={customReminder}
                onChange={(e) => setCustomReminder(e.target.value)}
                className="w-full border-2 border-purple-200 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:border-purple-400 transition-colors text-gray-600"
              />
            )}

            {/* Hint when preset needs due date but due date is empty */}
            {needsDue && !dueDate && (
              <p className="text-[11px] text-amber-600 font-medium">
                ⚠ Set a due date above to use this preset
              </p>
            )}
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Note Color
            </label>
            <div className="flex gap-3">
              {COLORS.map((col) => {
                const cm = COLOR_MAP[col.id];
                return (
                  <button
                    key={col.id}
                    type="button"
                    title={col.label}
                    onClick={() => setColor(col.id)}
                    className="relative w-9 h-9 rounded-full transition-all duration-200"
                    style={{
                      background: cm.header,
                      border: `3px solid ${color === col.id ? cm.pin : "transparent"}`,
                      transform: color === col.id ? "scale(1.25)" : "scale(1)",
                      boxShadow: color === col.id ? `0 0 0 2px ${cm.pin}55, 0 4px 10px ${cm.shadow}` : "none",
                    }}
                  >
                    {color === col.id && (
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: cm.pin }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold
                         hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all
                         disabled:opacity-60 hover:opacity-90 active:scale-95 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${activeColor.pin}, ${activeColor.fold})`,
                boxShadow: `0 4px 14px ${activeColor.shadow}`,
              }}
            >
              {saving ? "Saving..." : isEdit ? "💾 Save Changes" : "📌 Pin It!"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
