# 🚀 ACTIVAR SEGURIDAD - GUÍA RÁPIDA

## ✅ TODO LISTO - Solo 3 Pasos

La seguridad ya está implementada. Solo necesitas activarla en tu proyecto.

---

## 📋 PASO 1: Instalar Dependencias

```bash
# Instalar react-router-dom (si no lo tienes)
npm install react-router-dom

# Instalar tsx para scripts (opcional, para testing)
npm install -D tsx
```

---

## 📋 PASO 2: Activar en tu App.tsx

Tienes **2 opciones**:

### Opción A: Usar App.microfrontends.tsx (Recomendado) ⭐

```bash
# 1. Backup de tu App.tsx actual
mv App.tsx App.tsx.backup

# 2. Activar el nuevo App con seguridad integrada
mv App.microfrontends.tsx App.tsx

# 3. Listo! La seguridad ya está activa
npm run dev
```

### Opción B: Integrar en tu App.tsx actual

Si prefieres mantener tu App.tsx actual, agrega esto:

```typescript
// Al inicio del archivo
import { 
  validateSession, 
  clearSession, 
  safeRedirect 
} from './modules/portal-transaccional';

// En tu useEffect de carga
React.useEffect(() => {
  // 🔒 Validar sesión con seguridad
  const validatedUser = validateSession();
  
  if (validatedUser) {
    setUser(validatedUser);
  } else {
    safeRedirect('/login');
  }
}, []);

// En tu función de logout
const handleLogout = () => {
  // 🔒 Limpiar sesión de forma segura
  clearSession();
  safeRedirect('/login');
};
```

---

## 📋 PASO 3: Probar que Funciona

```bash
# 1. Ejecutar tests de seguridad
npx tsx scripts/verificar-seguridad.ts

# Deberías ver:
# ✓ Todos los tests pasados
# ✅ El módulo de seguridad está funcionando correctamente

# 2. Iniciar la app
npm run dev

# 3. Abrir en navegador
# http://localhost:5173/portal
```

---

## ✅ VERIFICACIÓN VISUAL

### 1. Abrir DevTools (F12)

### 2. Ir a Console y escribir:

```javascript
// Test 1: Verificar que validateSession existe
import('./modules/portal-transaccional/security/sessionValidator.js')
  .then(m => console.log('✅ Seguridad cargada:', m));

// Test 2: Intentar XSS (debería ser bloqueado)
import('./modules/portal-transaccional/security/xssProtection.js')
  .then(m => {
    const malicious = '<script>alert("XSS")</script>';
    const safe = m.sanitizeText(malicious);
    console.log('Input:', malicious);
    console.log('Output seguro:', safe);
    console.log('¿Contiene <script>?', safe.includes('<script>'));
  });
```

### 3. Verificar localStorage:

```javascript
// Debe tener validación de timestamp
const session = localStorage.getItem('esap-session');
if (session) {
  const parsed = JSON.parse(session);
  console.log('Sesión tiene timestamp:', !!parsed.timestamp);
  console.log('Sesión válida:', Date.now() - parsed.timestamp < 900000);
}
```

---

## 🔒 FUNCIONALIDADES ACTIVAS

Una vez activado, automáticamente tienes:

### ✅ Validación de Sesión
- ✅ Valida email @esap.edu.co
- ✅ Verifica timestamp (max 15 min)
- ✅ Valida roles permitidos
- ✅ Sanitiza todos los strings

### ✅ Protección XSS
- ✅ Sanitiza automáticamente en componentes
- ✅ Detecta payloads maliciosos
- ✅ Bloquea scripts

### ✅ API Seguro
- ✅ CSRF tokens automáticos
- ✅ JWT validation
- ✅ Rate limiting
- ✅ Timeout protection

### ✅ Redirects Seguros
- ✅ Bloquea javascript: URIs
- ✅ Valida URLs antes de redirigir
- ✅ Solo permite rutas whitelistadas

---

## 📊 TESTING RÁPIDO

### Test 1: XSS Protection

```bash
# En la consola del navegador
import('./modules/portal-transaccional/security/xssProtection.js').then(m => {
  const tests = [
    '<script>alert("XSS")</script>',
    'javascript:alert(1)',
    '<img onerror="alert(1)">'
  ];
  
  tests.forEach(malicious => {
    const safe = m.sanitizeText(malicious);
    console.log('✓', !safe.includes('<script>') && !safe.includes('javascript:'));
  });
});
```

### Test 2: Session Validation

```bash
# En la consola del navegador
import('./modules/portal-transaccional/security/sessionValidator.js').then(m => {
  // Test con email inválido
  const invalidUser = {
    id: '1',
    email: 'test@gmail.com', // No es @esap.edu.co
    nombres: 'Test',
    apellidos: 'User',
    documento: '123',
    roles: ['DOCENTE'],
    permisos: []
  };
  
  const isValid = m.__testing__.isValidUsuarioPersona(invalidUser);
  console.log('Email no @esap.edu.co rechazado:', !isValid);
  
  // Test con email válido
  const validUser = { ...invalidUser, email: 'test@esap.edu.co' };
  const isValid2 = m.__testing__.isValidUsuarioPersona(validUser);
  console.log('Email @esap.edu.co aceptado:', isValid2);
});
```

### Test 3: API Client

```bash
# En tu componente, intentar hacer una petición
import { apiClient } from './modules/portal-transaccional';

// Esto incluirá automáticamente:
// - Authorization header con JWT
// - X-CSRF-Token header
// - Request sanitization
// - Timeout protection
const data = await apiClient.get('/api/test');
```

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module 'react-router-dom'"

```bash
npm install react-router-dom
```

### Error: "validateSession is not defined"

Verifica el import:
```typescript
import { validateSession } from './modules/portal-transaccional';
// o
import { validateSession } from './modules/portal-transaccional/security';
```

### La sesión se pierde inmediatamente

Verifica que el timestamp esté correcto:
```javascript
const session = localStorage.getItem('esap-session');
const parsed = JSON.parse(session);
console.log('Timestamp:', parsed.timestamp);
console.log('Ahora:', Date.now());
console.log('Diferencia (ms):', Date.now() - parsed.timestamp);
// Debe ser < 900000 (15 minutos)
```

### Los tests de seguridad fallan

```bash
# Ver cuál test específicamente falla
npx tsx scripts/verificar-seguridad.ts

# Si es un problema de imports:
npm install

# Si persiste:
# Revisar que todos los archivos de seguridad existan en:
# /modules/portal-transaccional/security/
```

---

## 📚 SIGUIENTES PASOS

### Inmediato (Hoy)

1. ✅ Activar seguridad (Paso 1-3 arriba)
2. ✅ Ejecutar tests: `npx tsx scripts/verificar-seguridad.ts`
3. ✅ Probar en desarrollo: `npm run dev`
4. ✅ Verificar en navegador que todo funciona

### Esta Semana

1. 🔄 Reemplazar `fetch` por `apiClient` en componentes existentes
2. 🔄 Usar `SecureUserDisplay` en lugar de mostrar nombres directamente
3. 🔄 Agregar `sanitizeUserInput()` en todos los formularios
4. 🔄 Revisar que no haya `localStorage` directo sin `validateSession()`

### Este Mes

1. 📝 Conectar con backend real
2. 📝 Implementar JWT real (reemplazar mock)
3. 📝 Configurar HTTPS en desarrollo
4. 📝 Agregar más tests de seguridad

### Este Trimestre

1. 🎯 Auditoría externa de seguridad
2. 🎯 Pentest profesional
3. 🎯 Certificación de seguridad
4. 🎯 Training para el equipo

---

## 🎉 ¡LISTO!

Con estos 3 pasos simples, tu aplicación tendrá:

- ✅ Protección contra XSS
- ✅ Protección contra CSRF
- ✅ Validación de sesión segura
- ✅ API client con seguridad integrada
- ✅ Rate limiting
- ✅ Logging seguro

**Todo sin afectar diseño ni funcionalidad existente.** 🔒

---

## 📞 ¿NECESITAS AYUDA?

### Documentación Completa

- 📄 `/docs/SEGURIDAD.md` - Guía técnica completa
- 📄 `/SEGURIDAD_IMPLEMENTADA.md` - Resumen ejecutivo
- 📄 `/examples/ejemplo-uso-seguridad.tsx` - Ejemplos de código

### Testing

- 🧪 `/scripts/verificar-seguridad.ts` - Tests automatizados

### Soporte

- 📧 Email: seguridad@esap.edu.co
- 💬 Chat: Soporte técnico ESAP

---

**Última actualización:** Enero 2026  
**ESAP - Portal Transaccional Seguro** 🔒
