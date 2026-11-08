# Local MySQL setup

The MySQL schema and Express API support the authenticated patient workflows and selected clinic-management workflows. Some frontend areas, including anonymous guest tracking, dentist appointment management, and parts of the admin dashboard, still use browser `localStorage`. See the root [README](../README.md) for the implementation status and API overview.

This repository is configured for local development. Do not use it with real patient information or expose the development API to a network. Review deployment security, privacy, access controls, and operational requirements before considering any non-local use.

## Prerequisites

- A locally running MySQL server.
- Node.js compatible with the installed Vite 8 toolchain and npm.

## Setup

1. Install and start MySQL Server locally.
2. Copy `.env.example` to `.env` and set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`. Configure `APP_ORIGIN` and a private `SESSION_SECRET` for session authentication. Do not commit `.env` or share its secrets.
3. Install project dependencies from the repository root:

   ```bash
   npm install
   ```

4. Create or verify the base application tables:

   ```bash
   npm run db:migrate
   ```

5. Add authentication tables and account-link constraints:

   ```bash
   npm run db:migrate:auth
   ```

   The auth migration checks for duplicate and orphaned patient account references before adding constraints. It does not delete or automatically link existing patient records.

6. Optionally insert demo clinic records:

   ```bash
   npm run db:seed
   ```

   The seed script inserts missing clinic and demo records; it does not overwrite existing rows and does not create administrator or dentist user accounts.

7. Start the API and frontend in separate terminals:

   ```bash
   npm run dev:api
   ```

   ```bash
   npm run dev
   ```

The API defaults to `http://127.0.0.1:3001`; Vite serves the browser app at `http://127.0.0.1:3000` and proxies `/api` requests to that API. `GET /api/health` reports API/database health. `GET /api/public/clinic-data` returns public catalog data, while `GET /api/clinic-data` requires authentication and scopes its data by account role.
