# Reporte final de limpieza de columnas

Fecha de revision: 2026-05-29

Alcance revisado:
- `backend/certification-service`
- `backend/academic-registration-service`
- Frontends relacionados: `mfe-certificados-laborales`, `mfe-registro-academico` y `shell`
- DDL vigentes en `db/init`
- Migraciones `326` y `327`
- Diccionario de datos backend

## Resultado ejecutivo

No se eliminaron tablas. Solo se retiraron columnas que estaban vacias o sin flujo vigente.

La revision final no encontro lecturas, escrituras, DTOs, entidades, pantallas o migraciones activas que dependan de las columnas retiradas. Los nombres parecidos que quedan pertenecen a otros campos validos y se conservaron, por ejemplo:
- `academic_registration.graduates.email`
- `academic_registration.graduation_certificate_requests.graduate_email`
- `academic_registration.graduation_certificate_requests.requester_email`
- `academic_registration.graduation_certificates.pdf_filename`
- `academic_registration.certificate_template_config.signature_filename_override`
- `certification.certificates.pdf_url`
- `certification.certificate_template_config.signature_filename`

## Migraciones creadas

### `db/migrations/326_drop_unused_certification_columns.sql`

Retira columnas sin flujo vigente del esquema `certification`.

### `db/migrations/327_drop_unused_academic_registration_columns.sql`

Retira columnas sin flujo vigente del esquema `academic_registration`.

## Certificados laborales

### Tabla `certification.certificate_requests`

| Columna eliminada | Motivo | Evidencia |
|---|---|---|
| `rejection_reason` | No existe lectura/escritura activa en `certification-service` ni en el frontend de certificados laborales. El flujo actual conserva `status`, `observations` y datos propios de la solicitud. | Busqueda sin matches activos en `backend/certification-service/src`, `mfe-certificados-laborales` y servicios de `shell`. |
| `approved_by_name` | No hay flujo de aprobacion que guarde o consulte nombre de aprobador en esta tabla. | Sin entidad, DTO, servicio o componente usando `approvedByName`. |
| `approved_by_id` | No hay flujo de aprobacion que guarde o consulte id de aprobador en esta tabla. | Sin entidad, DTO, servicio o componente usando `approvedById`. |
| `generation_date` | No hay flujo que escriba o lea esta fecha. La solicitud usa `request_date`, `created_at` y `updated_at`; el certificado emitido tiene sus propias fechas. | Sin uso activo de `generationDate` o `generation_date`. |
| `approval_date` | No hay flujo que escriba o lea esta fecha. | Sin uso activo de `approvalDate` o `approval_date`. |

### Tabla `certification.certificates`

| Columna eliminada | Motivo | Evidencia |
|---|---|---|
| `revoked_by_id` | No hay flujo activo de revocacion que registre usuario revocador. | Sin uso activo de `revokedById` o `revoked_by_id`. |
| `last_validation` | Las validaciones se registran en `certificate_validations`; el certificado conserva `validation_count`, pero no usa esta columna. | Sin uso activo de `lastValidation` o `last_validation`. |
| `valid_until` | No hay calculo ni validacion activa contra esta columna. | Sin uso activo de `validUntil` o `valid_until`. |
| `pdf_filename` | El flujo usa `pdf_url`; no hay consumo del nombre de archivo separado en esta tabla. | Sin uso activo de `pdfFilename` o `pdf_filename` en certificados laborales. |
| `revocation_date` | No hay flujo activo que escriba o lea fecha de revocacion. | Sin uso activo de `revocationDate` o `revocation_date` en certificados laborales. |
| `revocation_reason` | No hay flujo activo que escriba o lea motivo de revocacion. | Sin uso activo de `revocationReason` o `revocation_reason` en certificados laborales. |

### Tabla `certification.signers`

| Columna eliminada | Motivo | Evidencia |
|---|---|---|
| `signature_base64` | El firmante usa `signature_url`; no existe flujo activo que consuma base64 desde `signers`. | Sin uso activo de `signatureBase64` o `signature_base64`. |

### Tabla `certification.template_config_changes`

| Columna eliminada | Motivo | Evidencia |
|---|---|---|
| `user_info` | Estaba mapeada en entidad, pero no se poblaba ni se consumia. El historial conserva `metadata`, `changed_by` y `changed_at`. | Sin uso activo de `userInfo` despues de retirar el mapeo TypeORM. |

## Verificación de títulos

### Tabla `academic_registration.graduation_certificates`

| Columna eliminada | Motivo | Evidencia |
|---|---|---|
| `revocation_reason` | El estado `REVOKED` existe, pero el endpoint de revocacion esta marcado como TODO y no escribe motivo. La validacion publica solo evalua `status`. | Sin uso activo de `revocationReason`, `revocation_reason` ni `motivoRevocatoria`. |
| `revocation_date` | El estado `REVOKED` existe, pero no hay flujo que escriba fecha de revocacion. La validacion publica solo evalua `status`. | Sin uso activo de `revocationDate`, `revocation_date` ni `fechaRevocatoria`. |

### Tabla `academic_registration.signers`

| Columna eliminada | Motivo | Evidencia |
|---|---|---|
| `signature_filename` | La generacion de certificados toma `fullName`, `position` y `signatureUrl` del firmante. El nombre de archivo de firma usado por plantilla vive en `certificate_template_config.signature_filename_override`, que se conserva. | Sin uso activo de `signer.signatureFilename`, `signature_filename` de `signers` ni inserts/updates hacia esa columna. |
| `email` | No hay flujo de notificacion o contacto asociado al firmante en `academic_registration.signers`. Los emails usados por la plataforma son de graduado, solicitante o usuario, y se conservaron. | Sin uso activo de `signer.email` ni inserts/updates hacia `academic_registration.signers.email`. |

## Ajustes de codigo y DDL

### Certificados laborales

- Se creo `db/migrations/326_drop_unused_certification_columns.sql`.
- Se retiro `userInfo` de `backend/certification-service/src/certificates/template-config-change.entity.ts`.
- Se actualizo `db/init/004_certification_ddl_20260129_215540.sql` para que los despliegues nuevos no creen las columnas retiradas.
- Se actualizo `docs/diccionario-datos-backend.md` para retirar `template_config_changes.user_info`.

### Verificación de títulos

- Se creo `db/migrations/327_drop_unused_academic_registration_columns.sql`.
- Se retiraron `revocationDate` y `revocationReason` de `GraduationCertificate`.
- Se retiraron `email` y `signatureFilename` de `Signer`.
- Se actualizo `db/init/001_academic_registration_ddl_20260129_215541.sql`.
- Se actualizo `docs/diccionario-datos-backend.md`.
- Se retiraron `revocationDate` y `revocationReason` de los contratos frontend `graduados.service.ts`.
- Se limpio la UI que intentaba mostrar fecha/motivo de revocacion inexistentes; la UI sigue mostrando certificado revocado por `status`.

## Verificaciones realizadas

### Busquedas de seguridad

Se buscaron nombres snake_case y camelCase de todas las columnas eliminadas en:
- `backend/certification-service/src`
- `backend/academic-registration-service/src`
- `apps/mfe-certificados-laborales`
- `apps/mfe-registro-academico`
- `apps/shell/src`
- `db/init`
- `db/migrations`
- `docs/diccionario-datos-backend.md`

Resultado:
- No quedaron referencias activas a las columnas eliminadas.
- Los matches restantes son campos de otros contextos que no deben eliminarse.

### Compilacion y builds

Comandos ejecutados con resultado OK:
- `npx tsc --noEmit -p tsconfig.json` en `backend/certification-service`
- `npm run build` en `backend/certification-service`
- `npx tsc --noEmit -p tsconfig.json` en `backend/academic-registration-service`
- `npm run build` en `backend/academic-registration-service`
- `npm run build -w @esap-mfe/certificados-laborales`
- `npm run build -w @esap-mfe/registro-academico`
- `npm run build -w @esap-mfe/shell`
- `git diff --check`

### Pruebas automatizadas

Certificados laborales:
- `npm test -- certificates.service.spec.ts --runInBand`: OK, 9 pruebas.
- `npm test -- labor-certificate-pdf.service.spec.ts --runInBand`: OK, 6 pruebas.
- `npm test -- --runInBand`: ejecuta 3 suites; pasan las 2 suites anteriores y falla `app.controller.spec.ts` por expectativa preexistente:
  - Esperado: `Hello World!`
  - Recibido: `Running Microservice Certification Service`
  - Este fallo no esta relacionado con las columnas retiradas.

Verificación de títulos:
- `npm test -- --runInBand` no ejecuta pruebas por configuracion de Jest:
  - `Module ts-jest in the transform option was not found`
  - `<rootDir>` apunta a `backend/academic-registration-service/src`
  - Este bloqueo ocurre antes de correr tests y no esta relacionado con las columnas retiradas.

## Conclusion

Con la evidencia actual del codigo, DDL, frontends, migraciones y builds, las columnas eliminadas no participan en ningun flujo activo de la plataforma. La limpieza mantiene los campos que si tienen funcionalidad y reduce columnas sin uso que podian quedar permanentemente vacias o generar confusion en la base de datos.
