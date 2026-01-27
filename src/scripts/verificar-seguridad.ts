/**
 * 🔒 SCRIPT DE VERIFICACIÓN DE SEGURIDAD
 * 
 * Ejecuta pruebas básicas de las funciones de seguridad implementadas.
 * Usar para validar que todo funciona correctamente.
 * 
 * USO:
 * npx tsx scripts/verificar-seguridad.ts
 */

import { 
  sanitizeText, 
  sanitizeName, 
  sanitizeEmail,
  detectXSS,
  isValidRedirectURL,
  validateJWT,
  sanitizeObject
} from '../modules/portal-transaccional/security/xssProtection';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassados = 0;
let testsFallados = 0;

function test(nombre: string, callback: () => boolean) {
  try {
    const resultado = callback();
    if (resultado) {
      console.log(`${colors.green}✓${colors.reset} ${nombre}`);
      testsPassados++;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${nombre}`);
      testsFallados++;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${nombre} - Error: ${error}`);
    testsFallados++;
  }
}

console.log(`\n${colors.cyan}🔒 VERIFICACIÓN DE SEGURIDAD ESAP${colors.reset}\n`);

// ========================================
// TESTS XSS
// ========================================
console.log(`${colors.blue}📋 Tests de Protección XSS${colors.reset}`);

test('Detecta XSS básico', () => {
  return detectXSS('<script>alert("XSS")</script>');
});

test('Detecta javascript: URI', () => {
  return detectXSS('javascript:alert(1)');
});

test('Detecta event handlers', () => {
  return detectXSS('<img onerror="alert(1)">');
});

test('Sanitiza script tags', () => {
  const malicious = '<script>alert("XSS")</script>';
  const safe = sanitizeText(malicious);
  return !safe.includes('<script>');
});

test('Sanitiza caracteres especiales', () => {
  const input = '<>"\'&/';
  const safe = sanitizeText(input);
  return !safe.includes('<') && !safe.includes('>');
});

// ========================================
// TESTS DE SANITIZACIÓN
// ========================================
console.log(`\n${colors.blue}📋 Tests de Sanitización${colors.reset}`);

test('Sanitiza nombres correctamente', () => {
  const nombre = 'Juan<script>Pérez';
  const safe = sanitizeName(nombre);
  return safe === 'JuanPérez' && !safe.includes('<script>');
});

test('Permite caracteres latinos en nombres', () => {
  const nombre = 'José María Ñoño';
  const safe = sanitizeName(nombre);
  return safe === 'José María Ñoño';
});

test('Sanitiza emails', () => {
  const email = 'test<script>@esap.edu.co';
  const safe = sanitizeEmail(email);
  return !safe.includes('<script>') && safe.includes('@');
});

test('Convierte emails a lowercase', () => {
  const email = 'TEST@ESAP.EDU.CO';
  const safe = sanitizeEmail(email);
  return safe === 'test@esap.edu.co';
});

test('Sanitiza objetos recursivamente', () => {
  const obj = {
    nombre: '<script>Test</script>',
    datos: {
      apellido: '<img src=x onerror=alert(1)>'
    }
  };
  const safe = sanitizeObject(obj);
  return !JSON.stringify(safe).includes('<script>') && 
         !JSON.stringify(safe).includes('onerror');
});

// ========================================
// TESTS DE VALIDACIÓN DE URLs
// ========================================
console.log(`\n${colors.blue}📋 Tests de Validación de URLs${colors.reset}`);

test('Rechaza javascript: URIs', () => {
  return !isValidRedirectURL('javascript:alert(1)');
});

test('Rechaza data: URIs', () => {
  return !isValidRedirectURL('data:text/html,<script>alert(1)</script>');
});

test('Acepta URLs relativas válidas', () => {
  return isValidRedirectURL('/portal/dashboard');
});

test('Acepta rutas del portal', () => {
  return isValidRedirectURL('/portal/pta');
});

test('Acepta rutas de admin', () => {
  return isValidRedirectURL('/admin/usuarios');
});

test('Rechaza URLs absolutas externas', () => {
  return !isValidRedirectURL('http://malicious.com');
});

// ========================================
// TESTS DE JWT
// ========================================
console.log(`\n${colors.blue}📋 Tests de Validación JWT${colors.reset}`);

test('Rechaza tokens vacíos', () => {
  return !validateJWT('');
});

test('Rechaza tokens inválidos', () => {
  return !validateJWT('invalid.token.here');
});

test('Rechaza tokens con formato incorrecto', () => {
  return !validateJWT('solo-una-parte');
});

test('Acepta formato JWT básico', () => {
  // JWT mock válido (solo formato, no firma)
  const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  return validateJWT(mockJWT);
});

// ========================================
// TESTS DE OBJETOS COMPLEJOS
// ========================================
console.log(`\n${colors.blue}📋 Tests de Objetos Complejos${colors.reset}`);

test('Sanitiza arrays de strings', () => {
  const arr = ['<script>test</script>', 'normal', '<img onerror=alert(1)>'];
  const safe = arr.map(item => sanitizeText(item));
  return safe.every(item => !item.includes('<script>') && !item.includes('onerror'));
});

test('Preserva datos numéricos', () => {
  const obj = { edad: 25, nombre: '<script>test</script>' };
  const safe = sanitizeObject(obj);
  return safe.edad === 25 && !safe.nombre.includes('<script>');
});

test('Preserva booleanos', () => {
  const obj = { activo: true, nombre: '<script>test</script>' };
  const safe = sanitizeObject(obj);
  return safe.activo === true;
});

// ========================================
// TESTS DE CASOS EXTREMOS
// ========================================
console.log(`\n${colors.blue}📋 Tests de Casos Extremos${colors.reset}`);

test('Maneja strings vacíos', () => {
  const safe = sanitizeText('');
  return safe === '';
});

test('Maneja null', () => {
  const safe = sanitizeText(null as any);
  return safe === '';
});

test('Maneja undefined', () => {
  const safe = sanitizeText(undefined as any);
  return safe === '';
});

test('Maneja números como input', () => {
  const safe = sanitizeText(123 as any);
  return safe === '';
});

test('Maneja strings muy largos', () => {
  const longString = 'a'.repeat(10000);
  const safe = sanitizeText(longString);
  return safe.length === 10000;
});

// ========================================
// RESUMEN
// ========================================
console.log(`\n${colors.cyan}═══════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}RESUMEN DE TESTS${colors.reset}\n`);

const total = testsPassados + testsFallados;
const porcentaje = ((testsPassados / total) * 100).toFixed(1);

console.log(`${colors.green}✓ Tests pasados:${colors.reset} ${testsPassados}/${total}`);
console.log(`${colors.red}✗ Tests fallados:${colors.reset} ${testsFallados}/${total}`);
console.log(`${colors.yellow}📊 Porcentaje:${colors.reset} ${porcentaje}%\n`);

if (testsFallados === 0) {
  console.log(`${colors.green}🎉 ¡Todos los tests pasaron!${colors.reset}`);
  console.log(`${colors.green}✅ El módulo de seguridad está funcionando correctamente.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}⚠️  Algunos tests fallaron.${colors.reset}`);
  console.log(`${colors.yellow}⚡ Revisa los errores arriba y corrige los problemas.${colors.reset}\n`);
  process.exit(1);
}
