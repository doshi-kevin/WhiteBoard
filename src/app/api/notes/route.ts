import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const notes = await prisma.note.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const { title, content, color, priority, dueDate, reminderAt, boardId, x, y } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      title: title.trim(),
      content: content?.trim() || null,
      color: color ?? "yellow",
      priority: priority ?? "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      reminderAt: reminderAt ? new Date(reminderAt) : null,
      reminderSent: false,
      boardId: boardId ?? null,
      x: x ?? 100,
      y: y ?? 100,
    },
  });
  return NextResponse.json(note, { status: 201 });
}
