/**
 * Template de Email - Notificación al Graduado
 * Cuando una empresa solicita verificación de título
 */

interface GraduateNotificationEmailData {
  graduateName: string;
  graduateEmail: string;
  companyName: string;
  companyNIT: string;
  contactPerson: string;
  contactEmail: string;
  requestDate: string;
  certificateCode: string;
}

export function generateGraduateNotificationEmail(data: GraduateNotificationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación de Solicitud de Certificado - ESAP</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  
  <!-- Container Principal -->
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email Card -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header con gradiente corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #2962FF 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                🔔 Notificación de Solicitud
              </h1>
              <p style="margin: 10px 0 0 0; color: #E0EDFF; font-size: 14px;">
                Escuela Superior de Administración Pública
              </p>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Saludo -->
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Estimado(a) <strong>${data.graduateName}</strong>,
              </p>

              <!-- Alerta de transparencia -->
              <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <div style="display: flex; align-items: flex-start;">
                  <div style="font-size: 24px; margin-right: 12px;">🔒</div>
                  <div>
                    <p style="margin: 0 0 8px 0; color: #92400E; font-weight: 700; font-size: 15px;">
                      Notificación de Privacidad
                    </p>
                    <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.5;">
                      Te informamos que una empresa ha solicitado la verificación de tu título académico en ESAP.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Información de la solicitud -->
              <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px 0; color: #003DA5; font-size: 18px; font-weight: 700;">
                  📋 Detalles de la Solicitud
                </h2>

                <!-- Empresa -->
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #E5E7EB;">
                  <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                    Empresa Solicitante
                  </p>
                  <p style="margin: 0; color: #1F2937; font-size: 16px; font-weight: 600;">
                    🏢 ${data.companyName}
                  </p>
                  <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">
                    NIT: ${data.companyNIT}
                  </p>
                </div>

                <!-- Persona de contacto -->
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #E5E7EB;">
                  <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                    Persona de Contacto
                  </p>
                  <p style="margin: 0; color: #1F2937; font-size: 16px; font-weight: 600;">
                    👤 ${data.contactPerson}
                  </p>
                  <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">
                    📧 ${data.contactEmail}
                  </p>
                </div>

                <!-- Fecha y código -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Fecha de Solicitud
                    </p>
                    <p style="margin: 0; color: #1F2937; font-size: 14px; font-weight: 600;">
                      📅 ${data.requestDate}
                    </p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Código de Certificado
                    </p>
                    <p style="margin: 0; color: #1F2937; font-size: 14px; font-weight: 600;">
                      🔖 ${data.certificateCode}
                    </p>
                  </div>
                </div>
              </div>

              <!-- ¿Qué significa esto? -->
              <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 16px 0; color: #1E40AF; font-size: 16px; font-weight: 700; display: flex; align-items: center;">
                  ℹ️ ¿Qué significa esta notificación?
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #1E3A8A; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">La empresa ha solicitado un <strong>certificado de verificación</strong> de tu título académico</li>
                  <li style="margin-bottom: 8px;">Este proceso es <strong>completamente seguro</strong> y está regulado por ESAP</li>
                  <li style="margin-bottom: 8px;">Solo se comparten datos <strong>académicos oficiales</strong> (programa, fecha de grado, título)</li>
                  <li style="margin-bottom: 0;">Tus datos personales están <strong>protegidos</strong> según la ley de protección de datos</li>
                </ul>
              </div>

              <!-- Acciones recomendadas -->
              <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 16px 0; color: #065F46; font-size: 16px; font-weight: 700;">
                  ✅ Acciones Recomendadas
                </h3>
                <p style="margin: 0 0 12px 0; color: #047857; font-size: 14px; line-height: 1.6;">
                  <strong>1.</strong> Verifica si conoces a la empresa solicitante
                </p>
                <p style="margin: 0 0 12px 0; color: #047857; font-size: 14px; line-height: 1.6;">
                  <strong>2.</strong> Si es parte de un proceso de selección legítimo, no requiere acción de tu parte
                </p>
                <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">
                  <strong>3.</strong> Si no reconoces la empresa, contáctanos inmediatamente
                </p>
              </div>

              <!-- Botón de contacto -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="mailto:titulos@esap.edu.co" style="display: inline-block; background: linear-gradient(135deg, #003DA5 0%, #2962FF 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 61, 165, 0.3);">
                  📧 Contactar a ESAP
                </a>
              </div>

              <!-- Divider -->
              <div style="border-top: 2px solid #E5E7EB; margin: 30px 0;"></div>

              <!-- Footer del contenido -->
              <p style="margin: 0; color: #6B7280; font-size: 13px; line-height: 1.6; text-align: center;">
                Este es un mensaje automático de seguridad y transparencia.<br>
                Para cualquier consulta, contáctanos a <strong>titulos@esap.edu.co</strong>
              </p>

            </td>
          </tr>

          <!-- Footer corporativo -->
          <tr>
            <td style="background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <div style="margin-bottom: 16px;">
                <img src="https://www.esap.edu.co/wp-content/uploads/2023/01/logo-esap.png" alt="ESAP Logo" style="height: 40px; width: auto;">
              </div>
              <p style="margin: 0 0 8px 0; color: #003DA5; font-weight: 700; font-size: 14px;">
                Escuela Superior de Administración Pública
              </p>
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 12px;">
                Formando líderes para el servicio público
              </p>
              <div style="margin-bottom: 16px;">
                <a href="https://www.esap.edu.co" style="color: #2962FF; text-decoration: none; margin: 0 8px; font-size: 12px;">Web</a> |
                <a href="mailto:info@esap.edu.co" style="color: #2962FF; text-decoration: none; margin: 0 8px; font-size: 12px;">Email</a> |
                <a href="tel:+576013353504" style="color: #2962FF; text-decoration: none; margin: 0 8px; font-size: 12px;">Teléfono</a>
              </div>
              <p style="margin: 0; color: #9CA3AF; font-size: 11px;">
                © ${new Date().getFullYear()} ESAP. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Función para simular el envío del email de notificación al graduado
 */
export async function sendGraduateNotificationEmail(data: GraduateNotificationEmailData): Promise<void> {
  const emailHTML = generateGraduateNotificationEmail(data);
  
  console.log('=== EMAIL DE NOTIFICACIÓN AL GRADUADO ===');
  console.log(`Para: ${data.graduateEmail}`);
  console.log(`Asunto: Notificación de Solicitud de Certificado - ${data.companyName}`);
  console.log('HTML generado:', emailHTML.substring(0, 200) + '...');
  console.log('==========================================');
  
  // En producción, aquí se integraría con un servicio de email real
  // Por ahora, solo simulamos el envío
  await new Promise(resolve => setTimeout(resolve, 500));
}
