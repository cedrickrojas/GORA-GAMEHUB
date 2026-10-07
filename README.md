# GORA

**Find your game. Find your people. GORA!**

A working, mobile-first sports social application built with Ionic 8 + Angular 20, an Express REST API, TypeScript, and PostgreSQL. The dark charcoal interface uses an athletic wordmark, orange accents, responsive event cards, desktop sidebar, and mobile bottom navigation.

## Quick start

Requires Node.js **22.12+** and npm. From the project directory:

```sh
npm install
cp .env.example .env
npm run dev
```

On PowerShell use `Copy-Item .env.example .env` and `npm.cmd` if script execution is restricted.

Open **http://127.0.0.1:4200**. The API runs at **http://127.0.0.1:3000**. Create an account or sign in with your registered email and password. The login screen has no demo sign-in button. No demo credentials are embedded in the source. Optionally set `DEMO_PASSWORD` before the first seed to choose a password for the development sample account, `alexreyes@gora.example`. Browser tests authenticate that sample account through the development-only `/api/auth/demo` endpoint.

When `DATABASE_URL` is empty in development, the backend runs a **real embedded PostgreSQL engine using PGlite**, persisted under `.data/gora`. This is a single-process development convenience, not the production database. Startup applies migrations and seeds development data once. A random development JWT key persists in `.data/dev-jwt-secret`; keep `.data` private. Do not run two API processes against the same embedded data directory.

## PostgreSQL setup

For pgAdmin, select your existing `gora` database, open Query Tool, load
[`database/gora_setup.sql`](database/gora_setup.sql), and execute the entire file
with **F5**. It installs the complete app schema, constraints, indexes, timestamp
triggers, migration history, and 13 sports in one transaction. Repeat runs keep
existing records. This is for an empty database or one already managed by GORA's
migration runner; it does not import the current embedded database's data.
Refresh **Schemas > public > Tables** afterward. Configure `DATABASE_URL` below
and restart the API so the application uses this PostgreSQL server.
For development sample people, events, and chats, run `npm run db:seed` after
setting that connection string. Regenerate the combined SQL after adding
migrations with `node scripts/export-sql.mjs`.

Install PostgreSQL 16+ or use the supplied Docker Compose configuration. Use your own database credentials:

```sh
# Copy the example environment first, then set POSTGRES_PASSWORD in .env.
docker compose up -d postgres
```

Set these local environment variables:

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/gora
JWT_SECRET=YOUR_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
PORT=3000
```

For a local Compose database, use `gora` as the database and username, with your chosen `POSTGRES_PASSWORD`. URL-encode special characters in the password. Generate a JWT secret with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run db:migrate
npm run db:sports
npm run db:seed
npm run dev
```

Migrations are versioned and transactional. Production startup requires both `DATABASE_URL` and a JWT secret of at least 32 characters. The database connection honors the SSL configuration in your connection string; certificate verification is never disabled by the application.

## Running separately and building

```sh
npm run dev:server  # Express + TypeScript watch
npm run dev:app     # Ionic Angular dev server + /api proxy
npm run build      # Angular production assets + backend compilation
npm start          # API and built frontend at http://127.0.0.1:3000
```

The server binds to loopback by default. Put a TLS reverse proxy in front of it for production. Set `APP_URL` to the HTTPS application URL and include allowed browser origins in the comma-separated `CORS_ORIGIN`. For a same-origin deployment use the deployed application URL for both. The frontend calls `/api` and requires no database secrets or client-side JWT storage.

Set `NODE_ENV=production` in production. It disables demo login, demo seeds, embedded databases, generated JWT secrets, and password-reset link previews. Secure cookies require HTTPS. Run `npm run db:migrate` during deployment; provision sports through the admin panel or import the baseline sports SQL below. Production never installs sample people or games automatically.

## Features

- Public landing page at `/`: sports hero, how GORA works, live upcoming games from the API, sport discovery links, and sign-up/sign-in actions. The app dashboard remains at `/tabs/home`.
- Authentication: validated registration, bcrypt passwords, seven-day JWT sessions in HttpOnly cookies, login/logout, profile settings, password recovery via SMTP, expiring single-use reset tokens, and protected routes.
- Home and discovery: sport categories, active game counts, search including “Basketball near Manila”, game-type/location/date filters, nearby development data, recommended games, and community discovery.
- Global search: submit the home search with Enter or the search icon to open `/search?q=...`, with All/People/Games/Sports categories. Results come from the API and update as you type; people cards offer follow/unfollow, direct messaging, and profile viewing, while game cards open details or join the game. Queries survive refresh and browser navigation.
- People: sport, name, username (including `@username`), event, city, date/time, age, team, distance, available-seat, and group-size filters, with follow and message actions on discovery cards. Set profile coordinates for distance filtering. Match percentages are computed from shared sports and location; they are not a compatibility prediction.
- Events: create/edit/cancel, public/friends/private visibility, capacity limits, host participant removal and private approvals, join/leave, invitations, participant roster, maps, link sharing, and group chat.
- Calendar: today/week/month views with game markers, period and day selection, upcoming/joined/created/past/cancelled lists. Philippine time is displayed throughout.
- Messaging: persistent direct and event chats, membership authorization, unread indicators, message timestamps, and five-second foreground polling. The view displays the latest 100 messages; REST supports cursor pagination with `before`.
- Connections: follow/unfollow, friend requests, accept/reject/remove, and followers/following/friends lists.
- Communities: browse, view members, join, and leave.
- Notifications: invitations, joins/leaves, event changes/cancellation, new messages, requests, followers, announcements, and automatic reminders for events in the next 24 hours. Reminder polling runs while the API process is running.
- Admin: statistics, users, suspend/ban/restore, event deletion, sports create/edit, reports, message removal, announcements, and persisted community settings.
- UX: skeletons, empty/error states, validation, confirmation dialogs, accessible labels, reduced-motion support, responsive touch controls, and Ionic toasts/modals.

## Admin access

Fresh development databases default to a normal user demo account.

For a fresh development database only, set `SEED_ADMIN=true` before startup to make the demo account an administrator. It defaults to false.

For an existing database, register the account first and grant the role from a trusted terminal:

```sh
# Set ADMIN_EMAIL in your local environment (never sent to the frontend).
npm run db:admin
```

This command updates only an existing active account matching the specified email. Administrators go directly to `/admin` after signing in. They use a dedicated dashboard with administration tabs, Edit profile, and Sign out; other application URLs redirect them back to `/admin`. Edit profile saves their name, bio, optional location, and uploaded photo in a dashboard dialog. Administrators do not need favorite sports to save their profile. Regular users keep the sports app navigation. There is no public role-promotion endpoint.

## Password recovery

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Port 465 uses implicit TLS; other ports use the transport's STARTTLS capability. Reset links use `APP_URL`. In local development without SMTP, the forgot-password screen provides an email-preview reset link. Production must configure SMTP to deliver recovery messages.

## Security and data

All SQL uses parameterized values. UUIDs, enums, field lengths, dates, coordinates, and capacities are validated with Zod and PostgreSQL constraints. Event row locks and transactions prevent overbooking. Requests from unapproved browser origins are rejected for mutations. CORS is restricted, Helmet applies browser headers, JSON bodies are capped, and API/auth routes are rate limited. Production allows 240 API requests per minute per IP; development allows 1,200 to accommodate hot reloads and browser tests. Sensitive auth actions allow 60 attempts per 15 minutes; ordinary session checks do not consume that allowance. Suspended/banned users cannot authenticate. Logout and password reset revoke all existing tokens via `token_version`.

Foreign keys, uniqueness, indexes, and update timestamps cover users/profiles, sports, events, venues, participants, invitations, friendships, followers, conversations/members/messages, notifications, reports, communities, reset tokens, and system settings. Host ownership and chat membership are checked server-side. The app renders message bodies as text, never HTML.

Deployment work still required for an operational production service includes configured PostgreSQL and SMTP, HTTPS, backups, monitoring, migration coordination across replicas, and a dedicated reminder worker if reminders must run independently of the API. Chat uses REST polling, not WebSockets or push notifications. Offline/native push delivery is not implemented. The frontend maps known Unsplash sample URLs to bundled local photographs, so the development interface does not depend on external image requests. This repository is a tested application foundation, not a claim of completed production deployment or independent security audit.

Profile photos can be selected directly from a phone or computer in **Profile > Edit profile**. JPG, PNG, and WebP images up to 5 MB (24 megapixels) are validated, re-encoded as 512×512 WebP without metadata, and saved together with profile details. The PostgreSQL `profiles.avatar_url` column stores the relative image URL; image files are stored in `UPLOAD_DIR` (default `.data/uploads`). Replacement/removal cleans up the previous uploaded file. Include this directory in backups and use a persistent writable volume in deployment; multiple API instances must share it. Serve `/api/uploads/avatars` through the same origin as the app and allow multipart requests of at least 6 MB through any reverse proxy. Files are excluded from Git when using the default directory. No SQL migration is required.

## Tests

```sh
npm test
npm run build
npm start
npm run test:e2e
```

API tests use an isolated in-memory PGlite PostgreSQL engine. They verify password validation/hashing, JWT revocation, mutation authorization, private visibility/approval, chat access, concurrent capacity enforcement, SQL-injection resistance, friend uniqueness, profile permissions, reminders/notifications, and moderation. Browser tests use the running seeded development service on port 3000 and exercise discovery → join → chat → schedule → profile → invite, host creation/edit/cancellation, profile saving, and the sports catalogue at desktop and phone sizes. Admin browser checks run when the demo account has an administrator role. Set `E2E_URL` to use the dev server instead.

If Playwright's browser is not installed, run `npx playwright install chromium`.

## Project layout

```text
src/app/
  core/          Angular route definitions
  shared/        Icon registration and shared UI
  components/    Event/user/profile cards, calendar, messages, dialogs, states
  services/      API/session and Ionic UI services
  guards/        Authentication and admin route guards
  models/        Shared frontend types
  pages/         Home, discover, people, schedule, events, auth, profiles,
                 messaging, communities, notifications, admin
server/src/
  config/        Environment validation
  database/      PostgreSQL driver, migration runner, development seed, CLI
  controllers/   Auth, events, social, messaging, admin REST handlers
  middleware/    JWT identity and authorization
  models/        Reusable query projections
  routes/        Modular REST registration
  services/      Notifications and reminders
  utils/         Validation, async handling, safe errors
database/
  migrations/    Normalized PostgreSQL schema
  seeds/         Seed documentation and production sport categories
server/tests/    Isolated database/API integration tests
e2e/            Mobile and desktop browser workflow tests
```

See [API.md](API.md) for the endpoint reference. Framework configuration follows [Ionic standalone Angular guidance](https://ionicframework.com/docs/developing/config); the development database follows [PGlite's Node filesystem documentation](https://pglite.dev/docs/filesystems).
