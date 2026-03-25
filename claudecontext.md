# Contexto del Proyecto ESAP - Plataforma Comunidades

Este documento es una guía de transferencia de contexto para cualquier agente de IA que retome el trabajo sobre este proyecto. Contiene un resumen de las modificaciones recientes, los microservicios afectados, las reglas de arquitectura y las directrices dadas por el usuario.

## 🎯 Directrices Estrictas del Usuario

Antes de realizar cambios en el código, es de **lectura obligatoria** adherirse a estas reglas de oro, establecidas desde el principio del trabajo:

1. **Gestión del Frontend:** **NO TOCAR el Frontend a menos que el usuario lo pida explícitamente**. Si la corrección puede abordarse únicamente desde el Backend, la máxima prioridad debe ser el Backend.
2. **Ubicación de Migraciones de Base de Datos:** Todos los scripts de alteración o creación de tablas en la base de datos SQL **deben** dejarse en la carpeta `db/migrations/`, con un nombre consecutivo y descriptivo seguido del timestamp (por ejemplo, `008_esap_legal_update_12032026.sql`). 
3. **Ejecución de Migraciones:** **Nunca** ejecutes ni corras los scripts o sentencias SQL en la base de datos tú mismo automáticamente. Solo debes indicarle al usuario que el script se ha creado en la carpeta correspondiente para que él asuma el control manual de ello.
4. **Patrones de Solución:** Priorizar soluciones ingeniosas backend si eso ahorra modificar la arquitectura de tablas por bugs pequeños, pero siempre priorizar el diseño robusto si se trata de módulos nuevos.
5. **Aesthetics:** El frontend debe conservar el "Diseño Limpio ESAP 2025".

## 🏗 Microservicios y Módulos Implicados

Las intervenciones más recientes han estado concentradas en el **Módulo de Gestión Legal** (`legal-management-service`) y su interconexión Frontend-Backend.

- **Servicio Backend:** `backend/legal-management-service/`
- **Frontend App:** Servida desde la raíz (`Plataformacomunidadesap/...`)
-**submodulos:** Cada pedazo de gestion legal esta dividida en los llamados submodulos que son las diferentes pestañas que tiene este modulo

## 🛠 Hitos Recientes y Modificaciones

Hemos resuelto 12 *bugs* distribuidos en 3 fases para los submódulos de **Juzgamiento Disciplinario**, **Centro de Comunicaciones** y **Términos e Informes**, además de abordar ajustes en **Defensa Judicial** (Audiencias).

A continuación se detallan las clases y archivos clave que han sido alterados sustancialmente:

### Frontend (`src/components/esap/gestion-legal/`)

1. **`ModuloTerminosInformesV3.tsx`**
   - Se arreglaron crashes repentinos debidos a uso de variables indefinidas en `.map()` dentro de la `VistaCalendario`.
   - Se conectó la funcionalidad del botón `"Agregar Comentario"` enviando un payload especial `{ nuevoComentario }` para no sobrescribir la metadata de archivos adjuntos.
   - Se pasaron los manejadores `onArchivar` y `onEliminar` al componente modal hijo.
   - El tab "Archivados" ya no usa datos *mock*; se deriva dinámicamente de `solicitudes` donde `etapa === 'CUMPLIDO'`.
   - Las vistas principales (Línea de tiempo, Lísta, Calendario) ahora filtran los ítems `CUMPLIDO` para no saturar los ítems activos.
   - Se reemplazó el uso de `window.confirm` genérico del navegador con un componente `Dialog` nativo de `@/components/ui/dialog` para tener una modal de configuración para "Eliminar".
2. **`ModalDetalleSolicitudInforme.tsx`**
   - Se removió el contenido 'mockeado' y se implementó un consumo dinámico a la base de datos.
   - Migración de la función de Exportar de un simple .txt falso a una exportación pura de `.pdf` trayendo el Buffer estructurado desde el servidor.
   - Lógica de subida de archivos real implementada.
   - Refactor de estado reactivo y visualización del listado de archivos nuevos y archivos viejos.
3. **`CentroComunicacionesJuridicasV3.tsx`** y **`ModalNuevaComunicacion.tsx`**
   - Se corrigió el flujo para responder correos asegurándose que las respuestas aparezcan en el tab "Respondidos" en lugar de tratarse como nuevos correos enviados.
4. **`services/api/legal.service.ts`**
   - Agregado de funciones cliente para soportar todo el CRUD sobre términos: `updateTermino()`, `eliminarTermino()`, `exportarTerminoPdf()`, `getDocumentosTermino()` y `cargarDocumentoTermino()`.

### Backend (`backend/legal-management-service/src/`)

4. **`controllers/terminos.controller.ts`**
   - Creados nuevos *endpoints*: 
     - `@Delete(':id')` para borrar términos.
     - `@Patch(':id')` para actualización parcial y cambio de estado a 'Cumplido'.
     - `@Get(':id/exportar/pdf')` que devuelve el PDF.
     - `@Post(':id/upload-documento')` con un `FileInterceptor` (Multer) para recibir subidas físicas al disco temporal.
5. **`services/terminos.service.ts`**
   - **`generarPDF(id)`:** Usa la librería de Node `pdfkit` para dibujar a mano un reporte oficial completo e integrado sobre el término procesal en un Buffer.
   - **`addDocumentoLogico(id, file)` y `getDocumentos(id)`:** Se introdujo una adaptación donde los metadatos de los archivos (adjuntos temporales o logicos de un Termino Procesal) que no poseían una tabla relacional, se parsean inteligentemente hacia el campo de texto enriquecido `observaciones` bajo el string `[ARCHIVO_ADJUNTO]`. Permitió solucionar el almacenamiento de documentos sin afectar el esquema robusto inicial de bases de datos.
   - Método lógico `update()`: Modificado para manejar una llave especial `{ nuevoComentario }` enviada desde el front. Evalúa si existe un comentario enviado de este modo para anexarlo concatenado con salto de línea. Esto solventa un bug donde los comentarios y los archivos adjuntos se pisaban entre sí al intentar sobreescribir de lleno la columna `observaciones`.
   - Método `sincronizar()` y `createAutomatico()`: Ajustados para DEJAR INTACTOS los comentarios (`observaciones`) en caso de que el término legal ya tuviese información del usuario y que este fuera re-sincronizado al consultar la lista o refrescar F5. Esto solventa definitivamente la desaparición fantasma de archivos subidos y comentarios.
   - Modificación del método lógico de `remove()`: Transformado en un borrado lógico estableciendo `estado: 'ELIMINADO'`, en lugar de ejecutar una eliminación de tupla SQL pura. Esta medida detiene que el método `sincronizar()` detecte ausencias y "reviva" el término basándose en su expediente padre, permitiendo un borrado suave y persistente independientemente del estado del Proceso original.
     - **Nota de Base de Datos:** Para soportar el borrado lógico mencionado anteriormente, fue necesario flexibilizar la restricción `CHECK` de SQL (`terminos_procesales_estado_check`) para que acepte el estado `'ELIMINADO'`, además de `'PENDIENTE', 'CUMPLIDO', 'VENCIDO' y 'SUSPENDIDO'`. Se creó y dejó lista la migración en `db/migrations/136_add_eliminado_to_terminos_estado.sql`.
   - Método `getSemaforoList()` modificado para traer absolutamente todos los términos y delegar el filtro de eliminados/archivados al frontend, garantizando flexibilidad.
6. **`services/correos-juridicos.service.ts`**
   - Método `resolveInlineImages()` arreglado para visualizar correctamente las imágenes inline en el cuerpo de los correos evitando peticiones rotas con origen `cid:`.
   - Método `replyEmail()` optimizado para guardar correctamente en base de datos un correo como `categoria: 'RESPUESTA'` y relacionarlo al mensaje Graph originario, seteando de paso `isReplied` a true en el original.

## 📌 Guía para Continuar

1. Todo el set de 10 bugs fue cerrado con éxito. Las operaciones de *Exportar, Subir Archivos, Borrar, Guardar Notas y Previsualizar* referentes al control de tiempos legales **son ya plenamente funcionales**.
2. Existe un fix pendiente en el módulo **Defensa Judicial** (Modalidad de las *Audiencias* donde si es Presencial, se guarda temporalmente como Virtual). Puedes revisar los controladores de Audiencias.
3. Para cualquier nueva inserción requerida en esquemas y tablas (ej. `TerminosProcesales`), acuérdate de **añadir los .sql a tu `db/init/`**.
4. Usa el framework `NestJS` tal y como está estructurado el código, utilizando decoradores limpios, manejo de excepciones de Nest, y uso de Tipos estrictos.
5. El sistema de Frontend utiliza la librería `sonner` para los *toasts*. Ya está bien estabilizada sin dependencia de versión forzada en los archivos intervenidos.

---
`Fin de transmisión.` Mantenemos código limpio y eficiente. ¡Mucho éxito a la próxima instrucción!
