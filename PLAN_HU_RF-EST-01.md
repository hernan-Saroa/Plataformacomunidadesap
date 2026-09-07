# Plan de Implementación — HU Estudio Previo (RF-EST-01)

**Jira:** Épica **EFDS-1145** · Caso de uso **CU-CON-01** · HU **EFDS-1146** — *[Etapa 3] Elaborar estudio previo con fundamento jurídico*
**Numeral matriz:** 3.1 · **Aplicabilidad:** las 11 modalidades (sin excepción — no requiere lógica de matriz)
**Base de código:** rama `micro-frontend` (el módulo de contratación está mergeado en `origin/micro-frontend` vía PR #411)

> **Objetivo único: cumplir los 2 criterios de aceptación de este HU.**
> Nada de construir piezas de otras HUs. El diseño deja las puertas abiertas (tabla extensible, campos parametrizados) pero **no** construye lo que no se necesita aquí.
>
> *Plan verificado con revisión adversarial de 3 frentes (sobre-alcance, huecos contra criterios, alineación con el repo) — 17 hallazgos aplicados.*

---

## 0. Paso previo obligatorio — actualizar la rama local

La copia local de `micro-frontend` está **~1.695 commits detrás** de `origin/micro-frontend`. El código del módulo (hiring-service, mfe-contratacion, migraciones) vive en origin, **no** en el working tree local todavía.

```bash
git pull origin micro-frontend
```

Tras el pull, verificar que existen: `backend/hiring-service/`, `apps/mfe-contratacion/`, `db/migrations/hiring/001` y `002`. Todo lo que sigue asume esta base.

---

## 1. Los dos criterios que hay que cumplir

| # | Criterio (Gherkin) | Qué implica |
|---|---|---|
| **C1** | Rol Gestor de Contratación, proceso en etapa Estudios Previos: diligencia y guarda → el sistema registra el **documento** en el **expediente electrónico**, con su **referencia normativa**, disponible para etapas siguientes | Validación de rol + expediente + persistencia + **snapshot del estudio previo como documento del expediente** + fundamento jurídico + consulta posterior |
| **C2** | Envía incompleto → el sistema **impide avanzar** y **señala los campos faltantes** | Campos obligatorios parametrizados + validación por tipo en el envío + respuesta con detalle + UI que los marca |

Regla de negocio del HU: asociación al expediente electrónico único (RF-SIS-04). Fundamento jurídico: Ley 80/1993 · Ley 1150/2007.

---

## 2. Fuera de alcance — explícito

| Pieza | Dónde vive |
|---|---|
| **Catálogo de modalidades** (tabla + endpoint) | HU de modalidad (RF-EST-03). Aquí "modalidad propuesta" es solo un campo `seleccion` del formulario con las 11 opciones en jsonb |
| Sugerencia de modalidad por cuantía/umbral, umbrales, SMMLV | RF-EST-03 |
| CDP y su bloqueo de apertura | RF-EST-05/06 |
| Flujo revisar / devolver / aprobar | HU de revisión (3.4) |
| Matriz de aplicabilidad y motor de 63 actividades | Base del módulo — este HU no filtra por matriz |
| Biblioteca de plantillas y generación de documentos | CU-CON-02 (RF-DOC) |
| **Consulta de trazabilidad** (endpoint GET + tab en UI) | HU de revisión/auditoría. Este HU solo **escribe** la traza |
| Tipos de campo `fecha` y `booleano` | Cuando llegue el formato real de la DC — un caso más en un switch |
| Estado del proceso (`EN_TRAMITE`…) y sus transiciones | HU de flujo de etapas. El estado que importa aquí vive en la actividad |
| Integraciones (Active Document, SECOP II, KLIC) | Fase posterior |
| Renombrar `hiring` | Decisión de equipo. Deuda registrada |

---

## 3. Documentos fuente — qué hay y qué falta

**Ya disponibles** (convertidos en `docs/contratacion/`): A1 requerimiento · A2 matriz · A3 flujo · A4 roles.

**Faltan — pedir:**

| Qué | Por qué | A quién |
|---|---|---|
| **A5 — Procedimientos Vigentes** | Fila vacía en Confluence, sin adjunto | Quien administra Anexos |
| **Plantilla/formato institucional del estudio previo** | Fuente real de la lista de campos — el hueco que el propio HU señala | Dirección de Contratación |

Mientras llegan: campos **provisionales** parametrizados (sección 8). Ajustarlos = `UPDATE`, cero código.

---

## 4. Fase A — Cimientos

### A1. Autenticación **y autorización por rol**

El servicio no trae nada de auth. Dos piezas, ambas con patrón ya existente en el repo:

1. **Autenticación JWT** — copiar de `legal-management-service/src/auth/`: `jwt.strategy.ts` (cookie `esap_access_token` + Bearer), `jwt-auth.guard.ts`, `public.decorator.ts`. Guard global; `/health` y `/status` como `@Public()`.
2. **Autorización por rol** — C1 dice "Dado rol **Gestor de Contratación**"; autenticar no basta. Copiar `RolesGuard` + decorador `@Roles` del patrón de `internal-institutional-control-service/src/auth/guards/roles.guard.ts`. Endpoints de escritura (`POST /procesos`, `PUT`/`POST` de estudio-previo, `POST` documentos) exigen el rol según A4. En el front, ocultar acciones de edición/envío sin el rol.

**Verificación:** sin token → 401 · autenticado sin rol → **403**.

### A2. Servicio de archivos

Patrón del proyecto (`diskStorage`, presente en 27 archivos del backend — 14 de ellos en legal-management) más lo que le falta:

```ts
storage: diskStorage({
  destination: process.env.HIRING_STORAGE_PATH || './uploads',
  filename: (req, file, cb) => cb(null, `${randomHex(32)}${extname(file.originalname)}`),
}),
limits: { fileSize: 25 * 1024 * 1024 },
fileFilter: /* solo PDF, DOCX, XLSX */
```

Hash **SHA-256** al guardar. Descarga solo por endpoint autenticado. Volumen docker con `HIRING_STORAGE_PATH`.

### A3. Fix migración `002_seed_hiring_auth_module.sql`

*(Tras el pull del paso 0.)* El `INSERT` del módulo `dashboard` no tiene guarda — segunda corrida falla o duplica. PR pequeño: envolver en `IF NOT EXISTS`.

---

## 5. Fase B — Migración `003` · modelo mínimo

Schema `hiring` (ya existe tras el pull). **Sin** tabla de modalidades, sin etapas, sin matriz.

```sql
-- Consecutivos sin carrera: secuencias de Postgres, no SELECT MAX
CREATE SEQUENCE hiring.radicado_seq;
CREATE SEQUENCE hiring.expediente_seq;

CREATE TABLE hiring.procesos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado         varchar(60) NOT NULL UNIQUE,   -- CTO-<año>-<nextval(radicado_seq)>
  objeto           text NOT NULL,
  etapa            int  NOT NULL DEFAULT 3,       -- materializa el "Dado" de C1
  fecha_radicacion timestamptz NOT NULL DEFAULT now(),
  created_by       varchar(120),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- Sin estado (HU de flujo), sin area_solicitante (vive en el formulario),
-- sin modalidad_id (RF-EST-03; "modalidad propuesta" es un campo del formulario)

CREATE TABLE hiring.expedientes (      -- RF-SIS-04
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id        uuid NOT NULL UNIQUE REFERENCES hiring.procesos(id),
  numero_expediente varchar(60) NOT NULL UNIQUE,  -- EXP-<año>-<nextval(expediente_seq)>
  estado            varchar(40) NOT NULL DEFAULT 'ABIERTO',
  fecha_apertura    timestamptz NOT NULL DEFAULT now()
);

-- Genérica por numeral: mismo costo que una tabla dedicada, evita migrar datos
-- cuando lleguen las HUs 3.2-3.6. Este HU solo usa '3.1'.
CREATE TABLE hiring.proceso_actividades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id    uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral       varchar(20) NOT NULL,
  estado        varchar(30) NOT NULL DEFAULT 'BORRADOR',  -- BORRADOR | EN_REVISION
  datos         jsonb NOT NULL DEFAULT '{}',
  version       int NOT NULL DEFAULT 1,   -- ★ optimistic lock: +1 en cada guardado
  enviado_por   varchar(120),
  enviado_at    timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proceso_id, numeral)
);

-- La parametrización que el propio HU pide
CREATE TABLE hiring.campos_formulario (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numeral      varchar(20) NOT NULL,
  codigo       varchar(80) NOT NULL,
  etiqueta     varchar(300) NOT NULL,
  ayuda        text,
  tipo         varchar(30) NOT NULL,  -- texto | texto_largo | numero | moneda | seleccion  (5 tipos: los que el seed usa)
  obligatorio  boolean NOT NULL DEFAULT false,
  grupo        varchar(120),
  orden        int NOT NULL,
  opciones     jsonb,                 -- obligatorio si tipo=seleccion
  activo       boolean NOT NULL DEFAULT true,
  UNIQUE (numeral, codigo)
);

CREATE TABLE hiring.documentos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id           uuid NOT NULL REFERENCES hiring.expedientes(id),
  numeral                 varchar(20),
  tipo                    varchar(30) NOT NULL DEFAULT 'ADJUNTO',  -- ADJUNTO | SNAPSHOT_FORMULARIO
  nombre                  varchar(300) NOT NULL,
  archivo_url             text,                    -- NULL para snapshot (contenido en BD)
  contenido_snapshot      jsonb,                   -- ★ snapshot inmutable del formulario al enviar
  archivo_nombre_original varchar(300),
  archivo_mime_type       varchar(120),
  archivo_tamano          bigint,
  hash_sha256             char(64) NOT NULL,       -- adjuntos: hash del archivo; snapshot: hash del jsonb canónico
  subido_por              varchar(120),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hiring.trazabilidad (   -- solo ESCRITURA en este HU
  id             bigserial PRIMARY KEY,
  proceso_id     uuid REFERENCES hiring.procesos(id),
  entidad        varchar(80) NOT NULL,
  entidad_id     uuid,
  accion         varchar(60) NOT NULL,   -- CREAR | GUARDAR | ENVIAR | ADJUNTAR
  detalle        jsonb,
  usuario_id     varchar(120),
  usuario_nombre varchar(200),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pa_proceso ON hiring.proceso_actividades(proceso_id);
CREATE INDEX idx_doc_exp    ON hiring.documentos(expediente_id);
CREATE INDEX idx_traza_proc ON hiring.trazabilidad(proceso_id, created_at DESC);
```

---

## 6. Fase C — Backend

Entidades TypeORM de las 5 tablas, registradas en `app.module.ts` (hoy `entities: []`).

### Endpoints

```
POST  /procesos                                 rol Gestor · crea proceso etapa 3 + expediente + fila 3.1 BORRADOR
GET   /procesos/:id                             cabecera
GET   /procesos/:id/estudio-previo              { definicionCampos, datos, estado, version }
PUT   /procesos/:id/estudio-previo              rol Gestor · borrador con whitelist + optimistic lock
POST  /procesos/:id/estudio-previo/enviar       rol Gestor · valida y registra snapshot
GET   /procesos/:id/expediente                  documentos (adjuntos + snapshot) — C1 "disponible"
POST  /procesos/:id/estudio-previo/documentos   rol Gestor · adjunto (multer A2) · 409 si EN_REVISION
GET   /files/:nombre                            descarga autenticada
```

Eliminados frente a la versión anterior: `GET /configuracion/modalidades` (sin catálogo) y `GET /trazabilidad` (la traza solo se escribe en este HU).

### Guardar borrador (`PUT`) — validado, no "libre"

- **Whitelist:** solo se aceptan claves que existan en `campos_formulario` (numeral 3.1, activos). Claves desconocidas → 422.
- **Validación por tipo:** `numero`/`moneda` numéricos, `seleccion` dentro de `opciones`. Tamaño del payload limitado.
- **Optimistic lock:** el cliente manda la `version` que leyó; si no coincide → 409; si coincide, se guarda y `version + 1`. Evita que dos pestañas se pisen.
- Precondición explícita: `proceso.etapa === 3`, si no → 409.
- 409 si estado `EN_REVISION`.

### Enviar (corazón de C2 y C1)

```ts
async enviar(procesoId: string, usuario: Usuario) {
  return this.dataSource.transaction(async (em) => {
    const pa = await em.findOne(ProcesoActividad, {
      where: { procesoId, numeral: '3.1' },
      lock: { mode: 'pessimistic_write' },          // sin carrera enviar-vs-enviar / guardar-vs-enviar
    });
    if (!pa) throw new NotFoundException();
    if (pa.estado === 'EN_REVISION') throw new ConflictException('Ya fue enviado');

    const campos = await em.find(CampoFormulario, {
      where: { numeral: '3.1', obligatorio: true, activo: true },
    });
    const faltantes = campos
      .filter(c => esVacio(c.tipo, pa.datos[c.codigo]))   // ★ por tipo, no String() genérico
      .map(c => ({ codigo: c.codigo, etiqueta: c.etiqueta, grupo: c.grupo }));

    if (faltantes.length) {
      throw new UnprocessableEntityException({
        message: 'Faltan campos obligatorios',
        camposFaltantes: faltantes,                        // ← C2
      });
    }

    // ★ C1: el estudio previo queda REGISTRADO COMO DOCUMENTO del expediente
    const snapshot = canonicalJson(pa.datos);              // orden de claves estable
    await em.save(Documento, {
      expedienteId: (await em.findOneByOrFail(Expediente, { procesoId })).id,
      numeral: '3.1',
      tipo: 'SNAPSHOT_FORMULARIO',
      nombre: 'Estudio previo',
      contenidoSnapshot: pa.datos,
      hashSha256: sha256(snapshot),
      subidoPor: usuario.nombre,
    });

    pa.estado = 'EN_REVISION';
    pa.enviadoPor = usuario.nombre;
    pa.enviadoAt = new Date();
    await em.save(pa);
    await this.traza.registrar(em, procesoId, 'estudio_previo', pa.id, 'ENVIAR', usuario);
    return pa;
  });
}
```

```ts
// esVacio por tipo — evita que 0, false o [object Object] cuenten mal
function esVacio(tipo: string, v: unknown): boolean {
  if (v === undefined || v === null) return true;
  switch (tipo) {
    case 'numero':
    case 'moneda':    return typeof v !== 'number' || Number.isNaN(v);
    case 'seleccion': return v === '' || (Array.isArray(v) && v.length === 0);
    default:          return typeof v !== 'string' || v.trim() === '';
  }
}
```

Tras el envío, `POST documentos` también devuelve 409 — el estudio enviado no se altera, ni sus adjuntos.

Trazabilidad: llamadas explícitas en el service (`CREAR`, `GUARDAR`, `ENVIAR`, `ADJUNTAR`), dentro de la misma transacción cuando aplica.

---

## 7. Fase D — Frontend (`apps/mfe-contratacion`)

### Reglas de la casa

- **Componentes:** solo `@esap-mfe/shared-ui` (alias ya en `vite.config.ts` tras el pull). Cero UI genérica nueva.
- **Estilos:** `ESAP_TOKENS` de `KanbanDesignStandard.tsx` — primario `#003DA5`, radios 10/12/8, botones L1/L2/semánticos, tarjeta con barra de acento.
- **Auth:** `useAuth` copiado de `mfe-control-interno`; sin rol Gestor → acciones de edición/envío ocultas o deshabilitadas.
- **Responsive:** `useResponsive`/`useIsMobile` de `shared-hooks`.
- **Accesibilidad:** WCAG 2.1 AA — foco visible, labels asociados, errores anunciados.
- Máximo 3 clics a cualquier función.

### Estructura

```
src/
├── components/
│   ├── ContratacionModulePremium.tsx     # entrada del MFE (reemplaza el placeholder)
│   ├── procesos/
│   │   ├── ListaProcesos.tsx
│   │   └── CrearProcesoModal.tsx         # objeto — sin selector de modalidad
│   └── estudio-previo/
│       ├── EstudioPrevioView.tsx         # tabs: Formulario · Adjuntos
│       ├── FormularioDinamico.tsx        # render desde campos_formulario, agrupado
│       ├── CampoDinamico.tsx             # 5 tipos: texto, texto_largo, numero, moneda, seleccion
│       ├── AlertaCamposFaltantes.tsx
│       └── PanelAdjuntos.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useEstudioPrevio.ts               # estado + version (optimistic lock) + errores
├── services/
│   └── contratacionService.ts
└── types/
```

### Manejo del 422 (C2 en pantalla)

1. Alerta arriba: "Faltan N campos obligatorios" con la lista.
2. Cada campo faltante marcado en rojo con su mensaje.
3. Clic en un ítem → scroll y foco al campo.
4. Al escribir, el error del campo se limpia.
5. Envío exitoso → `EN_REVISION`, formulario solo lectura, confirmación visible.
6. 409 por versión → aviso "otro usuario guardó cambios; recarga antes de continuar".

---

## 8. Campos provisionales del 3.1 (seed)

**PROVISIONALES** — derivados de Ley 80/1993 art. 25 y Decreto 1082/2015, a validar contra el formato real de la DC. Cambiarlos = `UPDATE`.

| Grupo | Campo | Tipo | Obligatorio | Opciones (jsonb) |
|---|---|---|---|---|
| Identificación | Objeto a contratar | texto_largo | Sí | — |
| Identificación | Área solicitante | texto | Sí | — (texto libre hasta tener catálogo institucional) |
| Identificación | Rubro presupuestal | texto | Sí | — |
| Necesidad | Descripción de la necesidad | texto_largo | Sí | — |
| Necesidad | Justificación | texto_largo | Sí | — |
| Objeto | Especificaciones técnicas | texto_largo | Sí | — |
| Objeto | Obligaciones del contratista | texto_largo | Sí | — |
| Valor | Valor estimado | moneda | Sí | — |
| Valor | Forma de pago | texto_largo | Sí | — |
| Plazo | Plazo de ejecución (días) | numero | Sí | — |
| Plazo | Lugar de ejecución | texto | No | — |
| Jurídico | **Fundamento jurídico** | seleccion | **Sí** ← C1 | `["Ley 80 de 1993", "Ley 1150 de 2007", "Ley 80 de 1993 y Ley 1150 de 2007", "Decreto 1082 de 2015"]` |
| Jurídico | Detalle normativo (artículos) | texto | No | — |
| Jurídico | Modalidad propuesta | seleccion | Sí | las 11 modalidades (de A2) como array jsonb |
| Riesgos | Análisis de riesgos | texto_largo | Sí | — |
| Garantías | Garantías exigidas | seleccion | No | `["Cumplimiento", "Calidad del bien o servicio", "Anticipo", "Salarios y prestaciones", "Responsabilidad civil extracontractual"]` |

`fundamento_juridico` materializa la "referencia normativa" de C1; el valor elegido queda en `datos` y en el snapshot del expediente.

---

## 9. Definition of done

| # | Verificación | Criterio |
|---|---|---|
| 1 | Sin token → 401 · autenticado **sin rol Gestor** → **403** | C1 (rol) |
| 2 | Crear proceso → radicado y expediente por secuencia (sin colisión concurrente) + fila 3.1 `BORRADOR` | Precondición |
| 3 | Guardar borrador incompleto → persiste sin reclamar; clave desconocida → 422; version vieja → 409 | C1 + prácticas |
| 4 | Enviar incompleto → 422 con `camposFaltantes[{codigo,etiqueta,grupo}]`; `0` y selección vacía evaluados por tipo | **C2** |
| 5 | UI: alerta + campos marcados + clic lleva al campo | **C2** |
| 6 | Enviar completo → `EN_REVISION`; `PUT` → 409; `POST documentos` → 409 | C2 |
| 7 | Dos ENVIAR simultáneos → uno gana, el otro 409 (transacción + lock) | Prácticas |
| 8 | Al enviar, el estudio previo queda como **documento** `SNAPSHOT_FORMULARIO` en el expediente, con hash SHA-256, autor y fecha | **C1** |
| 9 | `fundamento_juridico` visible en la consulta del expediente | **C1** |
| 10 | Adjuntos en `GET /expediente` con autor, fecha y hash | C1 |
| 11 | Trazabilidad registra CREAR / GUARDAR / ENVIAR / ADJUNTAR | RF-SIS-04 |
| 12 | Pantalla usable en móvil; teclado; foco visible | RNF |
| 13 | UI solo con `shared-ui` + tokens de `KanbanDesignStandard` | Esencia del proyecto |

---

## 10. Deuda registrada (consciente, no bloquea este HU)

| Deuda | Cuándo se paga |
|---|---|
| Lista definitiva de campos (hoy provisional) | Al llegar el formato de la DC — solo datos |
| Catálogo de modalidades como tabla | RF-EST-03 (HU de modalidad) |
| Consulta de trazabilidad (endpoint + tab UI) | HU de revisión (3.4) o auditoría |
| Tipos de campo `fecha` y `booleano` | Si el formato real los trae — un caso en un switch |
| Flujo devolver/aprobar | HU de revisión (3.4) |
| Motor de matriz y catálogo de 63 actividades | HUs siguientes — estas tablas les sirven de base |
| Nombre `hiring` (colisiona semánticamente con `hiring_date`) | Decisión de equipo |
| A5 "Procedimientos Vigentes" vacío en Confluence | Pedir el adjunto |
