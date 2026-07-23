#!/usr/bin/env node

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
})
require('ts-node/register/transpile-only')

const { PrismaClient } = require('@prisma/client')
const { verifySchemaCompatibility } = require('../lib/schemaCompat/index.ts')

async function main() {
  const prisma = new PrismaClient()
  try {
    const report = await verifySchemaCompatibility(prisma)
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
