import { NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/db";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST() {
  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    return NextResponse.json({ error: "No subscriptions found. Enable notifications first." }, { status: 400 });
  }

  const payload = JSON.stringify({
    title: "📌 Test Notification",
    body: "Whiteboard reminders are working on this device!",
    tag: "whiteboard-test",
    url: "/",
  });

  let sent = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) staleIds.push(sub.id);
    }
  }

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }

  return NextResponse.json({ sent });
}
