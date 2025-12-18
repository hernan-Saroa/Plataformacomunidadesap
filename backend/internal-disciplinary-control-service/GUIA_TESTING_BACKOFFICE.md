# 🧪 GUÍA DE TESTING - Internal Disciplinary Control Service

## Inicio Rápido

### 1. Levantar la aplicación

```bash
# Terminal 1 - Instalar y ejecutar
cd backend/internal-disciplinary-control-service
npm install
npm run start:dev

# Esperado:
# 🚀 Internal Disciplinary Control Service running on http://localhost:3005
```

### 2. Health Check

```bash
curl http://localhost:3005/health

# Response:
# "Hello from AppService!"
```

### 3. Ejecutar Seed (datos de prueba)

```bash
curl -X POST http://localhost:3005/seed

# Response:
# {
#   "message": "Seed ejecutado exitosamente"
# }

# Logs esperados:
# ✅ Noticia creada: ND-2025-001
# ✅ Noticia creada: ND-2025-002
```

---

## 📋 Flujo de Testing Completo

### Paso 1: Radicar una Noticia (H1)

```bash
curl -X POST http://localhost:3005/disciplinary-news \
  -H "Content-Type: application/json" \
  -d '{
    "origen": "QUEJOSO",
    "territorial": "BOGOTA",
    "dependenciaDenunciado": "RECURSOS HUMANOS",
    "denunciante": {
      "nombre": "Juan Perez",
      "cedula": "1234567890",
      "email": "juan@example.com",
      "cargo": "Ciudadano"
    },
    "disciplinable": {
      "nombre": "Maria Gomez",
      "cedula": "9876543210",
      "cargo": "Jefe"
    },
    "hechos": "Incumplimiento en procedimientos administrativos",
    "adjuntos": []
  }'

# Response (201):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "radicado": "ND-2025-001",
#   "fechaRecepcion": "2025-12-01T10:30:00.000Z",
#   "origen": "QUEJOSO",
#   "estado": "RADICADA",
#   ...
# }

# ✅ Guarda el ID y el radicado para los siguientes pasos
NOTICIA_ID="550e8400-e29b-41d4-a716-446655440000"
```

### Paso 2: Listar Noticias Pendientes (H2)

```bash
curl http://localhost:3005/disciplinary-news/pending-assignment

# Response (200):
# [
#   {
#     "id": "550e8400-e29b-41d4-a716-446655440000",
#     "radicado": "ND-2025-001",
#     "estado": "RADICADA",
#     ...
#   }
# ]
```

### Paso 3: Asignar Profesional (H2) - Crear Proceso

```bash
curl -X POST http://localhost:3005/disciplinary-processes/assign \
  -H "Content-Type: application/json" \
  -d '{
    "newsId": "550e8400-e29b-41d4-a716-446655440000",
    "abogadoId": "550e8400-e29b-41d4-a716-446655440001",
    "observaciones": "Proceder con indagación preliminar"
  }'

# Response (201):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440100",
#   "radicadoProceso": "P-001-2025",
#   "etapaActual": "EVALUACION",
#   "estado": "ACTIVO",
#   "fechaPrescripcion": "2040-12-01T00:00:00.000Z",
#   "fechaVencimientoEtapa": "2025-12-31T00:00:00.000Z",
#   ...
# }

# ✅ Guarda el PROCESS_ID
PROCESS_ID="550e8400-e29b-41d4-a716-446655440100"

# Verifica que la noticia cambió de estado
curl http://localhost:3005/disciplinary-news/550e8400-e29b-41d4-a716-446655440000
# Estado debe ser: ASIGNADA
```

### Paso 4: Cambiar Etapa (H3, H7)

```bash
curl -X PATCH http://localhost:3005/disciplinary-processes/550e8400-e29b-41d4-a716-446655440100/stage \
  -H "Content-Type: application/json" \
  -d '{
    "nuevaEtapa": "INDAGACION_PREVIA",
    "justificacion": "Se encontraron méritos para abrir indagación preliminar"
  }'

# Response (200):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440100",
#   "etapaActual": "INDAGACION_PREVIA",
#   "fechaVencimientoEtapa": "2026-06-01T00:00:00.000Z",  // Aumentó a 120 días
#   ...
# }

# Intenta cambiar a una etapa inválida (debe fallar)
curl -X PATCH http://localhost:3005/disciplinary-processes/550e8400-e29b-41d4-a716-446655440100/stage \
  -H "Content-Type: application/json" \
  -d '{
    "nuevaEtapa": "EVALUACION",
    "justificacion": "No permitido"
  }'

# Response (400):
# {
#   "statusCode": 400,
#   "message": "No se puede pasar de INDAGACION_PREVIA a EVALUACION"
# }
```

### Paso 5: Ver Procesos del Abogado (H3)

```bash
curl "http://localhost:3005/disciplinary-processes/my-processes?abogadoId=550e8400-e29b-41d4-a716-446655440001"

# Response (200):
# [
#   {
#     "id": "550e8400-e29b-41d4-a716-446655440100",
#     "radicadoProceso": "P-001-2025",
#     "abogadoAsignadoId": "550e8400-e29b-41d4-a716-446655440001",
#     "etapaActual": "INDAGACION_PREVIA",
#     ...
#   }
# ]
```

### Paso 6: Crear Borrador de Auto (H9)

```bash
curl -X POST http://localhost:3005/disciplinary-autos \
  -H "Content-Type: application/json" \
  -d '{
    "processId": "550e8400-e29b-41d4-a716-446655440100",
    "tipoAuto": "AUTO_APERTURA_INDAGACION",
    "contenidoHtml": "<p>Vistos los hechos considerandos, se abre la indagación preliminar...</p>"
  }'

# Response (201):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440200",
#   "processId": "550e8400-e29b-41d4-a716-446655440100",
#   "tipo": "AUTO_APERTURA_INDAGACION",
#   "estado": "BORRADOR",
#   "firmaUrl": null,
#   ...
# }

# ✅ Guarda el AUTO_ID
AUTO_ID="550e8400-e29b-41d4-a716-446655440200"
```

### Paso 7: Actualizar Contenido (en BORRADOR)

```bash
curl -X PATCH http://localhost:3005/disciplinary-autos/550e8400-e29b-41d4-a716-446655440200/content \
  -H "Content-Type: application/json" \
  -d '{
    "contenidoHtml": "<p>Contenido actualizado con nueva justificación...</p>"
  }'

# Response (200):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440200",
#   "contenido": "<p>Contenido actualizado...</p>",
#   "estado": "BORRADOR",
#   ...
# }

# Intenta actualizar en otro estado (debe fallar)
# Primero envía a revisión
curl -X PATCH http://localhost:3005/disciplinary-autos/550e8400-e29b-41d4-a716-446655440200/send-review

# Luego intenta actualizar
curl -X PATCH http://localhost:3005/disciplinary-autos/550e8400-e29b-41d4-a716-446655440200/content \
  -H "Content-Type: application/json" \
  -d '{"contenidoHtml": "<p>...</p>"}'

# Response (400):
# {
#   "statusCode": 400,
#   "message": "Solo se pueden editar borradores"
# }
```

### Paso 8: Enviar a Revisión (H3)

```bash
curl -X PATCH http://localhost:3005/disciplinary-autos/550e8400-e29b-41d4-a716-446655440200/send-review

# Response (200):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440200",
#   "estado": "REVISION_JEFE",
#   ...
# }
```

### Paso 9: Aprobar y Firmar Auto (H4)

```bash
curl -X PATCH "http://localhost:3005/disciplinary-autos/550e8400-e29b-41d4-a716-446655440200/approve?aprobadoPorId=550e8400-e29b-41d4-a716-446655440002" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "APROBADO",
    "comentarios": "Proceda con la firma electrónica",
    "tipoFirma": "ELECTRONICA"
  }'

# Response (200):
# {
#   "id": "550e8400-e29b-41d4-a716-446655440200",
#   "estado": "FIRMADO",
#   "firmaUrl": "https://storage.example.com/firmas/550e8400-e29b-41d4-a716-446655440200_ELECTRONICA_2025-12-01T10:30:00.000Z.pdf",
#   "aprobadoPorId": "550e8400-e29b-41d4-a716-446655440002",
#   ...
# }
```

---

## 🔍 Validaciones y Casos de Error

### Caso 1: Radicado duplicado (No es posible)
```bash
# Ya se maneja en BD con UNIQUE constraint
# Si intentas crear dos con mismo radicado, fallaría en BD
```

### Caso 2: Asignar noticia NO RADICADA
```bash
# Primero crea una noticia
curl -X POST http://localhost:3005/disciplinary-news ...
NOTICIA_ID="..."

# Asigna y verifica que sea RADICADA
# Si cambias su estado primero, luego asignación fallará

curl -X POST http://localhost:3005/disciplinary-processes/assign \
  -H "Content-Type: application/json" \
  -d '{
    "newsId": "'"$NOTICIA_ID"'",
    "abogadoId": "550e8400-e29b-41d4-a716-446655440001"
  }'

# Response (400):
# {
#   "statusCode": 400,
#   "message": "La noticia debe estar en estado RADICADA para asignar proceso"
# }
```

### Caso 3: Etapa inválida
```bash
curl -X PATCH http://localhost:3005/disciplinary-processes/550e8400-e29b-41d4-a716-446655440100/stage \
  -H "Content-Type: application/json" \
  -d '{
    "nuevaEtapa": "ETAPA_INEXISTENTE",
    "justificacion": "Test"
  }'

# Response (400):
# {
#   "statusCode": 400,
#   "message": "\"nuevaEtapa\" must be one of..."
# }
```

### Caso 4: UUID inválido
```bash
curl http://localhost:3005/disciplinary-news/uuid-invalido

# Response (400):
# {
#   "statusCode": 400,
#   "message": "Validation failed"
# }
```

### Caso 5: Recurso no encontrado
```bash
curl http://localhost:3005/disciplinary-news/550e8400-0000-0000-0000-000000000000

# Response (404):
# {
#   "statusCode": 404,
#   "message": "Noticia no encontrada"
# }
```

---

## 📊 Swagger Testing

### Acceder a Swagger UI
```
http://localhost:3005/api/docs
```

**Ventajas**:
- Interfaz visual
- Try it out para cada endpoint
- Schema automático
- Respuestas de ejemplo

---

## 📮 Postman Collection

### Importar colección
1. Abrir Postman
2. Import → File
3. Seleccionar `Internal_Disciplinary_Control_Service.postman_collection.json`
4. Las variables se auto-cargan

### Variables útiles
En la colección puedes usar:
- `{{noticia_id}}` - Guardar de responses
- `{{process_id}}` - Guardar de responses
- `{{auto_id}}` - Guardar de responses

---

## 🧩 Verificaciones Finales

### Base de Datos

```sql
-- Conectar a PostgreSQL
psql -U postgres -d internal_disciplinary_control_db

-- Ver tablas creadas
\dt

-- Ver datos de ejemplo
SELECT * FROM disciplinary_news LIMIT 5;
SELECT * FROM disciplinary_processes LIMIT 5;
SELECT * FROM legal_autos LIMIT 5;
SELECT * FROM sequences;
```

### Archivos de Expediente

```bash
# Ver estructura creada
ls -la uploads/expedientes/ND-2025-001/

# Debería contener archivos con formato YYYYMMDD_TIPO.ext
```

### Logs

```bash
# En consola deberías ver:
# ✅ Noticia creada: ND-2025-001
# ✅ Proceso creado: P-001-2025
# ✅ Auto guardado en borrador
# ✅ Auto enviado a revisión
# ✅ Auto firmado
```

---

## ⏱️ Tiempos Esperados

| Operación | Tiempo |
|---|---|
| Health Check | <10ms |
| Radicar noticia | 50-100ms |
| Listar noticias | 30-50ms |
| Asignar proceso | 80-150ms |
| Cambiar etapa | 40-80ms |
| Crear auto | 50-100ms |
| Aprobar auto | 60-120ms |

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
cat .env
```

### "Port 3005 already in use"
```bash
# Matar proceso en puerto 3005
lsof -i :3005
kill -9 <PID>
```

### "ValidationError"
```bash
# Verificar DTOs en request
# Campos requeridos: origen, territorial, denunciante, disciplinable, hechos
# Enums correctos: ANONIMO, QUEJOSO, OFICIO, REMISION
```

### "FK constraint violated"
```bash
# Verificar IDs existen en tablas relacionadas
# newsId debe existir en disciplinary_news
# processId debe existir en disciplinary_processes
```

---

## 📝 Reporte de Testing

### Crear reporte manual
```markdown
# Testing Report - Internal Disciplinary Control Service

## Fecha: [Hoy]

### Health Check
- [ ] GET /health → 200 OK

### Noticias
- [ ] POST /disciplinary-news → 201 Created
- [ ] GET /disciplinary-news/pending-assignment → 200 OK
- [ ] GET /disciplinary-news → 200 OK
- [ ] GET /disciplinary-news/:id → 200 OK
- [ ] DELETE /disciplinary-news/:id → 204 No Content

### Procesos
- [ ] POST /disciplinary-processes/assign → 201 Created
- [ ] PATCH /disciplinary-processes/:id/stage → 200 OK
- [ ] GET /disciplinary-processes/my-processes → 200 OK
- [ ] GET /disciplinary-processes → 200 OK
- [ ] GET /disciplinary-processes/:id → 200 OK

### Autos
- [ ] POST /disciplinary-autos → 201 Created
- [ ] PATCH /disciplinary-autos/:id/send-review → 200 OK
- [ ] PATCH /disciplinary-autos/:id/approve → 200 OK
- [ ] PATCH /disciplinary-autos/:id/content → 200 OK
- [ ] GET /disciplinary-autos/by-process/:id → 200 OK
- [ ] GET /disciplinary-autos → 200 OK
- [ ] GET /disciplinary-autos/:id → 200 OK

### Validaciones
- [ ] Etapa inválida → 400 Bad Request
- [ ] UUID inválido → 400 Bad Request
- [ ] Recurso no encontrado → 404 Not Found
- [ ] DB constraints funcionan

### Performance
- [ ] Requests < 200ms
- [ ] DB queries optimizadas
```

---

**Fin de Guía de Testing**
