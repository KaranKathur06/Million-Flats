# Universal Import Deployment

The universal import schema is database-backed. Deploy the application migrations before restarting the production process.

From the production application directory:

```bash
cd /var/www/millionflats
npx prisma migrate deploy
pm2 restart millionflats --update-env
```

Verify the migration history before restarting if needed:

```bash
npx prisma migrate status
```

The application `start` script also runs `prisma migrate deploy` before schema verification, so fresh starts apply pending migrations automatically. Do not use `prisma db push` in production.

The import foundation migration creates `import_batches` and related staging tables. Follow-up migrations add entity types, category metadata, and commit provenance.

If Prisma reports `The column entityType does not exist` while `prisma migrate deploy` reports no pending migrations, regenerate Prisma Client after deploying the latest schema. The physical migration column is `entity_type`; the Prisma model must map it with `@map("entity_type")`. This is schema-client drift, not a missing migration.
