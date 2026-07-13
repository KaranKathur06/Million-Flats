const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
console.log('keys', Object.keys(p).filter(k => /ingest|job/i.test(k)).sort());
console.log('has dataIngestionJob', Object.prototype.hasOwnProperty.call(p, 'dataIngestionJob'));
console.log('has DataIngestionJob', Object.prototype.hasOwnProperty.call(p, 'DataIngestionJob'));
p.$disconnect();
