import services = require('./platform-services.json');

// El contrato de build contrasta este catálogo con la portada, rutas y formularios.
// Orientación de uso: no consulta expedientes ni ejecuta trámites.
export function platformGuidance(question: string): string | undefined {
  const text = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const navigation = /\bdonde\b|\bcomo\b|\b(?:abrir|ingresar|acceder|necesito|quiero|solicito|busco|pedir|sacar|obtener|bajar)\b|^(?:solicitar|consultar|descargar)\b|^(?:certificados? laboral(?:es)?|(?:verificacion|certificacion|certificados?) de (?:titulos?(?: academicos?)?|grados?|graduad[oa]s?))[?.!\s]*$/.test(text);
  if (!navigation || /\b(objetivo|alcance|normativa|norma|requisitos|soportes|plazos|contenido)\b|segun\s+isolucion/.test(text)) return undefined;
  if (/\bcertific\w*\b|\bconstancia\b/.test(text) && /\blabor\w*\b/.test(text)) {
    return `Puedes solicitarlo desde la portada, en **Servicios → ${services.labor.name}**. También puedes abrir directamente [Solicitar certificado laboral](${services.labor.path}).\n\nEn ese formulario valida tu identidad por correo y sigue los pasos para generar tu certificado. No necesitas escribir tus datos personales en este chat.`;
  }
  if (/\b(grados?|graduad[oa]s?|titulos?|diplomas?)\b/.test(text) && /certific|verific|valid/.test(text)) {
    return `En la portada abre **Servicios → ${services.titles.name}** o entra directamente a [${services.titles.name}](${services.titles.path}).\n\nAllí puedes solicitar un certificado de verificación de un título de la ESAP. Selecciona el tipo de solicitante y completa los datos del graduado y el correo de recepción en el formulario. La emisión depende de la validación de los registros; si requiere revisión, sigue las indicaciones de esa pantalla.`;
  }
  if (/\bcertificados?\s*[?!.]*\s*$/.test(text)) return `¿Necesitas **${services.labor.name}**, **${services.titles.name}**, o validar un certificado que ya tienes?`;
  if (/\bviatic\w*\b|gastos de viaje|comision de servicios/.test(text)) {
    return 'Inicia sesión y abre el módulo **Viáticos**. Desde allí puedes registrar tu solicitud o consultar la comisión que necesitas legalizar. Las opciones, soportes y aprobaciones disponibles dependen de tu rol y del estado de la solicitud.\n\n¿Quieres ubicar la solicitud de una comisión o su legalización?';
  }
  if (/\bpta\b|plan de trabajo academico/.test(text)) {
    return 'Inicia sesión y entra a **Plan de Trabajo Académico (PTA)**. Allí puedes consultar y diligenciar tu plan docente según el periodo y los permisos de tu cuenta.';
  }
  if (/programacion academica|franjas horarias|asignacion de aulas/.test(text)) {
    return 'Inicia sesión y abre **Programación Académica** para consultar las franjas horarias y la asignación de aulas que estén disponibles para tu rol.';
  }
  if (/contrasena|recuperar.*acceso|iniciar sesion/.test(text)) {
    return 'Abre **Iniciar sesión** en la portada. Si olvidaste tu contraseña, utiliza la opción de recuperación de esa pantalla y completa la validación de identidad allí.';
  }
  return undefined;
}
