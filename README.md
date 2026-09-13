# ReachInbox Email Scheduler — README

## 1. How to Run the Backend (Express, Redis, DB, BullMQ Worker)

**Prerequisites:** Node.js 20+, Docker, Docker Compose.

**Step 1 — Start infrastructure (PostgreSQL, Redis, Elasticsearch):**

```bash
docker compose up -d
```

**Step 2 — Install and configure the backend:**

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env` (see section 3 below for what each variable means).

**Step 3 — Create database tables:**

```bash
npx prisma migrate dev
```

**Step 4 — Start the API server:**

```bash
npm run dev
```

Runs at `http://localhost:5000`.

**Step 5 — Start the BullMQ worker (in a separate terminal):**

```bash
cd backend
npm run worker
```

The API server and the worker are **two independent processes**. The server
handles HTTP requests (login, scheduling, listing, search). The worker is
the only process that actually sends emails — it watches Redis and fires
each job when its scheduled time arrives. Both must be running for the app
to fully work; if only the server runs, emails will stay stuck as
"scheduled" and never send.

Bull Board (live queue dashboard) is available at:

```
http://localhost:5000/admin/queues
```

(basic auth, default `admin` / `admin`, override via `ADMIN_USERNAME` /
`ADMIN_PASSWORD` in `.env`)

---

## 2. How to Run the Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:5173`.

`frontend/.env` only needs one variable:

```
VITE_API_URL=http://localhost:5000
```

This must point at wherever the backend is running.

---

## 3. Ethereal Email Setup & Environment Variables

### Ethereal Email

Ethereal is a fake SMTP service used for testing — nothing is delivered to
real inboxes. No account setup is required: leave `ETHEREAL_USER` and
`ETHEREAL_PASS` blank in `.env`, and the backend automatically calls
`nodemailer.createTestAccount()` on startup to generate a fresh test inbox.

If you want a stable inbox across restarts instead of a new one each time,
create one manually at https://ethereal.email and put the credentials in
`.env`.

Every sent email gets a **preview URL** (via
`nodemailer.getTestMessageUrl()`), stored on the email record and shown as
a "View Ethereal Email" link on the Sent Emails page.

### Backend Environment Variables (`backend/.env`)

| Variable                                    | Meaning                                                               |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `PORT`                                      | Port the Express API listens on                                       |
| `DATABASE_URL`                              | PostgreSQL connection string                                          |
| `REDIS_URL`                                 | Redis connection string (used by BullMQ + rate limiting)              |
| `ELASTICSEARCH_URL`                         | Elasticsearch base URL                                                |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials                                              |
| `GOOGLE_CALLBACK_URL`                       | Must match the redirect URI registered in Google Cloud Console        |
| `SESSION_SECRET`                            | Random string used to sign login JWTs                                 |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`   | Slack app credentials                                                 |
| `SLACK_REDIRECT_URI`                        | Must match the redirect URL registered in the Slack app               |
| `WORKER_CONCURRENCY`                        | How many email jobs the worker processes in parallel                  |
| `MIN_DELAY_BETWEEN_EMAILS`                  | Default minimum ms between sends per sender (overridable per request) |
| `MAX_EMAILS_PER_HOUR`                       | Default hourly cap per sender (overridable per request)               |
| `ETHEREAL_USER` / `ETHEREAL_PASS`           | Optional — leave blank to auto-create a test inbox                    |
| `FRONTEND_URL`                              | Used for CORS and OAuth redirects                                     |

### Frontend Environment Variables (`frontend/.env`)

| Variable       | Meaning                     |
| -------------- | --------------------------- |
| `VITE_API_URL` | Base URL of the backend API |

---

## 4. Architecture Overview

### How Scheduling Works

- When you schedule a batch, the backend creates one `Email` row in
  PostgreSQL **per recipient**, each with its own `scheduledAt` time
  (recipients are staggered using the "delay between emails" setting).
- For each email, it also creates a **BullMQ delayed job** in Redis:
  ```ts
  queue.add("send-email", { emailId }, { delay, jobId: `email-<id>` });
  ```
  where `delay = scheduledAt - now`.
- No cron jobs and no polling loops are used anywhere. BullMQ + Redis are
  entirely responsible for waking the worker up at the right time.
- The job ID (`email-<database-id>`) is deterministic, which is also what
  makes the system idempotent — scheduling the same email twice results in
  BullMQ ignoring the duplicate.

### How Persistence on Restart Is Handled

- BullMQ jobs live in **Redis**, not in the Node process's memory. Stopping
  and restarting the API server or the worker does not affect jobs already
  sitting in Redis — they keep their delay and fire at the correct time
  regardless of whether any Node process was alive in between.
- PostgreSQL is the **source of truth for email content and status**; Redis
  is the **source of truth for timing**. They are deliberately kept
  separate: on startup, the backend never re-creates jobs from the
  database, which avoids duplicating or losing jobs after a restart.
- Example: an email scheduled 2 hours out survives a backend/worker restart
  10 minutes in — the job is still delayed in Redis with ~1h50m left, and
  fires on schedule once the worker reconnects.

### How Rate Limiting & Concurrency Are Implemented

**Rate limiting (Redis-backed, safe across multiple workers):**

- **Hourly limit per sender** — the worker atomically `INCR`s a Redis key
  shaped like `email-rate:<sender>:<hour-window>` before sending. `INCR` is
  atomic, so multiple worker processes can never double-count the same
  slot. The key auto-expires after ~65 minutes.
- **Minimum delay per sender** — a Redis key `email-last-sent:<sender>`
  stores the timestamp of the last send; the worker checks elapsed time
  against the configured minimum delay before sending again.
- **When a limit is hit** — the job is never failed or dropped. The worker
  calls `job.moveToDelayed()` to push the same job to the start of the next
  clock hour, preserving order as much as possible. If Slack is connected,
  one notification is sent per sender per hour (deduped via a Redis `NX`
  key) to avoid spamming on every blocked job.

**Concurrency:**

- Controlled by `WORKER_CONCURRENCY` (default `5`), passed directly into
  BullMQ's `Worker` options: `new Worker(queueName, processor, { concurrency })`.
- This determines how many jobs the worker processes in parallel — it does
  not bypass the rate limiter, which still throttles actual sends per
  sender regardless of how many jobs are being touched concurrently.
- Idempotency under concurrency is enforced at the database level: before
  sending, the worker runs `updateMany({ where: { status: "scheduled" },
data: { status: "processing" } })` as an atomic claim. If two workers
  race for the same email, only one succeeds in claiming it; the other
  sees zero rows updated and backs off.

---

## 5. Features Implemented

### Backend

| Feature                     | Implementation                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scheduler**               | BullMQ delayed jobs (`queue.add(..., { delay, jobId })`), no cron/polling                                                                             |
| **Persistence**             | Jobs stored in Redis, email records in PostgreSQL — both survive server/worker restarts independently of the Node process                             |
| **Rate limiting**           | Redis-backed hourly counter (atomic `INCR`) + minimum delay timer, both per sender; blocked jobs are rescheduled via `moveToDelayed()`, never dropped |
| **Concurrency**             | Configurable via `WORKER_CONCURRENCY`; safe under concurrency via atomic Prisma `updateMany` claims (idempotency)                                     |
| Google OAuth login          | Passport.js Google strategy, JWT issued as an httpOnly cookie                                                                                         |
| Slack OAuth + notifications | Real OAuth flow, real `chat.postMessage` calls, one notification per sender per hour                                                                  |
| Ethereal email delivery     | Nodemailer + Ethereal test SMTP, preview URL stored per email                                                                                         |
| Elasticsearch search        | Emails indexed on create/status-change; `GET /api/emails/search?q=`                                                                                   |
| Bull Board dashboard        | Live queue view at `/admin/queues`, basic-auth protected                                                                                              |
| Health check                | `GET /health` reports database/redis/elasticsearch status                                                                                             |

### Frontend

| Feature                    | Implementation                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Login**                  | Google OAuth button, redirects to backend, session persisted via cookie                                        |
| **Dashboard**              | Header with user info, Slack connect/disconnect, navigation between Scheduled/Sent                             |
| **Compose**                | Modal with subject, body, CSV/text upload (parsed client-side), start time, delay, hourly limit, sender        |
| **Scheduled Emails table** | Loading/empty/error states, search, refresh, live status badges                                                |
| **Sent Emails table**      | Same states as above, plus "View Ethereal Email" preview links                                                 |
| **CSV upload**             | Client-side parsing and validation, invalid/duplicate addresses filtered out, detected-count shown to the user |
| **Search**                 | Wired to backend Elasticsearch endpoint from both table pages                                                  |
