# Internal Disciplinary Control Service

Microservicio NestJS para la gestión completa del ciclo de vida de los procesos disciplinarios de la ESAP.

## 🎯 Descripción

Este servicio gestiona:
- **Radicación de noticias disciplinarias** (denuncias/quejas)
- **Asignación de profesionales** (abogados)
- **Gestión de etapas** (Evaluación, Indagación, Investigación, Juzgamiento)
- **Control documental** (Autos, resoluciones, etc.)
- **Expedientes electrónicos** (Gestión de archivos)
- **Cálculo de términos** (Plazos, prescripción, SLA)

## 🚀 Inicio Rápido

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Crear base de datos PostgreSQL
createdb internal_disciplinary_control_db

# Ejecutar en desarrollo (con auto-sincronización de BD)
npm run start:dev
```

### Variables de Entorno

```env
PORT=3005
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=internal_disciplinary_control_db
NODE_ENV=development
STORAGE_PATH=./uploads/expedientes
```

## 📊 Arquitectura

```
src/
├── entities/                    # Modelos de datos (TypeORM)
│   ├── disciplinary-news.entity.ts      # Noticias/Denuncias
│   ├── disciplinary-process.entity.ts   # Procesos asignados
│   ├── legal-auto.entity.ts             # Documentos/Autos
│   └── sequence.entity.ts               # Generador de consecutivos
├── controllers/                 # Endpoints REST
│   ├── news.controller.ts       # POST/GET /disciplinary-news
│   ├── process.controller.ts    # POST/PATCH /disciplinary-processes
│   └── auto.controller.ts       # POST/PATCH /disciplinary-autos
├── services/                    # Lógica de negocio
│   ├── news.service.ts          # Gestión de noticias
│   ├── process.service.ts       # Gestión de procesos
│   ├── auto.service.ts          # Gestión de autos
│   ├── sequence.service.ts      # Consecutivos (ND-YYYY-###, P-###-YYYY)
│   ├── storage.service.ts       # Gestión de archivos
│   └── terminos-calculator.service.ts   # Cálculo de plazos
├── dtos/                        # Data Transfer Objects (Validación)
├── seed.service.ts              # Datos de prueba
├── app.module.ts                # Configuración de módulos
└── main.ts                      # Punto de entrada + Swagger
```

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```

### Noticias Disciplinarias

```bash
# Radicar noticia (crear)
POST /disciplinary-news
Content-Type: multipart/form-data

# Noticias pendientes de asignación
GET /disciplinary-news/pending-assignment

# Listar todas
GET /disciplinary-news

# Obtener una
GET /disciplinary-news/:id

# Eliminar
DELETE /disciplinary-news/:id
```

### Procesos Disciplinarios

```bash
# Asignar profesional (crear proceso)
POST /disciplinary-processes/assign

# Cambiar etapa (Eval → Indag → Invest → Juzg)
PATCH /disciplinary-processes/:id/stage

# Mis procesos (del abogado)
GET /disciplinary-processes/my-processes?abogadoId=uuid

# Listar todos
GET /disciplinary-processes

# Obtener uno
GET /disciplinary-processes/:id
```

### Autos Legales

```bash
# Crear borrador
POST /disciplinary-autos

# Enviar a revisión
PATCH /disciplinary-autos/:id/send-review

# Aprobar/Firmar
PATCH /disciplinary-autos/:id/approve?aprobadoPorId=uuid

# Actualizar contenido (si está en borrador)
PATCH /disciplinary-autos/:id/content

# Obtener autos de un proceso
GET /disciplinary-autos/by-process/:processId

# Listar todos
GET /disciplinary-autos

# Obtener uno
GET /disciplinary-autos/:id
```

## 📚 Documentación

Swagger disponible en:
```
http://localhost:3005/api/docs
```

Para documentación completa de la especificación técnica:
```
cat ESPECIFICACION_TECNICA.md
```

## 🧪 Testing

### Ejecutar seed (datos de prueba)
```bash
curl -X POST http://localhost:3005/seed
```

Crea automáticamente:
- 2 noticias de ejemplo
- Secuencias inicializadas

### Usar Postman

Importar colección:
```
Internal_Disciplinary_Control_Service.postman_collection.json
```

## 📋 Modelos de Datos

### DisciplinaryNews
- Radicado único: `ND-2025-001`
- Estados: RADICADA, EN_VALORACION, ASIGNADA, DEVUELTA
- Gestiona: origen, territorial, denunciante, disciplinable, hechos, adjuntos

### DisciplinaryProcess
- Radicado único: `P-001-2025`
- Etapas: EVALUACION → INDAGACION_PREVIA → INVESTIGACION → JUZGAMIENTO
- Cálculo automático de: fecha de prescripción (+15 años), vencimiento por etapa
- Estados: ACTIVO, SUSPENDIDO, ARCHIVADO, PRESCRITO

### LegalAuto
- Tipos: AUTO_APERTURA, AUTO_ARCHIVO, PLIEGO_CARGOS, RESOLUCION, etc.
- Estados: BORRADOR → REVISION_JEFE → APROBADO → FIRMADO
- Soporta contenido HTML/Rich Text
- URL de firma simulada después de aprobación

### Sequence
- Maneja consecutivos únicos por año
- Atómicos a nivel de base de datos
- Secuencias: `DISCIPLINARY_NEWS_YYYY`, `DISCIPLINARY_PROCESS_YYYY`

## 🛠️ Servicios de Negocio

### SequenceService
Genera consecutivos únicos:
- Noticias: `ND-{YYYY}-{secuencial}`
- Procesos: `P-{secuencial}-{YYYY}`

### TerminosCalculatorService
Calcula plazos y términos:
- Prescripción: +15 años
- Términos por etapa (en días hábiles):
  - EVALUACION: 30 días
  - INDAGACION_PREVIA: 120 días (~6 meses)
  - INVESTIGACION: 240 días (~1 año)
  - JUZGAMIENTO: 180 días (~6 meses)
- Excluye fines de semana y festivos

### StorageService
Gestiona archivos:
- Almacenamiento local: `./uploads/expedientes/{radicado}/`
- Nomenclatura: `YYYYMMDD_TIPO.ext`
- Preparado para S3/Azure Storage

### NewsService
- Radicación de noticias
- Validaciones de estado
- Gestión de adjuntos

### ProcessService
- Asignación de profesionales
- Transiciones de etapa
- Cálculo de términos
- Validaciones de flujo

### AutoService
- Gestión de autos/documentos
- Estados (borrador → firma)
- Simulación de firma electrónica

## 🔐 Validaciones

Todos los DTOs incluyen validación con `class-validator`:
- Tipos de datos correctos
- Enums válidos
- UUIDs válidos
- Emails válidos
- Campos requeridos

## 📦 Compilación

```bash
# Build
npm run build

# Ejecutar en producción
npm run start:prod
```

## 🐳 Docker

```bash
# Build imagen
docker build -t internal-disciplinary-control-service .

# Run contenedor
docker run -p 3005:3005 \
  -e DATABASE_HOST=db \
  -e DATABASE_NAME=internal_disciplinary_control_db \
  internal-disciplinary-control-service
```

## 📝 Logs

Disponibles en:
- Consola (desarrollo)
- `./logs/` (si está configurado)

## 🔄 Flujo de Uso

1. **Radicar Noticia**: POST /disciplinary-news
2. **Asignar a Abogado**: POST /disciplinary-processes/assign
3. **Cambiar Etapa**: PATCH /disciplinary-processes/:id/stage (múltiples veces)
4. **Crear Auto**: POST /disciplinary-autos
5. **Enviar a Revisión**: PATCH /disciplinary-autos/:id/send-review
6. **Aprobar/Firmar**: PATCH /disciplinary-autos/:id/approve

## ⚠️ Notas Importantes

- Cambios de estado son atómicos
- Transiciones de etapa son lineales (no se puede retroceder)
- Términos se calculan en días hábiles
- Archivos se guardan con nomenclatura estandarizada
- Firma es simulada (integración pendiente)

## 🚧 Próximos Pasos

- [ ] Integración con Auth Service
- [ ] Firma electrónica real (PKIX)
- [ ] Integración S3/Azure Storage
- [ ] Notificaciones por email
- [ ] Auditoría y logs detallados
- [ ] Caché (Redis)
- [ ] Rate limiting
- [ ] Tests E2E completos

## 📞 Soporte

Para más información o reportar issues:
1. Revisar ESPECIFICACION_TECNICA.md
2. Consultar Swagger: http://localhost:3005/api/docs
3. Revisar logs

---

**Versión**: 1.0.0  
**Framework**: NestJS 11.x  
**Base de Datos**: PostgreSQL 12+  
**Node**: 18+
