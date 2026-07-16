import re
from pathlib import Path

root = Path(r"c:/FREELANCING/MILLIONFLATS")
prisma = root / "prisma"
schema_text = (prisma / "schema.prisma").read_text(encoding="utf-8")

# Extract model text helper
def extract_model(name: str, text: str):
    pattern = re.compile(rf"model {re.escape(name)} \{{(.*?)\n\}}", re.S)
    m = pattern.search(text)
    return m.group(1) if m else None

# Parse fields from model

enum_names = set(re.findall(r'^enum\s+(\w+)\s+\{', schema_text, re.M))
scalar_types = {'String', 'Boolean', 'Int', 'Float', 'DateTime', 'Json'} | enum_names

def parse_fields(model_body: str):
    fields = []
    for line in model_body.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        if line.startswith("@@"):
            continue
        if line.startswith("@relation"):
            continue
        parts = line.split()
        if not parts:
            continue
        field_name = parts[0]
        if field_name.startswith("//"):
            continue
        field_type = parts[1] if len(parts) > 1 else ''
        field_type = field_type.rstrip('?')
        if field_type.endswith('[]'):
            continue
        if field_type not in scalar_types:
            continue
        fields.append(line)
    return fields

# Find mapped column name

def get_column_name(field_line: str):
    m = re.search(r'@map\("([A-Za-z0-9_]+)"\)', field_line)
    if m:
        return m.group(1)
    m = re.match(r"([A-Za-z0-9_]+)\s+", field_line)
    return m.group(1) if m else None

migrations = []
for p in sorted(prisma.glob('migrations/*/migration.sql')):
    migrations.append((p, p.read_text(encoding='utf-8').lower()))

all_migration_text = '\n'.join(text for _, text in migrations)

user_body = extract_model('User', schema_text)
if not user_body:
    raise SystemExit('User model not found')

fields = parse_fields(user_body)
field_mappings = [(get_column_name(line), line) for line in fields]

missing_columns = []
for col, line in field_mappings:
    if col is None:
        continue
    if re.search(rf"\b{re.escape(col.lower())}\b", all_migration_text):
        continue
    missing_columns.append((col, line))

print('--- User model fields missing in migrations ---')
for col, line in missing_columns:
    print(col)

print('\n--- User-related models in schema ---')
models = ['Account', 'Session', 'VerificationToken', 'EmailVerificationToken', 'PasswordResetToken', 'LoginOtp', 'UserPreference']
missing_models = []
for model in models:
    body = extract_model(model, schema_text)
    if not body:
        continue
    mapped = re.search(r'@@map\("([A-Za-z0-9_]+)"\)', body)
    table_name = mapped.group(1) if mapped else model.lower()
    if not re.search(rf"\bcreate table\b.*\b{re.escape(table_name)}\b|\balter table\b.*\b{re.escape(table_name)}\b", all_migration_text):
        missing_models.append((model, table_name))
print('\n'.join(f'{m} => {t}' for m,t in missing_models))
