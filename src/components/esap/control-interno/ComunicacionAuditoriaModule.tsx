import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck, 
  Send, 
  Clock, 
  Users, 
  Calendar,
  Download,
  Eye,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  X,
  Upload,
<<<<<<< Updated upstream
  Trash2
=======
  Trash2,
  Target,
  ClipboardCheck,
  BookOpen,
  Pencil,
  Plus
>>>>>>> Stashed changes
} from 'lucide-react';
import type { EditorOverridesInforme } from './services/exportarPDFInformeAuditoria';
import { TABLAS_ESTRUCTURALES_DEF } from './services/exportarPDFInformeAuditoria';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL } from '../gestion-legal/design-system/InputSIGL';
import { TextareaSIGL } from '../gestion-legal/design-system/TextareaSIGL';
import { toast } from 'sonner@2.0.3';

// ====================================
// TIPOS Y DATOS
// ====================================

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  proceso: string;
  auditorLider: string;
  fechaInicio: string;
  fechaFin: string;
  esTerritoriales: boolean;
  hallazgos: Hallazgo[];
  stage: 'EJECUCION' | 'COMUNICACION' | 'SEGUIMIENTO' | 'FINALIZADA';
}

interface Hallazgo {
  id: string;
  titulo: string;
  gravedad: 'LEVE' | 'MODERADO' | 'GRAVE';
  descripcion: string;
  causas: string[];
  efectos: string[];
  recomendaciones: string[];
}

interface Controversia {
  id: string;
  hallazgoId: string;
  hallazgoTitulo: string;
  fechaPresentacion: string;
  responsable: string;
  argumentos: string;
  evidencias: string[];
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  resolucion?: string;
  fechaResolucion?: string;
}

interface InformePreliminar {
  fecha: string;
  hallazgos: number;
  graves: number;
  moderados: number;
  leves: number;
  observaciones: string;
  generado: boolean;
}

interface InformeFinal {
  fecha: string;
  controversiasResueltas: number;
  hallazgosAjustados: number;
  plazosPlanMejora: string;
  observacionesFinales: string;
  generado: boolean;
}

interface InformeEjecutivo {
  fecha: string;
  resumenEjecutivo: string;
  aspectosPositivos: string[];
  oportunidadesMejora: string[];
  conclusiones: string;
  generado: boolean;
}

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const ComunicacionAuditoriaModule: React.FC<{ auditoriaId?: string }> = ({ auditoriaId = 'aud-001' }) => {
  // Estado de la auditoría (mock - después se conecta con backend)
  const [auditoria] = useState<Auditoria>({
    id: auditoriaId,
    codigo: 'AUD-2025-005',
    nombre: 'Auditoría Gestión Financiera',
    proceso: 'Gestión Financiera',
    auditorLider: 'Fernando Ávila',
    fechaInicio: '2025-01-15',
    fechaFin: '2025-02-15',
    esTerritoriales: false,
    stage: 'COMUNICACION',
    hallazgos: [
      {
        id: 'h1',
        titulo: 'Falta de conciliaciones bancarias mensuales',
        gravedad: 'GRAVE',
        descripcion: 'No se realizan conciliaciones bancarias de manera mensual...',
        causas: ['Falta de personal', 'Procesos manuales'],
        efectos: ['Riesgo de fraude', 'Información financiera inexacta'],
        recomendaciones: ['Implementar software', 'Capacitar personal']
      },
      {
        id: 'h2',
        titulo: 'Documentación de gastos incompleta',
        gravedad: 'MODERADO',
        descripcion: 'Algunos gastos no tienen toda la documentación soporte...',
        causas: ['Falta de procedimiento claro'],
        efectos: ['Posibles observaciones CGR'],
        recomendaciones: ['Crear checklist de documentos obligatorios']
      },
      {
        id: 'h3',
        titulo: 'Retraso en reportes presupuestales',
        gravedad: 'LEVE',
        descripcion: 'Los reportes se entregan 2-3 días después del plazo...',
        causas: ['Volumen de trabajo'],
        efectos: ['Información no oportuna'],
        recomendaciones: ['Redistribuir carga de trabajo']
      }
    ]
  });

  // Estados del módulo
  const [seccionActual, setSeccionActual] = useState<number>(1);
  const [informePreliminar, setInformePreliminar] = useState<InformePreliminar>({
    fecha: '',
    hallazgos: auditoria.hallazgos.length,
    graves: auditoria.hallazgos.filter(h => h.gravedad === 'GRAVE').length,
    moderados: auditoria.hallazgos.filter(h => h.gravedad === 'MODERADO').length,
    leves: auditoria.hallazgos.filter(h => h.gravedad === 'LEVE').length,
    observaciones: '',
    generado: false
  });

  const [controversias, setControversias] = useState<Controversia[]>([]);
  const [informeFinal, setInformeFinal] = useState<InformeFinal>({
    fecha: '',
    controversiasResueltas: 0,
    hallazgosAjustados: 0,
    plazosPlanMejora: '30',
    observacionesFinales: '',
    generado: false
  });

  const [informeEjecutivo, setInformeEjecutivo] = useState<InformeEjecutivo>({
    fecha: '',
    resumenEjecutivo: '',
    aspectosPositivos: [],
    oportunidadesMejora: [],
    conclusiones: '',
    generado: false
  });

  const [modalControversia, setModalControversia] = useState(false);
  const [modalPreview, setModalPreview] = useState<{ tipo: string; abierto: boolean }>({ tipo: '', abierto: false });
<<<<<<< Updated upstream
=======
  const [modalEditorAbierto, setModalEditorAbierto] = useState(false);
  const [editorOverrides, setEditorOverrides] = useState<EditorOverridesInforme>({});
  /** Tras "Finalizar y Pasar a Seguimiento" se mantiene el mismo modal y se muestran secciones 5 y 6 */
  const [pasamosASeguimiento, setPasamosASeguimiento] = useState(false);
  /** Planes/acciones para verificación OCI (Sección 5). Se recargan al registrar verificación. */
  const [planesParaVerificacion, setPlanesParaVerificacion] = useState<any[]>([]);
  const [loadingVerificacion, setLoadingVerificacion] = useState(false);
  /** Informe de cierre (Sección 6) */
  const [resumenCierre, setResumenCierre] = useState<any>(null);
  const [leccionesAprendidas, setLeccionesAprendidas] = useState('');
  const [recomendacionesFuturas, setRecomendacionesFuturas] = useState('');
  const [loadingInformeCierre, setLoadingInformeCierre] = useState(false);
  const [informeCierreAprobado, setInformeCierreAprobado] = useState(false);
  const enSeguimiento = soloSeguimiento || pasamosASeguimiento || (estadoAuditoriaProp && String(estadoAuditoriaProp).toLowerCase().includes('seguimiento'));

  const { agregarAuditoriaConHallazgos, seleccionarAuditoria, navegarAVerPlan } = useIntegracionAuditoriaPlanes();

  const handleCrearPlanMejoramiento = useCallback(async () => {
    if (hallazgos.length === 0) {
      toast.error('No hay hallazgos para crear el plan de mejoramiento');
      return;
    }
    const hallazgosParaPlan: HallazgoAuditoria[] = hallazgos
      .filter(h => h.estado !== 'retirado')
      .map(h => ({
        id: h.id,
        titulo: h.titulo || h.descripcion?.substring(0, 80) || 'Sin título',
        gravedad: ((h.gravedad || 'MODERADO') === 'CRITICO' ? 'GRAVE' : (h.gravedad || 'MODERADO')) as 'LEVE' | 'MODERADO' | 'GRAVE',
        descripcion: h.descripcion || '',
        causas: h.causas || [],
        efectos: h.efectos || [],
        recomendaciones: h.recomendaciones || []
      }));
    const fechaFinRaw = auditoria.fechaFin || new Date().toISOString().split('T')[0];
    let fechaFin: string;
    if (fechaFinRaw.includes('/')) {
      const [d, m, a] = fechaFinRaw.split('/');
      fechaFin = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      fechaFin = fechaFinRaw.split('T')[0];
    }
    const fechaLimiteObj = new Date(fechaFin);
    if (!isNaN(fechaLimiteObj.getTime())) fechaLimiteObj.setDate(fechaLimiteObj.getDate() + 30);
    const fechaLimiteStr = !isNaN(fechaLimiteObj.getTime())
      ? fechaLimiteObj.toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const auditoriaParaPlan: AuditoriaParaPlan = {
      id,
      codigo: auditoria.codigo || 'AUD',
      nombre: auditoria.nombre || auditoria.proceso || 'Auditoría',
      areaResponsable: (auditoria as any).areaResponsable || (auditoria as any).areaObjetivo || auditoria.proceso || 'N/A',
      responsable: typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : (auditoria.auditorLider as any)?.nombre || 'N/A',
      cargo: typeof auditoria.auditorLider === 'object' && (auditoria.auditorLider as any)?.cargo ? (auditoria.auditorLider as any).cargo : '',
      fechaFinalizacion: fechaFin,
      estadoPlan: 'SIN_PLAN',
      fechaLimitePlan: fechaLimiteStr,
      plazoFormulacion: 30,
      hallazgos: hallazgosParaPlan
    };
    agregarAuditoriaConHallazgos(auditoriaParaPlan);
    seleccionarAuditoria(auditoriaParaPlan);
    toast.success('Ir a crear Plan de Mejoramiento', {
      description: `${hallazgosParaPlan.length} hallazgos vinculados. Complete las acciones correctivas para cada uno.`,
      duration: 5000
    });
  }, [id, auditoria, hallazgos, agregarAuditoriaConHallazgos, seleccionarAuditoria]);

  const handleIrAVerPlan = useCallback(() => {
    // Plan ya existe: navegar a ver plan sin abrir modal de crear
    navegarAVerPlan(id);
  }, [id, navegarAVerPlan]);

  const cargarDatos = useCallback(async () => {
    if (!useAPI) return;
    try {
      setLoading(true);
      const [hallazgosData, estadoData, audData] = await Promise.all([
        controlInternoService.getHallazgosByAuditoria(id),
        controlInternoService.getEstadoComunicacion(id),
        controlInternoService.getAuditoriaById(id).catch(() => null),
      ]);
      const parseCausaEfecto = (obs: string | undefined) => {
        if (!obs) return { causas: [] as string[], efectos: [] as string[] };
        const causas: string[] = [];
        const efectos: string[] = [];
        const causaMatch = obs.match(/CAUSA:\s*([\s\S]*?)(?=EFECTO:|$)/i);
        const efectoMatch = obs.match(/EFECTO:\s*([\s\S]*?)$/i);
        if (causaMatch?.[1]) causas.push(causaMatch[1].trim());
        if (efectoMatch?.[1]) efectos.push(efectoMatch[1].trim());
        return { causas, efectos };
      };
      const h = (hallazgosData || []).map((x: any) => {
        const { causas, efectos } = parseCausaEfecto(x.observacionesControversia);
        const recs = Array.isArray(x.recomendaciones) ? x.recomendaciones : (x.recomendaciones ? [x.recomendaciones] : []);
        return {
        id: x.id,
        codigo: x.codigo,
        titulo: x.titulo || x.descripcion?.substring(0, 80),
        gravedad: (x.categoria === 'critico' ? 'CRITICO' : 'MODERADO') as any,
        descripcion: x.descripcion || '',
        criterioIncumplido: x.criterioIncumplido,
        causas, efectos, recomendaciones: recs,
        estado: x.estado,
        argumentosControversia: x.argumentosControversia || x.observacionesControversia,
        documentoControversiaNombre: x.documentoControversiaNombre,
        decisionAuditor: x.decisionAuditor,
        fundamentacionTecnica: x.fundamentacionTecnica,
        fechaDecision: x.fechaDecision,
      };
      });
      setHallazgos(h);
      setEstadoComunicacion(estadoData);
      setInformePreliminar(prev => ({
        ...prev,
        hallazgos: h.length,
        graves: h.filter((x: Hallazgo) => (x.gravedad || '').toUpperCase() === 'GRAVE' || (x.gravedad || '').toUpperCase() === 'CRITICO').length,
        moderados: h.filter((x: Hallazgo) => (x.gravedad || '').toUpperCase() === 'MODERADO').length,
        leves: h.filter((x: Hallazgo) => (x.gravedad || '').toUpperCase() === 'LEVE').length,
        generado: estadoData?.informePreliminarGenerado ?? false,
      }));
      setInformeFinal(prev => ({ ...prev, generado: estadoData?.informeFinalGenerado ?? false }));
      try {
        const planes = await controlInternoService.getPlanesMejoramiento();
        const planesDeEstaAuditoria = Array.isArray(planes)
          ? planes.filter((p: any) =>
              (p.auditoriaId || p.auditoria_id || p.auditoria?.id || p.hallazgo?.auditoriaId || p.hallazgo?.auditoriaEntity?.id) === id
            )
          : [];
        setPlanCreado(planesDeEstaAuditoria.length > 0);
        if (planesDeEstaAuditoria.length > 0) {
          let totalAcciones = 0;
          let accionesCompletadas = 0;
          const esCompletada = (estado: string) => {
            const e = String(estado || '').toLowerCase();
            return e === 'completada' || e === 'implementada' || e === 'completado' || e === 'implementado';
          };
          for (const plan of planesDeEstaAuditoria) {
            const acciones = plan.acciones || [];
            if (acciones.length > 0) {
              totalAcciones += acciones.length;
              accionesCompletadas += acciones.filter((a: any) => esCompletada(a.estado)).length;
            } else {
              // Fallback: usar totalAcciones/accionesCompletadas del plan si el listado no incluye acciones
              const t = plan.totalAcciones ?? plan.total_acciones ?? 0;
              const c = plan.accionesCompletadas ?? plan.acciones_completadas ?? 0;
              totalAcciones += t;
              accionesCompletadas += c;
            }
          }
          const porcentajeAvance = totalAcciones > 0
            ? Math.round((accionesCompletadas / totalAcciones) * 100)
            : 0;
          setPlanEstadisticas({ totalAcciones, accionesCompletadas, porcentajeAvance });
        } else {
          setPlanEstadisticas(null);
        }
      } catch {
        setPlanCreado(false);
        setPlanEstadisticas(null);
      }
      if (audData) {
        const objTexto = (arr: { descripcion?: string; objetivo?: string }[] | undefined) =>
          Array.isArray(arr) && arr.length > 0
            ? arr.map((o) => o.descripcion || o.objetivo || '').filter(Boolean).join(' ')
            : undefined;
        setAuditoria(prev => ({
          ...prev,
          id: audData.id,
          codigo: audData.codigo || prev.codigo,
          nombre: audData.nombre || audData.titulo || prev.nombre,
          proceso: audData.procesoAuditado || audData.proceso || prev.proceso,
          auditorLider: typeof audData.auditorLider === 'string' ? audData.auditorLider : (audData.auditorLider?.nombre || prev.auditorLider),
          fechaInicio: audData.fechaInicio || prev.fechaInicio,
          fechaFin: audData.fechaFin || prev.fechaFin,
          hallazgos: h,
          // Variables para PDF e informe (procedentes de BD)
          ...(audData.territorial && { territorial: audData.territorial }),
          ...(audData.alcance && { alcance: audData.alcance }),
          ...(objTexto(audData.objetivos) && { objetivo: objTexto(audData.objetivos) }),
          ...(audData.equipoAuditores && audData.equipoAuditores.length > 0 && {
            equipoAuditores: audData.equipoAuditores.map((a: any) => ({ nombre: a.nombre || a.nom_largo || 'Auditor', rol: a.cargo || a.rol })),
          }),
          ...(audData.responsable && { responsable: audData.responsable }),
          ...(audData.responsableAreaNombre && { responsableUnidad: audData.responsableAreaNombre }),
          ...(audData.responsableAreaCargo && { cargo: audData.responsableAreaCargo }),
          ...(audData.areaObjetivo && { areaResponsable: audData.areaObjetivo }),
          ...(audData.territorialInfo && {
            lugarEjecucion: audData.territorialInfo.ciudad
              ? `${audData.territorialInfo.ciudad}${audData.territorialInfo.departamento ? ' – ' + audData.territorialInfo.departamento : ''}`
              : audData.territorial,
          }),
        }));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [id, useAPI]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const cargarPlanesParaVerificacion = useCallback(async () => {
    if (!useAPI || !enSeguimiento) return;
    setLoadingVerificacion(true);
    try {
      const planes = await controlInternoService.getPlanesMejoramientoByAuditoria(id);
      setPlanesParaVerificacion(Array.isArray(planes) ? planes : []);
    } catch {
      setPlanesParaVerificacion([]);
    } finally {
      setLoadingVerificacion(false);
    }
  }, [id, useAPI, enSeguimiento]);

  const cargarResumenCierre = useCallback(async () => {
    if (!useAPI || !enSeguimiento) return;
    try {
      const res = await controlInternoService.getResumenEjecutivoCierre(id);
      setResumenCierre(res);
      setLeccionesAprendidas(res?.leccionesAprendidas ?? '');
      setRecomendacionesFuturas(res?.recomendacionesFuturasAuditorias ?? '');
      setInformeCierreAprobado(!!res?.informeCierreAprobado);
    } catch {
      setResumenCierre(null);
    }
  }, [id, useAPI, enSeguimiento]);

  useEffect(() => {
    if (enSeguimiento && seccionActual === 5) cargarPlanesParaVerificacion();
  }, [enSeguimiento, seccionActual, cargarPlanesParaVerificacion]);

  useEffect(() => {
    if (enSeguimiento && seccionActual === 6) cargarResumenCierre();
  }, [enSeguimiento, seccionActual, cargarResumenCierre]);

  // Si soloSeguimiento (tab Seguimiento del expediente), mostrar sección 5 por defecto
  useEffect(() => {
    if (soloSeguimiento && seccionActual < 5) setSeccionActual(5);
  }, [soloSeguimiento]);

  const planCompleto = useMemo(() => {
    if (!planCreado || !planEstadisticas) return false;
    return planEstadisticas.totalAcciones >= 1 && planEstadisticas.accionesCompletadas >= 1;
  }, [planCreado, planEstadisticas]);
>>>>>>> Stashed changes

  // Cálculo de progreso
  const progreso = useMemo(() => {
    let completadas = 0;
    if (informePreliminar.generado) completadas++;
    if (controversias.every(c => c.estado !== 'PENDIENTE')) completadas++;
    if (informeFinal.generado) completadas++;
    if (informeEjecutivo.generado) completadas++;
    return Math.round((completadas / 4) * 100);
  }, [informePreliminar, controversias, informeFinal, informeEjecutivo]);

  const puedeAvanzar = useMemo(() => {
    return informePreliminar.generado && 
           controversias.every(c => c.estado !== 'PENDIENTE') && 
           informeFinal.generado && 
           informeEjecutivo.generado;
  }, [informePreliminar, controversias, informeFinal, informeEjecutivo]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleGenerarInformePreliminar = () => {
    if (!informePreliminar.observaciones.trim()) {
      toast.error('Debe agregar observaciones generales');
      return;
    }

    setInformePreliminar(prev => ({
      ...prev,
      fecha: new Date().toISOString(),
      generado: true
    }));

    toast.success('Informe Preliminar generado exitosamente');
  };

  const handleAgregarControversia = (controversia: Omit<Controversia, 'id' | 'fechaPresentacion' | 'estado'>) => {
    const nueva: Controversia = {
      ...controversia,
      id: `c${Date.now()}`,
      fechaPresentacion: new Date().toISOString(),
      estado: 'PENDIENTE'
    };

    setControversias(prev => [...prev, nueva]);
    setModalControversia(false);
    toast.success('Controversia registrada');
  };

  const handleResolverControversia = (id: string, decision: 'ACEPTADA' | 'RECHAZADA', resolucion: string) => {
    setControversias(prev => prev.map(c => 
      c.id === id 
        ? { ...c, estado: decision, resolucion, fechaResolucion: new Date().toISOString() }
        : c
    ));

    toast.success(`Controversia ${decision === 'ACEPTADA' ? 'aceptada' : 'rechazada'}`);
  };

  const handleGenerarInformeFinal = () => {
    if (!informeFinal.observacionesFinales.trim()) {
      toast.error('Debe agregar observaciones finales');
      return;
    }

    const controversiasResueltas = controversias.filter(c => c.estado !== 'PENDIENTE').length;
    const hallazgosAjustados = controversias.filter(c => c.estado === 'ACEPTADA').length;

    setInformeFinal(prev => ({
      ...prev,
      fecha: new Date().toISOString(),
      controversiasResueltas,
      hallazgosAjustados,
      generado: true
    }));

    toast.success('Informe Final generado exitosamente');
  };

  const handleGenerarInformeEjecutivo = () => {
    if (!informeEjecutivo.resumenEjecutivo.trim() || !informeEjecutivo.conclusiones.trim()) {
      toast.error('Debe completar resumen ejecutivo y conclusiones');
      return;
    }

    if (informeEjecutivo.aspectosPositivos.length === 0 || informeEjecutivo.oportunidadesMejora.length === 0) {
      toast.error('Debe agregar al menos un aspecto positivo y una oportunidad de mejora');
      return;
    }

    setInformeEjecutivo(prev => ({
      ...prev,
      fecha: new Date().toISOString(),
      generado: true
    }));

    toast.success('Informe Ejecutivo generado exitosamente');
  };

  const handleFinalizarComunicacion = () => {
    if (!puedeAvanzar) {
      toast.error('Debe completar todas las secciones antes de finalizar');
      return;
    }

    toast.success('Fase de Comunicación completada. Auditoría pasa a Seguimiento.');
    // Aquí se cambiaría el stage de la auditoría a SEGUIMIENTO
  };

  // ====================================
  // RENDER
  // ====================================

  const duracionDias = auditoria.esTerritoriales ? 2 : 10; // SEDE: 10-15d, TERRITORIAL: 2d

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Fase de Comunicación</h1>
                  <p className="text-sm text-gray-500">{auditoria.codigo} - {auditoria.nombre}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4">
                <BadgeSIGL variant="info">
                  <Users className="w-3 h-3" />
                  {typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : auditoria.auditorLider?.nombre || 'No asignado'}
                </BadgeSIGL>
                <BadgeSIGL variant="default">
                  <Calendar className="w-3 h-3" />
                  Duración: {duracionDias} días
                </BadgeSIGL>
                <BadgeSIGL variant="warning">
                  <AlertCircle className="w-3 h-3" />
                  {auditoria.hallazgos.length} Hallazgos
                </BadgeSIGL>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">Progreso General</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-[#003DA5]">{progreso}%</div>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progreso}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* NAVEGACIÓN DE SECCIONES */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 1, nombre: 'Informe Preliminar', icono: FileText, completado: informePreliminar.generado },
              { id: 2, nombre: 'Controversias', icono: MessageSquare, completado: controversias.every(c => c.estado !== 'PENDIENTE') },
              { id: 3, nombre: 'Informe Final', icono: FileCheck, completado: informeFinal.generado },
              { id: 4, nombre: 'Informe Ejecutivo', icono: TrendingUp, completado: informeEjecutivo.generado }
            ].map((seccion, index) => (
              <React.Fragment key={seccion.id}>
                <button
                  onClick={() => setSeccionActual(seccion.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all flex-1 min-w-[200px] ${
                    seccionActual === seccion.id
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                      : seccion.completado
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <seccion.icono className="w-5 h-5" />
                  <span className="font-medium">{seccion.nombre}</span>
                  {seccion.completado && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                </button>
                {index < 3 && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* CONTENIDO DINÁMICO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={seccionActual}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {seccionActual === 1 && (
              <SeccionInformePreliminar
                auditoria={auditoria}
                informe={informePreliminar}
                setInforme={setInformePreliminar}
                onGenerar={handleGenerarInformePreliminar}
                onPreview={() => setModalPreview({ tipo: 'preliminar', abierto: true })}
<<<<<<< Updated upstream
=======
                onDescargarPDF={async () => {
                  if (!informePreliminar.generado) return;
                  const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
                  const hallazgosParaPDF = (auditoria.hallazgos || []).map((h) => ({
                    codigo: h.codigo,
                    titulo: h.titulo,
                    gravedad: h.gravedad,
                    descripcion: h.descripcion || '',
                    criterioIncumplido: h.criterioIncumplido,
                    causas: h.causas,
                    efectos: h.efectos,
                    recomendaciones: h.recomendaciones,
                  }));
                  await exportarPDFInformeAuditoria(
                    'preliminar',
                    {
                      codigo: auditoria.codigo,
                      nombre: auditoria.nombre,
                      proceso: auditoria.proceso,
                      auditorLider:
                        typeof auditoria.auditorLider === 'string'
                          ? auditoria.auditorLider
                          : (auditoria as any).auditorLider?.nombre || 'No asignado',
                      // Variables adicionales (opcionales)
                      radicado: (auditoria as any).radicado,
                      fechaOficio: informePreliminar.fecha,
                      destinatarioNombre: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
                      destinatarioCargo: (auditoria as any).cargo || 'Director(a) Territorial',
                      unidadAuditable: (auditoria as any).territorial || (auditoria as any).areaResponsable || auditoria.nombre,
                      fechaLimitePronunciamiento: (auditoria as any).fechaLimitePronunciamiento,
                      jefeOCI: (auditoria as any).jefeOCI,
                      elaboro: typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : (auditoria as any).auditorLider?.nombre,
                      tituloAuditoria: (auditoria as any).tituloAuditoria || auditoria.nombre,
                      responsableUnidadAuditada: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
                      lugarEjecucion: (auditoria as any).lugarEjecucion || (auditoria as any).territorial,
                      fechaEjecucionInicio: auditoria.fechaInicio,
                      fechaEjecucionFin: auditoria.fechaFin,
                      periodoAuditoria: auditoria.fechaInicio && auditoria.fechaFin ? `${auditoria.fechaInicio} al ${auditoria.fechaFin}` : undefined,
                      equipoAuditor: (auditoria as any).equipoAuditores?.map((a: any) => ({ nombre: a.nombre || a, rol: a.rol })),
                      objetivo: (auditoria as any).objetivo,
                      alcance: (auditoria as any).alcance,
                      marcoNormativo: (auditoria as any).marcoNormativo,
                      contextoGeneral: (auditoria as any).contextoGeneral,
                    },
                    { ...informePreliminar, foliosAnexos: informePreliminar.hallazgos ? Math.max(10, informePreliminar.hallazgos * 3) : undefined },
                    hallazgosParaPDF,
                    false,
                    editorOverrides
                  );
                }}
                onEditar={() => setModalEditorAbierto(true)}
                loading={loading}
                puedeGenerar={!informePreliminar.generado}
                embedded={embedded}
>>>>>>> Stashed changes
              />
            )}

            {seccionActual === 2 && (
              <SeccionControversias
                auditoria={auditoria}
                controversias={controversias}
                onAgregar={() => setModalControversia(true)}
                onResolver={handleResolverControversia}
              />
            )}

            {seccionActual === 3 && (
              <SeccionInformeFinal
                auditoria={auditoria}
                controversias={controversias}
                informe={informeFinal}
                setInforme={setInformeFinal}
                onGenerar={handleGenerarInformeFinal}
                onPreview={() => setModalPreview({ tipo: 'final', abierto: true })}
              />
            )}

            {seccionActual === 4 && (
              <SeccionInformeEjecutivo
                auditoria={auditoria}
                informe={informeEjecutivo}
                setInforme={setInformeEjecutivo}
                onGenerar={handleGenerarInformeEjecutivo}
                onPreview={() => setModalPreview({ tipo: 'ejecutivo', abierto: true })}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* BOTÓN FINALIZAR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">¿Listo para finalizar la comunicación?</h3>
              <p className="text-sm text-gray-600">
                {puedeAvanzar 
                  ? 'Todas las secciones completadas. Puede avanzar a Seguimiento.'
                  : 'Complete todas las secciones para poder finalizar.'}
              </p>
            </div>
            <ButtonSIGL
              variant={puedeAvanzar ? 'primary' : 'default'}
              onClick={handleFinalizarComunicacion}
              disabled={!puedeAvanzar}
            >
              <Send className="w-4 h-4" />
              Finalizar y Pasar a Seguimiento
            </ButtonSIGL>
          </div>
        </motion.div>

        {/* MODAL CONTROVERSIA */}
        {modalControversia && (
          <ModalAgregarControversia
            hallazgos={auditoria.hallazgos}
            onClose={() => setModalControversia(false)}
            onAgregar={handleAgregarControversia}
          />
        )}

        {/* MODAL PREVIEW */}
        {modalPreview.abierto && (
          <ModalPreviewInforme
            tipo={modalPreview.tipo}
            auditoria={auditoria}
            informe={
              modalPreview.tipo === 'preliminar' ? informePreliminar :
              modalPreview.tipo === 'final' ? informeFinal :
              informeEjecutivo
            }
            overrides={editorOverrides}
            onClose={() => setModalPreview({ tipo: '', abierto: false })}
          />
        )}

        {/* MODAL EDITOR */}
        {modalEditorAbierto && (
          <ModalEditorInforme
            overrides={editorOverrides}
            onChange={setEditorOverrides}
            onClose={() => setModalEditorAbierto(false)}
          />
        )}
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 1: INFORME PRELIMINAR
// ====================================

const SeccionInformePreliminar: React.FC<{
  auditoria: Auditoria;
  informe: InformePreliminar;
  setInforme: React.Dispatch<React.SetStateAction<InformePreliminar>>;
  onGenerar: () => void;
  onPreview: () => void;
<<<<<<< Updated upstream
}> = ({ auditoria, informe, setInforme, onGenerar, onPreview }) => {
=======
  onDescargarPDF?: () => void;
  onEditar?: () => void;
  loading?: boolean;
  puedeGenerar?: boolean;
  embedded?: boolean;
}> = ({ auditoria, informe, setInforme, onGenerar, onPreview, onDescargarPDF, onEditar, loading, puedeGenerar = true, embedded = false }) => {
>>>>>>> Stashed changes
  return (
    <div className="space-y-6">
      {/* Estadísticas de Hallazgos */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            Resumen de Hallazgos Identificados
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
              <div className="text-3xl font-bold text-gray-900 mb-1">{informe.hallazgos}</div>
              <div className="text-sm text-gray-600">Total Hallazgos</div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="text-3xl font-bold text-red-700 mb-1">{informe.graves}</div>
              <div className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Graves
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-700 mb-1">{informe.moderados}</div>
              <div className="text-sm text-yellow-600">Moderados</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-700 mb-1">{informe.leves}</div>
              <div className="text-sm text-blue-600">Leves</div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Lista de Hallazgos */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Hallazgos</h3>
          <div className="space-y-3">
            {auditoria.hallazgos.map((hallazgo, index) => (
              <div key={hallazgo.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-700">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{hallazgo.titulo}</h4>
                      <p className="text-sm text-gray-600 mt-1">{hallazgo.descripcion}</p>
                    </div>
                  </div>
                  <BadgeSIGL variant={
                    hallazgo.gravedad === 'GRAVE' ? 'danger' :
                    hallazgo.gravedad === 'MODERADO' ? 'warning' : 'info'
                  }>
                    {hallazgo.gravedad}
                  </BadgeSIGL>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Causas:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {hallazgo.causas.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Efectos:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {hallazgo.efectos.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Recomendaciones:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {hallazgo.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardSIGL>

<<<<<<< Updated upstream
      {/* Observaciones Generales */}
=======
      {informe.generado && (
        <CardSIGL className={embedded ? '!border !border-green-200 !shadow-none' : ''}>
          <div className={`${embedded ? 'p-4' : 'p-6'} bg-green-50/50 border border-green-200 rounded-lg`}>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm">{informe.hallazgos} hallazgos incluidos</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm">Área auditada notificada</span>
              <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-sm">Período de controversias cerrado</span>
            </div>
          </div>
        </CardSIGL>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Button variant="outline" size="sm" onClick={onEditar} className="font-medium border-blue-300 text-blue-700 hover:bg-blue-50">
          <Pencil className="w-4 h-4 mr-2" />
          Editar Informe
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={onPreview} disabled={!informe.generado} className="font-medium">
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!informe.generado}
            onClick={onDescargarPDF}
            className="font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
          {!informe.generado && (
            <Button
              size="sm"
              onClick={onGenerar}
              disabled={!puedeGenerar || loading}
              className="font-medium bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generar Informe Preliminar y Notificar al Área
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 2: GESTIÓN DE HALLAZGOS - ÁREA AUDITADA
// ====================================

const SeccionGestionHallazgos: React.FC<{
  auditoria: Auditoria;
  hallazgos: Hallazgo[];
  estadoComunicacion: { conteo?: { pendiente: number; aceptado: number; enControversia: number } } | null;
  onAceptar: (id: string) => void;
  onPresentarControversia: (hallazgoId: string) => void;
  onDecisionAuditor: (hallazgoId: string) => void;
  onDecisionConfirmar: (hallazgoId: string, tipo: 'ratificado' | 'modificado' | 'retirado', fundamentacion: string) => void;
  loading?: boolean;
}> = ({ hallazgos, estadoComunicacion, onAceptar, onPresentarControversia, onDecisionAuditor, onDecisionConfirmar, loading }) => {
  const conteo = estadoComunicacion?.conteo || { pendiente: 0, aceptado: 0, enControversia: 0 };
  const pendientes = hallazgos.filter(h => h.estado === 'notificado');
  const aceptados = hallazgos.filter(h => h.estado === 'aceptado');
  const enControversia = hallazgos.filter(h => h.estado === 'en-controversia');
  const conDecision = hallazgos.filter(h => ['ratificado', 'modificado', 'retirado'].includes(h.estado || ''));

  return (
    <div className="space-y-6">
>>>>>>> Stashed changes
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observaciones Generales del Auditor</h3>
          <TextareaSIGL
            value={informe.observaciones}
            onChange={(e) => setInforme(prev => ({ ...prev, observaciones: e.target.value }))}
            placeholder="Ingrese las observaciones generales que se incluirán en el informe preliminar..."
            rows={6}
            disabled={informe.generado}
          />
          
          {informe.generado && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Informe Preliminar Generado</p>
                <p className="text-sm text-green-700">Fecha: {new Date(informe.fecha).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </CardSIGL>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4">
        <ButtonSIGL variant="default" onClick={onPreview} disabled={!informe.generado}>
          <Eye className="w-4 h-4" />
          Vista Previa
        </ButtonSIGL>

        <div className="flex gap-3">
          <ButtonSIGL variant="default" disabled={!informe.generado}>
            <Download className="w-4 h-4" />
            Descargar PDF
          </ButtonSIGL>
          <ButtonSIGL 
            variant="primary" 
            onClick={onGenerar}
            disabled={informe.generado || !informe.observaciones.trim()}
          >
            <FileText className="w-4 h-4" />
            {informe.generado ? 'Ya Generado' : 'Generar Informe Preliminar'}
          </ButtonSIGL>
        </div>
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 2: CONTROVERSIAS
// ====================================

const SeccionControversias: React.FC<{
  auditoria: Auditoria;
  controversias: Controversia[];
  onAgregar: () => void;
  onResolver: (id: string, decision: 'ACEPTADA' | 'RECHAZADA', resolucion: string) => void;
}> = ({ controversias, onAgregar, onResolver }) => {
  const [controversiaSeleccionada, setControversiaSeleccionada] = useState<string | null>(null);
  const [resolucion, setResolucion] = useState('');

  const pendientes = controversias.filter(c => c.estado === 'PENDIENTE');
  const resueltas = controversias.filter(c => c.estado !== 'PENDIENTE');

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <CardSIGL>
        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Gestión de Controversias (Opcional)</h3>
              <p className="text-sm text-gray-700 mb-3">
                Las áreas auditadas tienen derecho a presentar controversias sobre los hallazgos identificados.
                Esta sección permite gestionar dichas controversias de manera transparente.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-600">{pendientes.length} Pendientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-600">{resueltas.filter(c => c.estado === 'ACEPTADA').length} Aceptadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-gray-600">{resueltas.filter(c => c.estado === 'RECHAZADA').length} Rechazadas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Botón Agregar */}
      <div className="flex justify-end">
        <ButtonSIGL variant="primary" onClick={onAgregar}>
          <MessageSquare className="w-4 h-4" />
          Registrar Nueva Controversia
        </ButtonSIGL>
      </div>

      {/* Controversias Pendientes */}
      {pendientes.length > 0 && (
        <CardSIGL>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Controversias Pendientes de Resolución
            </h3>
            <div className="space-y-4">
              {pendientes.map((controversia) => (
                <div key={controversia.id} className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{controversia.hallazgoTitulo}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Presentado por: {controversia.responsable} • {new Date(controversia.fechaPresentacion).toLocaleDateString()}
                      </p>
                    </div>
                    <BadgeSIGL variant="warning">PENDIENTE</BadgeSIGL>
                  </div>

                  <div className="bg-white rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Argumentos:</p>
                    <p className="text-sm text-gray-600">{controversia.argumentos}</p>
                  </div>

                  {controversia.evidencias.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Evidencias adjuntas:</p>
                      <div className="flex flex-wrap gap-2">
                        {controversia.evidencias.map((evidencia, i) => (
                          <span key={i} className="text-xs bg-white px-3 py-1 rounded-full border border-gray-300">
                            {evidencia}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {controversiaSeleccionada === controversia.id ? (
                    <div className="space-y-3">
                      <TextareaSIGL
                        value={resolucion}
                        onChange={(e) => setResolucion(e.target.value)}
                        placeholder="Escriba la resolución de la controversia..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <ButtonSIGL
                          variant="success"
                          onClick={() => {
                            onResolver(controversia.id, 'ACEPTADA', resolucion);
                            setControversiaSeleccionada(null);
                            setResolucion('');
                          }}
                          disabled={!resolucion.trim()}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Aceptar Controversia
                        </ButtonSIGL>
                        <ButtonSIGL
                          variant="danger"
                          onClick={() => {
                            onResolver(controversia.id, 'RECHAZADA', resolucion);
                            setControversiaSeleccionada(null);
                            setResolucion('');
                          }}
                          disabled={!resolucion.trim()}
                        >
                          <X className="w-4 h-4" />
                          Rechazar Controversia
                        </ButtonSIGL>
                        <ButtonSIGL
                          variant="default"
                          onClick={() => {
                            setControversiaSeleccionada(null);
                            setResolucion('');
                          }}
                        >
                          Cancelar
                        </ButtonSIGL>
                      </div>
                    </div>
                  ) : (
                    <ButtonSIGL
                      variant="primary"
                      onClick={() => setControversiaSeleccionada(controversia.id)}
                    >
                      Resolver Controversia
                    </ButtonSIGL>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardSIGL>
      )}

      {/* Controversias Resueltas */}
      {resueltas.length > 0 && (
        <CardSIGL>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Controversias Resueltas
            </h3>
            <div className="space-y-3">
              {resueltas.map((controversia) => (
                <div key={controversia.id} className={`border rounded-lg p-4 ${
                  controversia.estado === 'ACEPTADA' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{controversia.hallazgoTitulo}</h4>
                      <p className="text-sm text-gray-600">Presentado por: {controversia.responsable}</p>
                    </div>
                    <BadgeSIGL variant={controversia.estado === 'ACEPTADA' ? 'success' : 'danger'}>
                      {controversia.estado}
                    </BadgeSIGL>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Resolución:</p>
                    <p className="text-sm text-gray-600">{controversia.resolucion}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Resuelta el {new Date(controversia.fechaResolucion!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardSIGL>
      )}

      {/* Estado Vacío */}
      {controversias.length === 0 && (
        <CardSIGL>
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay controversias registradas</h3>
            <p className="text-gray-600 mb-6">
              Las controversias son opcionales. Si el área auditada acepta todos los hallazgos, puede continuar sin registrar controversias.
            </p>
            <ButtonSIGL variant="primary" onClick={onAgregar}>
              <MessageSquare className="w-4 h-4" />
              Registrar Primera Controversia
            </ButtonSIGL>
          </div>
        </CardSIGL>
      )}
    </div>
  );
};

// ====================================
// SECCIÓN 3: INFORME FINAL
// ====================================

const SeccionInformeFinal: React.FC<{
  auditoria: Auditoria;
  controversias: Controversia[];
  informe: InformeFinal;
  setInforme: React.Dispatch<React.SetStateAction<InformeFinal>>;
  onGenerar: () => void;
  onPreview: () => void;
}> = ({ auditoria, controversias, informe, setInforme, onGenerar, onPreview }) => {
  return (
    <div className="space-y-6">
      {/* Resumen de Controversias */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado de Controversias</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-700 mb-1">{controversias.length}</div>
              <div className="text-sm text-blue-600">Total Controversias</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-700 mb-1">
                {controversias.filter(c => c.estado === 'ACEPTADA').length}
              </div>
              <div className="text-sm text-green-600">Aceptadas</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="text-3xl font-bold text-red-700 mb-1">
                {controversias.filter(c => c.estado === 'RECHAZADA').length}
              </div>
              <div className="text-sm text-red-600">Rechazadas</div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Hallazgos Finales */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hallazgos Definitivos</h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-900">
                  {auditoria.hallazgos.length - controversias.filter(c => c.estado === 'ACEPTADA').length} Hallazgos Definitivos
                </p>
                <p className="text-sm text-purple-700">
                  ({controversias.filter(c => c.estado === 'ACEPTADA').length} hallazgos eliminados por controversias aceptadas)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {auditoria.hallazgos
              .filter(h => !controversias.some(c => c.hallazgoId === h.id && c.estado === 'ACEPTADA'))
              .map((hallazgo, index) => (
                <div key={hallazgo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-sm font-semibold border border-gray-300">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{hallazgo.titulo}</span>
                  </div>
                  <BadgeSIGL variant={
                    hallazgo.gravedad === 'GRAVE' ? 'danger' :
                    hallazgo.gravedad === 'MODERADO' ? 'warning' : 'info'
                  }>
                    {hallazgo.gravedad}
                  </BadgeSIGL>
                </div>
              ))}
          </div>
        </div>
      </CardSIGL>

      {/* Plazos Plan de Mejoramiento */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plazos para Plan de Mejoramiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días para presentar Plan de Mejoramiento
              </label>
              <InputSIGL
                type="number"
                value={informe.plazosPlanMejora}
                onChange={(e) => setInforme(prev => ({ ...prev, plazosPlanMejora: e.target.value }))}
                min="15"
                max="60"
                disabled={informe.generado}
              />
              <p className="text-xs text-gray-500 mt-1">Recomendado: 30 días calendario</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Fecha límite estimada</p>
                <p className="text-lg font-bold text-blue-700">
                  {new Date(Date.now() + parseInt(informe.plazosPlanMejora || '30') * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Observaciones Finales */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observaciones Finales</h3>
          <TextareaSIGL
            value={informe.observacionesFinales}
            onChange={(e) => setInforme(prev => ({ ...prev, observacionesFinales: e.target.value }))}
            placeholder="Ingrese las observaciones finales que se incluirán en el informe final..."
            rows={6}
            disabled={informe.generado}
          />

          {informe.generado && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Informe Final Generado</p>
                <p className="text-sm text-green-700">Fecha: {new Date(informe.fecha).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </CardSIGL>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4">
        <ButtonSIGL variant="default" onClick={onPreview} disabled={!informe.generado}>
          <Eye className="w-4 h-4" />
          Vista Previa
<<<<<<< Updated upstream
        </ButtonSIGL>

        <div className="flex gap-3">
          <ButtonSIGL variant="default" disabled={!informe.generado}>
            <Download className="w-4 h-4" />
            Descargar PDF
          </ButtonSIGL>
          <ButtonSIGL 
            variant="primary" 
=======
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!informe.generado}
          className="font-medium"
          onClick={async () => {
            if (!informe.generado) return;
            const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
            const hallazgosParaPDF = (hallazgos || []).map((h) => ({
              codigo: h.codigo,
              titulo: h.titulo,
              gravedad: h.gravedad,
              descripcion: h.descripcion || '',
              criterioIncumplido: h.criterioIncumplido,
              causas: h.causas,
              efectos: h.efectos,
              recomendaciones: h.recomendaciones,
              estadoFinal: h.estado,
              decisionAuditor: h.decisionAuditor,
              fundamentacionTecnica: (h as any).fundamentacionTecnica,
            }));
            await exportarPDFInformeAuditoria(
              'final',
              {
                codigo: auditoria.codigo,
                nombre: auditoria.nombre,
                tituloAuditoria: (auditoria as any).tituloAuditoria || auditoria.nombre,
                proceso: auditoria.proceso,
                auditorLider:
                  typeof auditoria.auditorLider === 'string'
                    ? auditoria.auditorLider
                    : (auditoria as any).auditorLider?.nombre || 'No asignado',
              },
              informe,
              hallazgosParaPDF
            );
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
        {!informe.generado && (
          <Button
            size="sm"
>>>>>>> Stashed changes
            onClick={onGenerar}
            disabled={informe.generado || !informe.observacionesFinales.trim()}
          >
            <FileCheck className="w-4 h-4" />
            {informe.generado ? 'Ya Generado' : 'Generar Informe Final'}
          </ButtonSIGL>
        </div>
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 4: INFORME EJECUTIVO
// ====================================

const SeccionInformeEjecutivo: React.FC<{
  auditoria: Auditoria;
  informe: InformeEjecutivo;
  setInforme: React.Dispatch<React.SetStateAction<InformeEjecutivo>>;
  onGenerar: () => void;
  onPreview: () => void;
}> = ({ informe, setInforme, onGenerar, onPreview }) => {
  const [nuevoPositivo, setNuevoPositivo] = useState('');
  const [nuevaMejora, setNuevaMejora] = useState('');

  return (
    <div className="space-y-6">
      {/* Resumen Ejecutivo */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Resumen Ejecutivo
          </h3>
          <TextareaSIGL
            value={informe.resumenEjecutivo}
            onChange={(e) => setInforme(prev => ({ ...prev, resumenEjecutivo: e.target.value }))}
            placeholder="Escriba un resumen ejecutivo de máximo 500 palabras dirigido a la alta dirección..."
            rows={6}
            disabled={informe.generado}
          />
          <p className="text-xs text-gray-500 mt-2">
            {informe.resumenEjecutivo.length} caracteres • Recomendado: 300-500 palabras
          </p>
        </div>
      </CardSIGL>

      {/* Aspectos Positivos */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Aspectos Positivos Identificados
          </h3>

          {!informe.generado && (
            <div className="flex gap-2 mb-4">
              <InputSIGL
                value={nuevoPositivo}
                onChange={(e) => setNuevoPositivo(e.target.value)}
                placeholder="Agregar aspecto positivo..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && nuevoPositivo.trim()) {
                    setInforme(prev => ({
                      ...prev,
                      aspectosPositivos: [...prev.aspectosPositivos, nuevoPositivo.trim()]
                    }));
                    setNuevoPositivo('');
                  }
                }}
              />
              <ButtonSIGL
                variant="success"
                onClick={() => {
                  if (nuevoPositivo.trim()) {
                    setInforme(prev => ({
                      ...prev,
                      aspectosPositivos: [...prev.aspectosPositivos, nuevoPositivo.trim()]
                    }));
                    setNuevoPositivo('');
                  }
                }}
              >
                Agregar
              </ButtonSIGL>
            </div>
          )}

          <div className="space-y-2">
            {informe.aspectosPositivos.map((aspecto, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="flex-1 text-gray-900">{aspecto}</span>
                {!informe.generado && (
                  <button
                    onClick={() => setInforme(prev => ({
                      ...prev,
                      aspectosPositivos: prev.aspectosPositivos.filter((_, i) => i !== index)
                    }))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {informe.aspectosPositivos.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay aspectos positivos agregados. Agregue al menos uno.
            </p>
          )}
        </div>
      </CardSIGL>

      {/* Oportunidades de Mejora */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Oportunidades de Mejora
          </h3>

          {!informe.generado && (
            <div className="flex gap-2 mb-4">
              <InputSIGL
                value={nuevaMejora}
                onChange={(e) => setNuevaMejora(e.target.value)}
                placeholder="Agregar oportunidad de mejora..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && nuevaMejora.trim()) {
                    setInforme(prev => ({
                      ...prev,
                      oportunidadesMejora: [...prev.oportunidadesMejora, nuevaMejora.trim()]
                    }));
                    setNuevaMejora('');
                  }
                }}
              />
              <ButtonSIGL
                variant="primary"
                onClick={() => {
                  if (nuevaMejora.trim()) {
                    setInforme(prev => ({
                      ...prev,
                      oportunidadesMejora: [...prev.oportunidadesMejora, nuevaMejora.trim()]
                    }));
                    setNuevaMejora('');
                  }
                }}
              >
                Agregar
              </ButtonSIGL>
            </div>
          )}

          <div className="space-y-2">
            {informe.oportunidadesMejora.map((oportunidad, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="flex-1 text-gray-900">{oportunidad}</span>
                {!informe.generado && (
                  <button
                    onClick={() => setInforme(prev => ({
                      ...prev,
                      oportunidadesMejora: prev.oportunidadesMejora.filter((_, i) => i !== index)
                    }))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {informe.oportunidadesMejora.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay oportunidades de mejora agregadas. Agregue al menos una.
            </p>
          )}
        </div>
      </CardSIGL>

      {/* Conclusiones */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conclusiones Generales</h3>
          <TextareaSIGL
            value={informe.conclusiones}
            onChange={(e) => setInforme(prev => ({ ...prev, conclusiones: e.target.value }))}
            placeholder="Escriba las conclusiones generales de la auditoría..."
            rows={5}
            disabled={informe.generado}
          />

          {informe.generado && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Informe Ejecutivo Generado</p>
                <p className="text-sm text-green-700">Fecha: {new Date(informe.fecha).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </CardSIGL>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4">
        <ButtonSIGL variant="default" onClick={onPreview} disabled={!informe.generado}>
          <Eye className="w-4 h-4" />
          Vista Previa
        </ButtonSIGL>

        <div className="flex gap-3">
          <ButtonSIGL variant="default" disabled={!informe.generado}>
            <Download className="w-4 h-4" />
            Descargar PDF
          </ButtonSIGL>
          <ButtonSIGL 
            variant="primary" 
            onClick={onGenerar}
            disabled={informe.generado}
          >
            <TrendingUp className="w-4 h-4" />
            {informe.generado ? 'Ya Generado' : 'Generar Informe Ejecutivo'}
          </ButtonSIGL>
        </div>
      </div>
    </div>
  );
};

// ====================================
// MODAL: AGREGAR CONTROVERSIA
// ====================================

const ModalAgregarControversia: React.FC<{
  hallazgos: Hallazgo[];
  onClose: () => void;
  onAgregar: (controversia: Omit<Controversia, 'id' | 'fechaPresentacion' | 'estado'>) => void;
}> = ({ hallazgos, onClose, onAgregar }) => {
  const [hallazgoId, setHallazgoId] = useState('');
  const [responsable, setResponsable] = useState('');
  const [argumentos, setArgumentos] = useState('');
  const [evidencias, setEvidencias] = useState<string[]>([]);
  const [nuevaEvidencia, setNuevaEvidencia] = useState('');

  const handleSubmit = () => {
    if (!hallazgoId || !responsable || !argumentos.trim()) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    const hallazgo = hallazgos.find(h => h.id === hallazgoId);
    if (!hallazgo) return;

    onAgregar({
      hallazgoId,
      hallazgoTitulo: hallazgo.titulo,
      responsable,
      argumentos,
      evidencias
    });
  };

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Registrar Nueva Controversia"
      size="large"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hallazgo Controvertido *
          </label>
          <select
            value={hallazgoId}
            onChange={(e) => setHallazgoId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Seleccione un hallazgo...</option>
            {hallazgos.map(h => (
              <option key={h.id} value={h.id}>{h.titulo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Responsable del Área *
          </label>
          <InputSIGL
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Nombre del responsable..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Argumentos de la Controversia *
          </label>
          <TextareaSIGL
            value={argumentos}
            onChange={(e) => setArgumentos(e.target.value)}
            placeholder="Describa los argumentos por los cuales el área no está de acuerdo con el hallazgo..."
            rows={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidencias de Soporte (Opcional)
          </label>
          <div className="flex gap-2 mb-2">
            <InputSIGL
              value={nuevaEvidencia}
              onChange={(e) => setNuevaEvidencia(e.target.value)}
              placeholder="Nombre del archivo de evidencia..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && nuevaEvidencia.trim()) {
                  setEvidencias(prev => [...prev, nuevaEvidencia.trim()]);
                  setNuevaEvidencia('');
                }
              }}
            />
            <ButtonSIGL
              variant="default"
              onClick={() => {
                if (nuevaEvidencia.trim()) {
                  setEvidencias(prev => [...prev, nuevaEvidencia.trim()]);
                  setNuevaEvidencia('');
                }
              }}
            >
              <Upload className="w-4 h-4" />
              Agregar
            </ButtonSIGL>
          </div>

          {evidencias.length > 0 && (
            <div className="space-y-1">
              {evidencias.map((evidencia, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm text-gray-700">{evidencia}</span>
                  <button
                    onClick={() => setEvidencias(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={handleSubmit}>
            <MessageSquare className="w-4 h-4" />
            Registrar Controversia
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// MODAL: EDITOR INFORME
// ====================================

const ModalEditorInforme: React.FC<{
  overrides: EditorOverridesInforme;
  onChange: (o: EditorOverridesInforme) => void;
  onClose: () => void;
}> = ({ overrides, onChange, onClose }) => {
  const [local, setLocal] = useState<EditorOverridesInforme>({ ...overrides });
  const [tab, setTab] = useState<'logo' | 'contenido' | 'tablas'>('logo');
  const [tablaKey, setTablaKey] = useState(TABLAS_ESTRUCTURALES_DEF[0].key);

  const tablaActual = TABLAS_ESTRUCTURALES_DEF.find(t => t.key === tablaKey)!;
  const filas: string[][] = local.tablasFilas?.[tablaKey] ?? [];

  const setFilas = (nuevasFilas: string[][]) => {
    setLocal(prev => ({ ...prev, tablasFilas: { ...prev.tablasFilas, [tablaKey]: nuevasFilas } }));
  };

  const addFila = () => setFilas([...filas, Array(tablaActual.cols.length).fill('')]);
  const removeFila = (i: number) => setFilas(filas.filter((_, idx) => idx !== i));
  const editCell = (ri: number, ci: number, val: string) => {
    setFilas(filas.map((row, r) => r === ri ? row.map((c, cc) => cc === ci ? val : c) : row));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLocal(prev => ({ ...prev, logoBase64: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full" style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader className="border-b pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Pencil className="w-5 h-5 text-blue-600" />
            Editar Informe Preliminar
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b flex-shrink-0 px-1">
          {(['logo', 'contenido', 'tablas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'logo' ? 'Logo' : t === 'contenido' ? 'Contenido' : 'Tablas'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'logo' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Sube un logo personalizado para reemplazar el logo ESAP en todos los encabezados del PDF.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
                {local.logoBase64 ? (
                  <div className="space-y-3">
                    <img src={local.logoBase64} alt="Logo" className="max-h-24 mx-auto object-contain rounded" />
                    <button onClick={() => setLocal(p => ({ ...p, logoBase64: undefined }))}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 mx-auto">
                      <Trash2 className="w-3 h-3" /> Eliminar logo personalizado
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-500">Haz clic para subir imagen (PNG, JPG)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
              </div>
            </div>
          )}

          {tab === 'contenido' && (
            <div className="space-y-4">
              {([
                ['objetivo', 'Objetivo'],
                ['alcance', 'Alcance'],
                ['marcoNormativo', 'Marco Normativo'],
                ['contextoGeneral', 'Contexto General'],
                ['observaciones', 'Observaciones'],
              ] as [keyof EditorOverridesInforme, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <textarea
                    className="mt-1 w-full border rounded-md p-2 text-sm h-24 resize-none focus:ring-1 focus:ring-blue-300 outline-none"
                    value={(local[field] as string) ?? ''}
                    onChange={e => setLocal(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={`${label}...`}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'tablas' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tabla</label>
                <select className="mt-1 w-full border rounded-md p-2 text-sm"
                  value={tablaKey} onChange={e => setTablaKey(e.target.value)}>
                  {TABLAS_ESTRUCTURALES_DEF.map(t => (
                    <option key={t.key} value={t.key}>{t.titulo}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {tablaActual.cols.map((col, i) => (
                        <th key={i} className="border p-1.5 text-left font-medium text-gray-600 whitespace-nowrap">{col}</th>
                      ))}
                      <th className="border p-1.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.length === 0 && (
                      <tr>
                        <td colSpan={tablaActual.cols.length + 1} className="border p-4 text-center text-gray-400">
                          Sin filas. Haz clic en "+ Agregar fila".
                        </td>
                      </tr>
                    )}
                    {filas.map((fila, ri) => (
                      <tr key={ri} className="hover:bg-gray-50">
                        {fila.map((cell, ci) => (
                          <td key={ci} className="border p-0">
                            <input className="w-full p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                              value={cell} onChange={e => editCell(ri, ci, e.target.value)} />
                          </td>
                        ))}
                        <td className="border p-1 text-center">
                          <button onClick={() => removeFila(ri)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addFila}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-4 h-4" /> Agregar fila
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { onChange(local); onClose(); }}>
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ====================================
// MODAL: PREVIEW INFORME
// ====================================

const ModalPreviewInforme: React.FC<{
  tipo: string;
  auditoria: Auditoria;
  informe: any;
  overrides?: EditorOverridesInforme;
  onClose: () => void;
<<<<<<< Updated upstream
}> = ({ tipo, auditoria, informe, onClose }) => {
  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title={`Vista Previa - ${
        tipo === 'preliminar' ? 'Informe Preliminar' :
        tipo === 'final' ? 'Informe Final' :
        'Informe Ejecutivo'
      }`}
      size="large"
    >
      <div className="prose max-w-none">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
          </h2>
          <h3 className="text-xl font-semibold text-purple-700">
            Oficina de Control Interno
          </h3>
        </div>
=======
}> = ({ tipo, auditoria, informe, overrides, onClose }) => {
  const titulo = tipo === 'preliminar' ? 'Informe Preliminar' : tipo === 'final' ? 'Informe Final' : 'Informe Ejecutivo';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);

  const buildArgs = useCallback(async () => {
    const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
    const hallazgosParaPDF =
      tipo === 'preliminar' && auditoria.hallazgos?.length
        ? auditoria.hallazgos.map((h: Hallazgo) => ({
            codigo: h.codigo, titulo: h.titulo, gravedad: h.gravedad,
            descripcion: h.descripcion || '', criterioIncumplido: h.criterioIncumplido,
            causas: h.causas, efectos: h.efectos, recomendaciones: h.recomendaciones,
          }))
        : tipo === 'final' && auditoria.hallazgos?.length
          ? auditoria.hallazgos.map((h: Hallazgo) => ({
              codigo: h.codigo, titulo: h.titulo, gravedad: h.gravedad,
              descripcion: h.descripcion || '', causas: h.causas, efectos: h.efectos,
              recomendaciones: h.recomendaciones, estadoFinal: h.estado,
              decisionAuditor: h.decisionAuditor, fundamentacionTecnica: h.fundamentacionTecnica,
            }))
          : undefined;
    const auditoriaBase = {
      codigo: auditoria.codigo, nombre: auditoria.nombre,
      tituloAuditoria: (auditoria as any).tituloAuditoria || auditoria.nombre,
      proceso: auditoria.proceso,
      auditorLider: typeof auditoria.auditorLider === 'string'
        ? auditoria.auditorLider : (auditoria as any).auditorLider?.nombre || 'No asignado',
      ...(tipo === 'preliminar' && {
        fechaOficio: informe?.fecha,
        destinatarioNombre: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
        destinatarioCargo: (auditoria as any).cargo || 'Director(a) Territorial',
        unidadAuditable: (auditoria as any).territorial || (auditoria as any).areaResponsable || auditoria.nombre,
        fechaEjecucionInicio: auditoria.fechaInicio,
        fechaEjecucionFin: auditoria.fechaFin,
        periodoAuditoria: auditoria.fechaInicio && auditoria.fechaFin ? `${auditoria.fechaInicio} al ${auditoria.fechaFin}` : undefined,
        equipoAuditor: (auditoria as any).equipoAuditores?.map((a: any) => ({ nombre: a.nombre || a, rol: a.rol })),
        objetivo: (auditoria as any).objetivo, alcance: (auditoria as any).alcance,
        marcoNormativo: (auditoria as any).marcoNormativo, contextoGeneral: (auditoria as any).contextoGeneral,
      }),
    };
    const informeParaPDF = tipo === 'preliminar' && informe?.hallazgos
      ? { ...informe, foliosAnexos: Math.max(10, informe.hallazgos * 3) } : informe;
    return exportarPDFInformeAuditoria(
      tipo === 'preliminar' ? 'preliminar' : 'final',
      auditoriaBase, informeParaPDF, hallazgosParaPDF, false, overrides
    );
  }, [tipo, auditoria, informe, overrides]);

  useEffect(() => {
    setPdfLoading(true);
    (async () => {
      try {
        const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
        const hallazgosParaPDF =
          tipo === 'preliminar' && auditoria.hallazgos?.length
            ? auditoria.hallazgos.map((h: Hallazgo) => ({
                codigo: h.codigo, titulo: h.titulo, gravedad: h.gravedad,
                descripcion: h.descripcion || '', criterioIncumplido: h.criterioIncumplido,
                causas: h.causas, efectos: h.efectos, recomendaciones: h.recomendaciones,
              }))
            : tipo === 'final' && auditoria.hallazgos?.length
              ? auditoria.hallazgos.map((h: Hallazgo) => ({
                  codigo: h.codigo, titulo: h.titulo, gravedad: h.gravedad,
                  descripcion: h.descripcion || '', causas: h.causas, efectos: h.efectos,
                  recomendaciones: h.recomendaciones, estadoFinal: h.estado,
                  decisionAuditor: h.decisionAuditor, fundamentacionTecnica: h.fundamentacionTecnica,
                }))
              : undefined;
        const auditoriaBase = {
          codigo: auditoria.codigo, nombre: auditoria.nombre,
          tituloAuditoria: (auditoria as any).tituloAuditoria || auditoria.nombre,
          proceso: auditoria.proceso,
          auditorLider: typeof auditoria.auditorLider === 'string'
            ? auditoria.auditorLider : (auditoria as any).auditorLider?.nombre || 'No asignado',
          ...(tipo === 'preliminar' && {
            fechaOficio: informe?.fecha,
            destinatarioNombre: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
            destinatarioCargo: (auditoria as any).cargo || 'Director(a) Territorial',
            unidadAuditable: (auditoria as any).territorial || (auditoria as any).areaResponsable || auditoria.nombre,
            fechaEjecucionInicio: auditoria.fechaInicio,
            fechaEjecucionFin: auditoria.fechaFin,
            periodoAuditoria: auditoria.fechaInicio && auditoria.fechaFin
              ? `${auditoria.fechaInicio} al ${auditoria.fechaFin}` : undefined,
            equipoAuditor: (auditoria as any).equipoAuditores?.map((a: any) => ({ nombre: a.nombre || a, rol: a.rol })),
            objetivo: (auditoria as any).objetivo, alcance: (auditoria as any).alcance,
            marcoNormativo: (auditoria as any).marcoNormativo, contextoGeneral: (auditoria as any).contextoGeneral,
          }),
        };
        const informeParaPDF = tipo === 'preliminar' && informe?.hallazgos
          ? { ...informe, foliosAnexos: Math.max(10, informe.hallazgos * 3) } : informe;
        const url = await exportarPDFInformeAuditoria(
          tipo === 'preliminar' ? 'preliminar' : 'final',
          auditoriaBase, informeParaPDF, hallazgosParaPDF, true, overrides
        );
        if (typeof url === 'string') setPdfUrl(url);
      } finally {
        setPdfLoading(false);
      }
    })();
  }, [tipo, auditoria, informe, overrides]);

  const handleDescargarPDF = async () => {
    await buildArgs();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-full" style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader className="border-b pb-3 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-600" />
            Vista Previa - {titulo}
          </DialogTitle>
        </DialogHeader>
>>>>>>> Stashed changes

        <div className="flex-1 min-h-0 relative">
          {pdfLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3">
              <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Generando vista previa del PDF...</p>
            </div>
          )}
          {!pdfLoading && pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 rounded"
              title="Vista previa del informe"
            />
          )}
          {!pdfLoading && !pdfUrl && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No se pudo generar la vista previa.
            </div>
          )}
        </div>

<<<<<<< Updated upstream
            <h4 className="text-lg font-bold text-gray-900 mb-3 mt-6">Observaciones Generales</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{informe.observaciones}</p>
          </>
        )}

        {tipo === 'final' && (
          <>
            <h4 className="text-lg font-bold text-gray-900 mb-3">Resultado de Controversias</h4>
            <p className="text-gray-700">
              Total controversias resueltas: {informe.controversiasResueltas}<br />
              Hallazgos ajustados: {informe.hallazgosAjustados}
            </p>

            <h4 className="text-lg font-bold text-gray-900 mb-3 mt-6">Plazo Plan de Mejoramiento</h4>
            <p className="text-gray-700">
              El área auditada cuenta con {informe.plazosPlanMejora} días calendario para presentar el Plan de Mejoramiento.
            </p>

            <h4 className="text-lg font-bold text-gray-900 mb-3 mt-6">Observaciones Finales</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{informe.observacionesFinales}</p>
          </>
        )}

        {tipo === 'ejecutivo' && (
          <>
            <h4 className="text-lg font-bold text-gray-900 mb-3">Resumen Ejecutivo</h4>
            <p className="text-gray-700 whitespace-pre-wrap mb-6">{informe.resumenEjecutivo}</p>

            <h4 className="text-lg font-bold text-gray-900 mb-3">Aspectos Positivos</h4>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
              {informe.aspectosPositivos.map((aspecto: string, i: number) => (
                <li key={i}>{aspecto}</li>
              ))}
            </ul>

            <h4 className="text-lg font-bold text-gray-900 mb-3">Oportunidades de Mejora</h4>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
              {informe.oportunidadesMejora.map((oportunidad: string, i: number) => (
                <li key={i}>{oportunidad}</li>
              ))}
            </ul>

            <h4 className="text-lg font-bold text-gray-900 mb-3">Conclusiones</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{informe.conclusiones}</p>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <ButtonSIGL variant="default" onClick={onClose}>
          Cerrar
        </ButtonSIGL>
        <ButtonSIGL variant="primary">
          <Download className="w-4 h-4" />
          Descargar PDF
        </ButtonSIGL>
      </div>
    </ModalSIGL>
=======
        <div className="flex justify-end gap-3 pt-3 border-t flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleDescargarPDF}>
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
>>>>>>> Stashed changes
  );
};

export default ComunicacionAuditoriaModule;
