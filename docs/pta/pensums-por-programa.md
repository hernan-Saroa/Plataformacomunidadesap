# Pensums por programa en el PTA

La plantilla descargable de Programas Académicos incluye `Pensum` en la segunda
hoja, `ASIGNATURAS`. El importador lee esa columna junto a `codigo_programa`.
El catálogo de asignaturas es compartido entre Programas Académicos y el PTA.

## Ajuste del selector

- El catálogo normal excluye asignaturas inactivas y eliminadas lógicamente.
  `completo=true` conserva el comportamiento de consulta histórica.
- El formulario obtiene el catálogo del programa elegido y reemplaza su copia
  general. Una respuesta general tardía no vuelve a agregar filas antiguas.
- El selector excluye filas inactivas, eliminadas o de otros programas y espera
  la respuesta del programa antes de habilitar Pensum.
- No se fija una lista de pensums por nombre de programa ni se modifican horas,
  permisos o asignaturas guardadas en PTAs históricos.

## Causa confirmada en el archivo de carga

Se revisó el archivo proporcionado `CARGA_2_PROGRAMAS_ASIGNATURAS_MATRIZ_2026_1.xlsx`
(14 programas y 492 asignaturas). En `ASIGNATURAS` aparecen dos contradicciones:

| Fila Excel | Asignatura | Pensum | Código registrado | Nombre registrado |
| --- | --- | --- | --- | --- |
| 490 | ASIG-00489 | AP_34 | PRO-001 (Diurno) | Administración Pública - Nocturno |
| 492 | ASIG-00491 | AP_36 | PRO-001 (Diurno) | Administración Pública - Nocturno |

El cargador relaciona las asignaturas mediante `codigo_programa`, no mediante su
nombre descriptivo. Por eso reimportar este mismo archivo vuelve a asociar ambos
pensums a Diurno. La referencia correcta, según `PROGRAMAS` y el nombre de esas
dos filas, es `PRO-002`.

Se preparó una copia revisable en
`out/pta/CARGA_2_PROGRAMAS_ASIGNATURAS_MATRIZ_2026_1_CORREGIDO.xlsx`.
Únicamente cambian `ASIGNATURAS!K490` y `K492`, de `PRO-001` a `PRO-002`;
las demás celdas y los demás componentes del libro se conservan. No se ha
importado esa copia ni se ha modificado la base de datos.

Con esas correcciones, el archivo contiene:

- Diurno: 54 asignaturas AP_33 y 31 AP_35.
- Nocturno: 54 asignaturas AP_34 y 30 AP_36.

## Validación preventiva del cargue

Antes de consultar o modificar la base, se comprueba si el nombre de una
asignatura identifica inequívocamente otro programa de la hoja `PROGRAMAS`.
Si contradice su código, se rechaza el archivo con la fila, código de
asignatura, pensum y ambos programas para corregirlo antes de cargar.

La comprobación normaliza tildes, espacios y mayúsculas y reconoce los alias
`nombre_corto` y `nombre_excel_origen`. No se deducen programas de alias ambiguos
ni se bloquean nombres descriptivos alternativos que no identifican otro
programa (por ejemplo, la denominación extendida de GEPUR). No hay listas fijas
de pensums por programa ni reasignaciones automáticas. La regla aplica tanto en
la vista previa como en la importación y no se omite con «Importar válidos».

El archivo original falla con exactamente los dos errores anteriores. La copia
corregida pasa la validación previa de sus 492 asignaturas sin errores ni
advertencias. Para corregir las asociaciones ya cargadas es necesario importar
el archivo corregido; desplegar la validación no cambia por sí solo esos datos.

## Diagnóstico local anterior al contraste con el archivo

La consulta de solo lectura a la base local encontró PRO-001 (Diurno) con 53
asignaturas AP_33, 30 AP_35 y una asignatura **activa** APT_52
(`ASIG-00160`, Opciones De Grado AP). PRO-002 (Nocturno) tiene 53 AP_34 y 29 AP_36.
Esos datos no reproducen exactamente la captura de QA y no deben extrapolarse
a otros ambientes. No se modificó la base de datos.

El filtro de vigencia no puede determinar que una asociación **activa** es
incorrecta si el catálogo la registra como válida. El contraste posterior con
el archivo de 492 filas permitió identificar la causa documentada arriba. La
plantilla descargable de ejemplo contiene tres asignaturas y no permite
reconstruir por sí sola esa matriz institucional.

Consulta de diagnóstico, de solo lectura:

```sql
SELECT p.codigo, p.nombre, a.pensum, a.activa,
       a.deleted_at IS NOT NULL AS eliminada, COUNT(*) AS asignaturas
FROM academic_work_plan.asignatura a
JOIN academic_work_plan.programa p ON p.id = a.id_programa
WHERE p.codigo IN ('PRO-001', 'PRO-002')
GROUP BY p.codigo, p.nombre, a.pensum, a.activa,
         a.deleted_at IS NOT NULL
ORDER BY p.codigo, a.pensum;
```

Después de la corrección del catálogo, verificar en el período y CETAP del
reporte que Diurno ofrezca AP_33 y AP_35, que Nocturno conserve sus propios
pensums y que cada Pensum muestre únicamente sus asignaturas.

## Validación técnica

- Frontend PTA: 673 pruebas aprobadas y compilación correcta.
- Microservicio PTA: 1.127 pruebas aprobadas, una omitida preexistente y compilación correcta.
- Cobertura específica de filas inactivas, separación entre programas,
  respuestas generales tardías y lectura de Programa-Pensum desde `ASIGNATURAS`.
- La nueva validación tiene pruebas de contradicciones, normalización, alias,
  nombres alternativos y rechazo antes de cualquier acceso a la base, tanto en
  vista previa como en importación con «Importar válidos».
- Se probó además el archivo original con el servicio compilado: ambos modos
  rechazan exactamente las filas 490 y 492 sin realizar consultas a la base.
- Pendiente despliegue de frontend/backend y validación funcional en QA con su catálogo real.
