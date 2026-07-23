import type { PrismaClient } from '@prisma/client'
import { loadSchemaExpectations } from './expectations'
import type { SchemaCompatibilityReport, SchemaDriftIssue } from './types'

type DbColumn = {
  table_name: string
  column_name: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
}

type DbIndex = {
  table_name: string
  index_name: string
  is_unique: boolean
  columns: string[]
}

type DbConstraint = {
  table_name: string
  constraint_name: string
  constraint_type: 'p' | 'u' | 'f' | 'c'
  columns: string[]
  foreign_table_name: string | null
  foreign_columns: string[] | null
}

type DbEnum = {
  enum_name: string
  values: string[]
}

function sameColumns(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export async function verifySchemaCompatibility(
  prisma: PrismaClient,
  options: { schemaPath?: string } = {},
): Promise<SchemaCompatibilityReport> {
  const expected = loadSchemaExpectations(options.schemaPath)
  const issues: SchemaDriftIssue[] = []
  const checkedAt = new Date().toISOString()

  try {
    const [dbColumns, dbIndexes, dbConstraints, dbEnums] = await Promise.all([
      prisma.$queryRawUnsafe<DbColumn[]>(`
        SELECT table_name, column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `),
      prisma.$queryRawUnsafe<DbIndex[]>(`
        SELECT
          t.relname AS table_name,
          i.relname AS index_name,
          ix.indisunique AS is_unique,
          array_agg(a.attname ORDER BY ord.ordinality)::text[] AS columns
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN unnest(ix.indkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ord.attnum
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.relname, i.relname, ix.indisunique
      `),
      prisma.$queryRawUnsafe<DbConstraint[]>(`
        SELECT
          c.conrelid::regclass::text AS table_name,
          c.conname AS constraint_name,
          c.contype AS constraint_type,
          COALESCE(array_agg(a.attname ORDER BY cols.ordinality) FILTER (WHERE a.attname IS NOT NULL), ARRAY[]::text[]) AS columns,
          CASE WHEN c.confrelid <> 0 THEN c.confrelid::regclass::text ELSE NULL END AS foreign_table_name,
          CASE
            WHEN c.confrelid <> 0 THEN COALESCE(array_agg(fa.attname ORDER BY fcols.ordinality) FILTER (WHERE fa.attname IS NOT NULL), ARRAY[]::text[])
            ELSE NULL
          END AS foreign_columns
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        LEFT JOIN unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ordinality) ON true
        LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = cols.attnum
        LEFT JOIN unnest(c.confkey) WITH ORDINALITY AS fcols(attnum, ordinality) ON fcols.ordinality = cols.ordinality
        LEFT JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = fcols.attnum
        WHERE n.nspname = 'public'
        GROUP BY c.conrelid, c.conname, c.contype, c.confrelid
      `),
      prisma.$queryRawUnsafe<DbEnum[]>(`
        SELECT t.typname AS enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] AS values
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
      `),
    ])

    const tableSet = new Set(dbColumns.map((column) => column.table_name))
    const columnMap = new Map(dbColumns.map((column) => [`${column.table_name}.${column.column_name}`, column]))
    const enumMap = new Map(dbEnums.map((dbEnum) => [dbEnum.enum_name, dbEnum.values]))

    for (const table of expected.tables) {
      if (!tableSet.has(table)) {
        issues.push({ type: 'missing_table', severity: 'error', message: `Missing table ${table}`, table })
      }
    }

    for (const column of expected.columns) {
      const actual = columnMap.get(`${column.table}.${column.column}`)
      if (!actual) {
        issues.push({
          type: 'missing_column',
          severity: 'error',
          message: `Missing column ${column.table}.${column.column} for ${column.model}.${column.field}`,
          table: column.table,
          column: column.column,
          model: column.model,
        })
        continue
      }

      if (column.required && actual.is_nullable === 'YES') {
        issues.push({
          type: 'nullability_mismatch',
          severity: 'error',
          message: `Column ${column.table}.${column.column} is nullable but Prisma requires it`,
          table: column.table,
          column: column.column,
          model: column.model,
          expected: 'NOT NULL',
          actual: 'NULL',
        })
      }

      if (column.hasDefault && !actual.column_default && !column.isId) {
        issues.push({
          type: 'default_mismatch',
          severity: 'warning',
          message: `Column ${column.table}.${column.column} has a Prisma default/update marker but no database default`,
          table: column.table,
          column: column.column,
          model: column.model,
        })
      }
    }

    for (const expectedEnum of expected.enums) {
      const actualValues = enumMap.get(expectedEnum.name)
      if (!actualValues) {
        issues.push({
          type: 'missing_enum',
          severity: 'error',
          message: `Missing enum ${expectedEnum.name}`,
          expected: expectedEnum.values,
        })
        continue
      }
      const missing = expectedEnum.values.filter((value) => !actualValues.includes(value))
      if (missing.length) {
        issues.push({
          type: 'enum_value_mismatch',
          severity: 'error',
          message: `Enum ${expectedEnum.name} is missing values: ${missing.join(', ')}`,
          expected: expectedEnum.values,
          actual: actualValues,
        })
      }
    }

    for (const index of expected.indexes) {
      const hasIndex = dbIndexes.some((actual) => {
        if (actual.table_name !== index.table) return false
        if (index.unique && !actual.is_unique) return false
        return sameColumns(actual.columns, index.columns)
      })
      if (!hasIndex) {
        issues.push({
          type: index.unique ? 'missing_unique' : 'missing_index',
          severity: index.unique ? 'error' : 'warning',
          message: `Missing ${index.unique ? 'unique constraint/index' : 'index'} on ${index.table}(${index.columns.join(', ')}) from ${index.source}`,
          table: index.table,
          model: index.model,
          expected: index.columns,
        })
      }
    }

    for (const fk of expected.foreignKeys) {
      const hasFk = dbConstraints.some((actual) => {
        if (actual.constraint_type !== 'f') return false
        if (actual.table_name !== fk.table) return false
        if (actual.foreign_table_name !== fk.referencedTable) return false
        return sameColumns(actual.columns, fk.columns) && sameColumns(actual.foreign_columns || [], fk.referencedColumns)
      })
      if (!hasFk) {
        issues.push({
          type: 'missing_foreign_key',
          severity: 'error',
          message: `Missing FK ${fk.table}(${fk.columns.join(', ')}) -> ${fk.referencedTable}(${fk.referencedColumns.join(', ')})`,
          table: fk.table,
          model: fk.model,
          expected: fk,
        })
      }
    }
  } catch (error) {
    issues.push({
      type: 'catalog_query_failed',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    checkedAt,
    issueCount: issues.length,
    issues,
    coverage: {
      tables: expected.tables.length,
      columns: expected.columns.length,
      indexes: expected.indexes.length,
      foreignKeys: expected.foreignKeys.length,
      enums: expected.enums.length,
    },
  }
}
