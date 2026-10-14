/** Audita dependencias de las entradas RUND y sus pruebas, sin ejecutar servicios. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const repo = path.resolve(__dirname, '..');
const app = path.join(repo, 'apps/mfe-rund');
const sourceRoot = path.join(app, 'src');
const config = ts.readConfigFile(path.join(app, 'tsconfig.json'), ts.sys.readFile);
assert.equal(config.error, undefined, 'No se pudo leer tsconfig');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, app);
const sourceFiles = parsed.fileNames;
const entries = ['src/main.tsx', 'src/components/RundModulePremium.tsx',
  'src/components/pta/banco-docentes/AutogestionDocenteRUND.tsx'].map(file => path.join(app, file));
const tests = sourceFiles.filter(file => /\.test\.(ts|tsx)$/.test(file));
const reached = new Set();
const foreign = new Set();

function visit(file) {
  file = path.resolve(file);
  if (reached.has(file)) return;
  assert.ok(fs.existsSync(file), `Archivo ausente: ${file}`);
  reached.add(file);
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function walk(node) {
    let spec;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) spec = node.moduleSpecifier;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) spec = node.arguments[0];
    if (spec && ts.isStringLiteral(spec)) {
      if (spec.text.endsWith('.css')) {
        assert.ok(spec.text.startsWith('.'), 'Estilo fuera del MFE: ' + spec.text);
        const asset = path.resolve(path.dirname(file), spec.text);
        assert.ok(asset.startsWith(app + path.sep), 'Estilo fuera de RUND: ' + asset);
        assert.ok(fs.existsSync(asset), 'Estilo ausente: ' + asset);
        return;
      }
      const resolved = ts.resolveModuleName(spec.text, file, parsed.options, ts.sys).resolvedModule;
      assert.ok(resolved, `Import no resuelto en ${path.relative(repo, file)}: ${spec.text}`);
      const target = path.resolve(resolved.resolvedFileName);
      if (!target.includes(path.sep + 'node_modules' + path.sep)) {
        if (!target.startsWith(app + path.sep) && !target.startsWith(path.join(repo, 'packages') + path.sep)) {
          foreign.add(path.relative(repo, target));
        }
        visit(target);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
}

[...entries, ...tests].forEach(visit);
assert.equal(foreign.size, 0, 'RUND importa fuentes de otros módulos: ' + [...foreign].join(', '));
const unused = sourceFiles.filter(file => !file.endsWith('.d.ts') && !reached.has(path.resolve(file)));
assert.deepEqual(unused, [], 'Fuentes TypeScript sin uso en entradas/pruebas');
assert.ok(!fs.existsSync(path.join(app, 'src/services/api/rundService.ts')), 'Cliente obsoleto /api/rund presente');

// Auditar el contrato real producido por Vite, además de las importaciones fuente.
const remoteFile = path.join(repo, 'build/remotes/mfe-rund/assets/remoteEntry.js');
const remote = fs.readFileSync(remoteFile, 'utf8');
assert.ok(remote.includes('"./Module"'), 'El remote no expone ./Module');
assert.ok(remote.includes('"./Autogestion"'), 'El remote no expone ./Autogestion');
const chunks = [...remote.matchAll(/__federation_import\(["']([^"']+)["']\)/g)].map(match => match[1]);
assert.ok(chunks.length > 0, 'No hay chunk para el módulo federado');
for (const chunk of chunks) {
  assert.ok(chunk.startsWith('/remotes/mfe-rund/'), 'Chunk fuera del remote RUND: ' + chunk);
  const target = path.join(repo, 'build', chunk.slice(1));
  assert.ok(fs.existsSync(target), 'Chunk federado ausente: ' + chunk);
  const expectedExport = chunk.includes('__federation_expose_Autogestion-') ? 'AutogestionDocenteRUND' : 'RundModulePremium';
  assert.ok(fs.readFileSync(target, 'utf8').includes(expectedExport), 'Export ausente: ' + expectedExport);
}
console.log(JSON.stringify({
  entries: entries.map(file => path.relative(repo, file).replaceAll('\\', '/')),
  sourceFiles: sourceFiles.length,
  reachableSourceFiles: [...reached].filter(file => file.startsWith(sourceRoot + path.sep)).length,
  testFiles: tests.length,
  foreignModuleImports: [...foreign],
  unusedTypeScriptFiles: unused,
  federation: { module: 'rund/Module', export: 'RundModulePremium', publicModule: 'rund/Autogestion', publicExport: 'AutogestionDocenteRUND', chunks },
}, null, 2));
