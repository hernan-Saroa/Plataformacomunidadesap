# 🔒 DOCUMENTACIÓN DE SEGURIDAD - ESAP

## 🎯 Visión General

Esta documentación describe todas las medidas de seguridad implementadas en el Portal Transaccional de ESAP para proteger contra vulnerabilidades comunes.

---

## 🚨 Vulnerabilidades Mitigadas

### ✅ 1. Cross-Site Scripting (XSS)

**Problema:** Inyección de código JavaScript malicioso.

**Solución Implementada:**
```typescript
import { sanitizeText, sanitizeName } from '@modules/portal-transaccional/security';

// Sanitizar antes de renderizar
const safeNombre = sanitizeName(userInput.nombre);
```

**Archivos:**
- `/modules/portal-transaccional/security/xssProtection.ts`

---

### ✅ 2. Session Hijacking

**Problema:** Robo de sesiones mediante localStorage inseguro.

**Solución Implementada:**
```typescript
import { validateSession, saveSession, clearSession } from '@modules/portal-transaccional/security';

// Validar sesión con verificaciones de seguridad
const user = validateSession();

// Guardar con timestamp y validación
saveSession(user);

// Limpiar completamente al logout
clearSession();
```

**Archivos:**
- `/modules/portal-transaccional/security/sessionValidator.ts`

---

### ✅ 3. Code Injection

**Problema:** JSON.parse sin validación permite inyección.

**Solución Implementada:**
```typescript
// ❌ ANTES (vulnerable)
const session = JSON.parse(localStorage.getItem('session'));

// ✅ DESPUÉS (seguro)
import { validateSession } from '@modules/portal-transaccional/security';
const user = validateSession(); // Valida esquema completo
```

---

### ✅ 4. Open Redirect

**Problema:** window.location.href sin validación.

**Solución Implementada:**
```typescript
import { safeRedirect } from '@modules/portal-transaccional/security';

// ❌ ANTES (vulnerable)
window.location.href = userInput;

// ✅ DESPUÉS (seguro)
safeRedirect(userInput); // Solo permite URLs whitelistadas
```

---

### ✅ 5. Type Confusion

**Problema:** Uso de `any` sin validación.

**Solución Implementada:**
```typescript
// ✅ Validación estricta de tipos
function isValidUsuarioPersona(obj: any): obj is UsuarioPersona {
  if (!obj || typeof obj !== 'object') return false;
  if (!obj.id || typeof obj.id !== 'string') return false;
  // ... más validaciones
  return true;
}
```

---

### ✅ 6. JWT Vulnerabilities

**Problema:** Tokens sin validación de formato/expiración.

**Solución Implementada:**
```typescript
import { validateJWT } from '@modules/portal-transaccional/security';

const token = localStorage.getItem('auth-token');
if (!validateJWT(token)) {
  // Token inválido - limpiar sesión
  clearSession();
}
```

---

### ✅ 7. Rate Limiting

**Problema:** Ataques de fuerza bruta sin límite.

**Solución Implementada:**
```typescript
import { rateLimiter } from '@modules/portal-transaccional/security';

if (!rateLimiter.isAllowed('login')) {
  throw new Error('Demasiados intentos');
}
```

---

### ✅ 8. CSRF (Cross-Site Request Forgery)

**Problema:** Peticiones maliciosas desde otros sitios.

**Solución Implementada:**
```typescript
// API Client incluye CSRF token automáticamente
import { apiClient } from '@modules/portal-transaccional/security';

await apiClient.post('/api/data', { ... }); // CSRF token automático
```

---

### ✅ 9. Sensitive Data Exposure

**Problema:** Logs exponen información sensible.

**Solución Implementada:**
```typescript
import { secureLog } from '@modules/portal-transaccional/security';

// ❌ ANTES
console.error('Error:', user.documento, user.email);

// ✅ DESPUÉS
secureLog('error', 'User validation failed'); // Sin datos sensibles
```

---

### ✅ 10. Insecure Direct Object Reference (IDOR)

**Problema:** Lógica de negocio en cliente permite manipulación.

**Solución Implementada:**
```typescript
// ❌ ANTES (vulnerable)
const pendientes = localStorage.getItem('pendientes'); // Usuario puede editar

// ✅ DESPUÉS (seguro)
const pendientes = await apiClient.get('/api/tareas/pendientes'); // Solo desde API
```

---

## 🛡️ Capas de Seguridad Implementadas

### Capa 1: Validación de Entrada

```typescript
import { sanitizeUserInput } from '@modules/portal-transaccional/security';

const input = {
  nombres: userInput.nombres,
  email: userInput.email
};

const sanitized = sanitizeUserInput(input);
```

### Capa 2: Validación de Sesión

```typescript
import { validateSession } from '@modules/portal-transaccional/security';

// En cada carga de la app
const user = validateSession();
if (!user) {
  // Redirigir a login
}
```

### Capa 3: Validación de Permisos

```typescript
import { PortalRoute } from '@modules/portal-transaccional';

<PortalRoute 
  user={user}
  requiredRole="DOCENTE"
  requiredPermission="pta:create"
>
  <MiPTA />
</PortalRoute>
```

### Capa 4: API Client Seguro

```typescript
import { apiClient } from '@modules/portal-transaccional/security';

// Incluye: CSRF, JWT validation, rate limiting, sanitization
const data = await apiClient.get('/api/data');
```

### Capa 5: Sanitización de Output

```typescript
import { SecureUserDisplay } from '@modules/portal-transaccional/security';

<SecureUserDisplay 
  nombres={user.nombres}
  apellidos={user.apellidos}
/>
```

---

## 📋 Checklist de Seguridad

### Para Desarrolladores

- [ ] **Nunca** usar `any` sin validación
- [ ] **Nunca** usar `JSON.parse` sin try-catch y validación
- [ ] **Nunca** usar `localStorage` para lógica de negocio
- [ ] **Siempre** sanitizar inputs del usuario
- [ ] **Siempre** validar sesión en cada carga
- [ ] **Siempre** usar `apiClient` para peticiones HTTP
- [ ] **Siempre** usar `safeRedirect` en lugar de `window.location.href`
- [ ] **Siempre** validar roles/permisos antes de mostrar contenido
- [ ] **Nunca** exponer información sensible en logs
- [ ] **Siempre** usar HTTPS en producción

### Para Code Reviews

- [ ] ¿Se validan todos los inputs del usuario?
- [ ] ¿Se sanitizan strings antes de renderizar?
- [ ] ¿Se valida la sesión correctamente?
- [ ] ¿Se usan tipos TypeScript estrictos?
- [ ] ¿Se maneja correctamente localStorage?
- [ ] ¿Se previenen open redirects?
- [ ] ¿Se incluyen CSRF tokens en peticiones POST?
- [ ] ¿Se validan JWTs correctamente?
- [ ] ¿Se implementa rate limiting?
- [ ] ¿No se expone información sensible?

---

## 🔧 Configuración de Seguridad

### Variables de Entorno

```env
# API
VITE_API_URL=https://api.esap.edu.co

# Seguridad
VITE_SESSION_MAX_AGE=900000  # 15 minutos
VITE_ENABLE_RATE_LIMITING=true
VITE_MAX_LOGIN_ATTEMPTS=5

# Producción
NODE_ENV=production
```

### Headers HTTP Recomendados

```typescript
// En tu servidor (Express, Nginx, etc.)
import { SECURITY_HEADERS, CSP_HEADERS } from '@modules/portal-transaccional/security';

app.use((req, res, next) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Security-Policy', CSP_HEADERS['Content-Security-Policy']);
  next();
});
```

---

## 🧪 Testing de Seguridad

### Test de XSS

```typescript
import { detectXSS, sanitizeText } from '@modules/portal-transaccional/security';

const maliciousInput = '<script>alert("XSS")</script>';

test('debe detectar XSS', () => {
  expect(detectXSS(maliciousInput)).toBe(true);
});

test('debe sanitizar XSS', () => {
  const safe = sanitizeText(maliciousInput);
  expect(safe).not.toContain('<script>');
});
```

### Test de Sesión

```typescript
import { validateSession, saveSession } from '@modules/portal-transaccional/security';

test('debe rechazar sesión expirada', () => {
  // Simular sesión antigua
  const oldSession = {
    usuario: mockUser,
    timestamp: Date.now() - 20 * 60 * 1000 // 20 minutos
  };
  localStorage.setItem('esap-session', JSON.stringify(oldSession));
  
  expect(validateSession()).toBeNull();
});
```

---

## 🚀 Uso en Producción

### 1. Habilitar HTTPS

```nginx
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  # Headers de seguridad
  add_header X-Frame-Options "DENY";
  add_header X-Content-Type-Options "nosniff";
  add_header X-XSS-Protection "1; mode=block";
}
```

### 2. Configurar CSP

```html
<!-- En tu index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```

### 3. Habilitar Logging Externo

```typescript
import { secureLog } from '@modules/portal-transaccional/security';

// Configurar servicio de logging
if (process.env.NODE_ENV === 'production') {
  // Enviar a DataDog, Sentry, etc.
  secureLog('error', 'Production error');
}
```

---

## 📞 Reporte de Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad:

1. **NO** la publiques públicamente
2. Envía un email a: **seguridad@esap.edu.co**
3. Incluye:
   - Descripción detallada
   - Pasos para reproducir
   - Impacto potencial
   - Sugerencias de solución (opcional)

---

## 📚 Recursos Adicionales

### OWASP Top 10

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

### Mejores Prácticas

- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [TypeScript Security](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)

---

## ✅ Estado de Implementación

| Vulnerabilidad | Estado | Archivo |
|----------------|--------|---------|
| XSS | ✅ Mitigado | `xssProtection.ts` |
| Session Hijacking | ✅ Mitigado | `sessionValidator.ts` |
| Code Injection | ✅ Mitigado | `sessionValidator.ts` |
| Open Redirect | ✅ Mitigado | `sessionValidator.ts` |
| Type Confusion | ✅ Mitigado | `sessionValidator.ts` |
| JWT Vulnerabilities | ✅ Mitigado | `sessionValidator.ts` |
| Rate Limiting | ✅ Implementado | `sessionValidator.ts` |
| CSRF | ✅ Mitigado | `secureApiClient.ts` |
| Sensitive Data Exposure | ✅ Mitigado | `sessionValidator.ts` |
| IDOR | ✅ Documentado | Este archivo |

---

**Última actualización:** Enero 2026  
**ESAP - Seguridad del Portal Transaccional**
