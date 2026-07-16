import re
from pathlib import Path

root = Path(r"c:/FREELANCING/MILLIONFLATS")
prisma = root / "prisma"
schema_text = (prisma / "schema.prisma").read_text(encoding="utf-8")

# extract model body

def extract_model(name: str):
    pattern = re.compile(rf"model\s+{re.escape(name)}\s*\{{(.*?)\n\}}", re.S)
    m = pattern.search(schema_text)
    return m.group(1) if m else None

# parse field lines for scalar fields only

enum_names = set(re.findall(r'^enum\s+(\w+)\s+\{', schema_text, re.M))
scalar_types = {'String', 'Boolean', 'Int', 'Float', 'DateTime', 'Json'} | enum_names

def parse_fields(model_body: str):
    fields = []
    for line in model_body.splitlines():
        line = line.strip()
        if not line or line.startswith('//') or line.startswith('@@') or line.startswith('@relation'):
            continue
        parts = line.split()
        if not parts:
            continue
        field_name = parts[0]
        if field_name.startswith('//'):
            continue
        field_type = parts[1] if len(parts) > 1 else ''
        field_type = field_type.rstrip('?')
        if field_type.endswith('[]'):
            continue
        if field_type not in scalar_types:
            continue
        fields.append((field_name, line))
    return fields

# resolve column name

def get_column_name(line: str):
    m = re.search(r'@map\("([A-Za-z0-9_]+)"\)', line)
    if m:
        return m.group(1)
    m = re.match(r'([A-Za-z0-9_]+)\s+', line)
    return m.group(1) if m else None

migrations = list(sorted(prisma.glob('migrations/*/migration.sql')))
all_migration_text = '\n'.join(p.read_text(encoding='utf-8').lower() for p in migrations)

models = [
    'Agent', 'DeveloperProfile', 'AgencyProfile', 'Agency', 'Developer', 'Account', 'Session',
    'VerificationToken', 'EmailVerificationToken', 'PasswordResetToken', 'LoginOtp', 'UserPreference'
]

for model in models:
    body = extract_model(model)
    if not body:
        print(f'MODEL NOT FOUND: {model}')
        continue
    fields = parse_fields(body)
    missing = []
    for field_name, line in fields:
        col = get_column_name(line)
        if not col:
            continue
        if not re.search(rf'\b{re.escape(col.lower())}\b', all_migration_text):
            missing.append((field_name, col, line))
    print(f'\n=== {model} ({len(fields)} scalar fields) ===')
    if missing:
        print(f'MISSING {len(missing)}:')
        for field_name, col, line in missing:
            print(f'  {field_name} => {col}')
    else:
        print('  All scalar fields appear in migrations.')

# check table existence for selected model names and mapped table names
print('\n=== Missing tables ===')
for model in models:
    body = extract_model(model)
    if not body:
        continue
    m = re.search(r'@@map\("([A-Za-z0-9_]+)"\)', body)
    table_name = m.group(1) if m else model.lower()
    if not re.search(rf'\bcreate table\b.*\b{re.escape(table_name)}\b|\balter table\b.*\b{re.escape(table_name)}\b', all_migration_text):
        print(f'  {model} => {table_name}')
