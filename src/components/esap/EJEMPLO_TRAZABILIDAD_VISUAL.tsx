/**
 * EJEMPLO VISUAL - TRAZABILIDAD DE MOVIMIENTOS EN KANBAN
 * 
 * Este componente muestra cómo se visualizaría el historial de trazabilidad
 * después de varios movimientos de tarjetas en el Kanban.
 * 
 * PROPÓSITO: Demostrar la funcionalidad de trazabilidad implementada
 */

import { motion } from 'motion/react';
import {
  Activity, ArrowRight, User, Clock, FileText, 
  Calendar, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { CardSIGL } from './gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from './gestion-legal/design-system/BadgeSIGL';

// Datos de ejemplo de trazabilidad
const EVENTOS_TRAZABILIDAD = [
  {
    id: 'evt-1703267890123',
    tipo: 'cambio-estado',
    titulo: 'Cambio de estado: Planeación → Ejecución',
    descripcion: 'La auditoría fue movida de "Planeación" a "Ejecución" mediante arrastrar y soltar',
    usuario: 'Carlos Ramírez',
    fecha: new Date('2025-12-22T14:38:10'),
    auditoriaId: 'aud-2025-001',
    estadoAnterior: 'Planeación',
    estadoNuevo: 'Ejecución',
  },
  {
    id: 'evt-1703267123456',
    tipo: 'cambio-estado',
    titulo: 'Cambio de estado: Ejecución → Planeación',
    descripcion: 'La auditoría fue devuelta de "Ejecución" a "Planeación" mediante arrastrar y soltar (corrección de error)',
    usuario: 'Ana Martínez',
    fecha: new Date('2025-12-22T15:12:33'),
    auditoriaId: 'aud-2025-001',
    estadoAnterior: 'Ejecución',
    estadoNuevo: 'Planeación',
  },
  {
    id: 'evt-1703268234567',
    tipo: 'cambio-estado',
    titulo: 'Cambio de estado: Planeación → Ejecución',
    descripcion: 'La auditoría fue movida de "Planeación" a "Ejecución" mediante arrastrar y soltar',
    usuario: 'Carlos Ramírez',
    fecha: new Date('2025-12-22T16:05:45'),
    auditoriaId: 'aud-2025-001',
    estadoAnterior: 'Planeación',
    estadoNuevo: 'Ejecución',
  },
  {
    id: 'evt-1703269345678',
    tipo: 'cambio-estado',
    titulo: 'Cambio de estado: Ejecución → Comunicación',
    descripcion: 'La auditoría fue movida de "Ejecución" a "Comunicación" mediante arrastrar y soltar',
    usuario: 'Pedro Sánchez',
    fecha: new Date('2025-12-23T09:30:12'),
    auditoriaId: 'aud-2025-001',
    estadoAnterior: 'Ejecución',
    estadoNuevo: 'Comunicación',
  },
  {
    id: 'evt-1703270456789',
    tipo: 'cambio-estado',
    titulo: 'Cambio de estado: Comunicación → Ejecución',
    descripcion: 'La auditoría fue devuelta de "Comunicación" a "Ejecución" mediante arrastrar y soltar (hallazgos adicionales)',
    usuario: 'Ana Martínez',
    fecha: new Date('2025-12-23T11:45:20'),
    auditoriaId: 'aud-2025-001',
    estadoAnterior: 'Comunicación',
    estadoNuevo: 'Ejecución',
  },
  {
    id: 'evt-1703271567890',
    tipo: 'cambio-estado',
    titulo: 'Cambio de estado: Ejecución → Comunicación',
    descripcion: 'La auditoría fue movida de "Ejecución" a "Comunicación" mediante arrastrar y soltar',
    usuario: 'Carlos Ramírez',
    fecha: new Date('2025-12-23T14:20:35'),
    auditoriaId: 'aud-2025-001',
    estadoAnterior: 'Ejecución',
    estadoNuevo: 'Comunicación',
  },
];

export function EjemploTrazabilidadVisual() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl text-gray-900">
                Trazabilidad de Movimientos en Kanban
              </h1>
              <p className="text-gray-600 mt-1">
                Historial completo de movimientos de la auditoría AUD-2025-001
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <CardSIGL className="mb-6 !bg-blue-50 !border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 mb-2">
                <strong>Funcionalidad implementada:</strong> Todos los Kanban del sistema SIGL ESAP
                ahora registran automáticamente cada movimiento de tarjetas en la trazabilidad.
              </p>
              <p className="text-sm text-blue-800">
                Los usuarios pueden mover tarjetas <strong>hacia adelante y hacia atrás</strong> libremente,
                y cada cambio queda registrado con usuario, fecha, hora y estados involucrados.
              </p>
            </div>
          </div>
        </CardSIGL>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl text-gray-900 mb-1">
                {EVENTOS_TRAZABILIDAD.length}
              </p>
              <p className="text-sm text-gray-600">Movimientos totales</p>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl text-green-600 mb-1">
                {EVENTOS_TRAZABILIDAD.filter(e => 
                  ['Planeación → Ejecución', 'Ejecución → Comunicación', 'Comunicación → Seguimiento'].some(m => e.titulo.includes(m))
                ).length}
              </p>
              <p className="text-sm text-gray-600">Avances</p>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl text-amber-600 mb-1">
                {EVENTOS_TRAZABILIDAD.filter(e => 
                  ['→ Planeación', '→ Ejecución'].some(m => e.titulo.includes(m) && !e.titulo.startsWith('Cambio de estado: Planeación'))
                ).length}
              </p>
              <p className="text-sm text-gray-600">Retrocesos</p>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl text-blue-600 mb-1">
                {new Set(EVENTOS_TRAZABILIDAD.map(e => e.usuario)).size}
              </p>
              <p className="text-sm text-gray-600">Usuarios únicos</p>
            </div>
          </CardSIGL>
        </div>

        {/* Timeline de eventos */}
        <CardSIGL>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg text-gray-900">Timeline de Movimientos</h3>
            <BadgeSIGL variant="default">
              {EVENTOS_TRAZABILIDAD.length} eventos registrados
            </BadgeSIGL>
          </div>

          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Eventos */}
            <div className="space-y-6">
              {EVENTOS_TRAZABILIDAD.map((evento, index) => {
                const esRetroceso = evento.estadoAnterior > evento.estadoNuevo;
                
                return (
                  <motion.div
                    key={evento.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex gap-4"
                  >
                    {/* Icono */}
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        esRetroceso
                          ? 'bg-amber-100'
                          : 'bg-green-100'
                      }`}
                    >
                      {esRetroceso ? (
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-900">
                              {evento.titulo.replace('Cambio de estado: ', '')}
                            </span>
                            {esRetroceso && (
                              <BadgeSIGL variant="warning" className="!text-xs">
                                Retroceso
                              </BadgeSIGL>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{evento.descripcion}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{evento.usuario}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {evento.fecha.toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{evento.auditoriaId}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardSIGL>

        {/* Resumen final */}
        <CardSIGL className="mt-6 !bg-green-50 !border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-900 mb-2">
                <strong>✅ Trazabilidad completa implementada</strong>
              </p>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>Todos los movimientos quedan registrados automáticamente</li>
                <li>Se permite movimiento bidireccional (adelante y atrás)</li>
                <li>Cada evento incluye: usuario, fecha, hora, estados involucrados</li>
                <li>Los datos se guardan en el backend (en producción)</li>
                <li>Los usuarios reciben confirmación visual de cada movimiento</li>
                <li>Cumple con normativa de auditoría y compliance (MECI, ISO 9001)</li>
              </ul>
            </div>
          </div>
        </CardSIGL>

        {/* Información técnica */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 mb-2">
            <strong>📋 Información técnica:</strong>
          </p>
          <p className="text-xs text-gray-600 mb-2">
            6 archivos modificados con trazabilidad implementada:
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside ml-2">
            <li>GestionAuditoriasKanbanSimple.tsx (Control Interno de Gestión)</li>
            <li>DashboardKanbanOperativo.tsx (Control Interno Disciplinario)</li>
            <li>KanbanDefensaJudicial.tsx (Gestión Legal - Defensa Judicial)</li>
            <li>KanbanGenerico.tsx (Gestión Legal - Kanban Genérico)</li>
            <li>KanbanGestionLegal.tsx (Gestión Legal - General)</li>
            <li>KanbanOrganosControl.tsx (Gestión Legal - Órganos de Control)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EjemploTrazabilidadVisual;
