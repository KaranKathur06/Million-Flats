export type SchemaColumnExpectation = {
  model: string
  table: string
  field: string
  column: string
  type: string
  required: boolean
  hasDefault: boolean
  isId: boolean
  isUnique: boolean
}

export type SchemaIndexExpectation = {
  model: string
  table: string
  columns: string[]
  unique: boolean
  source: string
}

export type SchemaForeignKeyExpectation = {
  model: string
  table: string
  columns: string[]
  referencedModel: string
  referencedTable: string
  referencedColumns: string[]
}

export type SchemaEnumExpectation = {
  name: string
  values: string[]
}

export type SchemaExpectations = {
  tables: string[]
  columns: SchemaColumnExpectation[]
  indexes: SchemaIndexExpectation[]
  foreignKeys: SchemaForeignKeyExpectation[]
  enums: SchemaEnumExpectation[]
}

export type SchemaDriftIssue = {
  type:
    | 'missing_table'
    | 'missing_column'
    | 'nullability_mismatch'
    | 'default_mismatch'
    | 'missing_enum'
    | 'enum_value_mismatch'
    | 'missing_index'
    | 'missing_unique'
    | 'missing_primary_key'
    | 'missing_foreign_key'
    | 'catalog_query_failed'
  severity: 'error' | 'warning'
  message: string
  table?: string
  column?: string
  model?: string
  expected?: unknown
  actual?: unknown
}

export type SchemaCompatibilityReport = {
  ok: boolean
  checkedAt: string
  issueCount: number
  issues: SchemaDriftIssue[]
  coverage: {
    tables: number
    columns: number
    indexes: number
    foreignKeys: number
    enums: number
  }
}
