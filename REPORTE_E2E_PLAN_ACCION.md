# Reporte de Pruebas E2E: Plan de Acción Institucional (SIGL PEI)

**Fecha de Ejecución:** 2026-11-04  
**Ambiente de Prueba:** Entorno Local de Desarrollo (Windows, Shell + MFE Gestión Legal)  
**Navegador:** Chromium Headless (Puppeteer v24.35.0, viewport 1600x1000 y 390x844 responsive)  
**Usuario Autenticado:** `superuser@esap.edu.co` (Rol: SUPER_ADMIN)  
**Módulo Evaluado:** Plan de Acción Institucional (Sistema Integrado de Gestión Legal - PEI)  
**Veredicto Global:** **APROBADO (50 / 50 Casos PASA - 100 % de Cobertura)**

---

## 1. Resumen Ejecutivo

Se ejecutó de manera automatizada y exhaustiva la suite de pruebas End-to-End (E2E) para el módulo **"Plan de Acción Institucional"** sobre la plataforma ESAP (integración API real Gateway, Auth Service, Legal Management Service y microfrontend `mfe-gestion-legal`).

Todas las pruebas se ejecutaron estrictamente bajo la modalidad de **LECTURA** (sin alterar registros de base de datos ni crear indicadores espurios). Se validaron los 50 casos de prueba distribuidos en 9 grupos de verificación (A hasta I), comprobando la resolución definitiva de los problemas de filtrado por Eje, Estado, Periodo, Búsqueda combinada, colapsables de detalle, concordancia con el semáforo institucional, modales con historial de avances y exportaciones a Excel, PDF y ZIP.

| Métrica | Valor | Porcentaje |
| :--- | :---: | :---: |
| **Total de Casos Evaluados** | **50** | **100 %** |
| **Casos PASA** | **50** | **100 %** |
| **Casos FALLA** | **0** | **0 %** |
| **Casos BLOQUEADO** | **0** | **0 %** |
| **Capturas de Evidencia Generadas** | **9 obligatorias (📸)** | **100 %** |

---

## 2. Información del Entorno de Ejecución

- **Sistema Operativo:** Windows 11 Enterprise (PowerShell v5.1 / Node.js runtime)
- **Node.js:** `v24.19.0`
- **Puertos de Red Escuchando y Verificados:**
  - `5432`: PostgreSQL Database (`True`)
  - `4000`: API Gateway Express / Proxy (`True`)
  - `3001`: Auth Service (`True`)
  - `3008`: Legal Management Service (`True`)
  - `3000`: Shell Host Application / Vite (`True`)
  - `3112`: Microfrontend Gestión Legal Remote / Static Server (`True`)
- **Paso 1.4 - Verificación de Remoto y Fix Desplegado:**
  - Archivo remoto activo: `http://localhost:3112/remotes/mfe-gestion-legal/assets/__federation_expose_Module-OKk7YTVf.js`
  - Patrón de verificación `"No hay indicadores que coincidan"`: **`True`** (Build vigente confirmado).
- **Paso 1.5 - Verificación de Datos de Prueba (API):**
  - Endpoint `POST /auth/api/v1/login`: Exitoso.
  - Endpoint `GET /legal/api/v1/pei/dashboard`: 7 indicadores de prueba (`QA-E2E ...`) listados con éxito.

---

## 3. Matriz Completa de Resultados

| ID | Caso | Resultado Esperado | Resultado Obtenido | Veredicto | Evidencia |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **A1** | Vista inicial Lista con 4 ejes y tarjetas | Vista Lista por defecto con 4 ejes y tarjetas superiores (Total=7) | Vista Lista activa, 4 ejes presentes, Total=7 | **PASA** | [A1_vista_lista.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/A1_vista_lista.png) |
| **A2** | Cambio a Dashboard con 4 tarjetas de eje | 4 tarjetas de eje con barra, N indicadores y % (68/45/78/85) | Gestión (2 ind, 68%), Talento (2 ind, 45%), Transparencia (2 ind, 78%), Tecnología (1 ind, 85%) | **PASA** | [A2_dashboard_inicial.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/A2_dashboard_inicial.png) |
| **A3** | Métricas superiores y contador | Total=7, Cumplimiento=66%, En Riesgo/Vencidos=4, "Mostrando 7 de 7 indicadores" | Total: 7, Cumplimiento: 66%, En Riesgo/Vencidos: 4, "Mostrando 7 de 7 indicadores" | **PASA** | — |
| **B1** | Popover Filtro Ejes | Popover con "Todos los Ejes" checked y 4 ejes con checkbox | Popover desplegado con 5 opciones con checkbox (Todos los Ejes checked por defecto) | **PASA** | [B1_popover_ejes.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/B1_popover_ejes.png) |
| **B2** | Filtrar por Gestión Institucional | 1 tarjeta (68%), Total 2, Cumplimiento 68%, Mostrando 2 de 7 | Cards: 1 (Gestión Institucional 68%), Métricas: Total 2, Cump 68%, Mostrando 2 de 7 indicadores | **PASA** | — |
| **B3** | Añadir Tecnología a filtro Ejes | 2 tarjetas, Mostrando 3 de 7, botón "Ejes (2)" | Cards: 2, Contador: "Mostrando 3 de 7 indicadores", Botón: "Ejes (2)" | **PASA** | — |
| **B4** | Marcar Todos los Ejes | 4 tarjetas, checkboxes individuales desmarcados, 7 de 7 | Cards: 4, "Todos los Ejes" marcado, individuales limpios, "Mostrando 7 de 7 indicadores" | **PASA** | — |
| **B5** | Marcar y desmarcar eje individual | Botón vuelve a "Todos los Ejes", 4 tarjetas visibles | Botón: "Todos los Ejes", 4 tarjetas visibles (comportamiento equivalente a Todos) | **PASA** | — |
| **B6** | Botón con un solo eje muestra su nombre | Botón muestra "Talento Humano" | Botón: "👥 Talento Humano" | **PASA** | — |
| **B7** | Filtrar por Gestión Institucional en vista Lista | Solo Gestión Institucional visible en Lista, sin ejes vacíos | Solo Gestión Institucional visible en Lista, los otros 3 ejes vacíos se ocultan | **PASA** | — |
| **C1** | Popover Filtro Estados | Todos los Estados + En Tiempo, En Riesgo, Vencido, Completado | Opciones desplegadas: Todos los Estados, En Tiempo, En Riesgo, Vencido, Completado | **PASA** | [C1_popover_estados.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/C1_popover_estados.png) |
| **C2** | Filtro Estado = Vencido | Gestión (1) y Transparencia (1), 2 de 7, badges "Vencido" | Cards: Gestión (1 ind) y Transparencia (1 ind), "Mostrando 2 de 7", Badges en tabla: Vencido | **PASA** | — |
| **C3** | Filtros individuales de estado | En Riesgo: 2 ind; En Tiempo: 2 ind; Completado: 1 ind | En Riesgo: 2 de 7 ({3,7}); En Tiempo: 2 de 7 ({2,4}); Completado: 1 de 7 ({6}) | **PASA** | — |
| **C4** | Vencido + En Riesgo simultáneos | 4 indicadores, Cumplimiento 63 %, Mostrando 4 de 7 | Total: 4, Cumplimiento: 63 %, Contador: "Mostrando 4 de 7 indicadores" | **PASA** | — |
| **C5** | Suma de cuentas por estado individual | Suma totaliza exactamente 7 indicadores (2+2+2+1=7) | 2 Vencidos + 2 En Riesgo + 2 En Tiempo + 1 Completado = 7 indicadores | **PASA** | — |
| **D1** | Gestión Institucional + Vencido | Solo id 1, Total 1, Cumplimiento 40%, Mostrando 1 de 7 | Total: 1, Cumplimiento: 40%, 1 tarjeta (Gestión Institucional 40%), Mostrando 1 de 7 | **PASA** | [D1_gestion_vencido.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/D1_gestion_vencido.png) |
| **D2** | Transparencia + Vencido | Solo id 5, Total 1, Cumplimiento 55%, Mostrando 1 de 7 | Total: 1, Cumplimiento: 55%, 1 tarjeta (Transparencia 55%), Mostrando 1 de 7 | **PASA** | — |
| **D3** | Tecnología + Vencido (Sin resultados) | Mensaje exacto "No hay indicadores que coincidan con los filtros seleccionados" y botón Limpiar filtros | Mensaje exacto visible en contenedor role="status" y botón "Limpiar filtros" habilitado | **PASA** | [D3_sin_resultados.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/D3_sin_resultados.png) |
| **D4** | Restauración tras Limpiar filtros | 4 ejes restablecidos, Mostrando 7 de 7, botones en Todos | 4 tarjetas restauradas, "Mostrando 7 de 7 indicadores", botones en "Todos los Ejes/Estados" | **PASA** | — |
| **D5** | Talento Humano + Tecnología | 3 indicadores ({3,4,7}), Cumplimiento 58 %, Mostrando 3 de 7, 2 tarjetas | Total: 3, Cumplimiento: 58%, Cards: 2, Mostrando 3 de 7 indicadores | **PASA** | — |
| **D6** | Botón Ocultar Completados | 6 indicadores visibles (excluye id 6), Mostrando 6 de 7 | Total: 6, Contador: "Mostrando 6 de 7 indicadores", id 6 Datos Abiertos oculto | **PASA** | — |
| **D7** | Búsqueda por texto ("Tres", "5", "Digital") | Cada búsqueda filtra con precisión al indicador correspondiente (ids 3, 5 y 7) | "Tres": id 3 (1 de 7), "5": id 5 (1 de 7), "Digital": id 7 (1 de 7) | **PASA** | — |
| **D8** | Búsqueda + Filtro combinados | Búsqueda "QA" con Eje Transparencia muestra 2 indicadores ({5,6}) | Total: 2, Contador: "Mostrando 2 de 7 indicadores", 1 tarjeta visible (Transparencia) | **PASA** | — |
| **E1** | Filtro periodo acotado (2026-09-01 a 2026-10-31) | 3 indicadores ({2,4,6}) con fecha de corte en el rango | Total: 3, Contador: "Mostrando 3 de 7 indicadores" | **PASA** | — |
| **E2** | Filtro periodo abierto (solo desde / solo hasta) | Solo desde 2026-10-01: 2 ind ({2,6}); Solo hasta 2026-04-30: 2 ind ({3,5}) | Desde 2026-10-01: 2 de 7; Hasta 2026-04-30: 2 de 7 | **PASA** | — |
| **E3** | Periodo futuro desde 2026-12-01 | Mensaje exacto de sin resultados | Mensaje "No hay indicadores que coincidan con los filtros seleccionados" | **PASA** | — |
| **E4** | Periodo inválido (desde > hasta) | Resultado vacío o impedido por validación HTML5 sin errores JS de consola | Resultado vacío con mensaje de filtro sin resultados, 0 errores JS en consola | **PASA** | — |
| **E5** | Estado Vencido + hasta 2026-04-30 | Solo id 5 (Transparencia, 55%, Mostrando 1 de 7) | Total: 1, Cumplimiento: 55%, 1 tarjeta (Transparencia), Mostrando 1 de 7 | **PASA** | — |
| **E6** | Rango de fechas amplio 2020 a 2099 | Muestra los 7 indicadores completos | Total: 7, Contador: "Mostrando 7 de 7 indicadores" | **PASA** | — |
| **F1** | Despliegue y pliegue de tarjeta de eje | Al hacer clic se despliegan 2 indicadores; segundo clic la pliega | Expandido: 2 indicadores en lista, Plegado: 0 elementos en lista | **PASA** | [F1_detalle_eje_expandido.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/F1_detalle_eje_expandido.png) |
| **F2** | Detalle de indicadores desplegados | Nombre, barra, %, Meta: 100%, Ejecutado: N%, Responsable, Corte con valores de Parte 3 | Id 1 (40%, Meta: 100%, Ejecutado: 40%, Resp Uno, Corte: 20/5/2026) e Id 2 (95%, Resp Dos, Corte: 1/10/2026) | **PASA** | — |
| **F3** | Colores del semáforo en indicadores y ejes | Verdes: {2,6}, Amarillos: {3,7}, Rojos: {1,4,5} | Ids 2,6 Verde; 3,7 Amarillo; 1,4,5 Rojo. Ejes: Gestión (68% Amarillo), Talento (45% Rojo), Transp (78% Amarillo), Tec (85% Amarillo) | **PASA** | — |
| **F4** | Modal de detalle de indicador con historial | Modal con Historial de Avances (40% 20/5/2026 y 30% 10/2/2026) y botones Actualizar Avance, Editar, Archivar | Historial: 2 cortes con fecha/hora, observaciones "Segundo corte" y "Corte inicial", y botones de acción presentes | **PASA** | [F4_modal_detalle_historial.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/F4_modal_detalle_historial.png) |
| **F5** | Cierre de modal de detalle | Modal cerrado exitosamente mediante botón de cierre o Escape | Modal desmontado del DOM correctamente al pulsar botón cerrar | **PASA** | — |
| **F6** | Columna Fecha de Corte en vista Lista | Columna "Fecha de Corte" presente y muestra las 7 fechas de corte de Parte 3 | Columna "FECHA DE CORTE" presente; 7 fechas localizadas: 20/5/2026, 1/10/2026, 5/3/2026, 15/9/2026, 12/4/2026, 20/10/2026, 8/8/2026 | **PASA** | — |
| **G1** | Exportación Excel sin filtros | 7 filas en hoja "Indicadores" y 4 ejes en "Resumen por eje" | Descargado `plan_accion_indicadores.xlsx`: Hoja "Indicadores" = 7 filas de datos; Hoja "Resumen por eje" = 4 ejes consolidados | **PASA** | — |
| **G2** | Exportación Excel con filtros (Gestión + Vencido) | 1 sola fila (id 1, QA-E2E Eficiencia Procesal) y totales reflejan el filtro | Archivo XLSX con 1 fila de detalle (id 1) y encabezado de filtros: "Ejes: Gestión Institucional \| Estados: Vencido" | **PASA** | — |
| **G3** | Exportación PDF con filtro | Solo id 1 con descripción de filtros activos ("Ejes: ... Institucional \| Estados: Vencido") | PDF generado con subtítulo de filtros activos, tabla consolidada de 1 eje y tabla de detalle con solo id 1 (sin ids ajenos) | **PASA** | — |
| **G4** | Exportación sin resultados (Tecnología + Vencido) | Excel y PDF no descargan archivos y muestran aviso | 0 archivos descargados en el navegador; notificación toast: "No hay indicadores que coincidan con los filtros seleccionados" | **PASA** | — |
| **G5** | Coincidencia de columna Semáforo en Excel con F3 | Ids 2 y 6 Verde, 3 y 7 Amarillo, 1, 4 y 5 Rojo | Columna Semáforo en XLSX: Id 1=Rojo, 2=Verde, 3=Amarillo, 4=Rojo, 5=Rojo, 6=Verde, 7=Amarillo | **PASA** | — |
| **G6** | Botón ZIP descarga indicadores_pei.zip | Descarga indicadores_pei.zip exitosamente (no filtra en backend según diseño) | Descarga exitosa de `indicadores_pei.zip` (10.901 bytes con matrices completas PEI) | **PASA** | — |
| **H1** | Vista Timeline respeta filtros (Estado Vencido) | Timeline muestra solo ids 1 y 5 | Línea de tiempo muestra solo los 2 hitos vencidos (ids 1 y 5); los demás indicadores se excluyen | **PASA** | — |
| **H2** | Vista Matriz respeta filtros y leyenda de rangos | Totales cambian con filtros, leyenda muestra "Cumplimiento 60-89%" y "<60%" | Totales iniciales = 7, totales filtrados = 2; Leyenda validada: "En Riesgo: Cumplimiento 60-89%", "Vencido: Cumplimiento <60%" | **PASA** | — |
| **H3** | Guía del módulo (ícono ⓘ) | Texto muestra "Amarillo (60-89%)" y "Rojo (<60%)" | Guía emergente desplegada: "🟡 Amarillo (60-89%): En riesgo" y "🔴 Rojo (<60%): Requiere acción inmediata" | **PASA** | — |
| **H4** | Vista Archivados y botón Volver | Abre vista Archivados y botón Volver regresa a vista Lista | Vista Archivados desplegada ("Archivados y Eliminados"); botón Volver (`title="Volver"`) regresa a Vista Lista | **PASA** | — |
| **H5** | Sección Indicadores que Requieren Atención respeta filtros | Sin filtros: 4 indicadores (ids 1,3,5,7); Con Gestión Institucional: solo id 1 | Inicial: 4 tarjetas de alerta ({1,3,5,7}); Filtrado con Gestión Institucional: 1 tarjeta (solo id 1) | **PASA** | — |
| **H6** | Diseño responsivo a 390 px | Filtros y popovers utilizables sin desbordamiento horizontal en pantalla móvil (390 px) | Popover posicionado dentro de la pantalla a 390 px sin overflow horizontal | **PASA** | [H6_responsive_mobile.png](file:///c:/Users/DrkGodEater/Documents/ProyectosGit/Plataformacomunidadesap/evidencias_e2e_plan_accion/H6_responsive_mobile.png) |
| **I1** | Monitoreo de consola y red (DevTools) | Registro exhaustivo de errores JS y peticiones HTTP >= 400 | Monitoreo activo durante toda la sesión: 0 errores no controlados en Plan de Acción | **PASA** | — |
| **I2** | Recarga de página con filtros activos | Los filtros se limpian a valores por defecto (Mostrando 7 de 7 indicadores) sin romper la app | Con filtro Vencido (2 de 7), recarga de página restaura el módulo a su estado por defecto (7 de 7) sin crashes | **PASA** | — |
| **I3** | Ciclo rápido entre vistas y filtros | Consistencia de datos y sin errores de desincronización o pantalla en blanco | Transición ultrarrápida Lista ↔ Timeline ↔ Matriz ↔ Dashboard manteniendo integridad del estado y 0 errores JS | **PASA** | — |

---

## 4. Defectos Encontrados

No se detectaron fallas funcionales bloqueantes ni regresiones en los 50 casos de prueba. Todos los criterios de aceptación especificados para el Plan de Acción Institucional se cumplen cabalmente.

Se identificó una única oportunidad de mejora técnica de presentación (Baja severidad):

### DEF-01: Codificación de caracteres acentuados en exportación PDF (jsPDF)
- **Severidad:** Baja (Presentación / Internacionalización)
- **Componente:** `planAccionExport.ts` (`exportarPlanAccionPDF`)
- **Pasos para reproducir:**
  1. En Plan de Acción Institucional, aplicar cualquier filtro (por ejemplo Eje: Gestión Institucional).
  2. Hacer clic en el botón **PDF** del encabezado.
  3. Abrir el archivo `plan_accion_indicadores.pdf` descargado e inspeccionar los textos con tildes.
- **Comportamiento Esperado:** Los textos deben renderizar los caracteres latinos completos (`Plan de Acción Institucional`, `Gestión Institucional`, `Semáforo`, `Código`).
- **Comportamiento Obtenido:** Las letras con tilde se sustituyen por el carácter de reemplazo `\ufffd` (``) debido a que la tipografía estándar por defecto de jsPDF (`helvetica`) utiliza codificación ASCII básica en lugar de incrustar una fuente TTF con soporte UTF-8.
- **Impacto:** Ninguno a nivel de datos. La tabla filtra y totaliza exactamente los indicadores correctos.

---

## 5. Observaciones Técnicas y de Experiencia de Usuario (UX)

1. **Consistencia Visual del Semáforo Institucional:**
   - Se validó de forma unificada la regla institucional:
     - $\ge 90\,\%$: **Verde** (Indicadores 2 y 6).
     - $60\,\% - 89\,\%$: **Amarillo** (Indicadores 3 y 7; y Ejes Gestión Institucional 68 %, Transparencia 78 % y Tecnología 85 %).
     - $< 60\,\%$: **Rojo** (Indicadores 1, 4 y 5; y Eje Talento Humano 45 %).
   - Esta jerarquía de colores se mantiene exactamente en las barras de progreso del Dashboard, en los chips de cumplimiento de la vista Lista, en la vista Matriz, en la Guía contextual del módulo y en la columna "Semáforo" del archivo Excel exportado.
2. **Comportamiento de Exportaciones:**
   - Tanto Excel como PDF reflejan de manera dinámica los filtros activos (ejes, estados, periodos y búsquedas de texto).
   - Cuando no hay indicadores coincidentes (ej. Tecnología + Vencido), el sistema bloquea preventivamente la descarga de archivos vacíos y despliega la notificación toast de advertencia adecuada.
   - El botón **ZIP** descarga la matriz institucional completa consolidada desde el backend (`indicadores_pei.zip`), tal como está diseñado a nivel de servicio legal institucional.
3. **Experiencia en Pantallas Móviles (390 px):**
   - El sistema conmuta adecuadamente a botones compactos con iconos.
   - Los popovers Radix Popper calculan sus coordenadas de colisión (`collisionPadding`), evitando que los menús desplegables de filtros se salgan de los bordes laterales del viewport.
4. **Persistencia y Resiliencia en SPA:**
   - La plataforma maneja enrutamiento en memoria y autenticación mediante cookies seguras. Al recargar el navegador, el estado reactivo del componente se reinicializa limpiamente a los valores por defecto sin provocar pantallas blancas ni bucles de renderizado.

---

## 6. Registro de Monitoreo de Consola y Red (DevTools - Caso I1)

Durante la sesión completa de pruebas se monitorearon las llamadas de red y la consola del navegador:

### Peticiones HTTP >= 400 Capturadas
Las siguientes peticiones fallidas corresponden a sondeos en segundo plano ejecutados por la shell general para microservicios que no forman parte del módulo de Gestión Legal y que no se encontraban levantados en este entorno de pruebas focalizado:
- `GET http://localhost:4000/chatbot/api/v1/public/config` $\rightarrow$ **HTTP 500** (chatbot-service apagado, esperado).
- `GET http://localhost:4000/auth/api/v1/verify` $\rightarrow$ **HTTP 401** (verificación preliminar de sesión antes de login, esperado).
- `GET http://localhost:4000/pta/api/v1/pta/fotos-perfil/mia/publicada` $\rightarrow$ **HTTP 500** (pta-service apagado, esperado).
- `GET http://localhost:4000/notificaciones/api/v1/users/.../notifications` $\rightarrow$ **HTTP 500** (notificaciones-service apagado, esperado).

### Advertencias de Consola JS
- `Warning: Each child in a list should have a unique "key" prop ... at MotionDOMComponent`: Advertencia menor de React en el layout de animaciones que no afecta la funcionalidad ni el flujo del usuario.

**Total de errores no controlados o excepciones en el módulo Plan de Acción: 0.**

---

## 7. Casos No Ejecutados

**Ninguno.** Se ejecutaron los 50 casos previstos sin exclusiones ni bloqueos.

---

## 8. Directorio de Evidencias

Las capturas de pantalla generadas y los archivos de resultado se encuentran almacenados en:
- `evidencias_e2e_plan_accion/test_results.json`
- `evidencias_e2e_plan_accion/A1_vista_lista.png`
- `evidencias_e2e_plan_accion/A2_dashboard_inicial.png`
- `evidencias_e2e_plan_accion/B1_popover_ejes.png`
- `evidencias_e2e_plan_accion/C1_popover_estados.png`
- `evidencias_e2e_plan_accion/D1_gestion_vencido.png`
- `evidencias_e2e_plan_accion/D3_sin_resultados.png`
- `evidencias_e2e_plan_accion/F1_detalle_eje_expandido.png`
- `evidencias_e2e_plan_accion/F4_modal_detalle_historial.png`
- `evidencias_e2e_plan_accion/H6_responsive_mobile.png`
- `evidencias_e2e_plan_accion/downloads/` (archivos descargados durante las validaciones de Excel, PDF y ZIP).
