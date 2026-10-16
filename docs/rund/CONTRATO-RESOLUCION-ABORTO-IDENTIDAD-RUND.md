# Resolución de abortos de identidad que Auth no ha aplicado

Estado: preparatorio, validado localmente. No conectado a las entradas de negocio
ni a AppModule. Complementa los contratos de ejecución (66), coordinación (64) y
registro/aplicación Auth (62–63). No requiere una migración adicional a 008–010
RUND y 669–670 Auth; no se ejecutan migraciones al arrancar el servicio.

## Método servidor y hechos que acredita

`AuthIdentityExecutionService.resolverAborto(intencionId)` recibe solo el ID
estable ya preparado. Exige decisión local `ABORTADA`, fecha/motivo admitidos y
contexto nativo `PREPARADA`. Una intención inexistente devuelve 404; un ID
inválido, 400; una ejecución abierta o con commit confirmado, 409. No aborta
implícitamente una ejecución todavía abierta.

1. Si RUND ya guarda el recibo `CANCELADA`, devuelve el estado sin HTTP.
2. Consulta Auth por HTTP y persiste su recibo con la coordinación existente.
3. Una ausencia explícita válida permite registrar **el mismo UUID y huella**,
   y después cancelarlo. Así, un registro tardío tampoco puede reactivarlo.
   No se envía el comando, se aplica identidad ni se genera otro UUID.
4. Una operación registrada se cancela mediante la API propietaria Auth.
   Otro GET confirma y guarda el recibo terminal en RUND.
5. Auth ya aplicado conserva `AUTH_APLICADA` y `resolucionAuthPendiente: true`
   mientras no se confirme localmente una COMPENSADA mediante el punto 69.
   No se borran o modifican personas, usuarios, contraseñas o roles.

La respuesta es el estado de ejecución existente. `CANCELADA` con
`resolucionAuthPendiente: false` acredita la cancelación propietaria de una
intención que no aplicó identidad. `AUTH_APLICADA` con el indicador verdadero
acredita trabajo pendiente de compensación, aun cuando resolverAborto haya podido
consultar el hecho. El llamante debe distinguir ambos resultados.

## Fallos y concurrencia

- HTTP ocurre fuera de transacciones RUND; la persistencia posterior del recibo
  usa sus bloqueos, huella y barreras inmutables existentes.
- Aplicar y cancelar compiten por la misma operación Auth. Un 409 al cancelar solo
  se resuelve si un GET posterior confirma `APLICADA` o `CANCELADA`. Un registro
  todavía no terminal mantiene el conflicto; una caída o DTO inválido mantiene 503.
- Perder la respuesta de registro deja el UUID original recuperable por GET.
  Perder la respuesta de cancelación o fallar al persistirla localmente deja el
  recibo remoto recuperable; reanudar no repite el POST cuando GET ya lo confirma.
- Una respuesta REGISTRADA iniciada antes de cancelar no reemplaza el recibo final.
  Cancelaciones simultáneas convergen sin cambiar fecha/huella o reabrir el aborto.
  Una lectura de ausencia desactualizada puede producir 503; reanudar conserva ID
  y estado. No hay bucle automático de reintentos ni compensación implícita.
- 404 de ruta, caída y DTO parcial nunca se interpretan como ausencia de operación.
  Un recibo de otra huella devuelve conflicto antes de cancelar.

## Prueba interna preparatoria de aborto

`AuthIdentityAbortProofController` declara:

`GET /internal/rund/v1/identidad/intenciones/:intencionId/aborto`

Forma directa, antes de cualquier envoltura global de respuesta:

```json
{
  "pruebaAborto": {
    "version": 1,
    "intencionId": "11111111-1111-4111-8111-111111111111",
    "operacionAuthId": "22222222-2222-4222-8222-222222222222",
    "huellaComando": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "huellaContexto": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "decisionNativa": "ABORTADA",
    "estadoNativo": "PREPARADA",
    "abortadaEn": "2026-10-15T10:01:00.000Z",
    "motivoAborto": "FALLO_NEGOCIO"
  }
}
```

- Solo se devuelve tras comprobar aborto irreversible y ausencia de commit nativo.
  Los triggers de 009–010 mantienen esa exclusión después de responder.
- `InternalServiceGuard` exige `x-internal-service-token`; un JWT no lo sustituye.
  `@Public()` solo omite JWT, como las otras API entre servicios. Cache-Control:
  `private, no-store`. No expone comando, identidad, resultado o recibo Auth.
- Es un GET exclusivamente local: disponible en el fixture aun cuando Auth falla.
  Usa los mismos 400/404/409 descritos arriba; no fabrica una prueba negativa vacía.
- El controlador pertenece al módulo preparatorio `AuthIdentityExecutionModule`,
  **que sigue fuera de AppModule**. Declararlo no lo publica en el servicio activo.
  El gateway rechaza sus rutas normal y codificada incluso con JWT/token.
- Esta prueba acredita un hecho RUND, no que Auth canceló o revirtió una identidad.
  Auth la consume para compensar ediciones existentes en el punto 68; no es una firma transportable
  que un llamante pueda adjuntar y usar como autorización de borrado.

## Validación y límites de activación

Pruebas unitarias y HTTP/PostgreSQL real en bases temporales ficticias separadas;
RUND no tiene schema Auth y el rol de cancelación Auth solo accede al registro de
operaciones. Se comprueban recuperación, carreras, inmutabilidad y ausencia de
escrituras de identidad al cancelar. Evidencia:
[validacion-resolucion-aborto-identidad-rund.json](validacion-resolucion-aborto-identidad-rund.json).

Este corte cierra la cancelación de intenciones no aplicadas. El punto 68 implementa
la [compensación Auth de ediciones existentes](CONTRATO-COMPENSACION-IDENTIDAD-AUTH.md),
con imágenes privadas, aborto verificado y protección ante cambios/reutilización
conocida. El punto 69 agrega su [conciliación en RUND](CONTRATO-CONCILIACION-COMPENSACION-RUND.md);
siguen las altas/revisiones explícitas.
No basta invertir camposModificados ni borrar una cuenta reutilizada.

Continúan pendientes las entradas reales con permisos/OTP/prevalidación/soporte,
preview sin escritura remota, correo durable posterior al commit y aceptación por
instalación. La bandera de aplicación Auth permanece apagada. No se cambia el
escritor activo, sus migraciones de arranque o variables de ambiente.
