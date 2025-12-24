/**
 * Datos Mock - Solicitudes de Informes (MOD-05)
 * Mock data para el módulo de Términos para Informes
 */

import { SolicitudInforme } from '../core/types';

function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

function fechaDentro(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

export const solicitudesInformesMock: SolicitudInforme[] = [
  // RECIBIDA
  {
    id: 'SI-2025-001',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe de Gestión Legal',
    enteSolicitante: 'Contraloría General de la República',
    radicadoExterno: 'CGR-2025-0234',
    asunto: 'Solicitud de informe trimestral de gestión legal Q1-2025',
    descripcion: 'Informe sobre procesos judiciales activos, sentencias y provisiones contables',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(2),
    fechaVencimiento: fechaDentro(13),
    diasTotales: 15,
    diasRestantes: 13,
    datosRequeridos: ['Procesos activos', 'Sentencias', 'Provisiones']
  },
  {
    id: 'SI-2025-002',
    etapa: 'RECIBIDA',
    tipoInforme: 'Respuesta Derecho de Petición',
    enteSolicitante: 'Ciudadano',
    radicadoExterno: 'PET-2025-089',
    asunto: 'Solicitud información sobre procesos disciplinarios',
    responsable: 'Dra. María Torres',
    fechaSolicitud: fechaHace(1),
    fechaVencimiento: fechaDentro(14),
    diasTotales: 15,
    diasRestantes: 14,
    datosRequeridos: ['Procesos disciplinarios']
  },
  
  // EN_ELABORACIÓN
  {
    id: 'SI-2025-003',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Informe al Congreso',
    enteSolicitante: 'Congreso de la República',
    radicadoExterno: 'CONG-2025-012',
    asunto: 'Informe anual de gestión jurídica 2024',
    responsable: 'Dr. Carlos Mendoza',
    fechaSolicitud: fechaHace(5),
    fechaVencimiento: fechaDentro(10),
    diasTotales: 15,
    diasRestantes: 10,
    datosRequeridos: ['Gestión anual', 'Estadísticas', 'Resultados']
  },
  {
    id: 'SI-2025-004',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Informe Ejecutivo',
    enteSolicitante: 'Dirección General ESAP',
    radicadoExterno: 'DG-2025-045',
    asunto: 'Estado de procesos judiciales críticos',
    responsable: 'Dra. Ana González',
    fechaSolicitud: fechaHace(3),
    fechaVencimiento: fechaDentro(7),
    diasTotales: 10,
    diasRestantes: 7,
    datosRequeridos: ['Procesos críticos', 'Riesgos']
  },
  
  // REVISIÓN
  {
    id: 'SI-2025-005',
    etapa: 'REVISIÓN',
    tipoInforme: 'Informe Procuraduría',
    enteSolicitante: 'Procuraduría General de la Nación',
    radicadoExterno: 'PGN-2025-156',
    asunto: 'Informe sobre procesos disciplinarios en curso',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(8),
    fechaVencimiento: fechaDentro(2),
    diasTotales: 10,
    diasRestantes: 2,
    datosRequeridos: ['Procesos disciplinarios']
  },
  
  // ENVIADO
  {
    id: 'SI-2025-006',
    etapa: 'ENVIADO',
    tipoInforme: 'Informe Mensual',
    enteSolicitante: 'Archivo General de la Nación',
    radicadoExterno: 'AGN-2025-023',
    asunto: 'Informe de gestión documental legal',
    responsable: 'Dra. María Torres',
    fechaSolicitud: fechaHace(12),
    fechaVencimiento: fechaHace(2),
    diasTotales: 10,
    diasRestantes: 0,
    datosRequeridos: ['Gestión documental']
  },
];

export const estadisticasTerminosInformes = {
  total: solicitudesInformesMock.length,
  porEtapa: {
    RECIBIDA: solicitudesInformesMock.filter(s => s.etapa === 'RECIBIDA').length,
    EN_ELABORACIÓN: solicitudesInformesMock.filter(s => s.etapa === 'EN_ELABORACIÓN').length,
    REVISIÓN: solicitudesInformesMock.filter(s => s.etapa === 'REVISIÓN').length,
    ENVIADO: solicitudesInformesMock.filter(s => s.etapa === 'ENVIADO').length,
  },
};
