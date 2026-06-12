# Plan de Pruebas — Inicio de Sesión | Plataforma Comunidades ESAP

**Versión:** 1.0  
**Fecha:** 2026-06-03  
**Endpoint:** `POST /auth/api/v1/login`  
**Responsable:** Equipo QA  

---

## 1. Datos de Prueba

| Campo | Valor válido |
|---|---|
| **Email** | `superuser@esap.edu.co` |
| **Contraseña** | `Esap.2026*` |
| **Base URL** | `http://localhost:3001` (directo) o `http://localhost:4000/auth/api/v1` (Gateway) |

### Parámetros de seguridad del sistema (según código)

| Parámetro | Valor por defecto | Variable de entorno |
|---|---|---|
| Rate Limit por IP (ventana) | 15 minutos | `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` |
| Rate Limit por IP (máx intentos) | **5** | `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS` |
| Bloqueo de cuenta (umbral) | **10 intentos fallidos** | `AUTH_LOGIN_ACCOUNT_LOCK_THRESHOLD` |
| Bloqueo de cuenta (duración) | **15 minutos** | `AUTH_LOGIN_ACCOUNT_LOCK_MS` |
| JWT TTL | 1 hora | Código fijo |
| Cookie | `esap_access_token` (HttpOnly, SameSite=Lax) | - |

---

## 2. Casos de Prueba Funcionales (Login Correcto)

### TC-001: Login exitoso con credenciales válidas
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "Esap.2026*" }

✅ Esperado: HTTP 200
  - Response contiene: { accessToken, user: { id, username, roles, modules, permissions } }
  - Header Set-Cookie contiene: esap_access_token=...
  - Cookie es HttpOnly
  - user.roles incluye SUPER_ADMIN
```

### TC-002: Login con email en mayúsculas (case insensitive)
```
POST /login
Body: { "email": "SUPERUSER@ESAP.EDU.CO", "password": "Esap.2026*" }

✅ Esperado: HTTP 200 (el sistema normaliza a minúsculas)
```

### TC-003: Login con email con espacios
```
POST /login
Body: { "email": "  superuser@esap.edu.co  ", "password": "Esap.2026*" }

✅ Esperado: HTTP 200 (el sistema hace trim)
```

### TC-004: Login usando campo `username` en vez de `email`
```
POST /login
Body: { "username": "superuser@esap.edu.co", "password": "Esap.2026*" }

✅ Esperado: HTTP 200 (el DTO acepta email o username)
```

### TC-005: Verificación de headers de Rate Limit en login exitoso
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "Esap.2026*" }

✅ Esperado: HTTP 200
  - Header X-RateLimit-Limit: 5
  - Header X-RateLimit-Remaining: 4
  - Header X-RateLimit-Reset: <unix timestamp>
  - Header Retry-After: AUSENTE
```

---

## 3. Casos de Prueba de Contraseña Incorrecta

### TC-010: Contraseña incorrecta (1er intento)
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "contraseñaMala1" }

❌ Esperado: HTTP 401
  - Mensaje: "Correo o contrasena incorrectos. Te quedan 9 intentos."
```

### TC-011: Contraseña correcta con carácter faltante
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "Esap.2026" }

❌ Esperado: HTTP 401 (falta el * al final)
```

### TC-012: Contraseña con case invertido
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "eSAP.2026*" }

❌ Esperado: HTTP 401 (bcrypt es case-sensitive)
```

### TC-013: Contraseña con espacios extras
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": " Esap.2026* " }

❌ Esperado: HTTP 401 (bcrypt compara exacto, sin trim)
```

### TC-014: Contraseña vacía
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "" }

❌ Esperado: HTTP 400 (validación DTO @IsString)
```

### TC-015: Sin campo password
```
POST /login
Body: { "email": "superuser@esap.edu.co" }

❌ Esperado: HTTP 400 (campo requerido)
```

---

## 4. Casos de Prueba de Usuario Inexistente

### TC-020: Email no registrado
```
POST /login
Body: { "email": "noexiste@esap.edu.co", "password": "Esap.2026*" }

❌ Esperado: HTTP 401
  - Mensaje: "Credenciales inválidas"
  - ⚠ NO debe revelar si el email existe o no (respuesta genérica)
```

### TC-021: Email con dominio externo
```
POST /login
Body: { "email": "superuser@gmail.com", "password": "Esap.2026*" }

❌ Esperado: HTTP 401
  - Verificar que el frontend bloquea dominio no @esap.edu.co
  - El backend también debe rechazar
```

### TC-022: Sin email ni username
```
POST /login
Body: { "password": "Esap.2026*" }

❌ Esperado: HTTP 401
  - Mensaje: "Se requiere email o username"
```

### TC-023: Body completamente vacío
```
POST /login
Body: {}

❌ Esperado: HTTP 400 o 401
```

---

## 5. Pruebas de Fuerza Bruta (Rate Limiting por IP)

### TC-030: Alcanzar límite de Rate Limit por IP (5 intentos)
```
Ejecutar 6 veces consecutivas con contraseña incorrecta:
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "wrongpassword" }

Intentos 1-5: HTTP 401 con X-RateLimit-Remaining decreciendo: 4, 3, 2, 1, 0
Intento 6:   ❌ HTTP 429
  - Mensaje: "Demasiados intentos de inicio de sesion..."
  - Header Retry-After: <segundos restantes>
```

### TC-031: Verificar desbloqueo tras ventana de Rate Limit
```
1. Alcanzar rate limit (TC-030)
2. Esperar 15 minutos (o modificar AUTH_LOGIN_RATE_LIMIT_WINDOW_MS a 10000 para test)
3. Intentar login con credenciales correctas

✅ Esperado: HTTP 200 (rate limit reseteado)
```

### TC-032: Login correcto limpia el Rate Limit
```
1. Hacer 3 intentos fallidos (queda X-RateLimit-Remaining: 1)
2. Login exitoso con credenciales correctas
3. Hacer otro intento fallido

✅ Esperado: En paso 3, X-RateLimit-Remaining: 4 (se reseteó)
```

---

## 6. Pruebas de Bloqueo de Cuenta (Account Lock)

### TC-040: Alcanzar bloqueo de cuenta (10 intentos fallidos consecutivos)
```
Ejecutar 10+ intentos fallidos (puede requerir variar IP o resetear rate limit):
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "wrongX" } (X = 1..10)

Intentos 1-9: HTTP 401 con "Te quedan N intentos"
Intento 10:  ❌ HTTP 429
  - Mensaje: "La cuenta esta temporalmente bloqueada por seguridad..."
  - Header Retry-After: ~900 (15 min)
```

### TC-041: Login correcto limpia intentos fallidos
```
1. Hacer 5 intentos fallidos
2. Login exitoso con credenciales correctas
3. Hacer 1 intento fallido

✅ Esperado: En paso 3, el contador muestra "Te quedan 9 intentos" (se reseteó)
```

### TC-042: Bloqueo persiste con credenciales correctas
```
1. Alcanzar bloqueo de cuenta (TC-040)
2. Intentar login con credenciales CORRECTAS

❌ Esperado: HTTP 429 (la cuenta sigue bloqueada aunque la contraseña sea correcta)
```

---

## 7. Pruebas de Inyección y Payloads Maliciosos

### TC-050: SQL Injection en email
```
POST /login
Body: { "email": "superuser@esap.edu.co' OR '1'='1", "password": "Esap.2026*" }

❌ Esperado: HTTP 401 (no debe ejecutar SQL)
  - El sistema usa TypeORM con parámetros preparados
```

### TC-051: SQL Injection en password
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "' OR '1'='1' --" }

❌ Esperado: HTTP 401 (bcrypt.compare rechaza)
```

### TC-052: NoSQL Injection attempt
```
POST /login
Body: { "email": {"$gt": ""}, "password": {"$gt": ""} }

❌ Esperado: HTTP 400 (validación DTO @IsString rechaza objeto)
```

### TC-053: XSS en campo email
```
POST /login
Body: { "email": "<script>alert('xss')</script>@esap.edu.co", "password": "Esap.2026*" }

❌ Esperado: HTTP 401 (no se ejecuta script, email no existe)
  - Verificar que la respuesta NO refleja el HTML sin sanitizar
```

### TC-054: Payload extremadamente largo
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "A".repeat(100000) }

❌ Esperado: HTTP 401 o 413 (Payload Too Large)
  - No debe causar timeout o crash del servidor
```

### TC-055: Caracteres Unicode / null bytes
```
POST /login
Body: { "email": "superuser@esap.edu.co", "password": "Esap.2026*\u0000admin" }

❌ Esperado: HTTP 401 (null byte no trunca la comparación bcrypt)
```

### TC-056: Body con Content-Type incorrecto
```
POST /login
Content-Type: text/plain
Body: email=superuser@esap.edu.co&password=Esap.2026*

❌ Esperado: HTTP 400 o 415 (NestJS espera application/json)
```

---

## 8. Pruebas de Sesión y Token JWT

### TC-060: Token JWT tiene TTL de 1 hora
```
1. Login exitoso
2. Decodificar el JWT (base64)
3. Verificar que exp - iat = 3600 segundos

✅ Esperado: TTL = 3600s
```

### TC-061: Verify endpoint con token válido
```
GET /verify
Header: Cookie: esap_access_token=<token_del_login>

✅ Esperado: HTTP 200 con datos del usuario
```

### TC-062: Verify endpoint sin token
```
GET /verify
(sin cookie ni header Authorization)

❌ Esperado: HTTP 401
```

### TC-063: Verify endpoint con token expirado
```
GET /verify
Cookie: esap_access_token=<token_expirado>

❌ Esperado: HTTP 401
```

### TC-064: Verify endpoint con token manipulado
```
1. Login exitoso, obtener token
2. Modificar el payload del JWT (cambiar el userId)
3. Re-codificar (sin saber el secret)

GET /verify
Cookie: esap_access_token=<token_manipulado>

❌ Esperado: HTTP 401 (firma inválida)
```

### TC-065: Cookie HttpOnly no accesible desde JavaScript
```
1. Login exitoso en el navegador
2. Ejecutar en consola: document.cookie

✅ Esperado: "esap_access_token" NO aparece en document.cookie
```

### TC-066: Refresh con token expirado (ventana de gracia)
```
POST /refresh
Cookie: esap_access_token=<token_expirado_dentro_de_24h>

✅ Esperado: HTTP 200 con nuevo token (el refresh acepta tokens expirados)
```

### TC-067: Logout limpia cookie
```
POST /logout
Cookie: esap_access_token=<token_válido>

✅ Esperado: HTTP 200
  - Header Set-Cookie borra esap_access_token (Max-Age=0)
```

---

## 9. Pruebas de Flujo de Recuperación de Contraseña

### TC-070: Forgot password con email válido
```
POST /forgot-password
Body: { "email": "superuser@esap.edu.co" }

✅ Esperado: HTTP 200
  - Mensaje: "Código generado y enviado"
  - expiresInSeconds: 600 (10 min)
```

### TC-071: Forgot password con email no registrado
```
POST /forgot-password
Body: { "email": "noexiste@esap.edu.co" }

❌ Esperado: HTTP 400
  - Mensaje: "No existe un usuario asociado a ese correo"
```

### TC-072: Reset password desbloquea la cuenta
```
1. Alcanzar bloqueo de cuenta (TC-040)
2. Ejecutar forgot-password + reset-password exitoso
3. Login con nueva contraseña

✅ Esperado: HTTP 200 (el reset limpia los intentos fallidos)
```

---

## 10. Pruebas de Frontend (Validaciones del Formulario)

### TC-080: Email sin @
```
Ingresar: "superuseresap.edu.co"
Click "Ingresar"

❌ Esperado: Error de validación "Ingrese un correo válido" (NO llega al backend)
```

### TC-081: Email de dominio externo (frontend)
```
Ingresar: "superuser@gmail.com"
Click "Ingresar"

❌ Esperado: Error "Solo se permiten correos institucionales @esap.edu.co"
```

### TC-082: Contraseña menor a 6 caracteres (frontend)
```
Ingresar: email válido + password "12345"
Click "Ingresar"

❌ Esperado: Error "La contraseña debe tener al menos 6 caracteres"
```

### TC-083: Campos vacíos
```
Click "Ingresar" sin llenar nada

❌ Esperado: Errores en ambos campos
```

### TC-084: Indicador de intentos restantes (frontend)
```
1. Ingresar 7 intentos fallidos
2. Verificar que aparece el banner de advertencia con AlertTriangle
3. Verificar que muestra "Te quedan N intentos"

✅ Esperado: Banner rojo visible cuando remaining ≤ 3
```

### TC-085: Mensaje 429 en frontend
```
1. Alcanzar rate limit o bloqueo de cuenta
2. Verificar que aparece toast "Demasiados intentos"

✅ Esperado: Toast de error con duración 7 segundos
```

---

## 11. Script de Prueba Automatizada (cURL)

```bash
#!/bin/bash
# =============================================================================
# Script de pruebas de seguridad del login - Plataforma ESAP
# Ajustar BASE_URL según el entorno
# =============================================================================

BASE_URL="http://localhost:4000/auth/api/v1"

echo "============================================"
echo " PLAN DE PRUEBAS - LOGIN ESAP"
echo "============================================"

# --- TC-001: Login exitoso ---
echo ""
echo "▶ TC-001: Login exitoso"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superuser@esap.edu.co","password":"Esap.2026*"}' \
  -c cookies.txt \
  | head -5

# --- TC-010: Contraseña incorrecta ---
echo ""
echo "▶ TC-010: Contraseña incorrecta"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superuser@esap.edu.co","password":"contraseñaMala"}'

# --- TC-011: Contraseña sin carácter final ---
echo ""
echo "▶ TC-011: Contraseña sin asterisco"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superuser@esap.edu.co","password":"Esap.2026"}'

# --- TC-012: Case invertido ---
echo ""
echo "▶ TC-012: Case invertido"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superuser@esap.edu.co","password":"eSAP.2026*"}'

# --- TC-020: Usuario no existente ---
echo ""
echo "▶ TC-020: Usuario no existente"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"hackerfalso@esap.edu.co","password":"Esap.2026*"}'

# --- TC-022: Sin email ---
echo ""
echo "▶ TC-022: Sin email ni username"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"Esap.2026*"}'

# --- TC-050: SQL Injection en email ---
echo ""
echo "▶ TC-050: SQL Injection en email"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"superuser@esap.edu.co' OR '1'='1\",\"password\":\"Esap.2026*\"}"

# --- TC-051: SQL Injection en password ---
echo ""
echo "▶ TC-051: SQL Injection en password"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"superuser@esap.edu.co\",\"password\":\"' OR '1'='1' --\"}"

# --- TC-053: XSS en email ---
echo ""
echo "▶ TC-053: XSS en email"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@esap.edu.co","password":"Esap.2026*"}'

# --- TC-056: Content-Type incorrecto ---
echo ""
echo "▶ TC-056: Content-Type text/plain"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/login" \
  -H "Content-Type: text/plain" \
  -d 'email=superuser@esap.edu.co&password=Esap.2026*'

# --- TC-030: Fuerza bruta (6 intentos rápidos) ---
echo ""
echo "▶ TC-030: Rate Limit - 6 intentos consecutivos"
for i in $(seq 1 6); do
  echo "  Intento $i:"
  curl -s -w "  HTTP: %{http_code}\n" \
    -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"superuser@esap.edu.co","password":"wrongpass"}' \
    -D - 2>/dev/null | grep -E "X-RateLimit|Retry-After|HTTP:" | head -5
  echo ""
done

# --- TC-061: Verify con token válido ---
echo ""
echo "▶ TC-061: Verify con cookie"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X GET "$BASE_URL/verify" \
  -b cookies.txt

# --- TC-062: Verify sin token ---
echo ""
echo "▶ TC-062: Verify sin token"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X GET "$BASE_URL/verify"

# --- TC-067: Logout ---
echo ""
echo "▶ TC-067: Logout"
curl -s -w "\nHTTP_CODE: %{http_code}\n" \
  -X POST "$BASE_URL/logout" \
  -b cookies.txt \
  -D - 2>/dev/null | grep -i "set-cookie"

echo ""
echo "============================================"
echo " PRUEBAS COMPLETADAS"
echo "============================================"

# Limpiar
rm -f cookies.txt
```

---

## 12. Matriz de Resultados

| ID | Descripción | Esperado | Resultado | Estado | Notas |
|---|---|---|---|---|---|
| TC-001 | Login exitoso | 200 | | ⬜ | |
| TC-002 | Email mayúsculas | 200 | | ⬜ | |
| TC-003 | Email con espacios | 200 | | ⬜ | |
| TC-004 | Campo username | 200 | | ⬜ | |
| TC-005 | Headers Rate Limit | 200 + headers | | ⬜ | |
| TC-010 | Contraseña incorrecta | 401 | | ⬜ | |
| TC-011 | Falta carácter | 401 | | ⬜ | |
| TC-012 | Case invertido | 401 | | ⬜ | |
| TC-013 | Espacios en password | 401 | | ⬜ | |
| TC-014 | Password vacío | 400 | | ⬜ | |
| TC-015 | Sin campo password | 400 | | ⬜ | |
| TC-020 | Email no registrado | 401 | | ⬜ | |
| TC-021 | Dominio externo | 401 | | ⬜ | |
| TC-022 | Sin email/username | 401 | | ⬜ | |
| TC-023 | Body vacío | 400/401 | | ⬜ | |
| TC-030 | Rate Limit 5+ intentos | 429 | | ⬜ | |
| TC-031 | Desbloqueo tras ventana | 200 | | ⬜ | |
| TC-032 | Login limpia Rate Limit | 200 | | ⬜ | |
| TC-040 | Bloqueo 10 intentos | 429 | | ⬜ | |
| TC-041 | Login limpia intentos | 200 | | ⬜ | |
| TC-042 | Bloqueo + cred correctas | 429 | | ⬜ | |
| TC-050 | SQL Injection email | 401 | | ⬜ | |
| TC-051 | SQL Injection password | 401 | | ⬜ | |
| TC-052 | NoSQL Injection | 400 | | ⬜ | |
| TC-053 | XSS en email | 401 | | ⬜ | |
| TC-054 | Payload largo | 401/413 | | ⬜ | |
| TC-055 | Null bytes | 401 | | ⬜ | |
| TC-056 | Content-Type malo | 400/415 | | ⬜ | |
| TC-060 | JWT TTL 1h | exp-iat=3600 | | ⬜ | |
| TC-061 | Verify con token | 200 | | ⬜ | |
| TC-062 | Verify sin token | 401 | | ⬜ | |
| TC-063 | Token expirado | 401 | | ⬜ | |
| TC-064 | Token manipulado | 401 | | ⬜ | |
| TC-065 | Cookie HttpOnly | No en JS | | ⬜ | |
| TC-066 | Refresh expirado | 200 | | ⬜ | |
| TC-067 | Logout limpia cookie | 200 | | ⬜ | |
| TC-070 | Forgot password | 200 | | ⬜ | |
| TC-071 | Forgot email inexist. | 400 | | ⬜ | |
| TC-072 | Reset desbloquea | 200 | | ⬜ | |
| TC-080 | Frontend: sin @ | Error UI | | ⬜ | |
| TC-081 | Frontend: dominio ext. | Error UI | | ⬜ | |
| TC-082 | Frontend: pass <6 | Error UI | | ⬜ | |
| TC-083 | Frontend: campos vacíos | Error UI | | ⬜ | |
| TC-084 | Frontend: banner alert | Banner rojo | | ⬜ | |
| TC-085 | Frontend: toast 429 | Toast error | | ⬜ | |

---

## 13. Hallazgos de Seguridad Conocidos (por revisar)

> ⚠️ **JWT_SECRET hardcoded**: El código usa `'esap-super-secret-jwt-key-2024'` como fallback si `JWT_SECRET` no está configurado. En producción DEBE existir la variable de entorno.

> ⚠️ **Rate Limit en memoria**: El `LoginProtectionService` almacena contadores en `Map` en memoria. Si se reinicia el servidor, todos los bloqueos se pierden. Considerar Redis para producción.

> ⚠️ **Credenciales de prueba en frontend**: El componente `LoginPage.tsx` (líneas 130-139) contiene una lista hardcoded de credenciales de prueba visibles en la UI de producción. Eliminar antes de despliegue.
