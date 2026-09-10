-- Store complete contact numbers with their separators; never truncate a list.
ALTER TABLE auth.personas ALTER COLUMN tel_celular TYPE VARCHAR(255);
