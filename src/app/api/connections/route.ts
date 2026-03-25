import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { boardId, fromNoteId, toNoteId, label } = await req.json();
  if (!boardId || !fromNoteId || !toNoteId)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (fromNoteId === toNoteId)
    return NextResponse.json({ error: "Cannot connect a note to itself" }, { status: 400 });

  // Prevent duplicate connections in the same direction
  const existing = await prisma.connection.findFirst({ where: { fromNoteId, toNoteId } });
  if (existing) return NextResponse.json(existing);

  const conn = await prisma.connection.create({
    data: { boardId, fromNoteId, toNoteId, label: label || null },
  });
  return NextResponse.json(conn, { status: 201 });
}
