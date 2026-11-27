/**
 * ModalDetallePlanV4 - Modal de Detalle, Acciones PHVA, Exportación Individual y Trazabilidad
 * - Asociación obligatoria al ciclo PHVA (Planear, Hacer, Verificar, Actuar)
 * - Peso porcentual automático (100% / N con ajuste en la última acción)
 * - Cumplimiento automático al ejecutar/reabrir acciones y cierre automático al 100%
 * - Exportación individual a PDF y Excel con código del plan y fecha de generación
 * - Trazabilidad en Timeline / Historial de Avances
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
    X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
    TrendingUp, Activity, Target, Plus, AlertCircle, Building2,
    Download, Eye, Loader2, Paperclip, ListChecks, Edit2, Trash2,
    FileSpreadsheet, RotateCcw, CheckSquare, Square, Layers, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Progress } from '@esap-mfe/shared-ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { ModalHeaderClean } from './ModalHeaderClean';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { legalService } from '../../../../services/api/legal.service';
import { API_MODE, getServiceUrl } from '../../../../config/environment';
import { useConfiguracionesSIGL } from '../config/ConfiguracionesSIGLContext';
import { resolverEnteControl } from '../config/entesControlPM';
import {
    AccionPlanMejoramiento,
    FASES_PHVA,
    FasePhva,
    PHVA_CONFIG,
    calcularAvancePorFasePhvaUI,
    formatearPorcentaje,
    mapearAccionBackend,
    normalizarEstadoPlanUI,
} from '../../utils/planesMejoramientoPhva';
import {
    exportarPlanIndividualExcel,
    exportarPlanIndividualPDF,
} from '../../utils/exportPlanMejoramiento';

function getFileViewUrl(filename: string): string {
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/${filename}`;
}

function getFileDownloadUrl(filename: string, originalName: string): string {
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
    const nameWithExt = originalName.match(/\.[a-zA-Z0-9]+$/) ? originalName : `${originalName}${ext}`;
    return `${baseUrl}${prefix}/files/download/${filename}?name=${encodeURIComponent(nameWithExt)}`;
}

function getFileIcon(mimeType: string): string {
    if (!mimeType) return '📎';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    return '📎';
}

// ==================== TIPOS ====================
interface Seguimiento {
    id: string;
    descripcionAvance: string;
    porcentajeReportado: number;
    createdAt: string;
    fechaReporte?: string;
    usuarioId?: string;
}

interface PlanDetalle {
    id: string;
    codigo: string;
    titulo: string;
    origen: string;
    estado: string;
    severidad?: string;
    avancePorcentaje: number;
    descripcion?: string;
    areaResponsable?: string;
    responsableNombre?: string;
    fechaInicio?: string;
    fechaFinEstimada?: string;
    fechaRecepcion?: string;
    fechaRespuesta?: string;
    fechaCierreReal?: string;
    documentoOrigen?: string;
    seguimientos?: Seguimiento[];
    riesgoTitulo?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface DocumentoPlan {
    id: string;
    titulo: string;
    urlArchivo: string;
    tipoArchivo: string;
    createdAt: string;
}

interface ModalDetallePlanV4Props {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    onPlanUpdated?: () => void;
}

// ==================== HELPERS ====================
const getEstadoConfig = (estado: string) => {
    const estadoNormalizado = normalizarEstadoPlanUI(estado);
    const configs = {
        EN_EJECUCION: { nombre: 'En Ejecución', color: '#2962FF', bgColor: '#E3F2FD', icon: <Activity className="w-4 h-4" /> },
        COMPLETADO: { nombre: 'Completado', color: '#10B981', bgColor: '#D1FAE5', icon: <CheckCircle2 className="w-4 h-4" /> },
        FORMULACION: { nombre: 'En Formulación', color: '#F59E0B', bgColor: '#FEF3C7', icon: <FileText className="w-4 h-4" /> },
        SUSPENDIDO: { nombre: 'Suspendido', color: '#6B7280', bgColor: '#F3F4F6', icon: <AlertCircle className="w-4 h-4" /> },
    };
    return configs[estadoNormalizado] || configs.EN_EJECUCION;
};

const getSeveridadTexto = (sev?: string): string => {
    const limpio = (sev || '').trim().toUpperCase();
    if (limpio === 'CRITICO' || limpio === 'CRITICA') return 'Crítica';
    if (limpio === 'ALTO' || limpio === 'ALTA') return 'Alta';
    if (limpio === 'BAJO' || limpio === 'BAJA') return 'Baja';
    return 'Media';
};

const formatearFecha = (fecha?: string | null): string => {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatearFechaHora = (fecha?: string | null): string => {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// ==================== COMPONENTE PRINCIPAL ====================
export function ModalDetallePlanV4({ isOpen, onClose, planId, onPlanUpdated }: ModalDetallePlanV4Props) {
    const { entesControlPM } = useConfiguracionesSIGL();
    const [plan, setPlan] = useState<PlanDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [tabActiva, setTabActiva] = useState<'resumen' | 'hallazgos' | 'progreso' | 'historial'>('resumen');

    // Acciones PHVA (planes_hallazgos)
    const [acciones, setAcciones] = useState<AccionPlanMejoramiento[]>([]);
    const [loadingAcciones, setLoadingAcciones] = useState(false);
    const [filtroFase, setFiltroFase] = useState<'TODAS' | FasePhva>('TODAS');
    const [agruparPorFase, setAgruparPorFase] = useState(true);
    const [editandoAccion, setEditandoAccion] = useState<AccionPlanMejoramiento | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

    const [formAccion, setFormAccion] = useState<{
        nombre: string;
        descripcion: string;
        fasePhva: '' | FasePhva;
        responsable: string;
        fechaLimite: string;
        archivo: File | null;
    }>({
        nombre: '',
        descripcion: '',
        fasePhva: '',
        responsable: '',
        fechaLimite: '',
        archivo: null,
    });
    const accionFileRef = useRef<HTMLInputElement>(null);
    const [savingAccion, setSavingAccion] = useState(false);

    // Form para seguimiento manual
    const [nuevoSeguimiento, setNuevoSeguimiento] = useState({
        descripcionAvance: '',
        porcentajeReportado: 0,
        archivo: null as File | null,
        tituloArchivo: '',
    });
    const [guardando, setGuardando] = useState(false);

    // Documentos
    const [documentos, setDocumentos] = useState<DocumentoPlan[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Visor
    const [visorOpen, setVisorOpen] = useState(false);
    const [visorDoc, setVisorDoc] = useState<{ archivo: string; numero: string } | null>(null);

    useEffect(() => {
        if (isOpen && planId) {
            fetchPlan();
            fetchDocumentos();
            fetchAcciones();
        } else {
            setDocumentos([]);
            setAcciones([]);
            setTabActiva('resumen');
            setFiltroFase('TODAS');
            setEditandoAccion(null);
            setFormAccion({
                nombre: '',
                descripcion: '',
                fasePhva: '',
                responsable: '',
                fechaLimite: '',
                archivo: null,
            });
        }
    }, [isOpen, planId]);

    const resumenPhva = useMemo(() => calcularAvancePorFasePhvaUI(acciones), [acciones]);

    const accionesFiltradas = useMemo(() => {
        if (filtroFase === 'TODAS') return acciones;
        return acciones.filter((a) => a.fasePhva === filtroFase);
    }, [acciones, filtroFase]);

    const accionesEjecutadasCount = useMemo(
        () => acciones.filter((a) => a.estado === 'EJECUTADA').length,
        [acciones],
    );

    const fetchAcciones = async () => {
        setLoadingAcciones(true);
        try {
            const data = await legalService.getHallazgosPlan(planId);
            const lista = Array.isArray(data)
                ? data.map((item) => mapearAccionBackend(item as Record<string, unknown>))
                : [];
            setAcciones(lista);
        } catch {
            setAcciones([]);
        } finally {
            setLoadingAcciones(false);
        }
    };

    const resetFormAccion = () => {
        setEditandoAccion(null);
        setFormAccion({
            nombre: '',
            descripcion: '',
            fasePhva: '',
            responsable: '',
            fechaLimite: '',
            archivo: null,
        });
        if (accionFileRef.current) accionFileRef.current.value = '';
    };

    const handleGuardarAccion = async () => {
        if (!formAccion.nombre.trim()) {
            toast.error('Ingrese la descripción o nombre de la acción');
            return;
        }
        if (!formAccion.fasePhva) {
            toast.error('Seleccione la fase PHVA (Planear, Hacer, Verificar o Actuar)');
            return;
        }
        try {
            setSavingAccion(true);
            if (editandoAccion) {
                await legalService.updateHallazgoPlan(editandoAccion.id, {
                    nombre: formAccion.nombre.trim(),
                    descripcion: formAccion.descripcion.trim(),
                    fasePhva: formAccion.fasePhva,
                    responsable: formAccion.responsable.trim(),
                    fechaLimite: formAccion.fechaLimite || '',
                    file: formAccion.archivo || undefined,
                });
                toast.success('Acción actualizada correctamente');
            } else {
                await legalService.createHallazgoPlan(planId, {
                    nombre: formAccion.nombre.trim(),
                    descripcion: formAccion.descripcion.trim(),
                    fasePhva: formAccion.fasePhva,
                    responsable: formAccion.responsable.trim() || undefined,
                    fechaLimite: formAccion.fechaLimite || undefined,
                    file: formAccion.archivo || undefined,
                });
                toast.success('Acción creada y pesos porcentuales recalculados');
            }
            resetFormAccion();
            await Promise.all([fetchAcciones(), fetchPlan()]);
            onPlanUpdated?.();
        } catch (err: unknown) {
            console.error('Error guardando acción:', err);
            toast.error('Error al guardar la acción');
        } finally {
            setSavingAccion(false);
        }
    };

    const handleToggleEstadoAccion = async (accion: AccionPlanMejoramiento) => {
        const nuevoEstado = accion.estado === 'EJECUTADA' ? 'PENDIENTE' : 'EJECUTADA';
        try {
            setTogglingId(accion.id);
            const resp = await legalService.cambiarEstadoHallazgoPlan(accion.id, nuevoEstado);
            await Promise.all([fetchAcciones(), fetchPlan()]);
            onPlanUpdated?.();

            const avanceNuevo = resp?.trazabilidad?.planAvanceActual;
            const estadoPlanNuevo = resp?.trazabilidad?.planEstadoActual;
            if (nuevoEstado === 'EJECUTADA') {
                toast.success(
                    estadoPlanNuevo === 'CERRADO'
                        ? 'Acción ejecutada — Plan completado al 100%'
                        : 'Acción marcada como Ejecutada',
                    {
                        description:
                            avanceNuevo !== undefined
                                ? `Cumplimiento del plan: ${formatearPorcentaje(avanceNuevo)}`
                                : undefined,
                    },
                );
            } else {
                toast.info('Acción reabierta a Pendiente', {
                    description:
                        avanceNuevo !== undefined
                            ? `Cumplimiento del plan: ${formatearPorcentaje(avanceNuevo)}`
                            : undefined,
                });
            }
        } catch (err: unknown) {
            console.error('Error cambiando estado de acción:', err);
            toast.error('Error al actualizar el estado de la acción');
        } finally {
            setTogglingId(null);
        }
    };

    const handleEditarAccion = (accion: AccionPlanMejoramiento) => {
        setEditandoAccion(accion);
        setFormAccion({
            nombre: accion.nombre || '',
            descripcion: accion.descripcion || '',
            fasePhva: accion.fasePhva,
            responsable: accion.responsable || '',
            fechaLimite: accion.fechaLimite ? String(accion.fechaLimite).slice(0, 10) : '',
            archivo: null,
        });
    };

    const handleEliminarAccion = async (accion: AccionPlanMejoramiento) => {
        if (!confirm(`¿Eliminar la acción "${accion.nombre}"? Los pesos restantes se recalcularán automáticamente.`)) return;
        try {
            await legalService.deleteHallazgoPlan(accion.id);
            toast.success('Acción eliminada y pesos recalculados');
            await Promise.all([fetchAcciones(), fetchPlan()]);
            onPlanUpdated?.();
        } catch {
            toast.error('Error al eliminar la acción');
        }
    };

    const fetchPlan = async () => {
        try {
            setLoading(true);
            const data = await legalService.getPlanMejoramiento(planId);
            setPlan(data);
            setNuevoSeguimiento(prev => ({
                ...prev,
                porcentajeReportado: Number(data.avancePorcentaje || 0),
            }));
        } catch (error) {
            console.error('Error al cargar plan:', error);
            toast.error('Error al cargar el plan de mejoramiento');
        } finally {
            setLoading(false);
        }
    };

    const fetchDocumentos = async () => {
        setLoadingDocs(true);
        try {
            const docs = await legalService.getDocumentosPlan(planId);
            setDocumentos(Array.isArray(docs) ? docs : []);
        } catch {
            // silently fail
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleGuardarSeguimiento = async () => {
        if (!plan) return;
        if (!nuevoSeguimiento.descripcionAvance.trim()) {
            toast.error('Ingresa una descripción del avance');
            return;
        }
        if (nuevoSeguimiento.archivo) {
            const sizeMb = nuevoSeguimiento.archivo.size / (1024 * 1024);
            if (sizeMb > 200) {
                toast.error(`El archivo pesa ${sizeMb.toFixed(1)} MB y supera el límite de 200 MB.`);
                return;
            }
        }
        try {
            setGuardando(true);
            await legalService.addSeguimientoPlan(plan.id, {
                descripcionAvance: nuevoSeguimiento.descripcionAvance,
                porcentajeReportado: nuevoSeguimiento.porcentajeReportado,
                file: nuevoSeguimiento.archivo || undefined,
                titulo: nuevoSeguimiento.tituloArchivo || nuevoSeguimiento.archivo?.name,
            });
            toast.success(
                nuevoSeguimiento.archivo ? 'Avance y documento registrados' : 'Seguimiento registrado',
                { description: `Avance actualizado a ${nuevoSeguimiento.porcentajeReportado}%` },
            );
            setNuevoSeguimiento({ descripcionAvance: '', porcentajeReportado: 0, archivo: null, tituloArchivo: '' });
            await Promise.all([fetchPlan(), fetchDocumentos()]);
            onPlanUpdated?.();
        } catch (error: unknown) {
            console.error('Error al guardar seguimiento:', error);
            const status = (error as { response?: { status?: number }; status?: number })?.response?.status
                || (error as { status?: number })?.status;
            if (status === 413) {
                toast.error('El archivo es demasiado grande (máx 200 MB).');
            } else {
                toast.error('Error al guardar el seguimiento');
            }
        } finally {
            setGuardando(false);
        }
    };

    const handleExportarIndividual = async (formato: 'pdf' | 'excel') => {
        if (!plan) return;
        const ente = resolverEnteControl(entesControlPM, plan.origen || 'OTRO');
        const estadoInfo = getEstadoConfig(plan.estado);
        const datos = {
            codigo: plan.codigo,
            titulo: plan.titulo,
            enteControlNombre: ente.nombre,
            hallazgo: plan.descripcion,
            documentoOrigen: plan.documentoOrigen,
            severidad: plan.severidad || 'MEDIO',
            responsable: plan.responsableNombre || 'Sin asignar',
            areaResponsable: plan.areaResponsable,
            estadoNombre: estadoInfo.nombre,
            avancePorcentaje: Number(plan.avancePorcentaje || 0),
            fechaRecepcion: plan.fechaRecepcion,
            fechaRespuesta: plan.fechaRespuesta,
            fechaInicio: plan.fechaInicio,
            fechaFinEstimada: plan.fechaFinEstimada,
            fechaCierreReal: plan.fechaCierreReal,
            acciones,
        };

        try {
            setExportando(formato);
            if (formato === 'pdf') {
                const filename = exportarPlanIndividualPDF(datos);
                toast.success('Plan exportado en PDF', { description: filename });
            } else {
                const filename = await exportarPlanIndividualExcel(datos);
                toast.success('Plan exportado en Excel', { description: filename });
            }
        } catch (err) {
            console.error(`Error exportando ${formato}:`, err);
            toast.error(`Error al exportar el plan en ${formato.toUpperCase()}`);
        } finally {
            setExportando(null);
        }
    };

    if (!isOpen) return null;

    const estadoConfig = plan ? getEstadoConfig(plan.estado) : null;
    const enteResuelto = plan ? resolverEnteControl(entesControlPM, plan.origen || 'OTRO') : null;

    const renderTarjetaAccion = (accion: AccionPlanMejoramiento) => {
        const faseCfg = PHVA_CONFIG[accion.fasePhva];
        const ejecutada = accion.estado === 'EJECUTADA';
        const isToggling = togglingId === accion.id;

        return (
            <div
                key={accion.id}
                className={`bg-white border rounded-xl p-3.5 transition-all ${
                    ejecutada ? 'border-emerald-200 bg-emerald-50/25' : 'border-gray-200 hover:shadow-sm'
                }`}
            >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => handleToggleEstadoAccion(accion)}
                            disabled={isToggling}
                            title={ejecutada ? 'Reabrir acción a Pendiente' : 'Marcar acción como Ejecutada'}
                            aria-label={ejecutada ? `Reabrir acción ${accion.nombre}` : `Marcar como ejecutada ${accion.nombre}`}
                            className={`mt-0.5 flex-shrink-0 rounded-md p-1 transition-colors ${
                                ejecutada
                                    ? 'text-emerald-600 hover:bg-emerald-100'
                                    : 'text-gray-400 hover:text-[#003DA5] hover:bg-blue-50'
                            }`}
                        >
                            {isToggling ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : ejecutada ? (
                                <CheckSquare className="w-5 h-5" />
                            ) : (
                                <Square className="w-5 h-5" />
                            )}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                <Badge
                                    style={{
                                        backgroundColor: faseCfg.bgColor,
                                        color: faseCfg.color,
                                        borderColor: faseCfg.borderColor,
                                    }}
                                    className="text-[11px] font-bold border"
                                >
                                    {faseCfg.etiqueta}
                                </Badge>
                                <Badge className="text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    Peso: {formatearPorcentaje(accion.pesoPorcentual)}
                                </Badge>
                                <Badge
                                    className={`text-[11px] font-bold ${
                                        ejecutada
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}
                                >
                                    {ejecutada ? 'Ejecutada' : 'Pendiente'}
                                </Badge>
                            </div>

                            <p className={`font-bold text-sm break-words ${ejecutada ? 'text-emerald-950' : 'text-gray-900'}`}>
                                {accion.nombre}
                            </p>

                            {accion.descripcion && (
                                <p className="text-xs text-gray-600 mt-1 break-words">{accion.descripcion}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                                {accion.responsable && (
                                    <span className="inline-flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {accion.responsable}
                                    </span>
                                )}
                                {accion.fechaLimite && (
                                    <span className="inline-flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Límite: {formatearFecha(accion.fechaLimite)}
                                    </span>
                                )}
                                {ejecutada && accion.fechaEjecucion && (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Ejecutada: {formatearFecha(accion.fechaEjecucion)}
                                    </span>
                                )}
                                {accion.archivoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const filename = String(accion.archivoUrl).replace(/^files\//, '');
                                            setVisorDoc({
                                                archivo: getFileViewUrl(filename),
                                                numero: accion.archivoNombre || accion.nombre,
                                            });
                                            setVisorOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                        <Paperclip className="w-3 h-3" />
                                        {accion.archivoNombre || 'Documento'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 flex-shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            variant={ejecutada ? 'outline' : 'default'}
                            disabled={isToggling}
                            onClick={() => handleToggleEstadoAccion(accion)}
                            className={
                                ejecutada
                                    ? 'h-7 px-2.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50'
                                    : 'h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                            }
                        >
                            {ejecutada ? (
                                <>
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reabrir
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Ejecutar
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                            title="Editar acción"
                            onClick={() => handleEditarAccion(accion)}
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                            title="Eliminar acción"
                            onClick={() => handleEliminarAccion(accion)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent
                    hideCloseButton
                    className="!max-w-[780px] !w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl"
                    style={{ zIndex: 9999 }}
                >
                    <DialogTitle className="sr-only">Detalle del Plan de Mejoramiento</DialogTitle>
                    <DialogDescription className="sr-only">
                        Vista detallada del plan {plan?.codigo}
                    </DialogDescription>

                    {/* Header */}
                    <ModalHeaderClean
                        titulo={plan?.codigo || 'Cargando...'}
                        subtitulo={plan?.titulo || 'Plan de Mejoramiento'}
                        icono={Target}
                        colorIcono="blue"
                        badges={
                            plan && estadoConfig ? (
                                <Badge
                                    style={{ backgroundColor: estadoConfig.bgColor, color: estadoConfig.color }}
                                    className="font-bold"
                                >
                                    {estadoConfig.icon}
                                    <span className="ml-1">{estadoConfig.nombre}</span>
                                </Badge>
                            ) : undefined
                        }
                        onClose={onClose}
                    />

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center p-10">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Cargando plan...</p>
                            </div>
                        </div>
                    ) : plan ? (
                        <>
                            {/* Barra de exportación individual + Tabs */}
                            <div className="flex-shrink-0 border-b bg-white px-4 sm:px-5 pt-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="font-semibold text-gray-800">
                                            Cumplimiento: {formatearPorcentaje(plan.avancePorcentaje)}
                                        </span>
                                        <span>·</span>
                                        <span>
                                            {accionesEjecutadasCount}/{acciones.length} acciones ejecutadas
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={exportando !== null}
                                            onClick={() => handleExportarIndividual('pdf')}
                                            className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                                        >
                                            {exportando === 'pdf' ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Exportar PDF
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={exportando !== null}
                                            onClick={() => handleExportarIndividual('excel')}
                                            className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex-1 sm:flex-none"
                                        >
                                            {exportando === 'excel' ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Exportar Excel
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex w-full items-center gap-1 overflow-x-auto">
                                    {[
                                        { id: 'resumen', label: 'Resumen', icon: <FileText className="w-4 h-4" /> },
                                        { id: 'hallazgos', label: `Acciones PHVA (${acciones.length})`, icon: <ListChecks className="w-4 h-4" /> },
                                        { id: 'progreso', label: 'Seguimiento', icon: <TrendingUp className="w-4 h-4" /> },
                                        { id: 'historial', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setTabActiva(tab.id as 'resumen' | 'hallazgos' | 'progreso' | 'historial')}
                                            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                                                tabActiva === tab.id
                                                    ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/40'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                {/* Tab: Resumen */}
                                {tabActiva === 'resumen' && (
                                    <div className="space-y-5">
                                        {/* Progreso Global */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="text-sm font-black text-gray-900">Cumplimiento Global del Plan</h3>
                                                    <p className="text-xs text-gray-600 mt-0.5">
                                                        {accionesEjecutadasCount} de {acciones.length} acciones ejecutadas
                                                    </p>
                                                </div>
                                                <span className="text-3xl font-black text-[#003DA5]">
                                                    {formatearPorcentaje(plan.avancePorcentaje)}
                                                </span>
                                            </div>
                                            <Progress value={Number(plan.avancePorcentaje || 0)} className="h-3" />
                                        </div>

                                        {/* Avance por Fase PHVA */}
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 mb-2.5 flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-[#003DA5]" />
                                                Avance por Fase del Ciclo PHVA
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {FASES_PHVA.map((fase) => {
                                                    const cfg = PHVA_CONFIG[fase];
                                                    const stats = resumenPhva[fase];
                                                    return (
                                                        <button
                                                            key={fase}
                                                            type="button"
                                                            onClick={() => {
                                                                setFiltroFase(fase);
                                                                setTabActiva('hallazgos');
                                                            }}
                                                            style={{
                                                                backgroundColor: cfg.bgColor,
                                                                borderColor: cfg.borderColor,
                                                            }}
                                                            className="text-left p-3 rounded-xl border hover:shadow-sm transition-shadow"
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-black" style={{ color: cfg.color }}>
                                                                    {cfg.etiqueta}
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-600">
                                                                    {stats.ejecutadas}/{stats.total}
                                                                </span>
                                                            </div>
                                                            <p className="text-lg font-black text-gray-900">
                                                                {formatearPorcentaje(stats.porcentajeAvance)}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                                Peso: {formatearPorcentaje(stats.pesoTotal)}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Información General */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                    <Building2 className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Ente de Control</span>
                                                </div>
                                                <p className="font-bold text-gray-900">
                                                    {enteResuelto?.icono} {enteResuelto?.nombre}
                                                </p>
                                                {plan.riesgoTitulo && (
                                                    <p className="text-xs text-gray-500 mt-1">{plan.riesgoTitulo}</p>
                                                )}
                                            </div>

                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                    <ShieldAlert className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Severidad</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{getSeveridadTexto(plan.severidad)}</p>
                                            </div>

                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                    <User className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Responsable</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{plan.responsableNombre || 'Sin asignar'}</p>
                                                {plan.areaResponsable && (
                                                    <p className="text-xs text-gray-500 mt-1">{plan.areaResponsable}</p>
                                                )}
                                            </div>

                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Cronograma</span>
                                                </div>
                                                <p className="text-xs text-gray-700 font-semibold">
                                                    Inicio: {formatearFecha(plan.fechaInicio)} · Fin: {formatearFecha(plan.fechaFinEstimada)}
                                                </p>
                                                {plan.fechaCierreReal && (
                                                    <p className="text-xs text-emerald-700 font-medium mt-1">
                                                        Cierre real: {formatearFecha(plan.fechaCierreReal)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {plan.descripcion && (
                                            <div className="p-4 bg-white border rounded-lg">
                                                <h4 className="text-sm font-bold text-gray-900 mb-1.5">Hallazgo / Descripción</h4>
                                                <p className="text-gray-600 text-sm break-words">{plan.descripcion}</p>
                                            </div>
                                        )}

                                        {plan.documentoOrigen && (
                                            <div className="p-4 bg-white border rounded-lg">
                                                <h4 className="text-sm font-bold text-gray-900 mb-1.5">Documento de Origen</h4>
                                                <p className="text-gray-600 text-sm break-words">{plan.documentoOrigen}</p>
                                            </div>
                                        )}

                                        {/* Documentos Adjuntos */}
                                        <div className="bg-white border rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 text-[#003DA5]" />
                                                    Documentos Adjuntos
                                                    {documentos.length > 0 && (
                                                        <Badge className="bg-blue-100 text-blue-700 ml-1">{documentos.length}</Badge>
                                                    )}
                                                </h4>
                                            </div>
                                            {loadingDocs ? (
                                                <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Cargando documentos...
                                                </div>
                                            ) : documentos.length === 0 ? (
                                                <div className="text-center py-6 text-gray-400">
                                                    <Paperclip className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                                                    <p className="text-xs">No hay documentos cargados aún</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y">
                                                    {documentos.map((doc) => (
                                                        <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                                <div className="p-1.5 bg-blue-50 rounded text-base leading-none">
                                                                    {getFileIcon(doc.tipoArchivo)}
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="font-semibold text-sm text-gray-900 truncate">{doc.titulo}</p>
                                                                    <p className="text-xs text-gray-400">{formatearFecha(doc.createdAt)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm" variant="ghost"
                                                                    className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                                                                    title="Ver documento"
                                                                    onClick={() => {
                                                                        setVisorDoc({ archivo: getFileViewUrl(doc.urlArchivo), numero: doc.titulo });
                                                                        setVisorOpen(true);
                                                                    }}
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm" variant="ghost"
                                                                    className="h-7 w-7 p-0 text-gray-500 hover:text-green-600"
                                                                    title="Descargar"
                                                                    onClick={() => window.open(getFileDownloadUrl(doc.urlArchivo, doc.titulo), '_blank')}
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Acciones PHVA */}
                                {tabActiva === 'hallazgos' && (
                                    <div className="space-y-5">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-1">
                                                <ListChecks className="w-4 h-4 text-[#003DA5]" />
                                                Acciones del Plan — Ciclo PHVA y Peso Automático
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Cada acción se asocia obligatoriamente a una fase PHVA y recibe un peso automático (100% / N, ajustando decimales en la última acción). Al ejecutar o reabrir una acción, el cumplimiento y el estado del plan se recalculan automáticamente.
                                            </p>
                                        </div>

                                        {/* Tarjetas de avance y filtro por fase PHVA */}
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFiltroFase('TODAS')}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                            filtroFase === 'TODAS'
                                                                ? 'bg-[#003DA5] text-white border-[#003DA5]'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        Todas ({acciones.length})
                                                    </button>
                                                    {FASES_PHVA.map((fase) => {
                                                        const cfg = PHVA_CONFIG[fase];
                                                        const stats = resumenPhva[fase];
                                                        const activo = filtroFase === fase;
                                                        return (
                                                            <button
                                                                key={fase}
                                                                type="button"
                                                                onClick={() => setFiltroFase(fase)}
                                                                style={
                                                                    activo
                                                                        ? { backgroundColor: cfg.color, color: '#fff', borderColor: cfg.color }
                                                                        : { backgroundColor: cfg.bgColor, color: cfg.color, borderColor: cfg.borderColor }
                                                                }
                                                                className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                                                            >
                                                                {cfg.etiqueta} ({stats.ejecutadas}/{stats.total} · {formatearPorcentaje(stats.porcentajeAvance)})
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {filtroFase === 'TODAS' && acciones.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAgruparPorFase((prev) => !prev)}
                                                        className="text-xs font-semibold text-[#003DA5] hover:underline"
                                                    >
                                                        {agruparPorFase ? 'Ver lista plana' : 'Agrupar por fase PHVA'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Formulario crear/editar acción */}
                                        <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-3">
                                            <h4 className="text-sm font-bold text-[#003DA5] flex items-center gap-1.5">
                                                <Plus className="w-4 h-4" />
                                                {editandoAccion ? 'Editar acción' : 'Nueva acción del plan'}
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                                        Descripción / Nombre de la acción <span className="text-red-500">*</span>
                                                    </label>
                                                    <Input
                                                        placeholder="Ej: Actualizar procedimiento de control"
                                                        value={formAccion.nombre}
                                                        onChange={(e) => setFormAccion(p => ({ ...p, nombre: e.target.value }))}
                                                        className="text-sm bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                                        Fase PHVA <span className="text-red-500">*</span>
                                                    </label>
                                                    <Select
                                                        value={formAccion.fasePhva}
                                                        onValueChange={(val) => setFormAccion(p => ({ ...p, fasePhva: val as FasePhva }))}
                                                    >
                                                        <SelectTrigger className="w-full bg-white text-sm" aria-label="Fase PHVA">
                                                            <SelectValue placeholder="Seleccionar fase PHVA" />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[10000]">
                                                            {FASES_PHVA.map((fase) => (
                                                                <SelectItem key={fase} value={fase}>
                                                                    {PHVA_CONFIG[fase].etiqueta}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                                        Responsable
                                                    </label>
                                                    <Input
                                                        placeholder="Responsable de la acción"
                                                        value={formAccion.responsable}
                                                        onChange={(e) => setFormAccion(p => ({ ...p, responsable: e.target.value }))}
                                                        className="text-sm bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                                        Fecha límite
                                                    </label>
                                                    <Input
                                                        type="date"
                                                        value={formAccion.fechaLimite}
                                                        onChange={(e) => setFormAccion(p => ({ ...p, fechaLimite: e.target.value }))}
                                                        className="text-sm bg-white"
                                                    />
                                                </div>
                                            </div>

                                            <Textarea
                                                placeholder="Detalle adicional de la acción correctiva (opcional)…"
                                                value={formAccion.descripcion}
                                                onChange={(e) => setFormAccion(p => ({ ...p, descripcion: e.target.value }))}
                                                rows={2}
                                                className="text-sm bg-white"
                                            />

                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        ref={accionFileRef}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0] || null;
                                                            if (f && f.size / (1024 * 1024) > 200) {
                                                                toast.error('Archivo supera el límite de 200 MB');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setFormAccion(p => ({ ...p, archivo: f }));
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => accionFileRef.current?.click()}
                                                        className="text-xs bg-white"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5 mr-1" />
                                                        {formAccion.archivo ? 'Cambiar soporte' : 'Adjuntar soporte'}
                                                    </Button>
                                                    {formAccion.archivo && (
                                                        <span className="text-xs text-gray-600 truncate max-w-[180px]">
                                                            {formAccion.archivo.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex justify-end gap-2">
                                                    {editandoAccion && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={resetFormAccion}
                                                            disabled={savingAccion}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="bg-[#003DA5] hover:bg-[#002d7a] text-white"
                                                        onClick={handleGuardarAccion}
                                                        disabled={savingAccion}
                                                    >
                                                        {savingAccion
                                                            ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                            : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                                        {editandoAccion ? 'Guardar cambios' : 'Agregar acción'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lista de acciones */}
                                        {loadingAcciones ? (
                                            <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Cargando acciones...
                                            </div>
                                        ) : accionesFiltradas.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl">
                                                <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                                <p className="text-sm">
                                                    {filtroFase === 'TODAS'
                                                        ? 'No hay acciones registradas en este plan'
                                                        : `No hay acciones en la fase ${PHVA_CONFIG[filtroFase].etiqueta}`}
                                                </p>
                                            </div>
                                        ) : agruparPorFase && filtroFase === 'TODAS' ? (
                                            <div className="space-y-4">
                                                {FASES_PHVA.map((fase) => {
                                                    const grupo = acciones.filter((a) => a.fasePhva === fase);
                                                    if (grupo.length === 0) return null;
                                                    const cfg = PHVA_CONFIG[fase];
                                                    const stats = resumenPhva[fase];
                                                    return (
                                                        <div key={fase} className="space-y-2">
                                                            <div
                                                                style={{
                                                                    backgroundColor: cfg.bgColor,
                                                                    borderColor: cfg.borderColor,
                                                                }}
                                                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border"
                                                            >
                                                                <span className="text-xs font-black" style={{ color: cfg.color }}>
                                                                    Fase {cfg.etiqueta} ({stats.ejecutadas}/{stats.total})
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-700">
                                                                    Peso fase: {formatearPorcentaje(stats.pesoTotal)} · Avance: {formatearPorcentaje(stats.porcentajeAvance)}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {grupo.map(renderTarjetaAccion)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {accionesFiltradas.map(renderTarjetaAccion)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab: Seguimiento manual */}
                                {tabActiva === 'progreso' && (
                                    <div className="space-y-5">
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-black text-gray-900">Cumplimiento Actual</h3>
                                                <span className="text-2xl font-black text-[#003DA5]">
                                                    {formatearPorcentaje(plan.avancePorcentaje)}
                                                </span>
                                            </div>
                                            <Progress value={Number(plan.avancePorcentaje || 0)} className="h-2" />
                                        </div>

                                        <div className="bg-white border rounded-xl p-5 space-y-4">
                                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                <Plus className="w-4 h-4 text-blue-600" />
                                                Registrar Seguimiento / Evidencia
                                            </h3>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                    Porcentaje Reportado
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    <Input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={nuevoSeguimiento.porcentajeReportado}
                                                        onChange={e => setNuevoSeguimiento(prev => ({
                                                            ...prev,
                                                            porcentajeReportado: parseInt(e.target.value, 10)
                                                        }))}
                                                        className="flex-1"
                                                    />
                                                    <span className="text-xl font-black text-blue-600 w-16 text-right">
                                                        {nuevoSeguimiento.porcentajeReportado}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                    Descripción del Seguimiento <span className="text-red-500">*</span>
                                                </label>
                                                <Textarea
                                                    rows={3}
                                                    placeholder="Describe las actividades realizadas, logros alcanzados o evidencias..."
                                                    value={nuevoSeguimiento.descripcionAvance}
                                                    onChange={e => setNuevoSeguimiento(prev => ({
                                                        ...prev,
                                                        descripcionAvance: e.target.value
                                                    }))}
                                                />
                                            </div>

                                            <div className="border-t pt-3">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 text-gray-500" />
                                                    Documento de soporte (opcional)
                                                </label>
                                                {!nuevoSeguimiento.archivo ? (
                                                    <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400">
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                if (!f) return;
                                                                const sizeMb = f.size / (1024 * 1024);
                                                                if (sizeMb > 200) {
                                                                    toast.error(`El archivo pesa ${sizeMb.toFixed(1)} MB y supera el límite de 200 MB.`);
                                                                    e.target.value = '';
                                                                    return;
                                                                }
                                                                setNuevoSeguimiento(prev => ({
                                                                    ...prev,
                                                                    archivo: f,
                                                                    tituloArchivo: prev.tituloArchivo || f.name.replace(/\.[^/.]+$/, ''),
                                                                }));
                                                            }}
                                                        />
                                                        <span className="text-sm text-gray-600 font-medium">Clic para adjuntar archivo</span>
                                                        <span className="text-xs text-gray-400">Máx. 200 MB</span>
                                                    </label>
                                                ) : (
                                                    <div className="flex items-center gap-3 border-2 border-blue-200 bg-blue-50 rounded-lg p-3">
                                                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold truncate">{nuevoSeguimiento.archivo.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {(nuevoSeguimiento.archivo.size / (1024 * 1024)).toFixed(2)} MB
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNuevoSeguimiento(prev => ({ ...prev, archivo: null, tituloArchivo: '' }))}
                                                            className="p-1 hover:bg-white rounded"
                                                            aria-label="Quitar archivo"
                                                        >
                                                            <X className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={handleGuardarSeguimiento}
                                                disabled={guardando}
                                                className="w-full bg-[#003DA5] hover:bg-[#002d7a] text-white"
                                            >
                                                {guardando ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Guardar Seguimiento
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Timeline / Historial */}
                                {tabActiva === 'historial' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-[#003DA5]" />
                                            Timeline de Ejecución y Cambios de Cumplimiento
                                        </h3>

                                        {plan.seguimientos && plan.seguimientos.length > 0 ? (
                                            <div className="space-y-3">
                                                {plan.seguimientos.map((seg, idx) => (
                                                    <motion.div
                                                        key={seg.id}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                                                        className="p-3.5 bg-white border rounded-xl"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                                            <Badge className="bg-blue-100 text-blue-800 font-bold text-xs">
                                                                Cumplimiento: {formatearPorcentaje(seg.porcentajeReportado)}
                                                            </Badge>
                                                            <span className="text-xs text-gray-500">
                                                                {formatearFechaHora(seg.createdAt || seg.fechaReporte)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 break-words">{seg.descripcionAvance}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 text-gray-400">
                                                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                <p>No hay eventos registrados aún</p>
                                                <p className="text-xs mt-1">
                                                    Al crear, ejecutar o reabrir acciones se registrarán automáticamente aquí
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 border-t bg-gray-50 px-5 py-3 flex justify-end">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    <X className="w-4 h-4 mr-2" />
                                    Cerrar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-10">
                            <div className="text-center text-red-500">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                                <p>Error al cargar el plan</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {visorDoc && (
                <VisorDocumentoModal
                    isOpen={visorOpen}
                    onClose={() => { setVisorOpen(false); setVisorDoc(null); }}
                    archivo={visorDoc.archivo}
                    numero={visorDoc.numero}
                    asunto="Plan de Mejoramiento"
                />
            )}
        </>
    );
}
