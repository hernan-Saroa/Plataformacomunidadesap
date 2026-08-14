BEGIN;

DELETE FROM auth.permission
WHERE id_module IN (
    SELECT id_module
    FROM auth.module
    WHERE code IN (
        'bolsa_empleo',
        'arquitectura-empresarial',
        'gestion_passwords',
        'enrolamiento',
        'comunidad_publicaciones',
        'comunidad_eventos',
        'comunidad_anuncios'
    )
);

DELETE FROM auth.module
WHERE code IN (
    'bolsa_empleo',
    'arquitectura-empresarial',
    'gestion_passwords',
    'enrolamiento',
    'comunidad_publicaciones',
    'comunidad_eventos',
    'comunidad_anuncios'
);

COMMIT;