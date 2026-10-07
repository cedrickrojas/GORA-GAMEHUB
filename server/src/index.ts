import { app } from './app.js';
import { config } from './config/env.js';
import { migrate, closeDb } from './database/db.js';
import { seed } from './database/seed.js';
import { reminders } from './services/notifications.js';
await migrate();
if (config.seedDemo) await seed();
const server = app.listen(config.port, '127.0.0.1', () =>
  console.log(
    `GORA API ready at http://127.0.0.1:${config.port} (${config.databaseUrl ? 'PostgreSQL' : 'persistent embedded PostgreSQL'})`,
  ),
);
const timer = setInterval(() => reminders().catch(console.error), 60000);
timer.unref();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    clearInterval(timer);
    server.close(() => void closeDb().then(() => process.exit(0)));
  });
