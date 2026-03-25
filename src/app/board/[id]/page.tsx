import { prisma, withRetry } from "@/lib/db";
import { notFound } from "next/navigation";
import BoardPage from "@/components/BoardPage";
import { Note } from "@/components/StickyNote";
import { Connection } from "@/components/ConnectionLayer";

export const dynamic = "force-dynamic";

export default async function BoardRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const board = await withRetry(() => prisma.whiteboard.findUnique({
    where: { id },
    include: {
      notes:       { orderBy: { createdAt: "asc" } },
      connections: { orderBy: { createdAt: "asc" } },
    },
  }));

  if (!board) notFound();

  const notes: Note[] = board.notes.map((n) => ({
    id:           n.id,
    title:        n.title,
    content:      n.content,
    color:        n.color    as Note["color"],
    priority:     (n.priority ?? "medium") as Note["priority"],
    dueDate:      n.dueDate    ? n.dueDate.toISOString()    : null,
    reminderAt:   n.reminderAt ? n.reminderAt.toISOString() : null,
    reminderSent: n.reminderSent,
    done:         n.done,
    createdAt:    n.createdAt.toISOString(),
    boardId:      n.boardId,
    x:            n.x,
    y:            n.y,
  }));

  const connections: Connection[] = board.connections.map((c) => ({
    id:         c.id,
    label:      c.label,
    boardId:    c.boardId,
    fromNoteId: c.fromNoteId,
    toNoteId:   c.toNoteId,
  }));

  return (
    <BoardPage
      boardId={board.id}
      boardName={board.name}
      initialNotes={notes}
      initialConnections={connections}
    />
  );
}
