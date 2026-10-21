# F011/F012 — Expediente documental RUND mediante API

La ampliación se conserva **apagada por defecto**. Sin `RUND_DOCUMENTAL_ENABLED=true`
se mantienen los flujos anteriores y se pueden desplegar otros ajustes sin configurarla.
Ver [Despliegue con la HU aplazada](DEPLOY-SIN-OPENKM.md).

La configuración, persistencia provisional, migración y avance F013 se detallan en
[Configuración y operación documental](REQ-RUND-F013-configuracion-y-operacion.md).

## Alcance implementado

RUND conserva el CRUD F010 y el control JWT/RBAC existente. El backend utiliza
OpenKM mediante `RundDocumentStorageService`; el navegador recibe exclusivamente
rutas de contenido de RUND. No se envían credenciales ni rutas de OpenKM al cliente.

`POST /pta/api/v1/pta/banco-docentes/:id/expediente` prepara las cinco carpetas aunque
no haya archivos. Requiere el mismo acceso administrativo que la carga documental;
registra actor de sesión, IP y acción `PREPARAR_EXPEDIENTE`. El botón **Preparar
expediente** invoca esa operación. Consultar/listar documentos no crea carpetas.
La carga de documentos también completa automáticamente esta estructura.

```text
/okm:root/RUND/expedientes/{personaId}/
  IDENTIDAD/
  FORMACION/
  EXPERIENCIA/
  ACTOS_ADMINISTRATIVOS/
  EVALUACIONES/
```

Se utiliza `Docente.personaId` resuelto en servidor para compartir el espacio físico
entre registros de distintos períodos. Solo si el registro carece de persona se usa
su `Docente.id`. Cada documento mantiene su asociación actual al registro docente;
compartir carpeta física no concede acceso a documentos de otros registros.

Los archivos nuevos quedan en `{carpeta}/{documentoLogicoId}/v{version}.{extension}`.
Las referencias anteriores se leen desde la ruta y proveedor persistidos. No se
mueven ni renombran archivos existentes; las nuevas versiones pueden residir en la
estructura nueva mientras el historial conserva su ubicación original.

## Clasificación compatible

| Categoría o soporte | Carpeta física nueva |
|---|---|
| IDENTIDAD | IDENTIDAD |
| TITULOS | FORMACION |
| EXPERIENCIA | EXPERIENCIA |
| CONTRATOS, RESOLUCIONES, ACTOS_ADMINISTRATIVOS | ACTOS_ADMINISTRATIVOS |
| EVALUACIONES, soporte acta_evaluacion_desempeno | EVALUACIONES |
| Soportes de edición/cambio de estado | ACTOS_ADMINISTRATIVOS |
| AUTORIZACIONES, CERTIFICADOS, OTROS | Carpeta complementaria con el mismo código |

No se reclasifican certificados históricos automáticamente: su finalidad debe
determinarse durante la migración. Los códigos de categoría deben ser segmentos
alfanuméricos, con guion o guion bajo.

## Soportes administrativos

La ruta `:id/bloques/:bloque/soportes` recibe archivos en memoria. Incluye los
soportes de edición/cambio de estado en el servicio documental, conservando PDF,
JPG y PNG con validación de firma, extensión, MIME y tamaño. El CRUD general sigue
aceptando únicamente PDF para los demás tipos. Cada acción administrativa crea
una evidencia nueva; no sustituye el soporte de acciones anteriores ni reabre el
bloque transversal. Se prohíben reemplazo/eliminación de esas evidencias por el
CRUD general. La respuesta del endpoint mantiene `id` como identificador del
soporte esperado por los modales y agrega `documentoPerfilId`.

La autogestión no puede cargar soportes de edición/cambio de estado administrativos.
La consulta del contenido continúa sujeta a los controles existentes de datos
sensibles. Los históricos `LOCAL`/`LEGACY_LOCAL` conservan su lectura protegida.

## Fallos y configuración

La creación de carpetas es repetible: tras un fallo se puede reintentar sin borrar
carpetas. Un conflicto 409 o `ItemExistsException` se verifica con
`folder/getProperties`; otros errores no se confunden con carpetas existentes.
Los errores al cliente no incluyen respuestas internas de OpenKM. No se siguen
redirecciones HTTP de la integración. Si OpenKM está configurado pero falla, no
hay fallback a disco local.

Configurar `OPENKM_BASE_URL` (incluido el contexto `/OpenKM` si corresponde),
`OPENKM_USERNAME`, `OPENKM_PASSWORD`, `OPENKM_TIMEOUT_MS` y
`RUND_DOCUMENT_ALLOW_LOCAL=false` en ambientes integrados. El proveedor local
permite desarrollo/pruebas y conserva la misma estructura. La configuración
explícita `RUND_DOCUMENT_ALLOW_LOCAL=true` habilita ese proveedor provisional:
requiere almacenamiento persistente y no satisface F011 en producción. Los compose
base de producción/QA/pre lo deshabilitan por defecto; existe un overlay optativo
para una transición controlada. `RUND_DOCUMENT_PROVIDER` permite elegir el modo
explícitamente sin depender solo de la presencia de una URL.

La cuenta de servicio, ACL y acceso de red privado de OpenKM se deben comprobar
en el ambiente real. Este cambio de aplicación no configura el servidor OpenKM,
su interfaz web, WebDAV ni el firewall. Contrato de referencia:
[REST OpenKM 6.3 CE](https://docs.openkm.com/okm-6.3-com/restful/).

## Instalación y verificación

1. Aplicar `db/migrations/665_rund_categorias_expediente.sql` sobre un ambiente de
   pruebas con la migración 422 ya instalada. Solo agrega categorías faltantes;
   no altera categorías existentes ni archivos. No se ejecuta automáticamente.
2. Desplegar backend y frontend juntos para mantener las acciones de evidencias
   administrativas alineadas.
3. Configurar la instancia de OpenKM de pruebas y preparar un expediente vacío.
4. Confirmar las cinco carpetas y repetir la operación; probar carga, consulta,
   reemplazo de PDF y dos soportes administrativos sucesivos.
5. Confirmar acceso denegado para usuarios sin permisos y fallos seguros con
   OpenKM inaccesible. Verificar que un documento histórico conserve su lectura.

Pruebas automatizadas: `rund-expediente.spec.ts`, `rund-expediente.http.spec.ts`,
`rund-document-storage.service.spec.ts`, regresiones CRUD/autorización existentes
y `RundDocumentManager.test.tsx`. La integración OpenKM se simula; falta certificar
el contrato contra la versión/instancia suministrada por infraestructura.

## Pendiente antes de cerrar la historia completa

- Ejecutar la utilidad de migración verificada tras configurar OpenKM. Las
  referencias independientes de carpeta digital de `auth-service` requieren
  conciliación si aparecen en el inventario de otro ambiente; ese endpoint
  genérico continúa siendo un flujo independiente.
- Acordar cómo provisionar en lote los expedientes de docentes ya registrados.
  Crear el perfil o importar un Excel no depende de la disponibilidad de OpenKM;
  el expediente se prepara por la acción explícita o al cargar un documento.
- Configurar TRD institucional, series/subseries, eventos iniciales, tiempos y
  disposición en el motor implementado. No hay eliminación por vencimiento ni
  plazos inventados; la disposición definitiva exige procedimiento institucional.
- Configurar texto, versión y referencia de aprobación de la política de
  tratamiento. El backend ya comprueba y audita la aceptación en autogestión.
  Validar base jurídica y evidencia de los demás canales con la entidad.
- Revisar retención de derivados OCR, auditorías, copias de seguridad y archivos
  fuente de cargas masivas dentro de su alcance archivístico correspondiente.

Las pruebas unitarias no contactan una instancia real ni cambian datos reales. No
se elimina contenido existente ni se aplica disposición final.

## Verificación local de la segunda etapa

Se ensayó la migración 665 en una tabla temporal de PostgreSQL y luego se aplicó
en la base identificada por `backend/academic-work-plan-service/.env` como
desarrollo local. El catálogo pasó de 7 a 10 categorías. La comprobación confirmó
que las categorías previas y todos los metadatos de `RundDocumentoPerfil` se
conservaron exactamente; la segunda ejecución del INSERT no cambió el resultado.
Este resultado no acredita que la migración esté aplicada en QA o producción.

El inventario local verificó los 27 registros y archivos: 21 activos, 5
reemplazados y 1 retirado lógicamente. En todos coincidieron tamaño y SHA-256.
No había soportes con archivo sin enlace a `RundDocumentoPerfil`, ni referencias
RUND en `auth.documento_carpeta_digital` en esta base. Los originales siguen en
almacenamiento local y no se han copiado a OpenKM. El inventario propone 26
candidatos verificados; el retirado se conserva sin reactivarlo ni seleccionarlo
automáticamente. La política de migración de retirados sigue pendiente.

Comandos desde la raíz del repositorio:

```powershell
# Ensaya en tabla temporal; termina con ROLLBACK.
node scripts/verify-rund-documental-migration.cjs

# Aplica solo las categorías de 665, en desarrollo/test y con PostgreSQL loopback.
node scripts/verify-rund-documental-migration.cjs --apply-local

# Lee metadatos y archivos; genera un reporte privado en tmp/rund-documental/.
node scripts/audit-rund-documental.cjs

# Solo GET de propiedades raíz, sin documentos ni cambios en OpenKM.
node scripts/check-rund-openkm.cjs

# PostgreSQL real con tablas temporales y archivos sintéticos aislados.
node scripts/verify-rund-documental-postgres.cjs

# Pruebas del inventario y diagnóstico.
node --test scripts/rund-documental/inventory.test.cjs scripts/rund-documental/openkm-check.test.cjs
```

El inventario detecta rutas inseguras, enlaces fuera de uploads, archivos ausentes,
cambios durante la lectura, diferencias de hash/tamaño y metadatos históricos sin
huella válida. No corrige ni migra esos casos. Los informes no incluyen nombres,
identificaciones, contenido ni rutas originales. El snapshot de base y la lectura
de archivos se realizan por separado: es diagnóstico, no una autorización durable
para migrar; cualquier copia futura deberá revalidar la fuente antes de cambiar
referencias.

`rund-document-storage.http.spec.ts` prueba el cliente real por HTTP, multipart y
contenido binario contra un simulador en loopback. Verifica versiones sin
sobrescritura, imágenes, credenciales inválidas, errores y redirecciones. La prueba
PostgreSQL verifica también la compensación de un fallo real de auditoría sin
alterar documentos reales. No sustituyen la validación contra OpenKM.

El diagnóstico de OpenKM devolvió `NOT_CONFIGURED`: faltan `OPENKM_BASE_URL`,
`OPENKM_USERNAME` y `OPENKM_PASSWORD` en el ambiente revisado. Antes de la copia
real debe configurarse una instancia de pruebas, confirmar su versión y validar
permisos de escritura y aislamiento de red. Las credenciales se configuran en el
backend; no se envían por chat ni se incluyen en los reportes.
