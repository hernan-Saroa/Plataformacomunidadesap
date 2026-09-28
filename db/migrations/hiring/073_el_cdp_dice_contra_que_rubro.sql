-- ============================================================================
-- 073 · El CDP dice contra qué rubro
--
-- `hiring.cdp.rubro` existe desde la 010 y nunca se llenó por la vía que el
-- módulo usa de verdad. Son dos agujeros que se taparon el uno al otro:
--
--   · La solicitud dejó de radicarla el área. Desde que nace sola al cerrarse
--     la etapa 3 —`crearSolicitudSiCerroLaEtapa3`, que no tiene de dónde
--     sacarlo porque la 006 quitó el rubro de los metadatos del estudio
--     previo— se crea con `rubro = NULL`. El DTO de la solicitud manual lo
--     sigue aceptando, pero esa puerta ya casi no se usa.
--
--   · `ExpedirCdpDto` nunca tuvo el campo. El comentario del DTO de solicitud
--     afirma que «quien sabe de qué rubro sale la plata es la Dirección
--     Financiera, que lo registra al expedir», y al expedir no había dónde.
--
-- Se ve en la pantalla: el panel de la 4.2 le pide a la Financiera «confirma
-- que el rubro — tiene saldo». Y se ve en los datos de hoy: de cinco CDP
-- expedidos, uno no tiene rubro, y el único VERIFICADO tampoco —está
-- certificado contra nada—.
--
-- Importa más allá de la pantalla. El procedimiento manda expedir el CDP «con
-- base en el PROCEDIMIENTO GESTIÓN DE GASTOS PRESUPUESTALES», que se ordena
-- por rubro; un certificado que no dice cuál afecta no se puede conciliar con
-- la ejecución presupuestal ni auditar contra ella.
--
-- ------------------------------------------------------- dónde se captura --
--
-- En la 4.2, no en la 4.1. La actividad se llama «verificar la disponibilidad
-- presupuestal» y hasta hoy era un botón sin dato: quedaba quién confirmó y
-- cuándo, pero no contra qué. Pedirlo aquí es lo que convierte la verificación
-- en una afirmación comprobable, y es además quien lo sabe: el área puede
-- adelantarlo si lo conoce —el DTO de la solicitud sigue aceptándolo— pero no
-- se le exige.
--
-- En la 4.3 se puede corregir, no volver a pedir. Si al buscar el saldo la
-- Financiera acabó imputando a otro rubro, lo cambia al expedir; si no dice
-- nada, se conserva el de la verificación.
-- ============================================================================

-- Un CDP expedido sin rubro no se puede conciliar con la ejecución. Se exige
-- en el mismo punto que la 010 eligió para el número y la fecha: cuando pasa a
-- EXPEDIDO, que es cuando el certificado se vuelve oponible.
--
-- NOT VALID a propósito. Hay una fila expedida sin rubro y no se le inventa
-- uno: deducirlo pondría en el expediente una imputación que nadie decidió, y
-- rechazar la migración por ella dejaría el candado sin poner para las que
-- vienen. La restricción rige desde ahora; esa fila se corrige cuando la
-- Financiera diga a qué rubro fue, y entonces se valida con
-- `ALTER TABLE hiring.cdp VALIDATE CONSTRAINT cdp_expedido_con_rubro`.
ALTER TABLE hiring.cdp
  DROP CONSTRAINT IF EXISTS cdp_expedido_con_rubro;

ALTER TABLE hiring.cdp
  ADD CONSTRAINT cdp_expedido_con_rubro
  CHECK (estado <> 'EXPEDIDO' OR rubro IS NOT NULL)
  NOT VALID;

COMMENT ON CONSTRAINT cdp_expedido_con_rubro ON hiring.cdp IS
  'Un certificado que no dice qué rubro afecta no se concilia con la ejecución presupuestal.';

COMMENT ON COLUMN hiring.cdp.rubro IS
  'Rubro presupuestal que respalda el gasto. Lo registra la Financiera al verificar (4.2) y puede corregirlo al expedir (4.3); el área puede adelantarlo si lo conoce.';
