#!/usr/bin/env node

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
})
require('ts-node/register/transpile-only')

const { PrismaClient } = require('@prisma/client')
const { verifySchemaCompatibility } = require('../lib/schemaCompat/index.ts')

const STARTUP_TABLES = new Set([
  'users',
  'accounts',
  'sessions',
  'verification_tokens',
  'email_verification_tokens',
  'password_reset_tokens',
  'login_otps',
  'user_preferences',
  'agents',
  'agent_subscriptions',
  'agent_metrics',
  'agent_documents',
  'agent_verifications',
  'agencies',
  'agency_profiles',
  'agency_documents',
  'developers',
  'developer_profiles',
  'developer_documents',
  'projects',
  'project_media',
  'project_leads',
  'leads',
  'manual_properties',
  'countries',
  'cities',
  'communities',
])

function readProfile() {
  const arg = process.argv.find((value) => value.startsWith('--profile='))
  const profile = arg ? arg.split('=')[1] : 'full'
  if (profile === 'startup') return 'startup'
  return 'full'
}

function filterStartupReport(report) {
  const issues = report.issues.filter((issue) => {
    if (issue.type === 'catalog_query_failed') return true
    if (issue.severity !== 'error') return false
    return issue.table ? STARTUP_TABLES.has(issue.table) : true
  })

  return {
    ...report,
    ok: issues.every((issue) => issue.severity !== 'error'),
    issueCount: issues.length,
    issues,
    profile: 'startup',
    fullIssueCount: report.issueCount,
  }
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const profile = readProfile()
    const fullReport = await verifySchemaCompatibility(prisma)
    const report = profile === 'startup'
      ? filterStartupReport(fullReport)
      : { ...fullReport, profile: 'full' }

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
