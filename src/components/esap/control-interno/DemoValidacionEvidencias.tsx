/**
 * DEMO: VALIDACIÓN DE EVIDENCIAS EN PLANES DE MEJORAMIENTO
 * Componente de demostración del sistema de validación
 */

'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MetricCard } from '../shared/MetricCard';
import { BotonEvidencias } from './ModalValidacionEvidencias';
import {
  MOCK_PLANES_MEJORAMIENTO,
  obtenerEstadisticasPlanes,
  type PlanMejoramiento,
  type Evidencia,
} from './data/mockPlanesMejoramiento';
import { toast } from 'sonner@2.0.3';

export function DemoValidacionEvidencias() {
  const [planes, setPlanes] = useState<PlanMejoramiento[]>(MOCK_PLANES_MEJORAMIENTO);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [usuarioActual, setUsuarioActual] = useState<'responsable' | 'auditor' | 'jefe'>('responsable');

  const stats = obtenerEstadisticasPlanes();

  // ============ HANDLERS ============

  const handleCargarEvidencia = (planId: string, data: any) => {
    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const nuevaEvidencia: Evidencia = {
            id: `ev-${Date.now()}`,
            nombre: data.nombre,
            tipo: data.archivo?.type || 'application/pdf',
            tamaño: data.archivo ? `${(data.archivo.size / 1024).toFixed(0)} KB` : '1.5 MB',
            fechaCarga: new Date().toISOString().split('T')[0],
            version: 1,
            descripcion: data.descripcion,
            estadoValidacion: 'Pendiente',
            responsableCarga: p.responsable,
          };

          return {
            ...p,
            evidencias: [...p.evidencias, nuevaEvidencia],
            avance: Math.min(p.avance + 10, 100),
          };
        }
        return p;
      })
    );
    toast.success('Evidencia cargada correctamente');
  };

  const handleValidarEvidencia = (planId: string, evidenciaId: string, data: any) => {
    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          return {
            ...p,
            evidencias: p.evidencias.map((ev) => {
              if (ev.id === evidenciaId) {
                return {
                  ...ev,
                  estadoValidacion: data.estado,
                  validacion: {
                    id: `val-${Date.now()}`,
                    evidenciaId: ev.id,
                    auditorRevisor:
                      usuarioActual === 'auditor'
                        ? 'Mario Oswaldo Bernal Rodriguez'
                        : 'Auditor Revisor',
                    fechaRevision: new Date().toISOString().split('T')[0],
                    estado: data.estado,
                    checklist: data.checklist,
                    comentarios: data.comentarios,
                  },
                };
              }
              return ev;
            }),
            avance:
              data.estado === 'Aprobada' ? Math.min(p.avance + 15, 100) : p.avance,
          };
        }
        return p;
      })
    );
    toast.success(`Evidencia ${data.estado.toLowerCase()} correctamente`);
  };

  // ============ FILTRADO ============

  const planesFiltrados = planes.filter((p) => {
    if (filtroEstado === 'todos') return true;
    return p.estado === filtroEstado;
  });

  // ============ RENDER ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Validación de Evidencias - Planes de Mejoramiento
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Sistema para cargar, revisar y validar evidencias de cumplimiento de acciones de mejora
        </p>
      </div>

      {/* Selector de Rol (para demo) */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-gray-900 mb-2">
          👤 Simular rol de usuario (para testing):
        </p>
        <div className="flex gap-2">
          <Button
            variant={usuarioActual === 'responsable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUsuarioActual('responsable')}
          >
            Responsable (puede cargar evidencias)
          </Button>
          <Button
            variant={usuarioActual === 'auditor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUsuarioActual('auditor')}
          >
            Auditor (puede validar)
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Planes Activos"
          value={stats.total}
          icon={FileText}
          iconColor="#003DA5"
          iconBgColor="#EFF6FF"
        />
        <MetricCard
          title="En Ejecución"
          value={stats.porEstado.enEjecucion}
          icon={Clock}
          iconColor="#3B82F6"
          iconBgColor="#DBEAFE"
        />
        <MetricCard
          title="Total Evidencias"
          value={stats.evidencias.total}
          icon={FileCheck}
          iconColor="#8B5CF6"
          iconBgColor="#EDE9FE"
        />
        <MetricCard
          title="Pendientes"
          value={stats.evidencias.pendientes}
          icon={AlertCircle}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
        />
        <MetricCard
          title="Aprobadas"
          value={stats.evidencias.aprobadas}
          icon={CheckCircle}
          iconColor="#10B981"
          iconBgColor="#D1FAE5"
        />
        <MetricCard
          title="Avance Promedio"
          value={`${stats.avancePromedio}%`}
          icon={TrendingUp}
          iconColor="#06B6D4"
          iconBgColor="#CFFAFE"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filtroEstado === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('todos')}
        >
          Todos ({planes.length})
        </Button>
        <Button
          variant={filtroEstado === 'En Ejecución' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('En Ejecución')}
        >
          En Ejecución ({stats.porEstado.enEjecucion})
        </Button>
        <Button
          variant={filtroEstado === 'Completado' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('Completado')}
        >
          Completados ({stats.porEstado.completados})
        </Button>
        <Button
          variant={filtroEstado === 'Vencido' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('Vencido')}
        >
          Vencidos ({stats.porEstado.vencidos})
        </Button>
      </div>

      {/* Lista de Planes */}
      <div className="space-y-4">
        {planesFiltrados.map((plan) => {
          const evidenciasPendientes = plan.evidencias.filter(
            (ev) =>
              ev.estadoValidacion === 'Pendiente' || ev.estadoValidacion === 'En Revisión'
          ).length;
          const evidenciasAprobadas = plan.evidencias.filter(
            (ev) => ev.estadoValidacion === 'Aprobada'
          ).length;
          const evidenciasRechazadas = plan.evidencias.filter(
            (ev) => ev.estadoValidacion === 'Rechazada'
          ).length;

          return (
            <div
              key={plan.id}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{plan.accionMejora}</h3>
                    <Badge
                      className={
                        plan.estado === 'Completado'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : plan.estado === 'En Ejecución'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : plan.estado === 'Vencido'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {plan.estado}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{plan.codigo}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-700">
                    <div>
                      <span className="font-medium">Responsable:</span> {plan.responsable}
                    </div>
                    <div>
                      <span className="font-medium">Área:</span> {plan.areaResponsable}
                    </div>
                    <div>
                      <span className="font-medium">Avance:</span>{' '}
                      <Badge variant="outline">{plan.avance}%</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Plazo:</span> {plan.fechaFin}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span>{plan.avance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${plan.avance}%`,
                          backgroundColor:
                            plan.avance >= 75
                              ? '#10B981'
                              : plan.avance >= 50
                              ? '#3B82F6'
                              : plan.avance >= 25
                              ? '#F59E0B'
                              : '#EF4444',
                        }}
                      />
                    </div>
                  </div>

                  {/* Indicador de evidencias */}
                  {plan.evidencias.length > 0 && (
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <FileCheck className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">
                          {plan.evidencias.length} evidencias
                        </span>
                      </div>
                      {evidenciasPendientes > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          {evidenciasPendientes} pendientes
                        </Badge>
                      )}
                      {evidenciasAprobadas > 0 && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {evidenciasAprobadas} aprobadas
                        </Badge>
                      )}
                      {evidenciasRechazadas > 0 && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          {evidenciasRechazadas} rechazadas
                        </Badge>
                      )}
                    </div>
                  )}

                  {plan.observaciones && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200 text-xs text-gray-700">
                      <strong>Observaciones:</strong> {plan.observaciones}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2">
                  <BotonEvidencias
                    plan={plan}
                    usuarioActual={{
                      nombre:
                        usuarioActual === 'responsable'
                          ? plan.responsable
                          : usuarioActual === 'auditor'
                          ? 'Mario Oswaldo Bernal Rodriguez'
                          : 'Jefe Control Interno',
                      rol: usuarioActual,
                    }}
                    onCargarEvidencia={handleCargarEvidencia}
                    onValidarEvidencia={handleValidarEvidencia}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {planesFiltrados.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No hay planes con el estado seleccionado</p>
        </div>
      )}

      {/* Info adicional */}
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900 mb-1">Sistema de Validación de Evidencias</p>
            <ul className="text-xs space-y-1">
              <li>• Los responsables cargan evidencias de cumplimiento</li>
              <li>• Los auditores validan con checklist de 5 criterios</li>
              <li>• Las evidencias rechazadas pueden recargarse en nueva versión</li>
              <li>• El sistema mantiene historial completo de validaciones</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
