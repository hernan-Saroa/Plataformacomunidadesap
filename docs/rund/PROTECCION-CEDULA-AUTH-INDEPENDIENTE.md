# Protección de cédula en Auth separado (punto 104)

Preparación y validación local del 2026-10-20. No se aplicó a instalaciones existentes.

La migración `673_auth_rund_documento_proteccion_local.sql` requiere 669–672 y deja
`auth.rund_documento_politica.modo='HEREDADO'`. Ese modo mantiene la pertenencia y
la autorización OCR de 672. El modo `LOCAL` reemplaza la consulta a tablas RUND/PTA
por evidencia propia de Auth; no se activa mediante variables de entorno o GUC de sesión.

## Qué protege LOCAL

| Evidencia propia de Auth | Efecto |
|---|---|
| Persona en `rund_documento_protegido` | Protege perfiles anteriores al protocolo coordinado |
| Efecto en `rund_identidad_efecto`, sin resolución `COMPENSADA` para esa operación | Protege desde el commit Auth, incluso antes del commit RUND |
| Resolución `REVISION_REQUERIDA` | Mantiene la protección hasta resolver el caso |
| Compensación propietaria `COMPENSADA` | Libera únicamente la reserva de esa operación; conserva el inventario y otras reservas |
| Intención registrada/cancelada sin efecto | No añade protección |

No se usa el rol DOCENTE para inferir un perfil. Las personas sin estas evidencias
conservan el comportamiento anterior. La protección anticipada durante una operación
en curso es deliberada: evita permitir cambios entre los commits de Auth y RUND.
El inventario no se elimina automáticamente: una futura eliminación de perfiles
necesitará definir su liberación sin perder otras protecciones.

La corrección OCR sigue autorizándose por el registro propio de Auth, persona,
campo, estado y par de valores; su compensación conserva ese contrato. En LOCAL,
`app.rund_ocr_suggestion_id` no autoriza cambios. Se mantienen las excepciones para
documento inicialmente vacío y cambios solo de puntos/mayúsculas que ya admitía 672.

## Activación por instalación

Este procedimiento requiere la ventana de migración y la aceptación de esa instalación.
No ejecutar contra una base compartida ni usar un arreglo vacío como sustituto del inventario.

1. Respaldar y pausar todas las altas/ediciones y escritores de perfiles/identidad.
   Conciliar las operaciones pendientes y conservar sus journals/efectos/compensaciones Auth.
2. Obtener del propietario RUND y del RUND histórico/PTA el inventario completo de
   **personaId**, incluyendo todos los períodos, estados e históricos que aún tengan
   perfil. Conciliar los UUID entre propietarios, deduplicar y comprobar su presencia
   en Auth. Conservar el manifiesto, su hash, el total independiente y la aprobación
   del responsable de datos. El SQL no puede certificar la exhaustividad de un servicio remoto.
3. Publicar y aceptar las escrituras por API y OCR por API del punto 103. Auth debe
   estar en su base separada, sin `rund."Docente"` ni `academic_work_plan."Docente"`.
   La función de activación rechaza esas tablas incluso vacías; no las elimina.
   Deshabilitar los escritores históricos antes de reanudar tráfico. No basta con
   cambiar la política si siguen existiendo altas que omiten el protocolo propietario.
4. Con las escrituras aún pausadas, aplicar 673 mediante el migrador habitual.
   Antes de reanudar, dar al rol real de Auth y a **cada escritor autorizado de
   `auth.personas`** `SELECT` sobre `auth.rund_documento_politica`. LOCAL requiere además
   `SELECT` sobre `auth.rund_documento_protegido`, `auth.rund_identidad_efecto`,
   `auth.rund_identidad_compensacion` y `auth.rund_identidad_correccion` para evaluar
   el trigger. Revisar esos accesos dentro del propietario Auth. No dar acceso a
   RUND/PTA, ni escritura sobre política/inventario, ni permiso de activación al rol
   de servicio. El verificador usa precisamente un rol limitado a Auth.
5. Como propietario/migrador, en una transacción, llamar
   `auth.activar_proteccion_documento_rund_local($1::uuid[], $2::integer)` con parámetros:
   el arreglo completo deduplicado y el total del manifiesto. Usar un cliente con
   parámetros, sin construir SQL con los datos del inventario.
   La función comprueba total, duplicados, nulos y existencia de todas las personas,
   bloquea las escrituras de identidad durante la importación y guarda inventario y
   política en el mismo commit. Repetir/ampliar el inventario conserva las protecciones
   anteriores; no vacía el registro ni reinicia la fecha de activación.
6. Verificar con el rol real: perfil antiguo protegido; persona sin perfil editable;
   alta por API protegida; OCR/compensación autorizados; compensación de una operación
   sin perfil libera solo su reserva. Comprobar recuperación y los casos de revisión.
   Reanudar únicamente después de aceptar esos flujos y las credenciales limitadas.

Si falta política o faltan permisos, el trigger falla y no abre la escritura. No
restaurar 672 sobre 673 ni borrar política, inventario o journals para resolver errores.

## Reversión

Antes de activar LOCAL, HEREDADO mantiene el procedimiento de reversión previo.
Después de activarlo, **apagar las banderas API por sí solo no constituye una reversión**:
los escritores SQL anteriores podrían crear perfiles sin reserva Auth y necesitan
también la topología y autorización anteriores. Mantener la pausa de escrituras;
reconciliar operaciones y datos con los propietarios; restaurar/verificar la topología
compartida y sus perfiles; comprobar la regla heredada con el rol real antes de decidir
el cambio administrativo a HEREDADO. Conservar el inventario, los journals y las evidencias.
No hay una migración inversa automática ni se retira el RUND embebido en este punto.

## Evidencia reproducible

- `node scripts/verify-auth-documento-correccion.cjs --with-local-protection`:
  14 comprobaciones PostgreSQL del modo heredado de 673.
- `node scripts/verify-auth-rund-document-protection.cjs`:
  21 comprobaciones con DDL real, rol Auth limitado y controladores HTTP productivos,
  inventario, OCR, efectos/compensaciones, rollback y concurrencia al commit.
  La respuesta de prueba de aborto de RUND es simulada; este verificador no ejecuta
  el commit de negocio RUND. La integración general del punto 103 lo valida por separado.
- Ambos crean y eliminan su propio clúster temporal, sin leer `.env` ni usar bases existentes.
- Resultado y hashes: [validacion-proteccion-documento-auth-local.json](validacion-proteccion-documento-auth-local.json).

La implementación preparada no certifica inventarios, permisos o aceptación de
local/DEV/QA/PRE/PROD. Esos cierres y el retiro del SQL de transición siguen pendientes.
