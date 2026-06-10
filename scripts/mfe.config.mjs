import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformWithEsbuild } from 'vite';

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
  { workspace: '@esap-mfe/pta', appDir: 'mfe-pta', federationName: 'pta', devPort: 3113, serviceName: 'frontend-mfe-pta' },
];

export const frontendApps = [shellApp, ...remoteApps];

export function getRemoteEntryPath(appDir) {
  return `/remotes/${appDir}/assets/remoteEntry.js`;
}

export function getRemoteDefinitions(mode = 'serve') {
  return Object.fromEntries(
    remoteApps.map((app) => [
      app.federationName,
      getRemoteEntryPath(app.appDir),
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

const cspNonceBootstrapSource = `(() => {
  const meta = document.querySelector('meta[name="csp-nonce"]');
  const currentScript = document.currentScript;
  const scriptNonce = currentScript && (currentScript.nonce || currentScript.getAttribute('nonce'));
  const metaNonce = meta && meta.content && meta.content.trim();
  const nonce = (scriptNonce || metaNonce || '').trim();

  if (!nonce || nonce === '__ESAP_CSP_NONCE__') return;

  globalThis.__webpack_nonce__ = nonce;
  globalThis.__esapCspNonce = nonce;

  const applyNonce = (node) => {
    if (!node || node.nodeType !== 1) return node;
    if (String(node.tagName).toLowerCase() === 'style' && (node.nonce || node.getAttribute('nonce')) !== nonce) {
      node.setAttribute('nonce', nonce);
      node.nonce = nonce;
    }
    return node;
  };

  const applyNonceTree = (node) => {
    applyNonce(node);
    if (node && typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('style').forEach(applyNonce);
    }
    return node;
  };

  if (!globalThis.__ESAP_CSP_NONCE_PATCHED__) {
    globalThis.__ESAP_CSP_NONCE_PATCHED__ = true;

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function createElementWithCspNonce(tagName, options) {
      return applyNonce(originalCreateElement(tagName, options));
    };

    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function appendChildWithCspNonce(child) {
      return originalAppendChild.call(this, applyNonceTree(child));
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function insertBeforeWithCspNonce(newNode, referenceNode) {
      return originalInsertBefore.call(this, applyNonceTree(newNode), referenceNode);
    };

    const originalReplaceChild = Node.prototype.replaceChild;
    Node.prototype.replaceChild = function replaceChildWithCspNonce(newChild, oldChild) {
      return originalReplaceChild.call(this, applyNonceTree(newChild), oldChild);
    };

    const originalAppend = Element.prototype.append;
    Element.prototype.append = function appendWithCspNonce(...nodes) {
      nodes.forEach(applyNonceTree);
      return originalAppend.apply(this, nodes);
    };

    const originalPrepend = Element.prototype.prepend;
    Element.prototype.prepend = function prependWithCspNonce(...nodes) {
      nodes.forEach(applyNonceTree);
      return originalPrepend.apply(this, nodes);
    };

    const originalInsertAdjacentElement = Element.prototype.insertAdjacentElement;
    Element.prototype.insertAdjacentElement = function insertAdjacentElementWithCspNonce(position, element) {
      return originalInsertAdjacentElement.call(this, position, applyNonceTree(element));
    };
  }

  document.querySelectorAll('style').forEach(applyNonce);
})();
`;

export function cspNonceBootstrap(appDir) {
  const scriptPath = `${getBuildBase(appDir)}csp-nonce.js`;

  return {
    name: 'esap-csp-nonce-bootstrap',
    transformIndexHtml(html) {
      if (html.includes('csp-nonce.js')) return html;

      return html.replace(
        /(<meta\s+name=["']csp-nonce["'][^>]*>)/i,
        `$1\n      <script nonce="__ESAP_CSP_NONCE__" src="${scriptPath}"></script>`,
      );
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'csp-nonce.js',
        source: cspNonceBootstrapSource,
      });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url ? req.url.split('?')[0] : '';
        if (requestPath !== scriptPath) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.end(cspNonceBootstrapSource);
      });
    },
  };
}

export function stripBundleComments() {
  return {
    name: 'strip-bundle-comments',
    async renderChunk(code, chunk) {
      const result = await transformWithEsbuild(code, chunk.fileName, {
        charset: 'utf8',
        format: 'esm',
        legalComments: 'none',
        loader: 'js',
        minifyWhitespace: true,
        target: 'esnext',
      });

      return { code: result.code, map: null };
    },
  };
}
