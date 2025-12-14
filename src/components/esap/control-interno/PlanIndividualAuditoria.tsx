/**
 * RF004 - PLAN INDIVIDUAL DE AUDITORÍA
 * Componente completo para crear planes individuales desde auditorías programadas
 * Incluye: Selección, definición, generación de documentos y envío a áreas
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Download,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  X
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MetricCard } from '../shared/MetricCard';
import { toast } from 'sonner@2.0.3';
import { ModalSeleccionAuditoriaPrograma } from './ModalSeleccionAuditoriaPrograma';
import { ModalPlanIndividualWizard } from './ModalPlanIndividualWizard';
import { ModalVisualizarDocumentosOCI } from './ModalVisualizarDocumentosOCI';

// ============ TIPOS ============

export interface MiembroEquipo {
  nombre: string;
  rol: 'Líder' | 'Auditor' | 'Apoyo';
  cargaTrabajo: number;
}

export interface CriterioAuditoria {
  id: string;
  descripcion: string;
  normativaBase: string;
  obligatorio: boolean;
  metodologia: string;
}

export interface DocumentoOCI {
  id: string;
  tipo: 'anuncio' | 'carta_representacion' | 'programa_individual' | 'solicitud_info';
  numero: string;
  titulo: string;
  fecha: string;
  contenido: string;
  pdfUrl?: string;
  firmado: boolean;
  fechaFirma?: string;
}

export interface NotificacionArea {
  id: string;
  destinatario: string;
  email: string;
  fechaEnvio: string;
  fechaLectura?: string;
  estadoConfirmacion: 'enviado' | 'leido' | 'confirmado';
}

export interface PlanIndividualAuditoria {
  id: string;
  codigo: string;
  
  // Vínculo con Programa Anual
  auditoriaOrigenId: string;
  procesoAuditable: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  
  // Definición del Plan
  alcance: string;
  objetivos: string[];
  riesgos: string[];
  criteriosAuditoria: CriterioAuditoria[];
  normativaAplicable: string[];
  
  // Equipo
  auditorLider: string;
  equipoAuditor: MiembroEquipo[];
  
  // Cronograma
  fechas: {
    planeacion: { inicio: string; fin: string };
    ejecucion: { inicio: string; fin: string };
    comunicacion: { inicio: string; fin: string };
  };
  
  // Responsable del área
  responsableArea: string;
  emailResponsable: string;
  
  // Documentos generados
  documentosOCI: DocumentoOCI[];
  
  // Comunicaciones
  notificaciones: NotificacionArea[];
  
  // Estado
  estado: 'Borrador' | 'Aprobado' | 'Notificado' | 'En Ejecución';
  fechaCreacion: string;
  creadoPor: string;
  fechaAprobacion?: string;
  aprobadoPor?: string;
  
  observaciones: string;
}

// ============ MOCK DATA ============

const MOCK_PLANES: PlanIndividualAuditoria[] = [
  {
    id: '1',
    codigo: 'PIA-2025-001',
    auditoriaOrigenId: '1',
    procesoAuditable: 'Gestión Financiera',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    alcance: 'La auditoría comprende la revisión del periodo enero-junio 2025, incluyendo: ejecución presupuestal, gestión de caja menor, conciliaciones bancarias y comprobantes de egreso.',
    objetivos: [
      'Verificar el cumplimiento de la normatividad vigente en materia financiera',
      'Evaluar la efectividad de los controles implementados',
      'Identificar oportunidades de mejora en los procesos financieros'
    ],
    riesgos: [
      'Riesgo de malversación de fondos públicos',
      'Riesgo de incumplimiento normativo (Ley 819/2003)',
      'Riesgo operacional por falta de segregación de funciones'
    ],
    criteriosAuditoria: [
      {
        id: 'c1',
        descripcion: 'Cumplimiento Ley 819 de 2003 - Responsabilidad Fiscal',
        normativaBase: 'Ley 819/2003',
        obligatorio: true,
        metodologia: 'Revisión documental y entrevistas'
      },
      {
        id: 'c2',
        descripcion: 'Efectividad de controles internos financieros',
        normativaBase: 'Ley 87/1993',
        obligatorio: true,
        metodologia: 'Pruebas de cumplimiento'
      }
    ],
    normativaAplicable: ['Ley 819/2003', 'Ley 87/1993', 'Decreto 1068/2015'],
    auditorLider: 'Mario Oswaldo Bernal Rodriguez',
    equipoAuditor: [
      { nombre: 'Catalina Rubio', rol: 'Auditor', cargaTrabajo: 100 },
      { nombre: 'Sandra Montero', rol: 'Apoyo', cargaTrabajo: 50 }
    ],
    fechas: {
      planeacion: { inicio: '2025-01-15', fin: '2025-01-30' },
      ejecucion: { inicio: '2025-02-01', fin: '2025-03-01' },
      comunicacion: { inicio: '2025-03-03', fin: '2025-03-18' }
    },
    responsableArea: 'Sandra Montero',
    emailResponsable: 'smontero@esap.edu.co',
    documentosOCI: [
      {
        id: 'd1',
        tipo: 'anuncio',
        numero: 'OCI-AN-001-2025',
        titulo: 'Oficio de Anuncio de Auditoría',
        fecha: '2025-01-10',
        contenido: '',
        firmado: true,
        fechaFirma: '2025-01-10'
      },
      {
        id: 'd2',
        tipo: 'programa_individual',
        numero: 'OCI-PI-001-2025',
        titulo: 'Programa Individual de Auditoría',
        fecha: '2025-01-10',
        contenido: '',
        firmado: true,
        fechaFirma: '2025-01-10'
      }
    ],
    notificaciones: [
      {
        id: 'n1',
        destinatario: 'Sandra Montero',
        email: 'smontero@esap.edu.co',
        fechaEnvio: '2025-01-10T10:00:00',
        fechaLectura: '2025-01-10T14:30:00',
        estadoConfirmacion: 'confirmado'
      }
    ],
    estado: 'Notificado',
    fechaCreacion: '2025-01-10',
    creadoPor: 'Mario Oswaldo Bernal Rodriguez',
    fechaAprobacion: '2025-01-10',
    aprobadoPor: 'Mario Oswaldo Bernal Rodriguez',
    observaciones: ''
  },
  {
    id: '2',
    codigo: 'PIA-2025-002',
    auditoriaOrigenId: '2',
    procesoAuditable: 'Gestión Contractual',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    alcance: 'Revisión de contratos del primer trimestre 2025',
    objetivos: [
      'Verificar cumplimiento de requisitos de contratación',
      'Evaluar gestión de riesgos contractuales'
    ],
    riesgos: [
      'Incumplimiento de plazos contractuales',
      'Falta de supervisión adecuada'
    ],
    criteriosAuditoria: [
      {
        id: 'c3',
        descripcion: 'Cumplimiento Ley 80 de 1993',
        normativaBase: 'Ley 80/1993',
        obligatorio: true,
        metodologia: 'Revisión documental'
      }
    ],
    normativaAplicable: ['Ley 80/1993', 'Ley 1150/2007'],
    auditorLider: 'Fernando Ávila',
    equipoAuditor: [
      { nombre: 'William Ramírez', rol: 'Auditor', cargaTrabajo: 100 }
    ],
    fechas: {
      planeacion: { inicio: '2025-04-01', fin: '2025-04-16' },
      ejecucion: { inicio: '2025-04-17', fin: '2025-05-17' },
      comunicacion: { inicio: '2025-05-19', fin: '2025-06-03' }
    },
    responsableArea: 'Fernando Ávila',
    emailResponsable: 'favila@esap.edu.co',
    documentosOCI: [],
    notificaciones: [],
    estado: 'Borrador',
    fechaCreacion: '2025-01-12',
    creadoPor: 'Fernando Ávila',
    observaciones: ''
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function PlanIndividualAuditoria() {
  const [planes, setPlanes] = useState<PlanIndividualAuditoria[]>(MOCK_PLANES);
  const [modalSeleccion, setModalSeleccion] = useState(false);
  const [modalWizard, setModalWizard] = useState(false);
  const [modalDocumentos, setModalDocumentos] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanIndividualAuditoria | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Métricas
  const metricas = {
    total: planes.length,
    borradores: planes.filter(p => p.estado === 'Borrador').length,
    aprobados: planes.filter(p => p.estado === 'Aprobado').length,
    notificados: planes.filter(p => p.estado === 'Notificado').length,
    enEjecucion: planes.filter(p => p.estado === 'En Ejecución').length
  };

  // Filtrado
  let planesFiltrados = planes;
  if (filtroEstado !== 'todos') {
    planesFiltrados = planesFiltrados.filter(p => p.estado === filtroEstado);
  }
  if (busqueda) {
    planesFiltrados = planesFiltrados.filter(p =>
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.auditorLider.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  const handleCrearPlan = (plan: PlanIndividualAuditoria) => {
    setPlanes([...planes, plan]);
    toast.success(`Plan ${plan.codigo} creado exitosamente`);
  };

  const handleVerDocumentos = (plan: PlanIndividualAuditoria) => {
    setPlanSeleccionado(plan);
    setModalDocumentos(true);
  };

  const handleEnviarNotificacion = (plan: PlanIndividualAuditoria) => {
    // Simular envío de notificación
    toast.success(`Notificación enviada a ${plan.responsableArea}`);
    
    setPlanes(planes.map(p =>
      p.id === plan.id ? { ...p, estado: 'Notificado' as const } : p
    ));
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Borrador': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Aprobado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Notificado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'En Ejecución': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiesgoColor = (riesgo: string) => {
    switch (riesgo) {
      case 'CRÍTICO': return 'bg-red-100 text-red-800 border-red-200';
      case 'ALTO': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'BAJO': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Plan Individual de Auditoría
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Creación y gestión de planes individuales de auditoría desde el programa anual
          </p>
        </div>

        <Button
          onClick={() => setModalSeleccion(true)}
          className="gap-2"
          style={{ backgroundColor: '#003DA5' }}
        >
          <Plus className="w-4 h-4" />
          Crear Plan Individual
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Planes"
          value={metricas.total}
          icon={FileText}
          iconColor="#003DA5"
          iconBgColor="#EFF6FF"
        />
        <MetricCard
          title="Borradores"
          value={metricas.borradores}
          icon={Edit}
          iconColor="#6B7280"
          iconBgColor="#F3F4F6"
        />
        <MetricCard
          title="Aprobados"
          value={metricas.aprobados}
          icon={CheckCircle2}
          iconColor="#3B82F6"
          iconBgColor="#DBEAFE"
        />
        <MetricCard
          title="Notificados"
          value={metricas.notificados}
          icon={Send}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
        />
        <MetricCard
          title="En Ejecución"
          value={metricas.enEjecucion}
          icon={Clock}
          iconColor="#10B981"
          iconBgColor="#D1FAE5"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-xl border">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, proceso o auditor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
          >
            <option value="todos">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Notificado">Notificado</option>
            <option value="En Ejecución">En Ejecución</option>
          </select>
        </div>
      </div>

      {/* Lista de Planes */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Proceso Auditable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Riesgo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Auditor Líder</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Equipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Fecha Planeación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Documentos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {planesFiltrados.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{plan.codigo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{plan.procesoAuditable}</p>
                      <p className="text-xs text-gray-500">{plan.tipoProceso}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getRiesgoColor(plan.nivelRiesgo)}>
                      {plan.nivelRiesgo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-xs">
                        {plan.auditorLider.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">{plan.auditorLider}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{plan.equipoAuditor.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      <div>{new Date(plan.fechas.planeacion.inicio).toLocaleDateString('es-CO')}</div>
                      <div className="text-gray-400">hasta {new Date(plan.fechas.planeacion.fin).toLocaleDateString('es-CO')}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{plan.documentosOCI.length}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getEstadoColor(plan.estado)}>
                      {plan.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerDocumentos(plan)}
                        title="Ver documentos"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerDocumentos(plan)}
                        title="Descargar documentos"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {plan.estado === 'Aprobado' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEnviarNotificacion(plan)}
                          title="Enviar notificación"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {planesFiltrados.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No se encontraron planes individuales</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalSeleccion(true)}
              className="mt-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Plan Individual
            </Button>
          </div>
        )}
      </div>

      {/* Modales */}
      <ModalSeleccionAuditoriaPrograma
        isOpen={modalSeleccion}
        onClose={() => setModalSeleccion(false)}
        onSeleccionar={(auditoria) => {
          setModalSeleccion(false);
          setModalWizard(true);
        }}
      />

      <ModalPlanIndividualWizard
        isOpen={modalWizard}
        onClose={() => setModalWizard(false)}
        onCrear={handleCrearPlan}
      />

      <ModalVisualizarDocumentosOCI
        isOpen={modalDocumentos}
        onClose={() => setModalDocumentos(false)}
        plan={planSeleccionado}
      />
    </div>
  );
}
