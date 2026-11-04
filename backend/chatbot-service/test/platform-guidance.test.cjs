const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText, filename);
};
const { platformGuidance } = require('../src/modules/chat/platform-guidance.ts');
const { institutionalGuidance } = require('../src/modules/chat/institutional-guidance.ts');
const { verifyPlatformGuidance, readSources } = require('../scripts/check-platform-guidance.cjs');

test('el catálogo del chatbot coincide con los nombres, rutas y formularios reales', () => {
  verifyPlatformGuidance(readSources());
});

test('detecta nombres obsoletos, rutas eliminadas y cambios de formulario', () => {
  const sources = readSources();
  assert.throws(() => verifyPlatformGuidance({ ...sources,
    landing: sources.landing.replace("title: 'Verificación de títulos'", "title: 'Un nombre nuevo'") }), /Nombre desactualizado/);
  assert.throws(() => verifyPlatformGuidance({ ...sources,
    app: sources.app.replaceAll('/certificacion-titulos-graduados', '/ruta-nueva') }), /ya no abre/);
  assert.throws(() => verifyPlatformGuidance({ ...sources, pages: { ...sources.pages,
    PublicTitleVerification: sources.pages.PublicTitleVerification.replaceAll('id="graduateEmail"', 'id="nuevo-correo"') } }), /cambió el campo/);
});

test('la consulta exacta y los nombres antiguos llevan al servicio actual de verificación', () => {
  for (const question of [
    'donde puedo solicitar un certificado de titulos academicos?',
    '¿Dónde puedo solicitar un certificado de títulos académicos?',
    'Dónde están los Certificados de Graduados?', 'Como obtengo una certificación de títulos?',
    'Verificación de títulos', 'Certificados de Graduados', 'Necesito verificar mi diploma',
  ]) {
    const answer = platformGuidance(question);
    assert(answer, question);
    assert(answer.includes('Servicios → Verificación de títulos'), question);
    assert(answer.includes('[Verificación de títulos](/certificacion-titulos-graduados)'), question);
    assert(!answer.includes('Certificados de Graduados') && !answer.includes('[Certificación de títulos]'), question);
    assert(!answer.includes('iniciar sesión') && !answer.includes('instantáneamente'), question);
    assert(answer.includes('validación de los registros'), question);
    assert.equal(institutionalGuidance(question, 'general'), answer, 'La alternativa sin IA debe dar las mismas instrucciones');
  }
});

test('las instrucciones de navegación no sustituyen contenido documental ni confunden certificados', () => {
  assert(platformGuidance('Como solicito mi certificado laboral?').includes('/solicitar-certificado-laboral'));
  assert(!platformGuidance('Como solicito mi certificado laboral?').includes('/certificacion-titulos-graduados'));
  for (const question of ['Según Isolución, cómo verifico títulos?', 'Cuáles son los requisitos de títulos?',
    'Objetivo del certificado laboral', 'Cómo consultar el contenido del procedimiento de verificación de títulos?']) {
    assert.equal(platformGuidance(question), undefined);
  }
});

test('la alternativa sin IA aclara certificados ambiguos sin enviarlos al formulario laboral', () => {
  for (const question of ['Certificado', 'Necesito un certificado de estudios', 'Constancia', 'Información sobre contratos laborales']) {
    const answer = institutionalGuidance(question, 'general');
    assert(!answer.includes('/solicitar-certificado-laboral'), question);
    assert(!answer.includes('Para solicitar tu certificado laboral'), question);
  }
  assert(institutionalGuidance('Certificado laboral', 'general').includes('/solicitar-certificado-laboral'));
});
