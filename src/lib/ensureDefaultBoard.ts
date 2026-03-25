import { prisma } from "./db";

/** Finds or creates "Main Board" and assigns all orphaned notes to it. Idempotent. */
export async function ensureDefaultBoard(): Promise<string> {
  let board = await prisma.whiteboard.findFirst({
    where: { name: "Main Board" },
    orderBy: { createdAt: "asc" },
  });
  if (!board) {
    board = await prisma.whiteboard.create({ data: { name: "Main Board" } });
  }
  // Assign any notes not yet on a board
  await prisma.note.updateMany({
    where: { boardId: null },
    data: { boardId: board.id },
  });
  return board.id;
}
