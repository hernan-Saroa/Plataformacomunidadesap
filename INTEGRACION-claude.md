# Contrato para Codex — periodo único (EFDS-2328)

Desbloquea EFDS-2309 (botón de cerrar), EFDS-2312 (selector) y EFDS-2314 (carga masiva). El backend lo construye Claude en `feature/pa/ronda-claude`; mientras tanto, trabaja con estos datos simulados. Si algo del contrato no te sirve, dilo en `INTEGRACION-codex.md` antes de construir sobre él.

## Reglas aprobadas que el contrato refleja

- El periodo es **el de la plataforma** (`academic_work_plan.periodo_academico`, el del PTA). Programación Académica no crea periodos propios.
- **Se programa en planeación y en curso; solo se bloquea lo cerrado.**
- **"Cerrar" en Programación Académica cierra solo la programación**, no el periodo de la plataforma.
- **Activar solo lo hace el administrador del módulo**, con una confirmación que diga cuántos PTA quedan terminados y de qué periodos.
- El interperiodo (`2026-INT`) queda fuera de la migración hasta que el negocio diga a qué semestre pertenece.

## 1. `GET /programacion-academica/api/v1/periodos`

Respuesta `{ success: true, data: RespuestaPeriodos }`:

```ts
interface RespuestaPeriodos {
  periodos: PeriodoPlataforma[];   // ordenados por fechaInicio descendente
  legado: PeriodoLegado[];         // periodos viejos sin equivalencia (2026-INT, pruebas)
  permisos: {
    crear: boolean;                // crear un periodo de plataforma
    activar: boolean;              // activar uno (solo administrador del módulo)
    cerrarProgramacion: boolean;   // cerrar la programación de un periodo
    importar: boolean;             // carga masiva de asignaturas
  };
}

interface PeriodoPlataforma {
  idPeriodo: string;               // id de periodo_academico, como TEXTO ("12")
  modelo: 'plataforma';
  codigo: string;                  // "2026-1"
  anio: number;
  semestre: 1 | 2;
  fechaInicio: string;             // "YYYY-MM-DD"
  fechaFin: string;
  estadoPlataforma: 'planeacion' | 'concertacion' | 'en_curso' | 'cerrado';
  programacion: {
    estado: 'abierta' | 'cerrada';
    cerradaEn: string | null;      // ISO
  };
  programable: boolean;            // estadoPlataforma !== 'cerrado' && programacion.estado === 'abierta'
  esActivo: boolean;               // estadoPlataforma === 'en_curso'
}

interface PeriodoLegado {
  idPeriodo: string;               // UUID de periodo_programacion
  modelo: 'legado';
  codigo: string;                  // "2026-INT", "PRUEBA-CLAUDE"
  nombre: string;
  tipo: 'periodo_regular' | 'creditos_virtual' | 'interperiodo';
  estado: 'planeacion' | 'activo' | 'cerrado';
  motivo: string;                  // por qué no se migró
}
```

**Selector (EFDS-2312):** muestra `periodos`. Selección por defecto: el que tenga `esActivo`; si no hay, el primero. Los `legado` van aparte, en un grupo "Periodos anteriores al modelo único", sin mezclarlos. Un periodo con `programable: false` se puede consultar, pero no se edita: el backend rechaza toda escritura con 409 (EFDS-2301).

**Los permisos los calcula el servidor.** No deduzcas permisos de los roles en el navegador. Si `permisos.activar` es `false`, no muestres el botón; aunque lo muestres, el backend rechaza.

## 2. El `idPeriodo` sirve igual en todas las rutas

Toda ruta que hoy recibe un periodo acepta el `idPeriodo` de `GET /periodos`, sea `plataforma` (número en texto) o `legado` (UUID):

- `GET /horarios?periodo=`
- `GET /grupos?asignatura=&periodo=`
- `POST /grupos` (con `idPeriodo` en el cuerpo)
- `GET /publicaciones/:idPeriodo`
- `GET /publicaciones/:idPeriodo/pendientes-cierre`
- `POST /publicaciones/:idPeriodo/publicar`
- `POST /publicaciones/:idPeriodo/retirar`
- `POST /publicaciones/:idPeriodo/cerrar`
- `GET /validacion/vivos?periodo=`

**Grupos en un periodo de plataforma:** `POST /grupos` acepta además `tipoOferta: 'periodo_regular' | 'creditos_virtual' | 'interperiodo'` (por defecto `periodo_regular`). La oferta pasa a ser un atributo del grupo, no un periodo aparte.

## 3. Cerrar la programación (EFDS-2309)

`POST /programacion-academica/api/v1/publicaciones/:idPeriodo/cerrar`

- Cierra **la programación** del periodo, no el periodo de la plataforma.
- Exige `permisos.cerrarProgramacion`.
- Devuelve 409 si hay franjas ni aprobadas ni en excepción. El mensaje dice cuántas son; muéstralo tal cual.
- Respuesta: el mismo `EstadoPublicacion` de hoy.
- Después de un 2xx, invalida con `invalidarProgramacion('programacion', 'publicaciones')` y vuelve a pedir `GET /periodos`: el periodo queda con `programacion.estado = 'cerrada'` y `programable = false`.

## 4. Crear y activar (pantalla de periodos)

Estas rutas son **los servicios del PTA**. Programación Académica los llama; no los duplica.

| Acción | Ruta (gateway) | Notas |
|---|---|---|
| Crear | `POST /pta/api/v1/periodos-academicos` con `{ anio, semestre, fechaInicio, fechaFin }` | Nace en `planeacion`. El servidor valida duplicados y que las fechas no se solapen con otro periodo. |
| Impacto de activar | `GET /pta/api/v1/periodos-academicos/:id/impacto-activacion` | **Nuevo.** `{ codigo, ptasATerminar: number, porPeriodo: [{ codigo, ptas }], periodosACerrar: string[] }`. Es de solo lectura. |
| Activar | `PATCH /pta/api/v1/periodos-academicos/:id` con `{ estado: 'en_curso' }` | Cierra los periodos anteriores y termina los PTA de los demás. **Antes de llamarla, muestra la confirmación con el impacto.** |

La confirmación de activar es obligatoria y usa los números del servidor, no una cuenta del navegador:

> Activar 2026-2 terminará 37 PTA (2026-1: 35, 2025-2: 2) y cerrará el periodo 2026-1. ¿Continuar?

## 5. Carga masiva (EFDS-2314)

Usa el importador existente del PTA. No lo copies.

1. `POST /pta/api/v1/asignaturas-import/upload?periodo_codigo=<codigo>&dry_run=true` (multipart, campo `file`). Muestra el resultado de la validación.
2. Si el usuario confirma, repite la llamada con `dry_run=false`.

⚠️ **Pasa solo códigos que vengan de `GET /periodos`.** Si el importador recibe un código que no existe, crea un periodo "en curso" saltándose las reglas; ya está reportado a su dueño. Con un código existente no cambia el estado del periodo. La opción de agregar una asignatura a mano se queda.

## 6. Periodos de prueba — pendiente de aprobación de Tomás

En el modelo nuevo un periodo es año-semestre (`2026-1`) y es único, así que no puede llamarse `PRUEBA-CODEX-2`. Propuesta: **2099-1 para Claude y 2099-2 para Codex**, en fechas que no se solapen. Hasta que Tomás lo apruebe, usa datos simulados.

## 7. Estado de construcción

| Pieza | Estado |
|---|---|
| `GET /periodos` | en construcción (Claude) |
| `idPeriodo` de plataforma en las rutas de la sección 2 | en construcción (Claude) |
| Cerrar solo la programación | en construcción (Claude) |
| Impacto de activar y permiso del administrador en el PTA | en construcción (Claude) |
| Importador | existe, sin cambios |

Te aviso en este archivo cuando cada pieza esté en `feature/pa/ronda-pruebas`.
