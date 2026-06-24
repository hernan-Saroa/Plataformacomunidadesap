import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const markerPattern = /(^|[^A-Za-z0-9_])(TODO|FIXME)([^A-Za-z0-9_]|$)/;
const maxFindingsToPrint = 10;

function collectJsFiles(targetPath, files = []) {
  const resolvedPath = path.resolve(targetPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`No existe la ruta: ${targetPath}`);
  }

  const stats = statSync(resolvedPath);

  if (stats.isDirectory()) {
    for (const entry of readdirSync(resolvedPath)) {
      collectJsFiles(path.join(resolvedPath, entry), files);
    }
    return files;
  }

  if (stats.isFile() && resolvedPath.endsWith('.js')) {
    files.push(resolvedPath);
  }

  return files;
}

function normalizePreview(comment) {
  return comment.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function findCommentMarkers(filePath, code) {
  const findings = [];
  let index = 0;
  let line = 1;

  function consumeNewline() {
    if (code[index] === '\r' && code[index + 1] === '\n') {
      index += 2;
    } else {
      index += 1;
    }
    line += 1;
  }

  function skipEscapedCharacter() {
    index += 1;
    if (index >= code.length) {
      return;
    }

    if (code[index] === '\r' || code[index] === '\n') {
      consumeNewline();
      return;
    }

    index += 1;
  }

  function scanQuotedString(quote) {
    index += 1;

    while (index < code.length) {
      const char = code[index];

      if (char === '\\') {
        skipEscapedCharacter();
        continue;
      }

      if (char === '\r' || char === '\n') {
        consumeNewline();
        continue;
      }

      index += 1;

      if (char === quote) {
        return;
      }
    }
  }

  function scanLineComment() {
    const startLine = line;
    let comment = '';
    index += 2;

    while (index < code.length && code[index] !== '\r' && code[index] !== '\n') {
      comment += code[index];
      index += 1;
    }

    if (markerPattern.test(comment)) {
      findings.push({ filePath, line: startLine, comment: normalizePreview(comment) });
    }
  }

  function scanBlockComment() {
    const startLine = line;
    let comment = '';
    index += 2;

    while (index < code.length) {
      if (code[index] === '*' && code[index + 1] === '/') {
        index += 2;
        break;
      }

      if (code[index] === '\r' || code[index] === '\n') {
        comment += '\n';
        consumeNewline();
        continue;
      }

      comment += code[index];
      index += 1;
    }

    if (markerPattern.test(comment)) {
      findings.push({ filePath, line: startLine, comment: normalizePreview(comment) });
    }
  }

  function scanTemplateLiteral() {
    index += 1;

    while (index < code.length) {
      const char = code[index];

      if (char === '\\') {
        skipEscapedCharacter();
        continue;
      }

      if (char === '`') {
        index += 1;
        return;
      }

      if (char === '$' && code[index + 1] === '{') {
        index += 2;
        scanCode(1);
        continue;
      }

      if (char === '\r' || char === '\n') {
        consumeNewline();
        continue;
      }

      index += 1;
    }
  }

  function scanCode(templateExpressionDepth = 0) {
    let braceDepth = templateExpressionDepth;

    while (index < code.length) {
      const char = code[index];
      const next = code[index + 1];

      if (braceDepth > 0) {
        if (char === '{') {
          braceDepth += 1;
          index += 1;
          continue;
        }

        if (char === '}') {
          braceDepth -= 1;
          index += 1;

          if (braceDepth === 0) {
            return;
          }

          continue;
        }
      }

      if (char === "'" || char === '"') {
        scanQuotedString(char);
        continue;
      }

      if (char === '`') {
        scanTemplateLiteral();
        continue;
      }

      if (char === '/' && next === '/') {
        scanLineComment();
        continue;
      }

      if (char === '/' && next === '*') {
        scanBlockComment();
        continue;
      }

      if (char === '\r' || char === '\n') {
        consumeNewline();
        continue;
      }

      index += 1;
    }
  }

  scanCode();
  return findings;
}

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('Uso: node scripts/check-bundle-comments.mjs <archivo-o-directorio> [...]');
  process.exit(2);
}

const jsFiles = targets.flatMap((target) => collectJsFiles(target));
const findings = jsFiles.flatMap((filePath) => findCommentMarkers(filePath, readFileSync(filePath, 'utf8')));

if (findings.length > 0) {
  for (const finding of findings.slice(0, maxFindingsToPrint)) {
    console.error(`${finding.filePath}:${finding.line}: comentario con TODO/FIXME: ${finding.comment}`);
  }

  if (findings.length > maxFindingsToPrint) {
    console.error(`... ${findings.length - maxFindingsToPrint} hallazgos adicionales omitidos`);
  }

  process.exit(1);
}

console.log(`OK: ${jsFiles.length} archivos JS sin marcadores TODO/FIXME en comentarios.`);
