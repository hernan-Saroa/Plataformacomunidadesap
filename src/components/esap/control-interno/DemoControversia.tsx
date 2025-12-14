/**
 * DEMO: PROCESO DE CONTROVERSIA DE HALLAZGOS
 * Componente de demostración del sistema de controversias
 */

'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Shield,
  TrendingUp
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MetricCard } from '../shared/MetricCard';
import { BotonControversia } from './ModalControversia';
import { MOCK_HALLAZGOS, obtenerEstadisticasHallazgos, type Hallazgo } from './data/mockHallazgos';
import { toast } from 'sonner@2.0.3';

export function DemoControversia() {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(MOCK_HALLAZGOS);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [usuarioActual, setUsuarioActual] = useState<'auditado' | 'auditor' | 'jefe'>('auditado');

  const stats = obtenerEstadisticasHallazgos();

  // ============ HANDLERS ============

  const handleIniciarControversia = (hallazgoId: string, data: any) => {
    setHallazgos((prev) =>
      prev.map((h) => {
        if (h.id === hallazgoId) {
          return {
            ...h,
            estado: 'En Controversia' as const,
            controversia: {
              id: `cont-${Date.now()}`,
              hallazgoId: h.id,
              fechaInicio: new Date().toISOString().split('T')[0],
              estado: 'Pendiente' as const,
              argumentosAuditado: data.argumentos,
              evidenciasDescargo: data.evidencias,
              responsableDescargo: h.responsable,
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  tipo: 'inicio' as const,
                  descripcion: 'Controversia iniciada por el responsable del proceso',
                  usuario: h.responsable,
                  fecha: new Date().toLocaleString('es-CO'),
                },
                {
                  id: `tl-${Date.now() + 1}`,
                  tipo: 'argumentacion' as const,
                  descripcion: 'Argumentos de descargo presentados',
                  usuario: h.responsable,
                  fecha: new Date().toLocaleString('es-CO'),
                },
              ],
            },
          };
        }
        return h;
      })
    );
    toast.success('Controversia iniciada correctamente');
  };

  const handleResponderControversia = (hallazgoId: string, data: any) => {
    setHallazgos((prev) =>
      prev.map((h) => {
        if (h.id === hallazgoId && h.controversia) {
          const nuevoEstado =
            data.decision === 'Anular Hallazgo'
              ? 'Rechazado'
              : data.decision === 'Modificar Hallazgo'
              ? 'Cerrado'
              : 'Cerrado';

          return {
            ...h,
            estado: nuevoEstado as any,
            controversia: {
              ...h.controversia,
              estado: 'Aceptada' as const,
              respuestaAuditor: data.respuesta,
              auditorRevisor: h.auditor,
              fechaRespuesta: new Date().toISOString().split('T')[0],
              decisionFinal: data.decision,
              justificacionDecision: data.justificacion,
              fechaDecision: new Date().toISOString().split('T')[0],
              timeline: [
                ...h.controversia.timeline,
                {
                  id: `tl-${Date.now()}`,
                  tipo: 'respuesta' as const,
                  descripcion: 'Auditor emitió respuesta',
                  usuario: h.auditor,
                  fecha: new Date().toLocaleString('es-CO'),
                },
                {
                  id: `tl-${Date.now() + 1}`,
                  tipo: 'decision' as const,
                  descripcion: `Decisión: ${data.decision}`,
                  usuario: h.auditor,
                  fecha: new Date().toLocaleString('es-CO'),
                },
              ],
            },
          };
        }
        return h;
      })
    );
    toast.success('Decisión registrada correctamente');
  };

  // ============ FILTRADO ============

  const hallazgosFiltrados = hallazgos.filter((h) => {
    if (filtroEstado === 'todos') return true;
    return h.estado === filtroEstado;
  });

  // ============ RENDER ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Proceso de Controversia de Hallazgos
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Sistema que permite al auditado ejercer su derecho a controvertir hallazgos identificados
        </p>
      </div>

      {/* Selector de Rol (para demo) */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-gray-900 mb-2">
          👤 Simular rol de usuario (para testing):
        </p>
        <div className="flex gap-2">
          <Button
            variant={usuarioActual === 'auditado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUsuarioActual('auditado')}
          >
            Auditado (puede iniciar controversia)
          </Button>
          <Button
            variant={usuarioActual === 'auditor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUsuarioActual('auditor')}
          >
            Auditor (puede responder)
          </Button>
          <Button
            variant={usuarioActual === 'jefe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUsuarioActual('jefe')}
          >
            Jefe Control Interno (solo lectura)
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Hallazgos"
          value={stats.total}
          icon={FileText}
          iconColor="#003DA5"
          iconBgColor="#EFF6FF"
        />
        <MetricCard
          title="En Controversia"
          value={stats.porEstado.enControversia}
          icon={MessageSquare}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
        />
        <MetricCard
          title="Con Controversia"
          value={stats.conControversia}
          icon={Shield}
          iconColor="#8B5CF6"
          iconBgColor="#EDE9FE"
        />
        <MetricCard
          title="Críticos"
          value={stats.porGravedad.critica}
          icon={AlertTriangle}
          iconColor="#EF4444"
          iconBgColor="#FEE2E2"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filtroEstado === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('todos')}
        >
          Todos ({hallazgos.length})
        </Button>
        <Button
          variant={filtroEstado === 'Abierto' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('Abierto')}
        >
          Abiertos ({stats.porEstado.abiertos})
        </Button>
        <Button
          variant={filtroEstado === 'En Controversia' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('En Controversia')}
        >
          En Controversia ({stats.porEstado.enControversia})
        </Button>
        <Button
          variant={filtroEstado === 'Cerrado' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('Cerrado')}
        >
          Cerrados ({stats.porEstado.cerrados})
        </Button>
        <Button
          variant={filtroEstado === 'Rechazado' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('Rechazado')}
        >
          Rechazados ({stats.porEstado.rechazados})
        </Button>
      </div>

      {/* Lista de Hallazgos */}
      <div className="space-y-4">
        {hallazgosFiltrados.map((hallazgo) => (
          <div
            key={hallazgo.id}
            className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{hallazgo.titulo}</h3>
                  <Badge
                    className={
                      hallazgo.gravedad === 'Crítica'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : hallazgo.gravedad === 'Alta'
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : hallazgo.gravedad === 'Media'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-green-100 text-green-800 border-green-200'
                    }
                  >
                    {hallazgo.gravedad}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      hallazgo.estado === 'En Controversia'
                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                        : hallazgo.estado === 'Cerrado'
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : hallazgo.estado === 'Rechazado'
                        ? 'bg-gray-50 text-gray-700 border-gray-300'
                        : 'bg-blue-50 text-blue-700 border-blue-300'
                    }
                  >
                    {hallazgo.estado}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 mb-2">{hallazgo.codigo}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-700">
                  <div>
                    <span className="font-medium">Proceso:</span> {hallazgo.procesoAuditado}
                  </div>
                  <div>
                    <span className="font-medium">Responsable:</span> {hallazgo.responsable}
                  </div>
                  <div>
                    <span className="font-medium">Auditor:</span> {hallazgo.auditor}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {hallazgo.fechaIdentificacion}
                  </div>
                </div>

                {/* Indicador de controversia */}
                {hallazgo.controversia && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-900">
                        {hallazgo.controversia.estado === 'Pendiente'
                          ? 'Controversia pendiente de respuesta'
                          : hallazgo.controversia.estado === 'Aceptada'
                          ? `Controversia resuelta: ${hallazgo.controversia.decisionFinal}`
                          : 'Controversia en revisión'}
                      </span>
                    </div>
                    {hallazgo.controversia.decisionFinal && (
                      <p className="text-xs text-gray-600 mt-1">
                        {hallazgo.controversia.justificacionDecision?.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <BotonControversia
                  hallazgo={hallazgo}
                  usuarioActual={{
                    nombre:
                      usuarioActual === 'auditor'
                        ? hallazgo.auditor
                        : usuarioActual === 'auditado'
                        ? hallazgo.responsable
                        : 'Mario Oswaldo Bernal Rodriguez',
                    rol: usuarioActual,
                  }}
                  onIniciarControversia={(data) => handleIniciarControversia(hallazgo.id, data)}
                  onResponderControversia={(data) => handleResponderControversia(hallazgo.id, data)}
                />
              </div>
            </div>

            {/* Detalle breve */}
            <div className="text-sm text-gray-700 space-y-1 pt-3 border-t">
              <p>
                <span className="font-medium">Condición:</span> {hallazgo.condicion}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hallazgosFiltrados.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No hay hallazgos con el estado seleccionado</p>
        </div>
      )}
    </div>
  );
}
