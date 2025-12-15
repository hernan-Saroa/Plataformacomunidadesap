/**
 * RF003 - PROGRAMA ANUAL DE AUDITORÍAS
 * Integración Fase 2 COMPLETA: Contexto global + Notificaciones automáticas
 * Componente para importar auditorías del Universo, asignar equipos, 
 * programar fechas y generar el calendario anual oficial
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Users,
  Clock,
  Plus,
  Download,
  FileText,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  Save,
  Upload,
  MapPin,
  Building2,
  TrendingUp,
  BarChart3,
  History
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MetricCard } from '../shared/MetricCard';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';
import { COLORES_ESAP } from './utils/constantes';
import { GanttChartView } from './GanttChartView';
import { ModalImportarUniverso } from './ModalImportarUniverso';
import { MOCK_UNIVERSO_AUDITORIAS } from './data/mockUniversoAuditorias';
import { PanelExportacion } from './PanelExportacion';
import { ModalAmpliacionPlazo, AmpliacionPlazo, AuditoriaProgramadaConAmpliaciones } from './ModalAmpliacionPlazo';
import { ModalHistorialCambios, HistorialCambio } from './ModalHistorialCambios';

// ============ INTEGRACIÓN FASE 2 ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

// ============ TIPOS ============

interface AuditoriaProgramada {
  id: string;
  codigo: string;
  procesoAuditable: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  
  // Asignación
  auditorLider?: string;
  equipoAuditor?: string[];
  
  // Programación de fechas por etapa
  fechas: {
    planeacion: {
      inicio: string;
      fin: string;
      duracionDias: number;
    };
    ejecucion: {
      inicio: string;
      fin: string;
      duracionDias: number;
    };
    comunicacion: {
      inicio: string;
      fin: string;
      duracionDias: number;
    };
  };
  
  estado: 'Programada' | 'En Ejecución' | 'Completada' | 'Cancelada';
  observaciones: string;
}

interface ProgramaAnual {
  añoFiscal: number;
  version: string;
  fechaCreacion: string;
  responsable: string;
  estado: 'borrador' | 'aprobado' | 'vigente';
  auditorias: AuditoriaProgramada[];
}

// ============ CONSTANTES ============

const AUDITORES_DISPONIBLES = [
  'Mario Oswaldo Bernal Rodriguez',
  'Catalina Rubio',
  'Nubia Pimiento',
  'Sandra Montero',
  'Fernando Ávila',
  'William Ramírez',
  'Lucila Villamil',
  'Alexandra Triviño',
  'Natalia Cañon',
  'Flor Mireya Murcia'
];

const DURACIONES_DEFAULT = {
  sedesPrincipal: {
    planeacion: 15,
    ejecucion: 30,
    comunicacion: 15
  },
  territorial: {
    planeacion: 10,
    ejecucion: 4, // 4 días según requerimientos
    comunicacion: 10
  }
};

// ============ MOCK DATA ============

const MOCK_PROGRAMA: ProgramaAnual = {
  añoFiscal: 2025,
  version: '1.0',
  fechaCreacion: '2024-12-01',
  responsable: 'Mario Oswaldo Bernal Rodriguez',
  estado: 'vigente',
  auditorias: [
    {
      id: '1',
      codigo: 'AUD-2025-001',
      procesoAuditable: 'Gestión Financiera',
      tipoProceso: 'Apoyo',
      tipoSede: 'Sede Principal',
      nivelRiesgo: 'CRÍTICO',
      añoPriorizacion: 'Año 1',
      auditorLider: 'Mario Oswaldo Bernal Rodriguez',
      equipoAuditor: ['Catalina Rubio', 'Sandra Montero'],
      fechas: {
        planeacion: { inicio: '2025-01-15', fin: '2025-01-30', duracionDias: 15 },
        ejecucion: { inicio: '2025-02-01', fin: '2025-03-01', duracionDias: 30 },
        comunicacion: { inicio: '2025-03-03', fin: '2025-03-18', duracionDias: 15 }
      },
      estado: 'Programada',
      observaciones: ''
    },
    {
      id: '2',
      codigo: 'AUD-2025-002',
      procesoAuditable: 'Gestión Contractual',
      tipoProceso: 'Apoyo',
      tipoSede: 'Sede Principal',
      nivelRiesgo: 'ALTO',
      añoPriorizacion: 'Año 1',
      auditorLider: 'Fernando Ávila',
      equipoAuditor: ['William Ramírez', 'Lucila Villamil'],
      fechas: {
        planeacion: { inicio: '2025-04-01', fin: '2025-04-16', duracionDias: 15 },
        ejecucion: { inicio: '2025-04-17', fin: '2025-05-17', duracionDias: 30 },
        comunicacion: { inicio: '2025-05-19', fin: '2025-06-03', duracionDias: 15 }
      },
      estado: 'Programada',
      observaciones: ''
    },
    {
      id: '3',
      codigo: 'AUD-2025-003',
      procesoAuditable: 'Territorial Antioquia',
      tipoProceso: 'Misional',
      tipoSede: 'Territorial',
      territorial: 'Antioquia',
      nivelRiesgo: 'MEDIO',
      añoPriorizacion: 'Año 1',
      auditorLider: 'Alexandra Triviño',
      equipoAuditor: ['Natalia Cañon', 'Flor Mireya Murcia'],
      fechas: {
        planeacion: { inicio: '2025-06-15', fin: '2025-06-25', duracionDias: 10 },
        ejecucion: { inicio: '2025-06-26', fin: '2025-06-30', duracionDias: 4 },
        comunicacion: { inicio: '2025-07-01', fin: '2025-07-11', duracionDias: 10 }
      },
      estado: 'Programada',
      observaciones: 'Visita presencial corta'
    }
  ]
};

// ============ COMPONENTE PRINCIPAL ============

export function ProgramaAnualAuditorias() {
  const [programa, setPrograma] = useState<ProgramaAnual>(MOCK_PROGRAMA);
  const [vistaActiva, setVistaActiva] = useState<'calendario' | 'tabla'>('tabla');
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [mostrarPanelExportacion, setMostrarPanelExportacion] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaProgramada | null>(null);
  const [busqueda, setBusqueda] = useState('');
  
  // NUEVOS ESTADOS para ampliación e historial
  const [mostrarModalAmpliacion, setMostrarModalAmpliacion] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [ampliaciones, setAmpliaciones] = useState<Record<string, AmpliacionPlazo[]>>({});
  const [historialCambios, setHistorialCambios] = useState<Record<string, HistorialCambio[]>>({});
  
  // Usuario actual simulado (debería venir del contexto de autenticación)
  const usuarioActual = {
    nombre: 'Mario Oswaldo Bernal Rodriguez',
    rol: 'Jefe' as const  // 'Admin' | 'Jefe' | 'Auditor' | 'Consulta'
  };

  // ============ INTEGRACIÓN FASE 2 ============

  const { notificarCambio } = useIntegracionControlInterno();

  // ============ MÉTRICAS ============

  const metricas = {
    totalAuditorias: programa.auditorias.length,
    programadas: programa.auditorias.filter(a => a.estado === 'Programada').length,
    enEjecucion: programa.auditorias.filter(a => a.estado === 'En Ejecución').length,
    completadas: programa.auditorias.filter(a => a.estado === 'Completada').length,
    auditoriasCriticas: programa.auditorias.filter(a => a.nivelRiesgo === 'CRÍTICO').length,
    auditoriasAlto: programa.auditorias.filter(a => a.nivelRiesgo === 'ALTO').length
  };

  // ============ HANDLERS ============

  const handleExportarPrograma = () => {
    toast.success('Generando documento del Programa Anual...');
    // Aquí iría la lógica de exportación
  };

  const handleImportarDesdeUniverso = () => {
    setMostrarModalImportar(true);
  };

  const handleEliminarAuditoria = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta auditoría del programa?')) {
      setPrograma(prev => ({
        ...prev,
        auditorias: prev.auditorias.filter(a => a.id !== id)
      }));
      toast.success('Auditoría eliminada del programa');
    }
  };

  // NUEVO: Handler para aprobar ampliación
  const handleAprobarAmpliacion = (ampliacion: AmpliacionPlazo) => {
    // Actualizar fechas de la etapa afectada
    setPrograma(prev => ({
      ...prev,
      auditorias: prev.auditorias.map(a => {
        if (a.id === ampliacion.auditoriaId) {
          return {
            ...a,
            fechas: {
              ...a.fechas,
              [ampliacion.etapaAfectada]: {
                ...a.fechas[ampliacion.etapaAfectada],
                fin: ampliacion.nuevaFechaLimite,
                duracionDias: a.fechas[ampliacion.etapaAfectada].duracionDias + ampliacion.diasAmpliados
              }
            }
          };
        }
        return a;
      })
    }));

    // Guardar ampliación en el registro
    setAmpliaciones(prev => ({
      ...prev,
      [ampliacion.auditoriaId]: [
        ...(prev[ampliacion.auditoriaId] || []),
        ampliacion
      ]
    }));

    // Registrar en historial
    const cambio: HistorialCambio = {
      id: `hist-${Date.now()}`,
      tipo: 'ampliacion',
      timestamp: ampliacion.fechaAutorizacion,
      usuario: ampliacion.usuarioAutorizo,
      descripcion: `Ampliación de ${ampliacion.diasAmpliados} días en etapa de ${ampliacion.etapaAfectada}`,
      datosAnteriores: { fecha: ampliacion.fechaOriginal },
      datosNuevos: { fecha: ampliacion.nuevaFechaLimite },
      etapaAfectada: ampliacion.etapaAfectada
    };

    setHistorialCambios(prev => ({
      ...prev,
      [ampliacion.auditoriaId]: [
        ...(prev[ampliacion.auditoriaId] || []),
        cambio
      ]
    }));

    // Notificar cambio
    notificarCambio({
      tipo: 'ampliacion',
      auditoriaId: ampliacion.auditoriaId,
      etapa: ampliacion.etapaAfectada,
      fechaOriginal: ampliacion.fechaOriginal,
      fechaNueva: ampliacion.nuevaFechaLimite,
      diasAmpliados: ampliacion.diasAmpliados,
      usuario: ampliacion.usuarioAutorizo
    });
  };

  // NUEVO: Abrir modal de ampliación
  const handleAbrirAmpliacion = (auditoria: AuditoriaProgramada) => {
    setAuditoriaSeleccionada(auditoria);
    setMostrarModalAmpliacion(true);
  };

  // NUEVO: Abrir modal de historial
  const handleAbrirHistorial = (auditoria: AuditoriaProgramada) => {
    setAuditoriaSeleccionada(auditoria);
    setMostrarModalHistorial(true);
  };

  // ============ FILTRADO ============

  const auditoriasFiltradas = programa.auditorias.filter(auditoria =>
    auditoria.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase()) ||
    auditoria.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    auditoria.auditorLider?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ============ RENDER ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Programa Anual de Auditorías {programa.añoFiscal}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Planificación y programación de auditorías del año fiscal
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportarDesdeUniverso}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar desde Universo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarModalCrear(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Auditoría
          </Button>
          <Button
            size="sm"
            onClick={() => setMostrarPanelExportacion(true)}
            className="gap-2"
            style={{ backgroundColor: COLORES_ESAP.primario }}
          >
            <Download className="w-4 h-4" />
            Generar Documento Oficial
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Auditorías"
          value={metricas.totalAuditorias}
          icon={FileText}
          iconColor="#003DA5"
          iconBgColor="#EFF6FF"
        />
        <MetricCard
          title="Programadas"
          value={metricas.programadas}
          icon={Calendar}
          iconColor="#3B82F6"
          iconBgColor="#DBEAFE"
        />
        <MetricCard
          title="En Ejecución"
          value={metricas.enEjecucion}
          icon={TrendingUp}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
        />
        <MetricCard
          title="Completadas"
          value={metricas.completadas}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBgColor="#D1FAE5"
        />
        <MetricCard
          title="Críticas"
          value={metricas.auditoriasCriticas}
          icon={AlertCircle}
          iconColor="#EF4444"
          iconBgColor="#FEE2E2"
        />
        <MetricCard
          title="Alto Riesgo"
          value={metricas.auditoriasAlto}
          icon={AlertCircle}
          iconColor="#F97316"
          iconBgColor="#FFEDD5"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-xl border">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por proceso, código o auditor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={vistaActiva === 'tabla' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVistaActiva('tabla')}
          >
            Tabla
          </Button>
          <Button
            variant={vistaActiva === 'calendario' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVistaActiva('calendario')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendario
          </Button>
        </div>
      </div>

      {/* Tabla de Auditorías */}
      {vistaActiva === 'tabla' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Proceso Auditable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Sede/Territorial
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Riesgo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Auditor Líder
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Equipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditoriasFiltradas.map((auditoria) => (
                  <tr key={auditoria.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {auditoria.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {auditoria.procesoAuditable}
                        </p>
                        <p className="text-xs text-gray-500">
                          {auditoria.tipoProceso}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {auditoria.tipoProceso}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        {auditoria.tipoSede === 'Territorial' ? (
                          <>
                            <MapPin className="w-3 h-3" />
                            {auditoria.territorial}
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3 h-3" />
                            Sede Principal
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          auditoria.nivelRiesgo === 'CRÍTICO'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : auditoria.nivelRiesgo === 'ALTO'
                            ? 'bg-orange-100 text-orange-800 border-orange-200'
                            : auditoria.nivelRiesgo === 'MEDIO'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-green-100 text-green-800 border-green-200'
                        }
                      >
                        {auditoria.nivelRiesgo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-xs">
                          {auditoria.auditorLider?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm text-gray-700">
                          {auditoria.auditorLider || 'Sin asignar'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {auditoria.equipoAuditor?.length || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>P: {auditoria.fechas.planeacion.inicio}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>E: {auditoria.fechas.ejecucion.inicio}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>C: {auditoria.fechas.comunicacion.inicio}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          auditoria.estado === 'Programada'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : auditoria.estado === 'En Ejecución'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : auditoria.estado === 'Completada'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }
                      >
                        {auditoria.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAuditoriaSeleccionada(auditoria)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAuditoriaSeleccionada(auditoria);
                            setMostrarModalCrear(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarAuditoria(auditoria.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirAmpliacion(auditoria)}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirHistorial(auditoria)}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {auditoriasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No hay auditorías en el programa</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportarDesdeUniverso}
                className="mt-4 gap-2"
              >
                <Upload className="w-4 h-4" />
                Importar desde Universo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Vista Calendario - Placeholder */}
      {vistaActiva === 'calendario' && (
        <div className="bg-white rounded-xl border p-8">
          <GanttChartView 
            auditorias={programa.auditorias} 
            añoFiscal={programa.añoFiscal}
            onAuditoriaClick={(auditoria) => setAuditoriaSeleccionada(auditoria)}
            onReschedule={(auditoriaId, nuevasFechas) => {
              // Actualizar fechas de la auditoría
              setPrograma(prev => ({
                ...prev,
                auditorias: prev.auditorias.map(a => 
                  a.id === auditoriaId ? { ...a, fechas: nuevasFechas } : a
                )
              }));
              toast.success('Fechas actualizadas correctamente');
            }}
          />
        </div>
      )}

      {/* Modal Importar */}
      <ModalImportarUniverso
        isOpen={mostrarModalImportar}
        onClose={() => setMostrarModalImportar(false)}
        añoFiscal={programa.añoFiscal}
        procesosDisponibles={MOCK_UNIVERSO_AUDITORIAS}
        ultimoCodigoGenerado={programa.auditorias.length}
        onImportar={(auditoriasPrevisualizadas) => {
          // Convertir los previews a auditorías completas
          const nuevasAuditorias: AuditoriaProgramada[] = auditoriasPrevisualizadas.map((preview, index) => {
            const { proceso, codigo, fechaInicioSugerida, duraciones, auditorSugerido } = preview;
            
            // Calcular fechas completas
            const inicioPlaneacion = new Date(fechaInicioSugerida);
            const finPlaneacion = new Date(inicioPlaneacion.getTime() + duraciones.planeacion * 24 * 60 * 60 * 1000);
            
            const inicioEjecucion = new Date(finPlaneacion.getTime() + 24 * 60 * 60 * 1000);
            const finEjecucion = new Date(inicioEjecucion.getTime() + duraciones.ejecucion * 24 * 60 * 60 * 1000);
            
            const inicioComunicacion = new Date(finEjecucion.getTime() + 2 * 24 * 60 * 60 * 1000);
            const finComunicacion = new Date(inicioComunicacion.getTime() + duraciones.comunicacion * 24 * 60 * 60 * 1000);
            
            return {
              id: `imported-${Date.now()}-${index}`,
              codigo,
              procesoAuditable: proceso.nombre,
              tipoProceso: proceso.tipoProceso,
              tipoSede: proceso.tipoSede,
              territorial: proceso.territorial,
              nivelRiesgo: proceso.nivelRiesgo,
              añoPriorizacion: proceso.añoPriorizacion,
              auditorLider: auditorSugerido,
              equipoAuditor: [],
              fechas: {
                planeacion: {
                  inicio: inicioPlaneacion.toISOString().split('T')[0],
                  fin: finPlaneacion.toISOString().split('T')[0],
                  duracionDias: duraciones.planeacion
                },
                ejecucion: {
                  inicio: inicioEjecucion.toISOString().split('T')[0],
                  fin: finEjecucion.toISOString().split('T')[0],
                  duracionDias: duraciones.ejecucion
                },
                comunicacion: {
                  inicio: inicioComunicacion.toISOString().split('T')[0],
                  fin: finComunicacion.toISOString().split('T')[0],
                  duracionDias: duraciones.comunicacion
                }
              },
              estado: 'Programada',
              observaciones: `Importado desde Universo de Auditorías - ${proceso.codigo}`
            };
          });
          
          // Agregar al programa
          setPrograma(prev => ({
            ...prev,
            auditorias: [...prev.auditorias, ...nuevasAuditorias]
          }));
        }}
      />

      {/* Panel de Exportación */}
      <PanelExportacion
        isOpen={mostrarPanelExportacion}
        onClose={() => setMostrarPanelExportacion(false)}
        programa={programa}
        tipo="programa"
      />

      {/* Modal de Ampliación */}
      {auditoriaSeleccionada && (
        <ModalAmpliacionPlazo
          isOpen={mostrarModalAmpliacion}
          onClose={() => setMostrarModalAmpliacion(false)}
          auditoria={auditoriaSeleccionada as AuditoriaProgramadaConAmpliaciones}
          usuarioActual={usuarioActual}
          onAprobar={handleAprobarAmpliacion}
        />
      )}

      {/* Modal de Historial */}
      {auditoriaSeleccionada && (
        <ModalHistorialCambios
          isOpen={mostrarModalHistorial}
          onClose={() => setMostrarModalHistorial(false)}
          auditoria={{
            id: auditoriaSeleccionada.id,
            codigo: auditoriaSeleccionada.codigo,
            procesoAuditable: auditoriaSeleccionada.procesoAuditable
          }}
          ampliaciones={ampliaciones[auditoriaSeleccionada.id] || []}
          historial={historialCambios[auditoriaSeleccionada.id] || []}
        />
      )}
    </div>
  );
}