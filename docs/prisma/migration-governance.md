# Prisma Migration Governance

MillionFlats treats deployed Prisma migrations as immutable production artifacts.

## Rules

1. Never edit `prisma/migrations/*` after deployment.
2. Repair migrations only move forward.
3. Historical migrations are archive records, not editable source.
4. Production fixes are always new migrations.
5. Do not apply manual database edits outside reviewed migrations.
6. Do not run `prisma db push` against production or staging.
7. Database columns use snake_case.
8. Prisma fields use camelCase and map to existing database columns with `@map()`.
9. Every compatibility migration must preserve existing data and avoid destructive drops.
10. CI and startup must run `npm run verify-schema` before serving traffic.

## Drift Classes

- Type A: Schema drift between `schema.prisma` and the database.
- Type B: Migration drift between migration SQL and the database.
- Type C: Runtime drift between Prisma Client, repositories, and APIs.
- Type D: Environment drift between local, staging, and production.

## Repair Migration Checklist

- Add missing columns with `ADD COLUMN IF NOT EXISTS`.
- Backfill canonical columns from legacy columns without dropping legacy data.
- Create indexes with `CREATE INDEX IF NOT EXISTS`.
- Add constraints only after checking existing data.
- Include validation queries in the deployment runbook.
- Include rollback SQL for operational emergency rollback.

## Rollout Sequence

1. Run `npx prisma validate`.
2. Run `npx prisma generate`.
3. Run `npm run verify-schema` against staging.
4. Deploy migration to staging.
5. Re-run `npm run verify-schema`.
6. Deploy application to staging.
7. Repeat the same sequence for production during a monitored release window.
