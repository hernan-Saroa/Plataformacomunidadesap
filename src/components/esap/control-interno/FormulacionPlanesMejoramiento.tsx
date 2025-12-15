/**
 * RF010 - FORMULACIÓN DE PLANES DE MEJORAMIENTO
 * Sistema de gestión de acciones correctivas por área auditada
 * Oficina de Control Interno - ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Plus, Search, Eye, Edit, Send, CheckCircle2,
  XCircle, Clock, AlertTriangle, User, Calendar, Building2,
  Phone, Mail, DollarSign, FileText, MessageSquare, ChevronDown,
  ChevronUp, Save, X, Download, Share2, History, Award,
  TrendingUp, Target, Users, Briefcase, CheckSquare, Flag,
  ArrowRight, Sparkles, ShieldCheck, Activity, BarChart3
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';

// ============ TIPOS ============

type EstadoPlan = 'Borrador' | 'Enviado OCI' | 'En Revisión' | 'Aprobado' | 'Rechazado' | 'En Implementación';

interface CausaRaiz {
  id: string;
  categoria: 'Método' | 'Personal' | 'Material' | 'Máquina' | 'Medición' | 'Medio Ambiente';
  descripcion: string;
}

interface AccionCorrectiva {
  id: string;
  descripcion: string;
  tipo: 'Preventiva' | 'Correctiva' | 'Mejora';
  responsable: string;
  cargoResponsable: string;
  emailResponsable: string;
  telefonoResponsable: string;
  fechaInicio: string;
  fechaFin: string;
  fechaVerificacion: string;
  indicadorCumplimiento: string;
  recursosNecesarios: RecursoNecesario[];
  estado: 'Pendiente' | 'En Proceso' | 'Completada' | 'Verificada';
  avance: number;
  evidencias: string[];
}

interface RecursoNecesario {
  id: string;
  tipo: 'Humano' | 'Financiero' | 'Tecnológico' | 'Material';
  descripcion: string;
  cantidad: string;
  valorEstimado?: string;
  justificacion: string;
}

interface HallazgoAsociado {
  id: string;
  codigo: string;
  tipo: 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora';
  gravedad: 'Crítico' | 'Mayor' | 'Menor';
  titulo: string;
  descripcion: string;
}

interface RevisionOCI {
  id: string;
  revisor: string;
  cargo: string;
  fecha: string;
  hora: string;
  decision: 'Aprobado' | 'Rechazado' | 'Solicita Ajustes';
  comentarios: string;
  observaciones?: string;
}

interface PlanMejoramiento {
  id: string;
  codigo: string;
  auditoriaId: string;
  codigoAuditoria: string;
  procesoAuditable: string;
  
  // Área Responsable
  areaResponsable: string;
  jefeArea: string;
  cargoJefeArea: string;
  emailJefeArea: string;
  telefonoJefeArea: string;
  
  // Hallazgos asociados
  hallazgos: HallazgoAsociado[];
  
  // Plan por hallazgo
  planPorHallazgo: {
    hallazgoId: string;
    analisisCausasRaiz: CausaRaiz[];
    accionesCorrectivas: AccionCorrectiva[];
    observaciones: string;
  }[];
  
  // Estado y fechas
  estado: EstadoPlan;
  fechaCreacion: string;
  fechaEnvio?: string;
  fechaRevision?: string;
  fechaAprobacion?: string;
  fechaRechazo?: string;
  
  // Workflow
  revisionesOCI: RevisionOCI[];
  
  // Recursos totales
  resumenRecursos: {
    totalHumanos: number;
    totalFinanciero: string;
    totalTecnologico: number;
    totalMaterial: number;
  };
  
  // Metadata
  creadoPor: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  version: string;
}

// ============ DATOS MOCK ============

const MOCK_HALLAZGOS: HallazgoAsociado[] = [
  {
    id: 'h-001',
    codigo: 'H-2025-001',
    tipo: 'No Conformidad',
    gravedad: 'Mayor',
    titulo: 'Falta de análisis del sector en estudios previos',
    descripcion: 'Se identificaron 3 procesos contractuales sin análisis del sector requerido'
  },
  {
    id: 'h-002',
    codigo: 'H-2025-002',
    tipo: 'Observación',
    gravedad: 'Menor',
    titulo: 'Retrasos en publicación de actos administrativos',
    descripcion: 'Demoras promedio de 3 días en publicación SECOP II'
  }
];

const MOCK_PLANES: PlanMejoramiento[] = [
  {
    id: 'pm-001',
    codigo: 'PM-2025-001',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual',
    areaResponsable: 'Oficina Jurídica',
    jefeArea: 'María Pérez González',
    cargoJefeArea: 'Jefe Oficina Jurídica',
    emailJefeArea: 'maria.perez@esap.edu.co',
    telefonoJefeArea: '601-2345678 ext. 101',
    hallazgos: MOCK_HALLAZGOS,
    planPorHallazgo: [
      {
        hallazgoId: 'h-001',
        analisisCausasRaiz: [
          {
            id: 'causa-001',
            categoria: 'Método',
            descripcion: 'Ausencia de lista de chequeo obligatoria para elaboración de estudios previos'
          },
          {
            id: 'causa-002',
            categoria: 'Personal',
            descripcion: 'Falta de capacitación del equipo en requisitos normativos actualizados'
          },
          {
            id: 'causa-003',
            categoria: 'Medición',
            descripcion: 'No existe mecanismo de revisión previa antes de aprobación de estudios'
          }
        ],
        accionesCorrectivas: [
          {
            id: 'acc-001',
            descripcion: 'Diseñar e implementar lista de chequeo obligatoria para estudios previos que incluya verificación de análisis del sector, evaluación de oferentes y condiciones de mercado',
            tipo: 'Correctiva',
            responsable: 'Pedro Gómez Ruiz',
            cargoResponsable: 'Profesional Especializado Contratación',
            emailResponsable: 'pedro.gomez@esap.edu.co',
            telefonoResponsable: '601-2345678 ext. 102',
            fechaInicio: '2025-03-15',
            fechaFin: '2025-04-30',
            fechaVerificacion: '2025-05-15',
            indicadorCumplimiento: '100% de estudios previos elaborados con lista de chequeo diligenciada',
            estado: 'En Proceso',
            avance: 35,
            evidencias: [],
            recursosNecesarios: [
              {
                id: 'rec-001',
                tipo: 'Humano',
                descripcion: 'Asesoría jurídica externa para diseño de lista de chequeo',
                cantidad: '40 horas',
                valorEstimado: '$4.000.000',
                justificacion: 'Se requiere experto en contratación pública para garantizar cumplimiento normativo'
              },
              {
                id: 'rec-002',
                tipo: 'Tecnológico',
                descripcion: 'Herramienta digital para aplicación de lista de chequeo',
                cantidad: '1 licencia',
                valorEstimado: '$2.500.000',
                justificacion: 'Automatizar el proceso y garantizar trazabilidad'
              }
            ]
          },
          {
            id: 'acc-002',
            descripcion: 'Realizar programa de capacitación para el equipo de contratación sobre elaboración de estudios previos según normativa vigente (Decreto 1082/2015, Ley 1474/2011)',
            tipo: 'Preventiva',
            responsable: 'Laura Martínez Silva',
            cargoResponsable: 'Profesional Universitario Contratación',
            emailResponsable: 'laura.martinez@esap.edu.co',
            telefonoResponsable: '601-2345678 ext. 103',
            fechaInicio: '2025-03-20',
            fechaFin: '2025-04-15',
            fechaVerificacion: '2025-04-20',
            indicadorCumplimiento: '100% del equipo de contratación capacitado y certificado',
            estado: 'Pendiente',
            avance: 0,
            evidencias: [],
            recursosNecesarios: [
              {
                id: 'rec-003',
                tipo: 'Financiero',
                descripcion: 'Contratación de capacitador experto en contratación pública',
                cantidad: '16 horas',
                valorEstimado: '$3.200.000',
                justificacion: 'Capacitación especializada para 8 funcionarios del área'
              }
            ]
          },
          {
            id: 'acc-003',
            descripcion: 'Establecer mecanismo de revisión técnica por profesional especializado antes de la aprobación de estudios previos',
            tipo: 'Correctiva',
            responsable: 'Carlos Ramírez Ortiz',
            cargoResponsable: 'Asesor Jurídico Senior',
            emailResponsable: 'carlos.ramirez@esap.edu.co',
            telefonoResponsable: '601-2345678 ext. 104',
            fechaInicio: '2025-03-25',
            fechaFin: '2025-05-10',
            fechaVerificacion: '2025-05-20',
            indicadorCumplimiento: '100% de estudios previos con revisión técnica documentada',
            estado: 'Pendiente',
            avance: 0,
            evidencias: [],
            recursosNecesarios: [
              {
                id: 'rec-004',
                tipo: 'Humano',
                descripcion: 'Reasignación de tiempo del asesor jurídico senior',
                cantidad: '20% tiempo laboral',
                justificacion: 'Garantizar revisión técnica de calidad sin contratación adicional'
              }
            ]
          }
        ],
        observaciones: 'Se priorizará la implementación de la lista de chequeo como acción inmediata'
      },
      {
        hallazgoId: 'h-002',
        analisisCausasRaiz: [
          {
            id: 'causa-004',
            categoria: 'Método',
            descripcion: 'Flujo de aprobaciones interno excesivamente largo'
          },
          {
            id: 'causa-005',
            categoria: 'Máquina',
            descripcion: 'Proceso manual de carga de documentos a SECOP II'
          }
        ],
        accionesCorrectivas: [
          {
            id: 'acc-004',
            descripcion: 'Optimizar flujo de aprobaciones reduciendo instancias de revisión y estableciendo plazos máximos por etapa',
            tipo: 'Mejora',
            responsable: 'Ana Sofía Herrera',
            cargoResponsable: 'Profesional Universitario Contratación',
            emailResponsable: 'ana.herrera@esap.edu.co',
            telefonoResponsable: '601-2345678 ext. 105',
            fechaInicio: '2025-03-18',
            fechaFin: '2025-04-20',
            fechaVerificacion: '2025-04-30',
            indicadorCumplimiento: 'Tiempo promedio de publicación menor a 48 horas',
            estado: 'Pendiente',
            avance: 0,
            evidencias: [],
            recursosNecesarios: []
          }
        ],
        observaciones: 'Acción de mejora continua con impacto en eficiencia del proceso'
      }
    ],
    estado: 'En Revisión',
    fechaCreacion: '2025-03-10',
    fechaEnvio: '2025-03-12',
    fechaRevision: '2025-03-13',
    revisionesOCI: [
      {
        id: 'rev-001',
        revisor: 'Carlos Martínez López',
        cargo: 'Jefe Oficina Control Interno',
        fecha: '2025-03-13',
        hora: '15:30',
        decision: 'Solicita Ajustes',
        comentarios: 'El plan presenta buena estructura y acciones pertinentes. Se solicita incluir indicador cuantitativo en la acción ACC-003 y especificar cronograma de capacitaciones en ACC-002.',
        observaciones: 'Fecha límite para ajustes: 2025-03-20'
      }
    ],
    resumenRecursos: {
      totalHumanos: 2,
      totalFinanciero: '$9.700.000',
      totalTecnologico: 1,
      totalMaterial: 0
    },
    creadoPor: 'María Pérez González',
    version: 'v1.0'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function FormulacionPlanesMejoramiento() {
  const [planes, setPlanes] = useState<PlanMejoramiento[]>(MOCK_PLANES);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanMejoramiento | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle' | 'editor'>('lista');
  const [modoEditor, setModoEditor] = useState<'crear' | 'editar'>('crear');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  
  // Modales
  const [modalEnviar, setModalEnviar] = useState(false);
  const [modalRevisar, setModalRevisar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);

  // Filtrado
  const planesFiltrados = planes.filter(plan => {
    const coincideBusqueda = plan.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                             plan.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase()) ||
                             plan.areaResponsable.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'Todos' || plan.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  // Estadísticas
  const stats = {
    total: planes.length,
    borradores: planes.filter(p => p.estado === 'Borrador').length,
    enRevision: planes.filter(p => p.estado === 'En Revisión').length,
    aprobados: planes.filter(p => p.estado === 'Aprobado').length,
    rechazados: planes.filter(p => p.estado === 'Rechazado').length,
    enImplementacion: planes.filter(p => p.estado === 'En Implementación').length
  };

  const handleCrearNuevo = () => {
    setModoEditor('crear');
    setPlanSeleccionado(null);
    setVistaActual('editor');
  };

  const handleVerDetalle = (plan: PlanMejoramiento) => {
    setPlanSeleccionado(plan);
    setVistaActual('detalle');
  };

  const handleEditar = (plan: PlanMejoramiento) => {
    setModoEditor('editar');
    setPlanSeleccionado(plan);
    setVistaActual('editor');
  };

  const handleEnviarOCI = (planId: string) => {
    setPlanes(planes.map(p =>
      p.id === planId
        ? {
            ...p,
            estado: 'Enviado OCI' as const,
            fechaEnvio: new Date().toISOString().split('T')[0]
          }
        : p
    ));
    setModalEnviar(false);
  };

  const handleRevisarPlan = (planId: string, decision: 'Aprobado' | 'Rechazado' | 'Solicita Ajustes', comentarios: string) => {
    const plan = planes.find(p => p.id === planId);
    if (!plan) return;

    const nuevaRevision: RevisionOCI = {
      id: `rev-${Date.now()}`,
      revisor: 'Carlos Martínez López',
      cargo: 'Jefe Oficina Control Interno',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      decision: decision,
      comentarios: comentarios
    };

    const nuevoEstado: EstadoPlan = 
      decision === 'Aprobado' ? 'Aprobado' :
      decision === 'Rechazado' ? 'Rechazado' : 'En Revisión';

    setPlanes(planes.map(p =>
      p.id === planId
        ? {
            ...p,
            estado: nuevoEstado,
            revisionesOCI: [...p.revisionesOCI, nuevaRevision],
            ...(decision === 'Aprobado' && { fechaAprobacion: nuevaRevision.fecha }),
            ...(decision === 'Rechazado' && { fechaRechazo: nuevaRevision.fecha })
          }
        : p
    ));

    setModalRevisar(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Formulación de Planes de Mejoramiento
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF010 - Gestión de acciones correctivas por área auditada
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('lista')}
            variant={vistaActual === 'lista' ? 'default' : 'outline'}
            size="sm"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Lista
          </Button>
          <Button
            onClick={handleCrearNuevo}
            size="sm"
            style={{ background: '#10B981' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Plan
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Borradores</p>
          <p className="text-2xl font-black text-gray-600">{stats.borradores}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">En Revisión</p>
          <p className="text-2xl font-black text-amber-600">{stats.enRevision}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Aprobados</p>
          <p className="text-2xl font-black text-green-600">{stats.aprobados}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Rechazados</p>
          <p className="text-2xl font-black text-red-600">{stats.rechazados}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Implementación</p>
          <p className="text-2xl font-black text-blue-600">{stats.enImplementacion}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, proceso o área..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Enviado OCI">Enviado OCI</option>
            <option value="En Revisión">En Revisión</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
            <option value="En Implementación">En Implementación</option>
          </select>
        </div>
      </Card>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'lista' && (
          <ListaPlanesView
            key="lista"
            planes={planesFiltrados}
            onVerDetalle={handleVerDetalle}
            onEditar={handleEditar}
            onEnviar={(plan) => {
              setPlanSeleccionado(plan);
              setModalEnviar(true);
            }}
            onRevisar={(plan) => {
              setPlanSeleccionado(plan);
              setModalRevisar(true);
            }}
          />
        )}

        {vistaActual === 'detalle' && planSeleccionado && (
          <DetallePlanView
            key="detalle"
            plan={planSeleccionado}
            onVolver={() => setVistaActual('lista')}
            onEditar={() => handleEditar(planSeleccionado)}
            onEnviar={() => setModalEnviar(true)}
            onRevisar={() => setModalRevisar(true)}
          />
        )}

        {vistaActual === 'editor' && (
          <EditorPlanView
            key="editor"
            plan={planSeleccionado}
            modo={modoEditor}
            onGuardar={(plan) => {
              if (modoEditor === 'crear') {
                setPlanes([plan, ...planes]);
              } else {
                setPlanes(planes.map(p => p.id === plan.id ? plan : p));
              }
              setVistaActual('lista');
            }}
            onCancelar={() => setVistaActual('lista')}
          />
        )}
      </AnimatePresence>

      {/* MODAL: ENVIAR A OCI */}
      <AnimatePresence>
        {modalEnviar && planSeleccionado && (
          <ModalEnviarOCI
            plan={planSeleccionado}
            onConfirmar={() => handleEnviarOCI(planSeleccionado.id)}
            onCerrar={() => setModalEnviar(false)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: REVISAR PLAN */}
      <AnimatePresence>
        {modalRevisar && planSeleccionado && (
          <ModalRevisarPlan
            plan={planSeleccionado}
            onRevisar={(decision, comentarios) => handleRevisarPlan(planSeleccionado.id, decision, comentarios)}
            onCerrar={() => setModalRevisar(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: LISTA DE PLANES ============

interface ListaPlanesViewProps {
  planes: PlanMejoramiento[];
  onVerDetalle: (plan: PlanMejoramiento) => void;
  onEditar: (plan: PlanMejoramiento) => void;
  onEnviar: (plan: PlanMejoramiento) => void;
  onRevisar: (plan: PlanMejoramiento) => void;
}

function ListaPlanesView({ planes, onVerDetalle, onEditar, onEnviar, onRevisar }: ListaPlanesViewProps) {
  const [expandido, setExpandido] = useState<string | null>(null);

  const getEstadoColor = (estado: EstadoPlan) => {
    switch (estado) {
      case 'Borrador': return '#6B7280';
      case 'Enviado OCI': return '#3B82F6';
      case 'En Revisión': return '#F59E0B';
      case 'Aprobado': return '#10B981';
      case 'Rechazado': return '#EF4444';
      case 'En Implementación': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {planes.map((plan) => (
        <Card key={plan.id} className="overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                    {plan.codigo}
                  </Badge>
                  <Badge style={{ background: getEstadoColor(plan.estado), color: '#FFF' }}>
                    {plan.estado}
                  </Badge>
                  <Badge variant="outline">{plan.version}</Badge>
                </div>
                <h3 className="font-black text-gray-900 mb-1">{plan.procesoAuditable}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {plan.areaResponsable}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {plan.jefeArea}
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {plan.hallazgos.length} hallazgos
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setExpandido(expandido === plan.id ? null : plan.id)}
                  variant="outline"
                  size="sm"
                >
                  {expandido === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Contenido Expandible */}
          <AnimatePresence>
            {expandido === plan.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Resumen de Acciones */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                      <p className="text-xs text-gray-600">Total Acciones</p>
                      <p className="text-lg font-black text-gray-900">
                        {plan.planPorHallazgo.reduce((sum, p) => sum + p.accionesCorrectivas.length, 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                      <p className="text-xs text-gray-600">Causas Raíz</p>
                      <p className="text-lg font-black text-amber-900">
                        {plan.planPorHallazgo.reduce((sum, p) => sum + p.analisisCausasRaiz.length, 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
                      <p className="text-xs text-gray-600">Recursos</p>
                      <p className="text-lg font-black text-blue-900">{plan.resumenRecursos.totalFinanciero}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#D1FAE5' }}>
                      <p className="text-xs text-gray-600">Revisiones</p>
                      <p className="text-lg font-black text-green-900">{plan.revisionesOCI.length}</p>
                    </div>
                  </div>

                  {/* Última Revisión */}
                  {plan.revisionesOCI.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                      <p className="text-xs font-bold text-gray-900 uppercase mb-1">Última Revisión OCI</p>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 mb-1">
                            {plan.revisionesOCI[plan.revisionesOCI.length - 1].comentarios}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{plan.revisionesOCI[plan.revisionesOCI.length - 1].revisor}</span>
                            <span>{plan.revisionesOCI[plan.revisionesOCI.length - 1].fecha}</span>
                          </div>
                        </div>
                        <Badge style={{
                          background: plan.revisionesOCI[plan.revisionesOCI.length - 1].decision === 'Aprobado' ? '#10B981' :
                                     plan.revisionesOCI[plan.revisionesOCI.length - 1].decision === 'Rechazado' ? '#EF4444' : '#F59E0B',
                          color: '#FFF'
                        }}>
                          {plan.revisionesOCI[plan.revisionesOCI.length - 1].decision}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button onClick={() => onVerDetalle(plan)} variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle
                    </Button>
                    {(plan.estado === 'Borrador' || plan.estado === 'Rechazado') && (
                      <Button onClick={() => onEditar(plan)} variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    {plan.estado === 'Borrador' && (
                      <Button onClick={() => onEnviar(plan)} size="sm" style={{ background: '#3B82F6' }}>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar a OCI
                      </Button>
                    )}
                    {(plan.estado === 'Enviado OCI' || plan.estado === 'En Revisión') && (
                      <Button onClick={() => onRevisar(plan)} size="sm" style={{ background: '#10B981' }}>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Revisar Plan
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}

      {planes.length === 0 && (
        <Card className="p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se encontraron planes de mejoramiento</p>
        </Card>
      )}
    </motion.div>
  );
}

// ============ VISTA: DETALLE DEL PLAN (continuará en siguiente mensaje) ============

interface DetallePlanViewProps {
  plan: PlanMejoramiento;
  onVolver: () => void;
  onEditar: () => void;
  onEnviar: () => void;
  onRevisar: () => void;
}

function DetallePlanView({ plan, onVolver, onEditar, onEnviar, onRevisar }: DetallePlanViewProps) {
  const [pestanaActiva, setPestanaActiva] = useState<'info' | 'hallazgos' | 'recursos' | 'revisiones'>('info');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                {plan.codigo}
              </Badge>
              <Badge style={{ background: '#10B981', color: '#FFF' }}>
                {plan.estado}
              </Badge>
              <Badge variant="outline">{plan.version}</Badge>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{plan.procesoAuditable}</h2>
            <p className="text-gray-600">Auditoría: {plan.codigoAuditoria}</p>
          </div>

          <div className="flex gap-2">
            {(plan.estado === 'Borrador' || plan.estado === 'Rechazado') && (
              <Button onClick={onEditar} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            {plan.estado === 'Borrador' && (
              <Button onClick={onEnviar} size="sm" style={{ background: '#3B82F6' }}>
                <Send className="w-4 h-4 mr-2" />
                Enviar a OCI
              </Button>
            )}
            {(plan.estado === 'Enviado OCI' || plan.estado === 'En Revisión') && (
              <Button onClick={onRevisar} size="sm" style={{ background: '#10B981' }}>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Revisar
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </div>

        {/* Área Responsable */}
        <div className="mt-6 p-4 bg-white rounded-lg">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Área Responsable</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-600">Área</p>
              <p className="font-bold text-gray-900">{plan.areaResponsable}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Responsable</p>
              <p className="font-bold text-gray-900">{plan.jefeArea}</p>
              <p className="text-xs text-gray-600">{plan.cargoJefeArea}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Email</p>
              <p className="font-bold text-gray-900">{plan.emailJefeArea}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Teléfono</p>
              <p className="font-bold text-gray-900">{plan.telefonoJefeArea}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pestañas */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPestanaActiva('info')}
            variant={pestanaActiva === 'info' ? 'default' : 'ghost'}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Información General
          </Button>
          <Button
            onClick={() => setPestanaActiva('hallazgos')}
            variant={pestanaActiva === 'hallazgos' ? 'default' : 'ghost'}
            size="sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Hallazgos y Acciones ({plan.hallazgos.length})
          </Button>
          <Button
            onClick={() => setPestanaActiva('recursos')}
            variant={pestanaActiva === 'recursos' ? 'default' : 'ghost'}
            size="sm"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Recursos
          </Button>
          <Button
            onClick={() => setPestanaActiva('revisiones')}
            variant={pestanaActiva === 'revisiones' ? 'default' : 'ghost'}
            size="sm"
          >
            <History className="w-4 h-4 mr-2" />
            Revisiones OCI ({plan.revisionesOCI.length})
          </Button>
        </div>
      </Card>

      {/* Contenido de Pestañas */}
      <AnimatePresence mode="wait">
        {pestanaActiva === 'info' && (
          <PestanaInformacion key="info" plan={plan} />
        )}
        {pestanaActiva === 'hallazgos' && (
          <PestanaHallazgosAcciones key="hallazgos" plan={plan} />
        )}
        {pestanaActiva === 'recursos' && (
          <PestanaRecursos key="recursos" plan={plan} />
        )}
        {pestanaActiva === 'revisiones' && (
          <PestanaRevisiones key="revisiones" plan={plan} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ PESTAÑA: INFORMACIÓN ============

function PestanaInformacion({ plan }: { plan: PlanMejoramiento }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Resumen Ejecutivo */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Resumen Ejecutivo</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600">Hallazgos</p>
            <p className="text-2xl font-black text-gray-900">{plan.hallazgos.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Acciones Correctivas</p>
            <p className="text-2xl font-black text-blue-600">
              {plan.planPorHallazgo.reduce((sum, p) => sum + p.accionesCorrectivas.length, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Causas Identificadas</p>
            <p className="text-2xl font-black text-amber-600">
              {plan.planPorHallazgo.reduce((sum, p) => sum + p.analisisCausasRaiz.length, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Inversión Total</p>
            <p className="text-2xl font-black text-green-600">{plan.resumenRecursos.totalFinanciero}</p>
          </div>
        </div>
      </Card>

      {/* Fechas Clave */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Fechas Clave</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600">Creación</p>
            <p className="font-bold text-gray-900">{plan.fechaCreacion}</p>
          </div>
          {plan.fechaEnvio && (
            <div>
              <p className="text-xs text-gray-600">Envío OCI</p>
              <p className="font-bold text-gray-900">{plan.fechaEnvio}</p>
            </div>
          )}
          {plan.fechaRevision && (
            <div>
              <p className="text-xs text-gray-600">Revisión</p>
              <p className="font-bold text-gray-900">{plan.fechaRevision}</p>
            </div>
          )}
          {plan.fechaAprobacion && (
            <div>
              <p className="text-xs text-gray-600">Aprobación</p>
              <p className="font-bold text-green-900">{plan.fechaAprobacion}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ PESTAÑA: HALLAZGOS Y ACCIONES (continuará en próximo mensaje por límite de tokens) ============

function PestanaHallazgosAcciones({ plan }: { plan: PlanMejoramiento }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {plan.planPorHallazgo.map((planHallazgo, index) => {
        const hallazgo = plan.hallazgos.find(h => h.id === planHallazgo.hallazgoId);
        if (!hallazgo) return null;

        return (
          <Card key={planHallazgo.hallazgoId} className="p-6">
            {/* Hallazgo */}
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-black">{hallazgo.codigo}</Badge>
                <Badge style={{
                  background: hallazgo.tipo === 'No Conformidad' ? '#EF4444' :
                             hallazgo.tipo === 'Observación' ? '#3B82F6' : '#10B981',
                  color: '#FFF'
                }}>
                  {hallazgo.tipo}
                </Badge>
                <Badge style={{
                  background: hallazgo.gravedad === 'Crítico' ? '#EF4444' :
                             hallazgo.gravedad === 'Mayor' ? '#F97316' : '#F59E0B',
                  color: '#FFF'
                }}>
                  {hallazgo.gravedad}
                </Badge>
              </div>
              <h4 className="font-bold text-gray-900">{hallazgo.titulo}</h4>
            </div>

            {/* Causas Raíz */}
            <div className="mb-4">
              <h5 className="text-sm font-bold text-gray-900 mb-3">Análisis de Causas Raíz</h5>
              <div className="space-y-2">
                {planHallazgo.analisisCausasRaiz.map((causa) => (
                  <div key={causa.id} className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs">{causa.categoria}</Badge>
                      <p className="text-sm text-amber-900 flex-1">{causa.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones Correctivas */}
            <div>
              <h5 className="text-sm font-bold text-gray-900 mb-3">
                Acciones Correctivas ({planHallazgo.accionesCorrectivas.length})
              </h5>
              <div className="space-y-3">
                {planHallazgo.accionesCorrectivas.map((accion) => (
                  <div key={accion.id} className="p-4 rounded-lg border" style={{ background: '#F9FAFB' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge style={{
                            background: accion.tipo === 'Correctiva' ? '#EF4444' :
                                       accion.tipo === 'Preventiva' ? '#3B82F6' : '#10B981',
                            color: '#FFF'
                          }}>
                            {accion.tipo}
                          </Badge>
                          <Badge style={{
                            background: accion.estado === 'Completada' ? '#10B981' :
                                       accion.estado === 'En Proceso' ? '#F59E0B' : '#6B7280',
                            color: '#FFF'
                          }}>
                            {accion.estado}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-2">{accion.descripcion}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <p className="text-gray-600">Responsable</p>
                        <p className="font-bold text-gray-900">{accion.responsable}</p>
                        <p className="text-gray-600">{accion.cargoResponsable}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Contacto</p>
                        <p className="text-gray-900">{accion.emailResponsable}</p>
                        <p className="text-gray-900">{accion.telefonoResponsable}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Inicio - Fin</p>
                        <p className="font-bold text-gray-900">{accion.fechaInicio} → {accion.fechaFin}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Verificación</p>
                        <p className="font-bold text-gray-900">{accion.fechaVerificacion}</p>
                      </div>
                    </div>

                    {accion.indicadorCumplimiento && (
                      <div className="p-2 rounded" style={{ background: '#DBEAFE' }}>
                        <p className="text-xs font-bold text-blue-900 uppercase">Indicador</p>
                        <p className="text-sm text-blue-800">{accion.indicadorCumplimiento}</p>
                      </div>
                    )}

                    {accion.avance > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Avance</span>
                          <span className="font-bold text-gray-900">{accion.avance}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${accion.avance}%`,
                              background: accion.avance === 100 ? '#10B981' : '#3B82F6'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </motion.div>
  );
}

// ============ PESTAÑA: RECURSOS ============

function PestanaRecursos({ plan }: { plan: PlanMejoramiento }) {
  const todosRecursos = plan.planPorHallazgo.flatMap(p =>
    p.accionesCorrectivas.flatMap(a => a.recursosNecesarios)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-600">Humanos</p>
          <p className="text-2xl font-black text-gray-900">{plan.resumenRecursos.totalHumanos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Financiero</p>
          <p className="text-2xl font-black text-green-600">{plan.resumenRecursos.totalFinanciero}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Tecnológico</p>
          <p className="text-2xl font-black text-blue-600">{plan.resumenRecursos.totalTecnologico}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Material</p>
          <p className="text-2xl font-black text-purple-600">{plan.resumenRecursos.totalMaterial}</p>
        </Card>
      </div>

      {/* Lista de Recursos */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Detalle de Recursos ({todosRecursos.length})
        </h3>

        <div className="space-y-3">
          {todosRecursos.map((recurso) => (
            <div key={recurso.id} className="p-4 rounded-lg border" style={{ background: '#F9FAFB' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge style={{
                      background: recurso.tipo === 'Humano' ? '#3B82F6' :
                                 recurso.tipo === 'Financiero' ? '#10B981' :
                                 recurso.tipo === 'Tecnológico' ? '#8B5CF6' : '#F59E0B',
                      color: '#FFF'
                    }}>
                      {recurso.tipo}
                    </Badge>
                  </div>
                  <p className="font-bold text-gray-900 mb-1">{recurso.descripcion}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                    <div>
                      <p className="text-gray-600">Cantidad</p>
                      <p className="font-bold text-gray-900">{recurso.cantidad}</p>
                    </div>
                    {recurso.valorEstimado && (
                      <div>
                        <p className="text-gray-600">Valor Estimado</p>
                        <p className="font-bold text-green-900">{recurso.valorEstimado}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 italic">{recurso.justificacion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ PESTAÑA: REVISIONES ============

function PestanaRevisiones({ plan }: { plan: PlanMejoramiento }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Historial de Revisiones OCI ({plan.revisionesOCI.length})
        </h3>

        <div className="space-y-3">
          {plan.revisionesOCI.map((revision, index) => (
            <div
              key={revision.id}
              className="p-4 rounded-lg border-l-4"
              style={{
                background: '#F9FAFB',
                borderLeftColor: revision.decision === 'Aprobado' ? '#10B981' :
                                revision.decision === 'Rechazado' ? '#EF4444' : '#F59E0B'
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge style={{
                      background: revision.decision === 'Aprobado' ? '#10B981' :
                                 revision.decision === 'Rechazado' ? '#EF4444' : '#F59E0B',
                      color: '#FFF'
                    }}>
                      {revision.decision}
                    </Badge>
                    {index === plan.revisionesOCI.length - 1 && (
                      <Badge style={{ background: '#8B5CF6', color: '#FFF' }}>Más reciente</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{revision.comentarios}</p>
                  {revision.observaciones && (
                    <p className="text-xs text-gray-600 italic">{revision.observaciones}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {revision.revisor} - {revision.cargo}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {revision.fecha}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {revision.hora}
                </span>
              </div>
            </div>
          ))}

          {plan.revisionesOCI.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay revisiones registradas</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA: EDITOR (placeholder) ============

function EditorPlanView({ plan, modo, onGuardar, onCancelar }: any) {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-gray-900 mb-4">
        {modo === 'crear' ? 'Nuevo Plan de Mejoramiento' : 'Editar Plan de Mejoramiento'}
      </h2>
      <p className="text-gray-600 mb-6">
        Editor completo de plan de mejoramiento (implementación pendiente)
      </p>
      <div className="flex gap-3">
        <Button onClick={onCancelar} variant="outline">
          Cancelar
        </Button>
        <Button onClick={() => onGuardar(plan)} style={{ background: '#10B981' }}>
          Guardar
        </Button>
      </div>
    </Card>
  );
}

// ============ MODALES ============

function ModalEnviarOCI({ plan, onConfirmar, onCerrar }: any) {
  return (
    <Modal titulo="Enviar Plan a OCI" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          ¿Está seguro de enviar el plan de mejoramiento <strong>{plan.codigo}</strong> a la Oficina de Control Interno para revisión?
        </p>

        <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
          <p className="text-xs text-amber-900">
            Una vez enviado, no podrá realizar modificaciones hasta que la OCI revise y emita concepto.
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onConfirmar} className="flex-1" style={{ background: '#3B82F6' }}>
            <Send className="w-4 h-4 mr-2" />
            Enviar a OCI
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalRevisarPlan({ plan, onRevisar, onCerrar }: any) {
  const [decision, setDecision] = useState<'Aprobado' | 'Rechazado' | 'Solicita Ajustes'>('Aprobado');
  const [comentarios, setComentarios] = useState('');

  return (
    <Modal titulo="Revisar Plan de Mejoramiento" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Decisión <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setDecision('Aprobado')}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                decision === 'Aprobado' ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-bold text-gray-900">Aprobar Plan</span>
              </div>
            </button>

            <button
              onClick={() => setDecision('Solicita Ajustes')}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                decision === 'Solicita Ajustes' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-gray-900">Solicitar Ajustes</span>
              </div>
            </button>

            <button
              onClick={() => setDecision('Rechazado')}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                decision === 'Rechazado' ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-gray-900">Rechazar Plan</span>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Comentarios <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Ingrese sus comentarios y observaciones..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onRevisar(decision, comentarios)}
            disabled={!comentarios.trim()}
            className="flex-1"
            style={{ background: '#10B981' }}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Confirmar Revisión
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
