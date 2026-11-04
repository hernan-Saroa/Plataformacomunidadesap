import { platformGuidance } from './platform-guidance';
import services = require('./platform-services.json');
import { contentPolicy } from './content-policy';

export function institutionalGuidance(pregunta: string, contexto: string): string {
    const policy = contentPolicy(pregunta);
    if (policy) return policy.contenido;
    const navigation = platformGuidance(pregunta);
    if (navigation) return navigation;
    const p = pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (/\bviaticos?\b|\bgastos de viaje\b|\bcomision(?:es)?\b/.test(p)) {
      return 'Para solicitar o legalizar viáticos, ingresa al módulo de **Viáticos** con tu cuenta. Sigue los campos, soportes y validaciones que indique el formulario disponible para tu rol.';
    }

    if (/\b(?:grados?|titulos?|diplomas?|actas?|graduad[oa]s?)\b/.test(p)) {
      return `Para consultar la verificación de un título de la ESAP, abre el servicio **${services.titles.name}**: [Abrir servicio](${services.titles.path}). Sigue las validaciones del formulario; la disponibilidad del certificado depende de los registros del servicio.`;
    }

    if (/certific|constancia/.test(p) && /\blabor\w*\b/.test(p)) {
      return `Para solicitar tu certificado laboral, abre el servicio **${services.labor.name}**: [Abrir servicio](${services.labor.path}). Sigue sus pasos de identificación y validación. La disponibilidad del documento depende de tus registros y del resultado de esa validación.`;
    }

    if (/\bcertific\w*\b|\bconstancia\b/.test(p)) {
      return `¿Necesitas **${services.labor.name}**, **${services.titles.name}** u otro documento institucional? Indica qué certificado o constancia buscas para orientarte con información verificada.`;
    }

    if (/\bpta\b|\bplan de trabajo\b|\bdocentes?\b/.test(p)) {
      return 'El módulo **Plan de Trabajo Académico (PTA)** permite a los docentes estructurar su carga lectiva, investigación y extensión. Si requieres registrar o aprobar horas, accede a la sección correspondiente de PTA según tu rol.';
    }

    if (/\bdisciplinari[oa]s?\b/.test(p)) {
      return 'El módulo de **Control Interno Disciplinario** tiene acceso restringido según los permisos de tu cuenta. Para confirmar pasos, requisitos o plazos necesito documentación institucional verificada. El chat no consulta expedientes personales.';
    }

    if (p.includes('horario') || p.includes('programacion') || p.includes('aula')) {
      return 'La gestión de franjas horarias, asignaturas y asignación de aulas se encuentra en el módulo **Programación Académica**.';
    }

    return 'Puedo orientarte sobre los módulos, trámites y documentos de ESAP. Indica qué gestión necesitas realizar o consulta con la mesa de ayuda institucional. Si falta información verificada, no puedo confirmar pasos o requisitos.';
  }
