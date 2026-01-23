/**
 * CONSOLIDADO LINEAMIENTOS - Arquitectura Empresarial
 * Datos de ejemplo para demostración del módulo de Arquitectura Empresarial
 */

export interface LineamientoConsolidado {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modelo: string;
  dominio: string;
  subdominio: string;
  prioridad: string;
  estado: string;
  progreso: number;
  obligatorio: boolean;
  fechaImplementacion?: string;
  responsable?: string;
}

export interface EstadisticasGlobales {
  total: number;
  porEstado: {
    completo: number;
    enProgreso: number;
    pendiente: number;
  };
  porModelo: {
    MAE: number;
    MGGTI: number;
    PETIC: number;
    MECA: number;
  };
  complianceObligatorios: number;
  progresoPromedio: number;
  progresoMAE: number;
  progresoMGGTI: number;
  progresoPETIC: number;
  progresoMECA: number;
}

// Datos de ejemplo consolidados
const LINEAMIENTOS_EJEMPLO: LineamientoConsolidado[] = [
  // MGGTI - Modelo de Gestión y Gobierno TI
  {
    id: 'MGGTI-001',
    codigo: 'MGGTI-L1.1',
    nombre: 'Plan Estratégico de TI - PETI',
    descripcion: 'Definir y mantener actualizado el PETI alineado con el plan estratégico institucional',
    modelo: 'MGGTI',
    dominio: 'Estrategia TI',
    subdominio: 'Planeación Estratégica',
    prioridad: 'alta',
    estado: 'en-progreso',
    progreso: 65,
    obligatorio: true,
    responsable: 'Oficina de Tecnología',
    fechaImplementacion: '2024-06-30'
  },
  {
    id: 'MGGTI-002',
    codigo: 'MGGTI-L1.2',
    nombre: 'Comité Estratégico de TI',
    descripcion: 'Conformar y operar el comité estratégico de TI',
    modelo: 'MGGTI',
    dominio: 'Gobierno TI',
    subdominio: 'Estructura de Gobierno',
    prioridad: 'alta',
    estado: 'completo',
    progreso: 100,
    obligatorio: true,
    responsable: 'Dirección General',
    fechaImplementacion: '2023-12-15'
  },
  {
    id: 'MGGTI-003',
    codigo: 'MGGTI-L3.1',
    nombre: 'Política de Seguridad de la Información',
    descripcion: 'Definir e implementar política de seguridad de la información',
    modelo: 'MGGTI',
    dominio: 'Seguridad y Privacidad',
    subdominio: 'Seguridad de la Información',
    prioridad: 'critica',
    estado: 'completo',
    progreso: 100,
    obligatorio: true,
    responsable: 'Oficina de Seguridad Informática',
    fechaImplementacion: '2023-08-20'
  },
  
  // MGPTI - Modelo de Gestión de Proyectos TI
  {
    id: 'MGPTI-001',
    codigo: 'MGPTI-P1.1',
    nombre: 'Portafolio de Proyectos de TI',
    descripcion: 'Mantener inventario actualizado de proyectos de TI priorizados',
    modelo: 'MGPTI',
    dominio: 'Gestión de Portafolio',
    subdominio: 'Inventario de Proyectos',
    prioridad: 'alta',
    estado: 'en-progreso',
    progreso: 70,
    obligatorio: true,
    responsable: 'Oficina de Proyectos TI',
    fechaImplementacion: '2024-03-31'
  },
  {
    id: 'MGPTI-002',
    codigo: 'MGPTI-P2.1',
    nombre: 'Metodología de Gestión de Proyectos',
    descripcion: 'Implementar metodología estándar para gestión de proyectos',
    modelo: 'MGPTI',
    dominio: 'Gestión de Proyectos',
    subdominio: 'Metodología',
    prioridad: 'alta',
    estado: 'en-progreso',
    progreso: 60,
    obligatorio: true,
    responsable: 'Oficina de Proyectos TI',
    fechaImplementacion: '2024-05-30'
  },
  
  // MAE - Modelo de Arquitectura Empresarial
  {
    id: 'MAE-001',
    codigo: 'MAE-A1.1',
    nombre: 'Catálogo de Servicios Tecnológicos',
    descripcion: 'Documentar y mantener actualizado el catálogo de servicios TI',
    modelo: 'MAE',
    dominio: 'Servicios Tecnológicos',
    subdominio: 'Catálogo de Servicios',
    prioridad: 'media',
    estado: 'en-progreso',
    progreso: 45,
    obligatorio: false,
    responsable: 'Oficina de Tecnología',
    fechaImplementacion: '2024-08-30'
  },
  {
    id: 'MAE-002',
    codigo: 'MAE-A2.1',
    nombre: 'Mapa de Sistemas de Información',
    descripcion: 'Documentar todos los sistemas de información institucionales',
    modelo: 'MAE',
    dominio: 'Sistemas de Información',
    subdominio: 'Inventario de Sistemas',
    prioridad: 'media',
    estado: 'pendiente',
    progreso: 20,
    obligatorio: false,
    responsable: 'Oficina de Tecnología'
  },
  
  // PETIC - Plan Estratégico TIC
  {
    id: 'PETIC-001',
    codigo: 'PETIC-E1.1',
    nombre: 'Objetivos Estratégicos TI',
    descripcion: 'Definir objetivos estratégicos de TI alineados con objetivos institucionales',
    modelo: 'PETIC',
    dominio: 'Planeación Estratégica',
    subdominio: 'Objetivos',
    prioridad: 'alta',
    estado: 'completo',
    progreso: 100,
    obligatorio: true,
    responsable: 'Comité Estratégico TI',
    fechaImplementacion: '2023-11-30'
  },
  {
    id: 'PETIC-002',
    codigo: 'PETIC-E1.2',
    nombre: 'Plan de Acción TI',
    descripcion: 'Desarrollar plan de acción con iniciativas priorizadas',
    modelo: 'PETIC',
    dominio: 'Planeación Estratégica',
    subdominio: 'Plan de Acción',
    prioridad: 'alta',
    estado: 'en-progreso',
    progreso: 75,
    obligatorio: true,
    responsable: 'Oficina de Planeación',
    fechaImplementacion: '2024-02-28'
  },
  
  // MECA - Modelo de Gestión de Capacidades
  {
    id: 'MECA-001',
    codigo: 'MECA-C1.1',
    nombre: 'Inventario de Capacidades TI',
    descripcion: 'Identificar y documentar capacidades tecnológicas institucionales',
    modelo: 'MECA',
    dominio: 'Gestión de Capacidades',
    subdominio: 'Inventario',
    prioridad: 'baja',
    estado: 'pendiente',
    progreso: 15,
    obligatorio: false,
    responsable: 'Oficina de Tecnología'
  }
];

export function getAllLineamientosConsolidados(): LineamientoConsolidado[] {
  return LINEAMIENTOS_EJEMPLO;
}

export function getEstadisticasGlobales(): EstadisticasGlobales {
  const lineamientos = LINEAMIENTOS_EJEMPLO;
  
  // Calcular estadísticas
  const completo = lineamientos.filter(l => l.estado === 'completo').length;
  const enProgreso = lineamientos.filter(l => l.estado === 'en-progreso').length;
  const pendiente = lineamientos.filter(l => l.estado === 'pendiente').length;
  
  const porModelo = {
    MAE: lineamientos.filter(l => l.modelo === 'MAE').length,
    MGGTI: lineamientos.filter(l => l.modelo === 'MGGTI').length,
    PETIC: lineamientos.filter(l => l.modelo === 'PETIC').length,
    MECA: lineamientos.filter(l => l.modelo === 'MECA').length
  };
  
  const obligatorios = lineamientos.filter(l => l.obligatorio);
  const obligatoriosCompletos = obligatorios.filter(l => l.estado === 'completo').length;
  const complianceObligatorios = Math.round((obligatoriosCompletos / obligatorios.length) * 100);
  
  const progresoPromedio = Math.round(
    lineamientos.reduce((acc, l) => acc + l.progreso, 0) / lineamientos.length
  );
  
  const calcularProgresoModelo = (modelo: string) => {
    const lineamientosModelo = lineamientos.filter(l => l.modelo === modelo);
    if (lineamientosModelo.length === 0) return 0;
    return Math.round(
      lineamientosModelo.reduce((acc, l) => acc + l.progreso, 0) / lineamientosModelo.length
    );
  };
  
  return {
    total: lineamientos.length,
    porEstado: {
      completo,
      enProgreso,
      pendiente
    },
    porModelo,
    complianceObligatorios,
    progresoPromedio,
    progresoMAE: calcularProgresoModelo('MAE'),
    progresoMGGTI: calcularProgresoModelo('MGGTI'),
    progresoPETIC: calcularProgresoModelo('PETIC'),
    progresoMECA: calcularProgresoModelo('MECA')
  };
}

// Export default para compatibilidad
export default {
  getAllLineamientosConsolidados,
  getEstadisticasGlobales
};
