/**
 * ModalDetallePlanV4 - Modal de Detalle y Seguimiento de Planes de Mejoramiento
 * ✅ Ver detalles del plan
 * ✅ Registrar avance de progreso
 * ✅ Ver historial de seguimientos
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
    TrendingUp, Activity, Target, Plus, AlertCircle, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Badge } from '../../../ui/badge';
import { Progress } from '../../../ui/progress';
import { ModalHeaderClean } from './ModalHeaderClean';
import { legalService } from '../../../../services/api/legal.service';

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
    const [tabActiva, setTabActiva] = useState<'resumen' | 'progreso' | 'historial'>('resumen');

    // Form for progress update
    const [nuevoSeguimiento, setNuevoSeguimiento] = useState({
        descripcionAvance: '',
        porcentajeReportado: 0
    });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (isOpen && planId) {
            fetchPlan();
        }
    }, [isOpen, planId]);

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

    const handleGuardarSeguimiento = async () => {
        if (!plan) return;

        if (!nuevoSeguimiento.descripcionAvance.trim()) {
            toast.error('Ingresa una descripción del avance');
            return;
        }

        try {
            setGuardando(true);
            await legalService.addSeguimientoPlan(plan.id, {
                descripcionAvance: nuevoSeguimiento.descripcionAvance,
                porcentajeReportado: nuevoSeguimiento.porcentajeReportado
            });

            toast.success('Seguimiento registrado', {
                description: `Avance actualizado a ${nuevoSeguimiento.porcentajeReportado}%`
            });

            // Reset form
            setNuevoSeguimiento({ descripcionAvance: '', porcentajeReportado: 0 });

            // Reload plan data
            await fetchPlan();

            // Notify parent to refresh list
            onPlanUpdated?.();
        } catch (error) {
            console.error('Error al guardar seguimiento:', error);
            toast.error('Error al guardar el seguimiento');
        } finally {
            setGuardando(false);
        }
    };

    if (!isOpen) return null;

    const estadoConfig = plan ? getEstadoConfig(plan.estado) : null;
    const origenConfig = plan ? getOrigenConfig(plan.origen) : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                hideCloseButton
                className="!max-w-[800px] !w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0"
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
                        {/* Tabs */}
                        <div className="flex-shrink-0 border-b bg-gray-50 px-6">
                            <div className="flex gap-6">
                                {[
                                    { id: 'resumen', label: 'Resumen', icon: <FileText className="w-4 h-4" /> },
                                    { id: 'progreso', label: 'Actualizar Progreso', icon: <TrendingUp className="w-4 h-4" /> },
                                    { id: 'historial', label: 'Historial', icon: <Clock className="w-4 h-4" /> }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setTabActiva(tab.id as any)}
                                        className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-all ${tabActiva === tab.id
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
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
                                                        Guardar Seguimiento
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
    );
}
