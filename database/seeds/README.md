The parameterized development seeder is in `server/src/database/seed.ts`.
Run `npm run db:seed`. It is transactional and skips an existing demo account.
Dates are relative to the seed day, so the discovery feed contains upcoming games.
It creates 13 sports, 12 users, 9 games, participants, venue records, group and direct chats, communities, connections, and notifications.
Passwords use bcrypt with 12 rounds; set DEMO_PASSWORD in your local environment to choose a development login password. Otherwise a random password is used and the development-only demo endpoint allows access.
This seed is deliberately disabled in production.
