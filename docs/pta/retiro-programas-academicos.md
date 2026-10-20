# Retiro de programas académicos

El botón **Eliminar Programa** retira la oferta disponible y conserva el
programa, sus asignaturas, núcleos y referencias de PTAs y Programación
Académica. Sustituye el borrado físico que fallaba por claves foráneas cuando
esas referencias estaban en uso.

- Con un período seleccionado, se desactiva su oferta en ese período. La
  oferta de otros períodos se conserva. Las reglas de listado impiden que el
  programa reaparezca por su período propietario o por el fallback de un
  programa sin oferta.
- Al retirar el último período, o hacer un retiro global por API, se marca el
  programa con `activo=false` y `deleted_at`. No se borran planes ni asignaturas.
- Los catálogos para nuevas selecciones excluyen programas retirados. La
  clasificación histórica de Docencia consulta también programas retirados,
  para conservar el nivel y el alcance de revisión/aprobación del PTA.
- Una importación explícita que vuelva a incluir el programa restaura su mismo
  identificador y reactiva la oferta incluida en la matriz. Se conservan los
  cupos existentes y las otras ofertas no incluidas en el archivo.
- Un período inexistente no se interpreta como una petición de retiro global.
- La confirmación explica el alcance; un rechazo muestra el mensaje real del
  servidor, mantiene el programa y permite reintentar. La lista se actualiza
  al recibir la confirmación y descarta respuestas anteriores de carga.

## Validación

5 pruebas del frontend de Programas Académicos, 10 pruebas del servicio de
programas y 1.114 pruebas del servicio PTA aprobadas (una omisión preexistente
en PTA). Compilaciones de Programas Académicos, auth-service y servicio PTA
correctas. Las pruebas de retiro usan datos simulados; no se retiraron programas
reales durante la verificación.

Para probar en QA se deben desplegar esos tres componentes. El ajuste utiliza
columnas existentes y no requiere una migración de base de datos.
