-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Corregir caracteres especiales (?) en nombres de roles
-- ═══════════════════════════════════════════════════════════════════════════

-- Rol 1: Liderazgo estratégico
UPDATE control_interno.rol_decreto_648_template 
SET nombre = 'Liderazgo estratégico', 
    descripcion = 'Asesoría y acompañamiento a la alta dirección para el direccionamiento estratégico del sistema de control interno'
WHERE rol_numero = 1;

UPDATE control_interno.rol_plan_anual_5 
SET nombre = 'Liderazgo estratégico', 
    descripcion = 'Asesoría y acompañamiento a la alta dirección para el direccionamiento estratégico del sistema de control interno'
WHERE rol_numero = 1;

-- Rol 2: Enfoque hacia la prevención
UPDATE control_interno.rol_decreto_648_template 
SET nombre = 'Enfoque hacia la prevención', 
    descripcion = 'Administración y gestión de riesgos para prevenir la materialización de eventos adversos'
WHERE rol_numero = 2;

UPDATE control_interno.rol_plan_anual_5 
SET nombre = 'Enfoque hacia la prevención', 
    descripcion = 'Administración y gestión de riesgos para prevenir la materialización de eventos adversos'
WHERE rol_numero = 2;

-- Rol 3: Evaluación de la gestión del riesgo
UPDATE control_interno.rol_decreto_648_template 
SET nombre = 'Evaluación de la gestión del riesgo', 
    descripcion = 'Evaluación independiente de la gestión del riesgo institucional y análisis de controles'
WHERE rol_numero = 3;

UPDATE control_interno.rol_plan_anual_5 
SET nombre = 'Evaluación de la gestión del riesgo', 
    descripcion = 'Evaluación independiente de la gestión del riesgo institucional y análisis de controles'
WHERE rol_numero = 3;

-- Rol 4: Evaluación y seguimiento
UPDATE control_interno.rol_decreto_648_template 
SET nombre = 'Evaluación y seguimiento', 
    descripcion = 'Evaluación y seguimiento al cumplimiento de objetivos, planes, programas, proyectos y actividades'
WHERE rol_numero = 4;

UPDATE control_interno.rol_plan_anual_5 
SET nombre = 'Evaluación y seguimiento', 
    descripcion = 'Evaluación y seguimiento al cumplimiento de objetivos, planes, programas, proyectos y actividades'
WHERE rol_numero = 4;

-- Rol 5: Relación con entes externos de control
UPDATE control_interno.rol_decreto_648_template 
SET nombre = 'Relación con entes externos de control', 
    descripcion = 'Relacionamiento con organismos de control externo y atención de requerimientos'
WHERE rol_numero = 5;

UPDATE control_interno.rol_plan_anual_5 
SET nombre = 'Relación con entes externos de control', 
    descripcion = 'Relacionamiento con organismos de control externo y atención de requerimientos'
WHERE rol_numero = 5;
