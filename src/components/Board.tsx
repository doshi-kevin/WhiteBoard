"use client";

import { useState, useMemo } from "react";
import StickyNote, { Note } from "./StickyNote";
import AddNoteModal from "./AddNoteModal";
import { isPast, isToday } from "date-fns";

type Filter = "all" | "active" | "overdue" | "done";

const FILTER_LABELS: { id: Filter; label: string; icon: string }[] = [
  { id: "all",     label: "All",     icon: "📋" },
  { id: "active",  label: "Active",  icon: "🔥" },
  { id: "overdue", label: "Overdue", icon: "⚠" },
  { id: "done",    label: "Done",    icon: "✓" },
];

function isOverdue(note: Note) {
  if (!note.dueDate || note.done) return false;
  const d = new Date(note.dueDate);
  return isPast(d) && !isToday(d);
}

interface Props { initialNotes: Note[] }

export default function Board({ initialNotes }: Props) {
  const [notes,     setNotes]     = useState<Note[]>(initialNotes);
  const [filter,    setFilter]    = useState<Filter>("all");
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editNote,  setEditNote]  = useState<Note | null>(null);

  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handleToggleDone(id: string, done: boolean) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done } : n)));
  }

  function handleSaved(note: Note) {
    if (editNote) {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    } else {
      setNotes((prev) => [note, ...prev]);
    }
    setEditNote(null);
  }

  function openEdit(note: Note) {
    setEditNote(note);
    setShowModal(true);
  }

  function openAdd() {
    setEditNote(null);
    setShowModal(true);
  }

  // Counts for filter badges
  const counts = useMemo(() => ({
    all:     notes.length,
    active:  notes.filter((n) => !n.done).length,
    overdue: notes.filter(isOverdue).length,
    done:    notes.filter((n) => n.done).length,
  }), [notes]);

  // Apply filter + search
  const visible = useMemo(() => {
    let list = notes;
    if (filter === "active")  list = list.filter((n) => !n.done);
    if (filter === "overdue") list = list.filter(isOverdue);
    if (filter === "done")    list = list.filter((n) => n.done);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [notes, filter, search]);

  return (
    <>
      {/* Filter + Search toolbar */}
      <div
        className="mx-6 my-4 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}
      >
        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_LABELS.map(({ id, label, icon }) => {
            const count = counts[id];
            const active = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-extrabold transition-all"
                style={{
                  background: active ? "rgba(255,255,255,0.85)" : "transparent",
                  color: active ? "#7c3aed" : "rgba(90,50,10,0.75)",
                  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  transform: active ? "translateY(-1px)" : "none",
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full leading-none"
                    style={{
                      background: id === "overdue" && count > 0 ? "#fee2e2" : "rgba(0,0,0,0.12)",
                      color: id === "overdue" && count > 0 ? "#dc2626" : "inherit",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-900/40 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-8 pr-4 py-2 rounded-xl font-handwriting text-xl font-bold
                       focus:outline-none transition-all w-52 focus:w-72"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "#4a2500",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-auto px-8 pb-28 pt-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56">
            <div className="text-7xl mb-4 opacity-50">
              {search ? "🔍" : filter === "done" ? "🎉" : filter === "overdue" ? "🎊" : "📋"}
            </div>
            <p className="font-handwriting text-4xl font-bold text-amber-950/50">
              {search
                ? `No notes matching "${search}"`
                : filter !== "all"
                ? `No ${filter} notes`
                : "Your board is empty!"}
            </p>
            {!search && filter === "all" && (
              <p className="font-handwriting text-xl text-amber-900/35 mt-2">
                Click + to pin your first note
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-10 py-4" style={{ alignItems: "flex-start" }}>
            {visible.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                onDelete={handleDelete}
                onToggleDone={handleToggleDone}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Add button */}
      <button
        onClick={openAdd}
        title="Add new note"
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full text-white text-4xl font-light
                   shadow-2xl hover:scale-110 active:scale-95 transition-all z-40
                   flex items-center justify-center leading-none"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          boxShadow: "0 8px 28px rgba(239,68,68,0.55), 0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        +
      </button>

      {showModal && (
        <AddNoteModal
          onClose={() => { setShowModal(false); setEditNote(null); }}
          onSaved={handleSaved}
          editNote={editNote}
        />
      )}
    </>
  );
}
