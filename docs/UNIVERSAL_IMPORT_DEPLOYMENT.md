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

The import foundation migration creates `import_batches` and related staging tables. Follow-up migrations add entity types, category metadata, and commit provenance. The `entityType does not exist` error means the foundation migration has not been applied to the database used by the running process.
