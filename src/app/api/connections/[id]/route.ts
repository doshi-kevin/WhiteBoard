import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { label } = await req.json();
  const conn = await prisma.connection.update({
    where: { id },
    data: { label: label?.trim() || null },
  });
  return NextResponse.json(conn);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.connection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
