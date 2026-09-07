-- ============================================================================
-- El formato asignado exige el documento, sin regla aparte (EFDS-1183)
--
-- Había tres formas de decir «aquí se entrega un documento»:
--
--   1. actividades_con_soporte.exige_soporte — la que de verdad bloqueaba
--   2. una plantilla asignada a la actividad — que no exigía nada
--   3. una regla DOCUMENTO_REQUERIDO — que nadie evaluaba
--
-- El resultado de tener tres es el previsible: cuatro formatos asignados y una
-- sola regla, ambos sobre la 3.1, y treinta y siete actividades sin ninguna de
-- las dos cosas. Cuando declarar algo cuesta dos pasos, el segundo se olvida.
--
-- Desde ahora asignar el formato basta: el servicio de registro lo consulta
-- junto con la matriz. Esta migración retira la regla que sobra.
-- ============================================================================

-- La regla de la 3.1 no se borra, se deroga: un proceso enviado en marzo debe
-- poder auditarse con las reglas de marzo, y borrar la fila dejaría a la
-- trazabilidad apuntando a algo que ya no existe.
--
-- Derogarla no relaja nada: el estudio previo valida el adjunto en su propio
-- servicio —«el entregable de esta actividad es el estudio previo firmado»— y
-- lo seguirá haciendo. La regla era letra muerta que decía lo mismo.
UPDATE hiring.reglas_actividad
   SET vigente_hasta = now(),
       updated_at    = now()
 WHERE numeral = '3.1'
   AND tipo = 'DOCUMENTO_REQUERIDO'
   AND vigente_hasta IS NULL;

-- ----------------------------------------------------------------------------
-- Nota para quien venga después
--
-- No se siembra ninguna regla nueva ni se marca exige_soporte en otras
-- actividades: cuáles exigen documento lo decide el área asignándoles su
-- formato desde la biblioteca, que es exactamente lo que esta migración hace
-- posible. Sembrarlo aquí volvería a fijar en una migración algo que el área
-- tiene que poder cambiar sin desplegar.
-- ----------------------------------------------------------------------------
