/**
 * Genera el HTML de un botón de acción institucional para plantillas de correo electrónico.
 * 
 * Diseñado con compatibilidad absoluta (bulletproof button):
 * - Válido en Outlook Desktop (Word engine), Outlook 365 Web, Gmail Web/App, Apple Mail (Light/Dark Mode).
 * - NO utiliza '!important' en estilos inline (para evitar que sanitizadores como Gmail/Outlook descarten la propiedad 'color').
 * - Utiliza '<font color="#ffffff">' como salvaguarda a nivel de atributo HTML para impedir que clientes de correo fuercen su color azul de enlace predeterminado.
 * - Asegura background-color y padding en el '<td>' para que el botón mantenga forma y contraste aún si el cliente no estiliza '<a>'.
 * - Incluye marcado VML condicional (mso) para renderizado nativo en Outlook para Windows.
 */
export function buildEmailButton(url: string, text: string = 'Ingresar a la Plataforma'): string {
  const safeText = (text || 'Ingresar a la Plataforma')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="14%" stroke="f" fillcolor="#003DA5">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">
          ${safeText} &rarr;
        </center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tr>
          <td align="center" valign="middle" bgcolor="#003DA5" style="border-radius: 6px; background-color: #003DA5; text-align: center; mso-padding-alt: 0;">
            <a href="${url}" target="_blank" rel="noopener noreferrer" style="background-color: #003DA5; border: 12px solid #003DA5; border-radius: 6px; color: #ffffff; display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; line-height: 18px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none; min-width: 180px;">
              <font color="#ffffff" style="color: #ffffff;">
                <span style="color: #ffffff; text-decoration: none; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700;">
                  ${safeText} &rarr;
                </span>
              </font>
            </a>
          </td>
        </tr>
      </table>
      <!--<![endif]-->
      <p style="margin: 14px 0 0 0; font-size: 11px; color: #64748B; text-align: center; line-height: 1.4;">
        Si el bot&oacute;n no abre directamente, copie y pegue este enlace en su navegador:<br>
        <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #003DA5; font-size: 11px; text-decoration: underline; word-break: break-all;">${url}</a>
      </p>
    </div>
  `;
}
