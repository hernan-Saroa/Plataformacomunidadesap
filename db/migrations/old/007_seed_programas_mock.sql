-- Semilla de programas académicos basada en los mocks del frontend
-- Requiere: tabla auth.programas_academicos, auth.registros_calificados, auth.acreditaciones_programa y sedes cargadas.

DO $$
DECLARE
  v_programa_id BIGINT;
  v_sede_id INTEGER;
BEGIN
  ---------------------------------------------------------------------------
  -- Helper para obtener sede_id (Bogotá)
  ---------------------------------------------------------------------------
  SELECT id_sede INTO v_sede_id FROM auth.sedes WHERE LOWER(nom_sede) = LOWER('Sede Principal ESAP') LIMIT 1;
  IF v_sede_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la sede Bogotá en auth.sedes';
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 1: Economía Pública
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'PRE-ECO-001', 'Economía Pública', 'Pregrado', 'Presencial', 'Diurna', 10, 160,
    v_sede_id, 'Facultad de Pregrado', 'Activo',
    'Programa profesional de Economía Pública enfocado en el análisis económico del sector público',
    'Profesional capacitado en análisis económico y políticas públicas',
    ARRAY['Título de bachiller', 'Pruebas Saber 11', 'Entrevista'],
    3800000, 420, 980, 28,
    DATE '2008-02-01', DATE '2024-11-20'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2022-001', DATE '2022-01-15', DATE '2029-01-15')
    ON CONFLICT (programa_id) DO NOTHING;

    INSERT INTO auth.acreditaciones_programa (programa_id, tipo, vigencia)
    VALUES (v_programa_id, 'Alta Calidad', DATE '2028-06-30')
    ON CONFLICT DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 2: Administración Pública Territorial
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'PRE-APT-002', 'Administración Pública Territorial', 'Pregrado', 'Distancia', 'Flexible', 10, 160,
    v_sede_id, 'Facultad de Pregrado', 'Activo',
    'Programa de Administración Pública con énfasis en gestión territorial y gobiernos locales',
    'Profesional en administración pública territorial con capacidad de gestión en entidades territoriales',
    ARRAY['Título de bachiller', 'Pruebas Saber 11'],
    3200000, 580, 1450, 32,
    DATE '2010-08-15', DATE '2024-10-05'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2021-045', DATE '2021-06-10', DATE '2028-06-10')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 3: Administración Pública - Jornada Nocturna
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'PRE-APN-003', 'Administración Pública - Jornada Nocturna', 'Pregrado', 'Presencial', 'Nocturna', 10, 160,
    v_sede_id, 'Facultad de Pregrado', 'Activo',
    'Programa profesional de Administración Pública en jornada nocturna para estudiantes que trabajan',
    'Administrador público con competencias en gestión del Estado y políticas públicas',
    ARRAY['Título de bachiller', 'Pruebas Saber 11'],
    3500000, 350, 890, 25,
    DATE '2012-01-10', DATE '2024-09-12'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2020-089', DATE '2020-03-20', DATE '2027-03-20')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 4: Administración Pública - Jornada Diurna
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'PRE-APD-004', 'Administración Pública - Jornada Diurna', 'Pregrado', 'Presencial', 'Diurna', 10, 160,
    v_sede_id, 'Facultad de Pregrado', 'Activo',
    'Programa profesional de Administración Pública en jornada diurna con énfasis en gestión estatal',
    'Profesional en administración pública con capacidad de liderazgo en el sector público',
    ARRAY['Título de bachiller', 'Pruebas Saber 11', 'Entrevista'],
    3500000, 520, 1680, 35,
    DATE '2005-09-01', DATE '2024-11-15'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2019-012', DATE '2019-05-08', DATE '2026-05-08')
    ON CONFLICT (programa_id) DO NOTHING;

    INSERT INTO auth.acreditaciones_programa (programa_id, tipo, vigencia)
    VALUES (v_programa_id, 'Alta Calidad', DATE '2029-12-31')
    ON CONFLICT DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 5: Maestría en Derechos Humanos
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'MAE-DH-001', 'Maestría en Derechos Humanos', 'Maestría', 'Distancia', 'Flexible', 4, 50,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Maestría de alta calidad en Derechos Humanos con enfoque en políticas públicas',
    'Magíster con capacidad para diseñar e implementar políticas de derechos humanos',
    ARRAY['Título profesional', 'Prueba de admisión', 'Proyecto de investigación'],
    11500000, 95, 180, 22,
    DATE '2015-02-20', DATE '2024-08-30'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2023-156', DATE '2023-11-12', DATE '2030-11-12')
    ON CONFLICT (programa_id) DO NOTHING;

    INSERT INTO auth.acreditaciones_programa (programa_id, tipo, vigencia)
    VALUES (v_programa_id, 'Alta Calidad', DATE '2029-06-30')
    ON CONFLICT DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 6: Maestría en Administración Pública
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'MAE-AP-002', 'Maestría en Administración Pública', 'Maestría', 'Presencial', 'Nocturna', 4, 52,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Maestría en Administración Pública con énfasis en gestión y modernización del Estado',
    'Magíster en gestión pública con capacidades investigativas y de alto nivel directivo',
    ARRAY['Título profesional', 'Experiencia laboral 2 años', 'Prueba de admisión'],
    12000000, 125, 340, 28,
    DATE '2010-11-01', DATE '2024-11-28'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2022-078', DATE '2022-10-01', DATE '2029-10-01')
    ON CONFLICT (programa_id) DO NOTHING;

    INSERT INTO auth.acreditaciones_programa (programa_id, tipo, vigencia)
    VALUES (v_programa_id, 'Alta Calidad', DATE '2030-12-31')
    ON CONFLICT DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 7: Especialización en Gestión Pública
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'ESP-GP-001', 'Especialización en Gestión Pública', 'Especialización', 'Virtual', 'Flexible', 2, 30,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Especialización virtual en Gestión Pública orientada a funcionarios del Estado',
    'Especialista en gestión de entidades públicas con competencias gerenciales',
    ARRAY['Título profesional', 'Experiencia en sector público'],
    8500000, 180, 520, 18,
    DATE '2016-08-10', DATE '2024-10-20'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2023-089', DATE '2023-03-15', DATE '2030-03-15')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 8: Especialización en Finanzas Públicas
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'ESP-FP-002', 'Especialización en Finanzas Públicas', 'Especialización', 'Distancia', 'Flexible', 2, 32,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Especialización en gestión y administración de finanzas del sector público',
    'Especialista en finanzas públicas con capacidad de planeación y control fiscal',
    ARRAY['Título profesional en áreas económicas o administrativas', 'Experiencia laboral'],
    9200000, 145, 380, 20,
    DATE '2014-03-01', DATE '2024-09-15'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2022-145', DATE '2022-07-20', DATE '2029-07-20')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 9: Especialización en Gerencia Social
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'ESP-GS-003', 'Especialización en Gerencia Social', 'Especialización', 'Virtual', 'Flexible', 2, 30,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Especialización virtual en Gerencia Social para gestión de programas sociales del Estado',
    'Especialista en diseño y gestión de políticas y programas sociales',
    ARRAY['Título profesional', 'Experiencia en proyectos sociales'],
    8800000, 165, 290, 16,
    DATE '2017-01-20', DATE '2024-11-05'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2023-067', DATE '2023-05-10', DATE '2030-05-10')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 10: Especialización en Proyectos de Desarrollo
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'ESP-PD-004', 'Especialización en Proyectos de Desarrollo', 'Especialización', 'Distancia', 'Flexible', 2, 32,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Especialización en formulación y gestión de proyectos de desarrollo regional y local',
    'Especialista en formulación, evaluación y gestión de proyectos de desarrollo',
    ARRAY['Título profesional', 'Experiencia en gestión de proyectos'],
    9000000, 155, 410, 19,
    DATE '2013-06-15', DATE '2024-08-18'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2021-198', DATE '2021-09-25', DATE '2028-09-25')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 11: Especialización en Alta Dirección del Estado
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'ESP-ADE-005', 'Especialización en Alta Dirección del Estado', 'Especialización', 'Presencial', 'Nocturna', 2, 35,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Especialización de alta calidad orientada a altos directivos del sector público',
    'Especialista en alta gerencia pública con competencias estratégicas y de liderazgo',
    ARRAY['Título profesional', 'Cargo directivo en sector público', 'Entrevista'],
    12500000, 75, 185, 25,
    DATE '2011-10-05', DATE '2024-11-22'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2023-023', DATE '2023-02-18', DATE '2030-02-18')
    ON CONFLICT (programa_id) DO NOTHING;

    INSERT INTO auth.acreditaciones_programa (programa_id, tipo, vigencia)
    VALUES (v_programa_id, 'Alta Calidad', DATE '2029-12-31')
    ON CONFLICT DO NOTHING;
  END IF;

  ---------------------------------------------------------------------------
  -- Programa 12: Especialización en Gestión y Planificación del Desarrollo Urbano y Regional
  ---------------------------------------------------------------------------
  INSERT INTO auth.programas_academicos (
    codigo, nombre, nivel_formacion, modalidad, jornada, duracion_semestres, creditos,
    sede_id, facultad, estado, descripcion, perfil_egresado, requisitos_ingreso,
    costo_matricula, estudiantes_activos, graduados, docentes_asignados,
    fecha_creacion, ultima_actualizacion
  ) VALUES (
    'ESP-GPDU-006', 'Especialización en Gestión y Planificación del Desarrollo Urbano y Regional', 'Especialización', 'Distancia', 'Flexible', 2, 32,
    v_sede_id, 'Facultad de Postgrados', 'Activo',
    'Especialización en planificación territorial y desarrollo urbano sostenible',
    'Especialista en gestión territorial con capacidad en ordenamiento y desarrollo regional',
    ARRAY['Título profesional en áreas afines', 'Experiencia en planeación territorial'],
    9500000, 110, 245, 17,
    DATE '2015-09-12', DATE '2024-10-08'
  ) ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_programa_id;

  IF v_programa_id IS NOT NULL THEN
    INSERT INTO auth.registros_calificados (programa_id, numero, fecha_emision, vigencia)
    VALUES (v_programa_id, 'RC-2022-112', DATE '2022-04-30', DATE '2029-04-30')
    ON CONFLICT (programa_id) DO NOTHING;
  END IF;

END;
$$;
