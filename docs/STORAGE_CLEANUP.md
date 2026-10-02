# Storage Cleanup Worker

Permanent deletion of manual property drafts and developer projects writes an audit event and a storage cleanup job in the same database transaction. S3 deletion runs immediately after commit when possible; failures remain in the outbox and use exponential retry backoff. Object deletion is idempotent, and expired worker leases are reclaimed after five minutes.

## Deployment

Apply the `storage_cleanup_jobs` migration before enabling permanent-delete operations. The production `npm start` script runs `prisma migrate deploy` before starting Next.js.

Configure the hosting provider's scheduler to call this endpoint at least every five minutes:

```http
GET /api/system/storage-cleanup
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` as a server-side environment variable in both the application and scheduler. Never expose it to browser code. Administrators may also invoke the endpoint from an authenticated session.

The JSON response reports how many jobs completed and remain pending. Pending jobs are retried automatically by later scheduled calls; inspect `storage_cleanup_jobs.last_error`, `attempts`, and `available_at` when troubleshooting repeated failures.
