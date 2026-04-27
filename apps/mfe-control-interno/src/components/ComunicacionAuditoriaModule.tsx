import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Trash2,
  Target,
  ClipboardCheck,
  BookOpen
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { Button } from '@esap-mfe/shared-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { ModalFinalizarAuditoria } from './modales/ModalesGestion';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL, TextareaSIGL } from '../gestion-legal/design-system/InputSIGL';
import { toast } from 'sonner';
import controlInternoService from '../../../services/api/controlInternoService';
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan, type HallazgoAuditoria } from './IntegracionAuditoriasPlanesContext';

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
  focos?: string[];
  stage: 'EJECUCION' | 'COMUNICACION' | 'SEGUIMIENTO' | 'FINALIZADA';
}

interface Hallazgo {
  id: string;
  codigo?: string;
  titulo?: string;
  gravedad?: 'LEVE' | 'MODERADO' | 'GRAVE' | 'CRITICO';
  descripcion: string;
  criterioIncumplido?: string;
  causas?: string[];
  efectos?: string[];
  recomendaciones?: string[];
  /** Estado del flujo comunicación: notificado | aceptado | en-controversia | ratificado | modificado | retirado | cerrado */
  estado?: string;
  argumentosControversia?: string;
  documentoControversiaUrl?: string;
  documentoControversiaNombre?: string;
  decisionAuditor?: string;
  fundamentacionTecnica?: string;
  fechaDecision?: string;
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

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (s: string) => s && UUID_REGEX.test(s);

// Mock para cuando no hay auditoriaId válido
const AUDITORIA_MOCK: Auditoria = {
  id: 'aud-001',
  codigo: 'AUD-2025-005',
  nombre: 'Auditoría Gestión Financiera',
  proceso: 'Gestión Financiera',
  auditorLider: 'Fernando Ávila',
  fechaInicio: '2025-01-15',
  fechaFin: '2025-02-15',
  esTerritoriales: false,
  stage: 'COMUNICACION',
  hallazgos: [
    { id: 'h1', titulo: 'Falta de conciliaciones bancarias mensuales', gravedad: 'GRAVE', descripcion: 'No se realizan conciliaciones bancarias de manera mensual...', causas: [], efectos: [], recomendaciones: [] },
    { id: 'h2', titulo: 'Documentación de gastos incompleta', gravedad: 'MODERADO', descripcion: 'Algunos gastos no tienen toda la documentación soporte...', causas: [], efectos: [], recomendaciones: [] },
  ],
};

/** Documento en formato expediente (id, nombre, urlDownload, etc.) */
interface DocExpedienteSimple {
  id: string;
  nombre: string;
  urlDownload?: string;
  tipo?: string;
  fase?: string;
}

export const ComunicacionAuditoriaModule: React.FC<{
  auditoriaId?: string;
  auditoriaInfo?: { codigo?: string; nombre?: string };
  /** Estado actual de la auditoría (Comunicación | Seguimiento) para mostrar secciones 5 y 6 de Cierre */
  estadoAuditoria?: string;
  /** true = solo mostrar contenido de Seguimiento (Verificación + Informe de Cierre), usado en tab Seguimiento del expediente */
  soloSeguimiento?: boolean;
  /** true = modo embebido dentro del expediente (sin header grande, sin fondo pantalla completa) */
  embedded?: boolean;
  /** Callback cuando se finaliza la comunicación y pasa a Seguimiento */
  onComunicacionCompletada?: () => void;
  /** true = auditoría finalizada, solo lectura (sin formularios ni botones de acción) */
  readOnly?: boolean;
  /** Documentos del expediente (para validar Documento de Cierre obligatorio antes de aprobar) */
  documentos?: DocExpedienteSimple[];
  /** Callback para subir Documento de Cierre (obligatorio antes de pasar a Finalizada) */
  onSubirDocumento?: (file: File, metadata: { nombre: string; tipoDocumento: string; etapa: string }) => Promise<boolean>;
  /** Recargar documentos tras subir */
  onRecargarDocumentos?: () => Promise<void>;
}> = ({ auditoriaId, auditoriaInfo, estadoAuditoria: estadoAuditoriaProp, soloSeguimiento = false, embedded = false, onComunicacionCompletada, readOnly = false, documentos = [], onSubirDocumento, onRecargarDocumentos }) => {
  const id = auditoriaId || 'aud-001';
  const useAPI = isValidUUID(id);

  const [auditoria, setAuditoria] = useState<Auditoria>({ ...AUDITORIA_MOCK, ...auditoriaInfo, id });
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(AUDITORIA_MOCK.hallazgos);
  const [estadoComunicacion, setEstadoComunicacion] = useState<{
    informePreliminarGenerado: boolean;
    hayControversiasPendientes: boolean;
    puedeGenerarInformeFinal: boolean;
    conteo: { pendiente: number; aceptado: number; enControversia: number };
  } | null>(null);
  const [loading, setLoading] = useState(useAPI);
  const [seccionActual, setSeccionActual] = useState<number>(1);
  const [informePreliminar, setInformePreliminar] = useState<InformePreliminar>({
    fecha: '', hallazgos: 0, graves: 0, moderados: 0, leves: 0, observaciones: '', generado: false,
  });
  const [controversias, setControversias] = useState<Controversia[]>([]);
  const [informeFinal, setInformeFinal] = useState<InformeFinal>({
    fecha: '', controversiasResueltas: 0, hallazgosAjustados: 0, plazosPlanMejora: '30', observacionesFinales: '', generado: false,
  });
  const [informeEjecutivo, setInformeEjecutivo] = useState<InformeFinal>({
    fecha: '', controversiasResueltas: 0, hallazgosAjustados: 0, plazosPlanMejora: '30', observacionesFinales: '', generado: false,
  });
  const [planCreado, setPlanCreado] = useState<boolean>(false);
  const [planEstadisticas, setPlanEstadisticas] = useState<{
    totalAcciones: number;
    accionesCompletadas: number;
    porcentajeAvance: number;
  } | null>(null);
  const [modalControversia, setModalControversia] = useState(false);
  const [modalControversiaHallazgoId, setModalControversiaHallazgoId] = useState<string | null>(null);
  const [modalDecisionHallazgoId, setModalDecisionHallazgoId] = useState<string | null>(null);
  const [modalPreview, setModalPreview] = useState<{ tipo: string; abierto: boolean }>({ tipo: '', abierto: false });
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

  const calcularFechaLimiteEstimada = () => {
    const dias = parseInt(informe.plazosPlanMejora || '30', 10) || 30;
    const vigenciaPlan = Number(
      (auditoria as any).vigencia ||
      (auditoria as any).año ||
      (auditoriaInfo as any)?.vigencia ||
      (auditoriaInfo as any)?.año
    );

    let fechaBase = new Date();
    if (!isNaN(vigenciaPlan) && vigenciaPlan >= 2020 && vigenciaPlan <= 2100) {
      fechaBase = new Date(`${vigenciaPlan}-12-31T00:00:00`);
    } else if (auditoria.fechaFin) {
      const fechaFinRaw = auditoria.fechaFin;
      if (fechaFinRaw.includes('/')) {
        const [d, m, a] = fechaFinRaw.split('/');
        fechaBase = new Date(`${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
      } else {
        fechaBase = new Date(`${fechaFinRaw.split('T')[0]}T00:00:00`);
      }
    }

    const fechaLimite = new Date(fechaBase);
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return fechaLimite.toLocaleDateString('es-CO');
  };

  const cargarDatos = useCallback(async () => {
    if (!useAPI) return;
    try {
      setLoading(true);
      const [hallazgosData, estadoData, audData, aperturaData, cierreData] = await Promise.all([
        controlInternoService.getHallazgosByAuditoria(id),
        controlInternoService.getEstadoComunicacion(id),
        controlInternoService.getAuditoriaById(id).catch(() => null),
        controlInternoService.getReunionApertura(id).catch(() => null),
        controlInternoService.getReunionCierre(id).catch(() => null),
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
      setInformeEjecutivo(prev => ({ ...prev, generado: estadoData?.informeEjecutivoGenerado ?? false }));
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

        const reunionesArr = [];
        if (aperturaData) reunionesArr.push({ ...aperturaData, tipo: 'Reunión de Apertura' });
        if (cierreData) reunionesArr.push({ ...cierreData, tipo: 'Reunión de Cierre' });
        if (audData.reuniones && Array.isArray(audData.reuniones)) {
          audData.reuniones.forEach((r: any) => {
            if (!reunionesArr.some(existing => existing.tipo === r.tipo)) {
              reunionesArr.push(r);
            }
          });
        }

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
          ...(audData.tipo && { tipo: audData.tipo }),
          ...((audData.estadoKanban || audData.fase) && { estado: audData.estadoKanban || audData.fase }),
          ...((audData.nivelRiesgo || audData.riesgoKanban || audData.calificacionRiesgo) && { nivelRiesgo: audData.nivelRiesgo || audData.riesgoKanban || audData.calificacionRiesgo }),
          ...(audData.auditorLider?.email && { auditorLiderEmail: audData.auditorLider.email }),
          // Variables para PDF e informe (procedentes de BD)
          ...(audData.territorial && { territorial: audData.territorial }),
          ...(audData.alcance && { alcance: audData.alcance }),
          ...(objTexto(audData.objetivos) && { objetivo: objTexto(audData.objetivos) }),
          ...(audData.equipoAuditores && audData.equipoAuditores.length > 0 && {
            equipoAuditores: audData.equipoAuditores.map((a: any) => ({ nombre: a.nombre || a.nom_largo || 'Auditor', rol: a.cargo || a.rol })),
          }),
          ...(audData.responsable && { responsable: audData.responsable }),
          ...(audData.responsableAreaNombre && { 
            responsableUnidadAuditada: audData.responsableAreaNombre,
            responsableUnidad: audData.responsableAreaNombre 
          }),
          ...(audData.responsableAreaCargo && { cargo: audData.responsableAreaCargo }),
          ...(audData.responsableAreaEmail && { responsableEmail: audData.responsableAreaEmail }),
          ...(audData.areaObjetivo && { areaResponsable: audData.areaObjetivo }),
          ...(audData.territorialInfo && {
            lugarEjecucion: audData.territorialInfo.ciudad
              ? `${audData.territorialInfo.ciudad}${audData.territorialInfo.departamento ? ' – ' + audData.territorialInfo.departamento : ''}`
              : audData.territorial,
          }),
          ...(audData.riesgosIdentificados && { riesgosIdentificados: audData.riesgosIdentificados }),
          ...(audData.focos && { focos: audData.focos }),
          ...(audData.fortalezas && { fortalezas: audData.fortalezas }),
          ...(audData.recomendacionesPorCategoria && { recomendacionesPorCategoria: audData.recomendacionesPorCategoria }),
          ...(audData.fechaReunionApertura && { fechaReunionApertura: audData.fechaReunionApertura }),
          ...(audData.fechaReunionCierre && { fechaReunionCierre: audData.fechaReunionCierre }),
          reuniones: reunionesArr,
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

  // Si soloSeguimiento (tab Seguimiento del expediente), mostrar sección 6 por defecto (Verificación)
  useEffect(() => {
    if (soloSeguimiento && seccionActual < 6) setSeccionActual(6);
  }, [soloSeguimiento]);

  const planCompleto = useMemo(() => {
    if (!planCreado || !planEstadisticas) return false;
    return planEstadisticas.totalAcciones >= 1 && planEstadisticas.accionesCompletadas >= 1;
  }, [planCreado, planEstadisticas]);

  const progreso = useMemo(() => {
    let c = 0;
    if (estadoComunicacion?.informePreliminarGenerado) c++;
    if (!estadoComunicacion?.hayControversiasPendientes) c++;
    if (informeFinal.generado) c++;
    if (planCompleto) c++;
    return Math.round((c / 4) * 100);
  }, [estadoComunicacion, informeFinal.generado, planCompleto]);

  const puedeAvanzar = useMemo(() => {
    return (estadoComunicacion?.informePreliminarGenerado ?? false) &&
           !estadoComunicacion?.hayControversiasPendientes &&
           informeFinal.generado &&
           planCompleto;
  }, [estadoComunicacion, informeFinal.generado, planCompleto]);

  const todasAccionesVerificadas = useMemo(() => {
    let total = 0;
    let sinVerificar = 0;
    let incumplidas = 0;
    for (const plan of planesParaVerificacion) {
      const acciones = plan.acciones || [];
      for (const a of acciones) {
        total++;
        const e = String(a?.estadoVerificacionOci ?? '').trim().toLowerCase();
        if (!e || e === 'sin_verificar') {
          sinVerificar++;
        } else if (e === 'incumplida') {
          incumplidas++;
        }
        // 'cumplida' y 'parcial' se consideran verificadas (válidas para cerrar)
      }
    }
    // Puede cerrar si está 100% verificado y no existe ninguna incumplida.
    // Mantener el comportamiento de "si no hay acciones, permitir acceso" (total === 0).
    return total === 0 || (sinVerificar === 0 && incumplidas === 0);
  }, [planesParaVerificacion]);

  const handleGenerarInformePreliminar = async () => {
    if (useAPI) {
      try {
        const res = await controlInternoService.generarInformePreliminar(id);
        toast.success(res?.mensaje || 'Informe preliminar generado');
        setInformePreliminar(prev => ({ ...prev, generado: true }));
        await cargarDatos();
      } catch (err: any) {
        toast.error(err?.message || 'Error al generar');
      }
    } else {
      setInformePreliminar(prev => ({ ...prev, generado: true }));
      toast.success('Informe Preliminar generado (demo)');
    }
  };

  const handleAceptarHallazgo = async (hallazgoId: string) => {
    if (!useAPI) {
      setHallazgos(prev => prev.map(h => h.id === hallazgoId ? { ...h, estado: 'aceptado' } : h));
      toast.success('Hallazgo aceptado (demo)');
      return;
    }
    try {
      await controlInternoService.aceptarHallazgo(hallazgoId);
      toast.success('Hallazgo aceptado');
      await cargarDatos();
    } catch (err: any) {
      toast.error(err?.message || 'Error al aceptar');
    }
  };

  const handlePresentarControversia = async (hallazgoId: string, argumentos: string, documentoId: string, documentoNombre: string) => {
    if (!argumentos?.trim()) {
      toast.error('Los argumentos son obligatorios');
      return;
    }
    if (!documentoId || !documentoNombre) {
      toast.error('El documento adjunto es obligatorio');
      return;
    }
    if (!useAPI) {
      setHallazgos(prev => prev.map(h => h.id === hallazgoId ? { ...h, estado: 'en-controversia', argumentosControversia: argumentos } : h));
      setModalControversiaHallazgoId(null);
      toast.success('Controversia presentada (demo)');
      return;
    }
    try {
      await controlInternoService.presentarControversia(hallazgoId, { argumentos, documentoId, documentoNombre });
      toast.success('Controversia presentada');
      setModalControversiaHallazgoId(null);
      await cargarDatos();
    } catch (err: any) {
      toast.error(err?.message || 'Error al presentar controversia');
    }
  };

  const handleDecisionAuditor = async (hallazgoId: string, tipoDecision: 'ratificado' | 'modificado' | 'retirado', fundamentacion: string) => {
    if (!fundamentacion?.trim()) {
      toast.error('La fundamentación técnica es obligatoria');
      return;
    }
    if (!useAPI) {
      setHallazgos(prev => prev.map(h => h.id === hallazgoId ? { ...h, estado: tipoDecision, decisionAuditor: tipoDecision, fundamentacionTecnica: fundamentacion } : h));
      setModalDecisionHallazgoId(null);
      toast.success(`Decisión registrada: ${tipoDecision}`);
      return;
    }
    try {
      await controlInternoService.decisionAuditor(hallazgoId, { tipoDecision, fundamentacionTecnica: fundamentacion });
      toast.success(`Decisión registrada: ${tipoDecision}`);
      setModalDecisionHallazgoId(null);
      await cargarDatos();
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar decisión');
    }
  };

  const handleGenerarInformeFinal = async () => {
    if (estadoComunicacion?.hayControversiasPendientes) {
      toast.error('No se puede generar el Informe Final mientras existan controversias pendientes de decisión');
      return;
    }
    
    if (useAPI) {
      try {
        await controlInternoService.generarInformeFinal(id);
        setInformeFinal(prev => ({ ...prev, fecha: new Date().toISOString(), generado: true }));
        await cargarDatos();
        toast.success('Informe Final generado exitosamente');
        setSeccionActual(4); // Pasar a Plan de Mejoramiento
      } catch (err: any) {
        toast.error(err?.message || 'Error al generar');
      }
    } else {
      setInformeFinal(prev => ({
        ...prev,
        fecha: new Date().toISOString(),
        controversiasResueltas: hallazgos.filter(h => ['ratificado', 'modificado', 'retirado'].includes(h.estado || '')).length,
        hallazgosAjustados: hallazgos.filter(h => h.estado === 'retirado').length,
        generado: true
      }));
      toast.success('Informe Final generado (demo)');
      setSeccionActual(4);
    }
  };

  const handleGenerarInformeEjecutivo = async () => {
    if (!informeEjecutivo.observacionesFinales?.trim()) {
      toast.error('Debe agregar observaciones finales para el Informe Ejecutivo');
      return;
    }
    if (useAPI) {
      try {
        // Enviar observaciones finales antes de generar si el API lo requiere o vía update
        await controlInternoService.updateInformeCierre(id, { 
          leccionesAprendidas: informeEjecutivo.observacionesFinales 
        });
        await controlInternoService.generarInformeEjecutivo(id);
        setInformeEjecutivo(prev => ({ ...prev, fecha: new Date().toISOString(), generado: true }));
        await cargarDatos();
        toast.success('Informe Ejecutivo generado exitosamente');
        setSeccionActual(6); // Pasar a Verificación
      } catch (err: any) {
        toast.error(err?.message || 'Error al generar');
      }
    } else {
      setInformeEjecutivo(prev => ({
        ...prev,
        fecha: new Date().toISOString(),
        generado: true
      }));
      toast.success('Informe Ejecutivo generado (demo)');
      setSeccionActual(6);
    }
  };

  const handleFinalizarComunicacion = async () => {
    if (!puedeAvanzar) {
      toast.error('Debe completar todas las secciones antes de finalizar');
      return;
    }

    if (useAPI) {
      try {
        await controlInternoService.updateEstadoKanbanAuditoria(id, 'Seguimiento');
        toast.success('Fase de Comunicación completada. Continúe con Verificación de Cumplimiento e Informe de Cierre.');
        setPasamosASeguimiento(true);
        setTabPrincipal('seguimiento');
        setSeccionActual(5);
        onComunicacionCompletada?.();
      } catch (err: any) {
        toast.error(err?.message || 'Error al finalizar la comunicación');
      }
    } else {
      toast.success('Fase de Comunicación completada. Continúe con Verificación e Informe de Cierre.');
      setPasamosASeguimiento(true);
      setTabPrincipal('seguimiento');
      setSeccionActual(5);
      onComunicacionCompletada?.();
    }
  };

  // ====================================
  // RENDER
  // ====================================

  const duracionDias = auditoria.esTerritoriales ? 2 : 10; // SEDE: 10-15d, TERRITORIAL: 2d
  return (
    <div className={embedded ? 'space-y-4' : 'min-h-screen bg-[#F8FAFC] pb-20'}>
      <div className={embedded ? 'space-y-4' : 'max-w-7xl mx-auto px-4 md:px-8 space-y-8 pt-6'}>
        
        {/* HEADER - oculto en modo embebido (el expediente ya tiene Card de fase) */}
        {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#003DA5] via-[#002B7A] to-[#001D52] text-white rounded-2xl shadow-2xl p-8 relative overflow-hidden"
        >
          {/* Elementos decorativos premium */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-24 -mb-24 blur-2xl" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col xl:flex-row items-center gap-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner border border-white/20 shrink-0">
                  <FileText className="w-8 h-8 text-blue-200" />
                </div>
                <div>
                  <BadgeSIGL variant="info" className="bg-white/20 text-white border-white/30 backdrop-blur-sm mb-2 uppercase tracking-widest text-[10px] font-black">
                    PROCESO DE AUDITORÍA
                  </BadgeSIGL>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">Fase de Comunicación</h1>
                  <p className="text-blue-100/80 text-lg font-medium mt-1">
                    {auditoria.codigo} <span className="mx-2 opacity-30">|</span> {auditoria.nombre}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 md:mt-0">
                <BadgeSIGL variant="info" className="bg-white/10 text-white border-white/10">
                  <Users className="w-3 h-3 mr-1" />
                  {typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : auditoria.auditorLider?.nombre || 'No asignado'}
                </BadgeSIGL>
                <BadgeSIGL variant="default" className="bg-white/10 text-white border-white/10">
                  <Calendar className="w-3 h-3 mr-1" />
                  Duración: {duracionDias} días
                </BadgeSIGL>
                <BadgeSIGL variant="warning" className="bg-amber-400/20 text-amber-200 border-amber-400/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {auditoria.hallazgos.length} Hallazgos
                </BadgeSIGL>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[200px]">
              <div className="text-xs text-blue-100/60 uppercase tracking-widest font-bold mb-2">Progreso General</div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-white">{progreso}%</div>
                <div className="flex-1">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progreso}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* NAVEGACIÓN DE SECCIONES: Comunicación (1-4) o Seguimiento (5-6). Solo el tab Seguimiento del expediente muestra 5-6 (soloSeguimiento). */}
        <div className={embedded ? 'bg-white border-2 border-green-200 rounded-lg p-4' : 'bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-2 ring-1 ring-black/5 sticky top-6 z-40'}>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth p-1">
            {soloSeguimiento ? (
              // Strip Seguimiento: Ejecutivo | Verificación | Informe de Cierre
              [
                { id: 5, nombre: 'Informe Ejecutivo', icono: TrendingUp, completado: informeEjecutivo.generado },
                { id: 6, nombre: 'Verificación Cumplimiento', icono: ClipboardCheck, completado: todasAccionesVerificadas },
                { id: 7, nombre: 'Informe de Cierre', icono: BookOpen, completado: informeCierreAprobado },
              ].map((seccion, index) => {
                const puedeAcceder = 
                  seccion.id === 5 || 
                  (seccion.id === 6 && informeEjecutivo.generado) ||
                  (seccion.id === 7 && todasAccionesVerificadas);
                return (
                  <React.Fragment key={seccion.id}>
                    <button
                      onClick={() => puedeAcceder && setSeccionActual(seccion.id)}
                      className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all min-w-[100px] ${
                        seccionActual === seccion.id ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      } ${!puedeAcceder ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className={`p-2 rounded-full ${seccionActual === seccion.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <seccion.icono className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-center leading-tight uppercase tracking-wider">{seccion.nombre}</span>
                      {seccion.completado && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                    {index < 2 && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  </React.Fragment>
                );
              })
            ) : (
              // Strip Comunicación: 1, 2, 3, 4
              [
                { id: 1, nombre: 'Informe Preliminar', icono: FileText, completado: informePreliminar.generado },
                { id: 2, nombre: 'Respuesta y Análisis', icono: MessageSquare, completado: !estadoComunicacion?.hayControversiasPendientes },
                { id: 3, nombre: 'Informe Final', icono: FileCheck, completado: informeFinal.generado },
                { id: 4, nombre: 'Plan de Mejoramiento', icono: ClipboardCheck, completado: planCompleto },
              ].map((seccion, index) => {
                const seccion1Completa = informePreliminar.generado;
                const seccion2Completa = !estadoComunicacion?.hayControversiasPendientes;
                const seccion3Completa = informeFinal.generado;
                const puedeAcceder =
                  seccion.id === 1 ||
                  (seccion.id === 2 && seccion1Completa) ||
                  (seccion.id === 3 && seccion1Completa && seccion2Completa) ||
                  (seccion.id === 4 && seccion1Completa && seccion2Completa && seccion3Completa);
                return (
                  <React.Fragment key={seccion.id}>
                    <button
                      onClick={() => puedeAcceder && setSeccionActual(seccion.id)}
                      disabled={!puedeAcceder}
                      title={!puedeAcceder ? 'Complete la sección anterior primero' : undefined}
                      className={`flex flex-col items-center justify-center gap-1 px-3 py-4 rounded-xl transition-all flex-1 min-w-[140px] min-h-[90px] text-center relative ${
                        !puedeAcceder ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : seccionActual === seccion.id ? (embedded ? 'bg-green-600 text-white shadow-md' : 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-xl scale-105 z-10')
                          : seccion.completado ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <seccion.icono className={`w-6 h-6 ${seccionActual === seccion.id ? 'animate-pulse' : ''}`} />
                      <span className="text-xs sm:text-sm font-bold leading-tight max-w-[120px]">{seccion.nombre}</span>
                      {seccion.completado && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-current" />
                        </div>
                      )}
                    </button>
                    {index < 3 && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* CONTENIDO DINÁMICO - wrapper con estilo expediente cuando embedded */}
        <div className={embedded ? 'bg-white border-2 border-green-200 rounded-lg p-4 mt-4' : ''}>
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
                auditoria={{ ...auditoria, hallazgos }}
                informe={informePreliminar}
                setInforme={setInformePreliminar}
                onGenerar={handleGenerarInformePreliminar}
                onPreview={() => setModalPreview({ tipo: 'preliminar', abierto: true })}
                onDescargarPDF={async () => {
                  if (!informePreliminar.generado) return;
                  const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
                  const { generarContenidoInformeIA, aplicarContenidoIA } = await import('./services/generarContenidoInformeIA');
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

                    // Datos base de la auditoría
                  const auditoriaBase = {
                    codigo: auditoria.codigo,
                    nombre: auditoria.nombre,
                    proceso: auditoria.proceso,
                    auditorLider:
                      typeof auditoria.auditorLider === 'string'
                        ? auditoria.auditorLider
                        : (auditoria as any).auditorLider?.nombre || 'No asignado',
                    radicado: (auditoria as any).radicado,
                    fechaOficio: informePreliminar.fecha,
                    destinatarioNombre: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
                    destinatarioCargo: (auditoria as any).cargo || (auditoria as any).responsableAreaCargo || 'Director(a) Territorial',
                    unidadAuditable: (auditoria as any).territorial || (auditoria as any).areaResponsable || auditoria.nombre,
                    fechaLimitePronunciamiento: (auditoria as any).fechaLimitePronunciamiento,
                    jefeOCI: (auditoria as any).jefeOCI,
                    // Elaboró: líder + resto del equipo
                    elaboro: [
                      typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : (auditoria as any).auditorLider?.nombre,
                      ...((auditoria as any).equipoAuditores?.slice?.(1) || []).map((a: any) => typeof a === 'string' ? a : a?.nombre).filter(Boolean),
                    ].filter(Boolean).join(' / '),
                    tituloAuditoria: auditoria.nombre,
                    responsableUnidadAuditada: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
                    // Lugar de ejecución: campo explícito > sede > territorial
                    lugarEjecucion: (auditoria as any).lugarEjecucion || (auditoria as any).sede || (auditoria as any).territorial,
                    // Fechas de ejecución de la auditoría (cuándo se realizó)
                    fechaEjecucionInicio: (auditoria as any).fechaInicioEjecucion || auditoria.fechaInicio,
                    fechaEjecucionFin: (auditoria as any).fechaFinEjecucion || auditoria.fechaFin,
                    // Período auditado (qué vigencia se evaluó) — distinto a fechas de ejecución
                    periodoAuditoria: (auditoria as any).periodoAuditoria
                      || (auditoria as any).programaAnualMetadata?.periodoAuditado
                      || (auditoria.fechaInicio && auditoria.fechaFin
                          ? `${auditoria.fechaInicio} al ${auditoria.fechaFin}`
                          : undefined),
                    periodoAuditadoTexto: (auditoria as any).periodoAuditadoTexto
                      || (auditoria as any).programaAnualMetadata?.periodoAuditado
                      || (auditoria as any).periodoAuditoria,
                    // Año del Plan Anual (para texto “Plan Anual de Auditoría del año XXXX”)
                    planAnualAño: (auditoria as any).planAnualAño
                      || (auditoria as any).programaAnualMetadata?.año
                      || (auditoria.fechaInicio
                          ? new Date(auditoria.fechaInicio).getFullYear()
                          : new Date().getFullYear()),
                    equipoAuditor: (auditoria as any).equipoAuditores?.map((a: any) => ({ nombre: a.nombre || a, rol: a.rol })),
                    // Campos opcionales del API (prioridad sobre generación IA)
                    objetivo: (auditoria as any).objetivo,
                    alcance: (auditoria as any).alcance,
                    marcoNormativo: (auditoria as any).marcoNormativo,
                    contextoGeneral: (auditoria as any).contextoGeneral,
                    descripcionUnidad: (auditoria as any).descripcionUnidad,
                    reuniones: (auditoria as any).reuniones,
                    cartaRepresentacionFecha: (auditoria as any).cartaRepresentacionFecha,
                    procesosAuditados: (auditoria as any).procesosAuditados,
                    planesMejoramiento: (auditoria as any).planesMejoramiento,
                    aspectosRelevantes: (auditoria as any).aspectosRelevantes,
                    evaluacionControlInterno: (auditoria as any).evaluacionControlInterno,
                    fortalezas: (auditoria as any).fortalezas,
                    recomendacionesPorCategoria: (auditoria as any).recomendacionesPorCategoria,
                    riesgosIdentificados: (auditoria as any).riesgosIdentificados,
                    riesgosAsociados: (auditoria as any).riesgosAsociados,
                    focos: auditoria.focos,
                    declaracion: (auditoria as any).declaracion,
                  };

                  // Generar contenido IA y aplicarlo (enriquece los campos vacíos)
                  toast.loading('Generando contenido del informe...', { id: 'pdf-gen' });
                  let auditoriaFinal = auditoriaBase;
                  let informeFinal = { ...informePreliminar, foliosAnexos: informePreliminar.hallazgos ? Math.max(10, informePreliminar.hallazgos * 3) : undefined };
                  try {
                    const contenidoIA = await generarContenidoInformeIA(
                      auditoriaBase,
                      hallazgosParaPDF,
                      (msg) => toast.loading(msg, { id: 'pdf-gen' })
                    );
                    auditoriaFinal = aplicarContenidoIA(auditoriaBase, contenidoIA);
                    // Si la IA generó hallazgos (o usamos los por defecto) y no tenemos en el estado, usarlos
                    if ((auditoriaFinal as any).hallazgos && hallazgosParaPDF.length === 0) {
                      hallazgosParaPDF = (auditoriaFinal as any).hallazgos;
                    }
                    // Usar conclusiones generadas si no hay observaciones propias
                    if (!informePreliminar.observaciones && contenidoIA.conclusiones) {
                      informeFinal = { ...informeFinal, observaciones: contenidoIA.conclusiones };
                    }
                    toast.success('Contenido generado. Descargando PDF...', { id: 'pdf-gen' });
                  } catch {
                    toast.dismiss('pdf-gen');
                  }

                  await exportarPDFInformeAuditoria('preliminar', auditoriaFinal, informeFinal, hallazgosParaPDF);
                  toast.dismiss('pdf-gen');
                }}
                loading={loading}
                puedeGenerar={!informePreliminar.generado}
                embedded={embedded}
              />
            )}

            {seccionActual === 2 && (
              <SeccionGestionHallazgos
                auditoria={{ ...auditoria, hallazgos }}
                hallazgos={hallazgos}
                estadoComunicacion={estadoComunicacion}
                onAceptar={handleAceptarHallazgo}
                onPresentarControversia={(hid) => setModalControversiaHallazgoId(hid)}
                onDecisionAuditor={(hid) => setModalDecisionHallazgoId(hid)}
                onDecisionConfirmar={handleDecisionAuditor}
                loading={loading}
              />
            )}

            {seccionActual === 3 && (
              <SeccionInformeFinal
                auditoria={{ ...auditoria, hallazgos }}
                hallazgos={hallazgos}
                estadoComunicacion={estadoComunicacion}
                informe={informeFinal}
                setInforme={setInformeFinal}
                onGenerar={handleGenerarInformeFinal}
                onPreview={() => setModalPreview({ tipo: 'final', abierto: true })}
              />
            )}

            {seccionActual === 4 && (
              <SeccionPlanMejoramiento
                auditoria={auditoria}
                planCreado={planCreado}
                planEstadisticas={planEstadisticas}
                planCompleto={planCompleto}
                onCrearPlanMejoramiento={handleCrearPlanMejoramiento}
                hallazgosCount={hallazgos.filter(h => h.estado !== 'retirado').length}
                onIrAPlan={handleIrAVerPlan}
              />
            )}

            {seccionActual === 5 && soloSeguimiento && (
              <SeccionInformeEjecutivo
                auditoria={{ ...auditoria, hallazgos }}
                hallazgos={hallazgos}
                informe={informeEjecutivo}
                setInforme={setInformeEjecutivo}
                onGenerar={handleGenerarInformeEjecutivo}
                onPreview={() => setModalPreview({ tipo: 'ejecutivo', abierto: true })}
              />
            )}

            {seccionActual === 6 && soloSeguimiento && (
              <SeccionVerificacionCumplimiento
                auditoriaId={id}
                planes={planesParaVerificacion}
                loading={loadingVerificacion}
                onRefrescar={cargarPlanesParaVerificacion}
                useAPI={readOnly ? false : useAPI}
                embedded={embedded}
                readOnly={readOnly}
              />
            )}

            {seccionActual === 7 && soloSeguimiento && (() => {
              const tieneDocumentoCierre = documentos.some(d =>
                d.id?.startsWith('doc-cierre') || /cierre|informe\s*de\s*cierre/i.test(d.nombre || '')
              );
              return (
              <SeccionInformeCierre
                auditoriaId={id}
                auditoriaCodigo={auditoria.codigo}
                auditoriaNombre={auditoria.nombre}
                resumen={resumenCierre}
                leccionesAprendidas={leccionesAprendidas}
                recomendacionesFuturas={recomendacionesFuturas}
                informeCierreAprobado={informeCierreAprobado}
                loading={loadingInformeCierre}
                tieneDocumentoCierre={tieneDocumentoCierre}
                onLeccionesChange={setLeccionesAprendidas}
                onRecomendacionesChange={setRecomendacionesFuturas}
                onDescargarPDF={async () => {
                  try {
                    const { exportarPDFInformeCierre } = await import('./services/exportarPDFInformeCierreEjecutivo');
                    const totalHallazgos = hallazgos.length;
                    const hallazgosCriticos = hallazgos.filter((h) => String(h.gravedad || '').toUpperCase() === 'CRITICO').length;
                    const hallazgosMayores = hallazgos.filter((h) => String(h.gravedad || '').toUpperCase() === 'GRAVE').length;
                    const hallazgosMenores = hallazgos.filter((h) => {
                      const g = String(h.gravedad || '').toUpperCase();
                      return g === 'MODERADO' || g === 'LEVE';
                    }).length;

                    const datos: import('./services/exportarPDFInformeCierreEjecutivo').DatosInformeCierre = {
                      auditoria: {
                        codigo: auditoria.codigo,
                        nombre: auditoria.nombre,
                        tipo: (auditoria as any).tipo || (auditoria as any).tipoAuditoria,
                        estado: (auditoria as any).estado || estadoAuditoriaProp,
                        areaAuditable: (auditoria as any).areaAuditable || (auditoria as any).areaResponsable || (auditoria as any).areaObjetivo,
                        procesoNombre: auditoria.proceso,
                        nivelRiesgo: (auditoria as any).nivelRiesgo || (auditoria as any).riesgoKanban || (auditoria as any).calificacionRiesgo,
                        auditorLider: typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : (auditoria as any).auditorLider?.nombre || '—',
                        auditorLiderEmail: (auditoria as any).auditorLiderEmail || (auditoria as any).auditorLider?.email,
                        territorial: (auditoria as any).territorial,
                        responsableArea: {
                          nombre: (auditoria as any).responsableArea?.nombre || (auditoria as any).responsableUnidad || (auditoria as any).responsable,
                          cargo: (auditoria as any).responsableArea?.cargo || (auditoria as any).cargo,
                          email: (auditoria as any).responsableArea?.email || (auditoria as any).responsableEmail,
                          telefono: (auditoria as any).responsableArea?.telefono,
                        },
                        equipoAuditores: (auditoria as any).equipoAuditores,
                        cronograma: { fechaInicio: auditoria.fechaInicio, fechaFin: auditoria.fechaFin },
                        progreso: { general: (auditoria as any).progresoGeneral },
                        estadisticas: {
                          totalHallazgos,
                          hallazgosCriticos,
                          hallazgosMayores,
                          hallazgosMenores,
                          documentosCargados: (auditoria as any).documentosCargados || (auditoria as any).totalDocumentos,
                          notificacionesEnviadas: (auditoria as any).notificacionesEnviadas,
                        },
                      },
                      resumen: resumenCierre ? { ...resumenCierre, leccionesAprendidas, recomendacionesFuturasAuditorias: recomendacionesFuturas } : null,
                      planes: planesParaVerificacion || [],
                      hallazgos: (auditoria.hallazgos || []).map((h: Hallazgo) => ({
                        id: h.id,
                        codigo: h.codigo,
                        titulo: h.titulo,
                        descripcion: h.descripcion || '',
                        gravedad: h.gravedad,
                        decisionAuditor: h.decisionAuditor,
                        estado: h.estado,
                        fundamentacionTecnica: h.fundamentacionTecnica,
                      })),
                    };
                    await exportarPDFInformeCierre(datos);
                    toast.success('Informe de cierre descargado');
                  } catch (err: any) {
                    toast.error(err?.message || 'Error al generar el PDF');
                  }
                }}
                onGuardarBorrador={readOnly ? async () => {} : async () => {
                  if (!useAPI) return;
                  setLoadingInformeCierre(true);
                  try {
                    await controlInternoService.updateInformeCierre(id, {
                      leccionesAprendidas,
                      recomendacionesFuturasAuditorias: recomendacionesFuturas,
                    });
                    toast.success('Borrador guardado');
                    cargarResumenCierre();
                  } catch (err: any) {
                    toast.error(err?.message || 'Error al guardar');
                  } finally {
                    setLoadingInformeCierre(false);
                  }
                }}
                onAprobar={readOnly ? async () => {} : async () => {
                  if (!useAPI) return;
                  if (!tieneDocumentoCierre) {
                    toast.error('Debe subir el Documento de Cierre antes de aprobar.');
                    return;
                  }
                  setLoadingInformeCierre(true);
                  try {
                    await controlInternoService.aprobarInformeCierre(id);
                    toast.success('Informe de cierre aprobado. Auditoría finalizada.');
                    setInformeCierreAprobado(true);
                    cargarResumenCierre();
                    onComunicacionCompletada?.();
                  } catch (err: any) {
                    toast.error(err?.message || 'Error al aprobar');
                  } finally {
                    setLoadingInformeCierre(false);
                  }
                }}
                puedeAprobar={readOnly ? false : todasAccionesVerificadas}
                useAPI={readOnly ? false : useAPI}
                embedded={embedded}
                readOnly={readOnly}
                onSubirDocumento={onSubirDocumento}
                onRecargarDocumentos={onRecargarDocumentos}
                totalHallazgos={resumenCierre?.totalHallazgos ?? (auditoria.hallazgos?.length ?? 0)}
                onFinalizarConDocumento={readOnly || !onSubirDocumento ? undefined : async (archivo, _comentarios) => {
                  if (!onSubirDocumento) return;
                  const ok = await onSubirDocumento(archivo, {
                    nombre: `Informe de Cierre - ${auditoria.codigo || auditoria.nombre}`,
                    tipoDocumento: 'informe',
                    etapa: 'cierre',
                  });
                  if (!ok) throw new Error('Error al subir');
                  await onRecargarDocumentos?.();
                  setLoadingInformeCierre(true);
                  try {
                    await controlInternoService.updateInformeCierre(id, {
                      leccionesAprendidas,
                      recomendacionesFuturasAuditorias: recomendacionesFuturas,
                    });
                    await controlInternoService.aprobarInformeCierre(id);
                    setInformeCierreAprobado(true);
                    cargarResumenCierre();
                    onComunicacionCompletada?.();
                  } finally {
                    setLoadingInformeCierre(false);
                  }
                }}
              />
            );
            })()}
          </motion.div>
        </AnimatePresence>
        </div>

        {/* BOTÓN FINALIZAR - solo cuando aún no está en Seguimiento y no es vista solo Seguimiento */}
        {!enSeguimiento && !soloSeguimiento && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={embedded ? 'bg-white border-2 border-green-200 rounded-lg p-4 mt-4' : 'bg-white rounded-xl shadow-lg p-6'}
        >
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${puedeAvanzar ? 'p-4 bg-green-50/50 border border-green-200 rounded-lg' : ''}`}>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">¿Listo para finalizar la comunicación?</h3>
              <p className="text-sm text-gray-600">
                {puedeAvanzar 
                  ? 'Todas las secciones completadas. Puede avanzar a Seguimiento (el plan de mejoramiento ya fue creado con las acciones correctivas).'
                  : 'Complete: Informe Preliminar, Gestión Hallazgos, Informe Final y Plan de Mejoramiento para poder finalizar.'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleFinalizarComunicacion}
              disabled={!puedeAvanzar}
              className={`font-medium shrink-0 ${puedeAvanzar ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            >
              <Send className="w-4 h-4 mr-2" />
              Finalizar y Pasar a Seguimiento
            </Button>
          </div>
        </motion.div>
        )}

        {/* MODAL PRESENTAR CONTROVERSIA (por hallazgo) */}
        {modalControversiaHallazgoId && (
          <ModalControversiaPorHallazgo
            hallazgo={hallazgos.find(h => h.id === modalControversiaHallazgoId)}
            onClose={() => setModalControversiaHallazgoId(null)}
            onEnviar={handlePresentarControversia}
          />
        )}

        {/* MODAL DECISIÓN DEL AUDITOR */}
        {modalDecisionHallazgoId && (
          <ModalDecisionAuditor
            hallazgo={hallazgos.find(h => h.id === modalDecisionHallazgoId)}
            onClose={() => setModalDecisionHallazgoId(null)}
            onConfirmar={handleDecisionAuditor}
          />
        )}

        {/* MODAL PREVIEW */}
        {modalPreview.abierto && (
          <ModalPreviewInforme
            tipo={modalPreview.tipo}
            auditoria={auditoria}
            informe={
              modalPreview.tipo === 'preliminar' ? informePreliminar :
              informeFinal
            }
            onClose={() => setModalPreview({ tipo: '', abierto: false })}
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
  onDescargarPDF?: () => void;
  loading?: boolean;
  puedeGenerar?: boolean;
  embedded?: boolean;
}> = ({ auditoria, informe, setInforme, onGenerar, onPreview, onDescargarPDF, loading, puedeGenerar = true, embedded = false }) => {
  return (
    <div className="space-y-4">
      {/* Banner: Informe ya terminado */}
      {informe.generado && (
        <div className={`${embedded ? 'p-3' : 'p-4'} bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3`}>
          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900 text-lg">Informe Preliminar ya terminado</p>
            <p className="text-sm text-green-700">Área auditada notificada. Período de controversias cerrado.</p>
          </div>
        </div>
      )}

      {/* Estadísticas de Hallazgos */}
      <CardSIGL className={embedded ? '!border !border-gray-200 !shadow-none' : ''}>
        <div className={embedded ? 'p-4' : 'p-6'}>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-green-600" />
            Resumen de Hallazgos Identificados
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-2xl font-bold text-gray-900">{informe.hallazgos}</div>
              <div className="text-xs text-gray-600">Total Hallazgos</div>
            </div>

            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="text-2xl font-bold text-red-700">{informe.graves}</div>
              <div className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Graves
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{informe.moderados}</div>
              <div className="text-xs text-yellow-600">Moderados</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{informe.leves}</div>
              <div className="text-xs text-blue-600">Leves</div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Riesgos Identificados del Proceso */}
      {((auditoria as any).riesgosIdentificados?.length > 0 || (auditoria as any).objetivo) && (
        <CardSIGL className={embedded ? '!border !border-gray-200 !shadow-none' : ''}>
          <div className={embedded ? 'p-4' : 'p-6'}>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Riesgos y Objetivos de la Auditoría
            </h3>

            {(auditoria as any).objetivo && (
              <div className="mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Objetivo Técnico</span>
                <p className="text-[13px] text-gray-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">{(auditoria as any).objetivo}</p>
              </div>
            )}

            {(auditoria as any).alcance && (
              <div className="mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Alcance de la Auditoría</span>
                <p className="text-[13px] text-gray-700 leading-relaxed">{(auditoria as any).alcance}</p>
              </div>
            )}

            {(auditoria as any).riesgosIdentificados?.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-2">Riesgos Específicos Identificados</span>
                <div className="grid grid-cols-1 gap-2">
                  {(auditoria as any).riesgosIdentificados.map((riesgo: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 bg-red-50/50 border border-red-100 rounded-lg text-[13px] text-red-900 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      {riesgo}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(auditoria as any).fortalezas?.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-bold text-green-500 uppercase tracking-wider block mb-2">Fortalezas Identificadas</span>
                <div className="grid grid-cols-1 gap-2">
                  {(auditoria as any).fortalezas.map((f: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 bg-green-50/50 border border-green-100 rounded-lg text-[13px] text-green-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(auditoria as any).recomendacionesPorCategoria?.length > 0 && (
              <div>
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-2">Recomendaciones por Categoría</span>
                <div className="space-y-3">
                  {(auditoria as any).recomendacionesPorCategoria.map((cat: any, idx: number) => (
                    <div key={idx} className="bg-blue-50/30 border border-blue-100 rounded-lg p-3">
                      <h4 className="text-[13px] font-bold text-blue-900 mb-2 uppercase">{cat.categoria}</h4>
                      <ul className="space-y-1">
                        {cat.items?.map((item: string, i: number) => (
                          <li key={i} className="text-[12px] text-blue-800 flex items-start gap-2">
                            <span className="shrink-0 mt-1.5 w-1 h-1 bg-blue-400 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardSIGL>
      )}
      <CardSIGL className={embedded ? '!border !border-gray-200 !shadow-none' : ''}>
        <div className={embedded ? 'p-4' : 'p-6'}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Detalle de Hallazgos</h3>
          <div className="space-y-3">
            {auditoria.hallazgos.map((hallazgo, index) => (
              <div key={hallazgo.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-700 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900 truncate" title={hallazgo.titulo}>{hallazgo.titulo}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2" title={hallazgo.descripcion}>{hallazgo.descripcion}</p>
                    </div>
                  </div>
                  <BadgeSIGL variant={
                    hallazgo.gravedad === 'GRAVE' ? 'danger' :
                    hallazgo.gravedad === 'MODERADO' ? 'warning' : 'info'
                  } className="flex-shrink-0">
                    {hallazgo.gravedad}
                  </BadgeSIGL>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-700">Causas:</span>
                    <div className="text-gray-600 mt-1 overflow-hidden">
                      {(hallazgo.causas?.length ? hallazgo.causas : (hallazgo as any).causa ? [(hallazgo as any).causa] : []).length ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {(hallazgo.causas?.length ? hallazgo.causas : [(hallazgo as any).causa]).map((c, i) => (
                            <li key={i} className="truncate" title={c}>{c}</li>
                          ))}
                        </ul>
                      ) : hallazgo.descripcion ? (
                        <p className="text-gray-600 truncate" title={hallazgo.descripcion}>{hallazgo.descripcion}</p>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-700">Efectos:</span>
                    <div className="text-gray-600 mt-1 overflow-hidden">
                      {(hallazgo.efectos?.length ? hallazgo.efectos : (hallazgo as any).efecto ? [(hallazgo as any).efecto] : []).length ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {(hallazgo.efectos?.length ? hallazgo.efectos : [(hallazgo as any).efecto]).map((e, i) => (
                            <li key={i} className="truncate" title={e}>{e}</li>
                          ))}
                        </ul>
                      ) : hallazgo.criterioIncumplido ? (
                        <p className="text-gray-600 truncate" title={hallazgo.criterioIncumplido}>{hallazgo.criterioIncumplido}</p>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-700">Recomendaciones:</span>
                    <div className="text-gray-600 mt-1 overflow-hidden">
                      {hallazgo.recomendaciones?.length ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {hallazgo.recomendaciones.map((r, i) => (
                            <li key={i} className="truncate" title={r}>{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardSIGL>

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
      <div className="flex flex-wrap gap-3 justify-end">
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
      <CardSIGL>
        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
          <h3 className="font-semibold text-gray-900 mb-2">Gestión de Hallazgos — Área Auditada</h3>
          <p className="text-sm text-gray-700 mb-4">
            El área auditada debe responder cada hallazgo dentro del período de 10 días hábiles: aceptarlo o presentar controversia con argumento escrito y documento adjunto obligatorio.
          </p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded-full" />
              <span className="text-gray-600">{pendientes.length} Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-600">{aceptados.length} Aceptado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <span className="text-gray-600">{enControversia.length} En controversia</span>
            </div>
          </div>
        </div>
      </CardSIGL>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hallazgos.map((hallazgo) => {
          const estado = hallazgo.estado || 'notificado';
          const pendiente = estado === 'notificado';
          const enControv = estado === 'en-controversia';
          const conDec = ['ratificado', 'modificado', 'retirado'].includes(estado);

          return (
            <CardSIGL key={hallazgo.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-500">{hallazgo.codigo || hallazgo.id}</span>
                    <h4 className="font-semibold text-gray-900 mt-1 truncate" title={hallazgo.titulo || hallazgo.descripcion}>{hallazgo.titulo || hallazgo.descripcion?.substring(0, 60)}</h4>
                  </div>
                  <BadgeSIGL variant={
                    conDec ? (estado === 'retirado' ? 'success' : estado === 'ratificado' ? 'danger' : 'info') :
                    enControv ? 'warning' : pendiente ? 'default' : 'success'
                  } className="flex-shrink-0">
                    {estado === 'notificado' ? 'Pendiente respuesta' : estado.replace('-', ' ')}
                  </BadgeSIGL>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2" title={hallazgo.descripcion}>{hallazgo.descripcion}</p>
                {hallazgo.criterioIncumplido && (
                  <p className="text-xs text-gray-500 truncate" title={hallazgo.criterioIncumplido}>Criterio: {hallazgo.criterioIncumplido}</p>
                )}

                {pendiente && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Button variant="outline" size="sm" className="border-green-600 text-green-700 hover:bg-green-50" onClick={() => onAceptar(hallazgo.id)} disabled={loading}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aceptar hallazgo
                    </Button>
                    <Button variant="outline" size="sm" className="border-amber-500 text-amber-700 hover:bg-amber-50" onClick={() => onPresentarControversia(hallazgo.id)} disabled={loading}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Presentar controversia
                    </Button>
                  </div>
                )}

                {enControv && !conDec && (
                  <div className="mt-4">
                    {hallazgo.argumentosControversia && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
                        <p className="text-sm font-medium text-amber-800">Argumentos:</p>
                        <p className="text-sm text-amber-900">{hallazgo.argumentosControversia}</p>
                        {hallazgo.documentoControversiaNombre && (
                          <p className="text-xs text-amber-700 mt-1">Doc: {hallazgo.documentoControversiaNombre}</p>
                        )}
                      </div>
                    )}
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onDecisionAuditor(hallazgo.id)} disabled={loading}>
                      Decisión del auditor
                    </Button>
                  </div>
                )}

                {conDec && hallazgo.fundamentacionTecnica && (
                  <div className={`mt-4 p-3 rounded border ${
                    estado === 'ratificado' ? 'bg-red-50 border-red-200' :
                    estado === 'retirado' ? 'bg-green-50 border-green-200' : 'bg-violet-50 border-violet-200'
                  }`}>
                    <p className="text-sm font-medium">Decisión: {estado}</p>
                    <p className="text-sm mt-1">{hallazgo.fundamentacionTecnica}</p>
                    {hallazgo.fechaDecision && (
                      <p className="text-xs mt-1 opacity-75">{new Date(hallazgo.fechaDecision).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </CardSIGL>
          );
        })}
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 3: INFORME FINAL DE AUDITORÍA
// ====================================

const SeccionInformeFinal: React.FC<{
  auditoria: Auditoria;
  hallazgos?: Hallazgo[];
  estadoComunicacion?: { hayControversiasPendientes?: boolean; puedeGenerarInformeFinal?: boolean } | null;
  informe: InformeFinal;
  setInforme: React.Dispatch<React.SetStateAction<InformeFinal>>;
  onGenerar: () => void;
  onPreview: () => void;
}> = ({ auditoria, hallazgos = [], estadoComunicacion, informe, setInforme, onGenerar, onPreview }) => {
  const hayBloqueo = estadoComunicacion?.hayControversiasPendientes ?? (hallazgos.filter(h => h.estado === 'en-controversia').length > 0);
  const enControversia = hallazgos.filter(h => h.estado === 'en-controversia').length;
  const calcularFechaLimiteEstimada = () => {
    const dias = parseInt(informe.plazosPlanMejora || '30', 10) || 30;
    // La base es hoy (fecha de generación/notificación del informe)
    const fechaBase = new Date();
    const fechaLimite = new Date(fechaBase);
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return fechaLimite.toLocaleDateString('es-CO');
  };
  return (
    <div className="space-y-6">
      {/* Banner: Informe Final ya terminado */}
      {informe.generado && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900 text-lg">Informe Final ya terminado</p>
            <p className="text-sm text-green-700">Se han consolidado los hallazgos definitivos y plazos del plan.</p>
          </div>
        </div>
      )}

      {/* BLOQUEO: No avanzar si hay controversias pendientes */}
      {hayBloqueo && !informe.generado && (
        <CardSIGL>
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-900">No se puede generar el Informe Final</p>
                <p className="text-sm text-red-700">
                  Existen {enControversia} controversia(s) pendiente(s) de decisión del auditor.
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Vaya a <strong>Respuesta y Análisis</strong> (sección 2) y registre la decisión del auditor (Ratificado, Modificado o Retirado) para cada hallazgo en controversia.
                </p>
              </div>
            </div>
          </div>
        </CardSIGL>
      )}

      {/* Resumen */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado de Hallazgos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-700 mb-1">{hallazgos.length}</div>
              <div className="text-sm text-blue-600">Total Hallazgos</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-700 mb-1">
                {hallazgos.filter(h => h.estado === 'aceptado' || h.estado === 'retirado').length}
              </div>
              <div className="text-sm text-green-600">Cerrados</div>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-4 border border-violet-200">
              <div className="text-3xl font-bold text-violet-700 mb-1">
                {hallazgos.filter(h => ['ratificado', 'modificado'].includes(h.estado || '')).length}
              </div>
              <div className="text-sm text-violet-600">Ratificados/Modificados</div>
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
                  {hallazgos.filter(h => h.estado !== 'retirado').length} Hallazgos Definitivos
                </p>
                <p className="text-sm text-purple-700">
                  ({hallazgos.filter(h => h.estado === 'retirado').length} retirados por decisión del auditor)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {hallazgos
              .filter(h => h.estado !== 'retirado')
              .map((hallazgo, index) => (
                <div key={hallazgo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-sm font-semibold border border-gray-300">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{hallazgo.titulo || hallazgo.descripcion?.substring(0, 50)}</span>
                  </div>
                  <BadgeSIGL variant={
                    (hallazgo.gravedad || '').toUpperCase() === 'GRAVE' || (hallazgo.gravedad || '').toUpperCase() === 'CRITICO' ? 'danger' :
                    (hallazgo.gravedad || '').toUpperCase() === 'MODERADO' ? 'warning' : 'info'
                  }>
                    {hallazgo.gravedad || 'N/A'}
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
                Días para presentar Plan de Mejoramiento *
              </label>
              <InputSIGL
                type="number"
                value={informe.plazosPlanMejora}
                onChange={(e) => setInforme(prev => ({ ...prev, plazosPlanMejora: e.target.value }))}
                min="15"
                max="90"
                placeholder="Ej. 30"
                disabled={informe.generado}
              />
              <p className="text-xs text-gray-500 mt-1">
                Plazo normativo: 30 días calendario tras la entrega de este informe.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Fecha límite estimada para el plan</p>
                <p className="text-lg font-bold text-blue-700">
                  {calcularFechaLimiteEstimada()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={!informe.generado} className="font-medium">
          <Eye className="w-4 h-4 mr-2" />
          Vista Previa
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
                proceso: auditoria.proceso,
                auditorLider:
                  typeof auditoria.auditorLider === 'string'
                    ? auditoria.auditorLider
                    : (auditoria as any).auditorLider?.nombre || 'No asignado',
                tituloAuditoria: auditoria.nombre,
                responsableUnidadAuditada: (auditoria as any).responsableUnidad || (auditoria as any).areaResponsable || '—',
                lugarEjecucion: (auditoria as any).lugarEjecucion || (auditoria as any).territorial || '—',
                fechaEjecucionInicio: auditoria.fechaInicio,
                fechaEjecucionFin: auditoria.fechaFin,
                periodoAuditoria: (auditoria as any).periodoAuditadoTexto || (auditoria as any).periodoAuditado || (auditoria as any).periodoAuditoria || 'Vigencia correspondiente',
                equipoAuditor: (auditoria as any).equipoAuditores,
                objetivo: (auditoria as any).objetivo,
                alcance: (auditoria as any).alcance,
                marcoNormativo: (auditoria as any).marcoNormativo,
                contextoGeneral: (auditoria as any).contextoGeneral,
                declaracion: (auditoria as any).declaracion,
                jefeOCI: (auditoria as any).jefeOCI || 'MARIO OSWALDO BERNAL RODRÍGUEZ',
                elaboro: (auditoria as any).elaboro || (typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : (auditoria as any).auditorLider?.nombre),
                reviso: (auditoria as any).reviso || (auditoria as any).jefeOCI || 'MARIO OSWALDO BERNAL RODRÍGUEZ',
                aprobo: (auditoria as any).aprobo || (auditoria as any).jefeOCI || 'MARIO OSWALDO BERNAL RODRÍGUEZ',
              },
              informe,
              hallazgosParaPDF
            );
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar Informe Final
        </Button>
        {!informe.generado && (
          <Button
            size="sm"
            onClick={onGenerar}
            disabled={hayBloqueo}
            className="font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Generar Informe Final de Auditoría
          </Button>
        )}
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 4: PLAN DE MEJORAMIENTO
// ====================================

const SeccionPlanMejoramiento: React.FC<{
  auditoria: Auditoria;
  planCreado: boolean;
  planEstadisticas: { totalAcciones: number; accionesCompletadas: number; porcentajeAvance: number } | null;
  planCompleto: boolean;
  onCrearPlanMejoramiento: () => void;
  hallazgosCount: number;
  onIrAPlan: () => void;
}> = ({ planCreado, planEstadisticas, planCompleto, onCrearPlanMejoramiento, hallazgosCount, onIrAPlan }) => {
  return (
    <div className="space-y-6">
      {planCreado ? (
        <div className={`p-6 rounded-lg flex items-center gap-4 border-2 ${planCompleto ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
          <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-full bg-white border-2 border-gray-200">
            <span className={`text-xl font-bold ${planCompleto ? 'text-green-600' : 'text-amber-600'}`}>
              {planEstadisticas?.porcentajeAvance ?? 0}%
            </span>
          </div>
          <div className="flex-1">
            <p className={`font-bold text-lg ${planCompleto ? 'text-green-900' : 'text-amber-900'}`}>
              Plan de Mejoramiento creado
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {planEstadisticas
                ? `${planEstadisticas.accionesCompletadas}/${planEstadisticas.totalAcciones} acciones completadas. `
                : ''}
              {planCompleto
                ? 'El plan cumple los requisitos. Puede finalizar la comunicación y pasar a Seguimiento.'
                : 'Complete al menos una acción correctiva en el módulo de Planes de Mejoramiento para poder finalizar.'}
            </p>
            <Button variant="outline" size="sm" onClick={onIrAPlan} className="mt-3">
              <ChevronRight className="w-4 h-4 mr-2" />
              Ir a ver plan
            </Button>
          </div>
        </div>
      ) : (
        <CardSIGL>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              Crear Plan de Mejoramiento
            </h3>
            <p className="text-gray-600 mb-4">
              Con los hallazgos de esta auditoría debe crear un Plan de Mejoramiento. Las <strong>acciones correctivas</strong> para cada hallazgo se formularán en el módulo de Planes.
            </p>
            {hallazgosCount > 0 ? (
              <Button
                onClick={onCrearPlanMejoramiento}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                <Target className="w-4 h-4 mr-2" />
                Crear Plan de Mejoramiento ({hallazgosCount} hallazgos)
              </Button>
            ) : (
              <p className="text-amber-700 text-sm">
                No hay hallazgos vinculados a esta auditoría. Gestione los hallazgos en la sección anterior.
              </p>
            )}
          </div>
        </CardSIGL>
      )}
    </div>
  );
};

// ====================================
// SECCIÓN 5: INFORME EJECUTIVO (AHORA EN SEGUIMIENTO)
// ====================================

const SeccionInformeEjecutivo: React.FC<{
  auditoria: Auditoria;
  hallazgos?: Hallazgo[];
  informe: InformeFinal;
  setInforme: React.Dispatch<React.SetStateAction<InformeFinal>>;
  onGenerar: () => void;
  onPreview: () => void;
}> = ({ auditoria, hallazgos = [], informe, setInforme, onGenerar, onPreview }) => {
  const calcularFechaLimiteEstimada = () => {
    const dias = parseInt(informe.plazosPlanMejora || '30', 10) || 30;
    const fechaBase = new Date();
    const fechaLimite = new Date(fechaBase);
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return fechaLimite.toLocaleDateString('es-CO');
  };

  return (
    <div className="space-y-6">
      {/* Banner: Informe Ejecutivo ya terminado */}
      {informe.generado && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900 text-lg">Informe Ejecutivo ya terminado</p>
            <p className="text-sm text-green-700">Aprobado como Jefe OCI. Notificado al Director Nacional.</p>
          </div>
        </div>
      )}

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
                  {calcularFechaLimiteEstimada()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Observaciones Finales */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observaciones Finales / Conclusiones</h3>
          <TextareaSIGL
            value={informe.observacionesFinales}
            onChange={(val) => setInforme(prev => ({ ...prev, observacionesFinales: val }))}
            placeholder="Ingrese las observaciones finales que se incluirán en el informe ejecutivo..."
            rows={6}
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
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={!informe.generado} className="font-medium">
          <Eye className="w-4 h-4 mr-2" />
          Vista Previa
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!informe.generado}
          className="font-medium text-blue-600 border-blue-200 hover:bg-blue-50"
          title="Informe Ejecutivo de Auditoría Interna (EM-FO-011)"
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
              'ejecutivo',
              {
                codigo: auditoria.codigo,
                nombre: auditoria.nombre,
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
          <FileText className="w-4 h-4 mr-2" />
          Descargar Informe Ejecutivo OCI
        </Button>
        {!informe.generado && (
          <Button
            size="sm"
            onClick={onGenerar}
            disabled={!informe.observacionesFinales?.trim()}
            className="font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Generar Informe Ejecutivo — Aprobar como Jefe OCI
          </Button>
        )}
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 6: VERIFICACIÓN DE CUMPLIMIENTO DEL PLAN DE MEJORAMIENTO (Cierre)
// ====================================

const SeccionVerificacionCumplimiento: React.FC<{
  auditoriaId: string;
  planes: any[];
  loading: boolean;
  onRefrescar: () => void;
  useAPI: boolean;
  embedded?: boolean;
  readOnly?: boolean;
}> = ({ auditoriaId, planes, loading, onRefrescar, useAPI, embedded, readOnly = false }) => {
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);
  const [evidencia, setEvidencia] = useState<Record<string, string>>({});
  const [observacion, setObservacion] = useState<Record<string, string>>({});
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<Record<string, 'cumplida' | 'parcial' | 'incumplida'>>({});

  const todasLasAcciones = useMemo(() => {
    const out: { planId: string; planCodigo: string; accion: any }[] = [];
    for (const plan of planes) {
      for (const accion of plan.acciones || []) {
        out.push({ planId: plan.id, planCodigo: plan.codigo || plan.id, accion });
      }
    }
    return out;
  }, [planes]);

  const conteo = useMemo(() => {
    let sinVerificar = 0;
    let cumplida = 0;
    let parcial = 0;
    let incumplida = 0;
    for (const { accion } of todasLasAcciones) {
      const e = (accion.estadoVerificacionOci || '').toLowerCase();
      if (!e || e === 'sin_verificar') sinVerificar++;
      else if (e === 'cumplida') cumplida++;
      else if (e === 'parcial') parcial++;
      else if (e === 'incumplida') incumplida++;
    }
    return { sinVerificar, cumplida, parcial, incumplida };
  }, [todasLasAcciones]);

  const handleRegistrar = async (planId: string, accionId: string) => {
    const estado = estadoSeleccionado[accionId];
    const ev = evidencia[accionId]?.trim();
    if (!estado || !ev) {
      toast.error('Seleccione el resultado de verificación y describa la evidencia verificada.');
      return;
    }
    setRegistrandoId(accionId);
    try {
      await controlInternoService.registrarVerificacionOci(planId, accionId, {
        estadoVerificacionOci: estado,
        evidenciaVerificada: ev,
        observacionOci: observacion[accionId]?.trim() || undefined,
      });
      toast.success('Verificación registrada. No podrá modificarse.');
      setEvidencia(prev => ({ ...prev, [accionId]: '' }));
      setObservacion(prev => ({ ...prev, [accionId]: '' }));
      setEstadoSeleccionado(prev => ({ ...prev, [accionId]: undefined! }));
      onRefrescar();
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar verificación');
    } finally {
      setRegistrandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        Cargando planes y acciones…
      </div>
    );
  }

  if (todasLasAcciones.length === 0) {
    return (
      <div className={`p-6 rounded-lg border-2 border-amber-200 bg-amber-50 ${embedded ? 'text-sm' : ''}`}>
        <p className="font-medium text-amber-900">No hay planes de mejoramiento vinculados a esta auditoría.</p>
        <p className="text-amber-700 mt-1">Cree el plan en la sección Plan de Mejoramiento y formule las acciones correctivas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 ${embedded ? 'text-sm' : ''}`}>
        <span className="font-semibold text-blue-900">Cumplimiento:</span>
        <span>Sin verificar: <strong>{conteo.sinVerificar}</strong></span>
        <span>Cumplida: <strong className="text-green-700">{conteo.cumplida}</strong></span>
        <span>Parcial: <strong className="text-amber-700">{conteo.parcial}</strong></span>
        <span>Incumplida: <strong className="text-red-700">{conteo.incumplida}</strong></span>
        <Button variant="outline" size="sm" onClick={onRefrescar} className="ml-auto">Actualizar</Button>
      </div>

      <div className="space-y-4">
        {todasLasAcciones.map(({ planId, planCodigo, accion }) => {
          const id = accion.id;
          const yaVerificada = accion.estadoVerificacionOci && !['', 'sin_verificar'].includes(String(accion.estadoVerificacionOci));
          const fechaFin = accion.fechaFin ? (typeof accion.fechaFin === 'string' ? accion.fechaFin.split('T')[0] : accion.fechaFin) : '—';
          return (
            <CardSIGL key={id}>
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{accion.descripcion?.substring(0, 120)}{(accion.descripcion?.length || 0) > 120 ? '…' : ''}</p>
                    <p className="text-sm text-gray-500">Responsable: {accion.responsable} · Fecha límite: {fechaFin} · Plan: {planCodigo}</p>
                  </div>
                  {yaVerificada && (
                    <BadgeSIGL className={accion.estadoVerificacionOci === 'cumplida' ? 'bg-green-100 text-green-800' : accion.estadoVerificacionOci === 'parcial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                      Verificada: {String(accion.estadoVerificacionOci)}
                    </BadgeSIGL>
                  )}
                </div>
                {!yaVerificada && useAPI && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(['cumplida', 'parcial', 'incumplida'] as const).map(est => (
                        <Button
                          key={est}
                          size="sm"
                          variant={estadoSeleccionado[id] === est ? 'default' : 'outline'}
                          className={estadoSeleccionado[id] === est ? (est === 'cumplida' ? 'bg-green-600' : est === 'parcial' ? 'bg-amber-600' : 'bg-red-600') : ''}
                          onClick={() => setEstadoSeleccionado(prev => ({ ...prev, [id]: est }))}
                        >
                          {est === 'cumplida' ? 'Cumplida' : est === 'parcial' ? 'Parcial' : 'Incumplida'}
                        </Button>
                      ))}
                    </div>
                    <TextareaSIGL
                      placeholder="Evidencia verificada (obligatorio) *"
                      value={evidencia[id] || ''}
                      onChange={(value) => setEvidencia(prev => ({ ...prev, [id]: value }))}
                      rows={2}
                      className="mb-2"
                    />
                    <InputSIGL
                      placeholder="Observación OCI (opcional)"
                      value={observacion[id] || ''}
                      onChange={(e) => setObservacion(prev => ({ ...prev, [id]: e.target.value }))}
                      className="mb-2"
                    />
                    <Button
                      size="sm"
                      disabled={!estadoSeleccionado[id] || !evidencia[id]?.trim() || registrandoId === id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleRegistrar(planId, id)}
                    >
                      {registrandoId === id ? 'Guardando…' : 'Registrar verificación'}
                    </Button>
                  </>
                )}
              </div>
            </CardSIGL>
          );
        })}
      </div>
    </div>
  );
};

// ====================================
// SECCIÓN 7: INFORME DE CIERRE DE AUDITORÍA
// ====================================

const SeccionInformeCierre: React.FC<{
  auditoriaId: string;
  auditoriaCodigo?: string;
  auditoriaNombre?: string;
  resumen: any;
  leccionesAprendidas: string;
  recomendacionesFuturas: string;
  informeCierreAprobado: boolean;
  loading: boolean;
  tieneDocumentoCierre: boolean;
  onLeccionesChange: (v: string) => void;
  onRecomendacionesChange: (v: string) => void;
  onGuardarBorrador: () => Promise<void>;
  onAprobar: () => Promise<void>;
  onDescargarPDF?: () => Promise<void>;
  puedeAprobar: boolean;
  useAPI: boolean;
  embedded?: boolean;
  readOnly?: boolean;
  onSubirDocumento?: (file: File, metadata: { nombre: string; tipoDocumento: string; etapa: string }) => Promise<boolean>;
  onRecargarDocumentos?: () => Promise<void>;
  totalHallazgos?: number;
  onFinalizarConDocumento?: (archivo: File, comentarios: string) => Promise<void>;
}> = ({
  auditoriaId,
  auditoriaCodigo,
  auditoriaNombre,
  resumen,
  leccionesAprendidas,
  recomendacionesFuturas,
  informeCierreAprobado,
  loading,
  tieneDocumentoCierre,
  onLeccionesChange,
  onRecomendacionesChange,
  onGuardarBorrador,
  onAprobar,
  onDescargarPDF,
  puedeAprobar,
  useAPI,
  embedded,
  readOnly = false,
  onSubirDocumento,
  onRecargarDocumentos,
  totalHallazgos = 0,
  onFinalizarConDocumento,
}) => {
  const [guardando, setGuardando] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [showModalFinalizar, setShowModalFinalizar] = useState(false);
  const sinHallazgos = (totalHallazgos ?? 0) === 0;

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await onGuardarBorrador();
    } finally {
      setGuardando(false);
    }
  };

  const handleAprobar = async () => {
    // Si falta el Documento de Cierre: abrir el modal oficial "Finalizar Auditoría"
    if (!tieneDocumentoCierre && onFinalizarConDocumento && !readOnly) {
      setShowModalFinalizar(true);
      return;
    }
    if (!tieneDocumentoCierre) {
      toast.error('Debe subir el Documento de Cierre en la pestaña Documentación antes de aprobar.');
      return;
    }
    if (!sinHallazgos && (!leccionesAprendidas.trim() || !recomendacionesFuturas.trim())) {
      toast.error('Lecciones aprendidas y Recomendaciones son obligatorios cuando hay hallazgos.');
      return;
    }
    setAprobando(true);
    try {
      await onAprobar();
    } finally {
      setAprobando(false);
    }
  };

  if (loading && !resumen) {
    return <div className="flex items-center justify-center py-12 text-gray-500">Cargando resumen…</div>;
  }

  return (
    <div className="space-y-6">
      {resumen && (
        <div className={`p-4 rounded-lg border-2 border-gray-200 bg-gray-50 ${embedded ? 'text-sm' : ''}`}>
          <h4 className="font-semibold text-gray-900 mb-2">Resumen ejecutivo</h4>
          <p><strong>Código:</strong> {resumen.codigo} · <strong>Nombre:</strong> {resumen.nombre}</p>
          <p><strong>Período:</strong> {resumen.fechaInicio} – {resumen.fechaFin} · <strong>Hallazgos:</strong> {resumen.totalHallazgos ?? 0}</p>
        </div>
      )}

      {informeCierreAprobado ? (
        <div className="space-y-3">
          <div className="p-6 rounded-lg border-2 border-green-300 bg-green-50">
            <CheckCircle2 className="w-10 h-10 text-green-600 mb-2" />
            <p className="font-bold text-green-900">Informe de cierre aprobado. Auditoría cerrada.</p>
            <p className="text-sm text-green-700 mt-1">El expediente queda cerrado e inmutable.</p>
          </div>
          {onDescargarPDF && resumen && (
            <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={onDescargarPDF}>
              <Download className="w-4 h-4 mr-1" />
              Descargar Informe de Cierre (PDF)
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Estado Documento de Cierre: una línea; la subida se pide al aprobar si falta */}
          <div className="text-sm flex items-center gap-2">
            {tieneDocumentoCierre ? (
              <span className="font-medium text-green-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Documento de Cierre subido
              </span>
            ) : (
              <span className="text-amber-700">Documento de Cierre: pendiente (se solicitará al aprobar)</span>
            )}
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Lecciones aprendidas {sinHallazgos ? '(opcional)' : '(obligatorio)'}
            </label>
            <TextareaSIGL
              placeholder="Describa las lecciones aprendidas de esta auditoría..."
              value={leccionesAprendidas}
              onChange={(val) => onLeccionesChange(val)}
              rows={4}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Recomendaciones para futuras auditorías {sinHallazgos ? '(opcional)' : '(obligatorio)'}
            </label>
            <TextareaSIGL
              placeholder="Recomendaciones para mejorar futuras auditorías..."
              value={recomendacionesFuturas}
              onChange={(val) => onRecomendacionesChange(val)}
              rows={4}
              disabled={readOnly}
            />
          </div>
          {!readOnly && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            Al aprobar el informe de cierre, la auditoría pasará a estado Finalizada y el expediente quedará inmutable.
          </div>
          )}
          <div className="flex flex-wrap gap-2">
            {onDescargarPDF && resumen && (
              <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={onDescargarPDF}>
                <Download className="w-4 h-4 mr-1" />
                Descargar Informe de Cierre (PDF)
              </Button>
            )}
            {useAPI && !readOnly && (
              <>
                <Button size="sm" variant="outline" disabled={guardando} onClick={handleGuardar}>
                  {guardando ? 'Guardando…' : 'Guardar borrador'}
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!puedeAprobar || aprobando}
                  onClick={handleAprobar}
                >
                  {aprobando ? 'Aprobando…' : 'Aprobar Informe de Cierre — Jefe OCI'}
                </Button>
              </>
            )}
          </div>

          {/* Modal oficial "Finalizar Auditoría" - mismo que Kanban */}
          {onFinalizarConDocumento && (
            <ModalFinalizarAuditoria
              isOpen={showModalFinalizar}
              onClose={() => setShowModalFinalizar(false)}
              auditoriaId={auditoriaId}
              auditoriaTitulo={auditoriaCodigo || auditoriaNombre || 'Auditoría'}
              onFinalizar={onFinalizarConDocumento}
            />
          )}
        </>
      )}
    </div>
  );
};

// ====================================
// MODAL: PRESENTAR CONTROVERSIA (por hallazgo)
// ====================================

const ModalControversiaPorHallazgo: React.FC<{
  hallazgo?: Hallazgo | null;
  onClose: () => void;
  onEnviar: (hallazgoId: string, argumentos: string, documentoId: string, documentoNombre: string) => void;
}> = ({ hallazgo, onClose, onEnviar }) => {
  const [argumentos, setArgumentos] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const handleEnviar = async () => {
    if (!hallazgo) return;
    if (!argumentos.trim()) {
      toast.error('Los argumentos técnicos son obligatorios');
      return;
    }
    if (!archivo) {
      toast.error('El documento adjunto es obligatorio (PDF, DOCX, JPG)');
      return;
    }
    setSubiendo(true);
    try {
      const doc = await controlInternoService.createDocumento(archivo, {
        nombre: `Controversia - ${hallazgo.codigo || hallazgo.id}`,
        tipoDocumento: 'evidencia_controversia',
        etapa: 'comunicacion',
        hallazgoId: hallazgo.id,
        auditoriaId: (hallazgo as any).auditoriaId,
      });
      onEnviar(hallazgo.id, argumentos, doc.id, doc.nombreArchivo || archivo.name);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al subir documento');
    } finally {
      setSubiendo(false);
    }
  };

  if (!hallazgo) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            Presentar controversia
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-600 line-clamp-2">{hallazgo.titulo || hallazgo.descripcion}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Argumentos técnicos y normativa aplicable *</label>
            <TextareaSIGL value={argumentos} onChange={(val) => setArgumentos(val)} rows={4} placeholder="Describa los argumentos..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento de soporte (adjunto obligatorio) *</label>
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            <p className="text-xs text-gray-500 mt-1">PDF, DOCX o JPG</p>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleEnviar} disabled={subiendo}>
              {subiendo ? 'Enviando...' : 'Enviar controversia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ====================================
// MODAL: DECISIÓN DEL AUDITOR
// ====================================

const ModalDecisionAuditor: React.FC<{
  hallazgo?: Hallazgo | null;
  onClose: () => void;
  onConfirmar: (hallazgoId: string, tipo: 'ratificado' | 'modificado' | 'retirado', fundamentacion: string) => void;
}> = ({ hallazgo, onClose, onConfirmar }) => {
  const [tipo, setTipo] = useState<'ratificado' | 'modificado' | 'retirado'>('ratificado');
  const [fundamentacion, setFundamentacion] = useState('');

  const handleConfirmar = () => {
    if (!hallazgo) return;
    onConfirmar(hallazgo.id, tipo, fundamentacion);
  };

  if (!hallazgo) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Decisión del auditor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-600">{hallazgo.titulo || hallazgo.descripcion}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            La decisión no puede modificarse una vez aplicada.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de decisión *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="ratificado">Ratificado</option>
              <option value="modificado">Modificado</option>
              <option value="retirado">Retirado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fundamentación técnica *</label>
            <TextareaSIGL value={fundamentacion} onChange={(val) => setFundamentacion(val)} rows={4} placeholder="Fundamentación..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirmar} disabled={!fundamentacion.trim()}>
              Confirmar decisión
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ====================================
// MODAL: AGREGAR CONTROVERSIA (legacy)
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
            onChange={(val) => setArgumentos(val)}
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
// MODAL: PREVIEW INFORME
// ====================================

const ModalPreviewInforme: React.FC<{
  tipo: string;
  auditoria: Auditoria;
  informe: any;
  hallazgos?: Hallazgo[];
  onClose: () => void;
}> = ({ tipo, auditoria, informe, onClose }) => {
  const titulo = tipo === 'preliminar' ? 'Informe Preliminar' : tipo === 'final' ? 'Informe Final' : 'Informe Ejecutivo';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const prepararDatosPDF = () => {
    const hallazgosParaPDF =
      tipo === 'preliminar' && auditoria.hallazgos?.length
        ? auditoria.hallazgos.map((h: Hallazgo) => ({
            codigo: h.codigo,
            titulo: h.titulo,
            gravedad: h.gravedad,
            descripcion: h.descripcion || '',
            criterioIncumplido: h.criterioIncumplido,
            causas: h.causas,
            efectos: h.efectos,
            recomendaciones: h.recomendaciones,
          }))
        : (tipo === 'final' || tipo === 'ejecutivo') && auditoria.hallazgos?.length
          ? auditoria.hallazgos.map((h: Hallazgo) => ({
              codigo: h.codigo,
              titulo: h.titulo,
              gravedad: h.gravedad,
              descripcion: h.descripcion || '',
              causas: h.causas,
              efectos: h.efectos,
              recomendaciones: h.recomendaciones,
              estadoFinal: h.estado,
              decisionAuditor: h.decisionAuditor,
              fundamentacionTecnica: (h as any).fundamentacionTecnica,
            }))
          : undefined;

    const auditoriaBase = {
      codigo: auditoria.codigo,
      nombre: auditoria.nombre,
      proceso: auditoria.proceso,
      auditorLider:
        typeof auditoria.auditorLider === 'string'
          ? auditoria.auditorLider
          : (auditoria as any).auditorLider?.nombre || 'No asignado',
      tituloAuditoria: auditoria.nombre,
      ...(tipo === 'preliminar' && {
        fechaOficio: informe?.fecha,
        destinatarioNombre: (auditoria as any).responsable || (auditoria as any).responsableUnidad,
        destinatarioCargo: (auditoria as any).cargo || 'Director(a) Territorial',
        unidadAuditable: (auditoria as any).territorial || (auditoria as any).areaResponsable || auditoria.nombre,
        fechaEjecucionInicio: auditoria.fechaInicio,
        fechaEjecucionFin: auditoria.fechaFin,
        periodoAuditoria: auditoria.fechaInicio && auditoria.fechaFin ? `${auditoria.fechaInicio} al ${auditoria.fechaFin}` : undefined,
        equipoAuditor: (auditoria as any).equipoAuditores?.map((a: any) => ({ nombre: a.nombre || a, rol: a.rol })),
        objetivo: (auditoria as any).objetivo,
        alcance: (auditoria as any).alcance,
        marcoNormativo: (auditoria as any).marcoNormativo,
        contextoGeneral: (auditoria as any).contextoGeneral,
        descripcionUnidad: (auditoria as any).descripcionUnidad,
        reuniones: (auditoria as any).reuniones,
        cartaRepresentacionFecha: (auditoria as any).cartaRepresentacionFecha,
        procesosAuditados: (auditoria as any).procesosAuditados,
        planesMejoramiento: (auditoria as any).planesMejoramiento,
        aspectosRelevantes: (auditoria as any).aspectosRelevantes,
        evaluacionControlInterno: (auditoria as any).evaluacionControlInterno,
        fortalezas: (auditoria as any).fortalezas,
        recomendacionesPorCategoria: (auditoria as any).recomendacionesPorCategoria,
        riesgosIdentificados: (auditoria as any).riesgosIdentificados,
        procesoAuditado: (auditoria as any).procesoAuditado || (auditoria as any).proceso,
        declaracion: (auditoria as any).declaracion,
      }),
    };

    const informeParaPDF = tipo === 'preliminar' && informe?.hallazgos
      ? { ...informe, foliosAnexos: Math.max(10, informe.hallazgos * 3) }
      : informe;

    return { auditoriaBase, informeParaPDF, hallazgosParaPDF };
  };

  useEffect(() => {
    let active = true;
    const generatePreview = async () => {
      try {
        const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
        const { auditoriaBase, informeParaPDF, hallazgosParaPDF } = prepararDatosPDF();
        const url = await exportarPDFInformeAuditoria(
          tipo === 'preliminar' ? 'preliminar' : tipo === 'final' ? 'final' : 'ejecutivo',
          auditoriaBase,
          informeParaPDF,
          hallazgosParaPDF,
          true
        );
        if (active && typeof url === 'string') {
          setPdfUrl(url);
        }
      } catch (err) {
        console.error('Error generando vista previa PDF:', err);
      }
    };
    generatePreview();
    return () => { active = false; };
  }, [tipo, auditoria, informe]);

  const handleDescargarPDF = async () => {
    const { exportarPDFInformeAuditoria } = await import('./services/exportarPDFInformeAuditoria');
    const { auditoriaBase, informeParaPDF, hallazgosParaPDF } = prepararDatosPDF();
    await exportarPDFInformeAuditoria(
      tipo === 'preliminar' ? 'preliminar' : tipo === 'final' ? 'final' : 'ejecutivo',
      auditoriaBase,
      informeParaPDF,
      hallazgosParaPDF,
      false
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95%] h-[95vh] flex flex-col p-0 overflow-hidden bg-gray-100 border-0 shadow-2xl" size="xl">
        <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <DialogHeader className="p-0 border-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900 m-0">
              <Eye className="w-6 h-6 text-blue-700" />
              Vista Previa — {titulo}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white font-medium" onClick={handleDescargarPDF} disabled={!pdfUrl}>
              <Download className="w-4 h-4 mr-1.5" /> Descargar PDF
            </Button>
            <Button size="sm" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 font-medium" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {!pdfUrl ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full text-gray-400 bg-gray-50">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin flex-shrink-0" />
              <p className="font-medium text-sm">Generando documento interactivo...</p>
            </div>
          ) : (
             <iframe 
               src={pdfUrl + '#toolbar=0&navpanes=0'} 
               title="Vista Previa PDF"
               className="w-full h-full border-none shadow-inner bg-gray-500 block m-auto"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComunicacionAuditoriaModule;

