/**
 * Datos Mock EXPANDIDOS - Notificaciones Judiciales (MOD-04)
 * 80 notificaciones distribuidas realísticamente
 */

import { NotificacionJudicial } from '../core/types';

function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

const juzgados = [
  'Tribunal Administrativo de Cundinamarca',
  'Juzgado Administrativo de Bogotá',
  'Consejo de Estado',
  'Tribunal Administrativo de Antioquia',
  'Juzgado Laboral del Circuito',
];

const tiposActuacion = [
  'Auto Admisorio', 'Traslado de Demanda', 'Auto de Pruebas', 'Citación a Audiencia',
  'Sentencia Primera Instancia', 'Auto de Sustanciación', 'Requerimiento',
  'Notificación de Recurso', 'Auto de Archivo', 'Providencia'
];

export const notificacionesJudicialesMock: NotificacionJudicial[] = Array.from({ length: 80 }, (_, i) => {
  const diasAtras = Math.floor(i / 2);
  const leida = i % 3 === 0;
  const urgente = i % 5 === 0;
  
  return {
    id: `NOT-2025-${String(i + 1).padStart(4, '0')}`,
    expediente: `PJ-2024-${String(Math.floor(i / 3) + 1).padStart(3, '0')}`,
    juzgado: juzgados[i % juzgados.length],
    tipoActuacion: tiposActuacion[i % tiposActuacion.length],
    fechaNotificacion: fechaHace(diasAtras),
    fechaRecepcion: fechaHace(diasAtras),
    asunto: `${tiposActuacion[i % tiposActuacion.length]} - Proceso radicado No. 2024-${String(i + 1).padStart(5, '0')}-00`,
    contenido: `Se notifica ${tiposActuacion[i % tiposActuacion.length].toLowerCase()} dentro del proceso judicial referenciado.`,
    leida,
    urgente,
    archivar: false,
    documentos: [],
    estado: leida ? 'LEÍDA' : 'PENDIENTE',
  };
});

export const estadisticasBuzonNotificaciones = {
  total: notificacionesJudicialesMock.length,
  pendientes: notificacionesJudicialesMock.filter(n => !n.leida).length,
  urgentes: notificacionesJudicialesMock.filter(n => n.urgente).length,
  leidas: notificacionesJudicialesMock.filter(n => n.leida).length,
};
