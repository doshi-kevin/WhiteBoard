import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { endpoint, p256dh, auth } = await req.json();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth },
    update: { p256dh, auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
