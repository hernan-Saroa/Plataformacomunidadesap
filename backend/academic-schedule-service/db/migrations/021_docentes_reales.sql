-- ============================================================================
-- Lote 1 · 1.4 — Docentes reales: reconciliar TC y extraer catedráticos
--
-- Reconciliación (sin duplicar), por cédula:
--   271  docentes de tiempo completo declarados
--   249  de ellos YA estaban en la base            -> no se tocan
--    22  faltaban                                  -> se crean aquí
--   123  personas distintas aparecen en el histórico
--    43  de ellas son de la lista TC
--    80  son exclusivamente CÁTEDRA                -> se crean aquí
--
-- Total esperado tras esta migración: 351 docentes reales + 18 de la siembra
-- de desarrollo que se retiran en 1.6.
--
-- ⚠️ El reparto por vinculación del histórico se calculó con un parser CSV real
-- (comillas incluidas): Cátedra 365, Ocasional 130, Carrera 68, Especial 11,
-- sin dato 1 = 575. Un split(',') ingenuo da 359/124/68/10 y pierde 14 filas
-- por las comas dentro de campos entrecomillados.
--
-- Forward-only e idempotente (guardas por num_identificacion). SQL puro.
--
-- ⚠️ APROVISIONAMIENTO DE DATOS DE DESARROLLO, no el mecanismo de producción.
-- Escribe fuera del esquema del módulo (academic_work_plan / auth) siguiendo el
-- precedente de las migraciones 007 y 011. No toca código del PTA.
-- RN-09 sigue vigente: el RUND es de solo lectura para las decanaturas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 22 docentes de TIEMPO COMPLETO ausentes de la base (origen: 13_docentes_tc_2026-1.csv)
-- ---------------------------------------------------------------------------

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 70950450, '70950450', 'CC', 'ABELARDINO DE JESUS GOMEZ CARDONA', 'ABELARDINO DE JESUS GOMEZ CARDONA', 'M', 'abelardino.gomez@esap.edu.co', '3219623202'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '70950450');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-001', 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800,
       'No Aplica', DATE '2026-01-21', DATE '2026-07-18', 'abelardino.gomez@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '70950450'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 59829920, '59829920', 'CC', 'AIDA BETTY CABRERA PUCHANA', 'AIDA BETTY CABRERA PUCHANA', 'F', 'aida.cabrera@esap.edu.co', '3172953659'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '59829920');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800,
       'No Aplica', DATE '2026-02-02', DATE '2026-12-16', 'aida.cabrera@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '59829920'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 10267180, '10267180', 'CC', 'ALVARO GRANADA BOTERO', 'ALVARO GRANADA BOTERO', 'M', 'alvaro.granada@esap.edu.co', '3007845448'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '10267180');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-005', 'Ocasional', 'Tiempo Completo', 'Activo', 'Auxiliar', 800,
       'No Aplica', DATE '2026-01-27', DATE '2026-12-16', 'alvaro.granada@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '10267180'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 78715855, '78715855', 'CC', 'CARLOS ALFONSO MARQUEZ ANGEL', 'CARLOS ALFONSO MARQUEZ ANGEL', 'M', 'carlos.marquez@esap.edu.co', '3114087554'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '78715855');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-003', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-01-30', DATE '2026-12-20', 'carlos.marquez@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '78715855'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 7175750, '7175750', 'CC', 'DIEGO FERNANDO RODRIGUEZ CASALLAS', 'DIEGO FERNANDO RODRIGUEZ CASALLAS', 'M', 'diego.rodriguezc@esap.edu.co', '3006591594'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '7175750');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-004', 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800,
       'No Aplica', DATE '2026-01-22', DATE '2026-12-13', 'diego.rodriguezc@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '7175750'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1069723164, '1069723164', 'CC', 'EDGAR ANDRES LONDOÑO NIÑO', 'EDGAR ANDRES LONDOÑO NIÑO', 'M', 'edgar.londono@esap.edu.co', '3153453863'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1069723164');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-02-02', DATE '2026-12-16', 'edgar.londono@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1069723164'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 60360657, '60360657', 'CC', 'ELIANA MARIA RAMIREZ RAMIREZ', 'ELIANA MARIA RAMIREZ RAMIREZ', 'F', 'elianam.ramirez@esap.edu.co', '3158172436'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '60360657');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-012', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-01-21', DATE '2026-12-18', 'elianam.ramirez@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '60360657'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1110503380, '1110503380', 'CC', 'FRANCISCO FABIANY MOLINA BUSTOS', 'FRANCISCO FABIANY MOLINA BUSTOS', 'M', 'francisco.molina@esap.edu.co', '3203291026'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1110503380');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-015', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-02-01', DATE '2026-12-16', 'francisco.molina@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1110503380'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 15172130, '15172130', 'CC', 'JAIDER TORRES CLARO', 'JAIDER TORRES CLARO', 'M', 'jaider.torres@esap.edu.co', '3156964907'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '15172130');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-012', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-01-21', DATE '2026-12-18', 'jaider.torres@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '15172130'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1022369921, '1022369921', 'CC', 'JEISSON ANDRES HINCAPIE RODRIGUEZ', 'JEISSON ANDRES HINCAPIE RODRIGUEZ', 'M', 'jeishinc@esap.edu.co', '3144762573'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1022369921');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-02-02', DATE '2026-12-16', 'jeishinc@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1022369921'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79421772, '79421772', 'CC', 'JESUS FERNANDO BARRIOS ORDOÑEZ', 'JESUS FERNANDO BARRIOS ORDOÑEZ', 'M', 'jesus.barrios@esap.edu.co', '3118451645'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79421772');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-01-19', DATE '2026-12-16', 'jesus.barrios@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79421772'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 17653448, '17653448', 'CC', 'JHON JAIRO CARDENAS PEREZ', 'JHON JAIRO CARDENAS PEREZ', 'M', 'john.cardenas@esap.edu.co', '3148716697'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '17653448');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-009', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-02-20', DATE '2026-10-07', 'john.cardenas@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '17653448'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80129636, '80129636', 'CC', 'JOHN ALEXANDER CASTRO LOZANO', 'JOHN ALEXANDER CASTRO LOZANO', 'M', 'john.acastro@esap.edu.co', '3172671177'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80129636');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800,
       'No Aplica', DATE '2026-02-02', DATE '2026-12-16', 'john.acastro@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80129636'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 52472499, '52472499', 'CC', 'JONNY EMILIA MORENO MENA', 'JONNY EMILIA MORENO MENA', 'F', 'jonny.moreno@esap.edu.co', '3233223646'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '52472499');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-007', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800,
       'No Aplica', DATE '2026-01-19', DATE '2026-12-16', 'jonny.moreno@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '52472499'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 2000021351, '2000021351', 'CC', 'JOSE ARMANDO SANTIAGO GARNICA', 'JOSE ARMANDO SANTIAGO GARNICA', 'M', 'jose.garnica@esap.edu.co', '3052984143'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '2000021351');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-012', 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800,
       'No Aplica', DATE '2026-01-21', DATE '2026-12-18', 'jose.garnica@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '2000021351'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 16275620, '16275620', 'CC', 'JOSE DIEGO HENAO GIRALDO', 'JOSE DIEGO HENAO GIRALDO', 'M', 'jose.henao@esap.edu.co', '3156168212'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '16275620');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-016', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-01-23', DATE '2026-12-16', 'jose.henao@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '16275620'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 16657580, '16657580', 'CC', 'JUAN CARLOS GOMEZ JARAMILLO', 'JUAN CARLOS GOMEZ JARAMILLO', 'M', 'juanc.gomez@esap.edu.co', '3166947857'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '16657580');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-016', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asociado', 800,
       'No Aplica', DATE '2026-01-23', DATE '2026-12-16', 'juanc.gomez@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '16657580'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 7630355, '7630355', 'CC', 'MARCO ANTONIO RAMÍREZ SHUPINGAHUA', 'MARCO ANTONIO RAMÍREZ SHUPINGAHUA', 'M', 'marcoa.ramirez@esap.edu.co', '3113468656'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '7630355');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Especial', 'Medio Tiempo', 'Activo', 'Auxiliar', 800,
       'No Aplica', DATE '2026-04-01', DATE '2026-12-16', 'marcoa.ramirez@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '7630355'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 98492349, '98492349', 'CC', 'RAMIRO ALBERTO VELEZ RIVERA', 'RAMIRO ALBERTO VELEZ RIVERA', 'M', 'ramiro.velez@esap.edu.co', '3113918739 - 4238857'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '98492349');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-001', 'Ocasional', 'Tiempo Completo', 'Activo', 'Titular', 800,
       'No Aplica', DATE '2026-01-21', DATE '2026-07-18', 'ramiro.velez@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '98492349'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 32876745, '32876745', 'CC', 'SANDRA PATRICIA PLATA CORONADO', 'SANDRA PATRICIA PLATA CORONADO', 'F', 'sandraplata@esap.edu.co', '3043775181 - 3024505'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '32876745');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-002', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800,
       'No Aplica', DATE '2026-01-27', DATE '2026-12-17', 'sandraplata@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '32876745'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 23178406, '23178406', 'CC', 'SUADITH ELENA RIVERA POLO', 'SUADITH ELENA RIVERA POLO', 'F', 'suadith.riverap@esap.edu.co', '3017171138'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '23178406');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-003', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800,
       'No Aplica', DATE '2026-01-30', DATE '2026-12-20', 'suadith.riverap@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '23178406'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 77192959, '77192959', 'CC', 'YIMMY ALFONSO SILVA CASTRILLO', 'YIMMY ALFONSO SILVA CASTRILLO', 'M', 'yimmy.silvac@esap.edu.co', '3015544335'
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '77192959');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'DT-002', 'Ocasional', 'Tiempo Completo', 'Activo', 'Asistente', 800,
       'No Aplica', DATE '2026-01-27', DATE '2026-12-17', 'yimmy.silvac@esap.edu.co', NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '77192959'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);


-- ---------------------------------------------------------------------------
-- 80 CATEDRÁTICOS extraídos del histórico (origen: 12_programacion_2026.csv)
--
-- Del histórico solo se conocen cédula y nombre. Género queda 'N' (sin dato),
-- no se inventa. Territorial = SC porque las 575 franjas son todas de Sede
-- Central. Su tope lo fija RN-04 (304 h) en el código, no horasAsignables.
-- ---------------------------------------------------------------------------

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79424170, '79424170', 'CC', 'MUÑOZ MOYANO JAIRO ANTONIO', 'MUÑOZ MOYANO JAIRO ANTONIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79424170');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79424170'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1031120803, '1031120803', 'CC', 'RONCANCIO LADINO BRENDA GINLEY', 'RONCANCIO LADINO BRENDA GINLEY', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1031120803');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1031120803'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 52364430, '52364430', 'CC', 'ÁVILA PÉREZ SANDRA ESPERANZA', 'ÁVILA PÉREZ SANDRA ESPERANZA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '52364430');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '52364430'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1030561127, '1030561127', 'CC', 'DELGADO JEREZ DIANA', 'DELGADO JEREZ DIANA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1030561127');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1030561127'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79706644, '79706644', 'CC', 'BAQUIRO HERMES ALONSO', 'BAQUIRO HERMES ALONSO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79706644');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79706644'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1140414411, '1140414411', 'CC', 'RODRÍGUEZ VALERO LUIS ALFREDO', 'RODRÍGUEZ VALERO LUIS ALFREDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1140414411');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1140414411'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19130414, '19130414', 'CC', 'SUAREZ ESCANDON ISAURO', 'SUAREZ ESCANDON ISAURO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19130414');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19130414'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79582711, '79582711', 'CC', 'MONROY PAMPLONA RAUL', 'MONROY PAMPLONA RAUL', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79582711');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79582711'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19327316, '19327316', 'CC', 'CLEVES GONZALEZ LUIS JAVIER', 'CLEVES GONZALEZ LUIS JAVIER', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19327316');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19327316'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80024377, '80024377', 'CC', 'RIVEROS PIÑEROS VLADIMIR FERNANDO', 'RIVEROS PIÑEROS VLADIMIR FERNANDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80024377');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80024377'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 52083384, '52083384', 'CC', 'MONTENEGRO CASTRO CLAUDIA PATRICIA', 'MONTENEGRO CASTRO CLAUDIA PATRICIA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '52083384');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '52083384'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 40019615, '40019615', 'CC', 'GONZALEZ AVELLANEDA HILDA ESPERANZA', 'GONZALEZ AVELLANEDA HILDA ESPERANZA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '40019615');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '40019615'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80438466, '80438466', 'CC', 'RINCÓN VARGAS LUIS HERNEY', 'RINCÓN VARGAS LUIS HERNEY', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80438466');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80438466'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1022394217, '1022394217', 'CC', 'CANTOR AVILA VIVIAN ANDREA', 'CANTOR AVILA VIVIAN ANDREA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1022394217');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1022394217'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 27279914, '27279914', 'CC', 'MUÑOZ SOLARTE MIRIAN', 'MUÑOZ SOLARTE MIRIAN', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '27279914');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '27279914'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 51874447, '51874447', 'CC', 'PARRA SALAS DORIS', 'PARRA SALAS DORIS', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '51874447');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '51874447'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79148121, '79148121', 'CC', 'GARCIA GARZÓN MAURICIO', 'GARCIA GARZÓN MAURICIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79148121');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79148121'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 14229162, '14229162', 'CC', 'ORTEGON CAMPO JULIO CESAR', 'ORTEGON CAMPO JULIO CESAR', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '14229162');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '14229162'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1075655207, '1075655207', 'CC', 'LEON DUITAMA JAVIER', 'LEON DUITAMA JAVIER', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1075655207');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1075655207'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19412526, '19412526', 'CC', 'BLANCO DUARTE JORGE ALBERTO', 'BLANCO DUARTE JORGE ALBERTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19412526');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19412526'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80223829, '80223829', 'CC', 'ARIZA CHAVEZ GIL ROBERTO', 'ARIZA CHAVEZ GIL ROBERTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80223829');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80223829'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1022344118, '1022344118', 'CC', 'ARIAS SANCHEZ MARLON', 'ARIAS SANCHEZ MARLON', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1022344118');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1022344118'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79792765, '79792765', 'CC', 'CARDENAS CORREA EDWIN MAURICIO', 'CARDENAS CORREA EDWIN MAURICIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79792765');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79792765'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19192889, '19192889', 'CC', 'PULIDO PACHON PAUL', 'PULIDO PACHON PAUL', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19192889');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19192889'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79155312, '79155312', 'CC', 'CÁRDENAS AGUIRRE URIEL ALBERTO', 'CÁRDENAS AGUIRRE URIEL ALBERTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79155312');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79155312'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19282773, '19282773', 'CC', 'LAZALA SILVA RAUL ERNESTO', 'LAZALA SILVA RAUL ERNESTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19282773');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19282773'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19270175, '19270175', 'CC', 'MOLANO RODRIGUEZ JAIRO ALONSO', 'MOLANO RODRIGUEZ JAIRO ALONSO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19270175');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19270175'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 52705664, '52705664', 'CC', 'ROJAS CUERVO ANGELA MARCELA', 'ROJAS CUERVO ANGELA MARCELA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '52705664');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '52705664'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79489618, '79489618', 'CC', 'CASTAÑEDA FERIA JOSE ALEJANDRO', 'CASTAÑEDA FERIA JOSE ALEJANDRO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79489618');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79489618'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80769219, '80769219', 'CC', 'LEON BARRETO FELIPE ANDRES', 'LEON BARRETO FELIPE ANDRES', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80769219');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80769219'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79148880, '79148880', 'CC', 'VERA JAIMES RODRIGO ALONSO', 'VERA JAIMES RODRIGO ALONSO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79148880');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79148880'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 13829663, '13829663', 'CC', 'TORRES RODRIGUEZ ARGEMIRO', 'TORRES RODRIGUEZ ARGEMIRO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '13829663');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '13829663'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1032365573, '1032365573', 'CC', 'SANCHEZ BOGOTA DAVID ANDRES', 'SANCHEZ BOGOTA DAVID ANDRES', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1032365573');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1032365573'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1032425521, '1032425521', 'CC', 'VARGAS FONSECA ALAN DAVID', 'VARGAS FONSECA ALAN DAVID', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1032425521');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1032425521'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19479949, '19479949', 'CC', 'ESCOBAR OCHOA RAÚL', 'ESCOBAR OCHOA RAÚL', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19479949');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19479949'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 9141181, '9141181', 'CC', 'MORALES PAYARES CASTULO', 'MORALES PAYARES CASTULO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '9141181');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '9141181'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19276224, '19276224', 'CC', 'RAMIREZ HERNANDEZ NUMAEL', 'RAMIREZ HERNANDEZ NUMAEL', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19276224');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19276224'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 46664152, '46664152', 'CC', 'MORENO LIZARAZO ANA MARIA', 'MORENO LIZARAZO ANA MARIA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '46664152');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '46664152'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79309873, '79309873', 'CC', 'CESPEDES GOMEZ VICTOR HUGO', 'CESPEDES GOMEZ VICTOR HUGO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79309873');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79309873'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80074809, '80074809', 'CC', 'RODRÍGUEZ GONZALEZ FREDY LEONARDO', 'RODRÍGUEZ GONZALEZ FREDY LEONARDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80074809');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80074809'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 40044422, '40044422', 'CC', 'MENDIVELSO MEJIA YOLIMA', 'MENDIVELSO MEJIA YOLIMA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '40044422');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '40044422'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80031562, '80031562', 'CC', 'RESTREPO RAMIREZ ALEXANDER', 'RESTREPO RAMIREZ ALEXANDER', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80031562');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80031562'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 13716798, '13716798', 'CC', 'PUELLO GARCIA JOSE LUIS', 'PUELLO GARCIA JOSE LUIS', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '13716798');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '13716798'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 3021861, '3021861', 'CC', 'MENESES MEJIA JUAN DOMINGO', 'MENESES MEJIA JUAN DOMINGO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '3021861');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '3021861'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1014243956, '1014243956', 'CC', 'MALPICA CARDENAS SEBASTIAN', 'MALPICA CARDENAS SEBASTIAN', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1014243956');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1014243956'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79277376, '79277376', 'CC', 'LARA NAVARRETE FELIPE', 'LARA NAVARRETE FELIPE', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79277376');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79277376'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79147621, '79147621', 'CC', 'BARRETO RODRIGUEZ JOSE VICENTE', 'BARRETO RODRIGUEZ JOSE VICENTE', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79147621');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79147621'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79144074, '79144074', 'CC', 'GOMEZ ROLDAN IGNACIO', 'GOMEZ ROLDAN IGNACIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79144074');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79144074'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 11371373, '11371373', 'CC', 'VARGAS BARRERA RAFAEL', 'VARGAS BARRERA RAFAEL', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '11371373');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '11371373'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19285011, '19285011', 'CC', 'VERGARA VERGARA VICTOR HUGO', 'VERGARA VERGARA VICTOR HUGO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19285011');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19285011'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 52890986, '52890986', 'CC', 'HERNANDEZ HERNANDEZ NADID', 'HERNANDEZ HERNANDEZ NADID', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '52890986');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '52890986'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1032373917, '1032373917', 'CC', 'BAQUERO MALDONADO JAVIER ANDRES', 'BAQUERO MALDONADO JAVIER ANDRES', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1032373917');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1032373917'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79481185, '79481185', 'CC', 'SANDOVAL GALDAMEZ JOSE ELADIO', 'SANDOVAL GALDAMEZ JOSE ELADIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79481185');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79481185'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 39797336, '39797336', 'CC', 'BEDOYA LIMA JENNY', 'BEDOYA LIMA JENNY', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '39797336');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '39797336'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19265102, '19265102', 'CC', 'BERNAL BERNAL FRANCISCO JAVIER', 'BERNAL BERNAL FRANCISCO JAVIER', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19265102');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19265102'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 13839627, '13839627', 'CC', 'MALDONADO PACHÓN HERNANDO', 'MALDONADO PACHÓN HERNANDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '13839627');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '13839627'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1010196098, '1010196098', 'CC', 'RAMOS GUATAQUIRA ERNEY GONZALO', 'RAMOS GUATAQUIRA ERNEY GONZALO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1010196098');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1010196098'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79865237, '79865237', 'CC', 'BAUTISTA JAIRO ALONSO', 'BAUTISTA JAIRO ALONSO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79865237');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79865237'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 35504618, '35504618', 'CC', 'GONZALEZ COLINO MARCELA', 'GONZALEZ COLINO MARCELA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '35504618');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '35504618'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80240294, '80240294', 'CC', 'REYES GOMEZ JUAN DAVID', 'REYES GOMEZ JUAN DAVID', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80240294');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80240294'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 14226307, '14226307', 'CC', 'ESPINOSA DELGADILLO HUMBERTO', 'ESPINOSA DELGADILLO HUMBERTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '14226307');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '14226307'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1032464218, '1032464218', 'CC', 'RAMOS BORDA HARRY ESTEBAN', 'RAMOS BORDA HARRY ESTEBAN', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1032464218');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1032464218'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 11448272, '11448272', 'CC', 'CRUZ PAEZ FABIO ORLANDO', 'CRUZ PAEZ FABIO ORLANDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '11448272');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '11448272'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19352007, '19352007', 'CC', 'HELO CHAVEZ EDGAR ERNESTO', 'HELO CHAVEZ EDGAR ERNESTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19352007');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19352007'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80024510, '80024510', 'CC', 'ALBA GRIMALDOS JAVIER ALFONSO', 'ALBA GRIMALDOS JAVIER ALFONSO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80024510');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80024510'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 10766246, '10766246', 'CC', 'MARTINEZ SIERRA UBEIMAR JOSE', 'MARTINEZ SIERRA UBEIMAR JOSE', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '10766246');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '10766246'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 80769508, '80769508', 'CC', 'JIMENEZ CASTILLO ANDRES RICARDO', 'JIMENEZ CASTILLO ANDRES RICARDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '80769508');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '80769508'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1032413945, '1032413945', 'CC', 'VALENCIA JIMENEZ GERMAN DARIO', 'VALENCIA JIMENEZ GERMAN DARIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1032413945');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1032413945'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 4119347, '4119347', 'CC', 'GAMBOA SOTAQUIRA ORLANDO', 'GAMBOA SOTAQUIRA ORLANDO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '4119347');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '4119347'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79624638, '79624638', 'CC', 'HILARION AMAYA GABRIEL ANDRES', 'HILARION AMAYA GABRIEL ANDRES', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79624638');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79624638'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 4128911, '4128911', 'CC', 'AREVALO NIÑO JOSE ABDENAGO', 'AREVALO NIÑO JOSE ABDENAGO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '4128911');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '4128911'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 1018413116, '1018413116', 'CC', 'PARRA LEIDI PAOLA', 'PARRA LEIDI PAOLA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '1018413116');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1018413116'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 19409770, '19409770', 'CC', 'FORERO SÚAREZ PEDRO NORBERTO', 'FORERO SÚAREZ PEDRO NORBERTO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '19409770');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '19409770'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 14220895, '14220895', 'CC', 'DUARTE VEGA CRISPINIANO', 'DUARTE VEGA CRISPINIANO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '14220895');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '14220895'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 4577343, '4577343', 'CC', 'VIVAS TAFÚR DIEGO', 'VIVAS TAFÚR DIEGO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '4577343');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '4577343'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79571177, '79571177', 'CC', 'CASTAÑEDA GONZALEZ JORGE HERNAN', 'CASTAÑEDA GONZALEZ JORGE HERNAN', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79571177');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79571177'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 79465648, '79465648', 'CC', 'MUÑOZ MUÑOZ NORMAN JULIO', 'MUÑOZ MUÑOZ NORMAN JULIO', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '79465648');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '79465648'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 41718673, '41718673', 'CC', 'ZORRO IMELDA', 'ZORRO IMELDA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '41718673');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '41718673'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 52542220, '52542220', 'CC', 'RODRIGUEZ FORERO CEYMY DE LOS ANGELES', 'RODRIGUEZ FORERO CEYMY DE LOS ANGELES', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '52542220');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '52542220'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

INSERT INTO auth.personas (id_person, id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, dir_email, tel_celular)
SELECT gen_random_uuid(), 53077510, '53077510', 'CC', 'TRUJILLO GUIO ROXANA ALEJANDRA', 'TRUJILLO GUIO ROXANA ALEJANDRA', 'N', NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM auth.personas WHERE num_identificacion = '53077510');

INSERT INTO academic_work_plan."Docente"
  ("id","personaId","territorialId","tipoVinculacion","dedicacion","estado","escalafon","horasAsignables",
   "situacionAdministrativa","fechaInicioVinculacion","fechaFinVinculacion","correoInstitucional","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p.id_person, 'SC', 'Cátedra', 'Hora Cátedra', 'Activo', NULL, 800,
       NULL, NULL, NULL, NULL, NOW(), NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '53077510'
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person);

-- Canario de la reconciliación.
DO $$
DECLARE
  v_personas INT; v_docentes INT; v_catedra INT;
BEGIN
  SELECT COUNT(*) INTO v_personas FROM auth.personas;
  SELECT COUNT(*) INTO v_docentes FROM academic_work_plan."Docente";
  SELECT COUNT(*) INTO v_catedra  FROM academic_work_plan."Docente" WHERE "tipoVinculacion" = 'Cátedra';

  RAISE NOTICE '021: personas=% docentes=% catedra=%', v_personas, v_docentes, v_catedra;

  IF v_catedra < 80 THEN
    RAISE EXCEPTION '021: se esperaban al menos 80 catedraticos y hay %', v_catedra;
  END IF;
END $$;
