export function institutionalGuidance(pregunta: string, contexto: string): string {
    const p = pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (/\bviaticos?\b|\bgastos de viaje\b|\bcomision(?:es)?\b/.test(p)) {
      return 'Para solicitar o legalizar viáticos, ingresa al módulo de **Viáticos** con tu cuenta. Sigue los campos, soportes y validaciones que indique el formulario disponible para tu rol.';
    }

    if (/\b(?:grados?|titulos?|diplomas?|actas?|graduad[oa]s?)\b/.test(p)) {
      return 'Para consultar títulos y documentos de grado, abre el servicio de **Verificación de Títulos** y sigue sus pasos de identificación y validación. Las opciones disponibles dependen de los registros y permisos del servicio.';
    }

    if (p.includes('certificado') || p.includes('laboral')) {
      return 'Para solicitar tu certificado laboral, abre el servicio de **Certificados Laborales** y sigue sus pasos de identificación y validación. La disponibilidad del documento depende de tus registros y del resultado de esa validación.';
    }

    if (/\bpta\b|\bplan de trabajo\b|\bdocentes?\b/.test(p)) {
      return 'El módulo **Plan de Trabajo Académico (PTA)** permite a los docentes estructurar su carga lectiva, investigación y extensión. Si requieres registrar o aprobar horas, accede a la sección correspondiente de PTA según tu rol.';
    }

    if (/\bdisciplinari[oa]s?\b/.test(p)) {
      return 'El módulo de **Control Disciplinario Interno** gestiona expedientes, etapas procesales y providencias de acuerdo al Código General Disciplinario. El acceso está restringido a funcionarios autorizados.';
    }

    if (p.includes('horario') || p.includes('programacion') || p.includes('aula')) {
      return 'La gestión de franjas horarias, asignaturas y asignación de aulas se encuentra en el módulo **Programación Académica**.';
    }

    return `He recibido tu consulta sobre "${pregunta.slice(0, 80)}". En la plataforma ESAP dispones de herramientas transversales para gestión académica, talento humano, soporte documental y control institucional. Si necesitas soporte adicional, indícame la temática o comunícate con la mesa de ayuda institucional.`;
  }
