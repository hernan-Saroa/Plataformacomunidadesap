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

## Cuidado

- `013_documentos_proceso.sql` **no** crea `documentos_proceso`: es la carga
  documental del estudio previo. La tabla `documentos_proceso` la crea la
  `019_documentos_del_proceso.sql`.
- `010_causal_normativa.sql` no es completamente idempotente: no reaplicar.
