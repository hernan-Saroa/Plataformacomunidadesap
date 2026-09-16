-- ============================================================================
-- EFDS-1372 - Docentes del RUND (263) para DESARROLLO
--
-- ⚠️ APROVISIONAMIENTO DE DESARROLLO, NO MECANISMO DE PRODUCCION.
--
-- RN-09: el RUND lo administra la Subdireccion Nacional de Servicios
-- Academicos y las decanaturas lo consumen en LECTURA. Este seed existe para
-- tener datos con que desarrollar y demostrar; en produccion los docentes
-- entran por el mecanismo del modulo dueno, no por aqui.
--
-- ORIGEN: 05062026 - CargaDocentes_RUND_2025-1_FINAL.xlsx, convertido a CSV
-- sin alterar valores. Se carga TAL CUAL: horas, escalafon, regimen y
-- situacion administrativa son insumos de las reglas, no se derivan aqui.
--
-- Emparejamiento de territorial por nombre NORMALIZADO y no crudo: el CSV trae
-- NORTESANTANDER donde el catalogo tiene NORTE DE SANTANDER. Comparar en crudo
-- es el defecto que causo EFDS-1535.
--
-- Idempotente: WHERE NOT EXISTS sobre TODAS las columnas unicas.
--   auth.personas                 -> id_tercero (unico) + num_identificacion
--   academic_work_plan."Docente"  -> (personaId, COALESCE(periodoCarga,''))
-- ============================================================================

-- Funcion de normalizacion, para emparejar territoriales sin depender del
-- formato exacto del nombre.
CREATE OR REPLACE FUNCTION academic_work_plan.fn_normalizar_texto(v TEXT)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(
    translate(COALESCE(v,''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
    '[^a-zA-Z0-9]', '', 'g'));
$$ LANGUAGE SQL IMMUTABLE;

-- 1. ABEL ANTONIO ABELLA BELTRAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 479678, '479678', 'CC', 'ABEL ANTONIO ABELLA BELTRAN', 'ABEL ANTONIO ABELLA BELTRAN', NULL, NULL, 'M', 'abelabel@esap.edu.co', '6671750', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 479678 OR p.num_identificacion = '479678');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'abelabel@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-11-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 381.85, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '479678'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 2. ALBERTO GIRALDO SAAVEDRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19195704, '19195704', 'CC', 'ALBERTO GIRALDO SAAVEDRA', 'ALBERTO GIRALDO SAAVEDRA', NULL, NULL, 'M', 'albegira@esap.edu.co', '3106791787', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19195704 OR p.num_identificacion = '19195704');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asociado', 720, 'Acuerdo 009/2004', 'En Año Sabático hasta 1-10-2026 Resol.2052 30-09-2024', 'Año Sabático', DATE '2009-05-28', NULL, 40, 'Doctorado', 'albegira@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución 0594 28 de mayo de 2009 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 466.82, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19195704'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 3. ALEXANDER ARCINIEGAS CARREÑO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 91350046, '91350046', 'CC', 'ALEXANDER ARCINIEGAS CARREÑO', 'ALEXANDER ARCINIEGAS CARREÑO', NULL, NULL, 'M', 'alexander.arciniegas@esap.edu.co', '3196889781', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 91350046 OR p.num_identificacion = '91350046');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 1/08/2025', 'En Periodo de Prueba', DATE '2024-08-01', DATE '2025-08-01', 40, 'Doctorado', 'alexander.arciniegas@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1271 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 398.26, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '91350046'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 4. ALEXANDER COTTE POVEDA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 11186033, '11186033', 'CC', 'ALEXANDER COTTE POVEDA', 'ALEXANDER COTTE POVEDA', NULL, NULL, 'M', 'alexander.cotte@esap.edu.co', '3103708639', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 11186033 OR p.num_identificacion = '11186033');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'alexander.cotte@esap.edu.co', 'Economía de lo público', 'Resolución No. SC - 1272 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 513.97, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '11186033'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 5. ALEXANDER PARADA VALENCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 88034156, '88034156', 'CC', 'ALEXANDER PARADA VALENCIA', 'ALEXANDER PARADA VALENCIA', NULL, NULL, 'M', 'alexander.parada@esap.edu.co', '3102606394', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 88034156 OR p.num_identificacion = '88034156');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'alexander.parada@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC-840 de 04 de agosto de 2022 Resolución  SC-1324 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 517.2, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '88034156'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 6. ALIX ZULAY HURTADO SOTO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 37291100, '37291100', 'CC', 'ALIX ZULAY HURTADO SOTO', 'ALIX ZULAY HURTADO SOTO', NULL, NULL, 'F', 'alix.hurtado@esap.edu.co;alixhurt@esap.edu.co', '3114473921', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 37291100 OR p.num_identificacion = '37291100');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'alix.hurtado@esap.edu.co;alixhurt@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 369.62, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '37291100'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 7. ALVARO CRUZ VARON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 14224261, '14224261', 'CC', 'ALVARO CRUZ VARON', 'ALVARO CRUZ VARON', NULL, NULL, 'M', 'alvaro.cruzv@esap.edu.co', '3166867322', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 14224261 OR p.num_identificacion = '14224261');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'alvaro.cruzv@esap.edu.co', 'Economía De Lo Público / Finanzas Públicas Y Presupuesto', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 381.39, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '14224261'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 8. ALVARO LUIS MERCADO SUAREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 12630026, '12630026', 'CC', 'ALVARO LUIS MERCADO SUAREZ', 'ALVARO LUIS MERCADO SUAREZ', NULL, NULL, 'M', 'alvaro.mercado@esap.edu.co', '3002858574', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 12630026 OR p.num_identificacion = '12630026');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 21/11/2025', 'En Periodo de Prueba', DATE '2024-11-21', DATE '2025-11-21', 40, 'Maestría', 'alvaro.mercado@esap.edu.co', 'Desarrollo y Gestion Territorial', 'Resolución No. SC - 1273 de 27-06-2024. Acta de posesión No.426 de 21-11-2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 316.16, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '12630026'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 9. ANA ESTELA CABRERA PUCHANA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 28556463, '28556463', 'CC', 'ANA ESTELA CABRERA PUCHANA', 'ANA ESTELA CABRERA PUCHANA', NULL, NULL, 'F', 'anycabrera88@gmail.com', '5015746', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 28556463 OR p.num_identificacion = '28556463');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'anycabrera88@gmail.com', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 337.94, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '28556463'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 10. ANA MARIA TORRES HERNANDEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 41689873, '41689873', 'CC', 'ANA MARIA TORRES HERNANDEZ', 'ANA MARIA TORRES HERNANDEZ', NULL, NULL, 'F', 'ana.torres@esap.edu.co', '3153645979', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 41689873 OR p.num_identificacion = '41689873');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'ana.torres@esap.edu.co', 'Programas curriculares en relación al perfil académico profesional', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 396.95, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '41689873'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 11. ANDREA MARCELA BONELO CHAVARRO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1077862966, '1077862966', 'CC', 'ANDREA MARCELA BONELO CHAVARRO', 'ANDREA MARCELA BONELO CHAVARRO', NULL, NULL, 'F', 'andrea.bonelo@esap.edu.co', '3142006576', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1077862966 OR p.num_identificacion = '1077862966');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'andrea.bonelo@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-15-001 de 16 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 297.22, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '1077862966'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 12. ANDRES DE ZUBIRIA SAMPER
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 3228513, '3228513', 'CC', 'ANDRES DE ZUBIRIA SAMPER', 'ANDRES DE ZUBIRIA SAMPER', NULL, NULL, 'M', 'andres.dezubiria@esap.edu.co', '3002234735', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 3228513 OR p.num_identificacion = '3228513');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2018-08-01', NULL, 40, 'Maestría', 'andres.dezubiria@esap.edu.co', 'Estado y Poder', 'Resolución 2740 de 30 de julio de 2018', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 485.46, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '3228513'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 13. ANDRES GOMEZ ROLDAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 16710079, '16710079', 'CC', 'ANDRES GOMEZ ROLDAN', 'ANDRES GOMEZ ROLDAN', NULL, NULL, 'M', 'andres.gomezr@esap.edu.co', '3165855332', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 16710079 OR p.num_identificacion = '16710079');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'andres.gomezr@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 389.06, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '16710079'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 14. ANDRES MAURICIO GUZMAN RINCON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80830838, '80830838', 'CC', 'ANDRES MAURICIO GUZMAN RINCON', 'ANDRES MAURICIO GUZMAN RINCON', NULL, NULL, 'M', 'andres.guzman@esap.edu.co', '3203066989', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80830838 OR p.num_identificacion = '80830838');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'andres.guzman@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 841 de 04 de agosto de 2022 Resolución  SC-1640 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 486.7, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '80830838'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 15. ANGELICA FABIOLA BERNAL OLARTE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52423939, '52423939', 'CC', 'ANGELICA FABIOLA BERNAL OLARTE', 'ANGELICA FABIOLA BERNAL OLARTE', NULL, NULL, 'F', 'angelicaf.bernal@esap.edu.co', '3125774913', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52423939 OR p.num_identificacion = '52423939');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'En Comisión de Servicios (MinIgualdad) Resol.1300 del 25/10/2023', 'Comisión de Servicios', DATE '2022-02-01', NULL, 40, 'Doctorado', 'angelicaf.bernal@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-013 de 03 de enero de 2022 Resolución  SC-390 de 31 de marzo de 2023 Inscricipción en escalafón Resolución  SC-1648 de 13 de diciembre de 2023 Categoria Titular', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 500.43, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '52423939'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 16. ANIBAL MENDOZA DAZA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 8702503, '8702503', 'CC', 'ANIBAL MENDOZA DAZA', 'ANIBAL MENDOZA DAZA', NULL, NULL, 'M', 'anibal.mendoza@esap.edu.co', '3008764570', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 8702503 OR p.num_identificacion = '8702503');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'anibal.mendoza@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-426 de 31 de marzo de 2023 Acta de posesión No.132 05/05/2023 Resolución  SC-1584 de 6 de agosto de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 364.44, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '8702503'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 17. ANTONIO YESID PEDROZA ESTRADA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 77021522, '77021522', 'CC', 'ANTONIO YESID PEDROZA ESTRADA', 'ANTONIO YESID PEDROZA ESTRADA', NULL, NULL, 'M', 'antonio.pedroza@esap.edu.co', '3017572429', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 77021522 OR p.num_identificacion = '77021522');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'antonio.pedroza@esap.edu.co', 'Problemática Del Estado Y Del Poder / Gobierno Y Política Pública Y Politica Pública Territorial', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 470.82, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '77021522'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 18. ARISTIDES PEÑA ZUÑIGA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7712669, '7712669', 'CC', 'ARISTIDES PEÑA ZUÑIGA', 'ARISTIDES PEÑA ZUÑIGA', NULL, NULL, 'M', 'aristides.pena@esap.edu.co', '3166965760', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7712669 OR p.num_identificacion = '7712669');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'aristides.pena@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 842 de 04 de agosto de 2022 Resolución  SC-1325 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 355.04, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '7712669'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 19. BEATRIZ ANDREA RENGIFO RENGIFO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 59831050, '59831050', 'CC', 'BEATRIZ ANDREA RENGIFO RENGIFO', 'BEATRIZ ANDREA RENGIFO RENGIFO', NULL, NULL, 'F', 'beatriz.rengifo@esap.edu.co', '3147778171', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 59831050 OR p.num_identificacion = '59831050');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'beatriz.rengifo@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 358.12, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '59831050'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 20. BELTRAN DE JESUS RESTREPO ARREDONDO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 70081594, '70081594', 'CC', 'BELTRAN DE JESUS RESTREPO ARREDONDO', 'BELTRAN DE JESUS RESTREPO ARREDONDO', NULL, NULL, 'M', 'beltranrestrepo@esap.edu.co', '3104485185', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 70081594 OR p.num_identificacion = '70081594');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-22', DATE '2025-12-17', 40, 'Maestría', 'beltranrestrepo@esap.edu.co', 'Organizaciones Públicas / Derecho Administrativo Y Contratación Estatal', 'Resolución  DT-1-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 410.42, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '70081594'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 21. BIAFARA DE JESUS LEDEZMA GARCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 71696186, '71696186', 'CC', 'BIAFARA DE JESUS LEDEZMA GARCIA', 'BIAFARA DE JESUS LEDEZMA GARCIA', NULL, NULL, 'M', 'biafara.ledezma@esap.edu.co', '604', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 71696186 OR p.num_identificacion = '71696186');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'biafara.ledezma@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-16 -001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 254.65, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
WHERE p.num_identificacion = '71696186'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 22. BLAS MELENDEZ CARABALLO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1063720504, '1063720504', 'CC', 'BLAS MELENDEZ CARABALLO', 'BLAS MELENDEZ CARABALLO', NULL, NULL, 'M', 'blas.melendez@esap.edu.co', '4 7950528', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1063720504 OR p.num_identificacion = '1063720504');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'blas.melendez@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 843 de 04 de agosto de 2022 Resolución  SC-1528 de 4 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 480.37, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '1063720504'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 23. BREIDY FERNANDO CASTRO CAMPOS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1075211206, '1075211206', 'CC', 'BREIDY FERNANDO CASTRO CAMPOS', 'BREIDY FERNANDO CASTRO CAMPOS', NULL, NULL, 'M', 'breicast@esap.edu.co', '3107885850', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1075211206 OR p.num_identificacion = '1075211206');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'breicast@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución  DT-15-037 de 30 de junio de 2022 Resolución  SC-1646 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 355.83, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '1075211206'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 24. CAMILO CLAVIJO GARCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 93398738, '93398738', 'CC', 'CAMILO CLAVIJO GARCIA', 'CAMILO CLAVIJO GARCIA', NULL, NULL, 'M', 'camilo.clavijo@esap.edu.co', '3162429010', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 93398738 OR p.num_identificacion = '93398738');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-10-03', NULL, 40, 'Maestría', 'camilo.clavijo@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 845 de 04 de agosto de 2022 Resolución  SC-1641 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 376.07, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '93398738'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 25. CAMILO JOSE URIBE OTERO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79579074, '79579074', 'CC', 'CAMILO JOSE URIBE OTERO', 'CAMILO JOSE URIBE OTERO', NULL, NULL, 'M', 'camilo.uribe@esap.edu.co', '3206199601', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79579074 OR p.num_identificacion = '79579074');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'camilo.uribe@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-7-003 de 20 de enero  de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 406.89, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '79579074'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 26. CARLOS ALBERTO GUTIERREZ SALAZAR
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1061712832, '1061712832', 'CC', 'CARLOS ALBERTO GUTIERREZ SALAZAR', 'CARLOS ALBERTO GUTIERREZ SALAZAR', NULL, NULL, 'M', 'carlos.gsalazar@esap.edu.co', '3167376563', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1061712832 OR p.num_identificacion = '1061712832');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'carlos.gsalazar@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 443.98, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '1061712832'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 27. CARLOS ALFONSO PARDO TORRES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19386703, '19386703', 'CC', 'CARLOS ALFONSO PARDO TORRES', 'CARLOS ALFONSO PARDO TORRES', NULL, NULL, 'M', 'cpardo1129@hotmail.com', '3158985945', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19386703 OR p.num_identificacion = '19386703');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'cpardo1129@hotmail.com', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 378.18, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '19386703'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 28. CARLOS ANDRES BARCO ROJAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 18522517, '18522517', 'CC', 'CARLOS ANDRES BARCO ROJAS', 'CARLOS ANDRES BARCO ROJAS', NULL, NULL, 'M', 'carlos.barco@esap.edu.co', '6063309291', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 18522517 OR p.num_identificacion = '18522517');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'carlos.barco@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 847 de 04 de agosto de 2022 Resolución  SC-1317 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 424.34, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '18522517'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 29. CARLOS ANDRES BROCHET BAYONA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 73578918, '73578918', 'CC', 'CARLOS ANDRES BROCHET BAYONA', 'CARLOS ANDRES BROCHET BAYONA', NULL, NULL, 'M', 'carlos.brochet@esap.edu.co', '3205645795', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 73578918 OR p.num_identificacion = '73578918');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'carlos.brochet@esap.edu.co', 'Problemática Del Estado Y Del Poder', 'Resolución  DT-7-003 de 20 de enero  de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 367.08, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '73578918'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 30. CARLOS ANDRES LEITON PIAMBA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1061748671, '1061748671', 'CC', 'CARLOS ANDRES LEITON PIAMBA', 'CARLOS ANDRES LEITON PIAMBA', NULL, NULL, 'M', 'carlos.leiton@esap.edu.co', '602', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1061748671 OR p.num_identificacion = '1061748671');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'carlos.leiton@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 305.41, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '1061748671'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 31. CARLOS EDUARDO GARCIA LOPEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10276049, '10276049', 'CC', 'CARLOS EDUARDO GARCIA LOPEZ', 'CARLOS EDUARDO GARCIA LOPEZ', NULL, NULL, 'M', 'carlos.glopez@esap.edu.co', '606', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10276049 OR p.num_identificacion = '10276049');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'carlos.glopez@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-002 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 551.53, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '10276049'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 32. CARLOS FERNEY FORERO HERNANDEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1110459627, '1110459627', 'CC', 'CARLOS FERNEY FORERO HERNANDEZ', 'CARLOS FERNEY FORERO HERNANDEZ', NULL, NULL, 'M', 'carlosf.forero@esap.edu.co', '3214052154', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1110459627 OR p.num_identificacion = '1110459627');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'carlosf.forero@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 339.4, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '1110459627'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 33. CARLOS HERNAN FAJARDO TORO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 16754844, '16754844', 'CC', 'CARLOS HERNAN FAJARDO TORO', 'CARLOS HERNAN FAJARDO TORO', NULL, NULL, 'M', 'carlosh.fajardo@esap.edu.co', '3154814995', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 16754844 OR p.num_identificacion = '16754844');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'carlosh.fajardo@esap.edu.co', 'Ciencias de Datos', 'Resolución  SC-014 de 03 de enero de 2022 Resolución  SC-391 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 489.11, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '16754844'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 34. CARLOS MAURICIO ROJAS GUEZGUAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 74182096, '74182096', 'CC', 'CARLOS MAURICIO ROJAS GUEZGUAN', 'CARLOS MAURICIO ROJAS GUEZGUAN', NULL, NULL, 'M', 'carlos.rojas@esap.edu.co', '3142941253', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 74182096 OR p.num_identificacion = '74182096');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-10-03', NULL, 40, 'Maestría', 'carlos.rojas@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 901 de 04 de agosto de 2022 Resolución  SC-1642 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 339, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '74182096'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 35. CARLOS MORENO OSPINA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19241494, '19241494', 'CC', 'CARLOS MORENO OSPINA', 'CARLOS MORENO OSPINA', NULL, NULL, 'M', 'carlmore@esap.edu.co', '3157975746', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19241494 OR p.num_identificacion = '19241494');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asociado', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-03-21', NULL, 40, 'Doctorado', 'carlmore@esap.edu.co', 'Estado y Poder', 'Resolución 0270 del 21 de marzo de 2003 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 491.3, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19241494'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 36. CAROLINA GARCIA SANCHEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 30230914, '30230914', 'CC', 'CAROLINA GARCIA SANCHEZ', 'CAROLINA GARCIA SANCHEZ', NULL, NULL, 'F', 'carolina.garcia@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 30230914 OR p.num_identificacion = '30230914');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'carolina.garcia@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  SC-002 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 349.68, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '30230914'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 37. CAYETANO JIMENEZ MUNIVE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 9193635, '9193635', 'CC', 'CAYETANO JIMENEZ MUNIVE', 'CAYETANO JIMENEZ MUNIVE', NULL, NULL, 'M', 'cayetano.jimenez@esap.edu.co', '3157340705', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 9193635 OR p.num_identificacion = '9193635');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'cayetano.jimenez@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1274 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 496.31, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '9193635'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 38. CESAR ALEJANDRO RAMIREZ CHAPARRO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 9397297, '9397297', 'CC', 'CESAR ALEJANDRO RAMIREZ CHAPARRO', 'CESAR ALEJANDRO RAMIREZ CHAPARRO', NULL, NULL, 'M', 'cesar.ramirez@esap.edu.co', '3176451671', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 9397297 OR p.num_identificacion = '9397297');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Maestría', 'cesar.ramirez@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-015 de 03 de enero de 2022 Resolución  SC-392 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 403, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '9397297'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 39. CESAR ARTURO VANEGAS RODRIGUEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79838783, '79838783', 'CC', 'CESAR ARTURO VANEGAS RODRIGUEZ', 'CESAR ARTURO VANEGAS RODRIGUEZ', NULL, NULL, 'M', 'cesar.vanegas@esap.edu.co', '3115881350', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79838783 OR p.num_identificacion = '79838783');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'cesar.vanegas@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-11-002 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 304.06, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '79838783'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 40. CHRISTIAN ALEXANDER NARVAEZ ALVAREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10296336, '10296336', 'CC', 'CHRISTIAN ALEXANDER NARVAEZ ALVAREZ', 'CHRISTIAN ALEXANDER NARVAEZ ALVAREZ', NULL, NULL, 'M', 'christian.narvaez@esap.edu.co', '3104567844', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10296336 OR p.num_identificacion = '10296336');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'christian.narvaez@esap.edu.co', 'Problemática Del Estado Y Poder /Problremática Pública', 'Resolución  DTV-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 451.38, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '10296336'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 41. CHRISTIAN FELIPE ORTEGA GOMEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 4615873, '4615873', 'CC', 'CHRISTIAN FELIPE ORTEGA GOMEZ', 'CHRISTIAN FELIPE ORTEGA GOMEZ', NULL, NULL, 'M', 'christian.ortega@esap.edu.co', '3223065118', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 4615873 OR p.num_identificacion = '4615873');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'christian.ortega@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 366.92, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '4615873'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 42. CLARA INES COLLAZOS MARTINEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 49729646, '49729646', 'CC', 'CLARA INES COLLAZOS MARTINEZ', 'CLARA INES COLLAZOS MARTINEZ', NULL, NULL, 'F', 'clara.collazos@esap.edu.co', '3017570141', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 49729646 OR p.num_identificacion = '49729646');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'clara.collazos@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 393.66, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '49729646'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 43. CLAUDIA JURADO ALVARAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 30318787, '30318787', 'CC', 'CLAUDIA JURADO ALVARAN', 'CLAUDIA JURADO ALVARAN', NULL, NULL, 'F', 'claudia.jurado@esap.edu.co', '3103758925', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 30318787 OR p.num_identificacion = '30318787');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'claudia.jurado@esap.edu.co', 'Gestión Del Desarrollo Territorial, Teorìas Y Enfoques Del Desarrollo, Planeación Del Desarrollo, Proyectos De Desarrollo.', 'Resolución  SC-002 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 530.62, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '30318787'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 44. CLAUDIA SOFIA RODRIGUEZ BERNAL
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 23622695, '23622695', 'CC', 'CLAUDIA SOFIA RODRIGUEZ BERNAL', 'CLAUDIA SOFIA RODRIGUEZ BERNAL', NULL, NULL, 'F', 'claudias.rodriguez@esap.edu.co', '3138329647', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 23622695 OR p.num_identificacion = '23622695');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'claudias.rodriguez@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución No. SC - 1276 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 451.36, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '23622695'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 45. DAGOBERTO TORRES FLOREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 86075572, '86075572', 'CC', 'DAGOBERTO TORRES FLOREZ', 'DAGOBERTO TORRES FLOREZ', NULL, NULL, 'M', 'dagoberto.torres@esap.edu.co', '3106967477', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 86075572 OR p.num_identificacion = '86075572');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'dagoberto.torres@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1278 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 580.39, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '86075572'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 46. DANIEL ESTEBAN UNIGARRO CAGUASANGO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80779449, '80779449', 'CC', 'DANIEL ESTEBAN UNIGARRO CAGUASANGO', 'DANIEL ESTEBAN UNIGARRO CAGUASANGO', NULL, NULL, 'M', 'daniel.unigarro@esap.edu.co', '3112291203', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80779449 OR p.num_identificacion = '80779449');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'daniel.unigarro@esap.edu.co', 'Desarrollo y Gestion Territorial', 'Resolución No. SC - 1279 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 388.41, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '80779449'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 47. DANIEL OSWALDO MUÑOZ CASTRO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1085288611, '1085288611', 'CC', 'DANIEL OSWALDO MUÑOZ CASTRO', 'DANIEL OSWALDO MUÑOZ CASTRO', NULL, NULL, 'M', 'danielo.munoz@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1085288611 OR p.num_identificacion = '1085288611');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'danielo.munoz@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 347.77, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '1085288611'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 48. DANIELA MEJÍA NARANJO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1053772989, '1053772989', 'CC', 'DANIELA MEJÍA NARANJO', 'DANIELA MEJÍA NARANJO', NULL, NULL, 'F', 'daniela.mejian@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1053772989 OR p.num_identificacion = '1053772989');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'daniela.mejian@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 424.33, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '1053772989'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 49. DAVID JULIAN MOLINA BELTRAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 11447367, '11447367', 'CC', 'DAVID JULIAN MOLINA BELTRAN', 'DAVID JULIAN MOLINA BELTRAN', NULL, NULL, 'M', 'davidj.molina@esap.edu.co', '3197567257', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 11447367 OR p.num_identificacion = '11447367');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'davidj.molina@esap.edu.co', 'Matemáticas, Estadística', 'Resolución  SC-016 de 03 de enero de 2022 Resolución  SC-393 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 429, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '11447367'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 50. DAVID LEONARDO QUITIAN ROLDAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79706077, '79706077', 'CC', 'DAVID LEONARDO QUITIAN ROLDAN', 'DAVID LEONARDO QUITIAN ROLDAN', NULL, NULL, 'M', 'david.quitian@esap.edu.co', '3125274514', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79706077 OR p.num_identificacion = '79706077');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'david.quitian@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 851 de 04 de agosto de 2022 Resolución  SC-1643 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 521.56, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '79706077'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 51. DEAN LERMEN GONZALEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79041880, '79041880', 'CC', 'DEAN LERMEN GONZALEZ', 'DEAN LERMEN GONZALEZ', NULL, NULL, 'M', 'deam.lermen@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79041880 OR p.num_identificacion = '79041880');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Visitante', 'Tiempo Completo', 'Activo', 'Visitante', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'deam.lermen@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la Escuela Superior de Administración Pública', 'Resolución  SC-017 de 10 de enero de 2025', 'Aprobado por el Consejo Académico Nacional', 457.03, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79041880'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 52. DELIO ALEXANDER BALCAZAR CAMACHO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1023864005, '1023864005', 'CC', 'DELIO ALEXANDER BALCAZAR CAMACHO', 'DELIO ALEXANDER BALCAZAR CAMACHO', NULL, NULL, 'M', 'delio.balcazar@esap.edu.co', '3152487244', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1023864005 OR p.num_identificacion = '1023864005');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'delio.balcazar@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 902 de 04 de agosto de 2022 Resolución  SC-1327 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 434.96, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '1023864005'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 53. DHORTON PINO SERNA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 11802595, '11802595', 'CC', 'DHORTON PINO SERNA', 'DHORTON PINO SERNA', NULL, NULL, 'M', 'dhorton.pino@esap.edu.co', '3127258856', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 11802595 OR p.num_identificacion = '11802595');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'dhorton.pino@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la Escuela Superior de Administración Pública', 'Resolución  DT-16 -001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 353.11, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
WHERE p.num_identificacion = '11802595'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 54. DIANA CAROLINA RICO REVELO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 30338632, '30338632', 'CC', 'DIANA CAROLINA RICO REVELO', 'DIANA CAROLINA RICO REVELO', NULL, NULL, 'F', 'diana.rico@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 30338632 OR p.num_identificacion = '30338632');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'diana.rico@esap.edu.co', 'Desarrollo y Gestion Territorial', 'Resolución No. SC - 1280 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 602.49, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '30338632'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 55. DIANA VICTORIA RODRIGUEZ VEGA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 40386883, '40386883', 'CC', 'DIANA VICTORIA RODRIGUEZ VEGA', 'DIANA VICTORIA RODRIGUEZ VEGA', NULL, NULL, 'F', 'dianvrodr@esap.edu.co', '3005706536', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 40386883 OR p.num_identificacion = '40386883');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'dianvrodr@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-03-001 de 31 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 378.75, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '40386883'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 56. DIEGO ANDRES GUEVARA FLETCHER
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 76318005, '76318005', 'CC', 'DIEGO ANDRES GUEVARA FLETCHER', 'DIEGO ANDRES GUEVARA FLETCHER', NULL, NULL, 'M', 'diego.guevara@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 76318005 OR p.num_identificacion = '76318005');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'diego.guevara@esap.edu.co', 'Economía de lo público', 'Resolución No. SC - 1281 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 500.32, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '76318005'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 57. DIEGO ARMANDO ALDANA SANCHEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7732011, '7732011', 'CC', 'DIEGO ARMANDO ALDANA SANCHEZ', 'DIEGO ARMANDO ALDANA SANCHEZ', NULL, NULL, 'M', 'diego.aldana@esap.edu.co', '3212248715', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7732011 OR p.num_identificacion = '7732011');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'diego.aldana@esap.edu.co', 'Gestión Del Desarrollo / Proyectos De Desarrollo Y Servicios Públicos Y Medio Ambiente', 'Resolución  DT-15-001 de 16 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 301.06, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '7732011'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 58. DIEGO ARMANDO JURADO ZAMBRANO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1089458130, '1089458130', 'CC', 'DIEGO ARMANDO JURADO ZAMBRANO', 'DIEGO ARMANDO JURADO ZAMBRANO', NULL, NULL, 'M', 'diego.jurado@esap.edu.co', '3013314271', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1089458130 OR p.num_identificacion = '1089458130');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'diego.jurado@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 852 de 04 de agosto de 2022 Resolución  SC-1099 de 1 de septiembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 343.62, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '1089458130'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 59. EDGAR ALBERTO PEÑA ESPINOSA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19486550, '19486550', 'CC', 'EDGAR ALBERTO PEÑA ESPINOSA', 'EDGAR ALBERTO PEÑA ESPINOSA', NULL, NULL, 'M', 'alberto.pena@esap.edu.co', '3108736889', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19486550 OR p.num_identificacion = '19486550');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'alberto.pena@esap.edu.co', 'Gestión Del Desarrollo', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 290.1, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '19486550'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 60. EDGAR EDUARDO GUERRERO RODRIGUEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 91068392, '91068392', 'CC', 'EDGAR EDUARDO GUERRERO RODRIGUEZ', 'EDGAR EDUARDO GUERRERO RODRIGUEZ', NULL, NULL, 'M', 'edgar.guerrero@esap.edu.co', '3153728092', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 91068392 OR p.num_identificacion = '91068392');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'edgar.guerrero@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-5-001 de 16 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 357.34, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '91068392'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 61. EDGAR ENRIQUE MARTINEZ CARDENAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7220912, '7220912', 'CC', 'EDGAR ENRIQUE MARTINEZ CARDENAS', 'EDGAR ENRIQUE MARTINEZ CARDENAS', NULL, NULL, 'M', 'edgamart@esap.edu.co', '3003248408', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7220912 OR p.num_identificacion = '7220912');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2006-06-06', NULL, 40, 'Doctorado y Posdoctorado', 'edgamart@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución 0379 del 6 de junio de 2006 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 693.87, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '7220912'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 62. EDGAR RODRIGUEZ DIAZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19301408, '19301408', 'CC', 'EDGAR RODRIGUEZ DIAZ', 'EDGAR RODRIGUEZ DIAZ', NULL, NULL, 'M', 'edgar.rodriguez@esap.edu.co', '3138516475', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19301408 OR p.num_identificacion = '19301408');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'edgar.rodriguez@esap.edu.co', 'Organizaciones Públicas', 'Resolución  SC-016 de 10 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 419.26, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19301408'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 63. EDUARDO ANDRES BOTERO CEDEÑO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 9773378, '9773378', 'CC', 'EDUARDO ANDRES BOTERO CEDEÑO', 'EDUARDO ANDRES BOTERO CEDEÑO', NULL, NULL, 'M', 'eduardo.botero@esap.edu.co', '3155145124', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 9773378 OR p.num_identificacion = '9773378');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'eduardo.botero@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 477.41, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '9773378'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 64. EDUARDO YOVANY DELGADO MENESES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 98383203, '98383203', 'CC', 'EDUARDO YOVANY DELGADO MENESES', 'EDUARDO YOVANY DELGADO MENESES', NULL, NULL, 'M', 'eduardo.delgado@esap.edu.co', '3173776655', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 98383203 OR p.num_identificacion = '98383203');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'eduardo.delgado@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 281.48, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '98383203'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 65. EDWIN MANUEL TAPIA GONGORA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79964415, '79964415', 'CC', 'EDWIN MANUEL TAPIA GONGORA', 'EDWIN MANUEL TAPIA GONGORA', NULL, NULL, 'M', 'edwin.tapia@esap.edu.co', '3134316969', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79964415 OR p.num_identificacion = '79964415');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-11-03', NULL, 40, 'Maestría', 'edwin.tapia@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución SC- 854 de 04 de agosto de 2022 Resolución  SC-238 de 21 de febrero de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 373.31, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '79964415'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 66. EDWIN MURILLO AMARIS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79488901, '79488901', 'CC', 'EDWIN MURILLO AMARIS', 'EDWIN MURILLO AMARIS', NULL, NULL, 'M', 'edwin.murilloa@esap.edu.co', '3174318658', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79488901 OR p.num_identificacion = '79488901');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'edwin.murilloa@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-017 de 03 de enero de 2022 Resolución  SC-844 de 11 de julio de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 555.49, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '79488901'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 67. EIMER ALEXIS BARAJAS ROMAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 88211500, '88211500', 'CC', 'EIMER ALEXIS BARAJAS ROMAN', 'EIMER ALEXIS BARAJAS ROMAN', NULL, NULL, 'M', 'eimer.barajas@esap.edu.co', '3159273960', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 88211500 OR p.num_identificacion = '88211500');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 12/5/2026', 'En Periodo de Prueba', DATE '2025-05-12', DATE '2026-05-12', 40, 'Maestría', 'eimer.barajas@esap.edu.co', 'Economía De Lo Público', 'Resolución  SC-604 de 11 de abril de 2025 Acta de posesión No. 124 12/05/2025', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 338.84, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '88211500'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 68. ELSY LUZ BARRERA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 51569906, '51569906', 'CC', 'ELSY LUZ BARRERA', 'ELSY LUZ BARRERA', NULL, NULL, 'F', 'elsybarr@esap.edu.co', '3143878120', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 51569906 OR p.num_identificacion = '51569906');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asociado', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-08-07', NULL, 40, 'Doctorado', 'elsybarr@esap.edu.co', 'Estado y Poder', 'Resolución 0111 del 7 de febrero de 2003 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 592.0500000000001, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '51569906'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 69. ERLINTO VELASCO ARTEAGA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 87718683, '87718683', 'CC', 'ERLINTO VELASCO ARTEAGA', 'ERLINTO VELASCO ARTEAGA', NULL, NULL, 'M', 'erlinto.velasco@esap.edu.co', '3155619052', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 87718683 OR p.num_identificacion = '87718683');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'erlinto.velasco@esap.edu.co', 'Problemática Del Estado Y Del Poder / Derechos Constitucional Y Organización Del Estado', 'Resolución  DT-12-001 de 17 de enero de 2025 Resolución Modificación  DT-12-008 de 29 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 355.03, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '87718683'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 70. ESTHER PARRA RAMIREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 63445154, '63445154', 'CC', 'ESTHER PARRA RAMIREZ', 'ESTHER PARRA RAMIREZ', NULL, NULL, 'F', 'esthparr@esap.edu.co', '3102104824', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 63445154 OR p.num_identificacion = '63445154');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-03-21', NULL, 40, 'Doctorado', 'esthparr@esap.edu.co', 'Estado y Poder', 'Resolucion 0263 del 21 de marzo de 2003 (ingreso a escalafón docente-Asistente) Resolución SC-1840 de 24 de septiembre de 2013 ascenso a Titular', 'Carrera profesoral antes de 2018', 606.5899999999999, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '63445154'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 71. EUNICE RAMIREZ VARON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 38254438, '38254438', 'CC', 'EUNICE RAMIREZ VARON', 'EUNICE RAMIREZ VARON', NULL, NULL, 'M', 'eunice.ramirez@esap.edu.co', '3177886681', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 38254438 OR p.num_identificacion = '38254438');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'eunice.ramirez@esap.edu.co', 'Problemática Del Estado Y Del Poder / Pensamiento Administrativo Y Problemática Pública', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 443.44, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '38254438'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 72. FABIAN ENRIQUE SALAZAR VILLANO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1061709480, '1061709480', 'CC', 'FABIAN ENRIQUE SALAZAR VILLANO', 'FABIAN ENRIQUE SALAZAR VILLANO', NULL, NULL, 'M', 'fabian.salazar@esap.edu.co', '3232910485', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1061709480 OR p.num_identificacion = '1061709480');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-04-01', NULL, 40, 'Doctorado', 'fabian.salazar@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución No. 049 de 19 de enero de 2022 Resolución  SC-728 de 9 de junio de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 369.44, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '1061709480'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 73. FABIAN LEONARDO ROMERO BOLIVAR
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1049628159, '1049628159', 'CC', 'FABIAN LEONARDO ROMERO BOLIVAR', 'FABIAN LEONARDO ROMERO BOLIVAR', NULL, NULL, 'M', 'fabian.romero@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1049628159 OR p.num_identificacion = '1049628159');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'fabian.romero@esap.edu.co', 'Economía De Lo Público', 'Resolución No. SC - 1282 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 321.96, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '1049628159'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 74. FERNAN FORTICH PACHECO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 73087903, '73087903', 'CC', 'FERNAN FORTICH PACHECO', 'FERNAN FORTICH PACHECO', NULL, NULL, 'M', 'fernan.fortich@esap.edu.co', '3108191671', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 73087903 OR p.num_identificacion = '73087903');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2018-08-01', NULL, 40, 'Magister cursando Doctorado', 'fernan.fortich@esap.edu.co', 'Economía De Lo Público', 'Resolución 2740 de 30 de julio de 2018', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 538.9200000000001, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '73087903'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 75. FRANCISCO ALBERTO BAUTISTA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19327342, '19327342', 'CC', 'FRANCISCO ALBERTO BAUTISTA', 'FRANCISCO ALBERTO BAUTISTA', NULL, NULL, 'M', 'fabautista@esap.edu.co', '3133193777', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19327342 OR p.num_identificacion = '19327342');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'fabautista@esap.edu.co', 'Problemática Del Estado Y Del Poder', 'Resolución  DT-11-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 370.6, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '19327342'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 76. FRANCISCO EDUARDO MEJIA LEMA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10089129, '10089129', 'CC', 'FRANCISCO EDUARDO MEJIA LEMA', 'FRANCISCO EDUARDO MEJIA LEMA', NULL, NULL, 'M', 'francisco.mejia@esap.edu.co', '3116356609', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10089129 OR p.num_identificacion = '10089129');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'francisco.mejia@esap.edu.co', 'Problemática Pública', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 382.79, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '10089129'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 77. FRANSISCO JAVIER VARGAS CRUZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10566497, '10566497', 'CC', 'FRANSISCO JAVIER VARGAS CRUZ', 'FRANSISCO JAVIER VARGAS CRUZ', NULL, NULL, 'M', 'franciscoj.vargas@esap.edu.co', '8335862', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10566497 OR p.num_identificacion = '10566497');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'franciscoj.vargas@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 273.92, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '10566497'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 78. FREDY EDUARDO CANTE MALDONADO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79302631, '79302631', 'CC', 'FREDY EDUARDO CANTE MALDONADO', 'FREDY EDUARDO CANTE MALDONADO', NULL, NULL, 'M', 'fredy.cante@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79302631 OR p.num_identificacion = '79302631');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'fredy.cante@esap.edu.co', 'Economía de lo público', 'Resolución No. SC - 1283 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 509.55, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79302631'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 79. FREDY WILLIAM ANDRADE PEREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7722817, '7722817', 'CC', 'FREDY WILLIAM ANDRADE PEREZ', 'FREDY WILLIAM ANDRADE PEREZ', NULL, NULL, 'M', 'fredy.andrade@esap.edu.co', '3202721587', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7722817 OR p.num_identificacion = '7722817');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'En comisión Resol. 2216 01-11-2024 Decano U.Surcolombiana desde 05-11-2024', 'Comisión de Servicios', DATE '2023-01-05', NULL, 40, 'Maestría', 'fredy.andrade@esap.edu.co', 'Economía De Lo Público', 'Resolución SC- 858 de 04 de agosto de 2022 Resolución  SC-240 de 21 de febrero de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 338.71, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '7722817'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 80. FREDYS PADILLA GONZALEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 12602296, '12602296', 'CC', 'FREDYS PADILLA GONZALEZ', 'FREDYS PADILLA GONZALEZ', NULL, NULL, 'M', 'fredys.padilla@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 12602296 OR p.num_identificacion = '12602296');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'fredys.padilla@esap.edu.co', 'Economía De Lo Público', 'Resolución No. SC - 1284 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 416.8, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '12602296'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 81. GABRIEL VILLALOBOS CAMARGO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79750179, '79750179', 'CC', 'GABRIEL VILLALOBOS CAMARGO', 'GABRIEL VILLALOBOS CAMARGO', NULL, NULL, 'M', 'gabriel.villalobos@esap.edu.co', '3043434175', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79750179 OR p.num_identificacion = '79750179');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'gabriel.villalobos@esap.edu.co', 'Ciencias de Datos', 'Resolución  SC-018 de 03 de enero de 2022 Resolución  SC-394 de 31 de marzo de 2023 Inscricipción en escalafón. Resolución  SC-1650 de 13 de diciembre de 2024 Categoria Titular.', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 531.76, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79750179'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 82. GERMAN ANDRES MOLINA GARRIDO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80219035, '80219035', 'CC', 'GERMAN ANDRES MOLINA GARRIDO', 'GERMAN ANDRES MOLINA GARRIDO', NULL, NULL, 'M', 'german.molina@esap.edu.co', '3016448557', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80219035 OR p.num_identificacion = '80219035');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'german.molina@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 859 de 04 de agosto de 2022 Resolución  SC-1328 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 487.35, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '80219035'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 83. GERMAN CARVAJAL AHUMADA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79205006, '79205006', 'CC', 'GERMAN CARVAJAL AHUMADA', 'GERMAN CARVAJAL AHUMADA', NULL, NULL, 'M', 'german.carvajal@esap.edu.co', '3133159014', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79205006 OR p.num_identificacion = '79205006');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'german.carvajal@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 369.6, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79205006'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 84. GERMAN MARIN ZAFRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 94375494, '94375494', 'CC', 'GERMAN MARIN ZAFRA', 'GERMAN MARIN ZAFRA', NULL, NULL, 'M', 'german.marin@esap.edu.co', '3137561923', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 94375494 OR p.num_identificacion = '94375494');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'german.marin@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DTV-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 311.6, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '94375494'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 85. GEYDI DAHIANA DEMARCHI SANCHEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1077442112, '1077442112', 'CC', 'GEYDI DAHIANA DEMARCHI SANCHEZ', 'GEYDI DAHIANA DEMARCHI SANCHEZ', NULL, NULL, 'F', 'geydi.demarchi@esap.edu.co', '3225840477', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1077442112 OR p.num_identificacion = '1077442112');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-02-07', DATE '2025-09-02', 40, 'Doctorado', 'geydi.demarchi@esap.edu.co', 'Espacio Tiempo Y Territorio/ Gerencia Social', 'Resolución  DT-1-002 de 3 de febrero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 438.04, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '1077442112'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 86. GILMA SOCORRO VANEGAS ROMERO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 40029903, '40029903', 'CC', 'GILMA SOCORRO VANEGAS ROMERO', 'GILMA SOCORRO VANEGAS ROMERO', NULL, NULL, 'F', 'gilma.vanegas@esap.edu.co', '3106288127', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 40029903 OR p.num_identificacion = '40029903');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'gilma.vanegas@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-08-003 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 273.35, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '40029903'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 87. GIOVANNI MAURICIO CASTRO LEGUIZAMON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79856565, '79856565', 'CC', 'GIOVANNI MAURICIO CASTRO LEGUIZAMON', 'GIOVANNI MAURICIO CASTRO LEGUIZAMON', NULL, NULL, 'M', 'giovanni.castro@esap.edu.co', '3008322423', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79856565 OR p.num_identificacion = '79856565');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'giovanni.castro@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 860 de 04 de agosto de 2022 Resolución  SC-1446 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 335.52, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '79856565'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 88. GLADYS ANDREA TORRES ESTEPA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 46382302, '46382302', 'CC', 'GLADYS ANDREA TORRES ESTEPA', 'GLADYS ANDREA TORRES ESTEPA', NULL, NULL, 'F', 'gladys.torres@esap.edu.co', '3112119992', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 46382302 OR p.num_identificacion = '46382302');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Doctorado y Posdoctorado', 'gladys.torres@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 861 de 04 de agosto de 2022 Resolución  SC-1439 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 524.18, '0', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '46382302'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 89. GLYNIS LUCIA PANESSO CHAVERRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 68297820, '68297820', 'CC', 'GLYNIS LUCIA PANESSO CHAVERRA', 'GLYNIS LUCIA PANESSO CHAVERRA', NULL, NULL, 'F', 'glynisl.panesso@esap.edu.co', '3102583746', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 68297820 OR p.num_identificacion = '68297820');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'glynisl.panesso@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 362.53, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '68297820'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 90. GRACILIANA MORENO ECHAVARRIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 31873677, '31873677', 'CC', 'GRACILIANA MORENO ECHAVARRIA', 'GRACILIANA MORENO ECHAVARRIA', NULL, NULL, 'F', 'graciliana.moreno@esap.edu.co', '3204516192', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 31873677 OR p.num_identificacion = '31873677');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'graciliana.moreno@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-429 de 31 de marzo de 2023 Acta de posesión No.131 05/05/2023 Resolución  SC-1562 de 1 de agosto de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 361.07, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '31873677'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 91. GUSTAVO ADOLFO MUÑOZ GAVIRIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 71776491, '71776491', 'CC', 'GUSTAVO ADOLFO MUÑOZ GAVIRIA', 'GUSTAVO ADOLFO MUÑOZ GAVIRIA', NULL, NULL, 'M', 'gustavo.munoz@esap.edu.co', '5021010', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 71776491 OR p.num_identificacion = '71776491');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'gustavo.munoz@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 903 de 04 de agosto de 2022 Resolución  SC-1329 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 527.63, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '71776491'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 92. HAMILTON MAURICIO RUIZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1085247118, '1085247118', 'CC', 'HAMILTON MAURICIO RUIZ', 'HAMILTON MAURICIO RUIZ', NULL, NULL, 'M', 'hamilton.ruiz@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1085247118 OR p.num_identificacion = '1085247118');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'hamilton.ruiz@esap.edu.co', 'Matemáticas, Estadística', 'Resolución No. SC - 1285 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 283.82, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '1085247118'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 93. HARVEY OLIVER CRIOLLO MANCHABAJOY
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 98215205, '98215205', 'CC', 'HARVEY OLIVER CRIOLLO MANCHABAJOY', 'HARVEY OLIVER CRIOLLO MANCHABAJOY', NULL, NULL, 'M', 'harvey.criollo@esap.edu.co', '3127442497', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 98215205 OR p.num_identificacion = '98215205');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'En comisión de Estudios. Resol. 431 26-03-2025 Doctorado en Desarrollo y Territorio - U.LaSalle. De 2025-1 a 2025-2', 'Comisión de Estudios', DATE '2022-09-01', NULL, 40, 'Maestría', 'harvey.criollo@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 862 de 04 de agosto de 2022 Resolución  SC-1447 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 359.05, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '98215205'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 94. HECTOR ELIAS PINZON TORRES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79330878, '79330878', 'CC', 'HECTOR ELIAS PINZON TORRES', 'HECTOR ELIAS PINZON TORRES', NULL, NULL, 'M', 'hectpinz@esap.edu.co', '3172670793', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79330878 OR p.num_identificacion = '79330878');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'hectpinz@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 382.2, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79330878'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 95. HELVER JAVIER CADAVID RAMIREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79669055, '79669055', 'CC', 'HELVER JAVIER CADAVID RAMIREZ', 'HELVER JAVIER CADAVID RAMIREZ', NULL, NULL, 'M', 'helver.cadavid@esap.edu.co', '3122201323', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79669055 OR p.num_identificacion = '79669055');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'helver.cadavid@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución SC- 863 de 04 de agosto de 2022 Resolución  SC-1472 de 23 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 413.32, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '79669055'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 96. HENRY ERNESTO GONZALEZ BECERRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7226078, '7226078', 'CC', 'HENRY ERNESTO GONZALEZ BECERRA', 'HENRY ERNESTO GONZALEZ BECERRA', NULL, NULL, 'M', 'henrye.gonzalez@esap.edu.co', '3118672914', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7226078 OR p.num_identificacion = '7226078');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'henrye.gonzalez@esap.edu.co', 'Economía De Lo Público', 'Resolución SC- 864 de 04 de agosto de 2022 Resolución  SC-1440 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 396.98, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '7226078'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 97. HERNANDO PERDOMO GOMEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 12190874, '12190874', 'CC', 'HERNANDO PERDOMO GOMEZ', 'HERNANDO PERDOMO GOMEZ', NULL, NULL, 'M', 'hernando.perdomog@esap.edu.co', '5726760', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 12190874 OR p.num_identificacion = '12190874');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'hernando.perdomog@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 368.83, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '12190874'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 98. HERWIN EDUARDO CARDONA QUITIAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 71799891, '71799891', 'CC', 'HERWIN EDUARDO CARDONA QUITIAN', 'HERWIN EDUARDO CARDONA QUITIAN', NULL, NULL, 'M', 'herwin.cardona@esap.edu.co', '3016533049', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 71799891 OR p.num_identificacion = '71799891');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-12-02', NULL, 40, 'Doctorado', 'herwin.cardona@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 904 de 04 de agosto de 2022 Resolución  SC-242 de 21 de febrero de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 509.44, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
WHERE p.num_identificacion = '71799891'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 99. HORTENSIA DEL SOCORRO PEREZ VARGAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 22435531, '22435531', 'CC', 'HORTENSIA DEL SOCORRO PEREZ VARGAS', 'HORTENSIA DEL SOCORRO PEREZ VARGAS', NULL, NULL, 'F', 'hortensia.perez@esap.edu.co', '3867120', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 22435531 OR p.num_identificacion = '22435531');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'hortensia.perez@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 367.88, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '22435531'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 100. HUGO DANIEL ORTIZ VANEGAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79964723, '79964723', 'CC', 'HUGO DANIEL ORTIZ VANEGAS', 'HUGO DANIEL ORTIZ VANEGAS', NULL, NULL, 'M', 'hugo.ortiz@esap.edu.co', '3112283125', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79964723 OR p.num_identificacion = '79964723');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'hugo.ortiz@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución SC- 865 de 04 de agosto de 2022 Resolución  SC-1441 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 425.36, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '79964723'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 101. ILDEBRANDO AREVALO OSORIO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 16625079, '16625079', 'CC', 'ILDEBRANDO AREVALO OSORIO', 'ILDEBRANDO AREVALO OSORIO', NULL, NULL, 'M', 'ildebrando.arevalo@esap.edu.co', '3155382735', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 16625079 OR p.num_identificacion = '16625079');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'ildebrando.arevalo@esap.edu.co', 'Programas curriculares en relación al perfil académico profesional', 'Resolución  DTV-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 404.04, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '16625079'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 102. JACINTO PINEDA JIMENEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7305383, '7305383', 'CC', 'JACINTO PINEDA JIMENEZ', 'JACINTO PINEDA JIMENEZ', NULL, NULL, 'M', 'jacipine@esap.edu.co', '3112380686', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7305383 OR p.num_identificacion = '7305383');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-07-04', NULL, 40, 'Maestría', 'jacipine@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución  SC-430 de 31 de marzo de 2023 Resolución  SC-1905 de 18 de septiembre de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 429.8, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '7305383'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 103. JAIDER FREDERICH ACOSTA GUZMAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 93397140, '93397140', 'CC', 'JAIDER FREDERICH ACOSTA GUZMAN', 'JAIDER FREDERICH ACOSTA GUZMAN', NULL, NULL, 'M', 'jaider.acosta@esap.edu.co', '3183612227 350244974', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 93397140 OR p.num_identificacion = '93397140');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'jaider.acosta@esap.edu.co', 'Organizaciones Públicas / Derecho Administrativo Y Contratación Estatal', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 309.22, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '93397140'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 104. JAIME ALBERTO GOMEZ WALTEROS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 14256213, '14256213', 'CC', 'JAIME ALBERTO GOMEZ WALTEROS', 'JAIME ALBERTO GOMEZ WALTEROS', NULL, NULL, 'M', 'jaimgome@esap.edu.co', '3175257125', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 14256213 OR p.num_identificacion = '14256213');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'jaimgome@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 460.66, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '14256213'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 105. JAIME MORENO QUIJANO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13834013, '13834013', 'CC', 'JAIME MORENO QUIJANO', 'JAIME MORENO QUIJANO', NULL, NULL, 'M', 'jaimmore@esap.edu.co', '4059699', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13834013 OR p.num_identificacion = '13834013');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jaimmore@esap.edu.co', 'Desarrollo Y Gestión Territorial, Y Gestión Del Desarrollo', 'Resolución  SC-016 de 10 de enero de 2025', 'Docentes Ocasionales vinculados antes del Acuerdo 003/2018 con continuidad en el servicio.', 370.3, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '13834013'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 106. JAIRO ALBERTO DIAZ PINZON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19104732, '19104732', 'CC', 'JAIRO ALBERTO DIAZ PINZON', 'JAIRO ALBERTO DIAZ PINZON', NULL, NULL, 'M', 'jairdiaz@esap.edu.co', '3002676823', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19104732 OR p.num_identificacion = '19104732');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'jairdiaz@esap.edu.co', 'Problemática Pública', 'Resolución  SC-016 de 10 de enero de 2025', 'Docentes Ocasionales vinculados antes del Acuerdo 003/2018 con continuidad en el servicio.', 427.3, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19104732'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 107. JAIRO ELIAS RINCON PACHON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19330343, '19330343', 'CC', 'JAIRO ELIAS RINCON PACHON', 'JAIRO ELIAS RINCON PACHON', NULL, NULL, 'M', 'jairo.rincon@esap.edu.co', '3153348554', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19330343 OR p.num_identificacion = '19330343');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Dedicación Exclusiva. Resol.539 15-04-2024  fortalecerá los procesos académicos y administrativos de los Programas de Posgrado y Pregrado, en el marco del proceso de renovación de registros calificados y adelantará el fortalecimiento del componente de currículo, investigativo y de proyección social de los mismos', 'Dedicación Exclusiva', DATE '2018-08-01', NULL, 40, 'Magister cursando Doctorado', 'jairo.rincon@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución 2740 de 30 de julio de 2018', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 489.72, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19330343'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 108. JAIRO HUMBERTO MUÑOZ CABRERA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1075214369, '1075214369', 'CC', 'JAIRO HUMBERTO MUÑOZ CABRERA', 'JAIRO HUMBERTO MUÑOZ CABRERA', NULL, NULL, 'M', 'jairo.munoz@esap.edu.co', '3203449271', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1075214369 OR p.num_identificacion = '1075214369');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jairo.munoz@esap.edu.co', 'Problemática Del Estado Y Del Poder / Régimenes Y Sistemas Políticos', 'Resolución  DT-15-001 de 16 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 374.6, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '1075214369'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 109. JAIRO VARGAS LEON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13886142, '13886142', 'CC', 'JAIRO VARGAS LEON', 'JAIRO VARGAS LEON', NULL, NULL, 'M', 'jairo.vargas@esap.edu.co', '3005716681', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13886142 OR p.num_identificacion = '13886142');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'jairo.vargas@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 866 de 04 de agosto de 2022 Resolución  SC-1100 de 1 de septiembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 394.2, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '13886142'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 110. JAKELINE VARGAS PARRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 37898365, '37898365', 'CC', 'JAKELINE VARGAS PARRA', 'JAKELINE VARGAS PARRA', NULL, NULL, 'F', 'jakeline.vargas@esap.edu.co', '3103072593', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 37898365 OR p.num_identificacion = '37898365');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Subdirectora Nacional Académica', 'Cargo Directivo', DATE '2022-02-04', NULL, 40, 'Doctorado', 'jakeline.vargas@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-019 de 03 de enero de 2022 Resolución  SC-395 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 401.5, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '37898365'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 111. JAVIER ENRIQUE DE LA HOZ MERCADO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 72158172, '72158172', 'CC', 'JAVIER ENRIQUE DE LA HOZ MERCADO', 'JAVIER ENRIQUE DE LA HOZ MERCADO', NULL, NULL, 'M', 'javier.delahoz@esap.edu.co', '3014737387', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 72158172 OR p.num_identificacion = '72158172');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'javier.delahoz@esap.edu.co', 'Organizaciones Públicas / Gerencia De Los Recursos Físicos Y Financieros', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 406.58, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '72158172'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 112. JAVIER FERMIN GACHARNA MUÑOZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79371959, '79371959', 'CC', 'JAVIER FERMIN GACHARNA MUÑOZ', 'JAVIER FERMIN GACHARNA MUÑOZ', NULL, NULL, 'M', 'javier.gacharna@esap.edu.co', '3196431455', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79371959 OR p.num_identificacion = '79371959');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'javier.gacharna@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución SC- 905 de 04 de agosto de 2022 Resolución  SC-1330 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 440.15, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '79371959'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 113. JEAMMY JULIETH SIERRA HERNANDEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 65630864, '65630864', 'CC', 'JEAMMY JULIETH SIERRA HERNANDEZ', 'JEAMMY JULIETH SIERRA HERNANDEZ', NULL, NULL, 'F', 'jeammy.sierra@esap.edu.co', '3123149131', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 65630864 OR p.num_identificacion = '65630864');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'jeammy.sierra@esap.edu.co', 'Matemáticas, Estadística', 'Resolución No. SC - 1286 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 333.87, 'Satisfactorio 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '65630864'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 114. JENNY ELISA LOPEZ RODRIGUEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52328009, '52328009', 'CC', 'JENNY ELISA LOPEZ RODRIGUEZ', 'JENNY ELISA LOPEZ RODRIGUEZ', NULL, NULL, 'F', 'jenny.lopez@esap.edu.co', '3108547743', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52328009 OR p.num_identificacion = '52328009');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-03-01', NULL, 40, 'Doctorado', 'jenny.lopez@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-020 de 03 de enero de 2022 Resolución  SC-396 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 545.7, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '52328009'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 115. JERSON SANTIAGO ORTEGA BONFANTE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 88241723, '88241723', 'CC', 'JERSON SANTIAGO ORTEGA BONFANTE', 'JERSON SANTIAGO ORTEGA BONFANTE', NULL, NULL, 'M', 'jerson.ortega@esap.edu.co', '3102182665', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 88241723 OR p.num_identificacion = '88241723');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jerson.ortega@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 350.53, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '88241723'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 116. JESUS CAMILO BAUTISTA BELTRAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19089076, '19089076', 'CC', 'JESUS CAMILO BAUTISTA BELTRAN', 'JESUS CAMILO BAUTISTA BELTRAN', NULL, NULL, 'M', 'jesubaut@esap.edu.co', '3103416338', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19089076 OR p.num_identificacion = '19089076');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jesubaut@esap.edu.co', 'Desarrollo Y Gestión Territorial', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 390.14, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19089076'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 117. JESUS EDUARDO BOHORQUEZ MENDEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79875581, '79875581', 'CC', 'JESUS EDUARDO BOHORQUEZ MENDEZ', 'JESUS EDUARDO BOHORQUEZ MENDEZ', NULL, NULL, 'M', 'jesus.bohorquez@esap.edu.co', '3187099760', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79875581 OR p.num_identificacion = '79875581');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jesus.bohorquez@esap.edu.co', 'Gestión Del Desarrollo', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 353.19, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '79875581'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 118. JESUS MARIA MOLINA GIRALDO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79597535, '79597535', 'CC', 'JESUS MARIA MOLINA GIRALDO', 'JESUS MARIA MOLINA GIRALDO', NULL, NULL, 'M', 'jesumoli@esap.edu.co', '3138048218', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79597535 OR p.num_identificacion = '79597535');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2009-05-29', NULL, 40, 'Doctorado', 'jesumoli@esap.edu.co', 'Problemática Pública', 'Resolución 0597 del 29 de mayo de 2009 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 482.557093850739, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79597535'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 119. JESUS PAGUATIAN SANCHEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 98195192, '98195192', 'CC', 'JESUS PAGUATIAN SANCHEZ', 'JESUS PAGUATIAN SANCHEZ', NULL, NULL, 'M', 'jesus.paguatian@esap.edu.co', '3146092068', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 98195192 OR p.num_identificacion = '98195192');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jesus.paguatian@esap.edu.co', 'Economía De Lo Público / Finanzas Públicas Y Presupuesto', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 386.24, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '98195192'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 120. JHON ALEXANDER LOAIZA GONZALEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 9865817, '9865817', 'CC', 'JHON ALEXANDER LOAIZA GONZALEZ', 'JHON ALEXANDER LOAIZA GONZALEZ', NULL, NULL, 'M', 'jhon.loaizag@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 9865817 OR p.num_identificacion = '9865817');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jhon.loaizag@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 350.07, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '9865817'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 121. JHON ALEXANDER MUÑOZ GOMEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 98395604, '98395604', 'CC', 'JHON ALEXANDER MUÑOZ GOMEZ', 'JHON ALEXANDER MUÑOZ GOMEZ', NULL, NULL, 'M', 'alexmuno@esap.edu.co', '3164840044', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 98395604 OR p.num_identificacion = '98395604');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'alexmuno@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 897 de 04 de agosto de 2022 Resolución  SC-1331 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 333.14, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '98395604'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 122. JHON FRANCISCO ABADIA MOYA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 11793482, '11793482', 'CC', 'JHON FRANCISCO ABADIA MOYA', 'JHON FRANCISCO ABADIA MOYA', NULL, NULL, 'M', 'jhon.abadia@esap.edu.co', '3113405273', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 11793482 OR p.num_identificacion = '11793482');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jhon.abadia@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-16 -001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 301.18, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
WHERE p.num_identificacion = '11793482'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 123. JHON FREDY GALVIS PEREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1061691275, '1061691275', 'CC', 'JHON FREDY GALVIS PEREZ', 'JHON FREDY GALVIS PEREZ', NULL, NULL, 'M', 'jhon.galvis@esap.edu.co', '3122521099', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1061691275 OR p.num_identificacion = '1061691275');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jhon.galvis@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 323.49, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '1061691275'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 124. JOAQUIN BELTRAN RADA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 8698150, '8698150', 'CC', 'JOAQUIN BELTRAN RADA', 'JOAQUIN BELTRAN RADA', NULL, NULL, 'M', 'joaquin.beltran@esap.edu.co', '3014588375', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 8698150 OR p.num_identificacion = '8698150');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'joaquin.beltran@esap.edu.co', 'Economía De Lo Público / Política Económica Y Procesos Económicos Territoriales', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 429.81, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '8698150'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 125. JOHN JAIRO CUELLAR ESCOBAR
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79892117, '79892117', 'CC', 'JOHN JAIRO CUELLAR ESCOBAR', 'JOHN JAIRO CUELLAR ESCOBAR', NULL, NULL, 'M', 'johnj.cuellar@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79892117 OR p.num_identificacion = '79892117');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'johnj.cuellar@esap.edu.co', 'Economía de lo público', 'Resolución No. SC - 1287 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 317.17, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79892117'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 126. JONATHAN ALBERTO CERVANTES BARRAZA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1143445332, '1143445332', 'CC', 'JONATHAN ALBERTO CERVANTES BARRAZA', 'JONATHAN ALBERTO CERVANTES BARRAZA', NULL, NULL, 'M', 'jonathan.cervantes@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1143445332 OR p.num_identificacion = '1143445332');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 13/01/2026', 'En Periodo de Prueba', DATE '2025-01-13', DATE '2026-01-13', 40, 'Doctorado', 'jonathan.cervantes@esap.edu.co', 'Ciencias de Datos', 'Resolución No. SC - 2561 del 13 de diciembre de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 448.8599664991625, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '1143445332'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 127. JONNY FERNANDO BARRETO CASTAÑEDA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1022940120, '1022940120', 'CC', 'JONNY FERNANDO BARRETO CASTAÑEDA', 'JONNY FERNANDO BARRETO CASTAÑEDA', NULL, NULL, 'M', 'jonny.barreto@esap.edu.co', '3114623474', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1022940120 OR p.num_identificacion = '1022940120');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Doctorado', 'jonny.barreto@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 869 de 04 de agosto de 2022 Resolución  SC-1442 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 380.78, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '1022940120'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 128. JORGE ELIECER BAUTISTA RODRIGUEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13258907, '13258907', 'CC', 'JORGE ELIECER BAUTISTA RODRIGUEZ', 'JORGE ELIECER BAUTISTA RODRIGUEZ', NULL, NULL, 'M', 'jorge.bautista@esap.edu.co', '3106073597', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13258907 OR p.num_identificacion = '13258907');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jorge.bautista@esap.edu.co', 'Problemática Pública', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Docentes Ocasionales vinculados antes del Acuerdo 003/2018 con continuidad en el servicio.', 372.31, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '13258907'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 129. JORGE ELIECER FERNANDEZ RUBIO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79324341, '79324341', 'CC', 'JORGE ELIECER FERNANDEZ RUBIO', 'JORGE ELIECER FERNANDEZ RUBIO', NULL, NULL, 'M', 'jorgefern@esap.edu.co', '3147293802', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79324341 OR p.num_identificacion = '79324341');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2002-01-11', NULL, 40, 'Doctorado', 'jorgefern@esap.edu.co', 'Estado y Poder', 'Resolución 033 del 11 de enero de 2002 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 471.73, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79324341'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 130. JORGE IVAN MARIN TABORDA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19341050, '19341050', 'CC', 'JORGE IVAN MARIN TABORDA', 'JORGE IVAN MARIN TABORDA', NULL, NULL, 'M', 'ivanmari@esap.edu.co', '3002168789', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19341050 OR p.num_identificacion = '19341050');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-03-21', NULL, 40, 'Doctorado', 'ivanmari@esap.edu.co', 'Problemática Pública', 'Resolución 0266 del 21 de marzo de 2003 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 596.78, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19341050'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 131. JORGE MEJIA TURIZO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19769785, '19769785', 'CC', 'JORGE MEJIA TURIZO', 'JORGE MEJIA TURIZO', NULL, NULL, 'M', 'jorge.mejiat@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19769785 OR p.num_identificacion = '19769785');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'jorge.mejiat@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1288 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 429.33, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '19769785'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 132. JORGE MILTON MATAJIRA VERA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13268293, '13268293', 'CC', 'JORGE MILTON MATAJIRA VERA', 'JORGE MILTON MATAJIRA VERA', NULL, NULL, 'M', 'jorge.matajira@esap.edu.co', '3005622011', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13268293 OR p.num_identificacion = '13268293');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jorge.matajira@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 369.11, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '13268293'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 133. JORGE MORALES PAREDES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80030089, '80030089', 'CC', 'JORGE MORALES PAREDES', 'JORGE MORALES PAREDES', NULL, NULL, 'M', 'jorge.moralesp@esap.edu.co', '3102036877', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80030089 OR p.num_identificacion = '80030089');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'jorge.moralesp@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 870 de 04 de agosto de 2022 Resolución  SC-1326 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 491.57, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '80030089'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 134. JOSE ALDEMAR LOAIZA NARANJO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10283577, '10283577', 'CC', 'JOSE ALDEMAR LOAIZA NARANJO', 'JOSE ALDEMAR LOAIZA NARANJO', NULL, NULL, 'M', 'josea.loaiza@esap.edu.co', '606', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10283577 OR p.num_identificacion = '10283577');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'josea.loaiza@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 288.38, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '10283577'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 135. JOSE ALEJANDRO CUELLAR TOVAR
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 17327246, '17327246', 'CC', 'JOSE ALEJANDRO CUELLAR TOVAR', 'JOSE ALEJANDRO CUELLAR TOVAR', NULL, NULL, 'M', 'josecuel@esap.edu.co', '3108623657', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 17327246 OR p.num_identificacion = '17327246');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'josecuel@esap.edu.co', 'Problemática Pública', 'Resolución  DT-11-002 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 397.8, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '17327246'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 136. JOSE ARMANDO SANTIAGO GARNICA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 316647, '316647', 'CC', 'JOSE ARMANDO SANTIAGO GARNICA', 'JOSE ARMANDO SANTIAGO GARNICA', NULL, NULL, 'M', 'jose.garnica@esap.edu.co', '3052984143', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 316647 OR p.num_identificacion = '316647');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'jose.garnica@esap.edu.co', 'Espacio Tiempo Y Territorio/ Gerencia Social', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 572.28, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '316647'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 137. JOSE DEL CARMEN CORREA ALFONSO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 11385545, '11385545', 'CC', 'JOSE DEL CARMEN CORREA ALFONSO', 'JOSE DEL CARMEN CORREA ALFONSO', NULL, NULL, 'M', 'jose.correa@esap.edu.co', '6018870626', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 11385545 OR p.num_identificacion = '11385545');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Doctorado', 'jose.correa@esap.edu.co', 'Economía De Lo Público', 'Resolución SC- 872 de 04 de agosto de 2022 Resolución  SC-1448 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 478.08, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '11385545'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 138. JOSE ENRIQUE URRESTE CAMPO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 76317298, '76317298', 'CC', 'JOSE ENRIQUE URRESTE CAMPO', 'JOSE ENRIQUE URRESTE CAMPO', NULL, NULL, 'M', 'jose.urreste@esap.edu.co', '3146077694', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 76317298 OR p.num_identificacion = '76317298');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'jose.urreste@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 873 de 04 de agosto de 2022 Resolución  SC-1364 de 2 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 434.59, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '76317298'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 139. JOSE FERNANDO MUÑOZ OSPINA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 75092858, '75092858', 'CC', 'JOSE FERNANDO MUÑOZ OSPINA', 'JOSE FERNANDO MUÑOZ OSPINA', NULL, NULL, 'M', 'jose.fmunoz@esap.edu.co', '8700516', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 75092858 OR p.num_identificacion = '75092858');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'jose.fmunoz@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 874 de 04 de agosto de 2022 Resolución  SC-1433 de 16 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 484.85, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '75092858'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 140. JOSE FRANCISCO PUELLO SOCARRAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79906288, '79906288', 'CC', 'JOSE FRANCISCO PUELLO SOCARRAS', 'JOSE FRANCISCO PUELLO SOCARRAS', NULL, NULL, 'M', 'josepuel@esap.edu.co', '3017427156', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79906288 OR p.num_identificacion = '79906288');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asociado', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2016-05-10', NULL, 40, 'Magister cursando Doctorado', 'josepuel@esap.edu.co', 'Estado y Poder', 'Resolución 1050 del 10 de mayo de 2016 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 641.3399999999999, '0', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79906288'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 141. JOSE GREGORIO SOLORZANO MOVILLA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 72049822, '72049822', 'CC', 'JOSE GREGORIO SOLORZANO MOVILLA', 'JOSE GREGORIO SOLORZANO MOVILLA', NULL, NULL, 'M', 'jose.solorzanom@esap.edu.co', '3022945524', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 72049822 OR p.num_identificacion = '72049822');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'jose.solorzanom@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 875 de 04 de agosto de 2022 Resolución  SC-1354 de 31 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 403.05, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '72049822'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 142. JOSE HONORIO MARTINEZ TORRES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 88198032, '88198032', 'CC', 'JOSE HONORIO MARTINEZ TORRES', 'JOSE HONORIO MARTINEZ TORRES', NULL, NULL, 'M', 'joseh.martinez@esap.edu.co', '3213509914', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 88198032 OR p.num_identificacion = '88198032');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'joseh.martinez@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 468.67, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '88198032'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 143. JOSE LISANDRO BERNAL VELASCO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 93375013, '93375013', 'CC', 'JOSE LISANDRO BERNAL VELASCO', 'JOSE LISANDRO BERNAL VELASCO', NULL, NULL, 'M', 'lisandro.bernal@esap.edu.co', '3153527910', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 93375013 OR p.num_identificacion = '93375013');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'lisandro.bernal@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la Escuela Superior de Administración Pública', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 393.16, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '93375013'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 144. JOSE LUIS SILVA SUAREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 88154191, '88154191', 'CC', 'JOSE LUIS SILVA SUAREZ', 'JOSE LUIS SILVA SUAREZ', NULL, NULL, 'M', 'jose.silvas@esap.edu.co', '3123799593', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 88154191 OR p.num_identificacion = '88154191');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'jose.silvas@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 876 de 04 de agosto de 2022 Resolución  SC-1332 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 371.22, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '88154191'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 145. JOSE MARIA JIMENEZ MUNIVE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 9193183, '9193183', 'CC', 'JOSE MARIA JIMENEZ MUNIVE', 'JOSE MARIA JIMENEZ MUNIVE', NULL, NULL, 'M', 'josemjimenez@esap.edu.co', '6055723186', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 9193183 OR p.num_identificacion = '9193183');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'josemjimenez@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 906 de 04 de agosto de 2022 Resolución  SC-1334 de 27 de octubre de 2023 Inscricipción en escalafón. Traslado Territorial y Núcleo Resolución SC-1319 02 de julio de 2024.', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 485.93, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '9193183'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 146. JOSE MIGUEL MAYORGA GONZALEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1026263695, '1026263695', 'CC', 'JOSE MIGUEL MAYORGA GONZALEZ', 'JOSE MIGUEL MAYORGA GONZALEZ', NULL, NULL, 'M', 'jose.mayorga@esap.edu.co', '3373701', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1026263695 OR p.num_identificacion = '1026263695');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'jose.mayorga@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución SC- 907 de 04 de agosto de 2022 Resolución  SC-1426 de 15 de noviembre de 2023 Inscricipción en escalafón. Traslado Territorial y Núcleo Resolución SC-1319 02 de julio de 2024.', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 515.25, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '1026263695'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 147. JOSE PLACIDO SILVA RUIZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19219489, '19219489', 'CC', 'JOSE PLACIDO SILVA RUIZ', 'JOSE PLACIDO SILVA RUIZ', NULL, NULL, 'M', 'josesilv@esap.edu.co', '3108563858', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19219489 OR p.num_identificacion = '19219489');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-03-21', NULL, 40, 'Doctorado', 'josesilv@esap.edu.co', 'Economía De Lo Público', 'Resolución 0268 del 21 de marzo de 2003 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 653.6600000000001, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19219489'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 148. JOSE RICARDO ALVAREZ PUERTO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79945005, '79945005', 'CC', 'JOSE RICARDO ALVAREZ PUERTO', 'JOSE RICARDO ALVAREZ PUERTO', NULL, NULL, 'M', 'jose.alvarez@esap.edu.co', '3227488093', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79945005 OR p.num_identificacion = '79945005');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'jose.alvarez@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-002 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 352.83, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '79945005'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 149. JOSE ROBERTO CALCETERO GUTIERREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 3152270, '3152270', 'CC', 'JOSE ROBERTO CALCETERO GUTIERREZ', 'JOSE ROBERTO CALCETERO GUTIERREZ', NULL, NULL, 'M', 'jose.calcetero@esap.edu.co', '3183778990', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 3152270 OR p.num_identificacion = '3152270');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'jose.calcetero@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 877 de 04 de agosto de 2022 Resolución  SC-1335 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 543.21, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '3152270'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 150. JOSE YEZID RODRIGUEZ MARTINEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79605682, '79605682', 'CC', 'JOSE YEZID RODRIGUEZ MARTINEZ', 'JOSE YEZID RODRIGUEZ MARTINEZ', NULL, NULL, 'M', 'joseye.rodriguezm@esap.edu.co', '3143510559', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79605682 OR p.num_identificacion = '79605682');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'joseye.rodriguezm@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 342.15, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79605682'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 151. JUAN ARTURO PEÑA LABRADOR
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 12120326, '12120326', 'CC', 'JUAN ARTURO PEÑA LABRADOR', 'JUAN ARTURO PEÑA LABRADOR', NULL, NULL, 'M', 'juan.pena@esap.edu.co', '3158205088', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 12120326 OR p.num_identificacion = '12120326');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'juan.pena@esap.edu.co', 'Problemática del Estado y del Poder / Derechos Constitucional y Organización del Estado', 'Resolución  DT-15-001 de 16 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 291.38, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '12120326'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 152. JUAN CAMILO ZAMBRANO DE LA HOZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1098609912, '1098609912', 'CC', 'JUAN CAMILO ZAMBRANO DE LA HOZ', 'JUAN CAMILO ZAMBRANO DE LA HOZ', NULL, NULL, 'M', 'juan.zambrano@esap.edu.co', '3118229064', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1098609912 OR p.num_identificacion = '1098609912');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'juan.zambrano@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la Escuela Superior de Administración Pública', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 323.42, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '1098609912'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 153. JUAN CARLOS CASTRO BAÑOS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 9312525, '9312525', 'CC', 'JUAN CARLOS CASTRO BAÑOS', 'JUAN CARLOS CASTRO BAÑOS', NULL, NULL, 'M', 'juan.castro@esap.edu.co', '3154429818', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 9312525 OR p.num_identificacion = '9312525');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Magister cursando Doctorado', 'juan.castro@esap.edu.co', 'Gestión Del Desarrollo / Teorias Y Enfoques Del Desarrollo Y Enfoques Del Desarrollo Territorial', 'Resolución  DTV-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 345.89, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '9312525'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 154. JUAN CARLOS CORREA GÓMEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 6774044, '6774044', 'CC', 'JUAN CARLOS CORREA GÓMEZ', 'JUAN CARLOS CORREA GÓMEZ', NULL, NULL, 'M', 'juan.correa@esap.edu.co', '3102874577', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 6774044 OR p.num_identificacion = '6774044');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 03/07/2026', 'En Periodo de Prueba', DATE '2025-07-03', DATE '2026-07-03', 40, 'Maestría', 'juan.correa@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución  SC-603 de 11 de abril de 2025 Acta de posesión No.157 03/07/2025', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 339.87, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '6774044'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 155. JUAN CARLOS GONZALEZ VILLA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 17349972, '17349972', 'CC', 'JUAN CARLOS GONZALEZ VILLA', 'JUAN CARLOS GONZALEZ VILLA', NULL, NULL, 'M', 'juan.gonzalez@esap.edu.co', '3202710153', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 17349972 OR p.num_identificacion = '17349972');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'juan.gonzalez@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-11-002 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 357, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '17349972'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 156. JUAN CARLOS QUINTERO CALVACHE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 16791253, '16791253', 'CC', 'JUAN CARLOS QUINTERO CALVACHE', 'JUAN CARLOS QUINTERO CALVACHE', NULL, NULL, 'M', 'juan.quinteroc@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 16791253 OR p.num_identificacion = '16791253');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'juan.quinteroc@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1289 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 542.13, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '16791253'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 157. JUAN CARLOS ZAPATA MARIN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10136330, '10136330', 'CC', 'JUAN CARLOS ZAPATA MARIN', 'JUAN CARLOS ZAPATA MARIN', NULL, NULL, 'M', 'juan.zapata@esap.edu.co', '3409420  PEREIRA', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10136330 OR p.num_identificacion = '10136330');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'juan.zapata@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 266.69, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '10136330'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 158. JUAN DE JESUS SANDOVAL
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 8046106, '8046106', 'CC', 'JUAN DE JESUS SANDOVAL', 'JUAN DE JESUS SANDOVAL', NULL, NULL, 'M', 'juanj.sandoval@esap.edu.co', '3023209488', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 8046106 OR p.num_identificacion = '8046106');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'juanj.sandoval@esap.edu.co', 'Ciencias de Datos', 'Resolución  SC-021 de 03 de enero de 2022 Resolución  SC-397 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 538.75, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '8046106'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 159. JULIAN CAMILO BARRETO GARCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 74085446, '74085446', 'CC', 'JULIAN CAMILO BARRETO GARCIA', 'JULIAN CAMILO BARRETO GARCIA', NULL, NULL, 'M', 'julian.barreto@esap.edu.co', '3008287876', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 74085446 OR p.num_identificacion = '74085446');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'En comisión de Estudios. Resol. 2120 16-10-2024 Doctorado en Geografía - UPTC. De 2024-2 a 2026-1', 'Comisión de Estudios', DATE '2022-02-01', NULL, 40, 'Maestría', 'julian.barreto@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-022 de 03 de enero de 2022 Resolución  SC-398 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 362.14, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '74085446'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 160. JULIAN FELIPE BELLO LOPEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1075232907, '1075232907', 'CC', 'JULIAN FELIPE BELLO LOPEZ', 'JULIAN FELIPE BELLO LOPEZ', NULL, NULL, 'M', 'julian.lopez@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1075232907 OR p.num_identificacion = '1075232907');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'julian.lopez@esap.edu.co', 'Economía de lo Público', 'Resolución No. SC - 1290 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 275.99, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '1075232907'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 161. JULIETH KARINA ROJAS GRANADOS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1057587472, '1057587472', 'CC', 'JULIETH KARINA ROJAS GRANADOS', 'JULIETH KARINA ROJAS GRANADOS', NULL, NULL, 'F', 'julieth.rojas@esap.edu.co', '3133369826', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1057587472 OR p.num_identificacion = '1057587472');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'julieth.rojas@esap.edu.co', 'Problemática Del Estado Y Del Poder', 'Resolución  DT-08-003 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 326.51, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '1057587472'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 162. JULIO CESAR CARO MORENO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7179463, '7179463', 'CC', 'JULIO CESAR CARO MORENO', 'JULIO CESAR CARO MORENO', NULL, NULL, 'M', 'julio.caro@esap.edu.co', '3114421730', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7179463 OR p.num_identificacion = '7179463');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'julio.caro@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución  SC-023 de 03 de enero de 2022 Resolución  SC-399 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 539.29, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '7179463'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 163. JULIO CESAR CORTES MUÑOZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80422411, '80422411', 'CC', 'JULIO CESAR CORTES MUÑOZ', 'JULIO CESAR CORTES MUÑOZ', NULL, NULL, 'M', 'julio.cortes@esap.edu.co', '3005562737', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80422411 OR p.num_identificacion = '80422411');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'julio.cortes@esap.edu.co', 'Programas Curriculares De Posgrado', 'Resolución  SC-016 de 10 de enero de 2025', 'Docentes Ocasionales vinculados antes del Acuerdo 003/2018 con continuidad en el servicio.', 358.3, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '80422411'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 164. JULIO CESAR VASQUEZ FIGUEROA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 93285031, '93285031', 'CC', 'JULIO CESAR VASQUEZ FIGUEROA', 'JULIO CESAR VASQUEZ FIGUEROA', NULL, NULL, 'M', 'julio.vasquez@esap.edu.co', '3153605344', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 93285031 OR p.num_identificacion = '93285031');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'julio.vasquez@esap.edu.co', 'Organizaciones Públicas', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 390.78, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '93285031'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 165. JULIO SIMON ESCOBAR OSTOS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 17592981, '17592981', 'CC', 'JULIO SIMON ESCOBAR OSTOS', 'JULIO SIMON ESCOBAR OSTOS', NULL, NULL, 'M', 'julios.escobar@esap.edu.co', '3144046448', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 17592981 OR p.num_identificacion = '17592981');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'julios.escobar@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 278.88, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '17592981'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 166. KARIM LORENA RAMIREZ PARRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52880332, '52880332', 'CC', 'KARIM LORENA RAMIREZ PARRA', 'KARIM LORENA RAMIREZ PARRA', NULL, NULL, 'F', 'karim.ramirez@esap.edu.co', '3134168578', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52880332 OR p.num_identificacion = '52880332');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'karim.ramirez@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 363.06, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '52880332'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 167. KRUPSCAIA ROIMA STERLING SANCHEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 66986551, '66986551', 'CC', 'KRUPSCAIA ROIMA STERLING SANCHEZ', 'KRUPSCAIA ROIMA STERLING SANCHEZ', NULL, NULL, 'F', 'info@krupscaiasterling.com', '3164455715', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 66986551 OR p.num_identificacion = '66986551');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'info@krupscaiasterling.com', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DTV-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 376.6, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '66986551'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 168. LADY ANDREA SUAREZ CARVAJAL
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 53045417, '53045417', 'CC', 'LADY ANDREA SUAREZ CARVAJAL', 'LADY ANDREA SUAREZ CARVAJAL', NULL, NULL, 'F', 'lady.suarez@esap.edu.co', '3134029232', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 53045417 OR p.num_identificacion = '53045417');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'lady.suarez@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución  SC-432 de 31 de marzo de 2023 Acta de posesión No.130 05/05/2023 Resolución  SC-1563 de 1 de agosto de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 366.95, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '53045417'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 169. LADY CAROLINA BAYONA ESTUPIÑAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 33377124, '33377124', 'CC', 'LADY CAROLINA BAYONA ESTUPIÑAN', 'LADY CAROLINA BAYONA ESTUPIÑAN', NULL, NULL, 'F', 'carolina.bayona@esap.edu.co', '3153400566', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 33377124 OR p.num_identificacion = '33377124');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'carolina.bayona@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 878 de 04 de agosto de 2022 Resolución  SC-1462 de 21 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 352.44, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '33377124'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 170. LEANDRO GONZALEZ TAMARA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79599981, '79599981', 'CC', 'LEANDRO GONZALEZ TAMARA', 'LEANDRO GONZALEZ TAMARA', NULL, NULL, 'M', 'leandrog.tamara@esap.edu.co', '3005533459', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79599981 OR p.num_identificacion = '79599981');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-12-01', NULL, 40, 'Maestría', 'leandrog.tamara@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 879 de 04 de agosto de 2022 Resolución  SC-243 de 21 de febrero de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 428.06, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '79599981'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 171. LEIDY JOHANA ARIZA MARIN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1121883040, '1121883040', 'CC', 'LEIDY JOHANA ARIZA MARIN', 'LEIDY JOHANA ARIZA MARIN', NULL, NULL, 'F', 'leidy.ariza@esap.edu.co', '3115225102', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1121883040 OR p.num_identificacion = '1121883040');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'leidy.ariza@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución  SC-433 de 31 de marzo de 2023 Acta de posesión No.129 05/05/2023 Resolución  SC-1564 de 1 de agosto de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 420.95, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '1121883040'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 172. LEONARDO FABIO MEDINA ORTIZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7730723, '7730723', 'CC', 'LEONARDO FABIO MEDINA ORTIZ', 'LEONARDO FABIO MEDINA ORTIZ', NULL, NULL, 'M', 'leonardo.medina@esap.edu.co', '6088741360', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7730723 OR p.num_identificacion = '7730723');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'leonardo.medina@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-15-001 de 16 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 345.49, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '7730723'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 173. LIDA PATRICIA RIVILLAS VALENCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 30357940, '30357940', 'CC', 'LIDA PATRICIA RIVILLAS VALENCIA', 'LIDA PATRICIA RIVILLAS VALENCIA', NULL, NULL, 'F', 'lida.rivillas@esap.edu.co', '3147434610', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 30357940 OR p.num_identificacion = '30357940');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'lida.rivillas@esap.edu.co', 'Problematica Del Estado Y Del Poder', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 347.24, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '30357940'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 174. LORENZO ANTONIO NOGUERA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 76295624, '76295624', 'CC', 'LORENZO ANTONIO NOGUERA', 'LORENZO ANTONIO NOGUERA', NULL, NULL, 'M', 'lorenzo.noguera@esap.edu.co', 'Popayán Cauca 833304', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 76295624 OR p.num_identificacion = '76295624');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'lorenzo.noguera@esap.edu.co', 'Problemática Del Estado Y Del Poder / Derechos Constitucional Y Organización Del Estado', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 398.64, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '76295624'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 175. LUIS ALBERTO GALEANO ESCUCHA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1023861638, '1023861638', 'CC', 'LUIS ALBERTO GALEANO ESCUCHA', 'LUIS ALBERTO GALEANO ESCUCHA', NULL, NULL, 'M', 'luis.galeano@esap.edu.co', '3004607434', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1023861638 OR p.num_identificacion = '1023861638');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'luis.galeano@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 331.9, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '1023861638'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 176. LUIS ALFONSO SANCHEZ CARDONA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10232357, '10232357', 'CC', 'LUIS ALFONSO SANCHEZ CARDONA', 'LUIS ALFONSO SANCHEZ CARDONA', NULL, NULL, 'M', 'luis.sanchez@esap.edu.co', '3155135988', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10232357 OR p.num_identificacion = '10232357');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'luis.sanchez@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-03-001 de 31 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 342.41, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '10232357'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 177. LUIS CARLOS TORO MARULANDA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 75065064, '75065064', 'CC', 'LUIS CARLOS TORO MARULANDA', 'LUIS CARLOS TORO MARULANDA', NULL, NULL, 'M', 'luisc.toro@esap.edu.co', '3006113252', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 75065064 OR p.num_identificacion = '75065064');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'luisc.toro@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-002 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 444.55, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '75065064'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 178. LUIS EDUARDO AMADOR CABRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19397995, '19397995', 'CC', 'LUIS EDUARDO AMADOR CABRA', 'LUIS EDUARDO AMADOR CABRA', NULL, NULL, 'M', 'luis.amador@esap.edu.co', '3164662154', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19397995 OR p.num_identificacion = '19397995');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2014-09-16', NULL, 40, 'Doctorado', 'luis.amador@esap.edu.co', 'Economía De Lo Público', 'Resolución 1704 del 16 de septiembre de 2014 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 535.25, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '19397995'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 179. LUIS EDUARDO TORRES GALVIS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 91228769, '91228769', 'CC', 'LUIS EDUARDO TORRES GALVIS', 'LUIS EDUARDO TORRES GALVIS', NULL, NULL, 'M', 'luise.torres@esap.edu.co', '3108698087', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 91228769 OR p.num_identificacion = '91228769');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'luise.torres@esap.edu.co', 'Espacio, Tiempo Y Territorio', 'Resolución  DT-5-001 de 16 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 363, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '91228769'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 180. LUIS FERNANDO MACEA MERCADO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7368608, '7368608', 'CC', 'LUIS FERNANDO MACEA MERCADO', 'LUIS FERNANDO MACEA MERCADO', NULL, NULL, 'M', 'luis.macea@esap.edu.co', '3178439317', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7368608 OR p.num_identificacion = '7368608');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Doctorado', 'luis.macea@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 880 de 04 de agosto de 2022 Resolución  SC-1449 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 634.37, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '7368608'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 181. LUIS HERNANDO DURAN ANTOLINEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13246085, '13246085', 'CC', 'LUIS HERNANDO DURAN ANTOLINEZ', 'LUIS HERNANDO DURAN ANTOLINEZ', NULL, NULL, 'M', 'luis.duran@esap.edu.co', '3173796217', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13246085 OR p.num_identificacion = '13246085');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'luis.duran@esap.edu.co', 'Problematica Del Estado Y Del Poder', 'Resolución  DT-13-002 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 341.08, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '13246085'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 182. LUIS JAIR PACHECO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19472887, '19472887', 'CC', 'LUIS JAIR PACHECO', 'LUIS JAIR PACHECO', NULL, NULL, 'M', 'luis.pacheco@esap.edu.co', '3166839303', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19472887 OR p.num_identificacion = '19472887');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Magister cursando Doctorado', 'luis.pacheco@esap.edu.co', 'Organizaciones Públicas', 'Resolución  DT-03-001 de 31 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 349.8, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '19472887'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 183. LUIS MIGUEL CABRERA GONZALEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 12126186, '12126186', 'CC', 'LUIS MIGUEL CABRERA GONZALEZ', 'LUIS MIGUEL CABRERA GONZALEZ', NULL, NULL, 'M', 'luis.cabrera@esap.edu.co', '3138710054', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 12126186 OR p.num_identificacion = '12126186');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Director Técnico de Entornos Virtuales', 'Cargo Directivo', DATE '2022-09-01', NULL, 40, 'Magister cursando Doctorado', 'luis.cabrera@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 881 de 04 de agosto de 2022 Resolución  SC-1463 de 21 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 367.19, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '12126186'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 184. LUIS NELSON BELTRAN MORA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79242932, '79242932', 'CC', 'LUIS NELSON BELTRAN MORA', 'LUIS NELSON BELTRAN MORA', NULL, NULL, 'M', 'luis.beltran@esap.edu.co', '3158786764', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79242932 OR p.num_identificacion = '79242932');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asociado', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2016-05-10', NULL, 40, 'Doctorado', 'luis.beltran@esap.edu.co', 'Economía De Lo Público', 'Resolucion 1051 del 10 de mayo de 2016 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 662.14, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79242932'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 185. LUZ ADRIANA MEJIA ALVAREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 24623457, '24623457', 'CC', 'LUZ ADRIANA MEJIA ALVAREZ', 'LUZ ADRIANA MEJIA ALVAREZ', NULL, NULL, 'F', 'luz.mejia@esap.edu.co', '3102548810', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 24623457 OR p.num_identificacion = '24623457');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2019-01-09', NULL, 40, 'Doctorado', 'luz.mejia@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución 2740 de 30 de julio de 2018. Resolución 3125 de 28 de agosto de 2018 Prorroga toma de posesión', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 435.27, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '24623457'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 186. LUZ STELLA SANTAMARIA DE FUENTES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 40008425, '40008425', 'CC', 'LUZ STELLA SANTAMARIA DE FUENTES', 'LUZ STELLA SANTAMARIA DE FUENTES', NULL, NULL, 'F', 'luz.santamaria@esap.edu.co', '3004600217', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 40008425 OR p.num_identificacion = '40008425');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'luz.santamaria@esap.edu.co', 'Organizaciones Públicas / Gerencia Pública Integral', 'Resolución  DTV-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 311.82, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '40008425'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 187. LYDA MARCELA HERRERA CAMARGO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52845106, '52845106', 'CC', 'LYDA MARCELA HERRERA CAMARGO', 'LYDA MARCELA HERRERA CAMARGO', NULL, NULL, 'F', 'lydam.herrera@esap.edu.co', '3235793791', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52845106 OR p.num_identificacion = '52845106');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-22', DATE '2025-12-17', 40, 'Maestría', 'lydam.herrera@esap.edu.co', 'Programas curriculares en relación al perfil académico profesional', 'Resolución  DT-1-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 340.83, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '52845106'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 188. MANUEL BAYONA SARMIENTO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 91177397, '91177397', 'CC', 'MANUEL BAYONA SARMIENTO', 'MANUEL BAYONA SARMIENTO', NULL, NULL, 'M', 'manubayo@esap.edu.co', '3133338044', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 91177397 OR p.num_identificacion = '91177397');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Dedicación Exclusiva. Resol.2313 20-11-2024  Líder MAP Distancia', 'Dedicación Exclusiva', DATE '2022-02-01', NULL, 40, 'Maestría', 'manubayo@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución  SC-024 de 03 de enero de 2022 Resolución  SC-400 de 31 de marzo de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 482.27, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '91177397'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 189. MANUEL ENRIQUE ANDRADE CUESTA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 11793112, '11793112', 'CC', 'MANUEL ENRIQUE ANDRADE CUESTA', 'MANUEL ENRIQUE ANDRADE CUESTA', NULL, NULL, 'M', 'manuel.andrade@esap.edu.co', '3128516730', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 11793112 OR p.num_identificacion = '11793112');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'manuel.andrade@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-16 -001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 506.42, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
WHERE p.num_identificacion = '11793112'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 190. MANUEL ESTEBAN PERALTA MATOS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 73103013, '73103013', 'CC', 'MANUEL ESTEBAN PERALTA MATOS', 'MANUEL ESTEBAN PERALTA MATOS', NULL, NULL, 'M', 'manuel.peralta@esap.edu.co', '3014752233', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 73103013 OR p.num_identificacion = '73103013');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'manuel.peralta@esap.edu.co', 'Gestion Del Desarrollo       -   Planeacion Del Desarrollo-  Proyecto Futuro', 'Resolución  DT-7-003 de 20 de enero  de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 391.45, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '73103013'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 191. MANUEL RICARDO CONTENTO RUBIO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79398773, '79398773', 'CC', 'MANUEL RICARDO CONTENTO RUBIO', 'MANUEL RICARDO CONTENTO RUBIO', NULL, NULL, 'M', 'manuel.contento@esap.edu.co', '3203184082', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79398773 OR p.num_identificacion = '79398773');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Especial', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'manuel.contento@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la Escuela Superior de Administración Pública', 'Resolución  SC-017 de 10 de enero de 2025', 'Aprobado por el Consejo Académico Nacional', 298.74, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79398773'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 192. MARA LUZ AMADOR GIL
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 45502716, '45502716', 'CC', 'MARA LUZ AMADOR GIL', 'MARA LUZ AMADOR GIL', NULL, NULL, 'F', 'mara.amador@esap.edu.co', '3107213049', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 45502716 OR p.num_identificacion = '45502716');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'mara.amador@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-7-003 de 20 de enero  de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 387.59, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '45502716'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 193. MARCELA BIBIANA GUERRERO ROJAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52211659, '52211659', 'CC', 'MARCELA BIBIANA GUERRERO ROJAS', 'MARCELA BIBIANA GUERRERO ROJAS', NULL, NULL, 'F', 'marcela.guerrero@esap.edu.co', '3016443574', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52211659 OR p.num_identificacion = '52211659');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 21/11/2025', 'En Periodo de Prueba', DATE '2024-11-21', DATE '2025-11-21', 40, 'Maestría', 'marcela.guerrero@esap.edu.co', 'Desarrollo y Gestion Territorial', 'Resolución No. SC - 1292 de 27-06-2024. Acta de posesión No.427 de 21-11-2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 325.82, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '52211659'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 194. MARGARITA ROSA MEDINA VARGAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 41689316, '41689316', 'CC', 'MARGARITA ROSA MEDINA VARGAS', 'MARGARITA ROSA MEDINA VARGAS', NULL, NULL, 'F', 'margarita.medina@esap.edu.co', '3133014987', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 41689316 OR p.num_identificacion = '41689316');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Especial', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'margarita.medina@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la Escuela Superior de Administración Pública', 'Resolución  SC-017 de 10 de enero de 2025', 'Aprobado por el Consejo Académico Nacional', 485.54, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '41689316'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 195. MARIA CAROLINA HERNANDEZ LOSADA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1010179454, '1010179454', 'CC', 'MARIA CAROLINA HERNANDEZ LOSADA', 'MARIA CAROLINA HERNANDEZ LOSADA', NULL, NULL, 'F', 'maria.hernandezl@esap.edu.co', '3172770274', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1010179454 OR p.num_identificacion = '1010179454');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'maria.hernandezl@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 431.35, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '1010179454'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 196. MARIA DEL PILAR SANCHEZ MUÑOZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52262920, '52262920', 'CC', 'MARIA DEL PILAR SANCHEZ MUÑOZ', 'MARIA DEL PILAR SANCHEZ MUÑOZ', NULL, NULL, 'F', 'mariap.sanchez@esap.edu.co', '3157972968', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52262920 OR p.num_identificacion = '52262920');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-12-02', NULL, 40, 'Doctorado', 'mariap.sanchez@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 882 de 04 de agosto de 2022 Resolución  SC-241 de 21 de febrero de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 601.77, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '52262920'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 197. MARIA ELVIA MONCADA MARROQUIN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 38260151, '38260151', 'CC', 'MARIA ELVIA MONCADA MARROQUIN', 'MARIA ELVIA MONCADA MARROQUIN', NULL, NULL, 'F', 'mariae.moncada@esap.edu.co', '3158489727', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 38260151 OR p.num_identificacion = '38260151');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'mariae.moncada@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 421.38, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '38260151'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 198. MARIA EUNICE QUIÑONEZ VARON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 38249429, '38249429', 'CC', 'MARIA EUNICE QUIÑONEZ VARON', 'MARIA EUNICE QUIÑONEZ VARON', NULL, NULL, 'F', 'maria.quinonez@esap.edu.co', '2647410', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 38249429 OR p.num_identificacion = '38249429');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'maria.quinonez@esap.edu.co', 'Gestión Para El Desarrollo', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 309.4, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '38249429'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 199. MARIA FERNANDA PERALTA GOYES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 25284513, '25284513', 'CC', 'MARIA FERNANDA PERALTA GOYES', 'MARIA FERNANDA PERALTA GOYES', NULL, NULL, 'F', 'maria.peralta@esap.edu.co', '3116449403', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 25284513 OR p.num_identificacion = '25284513');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'maria.peralta@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la ESAP', 'Resolución  DT-10-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 317.33, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '25284513'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 200. MARIA LUCIA SIERRA SIERRA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 37316122, '37316122', 'CC', 'MARIA LUCIA SIERRA SIERRA', 'MARIA LUCIA SIERRA SIERRA', NULL, NULL, 'F', 'mariasier@esap.edu.co', '3005777263', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 37316122 OR p.num_identificacion = '37316122');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'mariasier@esap.edu.co', 'Espacio, Tiempo Y Territorio', 'Resolución  DT-5-001 de 16 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 381.18, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '37316122'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 201. MARINO RENGIFO GARCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 16783250, '16783250', 'CC', 'MARINO RENGIFO GARCIA', 'MARINO RENGIFO GARCIA', NULL, NULL, 'M', 'marino.rengifo@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 16783250 OR p.num_identificacion = '16783250');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'marino.rengifo@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución No. SC - 1293 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 340.12, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '16783250'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 202. MARIO DE JESUS ZAMBRANO MIRANDA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 85167270, '85167270', 'CC', 'MARIO DE JESUS ZAMBRANO MIRANDA', 'MARIO DE JESUS ZAMBRANO MIRANDA', NULL, NULL, 'M', 'mario.zambrano@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 85167270 OR p.num_identificacion = '85167270');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-18', DATE '2025-07-18', 40, 'Maestría', 'mario.zambrano@esap.edu.co', 'Economía De Lo Público', 'Resolución No. SC - 1294 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 426.85, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NORTE DE SANTANDER')
WHERE p.num_identificacion = '85167270'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 203. MARTHA LILIANA LEAL PULIDO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 65745784, '65745784', 'CC', 'MARTHA LILIANA LEAL PULIDO', 'MARTHA LILIANA LEAL PULIDO', NULL, NULL, 'F', 'marthal.lealp@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 65745784 OR p.num_identificacion = '65745784');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'marthal.lealp@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la Escuela Superior de Administración Pública', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 319.69, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '65745784'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 204. MARTHA PATRICIA VIVES HURTADO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52083740, '52083740', 'CC', 'MARTHA PATRICIA VIVES HURTADO', 'MARTHA PATRICIA VIVES HURTADO', NULL, NULL, 'F', 'martha.vives@esap.edu.co', '3203494006', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52083740 OR p.num_identificacion = '52083740');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Decana de Posgrados Resol. 1065 de 24-06-2025', 'Cargo Directivo', DATE '2022-09-01', NULL, 40, 'Doctorado', 'martha.vives@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución SC- 883 de 04 de agosto de 2022 Resolución  SC-1645 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 518.74, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '52083740'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 205. MARY CRUZ ORTEGA HERNANDEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 32939973, '32939973', 'CC', 'MARY CRUZ ORTEGA HERNANDEZ', 'MARY CRUZ ORTEGA HERNANDEZ', NULL, NULL, 'F', 'mary.ortega@esap.edu.co', '3238470820', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 32939973 OR p.num_identificacion = '32939973');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'mary.ortega@esap.edu.co', 'Desarrollo y Gestion Territorial', 'Resolución No. SC - 1295 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 370.35, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '32939973'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 206. MAURICIO JAIMES ROA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13536151, '13536151', 'CC', 'MAURICIO JAIMES ROA', 'MAURICIO JAIMES ROA', NULL, NULL, 'M', 'mauricio.jaimes@esap.edu.co', '3172360969', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13536151 OR p.num_identificacion = '13536151');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'En comisión de Estudios. Resol. 432 26-03-2025 Doctorado en Ciencias Contables - U.Andes. De 2025-1 a 2025-2', 'Comisión de Estudios', DATE '2022-08-05', NULL, 40, 'Maestría', 'mauricio.jaimes@esap.edu.co', 'Economía De Lo Público', 'Resolución SC- 874 de 04 de agosto de 2022 Resolución  SC-1333 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 352.52, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SANTANDER')
WHERE p.num_identificacion = '13536151'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 207. MAURICIO JAVIER LUNA GALVAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 15372806, '15372806', 'CC', 'MAURICIO JAVIER LUNA GALVAN', 'MAURICIO JAVIER LUNA GALVAN', NULL, NULL, 'M', 'mauricioj.luna@esap.edu.co', '3008266929', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 15372806 OR p.num_identificacion = '15372806');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'mauricioj.luna@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-434 de 31 de marzo de 2023 Acta de posesión No.128 05/05/2023 Resolución  SC-1904 de 18 de septiembre de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 306.43, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '15372806'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 208. MAURICIO TELLEZ VERA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79360500, '79360500', 'CC', 'MAURICIO TELLEZ VERA', 'MAURICIO TELLEZ VERA', NULL, NULL, 'M', 'mauricio.tellez@esap.edu.co', '3172861709', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79360500 OR p.num_identificacion = '79360500');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Magister cursando Doctorado', 'mauricio.tellez@esap.edu.co', 'Programas curriculares en relación al perfil académico profesional', 'Resolución  DT-03-001 de 31 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 437.41, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '79360500'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 209. MIGUEL ANTONIO BORJA ALARCON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 6280534, '6280534', 'CC', 'MIGUEL ANTONIO BORJA ALARCON', 'MIGUEL ANTONIO BORJA ALARCON', NULL, NULL, 'M', 'miguel.borja@esap.edu.co', '3005502152', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 6280534 OR p.num_identificacion = '6280534');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '1999-01-26', NULL, 40, 'Doctorado', 'miguel.borja@esap.edu.co', 'Estado y Poder', 'Resolución 048 del 26 de enero de 1999 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 699.27, '0', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '6280534'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 210. MIRIAM LUCIA FLOREZ VILLOTA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 30736303, '30736303', 'CC', 'MIRIAM LUCIA FLOREZ VILLOTA', 'MIRIAM LUCIA FLOREZ VILLOTA', NULL, NULL, 'F', 'myriam.florez@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 30736303 OR p.num_identificacion = '30736303');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'myriam.florez@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1296 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 377.82, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '30736303'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 211. MONICA PATRICIA FORTICH NAVARRO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 45506970, '45506970', 'CC', 'MONICA PATRICIA FORTICH NAVARRO', 'MONICA PATRICIA FORTICH NAVARRO', NULL, NULL, 'F', 'monica.fortich@esap.edu.co', '3143438582', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 45506970 OR p.num_identificacion = '45506970');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'monica.fortich@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 885 de 04 de agosto de 2022 Resolución  SC-1318 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 423.46, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '45506970'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 212. NADIN ANDRES MADERA ARIAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1102853186, '1102853186', 'CC', 'NADIN ANDRES MADERA ARIAS', 'NADIN ANDRES MADERA ARIAS', NULL, NULL, 'M', 'nadin.madderaa@esap.edu.co', '3233621817', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1102853186 OR p.num_identificacion = '1102853186');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 13/01/2026', 'En Periodo de Prueba', DATE '2025-01-13', DATE '2026-01-13', 40, 'Maestría', 'nadin.madderaa@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC 2580 de 17 de diciembre de 2024. Acta de Posesión No.02 de 13-01-2025', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 295.26, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '1102853186'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 213. NAIDU DUQUE CANTE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52337063, '52337063', 'CC', 'NAIDU DUQUE CANTE', 'NAIDU DUQUE CANTE', NULL, NULL, 'F', 'naidu.duque@esap.edu.co', '3108648846', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52337063 OR p.num_identificacion = '52337063');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asociado', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2018-08-01', NULL, 40, 'Doctorado', 'naidu.duque@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución 2740 de 30 de julio de 2018. Resolución 1638 de 13 de diciembre de 2023 Ascenso de Asistente a Asociado.', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 436.7, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '52337063'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 214. NATHALY BURBANO MUÑOZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52717747, '52717747', 'CC', 'NATHALY BURBANO MUÑOZ', 'NATHALY BURBANO MUÑOZ', NULL, NULL, 'F', 'nathaly.burbano@esap.edu.co', '3014706865', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52717747 OR p.num_identificacion = '52717747');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Decana Pregrados(e) Resolución SC.199 de 12-02-2024', 'Cargo Directivo', DATE '2022-02-01', NULL, 40, 'Doctorado', 'nathaly.burbano@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-025 de 03 de enero de 2022 Resolución  SC-401 de 31 de marzo de 2023 Inscricipción en escalafón. Resolución  SC-1651 de 13 de diciembre de 2023 categoría Titular', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 460.86, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '52717747'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 215. NEISE VANEGAS NIETO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 51804365, '51804365', 'CC', 'NEISE VANEGAS NIETO', 'NEISE VANEGAS NIETO', NULL, NULL, 'F', 'neise.vanegas@esap.edu.co', '3104384257', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 51804365 OR p.num_identificacion = '51804365');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'neise.vanegas@esap.edu.co', 'Formación General', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 443.42, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '51804365'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 216. NELSON ANDRES MONTERO RAMIREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7178602, '7178602', 'CC', 'NELSON ANDRES MONTERO RAMIREZ', 'NELSON ANDRES MONTERO RAMIREZ', NULL, NULL, 'M', 'nelson.montero@esap.edu.co', '3114424514', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7178602 OR p.num_identificacion = '7178602');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'nelson.montero@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-08-003 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 333.03, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '7178602'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 217. NELSON DARIO RINCON GARCIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80271530, '80271530', 'CC', 'NELSON DARIO RINCON GARCIA', 'NELSON DARIO RINCON GARCIA', NULL, NULL, 'M', 'nelsrinc@esap.edu.co', '3204967570', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80271530 OR p.num_identificacion = '80271530');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2008-12-19', NULL, 40, 'Especialización', 'nelsrinc@esap.edu.co', 'Estado y Poder', 'Resolucion 2053 del 19 de diciembre de 2008 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 337.8, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '80271530'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 218. NELSON ORLANDO NARVAEZ MORA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 87100191, '87100191', 'CC', 'NELSON ORLANDO NARVAEZ MORA', 'NELSON ORLANDO NARVAEZ MORA', NULL, NULL, 'M', 'nelson.narvaez@esap.edu.co', '3017833746', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 87100191 OR p.num_identificacion = '87100191');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'nelson.narvaez@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 886 de 04 de agosto de 2022 Resolución  SC-1443 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 350.74, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '87100191'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 219. NESTOR ORLANDO AVILA CORTES
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79122843, '79122843', 'CC', 'NESTOR ORLANDO AVILA CORTES', 'NESTOR ORLANDO AVILA CORTES', NULL, NULL, 'M', 'nestor.avila@esap.edu.co', '314 3327399', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79122843 OR p.num_identificacion = '79122843');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Maestría', 'nestor.avila@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 887 de 04 de agosto de 2022 Resolución  SC-1647 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 313.29, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '79122843'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 220. OMAR REY ANACONA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 86044754, '86044754', 'CC', 'OMAR REY ANACONA', 'OMAR REY ANACONA', NULL, NULL, 'M', 'omar.rey@esap.edu.co', '3112574480', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 86044754 OR p.num_identificacion = '86044754');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2018-08-01', NULL, 40, 'Doctorado', 'omar.rey@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución 2779 de 01 de agosto de 2018', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 505.38, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '86044754'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 221. ONASIS RAFAEL ORTEGA NARVAEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 15030163, '15030163', 'CC', 'ONASIS RAFAEL ORTEGA NARVAEZ', 'ONASIS RAFAEL ORTEGA NARVAEZ', NULL, NULL, 'M', 'onasis.ortega@esap.edu.co', '3145921291', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 15030163 OR p.num_identificacion = '15030163');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'onasis.ortega@esap.edu.co', 'Problemática Pública', 'Resolución  DTV-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 496.76, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('VALLE')
WHERE p.num_identificacion = '15030163'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 222. ORLANDO ACUÑA ANGULO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 14271071, '14271071', 'CC', 'ORLANDO ACUÑA ANGULO', 'ORLANDO ACUÑA ANGULO', NULL, NULL, 'M', 'orlando.acuna@esap.edu.co', '3153201292', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 14271071 OR p.num_identificacion = '14271071');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'orlando.acuna@esap.edu.co', 'Organizaciones Públicas', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 432.21, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '14271071'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 223. ORLANDO MORENO MORENO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 7226973, '7226973', 'CC', 'ORLANDO MORENO MORENO', 'ORLANDO MORENO MORENO', NULL, NULL, 'M', 'orlando.moreno@esap.edu.co', '313 3701300', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 7226973 OR p.num_identificacion = '7226973');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'orlando.moreno@esap.edu.co', 'Organizaciones Públicas', 'Resolución  DT-08-003 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 286.13, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '7226973'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 224. ORLANDO VELASCO ULLOA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 4106512, '4106512', 'CC', 'ORLANDO VELASCO ULLOA', 'ORLANDO VELASCO ULLOA', NULL, NULL, 'M', 'orlando.velasco@esap.edu.co', '3208409254', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 4106512 OR p.num_identificacion = '4106512');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-06-02', NULL, 40, 'Maestría', 'orlando.velasco@esap.edu.co', 'Economía De Lo Público', 'Resolución  SC-435 de 31 de marzo de 2023 Acta de posesión No.140 02/06/2023 Resolución  SC-2562 de 13 de diciembre de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 381.8, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '4106512'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 225. OSCAR EDUARDO VALENCIA MESA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10292684, '10292684', 'CC', 'OSCAR EDUARDO VALENCIA MESA', 'OSCAR EDUARDO VALENCIA MESA', NULL, NULL, 'M', 'oscar.valenciam@esap.edu.co', '3152091387', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10292684 OR p.num_identificacion = '10292684');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'En comisión de Estudios.Resol. 639 23-04-2025 Doctorado en Estudios Para la Paz - U.Del Valle. De 2025-1 a 2028-2', 'Comisión de Estudios', DATE '2022-08-05', NULL, 40, 'Maestría', 'oscar.valenciam@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 889 de 04 de agosto de 2022 Resolución  SC-1319 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 319.16, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '10292684'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 226. OSCAR SALAZAR DUQUE
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 14214454, '14214454', 'CC', 'OSCAR SALAZAR DUQUE', 'OSCAR SALAZAR DUQUE', NULL, NULL, 'M', 'oscar.salazar@esap.edu.co', '3118042211', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 14214454 OR p.num_identificacion = '14214454');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Doctorado', 'oscar.salazar@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 890 de 04 de agosto de 2022 Resolución  SC-1444 de 17 de noviembre de 2023 Inscricipción en escalafón Resolución de reposición de puntos y cambio de categoria de Aux a Aso.', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 517.93, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '14214454'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 227. PEDRO NEL PAEZ PEREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79259475, '79259475', 'CC', 'PEDRO NEL PAEZ PEREZ', 'PEDRO NEL PAEZ PEREZ', NULL, NULL, 'M', 'pedrpaez@esap.edu.co', '3183918243', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79259475 OR p.num_identificacion = '79259475');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2008-10-03', NULL, 40, 'Doctorado y Posdoctorado', 'pedrpaez@esap.edu.co', 'Economía De Lo Público', 'Resolucion 1293 del 3 de Octubre de 2008 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 570.65, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '79259475'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 228. RAFAEL ANTONIO CARDENAS VELEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 82389993, '82389993', 'CC', 'RAFAEL ANTONIO CARDENAS VELEZ', 'RAFAEL ANTONIO CARDENAS VELEZ', NULL, NULL, 'M', 'rafacarde@esap.edu.co', '3212510802', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 82389993 OR p.num_identificacion = '82389993');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'rafacarde@esap.edu.co', 'Problemática Del  Estado Y Del Poder', 'Resolución  DT-03-001 de 31 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 345.24, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '82389993'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 229. RAFAEL ARTURO AMAYA MEJIA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1026277351, '1026277351', 'CC', 'RAFAEL ARTURO AMAYA MEJIA', 'RAFAEL ARTURO AMAYA MEJIA', NULL, NULL, 'M', 'rafaelamaya@esap.edu.co', '3016825311', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1026277351 OR p.num_identificacion = '1026277351');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'rafaelamaya@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 354.42, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '1026277351'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 230. RAMIRO CESAR BARAJAS GOMEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19191503, '19191503', 'CC', 'RAMIRO CESAR BARAJAS GOMEZ', 'RAMIRO CESAR BARAJAS GOMEZ', NULL, NULL, 'M', 'ramibara@esap.edu.co', '3115526635', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19191503 OR p.num_identificacion = '19191503');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'ramibara@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-03-001 de 31 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 413.55, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CUNDINAMARCA')
WHERE p.num_identificacion = '19191503'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 231. RAMIRO ENRIQUE SALAZAR RAMOS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 92504501, '92504501', 'CC', 'RAMIRO ENRIQUE SALAZAR RAMOS', 'RAMIRO ENRIQUE SALAZAR RAMOS', NULL, NULL, 'M', 'ramiro.salazarr@esap.edu.co', '3145629490', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 92504501 OR p.num_identificacion = '92504501');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'ramiro.salazarr@esap.edu.co', 'Economía De Lo Público', 'Resolución SC- 891 de 04 de agosto de 2022 Resolución  SC-1320 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 417.49, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '92504501'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 232. RAMON ANTONIO BASTIDAS UNIGARRO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13009744, '13009744', 'CC', 'RAMON ANTONIO BASTIDAS UNIGARRO', 'RAMON ANTONIO BASTIDAS UNIGARRO', NULL, NULL, 'M', 'antobast@esap.edu.co', '3113681395', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13009744 OR p.num_identificacion = '13009744');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'antobast@esap.edu.co', 'Organizaciones Públicas / Derecho Administrativo Y Contratación Estatal', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 427.13, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '13009744'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 233. RICARDO ALEXANDER APOLINAR CARDENAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1121825584, '1121825584', 'CC', 'RICARDO ALEXANDER APOLINAR CARDENAS', 'RICARDO ALEXANDER APOLINAR CARDENAS', NULL, NULL, 'M', 'ricardo.apolinar@esap.edu.co', '3138674198', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1121825584 OR p.num_identificacion = '1121825584');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 1/08/2025', 'En Periodo de Prueba', DATE '2024-08-01', DATE '2025-08-01', 40, 'Maestría', 'ricardo.apolinar@esap.edu.co', 'Economía De Lo Público', 'Resolución No. SC - 1298 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 383.33, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '1121825584'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 234. RICARDO ANTONIO ESCOBAR
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10267732, '10267732', 'CC', 'RICARDO ANTONIO ESCOBAR', 'RICARDO ANTONIO ESCOBAR', NULL, NULL, 'M', 'ricardo.escobar@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10267732 OR p.num_identificacion = '10267732');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'ricardo.escobar@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1360 del 11 de julio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 464.7, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '10267732'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 235. ROBERT WILSON ORTIZ LOPEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 98381113, '98381113', 'CC', 'ROBERT WILSON ORTIZ LOPEZ', 'ROBERT WILSON ORTIZ LOPEZ', NULL, NULL, 'M', 'robert.ortiz@esap.edu.co', '3155370646', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 98381113 OR p.num_identificacion = '98381113');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'robert.ortiz@esap.edu.co', 'Gestión Del Desarrollo / Teorías Y Enfoques Del Desarrollo Y Teorías Y Enfoques Del Desarrollo Territorial', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 440.76, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '98381113'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 236. RODRIGO ALFONSO FIGUEROA GUERRERO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 13005558, '13005558', 'CC', 'RODRIGO ALFONSO FIGUEROA GUERRERO', 'RODRIGO ALFONSO FIGUEROA GUERRERO', NULL, NULL, 'M', 'rodrigo.figueroa@esap.edu.co', '3232857927', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 13005558 OR p.num_identificacion = '13005558');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'rodrigo.figueroa@esap.edu.co', 'Economía De Lo Público', 'Resolución  DT-12-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 329.47, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('NARIÑO')
WHERE p.num_identificacion = '13005558'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 237. RODRIGO ANTONIO URREA BELTRAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 12127386, '12127386', 'CC', 'RODRIGO ANTONIO URREA BELTRAN', 'RODRIGO ANTONIO URREA BELTRAN', NULL, NULL, 'M', 'rodrigo.urrea@esap.edu.co', '3123773992', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 12127386 OR p.num_identificacion = '12127386');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'rodrigo.urrea@esap.edu.co', 'Economía De Lo Público / Finanzas Públicas Y Presupuesto Público', 'Resolución  DT-15-001 de 16 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 319.3, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '12127386'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 238. RONALD ALEJANDRO MACUACE OTERO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10292766, '10292766', 'CC', 'RONALD ALEJANDRO MACUACE OTERO', 'RONALD ALEJANDRO MACUACE OTERO', NULL, NULL, 'M', 'ronald.macuace@esap.edu.co', '3004677505', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10292766 OR p.num_identificacion = '10292766');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2018-08-01', NULL, 40, 'Doctorado', 'ronald.macuace@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución 2780 de 01 de agosto de 2018', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 509.19, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '10292766'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 239. ROSALVINA ALVIS BARRANCO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 42496905, '42496905', 'CC', 'ROSALVINA ALVIS BARRANCO', 'ROSALVINA ALVIS BARRANCO', NULL, NULL, 'F', 'rosalvina.alvis@esap.edu.co', '3002298791', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 42496905 OR p.num_identificacion = '42496905');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'rosalvina.alvis@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 892 de 04 de agosto de 2022 Resolución  SC-1321 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 458.63, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '42496905'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 240. RUBEN DARIO DE JESUS NARANJO SALDARRIAGA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10094605, '10094605', 'CC', 'RUBEN DARIO DE JESUS NARANJO SALDARRIAGA', 'RUBEN DARIO DE JESUS NARANJO SALDARRIAGA', NULL, NULL, 'M', 'ruben.naranjo@esap.edu.co', '3136490263', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10094605 OR p.num_identificacion = '10094605');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'ruben.naranjo@esap.edu.co', 'Organizaciones Públicas', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Convocatoria Ocasionales 2020 para 174 plazas. Resolución 3814 de 26 de noviembre de 2019', 378.19, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '10094605'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 241. SANDRA MILENA POLO BUITRAGO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 52336004, '52336004', 'CC', 'SANDRA MILENA POLO BUITRAGO', 'SANDRA MILENA POLO BUITRAGO', NULL, NULL, 'F', 'sandra.polo@esap.edu.co', '3125664130', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 52336004 OR p.num_identificacion = '52336004');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Doctorado', 'sandra.polo@esap.edu.co', 'Problemática Pública', 'Resolución  SC-016 de 10 de enero de 2025', 'Docentes Ocasionales vinculados antes del Acuerdo 003/2018 con continuidad en el servicio.', 463.33, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '52336004'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 242. SANTOS ALONSO BELTRAN BELTRAN
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79829053, '79829053', 'CC', 'SANTOS ALONSO BELTRAN BELTRAN', 'SANTOS ALONSO BELTRAN BELTRAN', NULL, NULL, 'M', 'santos.beltran@esap.edu.co', '3212037817', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79829053 OR p.num_identificacion = '79829053');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'En Comisión de Servicios (ICBF) Resol.189 del 14/02/2023', 'Comisión de Servicios', DATE '2022-02-01', NULL, 40, 'Doctorado', 'santos.beltran@esap.edu.co', 'Gobierno y Políticas Públicas', 'Resolución  SC-026 de 03 de enero de 2022 Resolución  SC-173 de 13 de febrero de 2023 Inscricipción en escalafón', 'Convocatoria 143 vacantes. Resolución 722 de 1 de junio de 2021', 432.73, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '79829053'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 243. SERGIO ALBERTO CHICA VELEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79905168, '79905168', 'CC', 'SERGIO ALBERTO CHICA VELEZ', 'SERGIO ALBERTO CHICA VELEZ', NULL, NULL, 'M', 'sergchic@esap.edu.co', '3053453401', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79905168 OR p.num_identificacion = '79905168');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Magister cursando Doctorado', 'sergchic@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 893 de 04 de agosto de 2023 Resolución  SC-1644 de 13 de diciembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 372.85, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ANTIOQUIA')
WHERE p.num_identificacion = '79905168'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 244. SHANNON REY CADAVID
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1018446712, '1018446712', 'CC', 'SHANNON REY CADAVID', 'SHANNON REY CADAVID', NULL, NULL, 'F', 'shannon.rey@esap.edu.co', '3192389951', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1018446712 OR p.num_identificacion = '1018446712');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'shannon.rey@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 321.51, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '1018446712'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 245. SILVIA MARGARITA BALDIRIS NAVARRO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 33333865, '33333865', 'CC', 'SILVIA MARGARITA BALDIRIS NAVARRO', 'SILVIA MARGARITA BALDIRIS NAVARRO', NULL, NULL, 'F', 'silvia.baldiris@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 33333865 OR p.num_identificacion = '33333865');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Doctorado', 'silvia.baldiris@esap.edu.co', 'Ciencias de Datos', 'Resolución No. SC - 1300 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 610, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '33333865'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 246. SILVIO LEON ROSERO OTERO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 75077672, '75077672', 'CC', 'SILVIO LEON ROSERO OTERO', 'SILVIO LEON ROSERO OTERO', NULL, NULL, 'M', 'silvio.rosero@esap.edu.co', '8913328', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 75077672 OR p.num_identificacion = '75077672');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'En comisión de Estudios.Resol. 2340 22-11-2024 Doctorado en Administración - UNal. De 2024-2 a 2026-2', 'Comisión de Estudios', DATE '2022-08-05', NULL, 40, 'Maestría', 'silvio.rosero@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución SC- 895 de 04 de agosto de 2022 Resolución  SC-1322 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 356.3, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CALDAS')
WHERE p.num_identificacion = '75077672'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 247. SIMON MARTINEZ URBANEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 19066675, '19066675', 'CC', 'SIMON MARTINEZ URBANEZ', 'SIMON MARTINEZ URBANEZ', NULL, NULL, 'M', 'simon.martinezu@esap.edu.co', '3114162090', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 19066675 OR p.num_identificacion = '19066675');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'simon.martinezu@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 330, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '19066675'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 248. TATIANA MARCELA ESPINOSA BAUTISTA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1094247389, '1094247389', 'CC', 'TATIANA MARCELA ESPINOSA BAUTISTA', 'TATIANA MARCELA ESPINOSA BAUTISTA', NULL, NULL, 'F', 'tatiana.espinosa@esap.edu.co', '3144340505', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1094247389 OR p.num_identificacion = '1094247389');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'tatiana.espinosa@esap.edu.co', 'Ciencias de Datos', 'Resolución No. SC - 1301 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 285, 'No Aplica', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('META')
WHERE p.num_identificacion = '1094247389'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 249. URIEL SANDOVAL RUEDA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 91216105, '91216105', 'CC', 'URIEL SANDOVAL RUEDA', 'URIEL SANDOVAL RUEDA', NULL, NULL, 'M', 'uriesand@esap.edu.co', '3102236564', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 91216105 OR p.num_identificacion = '91216105');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'uriesand@esap.edu.co', 'Organizaciones Públicas / Estado Y Poder', 'Resolución  SC-016 de 10 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 386.72, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '91216105'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 250. VIVIANA GALLEGO RUDAS
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 34065777, '34065777', 'CC', 'VIVIANA GALLEGO RUDAS', 'VIVIANA GALLEGO RUDAS', NULL, NULL, 'F', 'viviana.gallegor@esap.edu.co', '3133904023', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 34065777 OR p.num_identificacion = '34065777');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'viviana.gallegor@esap.edu.co', 'Espacio Tiempo Y Territorio/ Gerencia Social', 'Resolución  DT-04-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 345.53, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('RISARALDA')
WHERE p.num_identificacion = '34065777'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 251. WENDY LORAINE DE LEON ZAMORA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1042434473, '1042434473', 'CC', 'WENDY LORAINE DE LEON ZAMORA', 'WENDY LORAINE DE LEON ZAMORA', NULL, NULL, 'F', 'wendy.deleon@esap.edu.co', '3122401953', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1042434473 OR p.num_identificacion = '1042434473');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'wendy.deleon@esap.edu.co', 'Matemáticas, Estadística', 'Resolución  SC-436 de 31 de marzo de 2023 Acta de posesión No.133 05/05/2023 Resolución  SC-1565 de 1 de agosto de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 273.81, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '1042434473'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 252. WILLIAM BERNARDO MACIAS OROZCO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 10306054, '10306054', 'CC', 'WILLIAM BERNARDO MACIAS OROZCO', 'WILLIAM BERNARDO MACIAS OROZCO', NULL, NULL, 'M', 'william.macias@esap.edu.co', '3216830197', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 10306054 OR p.num_identificacion = '10306054');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2023-05-05', NULL, 40, 'Maestría', 'william.macias@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución  SC-437 de 31 de marzo de 2023 Acta de posesión No.127 05/05/2023 Resolución  SC-1566 de 1 de agosto de 2024 Inscricipción en escalafón. Reubicación Territorial Resolución SC-2152 18 de octubre 2024.', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 412.71, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '10306054'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 253. WILLIAM DE JESUS MANJARRES DE AVILA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1143122185, '1143122185', 'CC', 'WILLIAM DE JESUS MANJARRES DE AVILA', 'WILLIAM DE JESUS MANJARRES DE AVILA', NULL, NULL, 'M', 'william.manjarres@esap.edu.co', '6053971975', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1143122185 OR p.num_identificacion = '1143122185');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-12-02', NULL, 40, 'Maestría', 'william.manjarres@esap.edu.co', 'Economía De Lo Público', 'Resolución SC- 897 de 04 de agosto de 2022 Resolución  SC-239 de 21 de febrero de 2024 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 358.94, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '1143122185'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 254. WILLIAM GUILLERMO JIMENEZ BENITEZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 4080160, '4080160', 'CC', 'WILLIAM GUILLERMO JIMENEZ BENITEZ', 'WILLIAM GUILLERMO JIMENEZ BENITEZ', NULL, NULL, 'M', 'willjime@esap.edu.co', '3102043227', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 4080160 OR p.num_identificacion = '4080160');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-02-12', NULL, 40, 'Doctorado y Posdoctorado', 'willjime@esap.edu.co', 'Estado y Poder', 'Resolución 0112 del 12 de febrero de 2003 (ingreso a escalafón docente-Asistente)', 'Carrera profesoral antes de 2018', 919.0799999999999, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '4080160'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 255. WILLIAM HERNANDO ALFONSO PIÑA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79388826, '79388826', 'CC', 'WILLIAM HERNANDO ALFONSO PIÑA', 'WILLIAM HERNANDO ALFONSO PIÑA', NULL, NULL, 'M', 'william.alfonso@esap.edu.co', '3002081090', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79388826 OR p.num_identificacion = '79388826');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-09-01', NULL, 40, 'Doctorado', 'william.alfonso@esap.edu.co', 'Desarrollo y Gestión Territorial', 'Resolución SC- 909 de 04 de agosto de 2022 Resolución  SC-1445 de 17 de noviembre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 660.16, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOYACÁ')
WHERE p.num_identificacion = '79388826'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 256. WILMAR ANTONIO PALACIOS MACHADO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 80054833, '80054833', 'CC', 'WILMAR ANTONIO PALACIOS MACHADO', 'WILMAR ANTONIO PALACIOS MACHADO', NULL, NULL, 'M', 'wilman.palacios@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 80054833 OR p.num_identificacion = '80054833');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Maestría', 'wilman.palacios@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-16 -001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 364.31, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CHOCÓ')
WHERE p.num_identificacion = '80054833'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 257. WILSON HERNANDO LADINO ORJUELA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 17321741, '17321741', 'CC', 'WILSON HERNANDO LADINO ORJUELA', 'WILSON HERNANDO LADINO ORJUELA', NULL, NULL, 'M', 'wilsladi@esap.edu.co', '3507948231', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 17321741 OR p.num_identificacion = '17321741');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Titular', 720, 'Acuerdo 009/2004', 'Servicio Activo', 'Servicio Activo', DATE '2003-03-21', NULL, 40, 'Doctorado', 'wilsladi@esap.edu.co', 'Estado y Poder', 'Resolución 0269 del 21 de marzo de 2003 (ingreso a escalafón docente-Asistente) Resolución 1639 de 13 de diciembre de 2023 Ascenso de Asociado a Titular.', 'Carrera profesoral antes de 2018', 612.83, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('BOLÍVAR')
WHERE p.num_identificacion = '17321741'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 258. WILSON RIGOBERTO PABON QUINTERO
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79627916, '79627916', 'CC', 'WILSON RIGOBERTO PABON QUINTERO', 'WILSON RIGOBERTO PABON QUINTERO', NULL, NULL, 'M', 'wilsonr.pabon@esap.edu.co', '8721122', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79627916 OR p.num_identificacion = '79627916');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Maestría', 'wilsonr.pabon@esap.edu.co', 'Procesos Étnicos e Interculturales', 'Resolución SC- 898 de 04 de agosto de 2022 Resolución  SC-1323 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 376.01, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '79627916'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 259. WILSON RODRIGUEZ CALDERON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 91473579, '91473579', 'CC', 'WILSON RODRIGUEZ CALDERON', 'WILSON RODRIGUEZ CALDERON', NULL, NULL, 'M', 'wilson.rodriguezc@esap.edu.co', '3045483403', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 91473579 OR p.num_identificacion = '91473579');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera2', 'Tiempo Completo', 'Activo', 'Titular', 800, 'Acuerdo 003/2018', 'Servicio Activo', 'Servicio Activo', DATE '2022-08-05', NULL, 40, 'Doctorado', 'wilson.rodriguezc@esap.edu.co', 'Matemáticas, Estadística', 'Resolución SC- 899 de 04 de agosto de 2022 Resolución  SC-1336 de 27 de octubre de 2023 Inscricipción en escalafón', 'Convocatoria 129 vacantes. Resolución 1630 de 17 de diciembre de 2021', 743.87, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('HUILA')
WHERE p.num_identificacion = '91473579'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 260. YESID HERNANDO TAFUR PRADA
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 79137214, '79137214', 'CC', 'YESID HERNANDO TAFUR PRADA', 'YESID HERNANDO TAFUR PRADA', NULL, NULL, 'M', 'yesid.tafur@esap.edu.co', '3007759778', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 79137214 OR p.num_identificacion = '79137214');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'yesid.tafur@esap.edu.co', 'Desarrollo de los diferentes programas misionales de la Escuela Superior de Administración Pública', 'Resolución  DT-14-001 de 20 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 252.71, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('TOLIMA')
WHERE p.num_identificacion = '79137214'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 261. YOLANDA RODRIGUEZ RINCON
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 39750090, '39750090', 'CC', 'YOLANDA RODRIGUEZ RINCON', 'YOLANDA RODRIGUEZ RINCON', NULL, NULL, 'F', 'yolanda.rodriguez@esap.edu.co', '3006762233', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 39750090 OR p.num_identificacion = '39750090');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Carrera1', 'Tiempo Completo', 'Activo', 'Asistente', 720, 'Acuerdo 009/2004', 'Dedicación Exclusiva. Resol.1554 31-07-2024  Actualización curricular de la Maestría DDHH, en el marco  del proceso de renovación de registros calificados ante el MEN.', 'Dedicación Exclusiva', DATE '2018-08-01', NULL, 40, 'Doctorado', 'yolanda.rodriguez@esap.edu.co', 'Problemática Pública', 'Resolución 2740 de 30 de julio de 2018', 'Convocatoria 26 vacantes. Resolución 3664 de 31 de octubre de 2017', 493.99, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('SEDE_CENTRAL')
WHERE p.num_identificacion = '39750090'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 262. YOVANNY ORLANDO ROMERO RAMIREZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 77016614, '77016614', 'CC', 'YOVANNY ORLANDO ROMERO RAMIREZ', 'YOVANNY ORLANDO ROMERO RAMIREZ', NULL, NULL, 'M', 'yovannyromero@esap.edu.co', '3158938406', NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 77016614 OR p.num_identificacion = '77016614');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800, 'Circular Dispositiva 003/2025', 'No Aplica', 'Servicio Activo', DATE '2025-01-20', DATE '2025-12-17', 40, 'Especialización', 'yovannyromero@esap.edu.co', 'Labores de docencia y las demás actividades propias de los docentes de tiempo completo establecidas en el Estatuto Profesoral de la ESAP', 'Resolución  DT-02-001 de 17 de enero de 2025', 'Parágrafo 2, Artículo 71, Acuerdo 003/2018 Por necesidad del servicio pasa de Hora Cátedra a Ocasional.', 269.04, 'Bueno 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('ATLÁNTICO')
WHERE p.num_identificacion = '77016614'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

-- 263. YULIETH KARINA MERA PAZ
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email, tel_celular, id_seccional)
SELECT gen_random_uuid(), 1061725863, '1061725863', 'CC', 'YULIETH KARINA MERA PAZ', 'YULIETH KARINA MERA PAZ', NULL, NULL, 'F', 'yulieth.mera@esap.edu.co', NULL, NULL
FROM academic_work_plan.direccion_territorial dt
WHERE academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
  AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.id_tercero = 1061725863 OR p.num_identificacion = '1061725863');
INSERT INTO academic_work_plan."Docente" ("id", "personaId", "territorialId", "tipoVinculacion", "dedicacion", "estado", "escalafon", "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria", "fechaInicioVinculacion", "fechaFinVinculacion", "dedicacionHorasSemana", "nivelFormacion", "correoInstitucional", "nucleoTematico", "actoAdministrativoVinculacion", "origenVinculacion", "puntajeSalarial", "ultimaEvaluacion", "periodoCarga", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id_person, dt.codigo, 'Periodo de Prueba', 'Tiempo Completo', 'Inactivo', 'Auxiliar', 800, 'Circular Dispositiva 003/2025', 'En Periodo de Prueba hasta 17/07/2025', 'En Periodo de Prueba', DATE '2024-07-17', DATE '2025-07-17', 40, 'Maestría', 'yulieth.mera@esap.edu.co', 'Organizaciones Públicas y Gestión', 'Resolución No. SC - 1302 del 27 de junio de 2024', 'Convocatoria 59 vacantes. Resolución 777 de 2023', 307.89, 'Excelente 2024-1', '2025-1', NOW(), NOW()
FROM auth.personas p
JOIN academic_work_plan.direccion_territorial dt
  ON academic_work_plan.fn_normalizar_texto(dt.nombre) = academic_work_plan.fn_normalizar_texto('CAUCA')
WHERE p.num_identificacion = '1061725863'
  AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" x WHERE x."personaId" = p.id_person AND COALESCE(x."periodoCarga",'') = '2025-1');

