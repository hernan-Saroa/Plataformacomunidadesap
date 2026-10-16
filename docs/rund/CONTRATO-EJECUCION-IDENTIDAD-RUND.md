# Ejecución reanudable y decisión de aborto nativo

Punto 66. Orquesta el camino Auth → RUND desde el
[contexto durable](CONTRATO-COMMIT-NATIVO-IDENTIDAD-RUND.md) y cierra la carrera entre
abortar y confirmar el perfil. Sigue fuera de los módulos activos, sin worker,
activación o sustitución de la escritura Auth local existente. El punto 67 añade
[resolución de abortos no aplicados y prueba interna preparatoria](CONTRATO-RESOLUCION-ABORTO-IDENTIDAD-RUND.md);
su controlador está declarado en el módulo desconectado, sin publicación activa.

## Decisión durable

Migración `backend/rund-service/db/migrations/010_rund_identidad_ejecucion.sql`, posterior
a 009. Crea una tabla con FK al contexto nativo, su huella, fecha y decisión:

| Decisión nativa | Significado |
|---|---|
| EN_CURSO | El commit nativo está permitido; consultar estadoNativo para saber si ya ocurrió. |
| ABORTADA | El commit nativo queda prohibido definitivamente para esa intención. |

La migración incorpora los contextos existentes sin cambiar su contenido o resultado.
Repetirla conserva abortos y fechas; no borra o reactiva decisiones. Todos los vínculos
y consultas SQL son propios de RUND. Los flujos activos no usan esta tabla nueva.

La preparación de contexto del punto 65 crea también la decisión EN_CURSO en su misma
transacción. Si el contexto ya existe, conserva la decisión anterior, incluido ABORTADA.
El coordinador nativo requiere esta tabla antes de confirmar operaciones nuevas.
Por eso sus fixtures aplican ahora 010; no hay migración automática en el arranque.

## Operaciones servidor

| Método | Comportamiento |
|---|---|
| `preparar(id, comando, escritura)` | Congela contexto e intención mediante el contrato del punto 65; no hace HTTP. |
| `consultar(id)` | Devuelve decisión local, estados Auth/nativo y resultado nativo conocido, sin exponer el contexto completo. |
| `ejecutar(id)` | Reanuda desde el contexto persistido: concilia Auth, registra si corresponde, aplica con el mismo UUID y confirma el commit nativo. |
| `recuperar(id)` | Consulta únicamente el recibo Auth y actualiza su journal; no aplica identidad ni escribe el perfil. |
| `abortar(id, motivo)` | Persiste la prohibición local si el commit no ocurrió; sin HTTP, cancelación o compensación Auth. |
| `resolverAborto(id)` | Exige aborto previo; concilia y cancela la intención no aplicada en Auth. Una aplicada permanece pendiente de compensación. |
| `pruebaAborto(id)` | Consulta local mínima de aborto irreversible sin commit; rechaza ejecuciones abiertas o confirmadas. |

El ID sigue siendo una intención estable del proceso servidor. ejecutar no recibe otro
payload con el cual reemplazar el contexto. Verifica sus huellas y usa el mismo UUID
Auth; no crea otro ID por timeout. Si ya existe CONFIRMADA nativa, recupera el resultado
sin llamar a Auth o ejecutar otra vez el escritor. CONFIRMADA no acredita envío de correo.

Una aplicación Auth confirmada permite completar RUND sin aplicar identidad otra vez.
Si falla el commit nativo, se propaga el error y se conserva el contexto pendiente;
no se aborta o compensa automáticamente. La recuperación es explícita. Ruta ausente,
caída, contrato parcial o respuesta perdida no fabrican ausencia, cancelación o éxito.

Solicitudes concurrentes usan los mismos IDs y recibos idempotentes. Una observación
de ausencia que quedó desactualizada puede producir 503 conservando el estado, como
en el punto 64; reanudar después del commit recupera el mismo resultado. No hay bucle
de reintentos automático ni SQL alternativo contra Auth.

## Aborto frente a commit o HTTP en vuelo

abortar admite solo los códigos FALLO_NEGOCIO y CANCELACION_SOLICITUD; no guarda una
descripción libre del error. Bloquea journal, contexto y decisión en el mismo orden
que confirmarNativo. Solo permite EN_CURSO → ABORTADA si el contexto sigue PREPARADA.
Si el commit ganó, devuelve 409. Repetir el mismo aborto conserva su fecha/motivo;
otro motivo devuelve 409. Una preparación o ejecución posterior no lo reactiva.

PostgreSQL también hace cumplir la exclusión: el trigger de decisión no permite
abortar un contexto confirmado, y un trigger adicional del contexto exige EN_CURSO
antes de CONFIRMADA. Este segundo trigger es independiente de 009, de modo que
repetir 009 no elimina la barrera. Se impide confirmar incluso por SQL directo tras
un aborto aunque exista un perfil y recibo Auth que coincidan.

No se mantiene una transacción local abierta durante HTTP. El ejecutor comprueba la
decisión antes de enviar mutaciones, pero una petición ya en vuelo puede completar
Auth después del aborto. La comprobación transaccional nativa impide entonces el
perfil; recuperar registra el hecho AUTH_APLICADA y mantiene ABORTADA.

`resolucionAuthPendiente=true` señala que una intención abortada no tiene cancelación
Auth confirmada. Incluye ausencia observada, solicitudes en vuelo y Auth aplicado.
No significa que se haya deshecho identidad ni que el estado remoto sea definitivo.
El punto 67 resuelve explícitamente la cancelación de intenciones no aplicadas;
el punto 68 implementa la compensación propietaria de ediciones existentes en Auth.
El punto 69 agrega su [conciliación durable](CONTRATO-CONCILIACION-COMPENSACION-RUND.md)
mediante un servicio separado. consultar incluye resolucionAuth y revisionAuthRequerida;
solo COMPENSADA confirmada localmente cierra el pendiente de una identidad aplicada.
Continúa el tratamiento de altas/revisiones. Esta consulta preparatoria requiere 011.

El punto 70 incorpora [bandeja y asignación de revisiones](CONTRATO-REVISION-IDENTIDAD-RUND.md)
y agrega casoRevision (UUID/estado o null) a consultar. Esa lectura requiere ahora
012, después de 008–011. El módulo nuevo sigue fuera de AppModule junto al ejecutor.
Asumir un caso no cambia resolucionAuthPendiente, la decisión irreversible ni los
hechos Auth/nativos: el cierre humano y la política de altas siguen pendientes.

## Límites y aceptación

El punto 73 incorpora ejecutarConControles para la
[ejecución manual autorizada](CONTRATO-EJECUCION-MANUAL-IDENTIDAD-RUND.md). ejecutar
conserva su camino previo sin callbacks. La entrada manual comprueba sesión/permiso
antes de cada mutación y recupera un recibo mínimo por solicitud/actor. Son controles
de servidor fuera de transacciones; no prometen atomicidad distribuida de permisos.

El ejecutor es de servidor y recibe un contexto previamente normalizado/autorizado.
No sustituye permisos, OTP, prevalidación o soporte del flujo de negocio. Su integración
con las entradas reales, preview y correo durable debe cerrarse antes de activar.
Los resultados pueden contener datos personales del perfil: no exponerlos en rutas
públicas ni logs. La tabla de decisión nueva solo agrega IDs, huella y códigos de motivo.

Pruebas con TypeORM y Auth HTTP real sobre bases temporales separadas: camino completo,
concurrencia, fallos nativos, respuestas perdidas, recuperación por otra instancia,
aborto durante la respuesta Auth y exclusión aborto/commit. Se verifica que abortar no
revierte datos Auth ni genera un éxito nativo, y que una decisión abortada es irreversible.

La bandera Auth continúa apagada. No se usan bases existentes o `.env` reales. El
siguiente corte debe tratar explícitamente las revisiones/altas y cerrar la integración
con entradas reales, sin inferir un rollback distribuido o activar estos servicios.
