-- APROVISIONAMIENTO DE DESARROLLO EFDS-1311. SOLO DATOS FICTICIOS.
-- No identifica la Sede Central real. Configuración SOLO para pruebas: 13119001.
BEGIN;
INSERT INTO auth.seccionales (id_seccional, cod_seccional, nom_seccional)
VALUES (13119001,'TEST1311C','Prueba EFDS1311 Central'),
       (13119002,'TEST1311A','Prueba EFDS1311 Territorial A'),
       (13119003,'TEST1311B','Prueba EFDS1311 Territorial B') ON CONFLICT DO NOTHING;

INSERT INTO auth.personas (id_person,id_tercero,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero,id_seccional)
SELECT ('13110000-0004-4000-8000-00000000900' || n)::uuid, 13119400+n, 'TEST1311FIRMA' || n,
  'CC','Firmante EFDS1311 ' || n,'Firmante','F',13119000+n
FROM generate_series(1,3) n ON CONFLICT DO NOTHING;

INSERT INTO auth."user" (id_user,public_id,username,password_hash,is_active,id_person)
SELECT ('13110000-0002-4000-8000-00000000900' || n)::uuid,
  ('13110000-0003-4000-8000-00000000900' || n)::uuid,
  CASE WHEN n=1 THEN 'efds1311-coordinadora@example.invalid' ELSE 'efds1311-territorial' || n || '@example.invalid' END,
  '!SIN-LOGIN-EFDS1311!',TRUE,('13110000-0004-4000-8000-00000000900' || n)::uuid
FROM generate_series(1,3) n
ON CONFLICT (id_user) DO UPDATE SET id_person=EXCLUDED.id_person;

INSERT INTO auth.user_roles (id_user,id_rol)
SELECT ('13110000-0002-4000-8000-00000000900' || n)::uuid,r.id
FROM generate_series(1,3) n JOIN auth.role r ON r.code =
  CASE WHEN n=1 THEN 'COORDINADOR_COMISIONES_VIATICOS' ELSE 'COORDINADOR_ADMINISTRATIVO_FINANCIERO' END
ON CONFLICT DO NOTHING;

-- Los casos 9001/9002/9003 conservan estados y plazos originales.
INSERT INTO auth.personas (id_person,id_tercero,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero,id_seccional)
SELECT ('13110000-0005-4000-8000-00000000900' || n)::uuid,13119500+n,'TEST1311900' || n,
  'CC','Comisionado EFDS1311 ' || n,'Comisionado','F',
  CASE WHEN n<=3 THEN 13119001 WHEN n=4 THEN 13119002 ELSE 13119003 END
FROM generate_series(1,5) n ON CONFLICT DO NOTHING;

-- Dos personas sin comisiones, para probar emisión y aislamiento territoriales.
INSERT INTO travel_expenses.comisionados
  (id,numero_documento,primer_nombre,primer_apellido,email,telefono_contacto,tipo_comisionado,origen_datos)
SELECT ('13110000-0000-4000-8000-00000000900' || n)::uuid,'TEST1311900' || n,
  'Prueba1311','Caso900' || n,'efds1311-' || n || '@example.invalid','0000000000','FUNCIONARIO','ESAP'
FROM generate_series(4,5) n ON CONFLICT DO NOTHING;
COMMIT;
