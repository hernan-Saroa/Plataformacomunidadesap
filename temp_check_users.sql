SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='auth' AND table_name='user' ORDER BY ordinal_position;
SELECT * FROM auth."user";
SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='user_roles';
SELECT * FROM auth.user_roles;
