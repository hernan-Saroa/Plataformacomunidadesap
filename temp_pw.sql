UPDATE auth."user" SET password_hash = crypt('Esap2026*', gen_salt('bf', 10)) WHERE username = 'superuser@esap.edu.co';
UPDATE auth."user" SET password_hash = crypt('Esap2026*', gen_salt('bf', 10)) WHERE username LIKE 'd0%';
