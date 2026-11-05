# Local MySQL setup

The API and database scripts are for local development. The browser app still uses `localStorage`; these files prepare the MySQL schema and API foundation, but do not switch the app's screens to MySQL yet.

Do not use this unauthenticated local API with real patient information or expose it to a network. Production use requires authentication, role-based authorization, and a security/privacy review.

## Setup

1. Install and start MySQL Server locally.
2. Copy `.env.example` to `.env` and set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`. Do not commit `.env`.
3. Install project dependencies with `npm install`.
4. Create the tables with `npm run db:migrate`.
5. Optionally add the app's demo records with `npm run db:seed`. The seed command inserts missing records only; it does not overwrite existing rows.
6. In one terminal run `npm run dev:api`; in another run `npm run dev`.

The API listens on `127.0.0.1:3001`. `GET /api/health` reports database connectivity and `GET /api/clinic-data` returns the database records in the application's TypeScript data shape.
