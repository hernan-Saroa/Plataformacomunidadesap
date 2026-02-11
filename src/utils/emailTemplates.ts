/**
 * Email Templates - Simulación de envío de correos
 */

export function simularEnvioCorreo(params: {
  destinatario: string;
  asunto: string;
  cuerpo: string;
}) {
  console.log('📧 Simulación de envío de correo:', params);
  return Promise.resolve({
    success: true,
    message: 'Correo enviado exitosamente (simulado)'
  });
}
