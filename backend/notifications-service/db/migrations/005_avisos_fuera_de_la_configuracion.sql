SET client_encoding = 'UTF8';

-- ============================================================================
-- 005: Avisos que salían sin pasar por la configuración (EFDS-2406)
-- ============================================================================
-- Certificados Laborales y Verificación de Títulos: el correo que entrega el
-- certificado (con el PDF adjunto) y el código de validación salían por rutas
-- que no pasaban por la configuración de notificaciones: apagar el módulo no
-- los detenía y la consola los mostraba "aún sin avisos".
-- Control Disciplinario: cuatro correos que un usuario envía desde la pantalla
-- (FUID, expediente compartido, remisión por competencia y correo del proceso)
-- salían sin clave de aviso. Ahora todos pasan por la compuerta con estas claves.
--
-- Se registran antes de que lleguen para que:
--   1. el código de validación nazca obligatorio (sin él nadie puede pedir un
--      certificado, igual que los OTP de firma);
--   2. la consola muestre los avisos de los dos módulos con un nombre legible
--      desde el primer día, sin esperar al primer envío.
-- Repetible: se puede correr más de una vez.
-- ============================================================================

-- 1. Obligatorio --------------------------------------------------------------
-- Si ya se había registrado solo, pasa a obligatorio y encendido.
INSERT INTO notifications.evento_notificacion (clave, codigo_modulo, nombre, descripcion, obligatorio, envia_correo)
VALUES
  ('certificados_codigo_validacion', 'certificados-laborales', 'Código de validación para solicitar el certificado',
   'Correo con el código que confirma la identidad de quien pide un certificado laboral. Sin él no se puede hacer la solicitud.', true, true)
ON CONFLICT (codigo_modulo, clave) DO UPDATE
   SET obligatorio  = true,
       activo       = true,
       envia_correo = true;

-- 2. Avisos configurables -----------------------------------------------------
-- Si el aviso ya existe se deja como esté: lo que configuró el administrador manda.
INSERT INTO notifications.evento_notificacion (clave, codigo_modulo, nombre, descripcion, obligatorio, envia_correo)
VALUES
  ('certificados_certificado_emitido', 'certificados-laborales', 'Certificado laboral enviado al solicitante',
   'Correo con el certificado laboral en PDF. Sale al generar el certificado y cada vez que se reenvía.', false, true),
  ('certificados_correccion_aprobada', 'certificados-laborales', 'Corrección aprobada: certificado corregido',
   'Correo con el certificado corregido en PDF para quien pidió la corrección.', false, true),
  ('certificados_correccion_no_aprobada', 'certificados-laborales', 'Corrección no aprobada',
   'Correo que informa a quien pidió la corrección que no fue aprobada y por qué.', false, true),
  ('certificados_correccion_radicada', 'certificados-laborales', 'Corrección radicada: acuse de recibo',
   'Correo que confirma a la persona que su solicitud de corrección quedó radicada.', false, true),
  ('certificados_correccion_nueva_para_gestores', 'certificados-laborales', 'Nueva corrección por gestionar',
   'Correo para quienes gestionan correcciones cuando llega una solicitud nueva.', false, true),
  ('certificados_correccion_resuelta_para_gestores', 'certificados-laborales', 'Corrección resuelta: aviso a gestores',
   'Correo para quienes gestionan correcciones cuando una solicitud queda resuelta.', false, true),
  ('titulos_certificado_emitido', 'graduates-certificates', 'Certificado de verificación de título enviado',
   'Correo con el certificado de verificación de título en PDF. Sale al emitirlo y cada vez que se reenvía.', false, true),
  ('titulos_aviso_al_graduado', 'graduates-certificates', 'Aviso al graduado: pidieron verificar sus títulos',
   'Correo que le avisa al graduado que una empresa solicitó un certificado de sus títulos.', false, true),
  ('titulos_decision_al_graduado', 'graduates-certificates', 'Decisión informada al graduado',
   'Correo que le informa al graduado si la solicitud de la empresa fue aprobada o rechazada.', false, true),
  ('titulos_solicitud_en_revision', 'graduates-certificates', 'Solicitud en revisión',
   'Correo que le avisa al solicitante que su solicitud entró en revisión.', false, true),
  ('titulos_solicitud_rechazada', 'graduates-certificates', 'Solicitud rechazada',
   'Correo que le informa al solicitante que su solicitud fue rechazada y por qué.', false, true),
  ('FUID_COMPARTIDO', 'control-disciplinario', 'FUID enviado por correo',
   'Correo con el FUID (EI-FO-003) adjunto que un usuario envía desde el proceso.', false, true),
  ('EXPEDIENTE_COMPARTIDO', 'control-disciplinario', 'Expediente compartido por correo',
   'Correo con el enlace de acceso a un expediente que un usuario comparte.', false, true),
  ('REMISION_POR_COMPETENCIA', 'control-disciplinario', 'Remisión por competencia',
   'Correo con el expediente que se remite por competencia a otra entidad.', false, true),
  ('CORREO_DESDE_EL_PROCESO', 'control-disciplinario', 'Correo enviado desde el proceso',
   'Correo que un usuario redacta y envía desde la pantalla del proceso.', false, true)
ON CONFLICT (codigo_modulo, clave) DO NOTHING;
