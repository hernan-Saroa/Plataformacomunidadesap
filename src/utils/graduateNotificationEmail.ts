/**
 * Servicio de notificación de graduados
 */

export function sendGraduateNotificationEmail(params: {
  email: string;
  nombre: string;
  documento: string;
}) {
  console.log('📧 Enviando notificación a graduado:', params);
  return Promise.resolve({
    success: true,
    message: 'Notificación enviada exitosamente'
  });
}
