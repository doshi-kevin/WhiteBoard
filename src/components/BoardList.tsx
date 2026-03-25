"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BoardSummary {
  id: string;
  name: string;
  createdAt: string;
  _count: { notes: number };
}

const CARD_COLORS = [
  "linear-gradient(135deg, #f59e0b, #f97316)",
  "linear-gradient(135deg, #ec4899, #a855f7)",
  "linear-gradient(135deg, #3b82f6, #6366f1)",
  "linear-gradient(135deg, #22c55e, #16a34a)",
  "linear-gradient(135deg, #f97316, #ef4444)",
  "linear-gradient(135deg, #a855f7, #3b82f6)",
];

interface Props {
  initialBoards: BoardSummary[];
}

export default function BoardList({ initialBoards }: Props) {
  const [boards,   setBoards]   = useState<BoardSummary[]>(initialBoards);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const router = useRouter();

  async function createBoard() {
    if (!newName.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const board = await res.json();
      router.push(`/board/${board.id}`);
    }
    setSaving(false);
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {boards.map((board, i) => (
          <a
            key={board.id}
            href={`/board/${board.id}`}
            className="group relative bg-white rounded-2xl overflow-hidden shadow-lg
                       hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-200
                       border-2 border-transparent hover:border-white/50 cursor-pointer"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
          >
            {/* Colored top stripe */}
            <div
              className="h-3 w-full"
              style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
            />
            <div className="p-5">
              <h3 className="font-handwriting text-2xl font-bold text-gray-800 leading-tight line-clamp-2">
                {board.name}
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-2.5">
                {board._count.notes} note{board._count.notes !== 1 ? "s" : ""}
              </p>
            </div>
            {/* Hover overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity
                         flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                Open →
              </span>
            </div>
          </a>
        ))}

        {/* New board card */}
        {creating ? (
          <div
            className="bg-white rounded-2xl p-5 shadow-lg border-2 border-indigo-300 flex flex-col gap-3"
            style={{ boxShadow: "0 4px 20px rgba(99,102,241,0.2)" }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  createBoard();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Board name..."
              autoFocus
              maxLength={60}
              className="font-handwriting text-xl font-bold border-b-2 border-indigo-300
                         focus:outline-none pb-1 bg-transparent text-gray-800 placeholder-gray-300"
            />
            <div className="flex gap-2">
              <button
                onClick={createBoard}
                disabled={!newName.trim() || saving}
                className="flex-1 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold
                           hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-500
                           text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex flex-col items-center justify-center rounded-2xl p-5 h-full min-h-[120px]
                       border-2 border-dashed border-white/60 hover:border-white/90
                       text-amber-900/50 hover:text-amber-900/80
                       hover:bg-white/20 transition-all"
          >
            <span className="text-5xl mb-2 leading-none">+</span>
            <span className="text-sm font-bold">New Board</span>
          </button>
        )}
      </div>
    </div>
  );
}
