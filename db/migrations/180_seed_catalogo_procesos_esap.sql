-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 180: Seed — Catálogo de Procesos Auditables ESAP
-- Fecha: 2026-04-07
-- Total: 45 procesos (11 Misionales · 3 Estratégicos · 9 Apoyo · 22 Territoriales)
-- Fuente: Mapa de Procesos ESAP + Universo de Auditoría RE-E-GE-034
-- Estrategia: ON CONFLICT (codigo) DO UPDATE → idempotente
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- BLOQUE 1: PROCESOS MISIONALES (11)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO control_interno.proceso_auditable
    (codigo, nombre, descripcion, tipo, macroproceso, responsable, dependencia,
     evaluacion_riesgo, frecuencia_auditoria, prioridad, priorizacion_anos, activo)
VALUES
('FORM-001','Formación (Programas Académicos)',
 'Gestión de programas académicos de educación superior en modalidad presencial y virtual.',
 'misional','Formación para la Vida','Subdirección Académica Nacional','Subdirección Académica Nacional',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',3,2,true),

('FORM-002','Autoevaluación de la Calidad Académica',
 'Procesos de autoevaluación y acreditación de calidad de programas académicos.',
 'misional','Formación para la Vida','Subdirección Académica Nacional','Subdirección Académica Nacional',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('PROY-001','Capacitación',
 'Diseño y ejecución de programas de capacitación y formación para servidores públicos.',
 'misional','Proyección y Extensión','Dirección de Capacitación','Dirección de Capacitación',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',3,2,true),

('PROY-002','Proceso de Selección',
 'Administración y ejecución de los procesos de selección de personal del Estado.',
 'misional','Proyección y Extensión','Dirección de Procesos de Selección','Dirección de Procesos de Selección',
 '{"probabilidad":3,"impacto":3,"nivelControl":2,"riesgoInherente":9,"riesgoResidual":4,"nivelRiesgo":"alto"}',
 'Anual',4,1,true),

('PROY-003','Fortalecimiento Alto Gobierno y Alta Gerencia Pública',
 'Programas de formación y fortalecimiento dirigidos a gerentes y directivos del Estado.',
 'misional','Proyección y Extensión','Escuela de Alto Gobierno','Escuela de Alto Gobierno',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('PROY-004','Fortalecimiento Integral a la Gestión Estatal',
 'Asistencia técnica y acompañamiento para el fortalecimiento institucional del Estado.',
 'misional','Proyección y Extensión','Dirección de Fortalecimiento y Apoyo a la Gestión Estatal','Dirección de Fortalecimiento y Apoyo a la Gestión Estatal',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('INV-001','Investigación',
 'Gestión de proyectos de investigación en administración pública y ciencias sociales.',
 'misional','Investigación e Innovación','Subdirección Nacional de Investigaciones','Subdirección Nacional de Investigaciones',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('BIEN-001','Bienestar Universitario',
 'Programas de bienestar, salud y calidad de vida para la comunidad académica ESAP.',
 'misional','Bien-Estar','Dirección de Bienestar Universitario','Dirección de Bienestar Universitario',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('RECL-001','Gestión de Entornos Virtuales',
 'Administración de plataformas y recursos de aprendizaje virtual para programas académicos.',
 'misional','Recursos de Aprendizaje','Dirección de Entornos y Servicios Virtuales','Dirección de Entornos y Servicios Virtuales',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('RELC-001','Atención a las Personas',
 'Gestión de los canales de atención y servicio al ciudadano de la ESAP.',
 'misional','Relacionamiento con la Ciudadanía','Dirección de Atención al Ciudadano','Dirección de Atención al Ciudadano',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('GLOB-001','Gestión Internacional',
 'Gestión de relaciones, convenios y programas de cooperación internacional.',
 'misional','Gestión Global','Oficina de Internacionalización','Oficina de Internacionalización',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true)

ON CONFLICT (codigo) DO UPDATE SET
    nombre              = EXCLUDED.nombre,
    descripcion         = EXCLUDED.descripcion,
    tipo                = EXCLUDED.tipo,
    macroproceso        = EXCLUDED.macroproceso,
    responsable         = EXCLUDED.responsable,
    dependencia         = EXCLUDED.dependencia,
    frecuencia_auditoria= EXCLUDED.frecuencia_auditoria,
    prioridad           = EXCLUDED.prioridad,
    priorizacion_anos   = EXCLUDED.priorizacion_anos,
    activo              = EXCLUDED.activo,
    updated_at          = NOW();

-- ───────────────────────────────────────────────────────────────────────────
-- BLOQUE 2: PROCESOS ESTRATÉGICOS (3)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO control_interno.proceso_auditable
    (codigo, nombre, descripcion, tipo, macroproceso, responsable, dependencia,
     evaluacion_riesgo, frecuencia_auditoria, prioridad, priorizacion_anos, activo)
VALUES
('DIRE-001','Direccionamiento Estratégico',
 'Planeación y seguimiento al plan estratégico institucional de la ESAP.',
 'estrategico','Direccionamiento Estratégico','Dirección Nacional','Dirección Nacional',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',3,2,true),

('EFEC-001','Gestión Integrada (SIG)',
 'Implementación y mantenimiento del Sistema Integrado de Gestión de la ESAP.',
 'estrategico','Efectividad Institucional','Oficina de Planeación','Oficina de Planeación',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('EVAL-001','Control Interno Disciplinario',
 'Investigación y trámite de procesos disciplinarios contra servidores públicos de la ESAP.',
 'estrategico','Evaluación Control y Mejora','Oficina de Control Interno Disciplinario','Oficina de Control Interno Disciplinario',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',3,2,true)

ON CONFLICT (codigo) DO UPDATE SET
    nombre              = EXCLUDED.nombre,
    descripcion         = EXCLUDED.descripcion,
    tipo                = EXCLUDED.tipo,
    macroproceso        = EXCLUDED.macroproceso,
    responsable         = EXCLUDED.responsable,
    dependencia         = EXCLUDED.dependencia,
    frecuencia_auditoria= EXCLUDED.frecuencia_auditoria,
    prioridad           = EXCLUDED.prioridad,
    priorizacion_anos   = EXCLUDED.priorizacion_anos,
    activo              = EXCLUDED.activo,
    updated_at          = NOW();

-- ───────────────────────────────────────────────────────────────────────────
-- BLOQUE 3: PROCESOS DE APOYO (9)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO control_interno.proceso_auditable
    (codigo, nombre, descripcion, tipo, macroproceso, responsable, dependencia,
     evaluacion_riesgo, frecuencia_auditoria, prioridad, priorizacion_anos, activo)
VALUES
('TDIG-001','Gestión Tecnológica',
 'Administración de la infraestructura tecnológica y sistemas de información institucionales.',
 'apoyo','Transformación Digital','OTIC','OTIC – Oficina de Tecnologías de la Información',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',3,2,true),

('SEGP-001','Modelo de Seguridad y Privacidad',
 'Implementación del modelo de seguridad de la información y privacidad de datos.',
 'apoyo','Transformación Digital','OTIC','OTIC – Oficina de Tecnologías de la Información',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Bianual',3,2,true),

('EFEC-002','Gestión Documental',
 'Administración del sistema de gestión documental y archivo institucional.',
 'apoyo','Efectividad Institucional','Grupo de Administración Documental – GADGI','Grupo de Administración Documental – GADGI',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('COMM-001','Gestión de la Comunicación',
 'Gestión de la comunicación interna, externa e imagen institucional de la ESAP.',
 'apoyo','Comunicación y Posicionamiento','Equipo de Comunicaciones','Equipo de Comunicaciones',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('GADM-001','Gestión Administrativa',
 'Administración de los recursos físicos, servicios generales y gestión del campus.',
 'apoyo','Gestión Administrativa','Subdirección Nacional de Gestión Corporativa','Subdirección Nacional de Gestión Corporativa',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('GFIN-001','Gestión Financiera',
 'Gestión del presupuesto, contabilidad, tesorería y recursos financieros institucionales.',
 'apoyo','Gestión Financiera','Dirección Financiera','Dirección Financiera',
 '{"probabilidad":3,"impacto":3,"nivelControl":2,"riesgoInherente":9,"riesgoResidual":4,"nivelRiesgo":"alto"}',
 'Anual',5,1,true),

('GJUR-001','Gestión Jurídica',
 'Gestión de asuntos jurídicos, conceptos legales, demandas y representación judicial.',
 'apoyo','Gestión Legal','Oficina Jurídica','Oficina Jurídica',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',3,2,true),

('GCONT-001','Gestión de Contratación',
 'Administración de procesos contractuales para adquisición de bienes y servicios.',
 'apoyo','Adquisición de Bienes y Servicios','Dirección de Contratación','Dirección de Contratación',
 '{"probabilidad":3,"impacto":3,"nivelControl":2,"riesgoInherente":9,"riesgoResidual":4,"nivelRiesgo":"alto"}',
 'Anual',5,1,true),

('GTH-001','Gestión del Talento Humano',
 'Administración del ciclo de vida laboral de los servidores públicos de la ESAP.',
 'apoyo','Gestión del Talento Humano','Dirección de Talento Humano','Dirección de Talento Humano',
 '{"probabilidad":2,"impacto":3,"nivelControl":2,"riesgoInherente":6,"riesgoResidual":3,"nivelRiesgo":"medio"}',
 'Anual',4,1,true)

ON CONFLICT (codigo) DO UPDATE SET
    nombre              = EXCLUDED.nombre,
    descripcion         = EXCLUDED.descripcion,
    tipo                = EXCLUDED.tipo,
    macroproceso        = EXCLUDED.macroproceso,
    responsable         = EXCLUDED.responsable,
    dependencia         = EXCLUDED.dependencia,
    frecuencia_auditoria= EXCLUDED.frecuencia_auditoria,
    prioridad           = EXCLUDED.prioridad,
    priorizacion_anos   = EXCLUDED.priorizacion_anos,
    activo              = EXCLUDED.activo,
    updated_at          = NOW();

-- ───────────────────────────────────────────────────────────────────────────
-- BLOQUE 4: PROCESOS TERRITORIALES (22)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO control_interno.proceso_auditable
    (codigo, nombre, descripcion, tipo, macroproceso, responsable, dependencia,
     evaluacion_riesgo, frecuencia_auditoria, prioridad, priorizacion_anos, activo)
VALUES
('TERR-001','Territorial Antioquia',
 'Gestión y operación de los procesos misionales y de apoyo en la sede territorial Antioquia.',
 'misional','Territorial','Territorial Antioquia','Territorial Antioquia',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-002','Territorial Atlántico – Cesar – Magdalena – La Guajira',
 'Gestión y operación territorial en los departamentos de Atlántico, Cesar, Magdalena y La Guajira.',
 'misional','Territorial','Territorial Atlántico – Cesar – Magdalena – La Guajira','Territorial Atlántico – Cesar – Magdalena – La Guajira',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-003','Territorial Bolívar – Córdoba – Sucre – San Andrés',
 'Gestión y operación territorial en los departamentos de Bolívar, Córdoba, Sucre y San Andrés.',
 'misional','Territorial','Territorial Bolívar – Córdoba – Sucre – San Andrés','Territorial Bolívar – Córdoba – Sucre – San Andrés',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-004','Territorial Boyacá – Casanare',
 'Gestión y operación territorial en los departamentos de Boyacá y Casanare.',
 'misional','Territorial','Territorial Boyacá – Casanare','Territorial Boyacá – Casanare',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-005','Territorial Caldas',
 'Gestión y operación de los procesos en la sede territorial Caldas.',
 'misional','Territorial','Territorial Caldas','Territorial Caldas',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-006','Territorial Cauca',
 'Gestión y operación de los procesos en la sede territorial Cauca.',
 'misional','Territorial','Territorial Cauca','Territorial Cauca',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-007','Territorial Chocó',
 'Gestión y operación de los procesos en la sede territorial Chocó.',
 'misional','Territorial','Territorial Chocó','Territorial Chocó',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-008','Territorial Cundinamarca',
 'Gestión y operación de los procesos en la sede territorial Cundinamarca.',
 'misional','Territorial','Territorial Cundinamarca','Territorial Cundinamarca',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-009','Territorial Huila – Caquetá – Putumayo',
 'Gestión y operación territorial en los departamentos de Huila, Caquetá y Putumayo.',
 'misional','Territorial','Territorial Huila – Caquetá – Putumayo','Territorial Huila – Caquetá – Putumayo',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-010','Territorial Meta – Guaviare – Guanía – Vaupés – Vichada – Amazonas',
 'Gestión y operación territorial en los departamentos de la Orinoquia y Amazonia.',
 'misional','Territorial','Territorial Meta','Territorial Meta – Guaviare – Guanía – Vaupés – Vichada – Amazonas',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-011','Territorial Nariño – Alto Putumayo',
 'Gestión y operación territorial en los departamentos de Nariño y Alto Putumayo.',
 'misional','Territorial','Territorial Nariño – Alto Putumayo','Territorial Nariño – Alto Putumayo',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-012','Territorial Norte de Santander – Arauca',
 'Gestión y operación territorial en los departamentos de Norte de Santander y Arauca.',
 'misional','Territorial','Territorial Norte de Santander – Arauca','Territorial Norte de Santander – Arauca',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-013','Territorial Quindío – Risaralda',
 'Gestión y operación territorial en los departamentos de Quindío y Risaralda.',
 'misional','Territorial','Territorial Quindío – Risaralda','Territorial Quindío – Risaralda',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-014','Territorial Santander',
 'Gestión y operación de los procesos en la sede territorial Santander.',
 'misional','Territorial','Territorial Santander','Territorial Santander',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-015','Territorial Tolima',
 'Gestión y operación de los procesos en la sede territorial Tolima.',
 'misional','Territorial','Territorial Tolima','Territorial Tolima',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-016','Territorial Valle',
 'Gestión y operación de los procesos en la sede territorial Valle del Cauca.',
 'misional','Territorial','Territorial Valle','Territorial Valle',
 '{"probabilidad":2,"impacto":2,"nivelControl":2,"riesgoInherente":4,"riesgoResidual":2,"nivelRiesgo":"medio"}',
 'Bianual',2,2,true),

('TERR-017','Territorial Vichada',
 'Gestión y operación de los procesos en la sede territorial Vichada.',
 'misional','Territorial','Territorial Vichada','Territorial Vichada',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('TERR-018','Territorial Archipiélago San Andrés',
 'Gestión y operación de los procesos en la sede territorial Archipiélago de San Andrés.',
 'misional','Territorial','Territorial Archipiélago San Andrés','Territorial Archipiélago San Andrés',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('TERR-019','Territorial Guaviare',
 'Gestión y operación de los procesos en la sede territorial Guaviare.',
 'misional','Territorial','Territorial Guaviare','Territorial Guaviare',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('TERR-020','Territorial Casanare',
 'Gestión y operación de los procesos en la sede territorial Casanare.',
 'misional','Territorial','Territorial Casanare','Territorial Casanare',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('TERR-021','Territorial Amazonas',
 'Gestión y operación de los procesos en la sede territorial Amazonas.',
 'misional','Territorial','Territorial Amazonas','Territorial Amazonas',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true),

('TERR-022','Territorial Putumayo',
 'Gestión y operación de los procesos en la sede territorial Putumayo.',
 'misional','Territorial','Territorial Putumayo','Territorial Putumayo',
 '{"probabilidad":1,"impacto":2,"nivelControl":2,"riesgoInherente":2,"riesgoResidual":1,"nivelRiesgo":"bajo"}',
 'Trianual',1,3,true)

ON CONFLICT (codigo) DO UPDATE SET
    nombre              = EXCLUDED.nombre,
    descripcion         = EXCLUDED.descripcion,
    tipo                = EXCLUDED.tipo,
    macroproceso        = EXCLUDED.macroproceso,
    responsable         = EXCLUDED.responsable,
    dependencia         = EXCLUDED.dependencia,
    frecuencia_auditoria= EXCLUDED.frecuencia_auditoria,
    prioridad           = EXCLUDED.prioridad,
    priorizacion_anos   = EXCLUDED.priorizacion_anos,
    activo              = EXCLUDED.activo,
    updated_at          = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
    tipo,
    COUNT(*)                                    AS total,
    STRING_AGG(codigo, ', ' ORDER BY codigo)    AS codigos
FROM control_interno.proceso_auditable
WHERE activo = true
GROUP BY tipo
ORDER BY tipo;

SELECT COUNT(*) AS total_procesos
FROM control_interno.proceso_auditable
WHERE activo = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN MIGRACIÓN 180
-- ═══════════════════════════════════════════════════════════════════════════
