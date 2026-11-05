# Revisión de cambios RUND — 3 de noviembre de 2026

Se revisaron los cambios de OCR, progreso por archivo, archivos eliminados,
soportes admitidos, estados de revisión y migración 675. Se conservaron los
cambios existentes del workspace; no se modificaron guards de autenticación.

## Hallazgos corregidos

1. Una devolución antigua del bloque podía reaparecer al revisar el archivo que
   reemplazó al anterior. Ahora se conserva una devolución explícita únicamente
   si el bloque sigue devuelto; las devoluciones vigentes de datos se comprueban
   por su huella. Una prueba con PostgreSQL reproduce el caso antes de la
   corrección y comprueba el resultado después.
2. El orden visible de la cola se recalculaba con `Date`, que pierde los
   microsegundos usados para desempatar al reordenar. PostgreSQL calcula ahora
   las posiciones y el worker usa el mismo desempate por identificador. La
   integración prueba dos trabajos con el mismo instante inicial y un orden
   elegido opuesto al de sus identificadores.
3. Faltaba el tipo del índice del callback de las pestañas OCR. Se corrigió y se
   compararon los diagnósticos TypeScript con `HEAD`.

Los navegadores de prueba usan cachés de Vite independientes y dependencias
explícitas. Esto evita compartir la caché de desarrollo y escanear otras
aplicaciones del monorepo durante estas verificaciones.

## Validación

- Regresión amplia: 51 suites backend, 666 pruebas aprobadas; 29 suites frontend,
  386 pruebas aprobadas. Incluye permisos, privacidad, edición, carga masiva,
  documentos, fotos, incorporación, eliminación, trazabilidad y OCR.
- Después de las correcciones: 153 pruebas backend de los módulos afectados
  aprobadas.
- Integración con tablas temporales PostgreSQL: revisión por dato y por archivo,
  reemplazos, eliminación, rollback, aprobación sin documentos, correcciones
  explícitas, recuperación e idempotencia de la migración 675.
- OCR real con PDF ficticio, PaddleOCR y Ollama: extracción, confirmación humana,
  reanálisis, obsolescencia, reintentos y orden de cola aprobados.
- Navegador real con API simulada: pestañas OCR, progreso, selección individual,
  lote ordenado, correcciones, persistencia y seis pestañas de revisión en móvil
  y escritorio. Se comprueban respaldos pendientes/rechazados excluidos y
  respaldos admitidos incluidos.
- Compilaciones de backend y frontend PTA correctas.
- Consulta de datos locales: cero diferencias de estado entre el listado,
  `estadoAprobacion` y el estado calculado desde los bloques; no había trabajos
  reales en procesamiento antes de reiniciar exclusivamente PTA.

## Diagnósticos previos

La comparación de tipos de los archivos frontend modificados encontró cuatro
diagnósticos presentes también en `HEAD`, todos en `BancoDocentesPTA.tsx`:
namespace global `JSX`, propiedad heredada `items`, acceso a `error` en una unión
y un arreglo inferido como `unknown[]`. No hay diagnósticos nuevos introducidos
por estos cambios. Esta comparación no equivale a un chequeo limpio de tipos
de todas las aplicaciones del monorepo.

Las integraciones de esta revisión usaron datos ficticios y transacciones con
rollback. No se aplicaron nuevas migraciones a expedientes reales durante esta
revisión; la normalización 675 del caso anterior conserva su auditoría única.
