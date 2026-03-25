# 📌 My Whiteboard

A personal sticky-notes whiteboard app built with Next.js. Pin colorful notes to a cork-board canvas, connect them with labeled arrows, set due dates with reminders, and organise everything across multiple boards.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)

---

## Features

- **Multiple whiteboards** — create as many boards as you need; each has its own canvas
- **Draggable sticky notes** — six pastel colours, drag to reposition freely on the canvas
- **Note connections** — draw labeled bezier arrows between notes to show relationships
- **Priorities** — High / Medium / Low with coloured left-edge stripe per note
- **Due dates** — badges turn green → orange (≤ 2 days) → red + shake (overdue)
- **Reminders** — Web Push notifications sent at a preset offset before the due date (30 min, 1 hr, 2 hr, custom…)
- **Done toggle** — strike-through and desaturate completed notes
- **Mobile push** — service worker + VAPID + Vercel Cron dispatches notifications every minute

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma 5 |
| Push notifications | Web Push API + VAPID |
| Cron | Vercel Cron Jobs |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/doshi-kevin/WhiteBoard.git
cd WhiteBoard
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | `mailto:you@example.com` |
| `CRON_SECRET` | Random secret to protect the cron endpoint |
| `NEXT_PUBLIC_DEV_CRON_SECRET` | Same value — used to poll the cron locally |

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home — board list
│   ├── board/[id]/page.tsx       # Individual board canvas (server component)
│   ├── globals.css               # Cork-board background + animations
│   └── api/
│       ├── notes/                # GET all, POST, PATCH, DELETE
│       ├── boards/               # GET list, POST, PATCH, DELETE
│       ├── connections/          # POST, PATCH label, DELETE
│       └── push/                 # subscribe, cron dispatcher, test
├── components/
│   ├── BoardPage.tsx             # Canvas with drag, connect mode, state
│   ├── BoardHeader.tsx           # Slim header — back, name, connect toggle
│   ├── BoardList.tsx             # Home page board grid
│   ├── ConnectionLayer.tsx       # SVG bezier arrows with labels
│   ├── StickyNote.tsx            # Note card UI + done/delete/edit
│   ├── AddNoteModal.tsx          # Create / edit note form
│   └── NotificationButton.tsx   # Push subscription management
├── lib/
│   ├── db.ts                     # Prisma singleton + withRetry helper
│   ├── push.ts                   # Client-side push utilities
│   └── ensureDefaultBoard.ts    # Migration: assign orphaned notes to Main Board
prisma/
└── schema.prisma                 # Whiteboard, Note, Connection, PushSubscription
public/
└── sw.js                         # Service worker for push notifications
```

---

## Deploying to Vercel

1. Push to GitHub (already done)
2. Import the repo in [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.example` in **Settings → Environment Variables**
4. The `vercel.json` cron job (`* * * * *`) will run automatically on Vercel's infrastructure to dispatch reminders

---

## How to Use Connections

1. Open a board
2. Click **⇢ Connect** in the header
3. Click the **first note** — it gets a pulsing indigo ring
4. Click the **second note** — an arrow is drawn between them
5. Click the **label bubble** on any arrow to rename it
6. Click **anywhere on the line** to delete the connection
7. Press **Esc** to exit connect mode

---

## License

MIT
