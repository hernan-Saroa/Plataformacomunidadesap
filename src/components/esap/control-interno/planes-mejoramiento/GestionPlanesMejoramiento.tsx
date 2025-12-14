/**
 * GESTIÓN DE PLANES DE MEJORAMIENTO - Vista Principal
 * RF010 - Formulación de Planes de Mejoramiento
 * RF011 - Seguimiento Trimestral Automatizado
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, TrendingUp, AlertCircle, CheckCircle2, Clock, Plus,
  Eye, Edit, Calendar, Users, Target, Filter, Download
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { MetricCard } from '../../shared/MetricCard';
import { ToolbarActions } from '../../shared/ToolbarActions';
import { FormulacionPlan } from './FormulacionPlan';
import { SeguimientoTrimestral } from './SeguimientoTrimestral';
import { toast } from 'sonner@2.0.3';

type VistaActiva = 'lista' | 'formulacion' | 'seguimiento';

interface PlanMejoramiento {
  id: string;
  codigo: string;
  auditoria: string;
  codigoAuditoria: string;
  territorial: string;
  sede: string;
  hallazgosTotal: number;
  accionesTotal: number;
  accionesImplementadas: number;
  estado: 'en-formulacion' | 'aprobado' | 'en-ejecucion' | 'completado' | 'vencido';
  fechaFormulacion: string;
  fechaAprobacion?: string;
  responsableFormulacion: string;
  responsableArea: string;
  porcentajeCumplimiento: number;
  porcentajeEfectividad: number;
  proximoSeguimiento?: string;
  seguimientosRealizados: number;
  seguimientosTotales: number;
}

const MOCK_PLANES: PlanMejoramiento[] = [
  {
    id: '1',
    codigo: 'PM-2024-001',
    auditoria: 'Auditoría de Gestión Financiera',
    codigoAuditoria: 'AUD-2024-001',
    territorial: 'Cundinamarca',
    sede: 'Bogotá - Sede Central',
    hallazgosTotal: 3,
    accionesTotal: 8,
    accionesImplementadas: 6,
    estado: 'en-ejecucion',
    fechaFormulacion: '2024-12-20',
    fechaAprobacion: '2024-12-22',
    responsableFormulacion: 'Mario Oswaldo Bernal Rodriguez',
    responsableArea: 'Director Financiero - Juan Carlos Pérez',
    porcentajeCumplimiento: 75,
    porcentajeEfectividad: 80,
    proximoSeguimiento: '2025-01-15',
    seguimientosRealizados: 2,
    seguimientosTotales: 4
  },
  {
    id: '2',
    codigo: 'PM-2024-002',
    auditoria: 'Auditoría de Procesos Académicos',
    codigoAuditoria: 'AUD-2024-003',
    territorial: 'Valle del Cauca',
    sede: 'Cali',
    hallazgosTotal: 5,
    accionesTotal: 12,
    accionesImplementadas: 12,
    estado: 'completado',
    fechaFormulacion: '2024-11-25',
    fechaAprobacion: '2024-11-28',
    responsableFormulacion: 'Fernando Ávila',
    responsableArea: 'Directora Académica - María López',
    porcentajeCumplimiento: 100,
    porcentajeEfectividad: 95,
    seguimientosRealizados: 4,
    seguimientosTotales: 4
  },
  {
    id: '3',
    codigo: 'PM-2024-003',
    auditoria: 'Auditoría de Recursos Humanos',
    codigoAuditoria: 'AUD-2024-004',
    territorial: 'Atlántico',
    sede: 'Barranquilla',
    hallazgosTotal: 2,
    accionesTotal: 5,
    accionesImplementadas: 2,
    estado: 'vencido',
    fechaFormulacion: '2024-10-15',
    fechaAprobacion: '2024-10-18',
    responsableFormulacion: 'Sandra Montero',
    responsableArea: 'Jefe RRHH - Carlos Gómez',
    porcentajeCumplimiento: 40,
    porcentajeEfectividad: 35,
    proximoSeguimiento: '2024-12-01',
    seguimientosRealizados: 1,
    seguimientosTotales: 4
  },
  {
    id: '4',
    codigo: 'PM-2024-004',
    auditoria: 'Auditoría de Control Interno',
    codigoAuditoria: 'AUD-2024-002',
    territorial: 'Antioquia',
    sede: 'Medellín',
    hallazgosTotal: 0,
    accionesTotal: 10,
    accionesImplementadas: 3,
    estado: 'en-formulacion',
    fechaFormulacion: '2024-12-01',
    responsableFormulacion: 'Catalina Rubio',
    responsableArea: 'Coord. Control Interno - Ana Ramírez',
    porcentajeCumplimiento: 30,
    porcentajeEfectividad: 0,
    seguimientosRealizados: 0,
    seguimientosTotales: 4
  }
];

export function GestionPlanesMejoramiento() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('lista');
  const [planes, setPlanes] = useState<PlanMejoramiento[]>(MOCK_PLANES);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanMejoramiento | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Métricas calculadas
  const totalPlanes = planes.length;
  const enEjecucion = planes.filter(p => p.estado === 'en-ejecucion').length;
  const completados = planes.filter(p => p.estado === 'completado').length;
  const vencidos = planes.filter(p => p.estado === 'vencido').length;
  const cumplimientoPromedio = Math.round(
    planes.reduce((sum, p) => sum + p.porcentajeCumplimiento, 0) / planes.length
  );

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado': return '#10B981';
      case 'en-ejecucion': return '#3B82F6';
      case 'aprobado': return '#8B5CF6';
      case 'en-formulacion': return '#F59E0B';
      case 'vencido': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'completado': return 'Completado';
      case 'en-ejecucion': return 'En Ejecución';
      case 'aprobado': return 'Aprobado';
      case 'en-formulacion': return 'En Formulación';
      case 'vencido': return 'Vencido';
      default: return estado;
    }
  };

  const handleVerFormulacion = (plan: PlanMejoramiento) => {
    setPlanSeleccionado(plan);
    setVistaActiva('formulacion');
  };

  const handleVerSeguimiento = (plan: PlanMejoramiento) => {
    setPlanSeleccionado(plan);
    setVistaActiva('seguimiento');
  };

  const handleVolverALista = () => {
    setVistaActiva('lista');
    setPlanSeleccionado(null);
  };

  const handleNuevoPlan = () => {
    setPlanSeleccionado(null);
    setVistaActiva('formulacion');
  };

  // Si estamos en formulación, mostrar ese componente
  if (vistaActiva === 'formulacion') {
    return (
      <FormulacionPlan
        plan={planSeleccionado}
        onVolver={handleVolverALista}
      />
    );
  }

  // Si estamos en seguimiento, mostrar ese componente
  if (vistaActiva === 'seguimiento') {
    return (
      <SeguimientoTrimestral
        plan={planSeleccionado!}
        onVolver={handleVolverALista}
      />
    );
  }

  // Vista de lista
  return (
    <div className="space-y-6">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Planes"
          value={totalPlanes}
          icon={FileText}
          iconColor="#F97316"
          iconBgColor="#FFF7ED"
          trend={{ value: "Año 2024", icon: TrendingUp, isPositive: true }}
        />

        <MetricCard
          title="En Ejecución"
          value={enEjecucion}
          icon={Clock}
          iconColor="#3B82F6"
          iconBgColor="#EFF6FF"
          subtitle="Activos"
        />

        <MetricCard
          title="Completados"
          value={completados}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBgColor="#F0FDF4"
          trend={{ 
            value: `${Math.round((completados / totalPlanes) * 100)}% del total`, 
            icon: TrendingUp, 
            isPositive: true 
          }}
        />

        <MetricCard
          title="Cumplimiento Promedio"
          value={`${cumplimientoPromedio}%`}
          icon={Target}
          iconColor={cumplimientoPromedio >= 70 ? '#10B981' : cumplimientoPromedio >= 50 ? '#F59E0B' : '#EF4444'}
          iconBgColor={cumplimientoPromedio >= 70 ? '#F0FDF4' : cumplimientoPromedio >= 50 ? '#FEF3C7' : '#FEE2E2'}
          trend={{ 
            value: cumplimientoPromedio >= 70 ? 'Satisfactorio' : cumplimientoPromedio >= 50 ? 'Aceptable' : 'Requiere atención',
            icon: AlertCircle
          }}
        />
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <ToolbarActions
        searchPlaceholder="Buscar planes de mejoramiento..."
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        onFilter={() => toast.info('Filtros disponibles próximamente')}
        onExport={() => toast.success('Exportando planes...')}
        onAdd={handleNuevoPlan}
        addButtonText="Nuevo Plan"
        primaryColor="#F97316"
      />

      {/* ALERTAS DE SEGUIMIENTOS PRÓXIMOS */}
      {planes.filter(p => p.proximoSeguimiento && 
        new Date(p.proximoSeguimiento) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
        p.estado === 'en-ejecucion'
      ).length > 0 && (
        <motion.div
          className="p-4 rounded-xl border-2"
          style={{ background: '#FEF3C7', borderColor: '#FCD34D' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <div className="flex-1">
              <h4 className="font-bold mb-1" style={{ color: '#92400E' }}>
                Seguimientos Próximos (Próximos 7 días)
              </h4>
              <ul className="text-sm space-y-1" style={{ color: '#78350F' }}>
                {planes
                  .filter(p => p.proximoSeguimiento && 
                    new Date(p.proximoSeguimiento) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                    p.estado === 'en-ejecucion'
                  )
                  .map(plan => (
                    <li key={plan.id}>
                      • <span className="font-semibold">{plan.codigo}</span> - {plan.auditoria}
                      {' '}({new Date(plan.proximoSeguimiento!).toLocaleDateString('es-CO')})
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* TABLA DE PLANES */}
      <div className="rounded-2xl border-2 overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#F9FAFB' }}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>CÓDIGO</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>AUDITORÍA</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>TERRITORIAL</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>RESPONSABLE</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>ESTADO</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>ACCIONES</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>CUMPLIMIENTO</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>EFECTIVIDAD</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>SEGUIMIENTOS</th>
                <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {planes.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-t-2 hover:bg-orange-50 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-bold text-sm block" style={{ color: '#1F2937' }}>
                        {plan.codigo}
                      </span>
                      <span className="text-xs" style={{ color: '#6B7280' }}>
                        {plan.codigoAuditoria}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{plan.auditoria}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{plan.sede}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: '#6B7280' }}>{plan.territorial}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm" style={{ color: '#6B7280' }}>
                      <div className="font-semibold" style={{ color: '#1F2937' }}>{plan.responsableArea}</div>
                      <div className="text-xs">Formulado por: {plan.responsableFormulacion}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      style={{
                        background: `${getEstadoColor(plan.estado)}20`,
                        color: getEstadoColor(plan.estado)
                      }}
                    >
                      {getEstadoLabel(plan.estado)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="font-bold" style={{ color: '#1F2937' }}>
                        {plan.accionesImplementadas}/{plan.accionesTotal}
                      </span>
                      <span className="text-xs block" style={{ color: '#6B7280' }}>
                        {plan.hallazgosTotal} hallazgos
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ background: '#E5E7EB', maxWidth: '60px' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: getEstadoColor(plan.estado),
                            width: `${plan.porcentajeCumplimiento}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#6B7280' }}>
                        {plan.porcentajeCumplimiento}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ background: '#E5E7EB', maxWidth: '60px' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: '#10B981',
                            width: `${plan.porcentajeEfectividad}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#6B7280' }}>
                        {plan.porcentajeEfectividad}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="font-bold" style={{ color: '#1F2937' }}>
                        {plan.seguimientosRealizados}/{plan.seguimientosTotales}
                      </span>
                      {plan.proximoSeguimiento && (
                        <span className="text-xs block" style={{ color: '#6B7280' }}>
                          Próximo: {new Date(plan.proximoSeguimiento).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerFormulacion(plan)}
                        title="Ver/Editar Formulación"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerSeguimiento(plan)}
                        title="Ver Seguimiento"
                        disabled={plan.estado === 'en-formulacion'}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEYENDA DE INDICADORES */}
      <motion.div
        className="p-6 rounded-xl border-2"
        style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
          Indicadores del Formato EM-FO-002
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-semibold text-sm mb-2" style={{ color: '#4B5563' }}>
              Cumplimiento (Fórmula Excel)
            </h5>
            <div className="p-3 rounded-lg text-xs font-mono" style={{ background: '#FFFFFF', color: '#1F2937' }}>
              IF(implementadas &gt;= programadas, 2, IF(implementadas &gt;= 1, 1, 0))
            </div>
            <ul className="mt-2 text-xs space-y-1" style={{ color: '#6B7280' }}>
              <li>• <span className="font-semibold">2 puntos:</span> Todas las acciones implementadas</li>
              <li>• <span className="font-semibold">1 punto:</span> Al menos 1 acción implementada</li>
              <li>• <span className="font-semibold">0 puntos:</span> Ninguna acción implementada</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-sm mb-2" style={{ color: '#4B5563' }}>
              Efectividad (Fórmula Excel)
            </h5>
            <div className="p-3 rounded-lg text-xs font-mono" style={{ background: '#FFFFFF', color: '#1F2937' }}>
              IF(controles &lt;&gt; repeticion, 1, IF(controles=&quot;SI&quot;, 2, 0))
            </div>
            <ul className="mt-2 text-xs space-y-1" style={{ color: '#6B7280' }}>
              <li>• <span className="font-semibold">2 puntos:</span> Controles efectivos, no se repite</li>
              <li>• <span className="font-semibold">1 punto:</span> Controles parciales</li>
              <li>• <span className="font-semibold">0 puntos:</span> Hallazgo se repite</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}