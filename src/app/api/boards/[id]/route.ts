import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const board = await prisma.whiteboard.update({ where: { id }, data: { name: name.trim() } });
  return NextResponse.json(board);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.whiteboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
