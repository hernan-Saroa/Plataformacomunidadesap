# Recorrido integrado de revisiones por HTTP local

Punto 91. Complementa la [entrada opcional del punto 90](CONTRATO-ENTRADA-REVISIONES-CORREO-RUND.md)
con React/jsdom, lector de sesión del shell y transporte API productivos contra
controladores, guards, JWT y PostgreSQL reales en un entorno temporal ficticio.
No monta la entrada en el banco, menú o shell activos.

## Configuración y ejecución

La entrada nueva se verifica desde `node scripts/verify-rund-service-integration.cjs`.
Se requieren los builds vigentes de `backend/rund-service` y `backend/auth-service`,
las dependencias locales del MFE y los binarios PostgreSQL ya utilizados por ese
verificador. `PG_BIN_DIR` conserva su comportamiento previo. No necesita datos,
accesos o configuración de una instalación existente.

`verify-rund-mail-review.cjs` incorpora el verificador de la entrada después de
los escenarios anteriores. Reutiliza exclusivamente el clúster recién creado,
los casos ficticios, los servicios/controlador de revisiones y sus guards reales.
Se agrega AuthController `/me` con estrategia/guard reales y proveedores mínimos;
no arranca Auth AppModule ni carga sus módulos de base de datos.

El verificador genera configuración Vitest bajo tmp con envDir vacío y ejecuta
solo `RundMailReviewWorkspace.http.integration.tsx`. Ese archivo tiene un nombre
distinto de `*.test.tsx`: no necesita servicios externos para correr la suite
unitaria habitual. TypeScript del MFE también comprueba el archivo de integración.
No se cambian configuraciones Vite/Vitest existentes o archivos .env reales.

| Modo de prueba | Destinos temporales |
|---|---|
| Directo | Lector shell a Auth `/me`; transporte MFE al controlador RUND sin prefijo |
| Gateway | `/services/auth/api/v1/me` y `/services/rund/api/v1/...` mediante proxy de prefijo del fixture |

Los destinos, puertos y clave del control de pruebas se proporcionan solo al proceso
Vitest. Todos los servidores escuchan en `127.0.0.1`. Los JWT y credenciales se generan
para el fixture; no se guardan como configuración de despliegue o datos del producto.
El control local exige una clave ficticia y permite únicamente preparar casos,
cambiar el permiso ficticio, retener/liberar una respuesta o verificar invariantes.
No acepta SQL, URLs o conexiones arbitrarias.

El lector shell real recibe la configuración de transporte del MFE para esos destinos
de prueba. Fetch realiza HTTP real; el adaptador solo incorpora la cookie ficticia
que enviaría un navegador. Exige credentials include/no-store, sin Authorization o
token interno añadidos por el cliente. Los éxitos conservan private,no-store.

## Escenarios e invariantes

- Opción ausente o montaje habilitado sin consultas; apertura explícita lee `/me`
  y proyecta la cuenta, distinta de persona. No toca solicitudes manuales almacenadas.
- Lista, paginación y filtro usan la API real; el cursor mantiene el último caso y
  filtro. La preparación respeta los triggers y fechas del propietario; no mueve
  casos anteriores, borra historia o desactiva protecciones para ordenar la bandeja.
- Detalle lee omisión antes de diagnóstico/caso/cierre y asigna a la cuenta autenticada
  mediante POST vacío. PostgreSQL confirma el responsable durable.
- Auth vencido impide abrir, y view sin manage impide consultar aunque la UI tenga
  rol ADMIN. Revocar/restaurar manage exige consulta explícita, sin retry o refresh.
- Perder la respuesta de asignación después del commit conserva el caso; otra consulta
  recupera la asignación sin repetir el POST.
- Cierre exige aceptación y confirmación marcada, sin afirmar recepción/lectura.
  Otro responsable conserva su exclusividad incluso con ADMIN visual.
- Notificación durante Auth o lectura SQL descarta respuestas anteriores y permite
  otra apertura. No vuelve a publicar filas o autoridad de una sesión anterior.

Cada escenario conserva las tablas de negocio, avisos/resultados, identidades Auth
y número de entregas ficticias capturados después de preparar sus datos. Solo se
permiten los cambios de revisión/cierre esperados. No hay SMTP real. Las aplicaciones
del fixture se cierran en finally y el verificador principal detiene/elimina solamente
el clúster temporal cuya ruta verificó.

## Alcance de la evidencia

Esto verifica integración local de aplicación, transporte, HTTP, autorización y SQL.
El proxy de prefijo es un fixture; la evidencia del gateway productivo se conserva
por separado. La incorporación de cookie está simulada: no acredita comportamiento
de CORS, SameSite, TLS, dominio, proxy de despliegue o navegador real por ambiente.
Auth `/me` conserva su contrato basado en JWT; no agrega una comprobación de cuenta
en base de datos que ese endpoint no realizaba.

Continúan aceptación de navegador/instalación y prerrequisitos por ambiente antes de
habilitar la entrada. Se mantienen módulos opcionales fuera de AppModule, banderas
Auth false por defecto y RUND embebido en PTA. La resolución humana de incertidumbres,
otras resoluciones de rechazos, intervalo Auth–SMTP y otros canales/propietarios siguen
en el mapa de pendientes. No se declara independencia completada o despliegue validado.
