/**
 * Datos Mock - Procesos Disciplinarios (MOD-02: Juzgamiento Disciplinario)
 * 12 procesos de prueba distribuidos en 7 etapas
 * 
 * ⚠️ FECHA CRÍTICA: 29 de marzo de 2022
 * Antes: Ley 734/2002 | Después: Ley 1952/2019
 */

import { ProcesoDisciplinario, LeyDisciplinaria } from '../core/types';

// Función para determinar ley aplicable según fecha de hechos
function determinarLeyAplicable(fechaHechos: Date): LeyDisciplinaria {
  const FECHA_CORTE = new Date('2022-03-29'); // Vigencia Ley 1952/2019
  return fechaHechos < FECHA_CORTE ? 'Ley 734/2002' : 'Ley 1952/2019';
}

// Función para crear fecha relativa
function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

export const procesoDisciplinariosMock: ProcesoDisciplinario[] = [
  // ========================================
  // ETAPA 1: E1_AVOCAMIENTO (2 procesos)
  // ========================================
  {
    id: 'PD-2025-001',
    etapa: 'E1_AVOCAMIENTO',
    fechaHechos: new Date('2024-05-10'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Dr. Carlos Rodríguez Méndez',
    cargo: 'Director Territorial Antioquia',
    dependencia: 'Dirección Territorial - Medellín',
    hechos: 'Presunto incumplimiento de deberes funcionales al no adelantar trámites de contratación dentro de los plazos establecidos, causando sobrecostos a la entidad.',
    faltasCatalogadas: [
      'Art. 35 Num. 1 - Incumplimiento de deberes',
      'Art. 35 Num. 3 - Negligencia en el desempeño de funciones',
    ],
    fechaInicio: fechaHace(5),
    diasDescargos: 10,
    diasRestantes: 5,
    abogadoAsignado: 'Dra. Ana López García',
    documentos: [],
    actuaciones: [],
    timeline: [
      {
        id: 'TL-PD-001',
        tipo: 'CREACIÓN',
        descripcion: 'Proceso disciplinario creado - Avocamiento',
        fecha: fechaHace(5),
        usuario: 'Sistema',
        icono: 'Gavel',
        color: '#9C27B0',
      },
    ],
    fechaCreacion: fechaHace(5),
    fechaActualizacion: fechaHace(5),
    estado: 'ACTIVO',
  },
  {
    id: 'PD-2025-002',
    etapa: 'E1_AVOCAMIENTO',
    fechaHechos: new Date('2020-11-22'), // Ley 734/2002
    leyAplicable: 'Ley 734/2002',
    investigado: 'Lic. María Fernanda Pérez',
    cargo: 'Coordinadora Académica',
    dependencia: 'Coordinación Académica - Sede Bogotá',
    hechos: 'Presunto trato discriminatorio hacia estudiantes por motivos de género y orientación sexual, generando quejas formales de la comunidad estudiantil.',
    faltasCatalogadas: [
      'Art. 48 Num. 10 - Incurrir en discriminación',
      'Art. 48 Num. 1 - Violación del régimen de inhabilidades',
    ],
    fechaInicio: fechaHace(3),
    diasDescargos: 10,
    diasRestantes: 7,
    abogadoAsignado: 'Dr. Juan Pérez López',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(3),
    fechaActualizacion: fechaHace(3),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 2: E2_DESCARGOS (3 procesos - CRÍTICOS)
  // ========================================
  {
    id: 'PD-2024-087',
    etapa: 'E2_DESCARGOS',
    fechaHechos: new Date('2023-08-15'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Ing. Pedro Luis García',
    cargo: 'Jefe de Mantenimiento',
    dependencia: 'Infraestructura - Sede Cali',
    hechos: 'Abandono del puesto de trabajo durante 5 días consecutivos sin justa causa ni permiso previo, afectando las labores de mantenimiento de la sede.',
    faltasCatalogadas: [
      'Art. 35 Num. 2 - Abandono injustificado del cargo',
    ],
    fechaInicio: fechaHace(8),
    diasDescargos: 10,
    diasRestantes: 2, // 🔴 URGENTE
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(8),
    fechaActualizacion: fechaHace(7),
    estado: 'ACTIVO',
  },
  {
    id: 'PD-2024-095',
    etapa: 'E2_DESCARGOS',
    fechaHechos: new Date('2024-02-10'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Dr. Jorge Andrés Morales',
    cargo: 'Docente de Planta',
    dependencia: 'Facultad de Ciencias Políticas',
    hechos: 'Presunto acoso laboral a estudiantes de pregrado, manifestado en calificaciones arbitrarias y comentarios ofensivos en clase.',
    faltasCatalogadas: [
      'Art. 35 Num. 8 - Acoso laboral',
      'Art. 35 Num. 1 - Incumplimiento de deberes',
    ],
    fechaInicio: fechaHace(9),
    diasDescargos: 10,
    diasRestantes: 1, // 🔴 CRÍTICO
    abogadoAsignado: 'Dra. Ana López García',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(9),
    fechaActualizacion: fechaHace(8),
    estado: 'ACTIVO',
  },
  {
    id: 'PD-2024-102',
    etapa: 'E2_DESCARGOS',
    fechaHechos: new Date('2019-06-05'), // Ley 734/2002
    leyAplicable: 'Ley 734/2002',
    investigado: 'Econ. Sandra Milena Castro',
    cargo: 'Tesorera',
    dependencia: 'Dirección Administrativa y Financiera',
    hechos: 'Manejo irregular de recursos públicos, realizando pagos sin soporte documental adecuado por valor de $25.000.000.',
    faltasCatalogadas: [
      'Art. 48 Num. 2 - Gestión antieconómica de bienes',
      'Art. 48 Num. 25 - Violación del régimen de contratación',
    ],
    fechaInicio: fechaHace(11),
    diasDescargos: 10,
    diasRestantes: -1, // ❌ VENCIDO
    abogadoAsignado: 'Dr. Juan Pérez López',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(11),
    fechaActualizacion: fechaHace(10),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 3: E3_PRUEBAS (2 procesos)
  // ========================================
  {
    id: 'PD-2024-075',
    etapa: 'E3_PRUEBAS',
    fechaHechos: new Date('2023-12-01'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Abog. Roberto Díaz Quintero',
    cargo: 'Asesor Jurídico',
    dependencia: 'Oficina Jurídica - Sede Nacional',
    hechos: 'Emitir conceptos jurídicos sin el debido análisis normativo, causando perjuicio a la entidad en proceso contractual.',
    faltasCatalogadas: [
      'Art. 35 Num. 1 - Incumplimiento de deberes',
      'Art. 35 Num. 3 - Negligencia',
    ],
    fechaInicio: fechaHace(45),
    diasDescargos: 10,
    diasRestantes: -35,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(45),
    fechaActualizacion: fechaHace(30),
    estado: 'ACTIVO',
  },
  {
    id: 'PD-2024-068',
    etapa: 'E3_PRUEBAS',
    fechaHechos: new Date('2021-03-20'), // Ley 734/2002
    leyAplicable: 'Ley 734/2002',
    investigado: 'Ing. Laura Marcela Ríos',
    cargo: 'Coordinadora de Sistemas',
    dependencia: 'Dirección de Tecnología',
    hechos: 'Filtración de información confidencial de bases de datos institucionales a terceros no autorizados.',
    faltasCatalogadas: [
      'Art. 48 Num. 12 - Revelar información confidencial',
      'Art. 48 Num. 1 - Violación del régimen de inhabilidades',
    ],
    fechaInicio: fechaHace(60),
    diasDescargos: 10,
    diasRestantes: -50,
    abogadoAsignado: 'Dra. Ana López García',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(60),
    fechaActualizacion: fechaHace(45),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 4: E4_ALEGATOS (2 procesos)
  // ========================================
  {
    id: 'PD-2024-052',
    etapa: 'E4_ALEGATOS',
    fechaHechos: new Date('2024-01-15'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Psic. Andrés Felipe Mejía',
    cargo: 'Coordinador Bienestar Estudiantil',
    dependencia: 'Bienestar Universitario',
    hechos: 'Uso indebido de recursos de bienestar estudiantil para beneficio personal, desviando fondos destinados a programas sociales.',
    faltasCatalogadas: [
      'Art. 35 Num. 2 - Apropiación de bienes del Estado',
      'Art. 35 Num. 1 - Incumplimiento de deberes',
    ],
    fechaInicio: fechaHace(90),
    diasDescargos: 10,
    diasRestantes: -80,
    abogadoAsignado: 'Dr. Juan Pérez López',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(90),
    fechaActualizacion: fechaHace(75),
    estado: 'ACTIVO',
  },
  {
    id: 'PD-2024-045',
    etapa: 'E4_ALEGATOS',
    fechaHechos: new Date('2022-07-10'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Adm. Gloria Patricia Restrepo',
    cargo: 'Jefe de Recursos Humanos',
    dependencia: 'Gestión Humana - Sede Barranquilla',
    hechos: 'Irregularidades en procesos de selección de personal, favoreciendo a candidatos con vínculos familiares sin cumplir requisitos.',
    faltasCatalogadas: [
      'Art. 35 Num. 4 - Incurrir en nepotismo',
      'Art. 35 Num. 1 - Incumplimiento de deberes',
    ],
    fechaInicio: fechaHace(105),
    diasDescargos: 10,
    diasRestantes: -95,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(105),
    fechaActualizacion: fechaHace(90),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 5: E5_FALLO_1I (1 proceso)
  // ========================================
  {
    id: 'PD-2024-032',
    etapa: 'E5_FALLO_1I',
    fechaHechos: new Date('2023-04-20'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Cont. Mónica Alexandra Castillo',
    cargo: 'Contadora General',
    dependencia: 'Contabilidad - Sede Nacional',
    hechos: 'Errores sistemáticos en registro contable que impidieron conciliación de estados financieros durante 2 trimestres.',
    faltasCatalogadas: [
      'Art. 35 Num. 3 - Negligencia en el desempeño de funciones',
      'Art. 35 Num. 1 - Incumplimiento de deberes',
    ],
    fechaInicio: fechaHace(150),
    diasDescargos: 10,
    diasRestantes: -140,
    abogadoAsignado: 'Dra. Ana López García',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(150),
    fechaActualizacion: fechaHace(130),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 6: E6_APELACIÓN (1 proceso)
  // ========================================
  {
    id: 'PD-2024-015',
    etapa: 'E6_APELACIÓN',
    fechaHechos: new Date('2022-09-15'), // Ley 1952/2019
    leyAplicable: 'Ley 1952/2019',
    investigado: 'Dr. Hernán Alberto Parra',
    cargo: 'Decano Facultad de Administración',
    dependencia: 'Decanatura - Facultad de Administración',
    hechos: 'Fallo de primera instancia: Suspensión de 30 días por incumplimiento en entrega de informes académicos. Investigado apela la decisión.',
    faltasCatalogadas: [
      'Art. 35 Num. 1 - Incumplimiento de deberes',
    ],
    fechaInicio: fechaHace(180),
    diasDescargos: 10,
    diasRestantes: -170,
    abogadoAsignado: 'Dr. Juan Pérez López',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(180),
    fechaActualizacion: fechaHace(160),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 7: E7_FALLO_2I (1 proceso)
  // ========================================
  {
    id: 'PD-2023-198',
    etapa: 'E7_FALLO_2I',
    fechaHechos: new Date('2021-11-10'), // Ley 734/2002
    leyAplicable: 'Ley 734/2002',
    investigado: 'Lic. Clara Beatriz Suárez',
    cargo: 'Directora de Postgrados',
    dependencia: 'Dirección de Postgrados',
    hechos: 'Fallo de segunda instancia en trámite. Se confirma sanción de destitución por irregularidades graves en admisiones de postgrado.',
    faltasCatalogadas: [
      'Art. 48 Num. 25 - Violación del régimen de contratación',
      'Art. 48 Num. 2 - Gestión antieconómica de bienes',
    ],
    fechaInicio: fechaHace(250),
    diasDescargos: 10,
    diasRestantes: -240,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    documentos: [],
    actuaciones: [],
    timeline: [],
    fechaCreacion: fechaHace(250),
    fechaActualizacion: fechaHace(220),
    estado: 'ACTIVO',
  },
];

// Función helper para obtener procesos por etapa
export function obtenerProcesosPorEtapa(etapa: string): ProcesoDisciplinario[] {
  return procesoDisciplinariosMock.filter((proc) => proc.etapa === etapa);
}

// Función helper para obtener proceso por ID
export function obtenerProcesoPorId(id: string): ProcesoDisciplinario | undefined {
  return procesoDisciplinariosMock.find((proc) => proc.id === id);
}

// Estadísticas generales
export const estadisticasJuzgamiento = {
  total: procesoDisciplinariosMock.length,
  porEtapa: {
    E1_AVOCAMIENTO: obtenerProcesosPorEtapa('E1_AVOCAMIENTO').length,
    E2_DESCARGOS: obtenerProcesosPorEtapa('E2_DESCARGOS').length,
    E3_PRUEBAS: obtenerProcesosPorEtapa('E3_PRUEBAS').length,
    E4_ALEGATOS: obtenerProcesosPorEtapa('E4_ALEGATOS').length,
    E5_FALLO_1I: obtenerProcesosPorEtapa('E5_FALLO_1I').length,
    E6_APELACIÓN: obtenerProcesosPorEtapa('E6_APELACIÓN').length,
    E7_FALLO_2I: obtenerProcesosPorEtapa('E7_FALLO_2I').length,
  },
  porLey: {
    ley734: procesoDisciplinariosMock.filter((p) => p.leyAplicable === 'Ley 734/2002').length,
    ley1952: procesoDisciplinariosMock.filter((p) => p.leyAplicable === 'Ley 1952/2019').length,
  },
  urgentes: procesoDisciplinariosMock.filter((p) => p.diasRestantes > 0 && p.diasRestantes <= 3).length,
  vencidos: procesoDisciplinariosMock.filter((p) => p.diasRestantes <= 0).length,
  enDescargos: obtenerProcesosPorEtapa('E2_DESCARGOS').length,
};

// Exportar función de determinación de ley (para usar en formularios)
export { determinarLeyAplicable };
