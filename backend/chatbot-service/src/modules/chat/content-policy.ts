// Controles locales y deterministas: no cargan modelos ni consultan bases de datos.
export interface PolicyTurn { pregunta: string; respuesta: string }
export interface PolicyAnswer { contenido: string; metadatos: Record<string, unknown> }
export const normalizePolicyText = (value: string) => value.normalize('NFKC')
  .replace(/\p{Cf}/gu, '').replace(/\p{Cc}/gu, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\s+/g, ' ').trim();

const scope = /\b(?:esap|isolucion|pta|rund|mipg|meci|sgsst|pqrs\w*|viatic\w*|comision\w*|certific\w*|constancia\w*|titulos?|diplomas?|grados?|graduad\w*|academ\w*|docent\w*|matricul\w*|egresad\w*|estudiant\w*|contrat\w*|nomina|laboral\w*|talento|disciplin\w*|acoso|denunci\w*|quejas?|vincula\w*|document\w*|archivos?|expedient\w*|radica\w*|retencion|riesgos?|auditor\w*|proteccion|anticorrupcion|compras?|bienes|presupuest\w*|contabil\w*|tesorer\w*|financier\w*|pagos?|investig\w*|innovacion|bienestar|soporte|usuarios?|roles?|permisos?|contrasena\w*|login|sesion|formular\w*|resolucion\w*|procedimient\w*|formatos?|instructiv\w*|manual\w*|procesos?|plataforma|institucional\w*|calidad)\b|plan de trabajo|programacion academica|franjas horarias|asignacion de aulas|seguridad de la informacion|recuperar.*acceso|\b[a-z]{2,5}-[a-z]{1,5}-\d{2,5}\b/;
const social = /^(?:(?:hola|gracias|muchas gracias|buenos dias|buenas tardes|buenas noches|buen dia|buenas|ok|listo|adios|hasta luego)[,.!¿?\s]*)+$/;
const followup = /^(?:y\s+)?(?:(?:cuales? son|que son|que|cuales?|como consultar)\s+)?(?:(?:los|las|el|la|sus)\s+)?(?:requisitos|soportes|plazos|pasos|objetivo|alcance|version|codigo|fuentes?|enlaces?|eso|esa|ese)(?:\s+(?:de eso|de ese documento|del anterior|vigente|actual))?[?.!\s]*$/;
const hasPlatformTopic = (text: string) => scope.test(text)
  || /\b(?:sigl|trd|tvd|efds|infraestructura|mantenimient\w*|dependenci\w*|sedes?|territorial\w*|reportes?|hallazgos?|licitaci\w*|personas)\b|dashboard ejecutivo|carpeta digital|estructura organizacional|firma electronica|control interno|ajustes generales|centro de ayuda/.test(text)
  || /\b(?:aulas?|horarios?|politicas?|protocolos?|discriminacion|violencia|convivencia|vacaciones|licencias|incapacidades|cesantias|pensiones|transparencia|planeacion|indicadores|capacitacion|biblioteca|inscripciones|becas|evaluacion|sgc|sst)\b/.test(text);
export function isContextFollowup(question: string): boolean {
  const text = normalizePolicyText(question);
  return followup.test(text) || /^(?:y )?(?:como (?:lo hago|se hace)|donde (?:lo encuentro|lo abro)|me das (?:el enlace|los pasos)|puedes explicarlo|explicame mas)[?.!\s]*$/.test(text);
}

export function contextQuestion(question: string, history: PolicyTurn[]): string {
  if (!isContextFollowup(question) || !history.length) return question;
  const turns = history.slice(-2);
  let start = 0;
  for (let index = turns.length - 1; index >= 0; index--) {
    if (!isContextFollowup(turns[index].pregunta)) { start = index; break; }
  }
  return [...turns.slice(start).map((turn) => turn.pregunta), question].join(' ').slice(0, 2500);
}

export function hasInstructionAttack(value: string): boolean {
  const text = normalizePolicyText(value);
  const markers = value.normalize('NFKC').replace(/\p{Cf}/gu, '');
  return /\b(?:ignora|ignorar|olvida|omite|salta|desobedece|ignore|forget|override|disregard)\b.{0,70}\b(?:instrucciones|reglas|restricciones|politicas|prompt|instructions|rules|policy|previous|system)\b/.test(text)
    || /\b(?:actua|comportate|responde|act|behave)\b.{0,50}\b(?:sin restricciones|sin filtros|sin reglas|jailbreak|dan|unrestricted)\b/.test(text)
    || /\b(?:revela|muestra|imprime|copia|dime|reveal|show|print|repeat)\b.{0,60}\b(?:system prompt|prompt del sistema|instrucciones internas|instrucciones del sistema|variables de entorno|archivo \.?env)\b/.test(text)
    || /<\|(?:im_start|im_end|system|assistant)\|>|\[\/?(?:inst|system)\]|(?:^|\n)\s*(?:system|developer)\s*:/i.test(markers)
    || /\b(?:ejecuta|execute|run)\b.{0,30}\b(?:sql|shell|powershell|comandos?|scripts?)\b/.test(text);
}

function explicitContent(text: string): boolean {
  const reporting = /^(?:(?:quiero|necesito)\s+(?:saber\s+)?)?(?:(?:como|donde)\s+(?:puedo\s+)?)?(?:denunciar|reportar|prevenir|detectar|evitar)\b/.test(text)
    && !/\b(?:y|ademas)\b.{0,30}\b(?:ayudame|quiero|genera|escribe|haz)\b/.test(text);
  const policyLookup = /\b(?:dame|muestra|consulta|busco)\b.{0,35}\b(?:politica|protocolo|documento|procedimiento|norma)\b/.test(text)
    && /\b(?:contra|prevencion|prohibe|prohibicion|denuncia|acoso|violencia)\b/.test(text)
    && !/\b(?:relato|historia|cuento|escena|genera|escribe|crea)\b/.test(text);
  return (!policyLookup && /\b(?:genera|escribe|crea|cuenta|dame|muestra|haz|hablame|relata|generate|write|show)\b.{0,90}\b(?:porno\w*|erotic\w*|sexo explicito|relato sexual|historia sexual|porn\w*|explicit sex)\b/.test(text))
    || /(?:^|[.!?;]\s*|\b(?:y|ademas|tambien)\s+)(?:por favor\s+)?(?:insulta|humilla|amenaza|acosa|falsifica|adultera)\b/.test(text)
    || (!reporting && /\b(?:como|ayudame a|quiero|necesito)\b.{0,40}\b(?:falsificar|adulterar|insultar|humillar|amenazar|acosar|hackear|robar|suplantar|evadir)\b/.test(text));
}

export function unsafeAssistantText(value: string): boolean {
  const text = normalizePolicyText(value);
  const institutionalContext = /\b(?:protocol\w*|politica\w*|preven\w*|acoso|denunci\w*|prohib\w*|disciplin\w*|violencia)\b/.test(text);
  return hasInstructionAttack(value) || explicitContent(text)
    || (!institutionalContext && /\bporno\w*\b/.test(text))
    || /\b(?:pene|vagina|orgasmo\w*|masturb\w*|hijueputa|hijodeputa|puta|mierda|pendej[oa]s?)\b/.test(text)
    || /<\s*(?:script|iframe|object|embed)\b|\b(?:javascript|data):|\b(?:password|api[_-]?key|access[_-]?token|authorization)\s*[:=]\s*\S{4,}/i.test(value);
}

function decision(reason: string, contenido: string): PolicyAnswer {
  return { contenido, metadatos: { motor: 'politica-institucional', motivo: reason, fuentes: [] } };
}

export function contentPolicy(question: string, history: PolicyTurn[] = []): PolicyAnswer | undefined {
  const text = normalizePolicyText(question);
  if (hasInstructionAttack(question)) return decision('instrucciones_no_permitidas',
    'Puedo orientarte sobre servicios y documentos de ESAP. No puedo cambiar mis reglas, revelar instrucciones internas ni ejecutar comandos. ¿Qué trámite necesitas consultar?');
  if (explicitContent(text)) return decision('contenido_no_permitido',
    'Este asistente atiende consultas institucionales de ESAP. Puedo ayudarte a consultar servicios, documentos o los canales institucionales para reportar una situación.');
  if (/\b(?:dame|dime|muestra|revela|extrae|lista|give|show|reveal)\s+(?:(?:la|las|el|los|mi|mis|su|sus|todas las|todos los)\s+)?(?:contrasenas?|claves?|passwords?|tokens?|credenciales|secretos?)\b/.test(text)
    || /\b(?:cedulas?|salarios?|sueldos?|direcciones|expedientes?|conversaciones?|historiales?)\b.{0,60}\b(?:otros|otras|ajenos|todos|todas|usuarios|funcionarios|estudiantes)\b/.test(text)
    || /\b(?:dame|muestra|consulta|dime)\b.{0,35}\b(?:mi salario|mi sueldo|mi expediente|el estado de mi solicitud)\b/.test(text)) {
    return decision('datos_reservados', 'El chat no consulta expedientes personales ni revela contraseñas, tokens o datos de otras personas. Para tus gestiones personales, utiliza el módulo correspondiente con tu cuenta. Puedo ayudarte a ubicarlo.');
  }
  if (/\b(?:modifica|modificar|actualiza|actualizar|borra|borrar|elimina|eliminar|inserta|insertar|sube|subir|carga|cargar)\b.{0,90}\b(?:vista|base de datos|sql|isolucion|documentos? de isolucion)\b/.test(text)
    || /\b(?:drop\s+(?:table|view)|delete\s+from|insert\s+into|update\s+[\w.\[\]]+\s+set)\b/.test(text)) {
    return decision('solo_lectura', 'El chatbot consulta Isolución en modo de solo lectura. No modifica la vista, las bases de datos ni los documentos. Puedo ayudarte a consultar la información disponible.');
  }
  // Intenciones claramente ajenas se descartan aunque incluyan la palabra ESAP.
  if (/\b(?:receta de|receta para|horoscopo|signo zodiacal|quien gano el (?:partido|mundial)|marcador del partido|capital de (?:francia|italia|japon)|pronostico del clima|clima de hoy|cuentame un cuento)\b/.test(text)
    || /\b(?:cuentame|cuenta|dame|escribe|genera)\b.{0,25}\bchistes?\b/.test(text)
    || /\b(?:escribe|genera|programa|write)\b.{0,35}\b(?:codigo python|codigo javascript|videojuego|poema de amor|cancion romantica)\b/.test(text)
    || /^(?:cuanto es|calcula|resuelve)\s+\d+\s*(?:[+*/=-]|mas|menos|por|entre)/.test(text)) {
    return decision('fuera_alcance', 'Puedo ayudarte con servicios, trámites y documentos de ESAP. Indícame el módulo o trámite que necesitas consultar.');
  }
  if (social.test(text) || hasPlatformTopic(text)) return undefined;
  if (isContextFollowup(question) && history.slice(-2).some((turn) => !contentPolicy(turn.pregunta) && hasPlatformTopic(normalizePolicyText(turn.pregunta)))) return undefined;
  return decision('aclaracion', 'Puedo orientarte sobre la plataforma y los documentos de ESAP. Indícame el módulo, el trámite o el código del documento que necesitas consultar.');
}

// El cliente puede enviar historial: sus respuestas no acreditan hechos ni reglas.
export function safeHistory(history: PolicyTurn[]): PolicyTurn[] {
  const accepted: PolicyTurn[] = [];
  for (const turn of history.slice(-2)) {
    if (!contentPolicy(turn.pregunta, accepted)) accepted.push({ pregunta: turn.pregunta.slice(0, 500), respuesta: '' });
  }
  return accepted;
}
