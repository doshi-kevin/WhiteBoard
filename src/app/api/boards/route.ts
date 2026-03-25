import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const boards = await prisma.whiteboard.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { notes: true } } },
  });
  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const board = await prisma.whiteboard.create({ data: { name: name.trim() } });
  return NextResponse.json(board, { status: 201 });
}
