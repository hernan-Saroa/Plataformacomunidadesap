/**
 * COMPONENTE: SELECCIÓN DE AUDITORÍA PARA PLAN DE MEJORAMIENTO
 * 
 * Vista inicial del módulo de Planes de Mejoramiento que muestra:
 * - Auditorías finalizadas con hallazgos que requieren plan
 * - Estado de cada plan (sin plan, en formulación, aprobado, etc.)
 * - Botón para crear/continuar plan
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle, Calendar, Clock, FileText, Plus, Eye,
  AlertCircle, CheckCircle2, Clock3, Send, Target, ChevronRight
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan } from './IntegracionAuditoriasPlanesContext';

interface Props {
  onSeleccionarAuditoria: (auditoria: AuditoriaParaPlan) => void;
}

export function SeleccionAuditoriaParaPlan({ onSeleccionarAuditoria }: Props) {
  const { auditoriasConHallazgos } = useIntegracionAuditoriaPlanes();

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | AuditoriaParaPlan['estadoPlan']>('TODOS');

  const auditoriasFiltradas = auditoriasConHallazgos.filter((aud) => {
    if (filtroEstado === 'TODOS') return true;
    return aud.estadoPlan === filtroEstado;
  });

  // Estadísticas
  const stats = {
    total: auditoriasConHallazgos.length,
    sinPlan: auditoriasConHallazgos.filter((a) => a.estadoPlan === 'SIN_PLAN').length,
    enFormulacion: auditoriasConHallazgos.filter((a) => a.estadoPlan === 'EN_FORMULACION').length,
    enSeguimiento: auditoriasConHallazgos.filter((a) => a.estadoPlan === 'EN_SEGUIMIENTO').length,
    completados: auditoriasConHallazgos.filter((a) => a.estadoPlan === 'COMPLETADO').length,
  };

  const getEstadoConfig = (estado?: AuditoriaParaPlan['estadoPlan']) => {
    switch (estado) {
      case 'SIN_PLAN':
        return {
          label: 'Sin Plan',
          color: '#DC2626',
          bgColor: '#FEE2E2',
          icon: <AlertCircle className="w-4 h-4" />,
        };
      case 'EN_FORMULACION':
        return {
          label: 'En Formulación',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: <Clock3 className="w-4 h-4" />,
        };
      case 'ENVIADO':
        return {
          label: 'Enviado',
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          icon: <Send className="w-4 h-4" />,
        };
      case 'APROBADO':
        return {
          label: 'Aprobado',
          color: '#10B981',
          bgColor: '#D1FAE5',
          icon: <CheckCircle2 className="w-4 h-4" />,
        };
      case 'EN_SEGUIMIENTO':
        return {
          label: 'En Seguimiento',
          color: '#6366F1',
          bgColor: '#E0E7FF',
          icon: <Target className="w-4 h-4" />,
        };
      case 'COMPLETADO':
        return {
          label: 'Completado',
          color: '#059669',
          bgColor: '#D1FAE5',
          icon: <CheckCircle2 className="w-4 h-4" />,
        };
      default:
        return {
          label: 'Sin Plan',
          color: '#DC2626',
          bgColor: '#FEE2E2',
          icon: <AlertCircle className="w-4 h-4" />,
        };
    }
  };

  const getGravedadConfig = (gravedad: 'LEVE' | 'MODERADO' | 'GRAVE') => {
    switch (gravedad) {
      case 'GRAVE':
        return { label: 'Grave', color: '#DC2626', bgColor: '#FEE2E2' };
      case 'MODERADO':
        return { label: 'Moderado', color: '#F59E0B', bgColor: '#FEF3C7' };
      case 'LEVE':
        return { label: 'Leve', color: '#10B981', bgColor: '#D1FAE5' };
    }
  };

  const calcularDiasRestantes = (fechaLimite: string) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    const diff = limite.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={() => setFiltroEstado('TODOS')}
        >
          <CardSIGL className={`p-4 ${filtroEstado === 'TODOS' ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="text-sm text-gray-600 mb-1">Total Auditorías</div>
            <div className="text-2xl text-gray-900">{stats.total}</div>
          </CardSIGL>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={() => setFiltroEstado('SIN_PLAN')}
        >
          <CardSIGL className={`p-4 ${filtroEstado === 'SIN_PLAN' ? 'ring-2 ring-red-500' : ''}`}>
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Sin Plan
            </div>
            <div className="text-2xl text-red-600">{stats.sinPlan}</div>
          </CardSIGL>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={() => setFiltroEstado('EN_FORMULACION')}
        >
          <CardSIGL className={`p-4 ${filtroEstado === 'EN_FORMULACION' ? 'ring-2 ring-yellow-500' : ''}`}>
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-yellow-600" />
              En Formulación
            </div>
            <div className="text-2xl text-yellow-600">{stats.enFormulacion}</div>
          </CardSIGL>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={() => setFiltroEstado('EN_SEGUIMIENTO')}
        >
          <CardSIGL className={`p-4 ${filtroEstado === 'EN_SEGUIMIENTO' ? 'ring-2 ring-indigo-500' : ''}`}>
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              En Seguimiento
            </div>
            <div className="text-2xl text-indigo-600">{stats.enSeguimiento}</div>
          </CardSIGL>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={() => setFiltroEstado('COMPLETADO')}
        >
          <CardSIGL className={`p-4 ${filtroEstado === 'COMPLETADO' ? 'ring-2 ring-green-600' : ''}`}>
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Completados
            </div>
            <div className="text-2xl text-green-600">{stats.completados}</div>
          </CardSIGL>
        </motion.div>
      </div>

      {/* Lista de Auditorías */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-gray-900">
            Auditorías que Requieren Plan de Mejoramiento
          </h3>
          <div className="text-sm text-gray-600">
            {auditoriasFiltradas.length} de {stats.total} auditorías
          </div>
        </div>

        {auditoriasFiltradas.length === 0 ? (
          <CardSIGL className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filtroEstado === 'TODOS'
                ? 'No hay auditorías finalizadas con hallazgos'
                : `No hay auditorías con estado "${getEstadoConfig(filtroEstado).label}"`}
            </p>
          </CardSIGL>
        ) : (
          auditoriasFiltradas.map((auditoria) => {
            const estadoConfig = getEstadoConfig(auditoria.estadoPlan);
            const diasRestantes = auditoria.fechaLimitePlan
              ? calcularDiasRestantes(auditoria.fechaLimitePlan)
              : null;
            const urgente = diasRestantes !== null && diasRestantes <= 7;

            // Contar hallazgos por gravedad
            const hallazgosGraves = auditoria.hallazgos.filter((h) => h.gravedad === 'GRAVE').length;
            const hallazgosModerados = auditoria.hallazgos.filter((h) => h.gravedad === 'MODERADO').length;
            const hallazgosLeves = auditoria.hallazgos.filter((h) => h.gravedad === 'LEVE').length;

            return (
              <motion.div
                key={auditoria.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <CardSIGL
                  className={`p-6 ${urgente && auditoria.estadoPlan === 'SIN_PLAN' ? 'ring-2 ring-red-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Información Principal */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-600">{auditoria.codigo}</span>
                            <div
                              className="px-2 py-1 rounded text-xs flex items-center gap-1"
                              style={{
                                backgroundColor: estadoConfig.bgColor,
                                color: estadoConfig.color,
                              }}
                            >
                              {estadoConfig.icon}
                              {estadoConfig.label}
                            </div>
                          </div>
                          <h4 className="text-base text-gray-900 mb-1">{auditoria.nombre}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{auditoria.areaResponsable}</span>
                            <span>•</span>
                            <span>{auditoria.responsable}</span>
                          </div>
                        </div>
                      </div>

                      {/* Hallazgos */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Hallazgos:</span>
                        {hallazgosGraves > 0 && (
                          <BadgeSIGL
                            variant="custom"
                            className="text-xs"
                            style={{
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                            }}
                          >
                            {hallazgosGraves} Graves
                          </BadgeSIGL>
                        )}
                        {hallazgosModerados > 0 && (
                          <BadgeSIGL
                            variant="custom"
                            className="text-xs"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#F59E0B',
                            }}
                          >
                            {hallazgosModerados} Moderados
                          </BadgeSIGL>
                        )}
                        {hallazgosLeves > 0 && (
                          <BadgeSIGL
                            variant="custom"
                            className="text-xs"
                            style={{
                              backgroundColor: '#D1FAE5',
                              color: '#10B981',
                            }}
                          >
                            {hallazgosLeves} Leves
                          </BadgeSIGL>
                        )}
                      </div>

                      {/* Fechas */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          Finalizada: {auditoria.fechaFinalizacion}
                        </div>
                        {auditoria.fechaLimitePlan && (
                          <div
                            className={`flex items-center gap-2 ${urgente ? 'text-red-600' : 'text-gray-600'}`}
                          >
                            <Clock className="w-4 h-4" />
                            Plazo plan: {auditoria.fechaLimitePlan}
                            {urgente && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                ¡{diasRestantes} días!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acción */}
                    <div className="flex flex-col gap-2">
                      {auditoria.estadoPlan === 'SIN_PLAN' ? (
                        <ButtonSIGL
                          variant="default"
                          onClick={() => onSeleccionarAuditoria(auditoria)}
                          className="gap-2"
                          style={{ backgroundColor: '#DC2626' }}
                        >
                          <Plus className="w-4 h-4" />
                          Crear Plan
                        </ButtonSIGL>
                      ) : (
                        <ButtonSIGL
                          variant="outline"
                          onClick={() => onSeleccionarAuditoria(auditoria)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Plan
                        </ButtonSIGL>
                      )}
                    </div>
                  </div>
                </CardSIGL>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}