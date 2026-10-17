# Revisión durable de un resultado incierto registrado

Punto 87. Reutiliza el caso, bandeja, consulta y asignación existentes para revisar
un resultado INCIERTO del mismo intento, ya proyectado en el aviso. No registra o
cambia resultados SMTP, concilia, cierra casos, modifica identidad o permite reenviar.
El módulo `AuthIdentityMailReviewModule` continúa fuera de AppModule.

## Entrada explícita y compatibilidad

`POST /banco-docentes/identidad/correos/revisiones/por-intencion/:intencionId/revisar-resultado-incierto`,
con cuerpo vacío. Solo admite aviso INCIERTO con journal INCIERTO del mismo intento.
ENVIANDO, PENDIENTE, ENVIADO, histórico sin journal o resultado de otro intento no
admiten alta por esta entrada. Un journal aún sin proyectar requiere conciliación
explícita previa mediante el mecanismo servidor existente; el endpoint no la ejecuta.

No se cambia el POST anterior `por-intencion/:intencionId`: sigue abriendo casos
nuevos únicamente sin resultado registrado. Su recuperación de casos existentes
conserva el comportamiento anterior.

Si ya existe un caso, se recupera el mismo UUID, creador, fecha, estado inicial y
eventual responsable. Incluye un caso abierto sin resultado antes de registrar la
incertidumbre. No se duplica o transforma la historia. Si no existe, se crea el
caso con estado inicial de correo INCIERTO y estado de asignación PENDIENTE.

Se conserva el DTO de doce campos y `private, no-store`. No se devuelve UUID del
intento, documento, destinatario, mensaje, contexto, hash o credenciales. Las rutas
de bandeja/consulta/asignación funcionan igual para ambos tipos de entrada.

El diagnóstico conserva sus diez campos y códigos: sin caso recomienda REVISION_OPERATIVA;
la entrada nueva permite iniciar esa revisión. Con caso recomienda CONTINUAR_REVISION.
Esto no presenta el envío como resuelto ni habilita reenvío.

## Permisos, concurrencia y recuperación

JWT verificado, cuenta UUID, exp numérica finita vigente y manage efectivo o alternativa
vigente de roles de gestión. Token interno, permiso afirmado por el cliente o view
no bastan. El body no elige actor, resultado o intento. Cuenta/roles/exp proceden de
sesión; se revalidan antes de SQL y antes del commit. Revocación, fallo de permisos
o expiración durante SQL revierten un caso pendiente de confirmar.

Se bloquea el aviso antes de consultar journal y caso, en el orden ya existente.
Solicitudes concurrentes conservan un caso y un creador. Otra cuenta autorizada
puede recuperarlo sin cambiar autoría; la asignación posterior conserva un único
responsable y el conflicto entre cuentas. Respuesta perdida se recupera con la
misma intención. No se mantiene SQL durante SMTP; este flujo no invoca SMTP.

El control final de permisos puede consultar Auth bajo bloqueo SQL; no hay atomicidad
con una revocación posterior. No se consultan identidad o credenciales Auth para
decidir la incertidumbre; se usa evidencia RUND del mismo intento.

400 entrada/cuerpo inválidos; 401 sesión; 403 permisos; 404 aviso inexistente;
409 estado/resultado incompatibles; 503 SQL/evidencia inválida. Los errores no
incluyen parámetros, SQL, datos personales o excepciones privadas.

## Migración 021

No añade tablas, columnas o estados. Extiende únicamente la función de protección
del caso creada por 018. Sigue admitiendo la apertura anterior sin journal y permite
además journal INCIERTO si el aviso está INCIERTO, los intentos coinciden y la fecha
de creación no precede al resultado o a su proyección. No permite crear casos por
ACEPTADO o por un resultado todavía ENVIANDO.

Las reglas anteriores de actualización y borrado se conservan: identidad, creador,
fecha y estado inicial inmutables; asignación PENDIENTE → EN_REVISION, sin reasignación
o borrado. Journal y aviso no se modifican al abrir/asumir revisión. No hay backfill.

Aplicar migraciones en orden. Volver a ejecutar únicamente 018 restituye su función
histórica y elimina esta ampliación; se debe aplicar 021 después. El verificador
conserva la prueba histórica de repetición de 018 y restablece 021 antes de continuar.
Repetir 021 conserva datos y casos, sin crear revisiones automáticamente.

El cierre de 019 sigue exigiendo aceptación registrada, por lo que un caso con
journal INCIERTO no puede cerrarse por esa vía. La omisión de 020 solo admite
PENDIENTE sin intento y tampoco puede cancelar esta incertidumbre. No se inventa
un resultado o una resolución para poder cerrar el caso.

## Validación y límites

Pruebas unitarias y SQL/HTTP temporales comprueban caso compartido, entrada anterior,
evidencia incompatible, concurrencia, replay, asignación, permisos, rollback, triggers,
migración repetible y compatibilidad de diagnóstico/cierre/omisión.

Consumidor, conciliador, diagnóstico, omisión, cierre, Auth, frontends, gateway
productivo y migraciones 001–020 conservan fuentes. Solo la función instalada se
amplía con 021. La migración se prueba en PostgreSQL temporal, eliminado al terminar;
sin bases existentes, .env reales, SMTP real, push o despliegue.

Quedan interfaz operativa que integra diagnóstico/decisiones/revisión, resolución
humana de la incertidumbre cuando no exista evidencia adicional del proveedor,
otras resoluciones de rechazos e intervalo Auth–SMTP. También otros propietarios/
canales y aceptación por instalación. La revisión registrada sigue abierta y no
declara independencia completa, activación o retiro del RUND embebido en PTA.
