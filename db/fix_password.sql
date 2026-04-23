UPDATE auth."user" SET password_hash = '$2b$10$kC82/TyiyPiNVWeYh8mMk.j4lFShij/tttKPp5E8DQHzvUFA72PeC' WHERE username = 'superuser@esap.edu.co';
SELECT username, password_hash FROM auth."user";
