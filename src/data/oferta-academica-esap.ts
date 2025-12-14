/**
 * OFERTA ACADÉMICA COMPLETA ESAP
 * Datos extraídos de la documentación oficial
 * Actualizado: 30 de Noviembre, 2025
 */

export interface ProgramaESAP {
  codigo: string;
  nombre: string;
  nivel: 'Pregrado' | 'Especialización' | 'Maestría';
  modalidad: 'Presencial' | 'Virtual' | 'Distancia';
  sedes: string[];
  duracionSemestres: number;
  creditos: number;
  estado: 'Activo' | 'Inactivo';
}

export interface SedeESAP {
  codigo: string;
  nombre: string;
  departamento: string;
  ciudad: string;
  nivel: 'Nacional' | 'Territorial' | 'Regional' | 'Sede';
  programasOfrecidos: string[]; // códigos de programas
}

// SEDES ESAP - Basado en oferta académica oficial
export const SEDES_ESAP: SedeESAP[] = [
  // NACIONAL
  {
    codigo: 'SEDE-NAL',
    nombre: 'Sede Nacional',
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá D.C.',
    nivel: 'Nacional',
    programasOfrecidos: ['APT-PRE', 'AP-DIURNA', 'AP-NOCTURNA', 'ECO-PRE', 'MAE-AP', 'MAE-DH', 'ESP-GP', 'ESP-FP', 'ESP-GS', 'ESP-PD', 'ESP-ADE', 'ESP-GPDU']
  },
  
  // TERRITORIALES Y REGIONALES CON PROGRAMAS
  {
    codigo: 'DIR-ATL',
    nombre: 'Barranquilla',
    departamento: 'Atlántico',
    ciudad: 'Barranquilla',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-ARA',
    nombre: 'Arauca',
    departamento: 'Arauca',
    ciudad: 'Arauca',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-CAS',
    nombre: 'Casanare',
    departamento: 'Casanare',
    ciudad: 'Yopal',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-VAL',
    nombre: 'Cali',
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE', 'ECO-PRE']
  },
  {
    codigo: 'DIR-CAU',
    nombre: 'Cauca',
    departamento: 'Cauca',
    ciudad: 'Popayán',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-CHO',
    nombre: 'Chocó',
    departamento: 'Chocó',
    ciudad: 'Quibdó',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-CUN',
    nombre: 'Cundinamarca',
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá D.C.',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-CAQ',
    nombre: 'Florencia',
    departamento: 'Caquetá',
    ciudad: 'Florencia',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-HUI',
    nombre: 'Huila',
    departamento: 'Huila',
    ciudad: 'Neiva',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-MET',
    nombre: 'Meta',
    departamento: 'Meta',
    ciudad: 'Villavicencio',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-GUA',
    nombre: 'Guaviare',
    departamento: 'Guaviare',
    ciudad: 'San José del Guaviare',
    nivel: 'Regional',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-NAR',
    nombre: 'Nariño',
    departamento: 'Nariño',
    ciudad: 'Pasto',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-NSA',
    nombre: 'Norte de Santander',
    departamento: 'Norte de Santander',
    ciudad: 'Cúcuta',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-QUI',
    nombre: 'Quindío',
    departamento: 'Quindío',
    ciudad: 'Armenia',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-SAN',
    nombre: 'Santander',
    departamento: 'Santander',
    ciudad: 'Bucaramanga',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-TOL',
    nombre: 'Tolima',
    departamento: 'Tolima',
    ciudad: 'Ibagué',
    nivel: 'Territorial',
    programasOfrecidos: ['APT-PRE']
  },
  {
    codigo: 'DIR-LAG',
    nombre: 'La Guajira',
    departamento: 'La Guajira',
    ciudad: 'Riohacha',
    nivel: 'Regional',
    programasOfrecidos: ['APT-PRE']
  }
];

// PROGRAMAS ACADÉMICOS ESAP - Basado en oferta académica oficial
export const PROGRAMAS_ESAP: ProgramaESAP[] = [
  // ==================== PREGRADO ====================
  {
    codigo: 'APT-PRE',
    nombre: 'Administración Pública Territorial',
    nivel: 'Pregrado',
    modalidad: 'Distancia',
    sedes: [
      'Barranquilla', 'Bogotá D.C.', 'Arauca', 'Casanare', 'Cali', 'Cauca', 
      'Chocó', 'Cundinamarca', 'Florencia', 'Huila', 'Meta', 'Guaviare',
      'Nariño', 'Norte de Santander', 'Quindío', 'Santander', 'Tolima', 
      'Valle del Cauca', 'La Guajira'
    ],
    duracionSemestres: 10,
    creditos: 160,
    estado: 'Activo'
  },
  {
    codigo: 'ECO-PRE',
    nombre: 'Economía',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    sedes: ['Bogotá D.C.', 'Cali'],
    duracionSemestres: 10,
    creditos: 160,
    estado: 'Activo'
  },
  {
    codigo: 'AP-DIURNA',
    nombre: 'Administración Pública - Jornada Diurna',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 10,
    creditos: 160,
    estado: 'Activo'
  },
  {
    codigo: 'AP-NOCTURNA',
    nombre: 'Administración Pública - Jornada Nocturna',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 10,
    creditos: 160,
    estado: 'Activo'
  },

  // ==================== ESPECIALIZACIONES ====================
  {
    codigo: 'ESP-PD',
    nombre: 'Especialización en Proyectos de Desarrollo',
    nivel: 'Especialización',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 2,
    creditos: 32,
    estado: 'Activo'
  },
  {
    codigo: 'ESP-GP',
    nombre: 'Especialización en Gestión Pública',
    nivel: 'Especialización',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 2,
    creditos: 30,
    estado: 'Activo'
  },
  {
    codigo: 'ESP-FP',
    nombre: 'Especialización en Finanzas Públicas',
    nivel: 'Especialización',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 2,
    creditos: 32,
    estado: 'Activo'
  },
  {
    codigo: 'ESP-GPDU',
    nombre: 'Especialización en Gestión y Planificación del Desarrollo Urbano y Regional',
    nivel: 'Especialización',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 2,
    creditos: 32,
    estado: 'Activo'
  },
  {
    codigo: 'ESP-ADE',
    nombre: 'Especialización en Alta Dirección del Estado',
    nivel: 'Especialización',
    modalidad: 'Presencial',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 2,
    creditos: 35,
    estado: 'Activo'
  },
  {
    codigo: 'ESP-GS',
    nombre: 'Especialización en Gerencia Social',
    nivel: 'Especialización',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 2,
    creditos: 30,
    estado: 'Activo'
  },

  // ==================== MAESTRÍAS ====================
  {
    codigo: 'MAE-AP',
    nombre: 'Maestría en Administración Pública',
    nivel: 'Maestría',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 4,
    creditos: 52,
    estado: 'Activo'
  },
  {
    codigo: 'MAE-DH',
    nombre: 'Maestría en Derechos Humanos y Derecho Internacional Humanitario',
    nivel: 'Maestría',
    modalidad: 'Distancia',
    sedes: ['Bogotá D.C.'],
    duracionSemestres: 4,
    creditos: 50,
    estado: 'Activo'
  }
];

// Función helper para obtener programas por sede
export function getProgramasPorSede(nombreSede: string): ProgramaESAP[] {
  return PROGRAMAS_ESAP.filter(programa => 
    programa.sedes.includes(nombreSede)
  );
}

// Función helper para obtener sedes de un programa
export function getSedesDePrograma(codigoPrograma: string): SedeESAP[] {
  const programa = PROGRAMAS_ESAP.find(p => p.codigo === codigoPrograma);
  if (!programa) return [];
  
  return SEDES_ESAP.filter(sede => 
    programa.sedes.includes(sede.ciudad)
  );
}

// Estadísticas
export const ESTADISTICAS_OFERTA = {
  totalSedes: SEDES_ESAP.length,
  totalProgramas: PROGRAMAS_ESAP.length,
  pregrados: PROGRAMAS_ESAP.filter(p => p.nivel === 'Pregrado').length,
  especializaciones: PROGRAMAS_ESAP.filter(p => p.nivel === 'Especialización').length,
  maestrias: PROGRAMAS_ESAP.filter(p => p.nivel === 'Maestría').length,
  sedesConPregrado: SEDES_ESAP.filter(s => s.programasOfrecidos.some(p => p.includes('PRE'))).length,
  sedesConPosgrado: SEDES_ESAP.filter(s => s.programasOfrecidos.some(p => p.includes('ESP') || p.includes('MAE'))).length
};