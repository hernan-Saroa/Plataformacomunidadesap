/**
 * ModalDetallePlanV4 - Modal de Detalle y Seguimiento de Planes de Mejoramiento
 * ✅ Ver detalles del plan
 * ✅ Registrar avance de progreso
 * ✅ Ver historial de seguimientos
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
    X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
    TrendingUp, Activity, Target, Plus, AlertCircle, Building2,
    Upload, Download, Eye, Loader2, Paperclip, ListChecks, Edit2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Progress } from '@esap-mfe/shared-ui/progress';
import { ModalHeaderClean } from './ModalHeaderClean';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { legalService } from '../../../../services/api/legal.service';
import { API_MODE, getServiceUrl } from '../../../../config/environment';

function getFileViewUrl(filename: string): string {
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/${filename}`;
}

function getFileDownloadUrl(filename: string, originalName: string): string {
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    // Preserve the original file extension in the download name
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
    usuarioId?: string;
}

interface PlanDetalle {
    id: string;
    codigo: string;
    titulo: string;
    origen: string;
    estado: string;
    avancePorcentaje: number;
    descripcion?: string;
    areaResponsable?: string;
    responsableNombre?: string;
    fechaInicio?: string;
    fechaFinEstimada?: string;
    fechaRecepcion?: string;
    documentoOrigen?: string;
    seguimientos?: Seguimiento[];
    riesgoTitulo?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface ModalDetallePlanV4Props {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    onPlanUpdated?: () => void;
}

// ==================== HELPERS ====================
const getEstadoConfig = (estado: string) => {
    const configs: any = {
        ABIERTO: { nombre: 'En Ejecución', color: '#2962FF', bgColor: '#E3F2FD', icon: <Activity className="w-4 h-4" /> },
        EN_EJECUCION: { nombre: 'En Ejecución', color: '#2962FF', bgColor: '#E3F2FD', icon: <Activity className="w-4 h-4" /> },
        CERRADO: { nombre: 'Completado', color: '#10B981', bgColor: '#D1FAE5', icon: <CheckCircle2 className="w-4 h-4" /> },
        COMPLETADO: { nombre: 'Completado', color: '#10B981', bgColor: '#D1FAE5', icon: <CheckCircle2 className="w-4 h-4" /> },
        FORMULACION: { nombre: 'En Formulación', color: '#F59E0B', bgColor: '#FEF3C7', icon: <FileText className="w-4 h-4" /> },
        SUSPENDIDO: { nombre: 'Suspendido', color: '#6B7280', bgColor: '#F3F4F6', icon: <AlertCircle className="w-4 h-4" /> }
    };
    return configs[estado] || configs['FORMULACION'];
};

const getOrigenConfig = (origen: string) => {
    const configs: any = {
        CONTRALORIA: { nombre: 'Contraloría General', icon: '🏛️', color: '#DC2626' },
        PROCURADURIA: { nombre: 'Procuraduría General', icon: '⚖️', color: '#059669' },
        OCI: { nombre: 'Oficina Control Interno', icon: '🔍', color: '#2962FF' },
        AUDITORIA_EXTERNA: { nombre: 'Auditoría Externa', icon: '📊', color: '#9C27B0' },
        RIESGO: { nombre: 'Riesgo', icon: '⚠️', color: '#F59E0B' },
        OTRO: { nombre: 'Otro', icon: '📄', color: '#6B7280' }
    };
    return configs[origen] || configs['OTRO'];
};

const formatearFecha = (fecha?: string): string => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// ==================== COMPONENTE PRINCIPAL ====================
export function ModalDetallePlanV4({ isOpen, onClose, planId, onPlanUpdated }: ModalDetallePlanV4Props) {
    const [plan, setPlan] = useState<PlanDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [tabActiva, setTabActiva] = useState<'resumen' | 'progreso' | 'historial' | 'hallazgos'>('resumen');

    // Bug 5c: Hallazgos y Acciones de Mejora
    const [hallazgos, setHallazgos] = useState<any[]>([]);
    const [loadingHallazgos, setLoadingHallazgos] = useState(false);
    const [editandoHallazgo, setEditandoHallazgo] = useState<any | null>(null);
    const [formHallazgo, setFormHallazgo] = useState<{
        nombre: string;
        descripcion: string;
        porcentajeAvance: number;
        archivo: File | null;
    }>({ nombre: '', descripcion: '', porcentajeAvance: 0, archivo: null });
    const hallazgoFileRef = useRef<HTMLInputElement>(null);
    const [savingHallazgo, setSavingHallazgo] = useState(false);

    // Form for progress update
    const [nuevoSeguimiento, setNuevoSeguimiento] = useState({
        descripcionAvance: '',
        porcentajeReportado: 0,
        // Bug 5: archivo opcional integrado al avance
        archivo: null as File | null,
        tituloArchivo: '',
    });
    const [guardando, setGuardando] = useState(false);

    // Documentos
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [tituloDoc, setTituloDoc] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Visor
    const [visorOpen, setVisorOpen] = useState(false);
    const [visorDoc, setVisorDoc] = useState<{ archivo: string; numero: string } | null>(null);

    useEffect(() => {
        if (isOpen && planId) {
            fetchPlan();
            fetchDocumentos();
            fetchHallazgos();
        } else {
            setDocumentos([]);
            setHallazgos([]);
            setSelectedFile(null);
            setTituloDoc('');
            setTabActiva('resumen');
            setEditandoHallazgo(null);
            setFormHallazgo({ nombre: '', descripcion: '', porcentajeAvance: 0, archivo: null });
        }
    }, [isOpen, planId]);

    const fetchHallazgos = async () => {
        setLoadingHallazgos(true);
        try {
            const data = await legalService.getHallazgosPlan(planId);
            setHallazgos(Array.isArray(data) ? data : []);
        } catch {
            setHallazgos([]);
        } finally {
            setLoadingHallazgos(false);
        }
    };

    const resetFormHallazgo = () => {
        setEditandoHallazgo(null);
        setFormHallazgo({ nombre: '', descripcion: '', porcentajeAvance: 0, archivo: null });
        if (hallazgoFileRef.current) hallazgoFileRef.current.value = '';
    };

    const handleGuardarHallazgo = async () => {
        if (!formHallazgo.nombre.trim()) {
            toast.error('Ingrese un nombre para el hallazgo');
            return;
        }
        try {
            setSavingHallazgo(true);
            if (editandoHallazgo) {
                await legalService.updateHallazgoPlan(editandoHallazgo.id, {
                    nombre: formHallazgo.nombre.trim(),
                    descripcion: formHallazgo.descripcion.trim(),
                    porcentajeAvance: formHallazgo.porcentajeAvance,
                    file: formHallazgo.archivo || undefined,
                });
                toast.success('Hallazgo actualizado');
            } else {
                await legalService.createHallazgoPlan(planId, {
                    nombre: formHallazgo.nombre.trim(),
                    descripcion: formHallazgo.descripcion.trim(),
                    porcentajeAvance: formHallazgo.porcentajeAvance,
                    file: formHallazgo.archivo || undefined,
                });
                toast.success('Hallazgo creado');
            }
            resetFormHallazgo();
            await fetchHallazgos();
            await fetchPlan();
            onPlanUpdated?.();
        } catch (err: any) {
            console.error('Error guardando hallazgo:', err);
            toast.error('Error al guardar el hallazgo');
        } finally {
            setSavingHallazgo(false);
        }
    };

    const handleEditarHallazgo = (h: any) => {
        setEditandoHallazgo(h);
        setFormHallazgo({
            nombre: h.nombre || '',
            descripcion: h.descripcion || '',
            porcentajeAvance: Number(h.porcentajeAvance || 0),
            archivo: null,
        });
    };

    const handleEliminarHallazgo = async (h: any) => {
        if (!confirm(`¿Eliminar el hallazgo "${h.nombre}"?`)) return;
        try {
            await legalService.deleteHallazgoPlan(h.id);
            toast.success('Hallazgo eliminado');
            await fetchHallazgos();
            await fetchPlan();
            onPlanUpdated?.();
        } catch {
            toast.error('Error al eliminar el hallazgo');
        }
    };

    const fetchPlan = async () => {
        try {
            setLoading(true);
            const data = await legalService.getPlanMejoramiento(planId);
            setPlan(data);
            // Set initial percentage for form
            setNuevoSeguimiento(prev => ({
                ...prev,
                porcentajeReportado: data.avancePorcentaje || 0
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
            setDocumentos(docs);
        } catch {
            // silently fail
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!tituloDoc) setTituloDoc(file.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleUploadDocumento = async () => {
        if (!selectedFile) { toast.error('Seleccione un archivo'); return; }
        if (!tituloDoc.trim()) { toast.error('Ingrese un título'); return; }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('titulo', tituloDoc.trim());
            formData.append('uploadedBy', 'Sistema');
            await legalService.uploadDocumentoPlan(planId, formData);
            toast.success('Documento cargado exitosamente');
            setSelectedFile(null);
            setTituloDoc('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchDocumentos();
        } catch {
            toast.error('Error al cargar el documento');
        } finally {
            setUploading(false);
        }
    };

    const handleGuardarSeguimiento = async () => {
        if (!plan) return;

        if (!nuevoSeguimiento.descripcionAvance.trim()) {
            toast.error('Ingresa una descripción del avance');
            return;
        }

        // Bug 5: validación cliente del archivo (max 200MB)
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

            // Reset form
            setNuevoSeguimiento({ descripcionAvance: '', porcentajeReportado: 0, archivo: null, tituloArchivo: '' });

            // Reload plan data + documentos
            await fetchPlan();
            await fetchDocumentos();

            // Notify parent to refresh list
            onPlanUpdated?.();
        } catch (error: any) {
            console.error('Error al guardar seguimiento:', error);
            const status = error?.response?.status || error?.status;
            if (status === 413) {
                toast.error('El archivo es demasiado grande (máx 200 MB).');
            } else {
                toast.error('Error al guardar el seguimiento');
            }
        } finally {
            setGuardando(false);
        }
    };

    if (!isOpen) return null;

    const estadoConfig = plan ? getEstadoConfig(plan.estado) : null;
    const origenConfig = plan ? getOrigenConfig(plan.origen) : null;

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                hideCloseButton
                className="!max-w-[680px] !w-[92vw] max-h-[88vh] overflow-hidden flex flex-col p-0 rounded-2xl"
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
                        {/* Tabs — Bug 5: tab Hallazgos agregado; estética mejorada */}
                        <div className="flex-shrink-0 border-b bg-white px-5">
                            <div className="flex gap-1 overflow-x-auto">
                                {[
                                    { id: 'resumen', label: 'Resumen', icon: <FileText className="w-4 h-4" /> },
                                    { id: 'progreso', label: 'Actualizar Progreso', icon: <TrendingUp className="w-4 h-4" /> },
                                    { id: 'hallazgos', label: `Hallazgos (${hallazgos.length})`, icon: <ListChecks className="w-4 h-4" /> },
                                    { id: 'historial', label: 'Historial de Avances', icon: <Clock className="w-4 h-4" /> },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setTabActiva(tab.id as any)}
                                        className={`flex items-center gap-2 px-3 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${tabActiva === tab.id
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
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Tab: Resumen */}
                            {tabActiva === 'resumen' && (
                                <div className="space-y-6">
                                    {/* Progreso Global */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-black text-gray-900">Avance Global</h3>
                                            <span className="text-3xl font-black text-blue-600">{plan.avancePorcentaje || 0}%</span>
                                        </div>
                                        <Progress value={plan.avancePorcentaje || 0} className="h-3" />
                                    </div>

                                    {/* Información General */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-white border rounded-lg">
                                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                <Building2 className="w-4 h-4" />
                                                <span className="text-xs font-medium">Origen</span>
                                            </div>
                                            <p className="font-bold text-gray-900">
                                                {origenConfig?.icon} {origenConfig?.nombre}
                                            </p>
                                            {plan.riesgoTitulo && (
                                                <p className="text-xs text-gray-500 mt-1">{plan.riesgoTitulo}</p>
                                            )}
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
                                                <span className="text-xs font-medium">Fecha Inicio</span>
                                            </div>
                                            <p className="font-bold text-gray-900">{formatearFecha(plan.fechaInicio)}</p>
                                        </div>

                                        <div className="p-4 bg-white border rounded-lg">
                                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-xs font-medium">Fecha Fin Estimada</span>
                                            </div>
                                            <p className="font-bold text-gray-900">{formatearFecha(plan.fechaFinEstimada)}</p>
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    {plan.descripcion && (
                                        <div className="p-4 bg-white border rounded-lg">
                                            <h4 className="text-sm font-bold text-gray-900 mb-2">Descripción</h4>
                                            <p className="text-gray-600 text-sm">{plan.descripcion}</p>
                                        </div>
                                    )}

                                    {/* Documento Origen */}
                                    {plan.documentoOrigen && (
                                        <div className="p-4 bg-white border rounded-lg">
                                            <h4 className="text-sm font-bold text-gray-900 mb-2">Documento de Origen</h4>
                                            <p className="text-gray-600 text-sm">{plan.documentoOrigen}</p>
                                        </div>
                                    )}

                                    {/* Bug 5a: Documentos Adjuntos visibles en el Resumen */}
                                    <div className="bg-white border rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Paperclip className="w-4 h-4 text-[#003DA5]" />
                                                Documentos Adjuntos
                                                {documentos.length > 0 && (
                                                    <Badge className="bg-blue-100 text-blue-700 ml-1">{documentos.length}</Badge>
                                                )}
                                            </h4>
                                            <span className="text-xs text-gray-500">
                                                Se cargan al registrar avances
                                            </span>
                                        </div>
                                        {loadingDocs ? (
                                            <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Cargando documentos...
                                            </div>
                                        ) : documentos.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400">
                                                <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                                <p className="text-sm">No hay documentos cargados aún</p>
                                                <p className="text-xs mt-1">Adjunta un archivo en "Actualizar Progreso"</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {documentos.map((doc: any) => (
                                                    <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <div className="p-1.5 bg-blue-50 rounded text-base leading-none">
                                                                {getFileIcon(doc.tipoArchivo)}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="font-semibold text-sm text-gray-900 truncate">{doc.titulo}</p>
                                                                <p className="text-xs text-gray-400">
                                                                    {new Date(doc.createdAt).toLocaleDateString('es-CO')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                            <Button
                                                                size="sm" variant="ghost"
                                                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                                title="Ver documento"
                                                                onClick={() => {
                                                                    setVisorDoc({ archivo: getFileViewUrl(doc.urlArchivo), numero: doc.titulo });
                                                                    setVisorOpen(true);
                                                                }}
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="sm" variant="ghost"
                                                                className="h-7 w-7 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50"
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

                            {/* Tab: Progreso */}
                            {tabActiva === 'progreso' && (
                                <div className="space-y-6">
                                    {/* Current Progress */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-black text-gray-900">Avance Actual</h3>
                                            <span className="text-2xl font-black text-blue-600">{plan.avancePorcentaje || 0}%</span>
                                        </div>
                                        <Progress value={plan.avancePorcentaje || 0} className="h-2" />
                                    </div>

                                    {/* Form to Update */}
                                    <div className="bg-white border rounded-xl p-6">
                                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-blue-600" />
                                            Registrar Nuevo Avance
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                    Nuevo Porcentaje de Avance
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    <Input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={nuevoSeguimiento.porcentajeReportado}
                                                        onChange={e => setNuevoSeguimiento(prev => ({
                                                            ...prev,
                                                            porcentajeReportado: parseInt(e.target.value)
                                                        }))}
                                                        className="flex-1"
                                                    />
                                                    <span className="text-2xl font-black text-blue-600 w-20 text-right">
                                                        {nuevoSeguimiento.porcentajeReportado}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                    Descripción del Avance <span className="text-red-500">*</span>
                                                </label>
                                                <Textarea
                                                    rows={4}
                                                    placeholder="Describe las actividades realizadas, logros alcanzados, o el estado actual del plan..."
                                                    value={nuevoSeguimiento.descripcionAvance}
                                                    onChange={e => setNuevoSeguimiento(prev => ({
                                                        ...prev,
                                                        descripcionAvance: e.target.value
                                                    }))}
                                                />
                                            </div>

                                            {/* Bug 5: Documento de soporte opcional integrado al avance */}
                                            <div className="border-t pt-4">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 text-gray-500" />
                                                    Documento de soporte (opcional)
                                                </label>
                                                {!nuevoSeguimiento.archivo ? (
                                                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors">
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
                                                        <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
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
                                                            aria-label="Quitar"
                                                        >
                                                            <X className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    </div>
                                                )}
                                                {nuevoSeguimiento.archivo && (
                                                    <Input
                                                        value={nuevoSeguimiento.tituloArchivo}
                                                        onChange={(e) => setNuevoSeguimiento(prev => ({ ...prev, tituloArchivo: e.target.value }))}
                                                        placeholder="Título del documento"
                                                        className="mt-2 text-sm"
                                                    />
                                                )}
                                            </div>

                                            <Button
                                                onClick={handleGuardarSeguimiento}
                                                disabled={guardando}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {guardando ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Guardar Avance
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Historial */}
                            {tabActiva === 'historial' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        Historial de Seguimientos
                                    </h3>

                                    {plan.seguimientos && plan.seguimientos.length > 0 ? (
                                        <div className="space-y-3">
                                            {plan.seguimientos.map((seg, idx) => (
                                                <motion.div
                                                    key={seg.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="p-4 bg-white border rounded-lg"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Badge className="bg-blue-100 text-blue-700 font-bold">
                                                            {seg.porcentajeReportado}%
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {formatearFecha(seg.createdAt || (seg as any).fechaReporte)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{seg.descripcionAvance}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-400">
                                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>No hay seguimientos registrados</p>
                                            <p className="text-sm">Usa la pestaña "Actualizar Progreso" para registrar avances</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Bug 5c: Tab Hallazgos y Acciones de Mejora */}
                            {tabActiva === 'hallazgos' && (
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-1">
                                            <ListChecks className="w-4 h-4 text-[#003DA5]" />
                                            Hallazgos y Acciones de Mejora
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            El avance global del plan se calcula como el promedio de los hallazgos. Hasta que todos no estén en 100%, el plan no podrá llegar a 100%.
                                        </p>
                                    </div>

                                    {/* Formulario crear/editar */}
                                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-3">
                                        <h4 className="text-sm font-bold text-[#003DA5] flex items-center gap-1.5">
                                            <Plus className="w-4 h-4" />
                                            {editandoHallazgo ? 'Editar hallazgo' : 'Nuevo hallazgo'}
                                        </h4>
                                        <Input
                                            placeholder="Nombre del hallazgo / acción de mejora *"
                                            value={formHallazgo.nombre}
                                            onChange={(e) => setFormHallazgo(p => ({ ...p, nombre: e.target.value }))}
                                            className="text-sm bg-white"
                                        />
                                        <Textarea
                                            placeholder="Descripción del hallazgo y acción correctiva…"
                                            value={formHallazgo.descripcion}
                                            onChange={(e) => setFormHallazgo(p => ({ ...p, descripcion: e.target.value }))}
                                            rows={3}
                                            className="text-sm bg-white"
                                        />
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-gray-700">% Avance</label>
                                                <span className="text-sm font-black text-[#003DA5]">{formHallazgo.porcentajeAvance}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={formHallazgo.porcentajeAvance}
                                                onChange={(e) => setFormHallazgo(p => ({ ...p, porcentajeAvance: Number(e.target.value) }))}
                                                className="w-full accent-[#003DA5]"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={hallazgoFileRef}
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0] || null;
                                                    if (f && f.size / (1024 * 1024) > 200) {
                                                        toast.error('Archivo supera el límite de 200 MB');
                                                        e.target.value = '';
                                                        return;
                                                    }
                                                    setFormHallazgo(p => ({ ...p, archivo: f }));
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => hallazgoFileRef.current?.click()}
                                                className="text-xs"
                                            >
                                                <Paperclip className="w-3.5 h-3.5 mr-1" />
                                                {formHallazgo.archivo ? 'Cambiar archivo' : 'Adjuntar archivo'}
                                            </Button>
                                            {formHallazgo.archivo && (
                                                <span className="text-xs text-gray-600 truncate max-w-[200px]">
                                                    {formHallazgo.archivo.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            {editandoHallazgo && (
                                                <Button variant="outline" size="sm" onClick={resetFormHallazgo} disabled={savingHallazgo}>
                                                    Cancelar
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                className="bg-[#003DA5] hover:bg-[#002d7a] text-white"
                                                onClick={handleGuardarHallazgo}
                                                disabled={savingHallazgo}
                                            >
                                                {savingHallazgo
                                                    ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                    : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                                {editandoHallazgo ? 'Guardar cambios' : 'Crear hallazgo'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Lista de hallazgos */}
                                    {loadingHallazgos ? (
                                        <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Cargando hallazgos...
                                        </div>
                                    ) : hallazgos.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">No hay hallazgos registrados</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {hallazgos.map((h: any) => (
                                                <div key={h.id} className="bg-white border rounded-xl p-3 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <p className="font-bold text-sm text-gray-900 truncate">{h.nombre}</p>
                                                                <Badge
                                                                    className={`font-bold text-xs flex-shrink-0 ${
                                                                        h.porcentajeAvance >= 100 ? 'bg-green-100 text-green-700' :
                                                                        h.porcentajeAvance >= 70 ? 'bg-blue-100 text-blue-700' :
                                                                        h.porcentajeAvance >= 30 ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}
                                                                >
                                                                    {h.porcentajeAvance}%
                                                                </Badge>
                                                            </div>
                                                            {h.descripcion && (
                                                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{h.descripcion}</p>
                                                            )}
                                                            <Progress value={Number(h.porcentajeAvance || 0)} className="h-1.5" />
                                                            <div className="flex items-center justify-between mt-2 gap-2">
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    {h.archivoUrl && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const filename = String(h.archivoUrl).replace(/^files\//, '');
                                                                                setVisorDoc({
                                                                                    archivo: getFileViewUrl(filename),
                                                                                    numero: h.archivoNombre || h.nombre,
                                                                                });
                                                                                setVisorOpen(true);
                                                                            }}
                                                                            className="flex items-center gap-1 text-blue-600 hover:underline"
                                                                        >
                                                                            <Paperclip className="w-3 h-3" />
                                                                            {h.archivoNombre || 'Documento'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                                                                        title="Editar"
                                                                        onClick={() => handleEditarHallazgo(h)}
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                                                        title="Eliminar"
                                                                        onClick={() => handleEliminarHallazgo(h)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-3 flex justify-end">
                            <Button variant="outline" onClick={onClose}>
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
