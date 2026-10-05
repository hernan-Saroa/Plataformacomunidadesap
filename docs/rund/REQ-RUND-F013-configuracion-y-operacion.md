# RUND documental: activación, TRD y tratamiento de datos

## Estado de la entrega

**La ampliación está apagada por defecto** (`RUND_DOCUMENTAL_ENABLED=false`). Para
desplegar otros ajustes no se necesita activar ni configurar OpenKM. Se conservan
los flujos anteriores; los procedimientos siguientes son para la activación futura.
Consultar [el modo aplazado](DEPLOY-SIN-OPENKM.md) antes de aplicar esta guía.

La integración, estructura, copia verificable, configuración archivística y
evidencia de aceptación están implementadas. La instancia OpenKM, sus permisos y
la clasificación institucional aún necesitan configuración y validación. No se
declara cumplimiento jurídico por tener estas funciones ni se inventan TRD.

El cambio no ejecuta migraciones, no copia archivos al iniciar y no despliega
infraestructura. Guardar el código en una rama no activa OpenKM. Revisar cualquier
automatización de despliegue del ambiente antes de integrar la rama.

Para continuar sin servidor OpenKM, seguir primero
[Despliegue provisional sin OpenKM](DEPLOY-SIN-OPENKM.md), que detalla persistencia,
configuración por ambiente y comprobaciones previas a recrear contenedores.

## 1. Elegir almacenamiento

En cada ambiente verificar la migración
[`665_rund_categorias_expediente.sql`](../../db/migrations/665_rund_categorias_expediente.sql)
antes de usar las nuevas categorías. Requiere el esquema documental previo; solo
agrega categorías faltantes y no migra archivos. No se aplica automáticamente.

Variables del backend `academic-work-plan-service` (nunca del navegador):

| Variable | Comportamiento |
|---|---|
| `RUND_DOCUMENTAL_ENABLED` | `false` por defecto: conserva el flujo previo. Solo `true` habilita F011/F012/F013. |
| `RUND_DOCUMENT_PROVIDER=AUTO` | Compatibilidad: OpenKM si hay URL; LOCAL si no la hay. |
| `RUND_DOCUMENT_PROVIDER=LOCAL` | Proveedor provisional; exige permiso local en producción. |
| `RUND_DOCUMENT_PROVIDER=OPENKM` | Exige URL y credenciales; no vuelve a LOCAL por un fallo. |
| `RUND_DOCUMENT_ALLOW_LOCAL=true` | Permite la etapa provisional. No cumple por sí misma F011. |
| `RUND_DOCUMENT_LOCAL_ROOT` | Raíz persistente de archivos; vacío conserva `./uploads`. |
| `OPENKM_BASE_URL` | URL interna, incluyendo `/OpenKM` si la instalación lo usa. |
| `OPENKM_USERNAME`, `OPENKM_PASSWORD` | Cuenta técnica del backend; los usuarios siguen autenticándose en RUND. |
| `OPENKM_TIMEOUT_MS` | Entero entre 1 y 60000; predeterminado 15000. |
| `RUND_TRD_POLICY_FILE` | Ruta al JSON aprobado de TRD. Vacío: pendiente, conservación sin disposición automática. |
| `RUND_PRIVACY_POLICY_FILE` | Ruta al JSON aprobado de tratamiento de datos. Vacío: conserva el aviso existente, marcado como pendiente de política institucional. |

La API administrativa `GET /pta/api/v1/pta/banco-docentes/documentos/configuracion`
informa proveedor y pendientes sin secretos ni rutas internas. No prueba la
conectividad. El administrador ve esos pendientes en la biblioteca documental.

### Persistencia antes de recrear contenedores

El overlay optativo `docker-compose.rund-documental.yml` monta una carpeta del host
en `/app/uploads` y otra, de solo lectura, en `/etc/rund/policies`. **Primero**:

1. Pausar cargas durante la copia y respaldar base de datos y todos los uploads.
2. Exportar los uploads del contenedor actual a una carpeta persistente del host;
   verificar número de archivos, tamaños y hashes. Conservar el respaldo original.
3. Definir `RUND_UPLOADS_HOST_PATH` con esa carpeta ya poblada y
   `RUND_POLICY_HOST_PATH` con una carpeta existente para las políticas.
4. Combinar el compose habitual con el overlay al desplegar. Sus rutas deben
   existir: `create_host_path: false` evita crear un directorio vacío por error.

No montar una carpeta vacía encima de uploads existentes: ocultaría los archivos.
El overlay usa la misma raíz para conservar compatibilidad con las lecturas
históricas. Los compose base reenvían las nuevas variables, conservando sus
valores anteriores de permiso local; no se activó LOCAL en producción.
Si cambia la raíz en un despliegue sin el overlay, copiar primero todo su contenido
y revisar las otras rutas de uploads del servicio.

Para la etapa provisional seleccionar LOCAL y permitirlo explícitamente. Para
activar OpenKM cambiar a OPENKM, deshabilitar nuevas escrituras locales y mantener
el volumen mientras existan referencias históricas. Probar primero en QA.

## 2. Configurar TRD aprobadas

El archivo tiene `version`, `aprobacion` (referencia del acto/documento que aprueba
la tabla) y `reglas`, un arreglo no vacío. Cada regla exige:

| Campo | Contenido a suministrar por gestión documental |
|---|---|
| `id` | Identificador único de regla. |
| `categoria` | Código del catálogo documental, en mayúsculas. |
| `tipoSoporte` | Opcional; permite distinguir soportes de la misma categoría. |
| `serie`, `subserie` | Clasificación aprobada; si no existe subserie, documentar expresamente esa condición. |
| `eventoInicio` | Nombre exacto del evento que inicia el cómputo; no se asume que sea la carga. |
| `mesesGestion`, `mesesCentral` | Enteros no negativos; valores reales de la TRD, sin valores predeterminados. |
| `disposicion` | `CONSERVACION_TOTAL`, `SELECCION` o `ELIMINACION`. |
| `fundamentoTratamiento`, `finalidad` | Base y finalidad institucionales aplicables. |

Se rechazan reglas duplicadas o plazos inválidos. Una regla específica por tipo
prevalece sobre la de categoría. Sin coincidencia el documento queda
`PENDIENTE_TRD`; la clasificación de OTROS/CERTIFICADOS requiere especial revisión.
No se asigna una regla universal por defecto.

Cada carga/reemplazo conserva la regla, versión, aprobación y SHA-256 en su
auditoría transaccional. Cambiar el archivo de configuración **no reescribe** la
clasificación histórica. Para documentos existentes o reclasificaciones se usa la
acción explícita `ASIGNAR_TRD`, que agrega una nueva evidencia con motivo y actor.

### API de retención por versión documental

Base: `/pta/api/v1/pta/banco-docentes/:docenteId/documentos/:documentId/retencion`.
Solo GESTION_PROFESORAL y SUPER_ADMIN; el permiso genérico de carga no basta.

`GET` consulta regla, estado, fechas y suspensión. `POST` recibe uno de estos
cuerpos; `motivo` es obligatorio y el actor/IP provienen de la sesión:

```json
{ "accion": "ASIGNAR_TRD", "motivo": "Referencia de la revisión archivística" }
```

```json
{
  "accion": "REGISTRAR_EVENTO_TRD",
  "evento": "NOMBRE_EXACTO_CONFIGURADO_EN_LA_REGLA",
  "fechaEvento": "2026-01-15T00:00:00.000Z",
  "motivo": "Referencia de la evidencia del evento"
}
```

La fecha anterior es solo ilustrativa. Debe registrarse la fecha real acreditada,
no futura. El evento queda ligado a la huella de la regla; cambiar la regla exige
registrar el evento correspondiente. Suspender o levantar suspensión:

```json
{ "accion": "SUSPENDER_RETENCION", "motivo": "Referencia de la orden o solicitud" }
```

```json
{ "accion": "LEVANTAR_SUSPENSION", "motivo": "Referencia del levantamiento" }
```

La suspensión comprende todas las versiones del mismo documento lógico. Los
plazos usan meses calendario UTC, ajustando al último día del mes cuando sea
necesario. La fase central se cuenta desde el final del plazo de gestión.
Los estados representan cómputo de plazos, no acreditan una transferencia física.
Al vencer se informa `REQUIERE_REVISION_ARCHIVISTICA`.

**No existe un endpoint ni un proceso de eliminación física por vencimiento.**
La disposición registrada es una instrucción para revisión archivística, no una
orden automática. La selección, transferencia y eliminación definitiva requieren
el procedimiento institucional y sus autorizaciones. El retiro del CRUD sigue
siendo lógico; conserva el archivo, sus versiones y auditoría. Los soportes de
edición/cambio de estado siguen protegidos contra retiro/reemplazo.

## 3. Configurar política de tratamiento

JSON con `version`, `texto`, `url` HTTPS y `aprobacion`, todos obligatorios. El
texto y enlace deben ser los aprobados por ESAP, incluidas las finalidades y los
derechos/canales que correspondan; el desarrollo no los sustituye.

El backend devuelve el texto y su huella al validar el OTP. El formulario muestra
ese texto y envía la huella al aceptar. El envío final exige aceptación booleana y
la misma huella vigente; si cambió la política, exige consultarla nuevamente.
Los borradores no reactivan automáticamente la casilla de aceptación.

Se registra texto, versión, huella, fecha, invitación verificada y actor/IP junto
con el perfil, incluso si el envío no modificó sus datos. Un fallo de esa auditoría
impide confirmar la operación. No se aceptan textos o fechas de aceptación
suministrados por el cliente. El soporte firmado del bloque transversal conserva
su flujo existente. Las cargas administrativas/masivas requieren la base jurídica
y evidencia correspondientes; no se les atribuye el consentimiento del docente.

Sin política configurada, el backend admite el formulario anterior que omite la
huella y registra `FORMULARIO_ANTERIOR`, sin atribuirle una verificación de huella.
El frontend nuevo también reconoce al backend anterior que omite el aviso y muestra
el texto original. No sustituye un aviso presente pero mal formado. Una huella
enviada incorrecta siempre se rechaza. Con política configurada se exige su huella:
actualizar ambos componentes antes de activarla y renovar las sesiones anteriores.
El aviso anterior se conserva como transición y se identifica como política
institucional pendiente; no es una certificación de autorización suficiente.

## 4. Migrar históricos conservando fuentes

Después de compilar el backend, la utilidad se incluye en la imagen:

```powershell
# Desde backend/academic-work-plan-service, solo valida archivos y metadatos.
node --env-file=.env dist/tools/rund-documental-migrate.js --all

# Con OpenKM configurado: probar una versión documental conocida.
node --env-file=.env dist/tools/rund-documental-migrate.js --id UUID_DOCUMENTO --apply --actor IDENTIFICADOR_OPERADOR

# Tras validar en QA y respaldar: procesar el resto, una transacción por archivo.
node --env-file=.env dist/tools/rund-documental-migrate.js --all --apply --actor IDENTIFICADOR_OPERADOR
```

En contenedor las variables ya están inyectadas: omitir `--env-file=.env`.
Para aplicar exige `RUND_DOCUMENT_PROVIDER=OPENKM` (o AUTO con OpenKM configurado).
La herramienta se ejecuta administrativamente; no está expuesta por HTTP.

- Sin `--apply` no escribe en OpenKM ni cambia metadatos. Requiere selección
  explícita `--all` o `--id`; no tiene selección implícita.
- Verifica raíz permitida, enlaces, SHA-256 y tamaño de la fuente en cada ejecución.
- Usa la estructura estándar, verifica bytes remotos y solo entonces cambia las
  referencias y registra `MIGRAR_A_OPENKM` en una transacción.
- Bloquea el perfil en el mismo orden que el CRUD. No cambia IDs, versiones,
  estado, revisiones, enlaces desde el perfil ni checksum.
- Reutiliza un destino idéntico al reanudar. Si es diferente, se detiene sin
  sobrescribir. Conserva ambas copias cuando falla la confirmación de base de datos.
- Omite retirados salvo `--include-retired`; esa selección no los reactiva.
- Una falla detiene el lote. Las versiones previas ya confirmadas permanecen
  migradas; al repetir se omiten. Nunca elimina fuentes ni destinos.

El alcance es `RundDocumentoPerfil` LOCAL/LEGACY_LOCAL dentro de uploads del
servicio académico. Referencias antiguas independientes de `auth-service` o sin
documento de perfil se detectan con el inventario y requieren conciliación; no
se copian inventando asociaciones. En la base local revisada no existían esos casos.
Conservar el informe del inventario y respaldo original hasta validar accesos y
restauración. El comando no es un proceso de disposición documental.

## 5. Validación de infraestructura pendiente

Infraestructura debe suministrar instancia y versión OpenKM, cuenta técnica con
ACL mínimas, red privada, HTTPS donde corresponda y restricción de UI/WebDAV/API
para usuarios finales. Probar el contrato real con carpetas, PDF, imágenes,
versiones, reintentos, descargas y credenciales inválidas. Verificar respaldo y
restauración conjunta de OpenKM y metadatos RUND.

También deben definirse las TRD de derivados OCR, auditorías, respaldos y cargas
masivas según su clasificación. Las reglas de este componente cubren documentos
de perfil, no modifican por extensión la retención de otros subsistemas.

## Verificación reproducible

Backend: `npm run build` y `node node_modules/jest/bin/jest.js --runInBand --watch=false`.
Frontend: `npm run build` y pruebas `RundDocumentManager.test.tsx`.
Desde la raíz: `node scripts/verify-rund-documental-postgres.cjs` y
`node scripts/audit-rund-documental.cjs`.

Las pruebas incluyen HTTP real contra un simulador, pérdida de respuesta después
de persistir, conflictos de contenido, TRD/aceptación, permisos y PostgreSQL con
tablas temporales. El simulador no certifica una instalación real de OpenKM.

El cliente contempla ausencia de archivo como HTTP 404 o HTTP 500 con
`PathNotFoundException`, conforme al [manejador de excepciones de OpenKM CE](https://github.com/openkm/document-management-system/blob/master/src/main/java/com/openkm/rest/GenericException.java).
Otros errores 500 no se interpretan como ausencia ni autorizan sustituir contenido.

### Resultado de la verificación del avance

Revisión final con la ampliación aplazada: backend RUND 36 suites/386 pruebas,
frontend 22 pruebas, despliegue 63 pruebas y PostgreSQL 7 escenarios temporales
aprobados. Compilaciones de backend/frontend verificadas. La matriz Docker incluye
33 configuraciones (11 apagadas y 22 activadas). Los resultados siguientes conservan
la trazabilidad de las comprobaciones anteriores del avance.

- Compilación de backend y frontend completada.
- Suite completa del backend: 90 suites y 827 pruebas aprobadas. Tras endurecer
  la validación final del transporte, sus 2 suites se ejecutaron nuevamente:
  31 pruebas aprobadas, incluidas las nuevas variantes HTTP y respuestas inválidas.
- Frontend documental/autogestión: 17 pruebas aprobadas; utilidades de inventario
  y diagnóstico: 11 pruebas aprobadas.
- PostgreSQL real: 6 escenarios con tablas temporales y archivos sintéticos,
  incluidos rollback de auditoría, suspensión entre versiones y copia simulada.
- Utilidad compilada de migración ejecutada en modo verificar: 27 registros
  revisados, sin copia real ni cambio de referencias; los retirados se omiten.
- Nuevo inventario: 27 archivos con tamaño y SHA-256 correctos. Comparación con
  el inventario anterior idéntica, incluidos proveedor, estado y huellas.
- Compatibilidad de privacidad y seguridad de autogestión: 3 suites, 19 pruebas
  aprobadas tras el ajuste para despliegues graduales.
- Revisión final del módulo `pta/banco-docentes`: 35 suites y 374 pruebas aprobadas,
  incluyendo la compatibilidad anterior y los escenarios documentales.
- 22 composiciones Docker verificadas con LOCAL/OPENKM y valores ficticios, sin
  levantar ni recrear contenedores. Persistencia y scripts de despliegue: 55 pruebas
  aprobadas. Detalles en la guía de despliegue provisional.

Algunas pruebas generales del proyecto omiten internamente escenarios si no
disponen de su base específica; por eso se ejecutó además la verificación
documental independiente con PostgreSQL local. No se realizó conexión a OpenKM
real, despliegue, commit ni push como parte de este avance.
