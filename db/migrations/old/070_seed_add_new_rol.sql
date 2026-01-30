-- ============================================
-- PERSONAS DE PRUEBA
-- ============================================
INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
VALUES
  (22, '38678902', 'CC', 'Gestión Legal', 'Gestión', 'Legal', 'M', 'gestion.legal@esap.edu.co')
ON CONFLICT (id_tercero) DO NOTHING;

-- ============================================
-- USUARIOS (password: 123456)
-- hash: $2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.
-- ============================================
INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
VALUES
  ('1d069f45-aae1-4176-ab03-55476e950a20', 'gestion.legal@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 22)
ON CONFLICT (id_user) DO NOTHING;

-- ============================================
-- ROLES (con code + category)
-- ============================================
INSERT INTO auth.role (id, code, name, description, category, icon, color)
VALUES
  ('660e8400-e29b-41d4-a716-446655440016', 'CONTROL_DISCIPLINARIO', 'Control Disciplinario', 'Acceso al modulo de control disciplinario', 'directivo', 'Briefcase', '#f97316'),
  ('660e8400-e29b-41d4-a716-446655440017', 'GESTION_LEGAL','Gestión Legal', 'Acceso al modulo de gestión legal', 'directivo', 'Briefcase', '#f97316')
ON CONFLICT (code) DO NOTHING;