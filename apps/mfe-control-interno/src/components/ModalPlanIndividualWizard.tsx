/**
 * WIZARD DE CREACIÓN DE PLAN INDIVIDUAL
 * Integración Fase 2 COMPLETA: Pre-carga datos desde contexto global
 * Proceso paso a paso para definir alcance, objetivos, riesgos, criterios y confirmar
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Target,
  AlertTriangle,
  CheckCircle,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  Building2,
  MapPin,
  Shield
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner';
import { PlanIndividualAuditoria, CriterioAuditoria, MiembroEquipo, DocumentoOCI } from './PlanIndividualAuditoria';

// ============ INTEGRACIÓN FASE 2 ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

interface ModalPlanIndividualWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (plan: PlanIndividualAuditoria) => void;
  auditoriaBase?: any; // Auditoría seleccionada del programa
}

// ============ TEMPLATES ============

const TEMPLATES_ALCANCE: Record<string, string> = {
  'Gestión Financiera': `La auditoría comprende la revisión del periodo [PERIODO], abarcando los siguientes aspectos:

• Ejecución presupuestal y cumplimiento de apropiaciones
• Gestión de caja menor y fondos fijos
• Conciliaciones bancarias y estados financieros
• Comprobantes de egreso y soportes documentales
• Cumplimiento de normatividad aplicable en materia financiera

La auditoría se realizará mediante revisión documental, pruebas de cumplimiento y entrevistas con personal responsable.`,

  'Gestión Contractual': `La auditoría abarca la revisión de procesos contractuales del periodo [PERIODO], incluyendo:

• Procesos de selección y contratación
• Cumplimiento de requisitos legales (Ley 80/1993, Ley 1150/2007)
• Supervisión e interventoría de contratos
• Liquidación y cierre de contratos
• Gestión de riesgos contractuales

Se evaluará mediante análisis documental, verificación de cumplimiento normativo y entrevistas.`,

  'Gestión de Talento Humano': `La auditoría comprende la revisión de procesos de gestión humana del periodo [PERIODO]:

• Procesos de selección y vinculación de personal
• Evaluación de desempeño y gestión del talento
• Cumplimiento de normatividad laboral
• Capacitación y desarrollo del personal
• Sistema de seguridad y salud en el trabajo

Metodología: Revisión documental, encuestas y entrevistas al personal.`
};

const TEMPLATES_OBJETIVOS: Record<string, string[]> = {
  'Gestión Financiera': [
    'Verificar el cumplimiento de la normatividad vigente en materia financiera',
    'Evaluar la efectividad de los controles internos implementados en procesos financieros',
    'Identificar riesgos asociados a la gestión de recursos financieros',
    'Recomendar mejoras en los procesos financieros de la entidad'
  ],
  'Gestión Contractual': [
    'Verificar el cumplimiento de la Ley 80/1993 y Ley 1150/2007 en procesos contractuales',
    'Evaluar la eficacia de la supervisión e interventoría de contratos',
    'Identificar oportunidades de mejora en la gestión contractual',
    'Verificar la adecuada gestión de riesgos contractuales'
  ],
  'Gestión de Talento Humano': [
    'Verificar el cumplimiento de normatividad laboral vigente',
    'Evaluar la efectividad de procesos de selección y vinculación',
    'Analizar el sistema de evaluación de desempeño',
    'Verificar el cumplimiento del plan de capacitación'
  ]
};

const TEMPLATES_RIESGOS: Record<string, string[]> = {
  'Gestión Financiera': [
    'Riesgo de malversación de fondos públicos',
    'Riesgo de incumplimiento normativo (Ley 819/2003)',
    'Riesgo operacional por falta de segregación de funciones',
    'Riesgo de información financiera no confiable'
  ],
  'Gestión Contractual': [
    'Riesgo de incumplimiento contractual',
    'Riesgo de falta de supervisión adecuada',
    'Riesgo legal por incumplimiento normativo',
    'Riesgo de sobrecostos en ejecución contractual'
  ],
  'Gestión de Talento Humano': [
    'Riesgo de contratación de personal no idóneo',
    'Riesgo de incumplimiento normativo laboral',
    'Riesgo de clima organizacional deficiente',
    'Riesgo de accidentes laborales'
  ]
};

const CRITERIOS_BASE: Record<string, CriterioAuditoria[]> = {
  'Gestión Financiera': [
    {
      id: 'crit-fin-1',
      descripcion: 'Cumplimiento Ley 819 de 2003 - Responsabilidad Fiscal',
      normativaBase: 'Ley 819/2003',
      obligatorio: true,
      metodologia: 'Revisión documental de ejecución presupuestal y análisis de cumplimiento'
    },
    {
      id: 'crit-fin-2',
      descripcion: 'Efectividad de controles internos financieros',
      normativaBase: 'Ley 87/1993',
      obligatorio: true,
      metodologia: 'Pruebas de cumplimiento y walkthrough de procesos'
    },
    {
      id: 'crit-fin-3',
      descripcion: 'Confiabilidad de información financiera',
      normativaBase: 'Resolución 193/2016 CGN',
      obligatorio: true,
      metodologia: 'Revisión analítica y verificación de soportes'
    }
  ],
  'Gestión Contractual': [
    {
      id: 'crit-cont-1',
      descripcion: 'Cumplimiento Ley 80 de 1993 - Estatuto de Contratación',
      normativaBase: 'Ley 80/1993',
      obligatorio: true,
      metodologia: 'Revisión de expedientes contractuales y verificación de requisitos'
    },
    {
      id: 'crit-cont-2',
      descripcion: 'Aplicación Ley 1150 de 2007',
      normativaBase: 'Ley 1150/2007',
      obligatorio: true,
      metodologia: 'Análisis de procesos de selección en plataforma SECOP'
    },
    {
      id: 'crit-cont-3',
      descripcion: 'Supervisión e interventoría de contratos',
      normativaBase: 'Ley 1474/2011',
      obligatorio: true,
      metodologia: 'Entrevistas y revisión de informes de supervisión'
    }
  ],
  'Gestión de Talento Humano': [
    {
      id: 'crit-th-1',
      descripcion: 'Cumplimiento normatividad laboral',
      normativaBase: 'Código Sustantivo del Trabajo',
      obligatorio: true,
      metodologia: 'Revisión de contratos y liquidaciones'
    },
    {
      id: 'crit-th-2',
      descripcion: 'Procesos de selección meritocráticos',
      normativaBase: 'Ley 909/2004',
      obligatorio: true,
      metodologia: 'Análisis de procesos de selección y documentación'
    }
  ]
};

export function ModalPlanIndividualWizard({
  isOpen,
  onClose,
  onCrear,
  auditoriaBase
}: ModalPlanIndividualWizardProps) {
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);

  // Datos del formulario
  const [alcance, setAlcance] = useState('');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [nuevoObjetivo, setNuevoObjetivo] = useState('');
  const [riesgos, setRiesgos] = useState<string[]>([]);
  const [nuevoRiesgo, setNuevoRiesgo] = useState('');
  const [criterios, setCriterios] = useState<CriterioAuditoria[]>([]);
  const [nuevoCriterio, setNuevoCriterio] = useState<Partial<CriterioAuditoria>>({});
  const [equipoRevisado, setEquipoRevisado] = useState(true);
  const [observaciones, setObservaciones] = useState('');

  // ============ INTEGRACIÓN FASE 2 ============
  const { auditoria } = useIntegracionControlInterno();

  // ✅ DATOS BASE: Pre-cargados desde contexto global o mock
  const datosBase = auditoria ? {
    codigo: auditoria.codigo,
    procesoAuditable: auditoria.proceso.nombre,
    tipoProceso: auditoria.proceso.tipo as 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación',
    tipoSede: 'Sede Principal' as const,
    nivelRiesgo: auditoria.nivelesRiesgo.inherente as 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO',
    auditorLider: auditoria.auditorLider.nombre,
    equipoAuditor: auditoria.equipoAuditor.map(m => ({
      nombre: m.nombre,
      rol: m.rol as 'Auditor Líder' | 'Auditor' | 'Apoyo',
      cargaTrabajo: 100
    })),
    fechas: {
      planeacion: {
        inicio: auditoria.cronograma.fechaInicio,
        fin: auditoria.cronograma.hitos.find(h => h.nombre === 'Planeación')?.fecha || auditoria.cronograma.fechaInicio
      },
      ejecucion: {
        inicio: auditoria.cronograma.hitos.find(h => h.nombre === 'Ejecución')?.fecha || auditoria.cronograma.fechaInicio,
        fin: auditoria.cronograma.hitos.find(h => h.nombre === 'Fin Ejecución')?.fecha || auditoria.cronograma.fechaFin
      },
      comunicacion: {
        inicio: auditoria.cronograma.hitos.find(h => h.nombre === 'Comunicación')?.fecha || auditoria.cronograma.fechaFin,
        fin: auditoria.cronograma.fechaFin
      }
    },
    responsableArea: auditoria.proceso.responsable,
    emailResponsable: auditoria.proceso.emailResponsable || 'responsable@esap.edu.co'
  } : {
    // Mock de datos base si no hay auditoría seleccionada
    codigo: 'AUD-2025-001',
    procesoAuditable: 'Gestión Financiera',
    tipoProceso: 'Apoyo' as const,
    tipoSede: 'Sede Principal' as const,
    nivelRiesgo: 'CRÍTICO' as const,
    auditorLider: 'Mario Oswaldo Bernal Rodriguez',
    equipoAuditor: [
      { nombre: 'Catalina Rubio', rol: 'Auditor' as const, cargaTrabajo: 100 },
      { nombre: 'Sandra Montero', rol: 'Apoyo' as const, cargaTrabajo: 50 }
    ],
    fechas: {
      planeacion: { inicio: '2025-01-15', fin: '2025-01-30' },
      ejecucion: { inicio: '2025-02-01', fin: '2025-03-01' },
      comunicacion: { inicio: '2025-03-03', fin: '2025-03-18' }
    },
    responsableArea: 'Sandra Montero',
    emailResponsable: 'smontero@esap.edu.co'
  };

  // ✅ PRE-CARGAR datos si vienen del contexto
  useEffect(() => {
    if (auditoria) {
      // Pre-cargar alcance si existe
      if (auditoria.alcance) {
        setAlcance(auditoria.alcance);
      }
      
      // Pre-cargar objetivos si existen
      if (auditoria.objetivos && auditoria.objetivos.length > 0) {
        setObjetivos(auditoria.objetivos.map(obj => obj.descripcion));
      }
      
      // Pre-cargar riesgos si existen
      if (auditoria.riesgosIdentificados && auditoria.riesgosIdentificados.length > 0) {
        setRiesgos(auditoria.riesgosIdentificados);
      }
      
      // Pre-cargar criterios si existen
      if (auditoria.criterios && auditoria.criterios.length > 0) {
        const criteriosFormateados: CriterioAuditoria[] = auditoria.criterios.map(crit => ({
          id: crit.id,
          descripcion: crit.descripcion,
          normativaBase: crit.norma,
          obligatorio: true,
          metodologia: crit.referencia || 'Revisión documental'
        }));
        setCriterios(criteriosFormateados);
      }
      
      // Pre-cargar observaciones si existen
      if (auditoria.observaciones) {
        setObservaciones(auditoria.observaciones);
      }
    }
  }, [auditoria]);

  const aplicarTemplate = () => {
    const proceso = datosBase.procesoAuditable;
    
    // Aplicar template de alcance
    if (TEMPLATES_ALCANCE[proceso]) {
      setAlcance(TEMPLATES_ALCANCE[proceso].replace('[PERIODO]', 'enero - junio 2025'));
      toast.success('Template de alcance aplicado');
    }
    
    // Aplicar objetivos
    if (TEMPLATES_OBJETIVOS[proceso]) {
      setObjetivos(TEMPLATES_OBJETIVOS[proceso]);
    }
    
    // Aplicar riesgos
    if (TEMPLATES_RIESGOS[proceso]) {
      setRiesgos(TEMPLATES_RIESGOS[proceso]);
    }
    
    // Aplicar criterios base
    if (CRITERIOS_BASE[proceso]) {
      setCriterios(CRITERIOS_BASE[proceso]);
    }
  };

  const agregarObjetivo = () => {
    if (nuevoObjetivo.trim()) {
      setObjetivos([...objetivos, nuevoObjetivo.trim()]);
      setNuevoObjetivo('');
    }
  };

  const eliminarObjetivo = (index: number) => {
    setObjetivos(objetivos.filter((_, i) => i !== index));
  };

  const agregarRiesgo = () => {
    if (nuevoRiesgo.trim()) {
      setRiesgos([...riesgos, nuevoRiesgo.trim()]);
      setNuevoRiesgo('');
    }
  };

  const eliminarRiesgo = (index: number) => {
    setRiesgos(riesgos.filter((_, i) => i !== index));
  };

  const agregarCriterio = () => {
    if (nuevoCriterio.descripcion && nuevoCriterio.normativaBase && nuevoCriterio.metodologia) {
      const criterio: CriterioAuditoria = {
        id: `crit-${Date.now()}`,
        descripcion: nuevoCriterio.descripcion,
        normativaBase: nuevoCriterio.normativaBase,
        obligatorio: nuevoCriterio.obligatorio || false,
        metodologia: nuevoCriterio.metodologia
      };
      setCriterios([...criterios, criterio]);
      setNuevoCriterio({});
    }
  };

  const eliminarCriterio = (id: string) => {
    setCriterios(criterios.filter(c => c.id !== id));
  };

  const validarPaso = () => {
    switch (paso) {
      case 2:
        return alcance.length >= 50;
      case 3:
        return objetivos.length >= 2;
      case 4:
        return riesgos.length >= 2;
      case 5:
        return criterios.length >= 2;
      case 6:
        return equipoRevisado;
      default:
        return true;
    }
  };

  const handleSiguiente = () => {
    if (!validarPaso()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setPaso(paso + 1);
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generar documentos OCI
    const documentos: DocumentoOCI[] = [
      {
        id: `doc-${Date.now()}-1`,
        tipo: 'anuncio',
        numero: `OCI-AN-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-2025`,
        titulo: 'Oficio de Anuncio de Auditoría',
        fecha: new Date().toISOString().split('T')[0],
        contenido: '',
        firmado: false
      },
      {
        id: `doc-${Date.now()}-2`,
        tipo: 'carta_representacion',
        numero: `OCI-CR-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-2025`,
        titulo: 'Carta de Representación',
        fecha: new Date().toISOString().split('T')[0],
        contenido: '',
        firmado: false
      },
      {
        id: `doc-${Date.now()}-3`,
        tipo: 'programa_individual',
        numero: `OCI-PI-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-2025`,
        titulo: 'Programa Individual de Auditoría',
        fecha: new Date().toISOString().split('T')[0],
        contenido: '',
        firmado: false
      }
    ];

    const nuevoPlan: PlanIndividualAuditoria = {
      id: `plan-${Date.now()}`,
      codigo: `PIA-2025-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
      auditoriaOrigenId: '1',
      procesoAuditable: datosBase.procesoAuditable,
      tipoProceso: datosBase.tipoProceso,
      tipoSede: datosBase.tipoSede,
      nivelRiesgo: datosBase.nivelRiesgo,
      alcance,
      objetivos,
      riesgos,
      criteriosAuditoria: criterios,
      normativaAplicable: [...new Set(criterios.map(c => c.normativaBase))],
      auditorLider: datosBase.auditorLider,
      equipoAuditor: datosBase.equipoAuditor,
      fechas: datosBase.fechas,
      responsableArea: datosBase.responsableArea,
      emailResponsable: datosBase.emailResponsable,
      documentosOCI: documentos,
      notificaciones: [],
      estado: 'Borrador',
      fechaCreacion: new Date().toISOString().split('T')[0],
      creadoPor: datosBase.auditorLider,
      observaciones
    };

    onCrear(nuevoPlan);
    
    setGuardando(false);
    onClose();
    
    // Resetear
    setPaso(1);
    setAlcance('');
    setObjetivos([]);
    setRiesgos([]);
    setCriterios([]);
    setObservaciones('');
  };

  const pasos = [
    { numero: 1, titulo: 'Datos Base', icono: FileText },
    { numero: 2, titulo: 'Alcance', icono: Target },
    { numero: 3, titulo: 'Objetivos', icono: CheckCircle },
    { numero: 4, titulo: 'Riesgos', icono: AlertTriangle },
    { numero: 5, titulo: 'Criterios', icono: Shield },
    { numero: 6, titulo: 'Revisión', icono: Eye }
  ];

  const getRiesgoColor = (riesgo: string) => {
    switch (riesgo) {
      case 'CRÍTICO': return { bg: '#DC2626', text: '#FFFFFF' };
      case 'ALTO': return { bg: '#F59E0B', text: '#FFFFFF' };
      case 'MEDIO': return { bg: '#3B82F6', text: '#FFFFFF' };
      case 'BAJO': return { bg: '#10B981', text: '#FFFFFF' };
      default: return { bg: '#6B7280', text: '#FFFFFF' };
    }
  };

  const colorRiesgo = getRiesgoColor(datosBase.nivelRiesgo);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Plan Individual de Auditoría"
      subtitle={`Paso ${paso} de ${pasos.length}`}
      maxWidth="4xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          {paso > 1 && (
            <Button variant="outline" onClick={handleAnterior} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
          )}
          {paso < pasos.length ? (
            <Button
              onClick={handleSiguiente}
              disabled={!validarPaso()}
              className="flex-1"
              style={{ backgroundColor: validarPaso() ? '#003DA5' : '#9CA3AF', color: '#FFFFFF' }}
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleGuardar}
              disabled={guardando || !validarPaso()}
              className="flex-1"
              style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
            >
              {guardando ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Plan Individual
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between">
          {pasos.map((p, index) => (
            <div key={p.numero} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    backgroundColor: paso >= p.numero ? '#003DA5' : '#E5E7EB',
                    color: paso >= p.numero ? '#FFFFFF' : '#9CA3AF'
                  }}
                >
                  {paso > p.numero ? <CheckCircle className="w-5 h-5" /> : p.numero}
                </div>
                <span className="text-xs mt-1 text-center hidden sm:block" style={{ color: paso >= p.numero ? '#003DA5' : '#9CA3AF' }}>
                  {p.titulo}
                </span>
              </div>
              {index < pasos.length - 1 && (
                <div
                  className="h-1 flex-1 mx-2"
                  style={{ backgroundColor: paso > p.numero ? '#003DA5' : '#E5E7EB' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Contenido por paso */}
        <AnimatePresence mode="wait">
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* PASO 1: Datos Base */}
            {paso === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl p-6" style={{ backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB' }}>
                  <h3 className="font-bold text-lg mb-4" style={{ color: '#1F2937' }}>
                    Datos de la Auditoría (heredados del Programa Anual)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Código</label>
                      <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                        {datosBase.codigo}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Tipo</label>
                      <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                        {datosBase.tipoProceso}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Proceso Auditable</label>
                      <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                        {datosBase.procesoAuditable}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Sede</label>
                      <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                        <Building2 className="w-4 h-4" />
                        {datosBase.tipoSede}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Nivel de Riesgo</label>
                      <Badge style={{ backgroundColor: colorRiesgo.bg, color: colorRiesgo.text }}>
                        {datosBase.nivelRiesgo}
                      </Badge>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Auditor Líder</label>
                      <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                        {typeof datosBase.auditorLider === 'string' ? datosBase.auditorLider : datosBase.auditorLider?.nombre || 'No asignado'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Equipo Auditor</label>
                      <div className="space-y-2">
                        {datosBase.equipoAuditor.map((miembro, idx) => (
                          <div key={idx} className="px-4 py-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                            <span>{miembro.nombre}</span>
                            <Badge variant="outline">{miembro.rol}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-1" style={{ color: '#6B7280' }}>Cronograma</label>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Planeación: {new Date(datosBase.fechas.planeacion.inicio).toLocaleDateString('es-CO')} - {new Date(datosBase.fechas.planeacion.fin).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Ejecución: {new Date(datosBase.fechas.ejecucion.inicio).toLocaleDateString('es-CO')} - {new Date(datosBase.fechas.ejecucion.fin).toLocaleDateString('es-CO')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #003DA5' }}>
                  <p className="text-sm" style={{ color: '#1E40AF' }}>
                    ℹ️ Estos datos se heredan automáticamente de la auditoría seleccionada del Programa Anual y servirán de base para el Plan Individual.
                  </p>
                </div>
              </div>
            )}

            {/* PASO 2: Alcance */}
            {paso === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
                    Definición del Alcance
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={aplicarTemplate}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Usar Template
                  </Button>
                </div>

                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Define el alcance de la auditoría, especificando qué se va a auditar, el periodo a revisar y la metodología a utilizar.
                </p>

                <textarea
                  value={alcance}
                  onChange={(e) => setAlcance(e.target.value)}
                  placeholder="Describe el alcance de la auditoría (mínimo 50 caracteres)..."
                  rows={12}
                  className="w-full px-4 py-3 border-2 rounded-lg resize-none text-sm"
                  style={{ borderColor: alcance.length >= 50 ? '#10B981' : '#E5E7EB' }}
                />

                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: alcance.length >= 50 ? '#10B981' : '#6B7280' }}>
                    {alcance.length} / 50 caracteres mínimos
                  </span>
                  {alcance.length >= 50 && (
                    <span className="flex items-center gap-1" style={{ color: '#10B981' }}>
                      <CheckCircle className="w-4 h-4" />
                      Completo
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PASO 3: Objetivos */}
            {paso === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
                    Objetivos de la Auditoría
                  </h3>
                  {objetivos.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={aplicarTemplate}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Usar Template
                    </Button>
                  )}
                </div>

                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Define al menos 2 objetivos específicos que la auditoría debe alcanzar.
                </p>

                <div className="space-y-3">
                  {objetivos.map((obj, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}>
                        {index + 1}
                      </div>
                      <p className="flex-1 text-sm">{obj}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarObjetivo(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoObjetivo}
                    onChange={(e) => setNuevoObjetivo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && agregarObjetivo()}
                    placeholder="Escribe un objetivo y presiona Enter..."
                    className="flex-1 px-4 py-2 border-2 rounded-lg text-sm"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                  <Button onClick={agregarObjetivo} style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {objetivos.length >= 2 && (
                  <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#D1FAE5' }}>
                    <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    <span className="text-sm font-bold" style={{ color: '#065F46' }}>
                      {objetivos.length} objetivos definidos
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PASO 4: Riesgos */}
            {paso === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
                    Riesgos Identificados
                  </h3>
                  {riesgos.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={aplicarTemplate}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Usar Template
                    </Button>
                  )}
                </div>

                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Identifica al menos 2 riesgos asociados al proceso que será auditado.
                </p>

                <div className="space-y-3">
                  {riesgos.map((riesgo, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                      <p className="flex-1 text-sm">{riesgo}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarRiesgo(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoRiesgo}
                    onChange={(e) => setNuevoRiesgo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && agregarRiesgo()}
                    placeholder="Describe un riesgo y presiona Enter..."
                    className="flex-1 px-4 py-2 border-2 rounded-lg text-sm"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                  <Button onClick={agregarRiesgo} style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {riesgos.length >= 2 && (
                  <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#D1FAE5' }}>
                    <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    <span className="text-sm font-bold" style={{ color: '#065F46' }}>
                      {riesgos.length} riesgos identificados
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PASO 5: Criterios */}
            {paso === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
                    Criterios de Auditoría
                  </h3>
                  {criterios.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={aplicarTemplate}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Usar Template
                    </Button>
                  )}
                </div>

                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Define al menos 2 criterios de auditoría con su normativa base y metodología.
                </p>

                <div className="space-y-3">
                  {criterios.map((criterio) => (
                    <div key={criterio.id} className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                          <span className="font-bold text-sm" style={{ color: '#1F2937' }}>{criterio.descripcion}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarCriterio(criterio.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-bold" style={{ color: '#6B7280' }}>Normativa:</span> {criterio.normativaBase}
                        </div>
                        <div>
                          <span className="font-bold" style={{ color: '#6B7280' }}>Metodología:</span> {criterio.metodologia}
                        </div>
                      </div>
                      {criterio.obligatorio && (
                        <Badge className="mt-2" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>Obligatorio</Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Formulario de nuevo criterio */}
                <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#F3F4F6', border: '2px dashed #9CA3AF' }}>
                  <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>Agregar Nuevo Criterio</h4>
                  <input
                    type="text"
                    value={nuevoCriterio.descripcion || ''}
                    onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, descripcion: e.target.value })}
                    placeholder="Descripción del criterio..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={nuevoCriterio.normativaBase || ''}
                      onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, normativaBase: e.target.value })}
                      placeholder="Normativa base..."
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={nuevoCriterio.metodologia || ''}
                      onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, metodologia: e.target.value })}
                      placeholder="Metodología..."
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={nuevoCriterio.obligatorio || false}
                      onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, obligatorio: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span style={{ color: '#6B7280' }}>Criterio obligatorio</span>
                  </label>
                  <Button
                    onClick={agregarCriterio}
                    disabled={!nuevoCriterio.descripcion || !nuevoCriterio.normativaBase || !nuevoCriterio.metodologia}
                    className="w-full"
                    style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Criterio
                  </Button>
                </div>

                {criterios.length >= 2 && (
                  <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#D1FAE5' }}>
                    <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    <span className="text-sm font-bold" style={{ color: '#065F46' }}>
                      {criterios.length} criterios definidos ({criterios.filter(c => c.obligatorio).length} obligatorios)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PASO 6: Revisión Final */}
            {paso === 6 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
                  Revisión y Confirmación
                </h3>

                <div className="space-y-3">
                  {/* Resumen Alcance */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: '#1F2937' }}>
                      <Target className="w-4 h-4" style={{ color: '#003DA5' }} />
                      Alcance
                    </h4>
                    <p className="text-sm" style={{ color: '#6B7280' }}>{alcance.substring(0, 150)}...</p>
                  </div>

                  {/* Resumen Objetivos */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: '#1F2937' }}>
                      <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                      Objetivos ({objetivos.length})
                    </h4>
                    <ul className="text-sm space-y-1" style={{ color: '#6B7280' }}>
                      {objetivos.slice(0, 3).map((obj, idx) => (
                        <li key={idx}>• {obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Resumen Riesgos */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: '#1F2937' }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      Riesgos Identificados ({riesgos.length})
                    </h4>
                    <ul className="text-sm space-y-1" style={{ color: '#92400E' }}>
                      {riesgos.slice(0, 3).map((riesgo, idx) => (
                        <li key={idx}>• {riesgo}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Resumen Criterios */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#EFF6FF' }}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: '#1F2937' }}>
                      <Shield className="w-4 h-4" style={{ color: '#003DA5' }} />
                      Criterios de Auditoría ({criterios.length})
                    </h4>
                    <div className="text-sm space-y-1" style={{ color: '#1E40AF' }}>
                      {criterios.slice(0, 2).map((crit, idx) => (
                        <div key={idx}>• {crit.descripcion} ({crit.normativaBase})</div>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="text-sm font-bold block mb-2" style={{ color: '#6B7280' }}>
                      Observaciones Adicionales (Opcional)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Agrega cualquier observación adicional..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 rounded-lg text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

                  {/* Confirmación */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#D1FAE5', borderLeft: '4px solid #10B981' }}>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#065F46' }}>
                          ¡Todo listo para crear el Plan Individual!
                        </p>
                        <p className="text-sm" style={{ color: '#065F46' }}>
                          Se generarán automáticamente: Oficio de Anuncio, Carta de Representación y Programa Individual de Auditoría.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ResponsiveModal>
  );
}