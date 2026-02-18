-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: AUDITORES PARA CONTROL INTERNO
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script inserta auditores de prueba en auth.personas para el módulo
-- de Control Interno (Plan Anual 5 Roles, Gestión de Auditorías)
-- ═══════════════════════════════════════════════════════════════════════════

-- Columnas disponibles en auth.personas:
-- id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero,
-- pri_apellido, seg_apellido, gen_tercero, fec_nacimiento, dir_residencia,
-- dir_email, tel_celular, fec_creacion, fec_modificacion, usu_creacion,
-- usu_modificacion, id_seccional, id_sede

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERTAR AUDITORES DE CONTROL INTERNO
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, seg_apellido, gen_tercero, dir_email)
VALUES 
  -- Jefe de Control Interno
  (2, '52345678', 'CC', 'Mario Oswaldo Bernal Cárdenas', 'Mario Oswaldo', 'Bernal', 'Cárdenas', 'M', 'mario.bernal@esap.edu.co'),
  
  -- Auditores Senior
  (3, '1098765432', 'CC', 'Carolina Andrea Ramírez López', 'Carolina Andrea', 'Ramírez', 'López', 'F', 'carolina.ramirez@esap.edu.co'),
  (4, '79876543', 'CC', 'Juan Carlos Mendoza García', 'Juan Carlos', 'Mendoza', 'García', 'M', 'juan.mendoza@esap.edu.co'),
  
  -- Auditores Junior
  (5, '1234567890', 'CC', 'Diana Patricia Torres Vega', 'Diana Patricia', 'Torres', 'Vega', 'F', 'diana.torres@esap.edu.co'),
  (6, '80123456', 'CC', 'Andrés Felipe Rodríguez Mora', 'Andrés Felipe', 'Rodríguez', 'Mora', 'M', 'andres.rodriguez@esap.edu.co'),
  (7, '52654321', 'CC', 'Laura Camila Vargas Silva', 'Laura Camila', 'Vargas', 'Silva', 'F', 'laura.vargas@esap.edu.co'),
  
  -- Supervisores
  (8, '19283746', 'CC', 'Roberto Carlos Gómez Pineda', 'Roberto Carlos', 'Gómez', 'Pineda', 'M', 'roberto.gomez@esap.edu.co'),
  (9, '63847562', 'CC', 'Sandra Milena Castro Ruiz', 'Sandra Milena', 'Castro', 'Ruiz', 'F', 'sandra.castro@esap.edu.co')
  
ON CONFLICT (id_tercero) DO UPDATE SET
  nom_largo = EXCLUDED.nom_largo,
  dir_email = EXCLUDED.dir_email;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAR INSERCIÓN
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT id_tercero, nom_largo, dir_email FROM auth.personas ORDER BY id_tercero;
