# Lectura propietaria de identidad para preview masivo

Punto 95. Sustituye los SELECT Auth del evaluador masivo RUND por una lectura interna
del propietario. No cambia el escritor definitivo, sus reglas o los módulos manuales.
Complementa [el preview sin escrituras](CONTRATO-PREVISUALIZACION-MASIVA-SIN-ESCRITURA.md).

## Contrato interno

`POST /internal/rund/v1/personas/previsualizacion-masiva` exige el guard/credencial
interna de identidad existente. JWT de usuario no sustituye esa credencial.
HTTP 200 con `Cache-Control: private, no-store`. Body exacto:

```json
{"version":1,"documento":"000123456","correo":"ficticio@example.test"}
```

Documento no vacío y correo no vacío, en minúsculas y sin espacios exteriores; sin
NUL. Se mantiene la tolerancia del Excel a documentos/correos no convencionales.
No recibe actor, permisos, IDs elegidos, resolverPorCorreo o comandos de escritura.
No genera UUIDs o correlaciones durables.

Respuesta de seis campos, dentro del sobre habitual `success/data` de Auth:

```json
{
  "consulta":{"version":1,"documento":"000123456","correo":"ficticio@example.test"},
  "persona":null,
  "usuario":null,
  "rolDocenteDisponible":true,
  "conflictoCorreo":false,
  "reserva":false
}
```

Persona existente contiene exactamente `id_person`, `tip_identificacion`, `nom_largo`,
`nom_tercero`, `pri_apellido`, `seg_apellido`, `gen_tercero`, `fec_nacimiento`, `dir_email`,
`tel_celular`, `id_seccional`. Usuario existente contiene solo `id_user`, `username`.
Se conservan nulls y bigint textual sin conversión a Number. No se consultan o entregan
contraseñas, tokens, roles completos, contexto de escritura o datos de otros módulos.

Auth ejecuta una sola sentencia con CTEs para persona por documento normalizado,
cuenta de esa persona, conflicto de correo entre personas/usuarios y existencia del
rol DOCENTE por código o nombre. Todo comparte el snapshot de esa sentencia.
No resuelve persona por correo ni escribe, bloquea, reserva o consume secuencias.
Ausencia de persona/cuenta se declara con null; conflicto y ausencia de rol son
hechos explícitos. Un fallo SQL se convierte en 503 genérico.

## Consumidor RUND

`AuthIdentityClient.previsualizacionMasiva` reutiliza URL/token/transporte existentes,
con POST y body, sin JWT/cookie del usuario, caché o reintentos. Conserva prefijos URL,
timeout y rechazo de redirecciones. Valida echo, claves y tipos exactos de los objetos,
IDs UUID, rango/canonicalización de bigint textual y cuenta ligada a una persona.
Rechaza campos privados adicionales, respuestas parciales o una reserva inesperada.
404, error de red o contrato incompleto no significan ausencia.

El evaluador solo recibe `findOne` del manager para consultar el perfil RUND y la
lectura propietaria de identidad. No ejecuta SQL Auth o una alternativa local cuando
Auth falla. Cada fila conserva su error estructurado y no se anuncia como compatible.
Una consulta posterior vuelve a pedir los hechos; no reutiliza un estado anterior.

Las propuestas puras y la normalización del punto 94 permanecen intactas. Continúan
clasificación, IDs nuevos null, comparación de persona/username/perfil, duplicados,
período/catálogo, rechazo de existente y resultados/errores de fila. Se mantiene la
auditoría de acceso sensible HTTP. El resultado sigue sin reservar o autorizar un
commit posterior: la importación definitiva vuelve a validar y todavía escribe
Auth por SQL, pendiente de sustitución por operaciones propietarias reanudables.

## Despliegue y aceptación pendientes

**Publicar primero Auth con este endpoint y después RUND con el consumidor.** El nuevo
endpoint es aditivo y conserva los contratos anteriores. No se agrega bandera o
variable de entorno: usa `AUTH_SERVICE_URL` y la credencial interna existentes.
Si RUND nuevo apunta a Auth anterior, el 404 produce errores de preview por fila;
no hay fallback SQL. No se acredita disponibilidad durante un despliegue parcial.

Este corte prepara y valida el código local; no despliega ambientes ni cambia sus
imágenes/configuración. Sigue aceptación por instalación y navegador, antes de cerrar
el paso 12 o retirar el RUND embebido en PTA. Los escritores remotos siguen apagados.

## Evidencia local

- Suites dirigidas Auth y suite RUND completa, con builds de ambos servicios.
- Los 26 casos anteriores del preview conservan sus expectativas y ahora usan hechos
  propietarios simulados, con una comprobación adicional de cero SQL de identidad RUND.
- Pruebas nuevas de query, contrato mínimo, bigint, errores/echo, credencial y transporte.
- PostgreSQL/TypeORM/HTTP real: propietario de solo lectura sin privilegios RUND y
  consumidor de solo lectura con USAGE/SELECT RUND, sin USAGE sobre Auth. Snapshot de
  tablas/identidades/secuencias y auditoría de acceso como excepción HTTP deliberada.
- Oráculo SQL exclusivo del test contrasta el DTO con los hechos previos; se conservan
  comprobaciones de clasificación con el escritor real y todos los escenarios anteriores.
- Ausencia, conflicto, fallos 404/503/contrato parcial/SQL, recuperación sin caché,
  cambio de username, documento con ceros/puntos y persona sin cuenta/bigint.

Solo datos ficticios y clúster temporal; sin bases existentes o SMTP real. Evidencia:
[validacion-preview-masivo-identidad-auth.json](validacion-preview-masivo-identidad-auth.json).
