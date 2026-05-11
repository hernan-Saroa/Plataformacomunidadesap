import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backendDir = path.join(root, 'backend');
const outputPath = path.join(root, 'docs', 'diccionario-datos-backend.md');
const merDir = path.join(root, 'docs', 'mer', '06-may-2026');

const SERVICE_MER_KEYS = {
  'academic-registration-service': ['academic_registration'],
  'academic-work-plan-service': ['academic_work_plan'],
  'audit-service': ['audit'],
  'auth-service': ['auth'],
  'certification-service': ['certification'],
  'internal-disciplinary-control-service': ['internal_disciplinary_control'],
  'internal-institutional-control-service': ['control_interno'],
  'legal-management-service': ['legal_management'],
};

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
]);

function walk(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, acc);
    } else if (predicate(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function discoverServices() {
  return fs
    .readdirSync(backendDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const servicePath = path.join(backendDir, entry.name);
      return {
        name: entry.name,
        path: servicePath,
        hasPackage: fs.existsSync(path.join(servicePath, 'package.json')),
      };
    })
    .filter((service) => service.hasPackage)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function discoverMerDiagrams() {
  if (!fs.existsSync(merDir)) return new Map();

  const diagrams = new Map();
  for (const filePath of walk(merDir, (candidate) => candidate.toLowerCase().endsWith('.png'))) {
    const key = path
      .basename(filePath, path.extname(filePath))
      .replace(/^esap_db\s*-\s*/i, '')
      .trim();
    diagrams.set(key, {
      key,
      file: path.relative(root, filePath),
      docPath: path.relative(path.dirname(outputPath), filePath),
    });
  }

  return diagrams;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function splitTopLevel(input) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (const char of input) {
    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if ('([{'.includes(char)) depth += 1;
    if (')]}'.includes(char)) depth -= 1;

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function getBalancedDecorator(lines, startIndex) {
  let text = lines[startIndex].trim();
  let index = startIndex;
  let balance = countParens(text);

  while (balance > 0 && index + 1 < lines.length) {
    index += 1;
    text += ` ${lines[index].trim()}`;
    balance += countParens(lines[index]);
  }

  return { text, endIndex: index };
}

function countParens(text) {
  let balance = 0;
  let quote = null;
  let escaped = false;
  for (const char of text) {
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') balance += 1;
    if (char === ')') balance -= 1;
  }
  return balance;
}

function parseDecorator(text) {
  const match = text.match(/^@([A-Za-z0-9_]+)(?:\(([\s\S]*)\))?/);
  return {
    name: match?.[1] ?? '',
    args: match?.[2]?.trim() ?? '',
    raw: text,
  };
}

function parseObjectLiteral(objectText) {
  const source = objectText.trim();
  if (!source.startsWith('{') || !source.endsWith('}')) return {};
  const body = source.slice(1, -1);
  const result = {};

  for (const part of splitTopLevel(body)) {
    const match = part.match(/^([A-Za-z0-9_]+)\s*:\s*([\s\S]+)$/);
    if (!match) continue;
    result[match[1]] = normalizeValue(match[2].trim());
  }

  return result;
}

function normalizeValue(value) {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^['"`]([\s\S]*?)['"`]$/);
  if (quoted) return quoted[1];
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return splitTopLevel(trimmed.slice(1, -1)).map(normalizeValue);
  }
  return trimmed.replace(/\s+/g, ' ');
}

function parseDecoratorOptions(args) {
  if (!args) return {};
  const parts = splitTopLevel(args);
  const first = parts[0] ?? '';
  const second = parts[1] ?? '';

  if (first.trim().startsWith('{')) {
    return parseObjectLiteral(first);
  }

  const options = {};
  if (/^['"`]/.test(first.trim())) {
    options.type = normalizeValue(first);
  }
  if (second.trim().startsWith('{')) {
    Object.assign(options, parseObjectLiteral(second));
  }
  return options;
}

function parseEntityDecorator(decorator, className) {
  const args = decorator?.args ?? '';
  const parts = splitTopLevel(args);
  let table = className;
  let schema = 'default';

  if (parts[0]?.trim().startsWith('{')) {
    const options = parseObjectLiteral(parts[0]);
    table = options.name ?? table;
    schema = options.schema ?? schema;
  } else if (parts[0]) {
    table = normalizeValue(parts[0]) ?? table;
    if (parts[1]?.trim().startsWith('{')) {
      const options = parseObjectLiteral(parts[1]);
      schema = options.schema ?? schema;
      table = options.name ?? table;
    }
  }

  return { table, schema };
}

function inferType(tsType, options, decoratorName) {
  if (decoratorName === 'CreateDateColumn' || decoratorName === 'UpdateDateColumn' || decoratorName === 'DeleteDateColumn') {
    return options.type ?? 'timestamp';
  }

  if (decoratorName === 'PrimaryGeneratedColumn') {
    if (options.type) return `${options.type} generated`;
    return 'integer generated';
  }

  if (decoratorName === 'PrimaryColumn') {
    return options.type ?? mapTsType(tsType);
  }

  const type = options.type ?? mapTsType(tsType);
  const details = [];
  if (options.length) details.push(`length ${options.length}`);
  if (options.precision !== undefined) details.push(`precision ${options.precision}`);
  if (options.scale !== undefined) details.push(`scale ${options.scale}`);
  if (options.array === true) details.push('array');
  if (options.enum) details.push(`enum ${formatValue(options.enum)}`);
  return details.length ? `${type} (${details.join(', ')})` : type;
}

function mapTsType(tsType) {
  const clean = String(tsType ?? '').replace(/\s*\|\s*null/g, '').trim();
  if (clean === 'string') return 'varchar';
  if (clean === 'number') return 'integer';
  if (clean === 'boolean') return 'boolean';
  if (clean === 'Date') return 'timestamp';
  if (clean.endsWith('[]')) return 'array';
  if (!clean || clean === 'any') return 'not inferred';
  return clean;
}

function parseRelationTarget(args) {
  const arrowMatch = args.match(/\(\)\s*=>\s*([A-Za-z0-9_]+)/);
  if (arrowMatch) return arrowMatch[1];
  const stringMatch = args.match(/^['"`]([A-Za-z0-9_]+)['"`]/);
  return stringMatch?.[1] ?? '';
}

function parseProperty(line) {
  return line.match(/^(?:public\s+|private\s+|protected\s+|readonly\s+)*([A-Za-z0-9_]+)\??\s*:\s*([^;=]+)[;=]?/);
}

function propertyColumnName(propertyName, options, joinOptions = {}) {
  return options.name ?? joinOptions.name ?? propertyName;
}

function formatValue(value) {
  if (value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function parseEntityFile(filePath, serviceName) {
  const source = stripComments(fs.readFileSync(filePath, 'utf8'));
  const lines = source.split(/\r?\n/);
  const result = [];
  let pending = [];
  let current = null;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('@')) {
      const decoratorText = getBalancedDecorator(lines, i);
      pending.push(parseDecorator(decoratorText.text));
      i = decoratorText.endIndex;
      continue;
    }

    const classMatch = trimmed.match(/^export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/) ?? trimmed.match(/^class\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      const entityDecorator = pending.find((decorator) => decorator.name === 'Entity');
      if (entityDecorator) {
        const entity = parseEntityDecorator(entityDecorator, classMatch[1]);
        current = {
          service: serviceName,
          source: 'TypeORM',
          className: classMatch[1],
          table: entity.table,
          schema: entity.schema,
          file: path.relative(root, filePath),
          columns: [],
          relations: [],
          indexes: pending.filter((decorator) => decorator.name === 'Index').map((decorator) => decorator.args),
        };
        result.push(current);
      } else {
        current = null;
      }
      pending = [];
      continue;
    }

    if (!current || pending.length === 0) continue;

    const propertyMatch = parseProperty(trimmed);
    if (!propertyMatch) continue;

    const [, propertyName, tsType] = propertyMatch;
    const columnDecorator = pending.find((decorator) =>
      ['Column', 'PrimaryColumn', 'PrimaryGeneratedColumn', 'CreateDateColumn', 'UpdateDateColumn', 'DeleteDateColumn'].includes(decorator.name),
    );
    const relationDecorator = pending.find((decorator) =>
      ['ManyToOne', 'OneToOne', 'OneToMany', 'ManyToMany'].includes(decorator.name),
    );
    const joinColumnDecorator = pending.find((decorator) => decorator.name === 'JoinColumn');
    const indexDecorator = pending.find((decorator) => decorator.name === 'Index');

    if (columnDecorator) {
      const options = parseDecoratorOptions(columnDecorator.args);
      const joinOptions = joinColumnDecorator ? parseDecoratorOptions(joinColumnDecorator.args) : {};
      const column = {
        name: propertyColumnName(propertyName, options, joinOptions),
        property: propertyName,
        type: inferType(tsType, options, columnDecorator.name),
        primary: ['PrimaryColumn', 'PrimaryGeneratedColumn'].includes(columnDecorator.name),
        nullable: options.nullable === true || /\|\s*null/.test(tsType) || trimmed.includes('?:'),
        unique: options.unique === true,
        defaultValue: options.default !== undefined ? formatValue(options.default) : '',
        generated: columnDecorator.name === 'PrimaryGeneratedColumn',
        note: '',
      };

      if (columnDecorator.name === 'CreateDateColumn') column.note = 'Fecha de creación automática';
      if (columnDecorator.name === 'UpdateDateColumn') column.note = 'Fecha de actualización automática';
      if (columnDecorator.name === 'DeleteDateColumn') column.note = 'Borrado lógico';
      if (indexDecorator) column.note = [column.note, `Índice: ${indexDecorator.args}`].filter(Boolean).join('; ');

      current.columns.push(column);
    }

    if (relationDecorator) {
      const joinOptions = joinColumnDecorator ? parseDecoratorOptions(joinColumnDecorator.args) : {};
      const relation = {
        property: propertyName,
        type: relationDecorator.name,
        target: parseRelationTarget(relationDecorator.args),
        joinColumn: joinOptions.name ?? '',
      };
      current.relations.push(relation);
    }

    pending = [];
  }

  return result;
}

function parseSqlFiles(service) {
  const files = getSqlFiles(service);

  return files.map((filePath) => path.relative(root, filePath)).sort();
}

function getSqlFiles(service) {
  return walk(service.path, (filePath) => {
    const baseName = path.basename(filePath).toLowerCase();
    return filePath.endsWith('.sql') && !baseName.includes('seed') && !baseName.includes('old');
  });
}

function parseSqlTables(service, existingEntries) {
  const existing = new Set(
    existingEntries
      .filter((entry) => entry.service === service.name)
      .map((entry) => `${entry.schema}.${entry.table}`.toLowerCase()),
  );
  const tables = [];

  for (const filePath of getSqlFiles(service)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const cleaned = stripSqlComments(source);
    const tableDefinitions = extractCreateTables(cleaned);

    for (const definition of tableDefinitions) {
      const parsedName = parseSqlTableName(definition.name);
      const key = `${parsedName.schema}.${parsedName.table}`.toLowerCase();
      if (existing.has(key)) continue;

      tables.push({
        service: service.name,
        source: 'SQL',
        className: 'SQL',
        table: parsedName.table,
        schema: parsedName.schema,
        file: path.relative(root, filePath),
        columns: parseSqlColumns(definition.body),
        relations: [],
        indexes: [],
      });
      existing.add(key);
    }
  }

  return tables;
}

function stripSqlComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function extractCreateTables(source) {
  const definitions = [];
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"[^"]+"|[A-Za-z0-9_]+)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z0-9_]+))?)\s*\(/gi;
  let match;

  while ((match = regex.exec(source))) {
    const bodyStart = regex.lastIndex - 1;
    const bodyEnd = findMatchingParen(source, bodyStart);
    if (bodyEnd === -1) continue;
    definitions.push({
      name: match[1],
      body: source.slice(bodyStart + 1, bodyEnd),
    });
    regex.lastIndex = bodyEnd + 1;
  }

  return definitions;
}

function findMatchingParen(source, startIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function parseSqlTableName(name) {
  const parts = name
    .split('.')
    .map((part) => part.trim().replace(/^"|"$/g, ''));
  if (parts.length === 2) {
    return { schema: parts[0], table: parts[1] };
  }
  return { schema: 'default', table: parts[0] };
}

function parseSqlColumns(body) {
  const constraints = [];
  const columns = [];
  for (const part of splitTopLevel(body)) {
    const definition = part.trim().replace(/\s+/g, ' ');
    if (!definition) continue;
    if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\b/i.test(definition)) {
      constraints.push(definition);
      continue;
    }

    const columnMatch = definition.match(/^("[^"]+"|[A-Za-z0-9_]+)\s+(.+)$/);
    if (!columnMatch) continue;

    const columnName = columnMatch[1].replace(/^"|"$/g, '');
    const rest = columnMatch[2];
    const type = extractSqlType(rest);
    const fkMatch = rest.match(/REFERENCES\s+((?:"[^"]+"|[A-Za-z0-9_]+)(?:\.(?:"[^"]+"|[A-Za-z0-9_]+))?)\s*\(([^)]+)\)/i);
    const checkMatch = rest.match(/CHECK\s*\((.+)\)/i);

    columns.push({
      name: columnName,
      property: columnName,
      type,
      primary: /\bPRIMARY\s+KEY\b/i.test(rest),
      nullable: !/\bNOT\s+NULL\b/i.test(rest) && !/\bPRIMARY\s+KEY\b/i.test(rest),
      unique: /\bUNIQUE\b/i.test(rest),
      defaultValue: extractSqlDefault(rest),
      generated: false,
      note: [
        fkMatch ? `REFERENCES ${fkMatch[1].replace(/"/g, '')}(${fkMatch[2].replace(/"/g, '')})` : '',
        checkMatch ? `CHECK (${checkMatch[1]})` : '',
      ].filter(Boolean).join('; '),
    });
  }

  applyTableConstraints(columns, constraints);
  return columns;
}

function extractSqlType(rest) {
  const match = rest.match(/^(.+?)(?=\s+(PRIMARY\s+KEY|NOT\s+NULL|NULL|DEFAULT|UNIQUE|REFERENCES|CHECK|CONSTRAINT)\b|$)/i);
  return match?.[1]?.trim() ?? rest.trim();
}

function extractSqlDefault(rest) {
  const match = rest.match(/\bDEFAULT\s+(.+?)(?=\s+(NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|REFERENCES|CHECK|CONSTRAINT)\b|$)/i);
  return match?.[1]?.trim() ?? '';
}

function applyTableConstraints(columns, constraints) {
  for (const constraint of constraints) {
    const pkMatch = constraint.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      for (const name of splitSqlIdentifierList(pkMatch[1])) {
        const column = columns.find((item) => item.name === name);
        if (column) {
          column.primary = true;
          column.nullable = false;
        }
      }
    }

    const uniqueMatch = constraint.match(/UNIQUE\s*\(([^)]+)\)/i);
    if (uniqueMatch) {
      for (const name of splitSqlIdentifierList(uniqueMatch[1])) {
        const column = columns.find((item) => item.name === name);
        if (column) column.unique = true;
      }
    }

    const fkMatch = constraint.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+((?:"[^"]+"|[A-Za-z0-9_]+)(?:\.(?:"[^"]+"|[A-Za-z0-9_]+))?)\s*\(([^)]+)\)/i);
    if (fkMatch) {
      const reference = `REFERENCES ${fkMatch[2].replace(/"/g, '')}(${fkMatch[3].replace(/"/g, '')})`;
      for (const name of splitSqlIdentifierList(fkMatch[1])) {
        const column = columns.find((item) => item.name === name);
        if (column && !column.note.includes(reference)) {
          column.note = [column.note, reference].filter(Boolean).join('; ');
        }
      }
    }
  }
}

function splitSqlIdentifierList(value) {
  return value.split(',').map((item) => item.trim().replace(/^"|"$/g, ''));
}

function buildDictionary() {
  const services = discoverServices();
  const merDiagrams = discoverMerDiagrams();
  const entityEntries = [];
  const sqlSources = new Map();

  for (const service of services) {
    const entityFiles = walk(service.path, (filePath) => filePath.endsWith('.entity.ts'));
    const serviceEntries = entityFiles.flatMap((filePath) => parseEntityFile(filePath, service.name));
    entityEntries.push(...serviceEntries);
    sqlSources.set(service.name, parseSqlFiles(service));
  }

  const sqlEntries = services.flatMap((service) => parseSqlTables(service, entityEntries));
  const entries = [...entityEntries, ...sqlEntries];

  return { services, entries, entityEntries, sqlEntries, sqlSources, merDiagrams };
}

function mdEscape(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function fqName(entry) {
  return entry.schema === 'default' ? entry.table : `${entry.schema}.${entry.table}`;
}

function getServiceMerDiagrams(serviceName, merDiagrams) {
  return (SERVICE_MER_KEYS[serviceName] ?? [])
    .map((key) => merDiagrams.get(key))
    .filter(Boolean);
}

function getSchemaMerDiagrams(serviceName, schema, merDiagrams) {
  if (merDiagrams.has(schema)) return [merDiagrams.get(schema)];
  return getServiceMerDiagrams(serviceName, merDiagrams);
}

function renderMerLinks(diagrams) {
  return diagrams
    .map((diagram) => `[${diagram.key}](<${diagram.docPath}>)`)
    .join(', ');
}

function renderMarkdown({ services, entries, entityEntries, sqlEntries, sqlSources, merDiagrams }) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  const totalTables = entries.length;
  const totalColumns = entries.reduce((sum, entry) => sum + entry.columns.length, 0);
  const schemas = [...new Set(entries.map((entry) => entry.schema))].sort();

  lines.push('# Diccionario de datos - Backend');
  lines.push('');
  lines.push(`Generado el ${date} desde las entidades TypeORM \`*.entity.ts\` y fuentes SQL encontradas bajo \`backend/\`.`);
  lines.push('');
  lines.push('## Alcance');
  lines.push('');
  lines.push(`- Microservicios revisados: ${services.length}`);
  lines.push(`- Tablas derivadas de entidades TypeORM: ${entityEntries.length}`);
  lines.push(`- Tablas adicionales derivadas de SQL: ${sqlEntries.length}`);
  lines.push(`- Tablas documentadas en total: ${totalTables}`);
  lines.push(`- Columnas documentadas: ${totalColumns}`);
  lines.push(`- Esquemas detectados: ${schemas.join(', ') || 'N/A'}`);
  lines.push(`- Diagramas MER asociados: ${merDiagrams.size}`);
  lines.push('');
  lines.push('> Nota: cuando una entidad no define explícitamente `schema`, se registra como `default` porque TypeORM usará el esquema configurado por conexión o el esquema por defecto de la base de datos.');
  lines.push('');
  lines.push('## Índice por microservicio');
  lines.push('');

  for (const service of services) {
    const serviceEntries = entries.filter((entry) => entry.service === service.name);
    const serviceSchemas = [...new Set(serviceEntries.map((entry) => entry.schema))].sort();
    const serviceMers = getServiceMerDiagrams(service.name, merDiagrams);
    const tableLabel = serviceEntries.length === 1 ? 'tabla' : 'tablas';
    lines.push(`- [${service.name}](#${slug(service.name)}): ${serviceEntries.length} ${tableLabel}${serviceSchemas.length ? `; esquemas ${serviceSchemas.join(', ')}` : ''}${serviceMers.length ? `; MER ${renderMerLinks(serviceMers)}` : ''}`);
  }

  for (const service of services) {
    const serviceEntries = entries
      .filter((entry) => entry.service === service.name)
      .sort((a, b) => fqName(a).localeCompare(fqName(b)));
    const serviceSql = sqlSources.get(service.name) ?? [];

    lines.push('');
    lines.push(`## ${service.name}`);
    lines.push('');

    const serviceMers = getServiceMerDiagrams(service.name, merDiagrams);
    if (serviceMers.length) {
      lines.push('Diagramas MER relacionados:');
      for (const diagram of serviceMers) {
        lines.push(`- [${diagram.key}](<${diagram.docPath}>)`);
      }
      lines.push('');
    }

    if (serviceSql.length) {
      lines.push('Fuentes SQL detectadas:');
      for (const file of serviceSql) lines.push(`- \`${file}\``);
      lines.push('');
    }

    if (!serviceEntries.length) {
      lines.push('No se detectaron entidades TypeORM ni tablas documentables en este microservicio.');
      continue;
    }

    const grouped = groupBy(serviceEntries, (entry) => entry.schema);
    for (const schema of Object.keys(grouped).sort()) {
      lines.push(`### Esquema \`${schema}\``);
      lines.push('');

      const schemaMers = getSchemaMerDiagrams(service.name, schema, merDiagrams);
      if (schemaMers.length) {
        lines.push(`MER relacionado: ${renderMerLinks(schemaMers)}`);
        lines.push('');
      }

      for (const entry of grouped[schema]) {
        lines.push(`#### Tabla \`${fqName(entry)}\``);
        lines.push('');
        lines.push(`- Entidad/definición: \`${entry.className}\``);
        lines.push(`- Fuente: \`${entry.source}\``);
        lines.push(`- Archivo: \`${entry.file}\``);
        if (entry.indexes.length) {
          lines.push(`- Índices de entidad: ${entry.indexes.map((index) => `\`${index}\``).join(', ')}`);
        }
        if (entry.relations.length) {
          lines.push('- Relaciones declaradas:');
          for (const relation of entry.relations) {
            const join = relation.joinColumn ? ` por \`${relation.joinColumn}\`` : '';
            lines.push(`  - \`${relation.property}\`: ${relation.type} -> \`${relation.target || 'no inferido'}\`${join}`);
          }
        }
        lines.push('');
        lines.push('| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |');
        lines.push('|---|---|---|---|---|---|---|---|---|');

        for (const column of entry.columns) {
          const relation = entry.relations.find((item) => item.joinColumn === column.name);
          const fk = relation ? `${relation.type} -> ${relation.target}` : '';
          lines.push(`| ${[
            `\`${mdEscape(column.name)}\``,
            `\`${mdEscape(column.property)}\``,
            mdEscape(column.type),
            column.primary ? 'Sí' : 'No',
            mdEscape(fk),
            column.nullable ? 'Sí' : 'No',
            column.unique ? 'Sí' : 'No',
            mdEscape(column.defaultValue),
            mdEscape(column.note),
          ].join(' | ')} |`);
        }
        lines.push('');
      }
    }
  }

  lines.push(...renderGeneralOverview({ services, entries, entityEntries, sqlEntries, merDiagrams }));

  return `${lines.join('\n')}\n`;
}

function renderGeneralOverview({ services, entries, entityEntries, sqlEntries, merDiagrams }) {
  const lines = [];
  const byService = services.map((service) => {
    const serviceEntries = entries.filter((entry) => entry.service === service.name);
    const mers = getServiceMerDiagrams(service.name, merDiagrams);
    return {
      name: service.name,
      tables: serviceEntries.length,
      columns: serviceEntries.reduce((sum, entry) => sum + entry.columns.length, 0),
      typeormTables: serviceEntries.filter((entry) => entry.source === 'TypeORM').length,
      sqlTables: serviceEntries.filter((entry) => entry.source === 'SQL').length,
      schemas: [...new Set(serviceEntries.map((entry) => entry.schema))].sort(),
      mers,
    };
  });
  const withTables = byService.filter((service) => service.tables > 0);
  const withoutTables = byService.filter((service) => service.tables === 0);
  const largest = [...withTables].sort((a, b) => b.tables - a.tables).slice(0, 5);
  const schemas = [...new Set(entries.map((entry) => entry.schema))].sort();

  lines.push('');
  lines.push('## Overview general');
  lines.push('');
  lines.push('### Resumen práctico');
  lines.push('');
  lines.push(`- El backend documentado contiene ${entries.length} tablas y ${entries.reduce((sum, entry) => sum + entry.columns.length, 0)} columnas distribuidas en ${schemas.length} esquemas.`);
  lines.push(`- La fuente principal del modelo son las entidades TypeORM: ${entityEntries.length} tablas. Además, se encontraron ${sqlEntries.length} tablas definidas solo en archivos SQL.`);
  lines.push(`- Hay ${merDiagrams.size} diagramas MER vinculados desde \`docs/mer/06-may-2026/\`, asociados por esquema o dominio de microservicio.`);
  lines.push(`- Los microservicios con mayor superficie de datos son: ${largest.map((service) => `${service.name} (${service.tables})`).join(', ')}.`);
  lines.push(`- Los microservicios sin tablas detectadas son: ${withoutTables.map((service) => service.name).join(', ') || 'ninguno'}.`);
  lines.push('');
  lines.push('### Lectura por dominio');
  lines.push('');
  lines.push('- `auth-service` concentra usuarios, roles, permisos, personas, sedes, seccionales y catálogos administrativos del esquema `auth`.');
  lines.push('- `internal-institutional-control-service` concentra el dominio de control interno: auditorías, hallazgos, planes de mejoramiento, informes de ley, aprobaciones, notificaciones y tableros.');
  lines.push('- `legal-management-service` concentra gestión jurídica: expedientes, actuaciones, documentos, consultas jurídicas, riesgos, procesos coactivos, requerimientos de organismos de control y PEI.');
  lines.push('- `internal-disciplinary-control-service` concentra control disciplinario: noticias, procesos, autos, evidencias, actuaciones, términos procesales, alertas y configuraciones.');
  lines.push('- `academic-registration-service` y `certification-service` cubren certificados, solicitudes, validaciones, firmantes y configuración de plantillas.');
  lines.push('- `academic-work-plan-service` cubre planes de trabajo académico, docentes, asignaturas, sedes, programas, evidencias, eventos y aprobaciones.');
  lines.push('- `audit-service` y `notifications-service` tienen una superficie acotada orientada a logs de solicitudes y notificaciones.');
  lines.push('');
  lines.push('### Resumen por microservicio');
  lines.push('');
  lines.push('| Microservicio | Esquemas | MER | Tablas | Columnas | TypeORM | SQL |');
  lines.push('|---|---|---|---:|---:|---:|---:|');
  for (const service of byService) {
    lines.push(`| \`${service.name}\` | ${service.schemas.map((schema) => `\`${schema}\``).join(', ') || 'N/A'} | ${service.mers.length ? renderMerLinks(service.mers) : 'N/A'} | ${service.tables} | ${service.columns} | ${service.typeormTables} | ${service.sqlTables} |`);
  }
  lines.push('');
  lines.push('### Criterios de uso');
  lines.push('');
  lines.push('- Para entender el modelo vigente de una funcionalidad, revisar primero las tablas con fuente `TypeORM`, porque representan el contrato que usa la aplicación.');
  lines.push('- Para validar instalaciones, migraciones o tablas heredadas, revisar las tablas con fuente `SQL`, especialmente en `auth-service` e `internal-institutional-control-service`.');
  lines.push('- Las tablas marcadas en esquema `default` dependen del esquema configurado en la conexión del microservicio o del esquema por defecto de PostgreSQL.');
  lines.push('- Las relaciones listadas provienen de decoradores TypeORM; las tablas derivadas de SQL documentan llaves y restricciones cuando están declaradas en el `CREATE TABLE`.');

  return lines;
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, renderMarkdown(buildDictionary()));
console.log(`Diccionario generado en ${path.relative(root, outputPath)}`);
