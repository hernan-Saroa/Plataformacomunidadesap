/**
 * TEMPLATES DE CORREO ELECTRÓNICO ESAP
 * Diseños HTML profesionales para todos los correos del sistema
 * Colores de marca: #003DA5 (Azul ESAP)
 */

interface EmailTemplateParams {
  nombreCompleto: string;
  codigo?: string;
  correoDestino?: string;
  consecutivoCertificado?: string;
  tiempoExpiracion?: string;
  urlValidacion?: string;
  datosAdicionales?: Record<string, any>;
}

/**
 * Template base con header y footer ESAP
 */
const getBaseTemplate = (contenido: string): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESAP - Escuela Superior de Administración Pública</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #003DA5 0%, #0052cc 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      letter-spacing: 2px;
    }
    .subtitle {
      color: #e3f2fd;
      font-size: 14px;
      margin: 8px 0 0 0;
    }
    .content {
      padding: 40px 30px;
    }
    .footer {
      background-color: #f8f9fa;
      border-top: 3px solid #003DA5;
      padding: 25px 30px;
      text-align: center;
    }
    .footer-text {
      color: #666666;
      font-size: 12px;
      line-height: 1.6;
      margin: 5px 0;
    }
    .footer-link {
      color: #003DA5;
      text-decoration: none;
      font-weight: 500;
    }
    .social-icons {
      margin: 15px 0 10px 0;
    }
    .social-link {
      display: inline-block;
      margin: 0 8px;
      color: #003DA5;
      text-decoration: none;
      font-size: 12px;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .footer {
        padding: 20px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1 class="logo">ESAP</h1>
      <p class="subtitle">Escuela Superior de Administración Pública</p>
    </div>

    <!-- Contenido -->
    <div class="content">
      ${contenido}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text" style="margin-bottom: 10px;">
        <strong>Escuela Superior de Administración Pública - ESAP</strong>
      </p>
      <p class="footer-text">
        Calle 44 No. 53-37 CAN, Bogotá D.C., Colombia
      </p>
      <p class="footer-text">
        PBX: +57 (601) 220 2790 | Línea gratuita: 018000 123 ESAP (3727)
      </p>
      <p class="footer-text">
        <a href="https://www.esap.edu.co" class="footer-link">www.esap.edu.co</a> | 
        <a href="mailto:contacto@esap.edu.co" class="footer-link">contacto@esap.edu.co</a>
      </p>
      
      <div class="social-icons">
        <a href="#" class="social-link">Facebook</a> |
        <a href="#" class="social-link">Twitter</a> |
        <a href="#" class="social-link">LinkedIn</a> |
        <a href="#" class="social-link">Instagram</a>
      </div>

      <p class="footer-text" style="margin-top: 15px; font-size: 11px; color: #999;">
        Este es un correo automático del sistema ESAP. Por favor no responder a este mensaje.
        <br>Si tienes alguna duda, comunícate con soporte técnico.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * 1. CERTIFICADO LABORAL - Código de Verificación
 */
export const getEmailCodigoCertificadoLaboral = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .code-container { 
        background: linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%);
        border: 3px solid #003DA5;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
        box-shadow: 0 4px 15px rgba(0, 61, 165, 0.1);
      }
      .code-label {
        font-size: 13px;
        color: #003DA5;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .code {
        font-size: 42px;
        font-weight: bold;
        color: #003DA5;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        margin: 15px 0;
        text-shadow: 2px 2px 4px rgba(0, 61, 165, 0.1);
      }
      .expiration {
        font-size: 13px;
        color: #d32f2f;
        font-weight: 600;
        margin-top: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .info-box {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .info-title {
        font-weight: 600;
        color: #856404;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .info-text {
        color: #856404;
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
      }
      .security-box {
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .security-title {
        font-weight: 600;
        color: #2e7d32;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .security-text {
        color: #2e7d32;
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #003DA5 0%, #0052cc 100%);
        color: #ffffff !important;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        margin: 25px 0;
        box-shadow: 0 4px 12px rgba(0, 61, 165, 0.3);
        transition: all 0.3s ease;
      }
      .steps {
        margin: 25px 0;
        padding-left: 20px;
      }
      .step {
        margin: 12px 0;
        color: #555555;
        font-size: 14px;
        line-height: 1.6;
      }
      .signature {
        margin-top: 35px;
        padding-top: 25px;
        border-top: 2px solid #e0e0e0;
        color: #666666;
        font-size: 13px;
      }
    </style>

    <p class="greeting">Estimado/a <strong>${params.nombreCompleto}</strong>,</p>

    <p class="message">
      Has solicitado un <strong>Certificado Laboral</strong> a través del portal web de ESAP. 
      Para completar el proceso y generar tu certificado, por favor utiliza el siguiente código de verificación:
    </p>

    <div class="code-container">
      <div class="code-label">🔐 CÓDIGO DE VERIFICACIÓN</div>
      <div class="code">${params.codigo}</div>
      <div class="expiration">
        ⏱️ Este código expira en <strong>${params.tiempoExpiracion || '5 minutos'}</strong>
      </div>
    </div>

    <div class="info-box">
      <div class="info-title">📋 Pasos a seguir:</div>
      <div class="steps">
        <div class="step">1️⃣ Regresa a la ventana de solicitud de certificado</div>
        <div class="step">2️⃣ Ingresa este código de 6 dígitos en los campos indicados</div>
        <div class="step">3️⃣ Haz clic en "Validar y Generar Certificado"</div>
        <div class="step">4️⃣ Tu certificado se generará automáticamente y podrás descargarlo</div>
      </div>
    </div>

    <div class="security-box">
      <div class="security-title">🔒 Información de Seguridad</div>
      <p class="security-text">
        • Este código es de <strong>un solo uso</strong> y personal<br>
        • <strong>No compartas</strong> este código con nadie<br>
        • Si no solicitaste este certificado, ignora este correo<br>
        • El código expirará automáticamente después de ${params.tiempoExpiracion || '5 minutos'}
      </p>
    </div>

    <p class="message" style="margin-top: 30px;">
      Una vez validado el código, tu certificado será generado con:
    </p>
    <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>✅ Código QR único de verificación</li>
      <li>✅ Firma electrónica institucional</li>
      <li>✅ Sello digital de ESAP</li>
      <li>✅ Validez legal para trámites oficiales</li>
    </ul>

    <div class="signature">
      <p style="margin: 0; font-weight: 600; color: #003DA5;">
        Dirección de Talento Humano
      </p>
      <p style="margin: 5px 0 0 0;">
        Escuela Superior de Administración Pública - ESAP
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 2. CERTIFICADO LABORAL - Certificado Generado (con adjunto)
 */
export const getEmailCertificadoGenerado = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .success-box {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border: 3px solid #4caf50;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
      }
      .success-icon {
        font-size: 50px;
        margin-bottom: 15px;
      }
      .success-title {
        font-size: 22px;
        color: #2e7d32;
        font-weight: bold;
        margin: 10px 0;
      }
      .certificate-info {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #e0e0e0;
      }
      .info-row:last-child {
        border-bottom: none;
      }
      .info-label {
        font-weight: 600;
        color: #666666;
        font-size: 13px;
      }
      .info-value {
        color: #333333;
        font-size: 13px;
        font-weight: 500;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #003DA5 0%, #0052cc 100%);
        color: #ffffff !important;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        margin: 25px 0;
        box-shadow: 0 4px 12px rgba(0, 61, 165, 0.3);
      }
      .qr-info {
        background-color: #e3f2fd;
        border-left: 4px solid #003DA5;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .attachment-box {
        background-color: #fff9c4;
        border: 2px dashed #fbc02d;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        margin: 25px 0;
      }
      .attachment-icon {
        font-size: 40px;
        margin-bottom: 10px;
      }
    </style>

    <p class="greeting">Estimado/a <strong>${params.nombreCompleto}</strong>,</p>

    <div class="success-box">
      <div class="success-icon">✅</div>
      <div class="success-title">¡Certificado Generado Exitosamente!</div>
      <p style="color: #2e7d32; margin: 10px 0 0 0; font-size: 14px;">
        Tu Certificado Laboral ha sido procesado y está listo
      </p>
    </div>

    <p class="message">
      Nos complace informarte que tu <strong>Certificado Laboral</strong> ha sido generado 
      satisfactoriamente con todos los estándares de seguridad y validación de ESAP.
    </p>

    <div class="certificate-info">
      <div class="info-row">
        <span class="info-label">📄 Consecutivo:</span>
        <span class="info-value">${params.consecutivoCertificado || 'CL-2025-0001'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 Fecha de Emisión:</span>
        <span class="info-value">${new Date().toLocaleDateString('es-CO', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}</span>
      </div>
      <div class="info-row">
        <span class="info-label">👤 Titular:</span>
        <span class="info-value">${params.nombreCompleto}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🔐 Estado:</span>
        <span class="info-value" style="color: #4caf50; font-weight: bold;">VÁLIDO</span>
      </div>
    </div>

    <div class="attachment-box">
      <div class="attachment-icon">📎</div>
      <p style="margin: 10px 0; color: #f57c00; font-weight: 600; font-size: 15px;">
        El certificado está adjunto a este correo en formato PDF
      </p>
      <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">
        Nombre del archivo: <strong>Certificado_Laboral_${params.consecutivoCertificado}.pdf</strong>
      </p>
    </div>

    <div class="qr-info">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #003DA5; font-size: 14px;">
        📱 Verificación con Código QR
      </p>
      <p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.6;">
        Tu certificado incluye un <strong>código QR único</strong> que puede ser escaneado 
        en cualquier momento para verificar su autenticidad en línea. También puedes validarlo 
        manualmente ingresando el consecutivo en:
      </p>
      <p style="margin: 10px 0 0 0;">
        <a href="${params.urlValidacion || 'https://esap.edu.co/verificar'}" 
           style="color: #003DA5; font-weight: 600; text-decoration: none;">
          🌐 ${params.urlValidacion || 'https://esap.edu.co/verificar'}
        </a>
      </p>
    </div>

    <p class="message" style="margin-top: 30px;">
      <strong>Características del certificado:</strong>
    </p>
    <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>✅ Validez legal para trámites oficiales</li>
      <li>✅ Firma electrónica del Director de Talento Humano</li>
      <li>✅ Sello digital institucional</li>
      <li>✅ Código QR de verificación instantánea</li>
      <li>✅ Trazabilidad completa en el sistema</li>
    </ul>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
      <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.6;">
        Si tienes alguna pregunta o necesitas asistencia adicional, no dudes en contactarnos 
        a través de nuestros canales oficiales de atención.
      </p>
      <p style="margin: 20px 0 0 0; font-weight: 600; color: #003DA5;">
        Dirección de Talento Humano<br>
        <span style="font-weight: normal; color: #666; font-size: 13px;">
          Escuela Superior de Administración Pública - ESAP
        </span>
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 3. AUTENTICACIÓN 2FA - Código de Verificación Login
 */
export const getEmail2FALogin = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .code-container { 
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border: 3px solid #ff9800;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
        box-shadow: 0 4px 15px rgba(255, 152, 0, 0.2);
      }
      .code-label {
        font-size: 13px;
        color: #e65100;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .code {
        font-size: 42px;
        font-weight: bold;
        color: #e65100;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        margin: 15px 0;
      }
      .warning-box {
        background-color: #ffebee;
        border-left: 4px solid #f44336;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .device-info {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        font-size: 13px;
        color: #666;
      }
    </style>

    <p class="greeting">Hola <strong>${params.nombreCompleto}</strong>,</p>

    <p class="message">
      Se ha detectado un <strong>intento de inicio de sesión</strong> en tu cuenta del Sistema ESAP. 
      Para completar el proceso de autenticación, utiliza el siguiente código de verificación:
    </p>

    <div class="code-container">
      <div class="code-label">🔐 CÓDIGO DE AUTENTICACIÓN 2FA</div>
      <div class="code">${params.codigo}</div>
      <p style="color: #e65100; margin: 15px 0 0 0; font-size: 13px; font-weight: 600;">
        ⏱️ Válido por ${params.tiempoExpiracion || '10 minutos'}
      </p>
    </div>

    ${params.datosAdicionales?.deviceInfo ? `
    <div class="device-info">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #333;">📱 Información del dispositivo:</p>
      <p style="margin: 3px 0;">🌍 Ubicación: ${params.datosAdicionales.deviceInfo.location || 'No disponible'}</p>
      <p style="margin: 3px 0;">💻 Dispositivo: ${params.datosAdicionales.deviceInfo.device || 'No disponible'}</p>
      <p style="margin: 3px 0;">🕐 Hora: ${new Date().toLocaleString('es-CO')}</p>
    </div>
    ` : ''}

    <div class="warning-box">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #c62828; font-size: 14px;">
        ⚠️ Importante - Seguridad de tu cuenta
      </p>
      <p style="margin: 0; color: #c62828; font-size: 13px; line-height: 1.6;">
        Si <strong>NO fuiste tú</strong> quien intentó iniciar sesión, <strong>NO ingreses este código</strong> 
        y comunícate inmediatamente con el área de soporte técnico. Tu cuenta podría estar en riesgo.
      </p>
    </div>

    <p class="message" style="margin-top: 30px;">
      <strong>Para tu seguridad, recuerda:</strong>
    </p>
    <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>🔒 Nunca compartas este código con nadie</li>
      <li>📧 ESAP nunca te pedirá este código por teléfono o correo</li>
      <li>⏰ Este código expira automáticamente después de ${params.tiempoExpiracion || '10 minutos'}</li>
      <li>🚫 Es de un solo uso y personal</li>
    </ul>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
      <p style="margin: 0; font-weight: 600; color: #003DA5;">
        Centro de Seguridad y Soporte Técnico
      </p>
      <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
        Escuela Superior de Administración Pública - ESAP
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 4. CAMBIO DE CONTRASEÑA - Código de Verificación
 */
export const getEmailCodigoCambioPassword = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .code-container { 
        background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
        border: 3px solid #9c27b0;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
        box-shadow: 0 4px 15px rgba(156, 39, 176, 0.2);
      }
      .code-label {
        font-size: 13px;
        color: #6a1b9a;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .code {
        font-size: 42px;
        font-weight: bold;
        color: #6a1b9a;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        margin: 15px 0;
      }
      .alert-box {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
    </style>

    <p class="greeting">Hola <strong>${params.nombreCompleto}</strong>,</p>

    <p class="message">
      Has solicitado <strong>cambiar tu contraseña</strong> en el Sistema ESAP. 
      Para verificar tu identidad y proceder con el cambio, utiliza el siguiente código:
    </p>

    <div class="code-container">
      <div class="code-label">🔑 CÓDIGO DE VERIFICACIÓN</div>
      <div class="code">${params.codigo}</div>
      <p style="color: #6a1b9a; margin: 15px 0 0 0; font-size: 13px; font-weight: 600;">
        ⏱️ Expira en ${params.tiempoExpiracion || '60 segundos'}
      </p>
    </div>

    <div class="alert-box">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #856404; font-size: 14px;">
        ⚠️ ¿No solicitaste este cambio?
      </p>
      <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6;">
        Si no fuiste tú quien solicitó el cambio de contraseña, <strong>ignora este correo</strong>. 
        Tu contraseña actual seguirá siendo válida. Sin embargo, te recomendamos cambiarla 
        inmediatamente desde tu perfil por seguridad.
      </p>
    </div>

    <p class="message" style="margin-top: 30px;">
      <strong>Pasos para completar el cambio:</strong>
    </p>
    <ol style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>Ingresa este código de 6 dígitos en la ventana de verificación</li>
      <li>Crea una nueva contraseña segura (mínimo 8 caracteres)</li>
      <li>Confirma tu nueva contraseña</li>
      <li>¡Listo! Podrás iniciar sesión con tu nueva contraseña</li>
    </ol>

    <p class="message">
      <strong>Recomendaciones para una contraseña segura:</strong>
    </p>
    <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>✅ Mínimo 8 caracteres de longitud</li>
      <li>✅ Incluye mayúsculas y minúsculas</li>
      <li>✅ Incluye números</li>
      <li>✅ Incluye símbolos especiales (!@#$%)</li>
      <li>🚫 No uses información personal fácil de adivinar</li>
    </ul>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
      <p style="margin: 0; font-weight: 600; color: #003DA5;">
        Centro de Seguridad ESAP
      </p>
      <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
        Escuela Superior de Administración Pública
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 5. NUEVO USUARIO - Código de Verificación para Activación
 */
export const getEmailCodigoNuevoUsuario = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .welcome-box {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
      }
      .welcome-title {
        font-size: 24px;
        color: #2e7d32;
        font-weight: bold;
        margin: 15px 0;
      }
      .code-container { 
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border: 3px solid #003DA5;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
      }
      .code {
        font-size: 42px;
        font-weight: bold;
        color: #003DA5;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        margin: 15px 0;
      }
      .credentials-box {
        background-color: #f5f5f5;
        border: 2px solid #003DA5;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }
    </style>

    <div class="welcome-box">
      <div style="font-size: 50px; margin-bottom: 10px;">🎉</div>
      <div class="welcome-title">¡Bienvenido/a a ESAP!</div>
      <p style="color: #2e7d32; margin: 10px 0 0 0; font-size: 14px;">
        Tu cuenta ha sido creada exitosamente
      </p>
    </div>

    <p class="greeting">Estimado/a <strong>${params.nombreCompleto}</strong>,</p>

    <p class="message">
      Nos complace darte la bienvenida al <strong>Sistema Universitario ESAP</strong>. 
      Tu cuenta ha sido creada y ahora necesitas activarla utilizando el siguiente código de verificación:
    </p>

    <div class="code-container">
      <div style="font-size: 13px; color: #003DA5; font-weight: 600; margin-bottom: 12px;">
        🔐 CÓDIGO DE ACTIVACIÓN
      </div>
      <div class="code">${params.codigo}</div>
      <p style="color: #003DA5; margin: 15px 0 0 0; font-size: 13px; font-weight: 600;">
        ⏱️ Válido por ${params.tiempoExpiracion || '24 horas'}
      </p>
    </div>

    <div class="credentials-box">
      <p style="margin: 0 0 15px 0; font-weight: 600; color: #003DA5; font-size: 15px;">
        📧 Tus credenciales de acceso
      </p>
      <div style="margin: 10px 0;">
        <p style="margin: 5px 0; color: #666; font-size: 13px;"><strong>Correo Institucional:</strong></p>
        <p style="margin: 5px 0; color: #003DA5; font-size: 15px; font-weight: 600;">${params.correoDestino}</p>
      </div>
      <div style="margin: 15px 0 10px 0;">
        <p style="margin: 5px 0; color: #666; font-size: 13px;"><strong>Contraseña Temporal:</strong></p>
        <p style="margin: 5px 0; color: #333; font-size: 14px; font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; display: inline-block;">
          ${params.datosAdicionales?.passwordTemporal || '••••••••'}
        </p>
      </div>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #d32f2f; font-weight: 600;">
        ⚠️ Deberás cambiar esta contraseña en tu primer inicio de sesión
      </p>
    </div>

    <p class="message">
      <strong>Pasos para activar tu cuenta:</strong>
    </p>
    <ol style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>Ingresa a <a href="https://esap.edu.co/portal" style="color: #003DA5; font-weight: 600;">https://esap.edu.co/portal</a></li>
      <li>Haz clic en "Activar cuenta nueva"</li>
      <li>Ingresa tu correo institucional y el código de activación</li>
      <li>Crea tu contraseña personal (mínimo 8 caracteres)</li>
      <li>¡Comienza a utilizar todos los servicios ESAP!</li>
    </ol>

    <p class="message">
      <strong>Con tu cuenta tendrás acceso a:</strong>
    </p>
    <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>📚 Portal Académico y Biblioteca Virtual</li>
      <li>📧 Correo Institucional @esap.edu.co</li>
      <li>📄 Certificados y Documentos Oficiales</li>
      <li>👥 Red Social Universitaria</li>
      <li>📊 Plataforma de Aprendizaje Virtual</li>
      <li>🎓 Servicios Estudiantiles y Administrativos</li>
    </ul>

    <div style="background-color: #e3f2fd; border-left: 4px solid #003DA5; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #003DA5; font-size: 14px;">
        💡 ¿Necesitas ayuda?
      </p>
      <p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.6;">
        Si tienes alguna dificultad para activar tu cuenta, nuestro equipo de soporte está 
        disponible de lunes a viernes de 8:00 AM a 6:00 PM en 
        <strong>soporte@esap.edu.co</strong> o línea gratuita <strong>018000 123 3727</strong>
      </p>
    </div>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
      <p style="margin: 0; font-weight: 600; color: #003DA5;">
        Dirección de Tecnología e Innovación
      </p>
      <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
        Escuela Superior de Administración Pública - ESAP
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 6. VERIFICACIÓN DE TÍTULOS - Certificado Generado Instantáneamente
 */
export const getEmailVerificacionTituloGenerado = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .success-box {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border: 3px solid #4caf50;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
      }
      .success-icon {
        font-size: 60px;
        margin-bottom: 15px;
      }
      .success-title {
        font-size: 24px;
        color: #2e7d32;
        font-weight: bold;
        margin: 10px 0;
      }
      .certificate-info {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }
      .info-row {
        padding: 10px 0;
        border-bottom: 1px solid #e0e0e0;
      }
      .info-row:last-child {
        border-bottom: none;
      }
      .info-label {
        font-weight: 600;
        color: #666666;
        font-size: 13px;
        display: block;
        margin-bottom: 4px;
      }
      .info-value {
        color: #003DA5;
        font-size: 15px;
        font-weight: 600;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
        color: #ffffff !important;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        margin: 25px 0;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }
      .qr-section {
        background-color: #e3f2fd;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
        text-align: center;
      }
    </style>

    <p class="greeting">Estimado/a <strong>${params.nombreCompleto}</strong>,</p>

    <div class="success-box">
      <div class="success-icon">🎓</div>
      <div class="success-title">¡Certificado de Verificación Generado!</div>
      <p style="color: #2e7d32; margin: 10px 0 0 0; font-size: 15px;">
        Tu certificado está listo y disponible para descargar
      </p>
    </div>

    <p class="message">
      Nos complace informarte que tu <strong>Certificado de Verificación de Título Académico</strong> 
      ha sido generado exitosamente. Este documento certifica oficialmente tu título otorgado por ESAP.
    </p>

    <div class="certificate-info">
      <div class="info-row">
        <span class="info-label">📄 Número de Certificado:</span>
        <span class="info-value">${params.consecutivoCertificado || 'ESAP-CERT-2025-XXXXXX'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🎓 Graduado:</span>
        <span class="info-value">${params.datosAdicionales?.nombreGraduado || params.nombreCompleto}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📚 Programa Académico:</span>
        <span class="info-value">${params.datosAdicionales?.programa || 'Administración Pública'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🏆 Título:</span>
        <span class="info-value">${params.datosAdicionales?.tipoTitulo || 'Pregrado'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 Fecha de Graduación:</span>
        <span class="info-value">${params.datosAdicionales?.fechaGraduacion || new Date().toLocaleDateString('es-CO')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📋 Solicitado por:</span>
        <span class="info-value">${params.nombreCompleto}</span>
      </div>
    </div>

    <div class="qr-section">
      <p style="margin: 0 0 15px 0; font-weight: 600; color: #003DA5; font-size: 16px;">
        📱 Código QR de Verificación
      </p>
      <div style="background-color: white; width: 150px; height: 150px; margin: 20px auto; border: 3px solid #003DA5; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 80px;">📄</span>
      </div>
      <p style="margin: 15px 0 0 0; color: #1565c0; font-size: 13px; line-height: 1.6;">
        Este QR permite verificar la autenticidad del certificado en cualquier momento.<br>
        También puedes validarlo manualmente en:
      </p>
      <p style="margin: 10px 0 0 0;">
        <a href="${params.urlValidacion || 'https://esap.edu.co/verificar-titulo'}" 
           style="color: #003DA5; font-weight: 600; text-decoration: none; font-size: 14px;">
          🌐 ${params.urlValidacion || 'https://esap.edu.co/verificar-titulo'}
        </a>
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.urlValidacion || '#'}" class="button">
        📥 Descargar Certificado PDF
      </a>
    </div>

    <p class="message">
      <strong>Características de tu certificado:</strong>
    </p>
    <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>✅ Validez oficial para trámites laborales y académicos</li>
      <li>✅ Código QR único de verificación pública</li>
      <li>✅ Firma digital del Rector de ESAP</li>
      <li>✅ Trazabilidad completa en el sistema</li>
      <li>✅ Verificable 24/7 en línea</li>
      <li>✅ Formato PDF de alta calidad para impresión</li>
    </ul>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #856404; font-size: 14px;">
        💼 Uso del Certificado
      </p>
      <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6;">
        Este certificado puede ser presentado ante empleadores, instituciones educativas o 
        entidades gubernamentales. El código QR permite que cualquier persona verifique su autenticidad 
        instantáneamente escaneándolo con su teléfono móvil.
      </p>
    </div>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
      <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.6;">
        Si tienes alguna pregunta o necesitas asistencia, contáctanos en:<br>
        <strong>verificacion@esap.edu.co</strong> | Línea gratuita: <strong>018000 123 3727</strong>
      </p>
      <p style="margin: 20px 0 0 0; font-weight: 600; color: #003DA5;">
        Dirección de Registro y Control Académico<br>
        <span style="font-weight: normal; color: #666; font-size: 13px;">
          Escuela Superior de Administración Pública - ESAP
        </span>
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 7. VERIFICACIÓN DE TÍTULOS - Solicitud de Revisión Manual (48-72h)
 */
export const getEmailVerificacionTituloRevision = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
      .message { font-size: 14px; color: #555555; line-height: 1.6; margin-bottom: 25px; }
      .info-box {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border: 3px solid #ff9800;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin: 30px 0;
      }
      .info-icon {
        font-size: 60px;
        margin-bottom: 15px;
      }
      .info-title {
        font-size: 22px;
        color: #e65100;
        font-weight: bold;
        margin: 10px 0;
      }
      .request-info {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }
      .info-row {
        padding: 10px 0;
        border-bottom: 1px solid #e0e0e0;
      }
      .info-row:last-child {
        border-bottom: none;
      }
      .info-label {
        font-weight: 600;
        color: #666666;
        font-size: 13px;
        display: block;
        margin-bottom: 4px;
      }
      .info-value {
        color: #333333;
        font-size: 14px;
      }
      .timeline {
        background-color: #e3f2fd;
        border-left: 4px solid #003DA5;
        padding: 20px;
        margin: 25px 0;
        border-radius: 4px;
      }
    </style>

    <p class="greeting">Estimado/a <strong>${params.nombreCompleto}</strong>,</p>

    <div class="info-box">
      <div class="info-icon">📋</div>
      <div class="info-title">Solicitud de Revisión Recibida</div>
      <p style="color: #e65100; margin: 10px 0 0 0; font-size: 14px;">
        Tu solicitud está en proceso de verificación manual
      </p>
    </div>

    <p class="message">
      Hemos recibido tu solicitud de <strong>Certificado de Verificación de Título Académico</strong>. 
      Los datos del graduado no fueron encontrados automáticamente en nuestra base de datos digital, 
      por lo que realizaremos una <strong>revisión manual en nuestros archivos históricos</strong>.
    </p>

    <div class="request-info">
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; font-weight: 600; color: #003DA5; font-size: 15px;">
          📄 Detalles de tu Solicitud
        </p>
      </div>
      <div class="info-row">
        <span class="info-label">🆔 Número de Solicitud:</span>
        <span class="info-value">${params.consecutivoCertificado || 'REV-2025-' + Math.floor(1000 + Math.random() * 9000)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 Fecha de Solicitud:</span>
        <span class="info-value">${new Date().toLocaleDateString('es-CO', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
      <div class="info-row">
        <span class="info-label">👤 Solicitante:</span>
        <span class="info-value">${params.nombreCompleto}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📧 Correo de Contacto:</span>
        <span class="info-value">${params.correoDestino}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🎓 Graduado a Verificar:</span>
        <span class="info-value">${params.datosAdicionales?.nombreGraduado || 'Datos proporcionados'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🆔 Documento del Graduado:</span>
        <span class="info-value">${params.datosAdicionales?.documentoGraduado || 'CC XXXXXXXXXX'}</span>
      </div>
    </div>

    <div class="timeline">
      <p style="margin: 0 0 15px 0; font-weight: 600; color: #003DA5; font-size: 16px;">
        ⏱️ Línea de Tiempo del Proceso
      </p>
      <div style="margin: 15px 0;">
        <p style="margin: 8px 0; color: #1565c0; font-size: 14px;">
          <strong>✅ Paso 1:</strong> Solicitud recibida (Hoy)
        </p>
        <p style="margin: 8px 0; color: #666; font-size: 14px;">
          <strong>🔍 Paso 2:</strong> Revisión de archivos históricos (24-48 horas)
        </p>
        <p style="margin: 8px 0; color: #666; font-size: 14px;">
          <strong>📧 Paso 3:</strong> Notificación de resultados (48-72 horas)
        </p>
      </div>
      <p style="margin: 15px 0 0 0; color: #1565c0; font-size: 13px; line-height: 1.6;">
        <strong>Tiempo estimado de respuesta:</strong> 48 a 72 horas hábiles<br>
        Te contactaremos a <strong>${params.correoDestino}</strong>
      </p>
    </div>

    <p class="message">
      <strong>¿Qué sucede ahora?</strong>
    </p>
    <ol style="color: #555555; font-size: 14px; line-height: 1.8;">
      <li>Nuestro equipo revisará los registros académicos históricos</li>
      <li>Verificaremos la información del graduado en archivos físicos y digitales</li>
      <li>Una vez completada la revisión, te enviaremos un correo con:
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>✅ <strong>Si encontramos el registro:</strong> Tu certificado de verificación estará listo para descargar</li>
          <li>❌ <strong>Si no encontramos el registro:</strong> Te informaremos que no hay registro de graduación en ESAP</li>
        </ul>
      </li>
    </ol>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #856404; font-size: 14px;">
        📝 Nota Importante
      </p>
      <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6;">
        Si el graduado completó sus estudios recientemente (últimos 6 meses), es posible que 
        sus datos aún no estén digitalizados en nuestro sistema. Nuestro equipo verificará 
        manualmente todos los registros para proporcionarte la información correcta.
      </p>
    </div>

    <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #2e7d32; font-size: 14px;">
        💡 Mientras esperas
      </p>
      <p style="margin: 0; color: #2e7d32; font-size: 13px; line-height: 1.6;">
        No necesitas realizar ninguna acción adicional. Te notificaremos automáticamente 
        cuando la revisión esté completa. Por favor revisa tu bandeja de entrada y carpeta de spam.
      </p>
    </div>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
      <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
        <strong>¿Tienes preguntas?</strong><br>
        Contáctanos en: <strong>verificacion@esap.edu.co</strong><br>
        Línea gratuita: <strong>018000 123 ESAP (3727)</strong><br>
        Horario de atención: Lunes a viernes, 8:00 AM - 6:00 PM
      </p>
      <p style="margin: 20px 0 0 0; font-weight: 600; color: #003DA5;">
        Dirección de Registro y Control Académico<br>
        <span style="font-weight: normal; color: #666; font-size: 13px;">
          Escuela Superior de Administración Pública - ESAP
        </span>
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * 8. BIENVENIDA - Usuario ya Activado (sin código)
 */
export const getEmailBienvenida = (params: EmailTemplateParams): string => {
  const contenido = `
    <style>
      .welcome-hero {
        background: linear-gradient(135deg, #003DA5 0%, #0052cc 100%);
        color: white;
        border-radius: 12px;
        padding: 40px 30px;
        text-align: center;
        margin: 30px 0;
      }
      .welcome-title {
        font-size: 32px;
        font-weight: bold;
        margin: 15px 0;
      }
      .feature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin: 25px 0;
      }
      .feature-card {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
        color: #ffffff !important;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        margin: 25px 0;
      }
    </style>

    <div class="welcome-hero">
      <div style="font-size: 60px; margin-bottom: 15px;">🎓</div>
      <div class="welcome-title">¡Bienvenido/a a la Familia ESAP!</div>
      <p style="font-size: 16px; margin: 15px 0 0 0; opacity: 0.9;">
        Tu cuenta está activa y lista para usar
      </p>
    </div>

    <p style="font-size: 16px; color: #333; margin: 25px 0;">
      Estimado/a <strong>${params.nombreCompleto}</strong>,
    </p>

    <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 20px 0;">
      Es un placer darte la bienvenida a la <strong>Escuela Superior de Administración Pública</strong>. 
      Tu cuenta ha sido activada exitosamente y ahora tienes acceso completo a todos nuestros servicios digitales.
    </p>

    <div class="feature-grid">
      <div class="feature-card">
        <div style="font-size: 36px; margin-bottom: 10px;">📚</div>
        <h3 style="color: #003DA5; font-size: 15px; margin: 10px 0;">Portal Académico</h3>
        <p style="color: #666; font-size: 13px; margin: 5px 0;">Accede a tus cursos y material de estudio</p>
      </div>
      <div class="feature-card">
        <div style="font-size: 36px; margin-bottom: 10px;">👥</div>
        <h3 style="color: #003DA5; font-size: 15px; margin: 10px 0;">Red Social</h3>
        <p style="color: #666; font-size: 13px; margin: 5px 0;">Conéctate con la comunidad ESAP</p>
      </div>
      <div class="feature-card">
        <div style="font-size: 36px; margin-bottom: 10px;">📄</div>
        <h3 style="color: #003DA5; font-size: 15px; margin: 10px 0;">Certificados</h3>
        <p style="color: #666; font-size: 13px; margin: 5px 0;">Solicita documentos oficiales</p>
      </div>
      <div class="feature-card">
        <div style="font-size: 36px; margin-bottom: 10px;">📧</div>
        <h3 style="color: #003DA5; font-size: 15px; margin: 10px 0;">Correo Institucional</h3>
        <p style="color: #666; font-size: 13px; margin: 5px 0;">Usa tu email @esap.edu.co</p>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://esap.edu.co/portal" class="button">
        🚀 Ingresar al Portal
      </a>
    </div>

    <div style="background-color: #e3f2fd; border-left: 4px solid #003DA5; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #003DA5; font-size: 15px;">
        🎯 Primeros Pasos Recomendados
      </p>
      <ol style="color: #1565c0; font-size: 13px; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
        <li>Completa tu perfil con foto y datos personales</li>
        <li>Configura tus notificaciones y preferencias</li>
        <li>Explora la biblioteca virtual y recursos académicos</li>
        <li>Únete a grupos de interés en la red social</li>
        <li>Revisa el calendario académico y eventos</li>
      </ol>
    </div>

    <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 25px 0;">
      Estamos aquí para apoyarte en tu camino académico y profesional. No dudes en explorar 
      todas las herramientas y servicios que hemos preparado para ti.
    </p>

    <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e0e0e0; text-align: center;">
      <p style="margin: 0; font-size: 16px; color: #003DA5; font-weight: 600;">
        ¡Éxitos en tu camino con ESAP!
      </p>
      <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
        Dirección de Tecnología e Innovación<br>
        Escuela Superior de Administración Pública
      </p>
    </div>
  `;

  return getBaseTemplate(contenido);
};

/**
 * Función helper para simular envío de correo (para desarrollo)
 */
export const simularEnvioCorreo = (
  tipo: 'certificado-codigo' | 'certificado-generado' | '2fa-login' | 'cambio-password' | 'nuevo-usuario' | 'bienvenida' | 'verificacion-titulo-generado' | 'verificacion-titulo-revision',
  params: EmailTemplateParams
): void => {
  let htmlContent = '';
  let asunto = '';

  switch (tipo) {
    case 'certificado-codigo':
      htmlContent = getEmailCodigoCertificadoLaboral(params);
      asunto = `ESAP - Código de Verificación para Certificado Laboral`;
      break;
    case 'certificado-generado':
      htmlContent = getEmailCertificadoGenerado(params);
      asunto = `ESAP - Tu Certificado Laboral está listo (${params.consecutivoCertificado})`;
      break;
    case '2fa-login':
      htmlContent = getEmail2FALogin(params);
      asunto = `ESAP - Código de Autenticación 2FA`;
      break;
    case 'cambio-password':
      htmlContent = getEmailCodigoCambioPassword(params);
      asunto = `ESAP - Código para Cambio de Contraseña`;
      break;
    case 'nuevo-usuario':
      htmlContent = getEmailCodigoNuevoUsuario(params);
      asunto = `ESAP - Activa tu Cuenta Universitaria`;
      break;
    case 'bienvenida':
      htmlContent = getEmailBienvenida(params);
      asunto = `¡Bienvenido/a a ESAP! - Tu cuenta está activa`;
      break;
    case 'verificacion-titulo-generado':
      htmlContent = getEmailVerificacionTituloGenerado(params);
      asunto = `ESAP - Tu Certificado de Verificación de Título está listo`;
      break;
    case 'verificacion-titulo-revision':
      htmlContent = getEmailVerificacionTituloRevision(params);
      asunto = `ESAP - Solicitud de Verificación de Título en Proceso`;
      break;
  }

  console.log('\n📧 ============ CORREO ELECTRÓNICO ============');
  console.log('📬 Destinatario:', params.correoDestino || params.nombreCompleto);
  console.log('📌 Asunto:', asunto);
  if (params.codigo) {
    console.log('🔐 Código:', params.codigo);
  }
  console.log('💌 Vista previa HTML guardada en consola');
  console.log('============================================\n');
  
  // En desarrollo, podrías abrir el HTML en una nueva ventana
  // const ventana = window.open('', '_blank');
  // ventana?.document.write(htmlContent);
};

export default {
  getEmailCodigoCertificadoLaboral,
  getEmailCertificadoGenerado,
  getEmail2FALogin,
  getEmailCodigoCambioPassword,
  getEmailCodigoNuevoUsuario,
  getEmailBienvenida,
  getEmailVerificacionTituloGenerado,
  getEmailVerificacionTituloRevision,
  simularEnvioCorreo
};
