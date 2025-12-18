# Internal Disciplinary Control Service

## Descripción
Microservicio NestJS para la gestión del ciclo de vida de los procesos disciplinarios de la ESAP. Desde la radicación de la noticia (queja) hasta el fallo o archivo, incluyendo la gestión de expedientes electrónicos y flujos de aprobación de documentos ("Autos").

## Tecnología
- **Framework**: NestJS (TypeScript)
- **Base de Datos**: PostgreSQL con TypeORM
- **Validación**: class-validator
- **API Documentation**: Swagger

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Crear base de datos PostgreSQL
createdb internal_disciplinary_control_db

# Ejecutar (con sincronización automática de tablas en desarrollo)
npm run start:dev
```

## Estructura del Proyecto

```
src/
├── entities/           # Entidades TypeORM
│   ├── disciplinary-news.entity.ts
│   ├── disciplinary-process.entity.ts
│   ├── legal-auto.entity.ts
│   └── sequence.entity.ts
├── controllers/        # Controladores
│   ├── news.controller.ts
│   ├── process.controller.ts
│   └── auto.controller.ts
├── services/          # Servicios de negocio
│   ├── news.service.ts
│   ├── process.service.ts
│   ├── auto.service.ts
│   ├── sequence.service.ts
│   ├── storage.service.ts
│   ├── terminos-calculator.service.ts
│   └── sequence.service.ts
├── dtos/              # Data Transfer Objects
│   ├── create-disciplinary-news.dto.ts
│   ├── create-disciplinary-process.dto.ts
│   └── create-legal-auto.dto.ts
├── app.module.ts      # Módulo principal
├── main.ts           # Punto de entrada
└── seed.service.ts   # Datos de prueba
```

## Modelo de Datos

### DisciplinaryNews (Noticia Disciplinaria)
```
- id: UUID (PK)
- radicado: String (ND-YYYY-###) - Único
- fechaRecepcion: Date
- origen: Enum (ANONIMO, QUEJOSO, OFICIO, REMISION)
- territorial: String
- dependenciaDenunciado: String
- denunciante: JSONB (nombre, cedula, email, cargo)
- disciplinable: JSONB (nombre, cedula, cargo)
- hechos: Text
- estado: Enum (RADICADA, EN_VALORACION, ASIGNADA, DEVUELTA)
- adjuntos: Array<String> (URLs de archivos)
- updatedAt: Timestamp
```

### DisciplinaryProcess (Proceso Disciplinario)
```
- id: UUID (PK)
- radicadoProceso: String (P-###-YYYY) - Único
- newsId: FK → DisciplinaryNews
- abogadoAsignadoId: UUID (profesional)
- etapaActual: Enum (EVALUACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO)
- estado: Enum (ACTIVO, SUSPENDIDO, ARCHIVADO, PRESCRITO)
- fechaPrescripcion: Date (calculada: +15 años)
- fechaVencimientoEtapa: Date (calculada según SLA)
- observaciones: Text
- createdAt, updatedAt: Timestamp
```

### LegalAuto (Documentos/Autos)
```
- id: UUID (PK)
- processId: FK → DisciplinaryProcess
- tipo: Enum (AUTO_APERTURA, AUTO_ARCHIVO, PLIEGO_CARGOS, RESOLUCION, etc.)
- contenido: Text (HTML/Rich Text)
- estado: Enum (BORRADOR, REVISION_JEFE, APROBADO, FIRMADO)
- firmaUrl: String (URL del PDF)
- comentarios: Text
- aprobadoPorId: UUID (Jefe que aprobó)
- createdAt, updatedAt: Timestamp
```

### Sequence (Generador de Consecutivos)
```
- name: String (PK) - "DISCIPLINARY_NEWS_YYYY", "DISCIPLINARY_PROCESS_YYYY"
- currentValue: Integer
- updatedAt: Timestamp
```

## API Endpoints

### Noticias Disciplinarias

#### 1. Radicar Noticia (H1)
```
POST /disciplinary-news
Content-Type: multipart/form-data

Body:
{
  "origen": "QUEJOSO",
  "territorial": "BOGOTA",
  "dependenciaDenunciado": "RECURSOS HUMANOS",
  "denunciante": {
    "nombre": "Juan Perez",
    "cedula": "1234567890",
    "email": "juan@test.com",
    "cargo": "Ciudadano"
  },
  "disciplinable": {
    "nombre": "Pedro Gomez",
    "cedula": "9876543210",
    "cargo": "Auxiliar"
  },
  "hechos": "El funcionario X no asistió a la reunión...",
  "files": [archivo1, archivo2]  // Opcional
}

Response (201):
{
  "id": "uuid",
  "radicado": "ND-2025-001",
  "fechaRecepcion": "2025-12-01T10:30:00Z",
  "origen": "QUEJOSO",
  "territorial": "BOGOTA",
  "dependenciaDenunciado": "RECURSOS HUMANOS",
  "denunciante": {...},
  "disciplinable": {...},
  "hechos": "...",
  "estado": "RADICADA",
  "adjuntos": ["2025-12-01_DOCUMENTO_1.pdf", ...]
}
```

#### 2. Listar Noticias Pendientes (H2)
```
GET /disciplinary-news/pending-assignment

Response (200):
[
  {
    "id": "uuid",
    "radicado": "ND-2025-001",
    "estado": "RADICADA",
    ...
  }
]
```

#### 3. Obtener Noticia por ID
```
GET /disciplinary-news/:id

Response (200): { ...noticia... }
Response (404): { "message": "Noticia no encontrada" }
```

#### 4. Listar Todas las Noticias
```
GET /disciplinary-news

Response (200): [ {...}, {...} ]
```

#### 5. Eliminar Noticia
```
DELETE /disciplinary-news/:id

Response (204): No Content
```

---

### Procesos Disciplinarios

#### 1. Asignar Profesional / Crear Proceso (H2)
```
POST /disciplinary-processes/assign

Body:
{
  "newsId": "uuid-de-la-noticia",
  "abogadoId": "uuid-del-abogado",
  "observaciones": "Proceder con indagación preliminar"
}

Response (201):
{
  "id": "uuid",
  "radicadoProceso": "P-001-2025",
  "newsId": "uuid",
  "abogadoAsignadoId": "uuid",
  "etapaActual": "EVALUACION",
  "estado": "ACTIVO",
  "fechaPrescripcion": "2040-12-01T00:00:00Z",
  "fechaVencimientoEtapa": "2025-12-31T00:00:00Z",
  "observaciones": "Proceder con indagación preliminar",
  "createdAt": "2025-12-01T10:30:00Z"
}
```

Reglas:
- La noticia debe estar en estado "RADICADA"
- Cambia estado de noticia a "ASIGNADA"
- Genera radicado único P-{consecutivo}-{YYYY}
- Calcula fecha de prescripción (+15 años)
- Calcula fecha de vencimiento según etapa

#### 2. Cambiar Etapa del Proceso (H3, H7)
```
PATCH /disciplinary-processes/:id/stage

Body:
{
  "nuevaEtapa": "INDAGACION_PREVIA",
  "justificacion": "Se encontraron méritos para abrir indagación..."
}

Response (200):
{
  "id": "uuid",
  "radicadoProceso": "P-001-2025",
  "etapaActual": "INDAGACION_PREVIA",
  "fechaVencimientoEtapa": "2026-06-01T00:00:00Z",
  ...
}
```

Etapas válidas:
- EVALUACION → INDAGACION_PREVIA
- INDAGACION_PREVIA → INVESTIGACION
- INVESTIGACION → JUZGAMIENTO
- JUZGAMIENTO → (final)

Término por etapa (días hábiles):
- EVALUACION: 30 días (~1 mes)
- INDAGACION_PREVIA: 120 días (~6 meses)
- INVESTIGACION: 240 días (~1 año)
- JUZGAMIENTO: 180 días (~6 meses)

#### 3. Mis Procesos - Abogado (H3)
```
GET /disciplinary-processes/my-processes?abogadoId=uuid-del-abogado

Response (200):
[
  {
    "id": "uuid",
    "radicadoProceso": "P-001-2025",
    "abogadoAsignadoId": "uuid",
    "etapaActual": "EVALUACION",
    ...
  }
]
```

#### 4. Obtener Todos los Procesos
```
GET /disciplinary-processes

Response (200): [ {...}, {...} ]
```

#### 5. Obtener Proceso por ID
```
GET /disciplinary-processes/:id

Response (200): { ...proceso con autos... }
```

---

### Autos Legales

#### 1. Crear Borrador de Auto (H9)
```
POST /disciplinary-autos

Body:
{
  "processId": "uuid-del-proceso",
  "tipoAuto": "AUTO_APERTURA_INDAGACION",
  "contenidoHtml": "<p>Vistos los hechos y considerandos...</p>"
}

Response (201):
{
  "id": "uuid",
  "processId": "uuid",
  "tipo": "AUTO_APERTURA_INDAGACION",
  "contenido": "<p>...</p>",
  "estado": "BORRADOR",
  "firmaUrl": null,
  "createdAt": "2025-12-01T10:30:00Z"
}
```

#### 2. Enviar a Revisión (H3)
```
PATCH /disciplinary-autos/:id/send-review

Response (200):
{
  "id": "uuid",
  "estado": "REVISION_JEFE",
  ...
}
```

Validación: Solo borradores pueden enviarse a revisión

#### 3. Aprobar/Firmar Auto (H4)
```
PATCH /disciplinary-autos/:id/approve?aprobadoPorId=uuid-del-jefe

Body:
{
  "estado": "APROBADO",
  "comentarios": "Proceda con la firma",
  "tipoFirma": "ELECTRONICA"
}

Response (200):
{
  "id": "uuid",
  "estado": "FIRMADO",
  "firmaUrl": "https://storage.example.com/firmas/uuid_ELECTRONICA_timestamp.pdf",
  "aprobadoPorId": "uuid-del-jefe",
  ...
}
```

Validación: Solo autos en REVISION_JEFE pueden aprobarse

#### 4. Actualizar Contenido
```
PATCH /disciplinary-autos/:id/content

Body:
{
  "contenidoHtml": "<p>Nuevo contenido...</p>"
}

Response (200): { ...auto actualizado... }
```

Validación: Solo borradores pueden editarse

#### 5. Obtener Autos por Proceso
```
GET /disciplinary-autos/by-process/:processId

Response (200): [ {...}, {...} ]
```

#### 6. Obtener Todos los Autos
```
GET /disciplinary-autos

Response (200): [ {...}, {...} ]
```

#### 7. Obtener Auto por ID
```
GET /disciplinary-autos/:id

Response (200): { ...auto... }
```

---

## Servicios de Negocio

### SequenceService
Genera consecutivos únicos y atómicos:
- Noticias: `ND-{YYYY}-{consecutivo}` (ej: ND-2025-001)
- Procesos: `P-{consecutivo}-{YYYY}` (ej: P-001-2025)

### TerminosCalculatorService
Calcula términos y plazos:
- Fecha de prescripción: +15 años desde los hechos
- Fecha de vencimiento de etapa: según días hábiles y SLA
- Días festivos en Colombia (mock)
- Cálculo de días hábiles restantes

### StorageService
Gestiona archivos del expediente:
- Guarda archivos localmente en `./uploads/expedientes/{radicado}/`
- Renombra con formato: `YYYYMMDD_Tipo.ext`
- Preparado para conectarse a S3/Drive en producción

---

## Seed / Datos de Prueba

### Ejecutar seed
```bash
curl -X POST http://localhost:3005/seed
```

Crea:
- 2 Noticias disciplinarias de ejemplo
- Secuencias inicializadas

### Usuarios simulados (2 de ejemplo)
```
Jefe:
  - ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" (en queries)
  
Abogado:
  - ID: "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy" (en queries)
```

Para pruebas, usa UUIDs arbitrarios en los campos `abogadoId` y `aprobadoPorId`.

---

## Swagger Documentation

Acceder a la documentación interactiva en:
```
http://localhost:3005/api/docs
```

---

## Manejo de Errores

```json
{
  "statusCode": 400,
  "message": "Datos inválidos",
  "error": "Bad Request"
}
```

Códigos HTTP:
- `200`: OK
- `201`: Created
- `204`: No Content
- `400`: Bad Request (validación)
- `404`: Not Found
- `500`: Internal Server Error

---

## Validaciones

Todas las DTOs usan `class-validator`:
- Enums válidos
- Campos requeridos
- Formato de UUID
- Emails válidos

---

## Notas de Implementación

1. **Transacciones**: Los cambios de estado (noticia → proceso) son atómicos
2. **Auditoría**: Cada entidad tiene `createdAt` y `updatedAt`
3. **Relaciones**: TypeORM eager loading para consultas eficientes
4. **Storage**: Local por defecto, extensible a S3
5. **Días hábiles**: Cálculo aproximado, considerar librerías especializadas para producción

---

## Variables de Entorno

```
PORT=3005
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=internal_disciplinary_control_db
NODE_ENV=development
STORAGE_PATH=./uploads/expedientes
```

---

## Build & Deploy

```bash
# Build
npm run build

# Producción
npm run start:prod

# Docker
docker build -t internal-disciplinary-control-service .
docker run -p 3005:3005 \
  -e DATABASE_HOST=db \
  -e DATABASE_NAME=internal_disciplinary_control_db \
  internal-disciplinary-control-service
```

---

## Próximos Pasos

1. Integración con Auth Service para autenticación
2. Implementación de firma electrónica real
3. Integración con S3/Azure Storage
4. Notificaciones por email
5. Auditoría y logs detallados
6. Caché de sesiones (Redis)
7. Rate limiting
8. Tests E2E completos
