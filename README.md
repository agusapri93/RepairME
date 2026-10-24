# RepairME

Backend API built with [Bun](https://bun.sh), [ElysiaJS](https://elysiajs.com), PostgreSQL, and [DrizzleORM](https://orm.drizzle.team).

## Requirements

- Bun 1.x
- PostgreSQL (local install, or Docker via `docker-compose.yml`)

## Setup

```bash
bun install
cp .env.example .env        # then adjust DATABASE_URL if needed
docker compose up -d        # optional: start PostgreSQL in Docker
bun run db:migrate          # apply migrations
bun run dev                 # start dev server with watch mode
```

The server runs on `http://localhost:3000` by default.

## Scripts

| Script                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `bun run dev`         | Start the dev server with watch mode                 |
| `bun run start`       | Start the server                                     |
| `bun run typecheck`   | Type-check the project                               |
| `bun run db:generate` | Generate a migration from changes in `src/db/schema.ts` |
| `bun run db:migrate`  | Apply pending migrations to the database             |
| `bun run db:studio`   | Open Drizzle Studio                                  |

## Project Structure

```
src/
  index.ts              # entry point, starts the server
  app.ts                # Elysia app, registers modules
  config/env.ts         # environment variables
  db/
    index.ts            # Drizzle + PostgreSQL connection
    schema.ts           # table definitions
  modules/
    health/             # GET /health
    customers/          # sample CRUD for customers
drizzle/                # generated SQL migrations
```

## Endpoints

| Method | Path             | Description                         |
| ------ | ---------------- | ----------------------------------- |
| GET    | `/health`        | Server and database health check    |
| GET    | `/customers`     | List customers                      |
| GET    | `/customers/:id` | Get one customer                    |
| POST   | `/customers`     | Create a customer                   |
| PATCH  | `/customers/:id` | Update a customer                   |
| DELETE | `/customers/:id` | Delete a customer                   |

Example:

```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Budi","phone":"08123456789","email":"budi@example.com"}'
```

## Changing the Schema

1. Edit `src/db/schema.ts`.
2. Run `bun run db:generate` to create a new migration in `drizzle/`.
3. Run `bun run db:migrate` to apply it.
