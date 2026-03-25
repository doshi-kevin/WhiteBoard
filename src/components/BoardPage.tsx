"use client";

import { useState, useRef, useEffect } from "react";
import StickyNote, { Note } from "./StickyNote";
import ConnectionLayer, { Connection } from "./ConnectionLayer";
import AddNoteModal from "./AddNoteModal";
import BoardHeader from "./BoardHeader";

const CANVAS_W = 4000;
const CANVAS_H = 3000;

interface Props {
  boardId: string;
  boardName: string;
  initialNotes: Note[];
  initialConnections: Connection[];
}

export default function BoardPage({
  boardId,
  boardName,
  initialNotes,
  initialConnections,
}: Props) {
  const [notes,       setNotes]       = useState<Note[]>(initialNotes);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [connectMode, setConnectMode] = useState(false);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [editNote,    setEditNote]    = useState<Note | null>(null);

  const dragRef = useRef<{
    noteId:  string;
    startPx: number; startPy: number;
    startNx: number; startNy: number;
  } | null>(null);

  const positions = Object.fromEntries(
    notes.map((n) => [n.id, { x: n.x ?? 100, y: n.y ?? 100 }])
  );

  // Escape exits connect mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setPendingFrom(null); setConnectMode(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ─── Drag ──────────────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, note: Note) {
    if (connectMode) return;
    if ((e.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    dragRef.current = {
      noteId:  note.id,
      startPx: e.clientX, startPy: e.clientY,
      startNx: note.x ?? 100, startNy: note.y ?? 100,
    };
    setDraggingId(note.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    // Destructure before setNotes so the async updater doesn't read a stale ref
    const { noteId, startNx, startNy, startPx, startPy } = dragRef.current;
    const nx = Math.max(0, startNx + e.clientX - startPx);
    const ny = Math.max(0, startNy + e.clientY - startPy);
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, x: nx, y: ny } : n)));
  }

  async function onPointerUp(e: React.PointerEvent<HTMLDivElement>, note: Note) {
    if (!dragRef.current || dragRef.current.noteId !== note.id) return;
    const dx = e.clientX - dragRef.current.startPx;
    const dy = e.clientY - dragRef.current.startPy;

    if (Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
      const nx = Math.max(0, dragRef.current.startNx + dx);
      const ny = Math.max(0, dragRef.current.startNy + dy);
      fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: nx, y: ny }),
      });
    }
    dragRef.current = null;

    setDraggingId(null);
  }

  // ─── Connect mode ──────────────────────────────────────────────────────────
  function handleConnectClick(noteId: string) {
    if (pendingFrom === null) {
      setPendingFrom(noteId);
    } else if (pendingFrom === noteId) {
      setPendingFrom(null);
    } else {
      doCreateConnection(pendingFrom, noteId);
      setPendingFrom(null);
    }
  }

  async function doCreateConnection(fromNoteId: string, toNoteId: string) {
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, fromNoteId, toNoteId }),
    });
    if (res.ok) {
      const conn: Connection = await res.json();
      setConnections((prev) =>
        prev.some((c) => c.id === conn.id) ? prev : [...prev, conn]
      );
    }
  }

  function deleteConnection(id: string) {
    fetch(`/api/connections/${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  function updateConnectionLabel(id: string, label: string) {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label: label || null } : c))
    );
  }

  // ─── Note CRUD ─────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromNoteId !== id && c.toNoteId !== id));
  }

  function handleToggleDone(id: string, done: boolean) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done } : n)));
  }

  function handleSaved(note: Note) {
    if (editNote) {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    } else {
      setNotes((prev) => [...prev, note]);
    }
    setEditNote(null);
  }

  function nextPosition() {
    const idx = notes.length;
    return { x: 80 + (idx % 6) * 310, y: 80 + Math.floor(idx / 6) * 320 };
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>
      <BoardHeader
        boardId={boardId}
        initialName={boardName}
        noteCount={notes.length}
        connectMode={connectMode}
        onToggleConnect={() => { setConnectMode((v) => !v); setPendingFrom(null); }}
        onAddNote={() => { setEditNote(null); setShowModal(true); }}
      />

      {/* Scrollable canvas area */}
      <div className="flex-1 overflow-auto" style={{ background: "#7a4b1a" }}>
        <div
          className="cork-board relative"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          {/* SVG arrows layer (behind notes) */}
          <ConnectionLayer
            connections={connections}
            positions={positions}
            canvasWidth={CANVAS_W}
            canvasHeight={CANVAS_H}
            onDelete={deleteConnection}
            onLabelChange={updateConnectionLabel}
          />

          {/* Notes */}
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                position: "absolute",
                left:     note.x ?? 100,
                top:      note.y ?? 100,
                zIndex:   draggingId === note.id ? 100 : 10,
                cursor:   connectMode ? "pointer" : "grab",
                userSelect: "none",
              }}
              onPointerDown={(e) => onPointerDown(e, note)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, note)}
              onClick={(e) => {
                if (!connectMode) return;
                // Only trigger connect if clicking note body, not its buttons
                if ((e.target as HTMLElement).closest("button")) return;
                handleConnectClick(note.id);
              }}
            >
              {/* Selection ring in connect mode */}
              {connectMode && pendingFrom === note.id && (
                <div
                  className="absolute -inset-2 rounded-xl border-4 border-indigo-500 z-20 pointer-events-none animate-pulse_badge"
                />
              )}
              <StickyNote
                note={note}
                onDelete={handleDelete}
                onToggleDone={handleToggleDone}
                onEdit={(n) => {
                  if (!connectMode) { setEditNote(n); setShowModal(true); }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Connect mode toast */}
      {connectMode && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full
                     text-sm font-semibold text-white shadow-xl z-50 flex items-center gap-2"
          style={{ background: "rgba(79,70,229,0.93)", backdropFilter: "blur(6px)" }}
        >
          ⇢&nbsp;
          {pendingFrom
            ? "Click another note to connect · Esc to cancel"
            : "Click a note to start a connection · Esc to exit"}
        </div>
      )}

      {showModal && (
        <AddNoteModal
          onClose={() => { setShowModal(false); setEditNote(null); }}
          onSaved={handleSaved}
          editNote={editNote}
          boardId={boardId}
          initialPosition={nextPosition()}
        />
      )}
    </div>
  );
}
