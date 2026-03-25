import { prisma, withRetry } from "@/lib/db";
import { ensureDefaultBoard } from "@/lib/ensureDefaultBoard";
import BoardList, { BoardSummary } from "@/components/BoardList";
import NotificationButton from "@/components/NotificationButton";
import DevCronPoller from "@/components/DevCronPoller";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDefaultBoard();

  const rawBoards = await withRetry(() => prisma.whiteboard.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { notes: true } } },
  }));

  const boards: BoardSummary[] = rawBoards.map((b) => ({
    id:        b.id,
    name:      b.name,
    createdAt: b.createdAt.toISOString(),
    _count:    b._count,
  }));

  const totalNotes = boards.reduce((s, b) => s + b._count.notes, 0);

  return (
    <div className="cork-board min-h-screen flex flex-col">
      <DevCronPoller />

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="px-5 pt-5 pb-2 shrink-0">
        <div
          className="rounded-2xl px-6 py-4 flex items-center gap-4"
          style={{
            background:  "rgba(255,255,255,0.96)",
            boxShadow:   "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          {/* Title */}
          <span className="text-4xl shrink-0 leading-none">📌</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-handwriting text-5xl font-extrabold text-gray-900 leading-none">
              My Whiteboard
            </h1>
            <p className="font-handwriting text-xl font-semibold text-gray-400 mt-1 leading-none">
              {format(new Date(), "EEEE")}
              &nbsp;&nbsp;·&nbsp;&nbsp;
              {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 px-4">
            <div className="text-center">
              <p className="font-handwriting text-4xl font-extrabold leading-none" style={{ color: "#7c3aed" }}>
                {boards.length}
              </p>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mt-0.5">
                Boards
              </p>
            </div>
            <div className="text-center">
              <p className="font-handwriting text-4xl font-extrabold leading-none" style={{ color: "#16a34a" }}>
                {totalNotes}
              </p>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mt-0.5">
                Notes
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-gray-200 shrink-0" />
          <div className="hidden sm:block shrink-0">
            <NotificationButton />
          </div>
        </div>
      </header>

      {/* ── Board list ──────────────────────────────────────── */}
      <BoardList initialBoards={boards} />
    </div>
  );
}
