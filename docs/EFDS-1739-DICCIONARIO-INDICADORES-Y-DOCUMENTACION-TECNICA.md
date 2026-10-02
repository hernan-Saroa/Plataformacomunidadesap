# EFDS-1739: Diccionario de Indicadores de Gestion y Documentacion Tecnica UMI

**Modulo:** Gestion de Infraestructura - Mantenimiento (UMI)  
**Requerimiento:** EFDS-1739 (RF-INF-010) - Reportes e Indicadores de Gestion  
**Version:** 1.0  
**Fecha:** Septiembre 2026  
**Autor:** Equipo de Desarrollo de Plataforma Comunidades ESAP  

---

## 1. Introduccion y Alcance

El presente documento constituye el **Diccionario Oficial de Indicadores de Gestion** y la **Especificacion Tecnica** del subsistema de analitica, reporteria ejecutiva y exportaciones implementado en el servicio de infraestructura para la Unidad de Mantenimiento e Infraestructura (UMI) de la ESAP.

Este componente permite a los coordinadores, directores y gestores operativos:
1. Monitorear el volumen de solicitudes atendidas y su evolucion periodica.
2. Evaluar el cumplimiento de los Acuerdos de Nivel de Servicio (SLA) por tipologia de mantenimiento y categoria.
3. Medir el desempeno y la carga operativa de los tecnicos de soporte fisico.
4. Conocer el nivel de satisfaccion ciudadana y de la comunidad universitaria (calificacion 1 a 5 estrellas).
5. Descargar auditorias consolidadas en formato **Excel estructurado (6 hojas)**, **PDF institucional** y **ZIP de evidencias fotograficas/documentales**.

---

## 2. Diccionario de Indicadores de Gestion (KPIs)

A continuacion se detalla la formulacion matematica, fuentes de datos e interpretacion de los 4 indicadores clave que encabezan el panel de gestion:

### Indicador 1: Total de Casos Atendidos (Volumetria de Solicitudes)
* **Descripcion:** Numero total de solicitudes de mantenimiento recibidas o procesadas dentro de la ventana de tiempo seleccionada.
* **Formula:**
  Total Casos = COUNT(solicitudes) en el rango [fechaDesde, fechaHasta]
* **Fuente en Base de Datos:** Tabla `solicitud_mantenimiento`, columna `fecha_radicacion` (o `fecha_creacion`).
* **Unidad de Medida:** Cantidad entera (Numero de solicitudes).
* **Comparativa:** Incluye calculo de variacion porcentual respecto al periodo inmediatamente anterior de igual duracion:
  Variacion % = ((Total Actual - Total Anterior) / Total Anterior) * 100
* **Filtros Aplicables:** Fechas (Desde/Hasta), Sede, Categoria, Tecnico, Area responsable (UMI / TI).

---

### Indicador 2: Tiempo Promedio de Atencion / Ejecucion
* **Descripcion:** Duracion media que le toma al equipo tecnico atender y cerrar una solicitud desde su radicacion formal hasta la confirmacion del cierre tecnico.
* **Formula:**
  Promedio Atencion = AVG(fecha_cierre - fecha_radicacion)
  (Calculado en dias habiles y equivalente en horas efectivas).
* **Fuente en Base de Datos:** `solicitud_mantenimiento.fecha_cierre`, `solicitud_mantenimiento.fecha_radicacion`, `solicitud_mantenimiento.fecha_inicio_ejecucion`.
* **Criterio de Inclusion:** Solicitudes en estado `CERRADA` o `COMPLETADA` que cuenten con fecha de cierre registrada.
* **Unidad de Medida:** Dias / Horas (con 1 decimal de precision).
* **Interpretacion:** Un promedio decreciente o estable frente a la meta global de 2.0 dias refleja agilidad en la gestion fisica.

---

### Indicador 3: Porcentaje de Cumplimiento de SLA (% SLA)
* **Descripcion:** Proporcion de solicitudes de mantenimiento cerradas dentro de los tiempos limite establecidos por el catalogo institucional de servicios UMI.
* **Formula:**
  % Cumplimiento SLA = (Casos con Tiempo Real <= Meta SLA / Total Casos Cerrados con SLA) * 100
* **Metas SLA Parametrizadas por Categoria (Catalogo UMI):**
  | Codigo | Categoria de Servicio | Meta SLA (Dias) |
  | :--- | :--- | :---: |
  | `CS_001` | Cerrajeria y Carpinteria | **2.0** |
  | `CS_002` | Electricas y Electronicas | **1.0** |
  | `CS_003` | Adecuacion de Espacios y Apoyo a Eventos | **3.0** |
  | `CS_004` | Plomeria y Fontaneria | **1.0** |
  | `CS_005` | Mantenimiento Infraestructura Fisica y Obras Menores | **5.0** |
  | `CS_006` | Mantenimiento Zonas Exteriores y Jardineria | **4.0** |
  | `CS_007` | Traslados de Mobiliario y Bienes | **2.0** |
  | `CS_008` | Revision y Mantenimiento Preventivo Equipos Criticos | **3.0** |
* **Semaforo Institucional:**
  * **Verde:** >= 85% (Cumplimiento optimo).
  * **Amarillo:** 70% - 84.9% (Alerta preventiva).
  * **Rojo:** < 70% (Incumplimiento critico que requiere escalamiento).

---

### Indicador 4: Percepcion del Servicio (Calificacion Promedio)
* **Descripcion:** Indice de satisfaccion del usuario solicitante al momento de confirmar la conformidad del servicio ejecutado.
* **Formula:**
  Promedio Calificacion = AVG(calificacion_servicio)
  Condicion: estado in ('CERRADA', 'CERRADA_SIN_ATENCION') AND resultado_conformidad = 'CONFIRMADA'
* **Distribucion de Frecuencias (1 a 5 estrellas):**
  * D1: 1 estrella (Muy insatisfecho)
  * D2: 2 estrellas (Insatisfecho)
  * D3: 3 estrellas (Neutral)
  * D4: 4 estrellas (Satisfecho)
  * D5: 5 estrellas (Excelente)
* **Fuente en Base de Datos:** `solicitud_mantenimiento.calificacion_servicio`.
* **Unidad de Medida:** Puntuacion en escala 1.00 a 5.00.

---

## 3. Desglose Analitico por Dimensiones

El modulo agrega la informacion a traves de 4 dimensiones clave:

1. **Por Categoria de Servicio:**
   * Muestra la carga de trabajo por especialidad, SLA promedio real y porcentaje de cumplimiento por especialidad.
2. **Por Tecnico Responsable:**
   * Descompone la cadena `responsable_asignado` (formato `COD_TECNICO · Nombre`) para calcular:
     * Casos asignados totales.
     * Casos completados / cerrados.
     * Casos en curso / carga vigente (`RECIBIDA`, `ASIGNADA`, `EN_PROGRESO`, `EN_ANALISIS`).
     * Calificacion promedio obtenida por cada tecnico.
3. **Tiempos de Atencion en Buckets:**
   * Distribucion en tramos de tiempo para analisis de dispersion:
     * <= 1 dia
     * 1 - 2 dias
     * 2 - 3 dias
     * 3 - 5 dias
     * > 5 dias
4. **Rollup Geografico:**
   * Distribucion por Sede institucional (`sede.nombre_sede`), identificando concentraciones de novedades por piso y edificio.

---

## 4. Estructura de Exportacion

### A. Informe en Excel (.xlsx)
Generado mediante `exceljs` en modo streaming, estructurado en **6 pestanas tematicas**:

| Hoja | Nombre | Contenido y Metricas |
| :---: | :--- | :--- |
| **1** | `Resumen_KPI` | Encabezado corporativo, fechas del periodo, metadatos del usuario extractor y las 4 tarjetas de KPIs consolidadas. |
| **2** | `Distribucion_Categoria` | Tabla con Codigo, Nombre de Categoria, Casos, Participacion %, Promedio horas y Cumplimiento SLA. |
| **3** | `Rendimiento_Tecnicos` | Carga operativa por tecnico: Asignados, Completados, En curso, Calificacion promedio y Tiempos. |
| **4** | `Tiempos_Atencion_SLA` | Histograma de distribucion en los 5 buckets de tiempo vs la meta establecida. |
| **5** | `Percepcion_Calificacion` | Matriz de satisfaccion: Total calificaciones, promedio global y desglose por tecnico y categoria. |
| **6** | `Detalle_Casos_Atendidos` | Sabana de datos linea a linea (Consecutivo, Sede, Solicitante, Fechas, Estado, Costo COP) y columna de **Hipervinculos OpenXML** a las evidencias individuales. |

### B. Informe en PDF (.pdf)
Generado con `pdfmake` en formato Carta:
* **Seccion 1:** Portada ejecutiva con escudo institucional y periodo evaluado.
* **Seccion 2:** Cuadricula de KPIs con semaforizacion.
* **Seccion 3:** Tablas analiticas de Categoria y Tecnicos con formateo tipografico en fuente nativa `Helvetica`.
* **Seccion 4:** Anexos de distribucion de estrellas (barras visuales) y tiempos.
* **Seccion 5:** Pie de pagina foliado automatico (Pagina X de Y) y leyenda de generacion.

### C. Paquete ZIP de Evidencias (.zip)
* **Endpoint:** `GET /mantenimiento/:id/evidencias/zip`
* **Tecnologia:** `archiver` v8 (`ZipArchive`) con streaming chunked.
* **Nomenclatura interna:** `001_nombre_original.ext`, `002_nombre_original.ext`.
* **Tolerancia a fallos:** Si un archivo fisico fue borrado o movido del disco, el empaquetador genera un archivo `00X_nombre__FALLO.txt` explicando la causa sin abortar el stream ni corromper el ZIP.

---

## 5. Especificacion de Endpoints REST (Swagger / OpenAPI)

Todos los endpoints estan protegidos bajo autenticacion JWT y validacion de permisos RBAC:

```yaml
/mantenimiento/estadisticas/reporte-gestion:
  get:
    summary: Obtener dataset JSON consolidado con los 6 bloques analiticos
    parameters:
      - name: fechaDesde (ISO8601)
      - name: fechaHasta (ISO8601)
      - name: idCategoria (integer)
      - name: codigoTecnico (string)
      - name: idAreaSolicitante (string)
      - name: areaResponsable ('UMI' | 'TI' | 'TODAS')
    responses:
      200: Retorna ReporteGestionDto
      400: Rango de fechas superior a 12 meses o formato invalido
      403: Permiso insuficiente (requiere infraestructura.reportes.gestion)

/mantenimiento/estadisticas/reporte-gestion/excel:
  get:
    summary: Generar y descargar libro Excel de 6 hojas
    responses:
      200: Binary Stream (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

/mantenimiento/estadisticas/reporte-gestion/pdf:
  get:
    summary: Generar y descargar reporte ejecutivo en PDF
    responses:
      200: Binary Stream (application/pdf)

/mantenimiento/{id}/evidencias/zip:
  get:
    summary: Empaquetar y descargar evidencias de una solicitud en ZIP
    responses:
      200: Binary Stream (application/zip) con Transfer-Encoding chunked
```

---

## 6. Persistencia y Almacenamiento Local de Evidencias

En cumplimiento de la directriz de infraestructura para entornos contenerizados:
* **Directorio Raiz:** `/uploads/mantenimiento/` (montado en volumen persistente).
* **Estructura Jerarquica:** `uploads/mantenimiento/{ANO}/{MES}/{UUID_HASH}.{ext}`.
* **Desacoplamiento:** Eliminada la dependencia obligatoria de MinIO S3 en desarrollo/local. El servicio `StorageService` expone directamente streams de Node (`fs.createReadStream`) garantizando descargas instantaneas sin cuellos de botella de red.
