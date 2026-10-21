-- ============================================================================
-- Migración: zz_503_resembrar_checklist_legalizacion.sql
-- Historia de Usuario: EFDS-1309 — Soportes de legalización.
--
-- POR QUÉ EL NOMBRE EMPIEZA POR "zz_":
-- Las migraciones se aplican en orden alfabético (find | sort). Los seed_*.sql
-- se ordenan después de las numeradas, y seed_parametrizacion.sql es el que crea
-- los tipos de comisionado (config_tipo_comisionado). En un ambiente nuevo, las
-- migraciones 450 y 502 corren antes de que existan esos tipos y la lista de
-- soportes de legalización queda vacía: nadie podría enviar una legalización.
--
-- "zz_" queda después de todo seed* en cualquier configuración regional: con
-- LC_ALL=C (bytes: 'z' > 's' y > cualquier mayúscula) y con en_US.UTF-8 (la
-- del contenedor superapp-db, donde deploy.*.sh ordena). Ningún otro .sql del
-- repositorio empieza por "z": el nombre base también es único, lo que importa
-- porque deploy.*.sh omite una migración si su nombre base ya está registrado.
--
-- QUÉ HACE:
-- Siembra la lista final de soportes (la que dejan 450 y 502) SOLO para los
-- tipos de comisionado activos que no tienen ninguna fila de legalización.
-- Un tipo con filas, aunque estén desactivadas, ya fue configurado (por las
-- migraciones o por la entidad desde Configuración) y no se toca.
-- En los ambientes donde 450 y 502 ya sembraron, no hace nada.
--
-- Idempotente.
-- ============================================================================

INSERT INTO travel_expenses.config_legalizacion_documentos
    (config_tipo_comisionado_id, tipo_documento_soporte_id, tipo_requisito, condicion, orden)
SELECT c.id, t.id, v.tipo_requisito, v.condicion, v.orden
  FROM travel_expenses.config_tipo_comisionado c
 CROSS JOIN (VALUES
    ('LEG_GF_FO_031',            'OBLIGATORIO', NULL,               1),
    ('LEG_CERT_ENTIDAD_EXTERNA', 'OBLIGATORIO', 'COMISION_EXTERNA', 2),
    ('LEG_GF_FO_032',            'OBLIGATORIO', NULL,               3),
    ('LEG_PASABORDOS',           'OBLIGATORIO', 'TRANSPORTE_AEREO', 4),
    ('LEG_CERT_PERMANENCIA',     'OBLIGATORIO', NULL,               5),
    ('LEG_AGENDA_CUMPLIDA',      'OBLIGATORIO', NULL,               6)
 ) AS v(codigo, tipo_requisito, condicion, orden)
  JOIN travel_expenses.tipos_documento_soporte t ON t.codigo = v.codigo
 WHERE c.activo = TRUE
   AND NOT EXISTS (
       SELECT 1 FROM travel_expenses.config_legalizacion_documentos d
        WHERE d.config_tipo_comisionado_id = c.id
   )
ON CONFLICT (config_tipo_comisionado_id, tipo_documento_soporte_id) DO NOTHING;
