/**
 * Datos Mock EXPANDIDOS - Consultas Jurídicas (MOD-03)
 * 50 consultas distribuidas realísticamente
 */

import { ConsultaJuridica } from '../core/types';

function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

const abogados = ['Dr. Juan Pérez López', 'Dra. Ana López García', 'Dr. Carlos Ramírez'];
const solicitantes = [
  'Recursos Humanos', 'Contratación', 'Financiera', 'Académica', 'Planeación',
  'Bienestar', 'Sistemas', 'Comunicaciones', 'Rectoría', 'Vicerrectoría'
];

const temas = [
  'Contratación estatal', 'Régimen laboral', 'Procesos disciplinarios', 
  'Habeas data', 'Derechos de petición', 'Propiedad intelectual',
  'Régimen docente', 'Seguridad social', 'Procedimientos administrativos',
  'Responsabilidad contractual'
];

export const consultasJuridicasMock: ConsultaJuridica[] = Array.from({ length: 50 }, (_, i) => {
  const diasAtras = i * 2 + Math.floor(Math.random() * 10);
  const diasTotal = 10;
  const diasRestantes = Math.max(0, diasTotal - diasAtras);
  const etapa = diasRestantes === 0 ? 'RESPONDIDA' : diasRestantes <= 3 ? 'ANÁLISIS' : 'RADICADA';
  
  return {
    id: `CJ-2025-${String(i + 1).padStart(3, '0')}`,
    tema: temas[i % temas.length],
    solicitante: solicitantes[i % solicitantes.length],
    dependencia: `Dirección de ${solicitantes[i % solicitantes.length]}`,
    abogadoAsignado: abogados[i % abogados.length],
    etapa,
    fechaSolicitud: fechaHace(diasAtras),
    diasTotales: diasTotal,
    diasRestantes,
    consulta: `Consulta ${i + 1}: Se requiere concepto jurídico sobre ${temas[i % temas.length].toLowerCase()} en el contexto de las funciones institucionales.`,
    respuesta: etapa === 'RESPONDIDA' ? `Respuesta técnica emitida según normativa vigente.` : undefined,
    documentos: [],
    prioridad: diasRestantes <= 2 ? 'CRÍTICA' : diasRestantes <= 5 ? 'ALTA' : 'NORMAL',
    estado: 'ACTIVO',
    fechaCreacion: fechaHace(diasAtras),
    fechaActualizacion: fechaHace(Math.max(0, diasAtras - 2)),
  };
});

export const estadisticasAsesoriaJuridica = {
  total: consultasJuridicasMock.length,
  pendientes: consultasJuridicasMock.filter(c => c.etapa !== 'RESPONDIDA').length,
  respondidas: consultasJuridicasMock.filter(c => c.etapa === 'RESPONDIDA').length,
  criticas: consultasJuridicasMock.filter(c => c.diasRestantes <= 2).length,
};
