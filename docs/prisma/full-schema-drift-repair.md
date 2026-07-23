# Full Schema Drift Repair Runbook

The AI compatibility migration is complete. Remaining `verify-schema:full` failures represent broader drift between production and `schema.prisma`.

Do not repair the remaining drift by editing historical migrations or running `prisma db push`.

## Step 1: Deploy Verifier Parser Fix

Pull the latest repository changes first. The verifier strips inline comments before parsing models; without this fix, mapped tables can be reported incorrectly.

```bash
git pull
npm install
npx prisma generate
```

## Step 2: Confirm Startup-Critical Schema

```bash
npm run verify-schema
```

This runs the startup profile only. It should not include every dormant or future AI table.

## Step 3: Generate Full Drift Report

```bash
npm run verify-schema:full > /tmp/millionflats-schema-full.json
```

This file is the audit report, not a startup gate.

## Step 4: Generate Prisma Diff SQL

Generate the SQL that would align production with `schema.prisma`.

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/millionflats-prod-drift.sql
```

Do not apply this file directly.

## Step 5: Review And Split

Classify every generated statement:

- Runtime-critical tables: auth, onboarding, dashboards, projects, leads, payments.
- Active AI tables: Verix/AIShield endpoints currently called in production.
- Dormant/future AI tables: schema exists, but no production route writes to it yet.
- Warnings: indexes/defaults/FKs that improve integrity but are not launch blockers.

## Step 6: Create Forward-Only Repair Migration

Only after review, create a new migration folder:

```text
prisma/migrations/YYYYMMDDHHMMSS_schema_drift_repair/
  migration.sql
```

Rules:

- Use `CREATE TABLE IF NOT EXISTS`.
- Use `CREATE INDEX IF NOT EXISTS`.
- Use `ALTER TABLE IF EXISTS`.
- Guard enum creation with `DO $$ BEGIN IF NOT EXISTS ... END $$`.
- Never drop existing columns/tables.
- Never rename production objects destructively.
- Backfill data before adding `NOT NULL` constraints.

## Step 7: Deploy

```bash
npx prisma validate --schema prisma/schema.prisma
npx prisma generate
npx prisma migrate deploy --schema prisma/schema.prisma
npm run verify-schema
npm run verify-schema:full
```

Startup can proceed if `npm run verify-schema` passes. Full drift should trend toward zero over multiple reviewed repair migrations.
