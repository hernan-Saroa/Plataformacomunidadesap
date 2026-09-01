-- ============================================================================
-- EFDS-1368/1370 - Seed del catalogo academico REAL de la ESAP
--
-- ORIGEN: archivos oficiales de carga del 03/06/2026
--   03062026 - CARGA_1_TERRITORIALES_CETAPS_DATOS.xlsx
--   03062026 - CARGA_2_PROGRAMAS_ASIGNATURAS_DATOS.xlsx
-- Convertidos a CSV sin alterar valores y volcados aqui SIN recalcular nada.
--
-- No se uso la importacion de Excel del modulo de Programas Academicos porque
-- consume el .xlsx por HTTP con sesion autenticada; este seed escribe a las
-- MISMAS tablas de academic_work_plan y es reproducible en CI.
--
-- NO recalcular horas: horas_clase, horas_pta, horas_base_por_credito,
-- horas_pregrado_central y tipo_excepcion se cargan TAL CUAL. Son los insumos
-- de la Circular 003 que consume horas-pta.calculator.ts. horas_clase es 64
-- fijo en pregrado central, NO creditos x 16.
--
-- El seed 216_seed_programas_asignaturas_esap.sql queda DEPRECADO: apunta a
-- academic_work_plan.programas (plural), tabla que la migracion 326 elimino.
--
-- Idempotente: reejecutable sin duplicar.
-- ============================================================================

-- Facultades (3)
INSERT INTO academic_work_plan.facultad (codigo, nombre, activo)
SELECT 'PREGRADO', 'Pregrado', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.facultad WHERE codigo = 'PREGRADO' OR nombre = 'Pregrado');
INSERT INTO academic_work_plan.facultad (codigo, nombre, activo)
SELECT 'POSGRADO-ESP', 'Posgrado - Especializaciones', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.facultad WHERE codigo = 'POSGRADO-ESP' OR nombre = 'Posgrado - Especializaciones');
INSERT INTO academic_work_plan.facultad (codigo, nombre, activo)
SELECT 'POSGRADO-MAES', 'Posgrado - Maestrías', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.facultad WHERE codigo = 'POSGRADO-MAES' OR nombre = 'Posgrado - Maestrías');

-- Direcciones territoriales (17)
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'SC', 'SEDE_CENTRAL', 'sedecentral', 1, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'SC' OR nombre = 'SEDE_CENTRAL' OR nombre_normalizado = 'sedecentral');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-001', 'ANTIOQUIA', 'antioquia', 2, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-001' OR nombre = 'ANTIOQUIA' OR nombre_normalizado = 'antioquia');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-002', 'ATLÁNTICO', 'atlantico', 3, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-002' OR nombre = 'ATLÁNTICO' OR nombre_normalizado = 'atlantico');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-003', 'BOLÍVAR', 'bolivar', 4, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-003' OR nombre = 'BOLÍVAR' OR nombre_normalizado = 'bolivar');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-004', 'BOYACÁ', 'boyaca', 5, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-004' OR nombre = 'BOYACÁ' OR nombre_normalizado = 'boyaca');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-005', 'CALDAS', 'caldas', 6, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-005' OR nombre = 'CALDAS' OR nombre_normalizado = 'caldas');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-006', 'CAUCA', 'cauca', 7, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-006' OR nombre = 'CAUCA' OR nombre_normalizado = 'cauca');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-007', 'CHOCÓ', 'choco', 8, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-007' OR nombre = 'CHOCÓ' OR nombre_normalizado = 'choco');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-008', 'CUNDINAMARCA', 'cundinamarca', 9, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-008' OR nombre = 'CUNDINAMARCA' OR nombre_normalizado = 'cundinamarca');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-009', 'HUILA', 'huila', 10, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-009' OR nombre = 'HUILA' OR nombre_normalizado = 'huila');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-010', 'META', 'meta', 11, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-010' OR nombre = 'META' OR nombre_normalizado = 'meta');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-011', 'NARIÑO', 'narino', 12, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-011' OR nombre = 'NARIÑO' OR nombre_normalizado = 'narino');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-012', 'NORTE DE SANTANDER', 'nortedesantander', 13, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-012' OR nombre = 'NORTE DE SANTANDER' OR nombre_normalizado = 'nortedesantander');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-013', 'RISARALDA', 'risaralda', 14, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-013' OR nombre = 'RISARALDA' OR nombre_normalizado = 'risaralda');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-014', 'SANTANDER', 'santander', 15, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-014' OR nombre = 'SANTANDER' OR nombre_normalizado = 'santander');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-015', 'TOLIMA', 'tolima', 16, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-015' OR nombre = 'TOLIMA' OR nombre_normalizado = 'tolima');
INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, orden_visualizacion, activo)
SELECT 'DT-016', 'VALLE', 'valle', 17, TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.direccion_territorial WHERE codigo = 'DT-016' OR nombre = 'VALLE' OR nombre_normalizado = 'valle');

-- Ubicacion semestral (16): dos familias, pregrado ordinal y posgrado romano.
-- El id NO se fija a mano: la columna tiene secuencia y hardcodearlo colisiona
-- con las filas que ya existan. Se guarda por codigo Y etiqueta, ambos UNIQUE.
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'POS_1', 'Semestre I', 'posgrado', 1 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'POS_1' OR etiqueta = 'Semestre I');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'POS_2', 'Semestre II', 'posgrado', 2 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'POS_2' OR etiqueta = 'Semestre II');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'POS_3', 'Semestre III', 'posgrado', 3 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'POS_3' OR etiqueta = 'Semestre III');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'POS_4', 'Semestre IV', 'posgrado', 4 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'POS_4' OR etiqueta = 'Semestre IV');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_1', 'Primer semestre', 'pregrado', 1 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_1' OR etiqueta = 'Primer semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_2', 'Segundo semestre', 'pregrado', 2 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_2' OR etiqueta = 'Segundo semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_3', 'Tercer semestre', 'pregrado', 3 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_3' OR etiqueta = 'Tercer semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_4', 'Cuarto semestre', 'pregrado', 4 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_4' OR etiqueta = 'Cuarto semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_5', 'Quinto semestre', 'pregrado', 5 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_5' OR etiqueta = 'Quinto semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_6', 'Sexto semestre', 'pregrado', 6 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_6' OR etiqueta = 'Sexto semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_7', 'Séptimo semestre', 'pregrado', 7 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_7' OR etiqueta = 'Séptimo semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_8', 'Octavo semestre', 'pregrado', 8 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_8' OR etiqueta = 'Octavo semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_9', 'Noveno semestre', 'pregrado', 9 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_9' OR etiqueta = 'Noveno semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_10', 'Décimo semestre', 'pregrado', 10 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_10' OR etiqueta = 'Décimo semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_11', 'Onceavo semestre', 'pregrado', 11 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_11' OR etiqueta = 'Onceavo semestre');
INSERT INTO academic_work_plan.ubicacion_semestral (codigo, etiqueta, tipo_programa, orden)
SELECT 'PRE_12', 'Doceavo semestre', 'pregrado', 12 WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.ubicacion_semestral WHERE codigo = 'PRE_12' OR etiqueta = 'Doceavo semestre');

-- Programas academicos (14)
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-001', 'Administración Pública - Diurno', 'AP_Diurno', 'AP_Diurno', f.id, 'pregrado', 'presencial', 16, 64, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-002', 'Administración Pública - Nocturno', 'AP_Nocturno', 'AP_Nocturno', f.id, 'pregrado', 'presencial', 16, 64, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-003', 'Administración Pública Territorial', 'APT', 'APT', f.id, 'pregrado', 'distancia', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-004', 'Economía Pública', 'Economía_Pública', 'ECONOMIA_PUB', f.id, 'pregrado', 'presencial', 16, 64, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-005', 'Alta Dirección del Estado', 'Alta_Dirección_Del_Estado_ESP', 'Alta_Direccion_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-006', 'Derechos Humanos', 'Derechos_Humanos_ESP', 'DDHH_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-007', 'Finanzas Públicas', 'Finanzas_Públicas_ESP', 'FinPub_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-008', 'Gestión Pública Urbana y Regional', 'GEPUR_ESP', 'GEPUR_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-009', 'Gerencia Social', 'Gerencia_Social_ESP', 'GerSoc_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-010', 'Gestión Pública', 'Gestión_Pública_ESP', 'GesPub_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-011', 'Proyectos de Desarrollo', 'Proyectos_de_Desarrollo_ESP', 'ProyDes_ESP', f.id, 'especializacion', 'presencial', 16, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-012', 'Maestría DDHH y Posconflicto', 'Maestria_DDHH_y_Posconflicto', 'Maestria_DDHH', f.id, 'maestria', 'presencial', 12, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-013', 'Maestría Administración Pública - Distancia', 'Maestria_AdministraciónPública_DISTANCIA', 'Maestria_AP_Dist', f.id, 'maestria', 'distancia', 12, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo)
SELECT 'PRO-014', 'Maestría Administración Pública - Presencial', 'Maestria_AdministraciónPública_PRESENCIAL', 'Maestria_AP_Pres', f.id, 'maestria', 'presencial', 12, NULL, TRUE
FROM academic_work_plan.facultad f WHERE f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;

-- Nucleos tematicos (33), derivados de las asignaturas.
-- UNIQUE en codigo Y nombre: en un entorno ya cargado los codigos difieren pero
-- los nombres coinciden, asi que se guarda por ambos.
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-001', 'Nuevo Plan de Estudios AP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-001' OR nombre = 'Nuevo Plan de Estudios AP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-002', 'Estado Y Poder', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-002' OR nombre = 'Estado Y Poder');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-003', 'Idioma Extranjero', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-003' OR nombre = 'Idioma Extranjero');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-004', 'Fundamentación Cuantitativa', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-004' OR nombre = 'Fundamentación Cuantitativa');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-005', 'Problemática Pública', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-005' OR nombre = 'Problemática Pública');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-006', 'Economía Pública', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-006' OR nombre = 'Economía Pública');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-007', 'Desarrollo Y Gestión Territorial', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-007' OR nombre = 'Desarrollo Y Gestión Territorial');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-008', 'Organizaciones Públicas Y Gestión', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-008' OR nombre = 'Organizaciones Públicas Y Gestión');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-009', 'Electivas Generales', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-009' OR nombre = 'Electivas Generales');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-010', 'Ciclo De Formación Específica', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-010' OR nombre = 'Ciclo De Formación Específica');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-011', 'Formación General', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-011' OR nombre = 'Formación General');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-012', 'Complementaria', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-012' OR nombre = 'Complementaria');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-013', 'Nuevo Plan de Estudios APT', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-013' OR nombre = 'Nuevo Plan de Estudios APT');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-014', 'Problemática Del  Estado Y Del Poder', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-014' OR nombre = 'Problemática Del  Estado Y Del Poder');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-015', 'Estado, Gobierno y Sociedad', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-015' OR nombre = 'Estado, Gobierno y Sociedad');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-016', 'Economía De Lo Público', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-016' OR nombre = 'Economía De Lo Público');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-017', 'Organizaciones Públicas', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-017' OR nombre = 'Organizaciones Públicas');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-018', 'Espacio,  Tiempo Y  Territorio', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-018' OR nombre = 'Espacio,  Tiempo Y  Territorio');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-019', 'Gestión Del Desarrollo', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-019' OR nombre = 'Gestión Del Desarrollo');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-020', 'Cuantitativa', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-020' OR nombre = 'Cuantitativa');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-021', 'Formación integral Y de contexto', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-021' OR nombre = 'Formación integral Y de contexto');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-022', 'Teoría Económica e Historia', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-022' OR nombre = 'Teoría Económica e Historia');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-023', 'Alta Dirección del Estado - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-023' OR nombre = 'Alta Dirección del Estado - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-024', 'Derechos Humanos - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-024' OR nombre = 'Derechos Humanos - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-025', 'Finanzas Públicas - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-025' OR nombre = 'Finanzas Públicas - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-026', 'Gestión del Conocimiento', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-026' OR nombre = 'Gestión del Conocimiento');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-027', 'GEPUR - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-027' OR nombre = 'GEPUR - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-028', 'Gerencia Social - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-028' OR nombre = 'Gerencia Social - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-029', 'Gestión Pública - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-029' OR nombre = 'Gestión Pública - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-030', 'Proyectos de Desarrollo - ESP', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-030' OR nombre = 'Proyectos de Desarrollo - ESP');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-031', 'Maestria DDHH y Posconflicto', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-031' OR nombre = 'Maestria DDHH y Posconflicto');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-032', 'Maestria Administración Pública - DISTANCIA', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-032' OR nombre = 'Maestria Administración Pública - DISTANCIA');
INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo)
SELECT 'NT-033', 'Maestria Administración Pública - PRESENCIAL', TRUE WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan.nucleo_tematico WHERE codigo = 'NT-033' OR nombre = 'Maestria Administración Pública - PRESENCIAL');

-- Asignaturas (427): codigos unicos, entran sin conflicto
-- contra el NOT NULL UNIQUE que ya existe desde la migracion 326.
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00001', 'Constitución Del Territorio (AP_día)', 'Constitución Del Territorio', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00003', 'Fundamentos De Economía Pública (AP_día)', 'Fundamentos De Economía Pública', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00005', 'Fundamentos Sociológicos (AP_día)', 'Fundamentos Sociológicos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00032', 'Historia Del Pensamiento Político (AP_día)', 'Historia Del Pensamiento Político', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00010', 'Idioma I (AP_día)', 'Idioma I', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00037', 'Matemáticas I (AP_día)', 'Matemáticas I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00014', 'Matemáticas Lúdicas (AP_día)', 'Matemáticas Lúdicas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00016', 'Pensamiento Administrativo Público I (AP_día)', 'Pensamiento Administrativo Público I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00018', 'Pensamiento Económico (AP_día)', 'Pensamiento Económico', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00020', 'Pensamiento Sociológico (AP_día)', 'Pensamiento Sociológico', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00021', 'Sistemas Informáticos (AP_día)', 'Sistemas Informáticos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00023', 'Taller de Lectoescritura (AP_día)', 'Taller de Lectoescritura', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00025', 'Cultura Y Desarrollo Humano (AP_día)', 'Cultura Y Desarrollo Humano', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00026', 'Derecho Constitucional (AP_día)', 'Derecho Constitucional', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00028', 'Economia Pública I (AP_día)', 'Economia Pública I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00030', 'Electiva I (AP_día)', 'Electiva I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00008', 'Historia Del Pensamiento Político (AP_día)', 'Historia Del Pensamiento Político', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00033', 'Idioma II (AP_día)', 'Idioma II', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00035', 'Macroeconomía y Política Económica (AP_día)', 'Macroeconomía y Política Económica', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00013', 'Matemáticas I (AP_día)', 'Matemáticas I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00039', 'Matemáticas II (AP_día)', 'Matemáticas II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00041', 'Organización Estatal Colombiana (AP_día)', 'Organización Estatal Colombiana', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00043', 'Pensamiento Administrativo Público II (AP_día)', 'Pensamiento Administrativo Público II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00046', 'Teorías Y Problemas Contemporáneos Del Poder Estado Y El Gobierno (AP_día)', 'Teorías Y Problemas Contemporáneos Del Poder Estado Y El Gobierno', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00060', 'Demografía (AP_día)', 'Demografía', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00047', 'Derecho Público I (AP_día)', 'Derecho Público I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00048', 'Economia Pública II (AP_día)', 'Economia Pública II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00050', 'Estadística I (AP_día)', 'Estadística I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00058', 'Finanzas y análisis financiero público (AP_día)', 'Finanzas y análisis financiero público', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00052', 'Formas Asociativas Contemporáneos Del Poder, El Estado Y El Gobierno (AP_día)', 'Formas Asociativas Contemporáneos Del Poder, El Estado Y El Gobierno', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00053', 'Fundamentos De Problematización Sobre Lo Público (AP_día)', 'Fundamentos De Problematización Sobre Lo Público', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00055', 'Idioma III (AP_día)', 'Idioma III', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00062', 'Matemáticas II (AP_día)', 'Matemáticas II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00061', 'Pensamientos y teorías de la administración pública (AP_día)', 'Pensamientos y teorías de la administración pública', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00059', 'Teorías del Estado y regímenes políticos (AP_día)', 'Teorías del Estado y regímenes políticos', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00069', 'Derecho Público II (AP_día)', 'Derecho Público II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00070', 'Estadística II (AP_día)', 'Estadística II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00073', 'Historia Social Y Política De La Administración Pública Colombiana I (AP_día)', 'Historia Social Y Política De La Administración Pública Colombiana I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00006', 'Historia de la administración pública  (AP_día)', 'Historia de la administración pública', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00075', 'Idioma IV (AP_día)', 'Idioma IV', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00077', 'Política Económica Y Social (AP_día)', 'Política Económica Y Social', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00078', 'Problemas Enfoques Del Desarrollo (AP_día)', 'Problemas Enfoques Del Desarrollo', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00079', 'Teoría De Las Organizaciones (AP_día)', 'Teoría De Las Organizaciones', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00083', 'Derecho Público III (AP_día)', 'Derecho Público III', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00084', 'Electiva General I (AP_día)', 'Electiva General I', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Electivas Generales' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00086', 'Finanzas Públicas (AP_día)', 'Finanzas Públicas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00087', 'Historia Social Y Política De La Administración Pública Colombiana II (AP_día)', 'Historia Social Y Política De La Administración Pública Colombiana II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00089', 'Organzaciones Públicas Y Análisis Organizacional (AP_día)', 'Organzaciones Públicas Y Análisis Organizacional', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00090', 'Políticas Ambientales Y Desarrollo En Colombia (AP_día)', 'Políticas Ambientales Y Desarrollo En Colombia', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00091', 'Relaciones Políticas Y Económicas Globales E Internacionales (AP_día)', 'Relaciones Políticas Y Económicas Globales E Internacionales', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00092', 'Control De La Gestión Pública (AP_día)', 'Control De La Gestión Pública', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00094', 'Electiva General II (AP_día)', 'Electiva General II', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Electivas Generales' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00096', 'Organización Pública Colombiana (AP_día)', 'Organización Pública Colombiana', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00098', 'Políticas Públicas (AP_día)', 'Políticas Públicas', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00099', 'Presupuestos Públicos (AP_día)', 'Presupuestos Públicos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00100', 'Problemática Pública Colombiana Contemporánea (AP_día)', 'Problemática Pública Colombiana Contemporánea', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00103', 'Análisis Financiero Público (AP_día)', 'Análisis Financiero Público', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00104', 'Derechos Humanos Y Negociación De Conflictos (AP_día)', 'Derechos Humanos Y Negociación De Conflictos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00107', 'Gestión Del Personal En Organizaciones Públicas (AP_día)', 'Gestión Del Personal En Organizaciones Públicas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00108', 'Planeación I (AP_día)', 'Planeación I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00111', 'Proyectos De Desarrollo (AP_día)', 'Proyectos De Desarrollo', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00112', 'Relaciones Nacionales Intergubernamentales En Colombia (AP_día)', 'Relaciones Nacionales Intergubernamentales En Colombia', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00115', 'Función Pública Colombiana Y Comparada (AP_día)', 'Función Pública Colombiana Y Comparada', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00116', 'Gerencia Pública Integral (AP_día)', 'Gerencia Pública Integral', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00117', 'Gestión De Grupos Y Redes (AP_día)', 'Gestión De Grupos Y Redes', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00118', 'Gestión De Servicios Públicos (AP_día)', 'Gestión De Servicios Públicos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00119', 'Gestión Del Territorio Colombiano (AP_día)', 'Gestión Del Territorio Colombiano', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00121', 'Planeación II (AP_día)', 'Planeación II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00126', 'Electiva De Énfasis I (AP_día)', 'Electiva De Énfasis I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00127', 'Electiva De Énfasis II (AP_día)', 'Electiva De Énfasis II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00132', 'Seminario De Énfasis (AP_día)', 'Seminario De Énfasis', 10, 128, 384, us.id, pr.id, nt.id, f.id, 'presencial_dia', 'seminario_enfasis', 384, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00134', 'Seminario El Oficio Del Consultor (AP_día)', 'Seminario El Oficio Del Consultor', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00133', 'Seminario de Investigación (AP_día)', 'Seminario de Investigación', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_dia', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00139', 'Opciones De Grado AP', 'Opciones De Grado AP', 13, NULL, 20, us.id, pr.id, nt.id, f.id, 'sin_definir', 'opciones_grado_ap', 20, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-001' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00002', 'Construcción Del Territorio (AP_noche)', 'Construcción Del Territorio', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00004', 'Fundamentos De Economía Pública (AP_noche)', 'Fundamentos De Economía Pública', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00009', 'Historia Del Pensamiento Político (AP_noche)', 'Historia Del Pensamiento Político', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00011', 'Idioma I (AP_noche)', 'Idioma I', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00012', 'Matemática I (AP_noche)', 'Matemática I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00015', 'Matemáticas Lúdicas (AP_noche)', 'Matemáticas Lúdicas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00017', 'Pensamiento Administrativo Público I (AP_noche)', 'Pensamiento Administrativo Público I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00019', 'Pensamiento Económico (AP_noche)', 'Pensamiento Económico', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00022', 'Sistemas Informáticos (AP_noche)', 'Sistemas Informáticos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00024', 'Taller de Lectoescritura (AP_noche)', 'Taller de Lectoescritura', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00027', 'Derecho Constitucional (AP_noche)', 'Derecho Constitucional', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00029', 'Economia Pública I (AP_noche)', 'Economia Pública I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00031', 'Fundamentos Sociológicos (AP_noche)', 'Fundamentos Sociológicos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00034', 'Idioma II (AP_noche)', 'Idioma II', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00036', 'Macroeconomía y Política Económica (AP_noche)', 'Macroeconomía y Política Económica', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00038', 'Matemáticas I (AP_noche)', 'Matemáticas I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00040', 'Matemáticas II (AP_noche)', 'Matemáticas II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00042', 'Organización Estatal Colombiana (AP_noche)', 'Organización Estatal Colombiana', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00044', 'Pensamiento Administrativo Público II (AP_noche)', 'Pensamiento Administrativo Público II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00045', 'Pensamiento Sociológico (AP_noche)', 'Pensamiento Sociológico', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00049', 'Economia Pública II (AP_noche)', 'Economia Pública II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00065', 'Electiva I (AP_noche) Nuevo Plan de Estudios', 'Electiva I (AP_noche) Nuevo Plan de Estudios', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00051', 'Estadística I (AP_noche)', 'Estadística I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00063', 'Finanzas y análisis financiero público (AP_noche)', 'Finanzas y análisis financiero público', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00054', 'Fundamentos De Problematización Sobre Lo Público (AP_noche)', 'Fundamentos De Problematización Sobre Lo Público', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00064', 'Historia del pensamiento político (AP_noche) Nuevo Plan de Estudios', 'Historia del pensamiento político (AP_noche) Nuevo Plan de Estudios', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00056', 'Idioma III (AP_noche)', 'Idioma III', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00067', 'Matemáticas II (AP_noche) Nuevo Plan de Estudios', 'Matemáticas II (AP_noche) Nuevo Plan de Estudios', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00066', 'Pensamientos y teorías de la administración pública (AP_noche)', 'Pensamientos y teorías de la administración pública', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00057', 'Teorías Y Problemas Contemporáneos Del Poder Estado Y El Gobierno (AP_noche)', 'Teorías Y Problemas Contemporáneos Del Poder Estado Y El Gobierno', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00068', 'Derecho Público I (AP_noche)', 'Derecho Público I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00071', 'Estadística II (AP_noche)', 'Estadística II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Fundamentación Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00072', 'Formas Asociativas Contemporáneos Del Poder, El Estado Y El Gobierno (AP_noche)', 'Formas Asociativas Contemporáneos Del Poder, El Estado Y El Gobierno', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00074', 'Historia Social Y Política De La Administración Pública Colombiana I (AP_noche)', 'Historia Social Y Política De La Administración Pública Colombiana I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00076', 'Idioma IV (AP_noche)', 'Idioma IV', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Idioma Extranjero' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00080', 'Control De La Gestión Pública (AP_noche)', 'Control De La Gestión Pública', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00081', 'Cultura Y Desarrollo Humano (AP_noche)', 'Cultura Y Desarrollo Humano', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00082', 'Derecho Público II (AP_noche)', 'Derecho Público II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00085', 'Electiva General I (AP_noche)', 'Electiva General I', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Electivas Generales' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00088', 'Historia Social Y Política De La Administración Pública Colombiana II (AP_noche)', 'Historia Social Y Política De La Administración Pública Colombiana II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00093', 'Derecho Público III (AP_noche)', 'Derecho Público III', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00095', 'Gestión De Grupos Y Redes (AP_noche)', 'Gestión De Grupos Y Redes', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00007', 'Historia de la administración pública  (AP_noche)', 'Historia de la administración pública', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Nuevo Plan de Estudios AP' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00097', 'Política Económica Y Social (AP_noche)', 'Política Económica Y Social', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00101', 'Problemática Pública Colombiana Contemporánea (AP_noche)', 'Problemática Pública Colombiana Contemporánea', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00102', 'Relaciones Políticas Y Económicas Globales E Internacionales (AP_noche)', 'Relaciones Políticas Y Económicas Globales E Internacionales', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00105', 'Electiva General II (AP_noche)', 'Electiva General II', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Electivas Generales' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00106', 'Finanzas Públicas (AP_noche)', 'Finanzas Públicas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00109', 'Políticas Públicas (AP_noche)', 'Políticas Públicas', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00110', 'Problemas Enfoques Del Desarrollo (AP_noche)', 'Problemas Enfoques Del Desarrollo', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00113', 'Teoría De Las Organizaciones (AP_noche)', 'Teoría De Las Organizaciones', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00114', 'Derechos Humanos Y Negociación De Conflictos (AP_noche)', 'Derechos Humanos Y Negociación De Conflictos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00120', 'Organzaciones Públicas Y Análisis Organizacional (AP_noche)', 'Organzaciones Públicas Y Análisis Organizacional', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00122', 'Políticas Ambientales Y Desarrollo En Colombia (AP_noche)', 'Políticas Ambientales Y Desarrollo En Colombia', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00123', 'Presupuestos Públicos (AP_noche)', 'Presupuestos Públicos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00124', 'Relaciones Nacionales Intergubernamentales En Colombia (AP_noche)', 'Relaciones Nacionales Intergubernamentales En Colombia', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Estado Y Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00125', 'Análisis Financiero Público (AP_noche)', 'Análisis Financiero Público', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00128', 'Función Pública Colombiana Y Comparada (AP_noche)', 'Función Pública Colombiana Y Comparada', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00129', 'Organización Pública Colombiana (AP_noche)', 'Organización Pública Colombiana', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00130', 'Planeación Pública I (AP_noche)', 'Planeación Pública I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00131', 'Proyectos De Desarrollo (AP_noche)', 'Proyectos De Desarrollo', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00135', 'Gerencia Pública Integral (AP_noche)', 'Gerencia Pública Integral', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00136', 'Gestión De Servicios Públicos (AP_noche)', 'Gestión De Servicios Públicos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00137', 'Gestión Del Personal En Organizaciones Públicas (AP_noche)', 'Gestión Del Personal En Organizaciones Públicas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Organizaciones Públicas Y Gestión' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00138', 'Gestión Del Territorio Colombiano (AP_noche)', 'Gestión Del Territorio Colombiano', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Desarrollo Y Gestión Territorial' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00427', 'Opciones De Grado AP', 'Opciones De Grado AP', 13, NULL, 20, us.id, pr.id, nt.id, f.id, 'sin_definir', 'opciones_grado_ap', 20, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00140', 'Planeación Pública II (AP_noche)', 'Planeación Pública II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00141', 'Electiva De Énfasis I (AP_noche)', 'Electiva De Énfasis I', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Onceavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00142', 'Electiva De Énfasis II (AP_noche)', 'Electiva De Énfasis II', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Onceavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00143', 'Seminario De Énfasis (AP_noche)', 'Seminario De Énfasis', 10, 128, 384, us.id, pr.id, nt.id, f.id, 'presencial_noche', 'seminario_enfasis', 384, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Onceavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00145', 'Seminario El Oficio Del Consultor (AP_noche)', 'Seminario El Oficio Del Consultor', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Doceavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00144', 'Seminario de Investigación (AP_noche)', 'Seminario de Investigación', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'presencial_noche', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Doceavo semestre' AND pr.codigo = 'PRO-002' AND nt.nombre = 'Ciclo De Formación Específica' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00161', 'Construcción Del Conocimiento', 'Construcción Del Conocimiento', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00163', 'Electiva I', 'Electiva I', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Complementaria' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00158', 'Escuelas Filosoficas Y Cambios Paradigmaticos  I', 'Escuelas Filosoficas Y Cambios Paradigmaticos  I', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00146', 'Fundamentos de economía pública', 'Fundamentos de economía pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00147', 'Fundamentos del Estado y el poder', 'Fundamentos del Estado y el poder', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00148', 'Fundamentos sociológicos', 'Fundamentos sociológicos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00149', 'Geografía física y ambiental', 'Geografía física y ambiental', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00150', 'Historia de la administración pública', 'Historia de la administración pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00151', 'Matemática I', 'Matemática I', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00162', 'Matemática I', 'Matemática I', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00160', 'Regimen Y Sistema Político', 'Regimen Y Sistema Político', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00159', 'Teoría Del Estado y Del Poder', 'Teoría Del Estado y Del Poder', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Estado, Gobierno y Sociedad' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00164', 'Electiva II', 'Electiva II', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00165', 'Escuelas Filosoficas Y Cambios Paradigmaticos  II', 'Escuelas Filosoficas Y Cambios Paradigmaticos  II', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00166', 'Fundamento En Ciencias Sociales', 'Fundamento En Ciencias Sociales', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00152', 'Geografía económica y social', 'Geografía económica y social', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00167', 'Matemática II', 'Matemática II', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00153', 'Matemáticas II', 'Matemáticas II', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00154', 'Micro y macroeconomía', 'Micro y macroeconomía', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00168', 'Pensamiento Económico', 'Pensamiento Económico', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00155', 'Pensamientos y teorías de la administración pública', 'Pensamientos y teorías de la administración pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00169', 'Regimen Y Sistemas Políticos Latinoamericanos', 'Regimen Y Sistemas Políticos Latinoamericanos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00156', 'Regímenes y sistemas políticos', 'Regímenes y sistemas políticos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00157', 'Socialización y cultura', 'Socialización y cultura', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00178', 'Actores sociales y diferencia identitaria', 'Actores sociales y diferencia identitaria', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00177', 'Derecho constitucional', 'Derecho constitucional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00170', 'Economia De Lo Publico I', 'Economia De Lo Publico I', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00171', 'Electiva III', 'Electiva III', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00172', 'Estadistica I', 'Estadistica I', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00180', 'Estadística I', 'Estadística I', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00179', 'Finanzas y análisis financiero público', 'Finanzas y análisis financiero público', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00173', 'Introduccon A La Problmematica Pública', 'Introduccon A La Problmematica Pública', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00181', 'Metodología de investigación', 'Metodología de investigación', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00174', 'Pensamiento Administrativo Y Organizaciones Publicas I', 'Pensamiento Administrativo Y Organizaciones Publicas I', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00175', 'Regimen Y Sistema Político Colombiano I', 'Regimen Y Sistema Político Colombiano I', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00176', 'Teorías de las organizaciones públicas', 'Teorías de las organizaciones públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Nuevo Plan de Estudios APT' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00182', 'Derecho Constitucional', 'Derecho Constitucional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00183', 'Economia De Lo Publico II', 'Economia De Lo Publico II', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00184', 'Estadística II', 'Estadística II', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00185', 'Pensamiento Administrativo Público', 'Pensamiento Administrativo Público', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00186', 'Pensamiento Administrativo Y Organizaciones Publicas II', 'Pensamiento Administrativo Y Organizaciones Publicas II', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00187', 'Regimen Y Sistema Político Colombiano II', 'Regimen Y Sistema Político Colombiano II', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00188', 'Derecho Administrativo', 'Derecho Administrativo', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00189', 'Gestion De Las Organizaciones Publicas', 'Gestion De Las Organizaciones Publicas', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00190', 'Matematica Financiera', 'Matematica Financiera', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00191', 'Organización Del Estado Colombiano Y Formas Asociativas Del Estado A Nivel Territorial', 'Organización Del Estado Colombiano Y Formas Asociativas Del Estado A Nivel Territorial', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00192', 'Política Económica', 'Política Económica', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00193', 'Teorias Del Enfoque Espacio Tiempo', 'Teorias Del Enfoque Espacio Tiempo', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00194', 'Contabilidad Gubernamental', 'Contabilidad Gubernamental', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00195', 'Globalización, Geoestrategia Y Relaciones Internacionales', 'Globalización, Geoestrategia Y Relaciones Internacionales', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00196', 'Gobierno Y Politica Publica', 'Gobierno Y Politica Publica', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00197', 'Proyecto Futuro I', 'Proyecto Futuro I', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00198', 'Regimen Del Servidor Público', 'Regimen Del Servidor Público', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00199', 'Teorias Y Enfoques Del Desarrollo', 'Teorias Y Enfoques Del Desarrollo', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Gestión Del Desarrollo' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00200', 'Finanzas Públicas', 'Finanzas Públicas', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00201', 'Gerencias De Los Recursos Fisicos Y Financieros', 'Gerencias De Los Recursos Fisicos Y Financieros', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00202', 'Política Pública Territorial', 'Política Pública Territorial', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Del  Estado Y Del Poder' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00203', 'Problemática Publica Colombiana', 'Problemática Publica Colombiana', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Problemática Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00204', 'Proyecto Futuro II', 'Proyecto Futuro II', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00205', 'Teoria Y Enfoque Del Desarrollo Territorial', 'Teoria Y Enfoque Del Desarrollo Territorial', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Gestión Del Desarrollo' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00206', 'Electiva IV', 'Electiva IV', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00207', 'Gerencia Del Talento Humano', 'Gerencia Del Talento Humano', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00208', 'Planeación Del Desarrollo', 'Planeación Del Desarrollo', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Gestión Del Desarrollo' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00209', 'Presupuesto Público', 'Presupuesto Público', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00210', 'Proyecto Futuro III', 'Proyecto Futuro III', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00211', 'Tecnicas Del Proyecto Geopolitico', 'Tecnicas Del Proyecto Geopolitico', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00212', 'Electiva V', 'Electiva V', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00213', 'Gerencia Pública Integral', 'Gerencia Pública Integral', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Organizaciones Públicas' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00214', 'Gestion Para El Desarrollo', 'Gestion Para El Desarrollo', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Gestión Del Desarrollo' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00215', 'Procesos Económicos Territoriales', 'Procesos Económicos Territoriales', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Economía De Lo Público' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00216', 'Proyecto Futuro IV', 'Proyecto Futuro IV', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Espacio,  Tiempo Y  Territorio' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00217', 'Proyectos De Desarrollo', 'Proyectos De Desarrollo', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Gestión Del Desarrollo' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00218', 'Seminario De Opciones De Grado APT', 'Seminario De Opciones De Grado APT', 13, NULL, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', 'seminario_opciones_apt', 144, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00219', 'Seminario De Profundización', 'Seminario De Profundización', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00220', 'Seminario Electivo I', 'Seminario Electivo I', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00221', 'Seminario Electivo II', 'Seminario Electivo II', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Décimo semestre' AND pr.codigo = 'PRO-003' AND nt.nombre = 'Formación General' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00222', 'Calculo Diferencial', 'Calculo Diferencial', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00223', 'Español y construcción textos en Economía', 'Español y construcción textos en Economía', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Formación integral Y de contexto' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00224', 'Fundamentos Administración Pública.', 'Fundamentos Administración Pública.', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00225', 'Historia Económica General', 'Historia Económica General', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00226', 'Introducción a la Economía Colombiana', 'Introducción a la Economía Colombiana', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00227', 'Introducción a la Microeconomía', 'Introducción a la Microeconomía', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Primer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00228', 'Algebra Lineal y Cálculo', 'Algebra Lineal y Cálculo', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00229', 'Calculo Integral - Probabilidad', 'Calculo Integral - Probabilidad', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00230', 'Constitución y Democracia', 'Constitución y Democracia', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Formación integral Y de contexto' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00231', 'Fundamentos de Contabilidad', 'Fundamentos de Contabilidad', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Formación integral Y de contexto' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00232', 'Historia del Pensamiento Económico', 'Historia del Pensamiento Económico', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00233', 'Política, Estado y Gobierno', 'Política, Estado y Gobierno', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Segundo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Formación integral Y de contexto' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00234', 'Derecho Administrativo', 'Derecho Administrativo', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Formación integral Y de contexto' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00235', 'Estadística (Economía)', 'Estadística', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00236', 'Introducción a la Macroeconomía', 'Introducción a la Macroeconomía', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00238', 'Microeconomía 2', 'Microeconomía 2', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00237', 'Métodos Matemáticos para Economistas', 'Métodos Matemáticos para Economistas', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Tercer semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00239', 'Curso Electivo 1', 'Curso Electivo 1', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Formación integral Y de contexto' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00240', 'Econometría 1', 'Econometría 1', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00241', 'Laboratorio de Excel, Stata, SPSS, Matlab, R, SAS', 'Laboratorio de Excel, Stata, SPSS, Matlab, R, SAS', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00242', 'Macroeconomía 2', 'Macroeconomía 2', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00243', 'Microeconomía 3', 'Microeconomía 3', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Cuarto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00244', 'Econometría 2', 'Econometría 2', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00246', 'Historia Económica de Colombia', 'Historia Económica de Colombia', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00245', 'Historia del Análisis Económico', 'Historia del Análisis Económico', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00247', 'Macroeconomía 3', 'Macroeconomía 3', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Teoría Económica e Historia' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00248', 'Teoría de Juegos', 'Teoría de Juegos', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Quinto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Cuantitativa' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00249', 'Bienes Públicos, Servicios Públicos y Regulación', 'Bienes Públicos, Servicios Públicos y Regulación', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00250', 'Contabilidad
Gubernamental', 'Contabilidad
Gubernamental', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00251', 'Curso electivo 2', 'Curso electivo 2', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00252', 'Economía Política', 'Economía Política', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00253', 'Fundamentos Economía Pública', 'Fundamentos Economía Pública', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Sexto semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00255', 'Desarrollo Económico y Regional', 'Desarrollo Económico y Regional', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00254', 'Déficit fiscal y
deuda pública', 'Déficit fiscal y
deuda pública', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00256', 'Economía Ambiental y Desarrollo Sostenible', 'Economía Ambiental y Desarrollo Sostenible', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00257', 'Gasto Público y GPS (nacional, territorial y Organizaciones Públicas)', 'Gasto Público y GPS', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00258', 'Gestión y Gerencia Pública.', 'Gestión y Gerencia Pública.', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00259', 'Ingresos Públicos (y Tributación) (Nacional, territorial', 'Ingresos Públicos (y Tributación) (Nacional, territorial', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Séptimo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00260', 'Contratación pública', 'Contratación pública', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00261', 'Curso Electivo 3', 'Curso Electivo 3', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00262', 'Formulación y Evaluación Económica y Social de Proyectos', 'Formulación y Evaluación Económica y Social de Proyectos', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00263', 'Gestión Financiera pública.', 'Gestión Financiera pública.', 2, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00264', 'Política Económica y Social', 'Política Económica y Social', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00265', 'Presupuesto Público (Nacional, Territorial.', 'Presupuesto Público (Nacional, Territorial.', 3, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Octavo semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00266', 'Opción de Grado', 'Opción de Grado', 10, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Noveno semestre' AND pr.codigo = 'PRO-004' AND nt.nombre = 'Economía Pública' AND f.codigo = 'PREGRADO'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00328', 'Enfoque de Toma de decisiones', 'Enfoque de Toma de decisiones', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00329', 'La politica de las Politicas Públicas', 'La politica de las Politicas Públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00330', 'Priorización y manejo de la agenda', 'Priorización y manejo de la agenda', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00331', 'Teorías de crisis', 'Teorías de crisis', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00332', 'Control del manejo de agenda', 'Control del manejo de agenda', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00333', 'Control político de las Politicas Públicas', 'Control político de las Politicas Públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00334', 'Manejo de crísis: análisis de casos', 'Manejo de crísis: análisis de casos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00335', 'Toma de decisiones en entornos críticos', 'Toma de decisiones en entornos críticos', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-005' AND nt.nombre = 'Alta Dirección del Estado - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00336', 'Análisis de casos I y II', 'Análisis de casos I y II', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00338', 'Derecho Internacional Humanitario', 'Derecho Internacional Humanitario', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00337', 'Derecho Internacional de los Derechos Humanos', 'Derecho Internacional de los Derechos Humanos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00339', 'Enfoques sobre lo público', 'Enfoques sobre lo público', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00340', 'Organización Estatal', 'Organización Estatal', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00341', 'Pensamiento Administrativo', 'Pensamiento Administrativo', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00342', 'Políticas Públicas de los Derechos Humanos', 'Políticas Públicas de los Derechos Humanos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00343', 'Visión Histórica y Filosófica de los Derechos Humanos', 'Visión Histórica y Filosófica de los Derechos Humanos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00344', 'Analisis jurisprudencia en derechos humanos', 'Analisis jurisprudencia en derechos humanos', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00345', 'Categorias derechos: civiles y politicos - derechos economicos, sociales y culturales. - derechos colectivos - derechos de las minorias', 'Categorias derechos: civiles y politicos - derechos economicos, sociales y culturales. - derechos colectivos - derechos de las minorias', 4, 64, 192, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00346', 'Colombia y la corte penal internacional', 'Colombia y la corte penal internacional', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00347', 'Desplazamiento forzado en Colombia', 'Desplazamiento forzado en Colombia', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00348', 'Mecanismos nacionales de proteccion. Mecanismos alternativos de solucion de conflictos', 'Mecanismos nacionales de proteccion. Mecanismos alternativos de solucion de conflictos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00349', 'Pedagogia de los derechos humanos', 'Pedagogia de los derechos humanos', 2, 32, 96, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00350', 'Seminario de Trabajo de grado', 'Seminario de Trabajo de grado', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-006' AND nt.nombre = 'Derechos Humanos - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00351', 'Economía de las finanzas públicas', 'Economía de las finanzas públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00352', 'Economía de las finanzas públicas (Virtual)', 'Economía de las finanzas públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00353', 'Gestión financiera territorial', 'Gestión financiera territorial', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00354', 'Gestión financiera territorial (Virtual)', 'Gestión financiera territorial', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00355', 'Régimen tributario nacional y territorial', 'Régimen tributario nacional y territorial', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00356', 'Régimen tributario nacional y territorial (Virtual)', 'Régimen tributario nacional y territorial', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00357', 'Seminario gestión del conocimiento', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00358', 'Seminario gestión del conocimiento (Virtual)', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00359', 'Contabilidad pública', 'Contabilidad pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00360', 'Contabilidad pública (Virtual)', 'Contabilidad pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00361', 'Control y seguimiento de la gestión financiera', 'Control y seguimiento de la gestión financiera', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00362', 'Control y seguimiento de la gestión financiera (Virtual)', 'Control y seguimiento de la gestión financiera', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00363', 'Seminario de Integración del conocimiento', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00364', 'Seminario de Integración del conocimiento (Virtual)', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00365', 'Sistemas de informacion para las finanzas públicas (Complementaria)', 'Sistemas de informacion para las finanzas públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00366', 'Sistemas de informacion para las finanzas públicas (Complementaria) (Virtual)', 'Sistemas de informacion para las finanzas públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-007' AND nt.nombre = 'Finanzas Públicas - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00367', 'Enfoques del Desarrollo Urbano y Regional', 'Enfoques del Desarrollo Urbano y Regional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-008' AND nt.nombre = 'GEPUR - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00368', 'Hábitat, urbanismo y ruralidad', 'Hábitat, urbanismo y ruralidad', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-008' AND nt.nombre = 'GEPUR - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00369', 'Seminario Gestión del Conocimiento', 'Seminario Gestión del Conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-008' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00370', 'Territorio, Política Pública y Gobierno', 'Territorio, Política Pública y Gobierno', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-008' AND nt.nombre = 'GEPUR - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00371', 'Geografía de colombia (Complementaria)', 'Geografía de colombia', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-008' AND nt.nombre = 'GEPUR - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00372', 'Ordenamiento urbano y regional', 'Ordenamiento urbano y regional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-008' AND nt.nombre = 'GEPUR - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00373', 'Planificación del desarrollo urbano y regional', 'Planificación del desarrollo urbano y regional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-008' AND nt.nombre = 'GEPUR - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00374', 'Seminario de Integración del conocimiento', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-008' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00375', 'Contexto Social Global y Nacional', 'Contexto Social Global y Nacional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00376', 'Contexto Social Global y Nacional (Virtual)', 'Contexto Social Global y Nacional', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00377', 'Objeto y Método de la Gerencia Social', 'Objeto y Método de la Gerencia Social', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00378', 'Objeto y Método de la Gerencia Social (Virtual)', 'Objeto y Método de la Gerencia Social', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00379', 'Políticas Públicas', 'Políticas Públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00380', 'Políticas Públicas (Virtual)', 'Políticas Públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00425', 'Seminario gestión del conocimiento', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00426', 'Seminario gestión del conocimiento (Virtual)', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00381', 'Gerencia de la intervención social', 'Gerencia de la intervención social', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00382', 'Gerencia de la intervención social (Virtual)', 'Gerencia de la intervención social', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00383', 'Proyectos sociales', 'Proyectos sociales', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00384', 'Proyectos sociales (Virtual)', 'Proyectos sociales', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00385', 'Retos y oportunidades en el posconflicto colombiano (Complementaria)', 'Retos y oportunidades en el posconflicto colombiano', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00386', 'Retos y oportunidades en el posconflicto colombiano (Complementaria) (Virtual)', 'Retos y oportunidades en el posconflicto colombiano', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gerencia Social - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00387', 'Seminario de Integración del conocimiento', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00388', 'Seminario de Integración del conocimiento (Virtual)', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-009' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00389', 'Gerencia de proyectos de inversión pública', 'Gerencia de proyectos de inversión pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00390', 'Gerencia de proyectos de inversión pública (Virtual)', 'Gerencia de proyectos de inversión pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00391', 'Innovación y gestión del conocimiento en la gestión pública', 'Innovación y gestión del conocimiento en la gestión pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00392', 'Innovación y gestión del conocimiento en la gestión pública (Virtual)', 'Innovación y gestión del conocimiento en la gestión pública', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00393', 'Politicas públicas', 'Politicas públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00394', 'Politicas públicas (Virtual)', 'Politicas públicas', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00395', 'Seminario gestión del conocimiento', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00396', 'Seminario gestión del conocimiento (Virtual)', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00397', 'Finanzas públicas, política fiscal y régimen presupuestal', 'Finanzas públicas, política fiscal y régimen presupuestal', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00398', 'Finanzas públicas, política fiscal y régimen presupuestal (Virtual)', 'Finanzas públicas, política fiscal y régimen presupuestal', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00399', 'Gestión integral de recursos públicos  Unidad 3: gestión de la contratación', 'Gestión integral de recursos públicos  Unidad 3: gestión de la contratación', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00400', 'Gestión integral de recursos públicos  Unidad 3: gestión de la contratación (Virtual)', 'Gestión integral de recursos públicos  Unidad 3: gestión de la contratación', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00401', 'Gestión integral de recursos públicos Unidad 1: gestión del talento humano', 'Gestión integral de recursos públicos Unidad 1: gestión del talento humano', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00402', 'Gestión integral de recursos públicos Unidad 1: gestión del talento humano (Virtual)', 'Gestión integral de recursos públicos Unidad 1: gestión del talento humano', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00403', 'Gestión integral de recursos públicos Unidad 2: gestión de bienes y recursos físicos
y Unidad 4: gestión de la información', 'Gestión integral de recursos públicos Unidad 2: gestión de bienes y recursos físicos
y Unidad 4: gestión de la información', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00404', 'Gestión integral de recursos públicos Unidad 2: gestión de bienes y recursos físicos
y Unidad 4: gestión de la información (Virtual)', 'Gestión integral de recursos públicos Unidad 2: gestión de bienes y recursos físicos
y Unidad 4: gestión de la información (Virtual)', 1, 16, 48, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00405', 'Seminario de Integración del conocimiento', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00406', 'Seminario de Integración del conocimiento (Virtual)', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00407', 'Sistemas de Gestión, Evaluación e Información (Complementaria)', 'Sistemas de Gestión, Evaluación e Información', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00408', 'Sistemas de Gestión, Evaluación e Información (Complementaria) (Virtual)', 'Sistemas de Gestión, Evaluación e Información', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-010' AND nt.nombre = 'Gestión Pública - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00409', 'Evaluación financiera de proyectos', 'Evaluación financiera de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00410', 'Evaluación financiera de proyectos (Virtual)', 'Evaluación financiera de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00411', 'Identificación y preparación de proyectos', 'Identificación y preparación de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00412', 'Identificación y preparación de proyectos (Virtual)', 'Identificación y preparación de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00413', 'Métodos probabilísticos y econométricos', 'Métodos probabilísticos y econométricos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00414', 'Métodos probabilísticos y econométricos (Virtual)', 'Métodos probabilísticos y econométricos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00415', 'Seminario gestión del conocimiento', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00416', 'Seminario gestión del conocimiento (Virtual)', 'Seminario gestión del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00417', 'Evaluación económica, social y ambiental de proyectos', 'Evaluación económica, social y ambiental de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00418', 'Evaluación económica, social y ambiental de proyectos (Virtual)', 'Evaluación económica, social y ambiental de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00419', 'Financiación y cofinanciación de proyectos (Complementaria)', 'Financiación y cofinanciación de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00420', 'Financiación y cofinanciación de proyectos (Complementaria) (Virtual)', 'Financiación y cofinanciación de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00421', 'Gerencia de proyectos', 'Gerencia de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00422', 'Gerencia de proyectos (Virtual)', 'Gerencia de proyectos', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Proyectos de Desarrollo - ESP' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00423', 'Seminario de Integración del conocimiento', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00424', 'Seminario de Integración del conocimiento (Virtual)', 'Seminario de Integración del conocimiento', 3, 48, 144, us.id, pr.id, nt.id, f.id, 'virtual', NULL, NULL, FALSE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-011' AND nt.nombre = 'Gestión del Conocimiento' AND f.codigo = 'POSGRADO-ESP'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00267', 'Concepciones y transformaciones del Estado', 'Concepciones y transformaciones del Estado', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00268', 'Derecho Internacional Humanitario y desafíos de los conflictos armados contemporáneos', 'Derecho Internacional Humanitario y desafíos de los conflictos armados contemporáneos', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00275', 'Seminario de trabajo de grado I', 'Seminario de trabajo de grado I', 1, 12, 36, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00277', 'Sistemas internacionales de protección de los derechos humanos', 'Sistemas internacionales de protección de los derechos humanos', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00278', 'Teorías y enfoques de los derechos humanos', 'Teorías y enfoques de los derechos humanos', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00286', 'Gestión organizacional de los derechos humanos', 'Gestión organizacional de los derechos humanos', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00288', 'Nuevos escenarios, institucionalidades y sujetos sociales para la gestión de lo público', 'Nuevos escenarios, institucionalidades y sujetos sociales para la gestión de lo público', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00290', 'Políticas de inclusión y gestión de la transición', 'Políticas de inclusión y gestión de la transición', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00291', 'Políticas públicas con enfoque de derechos humanos', 'Políticas públicas con enfoque de derechos humanos', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00294', 'Seminario de trabajo de grado II', 'Seminario de trabajo de grado II', 1, 12, 36, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00297', '1. Acción humanitaria y derechos de las víctimas I', '1. Acción humanitaria y derechos de las víctimas I', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00298', '1.Teorías y gestión para la resolución de los conflictos I', '1.Teorías y gestión para la resolución de los conflictos I', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00299', '2. Educación y Derechos Humanos I', '2. Educación y Derechos Humanos I', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00300', '2. Sistematización y diálogo de experiencias relacionadas con el conflicto armado I', '2. Sistematización y diálogo de experiencias relacionadas con el conflicto armado I', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00302', 'Desafíos de la transición y del posconflicto', 'Desafíos de la transición y del posconflicto', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00311', 'Seminario de trabajo de grado III', 'Seminario de trabajo de grado III', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00313', '1. Acción humanitaria y derechos de las víctimas II', '1. Acción humanitaria y derechos de las víctimas II', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00314', '1.Teorías y gestión para la resolución de los conflictos II', '1.Teorías y gestión para la resolución de los conflictos II', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00315', '2. Educación y Derechos Humanos II', '2. Educación y Derechos Humanos II', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00316', '2. Sistematización y diálogo de experiencias relacionadas con el conflicto armado II', '2. Sistematización y diálogo de experiencias relacionadas con el conflicto armado II', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00324', 'Justicia verdad reparación y garantía de no repetición', 'Justicia verdad reparación y garantía de no repetición', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00326', 'Seminario de trabajo de grado IV', 'Seminario de trabajo de grado IV', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-012' AND nt.nombre = 'Maestria DDHH y Posconflicto' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00270', 'Enfoques Teóricos del Estado, el Gobierno y las Políticas Públicas', 'Enfoques Teóricos del Estado, el Gobierno y las Políticas Públicas', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00271', 'Enfoques y Teorías de la Administración Pública', 'Enfoques y Teorías de la Administración Pública', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00273', 'Finanzas Públicas y Política Fiscal', 'Finanzas Públicas y Política Fiscal', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00276', 'Seminario Trabajo de Grado I', 'Seminario Trabajo de Grado I', 1, 12, 36, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00279', 'Teorías y Enfoques del Desarrollo Local y Descentralización', 'Teorías y Enfoques del Desarrollo Local y Descentralización', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00282', 'El desarrollo local regional y las políticas públicas', 'El desarrollo local regional y las políticas públicas', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00283', 'Elementos para la estructuración de políticas públicas', 'Elementos para la estructuración de políticas públicas', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00284', 'Enfoques y teorías de la administración Pública II', 'Enfoques y teorías de la administración Pública II', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00289', 'Política económica y finanzas públicas', 'Política económica y finanzas públicas', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00295', 'Seminario de trabajo II', 'Seminario de trabajo II', 1, 12, 36, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00301', 'Análisis de los Procesos de Descentralización y Desarrollo Local', 'Análisis de los Procesos de Descentralización y Desarrollo Local', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00303', 'Enfoques y Teorías de la Organización', 'Enfoques y Teorías de la Organización', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00310', 'Los Problemas de Gobernabilidad y Políticas Públicas: las especificidades de América Latina', 'Los Problemas de Gobernabilidad y Políticas Públicas: las especificidades de América Latina', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00312', 'Seminario Trabajo de Grado III', 'Seminario Trabajo de Grado III', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00317', 'Análisis de casos del territorio', 'Análisis de casos del territorio', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00322', 'Gerencia y Gestión Pública', 'Gerencia y Gestión Pública', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00323', 'Gobernabilidad y Políticas Públicas en Colombia', 'Gobernabilidad y Políticas Públicas en Colombia', 4, 48, 144, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00327', 'Seminario Trabajo de Grado IV', 'Seminario Trabajo de Grado IV', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-013' AND nt.nombre = 'Maestria Administración Pública - DISTANCIA' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00269', 'Economía Publica y Política Fiscal', 'Economía Publica y Política Fiscal', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00272', 'Estado, Gobierno y Gobernabilidad', 'Estado, Gobierno y Gobernabilidad', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00274', 'Metodologías Cualitativas y Estrategias de Escritura', 'Metodologías Cualitativas y Estrategias de Escritura', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00280', 'Teorías y Gestión del Desarrollo Territorial', 'Teorías y Gestión del Desarrollo Territorial', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00281', 'Teorías y Problemas de la Administración Publica', 'Teorías y Problemas de la Administración Publica', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre I' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00285', 'Formulación y Gestión de las Políticas Públicas', 'Formulación y Gestión de las Políticas Públicas', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00287', 'Métodos y Paquetes Informáticos Cuantitativos', 'Métodos y Paquetes Informáticos Cuantitativos', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00292', 'Problemas y Desafíos del Ordenamiento y la Descentralización Territorial', 'Problemas y Desafíos del Ordenamiento y la Descentralización Territorial', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00293', 'Proceso Político, Gestión y Presupuesto Público', 'Proceso Político, Gestión y Presupuesto Público', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00296', 'Tendencias y Experiencias Contemporáneas en Administración Pública', 'Tendencias y Experiencias Contemporáneas en Administración Pública', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre II' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00304', 'Laboratorio de Análisis y Gestión de Organizaciones Públicas', 'Laboratorio de Análisis y Gestión de Organizaciones Públicas', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00306', 'Laboratorio de Evaluación de Políticas Públicas', 'Laboratorio de Evaluación de Políticas Públicas', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00307', 'Laboratorio de Planificación y Gestión Financiera Territorial', 'Laboratorio de Planificación y Gestión Financiera Territorial', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00308', 'Laboratorio de Reformas de la Administración Pública', 'Laboratorio de Reformas de la Administración Pública', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00309', 'Laboratorio de Técnicas de Investigación de Bienestar y Pobreza', 'Laboratorio de Técnicas de Investigación de Bienestar y Pobreza', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00305', 'Laboratorio de elaboración y aprobación del proyecto de investigación', 'Laboratorio de elaboración y aprobación del proyecto de investigación', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre III' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00318', 'Avance de Tesis', 'Avance de Tesis', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00319', 'Electiva I: Política Ambiental', 'Electiva I: Política Ambiental', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00320', 'Electiva II: Indicadores de Gobernabilidad', 'Electiva II: Indicadores de Gobernabilidad', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00321', 'Electiva III: Intervención Económica del Estado', 'Electiva III: Intervención Económica del Estado', 2, 24, 72, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO academic_work_plan.asignatura (codigo, nombre, nombre_base, creditos, horas_clase, horas_pta, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad, tipo_excepcion, horas_fijas_pta, requiere_revision_modalidad, activa)
SELECT 'ASIG-00325', 'Laboratorio de Función Pública Colombiana y Comparada', 'Laboratorio de Función Pública Colombiana y Comparada', 3, 36, 108, us.id, pr.id, nt.id, f.id, 'sin_definir', NULL, NULL, TRUE, TRUE
FROM academic_work_plan.ubicacion_semestral us, academic_work_plan.programa pr, academic_work_plan.nucleo_tematico nt, academic_work_plan.facultad f
WHERE us.etiqueta = 'Semestre IV' AND pr.codigo = 'PRO-014' AND nt.nombre = 'Maestria Administración Pública - PRESENCIAL' AND f.codigo = 'POSGRADO-MAES'
ON CONFLICT (codigo) DO NOTHING;
