-- ============================================================================
-- ROLLBACK 032: EFDS-1737 / RF-INF-008 - Conformidad y Cierre Automático
-- ============================================================================

DELETE FROM "infrastructure-management".catalogo_item
WHERE catalogo = 'PARAMETRO_UMI' AND codigo = 'PARAM_CONFORMIDAD_CIERRE_AUTOMATICO';

DELETE FROM "infrastructure-management".catalogo_item
WHERE catalogo = 'ESTADO_SOLICITUD' AND codigo = 'CERRADA_SIN_RESPUESTA';

