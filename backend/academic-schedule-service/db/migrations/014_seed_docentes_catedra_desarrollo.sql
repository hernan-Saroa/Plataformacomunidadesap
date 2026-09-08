-- ============================================================================
-- EFDS-1374/1373 - Docentes de HORA CÁTEDRA (sintéticos) para DESARROLLO
--
-- ⚠️ APROVISIONAMIENTO DE DESARROLLO, NO MECANISMO DE PRODUCCIÓN. Igual que los
-- 263 del RUND (migración 011): en producción los docentes entran por el
-- mecanismo del módulo dueño, no por aquí.
--
-- POR QUÉ EXISTE: la carga real del RUND (2025-1) no trae ningún docente de hora
-- cátedra — sus vinculaciones son Ocasional, Carrera1/2, Periodo de Prueba,
-- Especial y Visitante. Sin un catedrático, RN-04 (tope transversal de 304 h)
-- solo se puede ejercer en prueba unitaria. Se siembran DOS sintéticos para
-- poder ejercer el tope por navegador. Documentos 9000000001/2, marcados como
-- sintéticos en el nombre para que nadie los confunda con un docente real.
--
-- Idempotente: WHERE NOT EXISTS sobre las columnas únicas (id_tercero y
-- num_identificacion en personas; personaId + periodoCarga en Docente).
-- ============================================================================

-- Persona 1
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero)
SELECT gen_random_uuid(), 9000000001, '9000000001', 'CC', 'CATEDRA SINTETICO UNO (DESARROLLO)', 'CATEDRA SINTETICO UNO', 'N'
WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE id_tercero = 9000000001 OR num_identificacion = '9000000001');

-- Persona 2
INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero)
SELECT gen_random_uuid(), 9000000002, '9000000002', 'CC', 'CATEDRA SINTETICO DOS (DESARROLLO)', 'CATEDRA SINTETICO DOS', 'N'
WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE id_tercero = 9000000002 OR num_identificacion = '9000000002');

-- Docente 1: Hora Cátedra, Asociado (pasa RN-12 si se probara en maestría),
-- Servicio Activo, vinculación amplia. horasAsignables alto a propósito: el tope
-- que manda es 304 por ser cátedra (RN-04), no este valor.
INSERT INTO academic_work_plan."Docente"
  ("personaId", "territorialId", "tipoVinculacion", "dedicacion", "escalafon",
   "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria",
   "fechaInicioVinculacion", "fechaFinVinculacion", "periodoCarga", "correoInstitucional", "updatedAt")
SELECT p.id_person, 'SC', 'Hora Cátedra', 'Medio Tiempo', 'Asociado',
       800, 'Circular Dispositiva 003/2025', 'En Servicio Activo', 'Servicio Activo',
       '2024-01-01', NULL, '2025-1', 'catedra.uno.dev@esap.edu.co', NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '9000000001'
   AND NOT EXISTS (
     SELECT 1 FROM academic_work_plan."Docente" d
      WHERE d."personaId" = p.id_person AND COALESCE(d."periodoCarga", '') = '2025-1');

-- Docente 2: Hora Cátedra, Titular.
INSERT INTO academic_work_plan."Docente"
  ("personaId", "territorialId", "tipoVinculacion", "dedicacion", "escalafon",
   "horasAsignables", "regimenNormativo", "situacionAdministrativa", "situacionCategoria",
   "fechaInicioVinculacion", "fechaFinVinculacion", "periodoCarga", "correoInstitucional", "updatedAt")
SELECT p.id_person, 'SC', 'Hora Cátedra', 'Medio Tiempo', 'Titular',
       800, 'Circular Dispositiva 003/2025', 'En Servicio Activo', 'Servicio Activo',
       '2024-01-01', NULL, '2025-1', 'catedra.dos.dev@esap.edu.co', NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '9000000002'
   AND NOT EXISTS (
     SELECT 1 FROM academic_work_plan."Docente" d
      WHERE d."personaId" = p.id_person AND COALESCE(d."periodoCarga", '') = '2025-1');
