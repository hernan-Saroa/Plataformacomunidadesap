-- ============================================================================
-- 075 · El radicado con el que el área remitió el paquete
--
-- La matriz describe la radicación así: «debe generar un consecutivo a través
-- del aplicativo de gestión documental de la escuela, Active Document». La 051
-- lo dio por resuelto —«el soporte es ese radicado»— cuando la 3.3 se cumplía
-- dejando una constancia con su nota y su adjunto.
--
-- Después la 3.3 cambió de dueño. Desde EFDS-1183 se cumple cuando alguien de
-- la Dirección **toma** el proceso de la bandeja compartida, y con ese cambio
-- el consecutivo dejó de pedirse en ninguna parte: hoy el módulo solo guarda
-- un `radicado_active_document`, y está en el expediente, para la etapa 10.
--
-- El resultado es que el expediente no puede decir con qué radicado entró el
-- proceso a la Dirección. Cuando un ente de control cruza el expediente con
-- Active Document —que es lo que hace— no hay por dónde empatarlos.
--
-- ------------------------------------------------- por qué no es obligatorio --
--
-- El propio procedimiento admite dos vías para remitir el paquete: «por correo
-- electrónico o mediante carpeta compartida». Solo una de ellas genera
-- consecutivo, así que exigirlo trabaría la radicación de la otra. Se guarda
-- cuando lo hay y se ve cuando falta, que es lo que permite reclamarlo; no se
-- convierte en un candado que el procedimiento no puso.
--
-- Sin integración con Active Document (RF-SIS-04), igual que en la etapa 10:
-- lo que ocurre afuera lo transcribe quien lo tiene delante.
-- ============================================================================

ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS radicado_gestion_documental varchar(120);

COMMENT ON COLUMN hiring.procesos.radicado_gestion_documental IS
  'Consecutivo de Active Document con el que el área remitió el paquete a la Dirección de Contratación (actividad 3.3). Nulo cuando se remitió por una vía que no genera radicado.';

-- No se rellena en los procesos ya radicados. Deducirlo del radicado interno
-- del módulo (`procesos.radicado`, PC-AAAA-NNNN) sería inventar: son dos
-- consecutivos de dos sistemas distintos, y un expediente que afirma con
-- precisión lo que en realidad dedujo es peor que uno que reconoce lo que no
-- sabe. Es el mismo criterio con que la 063 dejó en NULL la plantilla de los
-- documentos ya cargados.
