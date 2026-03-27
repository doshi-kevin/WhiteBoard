"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import StickyNote, { Note } from "./StickyNote";
import ConnectionLayer, { Connection } from "./ConnectionLayer";
import AddNoteModal from "./AddNoteModal";
import BoardHeader from "./BoardHeader";

const CANVAS_W = 5000;
const CANVAS_H = 4500;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const ZOOM_DEFAULT = 0.45;
const PAN_DEFAULT = { x: 40, y: 40 };

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

  // ─── Zoom / Pan state ───────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [pan,  setPan]  = useState(PAN_DEFAULT);

  // Refs so pointer handlers always read the latest values without stale closures
  const zoomRef = useRef(ZOOM_DEFAULT);
  const panRef  = useRef(PAN_DEFAULT);

  function applyTransform(z: number, p: { x: number; y: number }) {
    zoomRef.current = z;
    panRef.current  = p;
    setZoom(z);
    setPan(p);
  }

  // ─── Note drag ──────────────────────────────────────────────────────────────
  const noteDragRef = useRef<{
    noteId:  string;
    startPx: number; startPy: number;
    startNx: number; startNy: number;
  } | null>(null);

  // ─── Canvas pan ─────────────────────────────────────────────────────────────
  const bgPanRef = useRef<{
    startPx: number; startPy: number;
    startPanX: number; startPanY: number;
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const positions = Object.fromEntries(
    notes.map((n) => [n.id, { x: n.x ?? 100, y: n.y ?? 100 }])
  );

  // ─── Wheel: zoom (pinch / Ctrl+scroll) OR pan (two-finger swipe) ────────────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey) {
        // ── Pinch-to-zoom (trackpad) or Ctrl+scroll (mouse) ──
        e.preventDefault();
        const curZoom = zoomRef.current;
        // trackpad pinch gives small deltaY; mouse wheel gives large — handle both
        const factor  = Math.pow(0.994, e.deltaY);
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, curZoom * factor));
        const rect    = el!.getBoundingClientRect();
        const mx      = e.clientX - rect.left;
        const my      = e.clientY - rect.top;
        const curPan  = panRef.current;
        const newPanX = mx - (mx - curPan.x) * (newZoom / curZoom);
        const newPanY = my - (my - curPan.y) * (newZoom / curZoom);
        applyTransform(newZoom, { x: newPanX, y: newPanY });
      } else {
        // ── Two-finger swipe / scroll wheel → pan the canvas ──
        // But if pointer is over a scrollable note content, let THAT scroll instead
        const target = e.target as HTMLElement;
        const noteContent = target.closest("[data-note-content]") as HTMLElement | null;
        if (noteContent) {
          // Let the browser scroll the note content naturally
          return;
        }
        e.preventDefault();
        const p = panRef.current;
        const newPan = { x: p.x - e.deltaX * 1.8, y: p.y - e.deltaY * 1.8 };
        panRef.current = newPan;
        setPan(newPan);
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ─── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setPendingFrom(null); setConnectMode(false); }
      // +/= to zoom in, - to zoom out, 0 to reset
      if (e.key === "=" || e.key === "+") zoomBy(1.15);
      if (e.key === "-")                  zoomBy(0.87);
      if (e.key === "0")                  applyTransform(1, PAN_DEFAULT);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function zoomBy(factor: number) {
    const z = zoomRef.current;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor));
    // Zoom around center of viewport
    const el = viewportRef.current;
    if (!el) { applyTransform(newZoom, panRef.current); return; }
    const rect = el.getBoundingClientRect();
    const mx = rect.width  / 2;
    const my = rect.height / 2;
    const p  = panRef.current;
    applyTransform(newZoom, {
      x: mx - (mx - p.x) * (newZoom / z),
      y: my - (my - p.y) * (newZoom / z),
    });
  }

  // ─── Note dragging ──────────────────────────────────────────────────────────
  function onNotePointerDown(e: React.PointerEvent<HTMLDivElement>, note: Note) {
    if (connectMode) return;
    if ((e.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    noteDragRef.current = {
      noteId:  note.id,
      startPx: e.clientX, startPy: e.clientY,
      startNx: note.x ?? 100, startNy: note.y ?? 100,
    };
    setDraggingId(note.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function onNotePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!noteDragRef.current) return;
    const { noteId, startNx, startNy, startPx, startPy } = noteDragRef.current;
    const z  = zoomRef.current;
    const nx = Math.max(0, startNx + (e.clientX - startPx) / z);
    const ny = Math.max(0, startNy + (e.clientY - startPy) / z);
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, x: nx, y: ny } : n)));
  }

  async function onNotePointerUp(e: React.PointerEvent<HTMLDivElement>, note: Note) {
    if (!noteDragRef.current || noteDragRef.current.noteId !== note.id) return;
    const z  = zoomRef.current;
    const dx = (e.clientX - noteDragRef.current.startPx) / z;
    const dy = (e.clientY - noteDragRef.current.startPy) / z;
    if (Math.abs(dx) >= 3 || Math.abs(dy) >= 3) {
      const nx = Math.max(0, noteDragRef.current.startNx + dx);
      const ny = Math.max(0, noteDragRef.current.startNy + dy);
      fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: nx, y: ny }),
      });
    }
    noteDragRef.current = null;
    setDraggingId(null);
  }

  // ─── Canvas background pan ──────────────────────────────────────────────────
  function onCanvasBgDown(e: React.PointerEvent<HTMLDivElement>) {
    if (connectMode) return;
    if ((e.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    bgPanRef.current = {
      startPx: e.clientX, startPy: e.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onCanvasBgMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!bgPanRef.current) return;
    const dx = e.clientX - bgPanRef.current.startPx;
    const dy = e.clientY - bgPanRef.current.startPy;
    const p  = { x: bgPanRef.current.startPanX + dx, y: bgPanRef.current.startPanY + dy };
    panRef.current = p;
    setPan(p);
  }

  function onCanvasBgUp() {
    bgPanRef.current = null;
  }

  // ─── Connect mode ───────────────────────────────────────────────────────────
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

  // ─── Note CRUD ──────────────────────────────────────────────────────────────
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
    return { x: 80 + (idx % 6) * 420, y: 80 + Math.floor(idx / 6) * 520 };
  }

  const zoomPct = Math.round(zoom * 100);

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

      {/* Viewport — overflow:hidden, all navigation via transform */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden"
        style={{
          background: "#7a4b1a",
          cursor: bgPanRef.current ? "grabbing" : connectMode ? "default" : "grab",
        }}
      >
        {/* Transformed canvas */}
        <div
          className="cork-board absolute"
          style={{
            width:           CANVAS_W,
            height:          CANVAS_H,
            transformOrigin: "0 0",
            transform:       `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            willChange:      "transform",
          }}
          onPointerDown={onCanvasBgDown}
          onPointerMove={onCanvasBgMove}
          onPointerUp={onCanvasBgUp}
        >
          {/* SVG arrows layer */}
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
                position:   "absolute",
                left:       note.x ?? 100,
                top:        note.y ?? 100,
                zIndex:     draggingId === note.id ? 100 : 10,
                cursor:     connectMode ? "pointer" : draggingId === note.id ? "grabbing" : "grab",
                userSelect: "none",
              }}
              onPointerDown={(e) => onNotePointerDown(e, note)}
              onPointerMove={onNotePointerMove}
              onPointerUp={(e) => onNotePointerUp(e, note)}
              onClick={(e) => {
                if (!connectMode) return;
                if ((e.target as HTMLElement).closest("button")) return;
                handleConnectClick(note.id);
              }}
            >
              {connectMode && pendingFrom === note.id && (
                <div className="absolute -inset-2 rounded-xl border-4 border-indigo-500 z-20 pointer-events-none animate-pulse_badge" />
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

        {/* ── Zoom controls ── */}
        <div
          className="absolute bottom-5 right-5 flex items-center gap-1 z-50"
          style={{ pointerEvents: "all" }}
        >
          <button
            onClick={() => zoomBy(0.8)}
            className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center shadow-lg transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            title="Zoom out (−)"
          >−</button>

          <button
            onClick={() => applyTransform(1, PAN_DEFAULT)}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center justify-center shadow-lg transition-all hover:scale-105 min-w-[52px]"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            title="Reset zoom (0)"
          >
            {zoomPct}%
          </button>

          <button
            onClick={() => zoomBy(1.25)}
            className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center shadow-lg transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            title="Zoom in (+)"
          >+</button>

          <button
            onClick={() => applyTransform(ZOOM_DEFAULT, PAN_DEFAULT)}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center justify-center shadow-lg transition-all hover:scale-105 ml-1"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            title="Fit to overview"
          >
            Fit
          </button>
        </div>

        {/* Zoom hint */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold z-40 pointer-events-none"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Scroll to zoom · Drag background to pan · Drag notes to move
        </div>
      </div>

      {/* Connect mode toast */}
      {connectMode && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full
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
