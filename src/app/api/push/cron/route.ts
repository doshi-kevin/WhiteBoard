import { NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/db";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Window: fire reminders that are between 5 min ago and 1 min in the future
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 60 * 1000);

  const notes = await prisma.note.findMany({
    where: {
      reminderSent: false,
      done: false,
      reminderAt: { gte: windowStart, lte: windowEnd },
    },
  });

  if (notes.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, checked: 0 });
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  let sent = 0, failed = 0;

  for (const note of notes) {
    const dueLabel = note.dueDate
      ? new Date(note.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : null;

    const payload = JSON.stringify({
      title: `📌 ${note.title}`,
      body: dueLabel
        ? `Due ${dueLabel}${note.content ? " · " + note.content.slice(0, 60) : ""}`
        : note.content?.slice(0, 100) || "You have a reminder!",
      tag: `note-${note.id}`,
      url: "/",
    });

    const staleIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleIds.push(sub.id);
      }
    }

    // Remove expired subscriptions
    if (staleIds.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    }

    // Mark reminder as sent even if no subscriptions — avoids infinite retries
    await prisma.note.update({ where: { id: note.id }, data: { reminderSent: true } });
  }

  return NextResponse.json({ sent, failed, checked: notes.length });
}
