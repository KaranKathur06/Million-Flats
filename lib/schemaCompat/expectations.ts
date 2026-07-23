import fs from 'fs'
import path from 'path'
import type {
  SchemaColumnExpectation,
  SchemaEnumExpectation,
  SchemaExpectations,
  SchemaForeignKeyExpectation,
  SchemaIndexExpectation,
} from './types'

const SCALAR_TYPES = new Set([
  'String',
  'Boolean',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'DateTime',
  'Json',
  'Bytes',
])

function unwrapType(type: string) {
  return type.replace('?', '').replace('[]', '')
}

function readMap(line: string, fallback: string) {
  const match = line.match(/@map\("([^"]+)"\)/)
  return match?.[1] || fallback
}

function readBlockMap(block: string, fallback: string) {
  const match = block.match(/@@map\("([^"]+)"\)/)
  return match?.[1] || fallback
}

function readFieldList(input: string, fieldToColumn: Map<string, string>) {
  return input
    .split(',')
    .map((part) => part.trim().replace(/\(.+\)$/, ''))
    .filter(Boolean)
    .map((field) => fieldToColumn.get(field) || field)
}

function parseFieldLines(block: string) {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
}

function stripLineComments(schema: string) {
  return schema
    .split(/\r?\n/)
    .map((line) => {
      const commentIndex = line.indexOf('//')
      return commentIndex >= 0 ? line.slice(0, commentIndex) : line
    })
    .join('\n')
}

export function loadSchemaExpectations(schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')): SchemaExpectations {
  const schema = stripLineComments(fs.readFileSync(schemaPath, 'utf8'))
  const modelNames = new Set<string>()
  const enumNames = new Set<string>()
  const enums: SchemaEnumExpectation[] = []

  for (const match of schema.matchAll(/enum\s+(\w+)\s+\{([\s\S]*?)\}/g)) {
    const name = match[1]
    enumNames.add(name)
    const values = match[2]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean)
    enums.push({ name, values })
  }

  const modelBlocks = Array.from(schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\}/g))
  for (const match of modelBlocks) modelNames.add(match[1])

  const tables: string[] = []
  const columns: SchemaColumnExpectation[] = []
  const indexes: SchemaIndexExpectation[] = []
  const foreignKeys: SchemaForeignKeyExpectation[] = []
  const modelToTable = new Map<string, string>()
  const modelFieldColumns = new Map<string, Map<string, string>>()

  for (const match of modelBlocks) {
    const model = match[1]
    const block = match[2]
    const table = readBlockMap(block, model)
    tables.push(table)
    modelToTable.set(model, table)
  }

  for (const match of modelBlocks) {
    const model = match[1]
    const block = match[2]
    const table = modelToTable.get(model) || model
    const fieldToColumn = new Map<string, string>()

    for (const line of parseFieldLines(block)) {
      const parts = line.split(/\s+/)
      const field = parts[0]
      const type = parts[1]
      if (!field || !type) continue

      const baseType = unwrapType(type)
      if (type.includes('[]')) continue
      if (modelNames.has(baseType) && !SCALAR_TYPES.has(baseType) && !enumNames.has(baseType)) continue
      if (!SCALAR_TYPES.has(baseType) && !enumNames.has(baseType)) continue

      const column = readMap(line, field)
      fieldToColumn.set(field, column)
    }

    modelFieldColumns.set(model, fieldToColumn)

    for (const line of parseFieldLines(block)) {
      const parts = line.split(/\s+/)
      const field = parts[0]
      const type = parts[1]
      if (!field || !type) continue

      const baseType = unwrapType(type)
      if (type.includes('[]')) continue
      if (modelNames.has(baseType) && !SCALAR_TYPES.has(baseType) && !enumNames.has(baseType)) {
        const relation = line.match(/@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*references:\s*\[([^\]]+)\]/)
        if (relation) {
          const referencedTable = modelToTable.get(baseType) || baseType
          const referencedFieldColumns = modelFieldColumns.get(baseType) || new Map<string, string>()
          foreignKeys.push({
            model,
            table,
            columns: readFieldList(relation[1], fieldToColumn),
            referencedModel: baseType,
            referencedTable,
            referencedColumns: readFieldList(relation[2], referencedFieldColumns),
          })
        }
        continue
      }
      if (!SCALAR_TYPES.has(baseType) && !enumNames.has(baseType)) continue

      const column = readMap(line, field)
      const isId = line.includes('@id')
      const isUnique = line.includes('@unique')
      const expectation: SchemaColumnExpectation = {
        model,
        table,
        field,
        column,
        type: baseType,
        required: !type.endsWith('?'),
        hasDefault: line.includes('@default(') || line.includes('@updatedAt'),
        isId,
        isUnique,
      }
      columns.push(expectation)

      if (isId) indexes.push({ model, table, columns: [column], unique: true, source: `${model}.${field} @id` })
      if (isUnique) indexes.push({ model, table, columns: [column], unique: true, source: `${model}.${field} @unique` })
    }

    for (const idx of block.matchAll(/@@(index|unique)\(\[([^\]]+)\]/g)) {
      indexes.push({
        model,
        table,
        columns: readFieldList(idx[2], fieldToColumn),
        unique: idx[1] === 'unique',
        source: `${model}.@@${idx[1]}`,
      })
    }
  }

  return {
    tables: Array.from(new Set(tables)),
    columns,
    indexes,
    foreignKeys,
    enums,
  }
}
