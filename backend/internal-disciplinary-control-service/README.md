# Internal Disciplinary Control Service

Este microservicio gestiona el ciclo de vida de los procesos disciplinarios de la ESAP, desde la radicación de la noticia (queja) hasta el fallo o archivo, incluyendo la gestión de expedientes electrónicos y flujos de aprobación de documentos ("Autos").

## 1. Contexto del Proyecto

El objetivo es digitalizar y automatizar el control interno disciplinario. El sistema permite:
- Radicar noticias disciplinarias (quejas, informes, oficios).
- Asignar procesos a abogados.
- Gestionar etapas procesales (Indagación, Investigación, Juicio).
- Crear, revisar y firmar autos (documentos legales).

**Tecnología Base:**
- **Framework:** NestJS (TypeScript)
- **Base de Datos:** PostgreSQL con TypeORM
- **Documentación:** Swagger

## 2. Modelo de Datos Implementado

El sistema cuenta con las siguientes entidades principales:

### A. DisciplinaryNews (Noticia Disciplinaria)
Representa la entrada inicial al sistema (queja o informe).
- **Campos clave:** `radicado` (generado auto: ND-2025-001), `origen`, `denunciante`, `disciplinable`, `hechos`, `estado`.
- **Estados:** `RADICADA`, `EN_VALORACION`, `ASIGNADA`, `DEVUELTA`.

### B. DisciplinaryProcess (Proceso Disciplinario)
Se crea cuando una noticia es asignada a un abogado.
- **Campos clave:** `radicadoProceso` (P-001-2025), `etapaActual`, `abogadoAsignado`.
- **Etapas:** `EVALUACION`, `INDAGACION_PREVIA`, `INVESTIGACION`, `JUZGAMIENTO`.

### C. LegalAuto (Documentos/Autos)
Documentos legales generados dentro de un proceso.
- **Campos clave:** `tipo`, `contenido` (HTML), `estado`, `firmaUrl`.
- **Flujo:** `BORRADOR` -> `REVISION_JEFE` -> `APROBADO` -> `FIRMADO`.

## 3. Endpoints Principales (API)

La documentación completa está disponible en Swagger: `http://localhost:3005/api/docs`

### NewsController (Gestión de Noticias)
- `POST /disciplinary-news`: Radicar nueva noticia.
- `GET /disciplinary-news/pending-assignment`: Listar noticias pendientes de asignar.

### ProcessController (Gestión de Procesos)
- `POST /disciplinary-processes/assign`: Asignar noticia a abogado (crea proceso).
- `PATCH /disciplinary-processes/:id/stage`: Cambiar etapa del proceso.
- `GET /disciplinary-processes/my-processes`: Ver mis procesos asignados.

### AutoController (Gestión Documental)
- `POST /disciplinary-autos`: Crear borrador de auto.
- `PATCH /disciplinary-autos/:id/send-review`: Enviar a revisión.
- `PATCH /disciplinary-autos/:id/approve`: Aprobar y firmar (simulado).

## 4. Configuración y Ejecución

### Prerrequisitos
- Node.js (v18+)
- PostgreSQL corriendo localmente (puerto 5432)

### Instalación
```bash
npm install
```

### Configuración de Entorno (.env)
Asegúrate de tener un archivo `.env` en la raíz (puedes copiar `.env.example`).
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=esap_db
```

### Ejecución
```bash
# Modo desarrollo (recomendado)
npm run start:dev
```
El servidor iniciará en `http://localhost:3005`.

## 5. Guía de Pruebas (Postman)

### Solución de Errores Comunes

#### 1. Error 500 "Internal Server Error" al iniciar
**Causa:** Las tablas no existían en la base de datos.
**Solución Implementada:** Se habilitó `synchronize: true` en `app.module.ts` para que TypeORM cree las tablas automáticamente al iniciar.

#### 2. Error 400 "property radicado should not exist"
**Causa:** Se estaba enviando el campo `radicado` en el cuerpo del JSON.
**Solución:** El radicado es generado automáticamente por el sistema (`ND-YYYY-###`). **NO** debes incluir el campo `"radicado"` en el JSON de la petición POST.

**JSON Correcto para `POST /disciplinary-news`:**
```json
{
    "origen": "QUEJOSO",
    "territorial": "BOGOTA",
    "dependenciaDenunciado": "Financiera",
    "hechos": "Descripción de los hechos...",
    "denunciante": { "nombre": "Juan", "email": "j@test.com" },
    "disciplinable": { "nombre": "Carlos", "cargo": "Auxiliar" }
}
```

#### 3. Error al crear Autos (Campos nulos)
**Causa:** Había un error en el mapeo de datos entre el DTO y la Entidad en `AutoService`.
**Solución Implementada:** Se corrigió el mapeo manual en `auto.service.ts` para asegurar que `tipoAuto` se guarde correctamente como `tipo` y `contenidoHtml` como `contenido`.

## 6. Cambios Recientes Realizados

1.  **Activación de Sync DB:** Modificación en `src/app.module.ts` para forzar la creación de tablas en entorno local.
2.  **Corrección de DTOs:** Ajuste en validaciones para permitir la creación fluida de noticias.
3.  **Corrección de Lógica de Negocio:**
    - `AutoService`: Corrección de mapeo de campos al crear borradores.
    - `AutoService`: Corrección en la consulta por relación (`process: { id: ... }`).
    - `AutoService`: Corrección de sintaxis en `generateMockSignatureUrl`.

---
**Estado Actual:** El backend está operativo, conectando a base de datos y respondiendo correctamente a las peticiones de prueba.
