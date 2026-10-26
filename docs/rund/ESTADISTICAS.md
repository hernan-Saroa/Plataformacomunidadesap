# Verificación de estadísticas RUND

Se conservan ocho indicadores. El contador y la gráfica de CETAP/Sedes se reemplazan por **Núcleos temáticos** y **Docentes por núcleo temático**, usando la agregación que ya entrega el servicio. Esto permite consultar las áreas de docencia, en lugar de mostrar una distribución compuesta únicamente por «Sin CETAP». Las cifras y las distribuciones usan los mismos filtros y la misma fuente del listado de docentes. El periodo del encabezado y el filtro de estadísticas están sincronizados; **Todos los periodos** conserva el criterio del listado: cuenta registros por periodo, incluyendo los que no tienen periodo registrado.

Las estadísticas se consultan sin caché al entrar en la pestaña y al cambiar filtros. Una consulta anterior no puede sobrescribir una posterior, y no se muestran cifras anteriores durante una actualización o después de un error. Los accesos al listado desde las cifras conservan el periodo y los demás filtros aplicados.

Las donas admiten una única categoría con el 100 % de los registros. Una gráfica solo se muestra si existe al menos un valor registrado: no se dibujan distribuciones formadas únicamente por «Sin dato». Cuando hay información parcial, los grupos ausentes siguen identificados y no cuentan como categorías o territoriales registrados. En núcleos temáticos, los docentes sin ese dato se indican por separado, sin convertirlos en un núcleo ficticio. Se agrupan las etiquetas temáticas repetidas con diferencias de mayúsculas o espacios, se ordenan por cantidad y se conservan todos los resultados en una lista con desplazamiento. La cuadrícula se reorganiza al ocultar gráficas y pasa a una columna cuando el ancho disponible lo requiere.

Los gráficos territoriales no recortan sus resultados a 20 grupos. Las etiquetas territoriales equivalentes se agrupan y sus filtros admiten diferencias de acentos y separadores, sin modificar IDs o perfiles almacenados. Los indicadores de horas, estado, categoría y dedicación se conservan por su utilidad para describir la capacidad y composición de los docentes.

No se deducen nombres territoriales, categorías ni formación de registros históricos que no los conservan. Una referencia territorial antigua que ya no resuelva un nombre se presenta como **Sin territorial**.

Verificaciones reproducibles:

- `node scripts/verify-rund-statistics.cjs`: SQL real de resumen y nueve distribuciones, comparación con el listado, periodos y filtros combinados. Usa tablas temporales y rollback; no modifica registros reales.
- `node scripts/verify-rund-statistics-browser.mjs`: componente y adaptador API reales con datos ficticios; comprueba indicadores, dona completa, reemplazo de CETAP, ocultación de gráficos sin información, filtros, navegación al listado, todos los periodos y periodo vacío. Revisa anchos de 360, 430, 768 y 1440 píxeles sin desbordamientos.
- `BancoDocentesPTA.stats.test.tsx`: indicadores, gráficos, respuestas tardías, recuperación ante error, refresco al entrar, opciones territoriales y ausencia de recortes.
- `ptaApi.stats.test.ts`: envío de filtros y consulta sin caché.
