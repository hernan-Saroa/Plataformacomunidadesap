/**
 * Componente de Gestión de Situaciones Administrativas - ESAP PTA
 * Vista principal para administrar situaciones administrativas de docentes
 * Implementa REQ-MOD-PTA-004 punto 6
 */

import React, { useState, useEffect } from 'react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import {
  AlertCircle,
  Calendar,
  FileText,
  Filter,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building2,
} from 'lucide-react';
import { situacionesAdministrativasService } from '../../services/situacionesAdministrativasService';
import {
  SituacionAdministrativa,
  AlertaSituacionAdministrativa,
  EstadoSituacion,
  TipoSituacionAdministrativa,
  LABELS_TIPO_SITUACION,
  LABELS_ESTADO_SITUACION,
  COLORES_ESTADO_SITUACION,
} from '../../types/situacionesAdministrativas';
import { ModalSituacionAdministrativa } from './ModalSituacionAdministrativa';
import { toast } from 'sonner@2.0.3';

interface GestionSituacionesAdministrativasProps {
  usuarioActual: {
    id: string;
    nombre: string;
    rol: string;
  };
  docenteSeleccionado?: {
    id: string;
    nombre: string;
    email: string;
    territorialId: string;
    territorialNombre: string;
  };
}

export const GestionSituacionesAdministrativas: React.FC<
  GestionSituacionesAdministrativasProps
> = ({ usuarioActual, docenteSeleccionado }) => {
  const [situaciones, setSituaciones] = useState<SituacionAdministrativa[]>([]);
  const [alertas, setAlertas] = useState<AlertaSituacionAdministrativa[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoSituacion | 'TODOS'>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<TipoSituacionAdministrativa | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [situacionDetalle, setSituacionDetalle] = useState<SituacionAdministrativa | null>(null);

  useEffect(() => {
    loadData();
  }, [docenteSeleccionado]);

  const loadData = () => {
    if (docenteSeleccionado) {
      // Filtrar por docente si hay uno seleccionado
      const sits = situacionesAdministrativasService.getSituacionesByDocente(
        docenteSeleccionado.id
      );
      setSituaciones(sits);
    } else {
      // Cargar todas las situaciones
      setSituaciones(situacionesAdministrativasService.getSituaciones());
    }

    // Cargar alertas no leídas
    const allAlertas = situacionesAdministrativasService.getAlertas();
    setAlertas(allAlertas.filter((a) => !a.leida));
  };

  const handleAprobar = (situacionId: string) => {
    const resultado = situacionesAdministrativasService.cambiarEstado(
      situacionId,
      'APROBADA',
      usuarioActual.nombre,
      'Situación aprobada por coordinador'
    );

    if (resultado) {
      toast.success('Situación aprobada exitosamente');
      loadData();
    } else {
      toast.error('Error al aprobar la situación');
    }
  };

  const handleRechazar = (situacionId: string) => {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (!motivo) return;

    const resultado = situacionesAdministrativasService.cambiarEstado(
      situacionId,
      'RECHAZADA',
      usuarioActual.nombre,
      motivo
    );

    if (resultado) {
      toast.success('Situación rechazada');
      loadData();
    } else {
      toast.error('Error al rechazar la situación');
    }
  };

  const handleActivar = (situacionId: string) => {
    const resultado = situacionesAdministrativasService.cambiarEstado(
      situacionId,
      'ACTIVA',
      usuarioActual.nombre,
      'Situación activada'
    );

    if (resultado) {
      toast.success('Situación activada');
      loadData();
    } else {
      toast.error('Error al activar la situación');
    }
  };

  const handleGenerarReporte = () => {
    const reporte = situacionesAdministrativasService.generarReporteTalentoHumano(
      '2025-1',
      usuarioActual.nombre
    );

    toast.success('Reporte generado exitosamente', {
      description: `${reporte.situaciones.length} situaciones incluidas`,
    });

    // En producción, esto descargaría un PDF o Excel
    console.log('Reporte generado:', reporte);
  };

  // Filtrar situaciones
  const situacionesFiltradas = situaciones.filter((s) => {
    const matchEstado = filtroEstado === 'TODOS' || s.estado === filtroEstado;
    const matchTipo = filtroTipo === 'TODOS' || s.tipo === filtroTipo;
    const matchBusqueda =
      !busqueda ||
      s.docenteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.descripcion.toLowerCase().includes(busqueda.toLowerCase());

    return matchEstado && matchTipo && matchBusqueda;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getBadgeColor = (estado: EstadoSituacion) => {
    const colorMap: Record<EstadoSituacion, any> = {
      SOLICITADA: 'default',
      EN_REVISION: 'default',
      APROBADA: 'success',
      RECHAZADA: 'danger',
      ACTIVA: 'warning',
      FINALIZADA: 'default',
      CANCELADA: 'default',
    };
    return colorMap[estado] || 'default';
  };

  const getImpactoColor = (impacto: string) => {
    if (impacto === 'TOTAL') return 'text-red-600 bg-red-50';
    if (impacto === 'PARCIAL') return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const getImpactoLabel = (impacto: string) => {
    if (impacto === 'TOTAL') return 'Total';
    if (impacto === 'PARCIAL') return 'Parcial';
    return 'Ninguno';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-slate-900">Situaciones Administrativas Docentes</h1>
          <p className="text-slate-600 mt-1">
            Gestión de años sabáticos, comisiones, licencias y permisos
          </p>
        </div>
        <div className="flex gap-3">
          <ButtonSIGL variant="secondary" onClick={handleGenerarReporte} icon={Download}>
            Reporte Talento Humano
          </ButtonSIGL>
          {docenteSeleccionado && (
            <ButtonSIGL onClick={() => setShowModal(true)} icon={Plus}>
              Nueva Situación
            </ButtonSIGL>
          )}
        </div>
      </div>

      {/* Alertas Urgentes */}
      {alertas.length > 0 && (
        <CardSIGL>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-slate-900">Alertas Urgentes</h2>
            <BadgeSIGL variant="danger" size="sm">
              {alertas.length}
            </BadgeSIGL>
          </div>

          <div className="space-y-2">
            {alertas.slice(0, 3).map((alerta) => (
              <div
                key={alerta.id}
                className={`p-4 rounded-lg border-2 ${
                  alerta.nivelUrgencia === 'ALTA'
                    ? 'border-red-200 bg-red-50'
                    : alerta.nivelUrgencia === 'MEDIA'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-slate-900">{alerta.docenteNombre}</span>
                      <BadgeSIGL
                        variant={alerta.nivelUrgencia === 'ALTA' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {alerta.nivelUrgencia}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-slate-700">{alerta.mensaje}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(alerta.fechaGeneracion)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      situacionesAdministrativasService.marcarAlertaLeida(alerta.id);
                      loadData();
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Marcar leída
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardSIGL>
      )}

      {/* Filtros */}
      <CardSIGL>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Buscar */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Buscar Docente</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o descripción..."
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
            />
          </div>

          {/* Filtro Estado */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoSituacion | 'TODOS')}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
            >
              <option value="TODOS">Todos los estados</option>
              {Object.entries(LABELS_ESTADO_SITUACION).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) =>
                setFiltroTipo(e.target.value as TipoSituacionAdministrativa | 'TODOS')
              }
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
            >
              <option value="TODOS">Todos los tipos</option>
              {Object.entries(LABELS_TIPO_SITUACION).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardSIGL>

      {/* Lista de Situaciones */}
      <CardSIGL>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900">
            Situaciones Registradas ({situacionesFiltradas.length})
          </h2>
        </div>

        <div className="space-y-3">
          {situacionesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hay situaciones administrativas registradas</p>
              {docenteSeleccionado && (
                <ButtonSIGL
                  onClick={() => setShowModal(true)}
                  icon={Plus}
                  className="mt-4"
                  size="sm"
                >
                  Registrar Primera Situación
                </ButtonSIGL>
              )}
            </div>
          ) : (
            situacionesFiltradas.map((situacion) => (
              <div
                key={situacion.id}
                className="p-4 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-4 h-4 text-slate-600" />
                      <span className="text-slate-900">{situacion.docenteNombre}</span>
                      <BadgeSIGL variant={getBadgeColor(situacion.estado)} size="sm">
                        {LABELS_ESTADO_SITUACION[situacion.estado]}
                      </BadgeSIGL>
                      <BadgeSIGL variant="default" size="sm">
                        {LABELS_TIPO_SITUACION[situacion.tipo]}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{situacion.descripcion}</p>
                    <div className="flex items-center gap-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(situacion.fechaInicio)} - {formatDate(situacion.fechaFin)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {situacion.duracionDias} días
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {situacion.territorialNombre}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`px-3 py-1 rounded-lg text-xs ${getImpactoColor(
                        situacion.impactoDisponibilidad
                      )}`}
                    >
                      Impacto: {getImpactoLabel(situacion.impactoDisponibilidad)} (
                      {situacion.porcentajeDisponibilidad}%)
                    </div>

                    {/* Acciones según estado */}
                    {situacion.estado === 'SOLICITADA' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAprobar(situacion.id)}
                          className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRechazar(situacion.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                          title="Rechazar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {situacion.estado === 'APROBADA' && (
                      <button
                        onClick={() => handleActivar(situacion.id)}
                        className="text-xs px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                      >
                        Activar
                      </button>
                    )}
                  </div>
                </div>

                {/* Componentes Afectados */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                  <span className="text-xs text-slate-600">Afecta:</span>
                  {situacion.afectaDocencia && (
                    <BadgeSIGL variant="default" size="sm">
                      Docencia
                    </BadgeSIGL>
                  )}
                  {situacion.afectaInvestigacion && (
                    <BadgeSIGL variant="default" size="sm">
                      Investigación
                    </BadgeSIGL>
                  )}
                  {situacion.afectaExtension && (
                    <BadgeSIGL variant="default" size="sm">
                      Extensión
                    </BadgeSIGL>
                  )}
                  {situacion.afectaAdministrativo && (
                    <BadgeSIGL variant="default" size="sm">
                      Administrativo
                    </BadgeSIGL>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardSIGL>

      {/* Modal Nueva Situación */}
      {showModal && docenteSeleccionado && (
        <ModalSituacionAdministrativa
          docenteId={docenteSeleccionado.id}
          docenteNombre={docenteSeleccionado.nombre}
          docenteEmail={docenteSeleccionado.email}
          territorialId={docenteSeleccionado.territorialId}
          territorialNombre={docenteSeleccionado.territorialNombre}
          usuarioActual={usuarioActual}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
