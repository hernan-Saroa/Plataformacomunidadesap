// Contrato de compilación: comprueba el catálogo del chat sin cargar el shell ni sus servicios.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const catalog = require('../src/modules/chat/platform-services.json');
const shellRoot = path.resolve(__dirname, '../../../apps/shell/src');

function parse(text) { return ts.createSourceFile('platform.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function find(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, (child) => find(child, predicate));
}
function literal(node, value) { return ts.isStringLiteral(node) && node.text === value; }
function calls(node, name, value) {
  return find(node, (item) => ts.isCallExpression(item) && item.expression.getText() === name
    && item.arguments.some((arg) => literal(arg, value)));
}
function jsxAttribute(node, name, value) {
  return find(node, (item) => ts.isJsxAttribute(item) && item.name.getText() === name
    && item.initializer && literal(item.initializer, value));
}
function component(node, name) {
  return find(node, (item) => (ts.isJsxSelfClosingElement(item) || ts.isJsxOpeningElement(item))
    && item.tagName.getText() === name);
}

function verifyPlatformGuidance(sources) {
  const landing = parse(sources.landing), app = parse(sources.app);
  const services = find(landing, (node) => ts.isVariableDeclaration(node) && node.name.getText() === 'services');
  assert(services && ts.isArrayLiteralExpression(services.initializer), 'No se encontró el catálogo visible de servicios.');
  for (const service of Object.values(sources.catalog || catalog)) {
    const card = services.initializer.elements.find((node) => calls(node, 'onNavigate', service.landingView));
    assert(card, `La portada ya no enlaza ${service.landingView}; revise la orientación del chatbot.`);
    assert(find(card, (node) => ts.isPropertyAssignment(node) && node.name.getText() === 'title'
      && literal(node.initializer, service.name)), `Nombre desactualizado en el chatbot: ${service.name}.`);
    assert(/^\/[a-z0-9/-]+$/.test(service.path), 'La ruta debe ser local y relativa al ambiente.');
    const route = find(app, (node) => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'Route'
      && jsxAttribute(node, 'path', service.path) && component(node, service.component));
    const legacyLink = find(app, (node) => ts.isIfStatement(node)
      && find(node.expression, (item) => ts.isBinaryExpression(item)
        && item.left.getText() === 'window.location.pathname' && literal(item.right, service.path))
      && calls(node.thenStatement, 'setVistaActual', service.landingView));
    assert(route || legacyLink, `La ruta ${service.path} ya no abre el servicio esperado.`);
    assert(find(app, (node) => ts.isCaseClause(node) && literal(node.expression, service.landingView)
      && component(node, service.component)), `La vista ${service.landingView} cambió de formulario.`);
    const page = parse(sources.pages[service.component]);
    for (const field of service.fields) {
      assert(jsxAttribute(page, 'id', field), `El formulario ${service.name} cambió el campo ${field}; revise sus instrucciones.`);
    }
  }
}

function readSources(root = shellRoot) {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  return {
    landing: read('components/portal/LandingPage.tsx'), app: read('App.tsx'),
    pages: Object.fromEntries(Object.values(catalog).map((service) => [service.component,
      read(`components/portal/${service.component}.tsx`)])),
  };
}

if (require.main === module) {
  if (fs.existsSync(shellRoot)) {
    verifyPlatformGuidance(readSources());
    console.log('Chatbot: nombres, enlaces y campos contrastados con el shell actual.');
  } else {
    // La imagen autónoma del microservicio no contiene los fuentes del frontend.
    console.log('Chatbot: catálogo empaquetado; ejecute platform:check en el repositorio completo antes de publicar.');
  }
}
module.exports = { verifyPlatformGuidance, readSources };
