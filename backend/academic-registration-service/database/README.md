# Base de Datos - Sistema de Validación de Certificados de Graduados

## Esquema: `academic_registration`

Este esquema maneja todo el sistema de validación y emisión de certificados para graduados de la ESAP.

## 📋 Tablas Principales

### 1. **graduates** (Graduados)
Almacena información completa de todos los egresados de la institución.

**Campos principales:**
- `id`: UUID único
- `person_id`: Relación con el sistema de autenticación
- `id_number`: Cédula del graduado (único)
- `program_id`: Programa académico cursado
- `graduation_date`: Fecha de graduación
- `diploma_number`: Número único del diploma
- `status`: ACTIVE | REVOKED | SUSPENDED

**Casos de uso:**
- Verificar si una persona es graduado
- Obtener historial académico
- Validar información para certificados

---

### 2. **graduation_certificate_requests** (Solicitudes)
Gestiona las solicitudes de certificados, tanto de graduados como de terceros (empresas).

**Campos principales:**
- `request_number`: Número único de solicitud (ej: GC-2025-0001)
- `requester_type`: GRADUATE | COMPANY
- `id_number`: Cédula del graduado
- `validation_code`: Código temporal para validar identidad
- `status`: PENDING | VALIDATED | PROCESSING | COMPLETED | REJECTED

**Flujo:**
1. Usuario ingresa cédula y fecha de graduación
2. Sistema valida datos contra tabla `graduates`
3. Si es graduado válido:
   - Genera código de validación
   - Envía código por email
4. Usuario ingresa código
5. Sistema marca solicitud como VALIDATED
6. Se genera el certificado

---

### 3. **graduation_certificates** (Certificados)
Almacena todos los certificados de grado emitidos.

**Campos principales:**
- `certificate_number`: Número único (ej: CERT-GR-2025-0001)
- `verification_code`: Código QR único para validación pública
- `request_id`: Relación con la solicitud
- `pdf_url`: URL del PDF generado
- `status`: VALID | REVOKED | EXPIRED

**Características:**
- Cada certificado tiene un QR único para validación
- Se puede revocar si se detecta fraude
- Almacena instantánea de datos (no depende de `graduates`)

---

### 4. **certificate_validations** (Validaciones)
Registra cada vez que alguien valida un certificado usando el QR.

**Campos principales:**
- `certificate_id`: Certificado validado
- `validation_date`: Cuándo se validó
- `ip_address`: IP del validador
- `result`: VALID | REVOKED | EXPIRED | NOT_FOUND

**Utilidad:**
- Trazabilidad de validaciones
- Detectar intentos de fraude
- Estadísticas de uso

---

### 5. **signers** (Firmantes)
Personas autorizadas para firmar certificados.

**Campos principales:**
- `full_name`: Nombre del firmante
- `position`: Cargo (ej: "Director de Verificación de títulos")
- `signature_url`: URL de la firma digital
- `is_primary`: Si es el firmante principal por defecto

---

### 6. **certificate_template_config** (Configuración de Plantilla)
Configuración visual de los certificados (similar a certificados laborales).

**Campos principales:**
- `signer_id`: Firmante asociado
- `institution_logo_url`: Logo de la ESAP
- `certificate_content_html`: HTML del contenido con variables
- `status`: draft | published

**Variables disponibles en el HTML:**
- `[NOMBRE_COMPLETO]`
- `[DOCUMENTO]`
- `[PROGRAMA]`
- `[TITULO]`
- `[FECHA_GRADO]`
- `[ACTA]`
- `[DIPLOMA]`

---

### 7. **template_config_changes** (Cambios en Plantilla)
Historial de cambios en la configuración de plantillas.

**Campos principales:**
- `template_config_id`: Plantilla modificada
- `change_type`: CREATED | UPDATED | PUBLISHED | REVERTED
- `field_changed`: Campo modificado
- `changed_by`: Quién hizo el cambio

---

## 🔄 Flujos Principales

### Flujo 1: Graduado Solicita Certificado (Autoservicio)

```
1. Usuario ingresa:
   - Cédula
   - Fecha de expedición del diploma

2. Sistema busca en `graduates`:
   - Si NO existe → Mensaje: "Solicitud de revisión manual"
   - Si existe → Continúa

3. Sistema crea registro en `graduation_certificate_requests`:
   - status = PENDING
   - Genera validation_code (6 dígitos)

4. Sistema envía email con código

5. Usuario ingresa código en la web

6. Sistema valida código:
   - Si correcto → status = VALIDATED
   - Genera certificado automáticamente

7. Sistema crea registro en `graduation_certificates`:
   - Genera verification_code (QR)
   - Genera PDF
   - Guarda en storage

8. Usuario puede descargar certificado
```

### Flujo 2: Empresa Solicita Certificado

```
1. Empresa ingresa:
   - Cédula del graduado
   - Nombre de la empresa
   - Email corporativo
   - Datos del solicitante

2. Sistema busca en `graduates`

3. Sistema crea solicitud:
   - requester_type = COMPANY
   - status = PENDING (requiere aprobación manual)

4. Administrador revisa y aprueba

5. Sistema genera certificado y lo envía por email
```

### Flujo 3: Validación Pública de Certificado

```
1. Usuario escanea QR del certificado

2. Sistema busca por verification_code en `graduation_certificates`

3. Sistema registra validación en `certificate_validations`:
   - IP address
   - User agent
   - Resultado

4. Sistema muestra información:
   - Nombre del graduado
   - Programa
   - Fecha de graduación
   - Estado del certificado (VALID/REVOKED)
```

---

## 🚀 Instalación

### 1. Crear el esquema y las tablas

```bash
# Conectar a PostgreSQL
psql -U postgres -d academic_registration_db

# Ejecutar el script
\i backend/academic-registration-service/database/migrations/001_create_graduation_tables.sql
```

### 2. Verificar creación

```sql
-- Listar tablas
\dt academic_registration.*

-- Verificar datos iniciales
SELECT * FROM academic_registration.signers;
SELECT * FROM academic_registration.certificate_template_config;
```

---

## 📊 Consultas Útiles

### Verificar si una persona es graduado
```sql
SELECT * FROM academic_registration.graduates
WHERE id_number = '1234567890'
  AND status = 'ACTIVE';
```

### Listar solicitudes pendientes
```sql
SELECT
    request_number,
    full_name,
    id_number,
    requester_type,
    status,
    request_date
FROM academic_registration.graduation_certificate_requests
WHERE status IN ('PENDING', 'VALIDATED')
ORDER BY request_date DESC;
```

### Obtener certificados de un graduado
```sql
SELECT
    c.certificate_number,
    c.verification_code,
    c.issue_date,
    c.status,
    r.request_number
FROM academic_registration.graduation_certificates c
JOIN academic_registration.graduation_certificate_requests r ON r.id = c.request_id
WHERE c.id_number = '1234567890'
ORDER BY c.issue_date DESC;
```

### Historial de validaciones de un certificado
```sql
SELECT
    v.validation_date,
    v.ip_address,
    v.result,
    c.certificate_number,
    c.full_name
FROM academic_registration.certificate_validations v
JOIN academic_registration.graduation_certificates c ON c.id = v.certificate_id
WHERE c.verification_code = 'ABC123XYZ'
ORDER BY v.validation_date DESC;
```

---

## 🔒 Seguridad

### Índices para Performance
Todas las tablas tienen índices en:
- Campos de búsqueda frecuente (cédula, códigos)
- Claves foráneas
- Campos de fecha

### Constraints
- CHECK constraints para validar estados
- UNIQUE constraints para números de certificado/solicitud
- Foreign keys para integridad referencial

### Auditoría
Todas las tablas principales tienen:
- `created_at` / `updated_at` (automático)
- `created_by` / `updated_by`
- Triggers para actualizar timestamps

---

## 📝 Notas de Desarrollo

### Diferencias con `certification-service`
1. **Contexto**: Certificados ACADÉMICOS vs certificados LABORALES
2. **Validación**: Los graduados deben estar pre-registrados en la tabla `graduates`
3. **Solicitudes**: Pueden ser de graduados o de empresas
4. **Tipos**: Hay diferentes tipos de certificados (STANDARD, OFFICIAL, INTERNATIONAL)

### Próximos Pasos
1. Crear entidades TypeORM
2. Implementar servicios
3. Crear controladores
4. Agregar validaciones
5. Implementar generación de PDF
6. Crear endpoints públicos de validación

---

## 📧 Contacto
Para dudas sobre el esquema, contactar al equipo de desarrollo.
