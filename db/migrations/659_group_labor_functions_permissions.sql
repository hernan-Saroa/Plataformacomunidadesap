-- Deja los dos permisos de Funciones laborales uno al lado del otro en el modal
-- de permisos por rol.
--
-- El editor pide los permisos agrupados por modulo y ordenados por
-- LOWER(permission.name) (ver modules.service.ts), y los pinta en dos columnas
-- llenando fila por fila. Con los nombres anteriores quedaban en los extremos de
-- la lista ("Acceder a funciones laborales" primero y "Gestionar funciones
-- laborales" decimo), asi que parecian permisos sin relacion.
--
-- Un prefijo comun los vuelve consecutivos y se leen como lo que son: el mismo
-- modulo en dos niveles, consultar y gestionar. No cambia ningun codigo de
-- permiso ni ninguna asignacion: solo la etiqueta que se muestra.

BEGIN;

UPDATE auth.permission
SET name = 'Funciones laborales: consultar',
    description = 'Ver el módulo Funciones laborales y consultar la Matriz Funciones ESAP (solo lectura)',
    updated_at = NOW()
WHERE code = 'certificados-laborales.functions.view';

UPDATE auth.permission
SET name = 'Funciones laborales: gestionar',
    description = 'Crear, editar, eliminar y ejecutar la carga masiva de la Matriz Funciones ESAP',
    updated_at = NOW()
WHERE code = 'certificados-laborales.functions.manage';

COMMIT;
