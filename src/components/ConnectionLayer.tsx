"use client";

import { useState } from "react";

export interface Connection {
  id: string;
  label: string | null;
  boardId: string;
  fromNoteId: string;
  toNoteId: string;
}

const NOTE_W = 260;
const NOTE_H_CENTER = 120; // approx vertical center of a 240px note

interface Props {
  connections: Connection[];
  positions: Record<string, { x: number; y: number }>;
  canvasWidth: number;
  canvasHeight: number;
  onDelete: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
}

export default function ConnectionLayer({
  connections,
  positions,
  canvasWidth,
  canvasHeight,
  onDelete,
  onLabelChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  async function saveLabel(id: string) {
    const trimmed = editLabel.trim();
    await fetch(`/api/connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed || null }),
    });
    onLabelChange(id, trimmed);
    setEditingId(null);
  }

  return (
    <svg
      className="absolute inset-0"
      style={{ width: canvasWidth, height: canvasHeight, pointerEvents: "none" }}
    >
      <defs>
        <marker
          id="conn-arrow"
          markerWidth="10"
          markerHeight="8"
          refX="9"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,8 L10,4 z" fill="#6366f1" opacity="0.85" />
        </marker>
      </defs>

      {connections.map((conn) => {
        const from = positions[conn.fromNoteId];
        const to   = positions[conn.toNoteId];
        if (!from || !to) return null;

        const x1 = from.x + NOTE_W / 2;
        const y1 = from.y + NOTE_H_CENTER;
        const x2 = to.x   + NOTE_W / 2;
        const y2 = to.y   + NOTE_H_CENTER;

        const dx       = x2 - x1;
        const cpOffset = Math.max(Math.abs(dx) * 0.4, 60);
        const cp1x     = x1 + cpOffset;
        const cp2x     = x2 - cpOffset;

        const d = `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`;

        // Bezier midpoint at t=0.5
        const mx = 0.125 * x1 + 0.375 * cp1x + 0.375 * cp2x + 0.125 * x2;
        const my = 0.125 * y1 + 0.375 * y1   + 0.375 * y2   + 0.125 * y2;

        const isEditing = editingId === conn.id;

        return (
          <g key={conn.id}>
            {/* Wide invisible stroke for click-to-delete */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onClick={() => onDelete(conn.id)}
            />

            {/* Visible bezier arrow */}
            <path
              d={d}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              opacity="0.65"
              markerEnd="url(#conn-arrow)"
            />

            {/* Label bubble */}
            {isEditing ? (
              <foreignObject
                x={mx - 56}
                y={my - 14}
                width="112"
                height="28"
                style={{ pointerEvents: "all" }}
              >
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => saveLabel(conn.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveLabel(conn.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  maxLength={40}
                  className="w-full text-xs text-center rounded-lg px-2 py-1
                             border-2 border-indigo-400 bg-white shadow focus:outline-none"
                />
              </foreignObject>
            ) : (
              <g
                style={{ pointerEvents: "all", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(conn.id);
                  setEditLabel(conn.label ?? "");
                }}
              >
                <rect
                  x={mx - 38}
                  y={my - 11}
                  width="76"
                  height="22"
                  rx="7"
                  fill="white"
                  stroke={conn.label ? "#a5b4fc" : "#d1d5db"}
                  strokeWidth="1.5"
                  opacity="0.95"
                />
                <text
                  x={mx}
                  y={my + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill={conn.label ? "#4f46e5" : "#9ca3af"}
                  fontWeight={conn.label ? "700" : "400"}
                >
                  {conn.label || "+ label"}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
