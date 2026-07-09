/**
 * DATOS MOCK EXPANDIDOS - MÓDULO JUZGAMIENTO DISCIPLINARIO
 * Base de datos completa para pruebas con cliente
 * Incluye casos variados con todas las etapas del proceso disciplinario
 */

import type { ProcesoDisciplinario } from '../core/types';

// Función helper para mapear datos simplificados a estructura completa
function crearProcesoDisciplinario(data: {
  id: string;
  radicado: string;
  investigado: string;
  cargo: string;
  dependencia: string;
  falta: string;
  descripcion: string;
  gravedad: 'LEVE' | 'GRAVE' | 'GRAVISIMA';
  etapa: string;
  estado: string;
  fechaInicio: string;
  fechaVencimiento: string;
  investigadorAsignado: string;
  tipoFalta: string;
  normaSuspuestaViolada: string;
  sancionPropuesta?: string;
  sancionImpuesta?: string;
  motivoArchivo?: string;
  fechaCierre?: string;
}): ProcesoDisciplinario {
  const fechaInicioDate = new Date(data.fechaInicio);
  const fechaVencimientoDate = new Date(data.fechaVencimiento);
  const diasTotales = Math.ceil((fechaVencimientoDate.getTime() - fechaInicioDate.getTime()) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.ceil((fechaVencimientoDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Mapear etapa string a enum
  const mapeoEtapa: Record<string, any> = {
    'INDAGACION': 'E1_AVOCAMIENTO',
    'INVESTIGACION': 'E2_DESCARGOS',
    'FORMULACION DE CARGOS': 'E2_DESCARGOS',
    'DESCARGOS': 'E2_DESCARGOS',
    'PRUEBAS': 'E3_PRUEBAS',
    'DECISION': 'E4_ALEGATOS',
    'SANCIONADO': 'E5_FALLO_1I',
    'ARCHIVADO': 'E1_AVOCAMIENTO'
  };

  return {
    id: data.id,
    etapa: mapeoEtapa[data.etapa] || 'E1_AVOCAMIENTO',
    fechaHechos: fechaInicioDate,
    leyAplicable: 'Ley 734/2002',
    investigado: data.investigado,
    cargo: data.cargo,
    dependencia: data.dependencia,
    hechos: data.descripcion,
    faltasCatalogadas: [data.tipoFalta],
    fechaInicio: fechaInicioDate,
    diasDescargos: 10,
    diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
    diasTotales: diasTotales,
    abogadoAsignado: data.investigadorAsignado,
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaInicioDate,
    fechaActualizacion: new Date(),
    estado: data.estado === 'EN TRAMITE' ? 'ACTIVO' : data.estado === 'CERRADO' ? 'FINALIZADO' : data.estado as any,
    ultimaActuacion: {
      fecha: new Date().toISOString(),
      tipo: data.etapa,
      descripcion: data.falta,
      responsable: data.investigadorAsignado,
      estado: data.estado
    },
    // Propiedades adicionales para compatibilidad
    disciplinado: data.investigado,
    tipoFalta: data.gravedad
  } as any;
}

export const procesosDisciplinariosMock: ProcesoDisciplinario[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: INDAGACIÓN PRELIMINAR (Verificación de hechos)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2025-001',
    radicado: 'DISC-BOG-2025-00001',
    investigado: 'Carlos Alberto Méndez',
    cargo: 'Profesional Universitario',
    dependencia: 'Dirección Académica',
    falta: 'Presunto incumplimiento de horario laboral',
    descripcion: 'Se reportan ausencias reiteradas sin justificación durante el mes de enero de 2025, afectando la prestación del servicio.',
    gravedad: 'LEVE',
    etapa: 'INDAGACION',
    estado: 'EN TRAMITE',
    fechaInicio: '2025-01-25',
    fechaVencimiento: '2025-03-25',
    investigadorAsignado: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    tipoFalta: 'INCUMPLIMIENTO DE DEBERES',
    normaSuspuestaViolada: 'Art. 34 numeral 1 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2025-002',
    radicado: 'DISC-BOG-2025-00002',
    investigado: 'María Fernanda Suárez',
    cargo: 'Docente Catedrático',
    dependencia: 'Facultad de Ciencias Políticas',
    falta: 'Presunta conducta inapropiada con estudiantes',
    descripcion: 'Estudiantes reportan comentarios ofensivos y discriminatorios durante clase magistral del 18 de enero de 2025.',
    gravedad: 'GRAVE',
    etapa: 'INDAGACION',
    estado: 'EN TRAMITE',
    fechaInicio: '2025-01-20',
    fechaVencimiento: '2025-03-20',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'VIOLACION AL DEBER DE RESPETO',
    normaSuspuestaViolada: 'Art. 34 numeral 3 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2025-003',
    radicado: 'DISC-BOG-2025-00003',
    investigado: 'Andrés Felipe Cortés',
    cargo: 'Auxiliar Administrativo',
    dependencia: 'Subdirección Financiera',
    falta: 'Posible uso indebido de recursos institucionales',
    descripcion: 'Sistemas reporta uso de equipos de cómputo institucionales para actividades personales en horario laboral.',
    gravedad: 'LEVE',
    etapa: 'INDAGACION',
    estado: 'EN TRAMITE',
    fechaInicio: '2025-01-28',
    fechaVencimiento: '2025-03-28',
    investigadorAsignado: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    tipoFalta: 'USO INDEBIDO DE RECURSOS',
    normaSuspuestaViolada: 'Art. 34 numeral 8 - Ley 734 de 2002'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: INVESTIGACIÓN DISCIPLINARIA (Apertura formal del proceso)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2024-087',
    radicado: 'DISC-BOG-2024-00087',
    investigado: 'Jorge Enrique Palacios',
    cargo: 'Coordinador de Contratación',
    dependencia: 'Dirección de Contratación',
    falta: 'Presuntas irregularidades en proceso contractual',
    descripcion: 'Auditoría detecta posibles irregularidades en la adjudicación del contrato 045-2024 por valor de $125 millones. Se investiga favorecimiento a contratista específico.',
    gravedad: 'GRAVISIMA',
    etapa: 'INVESTIGACION',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-11-15',
    fechaVencimiento: '2025-05-15',
    investigadorAsignado: 'Dr. Ricardo Hernández - Control Interno Disciplinario',
    tipoFalta: 'VIOLACION AL REGIMEN DE CONTRATACION',
    normaSuspuestaViolada: 'Art. 48 numerales 2, 15, 31 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2024-092',
    radicado: 'DISC-BOG-2024-00092',
    investigado: 'Sandra Milena Vargas',
    cargo: 'Jefe Oficina Talento Humano',
    dependencia: 'Gestión Humana',
    falta: 'Revelación de información confidencial',
    descripcion: 'Se detectó filtración de información confidencial sobre proceso de selección de personal a candidato externo.',
    gravedad: 'GRAVE',
    etapa: 'INVESTIGACION',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-12-01',
    fechaVencimiento: '2025-06-01',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'VIOLACION AL DEBER DE RESERVA',
    normaSuspuestaViolada: 'Art. 34 numeral 7 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2024-095',
    radicado: 'DISC-BOG-2024-00095',
    investigado: 'Luis Fernando Gómez',
    cargo: 'Profesional Especializado',
    dependencia: 'Oficina Jurídica',
    falta: 'Presunta negligencia en ejercicio de funciones',
    descripcion: 'No se presentó contestación de demanda en tiempo, causando declaratoria de rebeldía y posible condena a la institución.',
    gravedad: 'GRAVE',
    etapa: 'INVESTIGACION',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-12-10',
    fechaVencimiento: '2025-06-10',
    investigadorAsignado: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    tipoFalta: 'NEGLIGENCIA EN EL EJERCICIO DE FUNCIONES',
    normaSuspuestaViolada: 'Art. 34 numeral 1 - Ley 734 de 2002'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: FORMULACIÓN DE CARGOS (Pliego de cargos formulado)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2024-068',
    radicado: 'DISC-BOG-2024-00068',
    investigado: 'Diana Carolina Rojas',
    cargo: 'Secretaria Ejecutiva',
    dependencia: 'Despacho Dirección General',
    falta: 'Alteración de documentos oficiales',
    descripcion: 'Se comprobó alteración de fechas en actas de reunión del Consejo Directivo para favorecer decisiones institucionales.',
    gravedad: 'GRAVISIMA',
    etapa: 'FORMULACION DE CARGOS',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-09-05',
    fechaVencimiento: '2025-03-05',
    investigadorAsignado: 'Dr. Ricardo Hernández - Control Interno Disciplinario',
    tipoFalta: 'FALSEDAD DOCUMENTAL',
    normaSuspuestaViolada: 'Art. 48 numeral 11 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2024-072',
    radicado: 'DISC-BOG-2024-00072',
    investigado: 'Roberto Carlos Jiménez',
    cargo: 'Conductor',
    dependencia: 'Servicios Generales',
    falta: 'Uso no autorizado de vehículo institucional',
    descripcion: 'GPS institucional detectó uso de vehículo oficial en horas no laborales para desplazamientos personales.',
    gravedad: 'GRAVE',
    etapa: 'FORMULACION DE CARGOS',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-10-12',
    fechaVencimiento: '2025-04-12',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'USO INDEBIDO DE BIENES DEL ESTADO',
    normaSuspuestaViolada: 'Art. 48 numeral 2 - Ley 734 de 2002'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: DESCARGOS (Investigado presentó descargos)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2024-054',
    radicado: 'DISC-BOG-2024-00054',
    investigado: 'Gloria Patricia Herrera',
    cargo: 'Coordinadora de Bienestar',
    dependencia: 'Bienestar Universitario',
    falta: 'Manejo irregular de recursos de bienestar',
    descripcion: 'Auditoría detectó inconsistencias en la ejecución de recursos del programa de apoyo estudiantil por $18 millones.',
    gravedad: 'GRAVE',
    etapa: 'DESCARGOS',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-07-20',
    fechaVencimiento: '2025-01-20',
    investigadorAsignado: 'Dr. Ricardo Hernández - Control Interno Disciplinario',
    tipoFalta: 'MANEJO IRREGULAR DE RECURSOS',
    normaSuspuestaViolada: 'Art. 48 numeral 2 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2024-059',
    radicado: 'DISC-BOG-2024-00059',
    investigado: 'Miguel Ángel Torres',
    cargo: 'Docente Tiempo Completo',
    dependencia: 'Facultad de Pregrado',
    falta: 'Acoso laboral a funcionarios',
    descripcion: 'Tres funcionarios denuncian conductas de acoso laboral: maltrato verbal, imposición de cargas excesivas y amenazas.',
    gravedad: 'GRAVE',
    etapa: 'DESCARGOS',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-08-15',
    fechaVencimiento: '2025-02-15',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'ACOSO LABORAL',
    normaSuspuestaViolada: 'Art. 34 numeral 3, Ley 1010 de 2006'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: PRUEBAS (Período probatorio)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2024-041',
    radicado: 'DISC-BOG-2024-00041',
    investigado: 'Claudia Marcela Sánchez',
    cargo: 'Profesional Universitario',
    dependencia: 'Dirección de Admisiones',
    falta: 'Tráfico de influencias en proceso de admisión',
    descripcion: 'Investigación por presunto favorecimiento a aspirantes con vínculos familiares en proceso de admisión 2024-1.',
    gravedad: 'GRAVISIMA',
    etapa: 'PRUEBAS',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-05-10',
    fechaVencimiento: '2024-11-10',
    investigadorAsignado: 'Dr. Ricardo Hernández - Control Interno Disciplinario',
    tipoFalta: 'TRAFICO DE INFLUENCIAS',
    normaSuspuestaViolada: 'Art. 48 numeral 56 - Ley 734 de 2002'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2024-036',
    radicado: 'DISC-BOG-2024-00036',
    investigado: 'Fernando José Ramírez',
    cargo: 'Técnico Administrativo',
    dependencia: 'Sistemas y Tecnología',
    falta: 'Acceso no autorizado a sistemas de información',
    descripcion: 'Logs del sistema evidencian accesos no autorizados a bases de datos con información sensible de estudiantes y funcionarios.',
    gravedad: 'GRAVISIMA',
    etapa: 'PRUEBAS',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-04-15',
    fechaVencimiento: '2024-10-15',
    investigadorAsignado: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    tipoFalta: 'VIOLACION A LA SEGURIDAD INFORMATICA',
    normaSuspuestaViolada: 'Art. 48 numeral 7 - Ley 734 de 2002'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: DECISIÓN (Fallo de primera instancia emitido)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2024-025',
    radicado: 'DISC-BOG-2024-00025',
    investigado: 'Beatriz Elena Morales',
    cargo: 'Auxiliar Administrativo',
    dependencia: 'Almacén General',
    falta: 'Hurto de elementos institucionales',
    descripcion: 'Inventario detectó faltante de equipos de oficina. Cámaras de seguridad confirman sustracción por parte de la investigada.',
    gravedad: 'GRAVISIMA',
    etapa: 'DECISION',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-03-01',
    fechaVencimiento: '2024-09-01',
    investigadorAsignado: 'Dr. Ricardo Hernández - Control Interno Disciplinario',
    tipoFalta: 'HURTO DE BIENES DEL ESTADO',
    normaSuspuestaViolada: 'Art. 48 numeral 3 - Ley 734 de 2002',
    sancionPropuesta: 'DESTITUCION E INHABILIDAD 15 AÑOS'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2024-019',
    radicado: 'DISC-BOG-2024-00019',
    investigado: 'Javier Alejandro Vargas',
    cargo: 'Profesional Especializado',
    dependencia: 'Planeación',
    falta: 'Inasistencia injustificada reiterada',
    descripcion: 'Registro de 15 inasistencias injustificadas en un periodo de 3 meses, afectando gravemente el servicio.',
    gravedad: 'GRAVE',
    etapa: 'DECISION',
    estado: 'EN TRAMITE',
    fechaInicio: '2024-02-10',
    fechaVencimiento: '2024-08-10',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'INASISTENCIA INJUSTIFICADA',
    normaSuspuestaViolada: 'Art. 35 numeral 7 - Ley 734 de 2002',
    sancionPropuesta: 'SUSPENSION 90 DIAS SIN REMUNERACION'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: SANCIONADO (Sanción impuesta y ejecutoriada)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2023-156',
    radicado: 'DISC-BOG-2023-00156',
    investigado: 'Oscar Mauricio Delgado',
    cargo: 'Profesional Universitario',
    dependencia: 'Verificación de títulos',
    falta: 'Falsificación de calificaciones académicas',
    descripcion: 'Comprobada alteración de notas en sistema académico para favorecer a estudiantes específicos.',
    gravedad: 'GRAVISIMA',
    etapa: 'SANCIONADO',
    estado: 'CERRADO',
    fechaInicio: '2023-06-01',
    fechaVencimiento: '2023-12-01',
    fechaCierre: '2024-01-15',
    investigadorAsignado: 'Dr. Ricardo Hernández - Control Interno Disciplinario',
    tipoFalta: 'FALSEDAD EN DOCUMENTO PUBLICO',
    normaSuspuestaViolada: 'Art. 48 numeral 11 - Ley 734 de 2002',
    sancionPropuesta: 'DESTITUCION E INHABILIDAD 20 AÑOS',
    sancionImpuesta: 'DESTITUCION E INHABILIDAD 20 AÑOS'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2023-142',
    radicado: 'DISC-BOG-2023-00142',
    investigado: 'Patricia Andrea Mendoza',
    cargo: 'Secretaria',
    dependencia: 'Vicerrectoría Académica',
    falta: 'Negligencia en custodia de documentos',
    descripcion: 'Pérdida de documentación importante por falta de diligencia en su custodia y archivo.',
    gravedad: 'LEVE',
    etapa: 'SANCIONADO',
    estado: 'CERRADO',
    fechaInicio: '2023-05-10',
    fechaVencimiento: '2023-11-10',
    fechaCierre: '2023-12-20',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'NEGLIGENCIA',
    normaSuspuestaViolada: 'Art. 34 numeral 1 - Ley 734 de 2002',
    sancionPropuesta: 'AMONESTACION ESCRITA',
    sancionImpuesta: 'AMONESTACION ESCRITA'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: ARCHIVADO (Procesos archivados por diferentes causales)
  // ═══════════════════════════════════════════════════════════════════════════
  crearProcesoDisciplinario({
    id: 'DISC-2024-008',
    radicado: 'DISC-BOG-2024-00008',
    investigado: 'Laura Marcela Gutiérrez',
    cargo: 'Docente Catedrático',
    dependencia: 'Facultad de Posgrados',
    falta: 'Presunto conflicto de interés',
    descripcion: 'Investigación archivada por atipicidad - Los hechos no constituyen falta disciplinaria.',
    gravedad: 'LEVE',
    etapa: 'ARCHIVADO',
    estado: 'ARCHIVADO',
    fechaInicio: '2024-01-15',
    fechaVencimiento: '2024-07-15',
    fechaCierre: '2024-03-10',
    investigadorAsignado: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    tipoFalta: 'N/A',
    normaSuspuestaViolada: 'N/A',
    motivoArchivo: 'ATIPICIDAD - Los hechos no constituyen falta disciplinaria'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2023-187',
    radicado: 'DISC-BOG-2023-00187',
    investigado: 'Ricardo José Campos',
    cargo: 'Auxiliar Administrativo',
    dependencia: 'Servicios Generales',
    falta: 'Uso indebido de internet institucional',
    descripcion: 'Archivado por inexistencia de pruebas suficientes que demuestren la conducta.',
    gravedad: 'LEVE',
    etapa: 'ARCHIVADO',
    estado: 'ARCHIVADO',
    fechaInicio: '2023-11-20',
    fechaVencimiento: '2024-05-20',
    fechaCierre: '2024-02-05',
    investigadorAsignado: 'Dra. Patricia Moreno - Control Interno Disciplinario',
    tipoFalta: 'N/A',
    normaSuspuestaViolada: 'N/A',
    motivoArchivo: 'FALTA DE PRUEBAS - No se logró acreditar la conducta'
  }),
  crearProcesoDisciplinario({
    id: 'DISC-2023-198',
    radicado: 'DISC-BOG-2023-00198',
    investigado: 'Andrea Milena Castro',
    cargo: 'Profesional Universitario',
    dependencia: 'Comunicaciones',
    falta: 'Presunto incumplimiento de funciones',
    descripcion: 'Archivado por prescripción de la acción disciplinaria.',
    gravedad: 'LEVE',
    etapa: 'ARCHIVADO',
    estado: 'ARCHIVADO',
    fechaInicio: '2023-12-01',
    fechaVencimiento: '2024-06-01',
    fechaCierre: '2024-04-10',
    investigadorAsignado: 'Dr. Fabián Rojas - Control Interno Disciplinario',
    tipoFalta: 'N/A',
    normaSuspuestaViolada: 'N/A',
    motivoArchivo: 'PRESCRIPCION - Transcurrió el término legal para investigar'
  })
];