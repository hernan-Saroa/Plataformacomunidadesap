/* Consulta anterior; referencia para el PostgreSQL temporal del verificador. */
exports.sql = `SELECT DISTINCT p.code FROM auth.role_permissions rp
       JOIN auth.role r ON r.id = rp.id_rol AND COALESCE(r.is_active, true) = true
       JOIN auth.permission p ON p.id_permission = rp.id_permission AND COALESCE(p.is_active, true) = true
       WHERE COALESCE(rp.is_active, true) = true
         AND UPPER(r.code) = ANY($1::text[]) AND p.code = ANY($2::text[])`;
