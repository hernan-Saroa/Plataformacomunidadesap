# Plan de Mantenimiento Tecnico Correctivo y Evolutivo

## Plataforma ComUNIdadESAP

| Campo | Valor |
| --- | --- |
| Documento | Guia de mantenimiento tecnico backend, microservicios y micro-frontends |
| Fecha de elaboracion | 2026-05-25 |
| Alcance | Diagnostico, correccion y evolucion tecnica de la plataforma |
| Fuente de verificacion | Codigo, configuracion Docker Compose, paquetes y scripts presentes en el repositorio |
| Directorios principales | `backend/`, `apps/`, `packages/`, `scripts/`, `docs/` |

## 1. Proposito

Este documento establece actividades de mantenimiento correctivo y evolutivo para:

- Backend y microservicios NestJS: revision de logs en Docker, evaluacion de Redis y tratamiento de excepciones de integracion.
- Frontend y micro-frontends: solucion de conflictos en Vite Module Federation, actualizacion controlada de dependencias React/TypeScript y ajustes de interfaz con Tailwind CSS.
- Distribucion del proyecto: identificacion de componentes, responsabilidades y puntos de operacion.

La guia diferencia entre componentes realmente implementados y capacidades declaradas o provisionadas que aun no tienen evidencia de uso en codigo.

## 2. Estado Tecnico Verificado

### 2.1 Resumen de tecnologias

| Area | Tecnologia o componente | Estado observado | Evidencia principal |
| --- | --- | --- | --- |
| Backend | NestJS | Implementado en 12 servicios | `backend/*/package.json`, `backend/*/src/` |
| Persistencia | PostgreSQL y TypeORM | Implementado en servicios de dominio | Dependencias `pg` y `typeorm`; servicios Compose |
| Contenedores | Docker Compose | Implementado para ambientes y frontends | `docker-compose*.yml`, `Dockerfile*` |
| Cache / datos temporales | Redis 7 | Provisionado, sin consumo de cache confirmado en codigo | Servicio `redis` y `REDIS_URL` en Compose; no se encontro cliente Redis ni `CacheModule` en backend |
| Integracion interna | HTTP mediante API Gateway, `@nestjs/axios`, `axios` y `fetch` | Implementado | `backend/api-gateway/`, clientes HTTP en servicios |
| Excepciones | Filtro global de excepciones | Implementado solo de forma comprobada en `auth-service` | `backend/auth-service/src/common/all-exceptions.filter.ts` y `main.ts` |
| Frontend | React 18 y Vite 6 | Implementado | `package.json`, `apps/*/package.json` |
| Micro-frontends | `@originjs/vite-plugin-federation` | Implementado: un shell y 13 remotos | `scripts/mfe.config.mjs`, `apps/shell/vite.config.ts`, `apps/mfe-*/vite.config.ts` |
| UI | Tailwind CSS | Uso mixto: pipeline fuente explicito en `mfe-pta`; CSS Tailwind compilado en los demas MFEs revisados | `apps/mfe-pta/vite.config.ts`, `apps/mfe-pta/src/index.css`, `apps/*/src/index.css` |
| Compartidos frontend | Componentes, hooks y tipos | Implementado | `packages/shared-ui`, `packages/shared-hooks`, `packages/shared-types` |

### 2.2 Precisiones importantes

1. Redis aparece en `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.qa.yml`, `docker-compose.pre.yml` y `docker-compose.prod.yml`, y varios servicios reciben `REDIS_URL`.
2. La revision de `backend/*/package.json` y `backend/*/src` no encontro `ioredis`, `redis`, `cache-manager`, `@nestjs/cache-manager`, `CacheModule`, `CACHE_MANAGER` ni operaciones de claves. Por tanto, no debe afirmarse que exista cache Redis activa hasta implementar y probar un consumidor.
3. La normalizacion global de errores esta comprobada en `auth-service`; otros servicios manejan excepciones localmente y no muestran el mismo filtro global.
4. `scripts/mfe.config.mjs` registra `mfe-pta` como remoto en el puerto `3113`, mientras `scripts/check-services.mjs` no lo incluye en sus verificaciones frontend. Este desfase debe corregirse.
5. React se ejecuta en version `18.3.1`, mientras la raiz declara tipos React `^19.2.7`. Antes de actualizar dependencias debe validarse esta diferencia para evitar contratos TypeScript incompatibles.

## 3. Distribucion del Proyecto

### 3.1 Estructura general

```text
Plataformacomunidadesap/
|-- apps/
|   |-- shell/                          # Host de Module Federation
|   `-- mfe-*/                          # Micro-frontends remotos
|-- backend/
|   `-- <servicio>/                     # Microservicios NestJS independientes
|-- packages/
|   |-- shared-hooks/                   # Hooks reutilizables
|   |-- shared-types/                   # Contratos TypeScript
|   `-- shared-ui/                      # Componentes UI compartidos
|-- scripts/
|   |-- mfe.config.mjs                  # Registro central de remotos y puertos
|   |-- dev-all.mjs                     # Desarrollo del shell y remotos
|   |-- build-frontends.mjs             # Build de todos los frontends
|   |-- build-frontend-app.mjs          # Build de un frontend
|   |-- dev-backend-all.mjs             # Desarrollo de servicios backend
|   `-- check-services.mjs              # Verificacion local de endpoints
|-- docs/                               # Documentacion tecnica
|-- docker-compose*.yml                 # Despliegues por ambiente
`-- Dockerfile*                         # Imagenes de frontend y backend
```

### 3.2 Microservicios backend

| Servicio | Puerto configurado en DEV | Responsabilidad tecnica principal |
| --- | ---: | --- |
| `api-gateway` | 3000 | Enrutamiento HTTP, propagacion de solicitudes y auditoria |
| `auth-service` | 3001 | Autenticacion, usuarios, roles y permisos |
| `academic-registration-service` | 3002 | Registro academico e integracion asociada |
| `academic-work-plan-service` | 3003 | Plan de trabajo academico (PTA) |
| `certification-service` | 3004 | Certificados e integraciones de certificacion |
| `internal-disciplinary-control-service` | 3005 | Control disciplinario interno |
| `interoperability-service` | 3006 | Interoperabilidad |
| `internal-institutional-control-service` | 3007 | Control interno institucional |
| `legal-management-service` | 3008 | Gestion legal |
| `notifications-service` | 3009 | Notificaciones y correo |
| `travel-expenses-service` | 3010 | Viaticos |
| `audit-service` | 3011 | Registro de auditoria |

Nota: algunos archivos `.env.example` no coinciden con los puertos del Compose DEV para servicios de interoperabilidad, control institucional o gestion legal. Para operacion contenerizada, la referencia efectiva es el archivo Compose del ambiente; los ejemplos de entorno deben alinearse como tarea correctiva.

### 3.3 Micro-frontends

| Aplicacion | Rol | Puerto de desarrollo |
| --- | --- | ---: |
| `shell` | Host y orquestador de remotos | 3000 |
| `mfe-estructura-org` | Remoto | 3101 |
| `mfe-gestion-profesoral` | Remoto | 3102 |
| `mfe-programas-academicos` | Remoto | 3103 |
| `mfe-gestion-personas` | Remoto | 3104 |
| `mfe-auditoria` | Remoto | 3105 |
| `mfe-reportes` | Remoto | 3106 |
| `mfe-registro-academico` | Remoto | 3107 |
| `mfe-certificados-laborales` | Remoto | 3108 |
| `mfe-firma-electronica` | Remoto | 3109 |
| `mfe-control-interno` | Remoto | 3110 |
| `mfe-control-disciplinario` | Remoto | 3111 |
| `mfe-gestion-legal` | Remoto | 3112 |
| `mfe-pta` | Remoto | 3113 |

Los remotos publican `assets/remoteEntry.js`. El shell obtiene las definiciones desde `scripts/mfe.config.mjs`, que debe tratarse como fuente central para nombres, rutas y puertos.

## 4. Clasificacion del Mantenimiento

| Tipo | Finalidad | Ejemplos aplicables |
| --- | --- | --- |
| Correctivo | Restablecer comportamiento esperado ante fallas existentes | Resolver un `502` entre gateway y microservicio, reparar carga de `remoteEntry.js`, atender errores de build o corregir un estilo roto |
| Evolutivo | Mejorar capacidades, mantenibilidad, seguridad u observabilidad | Incorporar cache Redis real, estandarizar filtros de excepciones, alinear dependencias, automatizar pruebas de federation |
| Preventivo asociado | Reducir probabilidad de incidentes futuros | Revision de logs, auditoria de dependencias, health checks y checklist de despliegue |

## 5. Backend y Microservicios: Mantenimiento Correctivo

### 5.1 Revision de logs en Docker

#### Objetivo

Identificar rapidamente fallas de arranque, configuracion, conexion a base de datos o integracion HTTP entre servicios.

#### Procedimiento

Seleccionar el archivo Compose correspondiente al ambiente (`docker-compose.dev.yml`, `docker-compose.qa.yml`, `docker-compose.pre.yml` o `docker-compose.prod.yml`) y ejecutar:

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail=200 api-gateway
docker compose -f docker-compose.dev.yml logs --tail=200 auth-service
docker compose -f docker-compose.dev.yml logs --tail=200 notifications-service
docker compose -f docker-compose.dev.yml logs --tail=200 -f <servicio-afectado>
```

Validar dependencias de infraestructura:

```bash
docker compose -f docker-compose.dev.yml logs --tail=100 db
docker compose -f docker-compose.dev.yml logs --tail=100 redis
docker compose -f docker-compose.dev.yml exec redis redis-cli ping
```

#### Que buscar

| Sintoma en logs | Posible causa | Accion correctiva |
| --- | --- | --- |
| `ECONNREFUSED`, `ENOTFOUND` o timeout | URL/puerto de servicio incorrecto o contenedor detenido | Comparar variables del gateway con Compose; levantar o reiniciar solo el servicio afectado |
| `401` o `403` entre servicios | Token, JWT secret o cabeceras propagadas incorrectamente | Verificar secretos consistentes y cabeceras enviadas por gateway |
| Fallas TypeORM o `connection refused` a PostgreSQL | Credenciales, migracion o disponibilidad de BD | Revisar contenedor de BD, variables y migraciones aplicadas |
| Fallas al enviar correo o auditoria | Dependencia externa o servicio interno no disponible | Verificar `notifications-service`, `audit-service`, timeout y comportamiento degradado |
| Error no controlado con `500` | Excepcion no normalizada o fallo inesperado | Correlacionar gateway y servicio destino; reproducir con solicitud minima |

#### Hallazgo y mejora requerida

No se encontro configuracion explicita `logging` con rotacion (`max-size`, `max-file`) en los archivos Compose revisados. Como mantenimiento evolutivo, se debe incorporar rotacion para evitar consumo ilimitado de disco.

### 5.2 Gestion de cache Redis

#### Estado actual

Redis esta disponible como contenedor y cuenta con persistencia AOF en los archivos Compose por ambiente. Sin embargo, no existe evidencia en el backend de lectura, escritura, invalidacion o TTL de cache.

Consecuencia operativa: actualmente Redis puede monitorearse como infraestructura, pero no se debe ejecutar un procedimiento de invalidacion de cache de negocio porque no hay claves de la aplicacion identificadas.

#### Verificacion segura de Redis provisionado

```bash
docker compose -f docker-compose.dev.yml exec redis redis-cli ping
docker compose -f docker-compose.dev.yml exec redis redis-cli info memory
docker compose -f docker-compose.dev.yml exec redis redis-cli info persistence
docker compose -f docker-compose.dev.yml exec redis redis-cli dbsize
```

No ejecutar `FLUSHALL` ni `FLUSHDB` en ambientes compartidos o productivos sin aprobacion, respaldo y confirmacion de que Redis no almacena sesiones, colas u otra informacion critica.

#### Diagnostico si se implementa cache posteriormente

| Incidente | Validacion | Correccion controlada |
| --- | --- | --- |
| Datos obsoletos | Identificar namespace, clave, TTL y flujo que debio invalidar | Eliminar solo claves afectadas o corregir invalidacion en escritura |
| Aumento de memoria | Revisar `used_memory`, TTL y politica de eviction | Aplicar TTL obligatorio y limites de memoria segun ambiente |
| Caida de Redis | Probar comportamiento del servicio sin cache | Configurar fallo tolerable: la ausencia de cache no debe interrumpir operaciones esenciales |

### 5.3 Resolucion de excepciones de integracion en NestJS

#### Flujo observado

- `api-gateway` reenvia solicitudes a los servicios por HTTP usando `HttpService` y `lastValueFrom`.
- El gateway tambien envia auditoria mediante `AuditClientService` con timeout corto y comportamiento no bloqueante.
- Algunos servicios llaman a notificaciones u otros dominios mediante `fetch`, `axios` o `HttpService`.
- `auth-service` tiene `AllExceptionsFilter` global para normalizar errores y registrar el contexto HTTP.

#### Procedimiento correctivo para errores de integracion

1. Registrar endpoint, metodo, fecha/hora, usuario tecnico si aplica y codigo HTTP recibido.
2. Obtener logs simultaneos del gateway y del microservicio destino.
3. Verificar que la variable de URL del servicio en Compose apunte al nombre DNS y puerto correcto del contenedor.
4. Clasificar la falla:

| Categoria | Codigos o indicios | Tratamiento |
| --- | --- | --- |
| Validacion funcional | `400`, `404`, `409`, `422` | Corregir DTO, ruta o regla; no reintentar automaticamente |
| Autenticacion/autorizacion | `401`, `403` | Revisar JWT, roles y propagacion de cabeceras |
| Indisponibilidad transitoria | timeout, `502`, `503`, `ECONNRESET` | Revisar servicio destino; definir timeout y reintento solo para operaciones idempotentes |
| Excepcion interna | `500` | Buscar stack trace en servicio destino; evitar exponer detalle sensible al cliente |

5. Reproducir con una solicitud controlada y validar tanto respuesta como log generado.
6. Ejecutar build o pruebas del servicio intervenido antes del despliegue.

#### Correctivos recomendados

| Prioridad | Correctivo | Justificacion |
| --- | --- | --- |
| Alta | Extender un contrato de error comun y filtro global a los microservicios que aun no lo usan | Evita respuestas inconsistentes y simplifica diagnostico desde el frontend |
| Alta | Agregar identificador de correlacion desde el gateway y propagarlo a logs downstream | Permite rastrear una solicitud entre contenedores |
| Media | Reemplazar `console.log/error` de rutas criticas del gateway por `Logger` estructurado | Homogeneiza severidad, contexto y salida |
| Media | Documentar timeouts y comportamiento degradado de auditoria/notificaciones | Evita que dependencias auxiliares derriben una transaccion principal |

## 6. Backend y Microservicios: Mantenimiento Evolutivo

### 6.1 Adopcion controlada de Redis como cache

Redis solo debe incorporarse cuando exista un caso medible, por ejemplo catalogos de lectura frecuente, datos maestros o respuestas idempotentes costosas.

#### Plan sugerido

1. Seleccionar un endpoint de lectura y medir latencia/base de carga antes de cachear.
2. Incorporar el modulo o cliente Redis compatible con la version NestJS del servicio escogido.
3. Definir convencion de claves, por ejemplo `servicio:recurso:id:version`.
4. Definir TTL por dato y reglas de invalidacion al crear, actualizar o eliminar.
5. Aplicar fallback a base de datos cuando Redis no este disponible.
6. Agregar metricas de hit, miss, errores y tiempos.
7. Probar datos obsoletos, caida de Redis y despliegue entre versiones.

#### Criterios de aceptacion

- No se almacenan tokens, contrasenas ni datos sensibles sin una decision de seguridad explicita.
- Todas las claves funcionales tienen TTL o justificacion documentada.
- Las mutaciones invalidan las claves relacionadas.
- Una interrupcion de Redis no genera indisponibilidad total de endpoints esenciales.

### 6.2 Observabilidad y logs

| Mejora | Resultado esperado |
| --- | --- |
| Salida JSON estructurada por servicio | Busqueda y agregacion mas consistente |
| `requestId`/`correlationId` en gateway y servicios | Trazabilidad extremo a extremo |
| Rotacion Docker de logs | Control de almacenamiento |
| Health endpoints por servicio, PostgreSQL y Redis | Deteccion temprana de indisponibilidad |
| Alertas para tasa de `5xx`, timeout y reinicios | Atencion proactiva de incidentes |

## 7. Frontend: Mantenimiento Correctivo

### 7.1 Conflictos en micro-frontends con Vite Module Federation

#### Configuracion vigente

- Host: `apps/shell`, que consume remotos por `getRemoteDefinitions(...)`.
- Registro central: `scripts/mfe.config.mjs`.
- Remotos: 13 aplicaciones `mfe-*`, cada una expone `assets/remoteEntry.js`.
- Librerias compartidas declaradas: `react`, `react-dom` y `react-router-dom`.
- Desarrollo local: shell en `3000` y remotos en `3101` a `3113`.

#### Sintomas y solucion

| Sintoma | Validacion | Solucion correctiva |
| --- | --- | --- |
| Un modulo remoto no carga | Abrir su ruta `remoteEntry.js` y revisar consola del navegador | Iniciar/build del remoto; validar nombre y puerto en `scripts/mfe.config.mjs` |
| Pantalla en blanco o hooks React invalidos | Revisar versiones duplicadas de React o comparticion incorrecta | Mantener React y React DOM alineados, y declararlos como compartidos en shell/remotos |
| Solo falla produccion Docker | Validar rutas `/remotes/<mfe>/assets/remoteEntry.js` en nginx/gateway | Comparar salida de build con `docker-compose.frontend-mfe.yml` |
| Cambio de contrato rompe el shell | Verificar exportaciones `./Module` del remoto y tipos compartidos | Versionar o sincronizar contrato en `packages/shared-types` |
| UI cambia entre shell y remoto | Revisar estilos globales y orden de carga CSS | Restringir estilos globales; mover primitivas compartidas a `shared-ui` |

#### Comandos de comprobacion

```bash
npm run dev:all -- --list-apps
npm run dev:all -- --apps=shell,mfe-pta,mfe-gestion-legal
npm run build:app -- mfe-pta
npm run build
node scripts/check-services.mjs
```

#### Correctivo identificado

Agregar `mfe-pta` al arreglo `frontendServices` de `scripts/check-services.mjs`, con el puerto `3113` y la ruta `/remotes/mfe-pta/assets/remoteEntry.js`. En su estado actual, la verificacion puede informar exito sin comprobar uno de los remotos configurados.

### 7.2 Actualizacion de dependencias de seguridad React/TypeScript

#### Estado y riesgo

- La raiz y los remotos declaran React y React DOM `^18.3.1`.
- La raiz declara `@types/react` y `@types/react-dom` `^19.2.7`.
- Los remotos comparten React en federation; una actualizacion aislada puede causar duplicidad de runtime o diferencias de tipos.
- No se concluye que existan vulnerabilidades abiertas sin ejecutar una auditoria actualizada del lockfile.

#### Procedimiento correctivo/evolutivo

```bash
npm audit
npm outdated
npm run build
```

Aplicar actualizaciones en una rama tecnica y en este orden:

1. Revisar advisories y distinguir dependencia de ejecucion, desarrollo o transitiva.
2. Alinear primero `react`, `react-dom`, sus tipos y restricciones de los paquetes compartidos.
3. Mantener la misma version compatible de `@originjs/vite-plugin-federation` y Vite en los micro-frontends.
4. Regenerar `package-lock.json` mediante el gestor de paquetes; no editarlo manualmente.
5. Construir todos los MFEs y probar navegacion del shell hacia cada remoto.
6. Registrar dependencia, vulnerabilidad atendida, version anterior, version nueva y evidencia de prueba.

#### Criterios de aceptacion

- `npm audit` no reporta vulnerabilidades corregibles criticas o altas sin una justificacion formal.
- El build de shell y de los 13 remotos termina correctamente.
- No aparecen errores de hooks, carga de remotos o incompatibilidad TypeScript.
- Las versiones React compartidas son compatibles en host, remotos y `packages/shared-ui`.

### 7.3 Ajustes de UI en Tailwind CSS

#### Estado actual

`mfe-pta` implementa Tailwind CSS 4 mediante `@tailwindcss/vite` y fuente declarativa en `src/index.css`. Los demas micro-frontends revisados contienen hojas `src/index.css` con salida Tailwind ya compilada, pero sus `vite.config.ts` y `package.json` no declaran el mismo pipeline de Tailwind.

Esto implica un riesgo de mantenimiento: cambiar clases utilitarias en un MFE sin pipeline fuente activo puede no producir estilos nuevos o puede requerir regeneracion no documentada.

#### Procedimiento para correcciones visuales

1. Ubicar si el defecto corresponde al shell, al remoto o a un componente en `packages/shared-ui`.
2. Validar anchos responsivos, estados de foco, contraste, modales, tablas y navegacion por teclado.
3. Si el cambio pertenece a `mfe-pta`, modificar sus fuentes CSS/componentes y ejecutar su build.
4. Si pertenece a otro MFE, verificar primero como se genera su CSS Tailwind antes de introducir nuevas utilidades.
5. Evitar estilos globales de un remoto que modifiquen layout del shell u otros remotos.
6. Probar el remoto integrado desde el shell, no solo de forma aislada.

#### Evolucion recomendada

| Mejora | Beneficio |
| --- | --- |
| Definir una estrategia Tailwind comun para shell y remotos | Elimina CSS compilado manualmente y divergencia de estilos |
| Centralizar tokens y primitivas en `packages/shared-ui` | Reduce ajustes duplicados por modulo |
| Probar vistas responsivas y accesibilidad en CI | Detecta regresiones de UI antes de despliegue |
| Limitar estilos globales por remoto | Reduce conflictos entre aplicaciones federadas |

## 8. Matriz de Actividades de Mantenimiento

| Actividad | Tipo | Periodicidad o disparador | Evidencia esperada |
| --- | --- | --- | --- |
| Revisar logs de contenedores y errores `5xx` | Preventivo/correctivo | Diaria en operacion o ante incidente | Extracto de logs, servicio, fecha y resolucion |
| Revisar disponibilidad de PostgreSQL y Redis | Preventivo | Antes de despliegue y ante fallas de conexion | Resultado de health/ping |
| Implementar o ajustar filtro de excepciones comun | Evolutivo | Proxima iteracion backend | PR, pruebas y contrato documentado |
| Definir uso real de Redis o retirar declaracion innecesaria | Evolutivo | Decision arquitectonica pendiente | ADR o historia tecnica aprobada |
| Verificar carga de todos los `remoteEntry.js` | Preventivo/correctivo | Cada build/despliegue frontend | Resultado de chequeo incluyendo `mfe-pta` |
| Auditar y actualizar dependencias | Preventivo/evolutivo | Mensual o por advisory critico | Reporte audit, lockfile y pruebas |
| Validar ajustes UI responsivos y accesibles | Correctivo/evolutivo | Cada cambio visual | Evidencia funcional/visual y build |

## 9. Priorizacion de Hallazgos

| Prioridad | Hallazgo | Tipo de accion | Recomendacion |
| --- | --- | --- | --- |
| Alta | Redis se declara como cache en documentacion/configuracion, pero no existe uso confirmado en codigo | Aclaracion y decision evolutiva | Mantenerlo como infraestructura provisionada pendiente o implementar cache con TTL/invalidation |
| Alta | Manejo global de excepciones comprobado solo en `auth-service` | Evolutiva | Crear patron comun aplicable al gateway y microservicios |
| Alta | `mfe-pta` no es verificado por `scripts/check-services.mjs` | Correctiva | Incluir remoto `3113` en el chequeo |
| Media | Tipos React 19 en raiz con runtime React 18 | Correctiva/preventiva | Alinear estrategia de versiones y ejecutar build/pruebas |
| Media | Tailwind fuente activo solo en `mfe-pta`, con CSS compilado en otros MFEs | Evolutiva | Unificar pipeline o documentar generacion por aplicacion |
| Media | No se encontro rotacion explicita de logs Docker | Evolutiva | Configurar limites y retencion por ambiente |
| Media | Puertos de algunos `.env.example` difieren de Compose DEV | Correctiva | Actualizar ejemplos para evitar fallas locales |

## 10. Registro Minimo de una Intervencion

Cada mantenimiento debe dejar un registro con:

| Dato | Descripcion |
| --- | --- |
| Fecha y ambiente | Momento y entorno intervenido |
| Incidente o requerimiento | Motivo y alcance |
| Componentes afectados | Servicio, MFE, paquete o contenedor |
| Diagnostico | Logs, error, advisory o evidencia funcional |
| Cambio aplicado | Archivos/configuracion/versiones modificadas |
| Pruebas realizadas | Build, pruebas unitarias, health check o navegacion validada |
| Riesgo residual | Pendientes o condiciones no cubiertas |
| Reversion | Procedimiento para volver a la version previa |

## 11. Lista de Verificacion de Cierre

### Backend

- [ ] Se identifico el microservicio origen y destino del incidente.
- [ ] Se revisaron logs del gateway, servicio afectado e infraestructura requerida.
- [ ] No se expusieron secretos o datos sensibles en logs o respuestas.
- [ ] Las excepciones nuevas tienen codigo HTTP y mensaje controlado.
- [ ] Si se intervino Redis, se documento clave, TTL, invalidacion y riesgo.

### Frontend

- [ ] El shell carga los remotos afectados sin errores de consola.
- [ ] El `remoteEntry.js` del MFE intervenido esta disponible.
- [ ] React/React DOM permanecen compatibles entre host y remoto.
- [ ] Los cambios Tailwind/CSS se validaron integrados en el shell.
- [ ] Se probaron resoluciones y accesibilidad basica del ajuste UI.

### Entrega

- [ ] Se ejecuto el build o prueba aplicable.
- [ ] Se adjunto evidencia tecnica de validacion.
- [ ] Se registraron pendientes evolutivos y riesgo residual.

## 12. Referencias Internas Revisadas

- `README.md`
- `package.json`
- `package-lock.json`
- `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.qa.yml`, `docker-compose.pre.yml`, `docker-compose.prod.yml`
- `docker-compose.frontend-mfe.yml`
- `scripts/mfe.config.mjs`
- `scripts/dev-all.mjs`
- `scripts/dev-backend-all.mjs`
- `scripts/check-services.mjs`
- `apps/shell/vite.config.ts`
- `apps/mfe-pta/vite.config.ts`
- `apps/mfe-pta/src/index.css`
- `backend/api-gateway/src/gateway/gateway.service.ts`
- `backend/api-gateway/src/audit/audit-client.service.ts`
- `backend/auth-service/src/common/all-exceptions.filter.ts`
- `backend/auth-service/src/main.ts`
