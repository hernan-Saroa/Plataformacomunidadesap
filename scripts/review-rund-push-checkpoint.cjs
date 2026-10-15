/* Genera un manifiesto del corte. Solo lee Git/fuentes y escribe dos evidencias.
 * No stage, commit, push, checkout, dotenv, red, contenedores o base de datos.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !/^--checkpoint=\d+$/.test(args[0])))
  throw new Error('Uso: node scripts/review-rund-push-checkpoint.cjs [--checkpoint=61]');
const checkpoint = args.length ? args[0].split('=')[1] : null;
const manifestFile = checkpoint ? `docs/rund/corte-${checkpoint}-rund.paths` : 'docs/rund/primer-push-rund.paths';
const reportFile = checkpoint ? `docs/rund/revision-push-corte-${checkpoint}.json` : 'docs/rund/revision-primer-push.json';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'ignore'] });
const normalize = file => file.replace(/\\/g, '/');
const prefixes = ['apps/mfe-rund/', 'apps/shell/', 'apps/mfe-gestion-personas/',
  'backend/rund-service/', 'backend/auth-service/', 'backend/api-gateway/',
  ...(checkpoint ? ['backend/academic-work-plan-service/', 'backend/academic-schedule-service/'] : []),
  'packages/shared-hooks/', 'packages/shared-ui/', 'docs/rund/'];
const rootFiles = new Set(['.env.example', 'migrate.local.sh', 'migrate.service.local.sh',
  'db/migrations/667_auth_carpeta_documento_versiones.sql', 'db/migrations/668_auth_carpeta_revision_rund.sql',
  ...['dev', 'qa', 'pre', 'prod'].map(env => `deploy.${env}.sh`),
  ...['', '.backend', '.local', '.dev', '.qa', '.pre', '.prod'].map(suffix => `docker-compose${suffix}.yml`)]);
function belongs(file) {
  return prefixes.some(prefix => file.startsWith(prefix)) || rootFiles.has(file) ||
    (checkpoint && /^scripts\/fixtures\/rund-[^/]+\.(?:cjs|sql)$/.test(file)) ||
    /^\.github\/workflows\/build-backend-(?:dev|qa|pre|prod)\.yml$/.test(file) ||
    /^scripts\/(?:verify-rund-[^/]+|review-rund-[^/]+|verify-auth-document-versions|verify-migration-runners\.test|verify-deploy-service-selection\.test|jest-auth-carpeta\.config)\.cjs$/.test(file) ||
    file === 'scripts/lib/rund-installation-review.cjs';
}
function forbidden(file) {
  return /[\r\n\0]/.test(file) || /(?:^|\/)(?:node_modules|dist|build|tmp|uploads|\.git|coverage)(?:\/|$)/.test(file) ||
    (path.basename(file).startsWith('.env') && path.basename(file) !== '.env.example') || /\.(?:pem|ppk|key|log)$/i.test(file);
}
const raw = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
const status = [];
for (let i = 0; i < raw.length; i++) {
  const item = { status: raw[i].slice(0, 2), file: normalize(raw[i].slice(3)) };
  status.push(item);
  if (/[RC]/.test(item.status)) status.push({ status: ' D', file: normalize(raw[++i]) });
}
for (const file of [manifestFile, reportFile]) if (!status.some(item => item.file === file)) status.push({ status: '??', file });
const selected = status.filter(item => belongs(item.file) && !forbidden(item.file)).sort((a, b) => a.file.localeCompare(b.file, 'en'));
const outsideCut = status.filter(item => !selected.includes(item)).map(item => ({ ...item, reason: forbidden(item.file) ? 'protected_or_generated_file' : 'outside_rund_cut' }));
const paths = new Set(selected.map(item => item.file));
const tracked = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean).map(normalize));
const findings = [];
const fingerprints = {};
const configs = new Map();
function compilerOptions(file) {
  const configFile = ts.findConfigFile(path.dirname(file), ts.sys.fileExists);
  if (!configFile) return { moduleResolution: ts.ModuleResolutionKind.Node10, allowJs: true };
  if (!configs.has(configFile)) {
    const config = ts.readConfigFile(configFile, ts.sys.readFile);
    configs.set(configFile, ts.parseJsonConfigFileContent(config.config || {}, ts.sys, path.dirname(configFile)).options);
  }
  return configs.get(configFile);
}
let importsChecked = 0;
for (const item of selected) {
  if (item.file === manifestFile || item.file === reportFile || !fs.existsSync(path.join(root, item.file))) continue;
  const absolute = path.join(root, item.file), bytes = fs.readFileSync(absolute);
  // Generated evidence is selected/scanned, but not recursively fingerprinted.
  if (!/^docs\/rund\/(?:revision|validacion)[^/]*\.json$/.test(item.file))
    fingerprints[item.file] = createHash('sha256').update(bytes).digest('hex');
  const source = bytes.toString('utf8');
  for (const match of source.matchAll(/^(?:<<<<<<< |>>>>>>> )[^\r\n]*$/gm))
    findings.push({ file: item.file, line: source.slice(0, match.index).split('\n').length, kind: 'merge_conflict_marker' });
  const signatures = [
    ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
    ['github_token_literal', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
    ['aws_access_key_literal', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ];
  for (const [kind, pattern] of signatures) for (const match of source.matchAll(pattern))
    findings.push({ file: item.file, line: source.slice(0, match.index).split('\n').length, kind });
  if (!/\.[cm]?[jt]sx?$/.test(item.file) || /\.d\.ts$/.test(item.file)) continue;
  const ast = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    let spec;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) spec = node.moduleSpecifier;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) spec = node.arguments[0];
    if (spec && ts.isStringLiteral(spec)) {
      const resolved = ts.resolveModuleName(spec.text, absolute, compilerOptions(absolute), ts.sys).resolvedModule;
      if (resolved && fs.existsSync(resolved.resolvedFileName)) {
        const target = fs.realpathSync(resolved.resolvedFileName);
        const relative = normalize(path.relative(root, target));
        if (!relative.startsWith('../') && !path.isAbsolute(relative) && !relative.split('/').includes('node_modules')) {
          importsChecked++;
          if (!tracked.has(relative) && !paths.has(relative)) findings.push({ file: item.file, kind: 'local_dependency_outside_manifest', dependency: relative });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const manifest = [...paths].map(file => `:(literal)${file}`).join('\n') + '\n';
fs.writeFileSync(path.join(root, manifestFile), manifest);
const report = { generatedAt: new Date().toISOString(), scope: checkpoint ? `source-review-push-checkpoint-${checkpoint}` : 'first-source-review-push',
  branch: git(['branch', '--show-current']).trim(), head: git(['rev-parse', 'HEAD']).trim(),
  activationReadiness: 'not_verified', deploymentApproved: false, gitIndexModified: false,
  commitCreated: false, pushExecuted: false, runtimeModified: false,
  manifestFile, selectedFileCount: paths.size, newFiles: selected.filter(item => item.status === '??').length,
  deletedFiles: selected.filter(item => item.status.includes('D')).length, outsideCut, findings,
  localImportTargetsChecked: importsChecked, manifestSha256: createHash('sha256').update(manifest).digest('hex'),
  files: selected, sourceHashes: fingerprints,
  limits: ['El manifiesto se basa en este worktree; revisar antes de stage/commit y regenerar si cambian las fuentes.',
    'La búsqueda de secretos cubre firmas concretas, no sustituye revisión de valores/configuración.',
    'Los imports revisados son los estáticos resolubles por TypeScript; no prueba todos los recursos dinámicos.',
    'Las evidencias JSON generadas y el propio manifiesto no se huellan como fuentes para evitar referencias circulares.',
    `Las pruebas y límites del corte se documentan en ${checkpoint ? `PUSH-CORTE-${checkpoint}.md` : 'PRIMER-PUSH.md'}; este script no ejecuta pruebas ni certifica despliegue.`] };
fs.writeFileSync(path.join(root, reportFile), JSON.stringify(report, null, 2) + '\n');
console.log(`Corte RUND: ${paths.size} archivos; ${findings.length} hallazgos; ${outsideCut.length} cambios fuera del corte. Sin stage/commit/push.`);
process.exitCode = findings.length ? 1 : 0;
