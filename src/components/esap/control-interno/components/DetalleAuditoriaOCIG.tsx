/**
 * ═════════════════════════════════════════════════════════════════════════
 * DETALLE DE AUDITORÍA - OCIG
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Vista completa de una auditoría con tabs por sección
 * Basado en especificaciones de PROMPT_FIGMA_OCIG_COMPLETO.md
 * 
 * Tabs:
 * - General: Información básica
 * - Equipo: Miembros del equipo
 * - Cronograma: Fechas y actividades
 * - Hallazgos: Hallazgos encontrados
 * - Papeles de Trabajo: Documentos
 * - Informes: Informes generados
 * 
 * @version 1.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Users,
  Calendar,
  AlertTriangle,
  FolderOpen,
  FileCheck,
  Edit,
  Save,
  X,
  Download,
  Upload,
  Plus,
} from 'lucide-react';
import { TabsOCIG, type Tab } from './TabsOCIG';
import { GestionEquipo, type MiembroEquipo } from './GestionEquipo';
import { TimelineActividades, type ActividadTimeline } from './TimelineActividades';
import { ESAP_CLASSES, type EstadoKanban } from '../utils/esapThemeOCIG';
import { toast } from 'sonner@2.0.3';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface DetalleAuditoriaData {
  id: string;
  codigo: string;
  nombre: string;
  proceso: string;
  tipo: string;
  vigencia: string;
  estado?: EstadoKanban;
  estadoKanban?: EstadoKanban;  // Campo del backend
  progreso: number;
  objetivo?: string;
  alcance?: string;
  criterios?: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  equipo: MiembroEquipo[];
  hallazgos?: number;
  papelesTrabajo?: number;
  informes?: number;
}

interface DetalleAuditoriaOCIGProps {
  auditoria: DetalleAuditoriaData;
  onVolver: () => void;
  onActualizar?: (data: Partial<DetalleAuditoriaData>) => void;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO
// ═════════════════════════════════════════════════════════════════════════

const ACTIVIDADES_EJEMPLO: ActividadTimeline[] = [
  {
    id: 'a1',
    tipo: 'creacion',
    titulo: 'Auditoría creada',
    descripcion: 'Se creó la auditoría en el sistema',
    usuario: 'Mario Bernal',
    fecha: '2025-01-15T10:00:00',
  },
  {
    id: 'a2',
    tipo: 'asignacion',
    titulo: 'Equipo asignado',
    descripcion: 'Se asignó el equipo de auditoría',
    usuario: 'Mario Bernal',
    fecha: '2025-01-15T14:30:00',
  },
  {
    id: 'a3',
    tipo: 'cambio_estado',
    titulo: 'Estado cambiado a Ejecución',
    descripcion: 'La auditoría pasó a fase de ejecución',
    usuario: 'Catalina Rubio',
    fecha: '2025-01-20T09:00:00',
  },
  {
    id: 'a4',
    tipo: 'adjunto',
    titulo: 'Documento adjunto',
    descripcion: 'Se adjuntó el plan de trabajo',
    usuario: 'Catalina Rubio',
    fecha: '2025-01-22T11:30:00',
  },
];

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function DetalleAuditoriaOCIG({
  auditoria,
  onVolver,
  onActualizar,
  className = '',
}: DetalleAuditoriaOCIGProps) {
  
  const [tabActivo, setTabActivo] = useState('general');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEditados, setDatosEditados] = useState(auditoria);

  const handleGuardar = () => {
    if (onActualizar) {
      onActualizar(datosEditados);
      toast.success('Auditoría actualizada', {
        description: 'Los cambios se guardaron correctamente',
        duration: 2000,
      });
    }
    setModoEdicion(false);
  };

  const handleCancelar = () => {
    setDatosEditados(auditoria);
    setModoEdicion(false);
  };

  // Configurar tabs
  // El tab de Hallazgos solo se muestra si la auditoría NO está en Planeación
  // Según regla de negocio: Hallazgos se identifican en Ejecución y se formalizan en Comunicación
  const estadoActual = auditoria.estadoKanban || auditoria.estado || '';
  const estadoNormalizado = estadoActual.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mostrarTabHallazgos = estadoNormalizado !== 'planeacion' && estadoNormalizado !== 'backlog';
  
  const tabs: Tab[] = [
    {
      id: 'general',
      label: 'General',
      icon: FileText,
      content: (
        <TabGeneral
          auditoria={datosEditados}
          modoEdicion={modoEdicion}
          onChange={setDatosEditados}
        />
      ),
    },
    {
      id: 'equipo',
      label: 'Equipo',
      icon: Users,
      badge: auditoria.equipo.length,
      content: (
        <TabEquipo
          equipo={auditoria.equipo}
          soloLectura={!modoEdicion}
        />
      ),
    },
    {
      id: 'cronograma',
      label: 'Cronograma',
      icon: Calendar,
      content: (
        <TabCronograma
          fechaInicio={auditoria.fechaInicio}
          fechaFin={auditoria.fechaFin}
          actividades={ACTIVIDADES_EJEMPLO}
        />
      ),
    },
    // Tab de Hallazgos solo visible a partir de Ejecución
    ...(mostrarTabHallazgos ? [{
      id: 'hallazgos',
      label: 'Hallazgos',
      icon: AlertTriangle,
      badge: auditoria.hallazgos || 0,
      content: <TabHallazgos />,
    }] : []),
    {
      id: 'papeles',
      label: 'Papeles Trabajo',
      icon: FolderOpen,
      badge: auditoria.papelesTrabajo || 0,
      content: <TabPapelesTrabajo />,
    },
    {
      id: 'informes',
      label: 'Informes',
      icon: FileCheck,
      badge: auditoria.informes || 0,
      content: <TabInformes />,
    },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* HEADER FIJO */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-8 py-4">
          {/* Botón Volver */}
          <button
            onClick={onVolver}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2874A6] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Kanban
          </button>

          {/* Info Principal */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-lg font-semibold text-[#1B4F72]">
                  {auditoria.codigo}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#E8F4F8] text-[#1B4F72]">
                  {auditoria.estado}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {auditoria.nombre}
              </h1>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Proceso: <strong>{auditoria.proceso}</strong></span>
                <span>•</span>
                <span>Tipo: <strong>{auditoria.tipo}</strong></span>
                <span>•</span>
                <span>Vigencia: <strong>{auditoria.vigencia}</strong></span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              {modoEdicion ? (
                <>
                  <button
                    onClick={handleCancelar}
                    className={ESAP_CLASSES.button.ghost}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    className={ESAP_CLASSES.button.primary}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModoEdicion(true)}
                  className={ESAP_CLASSES.button.primary}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </button>
              )}
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Progreso General
              </span>
              <span className="text-sm font-bold text-[#2874A6]">
                {auditoria.progreso}% completado
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2874A6] to-[#2E86AB] transition-all duration-500"
                style={{ width: `${auditoria.progreso}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <TabsOCIG
        tabs={tabs}
        activeTab={tabActivo}
        onTabChange={setTabActivo}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB: GENERAL
// ═════════════════════════════════════════════════════════════════════════

interface TabGeneralProps {
  auditoria: DetalleAuditoriaData;
  modoEdicion: boolean;
  onChange: (data: DetalleAuditoriaData) => void;
}

function TabGeneral({ auditoria, modoEdicion, onChange }: TabGeneralProps) {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Información General
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Objetivo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objetivo
            </label>
            {modoEdicion ? (
              <textarea
                value={auditoria.objetivo || ''}
                onChange={(e) => onChange({ ...auditoria, objetivo: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2874A6] focus:border-transparent"
                placeholder="Describe el objetivo de la auditoría..."
              />
            ) : (
              <p className="text-gray-600 text-sm">
                {auditoria.objetivo || 'No definido'}
              </p>
            )}
          </div>

          {/* Alcance */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alcance
            </label>
            {modoEdicion ? (
              <textarea
                value={auditoria.alcance || ''}
                onChange={(e) => onChange({ ...auditoria, alcance: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2874A6] focus:border-transparent"
                placeholder="Define el alcance de la auditoría..."
              />
            ) : (
              <p className="text-gray-600 text-sm">
                {auditoria.alcance || 'No definido'}
              </p>
            )}
          </div>

          {/* Criterios */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Criterios de Auditoría
            </label>
            {modoEdicion ? (
              <textarea
                value={auditoria.criterios || ''}
                onChange={(e) => onChange({ ...auditoria, criterios: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2874A6] focus:border-transparent"
                placeholder="Especifica los criterios de auditoría..."
              />
            ) : (
              <p className="text-gray-600 text-sm">
                {auditoria.criterios || 'No definido'}
              </p>
            )}
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable
            </label>
            <p className="text-gray-900 font-semibold text-sm">
              {auditoria.responsable}
            </p>
          </div>

          {/* Fechas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodo
            </label>
            <p className="text-gray-900 text-sm">
              {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')} - {new Date(auditoria.fechaFin).toLocaleDateString('es-CO')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB: EQUIPO
// ═════════════════════════════════════════════════════════════════════════

interface TabEquipoProps {
  equipo: MiembroEquipo[];
  soloLectura: boolean;
}

function TabEquipo({ equipo, soloLectura }: TabEquipoProps) {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6">
      <GestionEquipo
        miembros={equipo}
        onAgregar={() => toast.info('Agregar miembro al equipo')}
        onRemover={(id) => console.log('Remover miembro:', id)}
        onEditar={(id) => console.log('Editar miembro:', id)}
        soloLectura={soloLectura}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB: CRONOGRAMA
// ═════════════════════════════════════════════════════════════════════════

interface TabCronogramaProps {
  fechaInicio: string;
  fechaFin: string;
  actividades: ActividadTimeline[];
}

function TabCronograma({ fechaInicio, fechaFin, actividades }: TabCronogramaProps) {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Timeline de Actividades
        </h3>
        <TimelineActividades actividades={actividades} maxItems={10} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB: HALLAZGOS (Placeholder)
// ═════════════════════════════════════════════════════════════════════════

function TabHallazgos() {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6">
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Gestión de Hallazgos
        </h3>
        <p className="text-gray-600 mb-4">
          Módulo de hallazgos en desarrollo
        </p>
        <button className={ESAP_CLASSES.button.primary}>
          <Plus className="w-4 h-4 inline mr-2" />
          Agregar Hallazgo
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB: PAPELES DE TRABAJO (Placeholder)
// ═════════════════════════════════════════════════════════════════════════

function TabPapelesTrabajo() {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Papeles de Trabajo
          </h3>
          <button className={ESAP_CLASSES.button.primary}>
            <Upload className="w-4 h-4 inline mr-2" />
            Cargar Documento
          </button>
        </div>

        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No hay documentos cargados
          </p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB: INFORMES (Placeholder)
// ═════════════════════════════════════════════════════════════════════════

function TabInformes() {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Informes Generados
          </h3>
          <button className={ESAP_CLASSES.button.primary}>
            <Plus className="w-4 h-4 inline mr-2" />
            Generar Informe
          </button>
        </div>

        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FileCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No hay informes generados
          </p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default DetalleAuditoriaOCIG;
