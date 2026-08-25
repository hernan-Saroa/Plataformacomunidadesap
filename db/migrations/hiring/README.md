# Migraciones del esquema `hiring`

No hay runner con tabla de control: se aplican a mano con `psql`, en orden de
número. `synchronize` está apagado en TypeORM — el esquema lo gobiernan estos
archivos.

## Dos líneas que convivieron

Durante la fase 2 avanzaron dos líneas en ramas distintas y ambas usaron los
números 016–025:

- **Línea funcional** (etapas 5 y 6): publicación del pliego, MIPYME,
  documentos del proceso, apertura, riesgos, adendas, ofertas y comité.
  Conserva los números **016–025**.
- **Línea de configuración** (módulo de configuración de etapas): reglas,
  matriz, salvedades y campos configurables. Se renumeró a **026–033** al
  integrarse; una base que las aplicó con sus números viejos (020–027) tiene
  exactamente el mismo contenido.

## Duplicados históricos

Los pares 010/011/012 con dos nombres son de ramas viejas y **ambos están
aplicados**; se dejan porque documentan lo que corrió. Existieron además
copias byte a byte renumeradas (017_causal_normativa, 018_campos_solo_del_hu,
019_limpia_datos_de_campos_retirados) que se eliminaron del directorio: eran
idénticas a 010/011/012 y su prefijo chocaba con la línea funcional.

Volvió a pasar en los números **035–040**, y por la misma causa: las etapas 6 y
7 y la etapa 8 se construyeron en paralelo sin ver el numerador de la otra.

| Nº | Etapas 6 y 7 | Etapa 8 |
| --- | --- | --- |
| 035 | `criterios_de_evaluacion` | `contrato_electronico` |
| 036 | `numerales_de_las_etapas_5_y_6` | `suscripcion_contrato` |
| 038 | `evaluacion_por_fuera` | `designacion_supervisor` |
| 039 | `traslado_y_subsanaciones` | `registro_presupuestal` |
| 040 | `adjudicacion` | `publicacion_contrato` |

**No se renumeran**: los dos juegos ya corrieron en las bases de quienes los
construyeron, y renombrarlos ahora obligaría a rastrear cuál se aplicó dónde.
Se dejan documentados, como los de 010/011/012.

Aplicarlos en cualquier orden dentro del mismo número da el mismo resultado: no
hay tabla de la etapa 8 que dependa de una de la 6 o la 7, ni al revés. La 037
y la 041 no chocan porque solo una línea las usó.

## Cuidado

- `013_documentos_proceso.sql` **no** crea `documentos_proceso`: es la carga
  documental del estudio previo. La tabla `documentos_proceso` la crea la
  `019_documentos_del_proceso.sql`.
- `010_causal_normativa.sql` no es completamente idempotente: no reaplicar.
