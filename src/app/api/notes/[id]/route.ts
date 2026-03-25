import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const reminderChanged = body.reminderAt !== undefined;

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(body.title    !== undefined && { title:    body.title }),
      ...(body.content  !== undefined && { content:  body.content }),
      ...(body.color    !== undefined && { color:    body.color }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.done     !== undefined && { done:     body.done }),
      ...(body.x        !== undefined && { x:        body.x }),
      ...(body.y        !== undefined && { y:        body.y }),
      ...(body.dueDate  !== undefined && { dueDate:  body.dueDate ? new Date(body.dueDate) : null }),
      ...(reminderChanged && {
        reminderAt:   body.reminderAt ? new Date(body.reminderAt) : null,
        reminderSent: false,
      }),
    },
  });
  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
