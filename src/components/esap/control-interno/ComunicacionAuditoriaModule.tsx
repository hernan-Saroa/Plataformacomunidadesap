import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL, TextareaSIGL } from '../gestion-legal/design-system/InputSIGL';
import { toast } from 'sonner@2.0.3';
import controlInternoService from '../../../services/api/controlInternoService';

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

export const ComunicacionAuditoriaModule: React.FC<{
  auditoriaId?: string;
  auditoriaInfo?: { codigo?: string; nombre?: string };
  /** true = modo embebido dentro del expediente (sin header grande, sin fondo pantalla completa) */
  embedded?: boolean;
  /** Callback cuando se finaliza la comunicación y pasa a Seguimiento */
  onComunicacionCompletada?: () => void;
}> = ({ auditoriaId, auditoriaInfo, embedded = false, onComunicacionCompletada }) => {
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
  const [informeEjecutivo, setInformeEjecutivo] = useState<InformeEjecutivo>({
    fecha: '', resumenEjecutivo: '', aspectosPositivos: [], oportunidadesMejora: [], conclusiones: '', generado: false,
  });
  const [modalControversia, setModalControversia] = useState(false);
  const [modalControversiaHallazgoId, setModalControversiaHallazgoId] = useState<string | null>(null);
  const [modalDecisionHallazgoId, setModalDecisionHallazgoId] = useState<string | null>(null);
  const [modalPreview, setModalPreview] = useState<{ tipo: string; abierto: boolean }>({ tipo: '', abierto: false });

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
      setInformeEjecutivo(prev => ({ ...prev, generado: estadoData?.informeEjecutivoGenerado ?? false }));
      if (audData) {
        setAuditoria(prev => ({
          ...prev,
          id: audData.id,
          codigo: audData.codigo || prev.codigo,
          nombre: audData.nombre || audData.titulo || prev.nombre,
          auditorLider: typeof audData.auditorLider === 'string' ? audData.auditorLider : (audData.auditorLider?.nombre || prev.auditorLider),
          hallazgos: h,
        }));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [id, useAPI]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const progreso = useMemo(() => {
    let c = 0;
    if (estadoComunicacion?.informePreliminarGenerado) c++;
    if (!estadoComunicacion?.hayControversiasPendientes) c++;
    if (informeFinal.generado) c++;
    if (informeEjecutivo.generado) c++;
    return Math.round((c / 4) * 100);
  }, [estadoComunicacion, informeFinal.generado, informeEjecutivo.generado]);

  const puedeAvanzar = useMemo(() => {
    return (estadoComunicacion?.informePreliminarGenerado ?? false) &&
           !estadoComunicacion?.hayControversiasPendientes &&
           informeFinal.generado &&
           informeEjecutivo.generado;
  }, [estadoComunicacion, informeFinal.generado, informeEjecutivo.generado]);

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
    if (!informeFinal.observacionesFinales?.trim()) {
      toast.error('Debe agregar observaciones finales');
      return;
    }
    if (useAPI) {
      try {
        await controlInternoService.generarInformeFinal(id);
        setInformeFinal(prev => ({ ...prev, fecha: new Date().toISOString(), generado: true }));
        await cargarDatos();
        toast.success('Informe Final generado exitosamente');
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
      toast.success('Informe Final generado exitosamente');
    }
  };

  const handleGenerarInformeEjecutivo = async () => {
    if (!informeEjecutivo.resumenEjecutivo.trim() || !informeEjecutivo.conclusiones.trim()) {
      toast.error('Debe completar resumen ejecutivo y conclusiones');
      return;
    }
    if (informeEjecutivo.aspectosPositivos.length === 0 || informeEjecutivo.oportunidadesMejora.length === 0) {
      toast.error('Debe agregar al menos un aspecto positivo y una oportunidad de mejora');
      return;
    }
    if (useAPI) {
      try {
        await controlInternoService.generarInformeEjecutivo(id);
        setInformeEjecutivo(prev => ({ ...prev, fecha: new Date().toISOString(), generado: true }));
        await cargarDatos();
        toast.success('Informe Ejecutivo generado exitosamente');
      } catch (err: any) {
        toast.error(err?.message || 'Error al generar');
      }
    } else {
      setInformeEjecutivo(prev => ({ ...prev, fecha: new Date().toISOString(), generado: true }));
      toast.success('Informe Ejecutivo generado exitosamente');
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
        toast.success('Fase de Comunicación completada. Auditoría pasa a Seguimiento.');
        onComunicacionCompletada?.();
      } catch (err: any) {
        toast.error(err?.message || 'Error al finalizar la comunicación');
      }
    } else {
      toast.success('Fase de Comunicación completada. Auditoría pasa a Seguimiento.');
      onComunicacionCompletada?.();
    }
  };

  // ====================================
  // RENDER
  // ====================================

  const duracionDias = auditoria.esTerritoriales ? 2 : 10; // SEDE: 10-15d, TERRITORIAL: 2d

  return (
    <div className={embedded ? 'space-y-4' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6'}>
      <div className={embedded ? 'space-y-4' : 'max-w-7xl mx-auto space-y-6'}>
        
        {/* HEADER - oculto en modo embebido (el expediente ya tiene Card de fase) */}
        {!embedded && (
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
        )}

        {/* CÓMO FUNCIONA - solo en modo embebido */}
        {embedded && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-semibold mb-2">Flujo y botones</p>
                <ol className="list-decimal list-inside space-y-2 text-green-800 text-sm">
                  <li><strong>Informe Preliminar</strong> → Clic en &quot;Generar Informe Preliminar y Notificar al Área&quot;. Los hallazgos pasan a Notificado (10 días hábiles).</li>
                  <li><strong>Gestión Hallazgos</strong> → Por cada hallazgo: botón &quot;Aceptar hallazgo&quot; o &quot;Presentar controversia&quot; (área auditada).</li>
                  <li><strong>Si hay controversia</strong> → Botón &quot;Decisión del auditor&quot; para resolver (ratificado/modificado/retirado).</li>
                  <li><strong>Informe Final</strong> → Cuando no queden controversias pendientes, genere el Informe Final.</li>
                  <li><strong>Plan de Mejoramiento</strong> → Se formula en la fase de <em>Seguimiento</em>, después de finalizar esta Comunicación. El área auditada tiene X días para presentarlo.</li>
                  <li><strong>Finalizar</strong> → &quot;Finalizar y Pasar a Seguimiento&quot; cuando todo esté completo.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* NAVEGACIÓN DE SECCIONES - estilo expediente cuando embedded */}
        <div className={embedded ? 'bg-white border-2 border-green-200 rounded-lg p-4' : 'bg-white rounded-xl shadow-lg p-4'}>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 1, nombre: 'Informe Preliminar', icono: FileText, completado: informePreliminar.generado },
              { id: 2, nombre: 'Gestión Hallazgos', icono: MessageSquare, completado: !estadoComunicacion?.hayControversiasPendientes },
              { id: 3, nombre: 'Decisión / Informe Final', icono: FileCheck, completado: informeFinal.generado },
              { id: 4, nombre: 'Plan Mejoramiento', icono: TrendingUp, completado: informeEjecutivo.generado }
            ].map((seccion, index) => (
              <React.Fragment key={seccion.id}>
                <button
                  onClick={() => setSeccionActual(seccion.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all flex-1 min-w-[200px] ${
                    seccionActual === seccion.id
                      ? embedded
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
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
        </div>

        {/* BOTÓN FINALIZAR */}
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
                  ? 'Todas las secciones completadas. Puede avanzar a Seguimiento.'
                  : 'Complete: Informe Preliminar, Gestión Hallazgos, Informe Final y Informe Ejecutivo para poder finalizar.'}
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
              modalPreview.tipo === 'final' ? informeFinal :
              informeEjecutivo
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
  loading?: boolean;
  puedeGenerar?: boolean;
  embedded?: boolean;
}> = ({ auditoria, informe, setInforme, onGenerar, onPreview, loading, puedeGenerar = true, embedded = false }) => {
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

      {/* Lista de Hallazgos */}
      <CardSIGL className={embedded ? '!border !border-gray-200 !shadow-none' : ''}>
        <div className={embedded ? 'p-4' : 'p-6'}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Detalle de Hallazgos</h3>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Causas:</span>
                    <div className="text-gray-600 mt-1">
                      {hallazgo.causas?.length ? (
                        <ul className="list-disc list-inside">{hallazgo.causas.map((c, i) => <li key={i}>{c}</li>)}</ul>
                      ) : hallazgo.descripcion ? (
                        <p className="text-gray-600">{hallazgo.descripcion}</p>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Efectos:</span>
                    <div className="text-gray-600 mt-1">
                      {hallazgo.efectos?.length ? (
                        <ul className="list-disc list-inside">{hallazgo.efectos.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      ) : hallazgo.criterioIncumplido ? (
                        <p className="text-gray-600">{hallazgo.criterioIncumplido}</p>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Recomendaciones:</span>
                    <div className="text-gray-600 mt-1">
                      {hallazgo.recomendaciones?.length ? (
                        <ul className="list-disc list-inside">{hallazgo.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}</ul>
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
        <Button variant="outline" size="sm" disabled={!informe.generado} className="font-medium">
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

      <div className="space-y-4">
        {hallazgos.map((hallazgo) => {
          const estado = hallazgo.estado || 'notificado';
          const pendiente = estado === 'notificado';
          const enControv = estado === 'en-controversia';
          const conDec = ['ratificado', 'modificado', 'retirado'].includes(estado);

          return (
            <CardSIGL key={hallazgo.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">{hallazgo.codigo || hallazgo.id}</span>
                    <h4 className="font-semibold text-gray-900 mt-1">{hallazgo.titulo || hallazgo.descripcion?.substring(0, 60)}</h4>
                  </div>
                  <BadgeSIGL variant={
                    conDec ? (estado === 'retirado' ? 'success' : estado === 'ratificado' ? 'danger' : 'info') :
                    enControv ? 'warning' : pendiente ? 'default' : 'success'
                  }>
                    {estado === 'notificado' ? 'Pendiente respuesta' : estado.replace('-', ' ')}
                  </BadgeSIGL>
                </div>
                <p className="text-sm text-gray-600 mb-2">{hallazgo.descripcion}</p>
                {hallazgo.criterioIncumplido && (
                  <p className="text-xs text-gray-500">Criterio: {hallazgo.criterioIncumplido}</p>
                )}

                {pendiente && (
                  <div className="flex gap-2 mt-4">
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
// SECCIÓN 2 LEGACY: CONTROVERSIAS (referencia para Sección 3)
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
                        onChange={(val) => setResolucion(val)}
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
// SECCIÓN 3: DECISIÓN DEL AUDITOR / INFORME FINAL
// ====================================

const SeccionInformeFinal: React.FC<{
  auditoria: Auditoria;
  hallazgos?: Hallazgo[];
  estadoComunicacion?: { hayControversiasPendientes?: boolean; puedeGenerarInformeFinal?: boolean } | null;
  controversias?: Controversia[];
  informe: InformeFinal;
  setInforme: React.Dispatch<React.SetStateAction<InformeFinal>>;
  onGenerar: () => void;
  onPreview: () => void;
}> = ({ auditoria, hallazgos = [], estadoComunicacion, controversias = [], informe, setInforme, onGenerar, onPreview }) => {
  const hayBloqueo = estadoComunicacion?.hayControversiasPendientes ?? (hallazgos.filter(h => h.estado === 'en-controversia').length > 0);
  const enControversia = hallazgos.filter(h => h.estado === 'en-controversia').length;
  return (
    <div className="space-y-6">
      {/* Banner: Informe Final ya terminado */}
      {informe.generado && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900 text-lg">Informe Final ya terminado</p>
            <p className="text-sm text-green-700">Aprobado como Jefe OCI. Plazo de Plan de Mejoramiento definido.</p>
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
                <p className="font-bold text-red-900">No se puede avanzar al Informe Final</p>
                <p className="text-sm text-red-700">
                  Existen {enControversia} controversia(s) pendiente(s) de decisión del auditor.
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
                Días para presentar Plan de Mejoramiento
              </label>
              <InputSIGL
                type="number"
                value={informe.plazosPlanMejora}
                onChange={(val) => setInforme(prev => ({ ...prev, plazosPlanMejora: val }))}
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
            onChange={(val) => setInforme(prev => ({ ...prev, observacionesFinales: val }))}
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
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={!informe.generado} className="font-medium">
          <Eye className="w-4 h-4 mr-2" />
          Vista Previa
        </Button>
        <Button variant="outline" size="sm" disabled={!informe.generado} className="font-medium">
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
        {!informe.generado && (
          <Button
            size="sm"
            onClick={onGenerar}
            disabled={hayBloqueo || !informe.observacionesFinales?.trim()}
            className="font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Generar Informe Final — Aprobar como Jefe OCI
          </Button>
        )}
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
      {/* Banner: Plan Mejoramiento / Informe Ejecutivo ya terminado */}
      {informe.generado && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900 text-lg">Informe Ejecutivo ya terminado</p>
            <p className="text-sm text-green-700">Listo para finalizar la comunicación y pasar a Seguimiento.</p>
          </div>
        </div>
      )}

      {/* Resumen Ejecutivo */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Resumen Ejecutivo
          </h3>
          <TextareaSIGL
            value={informe.resumenEjecutivo}
            onChange={(val) => setInforme(prev => ({ ...prev, resumenEjecutivo: val }))}
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
            onChange={(val) => setInforme(prev => ({ ...prev, conclusiones: val }))}
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
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={!informe.generado} className="font-medium">
          <Eye className="w-4 h-4 mr-2" />
          Vista Previa
        </Button>
        <Button variant="outline" size="sm" disabled={!informe.generado} className="font-medium">
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
        {!informe.generado && (
          <Button
            size="sm"
            onClick={onGenerar}
            disabled={!informe.resumenEjecutivo?.trim() || !informe.conclusiones?.trim() || informe.aspectosPositivos?.length === 0 || informe.oportunidadesMejora?.length === 0}
            className="font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Generar Informe Ejecutivo
          </Button>
        )}
      </div>
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
  onClose: () => void;
}> = ({ tipo, auditoria, informe, onClose }) => {
  const titulo = tipo === 'preliminar' ? 'Informe Preliminar' : tipo === 'final' ? 'Informe Final' : 'Informe Ejecutivo';
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" size="lg">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-600" />
            Vista Previa - {titulo}
          </DialogTitle>
        </DialogHeader>
      <div className="prose max-w-none pt-2">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
          </h2>
          <h3 className="text-xl font-semibold text-purple-700">
            Oficina de Control Interno
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-semibold text-gray-700">Código Auditoría:</p>
            <p className="text-gray-900">{auditoria.codigo}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Proceso Auditado:</p>
            <p className="text-gray-900">{auditoria.nombre}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Auditor Líder:</p>
            <p className="text-gray-900">{typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : auditoria.auditorLider?.nombre || 'No asignado'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Fecha de Generación:</p>
            <p className="text-gray-900">{new Date(informe.fecha).toLocaleDateString()}</p>
          </div>
        </div>

        <hr className="my-6" />

        {tipo === 'preliminar' && (
          <>
            <h4 className="text-lg font-bold text-gray-900 mb-3">Hallazgos Identificados</h4>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="text-2xl font-bold text-red-700">{informe.graves}</div>
                <div className="text-sm text-red-600">Graves</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{informe.moderados}</div>
                <div className="text-sm text-yellow-600">Moderados</div>
              </div>
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{informe.leves}</div>
                <div className="text-sm text-blue-600">Leves</div>
              </div>
            </div>

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
        <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
      </div>
    </DialogContent>
    </Dialog>
  );
};

export default ComunicacionAuditoriaModule;
