# Foto de perfil compartida por PTA y RUND

Cada persona tiene una foto publicada y, como máximo, una solicitud pendiente.
La foto es común a todos los periodos del docente. PTA, Identidad RUND y la carga
masiva crean solicitudes pendientes; ninguna de estas cargas publica la imagen.
Una nueva solicitud reemplaza la pendiente y conserva la foto aprobada.

El grupo revisa desde **Banco de Docentes → Fotos de perfil** o desde
**Detalle del docente → Identidad → Foto de perfil**. Puede comparar la imagen
publicada y la propuesta, aprobar o rechazar. El rechazo exige una observación
de 5 a 1000 caracteres y conserva la foto publicada. La aprobación sustituye la
publicación y conserva el historial. Una decisión sobre una versión ya reemplazada
o revisada devuelve 409; debe actualizarse la revisión.

## Permisos administrables

| Código | Operación |
| --- | --- |
| `banco-docentes.rund.photos.manage` | Cargar fotos en RUND y por lotes; no aprueba. |
| `banco-docentes.rund.photos.validate` | Bandeja, aprobación y rechazo de fotos; no carga fotos ajenas. |

Los permisos aparecen en el catálogo de RUND y son independientes de la revisión
de documentos. La migración habilita carga para el rol predefinido `RUND_CARGADOR`
y validación para `RUND_APROBADOR`. No cambia usuarios ni roles personalizados.
Superadministración conserva su acceso. Los roles personalizados necesitan
los permisos de consulta/acceso al módulo RUND y el permiso de fotos pertinente.
El docente carga su propia foto con la identidad autenticada, sin enviar un ID
de persona confiable desde el navegador.

## Archivos y carga masiva

- PNG o JPEG (`.png`, `.jpg`, `.jpeg`), máximo 2 MB por foto.
- Ancho y alto de 200 a 4096 píxeles. Recomendado: 600 × 600 píxeles,
  rostro centrado y fondo claro. No se deforma ni se recorta el archivo original.
- La interfaz y el servidor verifican formato, tamaño y dimensiones.
- Para lotes, registrar primero los docentes y seleccionar hasta 20 imágenes.
  El nombre del archivo debe ser el documento: `12345678.jpg`.
  No se descargan fotos de URLs ni se alteran las plantillas Excel existentes.
- El resultado informa por archivo si quedó pendiente o cuál fue el error.

## Instalación

Aplicar `db/migrations/674_rund_foto_perfil_validation.sql` antes de desplegar
`academic-work-plan-service`, `auth-service`, shell y el remoto PTA. La migración
es transaccional e idempotente. Crea almacenamiento binario de fotos, índices de
unicidad y permisos. No modifica datos de identificación ni documentos RUND.
No convierte fotos pendientes en aprobadas automáticamente.

La ruta histórica `POST /auth/api/v1/portal/foto-perfil` delega al flujo RUND;
`auth-service` usa `ACADEMIC_WORK_PLAN_SERVICE_URL` (el mismo nombre de configuración
del gateway), con el destino local/Docker habitual como valor predeterminado.
El cliente nuevo utiliza `/pta/api/v1/pta/fotos-perfil` mediante el cliente API
compartido, que resuelve correctamente los modos directo y gateway.

Las fotos pendientes solo se consultan por el propietario o mediante permisos
RUND. Los demás usuarios autenticados consultan únicamente la publicada. No se
exponen archivos pendientes como recursos estáticos. El contenido se almacena en
PostgreSQL y se entrega con `Cache-Control: private, no-store`; las fotos y
decisiones se excluyen de la caché offline. Las pantallas se actualizan después
de cada operación, entre pestañas del mismo navegador, al recuperar foco y cada
60 segundos mientras están visibles.

## Verificación

- Jest: `rund-photos.http.spec.ts` y `rund-photo-validation.spec.ts`.
- Vitest: `RundPhotoPanel.test.tsx`, catálogo de permisos y política de caché,
  además de las pantallas RUND existentes.
- `node scripts/verify-rund-photos-postgres.cjs`: migración y ciclo de vida contra
  PostgreSQL local. Usa identidades sintéticas, tablas temporales y rollback.
- `node scripts/verify-rund-photos-browser.mjs`: componentes reales con API de
  prueba, aprobación, carga PTA y tamaños de 320, 375, 768 y 1440 píxeles.
  Capturas en `.local/rund-photos-preview`.
