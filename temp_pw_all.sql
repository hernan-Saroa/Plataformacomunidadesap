UPDATE auth."user" SET password_hash = crypt('Esap2026*', gen_salt('bf', 10));
