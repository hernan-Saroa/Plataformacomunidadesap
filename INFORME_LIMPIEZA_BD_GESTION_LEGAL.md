# Informe — Auditoría y Limpieza de Base de Datos · Módulo Gestión Legal

**Servicio:** `legal-management-service` (NestJS + TypeORM + PostgreSQL, schema `legal_management`)
**Alcance de la revisión:** submódulos Juzgamiento Disciplinario, Centro de Comunicaciones y Términos e Informes; objetos globales de BD; migraciones del último pull; dependencias cross-schema.

---

## 1. Resumen ejecutivo

La base de datos de Gestión Legal se encuentra **en buen estado** tras la eliminación previa de la tabla `abogados`. La revisión confirmó que la gran mayoría de tablas de los tres submódulos tienen flujo completo (backend + frontend) y están en uso real.

Los hallazgos de depuración fueron **acotados y de bajo riesgo**: una tabla de pruebas, un grupo de funciones/secuencias huérfanas, y dos endpoints sin consumidor. Adicionalmente se detectó una tabla faltante que representaba un riesgo de error en ejecución.

No se identificó código muerto significativo en la lógica de negocio de los submódulos auditados.

---

## 2. Estado por submódulo

### 2.1 Juzgamiento Disciplinario
Todas las tablas del submódulo están **en uso con flujo completo**:

| Tabla | Estado |
|---|---|
| `decisiones_disciplinarias` | En uso |
| `excepciones_procesales` | En uso |
| `autos` | En uso |
| `actas` | En uso |
| `evidencias` | En uso |
| `actuaciones` | En uso (historial unificado) |
| `documentos`, `tareas_expediente`, `notas_expediente` | En uso |

`actors`, `comentarios` y `audiencias` tienen uso parcial dentro de juzgamiento, pero son tablas **compartidas** que sí se usan en Defensa Judicial. No se recomienda tocarlas. Los 20 endpoints de `juzgamiento.controller` tienen consumidor frontend.

### 2.2 Centro de Comunicaciones
Núcleo de correos electrónicos **completamente operativo**:

| Tabla | Estado |
|---|---|
| `correos_juridicos` | En uso (sync Microsoft Graph) |
| `adjuntos_correo` | En uso |
| `correo_juridico_historial` | En uso (timeline) |
| `correo_tracking_tokens` | En uso (tracking transparente) |
| `oficios_enviados` | En uso |

**Hallazgo:** dos endpoints sin consumidor en el frontend → `GET /correos/test-connection` y `POST /correos/batch-classify`.

### 2.3 Términos e Informes

| Tabla / Flujo | Estado |
|---|---|
| `terminos_procesales` | En uso (incluye CRON diario de alertas de vencimiento) |
| `pei_indicadores` / `pei_registros_avance` | En uso (módulo PEI completo) |
| `system_configurations` | En uso (configuración central) |
| `tasas_referencia` | **Feature pendiente** — backend listo, frontend usa datos simulados (mock) |
| Reportes `GL-001…GL-006` | **Por verificar** — backend lee datos reales, sin consumo frontend detectado |

---

## 3. Objetos huérfanos de base de datos (globales)

Objetos que no tienen entidad TypeORM, no son invocados por ningún trigger y no se referencian en el código:

| Objeto | Tipo | Motivo |
|---|---|---|
| `test_data` (+ `test_data_id_seq`) | Tabla | Residuo de pruebas, sin uso alguno |
| `generar_numero_concepto()` | Función | Su tabla destino `conceptos_juridicos` no existe |
| `generar_radicado_consulta()` | Función | Genera patrón `CONS-OJ-…`; el código genera `CJ-…` a nivel aplicación; sin trigger asociado |
| `seq_concepto_numero` | Secuencia | Asociada a función huérfana |
| `seq_consulta_radicado` | Secuencia | Asociada a función huérfana |
| `seq_radicado_oc` | Secuencia | Los radicados OC se generan en código (`REQ-OC-…`) |

---

## 4. Revisión de migraciones del último pull (326–336)

De las 11 migraciones nuevas, **solo 2 afectan el schema `legal_management`**, y ninguna entra en conflicto con la depuración:

| Migración | Acción | Observación |
|---|---|---|
| `327_remove_dsn_emails_from_correos_juridicos.sql` | `DELETE` de correos automáticos (DSN/acuses) en `correos_juridicos` | Solo datos, no schema. Compatible. |
| `335_remove_fecha_admision_expediente.sql` | `DROP COLUMN fecha_admision` en `expedientes` | Verificado: el código ya no usa `fechaAdmision` (0 referencias). Consistente. |

Las 9 restantes corresponden a otros módulos (RUND, CETAP, docentes, sedes, graduación, validación documental, control interno, PTA) y no recrean tablas eliminadas ni tocan los objetos huérfanos.

---

## 5. Hallazgos colaterales

| # | Hallazgo | Decisión |
|---|---|---|
| 1 | `solicitudes_insumos`: la entidad existe y se usa en `requerimientos-oc.service`, pero la tabla **no aparece en el schema** → riesgo de error en runtime | **Se corrige** (ver §6) |
| 2 | `synchronize` controlado por `TYPEORM_SYNC` (OFF por defecto) | Se mantiene como está |
| 3 | Mezcla de `uuid_generate_v4()` y `gen_random_uuid()` en la generación de UUID | Se mantiene como está |
| 4 | Endpoints sin consumidor (`test-connection`, `batch-classify`) | **Se corrige** (ver §6) |

---

## 6. Acciones ejecutadas

### 6.1 Cambios de código (compilados y verificados con `npm run build`)
- Depuración de los dos endpoints sin consumidor del Centro de Comunicaciones y de sus métodos de servicio asociados ya inutilizados. Se conserva la utilidad de diagnóstico a nivel Microsoft Graph (cubierta por test unitario).

### 6.2 Migraciones SQL generadas (pendientes de aplicación manual)
- **`337_create_solicitudes_insumos.sql`** — crea la tabla faltante `solicitudes_insumos`, alineada 1:1 con la entidad, con FK a `requerimientos_oc` (ON DELETE CASCADE) e índice por `requerimiento_id`. Idempotente (`CREATE … IF NOT EXISTS`).
- **`338_cleanup_legal_orphan_objects.sql`** — elimina la tabla `test_data`, las dos funciones huérfanas y las tres secuencias huérfanas. Incluye queries de validación previa en el encabezado.

### 6.3 Alcance de los cambios
Únicamente 2 archivos de código (controller y service de correos) y 2 archivos de migración. No se modificaron entidades, módulos, configuración ni frontend.

---

## 7. Pendientes / próximos pasos

1. **Aplicar migraciones** en orden (`337` y luego `338`), ejecutando previamente las queries de validación de `338`.
2. Reiniciar el servicio y verificar carga de los tres submódulos.
3. **Verificar consumo** del backend de Reportes (`GL-001…GL-006`); definir si se integra o se retira.
4. **Integrar** el frontend de `tasas_referencia` (actualmente con datos simulados) o planificar su retiro.

---

## 8. Conclusión

La depuración confirma que el módulo de Gestión Legal está saludable a nivel de base de datos. Las acciones ejecutadas eliminan basura residual sin impacto funcional, corrigen una inconsistencia entre el modelo de datos y el schema (tabla faltante), y reducen superficie de API no utilizada. Dos puntos quedan abiertos para definición de producto (Reportes y Tasas de Referencia).
