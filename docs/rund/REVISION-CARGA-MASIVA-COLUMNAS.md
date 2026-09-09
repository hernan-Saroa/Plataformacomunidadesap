# Revisión de territoriales y columnas de carga RUND

Fuente revisada: `CargaDocentes_RUND_2025-1_FINAL.xlsx`, entregada por el usuario.
Hoja `CARGA_DOCENTES`: 263 registros y **38 columnas reales** (el título del
archivo anuncia 39). Los registros coinciden con la carga guardada en 2026-2;
el título del archivo no se usó para cambiar el periodo.

## Resultado

- Antes: 234 de los 263 registros no resolvían nombre territorial. La carga
  conservaba IDs de seccionales que ya no existen, sin conservar el nombre
  reportado. `NORTESANTANDER` además se había asociado por coincidencia parcial
  a Santander.
- Ahora: los 263 conservan su territorial informativa del archivo, incluidos
  META y NORTESANTANDER. Listado, cabezote y bloque Vinculación usan ese nombre.
  Los filtros por catálogo reconocen las etiquetas, sin cambiar asignaciones.
- Los 262 perfiles con acceso al listado tienen territorial visible. El
  registro restante conserva sus datos pero no tiene rol DOCENTE activo;
  no se reactivó ni se modificaron sus permisos.
- La columna Vinculación muestra la vinculación y debajo la categoría.
- El panel muestra tipo y número de documento, nivel de formación, régimen,
  situación categoría, investigación y evaluación con su campo correcto.
  Conserva ceros y distingue el puntaje restringido de un dato ausente.
- Cada pestaña permite desplegar **Datos originales del archivo de carga**.
  Así se consultan las 38 columnas, incluidos teléfonos y correos múltiples,
  edad reportada y observaciones, conservando las correcciones del perfil actual.

## Correspondencia de las columnas

| Bloque | Columnas del archivo |
|---|---|
| Identidad (8) | DOCUMENTO_IDENTIDAD, TIPO_DOCUMENTO, NOMBRE_COMPLETO, GENERO, SEXO_BIOLOGICO, FECHA_NACIMIENTO, EDAD, RANGO_EDAD |
| Contacto (3) | CORREO_INSTITUCIONAL, CORREO_PERSONAL, TELEFONO |
| Formación (7) | NIVEL_FORMACION, TITULO_PREGRADO, TITULO_ESPECIALIZACION, TITULO_MAESTRIA, TITULO_DOCTORADO, TITULO_POSDOCTORADO, PERFIL_ACADEMICO |
| Vinculación (15) | VINCULACION, REGIMEN_NORMATIVO, HORAS_PTA, TERRITORIAL, DEDICACION, DEDICACION_HORAS_SEMANA, CATEGORIA_ESCALAFON, INICIO_VINCULACION, FIN_VINCULACION, ESTADO_DOCENTE, ACTO_ADMINISTRATIVO, ORIGEN_VINCULACION, PUNTAJE_SALARIAL, SITUACION_ADMINISTRATIVA, SITUACION_CATEGORIA |
| Académico (3) | NUCLEO_TEMATICO, INVESTIGACION_ACTIVA, ULTIMA_EVALUACION |
| Transversal (2) | OBSERVACIONES, ID_RUND |

La edad del perfil se calcula a la fecha actual; la reportada se conserva en
el desplegable. El ID RUND vacío en el archivo se genera en el sistema. El
teléfono principal y el correo de acceso mantienen las reglas existentes;
los demás valores del archivo ya no se pierden para la consulta informativa.
Los 263 puntajes coinciden con el Excel a dos decimales; las ocho diferencias
del comparador de texto provienen de precisión numérica almacenada.

## Persistencia y recuperación

La migración `429_preserve_rund_import_information.sql` agrega a Docente:

- `territorialReportada`: texto informativo independiente del ID operativo.
- `datosCargaMasiva`: copia de las 38 columnas permitidas de la última carga.

Las nuevas cargas guardan ambos datos. Una territorial desconocida se acepta
como información en el masivo; no se asigna Sede Central por defecto. La
edición de otros campos conserva la asignación operativa cuando no cambia el
nombre reportado. Las reglas de creación manual siguen vigentes.

Se corrigió la persistencia de fechas civiles: los objetos Date UTC se
estaban convirtiendo al día anterior al guardarse en PostgreSQL sin zona
horaria. Se usan cadenas de fecha para nacimiento y medianoche civil para
inicio/fin. Con el archivo se corrigieron **263 nacimientos, 263 inicios y
159 fines** que presentaban exactamente ese desfase. Ejemplo reportado:
nacimiento de Abel, `1966-01-16` → `1966-01-17`.

La recuperación exigió documento único, nombre coincidente y coincidencia de
diez campos de la carga, además del patrón exacto de desfase de fechas. Fue
simulada con rollback antes de aplicarse en una transacción. Se conservó el
Excel en RundCargaMasiva y se agregó un registro de auditoría por perfil con
valores previos, nuevos y hash del archivo. La segunda simulación informa
263 registros ya recuperados y cero cambios pendientes.

No se modificaron territorialId, personaId, seccionales de personas, CETAP,
sede, periodos, ID RUND, horas, puntajes, estados, roles ni relaciones PTA.
La reconciliación operativa con Estructura Organizacional queda separada de
esta recuperación informativa. No se extrapoló la carga a periodos históricos
sin una fuente comprobada para esos registros.

## Seguridad y verificación

El RBAC recursivo protege documento y puntaje también dentro de la copia
original. La interfaz exige autorización explícita para mostrarlos. El
historial de corrección no duplica el puntaje en texto libre.

- Backend: 192 pruebas de 23 suites aprobadas, más un caso nuevo de
  conservación de la asignación al editar (193 casos distintos).
- Frontend: 46 pruebas de seis suites RUND aprobadas.
- Compilaciones PTA de backend y frontend correctas.
- PostgreSQL real, transacción de solo lectura: listado, cabezote, tarjeta,
  38 columnas originales y enmascaramiento comprobados. Filtros: Meta 15,
  Norte de Santander 14 y Santander 8 registros.
- Persistencia de fechas comprobada con PostgreSQL y preparación de valores
  de TypeORM en America/Bogota, UTC y Asia/Tokyo.
- Chromium, componentes con datos ficticios: 38 campos en seis bloques a
  1440 y 390 px sin desbordamiento ni exposición salarial a roles restringidos.
  Capturas locales: `build/qa-rund-carga/`. No equivale a una sesión autenticada
  completa de la aplicación.

Informe agregado sin datos personales:
`validacion-columnas-carga-masiva.json`.

Comandos de diagnóstico reproducibles:

```powershell
node scripts/audit-rund-excel.cjs "C:/Users/equipo/Downloads/CargaDocentes_RUND_2025-1_FINAL.xlsx" 2026-2
node scripts/verify-rund-import-readonly.cjs
node scripts/repair-rund-import-information.cjs "C:/Users/equipo/Downloads/CargaDocentes_RUND_2025-1_FINAL.xlsx" 2026-2
```

El último comando simula y revierte. `--apply` permite aplicar exclusivamente
la recuperación validada en PostgreSQL local; no vuelve a importar usuarios.
