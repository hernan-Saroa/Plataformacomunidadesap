import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..');

export const shellApp = {
  workspace: '@esap-mfe/shell',
  appDir: 'shell',
  federationName: 'shell',
  devPort: 3000,
  serviceName: 'frontend-shell',
};

export const remoteApps = [
  { workspace: '@esap-mfe/estructura-org', appDir: 'mfe-estructura-org', federationName: 'estructura_org', devPort: 3101, serviceName: 'frontend-mfe-estructura-org' },
  { workspace: '@esap-mfe/gestion-profesoral', appDir: 'mfe-gestion-profesoral', federationName: 'gestion_profesoral', devPort: 3102, serviceName: 'frontend-mfe-gestion-profesoral' },
  { workspace: '@esap-mfe/programas-academicos', appDir: 'mfe-programas-academicos', federationName: 'programas_academicos', devPort: 3103, serviceName: 'frontend-mfe-programas-academicos' },
  { workspace: '@esap-mfe/gestion-personas', appDir: 'mfe-gestion-personas', federationName: 'gestion_personas', devPort: 3104, serviceName: 'frontend-mfe-gestion-personas' },
  { workspace: '@esap-mfe/auditoria', appDir: 'mfe-auditoria', federationName: 'auditoria', devPort: 3105, serviceName: 'frontend-mfe-auditoria' },
  { workspace: '@esap-mfe/reportes', appDir: 'mfe-reportes', federationName: 'reportes', devPort: 3106, serviceName: 'frontend-mfe-reportes' },
  { workspace: '@esap-mfe/registro-academico', appDir: 'mfe-registro-academico', federationName: 'registro_academico', devPort: 3107, serviceName: 'frontend-mfe-registro-academico' },
  { workspace: '@esap-mfe/certificados-laborales', appDir: 'mfe-certificados-laborales', federationName: 'certificados_laborales', devPort: 3108, serviceName: 'frontend-mfe-certificados-laborales' },
  { workspace: '@esap-mfe/firma-electronica', appDir: 'mfe-firma-electronica', federationName: 'firma_electronica', devPort: 3109, serviceName: 'frontend-mfe-firma-electronica' },
  { workspace: '@esap-mfe/control-interno', appDir: 'mfe-control-interno', federationName: 'control_interno', devPort: 3110, serviceName: 'frontend-mfe-control-interno' },
  { workspace: '@esap-mfe/control-disciplinario', appDir: 'mfe-control-disciplinario', federationName: 'control_disciplinario', devPort: 3111, serviceName: 'frontend-mfe-control-disciplinario' },
  { workspace: '@esap-mfe/gestion-legal', appDir: 'mfe-gestion-legal', federationName: 'gestion_legal', devPort: 3112, serviceName: 'frontend-mfe-gestion-legal' },
];

export const frontendApps = [shellApp, ...remoteApps];

export function getRemoteEntryPath(appDir) {
  return `/remotes/${appDir}/assets/remoteEntry.js`;
}

export function getRemoteDefinitions(mode = 'serve') {
  return Object.fromEntries(
    remoteApps.map((app) => [
      app.federationName,
      mode === 'serve'
        ? `http://localhost:${app.devPort}${getRemoteEntryPath(app.appDir)}`
        : getRemoteEntryPath(app.appDir),
    ]),
  );
}

export function getBuildBase(appDir) {
  return appDir === shellApp.appDir ? '/' : `/remotes/${appDir}/`;
}

export function getBuildOutDir(appDir) {
  return appDir === shellApp.appDir
    ? path.resolve(repoRoot, 'build')
    : path.resolve(repoRoot, 'build', 'remotes', appDir);
}

export function getDockerDistDir(appDir) {
  return appDir === shellApp.appDir
    ? '/app/build'
    : `/app/build/remotes/${appDir}`;
}

export function getFrontendApp(appDir) {
  return frontendApps.find((app) => app.appDir === appDir);
}
